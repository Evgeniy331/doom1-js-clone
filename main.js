/*
 * Doom 1 Clone – Main entry point
 *
 * This file sets up the HTML5 canvas and starts the render loop.  For now
 * it draws a placeholder background.  Future commits will flesh out the
 * ray‑casting engine, player controls and level data.
 */

// Grab the canvas and its 2D context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Placeholder game state
let lastTimestamp = 0;

/**
 * Main game loop.  Updates game state and renders the frame.
 * @param {DOMHighResTimeStamp} timestamp – The current time in milliseconds
 */
function gameLoop(timestamp) {
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // Update game state (placeholder)
  update(delta);

  // Render the frame
  render();

  // Queue the next frame
  requestAnimationFrame(gameLoop);
}

/**
 * Update game logic.  Currently does nothing but will handle
 * player movement, collision detection, and more in future commits.
 * @param {number} delta – Time in milliseconds since last frame
 */
function update(delta) {
  // TODO: implement player movement and world interactions
}

/**
 * Render the current frame.  Currently fills the canvas with a gradient
 * background to approximate a simple sky and floor.  This will be
 * replaced with a ray‑cast rendering of the level in future commits.
 */
function render() {
  const width = canvas.width;
  const height = canvas.height;

  // Draw sky (top half)
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height / 2);
  skyGradient.addColorStop(0, '#1a1a1a');
  skyGradient.addColorStop(1, '#333');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height / 2);

  // Draw floor (bottom half)
  const floorGradient = ctx.createLinearGradient(0, height / 2, 0, height);
  floorGradient.addColorStop(0, '#2d2d2d');
  floorGradient.addColorStop(1, '#000');
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, height / 2, width, height / 2);
}

// Start the game loop once the page has loaded
window.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(gameLoop);
});
