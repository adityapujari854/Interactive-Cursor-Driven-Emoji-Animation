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
 * ================================================================
 */

import * as PIXI from 'pixi.js';


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
     * Exactly 8 animated WebPs are active at once.
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
     * Only 8 animated WebPs are active at once.
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


      this._setupScene();


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
          ? '📱 Mobile/tablet mode: maximum 8 animated emojis'
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

    this._updateCinematicTheme();
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

    let targetX = this.mouse.x - this.width * 0.5;
    let targetY = this.mouse.y - this.height * 0.5;

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
        idleType: 'sway',
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
        idleType: 'spin',
        mass: 0.9,
        idleSpeed: 0.045,
        idleAmplitude: 2,
        spinSpeed: 0.010
      },

      {
        index: 7,
        name: 'Smirk',
        idleType: 'sway',
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
        idleType: 'twitch',
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
        idleType: 'sway',
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
     CREATE 24 EMOJI ELEMENTS
     ================================================================ */

  _createEmojis() {

    console.log(
      '[Emoji World] Creating 24 native WebP emojis...'
    );

    this.nextSoundAt =
      performance.now() +
      3000 +
      Math.random() * 5000,


    /*
     * Remove old DOM elements.
     */

    this.emojis.forEach(
      emoji => {

        if (
          emoji.element &&
          emoji.element.parentNode
        ) {

          emoji.element.parentNode.removeChild(
            emoji.element
          );

        }

      }
    );


    this.emojis =
      [];


    const layout =
      this._getGridLayout();


    const {
      cols,
      spacing,
      startX,
      startY,
      emojiSize
    } =
      layout;


    for (
      let i = 0;
      i < 24;
      i++
    ) {

      const col =
        i % cols;


      const row =
        Math.floor(
          i / cols
        );


      const x =
        startX +
        col * spacing;


      const y =
        startY +
        row * spacing;


      const element =
        document.createElement(
          'img'
        );


      const src =
        `/assets/emojis/512 (${i + 1}).webp`;


      element.className =
        'emoji-webp';


      element.alt =
        '';


      element.draggable =
        false;


      element.decoding =
        'async';


      element.setAttribute(
        'aria-hidden',
        'true'
      );


      element.style.position =
        'absolute';


      element.style.left =
        `${x}px`;


      element.style.top =
        `${y}px`;


      element.style.width =
        `${emojiSize}px`;


      element.style.height =
        `${emojiSize}px`;


      element.style.transform =
        'translate(-50%, -50%)';


      element.style.objectFit =
        'contain';


      element.style.pointerEvents =
        'none';


      element.style.userSelect =
        'none';


      element.style.webkitUserDrag =
        'none';


      /*
       * will-change is intentionally not applied to all 24 images.
       * It is enabled only for currently active mobile animations.
       */

      /*
       * Store the real animated WebP.
       */

      element.dataset.src =
        src;


      /*
       * IMPORTANT MOBILE CHANGE:
       *
       * Do NOT leave mobile emojis hidden.
       *
       * Every emoji is visible immediately.
       *
       * Only the src of the currently active
       * 5 emojis will be changed to the animated
       * WebP by the scheduler.
       *
       * Inactive emojis use their static frame.
       */

      element.style.visibility =
        'visible';

      element.style.opacity =
        '1';


      /*
       * Desktop immediately receives
       * its animated WebP.
       */

      if (
        !this.isMobileOrTablet
      ) {

        element.src =
          src;

      }


      this.emojiLayer.appendChild(
        element
      );


      const emoji = {

        index:
          i,

        element:
          element,

        x:
          x,

        y:
          y,

        originalX:
          x,

        originalY:
          y,

        targetX:
          x,

        targetY:
          y,

        size:
          emojiSize,

        rotation:
          0,

        scale:
          1,

        cursorOffsetX:
          0,

        cursorOffsetY:
          0,

        idleTime:
          Math.random() *
          Math.PI *
          2,

        isFlying:
          false,

        /* Clipboard scanner state. The SAME emoji DOM node is
         * temporarily portaled to <body>; no duplicate is created. */
        scannerState:
          null,

        scannerOriginalParent:
          null,

        scannerOriginalNextSibling:
          null,

        isMobileActive:
          false,

        animationEndsAt:
          0,

        staticReady:
          false,

        staticURL:
          null,

        animatedReady:
          false,

        animatedPreloadPromise:
          null,

        config:
          this.emojiConfigs[i]

      };


      this.emojis.push(
        emoji
      );

    }


    console.log(
      `[Emoji World] ✓ ${this.emojis.length} emoji elements created`
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

  _setupScene() {

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

    this._createEmojisAndCubes();


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

  _createEmojisAndCubes() {

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

    this._createEmojis();


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
     * SOFT SHADOW
     * ------------------------------------------------------------
     */

    const deepShadow =
      new PIXI.Graphics();


    deepShadow
      .ellipse(
        0,
        size * 0.48,
        size * 0.43,
        size * 0.095
      )
      .fill({

        color:
          0x000000,

        alpha:
          0.11

      });


    deepShadow.y =
      2;


    group.addChild(
      deepShadow
    );


    /*
     * ------------------------------------------------------------
     * CONTACT SHADOW
     * ------------------------------------------------------------
     */

    const contactShadow =
      new PIXI.Graphics();


    contactShadow
      .ellipse(
        0,
        size * 0.42,
        size * 0.31,
        size * 0.055
      )
      .fill({

        color:
          0x000000,

        alpha:
          0.14

      });


    group.addChild(
      contactShadow
    );


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
          0xf7fbff,

        alpha:
          0.70

      })
      .stroke({

        color:
          0xcbdbe8,

        alpha:
          0.76,

        width:
          1.35

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
          0.30

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
          0.66

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
          0.42,

        width:
          0.8

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
     * Cursor-reactive shadow layer.
     */

    const cursorShadow =
      new PIXI.Graphics();

    cursorShadow.eventMode =
      'none';

    group.addChild(
      cursorShadow
    );


    /*
     * Store all visual components so
     * theme/cursor lighting can update
     * them later.
     */

    group.userData = {

      size,

      deepShadow,

      contactShadow,

      glass,

      innerGlass,

      highlight,

      microHighlight,

      edgeLight,

      reflection,

      lowerBevel,

      rimGlow,

      cursorShadow

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





    /*
     * Do not reposition emojis while
     * they are falling or recovering.
     */

    this._repositionEmojisAndCubes();


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



      this._applyEmojiTransform(
        emoji
      );

    }

  }
  /* ================================================================
     FRAME UPDATE
     ================================================================ */

  _updateFrame(
    ticker
  ) {

    try {

      const delta =
        ticker?.deltaTime ||
        1;


      const dtMs =
        Math.min(
          50,
          delta *
          (
            1000 /
            60
          )
        );


      const dt =
        Math.min(
          1.5,
          delta
        );


      /*
       * ------------------------------------------------------------
       * EMOJI UPDATE
       * ------------------------------------------------------------
       */

      for (
        const emoji of this.emojis
      ) {

        if (
          !emoji
        ) {

          continue;

        }


        if (
          emoji.scannerState
        ) {

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

    if (this.isMobileOrTablet) {
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

  }


  /* ================================================================
     UPDATE CURSOR VISUAL THEME
     ================================================================ */

  _updateCursorVisualTheme() {

    if (!this.cursorVisual || !this.cursorVisualIcon) {
      return;
    }

    const dark = this.theme === 'dark';

    this.cursorVisual.classList.toggle('is-night', dark);
    this.cursorVisual.classList.toggle('is-day', !dark);

    /*
     * Use inline SVG instead of Unicode glyphs. This makes the visible
     * sun/moon cursor identical across Chrome, Edge, Android and Windows
     * regardless of the fonts installed on the device.
     */
    this.cursorVisualIcon.innerHTML = dark
      ? `
        <svg class="cursor-moon-svg" viewBox="0 0 64 64" aria-hidden="true">
          <defs>
            <radialGradient id="moonFill" cx="35%" cy="30%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="55%" stop-color="#e7f4ff"/>
              <stop offset="100%" stop-color="#b7d9f7"/>
            </radialGradient>
          </defs>
          <circle cx="31" cy="32" r="20" fill="url(#moonFill)"/>
          <circle cx="41" cy="25" r="20" fill="#111722"/>
          <circle cx="24" cy="24" r="2.2" fill="#c6def2" opacity=".75"/>
          <circle cx="27" cy="39" r="1.5" fill="#c6def2" opacity=".55"/>
        </svg>`
      : `
        <svg class="cursor-sun-svg" viewBox="0 0 64 64" aria-hidden="true">
          <defs>
            <radialGradient id="sunFill" cx="35%" cy="30%">
              <stop offset="0%" stop-color="#fff8b5"/>
              <stop offset="45%" stop-color="#ffd83d"/>
              <stop offset="100%" stop-color="#ff9f1c"/>
            </radialGradient>
          </defs>
          <g fill="#ffb51b">
            <rect x="30" y="2" width="4" height="12" rx="2"/>
            <rect x="30" y="50" width="4" height="12" rx="2"/>
            <rect x="2" y="30" width="12" height="4" rx="2"/>
            <rect x="50" y="30" width="12" height="4" rx="2"/>
            <rect x="9" y="9" width="4" height="12" rx="2" transform="rotate(-45 11 15)"/>
            <rect x="51" y="9" width="4" height="12" rx="2" transform="rotate(45 53 15)"/>
            <rect x="9" y="43" width="4" height="12" rx="2" transform="rotate(45 11 49)"/>
            <rect x="51" y="43" width="4" height="12" rx="2" transform="rotate(-45 53 49)"/>
          </g>
          <circle cx="32" cy="32" r="19" fill="url(#sunFill)"/>
          <circle cx="25" cy="25" r="5" fill="#fff7ae" opacity=".45"/>
        </svg>`;

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

    const x = this.cursorLightX;
    const y = this.cursorLightY;
    const dark = this.theme === 'dark';
    const warm = 0xffb45f;
    const cool = 0xdce8ff;

    this.cursorLight.clear();

    /* Broad illumination used by the scene. */
    this.cursorLight.circle(x, y, dark ? 145 : 115).fill({
      color: dark ? warm : cool,
      alpha: dark ? 0.075 : 0.055
    });

    this.cursorLight.circle(x, y, dark ? 75 : 62).fill({
      color: dark ? warm : 0xffffff,
      alpha: dark ? 0.11 : 0.075
    });

    /* Visible glowing orb. */
    const pulse =
      1 +
      (0.5 + 0.5 * Math.sin(this.visualTime * 2.2)) *
      0.08;

    this.cursorLight.circle(x, y, (dark ? 24 : 21) * pulse).fill({
      color: dark ? warm : 0x64748b,
      alpha: dark ? 0.13 : 0.095
    });

    this.cursorLight.circle(x, y, dark ? 15 : 13).stroke({
      color: dark ? 0xffd7a3 : 0xffffff,
      alpha: dark ? 0.20 : 0.18,
      width: 1.2
    });

    this.cursorLight.circle(x, y, dark ? 8 : 7).fill({
      color: dark ? 0xffd59a : 0x1f2937,
      alpha: 0.96
    });

    this.cursorLight.circle(x, y, dark ? 3.2 : 2.6).fill({
      color: dark ? 0xfffff5 : 0xffffff,
      alpha: 1
    });

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

    if (this.isMobileOrTablet) {
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

    for (const emoji of this.emojis) {

      if (!emoji || !emoji.element) {
        continue;
      }

      const dx = emoji.x - lightX;
      const dy = emoji.y - lightY;
      const distance = Math.hypot(dx, dy);
      const influence = Math.max(0, 1 - distance / (dark ? 520 : 620));
      const inv = distance > 0.001 ? 1 / distance : 0;

      /* Shadow points away from the cursor light. */
      const shadowDistance = 5 + influence * 11;
      const shadowX = dx * inv * shadowDistance;
      const shadowY = 4 + dy * inv * shadowDistance * 0.62;
      const blur = 8 + influence * 8;

      const baseAlpha = dark ? 0.42 : 0.27;
      const directionalAlpha = dark ? 0.34 : 0.26;
      const warmth = dark ? `,0.18` : `,0`;

      emoji.element.style.filter = `
        drop-shadow(0 5px 9px rgba(0,0,0,${baseAlpha}))
        drop-shadow(${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px ${blur.toFixed(1)}px rgba(0,0,0,${directionalAlpha + influence * 0.18}))
        drop-shadow(${(-shadowX * 0.28).toFixed(1)}px ${(-shadowY * 0.18).toFixed(1)}px ${(5 + influence * 7).toFixed(1)}px rgba(${dark ? `255,180,95${warmth}` : '255,255,255,0.12'}))
        brightness(${(1 + influence * (dark ? 0.11 : 0.07)).toFixed(3)})
        saturate(${(1 + influence * 0.09).toFixed(3)})
      `;

    }

    /* Give every glass platform a visible contact shadow in both themes. */
    for (const cubeData of this.cubes) {

      const cube = cubeData?.sprite;
      const data = cube?.userData;

      if (!cube || !data) {
        continue;
      }

      const dx = cube.x - lightX;
      const dy = cube.y - lightY;
      const distance = Math.hypot(dx, dy);
      const influence = Math.max(0, 1 - distance / 650);
      const inv = distance > 0.001 ? 1 / distance : 0;
      const sx = dx * inv * (3 + influence * 8);
      const sy = 2 + dy * inv * (2 + influence * 5);

      if (data.deepShadow) {
        data.deepShadow.alpha = dark ? 0.34 + influence * 0.16 : 0.20 + influence * 0.12;
      }
      if (data.contactShadow) {
        data.contactShadow.alpha = dark ? 0.46 + influence * 0.16 : 0.28 + influence * 0.14;
      }
      if (data.cursorShadow) {
        data.cursorShadow.clear();
        data.cursorShadow.ellipse(0, data.size * 0.43, data.size * 0.39, data.size * 0.075).fill({
          color: dark ? 0x000000 : 0x1b2430,
          alpha: dark ? 0.22 + influence * 0.20 : 0.08 + influence * 0.13
        });
        data.cursorShadow.x = sx;
        data.cursorShadow.y = sy;
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

      shaking: false,

      recovering: false,

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



    this._restoreMobileStaticFrames();


    this._startMobileAnimationScheduler();

  }


  /* ================================================================
     RESET ALL EMOJIS
     ================================================================ */

  _resetAllEmojis() {


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

    if (this.isMobileOrTablet) {
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