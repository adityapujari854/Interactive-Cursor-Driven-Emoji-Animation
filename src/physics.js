/**
 * Lightweight 2D Physics Engine
 * --------------------------------
 * Used only when the user shakes the device.
 *
 * Features:
 * - Gravity
 * - Velocity
 * - Friction
 * - Bounce
 * - Wall collision
 * - Ground collision
 * - Emoji-to-emoji collision
 * - Resting detection
 *
 * Designed for 24 emoji objects and mobile performance.
 */

export class Physics {
  constructor(options = {}) {
    this.gravity =
      options.gravity !== undefined
        ? options.gravity
        : 0.62;

    this.friction =
      options.friction !== undefined
        ? options.friction
        : 0.985;

    this.bounce =
      options.bounce !== undefined
        ? options.bounce
        : 0.55;

    this.width =
      options.width || 1024;

    this.height =
      options.height || 768;

    this.groundLevel =
      options.groundLevel ||
      this.height * 0.9;

    /*
     * All physics bodies.
     */
    this.bodies = [];

    /*
     * Reusable active-body array.
     *
     * Avoids creating a new filtered array
     * every animation frame.
     */
    this.activeBodies = [];

    /*
     * Maximum physics step.
     *
     * Prevents huge jumps if the browser
     * temporarily freezes.
     */
    this.maxDelta = 2.5;
  }

  /**
   * Create a physics body.
   */
  createBody(options = {}) {
    const body = {
      x:
        options.x !== undefined
          ? options.x
          : 0,

      y:
        options.y !== undefined
          ? options.y
          : 0,

      vx:
        options.vx !== undefined
          ? options.vx
          : (Math.random() - 0.5) * 3,

      vy:
        options.vy !== undefined
          ? options.vy
          : 0,

      mass:
        options.mass !== undefined
          ? options.mass
          : 1,

      radius:
        options.radius !== undefined
          ? options.radius
          : 30,

      rotation:
        options.rotation !== undefined
          ? options.rotation
          : 0,

      angularVelocity:
        options.angularVelocity !== undefined
          ? options.angularVelocity
          : 0,

      /*
       * IMPORTANT:
       *
       * Physics bodies are inactive by default.
       *
       * They become active only after
       * the device shake.
       */
      isActive:
        options.isActive !== undefined
          ? options.isActive
          : false,

      isResting: false,

      restTimer: 0
    };

    this.bodies.push(body);

    return body;
  }

  /**
   * Update physics.
   *
   * deltaTime is expected in milliseconds.
   */
  update(deltaTime = 16.67) {
    if (
      !this.bodies.length
    ) {
      return;
    }

    /*
     * Convert milliseconds into
     * approximately 60 FPS frame units.
     */
    let dt =
      deltaTime / 16.67;

    /*
     * Prevent giant physics jumps.
     */
    dt =
      Math.min(
        Math.max(dt, 0),
        this.maxDelta
      );

    /*
     * Build reusable active body list.
     */
    this.activeBodies.length = 0;

    for (
      let i = 0;
      i < this.bodies.length;
      i++
    ) {
      const body =
        this.bodies[i];

      if (
        body &&
        body.isActive
      ) {
        this.activeBodies.push(
          body
        );
      }
    }

    /*
     * Nothing is currently falling.
     */
    if (
      this.activeBodies.length === 0
    ) {
      return;
    }

    /*
     * -------------------------
     * Individual body physics
     * -------------------------
     */
    for (
      let i = 0;
      i < this.activeBodies.length;
      i++
    ) {
      const body =
        this.activeBodies[i];

      /*
       * Gravity.
       */
      body.vy +=
        this.gravity * dt;

      /*
       * Horizontal friction.
       */
      body.vx *=
        Math.pow(
          this.friction,
          dt
        );

      /*
       * Slightly stronger vertical damping.
       */
      body.vy *=
        Math.pow(
          0.995,
          dt
        );

      /*
       * Position.
       */
      body.x +=
        body.vx * dt;

      body.y +=
        body.vy * dt;

      /*
       * Rotation.
       */
      body.rotation +=
        body.angularVelocity * dt;

      /*
       * Angular damping.
       */
      body.angularVelocity *=
        Math.pow(
          0.985,
          dt
        );

      /*
       * Walls.
       */
      this._handleBoundaryCollision(
        body
      );

      /*
       * Ground.
       */
      this._handleGroundCollision(
        body
      );

      /*
       * Rest detection.
       */
      this._updateRestState(
        body,
        dt
      );
    }

    /*
     * Emoji-to-emoji collisions.
     *
     * 24 bodies = only 276 possible pairs,
     * which is inexpensive.
     */
    if (
      this.activeBodies.length > 1
    ) {
      this._handleEmojiCollisions();
    }
  }

  /**
   * Update whether a body has settled.
   */
  _updateRestState(
    body,
    dt
  ) {
    const nearGround =
      body.y +
        body.radius >=
      this.groundLevel - 1;

    const slow =
      Math.abs(body.vx) < 0.12 &&
      Math.abs(body.vy) < 0.12 &&
      Math.abs(
        body.angularVelocity
      ) < 0.01;

    if (
      nearGround &&
      slow
    ) {
      body.restTimer += dt;

      /*
       * Around half a second at 60 FPS.
       */
      if (
        body.restTimer > 30
      ) {
        body.isResting = true;

        body.vx = 0;
        body.vy = 0;

        body.angularVelocity = 0;
      }
    } else {
      body.restTimer = 0;

      body.isResting = false;
    }
  }

  /**
   * Wall collision.
   */
  _handleBoundaryCollision(
    body
  ) {
    const radius =
      body.radius;

    /*
     * Left.
     */
    if (
      body.x - radius < 0
    ) {
      body.x = radius;

      body.vx =
        Math.abs(body.vx) *
        this.bounce;
    }

    /*
     * Right.
     */
    if (
      body.x + radius >
      this.width
    ) {
      body.x =
        this.width - radius;

      body.vx =
        -Math.abs(body.vx) *
        this.bounce;
    }

    /*
     * Top.
     */
    if (
      body.y - radius < 0
    ) {
      body.y = radius;

      /*
       * Don't make emojis bounce
       * aggressively from the ceiling.
       */
      body.vy =
        Math.abs(body.vy) *
        0.25;
    }
  }

  /**
   * Ground collision.
   */
  _handleGroundCollision(
    body
  ) {
    const ground =
      this.groundLevel;

    const bottom =
      body.y +
      body.radius;

    if (
      bottom >= ground
    ) {
      body.y =
        ground -
        body.radius;

      /*
       * Very small velocity:
       * stop instead of endlessly bouncing.
       */
      if (
        Math.abs(body.vy) < 1
      ) {
        body.vy = 0;
      } else {
        body.vy *=
          -this.bounce;
      }

      /*
       * Ground friction.
       */
      body.vx *= 0.92;

      /*
       * Reduce rotation on impact.
       */
      body.angularVelocity *=
        0.88;
    }
  }

  /**
   * Emoji-to-emoji collision.
   */
  _handleEmojiCollisions() {
    const bodies =
      this.activeBodies;

    const count =
      bodies.length;

    for (
      let i = 0;
      i < count;
      i++
    ) {
      const bodyA =
        bodies[i];

      for (
        let j = i + 1;
        j < count;
        j++
      ) {
        const bodyB =
          bodies[j];

        const dx =
          bodyB.x -
          bodyA.x;

        const dy =
          bodyB.y -
          bodyA.y;

        const distanceSquared =
          dx * dx +
          dy * dy;

        const minDistance =
          bodyA.radius +
          bodyB.radius;

        /*
         * Avoid sqrt when bodies
         * are obviously far apart.
         */
        if (
          distanceSquared >=
          minDistance *
            minDistance
        ) {
          continue;
        }

        /*
         * Prevent division by zero.
         */
        if (
          distanceSquared < 0.0001
        ) {
          bodyB.x += 0.1;

          continue;
        }

        const distance =
          Math.sqrt(
            distanceSquared
          );

        this._resolveCollision(
          bodyA,
          bodyB,
          dx,
          dy,
          distance
        );
      }
    }
  }

  /**
   * Resolve two circular body collisions.
   */
  _resolveCollision(
    bodyA,
    bodyB,
    dx,
    dy,
    distance
  ) {
    if (
      distance <= 0
    ) {
      return;
    }

    const nx =
      dx / distance;

    const ny =
      dy / distance;

    const minDistance =
      bodyA.radius +
      bodyB.radius;

    const overlap =
      minDistance -
      distance;

    /*
     * Separate the bodies.
     *
     * Split correction according to mass.
     */
    const totalMass =
      bodyA.mass +
      bodyB.mass;

    const correctionA =
      overlap *
      (bodyB.mass /
        totalMass);

    const correctionB =
      overlap *
      (bodyA.mass /
        totalMass);

    bodyA.x -=
      nx * correctionA;

    bodyA.y -=
      ny * correctionA;

    bodyB.x +=
      nx * correctionB;

    bodyB.y +=
      ny * correctionB;

    /*
     * Relative velocity.
     */
    const relativeVelocityX =
      bodyB.vx -
      bodyA.vx;

    const relativeVelocityY =
      bodyB.vy -
      bodyA.vy;

    const velocityAlongNormal =
      relativeVelocityX * nx +
      relativeVelocityY * ny;

    /*
     * Already moving apart.
     */
    if (
      velocityAlongNormal > 0
    ) {
      return;
    }

    /*
     * Low restitution makes the
     * emojis feel soft instead of
     * bouncing like rubber balls.
     */
    const restitution =
      0.32;

    const impulse =
      -(
        1 + restitution
      ) *
      velocityAlongNormal /
      (
        1 / bodyA.mass +
        1 / bodyB.mass
      );

    /*
     * Apply impulse.
     */
    bodyA.vx -=
      (
        impulse /
        bodyA.mass
      ) * nx;

    bodyA.vy -=
      (
        impulse /
        bodyA.mass
      ) * ny;

    bodyB.vx +=
      (
        impulse /
        bodyB.mass
      ) * nx;

    bodyB.vy +=
      (
        impulse /
        bodyB.mass
      ) * ny;

    /*
     * Small rotational reaction.
     */
    const rotationImpulse =
      impulse * 0.008;

    bodyA.angularVelocity -=
      rotationImpulse /
      bodyA.mass;

    bodyB.angularVelocity +=
      rotationImpulse /
      bodyB.mass;
  }

  /**
   * Activate all bodies.
   *
   * Used by shake animation.
   */
  activateAll() {
    for (
      let i = 0;
      i < this.bodies.length;
      i++
    ) {
      const body =
        this.bodies[i];

      body.isActive = true;
      body.isResting = false;
      body.restTimer = 0;
    }
  }

  /**
   * Deactivate all bodies.
   *
   * Used when emojis fly back
   * to their glass cubes.
   */
  deactivateAll() {
    for (
      let i = 0;
      i < this.bodies.length;
      i++
    ) {
      const body =
        this.bodies[i];

      body.isActive = false;

      body.vx = 0;
      body.vy = 0;

      body.angularVelocity = 0;

      body.isResting = true;

      body.restTimer = 0;
    }

    this.activeBodies.length = 0;
  }

  /**
   * Reset physics.
   */
  reset() {
    for (
      let i = 0;
      i < this.bodies.length;
      i++
    ) {
      const body =
        this.bodies[i];

      body.isActive = false;

      body.isResting = true;

      body.restTimer = 0;

      body.vx = 0;
      body.vy = 0;

      body.angularVelocity = 0;
    }

    this.activeBodies.length = 0;
  }

  /**
   * Get active bodies.
   */
  getActiveBodies() {
    return this.activeBodies;
  }

  /**
   * Update world dimensions.
   */
  resize(
    width,
    height,
    groundLevel = height * 0.9
  ) {
    this.width = width;

    this.height = height;

    this.groundLevel =
      groundLevel;
  }
}