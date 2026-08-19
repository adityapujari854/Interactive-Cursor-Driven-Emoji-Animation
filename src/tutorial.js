/*
 * The Emojis – Interactive Emoji Scanner & Cursor Animation
 * Copyright © 2026 Aditya Pujari
 * All Rights Reserved.
 */


/**
 * First-run tutorial for The Emojis.
 * Uses a cookie so the walkthrough appears only once per browser.
 */

const COOKIE_NAME = 'the_emojis_tutorial_seen';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export class FirstRunTutorial {
  constructor(world, keyboard) {
    this.world = world;
    this.keyboard = keyboard;
    this.overlay = null;
    this.card = null;
    this.hand = null;
    this.target = null;
    this.step = 0;
    this.totalSteps = 3;
    this.started = false;
    this.resizeHandler = () => this._renderStep();
    this.lockHandler = (event) => this._handleLockedInteraction(event);
    this.lockedEvents = ['pointerdown', 'pointerup', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend', 'wheel', 'contextmenu', 'keydown'];
  }

  startIfNeeded() {
    if (this.started || this._hasSeen()) return;

    this.started = true;
    window.setTimeout(() => this._start(), 650);
  }

  _hasSeen() {
    return document.cookie
      .split(';')
      .some(part => part.trim().startsWith(`${COOKIE_NAME}=`));
  }

  _remember() {
    document.cookie = `${COOKIE_NAME}=1; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  }

  _start() {
    if (document.body.classList.contains('tutorial-active')) return;

    document.body.classList.add('tutorial-active');
    this._build();
    window.addEventListener('resize', this.resizeHandler, { passive: true });
    window.addEventListener('orientationchange', this.resizeHandler, { passive: true });
    this._renderStep();
    this._setInteractionLock(true);
  }

  _setInteractionLock(enabled) {
    if (enabled) {
      for (const type of this.lockedEvents) {
        document.addEventListener(type, this.lockHandler, { capture: true, passive: false });
      }
      document.body.classList.add('tutorial-input-locked');
      this.keyboard?.setTutorialLock?.(true);
    } else {
      for (const type of this.lockedEvents) {
        document.removeEventListener(type, this.lockHandler, { capture: true });
      }
      document.body.classList.remove('tutorial-input-locked');
      this.keyboard?.setTutorialLock?.(false);
    }
  }

  _handleLockedInteraction(event) {
    if (!this.overlay || !document.body.classList.contains('tutorial-active')) return;
    const tutorialControl = event.target?.closest?.('.emoji-tutorial-card button');
    if (tutorialControl) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
  }

  _build() {
    const overlay = document.createElement('div');
    overlay.className = 'emoji-tutorial';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'The Emojis quick tutorial');

    overlay.innerHTML = `
      <div class="emoji-tutorial-wash"></div>
      <div class="emoji-tutorial-target" aria-hidden="true"></div>
      <div class="emoji-tutorial-hand" aria-hidden="true">👉</div>
      <section class="emoji-tutorial-card">
        <button class="emoji-tutorial-close" type="button" aria-label="Close tutorial">×</button>
        <div class="emoji-tutorial-step">STEP 1 / 3</div>
        <div class="emoji-tutorial-icon">✨</div>
        <h2 class="emoji-tutorial-title">The Emojis</h2>
        <p class="emoji-tutorial-copy"></p>
        <div class="emoji-tutorial-actions">
          <button class="emoji-tutorial-skip" type="button">Skip tutorial</button>
          <button class="emoji-tutorial-next" type="button">Next <span>→</span></button>
        </div>
      </section>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.card = overlay.querySelector('.emoji-tutorial-card');
    this.hand = overlay.querySelector('.emoji-tutorial-hand');
    this.target = overlay.querySelector('.emoji-tutorial-target');

    overlay.querySelector('.emoji-tutorial-close').addEventListener('click', () => {
      if (this.step < this.totalSteps - 1) {
        this.step += 1;
        if (this.step === 2) this.keyboard?.openForTutorial?.();
        this._renderStep();
      } else {
        this._finish();
      }
    });
    overlay.querySelector('.emoji-tutorial-skip').addEventListener('click', () => {
      this._finish();
    });
    overlay.querySelector('.emoji-tutorial-next').addEventListener('click', () => {
      if (this.step >= this.totalSteps - 1) {
        this._finish();
        return;
      }
      this.step += 1;
      if (this.step === 2) this.keyboard?.openForTutorial?.();
      this._renderStep();
    });
  }

  _isMobile() {
    return Boolean(
      this.world?.isMobileOrTablet ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(max-width: 899px)').matches
    );
  }

  _getTarget() {
    const mobile = this._isMobile();

    if (this.step === 0) {
      const emoji = this.world?.emojis?.[0]?.element;
      if (emoji) return this._rect(emoji);
    }

    if (this.step === 1) {
      const node = mobile
        ? this.keyboard?.toggleButton
        : this.keyboard?.root;
      if (node) return this._rect(node);
    }

    if (this.step === 2) {
      if (mobile) this.keyboard?.openForTutorial?.();
      const key = this.keyboard?.keys?.[0];
      if (key) return this._rect(key);
    }

    return {
      left: window.innerWidth * 0.5 - 30,
      top: window.innerHeight * 0.5 - 30,
      width: 60,
      height: 60,
      right: window.innerWidth * 0.5 + 30,
      bottom: window.innerHeight * 0.5 + 30,
      centerX: window.innerWidth * 0.5,
      centerY: window.innerHeight * 0.5
    };
  }

  _rect(node) {
    const r = node.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      right: r.right,
      bottom: r.bottom,
      centerX: r.left + r.width / 2,
      centerY: r.top + r.height / 2
    };
  }

  _renderStep() {
    if (!this.overlay) return;

    const mobile = this._isMobile();
    const target = this._getTarget();
    const targetPad = mobile ? 8 : 12;

    this.overlay.dataset.step = String(this.step + 1);
    this.overlay.dataset.mode = mobile ? 'mobile' : 'desktop';

    this.target.style.left = `${target.left - targetPad}px`;
    this.target.style.top = `${target.top - targetPad}px`;
    this.target.style.width = `${target.width + targetPad * 2}px`;
    this.target.style.height = `${target.height + targetPad * 2}px`;

    /*
     * Position the hand away from the target and rotate it so the
     * finger points directly at the highlighted control. This is
     * especially important on phones where the keyboard button sits
     * in the upper-right corner.
     */
    const targetCx = target.centerX;
    const targetCy = target.centerY;
    let handCx;
    let handCy;

    if (mobile && this.step === 1) {
      handCx = targetCx + 72;
      handCy = targetCy + 78;
    } else if (mobile) {
      handCx = targetCx + 62;
      handCy = targetCy + 62;
    } else {
      handCx = targetCx + 74;
      handCy = targetCy + 58;
    }

    const angle = Math.atan2(targetCy - handCy, targetCx - handCx) * 180 / Math.PI;
    this.hand.style.left = `${handCx}px`;
    this.hand.style.top = `${handCy}px`;
    this.hand.style.setProperty('--hand-angle', `${angle}deg`);

    const content = this.card.querySelector('.emoji-tutorial-copy');
    const title = this.card.querySelector('.emoji-tutorial-title');
    const step = this.card.querySelector('.emoji-tutorial-step');
    const icon = this.card.querySelector('.emoji-tutorial-icon');
    const next = this.card.querySelector('.emoji-tutorial-next');

    const skip = this.card.querySelector('.emoji-tutorial-skip');

    const data = [
      {
        icon: '🎭',
        title: 'Welcome to The Emojis',
        copy: 'Meet the animated emoji world. Move around and watch the characters react on their glass platforms.',
        next: 'Next'
      },
      {
        icon: '⌨️',
        title: mobile ? 'Open the Emoji Keyboard' : 'Find the Emoji Keyboard',
        copy: mobile
          ? 'Tap the keyboard button to open the 24-emoji scanner.'
          : 'The glass scanner keyboard lives in the bottom-right corner. It is ready whenever you are.',
        next: 'Next'
      },
      {
        icon: '🔍',
        title: 'Scan Any Emoji',
        copy: 'Choose any emoji to launch the cinematic biometric scan and copy it to your clipboard.',
        next: 'Start Exploring'
      }
    ][this.step];

    step.textContent = `STEP ${this.step + 1} / 3`;
    icon.textContent = data.icon;
    title.textContent = data.title;
    content.textContent = data.copy;
    next.innerHTML = `${data.next} <span>→</span>`;
    skip.style.visibility = this.step === 0 ? 'visible' : 'hidden';

    // Re-trigger the hand's pointing motion on every step.
    this.hand.classList.remove('is-pointing');
    void this.hand.offsetWidth;
    this.hand.classList.add('is-pointing');
  }

  _finish() {
    this._remember();
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('orientationchange', this.resizeHandler);
    this._setInteractionLock(false);
    this.overlay?.classList.add('is-closing');

    window.setTimeout(() => {
      this.overlay?.remove();
      this.overlay = null;
      document.body.classList.remove('tutorial-active');
      this.keyboard?.root?.classList.remove('tutorial-highlighted');
    }, 220);
  }
}
