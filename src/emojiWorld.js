/*
 * The Emojis – Interactive Emoji Scanner & Cursor Animation
 * Copyright © 2026 Aditya Pujari
 * All Rights Reserved.
 */

/**
 * ================================================================
 * THE EMOJIS
 * EmojiWorld - PixiJS + Native Animated WebP
 * ================================================================
 *
 * Native HTML <img> elements are used for the animated WebP emojis.
 *
 * Desktop:
 *   - all 24 WebPs can animate
 *
 * Mobile / Tablet:
 *   - all 24 emojis remain visible
 *   - only 8 animated WebPs are active at once
 *   - inactive emojis use lightweight static frames
 *   - animation slots rotate using a shuffle bag
 *
 * Mobile shake:
 *   - pauses the 8-animation scheduler
 *   - all 24 emojis participate in physics
 *   - emojis visibly fall and bounce
 *   - emojis return to their original positions
 *   - scheduler resumes afterwards
 * ================================================================
 */

import * as PIXI from 'pixi.js';
import { selectValidatedEmojiSet } from './emojiAssets.js';


export class EmojiWorld {

  constructor(canvasElement, options = {}) {

    this.canvas =
      canvasElement;

    this.options =
      options;

    this.width =
      window.innerWidth;

    this.height =
      window.innerHeight;

    this.app =
      null;

    this.physics =
      null;

    this.gyro =
      null;

    this.cubesContainer =
      null;

    this.titleContainer =
      null;

    this.emojiLayer =
      null;


    /* ============================================================
       MOBILE / TABLET ANIMATION
       ============================================================ */

    this.isMobileOrTablet =
      this._detectMobileOrTablet();

    /*
     * Mobile animation balance:
     * Exactly 6 animated WebPs are active at once.
     * Animation slots are warmed and activated one at a time to
     * avoid decoder spikes and visible source-switch flicker.
     */
    this.mobileAnimationLimit =
      8;

    this.mobileActivationBatchSize =
      1;

    this.mobileActiveEmojis =
      new Set();

    this.mobileShuffleBag =
      [];

    this.mobileSchedulerTimer =
      null;

    this.mobileSchedulerGeneration =
      0;


    /* ============================================================
       MOBILE STATIC FRAME CACHE
       ============================================================ */

    /*
     * IMPORTANT:
     *
     * All 24 emojis must remain visible on mobile.
     *
     * Only 5 animated WebPs are active at once.
     * The remaining emojis use lightweight static
     * first-frame images.
     */

    this.mobileStaticFramePromises =
      new Map();

    this.mobileStaticFrameReady =
      new Set();

    this.mobileStaticFrameLoading =
      new Set();

    this.mobileStaticFrameGeneration =
      0;

    /* Mobile animated-WebP readiness cache.  The same <img> element is
     * reused; we never create a visual duplicate/overlay. */
    this.mobileAnimatedReady =
      new Set();

    this.mobileAnimatedLoading =
      new Map();


    /* ============================================================
       EMOJI OBJECTS
       ============================================================ */

    this.emojis =
      [];

    this.emojiAssets =
      [];

    this.refreshingEmojiSet =
      false;

    this.cubes =
      [];

    this.emojiConfigs =
      this._getEmojiConfigs();


    /* ============================================================
       POINTER / TOUCH
       ============================================================ */

    this.mouse = {

      x:
        this.width / 2,

      y:
        this.height / 2

    };

    this.touchActive =
      false;


    /* ============================================================
       AUDIO
       ============================================================ */

    /*
     * Background music and emoji talking sound.
     *
     * IMPORTANT:
     *
     * Browsers normally block autoplay until the user interacts
     * with the page. The audio objects are prepared here, but actual
     * playback starts from the first user gesture.
     */

    this.audio = {
      music:
        null,

      talking:
        null,

      musicVolume:
        1.00,

      talkingVolume:
        0.60,

      unlocked:
        false,

      talkingLastPlayedAt:
        0,

      talkingCooldown:
        650
    };

    this._boundAudioUnlock =
      () => {
        this._unlockAudio();
      };


    /* Best-effort asset protection. Browser-delivered assets cannot be made
       impossible to capture, but casual save/drag/context-menu downloads are
       blocked. */
    this._installAssetProtection();


    /* ============================================================
       SHAKE / RECOVERY
       ============================================================ */

    this.isShaking =
      false;

    this.isRecovering =
      false;

    this.shakeRecoveryTime =
      0;


    /* ============================================================
       GYRO PERMISSION
       ============================================================ */

    this._permissionRequested =
      false;

    this.lastHandledShakeSequence =
      0;


    /* ============================================================
       RESIZE
       ============================================================ */

    this._resizeHandler =
      () => {

        this._onWindowResize();

      };


    /* ============================================================
       FRAME FUNCTION
       ============================================================ */

    this._boundUpdateFrame =
      this._updateFrame.bind(
        this
      );


    /* ============================================================
       READY PROMISE
       ============================================================ */

    this.ready =
      this._init();

  }


  /* ================================================================
     BEST-EFFORT ASSET PROTECTION
     ================================================================ */

  _installAssetProtection() {

    const block = event => {
      event.preventDefault();
      event.stopPropagation();
      return false;
    };

    document.addEventListener('contextmenu', block, { capture: true });
    document.addEventListener('dragstart', block, { capture: true });
    document.addEventListener('selectstart', block, { capture: true });

    document.addEventListener('keydown', event => {
      const key = String(event.key || '').toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ['s', 'u'].includes(key)) {
        block(event);
      }
      if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key))) {
        block(event);
      }
    }, { capture: true });

  }


  /* ================================================================
     DEVICE DETECTION
     ================================================================ */

  _detectMobileOrTablet() {

    const userAgent =
      navigator.userAgent ||
      '';

    const touchPoints =
      navigator.maxTouchPoints ||
      0;

    const touchDevice =
      touchPoints > 0 ||
      'ontouchstart' in window;

    const mobileUserAgent =
      /Android|iPhone|iPad|iPod|Mobile|Tablet/i
        .test(
          userAgent
        );

    const smallViewport =
      Math.min(
        window.innerWidth,
        window.innerHeight
      ) <= 900;

    return (
      mobileUserAgent ||
      (
        touchDevice &&
        smallViewport
      )
    );

  }


  /* ================================================================
     INITIALIZATION
     ================================================================ */

  async _init() {

    try {

      console.log(
        '🎮 Initializing The Emojis...'
      );


      await this._createPixiApp();


      /*
       * Create the native HTML layer
       * before creating the emojis.
       */

      this._createEmojiDOMLayer();

      /* Create the lightweight cinematic atmosphere before the scene. */
      this._createCinematicScene();


      this._setupAudio();


      await this._setupScene();


      this._setupEventListeners();


      this._startAnimationLoop();

      this._finalizeInitialization();


      /*
       * Start mobile scheduler only after
       * all 24 emoji objects exist.
       */

      if (
        this.isMobileOrTablet
      ) {

        /*
         * Prepare stable first frames before the first animation slot
         * is allowed to start. This removes the initial static→WebP
         * decoder race that caused the first few emojis to flicker.
         */
        await this._prepareMobileStaticFrames();

        /* Warm all animated WebPs before the first visible slot.
         * They are decoded in tiny batches, so startup remains stable. */
        await this._prepareMobileAnimatedFrames();

        this._startMobileAnimationScheduler();

      }


      console.log(
        '✨ The Emojis initialized successfully!'
      );


      console.log(
        this.isMobileOrTablet
          ? '📱 Mobile/tablet mode: maximum 5 animated emojis'
          : '🖥️ Desktop mode: all 24 animations enabled'
      );


      return this;

    } catch (error) {

      console.error(
        '❌ Failed to initialize Emoji World:',
        error
      );

      throw error;

    }

  }


  /* ================================================================
     PIXI APPLICATION
     ================================================================ */

  async _createPixiApp() {

    console.log(
      '[Emoji World] Creating PixiJS 8 application...'
    );


    this.app =
      new PIXI.Application();


    await this.app.init({

      canvas:
        this.canvas,

      width:
        this.width,

      height:
        this.height,

      backgroundAlpha:
        0,

      antialias:
        false,

      autoDensity:
        true,

      resolution:
        this._getOptimalResolution(),

      preference:
        'webgl',

      powerPreference:
        'high-performance'

    });


    if (
      !this.app.canvas ||
      !this.app.renderer ||
      !this.app.stage
    ) {

      throw new Error(
        'PixiJS application did not initialize correctly.'
      );

    }


    this.app.canvas.style.display =
      'block';

    this.app.canvas.style.width =
      '100%';

    this.app.canvas.style.height =
      '100%';

    this.app.canvas.style.position =
      'fixed';

    this.app.canvas.style.inset =
      '0';

    this.app.canvas.style.zIndex =
      '1';

    this.app.canvas.style.pointerEvents =
      'none';


    window.addEventListener(
      'resize',
      this._resizeHandler,
      {
        passive:
          true
      }
    );


    console.log(
      '[Emoji World] ✓ PixiJS renderer initialized'
    );

  }


  /* ================================================================
     OPTIMAL PIXI RESOLUTION
     ================================================================ */

  _getOptimalResolution() {

    const dpr =
      window.devicePixelRatio ||
      1;


    if (
      this.isMobileOrTablet
    ) {

      return Math.min(
        dpr,
        1.5
      );

    }


    return Math.min(
      dpr,
      2
    );

  }


  /* ================================================================
     NATIVE WEBP DOM LAYER
     ================================================================ */

  _createEmojiDOMLayer() {

    let layer =
      document.getElementById(
        'emoji-layer'
      );


    if (!layer) {

      layer =
        document.createElement(
          'div'
        );

      layer.id =
        'emoji-layer';

      document.body.appendChild(
        layer
      );

    }


    this.emojiLayer =
      layer;


    layer.style.position =
      'fixed';

    layer.style.inset =
      '0';

    layer.style.width =
      '100%';

    layer.style.height =
      '100%';

    layer.style.pointerEvents =
      'none';

    layer.style.zIndex =
      '10';

    layer.style.overflow =
      'hidden';

    layer.style.contain =
      'layout style paint';


    console.log(
      '[Emoji World] ✓ Native WebP layer ready'
    );

  }

    /* ================================================================
     CINEMATIC ATMOSPHERE
     ================================================================ */

  _createCinematicScene() {
    const appRoot =
      document.getElementById('app') || document.body;

    let scene =
      document.getElementById('cinematic-scene');

    if (!scene) {
      scene = document.createElement('div');
      scene.id = 'cinematic-scene';
      scene.setAttribute('aria-hidden', 'true');

      const atmosphere = document.createElement('div');
      atmosphere.className = 'scene-atmosphere';

      const horizon = document.createElement('div');
      horizon.className = 'scene-horizon';

      const floor = document.createElement('div');
      floor.className = 'scene-floor-glow';

      const stars = document.createElement('div');
      stars.className = 'scene-particles';

      const vignette = document.createElement('div');
      vignette.className = 'scene-vignette';

      const grain = document.createElement('div');
      grain.className = 'scene-grain';

      const titleHalo = document.createElement('div');
      titleHalo.className = 'scene-title-halo';

      scene.append(
        atmosphere,
        horizon,
        floor,
        stars,
        titleHalo,
        vignette,
        grain
      );

      if (appRoot.firstChild) {
        appRoot.insertBefore(scene, appRoot.firstChild);
      } else {
        appRoot.appendChild(scene);
      }
    }

    this.cinematicScene = scene;
    this.cinematicTime = 0;
    this.cinematicIntro = 0;
    this.cinematicParallaxX = 0;
    this.cinematicParallaxY = 0;

    const particles =
      scene.querySelector('.scene-particles');

    if (particles && !particles.childElementCount) {
      const count = this.isMobileOrTablet ? 12 : 22;

      for (let i = 0; i < count; i++) {
        const particle = document.createElement('i');
        particle.className = 'scene-particle';
        particle.style.setProperty('--px', `${8 + Math.random() * 84}%`);
        particle.style.setProperty('--py', `${10 + Math.random() * 78}%`);
        particle.style.setProperty('--size', `${1 + Math.random() * 2.2}px`);
        particle.style.setProperty('--delay', `${-Math.random() * 9}s`);
        particle.style.setProperty('--duration', `${7 + Math.random() * 8}s`);
        particles.appendChild(particle);
      }
    }

    this._createEmojiRefreshControl();
    this._updateCinematicTheme();
  }

  /* ================================================================
     EMOJI SET REFRESH CONTROL
     ================================================================ */

  _createEmojiRefreshControl() {
    if (this.emojiRefreshButton) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'emoji-set-refresh';
    button.setAttribute('aria-label', 'Refresh emoji set');
    button.title = 'Refresh emojis';
    button.innerHTML = '<span aria-hidden="true">↻</span>';

    Object.assign(button.style, {
      position: 'fixed',
      left: '22px',
      top: '22px',
      width: '50px',
      height: '50px',
      zIndex: '10030',
      display: 'grid',
      placeItems: 'center',
      border: '1px solid rgba(255,255,255,.72)',
      borderRadius: '50%',
      background: 'rgba(255,255,255,.72)',
      color: '#25364a',
      boxShadow: '0 10px 30px rgba(15,23,42,.12), inset 0 1px 0 rgba(255,255,255,.95)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      cursor: 'none',
      fontSize: '27px',
      lineHeight: '1',
      fontWeight: '500',
      transition: 'transform 180ms ease, opacity 180ms ease, box-shadow 180ms ease'
    });

    button.addEventListener('mouseenter', () => {
      if (!this.refreshingEmojiSet) button.style.transform = 'rotate(-18deg) scale(1.06)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'none';
    });
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await this.refreshEmojiSet();
    });

    document.body.appendChild(button);
    this.emojiRefreshButton = button;
  }

  _setEmojiRefreshBusy(busy) {
    if (!this.emojiRefreshButton) return;
    this.emojiRefreshButton.disabled = Boolean(busy);
    this.emojiRefreshButton.style.opacity = busy ? '0.48' : '1';
    this.emojiRefreshButton.style.transform = busy ? 'rotate(180deg)' : 'none';
    this.emojiRefreshButton.querySelector('span')?.style.setProperty(
      'animation',
      busy ? 'emojiSetRefreshSpin 850ms linear infinite' : 'none'
    );
  }

  async refreshEmojiSet() {
    if (this.refreshingEmojiSet) return false;

    const scannerBusy = this.emojis.some((emoji) => emoji?.scannerState);
    if (scannerBusy || this.isShaking || this.isRecovering) return false;

    this.refreshingEmojiSet = true;
    this._setEmojiRefreshBusy(true);

    try {
      if (this.isMobileOrTablet) {
        this._stopMobileAnimationScheduler();
        this._stopAllMobileAnimations();
      }

      const excluded = new Set(this.emojis.map((emoji) => emoji.codePoint));
      const assets = await selectValidatedEmojiSet(24, excluded);

      this.emojiAssets = assets;
      this.mobileStaticFrameReady.clear();
      this.mobileStaticFrameLoading.clear();
      this.mobileAnimatedReady.clear();
      this.mobileAnimatedLoading.clear();

      for (let i = 0; i < this.emojis.length; i += 1) {
        const emoji = this.emojis[i];
        const asset = assets[i];
        if (!emoji?.element || !asset) continue;

        emoji.codePoint = asset.codePoint;
        emoji.char = asset.char;
        emoji.name = asset.name;
        emoji.url = asset.url;
        emoji.element.dataset.src = asset.url;
        emoji.element.dataset.codePoint = asset.codePoint;
        emoji.element.dataset.emojiChar = asset.char;
        emoji.element.dataset.emojiName = asset.name;
        emoji.element.alt = asset.name;
        emoji.staticURL = null;
        emoji.staticReady = false;
        emoji.animatedReady = false;
        emoji.animatedPreloadPromise = null;
        emoji.isMobileActive = false;
        emoji.animationEndsAt = 0;

        if (this.isMobileOrTablet) {
          emoji.element.removeAttribute('src');
          emoji.element.style.visibility = 'hidden';
          emoji.element.style.opacity = '0';
        } else {
          emoji.element.src = asset.url;
          emoji.element.style.visibility = 'visible';
          emoji.element.style.opacity = '1';
        }
      }

      if (this.isMobileOrTablet) {
        await this._prepareMobileStaticFrames();
        await this._prepareMobileAnimatedFrames();
        this._startMobileAnimationScheduler();
      }

      window.dispatchEvent(new CustomEvent('emoji-set-changed', {
        detail: { emojis: this.emojis.map((emoji) => ({
          index: emoji.index,
          codePoint: emoji.codePoint,
          char: emoji.char,
          name: emoji.name,
          url: emoji.url
        })) }
      }));

      console.log('🔄 Emoji set refreshed with 24 validated Noto animations.');
      return true;
    } catch (error) {
      console.error('[Emoji World] Emoji refresh failed:', error);
      return false;
    } finally {
      this.refreshingEmojiSet = false;
      this._setEmojiRefreshBusy(false);
    }
  }

  _updateCinematicTheme() {
    if (!this.cinematicScene) return;

    this.cinematicScene.dataset.theme =
      this.theme === 'dark' ? 'dark' : 'light';
  }

  _updateCinematicScene(dt) {
    if (!this.cinematicScene) return;

    this.cinematicTime += dt;
    this.visualTime = (this.visualTime || 0) + dt;

    this.cinematicIntro = Math.min(
      1,
      this.cinematicIntro + dt / 1.35
    );

    const isTouch =
      this.isMobileOrTablet ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;

    let targetX = this.mouse.x - this.width * 0.5;
    let targetY = this.mouse.y - this.height * 0.5;

    if (isTouch && this.gyro && typeof this.gyro.getTilt === 'function') {
      const tilt = this.gyro.getTilt();
      targetX = tilt.x * this.width * 0.34;
      targetY = tilt.y * this.height * 0.24;
    }

    targetX = Math.max(-this.width * 0.5, Math.min(this.width * 0.5, targetX));
    targetY = Math.max(-this.height * 0.5, Math.min(this.height * 0.5, targetY));

    const pxTarget = targetX * (this.isMobileOrTablet ? 0.012 : 0.018);
    const pyTarget = targetY * (this.isMobileOrTablet ? 0.009 : 0.014);

    this.cinematicParallaxX +=
      (pxTarget - this.cinematicParallaxX) * Math.min(1, dt * 5.5);
    this.cinematicParallaxY +=
      (pyTarget - this.cinematicParallaxY) * Math.min(1, dt * 5.5);

    const root = this.cinematicScene;
    root.style.setProperty('--scene-x', `${this.cinematicParallaxX.toFixed(2)}px`);
    root.style.setProperty('--scene-y', `${this.cinematicParallaxY.toFixed(2)}px`);
    root.style.setProperty('--scene-intro', this.cinematicIntro.toFixed(3));

    const lightX =
      Math.max(0, Math.min(100, (this.mouse.x / Math.max(1, this.width)) * 100));
    const lightY =
      Math.max(0, Math.min(100, (this.mouse.y / Math.max(1, this.height)) * 100));

    root.style.setProperty('--light-x', `${lightX.toFixed(1)}%`);
    root.style.setProperty('--light-y', `${lightY.toFixed(1)}%`);

    const pulse = 0.5 + 0.5 * Math.sin(this.cinematicTime * 0.72);
    root.style.setProperty('--scene-pulse', pulse.toFixed(3));
  }


  /* ================================================================
     EMOJI CONFIGURATION
     ================================================================ */

  _getEmojiConfigs() {

    return [

      {
        index: 0,
        name: 'Happy',
        idleType: 'bounce',
        mass: 0.9,
        idleSpeed: 0.055,
        idleAmplitude: 6
      },

      {
        index: 1,
        name: 'Cool',
        idleType: 'tilt',
        mass: 1.0,
        idleSpeed: 0.050,
        idleAmplitude: 7
      },

      {
        index: 2,
        name: 'Love',
        idleType: 'pulse',
        mass: 0.8,
        idleSpeed: 0.065,
        idleAmplitude: 5,
        scaleAmount: 0.05
      },

      {
        index: 3,
        name: 'Awestruck',
        idleType: 'sway',
        mass: 1.0,
        idleSpeed: 0.050,
        idleAmplitude: 7
      },

      {
        index: 4,
        name: 'Thinking',
        idleType: 'bob',
        mass: 1.05,
        idleSpeed: 0.050,
        idleAmplitude: 6
      },

      {
        index: 5,
        name: 'Angry',
        idleType: 'vibrate',
        mass: 1.2,
        idleSpeed: 0.075,
        idleAmplitude: 3
      },

      {
        index: 6,
        name: 'Party',
        idleType: 'bob',
        mass: 0.9,
        idleSpeed: 0.045,
        idleAmplitude: 2,
        spinSpeed: 0.010
      },

      {
        index: 7,
        name: 'Smirk',
        idleType: 'tilt',
        mass: 1.0,
        idleSpeed: 0.045,
        idleAmplitude: 6
      },

      {
        index: 8,
        name: 'Sleepy',
        idleType: 'drift',
        mass: 0.95,
        idleSpeed: 0.035,
        idleAmplitude: 7
      },

      {
        index: 9,
        name: 'Shocked',
        idleType: 'bounce',
        mass: 1.1,
        idleSpeed: 0.065,
        idleAmplitude: 8
      },

      {
        index: 10,
        name: 'Scared',
        idleType: 'tremble',
        mass: 0.85,
        idleSpeed: 0.070,
        idleAmplitude: 3
      },

      {
        index: 11,
        name: 'Cool 2',
        idleType: 'sway',
        mass: 1.0,
        idleSpeed: 0.045,
        idleAmplitude: 6
      },

      {
        index: 12,
        name: 'Angel',
        idleType: 'float',
        mass: 0.8,
        idleSpeed: 0.035,
        idleAmplitude: 8
      },

      {
        index: 13,
        name: 'Sad',
        idleType: 'droop',
        mass: 1.15,
        idleSpeed: 0.040,
        idleAmplitude: 5
      },

      {
        index: 14,
        name: 'Nerd',
        idleType: 'twitch',
        mass: 0.9,
        idleSpeed: 0.070,
        idleAmplitude: 3
      },

      {
        index: 15,
        name: 'Frustrated',
        idleType: 'shake',
        mass: 1.1,
        idleSpeed: 0.060,
        idleAmplitude: 4
      },

      {
        index: 16,
        name: 'Tongue',
        idleType: 'playful',
        mass: 0.95,
        idleSpeed: 0.060,
        idleAmplitude: 7
      },

      {
        index: 17,
        name: 'Kiss',
        idleType: 'bob',
        mass: 0.85,
        idleSpeed: 0.050,
        idleAmplitude: 6
      },

      {
        index: 18,
        name: 'Cold',
        idleType: 'shiver',
        mass: 1.05,
        idleSpeed: 0.075,
        idleAmplitude: 3
      },

      {
        index: 19,
        name: 'Melting',
        idleType: 'droop',
        mass: 1.0,
        idleSpeed: 0.040,
        idleAmplitude: 5
      },

      {
        index: 20,
        name: 'Grinning',
        idleType: 'bounce',
        mass: 0.9,
        idleSpeed: 0.060,
        idleAmplitude: 7
      },

      {
        index: 21,
        name: 'Winking',
        idleType: 'tilt',
        mass: 1.0,
        idleSpeed: 0.050,
        idleAmplitude: 6
      },

      {
        index: 22,
        name: 'Neutral',
        idleType: 'sway',
        mass: 1.05,
        idleSpeed: 0.038,
        idleAmplitude: 5
      },

      {
        index: 23,
        name: 'Slight Smile',
        idleType: 'drift',
        mass: 0.92,
        idleSpeed: 0.045,
        idleAmplitude: 6
      }

    ];

  }


  /* ================================================================
     GRID LAYOUT
     ================================================================ */

  _getGridLayout() {

    const isSmallScreen =
      this.width < 700;

    const cols =
      isSmallScreen
        ? 4
        : 6;

    const rows =
      Math.ceil(24 / cols);

    /* Keep the complete platform + emoji safely inside the viewport.
     * The old 20px mobile padding put the first/last platform partly
     * outside narrow screens. */
    const sidePadding =
      isSmallScreen
        ? Math.min(64, Math.max(46, this.width * 0.14))
        : 70;

    const top =
      isSmallScreen
        ? Math.max(108, this.height * 0.15)
        : 170;

    const bottom =
      Math.min(
        this.height - (isSmallScreen ? 28 : 45),
        this.height * (isSmallScreen ? 0.94 : 0.90)
      );

    const availableWidth =
      Math.max(
        220,
        this.width - sidePadding * 2
      );

    const availableHeight =
      Math.max(
        260,
        bottom - top
      );

    const xSpacing =
      cols > 1
        ? availableWidth / (cols - 1)
        : availableWidth;

    const ySpacing =
      rows > 1
        ? availableHeight / (rows - 1)
        : availableHeight;

    const spacing =
      Math.min(xSpacing, ySpacing);

    const gridWidth =
      spacing * (cols - 1);

    const gridHeight =
      spacing * (rows - 1);

    const startX =
      this.width / 2 - gridWidth / 2;

    const startY =
      top + (availableHeight - gridHeight) / 2;

    /* Smaller, more consistent mobile sizing prevents the emoji and
     * glass platform from touching the viewport edges. */
    const emojiSize =
      isSmallScreen
        ? Math.max(50, Math.min(76, spacing * 0.62))
        : Math.max(60, Math.min(110, spacing * 0.70));

    const cubeSize =
      isSmallScreen
        ? Math.max(58, Math.min(78, spacing * 0.76))
        : Math.max(68, Math.min(120, spacing * 0.82));

    return {
      cols, rows, sidePadding, top, bottom,
      availableWidth, availableHeight,
      xSpacing, ySpacing, spacing,
      gridWidth, gridHeight, startX, startY,
      emojiSize, cubeSize
    };

  }

  /* ================================================================
     CREATE 24 VALIDATED NOTO EMOJI ELEMENTS
     ================================================================ */

  async _createEmojis() {

    console.log(
      '[Emoji World] Validating Noto Emoji animation assets...'
    );

    this.nextSoundAt =
      performance.now() +
      3000 +
      Math.random() * 5000;

    this.emojis.forEach((emoji) => {
      if (emoji?.element?.parentNode) {
        emoji.element.parentNode.removeChild(emoji.element);
      }
    });

    this.emojis = [];
    this.mobileStaticFrameReady.clear();
    this.mobileStaticFrameLoading.clear();
    this.mobileAnimatedReady.clear();
    this.mobileAnimatedLoading.clear();

    const assets = await selectValidatedEmojiSet(24);
    this.emojiAssets = assets;

    const layout = this._getGridLayout();
    const { cols, spacing, startX, startY, emojiSize } = layout;

    for (let i = 0; i < assets.length; i += 1) {
      const asset = assets[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * spacing;
      const y = startY + row * spacing;

      const element = document.createElement('img');
      element.className = 'emoji-webp';
      element.alt = asset.name;
      element.draggable = false;
      element.decoding = 'async';
      element.setAttribute('aria-hidden', 'true');
      element.style.position = 'absolute';
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.width = `${emojiSize}px`;
      element.style.height = `${emojiSize}px`;
      element.style.transform = 'translate(-50%, -50%)';
      element.style.objectFit = 'contain';
      element.style.pointerEvents = 'none';
      element.style.userSelect = 'none';
      element.style.webkitUserDrag = 'none';
      element.style.visibility = 'hidden';
      element.style.opacity = '0';

      /*
       * The URL has already passed an image-load/decode check. It is safe to
       * use as the real animated source; no broken-image element is exposed.
       */
      element.dataset.src = asset.url;
      element.dataset.codePoint = asset.codePoint;
      element.dataset.emojiChar = asset.char;
      element.dataset.emojiName = asset.name;

      if (!this.isMobileOrTablet) {
        element.src = asset.url;
        element.style.visibility = 'visible';
        element.style.opacity = '1';
      }

      this.emojiLayer.appendChild(element);

      this.emojis.push({
        index: i,
        element,
        x,
        y,
        originalX: x,
        originalY: y,
        targetX: x,
        targetY: y,
        size: emojiSize,
        rotation: 0,
        scale: 1,
        cursorOffsetX: 0,
        cursorOffsetY: 0,
        idleTime: Math.random() * Math.PI * 2,
        isFlying: false,
        scannerState: null,
        scannerOriginalParent: null,
        scannerOriginalNextSibling: null,
        isMobileActive: false,
        animationEndsAt: 0,
        staticReady: false,
        staticURL: null,
        animatedReady: false,
        animatedPreloadPromise: null,
        physicsBody: null,
        codePoint: asset.codePoint,
        char: asset.char,
        name: asset.name,
        url: asset.url,
        config: this.emojiConfigs[i]
      });
    }

    console.log(
      `[Emoji World] ✓ ${this.emojis.length}/24 validated Noto Emoji animations ready`
    );
  }

  /* ================================================================
     MOBILE STATIC FRAME PREPARATION
     ================================================================ */

  async _prepareMobileStaticFrames() {

    if (
      !this.isMobileOrTablet ||
      !this.emojis ||
      this.emojis.length === 0
    ) {

      return;

    }


    const generation =
      ++this.mobileStaticFrameGeneration;


    /*
     * Small batches prevent all 24 images
     * from decoding simultaneously.
     */

    const batchSize =
      3;


    for (
      let start = 0;
      start < this.emojis.length;
      start += batchSize
    ) {

      if (
        generation !==
        this.mobileStaticFrameGeneration
      ) {

        return;

      }


      const batch =
        this.emojis.slice(
          start,
          start + batchSize
        );


      await Promise.all(
        batch.map(
          emoji =>
            this._prepareOneMobileStaticFrame(
              emoji
            )
        )
      );


      /*
       * Give the browser rendering time
       * before processing the next batch.
       */

      await new Promise(
        resolve => {

          requestAnimationFrame(
            () => {

              requestAnimationFrame(
                resolve
              );

            }
          );

        }
      );

    }

  }


  /* ================================================================
     PREPARE ONE MOBILE STATIC FRAME
     ================================================================ */

  async _prepareOneMobileStaticFrame(
    emoji
  ) {

    if (
      !emoji ||
      !emoji.element ||
      !emoji.element.dataset.src
    ) {

      return;

    }


    if (
      this.mobileStaticFrameReady.has(
        emoji.index
      )
    ) {

      return;

    }


    if (
      this.mobileStaticFrameLoading.has(
        emoji.index
      )
    ) {

      return;

    }


    this.mobileStaticFrameLoading.add(
      emoji.index
    );


    const src =
      emoji.element.dataset.src;


    try {

      const response =
        await fetch(
          src,
          {
            cache:
              'force-cache'
          }
        );


      if (
        !response.ok
      ) {

        throw new Error(
          `HTTP ${response.status}`
        );

      }


      const blob =
        await response.blob();


      /*
       * ------------------------------------------------------------
       * IMPORTANT QUALITY FIX
       * ------------------------------------------------------------
       *
       * Do NOT resize the frame down to emoji.size.
       *
       * The emoji is displayed using CSS at approximately
       * 50–100px, but the source WebP is 512px.
       *
       * Keep the static frame at high resolution so the browser
       * has enough pixels when rendering the transformed image.
       */

      const bitmap =
        await createImageBitmap(
          blob
        );


      const sourceWidth =
        bitmap.width ||
        512;


      const sourceHeight =
        bitmap.height ||
        512;


      /*
       * Keep the original resolution, but never exceed 512px.
       */

      const maxSize =
        512;


      const scale =
        Math.min(
          1,
          maxSize /
          Math.max(
            sourceWidth,
            sourceHeight
          )
        );


      const canvasWidth =
        Math.max(
          1,
          Math.round(
            sourceWidth *
            scale
          )
        );


      const canvasHeight =
        Math.max(
          1,
          Math.round(
            sourceHeight *
            scale
          )
        );


      const canvas =
        document.createElement(
          'canvas'
        );


      canvas.width =
        canvasWidth;


      canvas.height =
        canvasHeight;


      const context =
        canvas.getContext(
          '2d',
          {
            alpha:
              true
          }
        );


      if (
        !context
      ) {

        bitmap.close();

        return;

      }


      context.imageSmoothingEnabled =
        true;


      context.imageSmoothingQuality =
        'high';


      context.drawImage(
        bitmap,
        0,
        0,
        canvasWidth,
        canvasHeight
      );


      bitmap.close();


      /*
       * Convert the first frame to a PNG
       * data URL.
       *
       * This gives inactive emojis a
       * stable high-quality static image
       * instead of keeping their animated
       * WebP running.
       */

      const staticURL =
        canvas.toDataURL(
          'image/png'
        );


      emoji.staticURL =
        staticURL;


      emoji.staticReady =
        true;

      /* Pre-decode the animation before ever switching the same <img>
       * element from the static frame to the animated WebP. */
      this._preloadMobileAnimated(emoji);


      this.mobileStaticFrameReady.add(
        emoji.index
      );


      /*
       * If this emoji is not currently
       * active, immediately display the
       * static frame.
       */

      if (
        !emoji.isMobileActive &&
        !emoji.isFlying &&
        emoji.element
      ) {

        emoji.element.src =
          staticURL;

        emoji.element.style.visibility =
          'visible';

        emoji.element.style.opacity =
          '1';

      }

    } catch (error) {

      console.warn(
        `[Emoji World] Static frame failed for emoji ${emoji.index + 1}:`,
        error
      );

    } finally {

      this.mobileStaticFrameLoading.delete(
        emoji.index
      );

    }

  }


  /* ================================================================
     SETUP AUDIO
     ================================================================ */

  _setupAudio() {

  try {

    /*
     * ------------------------------------------------------------
     * AUDIO PATHS
     * ------------------------------------------------------------
     *
     * CURRENT PROJECT:
     *
     * assets/sound/
     *
     */

    const musicURL =
      '/assets/sound/emojis_music.mp3';

    const talkingURL =
      '/assets/sound/emojis_talking.mp3';


    /*
     * ------------------------------------------------------------
     * BACKGROUND MUSIC
     * ------------------------------------------------------------
     */

    const music =
      new Audio(
        musicURL
      );

    music.loop =
      true;

    music.volume =
      1.00;

    music.preload =
      'auto';

    music.autoplay =
      true;

    music.setAttribute(
      'playsinline',
      ''
    );


    /*
     * ------------------------------------------------------------
     * TALKING SOUND
     * ------------------------------------------------------------
     */

    const talking =
      new Audio(
        talkingURL
      );

    talking.loop =
      true;

    talking.volume =
      0.60;

    talking.preload =
      'auto';

    talking.autoplay =
      true;

    talking.setAttribute(
      'playsinline',
      ''
    );

    music.setAttribute('controlslist', 'nodownload noplaybackrate');
    talking.setAttribute('controlslist', 'nodownload noplaybackrate');
    music.disableRemotePlayback = true;
    talking.disableRemotePlayback = true;


    /*
     * ------------------------------------------------------------
     * STORE
     * ------------------------------------------------------------
     */

    this.audio.music =
      music;

    this.audio.talking =
      talking;


    /*
     * ------------------------------------------------------------
     * DEBUG
     * ------------------------------------------------------------
     */

    music.addEventListener(
      'loadeddata',
      () => {

        console.log(
          '✅ MUSIC LOADED:',
          music.src
        );

      }
    );

    talking.addEventListener(
      'loadeddata',
      () => {

        console.log(
          '✅ TALKING SOUND LOADED:',
          talking.src
        );

      }
    );


    music.addEventListener(
      'error',
      () => {

        console.error(
          '❌ MUSIC FILE ERROR:',
          music.src,
          music.error
        );

      }
    );


    talking.addEventListener(
      'error',
      () => {

        console.error(
          '❌ TALKING FILE ERROR:',
          talking.src,
          talking.error
        );

      }
    );


    /*
     * Preload.
     */

    music.load();

    talking.load();

    /*
     * Attempt audible autoplay immediately when the page loads.
     */
    this._unlockAudio();


    /*
     * ------------------------------------------------------------
     * USER GESTURE UNLOCK
     * ------------------------------------------------------------
     */

    document.addEventListener(
      'pointerdown',
      this._boundAudioUnlock,
      {
        passive: true
      }
    );

    document.addEventListener(
      'keydown',
      this._boundAudioUnlock,
      {
        passive: true
      }
    );


    console.log(
      '🔊 Audio system initialized'
    );

    console.log(
      '🎵 Music URL:',
      music.src
    );

    console.log(
      '🗣️ Talking URL:',
      talking.src
    );

  } catch (error) {

    console.error(
      '❌ Audio setup failed:',
      error
    );

  }

}


  /* ================================================================
     UNLOCK AUDIO
     ================================================================ */

  _unlockAudio() {

    if (
      !this.audio ||
      !this.audio.music ||
      !this.audio.talking
    ) {
      return;
    }

    const music =
      this.audio.music;

    const talking =
      this.audio.talking;

    music.volume =
      this.audio.musicVolume;

    talking.volume =
      this.audio.talkingVolume;

    music.loop =
      true;

    talking.loop =
      true;

    /*
     * Best-effort immediate autoplay.
     *
     * If the browser allows audible autoplay, both streams begin
     * during page initialization. If the browser blocks audible
     * autoplay, the same call succeeds on the first allowed user
     * gesture. There is no JavaScript API that can bypass that
     * browser security policy.
     */
    const musicPromise =
      music.paused
        ? music.play()
        : Promise.resolve();

    const talkingPromise =
      talking.paused
        ? talking.play()
        : Promise.resolve();

    Promise.allSettled([
      musicPromise,
      talkingPromise
    ]).then(results => {

      const musicOK =
        results[0]?.status ===
        'fulfilled';

      const talkingOK =
        results[1]?.status ===
        'fulfilled';

      this.audio.unlocked =
        musicOK &&
        talkingOK;

      if (
        this.audio.unlocked
      ) {

        console.log(
          '🔊 MUSIC + TALKING AUDIO PLAYING FROM LOAD'
        );

      } else {

        console.warn(
          '⚠️ Audible autoplay was blocked by the browser; waiting for the first allowed user gesture.'
        );

      }

    });

  }


  /* ================================================================
     PLAY TALKING SOUND
     ================================================================ */

  _playTalkingSound() {

    if (
      !this.audio ||
      !this.audio.talking ||
      !this.audio.unlocked
    ) {
      return;
    }

    const talking = this.audio.talking;
    talking.loop = true;
    talking.volume = this.audio.talkingVolume;

    /* Never interrupt or restart the file. Let it play to completion. */
    if (!talking.paused) {
      return;
    }

    try {
      const promise = talking.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(error => console.warn('⚠️ Talking sound playback failed:', error));
      }
    } catch (error) {
      console.warn('⚠️ Talking sound failed:', error);
    }

  }


  /* ================================================================
     START ANIMATION LOOP
     ================================================================ */

  _startAnimationLoop() {

    if (
      !this.app ||
      !this.app.ticker
    ) {

      return;

    }


    /*
     * Prevent duplicate ticker callbacks.
     */

    this.app.ticker.remove(
      this._boundUpdateFrame
    );


    this.app.ticker.add(
      this._boundUpdateFrame
    );


    console.log(
      '[Emoji World] ✓ Animation loop started'
    );

  }


  /* ================================================================
     SETUP SCENE
     ================================================================ */

  async _setupScene() {

    /*
     * ------------------------------------------------------------
     * GLASS PLATFORM CONTAINER
     * ------------------------------------------------------------
     */

    this.cubesContainer =
      new PIXI.Container();


    this.cubesContainer.sortableChildren =
      true;


    this.cubesContainer.zIndex =
      1;


    this.app.stage.addChild(
      this.cubesContainer
    );


    /*
     * ------------------------------------------------------------
     * TITLE CONTAINER
     * ------------------------------------------------------------
     */

    this.titleContainer =
      new PIXI.Container();


    this.titleContainer.zIndex =
      100;


    this.app.stage.addChild(
      this.titleContainer
    );


    /*
     * ------------------------------------------------------------
     * TITLE
     * ------------------------------------------------------------
     */

    this._createTitle();


    /*
     * ------------------------------------------------------------
     * EMOJIS + GLASS PLATFORMS
     * ------------------------------------------------------------
     */

    await this._createEmojisAndCubes();


    /* Reposition after creating the scene. No physics engine is used. */
    this._repositionEmojisAndCubes();


    console.log(
      '[Emoji World] ✓ Scene created'
    );

  }


  /* ================================================================
     CREATE TITLE
     ================================================================ */

  _createTitle() {

    const title =
      new PIXI.Text({

        text:
          'The Emojis',

        style: {
            fontFamily:
                'Arial, Helvetica, sans-serif',

            fontSize:
                this._getTitleSize(),

            fontWeight:
                '700',

            fill:
                0x111111,

            align:
                'center',

            letterSpacing:
                1,

            dropShadow: {
                color:
                0x000000,

                alpha:
                0.14,

                blur:
                8,

                distance:
                3,

                angle:
                Math.PI / 2
            }
        }

      });


    title.anchor.set(
      0.5
    );


    title.x =
      this.width / 2;


    title.y =
      this._getTitleY();


    this.titleContainer.addChild(
      title
    );


    this.title =
      title;


    /*
     * Title animation state.
     */

    this.titleBaseY =
      title.y;


    this.titleAnimationTime =
      0;


    this.titleEntranceProgress =
      0;


    /*
     * Slight initial scale for
     * the entrance animation.
     */

    title.alpha =
      0;


    title.scale.set(
      0.94
    );

  }


  /* ================================================================
     TITLE SIZE
     ================================================================ */

  _getTitleSize() {

    if (
      this.width < 500
    ) {

      return 34;

    }


    if (
      this.width < 900
    ) {

      return 42;

    }


    return 52;

  }


  /* ================================================================
     TITLE Y POSITION
     ================================================================ */

  _getTitleY() {

    if (
      this.width < 500
    ) {

      return 52;

    }


    return 65;

  }


  /* ================================================================
     CREATE EMOJIS + GLASS PLATFORMS
     ================================================================ */

  async _createEmojisAndCubes() {

    this.cubes =
      [];


    if (
      this.cubesContainer
    ) {

      this.cubesContainer.removeChildren();

    }


    /*
     * Create the 24 native WebP elements.
     */

    await this._createEmojis();


    const layout =
      this._getGridLayout();


    const {
      cols,
      spacing,
      startX,
      startY,
      emojiSize,
      cubeSize
    } =
      layout;


    for (
      let i = 0;
      i < this.emojis.length;
      i++
    ) {

      const emoji =
        this.emojis[i];


      if (
        !emoji
      ) {

        continue;

      }


      const col =
        i % cols;


      const row =
        Math.floor(
          i / cols
        );


      const x =
        startX +
        col *
        spacing;


      const y =
        startY +
        row *
        spacing;


      emoji.x =
        x;


      emoji.y =
        y;


      emoji.originalX =
        x;


      emoji.originalY =
        y;


      emoji.targetX =
        x;


      emoji.targetY =
        y;


      emoji.size =
        emojiSize;


      if (
        emoji.element
      ) {

        emoji.element.style.left =
          `${x}px`;

        emoji.element.style.top =
          `${y}px`;

        emoji.element.style.width =
          `${emojiSize}px`;

        emoji.element.style.height =
          `${emojiSize}px`;

      }


      /*
       * Create glass platform.
       */

      const cube =
        this._createGlassCube(
          x,
          y +
          emojiSize *
          0.43,
          cubeSize
        );


      cube.zIndex =
        i;


      this.cubesContainer.addChild(
        cube
      );


      this.cubes.push({

        sprite:
          cube,

        x:
          x,

        y:
          y,

        index:
          i,

        entranceDelay:
          Math.min(0.42, i * 0.018)

      });

    }


    this.cubesContainer.zIndex =
      1;


    this.titleContainer.zIndex =
      100;

  }


  /* ================================================================
     GLASS PLATFORM
     ================================================================ */

  _createGlassCube(
    x,
    y,
    size
  ) {

    const group =
      new PIXI.Container();


    /*
     * ------------------------------------------------------------
     * GLASS BODY
     * ------------------------------------------------------------
     */

    const glass =
      new PIXI.Graphics();


    glass
      .roundRect(
        -size / 2,
        -size * 0.15,
        size,
        size * 0.35,
        16
      )
      .fill({

        color:
          0xffffff,

        alpha:
          0.58

      })
      .stroke({

        color:
          0xcbdbe8,

        alpha:
          0.88,

        width:
          1.5

      });


    group.addChild(
      glass
    );


    /*
     * ------------------------------------------------------------
     * INNER GLASS
     * ------------------------------------------------------------
     */

    const innerGlass =
      new PIXI.Graphics();


    innerGlass
      .roundRect(
        -size * 0.43,
        -size * 0.11,
        size * 0.86,
        size * 0.25,
        11
      )
      .fill({

        color:
          0xffffff,

        alpha:
          0.52

      });


    group.addChild(
      innerGlass
    );


    /*
     * ------------------------------------------------------------
     * MAIN HIGHLIGHT
     * ------------------------------------------------------------
     */

    const highlight =
      new PIXI.Graphics();


    highlight
      .roundRect(
        -size * 0.36,
        -size * 0.085,
        size * 0.50,
        size * 0.055,
        8
      )
      .fill({

        color:
          0xffffff,

        alpha:
          0.82

      });


    group.addChild(
      highlight
    );


    /*
     * ------------------------------------------------------------
     * MICRO HIGHLIGHT
     * ------------------------------------------------------------
     */

    const microHighlight =
      new PIXI.Graphics();


    microHighlight
      .roundRect(
        size * 0.18,
        size * 0.005,
        size * 0.15,
        size * 0.035,
        5
      )
      .fill({

        color:
          0xffffff,

        alpha:
          0.38

      });


    group.addChild(
      microHighlight
    );


    /*
     * ------------------------------------------------------------
     * EDGE LIGHT
     * ------------------------------------------------------------
     */

    const edgeLight =
      new PIXI.Graphics();


    edgeLight
      .roundRect(
        -size * 0.47,
        -size * 0.13,
        size * 0.94,
        size * 0.31,
        15
      )
      .stroke({

        color:
          0xffffff,

        alpha:
          0.62,

        width:
          1.0

      });


    group.addChild(
      edgeLight
    );


    /*
     * Cinematic glass sheen: a narrow diagonal reflection and a
     * lower bevel make the platform read as a solid piece of glass.
     */
    const reflection = new PIXI.Graphics();
    reflection
      .roundRect(
        -size * 0.31,
        -size * 0.055,
        size * 0.26,
        size * 0.028,
        5
      )
      .fill({ color: 0xffffff, alpha: 0.48 });
    reflection.rotation = -0.10;
    group.addChild(reflection);

    const lowerBevel = new PIXI.Graphics();
    lowerBevel
      .roundRect(
        -size * 0.39,
        size * 0.105,
        size * 0.78,
        size * 0.028,
        6
      )
      .fill({ color: 0xffffff, alpha: 0.20 });
    group.addChild(lowerBevel);

    const rimGlow = new PIXI.Graphics();
    rimGlow
      .roundRect(
        -size * 0.45,
        -size * 0.13,
        size * 0.90,
        size * 0.30,
        15
      )
      .stroke({
        color: 0xffffff,
        alpha: 0.12,
        width: 2.2
      });
    group.addChild(rimGlow);


    group.position.set(
      x,
      y
    );


    /*
     * Store all visual components so
     * theme/cursor lighting can update
     * them later.
     */

    group.userData = {

      size,


      glass,

      innerGlass,

      highlight,

      microHighlight,

      edgeLight,

      reflection,

      lowerBevel,

      rimGlow

    };


    return group;

  }


  /* ================================================================
     RESIZE
     ================================================================ */

  _onWindowResize() {

    if (
      !this.app ||
      !this.app.renderer
    ) {

      return;

    }


    this.width =
      window.innerWidth;


    this.height =
      window.innerHeight;


    const previousMode =
      this.isMobileOrTablet;


    this.isMobileOrTablet =
      this._detectMobileOrTablet();


    this.app.renderer.resize(
      this.width,
      this.height
    );


    if (
      this.title
    ) {

      this.title.x =
        this.width / 2;


      this.title.y =
        this._getTitleY();


      this.titleBaseY =
        this.title.y;


      this.title.style.fontSize =
        this._getTitleSize();

    }


    if (
      this.physics
    ) {

      this.physics.width =
        this.width;


      this.physics.height =
        this.height;


      this.physics.groundLevel =
        this.height *
        0.94;

    }


    /*
     * Do not reposition emojis while
     * they are falling or recovering.
     */

    if (
      !this._hasActiveShakeMotion()
    ) {

      this._repositionEmojisAndCubes();

    }


    /*
     * Device category changed.
     */

    if (
      previousMode !==
      this.isMobileOrTablet
    ) {

      if (
        this.isMobileOrTablet
      ) {

        this._enableMobileAnimationMode();

      } else {

        this._enableDesktopAnimationMode();

      }

    }

  }


  /* ================================================================
     REPOSITION EMOJIS + CUBES
     ================================================================ */

  _repositionEmojisAndCubes() {

    if (
      !this.emojis ||
      this.emojis.length === 0
    ) {

      return;

    }


    const layout =
      this._getGridLayout();


    const {
      cols,
      spacing,
      startX,
      startY,
      emojiSize,
      cubeSize
    } =
      layout;


    for (
      let i = 0;
      i < this.emojis.length;
      i++
    ) {

      const emoji =
        this.emojis[i];


      if (
        !emoji
      ) {

        continue;

      }


      const col =
        i % cols;


      const row =
        Math.floor(
          i / cols
        );


      const x =
        startX +
        col *
        spacing;


      const y =
        startY +
        row *
        spacing;


      emoji.originalX =
        x;


      emoji.originalY =
        y;


      emoji.targetX =
        x;


      emoji.targetY =
        y;


      emoji.size =
        emojiSize;


      if (
        !emoji.isFlying
      ) {

        emoji.x =
          x;


        emoji.y =
          y;

      }


      if (
        emoji.element
      ) {

        emoji.element.style.width =
          `${emojiSize}px`;

        emoji.element.style.height =
          `${emojiSize}px`;

      }


      const cubeData =
        this.cubes[i];


      if (
        cubeData &&
        cubeData.sprite
      ) {

        cubeData.x =
          x;


        cubeData.y =
          y;


        cubeData.sprite.position.set(

          x,

          y +
          emojiSize *
          0.43

        );

      }


      if (
        emoji.physicsBody &&
        !emoji.isFlying &&
        !emoji.scannerState
      ) {

        emoji.physicsBody.x =
          x;


        emoji.physicsBody.y =
          y;

      }


      this._applyEmojiTransform(
        emoji
      );

    }

  }
  /* ================================================================
     FRAME UPDATE
     ================================================================ */

  /* ================================================================
     IDLE EMOJI ANIMATION
     ================================================================ */

  _updateIdleAnimation(
    emoji,
    dt
  ) {

    if (
      !emoji ||
      !emoji.config
    ) {

      return;

    }


    const config =
      emoji.config;
    

   /*
    * ------------------------------------------------------------
    * DESKTOP TALKING SOUND
    * ------------------------------------------------------------
    */

    if (
        !this.isMobileOrTablet &&
        this.audio &&
        this.audio.unlocked &&
        performance.now() >=
            this.nextSoundAt
    ) {

        this._playTalkingSound();

        this.nextSoundAt =
            performance.now() +
            4000 +
            Math.random() * 7000;
    }


    emoji.idleTime +=
      config.idleSpeed *
      dt;


    const t =
      emoji.idleTime;


    const baseX =
      emoji.originalX;


    const baseY =
      emoji.originalY;


    const amplitude =
      config.idleAmplitude ||
      0;


    let idleX =
      baseX;


    let idleY =
      baseY;


    let rotation =
      0;


    let scale =
      1;


    switch (
      config.idleType
    ) {

      case 'bounce':

        idleY =
          baseY +
          Math.sin(t) *
          amplitude;

        break;


      case 'pulse':

        scale =
          1 +
          Math.sin(t) *
          (
            config.scaleAmount ||
            0.05
          );


        idleY =
          baseY +
          Math.sin(
            t *
            0.8
          ) *
          2;

        break;


      case 'sway':

        idleY =
          baseY +
          Math.sin(t) *
          amplitude;


        rotation =
          Math.sin(
            t *
            0.7
          ) *
          0.10;

        break;


      case 'tilt':

        rotation =
          Math.sin(t) *
          0.12;


        idleY =
          baseY +
          Math.sin(
            t *
            1.2
          ) *
          amplitude *
          0.45;

        break;


      case 'spin':

        rotation =
          t *
          (
            config.spinSpeed ||
            0.01
          ) *
          2;


        idleY =
          baseY +
          Math.sin(
            t *
            0.7
          ) *
          2;

        break;


      case 'bob':

        idleY =
          baseY +
          Math.sin(
            t *
            1.4
          ) *
          amplitude;

        break;


      case 'drift':

        idleX =
          baseX +
          Math.sin(t) *
          amplitude *
          0.60;


        idleY =
          baseY +
          Math.cos(
            t *
            0.7
          ) *
          amplitude *
          0.45;

        break;


      case 'vibrate':

        idleX =
          baseX +
          Math.sin(
            t *
            5
          ) *
          amplitude *
          0.55;


        idleY =
          baseY +
          Math.cos(
            t *
            4
          ) *
          amplitude *
          0.25;

        break;


      case 'tremble':

        idleX =
          baseX +
          Math.sin(
            t *
            8
          ) *
          amplitude *
          0.45;


        rotation =
          Math.sin(
            t *
            7
          ) *
          0.035;

        break;


      case 'float':

        idleX =
          baseX +
          Math.cos(
            t *
            0.65
          ) *
          amplitude *
          0.35;


        idleY =
          baseY +
          Math.sin(
            t *
            0.9
          ) *
          amplitude *
          0.65;

        break;


      case 'droop':

        idleY =
          baseY +
          Math.cos(t) *
          amplitude;


        rotation =
          Math.sin(
            t *
            0.6
          ) *
          0.09;

        break;


      case 'twitch':

        idleY =
          baseY +
          Math.sin(
            t *
            1.8
          ) *
          amplitude *
          0.30;


        rotation =
          Math.sin(
            t *
            3.2
          ) *
          0.025;

        break;


      case 'shake':

        idleX =
          baseX +
          Math.sin(
            t *
            3.5
          ) *
          amplitude *
          0.60;


        idleY =
          baseY +
          Math.cos(
            t *
            3.5
          ) *
          amplitude *
          0.25;

        break;


      case 'playful':

        rotation =
          Math.sin(
            t *
            1.5
          ) *
          0.14;


        idleY =
          baseY +
          Math.sin(
            t *
            2
          ) *
          amplitude *
          0.65;

        break;


      case 'shiver':

        idleX =
          baseX +
          Math.sin(
            t *
            8
          ) *
          amplitude *
          0.45;


        idleY =
          baseY +
          Math.cos(
            t *
            7
          ) *
          amplitude *
          0.25;

        break;


      default:

        break;

    }


    /*
     * ------------------------------------------------------------
     * CURSOR OFFSET
     * ------------------------------------------------------------
     *
     * Keep cursor movement limited so emojis
     * never fly too far away from their platforms.
     */

    if (
      !this.isShaking &&
      !this.isRecovering
    ) {

      const targetX =
        idleX +
        (
          emoji.cursorOffsetX ||
          0
        );


      const targetY =
        idleY +
        (
          emoji.cursorOffsetY ||
          0
        );


      emoji.x +=
        (
          targetX -
          emoji.x
        ) *
        0.28;


      emoji.y +=
        (
          targetY -
          emoji.y
        ) *
        0.28;

    }


    emoji.rotation =
      rotation;


    emoji.scale =
      scale;


    this._applyEmojiTransform(
      emoji
    );


    /*
     * Cursor proximity effect.
     */

    this._addMouseProximityEffect(
      emoji
    );

  }


  /* ================================================================
     APPLY EMOJI TRANSFORM
     ================================================================ */


  /* ================================================================
     CLIPBOARD SCANNER TRANSFER
     ================================================================ */

  startScannerTransfer(index, targetX, targetY, options = {}) {
    const emoji = this.emojis?.[index];

    if (
      !emoji ||
      !emoji.element ||
      emoji.scannerState ||
      emoji.isFlying ||
      this.isShaking ||
      this.isRecovering
    ) {
      return false;
    }

    const element = emoji.element;
    const now = performance.now();

    /* Slow, low-acceleration flight so the emoji feels like a bird. */
    const duration = Math.max(
      1500,
      options.duration || 2050
    );

    const targetScale = Math.max(
      0.24,
      Math.min(0.55, options.targetScale || 0.36)
    );

    emoji.scannerOriginalParent = element.parentNode;
    emoji.scannerOriginalNextSibling = element.nextSibling;

    emoji.scannerState = {
      phase: 'out',
      startedAt: now,
      duration,
      startX: emoji.x,
      startY: emoji.y,
      startRotation: emoji.rotation || 0,
      startScale: emoji.scale || 1,
      targetX,
      targetY,
      targetScale,
      arc: Math.max(28, options.arc || 72),
      returnStartedAt: 0,
      returnDuration: Math.max(
        1300,
        options.returnDuration || 1800
      ),
      returnStartX: 0,
      returnStartY: 0
    };

    /* Portal the SAME DOM node; never clone or duplicate the emoji. */
    document.body.appendChild(element);
    element.classList.add('emoji-scanner-transfer');
    element.style.position = 'fixed';
    element.style.left = '0px';
    element.style.top = '0px';
    element.style.zIndex = '10050';
    element.style.pointerEvents = 'none';
    element.style.willChange = 'transform, filter';

    if (emoji.physicsBody) {
      emoji.physicsBody.isActive = false;
      emoji.physicsBody.vx = 0;
      emoji.physicsBody.vy = 0;
      emoji.physicsBody.sleeping = true;
    }

    this._applyEmojiTransform(emoji);
    return true;
  }

  updateScannerTarget(index, targetX, targetY) {
    const emoji = this.emojis?.[index];
    if (!emoji?.scannerState) return false;
    emoji.scannerState.targetX = targetX;
    emoji.scannerState.targetY = targetY;
    return true;
  }

  finishScannerTransfer(index) {
    const emoji = this.emojis?.[index];
    if (!emoji?.scannerState) return false;
    const state = emoji.scannerState;
    if (state.phase === 'return') return true;
    state.phase = 'return';
    state.returnStartedAt = performance.now();
    state.returnStartX = emoji.x;
    state.returnStartY = emoji.y;
    return true;
  }

  _updateScannerEmoji(emoji, dtMs) {
    const state = emoji.scannerState;
    if (!state) return;

    const now = performance.now();

    if (state.phase === 'out') {
      const progress = Math.min(
        1,
        Math.max(0, (now - state.startedAt) / state.duration)
      );

      /* Smoothstep-like sine easing: gentle take-off and landing. */
      const eased =
        -(Math.cos(Math.PI * progress) - 1) / 2;

      const arc =
        Math.sin(Math.PI * progress) * state.arc;

      const dx = state.targetX - state.startX;
      const dy = state.targetY - state.startY;

      emoji.x = state.startX + dx * eased;
      emoji.y = state.startY + dy * eased - arc;

      /* Tiny bank; no aggressive spinning. */
      const flightAngle = Math.atan2(dy, dx);
      const bank = Math.sin(Math.PI * progress) * 0.055;
      emoji.rotation =
        state.startRotation + flightAngle * 0.10 + bank;

      emoji.scale =
        state.startScale +
        (state.targetScale - state.startScale) * eased;

      if (progress >= 1) {
        emoji.x = state.targetX;
        emoji.y = state.targetY;
        emoji.rotation = 0;
        emoji.scale = state.targetScale;
        state.phase = 'hold';
      }

    } else if (state.phase === 'hold') {
      /* Stay at the scanner while the complete copy sequence runs. */
      const pulse = Math.sin(now * 0.0032);
      emoji.x = state.targetX;
      emoji.y = state.targetY + pulse * 2.4;
      emoji.rotation = pulse * 0.018;
      emoji.scale = state.targetScale * (1 + pulse * 0.018);

    } else if (state.phase === 'return') {
      const progress = Math.min(
        1,
        Math.max(
          0,
          (now - state.returnStartedAt) / state.returnDuration
        )
      );

      const eased =
        -(Math.cos(Math.PI * progress) - 1) / 2;

      const arc =
        Math.sin(Math.PI * progress) *
        Math.min(58, state.arc * 0.72);

      const targetX = emoji.originalX;
      const targetY = emoji.originalY;
      const dx = targetX - state.returnStartX;
      const dy = targetY - state.returnStartY;

      emoji.x = state.returnStartX + dx * eased;
      emoji.y = state.returnStartY + dy * eased - arc;

      const flightAngle = Math.atan2(dy, dx);
      const bank = Math.sin(Math.PI * progress) * 0.045;
      emoji.rotation = flightAngle * 0.08 + bank;

      emoji.scale =
        state.targetScale +
        (1 - state.targetScale) * eased;

      if (progress >= 1) {
        /* Exact final snap before returning the node to its home layer. */
        emoji.x = targetX;
        emoji.y = targetY;
        emoji.rotation = 0;
        emoji.scale = 1;
        this._restoreScannerEmoji(emoji);
        return;
      }
    }

    this._applyEmojiTransform(emoji);
  }

  _restoreScannerEmoji(emoji) {
    const element = emoji.element;
    const parent = emoji.scannerOriginalParent || this.emojiLayer;
    const nextSibling = emoji.scannerOriginalNextSibling;

    if (parent) {
      if (
        nextSibling &&
        nextSibling.parentNode === parent
      ) {
        parent.insertBefore(element, nextSibling);
      } else {
        parent.appendChild(element);
      }
    }

    element.classList.remove('emoji-scanner-transfer');

    /* Return to the normal emojiLayer coordinate system. */
    element.style.position = 'absolute';
    element.style.left = `${emoji.originalX}px`;
    element.style.top = `${emoji.originalY}px`;
    element.style.zIndex = '';
    element.style.pointerEvents = 'none';
    element.style.willChange = 'transform';
    element.style.filter = '';

    emoji.scannerState = null;
    emoji.scannerOriginalParent = null;
    emoji.scannerOriginalNextSibling = null;

    emoji.x = emoji.originalX;
    emoji.y = emoji.originalY;
    emoji.targetX = emoji.originalX;
    emoji.targetY = emoji.originalY;
    emoji.rotation = 0;
    emoji.scale = 1;
    emoji.cursorOffsetX = 0;
    emoji.cursorOffsetY = 0;

    if (emoji.physicsBody) {
      emoji.physicsBody.x = emoji.originalX;
      emoji.physicsBody.y = emoji.originalY;
      emoji.physicsBody.vx = 0;
      emoji.physicsBody.vy = 0;
      emoji.physicsBody.rotation = 0;
      emoji.physicsBody.angularVelocity = 0;
      emoji.physicsBody.isActive = false;
      emoji.physicsBody.sleeping = true;
    }

    this._applyEmojiTransform(emoji);
  }

  _applyEmojiTransform(emoji) {
    if (!emoji || !emoji.element) {
      return;
    }

    const element = emoji.element;
    const scale = emoji.scale || 1;
    const rotation = emoji.rotation || 0;

    /*
     * SCANNER MODE
     * The same <img> has been portaled to <body>. Its x/y are viewport
     * coordinates, so translate directly to those coordinates. This
     * fixes the old origin/offset mismatch that caused the emoji to
     * stop somewhere between the platform and scanner.
     */
    if (emoji.scannerState) {
      element.style.transform =
        `translate3d(${emoji.x}px, ${emoji.y}px, 0)
         translate(-50%, -50%)
         rotate(${rotation}rad)
         scale(${scale})`;
      return;
    }

    /* NORMAL MODE: left/top are anchored at the glass platform. */
    const offsetX = emoji.x - emoji.originalX;
    const offsetY = emoji.y - emoji.originalY;

    element.style.transform =
      `translate3d(
        calc(-50% + ${offsetX}px),
        calc(-50% + ${offsetY}px),
        0
      )
      rotate(${rotation}rad)
      scale(${scale})`;
  }

  _addMouseProximityEffect(
    emoji
  ) {

    if (
      !emoji ||
      !emoji.element
    ) {

      return;

    }


    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;


    /*
     * Don't run cursor movement on an
     * idle touch device.
     */

    if (
      isTouchDevice &&
      !this.touchActive
    ) {

      emoji.cursorOffsetX +=
        (
          0 -
          emoji.cursorOffsetX
        ) *
        0.12;


      emoji.cursorOffsetY +=
        (
          0 -
          emoji.cursorOffsetY
        ) *
        0.12;


      return;

    }


    const dx =
      this.mouse.x -
      emoji.x;


    const dy =
      this.mouse.y -
      emoji.y;


    const distance =
      Math.hypot(
        dx,
        dy
      );


    const range =
      this.width < 700
        ? 135
        : 235;


    if (
      distance > 0 &&
      distance < range
    ) {

      const proximity =
        1 -
        distance /
        range;


      /*
       * Maximum displacement is deliberately
       * small.
       */

      const maxPush =
        this.width < 700
          ? 13
          : 28;


      const push =
        proximity *
        proximity *
        maxPush;


      const targetOffsetX =
        -(
          dx /
          distance
        ) *
        push;


      const targetOffsetY =
        -(
          dy /
          distance
        ) *
        push;

        emoji.cursorInfluence =
          proximity;
        if (
          distance >= range
        ) {
        emoji.cursorInfluence +=
            (
                0 -
                (emoji.cursorInfluence || 0)
            ) *
            0.12;
        }

      emoji.cursorOffsetX +=
        (
          targetOffsetX -
          emoji.cursorOffsetX
        ) *
        0.22;


      emoji.cursorOffsetY +=
        (
          targetOffsetY -
          emoji.cursorOffsetY
        ) *
        0.22;


      /*
       * Tiny scale reaction.
       */

      const targetScale =
        1 +
        proximity *
        0.07;


      emoji.scale +=
        (
          targetScale -
          emoji.scale
        ) *
        0.12;


    } else {

      emoji.cursorOffsetX +=
        (
          0 -
          emoji.cursorOffsetX
        ) *
        0.10;


      emoji.cursorOffsetY +=
        (
          0 -
          emoji.cursorOffsetY
        ) *
        0.10;


      emoji.scale +=
        (
          1 -
          emoji.scale
        ) *
        0.10;

    }

  }


  /* ================================================================
     PRELOAD ONE MOBILE ANIMATED WEBP
     ================================================================ */

  _preloadMobileAnimated(emoji) {

    if (
      !emoji ||
      !emoji.element ||
      !emoji.element.dataset.src
    ) {
      return Promise.resolve(false);
    }

    if (this.mobileAnimatedReady.has(emoji.index)) {
      emoji.animatedReady = true;
      return Promise.resolve(true);
    }

    if (this.mobileAnimatedLoading.has(emoji.index)) {
      return this.mobileAnimatedLoading.get(emoji.index);
    }

    const promise = new Promise(resolve => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = async () => {
        try {
          if (typeof image.decode === 'function') {
            await image.decode();
          }
        } catch {}
        this.mobileAnimatedReady.add(emoji.index);
        emoji.animatedReady = true;
        this.mobileAnimatedLoading.delete(emoji.index);
        resolve(true);
      };
      image.onerror = () => {
        this.mobileAnimatedLoading.delete(emoji.index);
        resolve(false);
      };
      image.src = emoji.element.dataset.src;
    });

    this.mobileAnimatedLoading.set(emoji.index, promise);
    return promise;
  }


  /* ================================================================
     PRELOAD MOBILE ANIMATIONS IN SMALL BATCHES
     ================================================================ */

  async _prepareMobileAnimatedFrames() {

    if (!this.isMobileOrTablet || !this.emojis.length) {
      return;
    }

    for (let start = 0; start < this.emojis.length; start += 2) {
      const batch = this.emojis.slice(start, start + 2);
      await Promise.all(batch.map(emoji => this._preloadMobileAnimated(emoji)));
      await new Promise(resolve => requestAnimationFrame(resolve));
    }

  }


  /* ================================================================
     MOBILE ANIMATION SCHEDULER
     ================================================================ */

  /* Motion-sensor/shake interaction was removed. Keep one small
   * compatibility guard so the animation scheduler remains simple. */
  _hasActiveShakeMotion() {
    return false;
  }

  _startMobileAnimationScheduler() {

    if (
      !this.isMobileOrTablet
    ) {

      return;

    }


    if (
      this._hasActiveShakeMotion()
    ) {

      return;

    }


    /*
     * Stop an existing scheduler first.
     */

    this._stopMobileAnimationScheduler();

    /* Warm the browser's image decoder in tiny batches. */
    this._prepareMobileAnimatedFrames();


    const generation =
      ++this.mobileSchedulerGeneration;


    /*
     * Start with a shuffled bag.
     */

    this._refillMobileShuffleBag();


    /*
     * Fill the initial animation slots.
     */

    this._fillMobileAnimationSlots();


    /*
     * Periodic check.
     *
     * This is deliberately slow compared with
     * the Pixi ticker and therefore very cheap.
     */

    this.mobileSchedulerTimer =
      window.setInterval(
        () => {

          if (
            generation !==
            this.mobileSchedulerGeneration
          ) {

            return;

          }


          this._scheduleMobileAnimationCheck();

        },
        180
      );

  }


  /* ================================================================
     STOP MOBILE ANIMATION SCHEDULER
     ================================================================ */

  _stopMobileAnimationScheduler() {

    this.mobileSchedulerGeneration++;


    if (
      this.mobileSchedulerTimer !==
      null
    ) {

      clearInterval(
        this.mobileSchedulerTimer
      );


      this.mobileSchedulerTimer =
        null;

    }

  }


  /* ================================================================
     MOBILE ANIMATION CHECK
     ================================================================ */

  _scheduleMobileAnimationCheck() {

    if (
      !this.isMobileOrTablet ||
      this._hasActiveShakeMotion()
    ) {

      return;

    }


    const now =
      performance.now();


    /*
     * Deactivate expired animations.
     */

    for (
      const emoji of [
        ...this.mobileActiveEmojis
      ]
    ) {

      if (
        !emoji
      ) {

        continue;

      }


      if (
        emoji.animationEndsAt > 0 &&
        now >=
        emoji.animationEndsAt
      ) {

        this._deactivateMobileEmoji(
          emoji
        );

      }

    }


    /*
     * Fill any available animation slots.
     */

    this._fillMobileAnimationSlots();

  }


  /* ================================================================
     FILL MOBILE ANIMATION SLOTS
     ================================================================ */

  _fillMobileAnimationSlots() {

    if (
      !this.isMobileOrTablet ||
      this._hasActiveShakeMotion()
    ) {

      return;

    }


    const available =
      this.mobileAnimationLimit -
      this.mobileActiveEmojis.size;


    if (
      available <= 0
    ) {

      return;

    }


    const batchSize =
      Math.min(
        available,
        this.mobileActivationBatchSize || 3
      );

    for (
      let i = 0;
      i < batchSize;
      i++
    ) {

      const emoji =
        this._getNextMobileEmoji();

      if (!emoji) {
        break;
      }

      if (!emoji.staticReady) {
        continue;
      }

      /* Only activate after the animated WebP has been decoded. */
      if (!emoji.animatedReady && !this.mobileAnimatedReady.has(emoji.index)) {
        this._preloadMobileAnimated(emoji);
        continue;
      }

      this._activateMobileEmoji(emoji);

    }

  }


  /* ================================================================
     SHUFFLE BAG
     ================================================================ */

  _refillMobileShuffleBag() {

    const indices =
      this.emojis.map(
        emoji =>
          emoji.index
      );


    /*
     * Fisher-Yates shuffle.
     *
     * Every emoji gets one turn before
     * the bag is refilled.
     */

    for (
      let i =
        indices.length - 1;

      i > 0;

      i--
    ) {

      const j =
        Math.floor(
          Math.random() *
          (
            i + 1
          )
        );


      [
        indices[i],
        indices[j]
      ] =
      [
        indices[j],
        indices[i]
      ];

    }


    this.mobileShuffleBag =
      indices;

  }


  /* ================================================================
     GET NEXT MOBILE EMOJI
     ================================================================ */

  _getNextMobileEmoji() {

    if (
      !this.emojis ||
      this.emojis.length === 0
    ) {

      return null;

    }


    /*
     * Refill when the complete
     * shuffle bag has been consumed.
     */

    if (
      this.mobileShuffleBag.length === 0
    ) {

      this._refillMobileShuffleBag();

    }


    /*
     * Search the shuffled bag for an
     * emoji that isn't already active.
     */

    for (
      let i =
        0;

      i <
      this.mobileShuffleBag.length;

      i++
    ) {

      const index =
        this.mobileShuffleBag[i];


      const emoji =
        this.emojis[index];


      if (
        emoji &&
        !emoji.isMobileActive &&
        !emoji.isFlying
      ) {

        this.mobileShuffleBag.splice(
          i,
          1
        );


        return emoji;

      }

    }


    /*
     * If every remaining shuffled emoji is
     * currently active, leave the bag alone.
     */

    return null;

  }


  /* ================================================================
     RANDOM MOBILE ANIMATION DURATION
     ================================================================ */

  _getRandomAnimationDuration() {

    /*
     * Random duration:
     *
     * 2.6s - 5.2s
     *
     * This prevents the 5 emojis from
     * starting/stopping together.
     */

    const min =
      2600;


    const max =
      5200;


    return (
      min +
      Math.random() *
      (
        max -
        min
      )
    );

  }
  /* ================================================================
     ACTIVATE MOBILE EMOJI
     ================================================================ */

  _activateMobileEmoji(
    emoji
  ) {

    if (
      !emoji ||
      !emoji.element
    ) {

      return;

    }


    if (
      emoji.isMobileActive
    ) {

      return;

    }


    if (
      emoji.isFlying
    ) {

      return;

    }


    /*
     * Mark active before changing the
     * source so the scheduler cannot
     * activate it twice.
     */

    emoji.isMobileActive =
      true;


    this.mobileActiveEmojis.add(
      emoji
    );


    /*
     * ------------------------------------------------------------
     * TALKING SOUND
     * ------------------------------------------------------------
     *
     * Trigger one short talking sound when
     * a new animation slot becomes active.
     *
     * _playTalkingSound() has its own cooldown,
     * so multiple simultaneous activations
     * don't stack eight audio streams.
     */

    this._playTalkingSound();


    /*
     * ------------------------------------------------------------
     * ANIMATION TIMER
     * ------------------------------------------------------------
     */

    const duration =
      this._getRandomAnimationDuration();


    emoji.animationEndsAt =
      performance.now() +
      duration;


    /*
     * ------------------------------------------------------------
     * START ANIMATED WEBP
     * ------------------------------------------------------------
     */

    const animatedURL =
      emoji.element.dataset.src;


    if (
      !animatedURL
    ) {

      emoji.isMobileActive =
        false;


      this.mobileActiveEmojis.delete(
        emoji
      );


      emoji.animationEndsAt =
        0;


      return;

    }


    /*
     * Decode first, then switch the SAME <img> element. No duplicate
     * image or background overlay is used. This removes the blank
     * frame/flicker caused by switching to a WebP that is still decoding.
     */
    emoji.element.style.visibility =
      'visible';
    emoji.element.style.opacity =
      '1';
    emoji.element.style.willChange =
      'transform';

    if (emoji.animatedReady || this.mobileAnimatedReady.has(emoji.index)) {
      emoji.element.src = animatedURL;
    } else {
      this._preloadMobileAnimated(emoji).then(ready => {
        if (
          ready &&
          emoji.isMobileActive &&
          !emoji.isFlying &&
          emoji.element
        ) {
          emoji.element.src = animatedURL;
        }
      });
    }

  }


  /* ================================================================
     DEACTIVATE MOBILE EMOJI
     ================================================================ */

  _deactivateMobileEmoji(
    emoji
  ) {

    if (
      !emoji ||
      !emoji.element
    ) {

      return;

    }


    /*
     * Already inactive.
     */

    if (
      !emoji.isMobileActive
    ) {

      return;

    }


    const element =
      emoji.element;


    /*
     * Remove from active animation set.
     */

    emoji.isMobileActive =
      false;


    this.mobileActiveEmojis.delete(
      emoji
    );


    /*
     * Clear animation timer.
     */

    emoji.animationEndsAt =
      0;


    /*
     * ------------------------------------------------------------
     * STOP ANIMATED WEBP WITHOUT A BLANK FRAME
     * ------------------------------------------------------------
     *
     * Switch directly to the cached static frame. The same frame
     * remains as a CSS background underneath, so there is no
     * visible blank/white flash.
     */

    if (
      emoji.staticURL
    ) {

      element.src =
        emoji.staticURL;

    }

    element.style.willChange =
      'auto';

    element.style.visibility =
      'visible';

    element.style.opacity =
      '1';

    element.style.display =
      'block';


    /*
     * Keep the element in the same rendering
     * layer. Do not modify its position here.
     */

  }


  /* ================================================================
     ENABLE DESKTOP ANIMATION MODE
     ================================================================ */

  _enableDesktopAnimationMode() {

    console.log(
      '🖥️ Switching to desktop animation mode'
    );


    this.isMobileOrTablet =
      false;


    /*
     * Stop mobile scheduler.
     */

    this._stopMobileAnimationScheduler();


    /*
     * Restore animated WebPs for all 24.
     */

    for (
      const emoji of this.emojis
    ) {

      if (
        !emoji ||
        !emoji.element
      ) {

        continue;

      }


      emoji.isMobileActive =
        false;


      emoji.animationEndsAt =
        0;


      const animatedURL =
        emoji.element.dataset.src;


      if (
        animatedURL
      ) {

        emoji.element.src =
          animatedURL;

      }


      emoji.element.style.visibility =
        'visible';


      emoji.element.style.opacity =
        '1';

    }


    this.mobileActiveEmojis.clear();


    console.log(
      '🖥️ All 24 animated WebPs restored'
    );

  }


  /* ================================================================
     ENABLE MOBILE ANIMATION MODE
     ================================================================ */

  async _enableMobileAnimationMode() {

    console.log(
      '📱 Switching to mobile/tablet animation mode'
    );


    this.isMobileOrTablet =
      true;


    /*
     * Stop the current scheduler before
     * changing every emoji's playback state.
     */

    this._stopMobileAnimationScheduler();


    /*
     * Clear current active set.
     */

    this.mobileActiveEmojis.clear();


    /*
     * Stop all animated WebPs.
     */

    for (
      const emoji of this.emojis
    ) {

      if (
        !emoji ||
        !emoji.element
      ) {

        continue;

      }


      emoji.isMobileActive =
        false;


      emoji.animationEndsAt =
        0;


      /*
       * Never clear src before assigning the static frame.
       * Clearing it created the mobile flicker seen during
       * animation-slot changes.
       */

      /*
       * If the high-quality static frame
       * already exists, use it immediately.
       */

      if (
        emoji.staticURL
      ) {

        emoji.element.src =
          emoji.staticURL;

      }


      emoji.element.style.visibility =
        'visible';


      emoji.element.style.opacity =
        '1';

    }


    /*
     * Start a completely new random
     * sequence.
     */

    this.mobileShuffleBag =
      [];


    await this._prepareMobileStaticFrames();

    await this._prepareMobileAnimatedFrames();

    if (!this._hasActiveShakeMotion()) {
      this._startMobileAnimationScheduler();
    }

  }


  /* ================================================================
     TOUCH / POINTER EVENT LISTENERS
     ================================================================ */

  _setupEventListeners() {

    /*
     * ------------------------------------------------------------
     * MOUSE MOVE
     * ------------------------------------------------------------
     */

    window.addEventListener(
      'mousemove',
      event => {

        this.mouse.x =
          event.clientX;


        this.mouse.y =
          event.clientY;

      },
      {
        passive:
          true
      }
    );


    /*
     * ------------------------------------------------------------
     * TOUCH START
     * ------------------------------------------------------------
     */

    window.addEventListener(
      'touchstart',
      event => {

        this.touchActive =
          true;


        /*
         * Unlock background music.
         */

        this._unlockAudio();


        const touch =
          event.touches[0];


        if (
          touch
        ) {

          this.mouse.x =
            touch.clientX;


          this.mouse.y =
            touch.clientY;

        }



      },
      {
        passive:
          true
      }
    );


    /*
     * ------------------------------------------------------------
     * TOUCH MOVE
     * ------------------------------------------------------------
     */

    window.addEventListener(
      'touchmove',
      event => {

        const touch =
          event.touches[0];


        if (
          touch
        ) {

          this.mouse.x =
            touch.clientX;


          this.mouse.y =
            touch.clientY;

        }

      },
      {
        passive:
          true
      }
    );


    /*
     * ------------------------------------------------------------
     * TOUCH END
     * ------------------------------------------------------------
     */

    window.addEventListener(
      'touchend',
      () => {

        this.touchActive =
          false;

      },
      {
        passive:
          true
      }
    );


    window.addEventListener(
      'touchcancel',
      () => {

        this.touchActive =
          false;

      },
      {
        passive:
          true
      }
    );


    /*
     * ------------------------------------------------------------
     * CLICK
     * ------------------------------------------------------------
     */

    window.addEventListener(
      'click',
      () => {

        /*
         * User interaction is sufficient
         * to unlock music on desktop.
         */

        this._unlockAudio();



      },
      {
        passive:
          true
      }
    );


    /*
     * ------------------------------------------------------------
     * KEYBOARD
     * ------------------------------------------------------------
     *
     * Useful for desktop testing.
     *
     * Space can trigger the same shake
     * behavior without changing the actual
     * gyro implementation.
     */

    window.addEventListener(
      'keydown',
      event => {

        if (
          event.code ===
          'Space'
        ) {

          this._unlockAudio();

        }

      },
      {
        passive:
          true
      }
    );


    console.log(
      '[Emoji World] ✓ Event listeners registered'
    );

  }


  /* ================================================================
     EASING
     ================================================================ */

  _easeOutCubic(
    t
  ) {

    return (
      1 -
      Math.pow(
        1 -
        t,
        3
      )
    );

  }


  /* ================================================================
     THEME BUTTON
     ================================================================ */

  _createThemeButton() {

    /*
     * Avoid creating duplicate buttons.
     */

    let button =
      document.getElementById(
        'emoji-theme-toggle'
      );


    if (
      button
    ) {

      this.themeButton =
        button;

      return;

    }


    button =
      document.createElement(
        'button'
      );


    button.id =
      'emoji-theme-toggle';


    button.type =
      'button';


    button.setAttribute(
      'aria-label',
      'Toggle dark and light mode'
    );


    button.style.position =
      'fixed';


    button.style.top =
      '18px';


    button.style.right =
      '18px';


    button.style.width =
      '42px';


    button.style.height =
      '42px';


    button.style.border =
      '0';


    button.style.borderRadius =
      '50%';


    button.style.padding =
      '0';


    button.style.display =
      'flex';


    button.style.alignItems =
      'center';


    button.style.justifyContent =
      'center';


    button.style.fontSize =
      '21px';


    button.style.lineHeight =
      '1';


    button.style.cursor =
      'pointer';


    button.style.zIndex =
      '1000';


    button.style.background =
      'rgba(255,255,255,0.72)';


    button.style.border =
      '1px solid rgba(255,255,255,0.65)';


    button.style.boxShadow =
      '0 8px 25px rgba(0,0,0,0.12)';


    button.style.backdropFilter =
      'blur(14px)';


    button.style.webkitBackdropFilter =
      'blur(14px)';


    button.style.transition =
      'transform 180ms ease, background 180ms ease, box-shadow 180ms ease';


    button.addEventListener(
      'mouseenter',
      () => {

        button.style.transform =
          'scale(1.08)';

      }
    );


    button.addEventListener(
      'mouseleave',
      () => {

        button.style.transform =
          'scale(1)';

      }
    );


    button.addEventListener(
      'click',
      event => {

        event.preventDefault();


        event.stopPropagation();


        this._toggleTheme();

      }
    );


    document.body.appendChild(
      button
    );


    this.themeButton =
      button;


    this._updateThemeButton();

  }


  /* ================================================================
     TOGGLE THEME
     ================================================================ */

  _toggleTheme() {

  const current =
    document.documentElement
      .getAttribute(
        'data-theme'
      );

  const next =
    current === 'dark'
      ? 'light'
      : 'dark';

  document.documentElement
    .setAttribute(
      'data-theme',
      next
    );

  try {

    localStorage.setItem(
      'emoji-theme',
      next
    );

  } catch {}

  this._applyTheme(
    next
  );

  this._updateThemeButton();

}


  /* ================================================================
     APPLY THEME
     ================================================================ */

  _applyTheme(
  theme
) {

  this.theme =
    theme === 'dark'
      ? 'dark'
      : 'light';

  this._updateCinematicTheme();


  /*
   * ------------------------------------------------------------
   * HTML THEME ATTRIBUTE
   * ------------------------------------------------------------
   */

  document.documentElement
    .setAttribute(
      'data-theme',
      this.theme
    );


  const isDark =
    this.theme === 'dark';


  /*
   * ------------------------------------------------------------
   * BACKGROUND
   * ------------------------------------------------------------
   */

  const darkBackground =
    'radial-gradient(circle at 50% 30%, #3a3b40 0%, #1d2027 38%, #101319 70%, #090c11 100%)';

  const lightBackground =
    'radial-gradient(circle at 50% 12%, #ffffff 0%, #f4f8fb 55%, #e8f0f5 100%)';


  /*
   * BODY
   */

  document.body.style.background =
    isDark
      ? darkBackground
      : lightBackground;

  document.body.style.color =
    isDark
      ? '#f5f7fa'
      : '#111111';


  /*
   * ------------------------------------------------------------
   * MAIN SCENE
   * ------------------------------------------------------------
   *
   * This is the important fix.
   *
   * The Pixi canvas is transparent, but the HTML scene/background
   * can cover the body's background.
   */

  const scene =
    document.getElementById(
      'scene'
    );

  if (scene) {

    scene.style.background =
      isDark
        ? darkBackground
        : lightBackground;

    scene.style.backgroundColor =
      isDark
        ? '#080b10'
        : '#ffffff';

  }


  /*
   * ------------------------------------------------------------
   * BACKGROUND GLOW
   * ------------------------------------------------------------
   */

  const backgroundGlow =
    document.getElementById(
      'backgroundGlow'
    );

  if (backgroundGlow) {

    backgroundGlow.style.background =
      isDark
        ? `
          radial-gradient(
            circle at 50% 18%,
            rgba(255,181,96,0.13),
            transparent 58%
          )
        `
        : `
          radial-gradient(
            circle at 50% 18%,
            rgba(160,210,255,0.18),
            transparent 58%
          )
        `;

    backgroundGlow.style.opacity =
      isDark
        ? '1'
        : '1';

  }


  /*
   * ------------------------------------------------------------
   * TITLE
   * ------------------------------------------------------------
   */

  if (this.title) {

    this.title.style.fill =
      isDark
        ? 0xf5f7fa
        : 0x111111;

  }


  /*
   * ------------------------------------------------------------
   * TITLE GLOW
   * ------------------------------------------------------------
   */

  if (this.titleGlow) {

    this.titleGlow.style.fill =
      isDark
        ? 0xffffff
        : 0x000000;

    this.titleGlow.alpha =
      isDark
        ? 0.10
        : 0.055;

  }


  /*
   * ------------------------------------------------------------
   * GLASS PLATFORMS
   * ------------------------------------------------------------
   */

  for (
    const cubeData of this.cubes
  ) {

    if (
      !cubeData ||
      !cubeData.sprite ||
      !cubeData.sprite.userData
    ) {
      continue;
    }


    const data =
      cubeData.sprite.userData;


    /*
     * Main glass body
     */

    if (data.glass) {

      data.glass
        .clear()
        .roundRect(
          -data.size / 2,
          -data.size * 0.15,
          data.size,
          data.size * 0.35,
          16
        )
        .fill({
          color:
            isDark
              ? 0x27313d
              : 0xf7fbff,

          alpha:
            isDark
              ? 0.72
              : 0.70
        })
        .stroke({
          color:
            isDark
              ? 0x607184
              : 0xcbdbe8,

          alpha:
            isDark
              ? 0.82
              : 0.76,

          width:
            1.35
        });

    }


    /*
     * Inner glass
     */

    if (data.innerGlass) {

      data.innerGlass
        .clear()
        .roundRect(
          -data.size * 0.43,
          -data.size * 0.11,
          data.size * 0.86,
          data.size * 0.25,
          11
        )
        .fill({
          color:
            0xffffff,

          alpha:
            isDark
              ? 0.09
              : 0.30
        });

    }


    /*
     * Main highlight
     */

    if (data.highlight) {

      data.highlight
        .clear()
        .roundRect(
          -data.size * 0.36,
          -data.size * 0.085,
          data.size * 0.50,
          data.size * 0.055,
          8
        )
        .fill({
          color:
            0xffffff,

          alpha:
            isDark
              ? 0.22
              : 0.66
        });

    }


    /*
     * Micro highlight
     */

    if (data.microHighlight) {

      data.microHighlight
        .clear()
        .roundRect(
          data.size * 0.18,
          data.size * 0.005,
          data.size * 0.15,
          data.size * 0.035,
          5
        )
        .fill({
          color:
            0xffffff,

          alpha:
            isDark
              ? 0.14
              : 0.38
        });

    }


    /*
     * Edge light
     */

    if (data.edgeLight) {

      data.edgeLight
        .clear()
        .roundRect(
          -data.size * 0.47,
          -data.size * 0.13,
          data.size * 0.94,
          data.size * 0.31,
          15
        )
        .stroke({
          color:
            0xffffff,

          alpha:
            isDark
              ? 0.24
              : 0.42,

          width:
            0.8
        });

    }


    if (data.reflection) {
      data.reflection.clear();
      data.reflection
        .roundRect(
          -data.size * 0.31,
          -data.size * 0.055,
          data.size * 0.26,
          data.size * 0.028,
          5
        )
        .fill({
          color: isDark ? 0xffe7cf : 0xffffff,
          alpha: isDark ? 0.16 : 0.40
        });
      data.reflection.rotation = -0.10;
    }

    if (data.lowerBevel) {
      data.lowerBevel.clear();
      data.lowerBevel
        .roundRect(
          -data.size * 0.39,
          data.size * 0.105,
          data.size * 0.78,
          data.size * 0.028,
          6
        )
        .fill({
          color: isDark ? 0xffd9b2 : 0xffffff,
          alpha: isDark ? 0.12 : 0.22
        });
    }

    if (data.rimGlow) {
      data.rimGlow.clear();
      data.rimGlow
        .roundRect(
          -data.size * 0.45,
          -data.size * 0.13,
          data.size * 0.90,
          data.size * 0.30,
          15
        )
        .stroke({
          color: isDark ? 0xffd6a2 : 0xd8efff,
          alpha: isDark ? 0.10 : 0.15,
          width: 2.2
        });
    }

  }


  /*
   * ------------------------------------------------------------
   * CURSOR LIGHT
   * ------------------------------------------------------------
   */

  this._updateCursorLight();


  /*
   * ------------------------------------------------------------
   * THEME BUTTON
   * ------------------------------------------------------------
   */

  this._updateThemeButton();

}


  /* ================================================================
     UPDATE THEME BUTTON
     ================================================================ */

  _updateThemeButton() {

  if (
    !this.themeButton
  ) {
    return;
  }


  const isDark =
    this.theme === 'dark';


  this.themeButton.textContent =
    isDark
      ? '☀️'
      : '🌙';


  this.themeButton.setAttribute(
    'aria-label',
    isDark
      ? 'Switch to light mode'
      : 'Switch to dark mode'
  );


  this.themeButton.title =
    isDark
      ? 'Switch to light mode'
      : 'Switch to dark mode';


  this.themeButton.style.background =
    isDark
      ? 'rgba(30,38,50,0.88)'
      : 'rgba(255,255,255,0.88)';


  this.themeButton.style.color =
    isDark
      ? '#ffffff'
      : '#222222';


  this.themeButton.style.border =
    isDark
      ? '1px solid rgba(255,255,255,0.18)'
      : '1px solid rgba(0,0,0,0.08)';


  this.themeButton.style.boxShadow =
    isDark
      ? '0 8px 28px rgba(0,0,0,0.38)'
      : '0 8px 25px rgba(0,0,0,0.12)';

}


  /* ================================================================
     INITIAL THEME
     ================================================================ */

  _initializeTheme() {

    let savedTheme =
      null;


    try {

      savedTheme =
        localStorage.getItem(
          'emoji-theme'
        );

    } catch {

      savedTheme =
        null;

    }


    const theme =
      savedTheme ===
      'dark'
        ? 'dark'
        : 'light';


    document.documentElement
      .setAttribute(
        'data-theme',
        theme
      );


    this._applyTheme(
      theme
    );

  }
  /* ================================================================
     UPDATE VISUAL EFFECTS
     ================================================================ */

  _updateVisualEffects(
    dtMs
  ) {

    const dt =
      dtMs *
      0.001;


    this._updateCinematicScene(dt);


    /*
     * ------------------------------------------------------------
     * TITLE IDLE ANIMATION
     * ------------------------------------------------------------
     */

    if (
        this.title
    ) {

        this.titleAnimationTime += dt;

        /*
        * ------------------------------------------
        * ENTRANCE
        * ------------------------------------------
        */

        if (
            this.titleEntranceProgress < 1
        ) {

            this.titleEntranceProgress =
            Math.min(
                1,
                this.titleEntranceProgress +
                dt / 0.75
            );
        }

        const entrance =
            this._easeOutCubic(
            this.titleEntranceProgress
            );

        /*
        * ------------------------------------------
        * FLOAT
        * ------------------------------------------
        */

        const floatY =
            Math.sin(
            this.titleAnimationTime *
            1.15
            ) * 2.2;

        /*
        * ------------------------------------------
        * BREATHING
        * ------------------------------------------
        */

        const breathing =
            1 +
            Math.sin(
            this.titleAnimationTime *
            0.85
            ) * 0.012;

        /*
        * ------------------------------------------
        * MICRO ROTATION
        * ------------------------------------------
        */

        const tilt =
            Math.sin(
            this.titleAnimationTime *
            0.55
            ) * 0.008;

        /*
        * ------------------------------------------
        * APPLY
        * ------------------------------------------
        */

        this.title.alpha =
            entrance;

        this.title.y =
            this.titleBaseY +
            floatY;

        this.title.rotation =
            tilt;

        this.title.scale.set(
            (
            0.88 +
            entrance * 0.12
            ) *
            breathing
        );

    }


    /*
     * ------------------------------------------------------------
     * GLASS LIGHTING
     * ------------------------------------------------------------
     *
     * Cursor lighting is intentionally
     * lightweight. No expensive blur filter
     * is applied to every platform.
     */

    if (
      this.cubes &&
      this.cubes.length
    ) {

      for (
        const cubeData of this.cubes
      ) {

        if (
          !cubeData ||
          !cubeData.sprite ||
          !cubeData.sprite.userData
        ) {

          continue;

        }


        const data =
          cubeData.sprite.userData;

        /* Staggered cinematic platform reveal. */
        const reveal =
          Math.max(0, Math.min(1, (this.cinematicIntro - (cubeData.entranceDelay || 0)) / 0.55));
        const revealEase =
          this._easeOutCubic(reveal);
        cubeData.sprite.alpha =
          0.72 + revealEase * 0.28;


        const dx =
          this.mouse.x -
          cubeData.sprite.x;


        const dy =
          this.mouse.y -
          cubeData.sprite.y;


        const distance =
          Math.hypot(
            dx,
            dy
          );


        const radius =
          this.isMobileOrTablet
            ? 155
            : 230;


        const influence =
          Math.max(
            0,
            1 -
            distance /
            radius
          );


        /*
         * Subtle highlight response.
         */

        if (
          data.highlight
        ) {
          data.highlight.alpha =
            (
                this.theme === 'dark'
                ? 0.24
                : 0.58
            ) +
            influence *
            (
                this.theme === 'dark'
                ? 0.30
                : 0.32
            );  
        }


        if (
          data.edgeLight
        ) {

          data.edgeLight.alpha =
            (
                this.theme === 'dark'
                ? 0.26
                : 0.38
            ) +
            influence *
            0.28;

        }


        if (data.reflection) {
          data.reflection.alpha =
            (this.theme === 'dark' ? 0.16 : 0.40) + influence * 0.34;
          data.reflection.x =
            Math.max(-data.size * 0.08, Math.min(data.size * 0.08, dx * 0.035));
        }

        if (data.lowerBevel) {
          data.lowerBevel.alpha =
            (this.theme === 'dark' ? 0.12 : 0.22) + influence * 0.10;
        }

        if (data.rimGlow) {
          data.rimGlow.alpha =
            (this.theme === 'dark' ? 0.10 : 0.15) + influence * 0.24;
        }


      }

    }


    /*
     * ------------------------------------------------------------
     * EMOJI HIGHLIGHT
     * ------------------------------------------------------------
     *
     * Only CSS brightness/saturation is changed.
     * No filters are applied when the pointer
     * is far away.
     */

    if (
      this.emojis
    ) {

      for (
        const emoji of this.emojis
      ) {

        if (
          !emoji ||
          !emoji.element ||
          emoji.isFlying
        ) {

          continue;

        }


        const dx =
          this.mouse.x -
          emoji.x;


        const dy =
          this.mouse.y -
          emoji.y;


        const distance =
          Math.hypot(
            dx,
            dy
          );


        const radius =
          this.isMobileOrTablet
            ? 125
            : 175;


        const influence =
          Math.max(
            0,
            1 -
            distance /
            radius
          );


        if (
          influence >
          0.03
        ) {

          const brightness =
            1 +
            influence *
            0.085;

            const saturation =
            1 +
            influence *
            0.095;


          emoji.cursorInfluence =
            influence;

        } else {

          emoji.element.style.filter =
            '';

        }

      }

    }

  }


  /* ================================================================
     UPDATE FRAME
     ================================================================ */

  _updateFrame(
    ticker
  ) {

    try {

      const deltaTime =
        ticker?.deltaTime ||
        1;


      const dtMs =
        Math.min(
          50,
          deltaTime *
          (
            1000 /
            60
          )
        );


      const dt =
        Math.min(
          1.5,
          deltaTime
        );


      /*
       * ------------------------------------------------------------
       * EMOJI UPDATE
       * ------------------------------------------------------------
       *
       * Mobile sensors and shake physics are intentionally removed.
       * Scanner transfers use the same DOM emoji and the normal idle
       * animation continues for every emoji that is not scanning.
       */

      for (
        const emoji of this.emojis
      ) {

        if (!emoji) {
          continue;
        }

        try {
          if (emoji.scannerState) {
            this._updateScannerEmoji(
              emoji,
              dtMs
            );
            continue;
          }

          this._updateIdleAnimation(
            emoji,
            dt
          );
        } catch (error) {
          console.error(
            '[Emoji World] Emoji frame error:',
            error
          );
        }
      }


      /*
       * ------------------------------------------------------------
       * VISUAL EFFECTS
       * ------------------------------------------------------------
       *
       * IMPORTANT:
       *
       * Keep this call ONLY ONCE per frame.
       *
       * Do not add another _updateVisualEffects()
       * call elsewhere in _updateFrame().
       */

      this._updateVisualSystems(
        dtMs
    );

    } catch (error) {

      console.error(
        '[Emoji World] Frame update error:',
        error
      );

    }

  }


  /* ================================================================
     STOP ALL MOBILE ANIMATIONS
     ================================================================ */

  _stopAllMobileAnimations() {

    for (
      const emoji of this.emojis
    ) {

      if (
        !emoji
      ) {

        continue;

      }


      if (
        emoji.isMobileActive
      ) {

        this._deactivateMobileEmoji(
          emoji
        );

      }

    }


    this.mobileActiveEmojis.clear();

  }


  /* ================================================================
     RESTORE MOBILE STATIC FRAMES
     ================================================================ */

  _restoreMobileStaticFrames() {

    if (
      !this.isMobileOrTablet
    ) {

      return;

    }


    for (
      const emoji of this.emojis
    ) {

      if (
        !emoji ||
        !emoji.element ||
        emoji.isMobileActive ||
        emoji.isFlying
      ) {

        continue;

      }


      if (
        emoji.staticURL
      ) {

        emoji.element.src =
          emoji.staticURL;

        emoji.element.style.visibility =
          'visible';

        emoji.element.style.opacity =
          '1';

      }

    }

  }


  /* ================================================================
     RESTORE DESKTOP ANIMATIONS
     ================================================================ */

  _restoreDesktopAnimations() {

    for (
      const emoji of this.emojis
    ) {

      if (
        !emoji ||
        !emoji.element
      ) {

        continue;

      }


      const animatedURL =
        emoji.element.dataset.src;


      if (
        animatedURL
      ) {

        emoji.element.src =
          animatedURL;

      }


      emoji.element.style.visibility =
        'visible';


      emoji.element.style.opacity =
        '1';

    }

  }


  /* ================================================================
     SAFE MODE SWITCH
     ================================================================ */

  _refreshAnimationMode() {

    const detectedMode =
      this._detectMobileOrTablet();


    if (
      detectedMode ===
      this.isMobileOrTablet
    ) {

      return;

    }


    if (
      detectedMode
    ) {

      this._enableMobileAnimationMode();

    } else {

      this._enableDesktopAnimationMode();

    }

  }


  /* ================================================================
     AUDIO VOLUME CONTROL
     ================================================================ */

  _setAudioVolumes(
    musicVolume = 0.70,
    talkingVolume = 0.50
  ) {

    /*
     * Clamp values to valid Web Audio
     * / HTMLAudioElement range.
     */

    this.audio.musicVolume =
      Math.max(
        0,
        Math.min(
          1,
          musicVolume
        )
      );


    this.audio.talkingVolume =
      Math.max(
        0,
        Math.min(
          1,
          talkingVolume
        )
      );


    if (
      this.audio.music
    ) {

      this.audio.music.volume =
        this.audio.musicVolume;

    }


    if (
      this.audio.talking
    ) {

      this.audio.talking.volume =
        this.audio.talkingVolume;

    }

  }


  /* ================================================================
     MUTE / UNMUTE MUSIC
     ================================================================ */

  _setMusicMuted(
    muted
  ) {

    if (
      !this.audio.music
    ) {

      return;

    }


    this.audio.music.muted =
      Boolean(
        muted
      );

  }


  /* ================================================================
     PAUSE AUDIO
     ================================================================ */

  _pauseAudio() {

    if (
      this.audio.music
    ) {

      try {

        this.audio.music.pause();

      } catch {

        /* Ignore */

      }

    }


    if (
      this.audio.talking
    ) {

      try {

        this.audio.talking.pause();

      } catch {

        /* Ignore */

      }

    }

  }


  /* ================================================================
     RESUME MUSIC
     ================================================================ */

  _resumeMusic() {

    if (
      !this.audio.music ||
      !this.audio.unlocked
    ) {

      return;

    }


    this.audio.music.volume =
      this.audio.musicVolume;


    const playPromise =
      this.audio.music.play();


    if (
      playPromise &&
      typeof playPromise.catch ===
        'function'
    ) {

      playPromise.catch(
        () => {

          /*
           * Browser can reject playback
           * after tab visibility changes.
           *
           * The next user interaction will
           * call _unlockAudio() again.
           */

          this.audio.unlocked =
            false;

        }
      );

    }

  }


  /* ================================================================
     VISIBILITY CHANGE
     ================================================================ */

  _handleVisibilityChange() {

    if (
      document.hidden
    ) {

      /*
       * Stop animation scheduler while the
       * page is not visible.
       */

      if (
        this.isMobileOrTablet
      ) {

        this._stopMobileAnimationScheduler();

      }


      /*
       * Pause audio to avoid unnecessary
       * background playback.
       */

      this._pauseAudio();

      return;

    }


    /*
     * Resume mobile scheduler only if the
     * scene is not currently shaking.
     */

    if (
      this.isMobileOrTablet &&
      !this.isShaking &&
      !this.isRecovering
    ) {

      this._startMobileAnimationScheduler();

    }


    /*
     * Music resumes only after audio has
     * already been unlocked by the user.
     */

    this._resumeMusic();

  }


  /* ================================================================
     SETUP VISIBILITY HANDLER
     ================================================================ */

  _setupVisibilityHandler() {

    document.addEventListener(
      'visibilitychange',
      () => {

        this._handleVisibilityChange();

      },
      {
        passive:
          true
      }
    );

  }
  /* ================================================================
     INITIALIZE VISUAL STATE
     ================================================================ */

  _initializeVisualState() {

    /*
     * Cursor light state.
     */

    this.cursorLight =
      null;

    this.cursorLightEnabled =
      true;

    this.cursorLightX =
      this.mouse.x;

    this.cursorLightY =
      this.mouse.y;

    this.cursorLightTargetX =
      this.mouse.x;

    this.cursorLightTargetY =
      this.mouse.y;


    /*
     * Visual animation state.
     */

    this.visualTime =
      0;

    this.titleAnimationTime =
      0;

    this.titleEntranceProgress =
      0;


    /*
     * Theme state.
     */

    this.theme =
      'light';


    /*
     * Theme colors used by lightweight
     * visual effects.
     */

    this.currentThemeColors = {

      light:
        0xffffff,

      glow:
        0xffffff

    };

    /*
     * Cinematic DOM cursor icon.  The Pixi cursorLight continues to
     * illuminate the scene; this element is only the visible cursor.
     */
    this.cursorVisual = null;
    this.cursorVisualIcon = null;
    this.cursorEmojiTimer = null;
    this.cursorEmojiIndex = -1;

  }


  /* ================================================================
     CREATE CINEMATIC CURSOR VISUAL
     ================================================================ */

  _createCursorVisual() {

    if (this.cursorVisual) {
      return;
    }

    const cursor = document.createElement('div');
    cursor.className = 'emoji-cinematic-cursor';
    cursor.setAttribute('aria-hidden', 'true');

    const icon = document.createElement('div');
    icon.className = 'emoji-cinematic-cursor__icon';

    cursor.appendChild(icon);
    document.body.appendChild(cursor);

    this.cursorVisual = cursor;
    this.cursorVisualIcon = icon;

    this._updateCursorVisualTheme();
    this._updateCursorVisualPosition(true);
    this._setRandomCursorEmoji(true);
    this._startCursorEmojiRotation();

  }


  /* ================================================================
     UPDATE CURSOR VISUAL THEME
     ================================================================ */

  _updateCursorVisualTheme() {
    if (!this.cursorVisual || !this.cursorVisualIcon) {
      return;
    }

    const dark = this.theme === 'dark';

    /*
     * The cursor is intentionally CSS-rendered now.
     * Do not inject an SVG here: the visible cursor is a real DOM orb,
     * which avoids font/SVG scaling differences and keeps the glow crisp.
     */
    this.cursorVisual.classList.toggle('is-night', dark);
    this.cursorVisual.classList.toggle('is-day', !dark);
    this.cursorVisualIcon.setAttribute(
      'data-theme',
      dark ? 'dark' : 'light'
    );
  }


  /* ================================================================
     RANDOM EMOJI CURSOR
     ================================================================ */

  _getCursorEmojiPool() {

    return [
      '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃',
      '😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜',
      '🤪','🤨','🧐','🤓','😎','🥳','🤩','😏','😒','😞','😔','😟',
      '😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠',
      '😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗',
      '🤔','🫡','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦',
      '😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮',
      '🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩',
      '👻','💀','☠️','👽','🤖','🎃','😺','😸','😹','😻','😼','😽',
      '🙀','😿','😾','🙈','🙉','🙊','🐵','🦊','🐼','🐸','🦄','🐙',
      '🦋','🌈','⭐','🌟','✨','🔥','💫','⚡','💥','🌙','☀️','🍀',
      '🍕','🍔','🍩','🍪','🍉','🍓','🍌','🍎','🍭','🎈','🎉','🎊',
      '🎁','🚀','🛸','💎','❤️','💙','💜','💚','🧡','💛','🩷','🤍',
      '🖤','🤎','💖','💗','💓','💞','💘','💝','💟','👍','👎','👏',
      '🙌','🤝','🙏','💪','👀','👋','✌️','🤟','👌','🤌','🫶','🧠'
    ];

  }


  _setRandomCursorEmoji(initial = false) {

    if (!this.cursorVisualIcon) {
      return;
    }

    const pool = this._getCursorEmojiPool();

    if (!pool.length) {
      return;
    }

    let nextIndex = Math.floor(Math.random() * pool.length);

    if (!initial && pool.length > 1 && nextIndex === this.cursorEmojiIndex) {
      nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
    }

    this.cursorEmojiIndex = nextIndex;
    this.cursorVisualIcon.textContent = pool[nextIndex];
    this.cursorVisualIcon.setAttribute('aria-label', `Cursor emoji ${pool[nextIndex]}`);

    /* Restart the tiny float animation so each new emoji appears cleanly. */
    this.cursorVisualIcon.style.animation = 'none';
    void this.cursorVisualIcon.offsetWidth;
    this.cursorVisualIcon.style.animation = '';

  }


  _startCursorEmojiRotation() {

    if (this.cursorEmojiTimer) {
      clearInterval(this.cursorEmojiTimer);
    }

    /* Change to a new random emoji every 5 seconds without reloading the page. */
    this.cursorEmojiTimer = window.setInterval(() => {
      this._setRandomCursorEmoji(false);
    }, 5000);

  }


  /* ================================================================
     UPDATE CURSOR VISUAL POSITION
     ================================================================ */

  _updateCursorVisualPosition(instant = false) {

    if (!this.cursorVisual) {
      return;
    }

    const x = this.cursorLightX;
    const y = this.cursorLightY;

    this.cursorVisual.style.setProperty('--cursor-x', `${x}px`);
    this.cursorVisual.style.setProperty('--cursor-y', `${y}px`);

    if (instant) {
      this.cursorVisual.style.setProperty('--cursor-transition', 'none');
    } else {
      this.cursorVisual.style.setProperty('--cursor-transition', 'transform 70ms linear');
    }

  }


  /* ================================================================
     CREATE CURSOR LIGHT
     ================================================================ */

  _createCursorLight() {

    if (
      !this.app ||
      !this.app.stage
    ) {

      return;

    }


    /*
     * Remove previous light if one exists.
     */

    if (
      this.cursorLight
    ) {

      try {

        this.app.stage.removeChild(
          this.cursorLight
        );

      } catch {

        /* Ignore */

      }

    }


    const light =
      new PIXI.Graphics();


    light.eventMode =
      'none';


    light.zIndex =
      0;


    this.app.stage.addChild(
      light
    );


    this.cursorLight =
      light;

    this._createCursorVisual();


    /*
     * Start it at the current pointer.
     */

    this.cursorLightX =
      this.mouse.x;


    this.cursorLightY =
      this.mouse.y;


    this.cursorLightTargetX =
      this.mouse.x;


    this.cursorLightTargetY =
      this.mouse.y;


    this._updateCursorLight();

  }


  /* ================================================================
     UPDATE CURSOR LIGHT
     ================================================================ */

  _updateCursorLight() {

    if (
      !this.cursorLight ||
      !this.cursorLightEnabled
    ) {
      return;
    }

    /*
     * The visible pointer is now the random emoji DOM cursor.
     * Keep the Pixi cursor-light layer empty so it cannot create the old
     * large moving circles/halos underneath the pointer.
     */
    this.cursorLight.clear();


  }


  /* ================================================================
     UPDATE CURSOR LIGHT POSITION
     ================================================================ */

  _updateCursorLightPosition(
    dt
  ) {

    if (
      !this.cursorLight
    ) {

      return;

    }


    this.cursorLightX +=
      (
        this.cursorLightTargetX -
        this.cursorLightX
      ) *
      Math.min(
        1,
        dt *
        24
      );


    this.cursorLightY +=
      (
        this.cursorLightTargetY -
        this.cursorLightY
      ) *
      Math.min(
        1,
        dt *
        24
      );


    this._updateCursorLight();
    this._updateCursorVisualPosition();

  }


  /* ================================================================
     CREATE TITLE GLOW
     ================================================================ */

  _createTitleGlow() {

    /*
     * The title itself remains the main
     * readable text. The glow is deliberately
     * subtle and placed behind it.
     */

    if (
      !this.title ||
      !this.titleContainer
    ) {

      return;

    }


    const glow =
      new PIXI.Text({

        text:
          this.title.text,

        style: {

          fontFamily:
            'Arial, Helvetica, sans-serif',

          fontSize:
            this._getTitleSize(),

          fontWeight:
            '700',

          fill:
            0xffffff,

          align:
            'center',

          letterSpacing:
            1

        }

      });


    glow.anchor.set(
      0.5
    );


    glow.x =
      this.title.x;


    glow.y =
      this.title.y;


    glow.alpha =
      0;


    glow.zIndex =
      -1;


    /*
     * Very small scale difference.
     */

    glow.scale.set(
      1.03
    );


    this.titleContainer.addChildAt(
      glow,
      0
    );


    this.titleGlow =
      glow;

  }


  /* ================================================================
     UPDATE TITLE GLOW
     ================================================================ */

  _updateTitleGlow() {

    if (
      !this.titleGlow ||
      !this.title
    ) {

      return;

    }


    this.titleGlow.text =
      this.title.text;


    this.titleGlow.x =
      this.title.x;


    this.titleGlow.y =
      this.title.y;


    this.titleGlow.style.fontSize =
      this._getTitleSize();


    this.titleGlow.alpha =
      this.theme ===
      'dark'
        ? 0.10
        : 0.055;


    this.titleGlow.scale.set(
      this.title.scale.x *
      1.035
    );

  }


  /* ================================================================
     ENHANCE TITLE
     ================================================================ */

  _enhanceTitle() {

    if (
      !this.title
    ) {

      return;

    }


    /*
     * Make sure the title remains readable.
     */

    this.title.alpha =
      this.titleEntranceProgress;


    this._updateTitleGlow();

  }


  /* ================================================================
     VISUAL EFFECTS INITIALIZATION
     ================================================================ */

  _initializeVisualEffects() {

    this._initializeVisualState();


    /*
     * Cursor light is disabled on very small
     * devices until touch interaction occurs.
     *
     * This prevents unnecessary rendering on
     * low-powered mobile devices.
     */

    if (
      this.isMobileOrTablet &&
      !this.touchActive
    ) {

      this.cursorLightEnabled =
        false;

    } else {

      this.cursorLightEnabled =
        true;

    }


    this._createCursorLight();
    this._createCursorVisual();


    this._createTitleGlow();


    this._initializeTheme();


    this._enhanceTitle();

  }


  /* ================================================================
     ENABLE MOBILE CURSOR LIGHT
     ================================================================ */

  _enableMobileCursorLight() {

    if (
      !this.isMobileOrTablet
    ) {

      return;

    }


    this.cursorLightEnabled =
      true;


    if (
      !this.cursorLight
    ) {

      this._createCursorLight();

    }


    this._updateCursorLight();

  }


  /* ================================================================
     DISABLE MOBILE CURSOR LIGHT
     ================================================================ */

  _disableMobileCursorLight() {

    if (
      !this.isMobileOrTablet
    ) {

      return;

    }


    this.cursorLightEnabled =
      false;


    if (
      this.cursorLight
    ) {

      this.cursorLight.clear();

    }

  }


  /* ================================================================
     MOBILE TOUCH LIGHT
     ================================================================ */

  _updateMobileTouchLight() {

    if (
      !this.isMobileOrTablet
    ) {

      return;

    }


    if (
      !this.touchActive
    ) {

      /*
       * Fade the effect out by simply
       * clearing the lightweight graphics.
       */

      this._disableMobileCursorLight();

      return;

    }


    this._enableMobileCursorLight();

  }


  /* ================================================================
     THEME COLOR UPDATE
     ================================================================ */

  _updateThemeColors() {

    if (
      this.theme ===
      'dark'
    ) {

      this.currentThemeColors = {

        light:
          0x9bc8ff,

        glow:
          0xbfe0ff

      };

    } else {

      this.currentThemeColors = {

        light:
          0xffffff,

        glow:
          0xffffff

      };

    }

  }


  /* ================================================================
     APPLY THEME + VISUAL COLORS
     ================================================================ */

  _refreshThemeVisuals() {

    this._updateThemeColors();


    this._applyTheme(
      this.theme
    );


    this._updateCursorLight();
    this._updateCursorVisualTheme();


    this._updateTitleGlow();

  }


  /* ================================================================
     PAGE FOCUS
     ================================================================ */

  _handleWindowFocus() {

    if (
      this.isMobileOrTablet &&
      !this.isShaking &&
      !this.isRecovering
    ) {

      this._startMobileAnimationScheduler();

    }


    this._resumeMusic();

  }


  /* ================================================================
     PAGE BLUR
     ================================================================ */

  _handleWindowBlur() {

    if (
      this.isMobileOrTablet
    ) {

      this._stopMobileAnimationScheduler();

    }


    this._pauseAudio();

  }


  /* ================================================================
     SETUP PAGE FOCUS / BLUR
     ================================================================ */

  _setupFocusHandlers() {

    window.addEventListener(
      'focus',
      () => {

        this._handleWindowFocus();

      },
      {
        passive:
          true
      }
    );


    window.addEventListener(
      'blur',
      () => {

        this._handleWindowBlur();

      },
      {
        passive:
          true
      }
    );

  }


  /* ================================================================
     UPDATE POINTER POSITION
     ================================================================ */

  _setPointerPosition(
    x,
    y
  ) {

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {

      return;

    }


    this.mouse.x =
      Math.max(
        0,
        Math.min(
          this.width,
          x
        )
      );


    this.mouse.y =
      Math.max(
        0,
        Math.min(
          this.height,
          y
        )
      );


    this.cursorLightTargetX =
      this.mouse.x;


    this.cursorLightTargetY =
      this.mouse.y;


    if (
      this.cursorLightEnabled
    ) {

      this._updateCursorLight();

    }

  }


  /* ================================================================
     ADVANCED POINTER LIGHT
     ================================================================ */

  _updatePointerLightFromEvent(
    event
  ) {

    if (
      !event
    ) {

      return;

    }


    this._setPointerPosition(
      event.clientX,
      event.clientY
    );

  }


  /* ================================================================
     ADD POINTER LIGHT EVENTS
     ================================================================ */

  _setupPointerLightEvents() {

    window.addEventListener(
      'mousemove',
      event => {

        this._updatePointerLightFromEvent(
          event
        );

      },
      {
        passive:
          true
      }
    );


    window.addEventListener(
      'touchstart',
      event => {

        const touch =
          event.touches?.[0];


        if (
          touch
        ) {

          this._setPointerPosition(
            touch.clientX,
            touch.clientY
          );

        }


        this._enableMobileCursorLight();

      },
      {
        passive:
          true
      }
    );


    window.addEventListener(
      'touchmove',
      event => {

        const touch =
          event.touches?.[0];


        if (
          touch
        ) {

          this._setPointerPosition(
            touch.clientX,
            touch.clientY
          );

        }


        this._enableMobileCursorLight();

      },
      {
        passive:
          true
      }
    );


    window.addEventListener(
      'touchend',
      () => {

        this.touchActive =
          false;


        this._disableMobileCursorLight();

      },
      {
        passive:
          true
      }
    );

  }


  /* ================================================================
     SETUP ALL VISUAL EVENT HANDLERS
     ================================================================ */

  _setupVisualEventHandlers() {

    this._setupVisibilityHandler();


    this._setupFocusHandlers();


    this._setupPointerLightEvents();

  }
  /* ================================================================
     DYNAMIC EMOJI / PLATFORM LIGHTING
     ================================================================ */

  _updateDynamicLighting() {

    const dark = this.theme === 'dark';
    const lightX = this.cursorLightX;
    const lightY = this.cursorLightY;

    /*
     * Realistic cursor-responsive emoji shadows:
     * - no ellipse/circle is drawn beneath the emoji
     * - each emoji keeps a soft ambient contact shadow
     * - the directional component shifts away from the glowing cursor
     * - the closer the cursor gets, the more pronounced the directional
     *   shadow becomes, creating a natural light/shadow response
     */
    for (const emoji of this.emojis) {

      if (!emoji || !emoji.element) {
        continue;
      }

      const dx = emoji.x - lightX;
      const dy = emoji.y - lightY;
      const distance = Math.hypot(dx, dy);
      const radius = dark ? 430 : 500;
      const influence = Math.max(0, 1 - distance / radius);
      const normalizedX = distance > 0.001 ? dx / distance : 0;
      const normalizedY = distance > 0.001 ? dy / distance : 0;

      /*
       * Shadow travels away from the cursor. Keep it short and soft so it
       * reads as light reacting to the emoji rather than a floating circle.
       */
      const shadowDistance = 2.5 + influence * 10;
      const shadowX = normalizedX * shadowDistance;
      const shadowY = normalizedY * shadowDistance * 0.72;
      const blur = 5 + influence * 6;
      const ambientOpacity = dark ? 0.30 : 0.19;
      const directionalOpacity = dark ? 0.36 : 0.24;
      const directional = directionalOpacity + influence * (dark ? 0.18 : 0.13);
      const brightness = 1 + influence * (dark ? 0.12 : 0.08);
      const saturation = 1 + influence * 0.10;

      emoji.element.style.setProperty('--emoji-shadow-x', `${shadowX.toFixed(2)}px`);
      emoji.element.style.setProperty('--emoji-shadow-y', `${shadowY.toFixed(2)}px`);
      emoji.element.style.setProperty('--emoji-shadow-blur', `${blur.toFixed(2)}px`);
      emoji.element.style.setProperty('--emoji-shadow-opacity', directional.toFixed(3));
      emoji.element.style.setProperty('--emoji-ambient-opacity', ambientOpacity.toFixed(3));

      emoji.element.style.filter = `
        drop-shadow(0 4px 7px rgba(0,0,0,${ambientOpacity.toFixed(3)}))
        drop-shadow(var(--emoji-shadow-x) var(--emoji-shadow-y) var(--emoji-shadow-blur) rgba(0,0,0,var(--emoji-shadow-opacity)))
        brightness(${brightness.toFixed(3)})
        saturate(${saturation.toFixed(3)})
      `;

    }

    /*
     * Platforms stay clean and glassy. Their old circular/deep/contact
     * shadows have been removed entirely; depth now comes from the glass
     * bevel, highlights and the emoji's own directional shadow.
     */
    for (const cubeData of this.cubes) {

      const cube = cubeData?.sprite;
      const data = cube?.userData;

      if (!cube || !data) {
        continue;
      }

      if (data.glass) {
        data.glass.alpha = dark ? 0.34 : 0.58;
      }

      if (data.edgeLight) {
        data.edgeLight.alpha = dark ? 0.46 : 0.62;
      }

      if (data.rimGlow) {
        data.rimGlow.alpha = dark ? 0.14 : 0.15;
      }

    }

  }

  /* ================================================================
     COMPLETE VISUAL UPDATE
     ================================================================ */

  _updateVisualSystems(
    dtMs
  ) {

    const dt =
      dtMs *
      0.001;


    /*
     * Cursor light.
     */

    if (
      this.cursorLightEnabled
    ) {

      this._updateCursorLightPosition(
        dt
      );

    }


    /*
     * Mobile touch state.
     */

    if (
      this.isMobileOrTablet
    ) {

      this._updateMobileTouchLight();

    }


    /*
     * Title glow.
     */

    if (
      this.titleGlow
    ) {

      this._updateTitleGlow();

    }


    /*
     * Main visual effects.
     */

    this._updateVisualEffects(
      dtMs
    );

    this._updateDynamicLighting();

  }


  /* ================================================================
     DEBUG INFORMATION
     ================================================================ */

  getDebugInfo() {

    return {

      width:
        this.width,

      height:
        this.height,

      mobile:
        this.isMobileOrTablet,

      emojiCount:
        this.emojis.length,

      activeMobileAnimations:
        this.mobileActiveEmojis.size,

      mobileAnimationLimit:
        this.mobileAnimationLimit,

      schedulerRunning:
        this.mobileSchedulerTimer !==
        null,

      shaking:
        this.isShaking,

      recovering:
        this.isRecovering,

      audioUnlocked:
        this.audio.unlocked,

      musicVolume:
        this.audio.musicVolume,

      talkingVolume:
        this.audio.talkingVolume,

      theme:
        this.theme

    };

  }


  /* ================================================================
     GET ACTIVE MOBILE EMOJIS
     ================================================================ */

  getActiveMobileEmojis() {

    return [
      ...this.mobileActiveEmojis
    ].map(
      emoji =>
        emoji.index
    );

  }


  /* ================================================================
     FORCE NEXT MOBILE ANIMATION
     ================================================================ */

  _forceNextMobileAnimation() {

    if (
      !this.isMobileOrTablet
    ) {

      return;

    }


    if (
      this.isShaking ||
      this.isRecovering
    ) {

      return;

    }


    const emoji =
      this._getNextMobileEmoji();


    if (
      !emoji
    ) {

      return;

    }


    this._activateMobileEmoji(
      emoji
    );

  }


  /* ================================================================
     FORCE MOBILE RESHUFFLE
     ================================================================ */

  _reshuffleMobileAnimations() {

    if (
      !this.isMobileOrTablet
    ) {

      return;

    }


    this.mobileShuffleBag =
      [];


    this._refillMobileShuffleBag();

  }


  /* ================================================================
     PAUSE MOBILE ANIMATIONS
     ================================================================ */

  _pauseMobileAnimations() {

    this._stopMobileAnimationScheduler();


    for (
      const emoji of [
        ...this.mobileActiveEmojis
      ]
    ) {

      this._deactivateMobileEmoji(
        emoji
      );

    }

  }


  /* ================================================================
     RESUME MOBILE ANIMATIONS
     ================================================================ */

  _resumeMobileAnimations() {

    if (
      !this.isMobileOrTablet
    ) {

      return;

    }


    if (
      this.isShaking ||
      this.isRecovering
    ) {

      return;

    }


    this._restoreMobileStaticFrames();


    this._startMobileAnimationScheduler();

  }


  /* ================================================================
     RESET ALL EMOJIS
     ================================================================ */

  _resetAllEmojis() {

    this.isShaking =
      false;


    this.isRecovering =
      false;


    this.shakeRecoveryTime =
      0;

    this.lastHandledShakeSequence =
      0;


    this._stopMobileAnimationScheduler();


    this.mobileActiveEmojis.clear();


    this.mobileShuffleBag =
      [];


    for (
      const emoji of this.emojis
    ) {

      if (
        !emoji
      ) {

        continue;

      }


      emoji.isFlying =
        false;

      emoji.shakePhase =
        'idle';

      emoji.isRecovering =
        false;

      emoji.shakeSettledAt =
        0;

      emoji.shakeDropStartedAt =
        0;

      emoji.isMobileActive =
        false;


      emoji.animationEndsAt =
        0;


      emoji.flyProgress =
        0;


      emoji.recoveryDelay =
        0;



      if (
        this.isMobileOrTablet
      ) {

        if (
          emoji.staticURL
        ) {

          emoji.element.src =
            emoji.staticURL;

        }

      } else {

        const animatedURL =
          emoji.element.dataset.src;


        if (
          animatedURL
        ) {

          emoji.element.src =
            animatedURL;

        }

      }


      emoji.element.style.visibility =
        'visible';


      emoji.element.style.opacity =
        '1';

    }


    if (
      this.isMobileOrTablet
    ) {

      this._startMobileAnimationScheduler();

    }

  }


  /* ================================================================
     SET ANIMATION LIMIT
     ================================================================ */

  _setMobileAnimationLimit(
    limit
  ) {

    if (
      !Number.isFinite(limit)
    ) {

      return;

    }


    const safeLimit =
      Math.max(
        1,
        Math.min(
          8,
          this.emojis.length,
          Math.floor(limit)
        )
      );


    this.mobileAnimationLimit =
      safeLimit;


    if (
      !this.isMobileOrTablet
    ) {

      return;

    }


    /*
     * If the new limit is smaller than
     * the current active count, deactivate
     * excess emojis.
     */

    while (
      this.mobileActiveEmojis.size >
      safeLimit
    ) {

      const first =
        this.mobileActiveEmojis
          .values()
          .next()
          .value;


      if (
        !first
      ) {

        break;

      }


      this._deactivateMobileEmoji(
        first
      );

    }


    this._fillMobileAnimationSlots();

  }


  /* ================================================================
     PRELOAD NEXT STATIC FRAMES
     ================================================================ */

  _preloadMobileFramesForNextCycle() {

    if (
      !this.isMobileOrTablet
    ) {

      return;

    }


    /*
     * Only prepare frames that are not
     * already ready/loading.
     */

    const pending =
      this.emojis.filter(
        emoji =>
          emoji &&
          !emoji.staticReady &&
          !this.mobileStaticFrameLoading.has(
            emoji.index
          )
      );


    if (
      pending.length === 0
    ) {

      return;

    }


    /*
     * Prepare one frame at a time so
     * the browser does not suddenly decode
     * all 24 animations simultaneously.
     */

    const next =
      pending[0];


    this._prepareOneMobileStaticFrame(
      next
    );

  }


  /* ================================================================
     AUDIO STATUS
     ================================================================ */

  _getAudioStatus() {

    return {

      unlocked:
        Boolean(
          this.audio.unlocked
        ),

      musicPlaying:
        Boolean(
          this.audio.music &&
          !this.audio.music.paused
        ),

      talkingPlaying:
        Boolean(
          this.audio.talking &&
          !this.audio.talking.paused
        ),

      musicVolume:
        this.audio.musicVolume,

      talkingVolume:
        this.audio.talkingVolume

    };

  }


  /* ================================================================
     STOP TALKING SOUND
     ================================================================ */

  _stopTalkingSound() {

    if (
      !this.audio.talking
    ) {

      return;

    }


    try {

      this.audio.talking.pause();


      this.audio.talking.currentTime =
        0;

    } catch {

      /* Ignore */

    }

  }


  /* ================================================================
     STOP MUSIC
     ================================================================ */

  _stopMusic() {

    if (
      !this.audio.music
    ) {

      return;

    }


    try {

      this.audio.music.pause();


      this.audio.music.currentTime =
        0;

    } catch {

      /* Ignore */

    }

  }


  /* ================================================================
     AUDIO CLEANUP
     ================================================================ */

  _destroyAudio() {

    document.removeEventListener(
      'pointerdown',
      this._boundAudioUnlock
    );


    document.removeEventListener(
      'touchstart',
      this._boundAudioUnlock
    );


    document.removeEventListener(
      'keydown',
      this._boundAudioUnlock
    );


    this._stopTalkingSound();


    this._stopMusic();


    if (
      this.audio.music
    ) {

      this.audio.music.src =
        '';


      this.audio.music.load();

    }


    if (
      this.audio.talking
    ) {

      this.audio.talking.src =
        '';


      this.audio.talking.load();

    }


    this.audio.music =
      null;


    this.audio.talking =
      null;


    this.audio.unlocked =
      false;

  }


  /* ================================================================
     REMOVE VISUAL EFFECTS
     ================================================================ */

  _destroyVisualEffects() {

    if (
      this.cursorLight
    ) {

      try {

        if (
          this.cursorLight.parent
        ) {

          this.cursorLight.parent
            .removeChild(
              this.cursorLight
            );

        }

        this.cursorLight.destroy();

      } catch {

        /* Ignore */

      }

    }


    this.cursorLight =
      null;


    if (
      this.titleGlow
    ) {

      try {

        if (
          this.titleGlow.parent
        ) {

          this.titleGlow.parent
            .removeChild(
              this.titleGlow
            );

        }

        this.titleGlow.destroy();

      } catch {

        /* Ignore */

      }

    }


    this.titleGlow =
      null;

  }


  /* ================================================================
     DESTROY
     ================================================================ */

  destroy() {

    console.log(
      '🧹 Destroying Emoji World...'
    );


    /*
     * Stop schedulers first.
     */

    this._stopMobileAnimationScheduler();


    /*
     * Invalidate pending static-frame
     * generation work.
     */

    this.mobileStaticFrameGeneration++;


    /*
     * Stop Pixi ticker.
     */

    if (
      this.app &&
      this.app.ticker
    ) {

      this.app.ticker.remove(
        this._boundUpdateFrame
      );

    }


    /*
     * Remove resize listener.
     */

    window.removeEventListener(
      'resize',
      this._resizeHandler
    );


    /*
     * Remove native emoji DOM.
     */

    if (
      this.emojis
    ) {

      for (
        const emoji of this.emojis
      ) {

        if (
          emoji &&
          emoji.element &&
          emoji.element.parentNode
        ) {

          emoji.element.parentNode
            .removeChild(
              emoji.element
            );

        }

      }

    }


    this.emojis =
      [];


    /*
     * Remove theme button.
     */

    if (
      this.themeButton &&
      this.themeButton.parentNode
    ) {

      this.themeButton.parentNode
        .removeChild(
          this.themeButton
        );

    }


    this.themeButton =
      null;


    /*
     * Audio cleanup.
     */

    this._destroyAudio();


    /*
     * Visual-effect cleanup.
     */

    if (this.cursorEmojiTimer) {
      clearInterval(this.cursorEmojiTimer);
      this.cursorEmojiTimer = null;
    }

    if (this.cursorVisual && this.cursorVisual.parentNode) {
      this.cursorVisual.parentNode.removeChild(this.cursorVisual);
    }

    this.cursorVisual = null;
    this.cursorVisualIcon = null;

    this._destroyVisualEffects();


    /*
     * Clear scheduler state.
     */

    this.mobileActiveEmojis.clear();


    this.mobileShuffleBag =
      [];


    this.mobileStaticFramePromises.clear();


    this.mobileStaticFrameReady.clear();


    this.mobileStaticFrameLoading.clear();


    /*
     * Destroy Pixi application.
     */

    if (
      this.app
    ) {

      try {

        this.app.destroy(
          true,
          {
            children:
              true,

            texture:
              false,

            baseTexture:
              false
          }
        );

      } catch (error) {

        console.warn(
          '[Emoji World] Pixi destroy warning:',
          error
        );

      }

    }


    this.app =
      null;


    this.physics =
      null;


    this.cubes =
      [];


    this.cubesContainer =
      null;


    this.titleContainer =
      null;


    this.emojiLayer =
      null;


    console.log(
      '✓ Emoji World destroyed'
    );

    this.emojiRefreshButton?.remove();
    this.emojiRefreshButton = null;
  }
  /* ================================================================
     FINAL INITIALIZATION HELPERS
     ================================================================ */

  _finalizeInitialization() {

    /*
     * Theme button.
     */

    this._createThemeButton();


    /*
     * Theme and visual systems.
     */

    this._initializeVisualEffects();


    /*
     * Visibility/focus/pointer handlers.
     */

    this._setupVisualEventHandlers();


    /*
     * Keep audio at the requested levels.
     */

    this._setAudioVolumes(
      0.70,
      0.50
    );


    /*
     * Ensure all emojis are correctly
     * positioned after visual systems
     * are initialized.
     */

    this._repositionEmojisAndCubes();


    /*
     * Start the correct animation mode.
     */

    if (
      this.isMobileOrTablet
    ) {

      this._enableMobileAnimationMode();

    } else {

      this._enableDesktopAnimationMode();

    }

  }


  /* ================================================================
     FINAL SCENE VALIDATION
     ================================================================ */

  _validateScene() {

    const problems =
      [];


    if (
      !this.app
    ) {

      problems.push(
        'Pixi application missing'
      );

    }



    if (
      !this.emojis ||
      this.emojis.length !== 24
    ) {

      problems.push(
        `Expected 24 emojis, found ${
          this.emojis?.length || 0
        }`
      );

    }


    if (
      !this.cubes ||
      this.cubes.length !== 24
    ) {

      problems.push(
        `Expected 24 platforms, found ${
          this.cubes?.length || 0
        }`
      );

    }


    if (
      problems.length > 0
    ) {

      console.warn(
        '[Emoji World] Scene validation:',
        problems
      );


      return false;

    }


    return true;

  }


  /* ================================================================
     PUBLIC INITIALIZATION
     ================================================================ */

  async initialize() {

    /*
     * This method is safe to call after
     * construction if the caller wants an
     * explicit initialization step.
     */

    if (
      this.ready
    ) {

      try {

        await this.ready;

      } catch (error) {

        throw error;

      }

    }


    /*
     * Final scene checks.
     */

    this._validateScene();


    /*
     * If visual systems weren't initialized
     * by the host initialization flow, create
     * them here.
     */

    if (
      !this.themeButton
    ) {

      this._finalizeInitialization();

    }


    return this;

  }


  /* ================================================================
     PUBLIC SETTING: ANIMATION COUNT
     ================================================================ */

  setMobileAnimationCount(
    count
  ) {

    this._setMobileAnimationLimit(
      count
    );


    return this.mobileAnimationLimit;

  }


  /* ================================================================
     PUBLIC SETTING: MUSIC VOLUME
     ================================================================ */

  setMusicVolume(
    volume
  ) {

    const value =
      Math.max(
        0,
        Math.min(
          1,
          Number(
            volume
          )
        )
      );


    if (
      !Number.isFinite(value)
    ) {

      return this.audio.musicVolume;

    }


    this.audio.musicVolume =
      value;


    if (
      this.audio.music
    ) {

      this.audio.music.volume =
        value;

    }


    return value;

  }


  /* ================================================================
     PUBLIC SETTING: TALKING VOLUME
     ================================================================ */

  setTalkingVolume(
    volume
  ) {

    const value =
      Math.max(
        0,
        Math.min(
          1,
          Number(
            volume
          )
        )
      );


    if (
      !Number.isFinite(value)
    ) {

      return this.audio.talkingVolume;

    }


    this.audio.talkingVolume =
      value;


    if (
      this.audio.talking
    ) {

      this.audio.talking.volume =
        value;

    }


    return value;

  }


  /* ================================================================
     PUBLIC AUDIO UNLOCK
     ================================================================ */

  unlockAudio() {

    this._unlockAudio();

  }


  /* ================================================================
     PUBLIC THEME TOGGLE
     ================================================================ */

  toggleTheme() {

    this._toggleTheme();

  }


  /* ================================================================
     PUBLIC THEME GETTER
     ================================================================ */

  getTheme() {

    return this.theme;

  }


  /* ================================================================
     PUBLIC AUDIO GETTER
     ================================================================ */

  getAudioStatus() {

    return this._getAudioStatus();

  }


  /* ================================================================
     PUBLIC DEBUG GETTER
     ================================================================ */

  getStatus() {

    return this.getDebugInfo();

  }


  /* ================================================================
     PUBLIC RESIZE
     ================================================================ */

  resize() {

    this._onWindowResize();

  }


  /* ================================================================
     PUBLIC PAUSE
     ================================================================ */

  pause() {

    if (
      this.isMobileOrTablet
    ) {

      this._pauseMobileAnimations();

    }


    this._pauseAudio();

  }


  /* ================================================================
     PUBLIC RESUME
     ================================================================ */

  resume() {

    if (
      this.isMobileOrTablet &&
      !this.isShaking &&
      !this.isRecovering
    ) {

      this._resumeMobileAnimations();

    }


    this._resumeMusic();

  }


  /* ================================================================
     PUBLIC RESET
     ================================================================ */

  reset() {

    this._resetAllEmojis();

  }


  /* ================================================================
     PUBLIC DESTROY
     ================================================================ */

  dispose() {

    this.destroy();

  }

}


/* ==================================================================
   DEFAULT EXPORT
   ================================================================== */

export default EmojiWorld;
