/**
 * Gyroscope and device motion handler
 * Handles orientation, tilt, and shake detection
 */

export class GyroHandler {
  constructor(options = {}) {
    this.alpha = 0; // Z rotation
    this.beta = 0;  // X rotation (pitch)
    this.gamma = 0; // Y rotation (roll)

    this.ax = 0; // Acceleration X
    this.ay = 0; // Acceleration Y
    this.az = 0; // Acceleration Z

    this.shakeThreshold = options.shakeThreshold || 25;
    this.shakeCooldown = options.shakeCooldown || 1000;
    this.lastShakeTime = 0;
    this.shakeDetected = false;

    this.isSupported = false;
    this.orientationSupported = false;
    this.motionSupported = false;

    this._init();
  }

  /**
   * Initialize device event listeners
   */
  _init() {
    // Check for permission requirement (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
      // iOS 13+ requires permission
      this.orientationSupported = true;
    } else if (typeof DeviceOrientationEvent !== 'undefined') {
      this.orientationSupported = true;
      this._attachOrientationListener();
    }

    if (typeof DeviceMotionEvent !== 'undefined') {
      this.motionSupported = true;
      // Don't attach motion listener yet - wait for user gesture
    }
  }

  /**
   * Attach orientation listener
   */
  _attachOrientationListener() {
    window.addEventListener('deviceorientation', (event) => {
      this.alpha = event.alpha || 0; // 0 - 360
      this.beta = event.beta || 0;   // -180 - 180
      this.gamma = event.gamma || 0; // -90 - 90
    }, false);
  }

  /**
   * Attach motion listener
   */
  _attachMotionListener() {
    window.addEventListener('devicemotion', (event) => {
      if (!event.accelerationIncludingGravity) return;

      this.ax = event.accelerationIncludingGravity.x || 0;
      this.ay = event.accelerationIncludingGravity.y || 0;
      this.az = event.accelerationIncludingGravity.z || 0;

      this._detectShake();
    }, false);
  }

  /**
   * Request permission for iOS 13+
   */
  async requestPermission() {
    if (typeof DeviceOrientationEvent === 'undefined' || !DeviceOrientationEvent.requestPermission) {
      // Android or older iOS
      this._attachOrientationListener();
      this._attachMotionListener();
      return true;
    }

    try {
      const permissionOrientation = await DeviceOrientationEvent.requestPermission();
      if (permissionOrientation === 'granted') {
        this._attachOrientationListener();
      }
    } catch (e) {
      console.log('Orientation permission denied', e);
    }

    try {
      const permissionMotion = await DeviceMotionEvent.requestPermission();
      if (permissionMotion === 'granted') {
        this._attachMotionListener();
      }
    } catch (e) {
      console.log('Motion permission denied', e);
    }

    return true;
  }

  /**
   * Detect shake using acceleration
   */
  _detectShake() {
    const acceleration = Math.sqrt(this.ax * this.ax + this.ay * this.ay + this.az * this.az);
    
    // Subtract gravity (~9.8)
    const shakeForce = Math.abs(acceleration - 9.8);

    const now = Date.now();
    if (shakeForce > this.shakeThreshold && (now - this.lastShakeTime) > this.shakeCooldown) {
      this.shakeDetected = true;
      this.lastShakeTime = now;
      return true;
    }

    this.shakeDetected = false;
    return false;
  }

  /**
   * Get device tilt normalized to -1..1
   * Returns object with x (gamma) and y (beta) components
   */
  getTilt() {
    return {
      x: Math.max(-1, Math.min(1, this.gamma / 90)),
      y: Math.max(-1, Math.min(1, this.beta / 90))
    };
  }

  /**
   * Check if device supports motion
   */
  isMotionSupported() {
    return this.motionSupported;
  }

  /**
   * Check if device supports orientation
   */
  isOrientationSupported() {
    return this.orientationSupported;
  }

  /**
   * Get shake detection status (clears on read)
   */
  pollShake() {
    const wasShaken = this.shakeDetected;
    this.shakeDetected = false;
    return wasShaken;
  }
}
