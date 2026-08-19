/**
 * The Emojis
 * ----------
 * Main application entry point.
 *
 * Responsibilities:
 * - Wait for DOM
 * - Find Pixi canvas
 * - Initialize EmojiWorld
 * - Wait for complete async initialization
 * - Expose world for debugging
 * - Handle initialization errors safely
 * - Enable mobile touch interaction
 */

import { EmojiWorld } from './emojiWorld.js';
import { DesktopEmojiKeyboard } from './desktopEmojiKeyboard.js';
import { FirstRunTutorial } from './tutorial.js';
import './style.css';

'use strict';

console.log('🎮 Loading The Emojis...');

let emojiWorld = null;
let initialized = false;
let desktopEmojiKeyboard = null;

/* ============================================================
   APPLICATION INITIALIZATION
   ============================================================ */

async function initializeEmojiWorld() {
  if (initialized) {
    return;
  }

  initialized = true;

  console.log('📄 Initializing application...');

  /*
   * Find the canvas created in index.html.
   */
  const canvas =
    document.getElementById('pixi-canvas');

  if (!canvas) {
    console.error(
      '❌ Canvas element #pixi-canvas was not found.'
    );

    showInitializationError(
      'Canvas element not found.'
    );

    return;
  }

  console.log(
    '✓ Pixi canvas found'
  );

  try {
    /*
     * Create the EmojiWorld.
     *
     * EmojiWorld starts its asynchronous initialization
     * internally and exposes the promise as .ready.
     */
    emojiWorld =
      new EmojiWorld(canvas, {
        quality: 'auto'
      });

    /*
     * Make it accessible from DevTools.
     *
     * Example:
     *
     * window.emojiWorld
     */
    window.emojiWorld =
      emojiWorld;

    console.log(
      '⏳ Waiting for PixiJS + assets...'
    );

    /*
     * VERY IMPORTANT:
     *
     * Wait until:
     *
     * 1. PixiJS initializes
     * 2. WebGL renderer initializes
     * 3. 24 WebP assets load
     * 4. Scene is created
     * 5. Event listeners are attached
     * 6. Animation ticker starts
     */
    await emojiWorld.ready;

    console.log(
      '✨ The Emojis is ready!'
    );

    console.log(
      '😀 24 emoji characters loaded'
    );

    console.log(
      '🖱️ Desktop: move cursor over emojis'
    );

    console.log(
      '📱 Mobile: tap the keyboard button to open the scanner'
    );

    desktopEmojiKeyboard = new DesktopEmojiKeyboard(emojiWorld);
    desktopEmojiKeyboard.mount();

    const firstRunTutorial = new FirstRunTutorial(emojiWorld, desktopEmojiKeyboard);
    firstRunTutorial.startIfNeeded();

    /*
     * Optional event for external UI.
     */
    window.dispatchEvent(
      new CustomEvent(
        'emoji-world-ready'
      )
    );

  } catch (error) {
    console.error(
      '❌ Failed to initialize The Emojis:',
      error
    );

    console.error(
      'Stack:',
      error?.stack || error
    );

    showInitializationError(
      'Unable to initialize the emoji world.'
    );
  }
}

/* ============================================================
   ERROR DISPLAY
   ============================================================ */

function showInitializationError(message) {
  /*
   * Do not use canvas.getContext('2d') here.
   *
   * PixiJS owns the canvas and may already have a WebGL
   * rendering context attached to it.
   */

  let errorBox =
    document.getElementById(
      'emoji-init-error'
    );

  if (!errorBox) {
    errorBox =
      document.createElement('div');

    errorBox.id =
      'emoji-init-error';

    errorBox.style.position =
      'fixed';

    errorBox.style.left =
      '50%';

    errorBox.style.top =
      '50%';

    errorBox.style.transform =
      'translate(-50%, -50%)';

    errorBox.style.zIndex =
      '99999';

    errorBox.style.maxWidth =
      '90vw';

    errorBox.style.padding =
      '24px 28px';

    errorBox.style.borderRadius =
      '18px';

    errorBox.style.background =
      'rgba(255,255,255,0.96)';

    errorBox.style.color =
      '#111';

    errorBox.style.fontFamily =
      'system-ui, sans-serif';

    errorBox.style.textAlign =
      'center';

    errorBox.style.boxShadow =
      '0 20px 60px rgba(0,0,0,.2)';

    document.body.appendChild(
      errorBox
    );
  }

  errorBox.innerHTML = `
    <div style="
      font-size:32px;
      margin-bottom:10px;
    ">
      😵
    </div>

    <div style="
      font-size:18px;
      font-weight:700;
      margin-bottom:6px;
    ">
      The Emojis couldn't start
    </div>

    <div style="
      font-size:14px;
      opacity:.7;
    ">
      ${message}
    </div>

    <div style="
      margin-top:12px;
      font-size:12px;
      opacity:.5;
    ">
      Check the browser console for details.
    </div>
  `;
}

/* ============================================================
   MOBILE TOUCH OPTIMIZATION
   ============================================================ */

/*
 * Prevent browser scrolling while interacting directly
 * with the Pixi canvas.
 *
 * This is intentionally limited to the canvas so normal
 * page interactions remain untouched.
 */
document.addEventListener(
  'touchmove',
  (event) => {
    const target =
      event.target;

    if (
      target instanceof HTMLCanvasElement
    ) {
      event.preventDefault();
    }
  },
  {
    passive: false
  }
);

/* ============================================================
   PAGE VISIBILITY
   ============================================================ */

/*
 * When the browser tab becomes hidden, Pixi's ticker normally
 * handles this reasonably well, but resetting pointer state
 * prevents strange cursor jumps after returning to the page.
 */
document.addEventListener(
  'visibilitychange',
  () => {
    if (
      document.visibilityState ===
      'hidden'
    ) {
      return;
    }

    if (
      window.emojiWorld?.mouse
    ) {
      window.emojiWorld.mouse.x =
        window.innerWidth / 2;

      window.emojiWorld.mouse.y =
        window.innerHeight / 2;
    }
  }
);

/* ============================================================
   DOM READY
   ============================================================ */

if (
  document.readyState ===
  'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    initializeEmojiWorld,
    {
      once: true
    }
  );
} else {
  /*
   * Handles cases where this module loads after
   * DOMContentLoaded has already fired.
   */
  initializeEmojiWorld();
}