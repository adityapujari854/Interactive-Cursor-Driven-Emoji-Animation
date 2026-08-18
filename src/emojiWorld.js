/**
 * ================================================================
 * THE EMOJIS
 * EmojiWorld - PixiJS + Native Animated WebP
 * ================================================================
 *
 * IMPORTANT:
 * The emoji characters are rendered using native HTML <img>
 * elements instead of PIXI.Sprite.
 *
 * Why?
 * Animated WebP is decoded and animated by the browser itself.
 * Pixi texture loading can display the WebP but may capture only
 * the first frame depending on the browser/loader path.
 *
 * PixiJS:
 *   - glass platforms
 *   - title
 *   - scene
 *
 * Native DOM:
 *   - animated WebP emojis
 *
 * Interaction:
 *   - mouse
 *   - touch
 *   - gyroscope tilt
 *   - device shake
 *   - physics falling
 *   - return-to-home animation
 *
 * Mobile optimization:
 *   - Desktop: all 24 WebPs remain animated
 *   - Tablet/Mobile: maximum 5 animated WebPs at once
 *   - Random shuffle-bag selection
 *   - Random animation duration
 *   - Fair rotation through all 24 emojis
 *
 * ================================================================
 */

import * as PIXI from 'pixi.js';
import { Physics } from './physics.js';
import { GyroHandler } from './gyro.js';


export class EmojiWorld {

  constructor(canvasElement, options = {}) {

    this.canvas = canvasElement;
    this.options = options;

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.app = null;
    this.physics = null;
    this.gyro = new GyroHandler();

    this.cubesContainer = null;
    this.titleContainer = null;


    /* ============================================================
       MOBILE / TABLET ANIMATION LAYER
       ============================================================ */

    /*
     * Native animated WebP layer.
     *
     * The WebP files are NOT converted into
     * Pixi AnimatedSprites.
     *
     * The browser handles the actual WebP
     * animation.
     */

    this.emojiLayer = null;


    /* ============================================================
       MOBILE / TABLET ANIMATION SCHEDULER
       ============================================================ */

    /*
     * Desktop:
     *   all 24 WebPs remain animated.
     *
     * Mobile/tablet:
     *   only 5 WebPs are allowed to animate
     *   at the same time.
     */

    this.isMobileOrTablet =
      this._detectMobileOrTablet();


    this.mobileAnimationLimit =
      5;


    /*
     * Currently active animated emojis.
     */

    this.mobileActiveEmojis =
      new Set();


    /*
     * Shuffle bag containing emoji indexes.
     *
     * Every emoji gets a turn before the
     * bag is completely reshuffled.
     */

    this.mobileShuffleBag =
      [];


    /*
     * Scheduler timeout.
     */

    this.mobileSchedulerTimer =
      null;


    /*
     * Generation prevents an old timeout
     * from modifying a new scheduler state.
     */

    this.mobileSchedulerGeneration =
      0;


    /* ============================================================
       EMOJI OBJECTS
       ============================================================ */

    this.emojis = [];
    this.cubes = [];


    this.emojiConfigs =
      this._getEmojiConfigs();


    /* ============================================================
       POINTER
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

    /*
     * Bind once.
     *
     * This is important because the same
     * function reference must be used when
     * adding/removing it from the ticker.
     */

    this._boundUpdateFrame =
      this._updateFrame.bind(this);


    /* ============================================================
       READY PROMISE
       ============================================================ */

    /*
     * main.js waits for:
     *
     *   world.ready
     */

    this.ready =
      this._init();

  }


  /* ================================================================
     DEVICE DETECTION
     ================================================================ */

  _detectMobileOrTablet() {

    /*
     * Do not use only screen width.
     *
     * Tablets can have relatively large
     * CSS widths.
     */

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
        .test(userAgent);


    /*
     * Small/touch screens are treated as
     * mobile/tablet.
     *
     * Desktop laptops with a touch screen
     * are intentionally NOT forced into
     * mobile mode unless their viewport is
     * below 900px.
     */

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
       * Create the native HTML layer before
       * the scene is populated.
       */

      this._createEmojiDOMLayer();


      this._setupScene();


      this._setupEventListeners();


      this._startAnimationLoop();


      /*
       * Start the mobile scheduler ONLY
       * after all 24 emoji elements exist.
       *
       * Desktop does not need it.
       */

      if (
        this.isMobileOrTablet
      ) {

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

      /*
       * Antialiasing is unnecessary for
       * the native WebP emoji layer.
       *
       * This reduces GPU workload.
       */

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


    /* ------------------------------------------------------------
       CANVAS
       ------------------------------------------------------------ */

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


    /*
     * The native WebP elements receive
     * pointer events.
     */

    this.app.canvas.style.pointerEvents =
      'none';


    window.addEventListener(

      'resize',

      this._resizeHandler,

      {
        passive: true
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
      window.devicePixelRatio || 1;


    /*
     * Mobile/tablet:
     *
     * Don't render a huge 3x/4x backing
     * canvas when the Pixi layer only contains
     * relatively simple glass/title graphics.
     */

    if (
      this.isMobileOrTablet
    ) {

      return Math.min(
        dpr,
        1.5
      );

    }


    /*
     * Desktop keeps the current quality.
     */

    return Math.min(
      dpr,
      2
    );

  }


  /* ================================================================
     NATIVE WEBP DOM LAYER
     ================================================================ */

  _createEmojiDOMLayer() {

    /*
     * Reuse an existing layer if main.js/
     * CSS has already created one.
     */

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


    /*
     * Keep the layer above Pixi but below
     * UI elements.
     */

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


    /*
     * Tell the browser that the layer
     * should not cause layout work.
     */

    layer.style.contain =
      'layout style paint';


    console.log(
      '[Emoji World] ✓ Native WebP layer ready'
    );

  }


  /* ================================================================
     GRID LAYOUT CALCULATION
     ================================================================ */

  _getGridLayout() {

    /*
     * Single authoritative grid calculation.
     *
     * Desktop:
     *   6 columns × 4 rows
     *
     * Mobile/tablet:
     *   4 columns × 6 rows
     */

    const isSmallScreen =
      this.isMobileOrTablet ||
      this.width < 700;


    const cols =
      isSmallScreen
        ? 4
        : 6;


    const rows =
      Math.ceil(
        24 / cols
      );


    const sidePadding =
      isSmallScreen
        ? 20
        : 70;


    const top =
      isSmallScreen
        ? 115
        : 135;


    const bottom =
      Math.min(
        this.height - 45,
        this.height * 0.90
      );


    const availableWidth =
      Math.max(
        260,
        this.width -
        sidePadding * 2
      );


    const availableHeight =
      Math.max(
        280,
        bottom - top
      );


    const xSpacing =
      cols > 1
        ? availableWidth /
          (cols - 1)
        : availableWidth;


    const ySpacing =
      rows > 1
        ? availableHeight /
          (rows - 1)
        : availableHeight;


    const spacing =
      Math.min(
        xSpacing,
        ySpacing
      );


    const gridWidth =
      spacing *
      (cols - 1);


    const gridHeight =
      spacing *
      (rows - 1);


    const startX =
      this.width / 2 -
      gridWidth / 2;


    const startY =
      top +
      (
        availableHeight -
        gridHeight
      ) / 2;


    const emojiSize =
      Math.max(

        isSmallScreen
          ? 52
          : 60,

        Math.min(

          isSmallScreen
            ? 82
            : 110,

          spacing * 0.70

        )

      );


    const cubeSize =
      Math.max(

        isSmallScreen
          ? 58
          : 68,

        Math.min(

          isSmallScreen
            ? 84
            : 120,

          spacing *
          0.82

        )

      );


    return {

      cols,

      rows,

      sidePadding,

      top,

      bottom,

      availableWidth,

      availableHeight,

      xSpacing,

      ySpacing,

      spacing,

      gridWidth,

      gridHeight,

      startX,

      startY,

      emojiSize,

      cubeSize

    };

  }


  /* ================================================================
     CREATE 24 EMOJI ELEMENTS
     ================================================================ */

  _createEmojis() {

    console.log(
      '[Emoji World] Creating 24 native WebP emojis...'
    );


    /*
     * Remove old emoji elements if this
     * method is called again after resize.
     */

    this.emojis.forEach(
      (emoji) => {

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


    this.emojis = [];


    /*
     * Get authoritative grid layout.
     */

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


    /*
     * Create all 24 DOM elements.
     */

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


      /*
       * Each emoji uses its original
       * animated WebP asset.
       */

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


      /*
       * Absolute positioning.
       */

      element.style.position =
        'absolute';


      /*
       * Position is controlled exclusively by
       * _applyEmojiTransform().
       *
       * Keeping left/top at 0 prevents the
       * x/y coordinates from being applied
       * twice (once by left/top and again by
       * translate3d).
       */

      element.style.left =
        '0px';


      element.style.top =
        '0px';


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


      /*
       * Avoid browser selection/dragging.
       */

      element.style.userSelect =
        'none';


      element.style.webkitUserDrag =
        'none';


      /*
       * Prevent the browser from treating
       * the emoji as a normal content image.
       */

      element.style.willChange =
        'transform';


      /*
       * Store the source without immediately
       * forcing all 24 animated WebPs to load.
       */

      element.dataset.src =
        src;


      /*
       * IMPORTANT:
       *
       * Desktop immediately receives its
       * animated WebP.
       *
       * Mobile/tablet starts with only the
       * scheduler-selected emojis.
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


      /*
       * Emoji object.
       */

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

        isMobileActive:
          false,

        animationEndsAt:
          0,

        staticReady:
          false,

        staticURL:
          null,

        physicsBody:
          null,

        config:
          this.emojiConfigs[i]

      };


      /*
       * Create physics body.
       */

      if (
        this.physics
      ) {

        emoji.physicsBody =
          this.physics.createBody({

            x:
              x,

            y:
              y,

            mass:
              emoji.config.mass,

            radius:
              emojiSize * 0.40,

            isActive:
              false

          });

      }


      this.emojis.push(
        emoji
      );


      /*
       * Apply the real position immediately.
       * The ticker will continue updating it.
       */

      this._applyEmojiTransform(
        emoji
      );

    }


    console.log(
      `[Emoji World] ✓ ${this.emojis.length} emoji elements created`
    );

  }
  /* ================================================================
     MOBILE ANIMATION SCHEDULER
     ================================================================ */

  _startMobileAnimationScheduler() {

    /*
     * Safety:
     *
     * Never create the scheduler on
     * desktop.
     */

    if (
      !this.isMobileOrTablet
    ) {

      return;

    }


    /*
     * Prevent duplicate schedulers.
     */

    this._stopMobileAnimationScheduler();


    this.mobileSchedulerGeneration++;


    const generation =
      this.mobileSchedulerGeneration;


    /*
     * Create a fresh shuffle bag.
     */

    this._refillMobileShuffleBag();


    /*
     * Fill all five slots.
     */

    for (
      let i = 0;
      i < this.mobileAnimationLimit;
      i++
    ) {

      this._activateRandomMobileEmoji();

    }


    /*
     * Start the scheduler.
     */

    this._scheduleMobileAnimationCheck(
      generation
    );


    console.log(
      '📱 Mobile animation scheduler started — max 5 active'
    );

  }


  /* ================================================================
     STOP MOBILE SCHEDULER
     ================================================================ */

  _stopMobileAnimationScheduler() {

    if (
      this.mobileSchedulerTimer
    ) {

      clearTimeout(
        this.mobileSchedulerTimer
      );


      this.mobileSchedulerTimer =
        null;

    }


    this.mobileSchedulerGeneration++;

  }


  /* ================================================================
     SHUFFLE BAG
     ================================================================ */

  _refillMobileShuffleBag() {

    /*
     * Create indexes:
     *
     * 0 ... 23
     */

    const bag =
      [];


    for (
      let i = 0;
      i < this.emojis.length;
      i++
    ) {

      bag.push(
        i
      );

    }


    /*
     * Fisher-Yates shuffle.
     *
     * This gives us a proper random
     * sequence instead of repeatedly
     * selecting random emojis.
     */

    for (
      let i = bag.length - 1;
      i > 0;
      i--
    ) {

      const randomIndex =
        Math.floor(
          Math.random() *
          (i + 1)
        );


      const temp =
        bag[i];


      bag[i] =
        bag[randomIndex];


      bag[randomIndex] =
        temp;

    }


    this.mobileShuffleBag =
      bag;

  }


  /* ================================================================
     GET NEXT RANDOM EMOJI
     ================================================================ */

  _getNextMobileEmoji() {

    /*
     * Refill when the current randomized
     * sequence has been completely consumed.
     */

    if (
      this.mobileShuffleBag.length === 0
    ) {

      this._refillMobileShuffleBag();

    }


    /*
     * Find an inactive emoji in the bag.
     *
     * This prevents replacing an active emoji
     * with itself.
     */

    for (
      let i =
        this.mobileShuffleBag.length - 1;

      i >= 0;

      i--
    ) {

      const index =
        this.mobileShuffleBag[i];


      const emoji =
        this.emojis[index];


      if (
        emoji &&
        !emoji.isMobileActive
      ) {

        this.mobileShuffleBag.splice(
          i,
          1
        );


        return emoji;

      }

    }


    /*
     * If all bag entries happen to be active,
     * search all 24 emojis.
     */

    const available =
      this.emojis.filter(
        emoji =>
          !emoji.isMobileActive
      );


    if (
      available.length === 0
    ) {

      return null;

    }


    const randomIndex =
      Math.floor(
        Math.random() *
        available.length
      );


    return available[
      randomIndex
    ];

  }


  /* ================================================================
     ACTIVATE RANDOM MOBILE EMOJI
     ================================================================ */

  _activateRandomMobileEmoji() {

    /*
     * Never exceed five.
     */

    if (
      this.mobileActiveEmojis.size >=
      this.mobileAnimationLimit
    ) {

      return;

    }


    const emoji =
      this._getNextMobileEmoji();


    if (!emoji) {

      return;

    }


    this._activateMobileEmoji(
      emoji
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


    /*
     * If already active, do nothing.
     */

    if (
      emoji.isMobileActive
    ) {

      return;

    }


    const element =
      emoji.element;


    const src =
      element.dataset.src;


    if (!src) {

      return;

    }


    /*
     * Mark active BEFORE assigning src.
     *
     * This prevents duplicate activation
     * if the browser fires events immediately.
     */

    emoji.isMobileActive =
      true;


    this.mobileActiveEmojis.add(
      emoji
    );


    /*
     * Random animation duration.
     *
     * The actual WebP animation remains
     * completely unchanged.
     *
     * We are only controlling how long
     * that particular emoji is allowed
     * to remain active.
     */

    const duration =
      this._getRandomAnimationDuration();


    emoji.animationEndsAt =
      performance.now() +
      duration;


    /*
     * Start/restart the animated WebP.
     *
     * Adding the URL starts the browser's
     * native WebP animation.
     */

    element.src =
      src;


    /*
     * Ensure it is visible.
     */

    element.style.visibility =
      'visible';


    element.style.opacity =
      '1';


    /*
     * Restart animation cleanly.
     *
     * Setting src again after removing it
     * causes the browser to begin from the
     * beginning of the WebP animation.
     */

    try {

      element.currentTime =
        0;

    } catch {

      /*
       * HTMLImageElement does not expose
       * currentTime. This is intentionally
       * ignored.
       */

    }

  }


  /* ================================================================
     RANDOM ANIMATION DURATION
     ================================================================ */

  _getRandomAnimationDuration() {

    /*
     * Random duration:
     *
     * 2.5s → 5.5s
     *
     * This keeps the scene organic.
     */

    const minimum =
      2500;


    const maximum =
      5500;


    return (
      minimum +
      Math.random() *
      (
        maximum -
        minimum
      )
    );

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
     * Remove from active set first.
     */

    emoji.isMobileActive =
      false;


    this.mobileActiveEmojis.delete(
      emoji
    );


    emoji.animationEndsAt =
      0;


    /*
     * IMPORTANT:
     *
     * Removing the src stops the browser
     * from maintaining an animated WebP
     * stream for this emoji.
     */

    element.removeAttribute(
      'src'
    );


    /*
     * Do NOT hide the emoji permanently.
     *
     * We keep its position/platform.
     *
     * If a static preview has already been
     * generated, use it.
     */

    if (
      emoji.staticURL
    ) {

      element.src =
        emoji.staticURL;


      element.style.visibility =
        'visible';

    } else {

      /*
       * Until its first animation has
       * produced a static frame, leave
       * the element transparent.
       *
       * The scheduler will activate it
       * later and start its real WebP.
       */

      element.style.visibility =
        'hidden';

    }


    element.style.opacity =
      '1';

  }


  /* ================================================================
     CREATE STATIC FRAME
     ================================================================ */

  _captureStaticFrame(
    emoji
  ) {

    /*
     * This creates a lightweight still
     * image from the currently displayed
     * WebP frame.
     *
     * It is called only when an emoji
     * finishes its first active cycle.
     */

    if (
      !emoji ||
      !emoji.element ||
      emoji.staticURL
    ) {

      return;

    }


    const element =
      emoji.element;


    if (
      !element.complete ||
      element.naturalWidth <= 0
    ) {

      return;

    }


    try {

      const canvas =
        document.createElement(
          'canvas'
        );


      const width =
        element.naturalWidth;


      const height =
        element.naturalHeight;


      /*
       * Avoid creating unnecessarily
       * large static textures.
       */

      const maxSize =
        256;


      const scale =
        Math.min(

          1,

          maxSize /
          Math.max(
            width,
            height
          )

        );


      canvas.width =
        Math.max(
          1,
          Math.round(
            width * scale
          )
        );


      canvas.height =
        Math.max(
          1,
          Math.round(
            height * scale
          )
        );


      const context =
        canvas.getContext(
          '2d'
        );


      if (!context) {

        return;

      }


      context.drawImage(

        element,

        0,

        0,

        canvas.width,

        canvas.height

      );


      /*
       * WebP static preview.
       */

      emoji.staticURL =
        canvas.toDataURL(
          'image/webp',
          0.82
        );


      emoji.staticReady =
        true;


    } catch (error) {

      /*
       * Static frame creation is only
       * an optimization. Never let it
       * break the animation.
       */

      console.warn(
        '[Emoji World] Static frame capture skipped:',
        error
      );

    }

  }


  /* ================================================================
     MOBILE SCHEDULER CHECK
     ================================================================ */

  _scheduleMobileAnimationCheck(
    generation
  ) {

    if (
      !this.isMobileOrTablet
    ) {

      return;

    }


    if (
      generation !==
      this.mobileSchedulerGeneration
    ) {

      return;

    }


    /*
     * Check frequently enough to replace
     * completed emojis without creating
     * a constant interval loop.
     */

    this.mobileSchedulerTimer =
      setTimeout(

        () => {

          this._updateMobileAnimationScheduler(
            generation
          );

        },

        250

      );

  }


  /* ================================================================
     UPDATE MOBILE SCHEDULER
     ================================================================ */

  _updateMobileAnimationScheduler(
    generation
  ) {

    if (
      generation !==
      this.mobileSchedulerGeneration
    ) {

      return;

    }


    /*
     * Do not modify animation slots
     * while the shake/physics sequence
     * is running.
     */

    if (
      this.isShaking ||
      this.isRecovering
    ) {

      this._scheduleMobileAnimationCheck(
        generation
      );

      return;

    }


    const now =
      performance.now();


    /*
     * Find expired active emojis.
     */

    const expired =
      [];


    this.mobileActiveEmojis.forEach(
      (emoji) => {

        if (
          emoji.animationEndsAt <=
          now
        ) {

          expired.push(
            emoji
          );

        }

      }
    );


    /*
     * Deactivate expired emojis.
     */

    for (
      const emoji of expired
    ) {

      /*
       * Capture a still frame before
       * stopping the animated WebP.
       */

      this._captureStaticFrame(
        emoji
      );


      this._deactivateMobileEmoji(
        emoji
      );

    }


    /*
     * Fill empty animation slots.
     */

    while (
      this.mobileActiveEmojis.size <
        this.mobileAnimationLimit
    ) {

      const before =
        this.mobileActiveEmojis.size;


      this._activateRandomMobileEmoji();


      /*
       * Safety against an unexpected
       * infinite loop.
       */

      if (
        this.mobileActiveEmojis.size ===
        before
      ) {

        break;

      }

    }


    /*
     * Continue scheduling.
     */

    this._scheduleMobileAnimationCheck(
      generation
    );

  }


  /* ================================================================
     SCENE SETUP
     ================================================================ */

  _setupScene() {

    /*
     * Glass/platform layer.
     */

    this.cubesContainer =
      new PIXI.Container();


    this.cubesContainer.sortableChildren =
      true;


    this.app.stage.addChild(
      this.cubesContainer
    );


    /*
     * Title layer.
     */

    this.titleContainer =
      new PIXI.Container();


    this.app.stage.addChild(
      this.titleContainer
    );


    /*
     * Physics world.
     */

    this.physics =
      new Physics({

        width:
          this.width,

        height:
          this.height,

        groundLevel:
          this.height * 0.90,

        gravity:
          0.62,

        friction:
          0.985,

        bounce:
          0.55

      });


    /*
     * Title.
     */

    this._createTitle();


    /*
     * Glass platforms + emoji elements.
     */

    this._createEmojisAndCubes();


    console.log(
      `[Emoji World] ✓ Scene created with ${this.emojis.length} emojis`
    );

  }


  /* ================================================================
     TITLE
     ================================================================ */

  _createTitle() {

    const title =
      new PIXI.Text({

        text:
          'The Emojis',

        style: {

          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

          fontSize:
            this._getTitleSize(),

          fontWeight:
            '700',

          fill:
            0x111111,

          align:
            'center',

          letterSpacing:
            1

        }

      });


    title.anchor.set(
      0.5
    );


    title.x =
      this.width / 2;


    title.y =
      this._getTitleY();


    title.alpha =
      0.98;


    title.zIndex =
      100;


    this.titleContainer.addChild(
      title
    );


    this.title =
      title;

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


    return Math.max(

      38,

      Math.min(

        58,

        this.width *
        0.045

      )

    );

  }


  /* ================================================================
     TITLE POSITION
     ================================================================ */

  _getTitleY() {

    return Math.max(

      48,

      Math.min(

        75,

        this.height *
        0.085

      )

    );

  }


  /* ================================================================
     CREATE EMOJIS + GLASS PLATFORMS
     ================================================================ */

  _createEmojisAndCubes() {

    /*
     * Clear previous platform objects.
     */

    this.cubes =
      [];


    /*
     * The actual animated emoji DOM
     * elements are created by _createEmojis().
     */

    this._createEmojis();


    /*
     * Get authoritative grid layout.
     */

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


    /*
     * Update every emoji's position.
     *
     * The native WebP element remains
     * responsible for its animation.
     */

    for (
      let i = 0;
      i < this.emojis.length;
      i++
    ) {

      const emoji =
        this.emojis[i];


      if (!emoji) {

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
        col * spacing;


      const y =
        startY +
        row * spacing;


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


      /*
       * Update native WebP element.
       */

      if (
        emoji.element
      ) {

        /*
         * Position is transform-only.
         * Do not write x/y into left/top because
         * _applyEmojiTransform() already applies
         * the position with translate3d().
         */

        emoji.element.style.left =
          '0px';


        emoji.element.style.top =
          '0px';


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
          y

      });


      /*
       * Keep physics body synchronized
       * with the home position.
       */

      if (
        emoji.physicsBody
      ) {

        emoji.physicsBody.x =
          x;


        emoji.physicsBody.y =
          y;

      }

    }


    /*
     * Put platforms behind emojis.
     */

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
     * Soft shadow.
     */

    const shadow =
      new PIXI.Graphics();


    shadow
      .ellipse(

        0,

        size *
        0.42,

        size *
        0.40,

        size *
        0.075

      )
      .fill({

        color:
          0x000000,

        alpha:
          0.12

      });


    /*
     * Glass body.
     */

    const glass =
      new PIXI.Graphics();


    glass
      .roundRect(

        -size / 2,

        -size * 0.15,

        size,

        size * 0.34,

        14

      )
      .fill({

        color:
          0xf7fbff,

        alpha:
          0.72

      })
      .stroke({

        color:
          0xcbdbe8,

        alpha:
          0.75,

        width:
          1.5

      });


    /*
     * Glass highlight.
     */

    const highlight =
      new PIXI.Graphics();


    highlight
      .roundRect(

        -size *
        0.38,

        -size *
        0.08,

        size *
        0.50,

        size *
        0.07,

        8

      )
      .fill({

        color:
          0xffffff,

        alpha:
          0.68

      });


    group.addChild(
      shadow
    );


    group.addChild(
      glass
    );


    group.addChild(
      highlight
    );


    group.position.set(
      x,
      y
    );


    group.alpha =
      0.95;


    return group;

  }


  /* ================================================================
     EVENT LISTENERS
     ================================================================ */

  _setupEventListeners() {

    /*
     * Mouse movement.
     */

    window.addEventListener(

      'mousemove',

      (event) => {

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
     * Touch start.
     */

    window.addEventListener(

      'touchstart',

      (event) => {

        this.touchActive =
          true;


        const touch =
          event.touches[0];


        if (touch) {

          this.mouse.x =
            touch.clientX;


          this.mouse.y =
            touch.clientY;

        }


        /*
         * Request sensor permission only
         * after a user gesture.
         */

        this._requestGyroPermissionOnce();

      },

      {
        passive:
          true
      }

    );


    /*
     * Touch movement.
     */

    window.addEventListener(

      'touchmove',

      (event) => {

        const touch =
          event.touches[0];


        if (touch) {

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
     * Touch end.
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


    /*
     * Desktop click can also request
     * motion permission on supported
     * browsers.
     */

    window.addEventListener(

      'click',

      () => {

        this._requestGyroPermissionOnce();

      },

      {
        passive:
          true
      }

    );


    /*
     * Device orientation.
     */

    window.addEventListener(

      'deviceorientation',

      () => {

        this._applyGyroInteraction();

      },

      {
        passive:
          true
      }

    );


    /*
     * Device motion / shake.
     */

    window.addEventListener(

      'devicemotion',

      () => {

        if (
          this.gyro &&
          this.gyro.pollShake()
        ) {

          this._onShakeDetected();

        }

      },

      {
        passive:
          true
      }

    );

  }


  /* ================================================================
     GYROSCOPE PERMISSION
     ================================================================ */

  async _requestGyroPermissionOnce() {

    if (
      this._permissionRequested
    ) {

      return;

    }


    this._permissionRequested =
      true;


    try {

      if (
        this.gyro &&
        typeof this.gyro.requestPermission ===
          'function'
      ) {

        await this.gyro.requestPermission();

      }


      console.log(
        '📱 Motion sensors enabled'
      );


    } catch (error) {

      console.warn(
        '[Emoji World] Motion permission unavailable:',
        error
      );

    }

  }


  /* ================================================================
     GYROSCOPE TILT
     ================================================================ */

  _applyGyroInteraction() {

    /*
     * Do not apply tilt while the emojis
     * are in the shake/fall/recovery movie.
     */

    if (
      this.isShaking ||
      this.isRecovering
    ) {

      return;

    }


    if (
      !this.gyro ||
      typeof this.gyro.getTilt !==
        'function'
    ) {

      return;

    }


    const tilt =
      this.gyro.getTilt();


    if (!tilt) {

      return;

    }


    /*
     * Very small movement.
     *
     * The gyro should make the scene
     * feel physical, not move emojis
     * around the screen.
     */

    const tiltX =
      Math.max(

        -10,

        Math.min(

          10,

          tilt.x * 10

        )

      );


    const tiltY =
      Math.max(

        -6,

        Math.min(

          6,

          tilt.y * 6

        )

      );


    this.emojis.forEach(
      (emoji) => {

        if (
          !emoji ||
          emoji.isFlying
        ) {

          return;

        }


        emoji.targetX =
          emoji.originalX +
          tiltX;


        emoji.targetY =
          emoji.originalY +
          tiltY;

      }
    );

  }
  /* ================================================================
     SHAKE DETECTED
     ================================================================ */

  _onShakeDetected() {

    /*
     * Ignore additional shakes while
     * the current movie is running.
     */

    if (
      this.isShaking ||
      this.isRecovering
    ) {

      return;

    }


    console.log(
      '📱💥 SHAKE DETECTED!'
    );


    /*
     * Pause mobile random animation
     * selection while the shake sequence
     * is running.
     */

    if (
      this.isMobileOrTablet
    ) {

      this._stopMobileAnimationScheduler();

    }


    this.isShaking =
      true;


    this.isRecovering =
      false;


    /*
     * Keep the falling sequence long
     * enough to be visually noticeable.
     */

    this.shakeRecoveryTime =
      2200;


    /*
     * Every emoji participates in the
     * shake movie regardless of the
     * normal 5-animation mobile limit.
     */

    for (
      const emoji of this.emojis
    ) {

      if (!emoji) {

        continue;

      }


      emoji.isFlying =
        true;


      /*
       * Keep currently displayed WebP visible.
       */

      if (
        emoji.element
      ) {

        emoji.element.style.visibility =
          'visible';

      }


      const body =
        emoji.physicsBody;


      if (!body) {

        continue;

      }


      body.isActive =
        true;


      body.isResting =
        false;


      body.restTimer =
        0;


      body.x =
        emoji.x;


      body.y =
        emoji.y;


      body.rotation =
        emoji.rotation;


      /*
       * Controlled horizontal movement.
       */

      body.vx =
        (
          Math.random() -
          0.5
        ) * 5;


      /*
       * Small initial upward impulse
       * followed by gravity.
       */

      body.vy =
        -6 -
        Math.random() * 3;


      body.angularVelocity =
        (
          Math.random() -
          0.5
        ) * 0.35;

    }

  }


  /* ================================================================
     START RETURN-TO-HOME ANIMATION
     ================================================================ */

  _returnEmojis() {

    if (
      this.isRecovering
    ) {

      return;

    }


    console.log(
      '✨ Emojis returning to their glass cubes...'
    );


    this.isShaking =
      false;


    this.isRecovering =
      true;


    /*
     * Capture current physics positions.
     */

    this.emojis.forEach(
      (emoji, index) => {

        if (!emoji) {

          return;

        }


        const body =
          emoji.physicsBody;


        emoji.isFlying =
          true;


        emoji.flyProgress =
          0;


        /*
         * Slightly staggered return.
         */

        emoji.recoveryDelay =
          index * 25;


        if (body) {

          emoji.returnStartX =
            body.x;


          emoji.returnStartY =
            body.y;


          emoji.returnStartRotation =
            body.rotation;


          /*
           * Stop physics.
           */

          body.isActive =
            false;


          body.vx =
            0;


          body.vy =
            0;


          body.angularVelocity =
            0;

        } else {

          emoji.returnStartX =
            emoji.x;


          emoji.returnStartY =
            emoji.y;


          emoji.returnStartRotation =
            emoji.rotation;

        }

      }
    );

  }


  /* ================================================================
     START ANIMATION LOOP
     ================================================================ */

  _startAnimationLoop() {

    if (
      !this.app ||
      !this.app.ticker
    ) {

      throw new Error(
        'PixiJS ticker is not available.'
      );

    }


    /*
     * Pixi's ticker is the only world
     * update loop.
     */

    this.app.ticker.add(
      this._boundUpdateFrame
    );


    console.log(
      '🎞️ Animation loop started'
    );

  }


  /* ================================================================
     MAIN FRAME UPDATE
     ================================================================ */

  _updateFrame(
    ticker
  ) {

    try {

      const dtMs =
        Math.min(
          ticker.deltaMS ||
          16.67,
          50
        );


      const dt =
        Math.min(

          Math.max(
            dtMs / 16.67,
            0.1
          ),

          2

        );


      /* ------------------------------------------------------------
         SHAKE TIMER
         ------------------------------------------------------------ */

      if (
        this.isShaking
      ) {

        this.shakeRecoveryTime -=
          dtMs;


        if (
          this.shakeRecoveryTime <= 0
        ) {

          this._returnEmojis();

        }

      }


      /* ------------------------------------------------------------
         PHYSICS
         ------------------------------------------------------------ */

      if (
        this.physics
      ) {

        this.physics.update(
          dtMs
        );

      }


      /* ------------------------------------------------------------
         EMOJI POSITIONS
         ------------------------------------------------------------ */

      for (
        const emoji of this.emojis
      ) {

        if (!emoji) {

          continue;

        }


        try {

          if (
            emoji.isFlying
          ) {

            if (
              this.isRecovering
            ) {

              this._updateFlyingBackAnimation(
                emoji,
                dtMs
              );

            } else {

              this._updateFallingAnimation(
                emoji
              );

            }

          } else {

            this._updateIdleAnimation(
              emoji,
              dt
            );

          }

        } catch (error) {

          console.error(
            '[Emoji World] Emoji frame error:',
            error
          );

        }

      }

    } catch (error) {

      console.error(
        '[Emoji World] Frame update error:',
        error
      );

    }

  }


  /* ================================================================
     IDLE MOVEMENT
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
      config.idleAmplitude;


    let idleX =
      baseX;


    let idleY =
      baseY;


    let rotation =
      0;


    let scale =
      1;


    /* ------------------------------------------------------------
       INDIVIDUAL PERSONALITIES
       ------------------------------------------------------------ */

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
          config.scaleAmount;

        idleY =
          baseY +
          Math.sin(
            t * 0.8
          ) * 2;

        break;


      case 'sway':

        idleY =
          baseY +
          Math.sin(t) *
          amplitude;

        rotation =
          Math.sin(
            t * 0.7
          ) * 0.10;

        break;


      case 'tilt':

        rotation =
          Math.sin(t) *
          0.12;

        idleY =
          baseY +
          Math.sin(
            t * 1.2
          ) *
          amplitude *
          0.45;

        break;


      case 'spin':

        rotation =
          t *
          config.spinSpeed *
          2;

        idleY =
          baseY +
          Math.sin(
            t * 0.7
          ) * 2;

        break;


      case 'bob':

        idleY =
          baseY +
          Math.sin(
            t * 1.4
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
            t * 0.7
          ) *
          amplitude *
          0.45;

        break;


      case 'vibrate':

        idleX =
          baseX +
          Math.sin(
            t * 5
          ) *
          amplitude *
          0.55;

        idleY =
          baseY +
          Math.cos(
            t * 4
          ) *
          amplitude *
          0.25;

        break;


      case 'tremble':

        idleX =
          baseX +
          Math.sin(
            t * 8
          ) *
          amplitude *
          0.45;

        rotation =
          Math.sin(
            t * 7
          ) *
          0.035;

        break;


      case 'float':

        idleX =
          baseX +
          Math.cos(
            t * 0.65
          ) *
          amplitude *
          0.35;

        idleY =
          baseY +
          Math.sin(
            t * 0.9
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
            t * 0.6
          ) *
          0.09;

        break;


      case 'twitch':

        idleY =
          baseY +
          Math.sin(
            t * 1.8
          ) *
          amplitude *
          0.30;

        rotation =
          Math.sin(
            t * 3.2
          ) *
          0.025;

        break;


      case 'shake':

        idleX =
          baseX +
          Math.sin(
            t * 3.5
          ) *
          amplitude *
          0.60;

        idleY =
          baseY +
          Math.cos(
            t * 3.5
          ) *
          amplitude *
          0.25;

        break;


      case 'playful':

        rotation =
          Math.sin(
            t * 1.5
          ) *
          0.14;

        idleY =
          baseY +
          Math.sin(
            t * 2
          ) *
          amplitude *
          0.65;

        break;


      case 'shiver':

        idleX =
          baseX +
          Math.sin(
            t * 8
          ) *
          amplitude *
          0.45;

        idleY =
          baseY +
          Math.cos(
            t * 7
          ) *
          amplitude *
          0.25;

        break;


      default:

        break;

    }


    /* ------------------------------------------------------------
       GYROSCOPE OFFSET
       ------------------------------------------------------------ */

    if (
      !this.isShaking &&
      !this.isRecovering
    ) {

      idleX +=
        (
          emoji.targetX -
          emoji.originalX
        ) *
        0.35;


      idleY +=
        (
          emoji.targetY -
          emoji.originalY
        ) *
        0.35;

    }


    emoji.x =
      idleX;


    emoji.y =
      idleY;


    emoji.rotation =
      rotation;


    emoji.scale =
      scale;


    /*
     * Update native WebP.
     */

    this._applyEmojiTransform(
      emoji
    );


    /*
     * Cursor/touch interaction.
     */

    this._addMouseProximityEffect(
      emoji
    );

  }


  /* ================================================================
     APPLY NATIVE WEBP TRANSFORM
     ================================================================ */

  _applyEmojiTransform(
    emoji
  ) {

    if (
      !emoji ||
      !emoji.element
    ) {

      return;

    }


    const element =
      emoji.element;


    const x =
      emoji.x;


    const y =
      emoji.y;


    const rotation =
      emoji.rotation;


    const scale =
      emoji.scale ||
      1;


    /*
     * Transform-only movement.
     *
     * This avoids continuously changing
     * left/top and forcing layout.
     */

    element.style.transform =
      `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${rotation}rad) scale(${scale})`;

  }


  /* ================================================================
     CURSOR PROXIMITY
     ================================================================ */

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
     * Do not calculate cursor interaction
     * while an idle mobile device has no
     * active touch.
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
        0.15;


      emoji.cursorOffsetY +=
        (
          0 -
          emoji.cursorOffsetY
        ) *
        0.15;


      emoji.x +=
        emoji.cursorOffsetX;


      emoji.y +=
        emoji.cursorOffsetY;


      this._applyEmojiTransform(
        emoji
      );


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


    /*
     * Small interaction range.
     */

    const range =
      window.innerWidth < 700
        ? 95
        : 145;


    let targetX =
      0;


    let targetY =
      0;


    if (
      distance > 0 &&
      distance < range
    ) {

      const proximity =
        1 -
        distance / range;


      /*
       * Maximum displacement = 6px.
       */

      const push =
        Math.min(

          proximity *
          proximity *
          6,

          6

        );


      targetX =
        -(
          dx /
          distance
        ) *
        push;


      targetY =
        -(
          dy /
          distance
        ) *
        push;

    }


    /*
     * Smooth movement.
     */

    emoji.cursorOffsetX +=
      (
        targetX -
        emoji.cursorOffsetX
      ) *
      0.18;


    emoji.cursorOffsetY +=
      (
        targetY -
        emoji.cursorOffsetY
      ) *
      0.18;


    /*
     * Hard safety limit.
     */

    emoji.cursorOffsetX =
      Math.max(

        -6,

        Math.min(
          6,
          emoji.cursorOffsetX
        )

      );


    emoji.cursorOffsetY =
      Math.max(

        -6,

        Math.min(
          6,
          emoji.cursorOffsetY
        )

      );


    emoji.x +=
      emoji.cursorOffsetX;


    emoji.y +=
      emoji.cursorOffsetY;


    this._applyEmojiTransform(
      emoji
    );

  }


  /* ================================================================
     FALLING PHYSICS
     ================================================================ */

  _updateFallingAnimation(
    emoji
  ) {

    if (
      !emoji
    ) {

      return;

    }


    const body =
      emoji.physicsBody;


    if (
      !body
    ) {

      return;

    }


    /*
     * Physics controls the emoji while
     * the shake sequence is active.
     */

    emoji.x =
      body.x;


    emoji.y =
      body.y;


    emoji.rotation =
      body.rotation;


    /*
     * Keep emoji inside visible area.
     */

    const margin =
      emoji.size *
      0.45;


    if (
      emoji.x <
      margin
    ) {

      emoji.x =
        margin;


      body.x =
        margin;


      body.vx *=
        -0.35;

    }


    if (
      emoji.x >
      this.width -
      margin
    ) {

      emoji.x =
        this.width -
        margin;


      body.x =
        emoji.x;


      body.vx *=
        -0.35;

    }


    this._applyEmojiTransform(
      emoji
    );

  }


  /* ================================================================
     FLY BACK TO GLASS PLATFORM
     ================================================================ */

  _updateFlyingBackAnimation(
    emoji,
    dtMs
  ) {

    if (
      !emoji
    ) {

      return;

    }


    /*
     * Staggered return.
     */

    if (
      emoji.recoveryDelay > 0
    ) {

      emoji.recoveryDelay -=
        dtMs;


      return;

    }


    /*
     * Approximately one second flight.
     */

    emoji.flyProgress =
      Math.min(

        1,

        emoji.flyProgress +
        dtMs /
        1000

      );


    const progress =
      emoji.flyProgress;


    const eased =
      this._easeOutCubic(
        progress
      );


    const startX =
      emoji.returnStartX;


    const startY =
      emoji.returnStartY;


    const targetX =
      emoji.originalX;


    const targetY =
      emoji.originalY;


    /*
     * Curved flight path.
     */

    const arc =
      Math.sin(
        progress *
        Math.PI
      ) *
      40;


    emoji.x =
      startX +
      (
        targetX -
        startX
      ) *
      eased;


    emoji.y =
      startY +
      (
        targetY -
        startY
      ) *
      eased -
      arc;


    emoji.rotation =
      emoji.returnStartRotation *
      (
        1 -
        eased
      );


    const scale =
      1 +
      Math.sin(
        progress *
        Math.PI
      ) *
      0.08;


    emoji.scale =
      scale;


    this._applyEmojiTransform(
      emoji
    );


    /*
     * Landing.
     */

    if (
      progress >= 1
    ) {

      emoji.isFlying =
        false;


      emoji.flyProgress =
        0;


      emoji.x =
        emoji.originalX;


      emoji.y =
        emoji.originalY;


      emoji.rotation =
        0;


      emoji.scale =
        1;


      emoji.cursorOffsetX =
        0;


      emoji.cursorOffsetY =
        0;


      /*
       * Synchronize physics body.
       */

      const body =
        emoji.physicsBody;


      if (
        body
      ) {

        body.x =
          emoji.originalX;


        body.y =
          emoji.originalY;


        body.vx =
          0;


        body.vy =
          0;


        body.angularVelocity =
          0;


        body.isActive =
          false;


        body.isResting =
          true;

      }


      this._applyEmojiTransform(
        emoji
      );


      /*
       * Check whether every emoji
       * has completed the return.
       */

      const allHome =
        this.emojis.every(
          item =>
            !item.isFlying
        );


      if (
        allHome
      ) {

        this.isRecovering =
          false;


        console.log(
          '🏠 All emojis returned home!'
        );


        /*
         * Resume mobile scheduler.
         */

        if (
          this.isMobileOrTablet
        ) {

          this._startMobileAnimationScheduler();

        }

      }

    }

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
        1 - t,
        3
      )
    );

  }


  /* ================================================================
     APPLY GRID LAYOUT TO EXISTING EMOJIS
     ================================================================ */

  _updateGridLayout() {

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


    /*
     * Rebuild only Pixi glass platforms.
     *
     * Native WebP <img> elements are reused.
     */

    if (
      this.cubesContainer
    ) {

      const oldChildren =
        this.cubesContainer.removeChildren();


      for (
        const child of oldChildren
      ) {

        if (
          child &&
          typeof child.destroy ===
            'function'
        ) {

          child.destroy({
            children:
              true
          });

        }

      }

    }


    this.cubes =
      [];


    for (
      let i = 0;
      i < this.emojis.length;
      i++
    ) {

      const emoji =
        this.emojis[i];


      if (!emoji) {

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
        col * spacing;


      const y =
        startY +
        row * spacing;


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
          '0px';


        emoji.element.style.top =
          '0px';


        emoji.element.style.width =
          `${emojiSize}px`;


        emoji.element.style.height =
          `${emojiSize}px`;

      }


      this._applyEmojiTransform(
        emoji
      );


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
          y

      });


      if (
        emoji.physicsBody
      ) {

        emoji.physicsBody.x =
          x;


        emoji.physicsBody.y =
          y;

      }

    }


    this.cubesContainer.zIndex =
      1;


    if (
      this.titleContainer
    ) {

      this.titleContainer.zIndex =
        100;

    }

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


    /*
     * Re-evaluate device category.
     */

    const previousMode =
      this.isMobileOrTablet;


    this.isMobileOrTablet =
      this._detectMobileOrTablet();


    /*
     * Resize Pixi renderer.
     */

    this.app.renderer.resize(
      this.width,
      this.height
    );


    /*
     * Update title.
     */

    if (
      this.title
    ) {

      this.title.x =
        this.width / 2;


      this.title.y =
        this._getTitleY();


      this.title.style.fontSize =
        this._getTitleSize();

    }


    /*
     * Update physics world.
     */

    if (
      this.physics
    ) {

      this.physics.width =
        this.width;


      this.physics.height =
        this.height;


      this.physics.groundLevel =
        this.height *
        0.90;

    }


    /*
     * Recalculate existing grid.
     *
     * DO NOT recreate WebP elements.
     */

    this._updateGridLayout();


    /*
     * If device category changed,
     * update scheduler.
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
     ENABLE MOBILE MODE
     ================================================================ */

  _enableMobileAnimationMode() {

    console.log(
      '📱 Switching to mobile/tablet animation mode'
    );


    this.isMobileOrTablet =
      true;


    this._stopMobileAnimationScheduler();


    /*
     * Remove active WebP sources.
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


      this.mobileActiveEmojis.delete(
        emoji
      );


      /*
       * Stop maintaining animated WebP.
       */

      emoji.element.removeAttribute(
        'src'
      );


      /*
       * Keep static preview if available.
       */

      if (
        emoji.staticURL
      ) {

        emoji.element.src =
          emoji.staticURL;


        emoji.element.style.visibility =
          'visible';

      } else {

        emoji.element.style.visibility =
          'hidden';

      }

    }


    /*
     * Start a new randomized sequence.
     */

    this._startMobileAnimationScheduler();

  }


  /* ================================================================
     ENABLE DESKTOP MODE
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
     * Desktop restores all 24 animated
     * WebP streams.
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


      const src =
        emoji.element.dataset.src;


      if (!src) {

        continue;

      }


      emoji.isMobileActive =
        false;


      emoji.animationEndsAt =
        0;


      /*
       * Restore original animated WebP.
       */

      emoji.element.src =
        src;


      emoji.element.style.visibility =
        'visible';


      emoji.element.style.opacity =
        '1';

    }


    this.mobileActiveEmojis.clear();

  }


  /* ================================================================
     CLEANUP
     ================================================================ */

  destroy() {

    console.log(
      '🧹 Destroying Emoji World...'
    );


    /*
     * Stop mobile scheduler.
     */

    this._stopMobileAnimationScheduler();


    /*
     * Remove ticker callback.
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
     * Remove emoji DOM elements.
     */

    if (
      this.emojis
    ) {

      for (
        const emoji of this.emojis
      ) {

        if (
          emoji.element &&
          emoji.element.parentNode
        ) {

          emoji.element.parentNode.removeChild(
            emoji.element
          );

        }

      }

    }


    this.emojis =
      [];


    this.cubes =
      [];


    this.mobileActiveEmojis.clear();


    /*
     * Destroy Pixi application.
     */

    if (
      this.app
    ) {

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

    }


    this.app =
      null;


    this.physics =
      null;


    console.log(
      '✓ Emoji World destroyed'
    );

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
        idleType: 'spin',
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

}