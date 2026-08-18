/**
 * ============================================================
 * THE EMOJIS
 * Main PixiJS 8 World
 * ============================================================
 *
 * Features:
 * - PixiJS 8 / WebGL
 * - 24 WebP emoji characters
 * - Responsive desktop/mobile grid
 * - Glass platform under every emoji
 * - Individual idle animations
 * - Cursor proximity interaction
 * - Mobile gyroscope tilt
 * - Mobile shake detection
 * - Physics fall
 * - Smooth fly-back animation
 * - Mobile performance optimizations
 *
 * Assets:
 * /public/assets/emojis/512 (1).webp
 * ...
 * /public/assets/emojis/512 (24).webp
 * ============================================================
 */

import * as PIXI from 'pixi.js';
import { Physics } from './physics.js';
import { GyroHandler } from './gyro.js';


export class EmojiWorld {

    /* ========================================================
       CONSTRUCTOR
       ======================================================== */

    constructor(canvasElement, options = {}) {

        this.canvas =
            canvasElement;

        this.options =
            options;

        this.width =
            window.innerWidth;

        this.height =
            window.innerHeight;

        /* ----------------------------------------------------
           PixiJS
        ---------------------------------------------------- */

        this.app = null;

        this.ready =
            this._init();

        /* ----------------------------------------------------
           Containers
        ---------------------------------------------------- */

        this.backgroundContainer =
            null;

        this.cubesContainer =
            null;

        this.emojisContainer =
            null;

        this.titleContainer =
            null;

        /* ----------------------------------------------------
           Objects
        ---------------------------------------------------- */

        this.emojis = [];

        this.cubes = [];

        /* ----------------------------------------------------
           Physics
        ---------------------------------------------------- */

        this.physics =
            null;

        /* ----------------------------------------------------
           Gyroscope
        ---------------------------------------------------- */

        this.gyro =
            new GyroHandler();

        this.permissionRequested =
            false;

        /* ----------------------------------------------------
           Cursor
        ---------------------------------------------------- */

        this.pointer = {
            x: this.width / 2,
            y: this.height / 2,

            active: false
        };

        /* ----------------------------------------------------
           Animation
        ---------------------------------------------------- */

        this.elapsed =
            0;

        this.isShaking =
            false;

        this.isRecovering =
            false;

        this.returnTimer =
            0;

        /* ----------------------------------------------------
           Responsive
        ---------------------------------------------------- */

        this.resizeHandler =
            () => this._onResize();

        /* ----------------------------------------------------
           Performance
        ---------------------------------------------------- */

        this.isMobile =
            this._isMobile();

        this.isPageVisible =
            true;

        this.frameCounter =
            0;

        /* ----------------------------------------------------
           Config
        ---------------------------------------------------- */

        this.emojiConfigs =
            this._getEmojiConfigs();
    }


    /* ========================================================
       INITIALIZATION
       ======================================================== */

    async _init() {

        try {

            console.log(
                '[Emoji World] Initializing...'
            );

            await this._createPixiApp();

            console.log(
                '[Emoji World] ✓ PixiJS initialized'
            );

            await this._loadAssets();

            console.log(
                '[Emoji World] ✓ 24 emoji assets loaded'
            );

            this._setupScene();

            console.log(
                '[Emoji World] ✓ Scene created'
            );

            this._setupPointerEvents();

            this._setupGyro();

            this._startAnimationLoop();

            console.log(
                '[Emoji World] ✓ Animation started'
            );

            console.log(
                '✨ The Emojis is ready!'
            );

            return this;

        } catch (error) {

            console.error(
                '[Emoji World] Initialization failed:',
                error
            );

            throw error;
        }
    }


    /* ========================================================
       PIXI APPLICATION
       ======================================================== */

    async _createPixiApp() {

        /*
         * PixiJS 8:
         *
         * 1. new Application()
         * 2. await app.init(...)
         *
         * DO NOT use Application.create().
         */

        this.app =
            new PIXI.Application();

        await this.app.init({

            /*
             * Use the existing canvas.
             */
            canvas:
                this.canvas,

            width:
                this.width,

            height:
                this.height,

            /*
             * White CSS background should
             * remain visible.
             */
            backgroundAlpha:
                0,

            antialias:
                !this.isMobile,

            autoDensity:
                true,

            /*
             * Limit DPR for mobile GPU load.
             */
            resolution:
                this._getRenderResolution(),

            /*
             * Prefer WebGL.
             */
            preference:
                'webgl',

            powerPreference:
                'high-performance',

            /*
             * Do not create another ticker.
             */
            sharedTicker:
                false
        });

        if (!this.app) {

            throw new Error(
                'PixiJS Application was not created.'
            );
        }

        if (!this.app.canvas) {

            throw new Error(
                'PixiJS canvas is unavailable.'
            );
        }

        if (!this.app.stage) {

            throw new Error(
                'PixiJS stage is unavailable.'
            );
        }

        if (!this.app.renderer) {

            throw new Error(
                'PixiJS renderer is unavailable.'
            );
        }

        /*
         * Ensure canvas fills viewport.
         */
        this.app.canvas.style.display =
            'block';

        this.app.canvas.style.width =
            '100%';

        this.app.canvas.style.height =
            '100%';

        this.app.canvas.style.position =
            'absolute';

        this.app.canvas.style.inset =
            '0';

        /*
         * Pixi owns the canvas now.
         */
        this.canvas =
            this.app.canvas;

        /*
         * Resize listener.
         */
        window.addEventListener(
            'resize',
            this.resizeHandler,
            {
                passive: true
            }
        );
    }


    /* ========================================================
       RENDER RESOLUTION
       ======================================================== */

    _getRenderResolution() {

        const dpr =
            window.devicePixelRatio || 1;

        /*
         * Snapdragon-class phones:
         *
         * Do not render a 3x/4x framebuffer.
         *
         * This is one of the biggest GPU
         * savings for mobile.
         */

        if (this.isMobile) {

            return Math.min(
                dpr,
                1.25
            );
        }

        return Math.min(
            dpr,
            1.5
        );
    }


    /* ========================================================
       DEVICE DETECTION
       ======================================================== */

    _isMobile() {

        const ua =
            navigator.userAgent ||
            '';

        return (
            /Android/i.test(ua) ||
            /iPhone|iPad|iPod/i.test(ua) ||
            window.matchMedia(
                '(pointer: coarse)'
            ).matches
        );
    }


    /* ========================================================
       ASSET LOADING
       ======================================================== */

    async _loadAssets() {

        const assets = [];

        for (
            let i = 1;
            i <= 24;
            i++
        ) {

            assets.push({

                alias:
                    `emoji${i}`,

                /*
                 * Assets are expected inside:
                 *
                 * public/assets/emojis/
                 */
                src:
                    `/assets/emojis/512 (${i}).webp`
            });
        }

        try {

            await PIXI.Assets.load(
                assets
            );

        } catch (error) {

            console.error(
                '[Emoji World] Asset loading failed:',
                error
            );

            throw error;
        }

        /*
         * Verify every texture.
         */
        for (
            let i = 1;
            i <= 24;
            i++
        ) {

            const texture =
                PIXI.Assets.get(
                    `emoji${i}`
                );

            if (!texture) {

                throw new Error(
                    `Emoji texture ${i} was not found.`
                );
            }
        }
    }


    /* ========================================================
       SCENE
       ======================================================== */

    _setupScene() {

        /*
         * Containers.
         */

        this.backgroundContainer =
            new PIXI.Container();

        this.cubesContainer =
            new PIXI.Container();

        this.emojisContainer =
            new PIXI.Container();

        this.titleContainer =
            new PIXI.Container();

        /*
         * Sorting.
         */

        this.cubesContainer.sortableChildren =
            true;

        this.emojisContainer.sortableChildren =
            true;

        this.titleContainer.sortableChildren =
            true;

        /*
         * Add to stage.
         */

        this.app.stage.addChild(
            this.backgroundContainer
        );

        this.app.stage.addChild(
            this.cubesContainer
        );

        this.app.stage.addChild(
            this.emojisContainer
        );

        this.app.stage.addChild(
            this.titleContainer
        );

        /*
         * Title.
         */

        this._createTitle();

        /*
         * Physics.
         */

        this.physics =
            new Physics({

                width:
                    this.width,

                height:
                    this.height,

                groundLevel:
                    this.height * 0.88,

                gravity:
                    0.62,

                friction:
                    0.985,

                bounce:
                    0.48
            });

        /*
         * Emojis.
         */

        this._createEmojis();

        console.log(
            `[Emoji World] ✓ ${this.emojis.length} emojis`
        );
    }


    /* ========================================================
       TITLE
       ======================================================== */

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
                        0x161616,

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

        title.zIndex =
            100;

        this.titleContainer.addChild(
            title
        );

        this.title =
            title;
    }


    _getTitleSize() {

        if (
            this.width < 400
        ) {

            return 30;
        }

        if (
            this.width < 700
        ) {

            return 36;
        }

        return Math.min(
            48,
            this.width * 0.045
        );
    }


    _getTitleY() {

        return Math.max(
            42,
            Math.min(
                65,
                this.height * 0.065
            )
        );
    }


    /* ========================================================
       EMOJI LAYOUT
       ======================================================== */

    _createEmojis() {

        /*
         * Mobile:
         *
         * 4 x 6
         *
         * Desktop:
         *
         * 6 x 4
         */

        const mobile =
            this.width < 700;

        const cols =
            mobile
                ? 4
                : 6;

        const rows =
            Math.ceil(
                24 / cols
            );

        /*
         * Grid region.
         */

        const sidePadding =
            mobile
                ? 20
                : 55;

        const top =
            mobile
                ? 105
                : 115;

        const bottom =
            mobile
                ? this.height - 35
                : this.height - 45;

        const availableWidth =
            Math.max(
                200,
                this.width -
                sidePadding * 2
            );

        const availableHeight =
            Math.max(
                250,
                bottom - top
            );

        /*
         * Cell spacing.
         */

        const horizontalSpacing =
            availableWidth /
            Math.max(
                1,
                cols - 1
            );

        const verticalSpacing =
            availableHeight /
            Math.max(
                1,
                rows - 1
            );

        const spacing =
            Math.min(
                horizontalSpacing,
                verticalSpacing
            );

        /*
         * Grid dimensions.
         */

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

        /*
         * Emoji size.
         *
         * Smaller on mobile.
         */

        const emojiSize =
            mobile
                ? Math.max(
                    48,
                    Math.min(
                        76,
                        spacing * 0.58
                    )
                )
                : Math.max(
                    62,
                    Math.min(
                        96,
                        spacing * 0.58
                    )
                );

        /*
         * Glass platform size.
         */

        const platformWidth =
            mobile
                ? Math.max(
                    48,
                    Math.min(
                        72,
                        spacing * 0.58
                    )
                )
                : Math.max(
                    58,
                    Math.min(
                        92,
                        spacing * 0.60
                    )
                );

        const platformHeight =
            platformWidth * 0.26;

        /*
         * Create 24 emojis.
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

            const baseY =
                startY +
                row * spacing;

            const config =
                this.emojiConfigs[i];

            /*
             * Platform is below emoji.
             */
            const platformY =
                baseY +
                emojiSize * 0.46;

            /*
             * Create platform.
             */

            const cube =
                this._createGlassPlatform(
                    x,
                    platformY,
                    platformWidth,
                    platformHeight
                );

            cube.zIndex =
                1;

            this.cubesContainer.addChild(
                cube
            );

            this.cubes.push({
                sprite:
                    cube,

                x:
                    x,

                y:
                    platformY
            });

            /*
             * Load texture.
             */

            const texture =
                PIXI.Assets.get(
                    `emoji${i + 1}`
                );

            /*
             * Create sprite.
             */

            const emoji =
                new PIXI.Sprite(
                    texture
                );

            emoji.anchor.set(
                0.5
            );

            /*
             * Explicit dimensions.
             *
             * Avoid scale 0.4 because
             * 512px assets become ~205px.
             */
            emoji.width =
                emojiSize;

            emoji.height =
                emojiSize;

            emoji._baseWidth =
                emojiSize;

            emoji._baseHeight =
                emojiSize;

            /*
             * Home position.
             */

            emoji.x =
                x;

            emoji.y =
                baseY;

            emoji.originalX =
                x;

            emoji.originalY =
                baseY;

            /*
             * Animation state.
             */

            emoji.config =
                config;

            emoji.idleTime =
                Math.random() *
                Math.PI *
                2;

            emoji.idlePhase =
                Math.random() *
                Math.PI *
                2;

            emoji.isFlying =
                false;

            emoji.flyProgress =
                0;

            emoji.alpha =
                1;

            emoji.rotation =
                0;

            emoji.zIndex =
                10;

            /*
             * Add to scene.
             */

            this.emojisContainer.addChild(
                emoji
            );

            this.emojis.push(
                emoji
            );

            /*
             * Physics body.
             *
             * IMPORTANT:
             * inactive until shake.
             */
            const body =
                this.physics.createBody({

                    x:
                        emoji.x,

                    y:
                        emoji.y,

                    mass:
                        config.mass,

                    radius:
                        emojiSize * 0.40,

                    isActive:
                        false
                });

            emoji.physicsBody =
                body;
        }
    }


    /* ========================================================
       GLASS PLATFORM
       ======================================================== */

    _createGlassPlatform(
        x,
        y,
        width,
        height
    ) {

        const group =
            new PIXI.Container();

        /*
         * Soft shadow.
         */

        const shadow =
            new PIXI.Graphics()
                .ellipse(
                    0,
                    height * 0.75,
                    width * 0.50,
                    height * 0.48
                )
                .fill({
                    color:
                        0x000000,

                    alpha:
                        0.09
                });

        /*
         * Glass base.
         */

        const glass =
            new PIXI.Graphics()
                .roundRect(
                    -width / 2,
                    -height / 2,
                    width,
                    height,
                    height * 0.45
                )
                .fill({
                    color:
                        0xffffff,

                    alpha:
                        0.76
                })
                .stroke({
                    color:
                        0xd9e5ec,

                    alpha:
                        0.90,

                    width:
                        1
                });

        /*
         * Glass highlight.
         */

        const highlight =
            new PIXI.Graphics()
                .roundRect(
                    -width * 0.37,
                    -height * 0.30,
                    width * 0.74,
                    height * 0.20,
                    height * 0.12
                )
                .fill({
                    color:
                        0xffffff,

                    alpha:
                        0.90
                });

        /*
         * Bottom reflection.
         */

        const reflection =
            new PIXI.Graphics()
                .ellipse(
                    0,
                    height * 0.08,
                    width * 0.32,
                    height * 0.13
                )
                .fill({
                    color:
                        0xcbdce8,

                    alpha:
                        0.22
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

        group.addChild(
            reflection
        );

        group.x =
            x;

        group.y =
            y;

        group.alpha =
            0.95;

        return group;
    }


    /* ========================================================
       POINTER EVENTS
       ======================================================== */

    _setupPointerEvents() {

        /*
         * Pointer Events cover:
         *
         * mouse
         * touch
         * pen
         */

        document.addEventListener(
            'pointermove',
            (event) => {

                this.pointer.x =
                    event.clientX;

                this.pointer.y =
                    event.clientY;

                this.pointer.active =
                    true;
            },
            {
                passive: true
            }
        );

        document.addEventListener(
            'pointerleave',
            () => {

                this.pointer.active =
                    false;
            },
            {
                passive: true
            }
        );

        document.addEventListener(
            'pointerdown',
            (event) => {

                this.pointer.x =
                    event.clientX;

                this.pointer.y =
                    event.clientY;

                this.pointer.active =
                    true;

                /*
                 * iOS motion permission must
                 * be requested after a gesture.
                 */
                this._requestGyroPermission();
            },
            {
                passive: true
            }
        );

        document.addEventListener(
            'pointerup',
            () => {

                /*
                 * Keep pointer active on desktop.
                 *
                 * Touch interaction naturally
                 * stops being relevant when the
                 * finger leaves the screen.
                 */
            },
            {
                passive: true
            }
        );
    }


    /* ========================================================
       GYROSCOPE
       ======================================================== */

    _setupGyro() {

        /*
         * gyro.js owns the actual sensor listeners.
         *
         * Do NOT create additional
         * deviceorientation/devicemotion
         * listeners here.
         */

        console.log(
            '[Emoji World] Gyroscope ready.'
        );
    }


    async _requestGyroPermission() {

        if (
            this.permissionRequested
        ) {
            return;
        }

        this.permissionRequested =
            true;

        try {

            await this.gyro.requestPermission();

            console.log(
                '[Emoji World] ✓ Motion sensors enabled'
            );

        } catch (error) {

            console.warn(
                '[Emoji World] Motion sensor permission unavailable:',
                error
            );
        }
    }


    /* ========================================================
       GYROSCOPE VISUAL EFFECT
       ======================================================== */

    _updateGyroVisuals() {

        if (
            this.isShaking ||
            this.isRecovering ||
            !this.gyro.enabled
        ) {
            return;
        }

        const tilt =
            this.gyro.getTilt();

        /*
         * Keep tilt subtle.
         *
         * Large movement looks unnatural
         * and can be uncomfortable.
         */

        const offsetX =
            tilt.x *
            (
                this.isMobile
                    ? 8
                    : 5
            );

        const offsetY =
            tilt.y *
            (
                this.isMobile
                    ? 6
                    : 4
            );

        for (
            let i = 0;
            i < this.emojis.length;
            i++
        ) {

            const emoji =
                this.emojis[i];

            if (
                emoji.isFlying
            ) {
                continue;
            }

            /*
             * Slight parallax.
             */
            emoji._gyroX =
                offsetX;

            emoji._gyroY =
                offsetY;
        }
    }


    /* ========================================================
       SHAKE
       ======================================================== */

    _checkShake() {

        if (
            this.isShaking ||
            this.isRecovering
        ) {
            return;
        }

        if (
            !this.gyro.enabled
        ) {
            return;
        }

        if (
            this.gyro.pollShake()
        ) {

            this._onShakeDetected();
        }
    }


    _onShakeDetected() {

        if (
            this.isShaking ||
            this.isRecovering
        ) {
            return;
        }

        this.isShaking =
            true;

        this.returnTimer =
            1900;

        console.log(
            '📱 SHAKE DETECTED!'
        );

        console.log(
            '🌪️ Emojis falling...'
        );

        /*
         * Activate physics.
         */

        for (
            let i = 0;
            i < this.emojis.length;
            i++
        ) {

            const emoji =
                this.emojis[i];

            const body =
                emoji.physicsBody;

            emoji.isFlying =
                true;

            /*
             * Start physics from
             * current visual position.
             */

            body.x =
                emoji.x;

            body.y =
                emoji.y;

            /*
             * Activate.
             */

            body.isActive =
                true;

            body.isResting =
                false;

            body.restTimer =
                0;

            /*
             * Strong upward impulse.
             */

            body.vy =
                -10 -
                Math.random() * 7;

            /*
             * Random horizontal movement.
             */

            body.vx =
                (
                    Math.random() -
                    0.5
                ) * 10;

            /*
             * Rotation.
             */

            body.angularVelocity =
                (
                    Math.random() -
                    0.5
                ) * 0.55;
        }
    }


    /* ========================================================
       RETURN ANIMATION
       ======================================================== */

    _startReturnAnimation() {

        if (
            this.isRecovering
        ) {
            return;
        }

        this.isRecovering =
            true;

        this.isShaking =
            false;

        /*
         * Stop physics.
         *
         * The emojis now become
         * animation-controlled.
         */

        if (
            this.physics
        ) {

            this.physics.deactivateAll();
        }

        for (
            let i = 0;
            i < this.emojis.length;
            i++
        ) {

            const emoji =
                this.emojis[i];

            emoji.isFlying =
                true;

            emoji.flyProgress =
                0;
        }

        console.log(
            '✨ Emojis flying back home...'
        );
    }


    /* ========================================================
       ANIMATION LOOP
       ======================================================== */

    _startAnimationLoop() {

        /*
         * Use PixiJS's own ticker.
         *
         * Do NOT create a second PIXI.Ticker.
         */

        this.app.ticker.add(
            this._updateFrame,
            this
        );
    }


    _updateFrame(ticker) {

        /*
         * Completely pause work while
         * browser page is hidden.
         */

        if (
            !this.isPageVisible
        ) {
            return;
        }

        /*
         * Real milliseconds.
         */

        const deltaMs =
            Math.min(
                ticker.deltaMS || 16.67,
                50
            );

        /*
         * Frame-normalized value.
         *
         * 1 = approximately 60 FPS.
         */

        const deltaFrames =
            ticker.deltaTime || 1;

        this.elapsed +=
            deltaMs;

        /*
         * Shake detection.
         *
         * Sensor work is lightweight.
         */

        this._checkShake();

        /*
         * Gyro parallax.
         */

        this._updateGyroVisuals();

        /*
         * Shake countdown.
         */

        if (
            this.isShaking &&
            !this.isRecovering
        ) {

            this.returnTimer -=
                deltaMs;

            if (
                this.returnTimer <= 0
            ) {

                this._startReturnAnimation();
            }
        }

        /*
         * Physics only while
         * emojis are falling.
         */

        if (
            this.physics &&
            this.isShaking
        ) {

            this.physics.update(
                deltaMs
            );
        }

        /*
         * Update every emoji.
         */

        for (
            let i = 0;
            i < this.emojis.length;
            i++
        ) {

            const emoji =
                this.emojis[i];

            if (
                emoji.isFlying
            ) {

                if (
                    this.isRecovering
                ) {

                    this._updateReturnAnimation(
                        emoji,
                        deltaMs
                    );

                } else {

                    this._updateFallingAnimation(
                        emoji
                    );
                }

            } else {

                this._updateIdleAnimation(
                    emoji,
                    deltaFrames
                );
            }
        }
    }


    /* ========================================================
       IDLE ANIMATION
       ======================================================== */

    _updateIdleAnimation(
        emoji,
        deltaFrames
    ) {

        const config =
            emoji.config;

        /*
         * Individual phase.
         */

        emoji.idleTime +=
            config.idleSpeed *
            deltaFrames;

        const time =
            emoji.idleTime;

        const phase =
            emoji.idlePhase;

        const amplitude =
            config.idleAmplitude;

        /*
         * Start from home.
         */

        let x =
            emoji.originalX;

        let y =
            emoji.originalY;

        let rotation =
            0;

        let scale =
            1;

        /*
         * ----------------------------------------------------
         * Individual personalities
         * ----------------------------------------------------
         */

        switch (
            config.idleType
        ) {

            case 'bounce':

                y +=
                    Math.sin(
                        time +
                        phase
                    ) *
                    amplitude;

                break;


            case 'tilt':

                rotation =
                    Math.sin(
                        time +
                        phase
                    ) *
                    0.08;

                y +=
                    Math.cos(
                        time * 1.2 +
                        phase
                    ) *
                    amplitude *
                    0.45;

                break;


            case 'pulse':

                scale =
                    1 +
                    Math.sin(
                        time +
                        phase
                    ) *
                    0.055;

                break;


            case 'sway':

                x +=
                    Math.sin(
                        time +
                        phase
                    ) *
                    amplitude *
                    0.40;

                rotation =
                    Math.sin(
                        time * 0.7 +
                        phase
                    ) *
                    0.06;

                break;


            case 'bob':

                y +=
                    Math.sin(
                        time * 1.3 +
                        phase
                    ) *
                    amplitude *
                    0.65;

                break;


            case 'vibrate':

                x +=
                    Math.sin(
                        time * 7 +
                        phase
                    ) *
                    amplitude *
                    0.15;

                break;


            case 'spin':

                rotation =
                    Math.sin(
                        time * 0.55 +
                        phase
                    ) *
                    0.10;

                break;


            case 'drift':

                x +=
                    Math.sin(
                        time * 0.65 +
                        phase
                    ) *
                    amplitude *
                    0.45;

                y +=
                    Math.cos(
                        time * 0.5 +
                        phase
                    ) *
                    amplitude *
                    0.45;

                break;


            case 'tremble':

                rotation =
                    Math.sin(
                        time * 8 +
                        phase
                    ) *
                    0.025;

                break;


            case 'float':

                y +=
                    Math.sin(
                        time * 0.65 +
                        phase
                    ) *
                    amplitude;

                scale =
                    1 +
                    Math.sin(
                        time * 0.5 +
                        phase
                    ) *
                    0.025;

                break;


            case 'droop':

                y +=
                    Math.cos(
                        time * 0.8 +
                        phase
                    ) *
                    amplitude *
                    0.40;

                rotation =
                    Math.sin(
                        time * 0.45 +
                        phase
                    ) *
                    0.06;

                break;


            case 'twitch':

                x +=
                    Math.sin(
                        time * 3.8 +
                        phase
                    ) *
                    amplitude *
                    0.15;

                break;


            case 'shake':

                x +=
                    Math.sin(
                        time * 2.8 +
                        phase
                    ) *
                    amplitude *
                    0.28;

                y +=
                    Math.cos(
                        time * 2.2 +
                        phase
                    ) *
                    amplitude *
                    0.18;

                break;


            case 'playful':

                y +=
                    Math.sin(
                        time * 1.8 +
                        phase
                    ) *
                    amplitude *
                    0.45;

                rotation =
                    Math.sin(
                        time * 1.4 +
                        phase
                    ) *
                    0.10;

                scale =
                    1 +
                    Math.sin(
                        time * 1.8 +
                        phase
                    ) *
                    0.035;

                break;


            case 'shiver':

                x +=
                    Math.sin(
                        time * 8 +
                        phase
                    ) *
                    amplitude *
                    0.12;

                y +=
                    Math.cos(
                        time * 9 +
                        phase
                    ) *
                    amplitude *
                    0.08;

                break;


            default:

                break;
        }

        /*
         * Gyroscope parallax.
         */

        x +=
            emoji._gyroX || 0;

        y +=
            emoji._gyroY || 0;

        /*
         * Cursor interaction.
         */

        const interaction =
            this._getCursorInteraction(
                x,
                y
            );

        if (
            interaction.active
        ) {

            /*
             * Move slightly away from
             * cursor.
             */

            x +=
                interaction.pushX;

            y +=
                interaction.pushY;

            /*
             * Slight tilt.
             */

            rotation +=
                interaction.rotation;

            /*
             * Slight scale increase.
             */

            scale *=
                interaction.scale;
        }

        /*
         * Smooth position.
         *
         * This prevents choppy movement.
         */

        const smoothing =
            this.isMobile
                ? 0.18
                : 0.22;

        emoji.x +=
            (
                x -
                emoji.x
            ) *
            smoothing;

        emoji.y +=
            (
                y -
                emoji.y
            ) *
            smoothing;

        emoji.rotation +=
            (
                rotation -
                emoji.rotation
            ) *
            0.12;

        /*
         * Smooth scale.
         */

        const targetWidth =
            emoji._baseWidth *
            scale;

        const targetHeight =
            emoji._baseHeight *
            scale;

        emoji.width +=
            (
                targetWidth -
                emoji.width
            ) *
            0.12;

        emoji.height +=
            (
                targetHeight -
                emoji.height
            ) *
            0.12;
    }


    /* ========================================================
       CURSOR INTERACTION
       ======================================================== */

    _getCursorInteraction(
        x,
        y
    ) {

        if (
            !this.pointer.active
        ) {

            return {
                active: false,
                pushX: 0,
                pushY: 0,
                rotation: 0,
                scale: 1
            };
        }

        const dx =
            x -
            this.pointer.x;

        const dy =
            y -
            this.pointer.y;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        const range =
            this.isMobile
                ? 130
                : 180;

        if (
            distance >= range ||
            distance <= 0.001
        ) {

            return {
                active: false,
                pushX: 0,
                pushY: 0,
                rotation: 0,
                scale: 1
            };
        }

        const proximity =
            1 -
            distance / range;

        /*
         * Soft push away.
         */

        const push =
            proximity *
            (
                this.isMobile
                    ? 4
                    : 7
            );

        return {

            active: true,

            pushX:
                (
                    dx /
                    distance
                ) *
                push,

            pushY:
                (
                    dy /
                    distance
                ) *
                push,

            rotation:
                (
                    dx /
                    range
                ) *
                0.04 *
                proximity,

            scale:
                1 +
                proximity *
                0.055
        };
    }


    /* ========================================================
       FALLING
       ======================================================== */

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
    }


    /* ========================================================
       FLY BACK TO PLATFORM
       ======================================================== */

    _updateReturnAnimation(
        emoji,
        deltaMs
    ) {

        /*
         * 900ms return duration.
         */

        emoji.flyProgress =
            Math.min(
                1,
                emoji.flyProgress +
                deltaMs /
                900
            );

        const progress =
            emoji.flyProgress;

        /*
         * Smooth cinematic easing.
         */

        const eased =
            this._easeOutBack(
                progress
            );

        const body =
            emoji.physicsBody;

        /*
         * Current physics position.
         */

        const startX =
            body.x;

        const startY =
            body.y;

        /*
         * Home.
         */

        const homeX =
            emoji.originalX;

        const homeY =
            emoji.originalY;

        /*
         * Fly back.
         */

        emoji.x =
            startX +
            (
                homeX -
                startX
            ) *
            eased;

        emoji.y =
            startY +
            (
                homeY -
                startY
            ) *
            eased;

        /*
         * Rotate while flying.
         */

        const rotationAmount =
            body.rotation *
            (
                1 -
                eased
            );

        emoji.rotation =
            rotationAmount;

        /*
         * Small scale effect near
         * landing.
         */

        const landingScale =
            progress < 0.75
                ? 1
                : 1 +
                    (
                        0.06 *
                        Math.sin(
                            (
                                progress -
                                0.75
                            ) *
                            Math.PI *
                            4
                        )
                    );

        emoji.width =
            emoji._baseWidth *
            landingScale;

        emoji.height =
            emoji._baseHeight *
            landingScale;

        /*
         * Finished.
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

            emoji.width =
                emoji._baseWidth;

            emoji.height =
                emoji._baseHeight;

            /*
             * Reset physics body.
             */

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

            body.rotation =
                0;

            body.isActive =
                false;

            body.isResting =
                true;

            /*
             * Check whether all emojis
             * have returned.
             */

            if (
                this.emojis.every(
                    item =>
                        !item.isFlying
                )
            ) {

                this.isRecovering =
                    false;

                console.log(
                    '🏠 All emojis are back home.'
                );
            }
        }
    }


    /* ========================================================
       EASING
       ======================================================== */

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


    /* ========================================================
       PAGE VISIBILITY
       ======================================================== */

    setPageVisibility(
        visible
    ) {

        this.isPageVisible =
            visible;

        if (
            !this.app ||
            !this.app.ticker
        ) {
            return;
        }

        if (
            visible
        ) {

            this.app.ticker.start();

        } else {

            this.app.ticker.stop();
        }
    }


    /* ========================================================
       RESIZE
       ======================================================== */

    _onResize() {

        if (
            !this.app ||
            !this.app.renderer
        ) {
            return;
        }

        const oldWidth =
            this.width;

        const oldHeight =
            this.height;

        this.width =
            window.innerWidth;

        this.height =
            window.innerHeight;

        /*
         * Ignore tiny resize events.
         */

        if (
            oldWidth ===
                this.width &&
            oldHeight ===
                this.height
        ) {
            return;
        }

        /*
         * Resize renderer.
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
         * Update physics bounds.
         */

        if (
            this.physics
        ) {

            this.physics.resize(
                this.width,
                this.height,
                this.height *
                    0.88
            );
        }

        /*
         * Recalculate emoji home
         * positions.
         *
         * This prevents a desktop grid
         * from remaining after rotation
         * to mobile landscape.
         */

        this._recalculateLayout();
    }


    /* ========================================================
       RESPONSIVE LAYOUT
       ======================================================== */

    _recalculateLayout() {

        if (
            !this.emojis.length
        ) {
            return;
        }

        /*
         * Do not rearrange emojis while
         * they are falling.
         */

        if (
            this.isShaking ||
            this.isRecovering
        ) {
            return;
        }

        const mobile =
            this.width < 700;

        const cols =
            mobile
                ? 4
                : 6;

        const rows =
            Math.ceil(
                24 / cols
            );

        const sidePadding =
            mobile
                ? 20
                : 55;

        const top =
            mobile
                ? 105
                : 115;

        const bottom =
            mobile
                ? this.height - 35
                : this.height - 45;

        const availableWidth =
            Math.max(
                200,
                this.width -
                sidePadding * 2
            );

        const availableHeight =
            Math.max(
                250,
                bottom - top
            );

        const horizontalSpacing =
            availableWidth /
            Math.max(
                1,
                cols - 1
            );

        const verticalSpacing =
            availableHeight /
            Math.max(
                1,
                rows - 1
            );

        const spacing =
            Math.min(
                horizontalSpacing,
                verticalSpacing
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
            mobile
                ? Math.max(
                    48,
                    Math.min(
                        76,
                        spacing * 0.58
                    )
                )
                : Math.max(
                    62,
                    Math.min(
                        96,
                        spacing * 0.58
                    )
                );

        for (
            let i = 0;
            i < this.emojis.length;
            i++
        ) {

            const emoji =
                this.emojis[i];

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

            const platformY =
                y +
                emojiSize *
                0.46;

            emoji.originalX =
                x;

            emoji.originalY =
                y;

            emoji._baseWidth =
                emojiSize;

            emoji._baseHeight =
                emojiSize;

            /*
             * Smoothly move to new layout.
             */

            emoji.x =
                x;

            emoji.y =
                y;

            emoji.width =
                emojiSize;

            emoji.height =
                emojiSize;

            /*
             * Move platform.
             */

            if (
                this.cubes[i]
            ) {

                this.cubes[i].x =
                    x;

                this.cubes[i].y =
                    platformY;

                this.cubes[i].sprite.x =
                    x;

                this.cubes[i].sprite.y =
                    platformY;
            }

            /*
             * Physics home.
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
    }


    /* ========================================================
       EMOJI CONFIGURATION
       ======================================================== */

    _getEmojiConfigs() {

        return [

            {
                name: 'Happy',
                idleType: 'bounce',
                mass: 0.90,
                idleSpeed: 0.020,
                idleAmplitude: 6
            },

            {
                name: 'Cool',
                idleType: 'tilt',
                mass: 1.05,
                idleSpeed: 0.014,
                idleAmplitude: 5
            },

            {
                name: 'Love',
                idleType: 'pulse',
                mass: 0.85,
                idleSpeed: 0.025,
                idleAmplitude: 6
            },

            {
                name: 'Awestruck',
                idleType: 'sway',
                mass: 1.00,
                idleSpeed: 0.015,
                idleAmplitude: 6
            },

            {
                name: 'Thinking',
                idleType: 'bob',
                mass: 1.05,
                idleSpeed: 0.018,
                idleAmplitude: 6
            },

            {
                name: 'Angry',
                idleType: 'vibrate',
                mass: 1.15,
                idleSpeed: 0.035,
                idleAmplitude: 4
            },

            {
                name: 'Party',
                idleType: 'spin',
                mass: 0.90,
                idleSpeed: 0.012,
                idleAmplitude: 3
            },

            {
                name: 'Smirk',
                idleType: 'tilt',
                mass: 1.00,
                idleSpeed: 0.016,
                idleAmplitude: 5
            },

            {
                name: 'Sleepy',
                idleType: 'drift',
                mass: 0.95,
                idleSpeed: 0.009,
                idleAmplitude: 4
            },

            {
                name: 'Shocked',
                idleType: 'bounce',
                mass: 1.05,
                idleSpeed: 0.027,
                idleAmplitude: 7
            },

            {
                name: 'Scared',
                idleType: 'tremble',
                mass: 0.85,
                idleSpeed: 0.024,
                idleAmplitude: 3
            },

            {
                name: 'Relaxed',
                idleType: 'sway',
                mass: 1.00,
                idleSpeed: 0.011,
                idleAmplitude: 5
            },

            {
                name: 'Angel',
                idleType: 'float',
                mass: 0.80,
                idleSpeed: 0.010,
                idleAmplitude: 6
            },

            {
                name: 'Sad',
                idleType: 'droop',
                mass: 1.10,
                idleSpeed: 0.018,
                idleAmplitude: 5
            },

            {
                name: 'Nerd',
                idleType: 'twitch',
                mass: 0.90,
                idleSpeed: 0.030,
                idleAmplitude: 3
            },

            {
                name: 'Frustrated',
                idleType: 'shake',
                mass: 1.10,
                idleSpeed: 0.025,
                idleAmplitude: 4
            },

            {
                name: 'Playful',
                idleType: 'playful',
                mass: 0.95,
                idleSpeed: 0.020,
                idleAmplitude: 6
            },

            {
                name: 'Kiss',
                idleType: 'bob',
                mass: 0.85,
                idleSpeed: 0.016,
                idleAmplitude: 5
            },

            {
                name: 'Cold',
                idleType: 'shiver',
                mass: 1.05,
                idleSpeed: 0.024,
                idleAmplitude: 3
            },

            {
                name: 'Melting',
                idleType: 'droop',
                mass: 1.00,
                idleSpeed: 0.014,
                idleAmplitude: 4
            },

            {
                name: 'Grinning',
                idleType: 'bounce',
                mass: 0.90,
                idleSpeed: 0.021,
                idleAmplitude: 6
            },

            {
                name: 'Winking',
                idleType: 'tilt',
                mass: 1.00,
                idleSpeed: 0.014,
                idleAmplitude: 4
            },

            {
                name: 'Straight',
                idleType: 'sway',
                mass: 1.05,
                idleSpeed: 0.010,
                idleAmplitude: 3
            },

            {
                name: 'Slight',
                idleType: 'drift',
                mass: 0.92,
                idleSpeed: 0.012,
                idleAmplitude: 4
            }
        ];
    }


    /* ========================================================
       DESTROY
       ======================================================== */

    destroy() {

        /*
         * Remove resize listener.
         */

        window.removeEventListener(
            'resize',
            this.resizeHandler
        );

        /*
         * Stop ticker.
         */

        if (
            this.app &&
            this.app.ticker
        ) {

            this.app.ticker.stop();
        }

        /*
         * Destroy gyro.
         */

        if (
            this.gyro
        ) {

            this.gyro.destroy();
        }

        /*
         * Destroy PixiJS.
         */

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
        }

        this.app =
            null;

        this.emojis =
            [];

        this.cubes =
            [];

        this.physics =
            null;
    }
}