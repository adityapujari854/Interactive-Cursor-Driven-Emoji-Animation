const EMOJIS = [
  ['😀','Happy'],['😄','Grinning'],['😁','Beaming'],['😆','Laughing'],['😅','Sweat Smile'],['😂','Joy'],
  ['🤣','Rolling Laugh'],['😭','Crying'],['😠','Angry'],['😱','Screaming'],['😮','Astonished'],['🥳','Party'],
  ['😍','Heart Eyes'],['😈','Devil'],['👻','Ghost'],['🤓','Nerd'],['😏','Smirk'],['🥶','Freezing'],
  ['😇','Angel'],['😬','Grimace'],['😎','Sunglasses'],['🙈','Peekaboo'],['🤯','Mind Blown'],['🙄','Eye Roll']
].map(([char,name]) => ({char,name}));

const SCAN_DURATION = 2400;
const COPY_DURATION = 10000;

export class DesktopEmojiKeyboard {
  constructor(world) {
    this.world = world;
    this.root = null;
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
    this.busy = false;
    this.scanTimer = null;
    this.copyTimer = null;
    this.progressRaf = null;
    this.resizeHandler = () => this._syncVisibility();
    this.themeObserver = null;
  }

  mount() {
    if (!this._isDesktop() || this.root) return;
    this._build();
    this._syncVisibility();
    window.addEventListener('resize', this.resizeHandler, { passive: true });
    this.themeObserver = new MutationObserver(() => this._syncTheme());
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this._syncTheme();
  }

  destroy() {
    clearTimeout(this.scanTimer);
    clearTimeout(this.copyTimer);
    cancelAnimationFrame(this.progressRaf);
    window.removeEventListener('resize', this.resizeHandler);
    this.themeObserver?.disconnect();
    this.root?.remove();
    this.root = null;
    this.keys = [];
  }

  _isDesktop() {
    return Boolean(
      this.world &&
      !this.world.isMobileOrTablet &&
      window.matchMedia('(pointer: fine)').matches &&
      window.matchMedia('(min-width: 900px)').matches
    );
  }

  _build() {
    const root = document.createElement('aside');
    root.className = 'desktop-emoji-deck';
    root.setAttribute('aria-label', 'Desktop emoji clipboard scanner');
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
        <div class="emoji-deck-selected" aria-hidden="true">😀</div>
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
      button.title = `${emoji.name} · click to scan & copy`;
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

  _select(index, button) {
    if (this.busy || !this._isDesktop()) return;
    const item = EMOJIS[index];
    if (!item) return;
    this.busy = true;
    this.selected = item;
    this.keys.forEach((key) => key.classList.remove('is-selected'));
    button.classList.add('is-selected');
    this._resetProgress();
    this._setState('scanning');
    this._launchScan(item, button);
  }

  _launchScan(item, button) {
    const keyRect = button.getBoundingClientRect();
    const scannerRect = this.scanner.getBoundingClientRect();
    const startX = keyRect.left + keyRect.width / 2 - (scannerRect.left + scannerRect.width / 2);
    const startY = keyRect.top + keyRect.height / 2 - (scannerRect.top + scannerRect.height * 0.48);

    this.selectedNode.textContent = item.char;
    this.selectedNode.style.setProperty('--start-x', `${startX}px`);
    this.selectedNode.style.setProperty('--start-y', `${startY}px`);
    this.selectedNode.classList.remove('is-active');
    void this.selectedNode.offsetWidth;
    this.selectedNode.classList.add('is-active');
    this.scanner.classList.remove('is-complete', 'is-copying');
    this.scanner.classList.add('is-scanning');

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
      const elapsed = Math.max(0, now - startedAt);
      const ratio = Math.min(1, elapsed / COPY_DURATION);
      const remaining = Math.max(0, (COPY_DURATION - elapsed) / 1000);
      this.progressFill.style.transform = `scaleX(${ratio})`;
      this.progressTime.textContent = `${remaining.toFixed(1)}s`;
      if (ratio < 1) this.progressRaf = requestAnimationFrame(tick);
      else this._finishCopy();
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

    this.copyTimer = window.setTimeout(() => {
      this.busy = false;
      this.scanner.classList.remove('is-complete');
      this.selectedNode.classList.remove('is-active');
      this._setState('ready');
      this.keys.forEach((key) => key.classList.remove('is-selected'));
    }, 1700);
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
    for (let i = 0; i < 16; i += 1) {
      const spark = document.createElement('b');
      const angle = (Math.PI * 2 * i) / 16;
      spark.className = 'emoji-deck-burst';
      spark.style.setProperty('--bx', `${Math.cos(angle) * (35 + Math.random() * 28)}px`);
      spark.style.setProperty('--by', `${Math.sin(angle) * (22 + Math.random() * 24)}px`);
      layer.appendChild(spark);
      window.setTimeout(() => spark.remove(), 850);
    }
  }

  _syncVisibility() {
    if (!this.root) return;
    const visible = this._isDesktop();
    this.root.classList.toggle('is-disabled', !visible);
    if (!visible && this.busy) {
      this.busy = false;
      clearTimeout(this.scanTimer);
      cancelAnimationFrame(this.progressRaf);
    }
  }

  _syncTheme() {
    if (this.root) this.root.dataset.theme = document.documentElement.getAttribute('data-theme') || 'light';
  }
}
