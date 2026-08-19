const EMOJIS = [
  ['😀','Happy'],['😄','Grinning'],['😁','Beaming'],['😆','Laughing'],['😅','Sweat Smile'],['😂','Joy'],
  ['🤣','Rolling Laugh'],['😭','Crying'],['😠','Angry'],['😱','Screaming'],['😮','Astonished'],['🥳','Party'],
  ['😍','Heart Eyes'],['😈','Devil'],['👻','Ghost'],['🤓','Nerd'],['😏','Smirk'],['🥶','Freezing'],
  ['😇','Angel'],['😬','Grimace'],['😎','Sunglasses'],['🙈','Peekaboo'],['🤯','Mind Blown'],['🙄','Eye Roll']
].map(([char, name]) => ({ char, name }));

const SCAN_DURATION = 2200;
const COPY_DURATION = 10000;

export class DesktopEmojiKeyboard {
  constructor(world) {
    this.world = world;
    this.root = null;
    this.backdrop = null;
    this.toggleButton = null;
    this.scanner = null;
    this.selectedNode = null;
    this.labelNode = null;
    this.statusText = null;
    this.statusIcon = null;
    this.progress = null;
    this.progressFill = null;
    this.progressTime = null;
    this.keyGrid = null;
    this.keys = [];
    this.selected = null;
    this.selectedIndex = -1;
    this.busy = false;
    this.scanTimer = null;
    this.copyTimer = null;
    this.progressRaf = 0;
    this.resizeHandler = () => this._syncVisibility();
    this.themeObserver = null;
  }

  mount() {
    if (this.root) return;

    this._build();
    this._syncVisibility();

    window.addEventListener('resize', this.resizeHandler, { passive: true });
    window.addEventListener('orientationchange', this.resizeHandler, { passive: true });

    this.themeObserver = new MutationObserver(() => this._syncTheme());
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    this._syncTheme();
  }

  destroy() {
    clearTimeout(this.scanTimer);
    clearTimeout(this.copyTimer);
    cancelAnimationFrame(this.progressRaf);
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('orientationchange', this.resizeHandler);
    this.themeObserver?.disconnect();
    this.root?.remove();
    this.backdrop?.remove();
    this.toggleButton?.remove();
    this.root = null;
    this.keys = [];
  }

  _isTouchDevice() {
    return Boolean(
      this.world?.isMobileOrTablet ||
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(max-width: 899px)').matches
    );
  }

  _isDesktop() {
    return !this._isTouchDevice() &&
      window.matchMedia('(pointer: fine)').matches &&
      window.matchMedia('(min-width: 900px)').matches;
  }

  _isAvailable() {
    return Boolean(this.world) && (this._isDesktop() || this._isTouchDevice());
  }

  _build() {
    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'emoji-deck-backdrop';
    backdrop.setAttribute('aria-label', 'Close emoji keyboard');
    backdrop.addEventListener('click', () => {
      if (!this.busy) this._setMobileOpen(false);
    });
    document.body.appendChild(backdrop);
    this.backdrop = backdrop;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'emoji-deck-mobile-toggle';
    toggle.setAttribute('aria-label', 'Open emoji keyboard');
    toggle.innerHTML = '<span class="emoji-deck-toggle-icon">⌨</span><span class="emoji-deck-toggle-pulse"></span>';
    toggle.addEventListener('click', () => {
      this._setMobileOpen(!this.root?.classList.contains('is-mobile-open'));
    });
    document.body.appendChild(toggle);
    this.toggleButton = toggle;

    const root = document.createElement('aside');
    root.className = 'desktop-emoji-deck';
    root.setAttribute('aria-label', 'Emoji clipboard scanner');
    root.innerHTML = `
      <div class="emoji-deck-scanfield" aria-live="polite">
        <div class="emoji-deck-scan-orbit orbit-a"></div>
        <div class="emoji-deck-scan-orbit orbit-b"></div>
        <div class="emoji-deck-scan-grid"></div>
        <div class="emoji-deck-scan-particles" aria-hidden="true"></div>
        <div class="emoji-deck-platform">
          <span class="platform-reflection"></span><span class="platform-edge"></span><span class="platform-shadow"></span>
        </div>
        <div class="emoji-deck-beam" aria-hidden="true"><span></span></div>
        <!-- The real Pixi/DOM emoji is portaled here visually by EmojiWorld.
             This node is intentionally empty to prevent duplicate emojis. -->
        <div class="emoji-deck-selected" aria-hidden="true"></div>
        <div class="emoji-deck-scan-label"><span class="scan-dot"></span><span class="scan-label-text">READY TO SCAN</span></div>
      </div>
      <div class="emoji-deck-header">
        <div><div class="emoji-deck-eyebrow"><span class="deck-led"></span> EMOJI DECK</div><div class="emoji-deck-title">Clipboard Scanner</div></div>
        <div class="emoji-deck-count">24</div>
      </div>
      <div class="emoji-deck-keys" role="grid" aria-label="24 emojis"></div>
      <div class="emoji-deck-progress" aria-hidden="true">
        <div class="emoji-deck-progress-top"><span class="progress-icon">◈</span><span class="progress-text">COPY SEQUENCE</span><span class="progress-time">10.0s</span></div>
        <div class="emoji-deck-progress-track"><div class="emoji-deck-progress-fill"></div><div class="emoji-deck-progress-sheen"></div></div>
      </div>
      <div class="emoji-deck-status"><span class="status-icon">✦</span><span class="status-text">Select an emoji to scan</span></div>
    `;

    document.body.appendChild(root);
    this.root = root;
    this.scanner = root.querySelector('.emoji-deck-scanfield');
    this.selectedNode = root.querySelector('.emoji-deck-selected');
    this.labelNode = root.querySelector('.scan-label-text');
    this.statusText = root.querySelector('.status-text');
    this.statusIcon = root.querySelector('.status-icon');
    this.progress = root.querySelector('.emoji-deck-progress');
    this.progressFill = root.querySelector('.emoji-deck-progress-fill');
    this.progressTime = root.querySelector('.progress-time');
    this.keyGrid = root.querySelector('.emoji-deck-keys');

    this._buildKeys();
    this._buildScanParticles();
  }

  _buildKeys() {
    EMOJIS.forEach((emoji, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'emoji-deck-key';
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', `${emoji.name}: copy ${emoji.char}`);
      button.title = `${emoji.name} · scan & copy`;
      button.innerHTML = `<span class="key-rim"></span><span class="key-emoji">${emoji.char}</span><span class="key-glint"></span>`;
      button.addEventListener('click', () => this._select(index, button));
      this.keyGrid.appendChild(button);
      this.keys.push(button);
    });
  }

  _buildScanParticles() {
    const layer = this.root.querySelector('.emoji-deck-scan-particles');
    for (let i = 0; i < 18; i += 1) {
      const particle = document.createElement('i');
      particle.style.setProperty('--px', `${10 + Math.random() * 80}%`);
      particle.style.setProperty('--py', `${14 + Math.random() * 68}%`);
      particle.style.setProperty('--ps', `${1 + Math.random() * 2}px`);
      particle.style.setProperty('--pd', `${-Math.random() * 3.5}s`);
      particle.style.setProperty('--pt', `${2.2 + Math.random() * 2.8}s`);
      layer.appendChild(particle);
    }
  }

  _setMobileOpen(open) {
    if (!this._isTouchDevice() || !this.root) return;
    if (this.busy && !open) return;

    this.root.classList.toggle('is-mobile-open', open);
    this.backdrop?.classList.toggle('is-visible', open);
    this.toggleButton?.classList.toggle('is-open', open);
    this.toggleButton?.setAttribute('aria-label', open ? 'Close emoji keyboard' : 'Open emoji keyboard');

    if (open) {
      requestAnimationFrame(() => this._syncScannerTarget());
    }
  }

  _select(index, button) {
    if (this.busy || !this._isAvailable()) return;
    if (this._isTouchDevice() && !this.root.classList.contains('is-mobile-open')) return;

    const item = EMOJIS[index];
    const worldEmoji = this.world?.emojis?.[index];
    if (!item || !worldEmoji) return;

    this.busy = true;
    this.selected = item;
    this.selectedIndex = index;
    this.keys.forEach((key) => key.classList.remove('is-selected'));
    button.classList.add('is-selected');
    this._resetProgress();
    this._setState('scanning');
    this._launchScan(index);
  }

  _getScannerTarget() {
    const rect = this.scanner.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + Math.min(54, rect.height * 0.42)
    };
  }

  _syncScannerTarget() {
    if (!this.busy || this.selectedIndex < 0 || !this.scanner) return;
    const target = this._getScannerTarget();
    this.world?.updateScannerTarget?.(this.selectedIndex, target.x, target.y);
  }

  _launchScan(index) {
    const target = this._getScannerTarget();
    const started = this.world?.startScannerTransfer?.(
      index,
      target.x,
      target.y,
      {
        duration: 2050,
        targetScale: this._isTouchDevice() ? 0.32 : 0.36,
        arc: this._isTouchDevice() ? 55 : 72,
        returnDuration: 1800
      }
    );

    if (!started) {
      this.busy = false;
      this._setState('ready');
      this.keys.forEach((key) => key.classList.remove('is-selected'));
      return;
    }

    this.scanner.classList.remove('is-complete', 'is-copying');
    this.scanner.classList.add('is-scanning');
    this._syncScannerTarget();

    this.scanTimer = window.setTimeout(() => this._startCopyCountdown(), SCAN_DURATION);
  }

  _startCopyCountdown() {
    if (!this.busy || !this.selected) return;

    this.scanner.classList.remove('is-scanning');
    this.scanner.classList.add('is-copying');
    this._setState('copying');
    this.progress.classList.add('is-visible');

    const startedAt = performance.now();
    const tick = (now) => {
      if (!this.busy) return;
      this._syncScannerTarget();
      const elapsed = Math.max(0, now - startedAt);
      const ratio = Math.min(1, elapsed / COPY_DURATION);
      const remaining = Math.max(0, (COPY_DURATION - elapsed) / 1000);
      this.progressFill.style.transform = `scaleX(${ratio})`;
      this.progressTime.textContent = `${remaining.toFixed(1)}s`;
      if (ratio < 1) {
        this.progressRaf = requestAnimationFrame(tick);
      } else {
        this._finishCopy();
      }
    };
    this.progressRaf = requestAnimationFrame(tick);
  }

  async _finishCopy() {
    if (!this.selected) return;

    const item = this.selected;
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(item.char);
        copied = true;
      }
    } catch (error) {
      console.warn('[Emoji Deck] Clipboard API failed:', error);
    }

    if (!copied) copied = this._fallbackCopy(item.char);

    this.scanner.classList.remove('is-copying');
    this.scanner.classList.add('is-complete');
    this.progress.classList.remove('is-visible');
    this._setState(copied ? 'copied' : 'failed');

    if (copied) this._burst();

    /* The real emoji starts its return flight now. */
    this.world?.finishScannerTransfer?.(this.selectedIndex);

    this.copyTimer = window.setTimeout(() => {
      this.busy = false;
      this.scanner.classList.remove('is-complete');
      this._setState('ready');
      this.keys.forEach((key) => key.classList.remove('is-selected'));
      this.selected = null;
      this.selectedIndex = -1;
      if (this._isTouchDevice()) this._setMobileOpen(false);
    }, 2050);
  }

  _fallbackCopy(text) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    } catch {
      return false;
    }
  }

  _setState(state) {
    const states = {
      ready: ['READY TO SCAN', 'Select an emoji to scan', '✦'],
      scanning: ['SCANNING EMOJI', 'Reading visual signature…', '⌁'],
      copying: ['COPYING TO CLIPBOARD', 'Secure transfer in progress…', '◈'],
      copied: ['COPIED ✓', `${this.selected?.char || ''} is on your clipboard`, '✓'],
      failed: ['COPY FAILED', 'Browser clipboard permission was blocked', '⚠']
    };
    const [label, status, icon] = states[state] || states.ready;
    this.labelNode.textContent = label;
    this.statusText.textContent = status;
    this.statusIcon.textContent = icon;
    this.root.dataset.state = state;
  }

  _resetProgress() {
    cancelAnimationFrame(this.progressRaf);
    this.progress.classList.remove('is-visible');
    this.progressFill.style.transform = 'scaleX(0)';
    this.progressTime.textContent = '10.0s';
  }

  _burst() {
    const layer = this.root.querySelector('.emoji-deck-scan-particles');
    for (let i = 0; i < 18; i += 1) {
      const spark = document.createElement('b');
      const angle = (Math.PI * 2 * i) / 18;
      spark.className = 'emoji-deck-burst';
      spark.style.setProperty('--bx', `${Math.cos(angle) * (35 + Math.random() * 28)}px`);
      spark.style.setProperty('--by', `${Math.sin(angle) * (22 + Math.random() * 24)}px`);
      layer.appendChild(spark);
      window.setTimeout(() => spark.remove(), 850);
    }
  }

  _syncVisibility() {
    if (!this.root) return;

    const desktop = this._isDesktop();
    const touch = this._isTouchDevice();

    this.root.classList.toggle('is-mobile-mode', touch && !desktop);
    this.root.classList.toggle('is-desktop-mode', desktop);
    this.root.classList.toggle('is-disabled', !this._isAvailable());
    this.toggleButton?.classList.toggle('is-mobile-visible', touch && !desktop);

    if (desktop) {
      this._setMobileOpen(false);
      this.root.classList.add('is-visible');
    } else if (touch) {
      this.root.classList.remove('is-visible');
    }

    if (this.busy) this._syncScannerTarget();
  }

  _syncTheme() {
    if (!this.root) return;
    this.root.dataset.theme = document.documentElement.getAttribute('data-theme') || 'light';
  }
}
