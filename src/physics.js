/**
 * Lightweight 2D Physics
 * -----------------------
 * Used by The Emojis for the mobile shake interaction.
 *
 * Designed for:
 * - 24 emoji sprites
 * - mobile Snapdragon-class devices
 * - low CPU overhead
 * - smooth falling
 * - floor collision
 * - rotation
 * - randomized movement
 *
 * No external physics library.
 */

'use strict';

export class Physics {
  constructor(options = {}) {
    this.width =
      Number.isFinite(options.width)
        ? options.width
        : window.innerWidth;

    this.height =
      Number.isFinite(options.height)
        ? options.height
        : window.innerHeight;

    /*
     * Ground position.
     *
     * EmojiWorld currently passes:
     *
     * height * 0.85
     */
    this.groundLevel =
      Number.isFinite(options.groundLevel)
        ? options.groundLevel
        : this.height * 0.94;

    /*
     * Gravity per 60 FPS frame.
     *
     * Keep this relatively low because the emoji return
     * animation should feel playful rather than physically
     * violent.
     */
    this.gravity =
      Number.isFinite(options.gravity)
        ? options.gravity
        : 0.90;

    /*
     * Global damping.
     *
     * Prevents emojis from moving forever.
     */
    this.airDamping = 0.995;

    this.groundFriction = 0.82;

    /*
     * Bounce amount.
     *
     * Small bounce gives the emojis a soft landing.
     */
    this.bounce = 0.12;

    /*
     * Maximum velocity prevents numerical explosions
     * on slower devices or large frame drops.
     */
    this.maxVelocity = 35;

    /*
     * Physics bodies.
     */
    this.bodies = [];

    /*
     * Body ID.
     */
    this.nextId = 1;

    /*
     * Used for frame-rate independent stepping.
     */
    this.accumulator = 0;

    this.fixedStep = 1;

    this.maxSubSteps = 2;
  }

  /* ============================================================
     CREATE BODY
     ============================================================ */

  createBody(options = {}) {
    const body = {
      id: this.nextId++,

      x: Number.isFinite(options.x)
        ? options.x
        : 0,

      y: Number.isFinite(options.y)
        ? options.y
        : 0,

      vx: Number.isFinite(options.vx)
        ? options.vx
        : 0,

      vy: Number.isFinite(options.vy)
        ? options.vy
        : 0,

      rotation: Number.isFinite(options.rotation)
        ? options.rotation
        : 0,

      angularVelocity: Number.isFinite(
        options.angularVelocity
      )
        ? options.angularVelocity
        : 0,

      mass:
        Math.max(
          0.1,
          Number.isFinite(options.mass)
            ? options.mass
            : 1
        ),

      /*
       * Physics state.
       */
      isActive:
        options.isActive === true,

      grounded: false,

      sleeping: false,

      /*
       * Radius used for floor collision.
       *
       * EmojiWorld does not currently provide a radius,
       * so a sensible default is used.
       */
      radius:
        Number.isFinite(options.radius)
          ? options.radius
          : 45,

      /*
       * Randomized damping makes the 24 emojis feel
       * slightly different.
       */
      damping:
        0.985 +
        Math.random() * 0.008,

      friction:
        0.78 +
        Math.random() * 0.08
    };

    this.bodies.push(body);

    return body;
  }

  /* ============================================================
     REMOVE BODY
     ============================================================ */

  removeBody(body) {
    if (!body) {
      return;
    }

    const index =
      this.bodies.indexOf(body);

    if (index !== -1) {
      this.bodies.splice(index, 1);
    }
  }

  /* ============================================================
     CLEAR
     ============================================================ */

  clear() {
    this.bodies.length = 0;
    this.nextId = 1;
  }

  /* ============================================================
     UPDATE PHYSICS
     ============================================================ */

  update(deltaTime = 1) {
    /*
     * Protect against invalid ticker values.
     */
    if (
      !Number.isFinite(deltaTime) ||
      deltaTime <= 0
    ) {
      return;
    }

    /*
     * Clamp huge frame jumps.
     *
     * This is important on mobile when the browser
     * temporarily pauses the tab.
     */
    const frameDelta =
      Math.min(deltaTime, 2);

    /*
     * Fixed-step style update.
     *
     * This prevents physics from exploding when FPS
     * temporarily drops.
     */
    this.accumulator += frameDelta;

    let steps = 0;

    while (
      this.accumulator >= this.fixedStep &&
      steps < this.maxSubSteps
    ) {
      this._step(
        this.fixedStep
      );

      this.accumulator -=
        this.fixedStep;

      steps++;
    }
  }

  /* ============================================================
     SINGLE PHYSICS STEP
     * ============================================================ */

  _step(dt) {
    const bodies =
      this.bodies;

    for (
      let i = 0;
      i < bodies.length;
      i++
    ) {
      const body =
        bodies[i];

      if (
        !body ||
        !body.isActive ||
        body.sleeping
      ) {
        continue;
      }

      this._integrate(
        body,
        dt
      );

      this._handleGroundCollision(
        body
      );

      this._applyDamping(
        body
      );

      this._clampVelocity(
        body
      );

      this._checkSleep(
        body
      );
    }
  }

  /* ============================================================
     INTEGRATION
     ============================================================ */

  _integrate(body, dt) {
    /*
     * Gravity.
     */
    body.vy +=
      this.gravity *
      dt;

    /*
     * Position.
     */
    body.x +=
      body.vx *
      dt;

    body.y +=
      body.vy *
      dt;

    /*
     * Rotation.
     */
    body.rotation +=
      body.angularVelocity *
      dt;
  }

  /* ============================================================
     GROUND COLLISION
     ============================================================ */

  _handleGroundCollision(body) {
    /*
     * Top of the emoji at ground contact.
     */
    const floorY =
      this.groundLevel -
      body.radius;

    if (
      body.y < floorY
    ) {
      body.grounded = false;

      return;
    }

    /*
     * Prevent the sprite from passing through the floor.
     */
    body.y = floorY;

    /*
     * If moving downward, bounce.
     */
    if (body.vy > 0) {
      body.vy =
        -body.vy *
        this.bounce;
    }

    /*
     * Horizontal friction.
     */
    body.vx *=
      body.friction;

    /*
     * Rotation friction.
     */
    body.angularVelocity *=
      0.82;

    body.grounded = true;

    /*
     * Small velocities are removed.
     *
     * This prevents tiny numerical movements from
     * consuming CPU forever.
     */
    if (
      Math.abs(body.vy) < 0.45
    ) {
      body.vy = 0;
    }

    if (
      Math.abs(body.vx) < 0.03
    ) {
      body.vx = 0;
    }

    if (
      Math.abs(
        body.angularVelocity
      ) < 0.003
    ) {
      body.angularVelocity = 0;
    }
  }

  /* ============================================================
     DAMPING
     * ============================================================ */

  _applyDamping(body) {
    /*
     * Air resistance.
     */
    body.vx *=
      this.airDamping;

    /*
     * Vertical damping only when not falling strongly.
     */
    if (
      body.grounded
    ) {
      body.vy *=
        0.96;
    }

    /*
     * Rotation damping.
     */
    body.angularVelocity *=
      body.damping;
  }

  /* ============================================================
     VELOCITY LIMIT
     * ============================================================ */

  _clampVelocity(body) {
    const max =
      this.maxVelocity;

    if (
      body.vx > max
    ) {
      body.vx = max;
    }

    if (
      body.vx < -max
    ) {
      body.vx = -max;
    }

    if (
      body.vy > max
    ) {
      body.vy = max;
    }

    if (
      body.vy < -max
    ) {
      body.vy = -max;
    }

    /*
     * Keep rotation bounded too.
     */
    const maxRotationSpeed =
      0.35;

    if (
      body.angularVelocity >
      maxRotationSpeed
    ) {
      body.angularVelocity =
        maxRotationSpeed;
    }

    if (
      body.angularVelocity <
      -maxRotationSpeed
    ) {
      body.angularVelocity =
        -maxRotationSpeed;
    }
  }

  /* ============================================================
     SLEEP CHECK
     * ============================================================ */

  _checkSleep(body) {
    /*
     * Only sleep bodies that are sitting on the ground.
     */
    if (
      !body.grounded
    ) {
      body.sleeping = false;
      return;
    }

    const velocity =
      Math.abs(body.vx) +
      Math.abs(body.vy) +
      Math.abs(body.angularVelocity);

    if (
      velocity < 0.035
    ) {
      body.sleeping = true;

      body.vx = 0;
      body.vy = 0;
      body.angularVelocity = 0;
    }
  }

  /* ============================================================
     WAKE BODY
     * ============================================================ */

  wakeBody(body) {
    if (!body) {
      return;
    }

    body.sleeping = false;
    body.grounded = false;
  }

  /* ============================================================
     APPLY IMPULSE
     * ============================================================ */

  applyImpulse(
    body,
    forceX = 0,
    forceY = 0
  ) {
    if (!body) {
      return;
    }

    this.wakeBody(body);

    body.vx +=
      forceX /
      body.mass;

    body.vy +=
      forceY /
      body.mass;

    this._clampVelocity(
      body
    );
  }

  /* ============================================================
     APPLY SHAKE IMPULSE
     * ============================================================ */

  shakeBody(
    body,
    strength = 1
  ) {
    if (!body) {
      return;
    }

    this.wakeBody(body);

    const horizontal =
      (Math.random() - 0.5) *
      10 *
      strength;

    const vertical =
      (-12 -
        Math.random() * 7) *
      strength;

    const rotation =
      (Math.random() - 0.5) *
      0.3 *
      strength;

    body.vx =
      horizontal;

    body.vy =
      vertical;

    body.angularVelocity =
      rotation;

    body.isActive = true;

    this._clampVelocity(
      body
    );
  }

  /* ============================================================
     RESET BODY
     * ============================================================ */

  resetBody(
    body,
    x,
    y
  ) {
    if (!body) {
      return;
    }

    body.x =
      Number.isFinite(x)
        ? x
        : body.x;

    body.y =
      Number.isFinite(y)
        ? y
        : body.y;

    body.vx = 0;
    body.vy = 0;

    body.rotation = 0;

    body.angularVelocity = 0;

    body.grounded = false;
    body.sleeping = false;
    body.isActive = false;
  }

  /* ============================================================
     RESIZE
     * ============================================================ */

  resize(
    width,
    height,
    groundLevel
  ) {
    if (
      Number.isFinite(width)
    ) {
      this.width =
        width;
    }

    if (
      Number.isFinite(height)
    ) {
      this.height =
        height;
    }

    if (
      Number.isFinite(
        groundLevel
      )
    ) {
      this.groundLevel =
        groundLevel;
    } else {
      this.groundLevel =
        this.height *
        0.85;
    }
  }

  /* ============================================================
     GET ACTIVE BODIES
     * ============================================================ */

  getActiveBodies() {
    return this.bodies.filter(
      body =>
        body &&
        body.isActive
    );
  }

  /* ============================================================
     DESTROY
     * ============================================================ */

  destroy() {
    this.clear();
  }
}