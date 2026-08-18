# The Emojis - PixiJS Interactive Animation

A high-performance, interactive emoji animation experience built with **Vite** + **PixiJS** + **WebGL**, featuring cursor interaction, gyroscope support, and shake-to-fall mechanics.

## Features

✨ **High-Performance WebGL Rendering**
- 24 continuously animated emoji sprites
- GPU-accelerated transforms
- Smooth 60 FPS on desktop and optimized performance on mobile

🎮 **Interactive Controls**
- **Desktop**: Cursor proximity effects - emojis react to your mouse
- **Mobile**: 
  - Gyroscope tilt - tilt your device to move emojis
  - Shake detection - shake your device to make all emojis fall

🎨 **Visual Features**
- Glass cube platforms for each emoji
- Unique personality for each emoji (different idle animations)
- Physics-based falling and collision system
- Smooth spring/easing return animation

📱 **Mobile Optimized**
- Adaptive quality based on device tier
- DPR capping at 1.5 for GPU performance
- Touch-optimized interactions
- Reduced effects on low-end devices

## Project Structure

```
Interactive-Cursor-Driven-Emoji-Animation/
├── src/
│   ├── main.js              # Entry point
│   ├── style.css            # Global styles
│   ├── emojiWorld.js        # Main scene (PixiJS)
│   ├── physics.js           # Physics engine
│   └── gyro.js              # Gyroscope handler
├── public/                  # Static assets (Vite)
├── assets/
│   └── emojis/
│       ├── 512 (1).webp     # 24 WebP emoji files
│       ├── 512 (2).webp
│       └── ...
├── index.html               # HTML entry point
├── vite.config.js           # Vite configuration
├── package.json             # Project metadata
├── .backup/                 # Backup of original files
└── README.md               # This file
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm 9+

### Installation

1. **Navigate to project directory**
   ```bash
   cd "Interactive Cursor-Driven Emoji Animation"
   ```

2. **Install dependencies** (if needed)
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will open at `http://localhost:5173` with hot module reloading.

### Building for Production

```bash
npm run build
```

Output files will be in the `dist/` directory, ready for deployment.

### Preview Production Build

```bash
npm run preview
```

## How to Use

### Desktop
- **Move your cursor** over emojis - they'll react and move toward you
- Each emoji has a unique idle animation (bouncing, swaying, pulsing, etc.)

### Mobile (iOS 13+ or Android)
1. **On first load**, tap anywhere to request permission for device motion/orientation
2. **Tilt your device** - emojis will subtly lean with the device orientation
3. **Shake your device** - all emojis will detach, fall to the bottom with physics, then automatically return to their cubes

### Shake Mechanics
- Shake detection threshold: 25 m/s²
- Cooldown between shakes: 1000ms
- Fall duration: ~1.5-2 seconds before returning
- Return animation: Spring/elastic ease for natural feel

## Emoji Personalities

Each of the 24 emojis has a unique personality and idle animation:

| # | Name | Animation | Mass | Behavior |
|---|------|-----------|------|----------|
| 1 | Happy | Bounce | 0.9 | Quick bouncy |
| 2 | Cool | Tilt | 1.1 | Tilting head |
| 3 | Love | Pulse | 0.8 | Scaling pulse |
| 4 | Awestruck | Sway | 1.0 | Side-to-side |
| 5 | Thinking | Bob | 1.05 | Vertical bounce |
| 6 | Angry | Vibrate | 1.2 | Shaking |
| 7 | Party | Spin | 0.9 | Continuous rotation |
| 8 | Smirk | Tilt | 1.0 | Head tilt |
| 9 | Sleepy | Drift | 0.95 | Floating |
| 10 | Shocked | Bounce | 1.1 | Bouncing |
| 11 | Scared | Tremble | 0.85 | Trembling |
| 12 | Cool 2 | Sway | 1.0 | Side-to-side |
| 13 | Angel | Float | 0.8 | Ethereal float |
| 14 | Sad | Droop | 1.15 | Drooping |
| 15 | Nerd | Twitch | 0.9 | Twitching |
| 16 | Frustrated | Shake | 1.1 | Shaking |
| 17 | Tongue | Playful | 0.95 | Playful movement |
| 18 | Kiss | Bob | 0.85 | Bobbing |
| 19 | Cold | Shiver | 1.05 | Shivering |
| 20 | Melting | Droop | 1.0 | Drooping |
| 21 | Grinning | Bounce | 0.9 | Bouncing |
| 22 | Winking | Tilt | 1.0 | Tilting |
| 23 | Straight | Sway | 1.08 | Subtle sway |
| 24 | Slight | Drift | 0.92 | Floating |

## Technical Stack

### Frontend
- **Vite** - Fast build tool and dev server
- **PixiJS** - WebGL rendering library
- **Vanilla JavaScript** - No frameworks for minimal overhead

### Animation
- **PixiJS Ticker** - Render loop
- **Custom Physics** - Lightweight 2D physics for 24 objects
- **Device APIs** - DeviceOrientationEvent, DeviceMotionEvent

### Mobile Optimization
- **Adaptive Quality** - Auto-detects device tier
- **DPR Capping** - Limits pixel ratio to 1.5
- **Touch Optimization** - `touch-action: none` for performance
- **Selective Effects** - Reduces effects on low-end devices

## Performance Targets

| Device | FPS | DPR | Quality |
|--------|-----|-----|---------|
| Desktop | 60 | 1-2 | Full |
| High-end Mobile | 60 | 1.5 | Full |
| Mid-range Mobile | 45-60 | 1.25 | Medium |
| Low-end Mobile | 30-45 | 1 | Minimal |

## API Reference

### EmojiWorld Class

```javascript
const emojiWorld = new EmojiWorld(canvasElement, options);

// Properties
emojiWorld.emojis          // Array of emoji sprites
emojiWorld.cubes           // Array of glass cube containers
emojiWorld.physics         // Physics engine instance
emojiWorld.gyro            // Gyroscope handler

// Methods
emojiWorld._onShakeDetected()    // Trigger shake animation
emojiWorld._returnEmojis()       // Return emojis to cubes
```

### Physics Class

```javascript
const physics = new Physics(options);

// Create physics body
const body = physics.createBody({
  x, y, vx, vy, mass, radius
});

// Update simulation
physics.update(deltaTime);

// Get active bodies
physics.getActiveBodies();
```

### GyroHandler Class

```javascript
const gyro = new GyroHandler(options);

// Request iOS 13+ permission
await gyro.requestPermission();

// Get device tilt (-1 to 1)
const tilt = gyro.getTilt();  // { x, y }

// Check for shake
if (gyro.pollShake()) {
  // Shake detected!
}
```

## Deployment

### To Vercel

1. Connect GitHub repository to Vercel
2. Vercel will auto-detect Vite and build with `npm run build`
3. Serve `dist/` folder

### To Other Hosts

```bash
# Build production bundle
npm run build

# Upload contents of dist/ folder
```

## Troubleshooting

### Emojis not loading
- Check that WebP files exist in `assets/emojis/` folder
- Verify filenames match: `512 (1).webp` through `512 (24).webp`
- Check browser console for CORS errors

### Shake not detecting on mobile
- Make sure you've granted device motion permission
- Try shaking more forcefully (acceleration > 25 m/s²)
- Some devices may require permission request on first gesture
- Check that device motion is enabled in browser settings

### Low FPS on mobile
- The app will auto-detect device and reduce effects
- Try disabling other apps for better performance
- Check device temperature - throttling may occur on hot devices

### Development server not starting
- Clear `node_modules` and reinstall: `npm install`
- Check Node.js version: `node --version` (should be 18+)
- Try clearing Vite cache: `rm -rf .vite`

## Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✅ 90+ | ✅ 90+ |
| Firefox | ✅ 88+ | ✅ 88+ |
| Safari | ✅ 14+ | ✅ 14+ |
| Edge | ✅ 90+ | ✅ 90+ |

### Limitations
- WebGL support required (supported on ~99% of devices)
- Shake detection only on mobile with DeviceMotionEvent support
- Gyroscope requires HTTPS in production

## Performance Notes

### Why PixiJS + WebGL?

The original DOM/CSS version achieved 4-5 FPS due to:
- 24 DOM elements with CSS transforms
- Box shadows causing repaints
- Individual RAF loops creating jank
- No GPU acceleration for transforms

The PixiJS version fixes this by:
- Using single WebGL canvas
- GPU-accelerated sprite transforms
- Single optimized render loop
- 60 FPS on most devices

### Optimization Techniques

1. **Resolution Capping**: DPR limited to 1.5 prevents rendering at 3-4x resolution
2. **Selective Rendering**: Only active sprites rendered
3. **Batch Rendering**: PixiJS batches all draws into single WebGL call
4. **Physics Optimization**: Lightweight collision system, no broad-phase overhead
5. **Touch Action**: `touch-action: none` prevents browser scroll jank

## Future Enhancements

- [ ] Sound effects on shake
- [ ] Emoji customization
- [ ] Leaderboard for shake records
- [ ] AR mode (if WebXR support)
- [ ] Emoji collection/achievements
- [ ] Custom background themes
- [ ] Multiplayer via WebSocket

## Credits

Created with ❤️ using:
- [PixiJS](https://pixijs.com) - WebGL rendering
- [Vite](https://vitejs.dev) - Build tooling

## License

MIT License - See LICENSE file for details

## Contributing

Pull requests welcome! Please feel free to improve performance, add features, or fix bugs.

---

**Last Updated**: August 2026
**Version**: 2.0.0
**Status**: Production Ready - WebGL/PixiJS Implementation
