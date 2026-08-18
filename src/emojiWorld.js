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
 *   - only 5 animated WebPs are active at once
 *   - inactive emojis use lightweight static frames
 *   - animation slots rotate using a shuffle bag
 *
 * Mobile shake:
 *   - pauses the 5-animation scheduler
 *   - all 24 emojis participate in physics
 *   - emojis visibly fall and bounce
 *   - emojis return to their original positions
 *   - scheduler resumes afterwards
 * ================================================================
 */

import * as PIXI from 'pixi.js';
import { Physics } from './physics.js';
import { GyroHandler } from './gyro.js';


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
      new GyroHandler();

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

    this.mobileAnimationLimit =
      5;

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


      this._setupScene();


      this._setupEventListeners();


      this._startAnimationLoop();


      /*
       * Start mobile scheduler only after
       * all 24 emoji objects exist.
       */

      if (
        this.isMobileOrTablet
      ) {

        this._startMobileAnimationScheduler();

        /*
         * IMPORTANT:
         *
         * Static frame preparation runs in
         * the background.
         *
         * It MUST NOT block initialization.
         */

        this._prepareMobileStaticFrames();

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

          spacing * 0.82
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


      element.style.willChange =
        'transform';


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
       * Decode the default frame of the
       * animated WebP.
       */

      const bitmap =
        await createImageBitmap(
          blob,
          {
            resizeWidth:
              Math.max(
                1,
                Math.round(
                  emoji.size
                )
              ),

            resizeHeight:
              Math.max(
                1,
                Math.round(
                  emoji.size
                )
              ),

            resizeQuality:
              'low'
          }
        );


      const canvas =
        document.createElement(
          'canvas'
        );


      canvas.width =
        Math.max(
          1,
          Math.round(
            emoji.size
          )
        );


      canvas.height =
        Math.max(
          1,
          Math.round(
            emoji.size
          )
        );


      const context =
        canvas.getContext(
          '2d',
          {
            alpha:
              true,

            desynchronized:
              true
          }
        );


      if (
        !context
      ) {

        bitmap.close();

        return;

      }


      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );


      context.drawImage(
        bitmap,
        0,
        0,
        canvas.width,
        canvas.height
      );


      bitmap.close();


      emoji.staticURL =
        canvas.toDataURL(
          'image/webp',
          0.82
        );


      emoji.staticReady =
        true;


      this.mobileStaticFrameReady.add(
        emoji.index
      );


      /*
       * If it is currently inactive,
       * immediately display the static frame.
       */

      if (
        !emoji.isMobileActive &&
        !emoji.isFlying
      ) {

        emoji.element.src =
          emoji.staticURL;

        emoji.element.style.visibility =
          'visible';

        emoji.element.style.opacity =
          '1';

      }

    } catch (error) {

      console.warn(
        `[Emoji World] Static frame ${emoji.index + 1} preparation failed:`,
        error
      );

    } finally {

      this.mobileStaticFrameLoading.delete(
        emoji.index
      );

    }

  }


  /* ================================================================
     MOBILE ANIMATION SCHEDULER
     ================================================================ */

  _startMobileAnimationScheduler() {

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
     * Fresh randomized sequence.
     */

    this._refillMobileShuffleBag();


    /*
     * Fill all five animation slots immediately.
     */

    for (
      let i = 0;
      i < this.mobileAnimationLimit;
      i++
    ) {

      this._activateRandomMobileEmoji();

    }


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

    if (
      this.mobileShuffleBag.length === 0
    ) {

      this._refillMobileShuffleBag();

    }


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


    emoji.isMobileActive =
      true;


    this.mobileActiveEmojis.add(
      emoji
    );


    const duration =
      this._getRandomAnimationDuration();


    emoji.animationEndsAt =
      performance.now() +
      duration;


    /*
     * Remove static source first.
     * Then start the real animated WebP.
     */

    element.removeAttribute(
      'src'
    );


    element.src =
      src;


    element.style.visibility =
      'visible';


    element.style.opacity =
      '1';

  }


  /* ================================================================
     RANDOM ANIMATION DURATION
     ================================================================ */

  _getRandomAnimationDuration() {

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


    if (
      !emoji.isMobileActive
    ) {

      return;

    }


    const element =
      emoji.element;


    emoji.isMobileActive =
      false;


    this.mobileActiveEmojis.delete(
      emoji
    );


    emoji.animationEndsAt =
      0;


    /*
     * Stop the animated WebP.
     */

    element.removeAttribute(
      'src'
    );


    /*
     * IMPORTANT FIX:
     *
     * Never hide an inactive emoji.
     *
     * If a static frame exists, show it.
     * Otherwise keep the element visible
     * until its static frame is ready.
     */

    if (
      emoji.staticURL
    ) {

      element.src =
        emoji.staticURL;

    }


    element.style.visibility =
      'visible';


    element.style.opacity =
      '1';

  }


  /* ================================================================
     CREATE STATIC FRAME FROM CURRENT FRAME
     ================================================================ */

  _captureStaticFrame(
    emoji
  ) {

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


      emoji.staticURL =
        canvas.toDataURL(
          'image/webp',
          0.82
        );


      emoji.staticReady =
        true;


      this.mobileStaticFrameReady.add(
        emoji.index
      );


    } catch (error) {

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
     * Never touch animation slots while
     * the shake movie is running.
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


    const expired =
      [];


    this.mobileActiveEmojis.forEach(
      emoji => {

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
     * Deactivate expired animations.
     * The emoji remains visible as a static frame.
     */

    for (
      const emoji of expired
    ) {

      /*
       * Capture the currently displayed
       * frame if a static frame doesn't
       * already exist.
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


      if (
        this.mobileActiveEmojis.size ===
        before
      ) {

        break;

      }

    }


    this._scheduleMobileAnimationCheck(
      generation
    );

  }


  /* ================================================================
     SCENE SETUP
     ================================================================ */

  _setupScene() {

    this.cubesContainer =
      new PIXI.Container();


    this.cubesContainer.sortableChildren =
      true;


    this.app.stage.addChild(
      this.cubesContainer
    );


    this.titleContainer =
      new PIXI.Container();


    this.app.stage.addChild(
      this.titleContainer
    );


    /*
     * Physics is shared by all 24 emojis,
     * but bodies remain inactive until shake.
     */

    this.physics =
      new Physics({

        width:
          this.width,

        height:
          this.height,

        groundLevel:
          this.height * 0.85,

        gravity:
          0.65,

        bounce:
          0.28

      });


    /*
     * Create emojis after physics exists
     * so every emoji receives its body.
     */

    this._createEmojisAndCubes();


    this._createTitle();


    console.log(
      '[Emoji World] ✓ Scene created'
    );

  }


  /* ================================================================
     CREATE EMOJIS + GLASS PLATFORMS
     ================================================================ */

  _createEmojisAndCubes() {

    this.cubes =
      [];


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

        element.style.left =
        '0px';

        element.style.top =
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
        this._createGlassPlatform(
          x,
          y,
          cubeSize
        );


      cube.zIndex =
        1;


      this.cubesContainer.addChild(
        cube
      );


      this.cubes.push(
        cube
      );

    }


    console.log(
      `[Emoji World] ✓ ${this.emojis.length} emoji platforms created`
    );

  }


  /* ================================================================
     GLASS PLATFORM
     ================================================================ */

  _createGlassPlatform(
    x,
    y,
    size
  ) {

    const group =
      new PIXI.Container();


    const shadow =
      new PIXI.Graphics();


    shadow
      .ellipse(
        0,
        size * 0.42,
        size * 0.40,
        size * 0.075
      )
      .fill({
        color:
          0x000000,
        alpha:
          0.12
      });


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


    const highlight =
      new PIXI.Graphics();


    highlight
      .roundRect(
        -size * 0.38,
        -size * 0.08,
        size * 0.50,
        size * 0.07,
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
     * Clear previous platform references.
     */

    this.cubes =
      [];


    /*
     * Remove any old Pixi glass cubes
     * if this method is ever called again.
     *
     * This prevents duplicate platforms.
     */

    if (
      this.cubesContainer
    ) {

      this.cubesContainer.removeChildren();

    }


    /*
     * Create the 24 native WebP emoji
     * elements.
     *
     * _createEmojis() handles:
     *
     * - WebP loading
     * - mobile static-frame handling
     * - 5-animation scheduler
     * - DOM element creation
     */

    this._createEmojis();


    /*
     * Get the SINGLE authoritative grid layout.
     *
     * Do not calculate another grid here.
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
     * Position all 24 emojis and their
     * corresponding glass platforms.
     */

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


      /*
       * Grid coordinates.
       */

      const col =
        i %
        cols;


      const row =
        Math.floor(
          i /
          cols
        );


      const x =
        startX +
        col *
        spacing;


      const y =
        startY +
        row *
        spacing;


      /*
       * ------------------------------------------------------------
       * HOME / ORIGINAL POSITION
       * ------------------------------------------------------------
       */

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
       * Reset interaction offsets.
       */

      emoji.cursorOffsetX =
        0;


      emoji.cursorOffsetY =
        0;


      emoji.rotation =
        0;


      emoji.scale =
        1;


      /*
       * ------------------------------------------------------------
       * NATIVE WEBP ELEMENT
       * ------------------------------------------------------------
       *
       * IMPORTANT:
       *
       * Do NOT put x/y into left/top.
       *
       * _applyEmojiTransform() is the ONLY place that
       * controls the emoji's actual position.
       *
       * Otherwise:
       *
       *     left: x
       *     +
       *     translate3d(x, y)
       *
       * would position the emoji twice.
       */

      if (
        emoji.element
      ) {

        const element =
          emoji.element;


        /*
         * Keep the element absolutely positioned
         * inside the full-screen emoji layer.
         */

        element.style.position =
          'absolute';


        /*
         * IMPORTANT:
         *
         * Base position is always 0,0.
         *
         * Actual position comes from:
         *
         * _applyEmojiTransform()
         */

        element.style.left =
          '0px';


        element.style.top =
          '0px';


        /*
         * Set visual size.
         */

        element.style.width =
          `${emojiSize}px`;


        element.style.height =
          `${emojiSize}px`;


        /*
         * Keep WebP aspect ratio.
         */

        element.style.objectFit =
          'contain';


        /*
         * GPU-friendly rendering.
         */

        element.style.willChange =
          'transform';


        /*
         * Make sure emoji is visible.
         */

        element.style.visibility =
          'visible';


        element.style.opacity =
          '1';

      }


      /*
       * ------------------------------------------------------------
       * GLASS PLATFORM
       * ------------------------------------------------------------
       *
       * The platform uses the exact same x/y
       * coordinates as the emoji home position.
       */

      const cube =
        this._createGlassCube(

          x,

          y +
          emojiSize *
          0.43,

          cubeSize

        );


      /*
       * Preserve correct visual ordering.
       */

      cube.zIndex =
        i;


      this.cubesContainer.addChild(
        cube
      );


      /*
       * Store platform data.
       */

      this.cubes.push({

        sprite:
          cube,

        x:
          x,

        y:
          y

      });


      /*
       * ------------------------------------------------------------
       * PHYSICS HOME POSITION
       * ------------------------------------------------------------
       */

      if (
        emoji.physicsBody
      ) {

        emoji.physicsBody.x =
          x;


        emoji.physicsBody.y =
          y;


        emoji.physicsBody.vx =
          0;


        emoji.physicsBody.vy =
          0;


        emoji.physicsBody.angularVelocity =
          0;


        /*
         * Start in a resting state.
         */

        emoji.physicsBody.isActive =
          false;


        emoji.physicsBody.isResting =
          true;

      }


      /*
       * ------------------------------------------------------------
       * APPLY INITIAL TRANSFORM
       * ------------------------------------------------------------
       *
       * This positions the WebP at exactly
       * the same x/y as the glass cube.
       */

      this._applyEmojiTransform(
        emoji
      );

    }


    /*
     * ------------------------------------------------------------
     * LAYER ORDER
     * ------------------------------------------------------------
     */

    this.cubesContainer.zIndex =
      1;


    this.titleContainer.zIndex =
      100;


    /*
     * Make sure the title stays above
     * the glass/emoji scene.
     */

    if (
      this.title
    ) {

      this.title.zIndex =
        100;

    }


    /*
     * Final diagnostic.
     */

    console.log(
      `[Emoji World] ✓ Grid created: ${cols} columns × ${Math.ceil(this.emojis.length / cols)} rows`
    );

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
     * motion permission.
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
     */

    const tiltX =
      Math.max(

        -10,

        Math.min(

          10,

          tilt.x *
          10

        )

      );


    const tiltY =
      Math.max(

        -6,

        Math.min(

          6,

          tilt.y *
          6

        )

      );


    for (
      const emoji of this.emojis
    ) {

      if (
        !emoji ||
        emoji.isFlying
      ) {

        continue;

      }


      emoji.targetX =
        emoji.originalX +
        tiltX;


      emoji.targetY =
        emoji.originalY +
        tiltY;

    }

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
     * Pause the mobile 5-animation scheduler
     * while the shake movie is running.
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
     * Keep the falling sequence long enough
     * to be clearly visible.
     */

    this.shakeRecoveryTime =
      2200;


    /*
     * Every emoji participates in the shake,
     * regardless of the normal mobile limit
     * of 5 animated WebPs.
     */

    for (
      const emoji of this.emojis
    ) {

      if (
        !emoji
      ) {

        continue;

      }


      /*
       * Mark emoji as part of the
       * physical shake movie.
       */

      emoji.isFlying =
        true;


      /*
       * Keep emoji visible.
       */

      if (
        emoji.element
      ) {

        emoji.element.style.visibility =
          'visible';

        emoji.element.style.opacity =
          '1';

      }


      const body =
        emoji.physicsBody;


      if (
        !body
      ) {

        continue;

      }


      /*
       * ============================================================
       * CRITICAL FIX
       * ============================================================
       *
       * The physics engine skips bodies when:
       *
       *     body.sleeping === true
       *
       * After the first shake, settled emojis can become sleeping.
       *
       * Therefore every new shake MUST wake every body.
       */

      if (
        this.physics &&
        typeof this.physics.wakeBody ===
        'function'
      ) {

        this.physics.wakeBody(
          body
        );

      }


      /*
       * Explicitly reset all physics state.
       */

      body.isActive =
        true;


      body.sleeping =
        false;


      body.grounded =
        false;


      /*
       * These properties may exist in
       * older versions of the physics system.
       *
       * Reset them safely without relying
       * on them for the actual wake-up.
       */

      body.isResting =
        false;


      body.restTimer =
        0;


      /*
       * Start physics from the emoji's
       * current visual position.
       */

      body.x =
        emoji.x;


      body.y =
        emoji.y;


      body.rotation =
        emoji.rotation;


      /*
       * Clear previous motion completely.
       */

      body.vx =
        0;


      body.vy =
        0;


      body.angularVelocity =
        0;


      /*
       * Random horizontal movement.
       */

      body.vx =
        (
          Math.random() -
          0.5
        ) *
        5;


      /*
       * Initial upward impulse.
       *
       * Gravity then pulls the emoji
       * downward and it falls to the floor.
       */

      body.vy =
        -6 -
        Math.random() *
        3;


      /*
       * Random rotation.
       */

      body.angularVelocity =
        (
          Math.random() -
          0.5
        ) *
        0.35;


      /*
       * Make sure the physics engine
       * cannot consider this body settled.
       */

      body.sleeping =
        false;


      body.grounded =
        false;

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
     * Capture current physics positions
     * before disabling physics.
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
          index *
          25;


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
     * Pixi ticker is the only world update loop.
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

            dtMs /
            16.67,

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
          this.shakeRecoveryTime <=
          0
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
            dt
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


    /*
     * Advance individual personality timer.
     */

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


    /*
     * Movement happens through transform
     * to avoid continuous layout work.
     */

    const x =
      emoji.x;


    const y =
      emoji.y;


    const rotation =
      emoji.rotation;


    const scale =
      emoji.scale ||
      1;


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
     * On mobile, don't perform cursor
     * calculations while the screen is idle.
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
      Math.sqrt(
        dx * dx +
        dy * dy
      );


    const influenceRadius =
      isTouchDevice
        ? 150
        : 190;


    if (
      distance <
      influenceRadius
    ) {

      const strength =
        1 -
        (
          distance /
          influenceRadius
        );


      const safeDistance =
        Math.max(
          distance,
          0.001
        );


      const directionX =
        -dx /
        safeDistance;


      const directionY =
        -dy /
        safeDistance;


      const maxOffset =
        isTouchDevice
          ? 12
          : 18;


      const targetOffsetX =
        directionX *
        strength *
        maxOffset;


      const targetOffsetY =
        directionY *
        strength *
        maxOffset;


      emoji.cursorOffsetX +=
        (
          targetOffsetX -
          emoji.cursorOffsetX
        ) *
        0.12;


      emoji.cursorOffsetY +=
        (
          targetOffsetY -
          emoji.cursorOffsetY
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

    }


    /*
     * Cursor offsets are applied on top
     * of the current idle position.
     */

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
     * Keep the emoji inside the visible
     * horizontal screen area.
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


    /*
     * Apply the position to the native
     * WebP element.
     */

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


    /*
     * Smooth easing.
     */

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
     *
     * Emoji rises slightly while
     * travelling toward its platform.
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


    /*
     * Rotate back to normal.
     */

    emoji.rotation =
      emoji.returnStartRotation *
      (
        1 -
        eased
      );


    /*
     * Small flying scale effect.
     */

    emoji.scale =
      1 +
      Math.sin(
        progress *
        Math.PI
      ) *
      0.08;


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


      /*
       * Make sure inactive mobile emojis
       * return to their lightweight static
       * frame.
       */

      if (
        this.isMobileOrTablet &&
        !emoji.isMobileActive &&
        emoji.staticURL &&
        emoji.element
      ) {

        emoji.element.src =
          emoji.staticURL;


        emoji.element.style.visibility =
          'visible';


        emoji.element.style.opacity =
          '1';

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
         * Resume the mobile animation
         * scheduler after the shake movie.
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
   RESIZE
   ================================================================ */

//   _onWindowResize() {

//     if (
//       !this.app ||
//       !this.app.renderer
//     ) {

//       return;

//     }


//     /*
//      * Update viewport dimensions.
//      */

//     this.width =
//       window.innerWidth;


//     this.height =
//       window.innerHeight;


//     /*
//      * Re-evaluate device category.
//      *
//      * This is important when a tablet/phone
//      * changes orientation.
//      */

//     const previousMode =
//       this.isMobileOrTablet;


//     this.isMobileOrTablet =
//       this._detectMobileOrTablet();


//     /*
//      * Resize Pixi renderer.
//      *
//      * Do NOT rebuild the emoji grid here.
//      *
//      * The grid is created and positioned by
//      * _createEmojisAndCubes().
//      */

//     this.app.renderer.resize(
//       this.width,
//       this.height
//     );


//     /*
//      * Update title position and size.
//      */

//     if (
//       this.title
//     ) {

//       this.title.x =
//         this.width / 2;


//       this.title.y =
//         this._getTitleY();


//       this.title.style.fontSize =
//         this._getTitleSize();

//     }


//     /*
//      * Update physics world dimensions.
//      */

//     if (
//       this.physics
//     ) {

//       this.physics.width =
//         this.width;


//       this.physics.height =
//         this.height;


//       this.physics.groundLevel =
//         this.height *
//         0.90;

//     }


//     /*
//      * If the device category changed,
//      * update the animation scheduler.
//      *
//      * Desktop:
//      *   24 animated WebPs
//      *
//      * Mobile/tablet:
//      *   maximum 5 animated WebPs
//      */

//     if (
//       previousMode !==
//       this.isMobileOrTablet
//     ) {

//       if (
//         this.isMobileOrTablet
//       ) {

//         this._enableMobileAnimationMode();

//       } else {

//         this._enableDesktopAnimationMode();

//       }

//     }


//     /*
//      * IMPORTANT:
//      *
//      * Do NOT call:
//      *
//      *   _repositionEmojisAndCubes()
//      *
//      * here.
//      *
//      * The emoji grid has a single authoritative
//      * layout calculation inside
//      * _createEmojisAndCubes().
//      *
//      * Repositioning the DOM emojis separately
//      * from the Pixi platforms causes the emoji
//      * and platform coordinates to become
//      * misaligned.
//      *
//      * During a shake, physics must also remain
//      * in control of emoji positions.
//      */

//   }


/* ================================================================
   REPOSITION EMOJIS + CUBES
   ================================================================ */

  _repositionEmojisAndCubes() {

    /*
     * INTENTIONALLY DISABLED.
     *
     * The emoji/grid layout is controlled exclusively by:
     *
     *     _createEmojisAndCubes()
     *
     * This method previously caused the native WebP emoji
     * positions and Pixi glass-cube positions to become
     * desynchronized.
     *
     * It also interfered with the mobile animation scheduler
     * and could overwrite positions while the shake/physics
     * sequence was running.
     *
     * DO NOT reposition emojis here.
     *
     * The only systems allowed to change emoji positions are:
     *
     * 1. _createEmojisAndCubes()
     *      → initial/home positions
     *
     * 2. _updateIdleAnimation()
     *      → normal idle movement
     *
     * 3. _addMouseProximityEffect()
     *      → cursor interaction
     *
     * 4. _updateFallingAnimation()
     *      → shake physics
     *
     * 5. _updateFlyingBackAnimation()
     *      → return-to-cube animation
     *
     * Keeping a single position source prevents the
     * emoji/platform alignment from breaking.
     */

    return;

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


    /*
     * Stop previous scheduler.
     */

    this._stopMobileAnimationScheduler();


    /*
     * Remove active WebP sources.
     *
     * IMPORTANT:
     * Never hide emojis if there is no
     * static frame yet.
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


      emoji.element.removeAttribute(
        'src'
      );


      /*
       * Show static frame when available.
       */

      if (
        emoji.staticURL
      ) {

        emoji.element.src =
          emoji.staticURL;

      }


      /*
       * NEVER hide an emoji simply
       * because its static frame hasn't
       * finished preparing yet.
       */

      emoji.element.style.visibility =
        'visible';


      emoji.element.style.opacity =
        '1';

    }


    /*
     * Start fresh random sequence.
     */

    this._startMobileAnimationScheduler();


    /*
     * Continue preparing any frames
     * that are still missing.
     */

    this._prepareMobileStaticFrames();

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


    /*
     * Clear active mobile slots.
     */

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
     * Invalidate static-frame preparation.
     */

    this.mobileStaticFrameGeneration++;


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


    /*
     * Clear arrays.
     */

    this.emojis =
      [];


    this.cubes =
      [];


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