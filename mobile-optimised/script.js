/* ============================================================
   INTERACTIVE 3D EMOJI WORLD
   PERFORMANCE OPTIMIZED
   Target: Snapdragon 888 / Adreno 660 class
   ============================================================ */

(() => {
    "use strict";


    /* ========================================================
       DOM
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


    if (!scene || !emojiGrid) {
        console.error(
            "Emoji World: required elements not found."
        );
        return;
    }


    /* ========================================================
       DEVICE PERFORMANCE PROFILE
       ======================================================== */

    const coarsePointer =
        window.matchMedia(
            "(pointer: coarse)"
        ).matches;

    const reducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;


    /*
     * Mobile profile.
     *
     * Snapdragon 888 is powerful enough for
     * this scene, but unnecessary calculations
     * still cause frame drops.
     */

    const MOBILE =
        coarsePointer ||
        window.innerWidth < 700;


    const CONFIG = {

        /*
         * Cursor interaction radius.
         */

        interactionRadius:
            MOBILE ? 155 : 190,

        /*
         * Maximum cursor push.
         */

        maxPush:
            MOBILE ? 25 : 34,

        /*
         * Cursor smoothing.
         */

        cursorSmoothing:
            MOBILE ? 0.22 : 0.18,

        /*
         * Emoji movement smoothing.
         */

        movementSmoothing:
            MOBILE ? 0.10 : 0.075,

        /*
         * Rotation smoothing.
         */

        rotationSmoothing:
            MOBILE ? 0.12 : 0.10,

        /*
         * Glow smoothing.
         */

        glowSmoothing:
            MOBILE ? 0.13 : 0.10,

        /*
         * Position refresh interval.
         *
         * We do NOT measure DOM geometry
         * every frame.
         */

        positionRefresh:
            MOBILE ? 250 : 150,

        /*
         * Cursor processing interval.
         */

        interactionInterval:
            MOBILE ? 16 : 0,

        /*
         * Reaction probability.
         */

        reactionProbability:
            MOBILE ? 0.20 : 0.30
    };


    /* ========================================================
       CURSOR
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

        visible:
            false
    };


    /* ========================================================
       PERSONALITIES
       ======================================================== */

    const personalities = [

        {
            name: "Happy",
            animation: "bounce",
            speed: 1.00,
            movement: 1.00,
            rotation: 0.5,
            reaction: "✨"
        },

        {
            name: "Laughing",
            animation: "laugh",
            speed: 1.10,
            movement: 1.00,
            rotation: 1.3,
            reaction: "😂"
        },

        {
            name: "Love",
            animation: "pulse",
            speed: 0.80,
            movement: 0.70,
            rotation: 0.4,
            reaction: "💗"
        },

        {
            name: "Cool",
            animation: "cool",
            speed: 0.65,
            movement: 0.80,
            rotation: 1.0,
            reaction: "😎"
        },

        {
            name: "Thinking",
            animation: "thinking",
            speed: 0.70,
            movement: 0.70,
            rotation: 2.0,
            reaction: "❔"
        },

        {
            name: "Angry",
            animation: "angry",
            speed: 1.10,
            movement: 1.20,
            rotation: 2.0,
            reaction: "💢"
        },

        {
            name: "Party",
            animation: "party",
            speed: 1.20,
            movement: 1.20,
            rotation: 1.5,
            reaction: "🎉"
        },

        {
            name: "Excited",
            animation: "excited",
            speed: 1.30,
            movement: 1.15,
            rotation: 0.8,
            reaction: "✨"
        },

        {
            name: "Sleepy",
            animation: "sleepy",
            speed: 0.45,
            movement: 0.50,
            rotation: 0.3,
            reaction: "💤"
        },

        {
            name: "Shocked",
            animation: "shock",
            speed: 0.80,
            movement: 1.10,
            rotation: 0.8,
            reaction: "❕"
        },

        {
            name: "Smirk",
            animation: "smirk",
            speed: 0.60,
            movement: 0.60,
            rotation: 1.4,
            reaction: "😏"
        },

        {
            name: "Angel",
            animation: "angel",
            speed: 0.50,
            movement: 0.55,
            rotation: 0.5,
            reaction: "✨"
        },

        {
            name: "Pleading",
            animation: "pleading",
            speed: 0.55,
            movement: 0.65,
            rotation: 0.6,
            reaction: "🥺"
        },

        {
            name: "Nerd",
            animation: "nerd",
            speed: 0.55,
            movement: 0.65,
            rotation: 1.2,
            reaction: "🤓"
        },

        {
            name: "Frustrated",
            animation: "frustrated",
            speed: 1.00,
            movement: 1.00,
            rotation: 2.2,
            reaction: "💢"
        },

        {
            name: "Yummy",
            animation: "yummy",
            speed: 0.85,
            movement: 0.85,
            rotation: 0.7,
            reaction: "😋"
        },

        {
            name: "Kiss",
            animation: "kiss",
            speed: 0.75,
            movement: 0.70,
            rotation: 1.0,
            reaction: "💋"
        },

        {
            name: "Cold",
            animation: "cold",
            speed: 1.10,
            movement: 0.90,
            rotation: 1.4,
            reaction: "❄️"
        },

        {
            name: "Melting",
            animation: "melt",
            speed: 0.40,
            movement: 0.45,
            rotation: 0.5,
            reaction: "🫠"
        },

        {
            name: "Grinning",
            animation: "grin",
            speed: 0.95,
            movement: 0.90,
            rotation: 0.5,
            reaction: "😁"
        },

        {
            name: "Wink",
            animation: "wink",
            speed: 0.90,
            movement: 0.80,
            rotation: 1.3,
            reaction: "😉"
        },

        {
            name: "Neutral",
            animation: "neutral",
            speed: 0.35,
            movement: 0.55,
            rotation: 0.3,
            reaction: "..."
        },

        {
            name: "Smile",
            animation: "smile",
            speed: 0.70,
            movement: 0.75,
            rotation: 0.5,
            reaction: "🙂"
        },

        {
            name: "Upset",
            animation: "upset",
            speed: 0.50,
            movement: 0.65,
            rotation: 0.8,
            reaction: "💧"
        }
    ];


    /* ========================================================
       EMOJI RUNTIME DATA
       ======================================================== */

    const emojis = [];


    /* ========================================================
       UTILITY
       ======================================================== */

    function clamp(
        value,
        min,
        max
    ) {
        return Math.max(
            min,
            Math.min(max, value)
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
        return Math.random() *
            (
                max -
                min
            ) +
            min;
    }


    function distanceSquared(
        x1,
        y1,
        x2,
        y2
    ) {

        const dx =
            x2 - x1;

        const dy =
            y2 - y1;

        return (
            dx * dx +
            dy * dy
        );
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


                const platform =
                    card.querySelector(
                        ".glass-platform"
                    );


                if (!character || !image) {
                    return;
                }


                /*
                 * Correct image source.
                 */

                image.src =
                    `../assets/emojis/512 (${index + 1}).webp`;


                /*
                 * Personality.
                 */

                card.dataset.animation =
                    personality.animation;

                card.dataset.personality =
                    personality.name;


                /*
                 * Individual animation speed.
                 */

                card.style.setProperty(
                    "--animation-speed",
                    personality.speed
                );


                /*
                 * Slightly different size.
                 */

                const scale =
                    random(
                        0.95,
                        1.03
                    );


                card.style.setProperty(
                    "--emoji-scale",
                    scale
                );


                /*
                 * Random idle phase.
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

                    platform,

                    personality,

                    index,

                    /*
                     * Cached screen position.
                     */

                    x: 0,

                    y: 0,

                    width: 0,

                    height: 0,

                    /*
                     * Movement.
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
                     * Lighting.
                     */

                    shine: 0,

                    targetShine: 0,

                    /*
                     * Idle animation.
                     */

                    phase,

                    phase2,

                    idleSpeed:
                        random(
                            0.65,
                            1.15
                        ),

                    /*
                     * Interaction.
                     */

                    near:
                        false,

                    reactionCooldown:
                        random(
                            900,
                            1800
                        ),

                    lastReaction:
                        0
                });
            }
        );
    }


    /* ========================================================
       CACHE POSITIONS
       ========================================================

       IMPORTANT:
       This is called only occasionally.

       NEVER call getBoundingClientRect()
       from the main 60 FPS loop.
       ======================================================== */

    function cachePositions() {

        const sceneRect =
            scene.getBoundingClientRect();


        const scrollX =
            window.scrollX;

        const scrollY =
            window.scrollY;


        emojis.forEach(
            emoji => {

                const rect =
                    emoji.card.getBoundingClientRect();


                /*
                 * Store position relative to viewport.
                 */

                emoji.x =
                    rect.left +
                    rect.width * 0.5;

                emoji.y =
                    rect.top +
                    rect.height * 0.42;


                emoji.width =
                    rect.width;

                emoji.height =
                    rect.height;
            }
        );
    }


    /* ========================================================
       RESIZE / POSITION CACHE
       ======================================================== */

    let resizeTimer =
        null;


    function schedulePositionUpdate() {

        clearTimeout(
            resizeTimer
        );


        resizeTimer =
            setTimeout(
                () => {

                    cachePositions();

                },
                100
            );
    }


    window.addEventListener(
        "resize",
        schedulePositionUpdate,
        {
            passive: true
        }
    );


    window.addEventListener(
        "orientationchange",
        () => {

            setTimeout(
                cachePositions,
                250
            );

        },
        {
            passive: true
        }
    );


    /* ========================================================
       POINTER
       ======================================================== */

    let lastPointerEventTime =
        0;


    function handlePointerMove(
        event
    ) {

        const now =
            performance.now();


        /*
         * Avoid excessive pointer events
         * on mobile browsers.
         */

        if (
            MOBILE &&
            now -
            lastPointerEventTime <
            8
        ) {

            return;
        }


        lastPointerEventTime =
            now;


        cursor.targetX =
            event.clientX;

        cursor.targetY =
            event.clientY;

        cursor.visible =
            true;
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

            cursor.visible =
                true;

        },
        {
            passive: true
        }
    );


    window.addEventListener(
        "pointerleave",
        () => {

            cursor.visible =
                false;

        }
    );


    /* ========================================================
       CURSOR UPDATE
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


        /*
         * Only one DOM element follows
         * the cursor.
         */

        if (cursorLight) {

            cursorLight.style.transform =
                `translate3d(
                    ${cursor.x}px,
                    ${cursor.y}px,
                    0
                ) translate3d(-50%, -50%, 0)`;
        }
    }


    /* ========================================================
       EMOJI INTERACTION
       ======================================================== */

    function updateEmojiInteraction(
        emoji,
        time
    ) {

        /*
         * Cached position.
         *
         * No layout calculation.
         */

        const dx =
            cursor.x -
            emoji.x;

        const dy =
            cursor.y -
            emoji.y;


        const distSq =
            dx * dx +
            dy * dy;


        const radius =
            CONFIG.interactionRadius;


        const radiusSq =
            radius * radius;


        /*
         * Fast rejection.
         */

        if (
            distSq >
            radiusSq
        ) {

            emoji.targetPushX =
                0;

            emoji.targetPushY =
                0;

            emoji.targetRotation =
                0;

            emoji.targetShine =
                0;

            if (
                emoji.near
            ) {

                emoji.near =
                    false;

                emoji.card.classList.remove(
                    "near-cursor"
                );
            }

        } else {

            /*
             * Only calculate square root
             * when cursor is actually close.
             */

            const dist =
                Math.sqrt(
                    distSq
                );


            const intensity =
                clamp(
                    1 -
                    dist /
                    radius,
                    0,
                    1
                );


            /*
             * Direction away from cursor.
             */

            let dirX =
                -dx;

            let dirY =
                -dy;


            if (
                dist >
                0.01
            ) {

                dirX /=
                    dist;

                dirY /=
                    dist;
            }


            /*
             * Individual movement.
             */

            const movement =
                intensity *
                CONFIG.maxPush *
                emoji.personality.movement;


            emoji.targetPushX =
                dirX *
                movement;


            emoji.targetPushY =
                dirY *
                movement;


            /*
             * Individual tilt.
             */

            emoji.targetRotation =
                clamp(
                    dirX *
                    8 *
                    emoji.personality.rotation,
                    -10,
                    10
                );


            /*
             * Glow.
             */

            emoji.targetShine =
                intensity;


            if (
                !emoji.near
            ) {

                emoji.near =
                    true;

                emoji.card.classList.add(
                    "near-cursor"
                );


                /*
                 * Very limited reactions
                 * on mobile.
                 */

                if (
                    Math.random() <
                    CONFIG.reactionProbability
                ) {

                    triggerReaction(
                        emoji
                    );
                }
            }
        }


        /* ----------------------------------------------------
           SMOOTH MOVEMENT
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


        /* ----------------------------------------------------
           SMOOTH ROTATION
           ---------------------------------------------------- */

        emoji.rotation =
            lerp(
                emoji.rotation,
                emoji.targetRotation,
                CONFIG.rotationSmoothing
            );


        /* ----------------------------------------------------
           SMOOTH GLOW
           ---------------------------------------------------- */

        emoji.shine =
            lerp(
                emoji.shine,
                emoji.targetShine,
                CONFIG.glowSmoothing
            );


        /* ----------------------------------------------------
           LOW-COST IDLE MOTION
           ---------------------------------------------------- */

        let idleY =
            0;


        let idleRotation =
            0;


        /*
         * Reduced idle calculations on mobile.
         */

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
                    0.7 +
                    emoji.phase2
                );


            idleY =
                wave *
                (
                    MOBILE
                        ? 1.1
                        : 1.6
                );


            idleRotation =
                wave2 *
                (
                    MOBILE
                        ? 0.5
                        : 0.8
                );
        }


        /* ----------------------------------------------------
           CSS VARIABLES
           ---------------------------------------------------- */

        emoji.card.style.setProperty(
            "--push-x",
            `${emoji.pushX}px`
        );


        emoji.card.style.setProperty(
            "--push-y",
            `${emoji.pushY}px`
        );


        emoji.card.style.setProperty(
            "--emoji-rotation",
            `${emoji.rotation + idleRotation}deg`
        );


        emoji.card.style.setProperty(
            "--shine",
            emoji.shine
        );


        emoji.card.style.setProperty(
            "--breath",
            `${idleY}px`
        );
    }


    /* ========================================================
       REACTIONS
       ======================================================== */

    function triggerReaction(
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
            emoji.reactionCooldown
        ) {

            return;
        }


        emoji.lastReaction =
            now;


        /*
         * Don't spam reactions.
         */

        const element =
            document.createElement(
                "div"
            );


        element.className =
            "reaction";


        element.textContent =
            emoji.personality.reaction;


        element.style.setProperty(
            "--reaction-x",
            `${emoji.x}px`
        );


        element.style.setProperty(
            "--reaction-y",
            `${emoji.y - 35}px`
        );


        element.style.setProperty(
            "--reaction-dx",
            `${random(
                -20,
                20
            )}px`
        );


        element.style.setProperty(
            "--reaction-dy",
            `${random(
                -35,
                -18
            )}px`
        );


        reactionLayer.appendChild(
            element
        );


        /*
         * Remove quickly.
         */

        setTimeout(
            () => {

                element.remove();

            },
            950
        );
    }


    /* ========================================================
       MOBILE OPTIMIZATION
       ======================================================== */

    let lastInteractionUpdate =
        0;


    function updateInteractions(
        time
    ) {

        /*
         * On mobile, process interaction
         * at a controlled rate.
         */

        if (
            MOBILE
        ) {

            const now =
                performance.now();


            if (
                now -
                lastInteractionUpdate <
                16
            ) {

                return;
            }


            lastInteractionUpdate =
                now;
        }


        /*
         * Update all emojis.
         */

        for (
            let i = 0;
            i < emojis.length;
            i++
        ) {

            updateEmojiInteraction(
                emojis[i],
                time
            );
        }
    }


    /* ========================================================
       ANIMATION LOOP
       ======================================================== */

    let running =
        true;


    let lastTime =
        performance.now();


    function animationLoop(
        timestamp
    ) {

        if (!running) {
            return;
        }


        /*
         * Prevent huge time jumps
         * after browser throttling.
         */

        if (
            timestamp -
            lastTime >
            100
        ) {

            lastTime =
                timestamp;
        }


        lastTime =
            timestamp;


        const time =
            timestamp /
            1000;


        /*
         * Cursor.
         */

        updateCursor();


        /*
         * Emoji interaction.
         */

        updateInteractions(
            time
        );


        /*
         * Continue.
         */

        requestAnimationFrame(
            animationLoop
        );
    }


    /* ========================================================
       PAGE VISIBILITY
       ======================================================== */

    document.addEventListener(
        "visibilitychange",
        () => {

            running =
                !document.hidden;


            if (
                running
            ) {

                lastTime =
                    performance.now();

                requestAnimationFrame(
                    animationLoop
                );
            }
        }
    );


    /* ========================================================
       TOUCH RELEASE
       ======================================================== */

    window.addEventListener(
        "pointerup",
        () => {

            /*
             * Keep the final cursor position
             * instead of forcing all emojis
             * back immediately.
             */

        },
        {
            passive: true
        }
    );


    /* ========================================================
       INITIALIZATION
       ======================================================== */

    function init() {

        initializeEmojis();


        /*
         * Wait until layout is ready.
         */

        requestAnimationFrame(
            () => {

                cachePositions();


                /*
                 * Start animation.
                 */

                requestAnimationFrame(
                    animationLoop
                );
            }
        );


        /*
         * Status.
         */

        if (
            interactionStatus
        ) {

            interactionStatus.textContent =
                MOBILE
                    ? "Touch and move around the emojis"
                    : "Move your cursor around the emojis";
        }


        console.log(
            "✨ Emoji World initialized"
        );


        console.log(
            `🎭 Emojis: ${emojis.length}`
        );


        console.log(
            `📱 Mobile optimization: ${MOBILE}`
        );
    }


    /* ========================================================
       START
       ======================================================== */

    init();

})();