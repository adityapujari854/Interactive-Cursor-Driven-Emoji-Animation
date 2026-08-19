# 🌞 The Emojis — Interactive Emoji Experience

A polished, interactive emoji experience built with **Vite, PixiJS, WebGL, and Vanilla JavaScript**.  
It combines animated emoji characters, responsive cursor effects, mobile motion interaction, and a desktop emoji clipboard scanner.

## ✨ Features

- 🎭 **24 animated emojis** with unique idle personalities
- 🖱️ **Interactive desktop cursor** with proximity-based emoji reactions
- ☀️🌙 **Sun/Moon cursor theme** for light and dark modes
- 📱 **Mobile gyroscope + shake interaction**
  - Tilt to subtly move the emoji world
  - Light/hard shake detection triggers the falling physics effect
- 🧊 **Glass platforms** with dynamic lighting and effects
- 🖥️ **Desktop Emoji Scanner**
  - Compact 24-emoji keyboard
  - Click an emoji to start a cinematic scanning animation
  - 🔍 Emoji is scanned above a glass platform
  - ⏳ 10-second copy sequence with animated progress bar
  - 📋 Automatically copies the selected emoji to the clipboard
- ⚡ **GPU-accelerated WebGL rendering** using PixiJS
- 📱 **Mobile performance optimizations** with adaptive quality and DPR control

## 🛠️ Tech Stack

- **Vite** — development server and production build
- **PixiJS** — WebGL rendering and animation
- **Vanilla JavaScript** — application logic
- **CSS** — responsive UI, glassmorphism, themes and animations
- **DeviceMotion / DeviceOrientation APIs** — mobile interaction

## 🚀 Getting Started

### Requirements

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

### Production build

```bash
npm run build
```

The optimized production files are generated in `dist/`.

## 🎮 Controls

### Desktop 🖱️
- Move the cursor around the emoji world to trigger reactions.
- Use the **desktop emoji keyboard** in the bottom-right corner.
- Click an emoji to launch the scanner → loading sequence → clipboard copy.

### Mobile 📱
1. Tap once to allow motion/orientation access when requested.
2. Tilt the device for subtle interaction.
3. Shake the device to trigger the emoji fall animation.

## 📁 Project Structure

```text
Interactive-Cursor-Driven-Emoji-Animation/
├── src/
│   ├── main.js
│   ├── emojiWorld.js
│   ├── physics.js
│   ├── gyro.js
│   └── style.css
├── public/
│   └── assets/
│       └── emojis/
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## ⚡ Performance

The project uses a single PixiJS/WebGL rendering pipeline, GPU-accelerated sprite transforms, adaptive mobile quality, and DPR capping to maintain smooth performance across supported devices.

## 🌐 Deployment

The project can be deployed to **Vercel** or other static hosting platforms.

```bash
npm run build
```

Deploy the generated `dist/` directory.

## ❤️ Credits

Built with **PixiJS + Vite + WebGL** and designed as an interactive showcase of animation, physics, responsive UI, and browser APIs.

## 📄 License

MIT License — see `LICENSE` for details.

---

**Version:** 2.1.0  
**Status:** 🚀 Production Ready
