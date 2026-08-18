/**
 * ============================================================
 * THE EMOJIS
 * Main Application Entry
 * ============================================================
 *
 * Vite + PixiJS
 *
 * Responsibilities:
 * - Start EmojiWorld once
 * - Find the Pixi canvas placeholder
 * - Handle initialization errors
 * - Expose EmojiWorld for debugging
 * - Handle mobile touch behavior
 * - Handle page visibility for mobile performance
 * ============================================================
 */

import { EmojiWorld } from './emojiWorld.js';
import './style.css';


/* ============================================================
   CONFIGURATION
   ============================================================ */

const CONFIG = {
    canvasId: 'pixi-canvas',

    /*
     * Prevent accidental double initialization.
     */
    initializationKey: '__THE_EMOJIS_WORLD__',

    /*
     * Mobile devices can temporarily freeze while
     * switching tabs/apps. We let EmojiWorld know
     * when the page becomes hidden.
     */
    pauseWhenHidden: true
};


/* ============================================================
   STATE
   ============================================================ */

let emojiWorld = null;
let initialized = false;


/* ============================================================
   DOM HELPERS
   ============================================================ */

/**
 * Get the Pixi canvas placeholder.
 */
function getCanvas() {
    return document.getElementById(
        CONFIG.canvasId
    );
}


/**
 * Create a lightweight error message.
 *
 * Do NOT paint the whole canvas red.
 * A red canvas makes debugging harder and
 * looks broken to users.
 */
function showInitializationError(error) {

    console.error(
        '[The Emojis] Initialization failed:',
        error
    );

    const app =
        document.getElementById('app');

    if (!app) {
        return;
    }

    /*
     * Avoid adding multiple error panels.
     */
    if (
        document.getElementById(
            'emoji-error'
        )
    ) {
        return;
    }

    const errorPanel =
        document.createElement('div');

    errorPanel.id =
        'emoji-error';

    errorPanel.setAttribute(
        'role',
        'alert'
    );

    errorPanel.innerHTML = `
        <div class="emoji-error-content">
            <strong>The Emojis could not start.</strong>
            <span>Please refresh the page.</span>
        </div>
    `;

    /*
     * Keep the fallback extremely lightweight.
     */
    Object.assign(
        errorPanel.style,
        {
            position: 'fixed',
            inset: '0',
            display: 'grid',
            placeItems: 'center',
            padding: '24px',
            background: '#050505',
            color: '#ffffff',
            fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
            zIndex: '99999',
            textAlign: 'center',
            pointerEvents: 'none'
        }
    );

    const content =
        errorPanel.querySelector(
            '.emoji-error-content'
        );

    if (content) {
        Object.assign(
            content.style,
            {
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                opacity: '0.9'
            }
        );
    }

    app.appendChild(
        errorPanel
    );
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

async function initializeEmojiWorld() {

    /*
     * Prevent duplicate startup.
     *
     * This is especially useful with
     * Vite HMR during development.
     */
    if (
        initialized ||
        window[
            CONFIG.initializationKey
        ]
    ) {
        console.warn(
            '[The Emojis] Already initialized.'
        );

        return window[
            CONFIG.initializationKey
        ];
    }

    initialized = true;

    console.log(
        '✨ The Emojis — starting...'
    );

    /*
     * Find placeholder canvas.
     */
    const canvas =
        getCanvas();

    if (!canvas) {

        const error =
            new Error(
                `Canvas #${CONFIG.canvasId} was not found.`
            );

        console.error(
            '[The Emojis]',
            error
        );

        initialized = false;

        showInitializationError(
            error
        );

        return null;
    }

    console.log(
        '[The Emojis] Canvas placeholder found.'
    );

    try {

        /*
         * Create the world.
         *
         * EmojiWorld handles the PixiJS
         * application and replaces the
         * placeholder canvas with the
         * real Pixi canvas.
         */
        emojiWorld =
            new EmojiWorld(
                canvas,
                {
                    quality: 'auto'
                }
            );

        /*
         * Global reference for debugging.
         *
         * Example in DevTools:
         *
         * window.emojiWorld
         */
        window[
            CONFIG.initializationKey
        ] = emojiWorld;

        window.emojiWorld =
            emojiWorld;

        console.log(
            '🎉 The Emojis world created.'
        );

        console.log(
            '🖱️ Desktop: move the cursor.'
        );

        console.log(
            '📱 Mobile: tilt the phone and shake once.'
        );

        /*
         * Some versions of EmojiWorld may expose
         * a ready Promise.
         *
         * If available, wait for it.
         */
        if (
            emojiWorld.ready &&
            typeof emojiWorld.ready.then ===
                'function'
        ) {

            await emojiWorld.ready;

            console.log(
                '✅ The Emojis world is ready.'
            );
        }

        return emojiWorld;

    } catch (error) {

        initialized = false;

        window[
            CONFIG.initializationKey
        ] = null;

        window.emojiWorld =
            null;

        showInitializationError(
            error
        );

        return null;
    }
}


/* ============================================================
   PAGE VISIBILITY
   ============================================================ */

/**
 * Pause/resume animation when the browser
 * hides the page.
 *
 * This is important on mobile because
 * browsers may switch tabs or lock the
 * screen and we don't want unnecessary
 * animation work.
 */
function setupVisibilityHandling() {

    if (
        !CONFIG.pauseWhenHidden
    ) {
        return;
    }

    document.addEventListener(
        'visibilitychange',
        () => {

            if (!emojiWorld) {
                return;
            }

            const hidden =
                document.hidden;

            /*
             * Let EmojiWorld decide how its
             * Pixi ticker should be handled.
             */
            if (
                typeof emojiWorld.setPageVisibility ===
                'function'
            ) {

                emojiWorld.setPageVisibility(
                    !hidden
                );

                return;
            }

            /*
             * Fallback for current implementation.
             */
            if (
                emojiWorld.app &&
                emojiWorld.app.ticker
            ) {

                if (hidden) {
                    emojiWorld.app.ticker.stop();
                } else {
                    emojiWorld.app.ticker.start();
                }
            }
        },
        {
            passive: true
        }
    );
}


/* ============================================================
   TOUCH PERFORMANCE
   ============================================================ */

/**
 * Prevent browser scrolling while interacting
 * with the Emoji World canvas.
 *
 * CSS touch-action is preferred, but this
 * provides an additional fallback.
 */
function setupTouchHandling() {

    document.addEventListener(
        'touchmove',
        (event) => {

            const target =
                event.target;

            /*
             * Only block scrolling when the
             * interaction is actually happening
             * over the Pixi canvas.
             */
            if (
                target &&
                (
                    target.id ===
                    CONFIG.canvasId ||
                    target.tagName ===
                    'CANVAS'
                )
            ) {
                event.preventDefault();
            }
        },
        {
            passive: false
        }
    );
}


/* ============================================================
   GLOBAL ERROR HANDLING
   ============================================================ */

/**
 * Catch unexpected synchronous errors.
 */
window.addEventListener(
    'error',
    (event) => {

        console.error(
            '[The Emojis] Runtime error:',
            event.error ||
            event.message
        );
    }
);


/**
 * Catch asynchronous Promise errors.
 *
 * This is particularly important for
 * PixiJS initialization because
 * Application.create() is asynchronous.
 */
window.addEventListener(
    'unhandledrejection',
    (event) => {

        console.error(
            '[The Emojis] Unhandled Promise rejection:',
            event.reason
        );

        /*
         * Only show the UI error if the
         * world has not successfully started.
         */
        if (!emojiWorld) {

            showInitializationError(
                event.reason
            );
        }
    }
);


/* ============================================================
   VITE / HMR SUPPORT
   ============================================================ */

/**
 * During Vite development, HMR can reload
 * modules without fully reloading the page.
 *
 * Destroy the previous world if possible.
 */
if (
    import.meta.hot
) {

    import.meta.hot.dispose(
        () => {

            console.log(
                '[The Emojis] Cleaning up HMR...'
            );

            if (
                emojiWorld &&
                typeof emojiWorld.destroy ===
                'function'
            ) {

                try {
                    emojiWorld.destroy();
                } catch (error) {
                    console.warn(
                        '[The Emojis] Cleanup warning:',
                        error
                    );
                }
            }

            emojiWorld = null;

            initialized = false;

            window[
                CONFIG.initializationKey
            ] = null;

            window.emojiWorld =
                null;
        }
    );
}


/* ============================================================
   BOOT
 * ============================================================ */

async function boot() {

    /*
     * If the script is loaded as a module
     * at the end of body, DOM is already
     * available. Otherwise wait for it.
     */
    if (
        document.readyState ===
        'loading'
    ) {

        await new Promise(
            (resolve) => {

                document.addEventListener(
                    'DOMContentLoaded',
                    resolve,
                    {
                        once: true
                    }
                );
            }
        );
    }

    console.log(
        '📄 DOM ready.'
    );

    /*
     * Setup browser behavior first.
     */
    setupTouchHandling();

    setupVisibilityHandling();

    /*
     * Start Emoji World.
     */
    await initializeEmojiWorld();
}


/* ============================================================
   START APPLICATION
   ============================================================ */

boot().catch(
    (error) => {

        console.error(
            '[The Emojis] Fatal startup error:',
            error
        );

        showInitializationError(
            error
        );
    }
);