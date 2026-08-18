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

    /* Smoothed acceleration */
    this.filteredAcceleration = 0;

    /* ==========================================================
       SHAKE SETTINGS
       ========================================================== */

    /*
     * Lower than the old 25 threshold.
     *
     * This makes normal real-world phone shakes easier to detect
     * while still filtering normal hand movement.
     */
    this.shakeThreshold =
      Number.isFinite(options.shakeThreshold)
        ? options.shakeThreshold
        : 11;

    /*
     * Prevent multiple shake events from firing from
     * one physical shake.
     */
    this.shakeCooldown =
      Number.isFinite(options.shakeCooldown)
        ? options.shakeCooldown
        : 1200;

    this.lastShakeTime = 0;

    this.shakeDetected = false;

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

  _detectShakeFromAcceleration() {
    const magnitude =
      Math.sqrt(
        this.ax * this.ax +
        this.ay * this.ay +
        this.az * this.az
      );

    /*
     * Low-pass filtering.
     *
     * Reduces sensor noise without adding noticeable delay.
     */

    this.filteredAcceleration +=
      (magnitude -
        this.filteredAcceleration) *
      0.35;

    /*
     * Use the sudden acceleration change.
     */

    const delta =
      Math.abs(
        magnitude -
        this.filteredAcceleration
      );

    /*
     * Combine acceleration magnitude and sudden movement.
     */

    const shakeForce =
      Math.max(
        magnitude,
        delta * 2.5
      );

    this._triggerShakeIfNeeded(
      shakeForce
    );
  }

  /* ============================================================
     SHAKE DETECTION WITH GRAVITY
     * ============================================================ */

  _detectShakeWithGravity() {
    /*
     * Calculate total acceleration.
     */

    const magnitude =
      Math.sqrt(
        this.ax * this.ax +
        this.ay * this.ay +
        this.az * this.az
      );

    /*
     * Gravity is approximately 9.81 m/s².
     */

    const gravityRemoved =
      Math.abs(
        magnitude - 9.81
      );

    /*
     * Detect sudden change between sensor samples.
     */

    const deltaX =
      this.ax -
      this.previousAx;

    const deltaY =
      this.ay -
      this.previousAy;

    const deltaZ =
      this.az -
      this.previousAz;

    const delta =
      Math.sqrt(
        deltaX * deltaX +
        deltaY * deltaY +
        deltaZ * deltaZ
      );

    /*
     * Store current values.
     */

    this.previousAx =
      this.ax;

    this.previousAy =
      this.ay;

    this.previousAz =
      this.az;

    /*
     * Combine both measurements.
     *
     * Sudden movement is more useful than simply checking
     * total acceleration.
     */

    const shakeForce =
      Math.max(
        gravityRemoved,
        delta
      );

    this._triggerShakeIfNeeded(
      shakeForce
    );
  }

  /* ============================================================
     TRIGGER SHAKE
     ============================================================ */

  _triggerShakeIfNeeded(
    shakeForce
  ) {
    if (
      !Number.isFinite(shakeForce)
    ) {
      return;
    }

    const now =
      performance.now();

    /*
     * Ignore small movements.
     */

    if (
      shakeForce <
      this.shakeThreshold
    ) {
      return;
    }

    /*
     * Prevent repeated events from one shake.
     */

    if (
      now -
        this.lastShakeTime <
      this.shakeCooldown
    ) {
      return;
    }

    this.lastShakeTime =
      now;

    this.shakeDetected =
      true;

    console.log(
      `[Gyro] 📱 SHAKE DETECTED (${shakeForce.toFixed(1)})`
    );
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
    const detected =
      this.shakeDetected;

    /*
     * Clear immediately.
     *
     * EmojiWorld receives the event once.
     */

    this.shakeDetected =
      false;

    return detected;
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