/**
 * Lightweight 2D physics engine for 24 emojis
 * Handles gravity, velocity, collision, and bounce
 */

export class Physics {
  constructor(options = {}) {
    this.gravity = options.gravity || 0.5;
    this.friction = options.friction || 0.98;
    this.bounce = options.bounce || 0.6;
    this.width = options.width || 1024;
    this.height = options.height || 1024;
    this.groundLevel = options.groundLevel || this.height * 0.85;
    this.bodies = [];
  }

  /**
   * Create a physics body for an emoji
   */
  createBody(options = {}) {
    const body = {
      x: options.x || 0,
      y: options.y || 0,
      vx: options.vx !== undefined ? options.vx : (Math.random() - 0.5) * 4,
      vy: options.vy !== undefined ? options.vy : -15 - Math.random() * 8,
      mass: options.mass || 1 + Math.random() * 0.5,
      rotation: options.rotation !== undefined ? options.rotation : Math.random() * Math.PI * 2,
      angularVelocity: options.angularVelocity || (Math.random() - 0.5) * 0.3,
      radius: options.radius || 30,
      isActive: true,
      restTimer: 0,
      isResting: false
    };
    this.bodies.push(body);
    return body;
  }

  /**
   * Update physics simulation
   */
  update(deltaTime = 1) {
    const dt = Math.min(deltaTime / 16.67, 1); // Normalize to 60 FPS

    for (let body of this.bodies) {
      if (!body.isActive) continue;

      // Apply gravity
      body.vy += this.gravity * dt;

      // Apply friction
      body.vx *= this.friction;
      body.vy *= this.friction * 0.99; // Slightly more friction in Y

      // Update position
      body.x += body.vx * dt;
      body.y += body.vy * dt;

      // Update rotation
      body.rotation += body.angularVelocity * dt;

      // Boundary collisions
      this._handleBoundaryCollision(body);

      // Ground collision
      this._handleGroundCollision(body);

      // Check if settling
      if (Math.abs(body.vx) < 0.1 && Math.abs(body.vy) < 0.1 && body.y >= this.groundLevel - body.radius) {
        body.restTimer++;
        if (body.restTimer > 30) {
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

    // Simple emoji-to-emoji collision (broad phase only)
    this._handleEmojiCollisions();
  }

  /**
   * Boundary collision (walls)
   */
  _handleBoundaryCollision(body) {
    const padding = body.radius;

    // Left wall
    if (body.x - padding < 0) {
      body.x = padding;
      body.vx *= -this.bounce;
    }

    // Right wall
    if (body.x + padding > this.width) {
      body.x = this.width - padding;
      body.vx *= -this.bounce;
    }

    // Top wall
    if (body.y - padding < 0) {
      body.y = padding;
      body.vy *= -this.bounce * 0.5;
    }

    // Bottom wall (ground)
    if (body.y + padding > this.groundLevel) {
      body.y = this.groundLevel - padding;
      body.vy *= -this.bounce;
      body.angularVelocity *= 0.9;
    }
  }

  /**
   * Ground settling
   */
  _handleGroundCollision(body) {
    if (body.y + body.radius >= this.groundLevel) {
      body.y = this.groundLevel - body.radius;
      if (Math.abs(body.vy) < 0.5) {
        body.vy = 0;
      } else {
        body.vy *= -this.bounce;
      }
    }
  }

  /**
   * Simple emoji-to-emoji collision
   * Uses distance-based broad phase
   */
  _handleEmojiCollisions() {
    const activeBodies = this.bodies.filter(b => b.isActive);
    
    for (let i = 0; i < activeBodies.length; i++) {
      for (let j = i + 1; j < activeBodies.length; j++) {
        const b1 = activeBodies[i];
        const b2 = activeBodies[j];

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = b1.radius + b2.radius;

        if (distance < minDistance) {
          this._resolveCollision(b1, b2, dx, dy, distance);
        }
      }
    }
  }

  /**
   * Resolve collision between two bodies
   */
  _resolveCollision(b1, b2, dx, dy, distance) {
    if (distance === 0) return;

    // Normalize direction
    const nx = dx / distance;
    const ny = dy / distance;

    // Separate bodies
    const overlap = (b1.radius + b2.radius - distance) / 2;
    b1.x -= nx * overlap;
    b1.y -= ny * overlap;
    b2.x += nx * overlap;
    b2.y += ny * overlap;

    // Relative velocity
    const dvx = b2.vx - b1.vx;
    const dvy = b2.vy - b1.vy;
    const dvDot = dvx * nx + dvy * ny;

    // Only collide if moving toward each other
    if (dvDot >= 0) return;

    // Restitution (bounce)
    const restitution = 0.4;
    const impulse = -(1 + restitution) * dvDot / (1 / b1.mass + 1 / b2.mass);

    b1.vx -= (impulse / b1.mass) * nx;
    b1.vy -= (impulse / b1.mass) * ny;
    b2.vx += (impulse / b2.mass) * nx;
    b2.vy += (impulse / b2.mass) * ny;

    // Add some angular velocity from collision
    b1.angularVelocity -= (impulse / b1.mass) * 0.01;
    b2.angularVelocity += (impulse / b2.mass) * 0.01;
  }

  /**
   * Reset all bodies
   */
  reset() {
    this.bodies.forEach(body => {
      body.isActive = false;
      body.isResting = true;
    });
  }

  /**
   * Get all active bodies
   */
  getActiveBodies() {
    return this.bodies.filter(b => b.isActive);
  }
}
