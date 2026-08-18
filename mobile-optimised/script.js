/* ============================================================
   INTERACTIVE 3D EMOJI WORLD
   FULL PERFORMANCE-OPTIMIZED SCRIPT

   Features:
   - 24 unique emoji characters
   - Cursor interaction
   - Touch interaction
   - Gyroscope / device orientation
   - Individual personality movement
   - Smooth floating animation
   - Cursor avoidance
   - Reaction effects
   - Mobile optimization
   - Snapdragon 888 friendly
   - One requestAnimationFrame loop
   - Cached emoji positions
   - Visibility pause
   - Reduced DOM work
   ============================================================ */

(() => {

    "use strict";


    /* ========================================================
       DOM REFERENCES
       ======================================================== */

    const scene =
        document.getElementById("scene");

    const emojiGrid =
        document.getElementById("emojiGrid");

    const cursorLight =
        document.getElementById("cursorLight");

    const reactionLayer =
        document.getElementById("reactionLayer");

    const interactionStatus =
        document.getElementById("interactionStatus");


    if (
        !scene ||
        !emojiGrid
    ) {

        console.error(
            "Emoji World: required DOM elements not found."
        );

        return;
    }


    /* ========================================================
       DEVICE / PERFORMANCE DETECTION
       ======================================================== */

    const coarsePointer =
        window.matchMedia(
            "(pointer: coarse)"
        ).matches;


    const reducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;


    const mobile =
        coarsePointer ||
        window.innerWidth <= 700;


    const smallMobile =
        window.innerWidth <= 420;


    const isIOS =
        /iPad|iPhone|iPod/.test(
            navigator.userAgent
        ) ||
        (
            navigator.platform === "MacIntel" &&
            navigator.maxTouchPoints > 1
        );


    /*
     * Mobile deliberately uses a lower visual workload.
     *
     * Input remains responsive because pointer/sensor
     * values are stored immediately and processed by the
     * single render loop.
     */

    const CONFIG = {

        interactionRadius:
            mobile
                ? 135
                : 185,


        maxPush:
            mobile
                ? 18
                : 30,


        cursorSmoothing:
            mobile
                ? 0.25
                : 0.18,


        movementSmoothing:
            mobile
                ? 0.13
                : 0.085,


        rotationSmoothing:
            mobile
                ? 0.13
                : 0.10,


        gyroSmoothing:
            0.065,


        gyroStrength:
            mobile
                ? 0.45
                : 0.25,


        gyroMax:
            mobile
                ? 7
                : 4,


        idleStrength:
            mobile
                ? 0.45
                : 1,


        /*
         * Mobile does not need a new reaction
         * every time the cursor touches a character.
         */

        reactionChance:
            mobile
                ? 0.08
                : 0.20,


        reactionCooldown:
            mobile
                ? 1600
                : 900,


        /*
         * Cached positions are refreshed after layout
         * changes rather than every frame.
         */

        positionRefreshDelay:
            mobile
                ? 350
                : 200,


        /*
         * Visual frame budget.
         *
         * 50 FPS mobile is intentionally chosen instead
         * of forcing a constant 60 FPS workload.
         */

        frameInterval:
            mobile
                ? 1000 / 50
                : 1000 / 60
    };


    /* ========================================================
       CURSOR STATE
       ======================================================== */

    const cursor = {

        x:
            window.innerWidth * 0.5,

        y:
            window.innerHeight * 0.5,

        targetX:
            window.innerWidth * 0.5,

        targetY:
            window.innerHeight * 0.5,

        active:
            false
    };


    /* ========================================================
       TOUCH STATE
       ======================================================== */

    const touch = {

        active: false,

        x:
            window.innerWidth * 0.5,

        y:
            window.innerHeight * 0.5
    };


    /* ========================================================
       GYROSCOPE STATE
       ======================================================== */

    const gyro = {

        supported: false,

        permissionGranted: false,

        active: false,

        calibrated: false,

        beta: 0,

        gamma: 0,

        targetBeta: 0,

        targetGamma: 0,

        calibrationBeta: 0,

        calibrationGamma: 0,

        lastEventTime: 0
    };


    /* ========================================================
       EMOJI PERSONALITIES
       ======================================================== */

    const personalities = [

        {
            animation: "bounce",
            speed: 1.00,
            movement: 1.00,
            rotation: 0.5,
            gyro: 1.00,
            reaction: "✨"
        },

        {
            animation: "laugh",
            speed: 1.08,
            movement: 1.00,
            rotation: 1.2,
            gyro: 0.90,
            reaction: "😂"
        },

        {
            animation: "pulse",
            speed: 0.78,
            movement: 0.70,
            rotation: 0.4,
            gyro: 0.60,
            reaction: "💗"
        },

        {
            animation: "cool",
            speed: 0.62,
            movement: 0.80,
            rotation: 1.0,
            gyro: 0.75,
            reaction: "😎"
        },

        {
            animation: "thinking",
            speed: 0.68,
            movement: 0.70,
            rotation: 1.8,
            gyro: 0.70,
            reaction: "❔"
        },

        {
            animation: "angry",
            speed: 1.08,
            movement: 1.15,
            rotation: 2.0,
            gyro: 1.20,
            reaction: "💢"
        },

        {
            animation: "party",
            speed: 1.18,
            movement: 1.15,
            rotation: 1.5,
            gyro: 1.20,
            reaction: "🎉"
        },

        {
            animation: "excited",
            speed: 1.25,
            movement: 1.10,
            rotation: 0.8,
            gyro: 1.15,
            reaction: "✨"
        },

        {
            animation: "sleepy",
            speed: 0.42,
            movement: 0.45,
            rotation: 0.3,
            gyro: 0.45,
            reaction: "💤"
        },

        {
            animation: "shock",
            speed: 0.78,
            movement: 1.05,
            rotation: 0.8,
            gyro: 1.00,
            reaction: "❕"
        },

        {
            animation: "smirk",
            speed: 0.58,
            movement: 0.60,
            rotation: 1.3,
            gyro: 0.70,
            reaction: "😏"
        },

        {
            animation: "angel",
            speed: 0.48,
            movement: 0.50,
            rotation: 0.5,
            gyro: 0.55,
            reaction: "✨"
        },

        {
            animation: "pleading",
            speed: 0.52,
            movement: 0.60,
            rotation: 0.6,
            gyro: 0.65,
            reaction: "🥺"
        },

        {
            animation: "nerd",
            speed: 0.52,
            movement: 0.60,
            rotation: 1.1,
            gyro: 0.70,
            reaction: "🤓"
        },

        {
            animation: "frustrated",
            speed: 0.96,
            movement: 0.95,
            rotation: 2.0,
            gyro: 1.00,
            reaction: "💢"
        },

        {
            animation: "yummy",
            speed: 0.82,
            movement: 0.80,
            rotation: 0.7,
            gyro: 0.75,
            reaction: "😋"
        },

        {
            animation: "kiss",
            speed: 0.72,
            movement: 0.65,
            rotation: 0.9,
            gyro: 0.65,
            reaction: "💋"
        },

        {
            animation: "cold",
            speed: 1.05,
            movement: 0.85,
            rotation: 1.3,
            gyro: 1.05,
            reaction: "❄️"
        },

        {
            animation: "melt",
            speed: 0.38,
            movement: 0.42,
            rotation: 0.4,
            gyro: 0.45,
            reaction: "🫠"
        },

        {
            animation: "grin",
            speed: 0.90,
            movement: 0.85,
            rotation: 0.5,
            gyro: 0.85,
            reaction: "😁"
        },

        {
            animation: "wink",
            speed: 0.86,
            movement: 0.75,
            rotation: 1.2,
            gyro: 0.75,
            reaction: "😉"
        },

        {
            animation: "neutral",
            speed: 0.32,
            movement: 0.50,
            rotation: 0.25,
            gyro: 0.40,
            reaction: "..."
        },

        {
            animation: "smile",
            speed: 0.68,
            movement: 0.70,
            rotation: 0.5,
            gyro: 0.65,
            reaction: "🙂"
        },

        {
            animation: "upset",
            speed: 0.48,
            movement: 0.60,
            rotation: 0.8,
            gyro: 0.55,
            reaction: "💧"
        }
    ];


    /* ========================================================
       EMOJI STATE ARRAY
       ======================================================== */

    const emojis = [];


    /* ========================================================
       UTILITY FUNCTIONS
       ======================================================== */

    function clamp(
        value,
        min,
        max
    ) {

        return Math.max(
            min,
            Math.min(
                max,
                value
            )
        );
    }


    function lerp(
        current,
        target,
        amount
    ) {

        return current +
            (
                target -
                current
            ) *
            amount;
    }


    function random(
        min,
        max
    ) {

        return (
            Math.random() *
            (
                max -
                min
            )
        ) + min;
    }


    /* ========================================================
       INITIALIZE EMOJIS
       ======================================================== */

    function initializeEmojis() {

        const cards =
            Array.from(
                emojiGrid.querySelectorAll(
                    ".emoji-card"
                )
            );


        cards.forEach(
            (
                card,
                index
            ) => {

                const personality =
                    personalities[
                        index %
                        personalities.length
                    ];


                const character =
                    card.querySelector(
                        ".emoji-character"
                    );


                const image =
                    card.querySelector(
                        ".emoji-visual"
                    );


                if (
                    !character ||
                    !image
                ) {

                    return;
                }


                /*
                 * Always use the requested asset structure.
                 */

                image.src =
                    `../assets/emojis/512 (${index + 1}).webp`;


                image.draggable =
                    false;


                /*
                 * Give each emoji a unique animation
                 * personality.
                 */

                card.dataset.animation =
                    personality.animation;


                /*
                 * Small individual scale variation.
                 */

                const scale =
                    random(
                        0.96,
                        1.03
                    );


                /*
                 * Store initial CSS variables only once.
                 */

                card.style.setProperty(
                    "--emoji-scale",
                    scale.toFixed(3)
                );


                /*
                 * Random animation phases prevent
                 * all 24 emojis from moving together.
                 */

                const phase =
                    random(
                        0,
                        Math.PI * 2
                    );


                const phase2 =
                    random(
                        0,
                        Math.PI * 2
                    );


                emojis.push({

                    card,

                    character,

                    image,

                    personality,

                    index,


                    /*
                     * Cached screen position.
                     */

                    x: 0,

                    y: 0,


                    /*
                     * Cursor movement.
                     */

                    pushX: 0,

                    pushY: 0,

                    targetPushX: 0,

                    targetPushY: 0,


                    /*
                     * Rotation.
                     */

                    rotation: 0,

                    targetRotation: 0,


                    /*
                     * Idle phase.
                     */

                    phase,

                    phase2,

                    idleSpeed:
                        random(
                            0.70,
                            1.10
                        ),


                    /*
                     * Gyroscope.
                     */

                    gyroX: 0,

                    gyroY: 0,

                    targetGyroX: 0,

                    targetGyroY: 0,


                    /*
                     * Interaction state.
                     */

                    nearCursor: false,

                    lastReaction: 0
                });
            }
        );
    }


    /* ========================================================
       CACHE POSITIONS
       ======================================================== */

    function cachePositions() {

        for (
            let i = 0;
            i < emojis.length;
            i++
        ) {

            const emoji =
                emojis[i];


            const rect =
                emoji.card.getBoundingClientRect();


            emoji.x =
                rect.left +
                rect.width * 0.5;


            emoji.y =
                rect.top +
                rect.height * 0.40;
        }
    }


    /* ========================================================
       RESIZE
       ======================================================== */

    let resizeTimer = null;


    function schedulePositionRefresh() {

        clearTimeout(
            resizeTimer
        );


        resizeTimer =
            setTimeout(
                () => {

                    cachePositions();

                },
                CONFIG.positionRefreshDelay
            );
    }


    window.addEventListener(
        "resize",
        schedulePositionRefresh,
        {
            passive: true
        }
    );


    window.addEventListener(
        "orientationchange",
        () => {

            setTimeout(
                cachePositions,
                350
            );

        },
        {
            passive: true
        }
    );


    /* ========================================================
       POINTER INPUT
       ======================================================== */

    let lastPointerUpdate =
        0;


    function handlePointerMove(
        event
    ) {

        const now =
            performance.now();


        /*
         * Avoid processing excessive touch/pointer
         * events on mobile.
         */

        if (
            mobile &&
            now -
            lastPointerUpdate <
            8
        ) {

            return;
        }


        lastPointerUpdate =
            now;


        cursor.targetX =
            event.clientX;

        cursor.targetY =
            event.clientY;

        cursor.active =
            true;


        /*
         * Touch coordinates are also stored.
         */

        if (
            event.pointerType ===
            "touch"
        ) {

            touch.active =
                true;

            touch.x =
                event.clientX;

            touch.y =
                event.clientY;
        }
    }


    window.addEventListener(
        "pointermove",
        handlePointerMove,
        {
            passive: true
        }
    );


    window.addEventListener(
        "pointerdown",
        event => {

            cursor.targetX =
                event.clientX;

            cursor.targetY =
                event.clientY;

            cursor.active =
                true;


            if (
                event.pointerType ===
                "touch"
            ) {

                touch.active =
                    true;

                touch.x =
                    event.clientX;

                touch.y =
                    event.clientY;
            }

        },
        {
            passive: true
        }
    );


    window.addEventListener(
        "pointerup",
        event => {

            if (
                event.pointerType ===
                "touch"
            ) {

                touch.active =
                    false;
            }

        },
        {
            passive: true
        }
    );


    window.addEventListener(
        "pointercancel",
        () => {

            touch.active =
                false;

        },
        {
            passive: true
        }
    );


    /* ========================================================
       GYROSCOPE SUPPORT
       ======================================================== */

    function supportsOrientation() {

        return (
            "DeviceOrientationEvent"
            in window
        );
    }


    /* ========================================================
       DEVICE ORIENTATION EVENT
       ======================================================== */

    function handleOrientation(
        event
    ) {

        if (
            typeof event.beta !==
            "number" ||
            typeof event.gamma !==
            "number"
        ) {

            return;
        }


        gyro.supported =
            true;


        gyro.lastEventTime =
            performance.now();


        let beta =
            event.beta;


        let gamma =
            event.gamma;


        /*
         * First valid orientation becomes
         * the neutral position.
         */

        if (
            !gyro.calibrated
        ) {

            gyro.calibrationBeta =
                beta;

            gyro.calibrationGamma =
                gamma;

            gyro.calibrated =
                true;
        }


        beta -=
            gyro.calibrationBeta;


        gamma -=
            gyro.calibrationGamma;


        /*
         * Ignore extreme rotations.
         */

        beta =
            clamp(
                beta,
                -25,
                25
            );


        gamma =
            clamp(
                gamma,
                -25,
                25
            );


        gyro.targetBeta =
            beta / 25;


        gyro.targetGamma =
            gamma / 25;


        gyro.active =
            true;
    }


    /* ========================================================
       START ORIENTATION
       ======================================================== */

    function startOrientation() {

        if (
            !supportsOrientation()
        ) {

            return;
        }


        window.addEventListener(
            "deviceorientation",
            handleOrientation,
            {
                passive: true
            }
        );


        gyro.permissionGranted =
            true;
    }


    /* ========================================================
       IOS PERMISSION
       ======================================================== */

    async function requestMotionPermission() {

        if (
            !supportsOrientation()
        ) {

            return;
        }


        /*
         * Android / browsers that don't require
         * explicit permission.
         */

        if (
            !isIOS
        ) {

            startOrientation();

            return;
        }


        /*
         * Older iOS versions / browsers.
         */

        if (
            typeof DeviceOrientationEvent
                .requestPermission !==
            "function"
        ) {

            startOrientation();

            return;
        }


        try {

            const permission =
                await DeviceOrientationEvent
                    .requestPermission();


            if (
                permission ===
                "granted"
            ) {

                startOrientation();
            }

        } catch (
            error
        ) {

            console.warn(
                "Device orientation permission was not granted.",
                error
            );
        }
    }


    /* ========================================================
       ENABLE GYROSCOPE
       ======================================================== */

    if (
        supportsOrientation()
    ) {

        if (
            isIOS
        ) {

            /*
             * iOS requires user interaction.
             */

            const enableMotion =
                () => {

                    requestMotionPermission();

                };


            window.addEventListener(
                "pointerdown",
                enableMotion,
                {
                    passive: true,
                    once: true
                }
            );

        } else {

            startOrientation();
        }
    }


    /* ========================================================
       UPDATE GYROSCOPE
       ======================================================== */

    function updateGyroscope() {

        /*
         * If sensor has not produced data recently,
         * gradually return to neutral.
         */

        if (
            !gyro.active ||
            performance.now() -
            gyro.lastEventTime >
            1200
        ) {

            gyro.beta =
                lerp(
                    gyro.beta,
                    0,
                    0.035
                );


            gyro.gamma =
                lerp(
                    gyro.gamma,
                    0,
                    0.035
                );

            return;
        }


        gyro.beta =
            lerp(
                gyro.beta,
                gyro.targetBeta,
                CONFIG.gyroSmoothing
            );


        gyro.gamma =
            lerp(
                gyro.gamma,
                gyro.targetGamma,
                CONFIG.gyroSmoothing
            );
    }


    /* ========================================================
       UPDATE CURSOR
       ======================================================== */

    function updateCursor() {

        cursor.x =
            lerp(
                cursor.x,
                cursor.targetX,
                CONFIG.cursorSmoothing
            );


        cursor.y =
            lerp(
                cursor.y,
                cursor.targetY,
                CONFIG.cursorSmoothing
            );


        if (
            cursorLight
        ) {

            cursorLight.style.transform =
                `translate3d(
                    ${cursor.x.toFixed(1)}px,
                    ${cursor.y.toFixed(1)}px,
                    0
                )
                translate3d(
                    -50%,
                    -50%,
                    0
                )`;
        }
    }


    /* ========================================================
       UPDATE ONE EMOJI
       ======================================================== */

    function updateEmoji(
        emoji,
        time
    ) {

        /* ----------------------------------------------------
           DISTANCE FROM CURSOR
           ---------------------------------------------------- */

        const dx =
            cursor.x -
            emoji.x;


        const dy =
            cursor.y -
            emoji.y;


        const distanceSquared =
            dx * dx +
            dy * dy;


        const radius =
            CONFIG.interactionRadius;


        const radiusSquared =
            radius * radius;


        let interaction =
            0;


        if (
            distanceSquared <
            radiusSquared
        ) {

            const distance =
                Math.sqrt(
                    distanceSquared
                );


            interaction =
                1 -
                distance /
                radius;
        }


        /* ----------------------------------------------------
           CURSOR PUSH
           ---------------------------------------------------- */

        if (
            interaction > 0
        ) {

            const length =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            let directionX =
                0;


            let directionY =
                0;


            if (
                length >
                0.001
            ) {

                directionX =
                    -dx /
                    length;

                directionY =
                    -dy /
                    length;
            }


            const push =
                interaction *
                CONFIG.maxPush *
                emoji.personality.movement;


            emoji.targetPushX =
                directionX *
                push;


            emoji.targetPushY =
                directionY *
                push;


            emoji.targetRotation =
                clamp(
                    directionX *
                    7 *
                    emoji.personality.rotation,
                    -9,
                    9
                );


            if (
                !emoji.nearCursor
            ) {

                emoji.nearCursor =
                    true;


                emoji.card.classList.add(
                    "near-cursor"
                );


                /*
                 * Small percentage of interactions
                 * produce a floating reaction.
                 */

                if (
                    Math.random() <
                    CONFIG.reactionChance
                ) {

                    createReaction(
                        emoji
                    );
                }
            }

        } else {

            emoji.targetPushX =
                0;

            emoji.targetPushY =
                0;

            emoji.targetRotation =
                0;


            if (
                emoji.nearCursor
            ) {

                emoji.nearCursor =
                    false;


                emoji.card.classList.remove(
                    "near-cursor"
                );
            }
        }


        /* ----------------------------------------------------
           SMOOTH CURSOR MOVEMENT
           ---------------------------------------------------- */

        emoji.pushX =
            lerp(
                emoji.pushX,
                emoji.targetPushX,
                CONFIG.movementSmoothing
            );


        emoji.pushY =
            lerp(
                emoji.pushY,
                emoji.targetPushY,
                CONFIG.movementSmoothing
            );


        emoji.rotation =
            lerp(
                emoji.rotation,
                emoji.targetRotation,
                CONFIG.rotationSmoothing
            );


        /* ----------------------------------------------------
           GYROSCOPE PARALLAX
           ---------------------------------------------------- */

        const gyroFactor =
            emoji.personality.gyro *
            CONFIG.gyroStrength;


        emoji.targetGyroX =
            gyro.gamma *
            CONFIG.gyroMax *
            gyroFactor;


        emoji.targetGyroY =
            gyro.beta *
            CONFIG.gyroMax *
            gyroFactor;


        emoji.gyroX =
            lerp(
                emoji.gyroX,
                emoji.targetGyroX,
                0.055
            );


        emoji.gyroY =
            lerp(
                emoji.gyroY,
                emoji.targetGyroY,
                0.055
            );


        /* ----------------------------------------------------
           INDIVIDUAL IDLE ANIMATION
           ---------------------------------------------------- */

        let idleY =
            0;


        let idleRotation =
            0;


        if (
            !reducedMotion
        ) {

            const wave =
                Math.sin(
                    time *
                    emoji.idleSpeed +
                    emoji.phase
                );


            const wave2 =
                Math.sin(
                    time *
                    emoji.idleSpeed *
                    0.72 +
                    emoji.phase2
                );


            idleY =
                wave *
                CONFIG.idleStrength;


            idleRotation =
                wave2 *
                (
                    mobile
                        ? 0.30
                        : 0.65
                );
        }


        /* ----------------------------------------------------
           COMBINE ALL MOVEMENT
           ---------------------------------------------------- */

        const finalX =
            emoji.pushX +
            emoji.gyroX;


        const finalY =
            emoji.pushY +
            emoji.gyroY;


        const finalRotation =
            emoji.rotation +
            idleRotation;


        /* ----------------------------------------------------
           WRITE TRANSFORM VARIABLES
           ---------------------------------------------------- */

        emoji.card.style.setProperty(
            "--push-x",
            `${finalX.toFixed(2)}px`
        );


        emoji.card.style.setProperty(
            "--push-y",
            `${finalY.toFixed(2)}px`
        );


        emoji.card.style.setProperty(
            "--breath",
            `${idleY.toFixed(2)}px`
        );


        emoji.card.style.setProperty(
            "--emoji-rotation",
            `${finalRotation.toFixed(2)}deg`
        );
    }


    /* ========================================================
       REACTION EFFECT
       ======================================================== */

    function createReaction(
        emoji
    ) {

        if (
            !reactionLayer
        ) {

            return;
        }


        const now =
            performance.now();


        if (
            now -
            emoji.lastReaction <
            CONFIG.reactionCooldown
        ) {

            return;
        }


        emoji.lastReaction =
            now;


        const reaction =
            document.createElement(
                "div"
            );


        reaction.className =
            "reaction";


        reaction.textContent =
            emoji.personality.reaction;


        reaction.style.setProperty(
            "--reaction-x",
            `${emoji.x}px`
        );


        reaction.style.setProperty(
            "--reaction-y",
            `${emoji.y - 30}px`
        );


        reaction.style.setProperty(
            "--reaction-dx",
            `${random(
                -16,
                16
            )}px`
        );


        reaction.style.setProperty(
            "--reaction-dy",
            `${random(
                -32,
                -18
            )}px`
        );


        reactionLayer.appendChild(
            reaction
        );


        /*
         * Remove after animation.
         */

        setTimeout(
            () => {

                reaction.remove();

            },
            900
        );
    }


    /* ========================================================
       MAIN ANIMATION LOOP
       ======================================================== */

    let running =
        true;


    let lastFrameTime =
        performance.now();


    function animationLoop(
        timestamp
    ) {

        if (
            !running
        ) {

            return;
        }


        const delta =
            timestamp -
            lastFrameTime;


        /*
         * Mobile frame pacing.
         */

        if (
            mobile &&
            delta <
            CONFIG.frameInterval
        ) {

            requestAnimationFrame(
                animationLoop
            );

            return;
        }


        lastFrameTime =
            timestamp;


        const time =
            timestamp /
            1000;


        /* ----------------------------------------------------
           INPUT
           ---------------------------------------------------- */

        updateCursor();


        /* ----------------------------------------------------
           SENSOR
           ---------------------------------------------------- */

        updateGyroscope();


        /* ----------------------------------------------------
           EMOJIS
           ---------------------------------------------------- */

        for (
            let i = 0;
            i < emojis.length;
            i++
        ) {

            updateEmoji(
                emojis[i],
                time
            );
        }


        requestAnimationFrame(
            animationLoop
        );
    }


    /* ========================================================
       VISIBILITY OPTIMIZATION
       ======================================================== */

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.hidden
            ) {

                running =
                    false;

            } else {

                running =
                    true;

                lastFrameTime =
                    performance.now();


                requestAnimationFrame(
                    animationLoop
                );
            }
        }
    );


    /* ========================================================
       INITIALIZATION
       ======================================================== */

    function initialize() {

        initializeEmojis();


        /*
         * Wait for layout before caching positions.
         */

        requestAnimationFrame(
            () => {

                cachePositions();


                /*
                 * Give the browser one frame to
                 * finish initial image/layout work.
                 */

                requestAnimationFrame(
                    animationLoop
                );
            }
        );


        /* ----------------------------------------------------
           STATUS
           ---------------------------------------------------- */

        if (
            interactionStatus
        ) {

            if (
                mobile
            ) {

                interactionStatus.textContent =
                    "Tilt, touch or move around the emojis";

            } else {

                interactionStatus.textContent =
                    "Move your cursor around the emojis";
            }
        }


        /* ----------------------------------------------------
           DEBUG INFO
           ---------------------------------------------------- */

        console.log(
            "✨ Interactive Emoji World initialized"
        );


        console.log(
            `🎭 Emojis: ${emojis.length}`
        );


        console.log(
            `📱 Mobile optimized: ${mobile}`
        );


        console.log(
            `🧭 Device orientation: ${
                supportsOrientation()
            }`
        );
    }


    /* ========================================================
       START
       ======================================================== */

    initialize();


})();