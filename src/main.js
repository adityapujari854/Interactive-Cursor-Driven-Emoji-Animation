/**
 * Main entry point
 * Initialize the PixiJS Emoji World on page load
 */

import { EmojiWorld } from './emojiWorld.js';
import './style.css';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('pixi-canvas');
  
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  try {
    // Initialize the emoji world
    const emojiWorld = new EmojiWorld(canvas, {
      quality: 'auto' // Will auto-detect based on device
    });

    // Make it globally accessible for debugging
    window.emojiWorld = emojiWorld;

    console.log('✨ Emoji World loaded successfully!');
    console.log('📱 Shake your device to make emojis fall');
    console.log('🖱️ Move your cursor over emojis for interaction');
  } catch (error) {
    console.error('Failed to initialize Emoji World:', error);
  }
});

// Prevent default touch behaviors for better performance
document.addEventListener('touchmove', (e) => {
  // Only prevent default for touch events over the canvas
  if (e.target.id === 'pixi-canvas') {
    e.preventDefault();
  }
}, { passive: false });
