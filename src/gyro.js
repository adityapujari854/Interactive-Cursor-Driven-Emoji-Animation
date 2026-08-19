/**
 * Mobile Gyroscope / Device Motion Handler
 * -----------------------------------------
 *
 * Handles:
 * - Device tilt
 * - Mobile shake detection
 * - iOS permission
 * - Android motion sensors
 *
 * Optimized for mobile performance.
 */

'use strict';

export class GyroHandler {
  constructor(options = {}) {
    /* ==========================================================
       ORIENTATION
       ========================================================== */

    this.alpha = 0;
    this.beta = 0;
    this.gamma = 0;

    /* Smoothed orientation */
    this.smoothBeta = 0;
    this.smoothGamma = 0;

    /* ==========================================================
       ACCELERATION
       ========================================================== */

    this.ax = 0;
    this.ay = 0;
    this.az = 0;

    /* Previous acceleration */
    this.previousAx = 0;
    this.previousAy = 0;
    this.previousAz = 0;
    this.hasMotionBaseline = false;

    /* Smoothed acceleration */
    this.filteredAcceleration = 0;
    this.filteredRotation = 0;

    /* High-pass shake filter. Slow tilt/rotation is intentionally
     * filtered out so turning or gently moving the phone cannot
     * trigger emoji drops. */
    this.filteredAx = 0;
    this.filteredAy = 0;
    this.filteredAz = 0;
    this.highPassMagnitude = 0;
    this.shakeImpulseCount = 0;

    /* ==========================================================
       SHAKE SETTINGS
       ========================================================== */

    /*
     * Shake thresholds are applied to high-pass linear acceleration.
     * Device rotation/orientation is never sufficient to trigger a drop.
     */
    /*
     * Hysteresis-based shake detection. There is deliberately NO
     * time cooldown: once motion falls below shakeReleaseThreshold,
     * the detector is armed again and the next distinct shake can
     * trigger another drop even while earlier emojis are falling.
     */
    this.shakeThreshold =
      Number.isFinite(options.shakeThreshold)
        ? options.shakeThreshold
        : 8.5;

    this.hardShakeThreshold =
      Number.isFinite(options.hardShakeThreshold)
        ? options.hardShakeThreshold
        : 20.0;

    this.shakeReleaseThreshold =
      Number.isFinite(options.shakeReleaseThreshold)
        ? options.shakeReleaseThreshold
        : 3.5;

    this.shakeArmed = true;
    this.lastShakeTime = 0;
    this.shakeDetected = false;
    this.lastShakeForce = 0;
    this.shakeSequence = 0;
    this.lastPolledShakeSequence = 0;

    /* Callback invoked when a valid shake is detected. */
    this.onShake =
      typeof options.onShake === 'function'
        ? options.onShake
        : null;

    /* ==========================================================
       SUPPORT
       ========================================================== */

    this.isSupported = false;

    this.orientationSupported = false;

    this.motionSupported = false;

    this.permissionGranted = false;

    /* ==========================================================
       LISTENER STATE
       ========================================================== */

    this.orientationListenerAttached = false;

    this.motionListenerAttached = false;

    /* ==========================================================
       BOUND FUNCTIONS
       ========================================================== */

    this._handleOrientation =
      this._handleOrientation.bind(this);

    this._handleMotion =
      this._handleMotion.bind(this);

    /* Initialize support detection */
    this._init();
  }

  /* ============================================================
     INITIALIZATION
     ============================================================ */

  _init() {
    const hasOrientation =
      typeof window !== 'undefined' &&
      'DeviceOrientationEvent' in window;

    const hasMotion =
      typeof window !== 'undefined' &&
      'DeviceMotionEvent' in window;

    this.orientationSupported =
      hasOrientation;

    this.motionSupported =
      hasMotion;

    this.isSupported =
      hasOrientation ||
      hasMotion;

    /*
     * Android and browsers that don't require explicit
     * permission can start immediately.
     *
     * iOS permission is requested later from a user gesture.
     */

    const needsOrientationPermission =
      hasOrientation &&
      typeof DeviceOrientationEvent.requestPermission ===
        'function';

    const needsMotionPermission =
      hasMotion &&
      typeof DeviceMotionEvent.requestPermission ===
        'function';

    if (!needsOrientationPermission) {
      this._attachOrientationListener();
    }

    if (!needsMotionPermission) {
      /*
       * Motion is attached immediately on Android.
       *
       * Some browsers may still block it until interaction,
       * but the listener itself is safe.
       */
      this._attachMotionListener();
    }
  }

  /* ============================================================
     ORIENTATION LISTENER
     ============================================================ */

  _attachOrientationListener() {
    if (
      this.orientationListenerAttached ||
      !this.orientationSupported
    ) {
      return;
    }

    window.addEventListener(
      'deviceorientation',
      this._handleOrientation,
      {
        passive: true
      }
    );

    this.orientationListenerAttached = true;

    console.log(
      '[Gyro] Orientation listener attached'
    );
  }

  /* ============================================================
     ORIENTATION HANDLER
     ============================================================ */

  _handleOrientation(event) {
    if (!event) {
      return;
    }

    /*
     * Raw orientation values.
     */

    const alpha =
      Number.isFinite(event.alpha)
        ? event.alpha
        : 0;

    const beta =
      Number.isFinite(event.beta)
        ? event.beta
        : 0;

    const gamma =
      Number.isFinite(event.gamma)
        ? event.gamma
        : 0;

    this.alpha = alpha;

    this.beta = beta;

    this.gamma = gamma;

    /*
     * Smooth tilt values.
     *
     * This prevents emojis from jumping when the phone
     * sensor produces small noisy changes.
     */

    const smoothing = 0.12;

    this.smoothBeta +=
      (beta - this.smoothBeta) *
      smoothing;

    this.smoothGamma +=
      (gamma - this.smoothGamma) *
      smoothing;
  }

  /* ============================================================
     MOTION LISTENER
     ============================================================ */

  _attachMotionListener() {
    if (
      this.motionListenerAttached ||
      !this.motionSupported
    ) {
      return;
    }

    window.addEventListener(
      'devicemotion',
      this._handleMotion,
      {
        passive: true
      }
    );

    this.motionListenerAttached = true;

    console.log(
      '[Gyro] Motion listener attached'
    );
  }

  /* ============================================================
     MOTION HANDLER
     ============================================================ */

  _handleMotion(event) {
    if (!event) {
      return;
    }

    /*
     * Prefer acceleration without gravity.
     *
     * This is much better for shake detection when available.
     */

    let acceleration =
      event.acceleration;

    if (
      acceleration &&
      Number.isFinite(acceleration.x) &&
      Number.isFinite(acceleration.y) &&
      Number.isFinite(acceleration.z)
    ) {
      this.ax =
        acceleration.x || 0;

      this.ay =
        acceleration.y || 0;

      this.az =
        acceleration.z || 0;

      this._detectShakeFromAcceleration();

      return;
    }

    /*
     * Fallback to accelerationIncludingGravity.
     */

    acceleration =
      event.accelerationIncludingGravity;

    if (!acceleration) {
      return;
    }

    const ax =
      Number.isFinite(acceleration.x)
        ? acceleration.x
        : 0;

    const ay =
      Number.isFinite(acceleration.y)
        ? acceleration.y
        : 0;

    const az =
      Number.isFinite(acceleration.z)
        ? acceleration.z
        : 0;

    this.ax = ax;
    this.ay = ay;
    this.az = az;

    this._detectShakeWithGravity();
  }

  /* ============================================================
     SHAKE DETECTION
     ============================================================ */

  _updateHighPassAcceleration() {
    /*
     * A slow phone turn/move produces a slowly changing acceleration
     * vector. The low-pass component follows that slow change, leaving
     * only quick acceleration changes in the high-pass signal.
     *
     * This is the important distinction between:
     *   - tilt / orientation change -> ignored
     *   - gentle hand movement      -> ignored
     *   - actual shake impulse       -> detected
     */
    const smoothing = 0.82;

    this.filteredAx =
      this.filteredAx * smoothing +
      this.ax * (1 - smoothing);

    this.filteredAy =
      this.filteredAy * smoothing +
      this.ay * (1 - smoothing);

    this.filteredAz =
      this.filteredAz * smoothing +
      this.az * (1 - smoothing);

    const hx = this.ax - this.filteredAx;
    const hy = this.ay - this.filteredAy;
    const hz = this.az - this.filteredAz;

    this.highPassMagnitude =
      Math.sqrt(hx * hx + hy * hy + hz * hz);

    return this.highPassMagnitude;
  }

  _detectShakeFromAcceleration() {
    const highPass =
      this._updateHighPassAcceleration();

    if (!this.hasMotionBaseline) {
      this.filteredAx = this.ax;
      this.filteredAy = this.ay;
      this.filteredAz = this.az;
      this.highPassMagnitude = 0;
      this.previousAx = this.ax;
      this.previousAy = this.ay;
      this.previousAz = this.az;
      this.hasMotionBaseline = true;
      return;
    }

    /*
     * Only linear acceleration is allowed to trigger a shake.
     * Rotation/orientation is deliberately NOT used as a trigger.
     */
    this._triggerShakeIfNeeded(highPass);
  }

  _detectShakeWithGravity() {
    const highPass =
      this._updateHighPassAcceleration();

    if (!this.hasMotionBaseline) {
      this.filteredAx = this.ax;
      this.filteredAy = this.ay;
      this.filteredAz = this.az;
      this.highPassMagnitude = 0;
      this.previousAx = this.ax;
      this.previousAy = this.ay;
      this.previousAz = this.az;
      this.hasMotionBaseline = true;
      return;
    }

    /*
     * accelerationIncludingGravity contains the ~9.81 m/s² gravity
     * vector. The high-pass filter removes this stable component, and
     * also removes slow changes caused by turning the phone.
     */
    this._triggerShakeIfNeeded(highPass);
  }

  /* ============================================================
     TRIGGER SHAKE
     ============================================================ */

  _triggerShakeIfNeeded(shakeForce) {
    if (!Number.isFinite(shakeForce)) {
      return;
    }

    /*
     * Thresholds are based on the high-pass linear acceleration, not
     * device rotation. This prevents a normal portrait/landscape turn
     * or slight repositioning from being interpreted as a shake.
     *
     * Light shake:  quick, deliberate movement -> a small group drops
     * Hard shake:   strong impulse             -> all available emojis drop
     */
    const lightThreshold = this.shakeThreshold;
    const hardThreshold = this.hardShakeThreshold;

    /* Re-arm after the phone has actually settled. No time cooldown. */
    if (
      !this.shakeArmed &&
      shakeForce <= this.shakeReleaseThreshold
    ) {
      this.shakeArmed = true;
      return;
    }

    if (
      !this.shakeArmed ||
      shakeForce < lightThreshold
    ) {
      return;
    }

    this.shakeArmed = false;
    this.lastShakeTime = performance.now();
    this.lastShakeForce = shakeForce;
    this.shakeDetected = true;
    this.shakeSequence += 1;

    const payload = {
      force: shakeForce,
      hard: shakeForce >= hardThreshold,
      sequence: this.shakeSequence,
      timestamp: this.lastShakeTime
    };

    console.log(
      `[Gyro] 📱 SHAKE ${payload.hard ? 'HARD' : 'LIGHT'} (${shakeForce.toFixed(1)})`
    );

    if (typeof this.onShake === 'function') {
      try {
        this.onShake(payload);
      } catch (error) {
        console.warn('[Gyro] Shake callback failed:', error);
      }
    }
  }

  /* ============================================================
     REQUEST SENSOR PERMISSION
     ============================================================ */

  async requestPermission() {
    /*
     * Already granted.
     */

    if (this.permissionGranted) {
      return true;
    }

    /*
     * No sensor support.
     */

    if (!this.isSupported) {
      console.warn(
        '[Gyro] Device sensors are not supported'
      );

      return false;
    }

    let orientationGranted =
      true;

    let motionGranted =
      true;

    /* ==========================================================
       iOS ORIENTATION
       ========================================================== */

    if (
      typeof DeviceOrientationEvent !==
        'undefined' &&
      typeof DeviceOrientationEvent.requestPermission ===
        'function'
    ) {
      try {
        const result =
          await DeviceOrientationEvent.requestPermission();

        orientationGranted =
          result === 'granted';

        if (
          orientationGranted
        ) {
          this._attachOrientationListener();
        }
      } catch (error) {
        orientationGranted =
          false;

        console.warn(
          '[Gyro] Orientation permission failed:',
          error
        );
      }
    } else {
      this._attachOrientationListener();
    }

    /* ==========================================================
       iOS MOTION
       ========================================================== */

    if (
      typeof DeviceMotionEvent !==
        'undefined' &&
      typeof DeviceMotionEvent.requestPermission ===
        'function'
    ) {
      try {
        const result =
          await DeviceMotionEvent.requestPermission();

        motionGranted =
          result === 'granted';

        if (
          motionGranted
        ) {
          this._attachMotionListener();
        }
      } catch (error) {
        motionGranted =
          false;

        console.warn(
          '[Gyro] Motion permission failed:',
          error
        );
      }
    } else {
      this._attachMotionListener();
    }

    this.permissionGranted =
      orientationGranted ||
      motionGranted;

    console.log(
      '[Gyro] Permission status:',
      {
        orientation:
          orientationGranted,

        motion:
          motionGranted
      }
    );

    return this.permissionGranted;
  }

  /* ============================================================
     GET TILT
     ============================================================ */

  getTilt() {
    /*
     * Convert gamma/beta to normalized values.
     */

    const x =
      Math.max(
        -1,
        Math.min(
          1,
          this.smoothGamma / 45
        )
      );

    const y =
      Math.max(
        -1,
        Math.min(
          1,
          this.smoothBeta / 45
        )
      );

    return {
      x,
      y
    };
  }

  /* ============================================================
     GET RAW TILT
     ============================================================ */

  getRawTilt() {
    return {
      alpha:
        this.alpha,

      beta:
        this.beta,

      gamma:
        this.gamma
    };
  }

  /* ============================================================
     POLL SHAKE
     ============================================================ */

  pollShake() {
    if (!this.shakeDetected) {
      return null;
    }

    this.shakeDetected = false;

    if (this.lastPolledShakeSequence === this.shakeSequence) {
      return null;
    }

    this.lastPolledShakeSequence = this.shakeSequence;

    return {
      force: this.lastShakeForce,
      hard: this.lastShakeForce >= this.hardShakeThreshold,
      sequence: this.shakeSequence,
      timestamp: this.lastShakeTime
    };
  }

  /* ============================================================
     SUPPORT CHECKS
     ============================================================ */

  isMotionSupported() {
    return this.motionSupported;
  }

  isOrientationSupported() {
    return this.orientationSupported;
  }

  isSensorSupported() {
    return this.isSupported;
  }

  hasPermission() {
    return this.permissionGranted;
  }

  /* ============================================================
     RESET
     ============================================================ */

  resetShake() {
    this.shakeDetected =
      false;

    this.lastShakeTime =
      0;

    this.previousAx =
      0;

    this.previousAy =
      0;

    this.previousAz =
      0;

    this.filteredAcceleration =
      0;
  }

  /* ============================================================
     DESTROY
     ============================================================ */

  destroy() {
    if (
      this.orientationListenerAttached
    ) {
      window.removeEventListener(
        'deviceorientation',
        this._handleOrientation
      );

      this.orientationListenerAttached =
        false;
    }

    if (
      this.motionListenerAttached
    ) {
      window.removeEventListener(
        'devicemotion',
        this._handleMotion
      );

      this.motionListenerAttached =
        false;
    }

    this.resetShake();
  }
}