const CONFIG = {
  columns: 6,
  rows: 4,
  wakeRadius: 315,
  touchWakeRadius: 265,
  lightEase: 0.34,
  wakeEase: 0.19,
  sleepEase: 0.13,
  shineEase: 0.2,
  lightFadeInEase: 0.3,
  lightFadeOutEase: 0.12,
  pupilEase: 0.34,
  pushEase: 0.18,
  pushRadius: 150,
  pushDistance: 18,
  mobileFrameMs: 22,
  breathingAmount: 2.2,
  breathingMinMs: 2800,
  breathingSpreadMs: 1300,
  snoozeEveryMs: 1800,
  mobileSnoozeEveryMs: 3200,
  maxSnoozes: 5,
  mobileMaxSnoozes: 3
};

const scene = document.getElementById("scene");
const grid = document.getElementById("emojiGrid");
const snoozeLayer = document.getElementById("snoozeLayer");
const coarsePointerQuery = window.matchMedia("(pointer: coarse)");

const pointer = {
  active: false,
  targetX: 0,
  targetY: 0,
  x: 0,
  y: 0,
  opacity: 0
};

const previewParams = new URLSearchParams(window.location.search);

let sceneRect = scene.getBoundingClientRect();
let lastTime = performance.now();
let lastRenderTime = 0;
let nextSnoozeAt = performance.now() + 1200;
let activeSnoozes = 0;
let characters = [];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

function svgFaceMarkup(index) {
  return `
    <svg viewBox="0 0 100 100" role="img" aria-label="Sleeping green face">
      <defs>
        <radialGradient id="face-${index}" cx="34%" cy="24%" r="78%">
          <stop offset="0%" stop-color="#96ee68"/>
          <stop offset="48%" stop-color="#43c65e"/>
          <stop offset="100%" stop-color="#16814f"/>
        </radialGradient>
        <radialGradient id="face-hot-${index}" cx="30%" cy="18%" r="84%">
          <stop offset="0%" stop-color="#ddff91"/>
          <stop offset="45%" stop-color="#66ef72"/>
          <stop offset="100%" stop-color="#20ab62"/>
        </radialGradient>
        <clipPath id="left-eye-clip-${index}">
          <ellipse class="left-eye-clip" cx="36" cy="45" rx="12.8" ry="2"/>
        </clipPath>
        <clipPath id="right-eye-clip-${index}">
          <ellipse class="right-eye-clip" cx="64" cy="45" rx="12.8" ry="2"/>
        </clipPath>
      </defs>
      <circle class="aura" cx="50" cy="52" r="46" fill="#62ff8d" opacity="0"/>
      <circle class="face" cx="50" cy="50" r="43" fill="url(#face-${index})"/>
      <circle class="face-hot" cx="50" cy="50" r="43" fill="url(#face-hot-${index})" opacity="0"/>
      <ellipse class="shade" cx="57" cy="64" rx="30" ry="19" fill="#055230" opacity="0.12"/>
      <ellipse class="highlight" cx="35" cy="25" rx="18" ry="12" fill="#e7ffac" opacity="0.16"/>
      <g class="eye-open">
        <ellipse class="eye-white left-eye-white" cx="36" cy="45" rx="12.8" ry="2" fill="#f8fff4"/>
        <ellipse class="eye-white right-eye-white" cx="64" cy="45" rx="12.8" ry="2" fill="#f8fff4"/>
        <g clip-path="url(#left-eye-clip-${index})">
          <circle class="pupil left-pupil" cx="36" cy="45" r="5.4" fill="#10241d"/>
        </g>
        <g clip-path="url(#right-eye-clip-${index})">
          <circle class="pupil right-pupil" cx="64" cy="45" r="5.4" fill="#10241d"/>
        </g>
        <path class="upper-lid left-upper" d="M24 43 Q36 37 48 43" fill="none" stroke="#143b2a" stroke-width="3.2" stroke-linecap="round" opacity="0"/>
        <path class="upper-lid right-upper" d="M52 43 Q64 37 76 43" fill="none" stroke="#143b2a" stroke-width="3.2" stroke-linecap="round" opacity="0"/>
      </g>
      <g class="eye-sleep">
        <path class="sleep-line" d="M24 43 Q36 57 48 43" fill="none" stroke="#176141" stroke-width="4.1" stroke-linecap="round"/>
        <path class="sleep-line" d="M52 43 Q64 57 76 43" fill="none" stroke="#176141" stroke-width="4.1" stroke-linecap="round"/>
      </g>
      <path class="mouth" d="M43 67 Q50 73 57 67" fill="none" stroke="#176141" stroke-width="3.9" stroke-linecap="round"/>
    </svg>
  `;
}

class EmojiCharacter {
  constructor(index) {
    this.index = index;
    this.element = document.createElement("div");
    this.element.className = "emoji";
    this.element.innerHTML = svgFaceMarkup(index);
    grid.appendChild(this.element);

    this.centerX = 0;
    this.centerY = 0;
    this.wake = 0;
    this.shine = 0;
    this.pupilX = 0;
    this.pupilY = 0;
    this.pushX = 0;
    this.pushY = 0;
    this.shadowX = 0;
    this.shadowY = 9;
    this.shadowScale = 1;
    this.shadowOpacity = 0.34;
    this.shadowRotate = 0;
    this.phase = index * 0.73 + Math.random() * 1.8;
    this.breathMs = CONFIG.breathingMinMs + Math.random() * CONFIG.breathingSpreadMs;

    this.parts = {
      faceHot: this.element.querySelector(".face-hot"),
      aura: this.element.querySelector(".aura"),
      highlight: this.element.querySelector(".highlight"),
      shade: this.element.querySelector(".shade"),
      eyeOpen: this.element.querySelector(".eye-open"),
      eyeSleep: this.element.querySelector(".eye-sleep"),
      leftWhite: this.element.querySelector(".left-eye-white"),
      rightWhite: this.element.querySelector(".right-eye-white"),
      leftClip: this.element.querySelector(".left-eye-clip"),
      rightClip: this.element.querySelector(".right-eye-clip"),
      leftPupil: this.element.querySelector(".left-pupil"),
      rightPupil: this.element.querySelector(".right-pupil"),
      leftUpper: this.element.querySelector(".left-upper"),
      rightUpper: this.element.querySelector(".right-upper"),
      mouth: this.element.querySelector(".mouth")
    };
  }

  measure() {
    const rect = this.element.getBoundingClientRect();
    this.centerX = rect.left - sceneRect.left + rect.width / 2;
    this.centerY = rect.top - sceneRect.top + rect.height / 2;
  }

  update(time) {
    const radius = coarsePointerQuery.matches
      ? CONFIG.touchWakeRadius
      : CONFIG.wakeRadius;

    let targetWake = 0;
    let targetShine = 0;
    let targetPushX = 0;
    let targetPushY = 0;
    let dx = 0;
    let dy = 0;

    if (pointer.active || pointer.opacity > 0.02) {
      dx = pointer.x - this.centerX;
      dy = pointer.y - this.centerY;
      const distance = Math.hypot(dx, dy);
      const proximity = 1 - smoothstep(42, radius, distance);
      targetWake = Math.pow(proximity, 0.72);
      targetShine = Math.pow(1 - smoothstep(0, radius * 1.28, distance), 1.35);

      const push = Math.pow(1 - smoothstep(22, CONFIG.pushRadius, distance), 1.6);
      if (distance > 0.1) {
        targetPushX = (-dx / distance) * CONFIG.pushDistance * push;
        targetPushY = (-dy / distance) * CONFIG.pushDistance * push;
      }
    }

    const wakeEase = targetWake > this.wake ? CONFIG.wakeEase : CONFIG.sleepEase;
    this.wake = lerp(this.wake, targetWake, wakeEase);
    this.shine = lerp(this.shine, targetShine, CONFIG.shineEase);

    const angle = Math.atan2(dy, dx);
    const pupilReach = 4.7 * this.wake;
    const targetPupilX = Math.cos(angle) * pupilReach;
    const targetPupilY = Math.sin(angle) * pupilReach * 0.62;
    this.pupilX = lerp(this.pupilX, pointer.active ? targetPupilX : 0, CONFIG.pupilEase);
    this.pupilY = lerp(this.pupilY, pointer.active ? targetPupilY : 0, CONFIG.pupilEase);
    this.pushX = lerp(this.pushX, targetPushX, CONFIG.pushEase);
    this.pushY = lerp(this.pushY, targetPushY, CONFIG.pushEase);

    let targetShadowX = 0;
    let targetShadowY = 9;
    let targetShadowScale = 1;
    let targetShadowOpacity = 0.34;
    let targetShadowRotate = 0;

    if (pointer.opacity > 0.02) {
      const distance = Math.max(1, Math.hypot(dx, dy));
      const awayX = -dx / distance;
      const awayY = -dy / distance;
      const cast = 4 + this.shine * 18;
      targetShadowX = awayX * cast;
      targetShadowY = 9 + awayY * cast * 0.5 + this.shine * 8;
      targetShadowScale = 1 + this.shine * 0.42;
      targetShadowOpacity = 0.24 + this.shine * 0.36;
      targetShadowRotate = clamp(awayX * 15, -18, 18);
    }

    this.shadowX = lerp(this.shadowX, targetShadowX, 0.14);
    this.shadowY = lerp(this.shadowY, targetShadowY, 0.14);
    this.shadowScale = lerp(this.shadowScale, targetShadowScale, 0.14);
    this.shadowOpacity = lerp(this.shadowOpacity, targetShadowOpacity, 0.14);
    this.shadowRotate = lerp(this.shadowRotate, targetShadowRotate, 0.14);

    const breath = Math.sin((time / this.breathMs) * Math.PI * 2 + this.phase)
      * CONFIG.breathingAmount
      * (1 - this.wake * 0.45);
    this.element.style.setProperty("--breath", `${breath.toFixed(2)}px`);
    this.element.style.setProperty("--push-x", `${this.pushX.toFixed(2)}px`);
    this.element.style.setProperty("--push-y", `${this.pushY.toFixed(2)}px`);
    this.element.style.setProperty("--shadow-x", `${this.shadowX.toFixed(2)}px`);
    this.element.style.setProperty("--shadow-y", `${this.shadowY.toFixed(2)}px`);
    this.element.style.setProperty("--shadow-scale", this.shadowScale.toFixed(3));
    this.element.style.setProperty("--shadow-opacity", this.shadowOpacity.toFixed(3));
    this.element.style.setProperty("--shadow-rotate", `${this.shadowRotate.toFixed(2)}deg`);
  }

  render() {
    const w = clamp(this.wake, 0, 1);
    const shine = clamp(this.shine, 0, 1);
    const eyeOpen = smoothstep(0.14, 0.98, w);
    const sleepFold = 1 - smoothstep(0.03, 0.25, w);
    const sadAmount = smoothstep(0.2, 0.95, w);
    const eyeRy = 0.35 + eyeOpen * 6.1 + shine * 0.7;
    const eyeCy = 45.7 + eyeOpen * 1.4;
    const lidOffset = (1 - eyeOpen) * 8 + sadAmount * 1.2;
    const mouthSleep = 67;
    const mouthWake = 68.5 + shine * 1.8;
    const mouthCurve = lerp(73, 60.5, sadAmount);

    this.element.style.setProperty("--wake", w.toFixed(3));
    this.element.style.setProperty("--shine", shine.toFixed(3));
    this.parts.faceHot.setAttribute("opacity", (shine * 0.7).toFixed(3));
    this.parts.aura.setAttribute("opacity", (shine * 0.18).toFixed(3));
    this.parts.highlight.setAttribute("opacity", (0.14 + shine * 0.28).toFixed(3));
    this.parts.shade.setAttribute("opacity", (0.14 - shine * 0.08).toFixed(3));

    this.parts.eyeOpen.setAttribute("opacity", smoothstep(0.08, 0.42, w).toFixed(3));
    this.parts.eyeSleep.setAttribute("opacity", sleepFold.toFixed(3));

    for (const eye of [this.parts.leftWhite, this.parts.rightWhite, this.parts.leftClip, this.parts.rightClip]) {
      eye.setAttribute("cy", eyeCy.toFixed(2));
      eye.setAttribute("ry", eyeRy.toFixed(2));
    }

    this.parts.leftPupil.setAttribute("cx", (36 + this.pupilX).toFixed(2));
    this.parts.leftPupil.setAttribute("cy", (eyeCy + this.pupilY).toFixed(2));
    this.parts.rightPupil.setAttribute("cx", (64 + this.pupilX).toFixed(2));
    this.parts.rightPupil.setAttribute("cy", (eyeCy + this.pupilY).toFixed(2));

    this.parts.leftUpper.setAttribute("d", `M24 ${43 + lidOffset + sadAmount * 1.4} Q36 ${37 + lidOffset * 0.55 + sadAmount * 4.2} 48 ${43 + lidOffset - sadAmount * 0.8}`);
    this.parts.rightUpper.setAttribute("d", `M52 ${43 + lidOffset - sadAmount * 0.8} Q64 ${37 + lidOffset * 0.55 + sadAmount * 4.2} 76 ${43 + lidOffset + sadAmount * 1.4}`);
    this.parts.leftUpper.setAttribute("opacity", (0.08 + w * 0.42).toFixed(3));
    this.parts.rightUpper.setAttribute("opacity", (0.08 + w * 0.42).toFixed(3));

    this.parts.mouth.setAttribute("d", `M43 ${lerp(mouthSleep, mouthWake, w).toFixed(2)} Q50 ${mouthCurve.toFixed(2)} 57 ${lerp(mouthSleep, mouthWake, w).toFixed(2)}`);
    this.parts.mouth.setAttribute("stroke", w > 0.55 ? "#134232" : "#176141");
  }
}

function spawnSnooze(time) {
  const limit = coarsePointerQuery.matches ? CONFIG.mobileMaxSnoozes : CONFIG.maxSnoozes;
  if (!snoozeLayer || activeSnoozes >= limit) {
    return;
  }

  const sleepers = characters.filter((character) => character.wake < 0.12);
  if (!sleepers.length) {
    return;
  }

  const character = sleepers[Math.floor(Math.random() * sleepers.length)];
  const node = document.createElement("span");
  const driftX = 18 + Math.random() * 42;
  const driftY = -(72 + Math.random() * 70);
  const duration = 2600 + Math.random() * 1300;

  node.className = "snooze";
  node.textContent = Math.random() > 0.42 ? "zzz" : "Zzz";
  node.style.setProperty("--snooze-x", `${character.centerX + 10}px`);
  node.style.setProperty("--snooze-y", `${character.centerY - 36}px`);
  node.style.setProperty("--snooze-dx", `${(Math.random() > 0.5 ? driftX : -driftX).toFixed(1)}px`);
  node.style.setProperty("--snooze-dy", `${driftY.toFixed(1)}px`);
  node.style.setProperty("--snooze-duration", `${duration.toFixed(0)}ms`);

  activeSnoozes += 1;
  snoozeLayer.appendChild(node);
  node.addEventListener("animationend", () => {
    activeSnoozes -= 1;
    node.remove();
  }, { once: true });
}

function createCharacters() {
  grid.innerHTML = "";
  characters = Array.from(
    { length: CONFIG.columns * CONFIG.rows },
    (_, index) => new EmojiCharacter(index)
  );
  requestAnimationFrame(measureCharacters);
}

function measureCharacters() {
  sceneRect = scene.getBoundingClientRect();
  characters.forEach((character) => character.measure());
  setPreviewPointer();
}

function setPointerFromEvent(event) {
  sceneRect = scene.getBoundingClientRect();
  pointer.targetX = clamp(event.clientX - sceneRect.left, 0, sceneRect.width);
  pointer.targetY = clamp(event.clientY - sceneRect.top, 0, sceneRect.height);
  if (!pointer.active && pointer.opacity < 0.01) {
    pointer.x = pointer.targetX;
    pointer.y = pointer.targetY;
  }
  pointer.active = true;
}

function setPreviewPointer() {
  if (!previewParams.has("previewX") || !previewParams.has("previewY")) {
    return;
  }

  const x = Number(previewParams.get("previewX"));
  const y = Number(previewParams.get("previewY"));
  pointer.targetX = clamp(Number.isFinite(x) ? x : sceneRect.width * 0.66, 0, sceneRect.width);
  pointer.targetY = clamp(Number.isFinite(y) ? y : sceneRect.height * 0.66, 0, sceneRect.height);
  pointer.x = pointer.targetX;
  pointer.y = pointer.targetY;
  pointer.active = true;
}

function updateSceneLight() {
  pointer.x = lerp(pointer.x, pointer.targetX, CONFIG.lightEase);
  pointer.y = lerp(pointer.y, pointer.targetY, CONFIG.lightEase);
  pointer.opacity = lerp(
    pointer.opacity,
    pointer.active ? 1 : 0,
    pointer.active ? CONFIG.lightFadeInEase : CONFIG.lightFadeOutEase
  );

  scene.style.setProperty("--light-x", `${(pointer.x / sceneRect.width * 100).toFixed(2)}%`);
  scene.style.setProperty("--light-y", `${(pointer.y / sceneRect.height * 100).toFixed(2)}%`);
  scene.style.setProperty("--light-x-px", `${pointer.x.toFixed(2)}px`);
  scene.style.setProperty("--light-y-px", `${pointer.y.toFixed(2)}px`);
  scene.style.setProperty("--light-opacity", pointer.opacity.toFixed(3));
}

function animate(time) {
  const delta = Math.min(32, time - lastTime);
  lastTime = time;
  if (coarsePointerQuery.matches && time - lastRenderTime < CONFIG.mobileFrameMs) {
    requestAnimationFrame(animate);
    return;
  }
  lastRenderTime = time;

  updateSceneLight();
  for (const character of characters) {
    character.update(time);
    character.render();
  }

  if (time > nextSnoozeAt && pointer.opacity < 0.72) {
    spawnSnooze(time);
    const snoozeGap = coarsePointerQuery.matches ? CONFIG.mobileSnoozeEveryMs : CONFIG.snoozeEveryMs;
    nextSnoozeAt = time + snoozeGap + Math.random() * snoozeGap;
  }

  requestAnimationFrame(animate);
}

scene.addEventListener("pointermove", setPointerFromEvent);
scene.addEventListener("pointerdown", (event) => {
  scene.setPointerCapture?.(event.pointerId);
  setPointerFromEvent(event);
});
scene.addEventListener("pointerup", () => {
  pointer.active = false;
});
scene.addEventListener("pointercancel", () => {
  pointer.active = false;
});
scene.addEventListener("pointerleave", () => {
  pointer.active = false;
});

window.addEventListener("resize", () => {
  requestAnimationFrame(measureCharacters);
});

createCharacters();
requestAnimationFrame(animate);
