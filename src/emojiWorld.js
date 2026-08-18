/**
 * Main PixiJS Emoji World Scene
 * Handles all sprites, cubes, animations, and interactions
 */

import * as PIXI from 'pixi.js';
import { Physics } from './physics.js';
import { GyroHandler } from './gyro.js';

export class EmojiWorld {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.isShaking = false;
    this.shakeRecoveryTime = 0;
    this.isRecovering = false;

    // PixiJS app
    this.app = null;

    // Containers
    this.cubesContainer = null;
    this.emojisContainer = null;
    this.titleContainer = null;

    // Emoji configuration
    this.emojiConfigs = this._getEmojiConfigs();

    // Emoji sprites and cubes
    this.emojis = [];
    this.cubes = [];
    this.emojiToggles = []; // Track which emoji is at home vs flying

    // Physics engine
    this.physics = null;

    // Input
    this.mouse = { x: this.width / 2, y: this.height / 2 };
    this.touchActive = false;

    // Gyroscope
    this.gyro = new GyroHandler();

    // Idle animation state
    this.idleTime = 0;

    this._init();
  }

  /**
   * Initialize the scene
   */
  async _init() {
    try {
      console.log('Initializing Emoji World...');
      await this._createPixiApp();
      console.log('PixiJS app created');
      
      await this._loadAssets();
      console.log('Assets loaded');
      
      this._setupScene();
      console.log('Scene setup complete');
      
      this._setupEventListeners();
      console.log('Event listeners attached');
      
      this._startAnimationLoop();
      console.log('Animation loop started');
      
      console.log('✨ Emoji World initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize Emoji World:', error);
      throw error;
    }
  }

  /**
   * Create PixiJS application
   */
  async _createPixiApp() {
    console.log('[Emoji World] Creating PixiJS Application...');
    
    this.app = new PIXI.Application({
      canvas: this.canvas,
      width: this.width,
      height: this.height,
      backgroundColor: 0x000000,
      antialias: true,
      autoDensity: true,
      resolution: this._getOptimalResolution(),
      sharedTicker: false
    });

    console.log('[Emoji World] PixiJS app created');
    console.log('[Emoji World] Renderer:', this.app.renderer ? 'initialized' : 'NOT initialized');
    console.log('[Emoji World] Canvas:', this.app.canvas ? 'attached' : 'NOT attached');
    
    // Create custom ticker for better control
    this.ticker = new PIXI.Ticker();
    this.ticker.speed = 1;
    this.ticker.start();

    console.log('[Emoji World] Custom ticker started');
    
    window.addEventListener('resize', () => this._onWindowResize());
  }

  /**
   * Get optimal resolution based on device
   */
  _getOptimalResolution() {
    const dpr = window.devicePixelRatio || 1;
    // Cap DPR at 1.5 for mobile performance
    return Math.min(dpr, 1.5);
  }

  /**
   * Load emoji assets
   */
  async _loadAssets() {
    console.log('[Emoji World] Loading 24 emoji textures from /assets/emojis/...');
    
    const assets = [];
    for (let i = 1; i <= 24; i++) {
      assets.push({
        alias: `emoji${i}`,
        src: `./assets/emojis/512 (${i}).webp`
      });
    }

    try {
      await PIXI.Assets.load(assets);
      console.log('[Emoji World] ✓ All 24 emoji textures loaded successfully');
    } catch (error) {
      console.warn('[Emoji World] Primary load failed, trying fallback path:', error);
      
      // Fallback: try loading from public
      const fallbackAssets = [];
      for (let i = 1; i <= 24; i++) {
        fallbackAssets.push({
          alias: `emoji${i}`,
          src: `/assets/emojis/512 (${i}).webp`
        });
      }
      
      try {
        await PIXI.Assets.load(fallbackAssets);
        console.log('[Emoji World] ✓ All 24 emoji textures loaded from fallback path');
      } catch (fallbackError) {
        console.error('[Emoji World] ✗ Failed to load emoji assets from both paths:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Set up the scene (containers, emojis, cubes)
   */
  _setupScene() {
    // Create containers
    this.cubesContainer = new PIXI.Container();
    this.emojisContainer = new PIXI.Container();
    this.titleContainer = new PIXI.Container();

    this.app.stage.addChild(this.cubesContainer);
    this.app.stage.addChild(this.emojisContainer);
    this.app.stage.addChild(this.titleContainer);

    // Create title
    this._createTitle();

    // Initialize physics
    this.physics = new Physics({
      width: this.width,
      height: this.height,
      groundLevel: this.height * 0.85,
      gravity: 0.5
    });

    // Create emojis and cubes
    this._createEmojisAndCubes();
    console.log(`[Emoji World] Created ${this.emojis.length} emojis and ${this.cubes.length} glass cubes`);

    // Adjust quality based on device
    this._adjustQualitySettings();
  }

  /**
   * Create title overlay
   */
  _createTitle() {
    const title = new PIXI.Text({
      text: 'The Emojis',
      style: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: Math.min(80, this.width * 0.12),
        fontWeight: 'normal',
        fill: 0xffffff,
        align: 'center',
        letterSpacing: 4,
        dropShadow: true,
        dropShadowAlpha: 0.3,
        dropShadowBlur: 8,
        dropShadowDistance: 4
      }
    });

    title.anchor.set(0.5, 0.5);
    title.x = this.width / 2;
    title.y = this.height * 0.1;
    title.alpha = 0.95;

    this.titleContainer.addChild(title);
  }

  /**
   * Get emoji configuration (personality)
   */
  _getEmojiConfigs() {
    const configs = [
      { index: 0, name: 'Happy',      idleType: 'bounce',     mass: 0.9,  idleSpeed: 0.02, idleAmplitude: 8 },
      { index: 1, name: 'Cool',       idleType: 'tilt',       mass: 1.1,  idleSpeed: 0.01, idleAmplitude: 5 },
      { index: 2, name: 'Love',       idleType: 'pulse',      mass: 0.8,  idleSpeed: 0.03, idleAmplitude: 10 },
      { index: 3, name: 'Awestruck',  idleType: 'sway',       mass: 1.0,  idleSpeed: 0.015, idleAmplitude: 6 },
      { index: 4, name: 'Thinking',   idleType: 'bob',        mass: 1.05, idleSpeed: 0.02, idleAmplitude: 7 },
      { index: 5, name: 'Angry',      idleType: 'vibrate',    mass: 1.2,  idleSpeed: 0.04, idleAmplitude: 3 },
      { index: 6, name: 'Party',      idleType: 'spin',       mass: 0.9,  idleSpeed: 0.01, idleAmplitude: 0 },
      { index: 7, name: 'Smirk',      idleType: 'tilt',       mass: 1.0,  idleSpeed: 0.015, idleAmplitude: 5 },
      { index: 8, name: 'Sleepy',     idleType: 'drift',      mass: 0.95, idleSpeed: 0.008, idleAmplitude: 4 },
      { index: 9, name: 'Shocked',    idleType: 'bounce',     mass: 1.1,  idleSpeed: 0.03, idleAmplitude: 9 },
      { index: 10, name: 'Scared',    idleType: 'tremble',    mass: 0.85, idleSpeed: 0.025, idleAmplitude: 2 },
      { index: 11, name: 'Cool2',     idleType: 'sway',       mass: 1.0,  idleSpeed: 0.012, idleAmplitude: 6 },
      { index: 12, name: 'Angel',     idleType: 'float',      mass: 0.8,  idleSpeed: 0.01, idleAmplitude: 8 },
      { index: 13, name: 'Sad',       idleType: 'droop',      mass: 1.15, idleSpeed: 0.02, idleAmplitude: 5 },
      { index: 14, name: 'Nerd',      idleType: 'twitch',     mass: 0.9,  idleSpeed: 0.035, idleAmplitude: 3 },
      { index: 15, name: 'Frustrated', idleType: 'shake',     mass: 1.1,  idleSpeed: 0.03, idleAmplitude: 4 },
      { index: 16, name: 'Tongue',    idleType: 'playful',    mass: 0.95, idleSpeed: 0.02, idleAmplitude: 7 },
      { index: 17, name: 'Kiss',      idleType: 'bob',        mass: 0.85, idleSpeed: 0.018, idleAmplitude: 6 },
      { index: 18, name: 'Cold',      idleType: 'shiver',     mass: 1.05, idleSpeed: 0.025, idleAmplitude: 2 },
      { index: 19, name: 'Melting',   idleType: 'droop',      mass: 1.0,  idleSpeed: 0.015, idleAmplitude: 4 },
      { index: 20, name: 'Grinning',  idleType: 'bounce',     mass: 0.9,  idleSpeed: 0.02, idleAmplitude: 8 },
      { index: 21, name: 'Winking',   idleType: 'tilt',       mass: 1.0,  idleSpeed: 0.015, idleAmplitude: 5 },
      { index: 22, name: 'Straight',  idleType: 'sway',       mass: 1.08, idleSpeed: 0.01, idleAmplitude: 3 },
      { index: 23, name: 'Slight',    idleType: 'drift',      mass: 0.92, idleSpeed: 0.012, idleAmplitude: 5 }
    ];
    return configs;
  }

  /**
   * Create emoji sprites and glass cubes
   */
  _createEmojisAndCubes() {
    const cols = 4;
    const rows = 6;
    const spacing = Math.min(this.width / (cols + 1), this.height / (rows + 2));
    const startX = this.width / 2 - (spacing * (cols - 1)) / 2;
    const startY = this.height / 2 - (spacing * (rows - 1)) / 2;

    for (let i = 0; i < 24; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * spacing;
      const y = startY + row * spacing;

      const config = this.emojiConfigs[i];

      // Create cube
      const cube = this._createGlassCube(x, y, spacing * 0.35);
      this.cubesContainer.addChild(cube);
      this.cubes.push({ sprite: cube, x, y });

      // Create emoji sprite
      const emoji = new PIXI.Sprite(PIXI.Assets.get(`emoji${i + 1}`));
      emoji.anchor.set(0.5, 0.5);
      emoji.scale.set(0.4);
      emoji.x = x;
      emoji.y = y - spacing * 0.15;
      emoji.zIndex = 10;

      // Store data
      emoji.config = config;
      emoji.idleTime = Math.random() * Math.PI * 2;
      emoji.originalX = x;
      emoji.originalY = y - spacing * 0.15;
      emoji.isFlying = false;
      emoji.flyProgress = 0;

      this.emojisContainer.addChild(emoji);
      this.emojis.push(emoji);

      // Physics body (for when shaking/falling)
      const physicsBody = this.physics.createBody({
        x: x,
        y: y,
        mass: config.mass
      });
      emoji.physicsBody = physicsBody;
    }

    // Enable interaction
    this.emojisContainer.zIndex = 15;
    this.emojisContainer.sortableChildren = true;
  }

  /**
   * Create glass cube
   */
  _createGlassCube(x, y, size) {
    const group = new PIXI.Container();

    // Main cube shape
    const cube = new PIXI.Graphics();
    
    // Draw cube (2D isometric-like)
    cube.beginFill(0x88ccff, 0.15);
    cube.lineStyle(2, 0xaaddff, 0.4);
    cube.drawRect(-size / 2, -size / 2, size, size);
    cube.endFill();

    // Add subtle highlights
    const highlight = new PIXI.Graphics();
    highlight.beginFill(0xffffff, 0.1);
    highlight.drawRect(-size / 2 + 2, -size / 2 + 2, size / 2 - 2, size / 2 - 2);
    highlight.endFill();

    // Shadow
    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000, 0.1);
    shadow.drawRect(-size / 2, size / 2 - 4, size, 4);
    shadow.endFill();

    group.addChild(shadow);
    group.addChild(cube);
    group.addChild(highlight);

    group.x = x;
    group.y = y;

    return group;
  }

  /**
   * Set up event listeners
   */
  _setupEventListeners() {
    // Mouse movement
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    // Touch
    document.addEventListener('touchstart', (e) => {
      this.touchActive = true;
      if (e.touches[0]) {
        this.mouse.x = e.touches[0].clientX;
        this.mouse.y = e.touches[0].clientY;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (e.touches[0]) {
        this.mouse.x = e.touches[0].clientX;
        this.mouse.y = e.touches[0].clientY;
      }
    });

    document.addEventListener('touchend', () => {
      this.touchActive = false;
    });

    // Request gyro/motion permission on user gesture
    document.addEventListener('click', () => {
      if (!this._permissionRequested) {
        this.gyro.requestPermission();
        this._permissionRequested = true;
      }
    });

    // Gyroscope interaction
    window.addEventListener('deviceorientation', () => {
      this._applyGyroInteraction();
    });

    window.addEventListener('devicemotion', () => {
      if (this.gyro.pollShake()) {
        this._onShakeDetected();
      }
    });
  }

  /**
   * Apply gyroscope-based interaction
   */
  _applyGyroInteraction() {
    if (!this.isShaking && !this.isRecovering) {
      const tilt = this.gyro.getTilt();
      const tiltForce = 15;

      this.emojis.forEach(emoji => {
        if (!emoji.isFlying) {
          const offsetX = tilt.x * tiltForce;
          const offsetY = tilt.y * tiltForce * 0.5;
          emoji.y = emoji.originalY + offsetY;
        }
      });
    }
  }

  /**
   * Handle shake detection
   */
  _onShakeDetected() {
    if (this.isShaking || this.isRecovering) return;

    this.isShaking = true;
    console.log('🌍 SHAKE DETECTED! Emojis are falling...');

    // Detach all emojis
    this.emojis.forEach((emoji, index) => {
      emoji.isFlying = true;
      const physicsBody = emoji.physicsBody;
      physicsBody.isActive = true;
      physicsBody.x = emoji.x;
      physicsBody.y = emoji.y;
      physicsBody.vy = -15 - Math.random() * 8;
      physicsBody.vx = (Math.random() - 0.5) * 8;
      physicsBody.angularVelocity = (Math.random() - 0.5) * 0.3;
    });

    // Schedule recovery
    this.shakeRecoveryTime = 2000; // 2 seconds before returning
  }

  /**
   * Return emojis to cubes (flying animation)
   */
  _returnEmojis() {
    if (this.isRecovering) return;

    this.isRecovering = true;
    this.isShaking = false;

    this.emojis.forEach((emoji) => {
      emoji.isFlying = true;
      emoji.flyProgress = 0;
    });

    console.log('✨ Emojis returning home...');
  }

  /**
   * Start animation loop
   */
  _startAnimationLoop() {
    this.ticker.add((delta) => {
      this._updateFrame(delta);
    });
  }

  /**
   * Update frame
   */
  _updateFrame(delta) {
    try {
      const dt = delta.deltaTime || 1;

      // Update shake timer
      if (this.isShaking && !this.isRecovering) {
        this.shakeRecoveryTime -= dt;
        if (this.shakeRecoveryTime <= 0) {
          this._returnEmojis();
        }
      }

      // Update physics
      if (this.physics) {
        this.physics.update(dt);
      }

      // Update emojis with error handling
      if (this.emojis && Array.isArray(this.emojis)) {
        this.emojis.forEach((emoji) => {
          try {
            if (!emoji) return; // Skip if emoji is null/undefined

            if (emoji.isFlying) {
              if (this.isRecovering) {
                // Flying back animation
                this._updateFlyingBackAnimation(emoji, dt);
              } else {
                // Falling animation
                this._updateFallingAnimation(emoji, dt);
              }
            } else {
              // Idle animation
              this._updateIdleAnimation(emoji, dt);
            }
          } catch (err) {
            console.error('[Emoji World] Error updating emoji:', err);
            // Continue to next emoji instead of crashing
          }
        });
      }

      // Handle window resize (with defensive checks)
      if (this.app && this.app.renderer && this.app.canvas) {
        const rendererWidth = this.app.canvas.width;
        const rendererHeight = this.app.canvas.height;
        
        if (rendererWidth !== this.width || rendererHeight !== this.height) {
          this.width = window.innerWidth;
          this.height = window.innerHeight;
          this.app.renderer.resize(this.width, this.height);
        }
      }
    } catch (err) {
      console.error('[Emoji World] Error in update frame:', err);
      // Continue animation loop even if frame update fails
    }
  }

  /**
   * Update idle animation
   */
  _updateIdleAnimation(emoji, dt) {
    // Defensive checks
    if (!emoji || !emoji.config || !emoji.scale || dt <= 0) {
      return;
    }

    const config = emoji.config;
    emoji.idleTime += config.idleSpeed * dt;

    const amplitude = config.idleAmplitude;
    const baseY = emoji.originalY;

    switch (config.idleType) {
      case 'bounce':
        emoji.y = baseY + Math.sin(emoji.idleTime) * amplitude * 0.7;
        break;
      case 'pulse':
        const scale = 1 + Math.sin(emoji.idleTime) * 0.1;
        emoji.scale.set(0.4 * scale);
        break;
      case 'sway':
        emoji.y = baseY + Math.sin(emoji.idleTime) * amplitude;
        emoji.rotation = Math.sin(emoji.idleTime * 0.5) * 0.1;
        break;
      case 'tilt':
        emoji.rotation = Math.sin(emoji.idleTime) * 0.15;
        emoji.y = baseY + Math.cos(emoji.idleTime * 1.5) * amplitude * 0.5;
        break;
      case 'spin':
        emoji.rotation += 0.02;
        break;
      case 'bob':
        emoji.y = baseY + Math.sin(emoji.idleTime * 1.5) * amplitude * 0.8;
        break;
      case 'drift':
        emoji.x = emoji.originalX + Math.sin(emoji.idleTime) * amplitude * 0.6;
        emoji.y = baseY + Math.cos(emoji.idleTime * 0.7) * amplitude * 0.5;
        break;
      case 'vibrate':
        emoji.x = emoji.originalX + (Math.random() - 0.5) * amplitude * 0.3;
        emoji.y = baseY + (Math.random() - 0.5) * amplitude * 0.2;
        break;
      case 'tremble':
        emoji.rotation = (Math.random() - 0.5) * 0.08;
        emoji.y = baseY + (Math.random() - 0.5) * amplitude * 0.4;
        break;
      case 'float':
        emoji.y = baseY + Math.sin(emoji.idleTime * 0.8) * amplitude;
        emoji.alpha = 0.8 + Math.sin(emoji.idleTime * 1.2) * 0.2;
        break;
      case 'droop':
        emoji.y = baseY + Math.cos(emoji.idleTime) * amplitude * 0.6;
        emoji.rotation = Math.sin(emoji.idleTime * 0.5) * 0.12;
        break;
      case 'twitch':
        if (Math.random() < 0.02) {
          emoji.x = emoji.originalX + (Math.random() - 0.5) * amplitude;
        }
        break;
      case 'shake':
        emoji.x = emoji.originalX + Math.sin(emoji.idleTime * 2) * amplitude * 0.4;
        emoji.y = baseY + Math.cos(emoji.idleTime * 2) * amplitude * 0.3;
        break;
      case 'playful':
        emoji.rotation = Math.sin(emoji.idleTime * 1.5) * 0.2;
        emoji.y = baseY + Math.sin(emoji.idleTime * 2) * amplitude * 0.5;
        break;
      case 'shiver':
        emoji.x = emoji.originalX + (Math.random() - 0.5) * amplitude * 0.5;
        emoji.y = baseY + (Math.random() - 0.5) * amplitude * 0.4;
        break;
      default:
        emoji.y = baseY;
    }

    // Add mouse proximity effect
    this._addMouseProximityEffect(emoji);
  }

  /**
   * Add mouse proximity effect (lightweight sprite-only)
   * Uses only sprite properties: position, scale, alpha
   * Does NOT use filters or renderer properties
   */
  _addMouseProximityEffect(emoji) {
    // Guard: if emoji or required properties don't exist, skip
    if (!emoji || !this.mouse) return;

    // Use emoji world coordinates directly (no renderer conversion needed)
    const emojiScreenX = emoji.x;
    const emojiScreenY = emoji.y;
    
    const dx = this.mouse.x - emojiScreenX;
    const dy = this.mouse.y - emojiScreenY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const proximityRange = 250; // pixels

    if (distance < proximityRange && distance > 0) {
      // Normalize distance: 0 (very close) to 1 (at range edge)
      const proximity = 1 - (distance / proximityRange);

      // Pull emoji slightly toward cursor
      const pullForce = proximity * 8; // max 8 pixels
      emoji.x += (dx / distance) * pullForce * 0.02;
      emoji.y += (dy / distance) * pullForce * 0.02;

      // Slight scale increase when near cursor
      const targetScale = 0.4 + proximity * 0.08; // 0.4 to 0.48
      emoji.scale.set(0.4 + (targetScale - 0.4) * 0.1); // lerp with damping

      // Slight brightness increase
      emoji.alpha = Math.min(1, 0.95 + proximity * 0.1);
    } else {
      // Return to normal state when far
      emoji.scale.set(0.4);
      emoji.alpha = 0.95;
    }
  }

  /**
   * Update falling animation
   */
  _updateFallingAnimation(emoji, dt) {
    const body = emoji.physicsBody;
    emoji.x = body.x;
    emoji.y = body.y;
    emoji.rotation = body.rotation;
  }

  /**
   * Update flying back animation
   */
  _updateFlyingBackAnimation(emoji, dt) {
    emoji.flyProgress = Math.min(1, emoji.flyProgress + dt / 1000); // 1 second return time

    const progress = emoji.flyProgress;
    const easeProgress = this._easeOutElastic(progress);

    // Interpolate from current position to original
    const body = emoji.physicsBody;
    emoji.x = body.x + (emoji.originalX - body.x) * easeProgress;
    emoji.y = body.y + (emoji.originalY - body.y) * easeProgress;

    // Smooth rotation back to 0
    emoji.rotation = body.rotation * (1 - easeProgress);

    if (emoji.flyProgress >= 1) {
      emoji.isFlying = false;
      emoji.flyProgress = 0;
      emoji.x = emoji.originalX;
      emoji.y = emoji.originalY;
      emoji.rotation = 0;
      emoji.physicsBody.isActive = false;
      this.isRecovering = false;
    }
  }

  /**
   * Easing function: elastic ease out
   */
  _easeOutElastic(t) {
    const c5 = (2 * Math.PI) / 4.5;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c5) + 1;
  }

  /**
   * Adjust quality based on device
   */
  _adjustQualitySettings() {
    const perfInfo = this._detectPerformanceTier();

    switch (perfInfo.tier) {
      case 'high':
        // Keep default high quality
        break;
      case 'medium':
        this.emojisContainer.filters = [];
        break;
      case 'low':
        this.app.ticker.speed = 0.75; // Reduce frame rate
        break;
    }
    
    console.log(`Quality tier: ${perfInfo.tier} (${perfInfo.device})`);
  }

  /**
   * Detect performance tier
   */
  _detectPerformanceTier() {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const dpr = window.devicePixelRatio || 1;

    if (!isIOS && !isAndroid) {
      return { tier: 'high', device: 'desktop' };
    }

    if (isIOS) {
      return { tier: 'high', device: 'ios' };
    }

    // Android - vary based on DPR
    if (dpr > 3) {
      return { tier: 'low', device: 'android-low' };
    } else if (dpr > 2) {
      return { tier: 'medium', device: 'android-mid' };
    } else {
      return { tier: 'high', device: 'android-high' };
    }
  }

  /**
   * Handle window resize
   */
  _onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }
}
