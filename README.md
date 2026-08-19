# 🌞 The Emojis — Interactive Emoji Experience

A polished, interactive emoji experience built with **Vite, PixiJS, WebGL, and Vanilla JavaScript**.

The project combines animated Noto Emojis, interactive cursor-driven reactions, glass-style platforms, dynamic light/dark themes, a responsive emoji scanner, and a guided first-visit tutorial.

## ✨ Features

- 🎭 **24 animated emojis** displayed in a responsive 4×6 emoji world
- 🌐 **Noto Emoji Animation integration**
  - Uses animated emoji assets from Google's open-source Noto Emoji Animation collection
  - Emoji assets are loaded from remote Noto Emoji URLs instead of bundled static emoji files
  - URL/image validation prevents broken assets from being displayed
  - Refresh button generates a new set of available emojis
- 🖱️ **Interactive emoji cursor**
  - Cursor is represented by a changing emoji rather than a browser-style pointer effect
  - Cursor emoji refreshes automatically at a fixed interval
  - Emoji proximity creates responsive character reactions
  - Desktop cursor interaction is disabled while the tutorial is active
- 🌗 **Light and dark themes**
  - Professional dynamic backgrounds for both modes
  - Theme-aware lighting, shadows, glass effects, and UI styling
- 🧊 **Glassy emoji platforms**
  - Realistic translucent/glossy platform appearance
  - Animated highlights and lighting effects
  - Emoji shadows are integrated around the characters rather than using separate moving shadow circles
- 🖥️ **Emoji Scanner / Keyboard**
  - Compact 24-emoji keyboard
  - Select an emoji to start the scanning experience
  - Cinematic scanning/biometric-style animation
  - Animated progress/copy sequence
  - Automatically copies the selected emoji to the clipboard
- 🎓 **First-visit interactive tutorial**
  - Step-by-step introduction to the emoji world
  - Animated pointing-hand guidance
  - Desktop and mobile/tablet layouts
  - Keyboard interaction guidance adapted to device type
  - Tutorial can be skipped or advanced using the controls
  - Tutorial completion is remembered with browser storage/cookies so it does not restart on every visit
  - User interactions are restricted while the tutorial is active to prevent accidental actions
- 📱 **Responsive desktop and mobile/tablet UI**
  - Adaptive layout and sizing
  - Mobile/tablet versions do **not** use gyroscope, shake, drop, or other device-motion physics interactions
- ⚡ **GPU-accelerated WebGL rendering**
  - PixiJS-based rendering and animation
  - Optimized sprite transforms and responsive effects

## 🛠️ Tech Stack

- **Vite** — development server and production build
- **PixiJS** — WebGL rendering and animation
- **Vanilla JavaScript** — application logic
- **CSS** — responsive UI, glass effects, themes, animations, and visual effects
- **Noto Emoji Animation** — remote animated emoji assets
- **Clipboard API** — emoji copy functionality
- **Browser Storage/Cookies** — first-visit tutorial state

## 🌐 Emoji Assets

The project uses animated emojis from:

**Noto Emoji Animation**

https://googlefonts.github.io/noto-emoji-animation/

Example asset URLs:

```text
https://fonts.gstatic.com/s/e/notoemoji/latest/1f605/512.webp
https://fonts.gstatic.com/s/e/notoemoji/latest/1f603/512.webp
https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/512.webp
```

The application validates remote emoji assets before placing them into the 24-position grid. If an asset cannot be loaded as a valid animation/image, it is skipped instead of leaving a broken image in the interface.

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

- Move the cursor around the emoji world to trigger character reactions.
- Use the emoji keyboard/scanner on the right side.
- Select any emoji from the keyboard to start its scanning animation.
- The selected emoji is copied to the clipboard after the scan sequence.
- Use the refresh button to generate another set of available animated emojis.
- Use the theme control to switch between light and dark modes.

### Mobile / Tablet 📱

- Use the on-screen keyboard button to open the emoji scanner.
- Select an emoji to start scanning.
- Use the refresh button to generate another emoji arrangement.
- Mobile/tablet interaction does **not** depend on gyroscope, shake detection, device dropping, or physics sensors.

## 🎓 Tutorial

On the first visit, the application presents an interactive tutorial:

1. **Welcome to The Emojis** — introduces the animated emoji world.
2. **Open the Emoji Keyboard** — points the user toward the keyboard control on supported mobile/tablet layouts.
3. **Scan an Emoji** — points toward an emoji in the keyboard and explains the scanning interaction.

The tutorial includes animated pointing-hand guidance, next/close controls, and a skip option. While the tutorial is active, normal application interactions are restricted so the user can focus on the tutorial.

After completion or skipping, the tutorial state is saved so it does not automatically appear again on every visit.

## 📁 Project Structure

```text
The-Emojis-Interactive-Animation/
├── src/
│   ├── main.js
│   ├── emojiWorld.js
│   ├── desktopEmojiKeyboard.js
│   ├── mobileEmojiKeyboard.js
│   └── style.css
├── public/
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

> File names can evolve as the implementation changes; the important application modules are the emoji world, keyboard/scanner, tutorial, theme/visual styling, and remote emoji asset handling.

## ⚡ Performance

The project uses a PixiJS/WebGL rendering pipeline, optimized sprite transforms, responsive layouts, controlled visual effects, and remote asset validation to maintain smooth interaction while avoiding broken emoji entries.

The application also avoids unnecessary device-motion APIs on mobile/tablet, reducing unwanted sensor permissions and motion-related overhead.

## 🌐 Deployment

The project can be deployed to **Vercel** or other static hosting platforms.

```bash
npm run build
```

Deploy the generated `dist/` directory.

## ❤️ Credits

Built with **PixiJS + Vite + WebGL** and Google's **Noto Emoji Animation** assets.

The project is designed as an interactive showcase of:

- WebGL animation
- Remote animated assets
- Interactive UI
- Cursor-based visual effects
- Glassmorphism
- Responsive design
- Browser clipboard functionality
- Guided onboarding/tutorial UX
- Light/dark theme systems

## 📄 License

MIT License — see `LICENSE` for details.

---

**Version:** 3.0.0  
**Status:** 🚀 Production Ready
