/*
 * The Emojis – Interactive Emoji Scanner & Cursor Animation
 * Copyright © 2026 Aditya Pujari
 * All Rights Reserved.
 */

/* ============================================================
   INTERACTIVE 3D EMOJI WORLD
   Single Light Theme
   Cursor Driven
   24 Individual Emoji Personalities
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


    /* ========================================================
       CONFIGURATION
       ======================================================== */

    const CONFIG = {

        emojiFolder:
            "assets/emojis/",

        emojiCount:
            24,

        /*
         * Cursor interaction radius.
         */

        interactionRadius:
            190,

        /*
         * Maximum distance an emoji can
         * move away from cursor.
         */

        maxPush:
            34,

        /*
         * Cursor smoothing.
         */

        cursorSmoothing:
            0.18,

        /*
         * Emoji position smoothing.
         */

        movementSmoothing:
            0.075,

        /*
         * Rotation smoothing.
         */

        rotationSmoothing:
            0.10,

        /*
         * Glow smoothing.
         */

        glowSmoothing:
            0.10
    };


    /* ========================================================
       CURSOR STATE
       ======================================================== */

    const cursor = {

        x:
            window.innerWidth / 2,

        y:
            window.innerHeight / 2,

        targetX:
            window.innerWidth / 2,

        targetY:
            window.innerHeight / 2,

        visible:
            false
    };


    /* ========================================================
       EMOJI PERSONALITIES
       ======================================================== */

    const personalities = [

        {
            name: "Happy",

            animation: "bounce",

            speed: 1.0,

            movement: 1.0,

            rotation: 0.5,

            reaction: "✨"
        },

        {
            name: "Laughing",

            animation: "laugh",

            speed: 1.15,

            movement: 1.0,

            rotation: 1.3,

            reaction: "😂"
        },

        {
            name: "Love",

            animation: "pulse",

            speed: 0.8,

            movement: 0.7,

            rotation: 0.4,

            reaction: "💗"
        },

        {
            name: "Cool",

            animation: "cool",

            speed: 0.65,

            movement: 0.8,

            rotation: 1.0,

            reaction: "😎"
        },

        {
            name: "Thinking",

            animation: "thinking",

            speed: 0.7,

            movement: 0.7,

            rotation: 2.0,

            reaction: "❔"
        },

        {
            name: "Angry",

            animation: "angry",

            speed: 1.1,

            movement: 1.2,

            rotation: 2.0,

            reaction: "💢"
        },

        {
            name: "Party",

            animation: "party",

            speed: 1.25,

            movement: 1.25,

            rotation: 1.5,

            reaction: "🎉"
        },

        {
            name: "Excited",

            animation: "excited",

            speed: 1.35,

            movement: 1.2,

            rotation: 0.8,

            reaction: "✨"
        },

        {
            name: "Sleepy",

            animation: "sleepy",

            speed: 0.45,

            movement: 0.5,

            rotation: 0.3,

            reaction: "💤"
        },

        {
            name: "Shocked",

            animation: "shock",

            speed: 0.8,

            movement: 1.15,

            rotation: 0.8,

            reaction: "❕"
        },

        {
            name: "Smirk",

            animation: "smirk",

            speed: 0.6,

            movement: 0.6,

            rotation: 1.4,

            reaction: "😏"
        },

        {
            name: "Angel",

            animation: "angel",

            speed: 0.5,

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

            speed: 1.0,

            movement: 1.0,

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

            movement: 0.7,

            rotation: 1.0,

            reaction: "💋"
        },

        {
            name: "Cold",

            animation: "cold",

            speed: 1.1,

            movement: 0.9,

            rotation: 1.4,

            reaction: "❄️"
        },

        {
            name: "Melting",

            animation: "melt",

            speed: 0.4,

            movement: 0.45,

            rotation: 0.5,

            reaction: "🫠"
        },

        {
            name: "Grinning",

            animation: "grin",

            speed: 0.95,

            movement: 0.9,

            rotation: 0.5,

            reaction: "😁"
        },

        {
            name: "Wink",

            animation: "wink",

            speed: 0.9,

            movement: 0.8,

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

            speed: 0.7,

            movement: 0.75,

            rotation: 0.5,

            reaction: "🙂"
        },

        {
            name: "Upset",

            animation: "upset",

            speed: 0.5,

            movement: 0.65,

            rotation: 0.8,

            reaction: "💧"
        }
    ];


    /* ========================================================
       EMOJI STATE
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

        return Math.random() *
            (
                max -
                min
            ) +
            min;
    }


    function distance(
        x1,
        y1,
        x2,
        y2
    ) {

        const dx =
            x2 - x1;

        const dy =
            y2 - y1;

        return Math.sqrt(
            dx * dx +
            dy * dy
        );
    }


    /* ========================================================
       CREATE EMOJI ELEMENTS
       ======================================================== */

    function initializeEmojis() {

        if (!emojiGrid) {
            return;
        }


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


                const glow =
                    card.querySelector(
                        ".emoji-glow"
                    );


                /*
                 * Make sure correct image
                 * is always loaded.
                 */

                if (image) {

                    image.src =
                        `${CONFIG.emojiFolder}512 (${index + 1}).webp`;

                    image.draggable =
                        false;
                }


                /*
                 * Set personality.
                 */

                card.dataset.animation =
                    personality.animation;


                card.dataset.personality =
                    personality.name;


                /*
                 * Random animation delay.
                 */

                card.style.setProperty(
                    "--animation-delay",
                    `${random(
                        -4,
                        0
                    )}s`
                );


                /*
                 * Individual scale.
                 */

                const scale =
                    random(
                        0.94,
                        1.04
                    );


                card.style.setProperty(
                    "--emoji-scale",
                    scale
                );


                /*
                 * Individual animation speed.
                 */

                card.style.setProperty(
                    "--animation-speed",
                    personality.speed
                );


                /*
                 * Store runtime state.
                 */

                emojis.push({

                    card,

                    character,

                    image,

                    platform,

                    glow,

                    personality,

                    index,

                    centerX: 0,

                    centerY: 0,

                    pushX: 0,

                    pushY: 0,

                    targetPushX: 0,

                    targetPushY: 0,

                    rotation: 0,

                    targetRotation: 0,

                    shine: 0,

                    targetShine: 0,

                    scale,

                    phase:
                        random(
                            0,
                            Math.PI * 2
                        ),

                    phase2:
                        random(
                            0,
                            Math.PI * 2
                        ),

                    idleSpeed:
                        random(
                            0.65,
                            1.25
                        ),

                    lastNear:
                        false,

                    reactionCooldown:
                        random(
                            500,
                            1800
                        ),

                    lastReaction:
                        0
                });
            }
        );
    }


    /* ========================================================
       UPDATE EMOJI CENTER POSITIONS
       ======================================================== */

    function updatePositions() {

        emojis.forEach(
            emoji => {

                const rect =
                    emoji.card.getBoundingClientRect();


                emoji.centerX =
                    rect.left +
                    rect.width / 2;


                emoji.centerY =
                    rect.top +
                    rect.height * 0.43;
            }
        );
    }


    /* ========================================================
       CURSOR EVENTS
       ======================================================== */

    function pointerMove(
        event
    ) {

        cursor.targetX =
            event.clientX;

        cursor.targetY =
            event.clientY;

        cursor.visible =
            true;
    }


    window.addEventListener(
        "pointermove",
        pointerMove,
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


    window.addEventListener(
        "pointerdown",
        event => {

            cursor.targetX =
                event.clientX;

            cursor.targetY =
                event.clientY;

            cursor.visible =
                true;


            createCursorBurst(
                event.clientX,
                event.clientY
            );
        },
        {
            passive: true
        }
    );


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


        if (scene) {

            scene.style.setProperty(
                "--cursor-x",
                `${cursor.x}px`
            );

            scene.style.setProperty(
                "--cursor-y",
                `${cursor.y}px`
            );
        }
    }


    /* ========================================================
       UPDATE EMOJI INTERACTION
       ======================================================== */

    function updateEmojiInteraction(
        emoji,
        time
    ) {

        const dist =
            distance(
                emoji.centerX,
                emoji.centerY,
                cursor.x,
                cursor.y
            );


        /*
         * Normalize interaction.
         */

        const intensity =
            clamp(
                1 -
                dist /
                CONFIG.interactionRadius,
                0,
                1
            );


        /*
         * Cursor is near.
         */

        if (
            intensity > 0
        ) {

            emoji.targetShine =
                intensity;


            /*
             * Direction away from cursor.
             */

            let dx =
                emoji.centerX -
                cursor.x;

            let dy =
                emoji.centerY -
                cursor.y;


            const length =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            if (length > 0.001) {

                dx /=
                    length;

                dy /=
                    length;
            }


            /*
             * Different emojis have
             * different movement strength.
             */

            const movement =
                intensity *
                CONFIG.maxPush *
                emoji.personality.movement;


            emoji.targetPushX =
                dx *
                movement;


            emoji.targetPushY =
                dy *
                movement;


            /*
             * Tilt toward the direction
             * they are escaping.
             */

            const tilt =
                clamp(
                    dx *
                    9 *
                    emoji.personality.rotation,
                    -12,
                    12
                );


            emoji.targetRotation =
                tilt;


            /*
             * Trigger personality response.
             */

            if (
                !emoji.lastNear
            ) {

                emoji.lastNear =
                    true;


                triggerReaction(
                    emoji
                );
            }

        } else {

            /*
             * Cursor is far away.
             */

            emoji.targetShine =
                0;


            emoji.targetPushX =
                0;


            emoji.targetPushY =
                0;


            emoji.targetRotation =
                0;


            emoji.lastNear =
                false;
        }


        /*
         * Smooth position.
         */

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


        /*
         * Smooth rotation.
         */

        emoji.rotation =
            lerp(
                emoji.rotation,
                emoji.targetRotation,
                CONFIG.rotationSmoothing
            );


        /*
         * Smooth glow.
         */

        emoji.shine =
            lerp(
                emoji.shine,
                emoji.targetShine,
                CONFIG.glowSmoothing
            );


        /*
         * Natural breathing.
         */

        const breathing =
            Math.sin(
                time *
                emoji.idleSpeed +
                emoji.phase
            ) *
            1.5;


        /*
         * Secondary micro-motion.
         */

        const micro =
            Math.sin(
                time *
                emoji.idleSpeed *
                0.7 +
                emoji.phase2
            );


        /*
         * CSS variables.
         */

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
            `${emoji.rotation}deg`
        );


        emoji.card.style.setProperty(
            "--shine",
            emoji.shine
        );


        emoji.card.style.setProperty(
            "--breath",
            `${breathing}px`
        );


        emoji.card.style.setProperty(
            "--micro-motion",
            `${micro}px`
        );


        /*
         * Near cursor class.
         */

        if (
            intensity > 0.05
        ) {

            emoji.card.classList.add(
                "near-cursor"
            );

        } else {

            emoji.card.classList.remove(
                "near-cursor"
            );
        }
    }


    /* ========================================================
       PERSONALITY REACTION
       ======================================================== */

    function triggerReaction(
        emoji
    ) {

        const now =
            performance.now();


        /*
         * Prevent excessive particles.
         */

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
         * Only some interactions
         * generate a floating symbol.
         */

        if (
            Math.random() >
            0.72
        ) {

            return;
        }


        const rect =
            emoji.card.getBoundingClientRect();


        const x =
            rect.left +
            rect.width / 2;


        const y =
            rect.top +
            rect.height * 0.28;


        createReaction(
            x,
            y,
            emoji.personality.reaction
        );
    }


    /* ========================================================
       CREATE REACTION
       ======================================================== */

    function createReaction(
        x,
        y,
        symbol
    ) {

        if (!reactionLayer) {
            return;
        }


        const element =
            document.createElement(
                "div"
            );


        element.className =
            "reaction";


        element.textContent =
            symbol;


        element.style.setProperty(
            "--reaction-x",
            `${x}px`
        );


        element.style.setProperty(
            "--reaction-y",
            `${y}px`
        );


        element.style.setProperty(
            "--reaction-dx",
            `${random(
                -28,
                28
            )}px`
        );


        element.style.setProperty(
            "--reaction-dy",
            `${random(
                -48,
                -25
            )}px`
        );


        reactionLayer.appendChild(
            element
        );


        setTimeout(
            () => {

                element.remove();

            },
            1300
        );
    }


    /* ========================================================
       CLICK BURST
       ======================================================== */

    function createCursorBurst(
        x,
        y
    ) {

        for (
            let i = 0;
            i < 5;
            i++
        ) {

            createReaction(
                x +
                random(
                    -20,
                    20
                ),

                y +
                random(
                    -20,
                    20
                ),

                "✦"
            );
        }
    }


    /* ========================================================
       UPDATE PLATFORM
       ======================================================== */

    function updatePlatform(
        emoji
    ) {

        if (
            !emoji.platform
        ) {
            return;
        }


        const shine =
            emoji.shine;


        /*
         * Platform becomes slightly
         * brighter when cursor approaches.
         */

        emoji.platform.style.setProperty(
            "--platform-light",
            shine
        );
    }


    /* ========================================================
       MAIN ANIMATION LOOP
       ======================================================== */

    let previousTime =
        performance.now();


    function animate(
        currentTime
    ) {

        const elapsed =
            currentTime -
            previousTime;


        previousTime =
            currentTime;


        /*
         * Smooth cursor.
         */

        updateCursor();


        /*
         * Refresh positions.
         */

        updatePositions();


        /*
         * Convert time to seconds.
         */

        const time =
            currentTime /
            1000;


        /*
         * Update all emojis.
         */

        emojis.forEach(
            emoji => {

                updateEmojiInteraction(
                    emoji,
                    time
                );


                updatePlatform(
                    emoji
                );
            }
        );


        /*
         * Continue loop.
         */

        requestAnimationFrame(
            animate
        );
    }


    /* ========================================================
       RESIZE
       ======================================================== */

    let resizeTimer;


    window.addEventListener(
        "resize",
        () => {

            clearTimeout(
                resizeTimer
            );


            resizeTimer =
                setTimeout(
                    () => {

                        updatePositions();

                    },
                    100
                );
        }
    );


    /* ========================================================
       VISIBILITY OPTIMIZATION
       ======================================================== */

    let animationRunning =
        true;


    document.addEventListener(
        "visibilitychange",
        () => {

            animationRunning =
                !document.hidden;

        }
    );


    /* ========================================================
       INITIALIZE
       ======================================================== */

    function init() {

        /*
         * Make sure scene exists.
         */

        if (!scene) {

            console.error(
                "Emoji World: #scene not found."
            );

            return;
        }


        /*
         * Create emoji states.
         */

        initializeEmojis();


        /*
         * Initial positions.
         */

        requestAnimationFrame(
            () => {

                updatePositions();

                requestAnimationFrame(
                    animate
                );
            }
        );


        /*
         * Initial status.
         */

        if (
            interactionStatus
        ) {

            interactionStatus.textContent =
                "Move your cursor around the emojis";

        }


        console.log(
            "✨ Interactive 3D Emoji World loaded"
        );


        console.log(
            `🎭 ${emojis.length} emoji characters`
        );
    }


    /* ========================================================
       START
       ======================================================== */

    init();

})();