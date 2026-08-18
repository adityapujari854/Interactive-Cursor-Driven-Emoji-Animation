/**
 * Mobile Gyroscope + Shake Detection
 * ------------------------------------
 *
 * Features:
 * - Device tilt / gyroscope
 * - Device motion
 * - Shake detection
 * - iOS permission handling
 * - Android compatibility
 * - Cooldown to prevent repeated shake triggers
 *
 * Designed for the Emoji World project.
 */

export class GyroHandler {
  constructor(options = {}) {
    this.enabled = false;

    this.permissionGranted = false;

    /*
     * Current orientation.
     */
    this.beta = 0;
    this.gamma = 0;
    this.alpha = 0;

    /*
     * Smoothed orientation.
     */
    this.smoothBeta = 0;
    this.smoothGamma = 0;

    /*
     * Motion values.
     */
    this.accelX = 0;
    this.accelY = 0;
    this.accelZ = 0;

    /*
     * Previous acceleration.
     */
    this.lastAccelX = 0;
    this.lastAccelY = 0;
    this.lastAccelZ = 0;

    /*
     * Shake detection.
     */
    this.shakeThreshold =
      options.shakeThreshold || 18;

    this.shakeCooldown =
      options.shakeCooldown || 1200;

    this.lastShakeTime = 0;

    /*
     * Prevent accidental repeated
     * shake events.
     */
    this.shakeArmed = true;

    /*
     * Timestamp.
     */
    this.lastMotionTime = 0;

    /*
     * Bound event handlers.
     *
     * This is important so the same
     * listener can be removed later.
     */
    this._orientationHandler =
      this._handleOrientation.bind(this);

    this._motionHandler =
      this._handleMotion.bind(this);

    /*
     * iOS permission requirement.
     */
    this.requiresPermission =
      typeof DeviceOrientationEvent !==
        'undefined' &&
      typeof DeviceOrientationEvent.requestPermission ===
        'function';
  }

  /**
   * Request device orientation/motion permission.
   *
   * Must normally be called after
   * a user gesture on iOS.
   */
  async requestPermission() {
    /*
     * Desktop.
     */
    if (
      typeof window === 'undefined'
    ) {
      return false;
    }

    /*
     * APIs unavailable.
     */
    const hasOrientation =
      'DeviceOrientationEvent' in window;

    const hasMotion =
      'DeviceMotionEvent' in window;

    if (
      !hasOrientation &&
      !hasMotion
    ) {
      console.log(
        '[Gyro] Device motion APIs unavailable.'
      );

      return false;
    }

    try {
      /*
       * iOS orientation permission.
       */
      if (
        typeof DeviceOrientationEvent !==
          'undefined' &&
        typeof DeviceOrientationEvent.requestPermission ===
          'function'
      ) {
        const orientationPermission =
          await DeviceOrientationEvent.requestPermission();

        if (
          orientationPermission !==
          'granted'
        ) {
          console.warn(
            '[Gyro] Orientation permission denied.'
          );

          return false;
        }
      }

      /*
       * Some iOS versions also expose
       * motion permission separately.
       */
      if (
        typeof DeviceMotionEvent !==
          'undefined' &&
        typeof DeviceMotionEvent.requestPermission ===
          'function'
      ) {
        const motionPermission =
          await DeviceMotionEvent.requestPermission();

        if (
          motionPermission !==
          'granted'
        ) {
          console.warn(
            '[Gyro] Motion permission denied.'
          );

          return false;
        }
      }

      this.permissionGranted =
        true;

      this.enable();

      console.log(
        '[Gyro] ✓ Motion permission granted.'
      );

      return true;
    } catch (error) {
      console.warn(
        '[Gyro] Permission request failed:',
        error
      );

      /*
       * Android usually doesn't require
       * an explicit permission request.
       */
      this.permissionGranted =
        true;

      this.enable();

      return true;
    }
  }

  /**
   * Enable sensors.
   */
  enable() {
    if (this.enabled) {
      return;
    }

    /*
     * Device orientation.
     */
    window.addEventListener(
      'deviceorientation',
      this._orientationHandler,
      {
        passive: true
      }
    );

    /*
     * Device motion.
     */
    window.addEventListener(
      'devicemotion',
      this._motionHandler,
      {
        passive: true
      }
    );

    this.enabled = true;

    console.log(
      '[Gyro] ✓ Sensors enabled.'
    );
  }

  /**
   * Disable sensors.
   */
  disable() {
    if (!this.enabled) {
      return;
    }

    window.removeEventListener(
      'deviceorientation',
      this._orientationHandler
    );

    window.removeEventListener(
      'devicemotion',
      this._motionHandler
    );

    this.enabled = false;

    console.log(
      '[Gyro] Sensors disabled.'
    );
  }

  /**
   * Orientation event.
   */
  _handleOrientation(
    event
  ) {
    /*
     * Values can occasionally be null.
     */
    const beta =
      Number.isFinite(event.beta)
        ? event.beta
        : 0;

    const gamma =
      Number.isFinite(event.gamma)
        ? event.gamma
        : 0;

    const alpha =
      Number.isFinite(event.alpha)
        ? event.alpha
        : 0;

    this.beta = beta;

    this.gamma = gamma;

    this.alpha = alpha;

    /*
     * Smooth the values.
     *
     * This prevents the emojis from
     * jumping when the sensor is noisy.
     */
    const smoothing = 0.12;

    this.smoothBeta +=
      (
        beta -
        this.smoothBeta
      ) * smoothing;

    this.smoothGamma +=
      (
        gamma -
        this.smoothGamma
      ) * smoothing;
  }

  /**
   * Motion event.
   */
  _handleMotion(
    event
  ) {
    const acceleration =
      event.accelerationIncludingGravity;

    if (!acceleration) {
      return;
    }

    const x =
      Number.isFinite(
        acceleration.x
      )
        ? acceleration.x
        : 0;

    const y =
      Number.isFinite(
        acceleration.y
      )
        ? acceleration.y
        : 0;

    const z =
      Number.isFinite(
        acceleration.z
      )
        ? acceleration.z
        : 0;

    this.accelX = x;

    this.accelY = y;

    this.accelZ = z;

    this.lastMotionTime =
      performance.now();
  }

  /**
   * Get smoothed phone tilt.
   *
   * Returns normalized values
   * approximately in the range
   * -1 to +1.
   */
  getTilt() {
    /*
     * Gamma:
     * left/right tilt.
     */
    let x =
      this.smoothGamma / 35;

    /*
     * Beta:
     * front/back tilt.
     */
    let y =
      this.smoothBeta / 45;

    /*
     * Clamp.
     */
    x =
      Math.max(
        -1,
        Math.min(1, x)
      );

    y =
      Math.max(
        -1,
        Math.min(1, y)
      );

    return {
      x,
      y
    };
  }

  /**
   * Calculate motion intensity.
   */
  getMotionIntensity() {
    const magnitude =
      Math.sqrt(
        this.accelX *
          this.accelX +
        this.accelY *
          this.accelY +
        this.accelZ *
          this.accelZ
      );

    return magnitude;
  }

  /**
   * Detect a single shake.
   *
   * Called from the animation loop.
   *
   * IMPORTANT:
   * This method does not create
   * another animation loop.
   */
  pollShake() {
    if (
      !this.enabled
    ) {
      return false;
    }

    const now =
      performance.now();

    /*
     * Cooldown.
     */
    if (
      now -
        this.lastShakeTime <
      this.shakeCooldown
    ) {
      return false;
    }

    /*
     * Calculate acceleration magnitude.
     *
     * accelerationIncludingGravity
     * normally contains ~9.8 m/s²
     * from gravity.
     */
    const magnitude =
      Math.sqrt(
        this.accelX *
          this.accelX +
        this.accelY *
          this.accelY +
        this.accelZ *
          this.accelZ
      );

    /*
     * Compare against gravity.
     *
     * A strong shake creates a
     * significant acceleration spike.
     */
    const dynamicAcceleration =
      Math.abs(
        magnitude - 9.81
      );

    /*
     * Shake detected.
     */
    if (
      dynamicAcceleration >=
      this.shakeThreshold
    ) {
      /*
       * Require a real cooldown.
       */
      this.lastShakeTime =
        now;

      return true;
    }

    return false;
  }

  /**
   * Alternative stronger shake detector.
   *
   * Can be used later if the normal
   * detector is too sensitive.
   */
  detectStrongShake() {
    const magnitude =
      this.getMotionIntensity();

    return (
      Math.abs(
        magnitude - 9.81
      ) >
      this.shakeThreshold
    );
  }

  /**
   * Check whether sensors are
   * currently providing data.
   */
  isReceivingData() {
    if (
      !this.enabled
    ) {
      return false;
    }

    return (
      performance.now() -
        this.lastMotionTime <
      2000
    );
  }

  /**
   * Reset shake state.
   */
  resetShake() {
    this.lastShakeTime = 0;
  }

  /**
   * Destroy handler.
   */
  destroy() {
    this.disable();

    this.beta = 0;
    this.gamma = 0;
    this.alpha = 0;

    this.smoothBeta = 0;
    this.smoothGamma = 0;

    this.accelX = 0;
    this.accelY = 0;
    this.accelZ = 0;
  }
}