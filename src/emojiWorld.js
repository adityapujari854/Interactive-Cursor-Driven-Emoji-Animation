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

    // Native animated WebP layer
    this.emojiLayer = null;

    this.emojis = [];
    this.cubes = [];

    this.emojiConfigs = this._getEmojiConfigs();

    this.mouse = {
      x: this.width / 2,
      y: this.height / 2
    };

    this.touchActive = false;

    this.isShaking = false;
    this.isRecovering = false;

    this.shakeRecoveryTime = 0;

    this._permissionRequested = false;

    this._resizeHandler = () => {
      this._onWindowResize();
    };

    this._boundUpdateFrame = this._updateFrame.bind(this);

    // main.js waits for this
    this.ready = this._init();
  }


  /* ================================================================
     INITIALIZATION
     ================================================================ */

  async _init() {

    try {

      console.log('🎮 Initializing The Emojis...');

      await this._createPixiApp();

      this._createEmojiDOMLayer();

      this._setupScene();

      this._setupEventListeners();

      this._startAnimationLoop();

      console.log('✨ The Emojis initialized successfully!');

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

    this.app = new PIXI.Application();

    await this.app.init({

      canvas: this.canvas,

      width: this.width,
      height: this.height,

      backgroundAlpha: 0,

      antialias: false,

      autoDensity: true,

      resolution: this._getOptimalResolution(),

      preference: 'webgl',

      powerPreference: 'high-performance'
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

    this.app.canvas.style.display = 'block';

    this.app.canvas.style.width = '100%';

    this.app.canvas.style.height = '100%';

    this.app.canvas.style.position = 'fixed';

    this.app.canvas.style.inset = '0';

    this.app.canvas.style.zIndex = '1';

    this.app.canvas.style.pointerEvents = 'none';

    window.addEventListener(
      'resize',
      this._resizeHandler,
      { passive: true }
    );

    console.log(
      '[Emoji World] ✓ PixiJS renderer initialized'
    );
  }


  _getOptimalResolution() {

    /*
     * Mobile GPU optimization.
     *
     * Snapdragon 888:
     * avoid rendering huge 3x/4x DPR canvases.
     */

    const dpr =
      window.devicePixelRatio || 1;

    const isMobile =
      window.innerWidth < 800 ||
      navigator.maxTouchPoints > 0;

    if (isMobile) {

      return Math.min(dpr, 1.5);
    }

    return Math.min(dpr, 2);
  }


  /* ================================================================
     NATIVE EMOJI LAYER
     ================================================================ */

  _createEmojiDOMLayer() {

    /*
     * This layer sits directly above the Pixi canvas.
     *
     * pointer-events:none means it cannot block:
     *   - mouse
     *   - touch
     *   - gyro
     */

    this.emojiLayer =
      document.createElement('div');

    this.emojiLayer.id =
      'native-emoji-layer';

    Object.assign(
      this.emojiLayer.style,
      {

        position: 'fixed',

        inset: '0',

        width: '100vw',

        height: '100vh',

        overflow: 'hidden',

        pointerEvents: 'none',

        zIndex: '10',

        transform: 'translateZ(0)',

        contain: 'layout style paint'
      }
    );

    document.body.appendChild(
      this.emojiLayer
    );

    console.log(
      '[Emoji World] ✓ Native animated WebP layer created'
    );
  }


  /* ================================================================
     SCENE
     ================================================================ */

  _setupScene() {

    this.cubesContainer =
      new PIXI.Container();

    this.titleContainer =
      new PIXI.Container();

    this.cubesContainer.sortableChildren =
      true;

    this.titleContainer.sortableChildren =
      true;

    this.app.stage.addChild(
      this.cubesContainer
    );

    this.app.stage.addChild(
      this.titleContainer
    );


    this.physics =
      new Physics({

        width: this.width,

        height: this.height,

        groundLevel:
          this.height * 0.90,

        gravity: 0.62,

        friction: 0.985,

        bounce: 0.55
      });


    this._createTitle();

    this._createEmojisAndCubes();

    console.log(
      `[Emoji World] ✓ Created ${this.emojis.length} animated emojis`
    );
  }


  /* ================================================================
     TITLE
     ================================================================ */

  _createTitle() {

    const title =
      new PIXI.Text({

        text: 'The Emojis',

        style: {

          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

          fontSize:
            Math.max(
              34,
              Math.min(
                58,
                this.width * 0.045
              )
            ),

          fontWeight: '700',

          fill: 0x111111,

          align: 'center',

          letterSpacing: 1
        }
      });


    title.anchor.set(0.5);

    title.x =
      this.width / 2;

    title.y =
      Math.max(
        48,
        Math.min(
          75,
          this.height * 0.085
        )
      );

    title.alpha = 0.98;

    title.zIndex = 100;

    this.titleContainer.addChild(
      title
    );

    this.title = title;
  }


  /* ================================================================
     CREATE EMOJIS + GLASS PLATFORMS
     ================================================================ */

  _createEmojisAndCubes() {

    /*
     * Desktop:
     *   6 x 4
     *
     * Mobile:
     *   4 x 6
     */

    const isMobile =
      this.width < 700;

    const cols =
      isMobile ? 4 : 6;

    const rows =
      Math.ceil(24 / cols);


    const sidePadding =
      isMobile ? 24 : 70;


    const availableWidth =
      Math.max(
        260,
        this.width -
        sidePadding * 2
      );


    const top =
      this.height < 700
        ? 120
        : 135;


    const bottom =
      Math.min(
        this.height - 50,
        this.height * 0.91
      );


    const availableHeight =
      Math.max(
        300,
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
      (availableHeight -
        gridHeight) / 2;


    /*
     * Mobile emojis should not become too large.
     */

    const emojiSize =
      Math.max(
        isMobile ? 54 : 58,

        Math.min(
          isMobile ? 82 : 108,

          spacing * 0.70
        )
      );


    const cubeSize =
      Math.max(
        isMobile ? 62 : 68,

        Math.min(
          isMobile ? 92 : 120,

          spacing * 0.82
        )
      );


    for (
      let i = 0;
      i < 24;
      i++
    ) {

      const col =
        i % cols;

      const row =
        Math.floor(i / cols);


      const x =
        startX +
        col * spacing;


      const y =
        startY +
        row * spacing;


      const config =
        this.emojiConfigs[i];


      /* ------------------------------------------------------------
         GLASS PLATFORM
         ------------------------------------------------------------ */

      const cube =
        this._createGlassCube(
          x,
          y + emojiSize * 0.42,
          cubeSize
        );


      cube.zIndex = 1;

      this.cubesContainer.addChild(
        cube
      );


      this.cubes.push({

        sprite: cube,

        x,

        y
      });


      /* ------------------------------------------------------------
         NATIVE ANIMATED WEBP
         ------------------------------------------------------------ */

      const img =
        document.createElement('img');


      /*
       * IMPORTANT:
       *
       * Browser loads the animated WebP directly.
       *
       * Do NOT convert this into PIXI.Texture.
       */

      img.src =
        `/assets/emojis/512 (${i + 1}).webp`;


      img.alt =
        `Emoji ${i + 1}`;


      img.draggable =
        false;


      img.decoding =
        'async';


      img.loading =
        'eager';


      /*
       * Critical for animated WebP.
       */

      img.setAttribute(
        'fetchpriority',
        'high'
      );


      Object.assign(
        img.style,
        {

          position: 'absolute',

          left: '0',

          top: '0',

          width: `${emojiSize}px`,

          height: `${emojiSize}px`,

          objectFit: 'contain',

          display: 'block',

          userSelect: 'none',

          WebkitUserSelect: 'none',

          pointerEvents: 'none',

          willChange:
            'transform',

          transformOrigin:
            '50% 50%',

          backfaceVisibility:
            'hidden',

          WebkitBackfaceVisibility:
            'hidden',

          transform:
            `translate3d(${x - emojiSize / 2}px, ${y - emojiSize / 2}px, 0)`,

          opacity: '1'
        }
      );


      /*
       * If an image fails, show useful information.
       */

      img.addEventListener(
        'error',
        () => {

          console.error(
            `[Emoji World] Failed to load emoji ${i + 1}:`,
            img.src
          );
        },
        { once: true }
      );


      this.emojiLayer.appendChild(
        img
      );


      /* ------------------------------------------------------------
         ANIMATION STATE
         ------------------------------------------------------------ */

      const emoji = {

        element: img,

        index: i,

        config,

        originalX: x,

        originalY: y,

        targetX: x,

        targetY: y,

        x,

        y,

        size: emojiSize,

        rotation: 0,

        scale: 1,

        opacity: 1,

        idleTime:
          Math.random() *
          Math.PI *
          2,

        isFlying: false,

        flyProgress: 0,

        flyStartX: x,

        flyStartY: y,

        flyStartRotation: 0,

        physicsBody: null,

        lastRenderX: x,

        lastRenderY: y,

        lastRenderRotation: 0,

        lastRenderScale: 1
      };


      /*
       * Physics body.
       */

      emoji.physicsBody =
        this.physics.createBody({

          x,

          y,

          mass:
            config.mass,

          radius:
            emojiSize * 0.40,

          isActive: false
        });


      this.emojis.push(
        emoji
      );
    }


    console.log(
      '[Emoji World] ✓ Native animated WebP elements created'
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


    const shadow =
      new PIXI.Graphics()
        .ellipse(
          0,
          size * 0.48,
          size * 0.44,
          size * 0.10
        )
        .fill({
          color: 0x000000,
          alpha: 0.12
        });


    const cube =
      new PIXI.Graphics()
        .roundRect(
          -size / 2,
          -size / 2,
          size,
          size,
          14
        )
        .fill({
          color: 0xf7fbff,
          alpha: 0.72
        })
        .stroke({
          color: 0xcbdbe8,
          alpha: 0.75,
          width: 1.5
        });


    const highlight =
      new PIXI.Graphics()
        .roundRect(
          -size / 2 + 4,
          -size / 2 + 4,
          size * 0.46,
          size * 0.46,
          10
        )
        .fill({
          color: 0xffffff,
          alpha: 0.55
        });


    group.addChild(
      shadow,
      cube,
      highlight
    );


    group.position.set(
      x,
      y
    );


    group.alpha = 0.92;

    return group;
  }


  /* ================================================================
     INPUT EVENTS
     ================================================================ */

  _setupEventListeners() {

    /* --------------------------------------------------------------
       MOUSE
       -------------------------------------------------------------- */

    window.addEventListener(
      'mousemove',
      (event) => {

        this.mouse.x =
          event.clientX;

        this.mouse.y =
          event.clientY;
      },
      { passive: true }
    );


    /* --------------------------------------------------------------
       TOUCH START
       -------------------------------------------------------------- */

    window.addEventListener(
      'touchstart',
      (event) => {

        this.touchActive = true;

        const touch =
          event.touches[0];

        if (touch) {

          this.mouse.x =
            touch.clientX;

          this.mouse.y =
            touch.clientY;
        }

        this._requestGyroPermissionOnce();

      },
      { passive: true }
    );


    /* --------------------------------------------------------------
       TOUCH MOVE
       -------------------------------------------------------------- */

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
      { passive: true }
    );


    /* --------------------------------------------------------------
       TOUCH END
       -------------------------------------------------------------- */

    window.addEventListener(
      'touchend',
      () => {

        this.touchActive = false;

      },
      { passive: true }
    );


    /* --------------------------------------------------------------
       CLICK
       -------------------------------------------------------------- */

    window.addEventListener(
      'click',
      () => {

        this._requestGyroPermissionOnce();

      },
      { passive: true }
    );


    /* --------------------------------------------------------------
       GYROSCOPE
       -------------------------------------------------------------- */

    window.addEventListener(
      'deviceorientation',
      () => {

        this._applyGyroInteraction();

      },
      { passive: true }
    );


    /* --------------------------------------------------------------
       SHAKE
       -------------------------------------------------------------- */

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
      { passive: true }
    );
  }


  /* ================================================================
     GYRO PERMISSION
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

      await this.gyro.requestPermission();

      console.log(
        '[Emoji World] ✓ Motion permission requested'
      );

    } catch (error) {

      console.warn(
        '[Emoji World] Motion permission unavailable:',
        error
      );
    }
  }


  /* ================================================================
     GYRO TILT
     ================================================================ */

  _applyGyroInteraction() {

    if (
      this.isShaking ||
      this.isRecovering
    ) {

      return;
    }


    const tilt =
      this.gyro.getTilt();


    const tiltX =
      tilt.x * 16;


    const tiltY =
      tilt.y * 10;


    for (
      const emoji of this.emojis
    ) {

      if (
        !emoji.isFlying
      ) {

        emoji.targetX =
          emoji.originalX +
          tiltX;


        emoji.targetY =
          emoji.originalY +
          tiltY;
      }
    }
  }


  /* ================================================================
     SHAKE
     ================================================================ */

  _onShakeDetected() {

    if (
      this.isShaking ||
      this.isRecovering
    ) {

      return;
    }


    this.isShaking =
      true;


    this.shakeRecoveryTime =
      2500;


    console.log(
      '🌍 SHAKE DETECTED! Emojis falling!'
    );


    for (
      const emoji of this.emojis
    ) {

      const body =
        emoji.physicsBody;

      if (!body) {
        continue;
      }


      emoji.isFlying =
        true;


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


      body.vx =
        (Math.random() - 0.5) *
        10;


      body.vy =
        -10 -
        Math.random() * 7;


      body.angularVelocity =
        (Math.random() - 0.5) *
        0.45;
    }
  }


  /* ================================================================
     RETURN EMOJIS
     ================================================================ */

  _returnEmojis() {

    if (
      this.isRecovering
    ) {

      return;
    }


    this.isRecovering =
      true;


    this.isShaking =
      false;


    for (
      const emoji of this.emojis
    ) {

      emoji.isFlying =
        true;

      emoji.flyProgress =
        0;


      emoji.flyStartX =
        emoji.x;


      emoji.flyStartY =
        emoji.y;


      emoji.flyStartRotation =
        emoji.rotation;
    }


    console.log(
      '✨ Emojis flying back to their glass cubes...'
    );
  }


  /* ================================================================
     ANIMATION LOOP
     ================================================================ */

  _startAnimationLoop() {

    /*
     * We use Pixi's ticker only as the central frame clock.
     *
     * The WebP itself is animated by the browser.
     */

    this.app.ticker.add(
      this._boundUpdateFrame
    );


    console.log(
      '🎞️ Animation loop started'
    );
  }


  /* ================================================================
     FRAME UPDATE
     ================================================================ */

  _updateFrame(ticker) {

    try {

      const dtMs =
        Math.min(
          ticker.deltaMS || 16.67,
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
        this.isShaking &&
        !this.isRecovering
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
         EMOJIS
         ------------------------------------------------------------ */

      for (
        const emoji of this.emojis
      ) {

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


        /*
         * Render native HTML element.
         */

        this._renderNativeEmoji(
          emoji
        );
      }

    } catch (error) {

      console.error(
        '[Emoji World] Frame update error:',
        error
      );
    }
  }


  /* ================================================================
     IDLE ANIMATION
     ================================================================ */

  _updateIdleAnimation(
    emoji,
    dt
  ) {

    const config =
      emoji.config;


    emoji.idleTime +=
      config.idleSpeed * dt;


    const baseX =
      emoji.originalX;


    const baseY =
      emoji.originalY;


    const amplitude =
      config.idleAmplitude;


    const t =
      emoji.idleTime;


    switch (
      config.idleType
    ) {


      case 'bounce':

        emoji.y =
          baseY +
          Math.sin(t) *
          amplitude;

        break;


      case 'pulse': {

        const s =
          1 +
          Math.sin(t) *
          config.scaleAmount;


        emoji.scale =
          s;


        emoji.y =
          baseY +
          Math.sin(t * 0.8) *
          2;

        break;
      }


      case 'sway':

        emoji.y =
          baseY +
          Math.sin(t) *
          amplitude;


        emoji.rotation =
          Math.sin(t * 0.7) *
          0.10;

        break;


      case 'tilt':

        emoji.rotation =
          Math.sin(t) *
          0.16;


        emoji.y =
          baseY +
          Math.sin(t * 1.2) *
          amplitude *
          0.55;

        break;


      case 'spin':

        emoji.rotation +=
          config.spinSpeed * dt;


        emoji.y =
          baseY +
          Math.sin(t * 0.7) *
          2;

        break;


      case 'bob':

        emoji.y =
          baseY +
          Math.sin(t * 1.4) *
          amplitude;

        break;


      case 'drift':

        emoji.x =
          baseX +
          Math.sin(t) *
          amplitude;


        emoji.y =
          baseY +
          Math.cos(t * 0.7) *
          amplitude *
          0.7;

        break;


      case 'vibrate':

        emoji.x =
          baseX +
          Math.sin(t * 5) *
          amplitude;


        emoji.y =
          baseY +
          Math.cos(t * 4) *
          amplitude *
          0.5;

        break;


      case 'tremble':

        emoji.rotation =
          Math.sin(t * 7) *
          0.035;


        emoji.x =
          baseX +
          Math.sin(t * 8) *
          amplitude *
          0.5;

        break;


      case 'float':

        emoji.y =
          baseY +
          Math.sin(t * 0.9) *
          amplitude;


        emoji.x =
          baseX +
          Math.cos(t * 0.65) *
          amplitude *
          0.45;


        emoji.opacity =
          0.92 +
          Math.sin(t * 1.2) *
          0.06;

        break;


      case 'droop':

        emoji.y =
          baseY +
          Math.cos(t) *
          amplitude;


        emoji.rotation =
          Math.sin(t * 0.6) *
          0.12;

        break;


      case 'twitch':

        emoji.y =
          baseY +
          Math.sin(t * 1.8) *
          amplitude *
          0.35;


        emoji.rotation =
          Math.sin(t * 3.2) *
          0.025;

        break;


      case 'shake':

        emoji.x =
          baseX +
          Math.sin(t * 3.5) *
          amplitude;


        emoji.y =
          baseY +
          Math.cos(t * 3.5) *
          amplitude *
          0.5;

        break;


      case 'playful':

        emoji.rotation =
          Math.sin(t * 1.5) *
          0.18;


        emoji.y =
          baseY +
          Math.sin(t * 2) *
          amplitude;

        break;


      case 'shiver':

        emoji.x =
          baseX +
          Math.sin(t * 8) *
          amplitude *
          0.55;


        emoji.y =
          baseY +
          Math.cos(t * 7) *
          amplitude *
          0.35;

        break;


      default:

        emoji.x =
          baseX;

        emoji.y =
          baseY;
    }


    /*
     * Default scale.
     */

    if (
      !emoji.scale ||
      !Number.isFinite(
        emoji.scale
      )
    ) {

      emoji.scale = 1;
    }


    /*
     * Smooth gyro follow.
     */

    if (
      !this.isShaking &&
      !this.isRecovering
    ) {

      emoji.x +=
        (
          emoji.targetX -
          emoji.x
        ) *
        0.045;


      emoji.y +=
        (
          emoji.targetY -
          emoji.y
        ) *
        0.045;
    }


    /*
     * Cursor interaction.
     */

    this._addMouseProximityEffect(
      emoji
    );
  }


/* ================================================================
   CURSOR PROXIMITY
   ================================================================ */

_addMouseProximityEffect(
  emoji
) {

  const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0;


  /*
   * Do not run cursor interaction on
   * idle mobile devices.
   */

  if (
    isTouchDevice &&
    !this.touchActive
  ) {

    return;
  }


  /* --------------------------------------------------------------
     CURSOR DISTANCE
     -------------------------------------------------------------- */

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
   * Smaller interaction area.
   *
   * Mobile:
   *   100px
   *
   * Desktop:
   *   160px
   *
   * This prevents emojis from reacting
   * when the cursor is relatively far away.
   */

  const range =
    window.innerWidth < 700
      ? 100
      : 160;


  /* --------------------------------------------------------------
     CURSOR REACTION
     -------------------------------------------------------------- */

  if (
    distance > 0 &&
    distance < range
  ) {

    /*
     * 0 = cursor at edge of range
     * 1 = cursor directly on emoji
     */

    const proximity =
      1 -
      distance / range;


    /*
     * Soft quadratic response.
     *
     * Maximum movement is approximately 7px.
     *
     * Previously this was 22px, which caused
     * the emojis to fly too far away.
     */

    const push =
      proximity *
      proximity *
      7;


    /*
     * Hard safety limit.
     *
     * An emoji can NEVER be pushed more
     * than 7px by the cursor.
     */

    const maxPush =
      7;


    const finalPush =
      Math.min(
        push,
        maxPush
      );


    /*
     * Move away from cursor.
     */

    emoji.x -=
      (dx / distance) *
      finalPush;


    emoji.y -=
      (dy / distance) *
      finalPush;


    /* ------------------------------------------------------------
       SMALL REACTION SCALE
       ------------------------------------------------------------ */

    const scale =
      1 +
      proximity *
      0.06;


    /*
     * Very subtle enlargement.
     *
     * Maximum:
     * 1.06x
     */

    emoji.scale =
      Math.max(
        emoji.scale || 1,
        scale
      );


    /* ------------------------------------------------------------
       SMALL ROTATION
       ------------------------------------------------------------ */

    /*
     * Tiny tilt toward the cursor reaction.
     */

    emoji.rotation +=
      (dx / range) *
      0.006;


  } else {

    /* ------------------------------------------------------------
       SMOOTH RETURN
       ------------------------------------------------------------ */

    /*
     * Gradually return to normal scale.
     */

    emoji.scale +=
      (
        1 -
        emoji.scale
      ) *
      0.12;


    /*
     * Prevent tiny floating-point
     * values from accumulating.
     */

    if (
      Math.abs(
        emoji.scale - 1
      ) < 0.001
    ) {

      emoji.scale = 1;
    }
  }
}


  /* ================================================================
     FALLING / PHYSICS
     ================================================================ */

  _updateFallingAnimation(
    emoji
  ) {

    const body =
      emoji.physicsBody;


    if (!body) {

      return;
    }


    emoji.x =
      body.x;


    emoji.y =
      body.y;


    emoji.rotation =
      body.rotation;


    emoji.scale = 1;
  }


  /* ================================================================
     RETURN ANIMATION
     ================================================================ */

  _updateFlyingBackAnimation(
    emoji,
    dtMs
  ) {

    const body =
      emoji.physicsBody;


    if (!body) {

      return;
    }


    /*
     * 1.15 second cinematic return.
     */

    emoji.flyProgress =
      Math.min(
        1,
        emoji.flyProgress +
        dtMs / 1150
      );


    const p =
      this._easeInOutBack(
        emoji.flyProgress
      );


    const startX =
      emoji.flyStartX;


    const startY =
      emoji.flyStartY;


    /*
     * Slight arc.
     */

    const arc =
      Math.sin(
        emoji.flyProgress *
        Math.PI
      ) *
      -90;


    emoji.x =
      startX +
      (
        emoji.originalX -
        startX
      ) *
      p;


    emoji.y =
      startY +
      (
        emoji.originalY -
        startY
      ) *
      p +
      arc *
      (1 - p);


    emoji.rotation =
      emoji.flyStartRotation *
      (1 - p);


    /*
     * Little bounce/pop near the cube.
     */

    const returnScale =
      1 +
      Math.sin(
        emoji.flyProgress *
        Math.PI
      ) *
      0.12;


    emoji.scale =
      returnScale;


    if (
      emoji.flyProgress >= 1
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


      if (
        this.emojis.every(
          item =>
            !item.isFlying
        )
      ) {

        this.isRecovering =
          false;
      }
    }
  }


  /* ================================================================
     EASING
     ================================================================ */

  _easeInOutBack(t) {

    const c1 =
      1.70158;


    const c2 =
      c1 * 1.525;


    if (
      t < 0.5
    ) {

      return (
        Math.pow(
          2 * t,
          2
        ) *
        (
          (
            c2 + 1
          ) *
          2 * t -
          c2
        )
      ) / 2;
    }


    return (
      Math.pow(
        2 * t - 2,
        2
      ) *
      (
        (
          c2 + 1
        ) *
        (t * 2 - 2) +
        c2
      ) +
      2
    ) / 2;
  }


  _easeOutBack(t) {

    const c1 =
      1.70158;


    const c3 =
      c1 + 1;


    return (
      1 +
      c3 *
      Math.pow(
        t - 1,
        3
      ) +
      c1 *
      Math.pow(
        t - 1,
        2
      )
    );
  }


  /* ================================================================
     NATIVE WEBP RENDER
     ================================================================ */

  _renderNativeEmoji(
    emoji
  ) {

    const element =
      emoji.element;


    if (!element) {

      return;
    }


    /*
     * Avoid unnecessary DOM writes.
     *
     * This is important for mobile performance.
     */

    const x =
      Math.round(
        emoji.x * 10
      ) / 10;


    const y =
      Math.round(
        emoji.y * 10
      ) / 10;


    const rotation =
      Math.round(
        emoji.rotation *
        1000
      ) / 1000;


    const scale =
      Math.round(
        (
          emoji.scale ||
          1
        ) *
        1000
      ) / 1000;


    const half =
      emoji.size / 2;


    /*
     * GPU-friendly transform.
     *
     * translate3d forces compositor layer.
     */

    const transform =
      `translate3d(${x - half}px, ${y - half}px, 0) ` +
      `rotate(${rotation}rad) ` +
      `scale(${scale})`;


    /*
     * Only write when changed.
     */

    if (
      element._lastTransform !==
      transform
    ) {

      element.style.transform =
        transform;


      element._lastTransform =
        transform;
    }


    const opacity =
      emoji.opacity ??
      1;


    if (
      element._lastOpacity !==
      opacity
    ) {

      element.style.opacity =
        opacity;


      element._lastOpacity =
        opacity;
    }
  }


  /* ================================================================
     RESIZE
     ================================================================ */

  _onWindowResize() {

    if (
      !this.app?.renderer
    ) {

      return;
    }


    this.width =
      window.innerWidth;


    this.height =
      window.innerHeight;


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
        Math.max(
          48,
          Math.min(
            75,
            this.height *
            0.085
          )
        );


      this.title.style.fontSize =
        Math.max(
          34,
          Math.min(
            58,
            this.width *
            0.045
          )
        );
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
        0.90;
    }
  }


  /* ================================================================
     CLEANUP
     ================================================================ */

  destroy() {

    console.log(
      '[Emoji World] Destroying...'
    );


    window.removeEventListener(
      'resize',
      this._resizeHandler
    );


    if (
      this.app
    ) {

      this.app.ticker.remove(
        this._boundUpdateFrame
      );
    }


    if (
      this.emojiLayer
    ) {

      this.emojiLayer.remove();
      this.emojiLayer = null;
    }


    if (
      this.app
    ) {

      this.app.destroy(
        true,
        {
          children: true,
          texture: false,
          textureSource: false
        }
      );

      this.app = null;
    }


    this.emojis = [];
    this.cubes = [];

    console.log(
      '[Emoji World] ✓ Destroyed'
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
        idleAmplitude: 10
      },

      {
        index: 1,
        name: 'Smile',
        idleType: 'tilt',
        mass: 1.1,
        idleSpeed: 0.045,
        idleAmplitude: 8
      },

      {
        index: 2,
        name: 'Grinning',
        idleType: 'pulse',
        mass: 0.8,
        idleSpeed: 0.070,
        idleAmplitude: 8,
        scaleAmount: 0.08
      },

      {
        index: 3,
        name: 'Laughing',
        idleType: 'playful',
        mass: 1.0,
        idleSpeed: 0.050,
        idleAmplitude: 7
      },

      {
        index: 4,
        name: 'Joy',
        idleType: 'bounce',
        mass: 0.9,
        idleSpeed: 0.065,
        idleAmplitude: 11
      },

      {
        index: 5,
        name: 'TearsOfJoy',
        idleType: 'sway',
        mass: 1.0,
        idleSpeed: 0.050,
        idleAmplitude: 8
      },

      {
        index: 6,
        name: 'ROFL',
        idleType: 'shake',
        mass: 0.9,
        idleSpeed: 0.060,
        idleAmplitude: 5
      },

      {
        index: 7,
        name: 'Cute',
        idleType: 'float',
        mass: 0.8,
        idleSpeed: 0.035,
        idleAmplitude: 9
      },

      {
        index: 8,
        name: 'Angry',
        idleType: 'vibrate',
        mass: 1.2,
        idleSpeed: 0.080,
        idleAmplitude: 3
      },

      {
        index: 9,
        name: 'Hug',
        idleType: 'pulse',
        mass: 1.0,
        idleSpeed: 0.045,
        idleAmplitude: 5,
        scaleAmount: 0.06
      },

      {
        index: 10,
        name: 'FacePalm',
        idleType: 'droop',
        mass: 1.1,
        idleSpeed: 0.040,
        idleAmplitude: 6
      },

      {
        index: 11,
        name: 'Pleading',
        idleType: 'bob',
        mass: 0.85,
        idleSpeed: 0.050,
        idleAmplitude: 8
      },

      {
        index: 12,
        name: 'Blossom',
        idleType: 'sway',
        mass: 0.9,
        idleSpeed: 0.045,
        idleAmplitude: 7
      },

      {
        index: 13,
        name: 'Purple',
        idleType: 'float',
        mass: 1.0,
        idleSpeed: 0.040,
        idleAmplitude: 8
      },

      {
        index: 14,
        name: 'Ghost',
        idleType: 'float',
        mass: 0.8,
        idleSpeed: 0.030,
        idleAmplitude: 12
      },

      {
        index: 15,
        name: 'Nerd',
        idleType: 'twitch',
        mass: 0.9,
        idleSpeed: 0.070,
        idleAmplitude: 4
      },

      {
        index: 16,
        name: 'Surprised',
        idleType: 'bounce',
        mass: 0.95,
        idleSpeed: 0.065,
        idleAmplitude: 10
      },

      {
        index: 17,
        name: 'Cold',
        idleType: 'shiver',
        mass: 1.05,
        idleSpeed: 0.075,
        idleAmplitude: 3
      },

      {
        index: 18,
        name: 'Melting',
        idleType: 'droop',
        mass: 1.0,
        idleSpeed: 0.040,
        idleAmplitude: 6
      },

      {
        index: 19,
        name: 'Grinning',
        idleType: 'bounce',
        mass: 0.9,
        idleSpeed: 0.060,
        idleAmplitude: 9
      },

      {
        index: 20,
        name: 'Plain',
        idleType: 'drift',
        mass: 0.95,
        idleSpeed: 0.035,
        idleAmplitude: 5
      },

      {
        index: 21,
        name: 'Peek',
        idleType: 'tilt',
        mass: 1.0,
        idleSpeed: 0.050,
        idleAmplitude: 6
      },

      {
        index: 22,
        name: 'Neutral',
        idleType: 'sway',
        mass: 1.08,
        idleSpeed: 0.038,
        idleAmplitude: 4
      },

      {
        index: 23,
        name: 'SlightSmile',
        idleType: 'drift',
        mass: 0.92,
        idleSpeed: 0.045,
        idleAmplitude: 6
      }
    ];
  }
}