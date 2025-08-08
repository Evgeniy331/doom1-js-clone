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

// Game state
let lastTimestamp = 0;

// Define the player state.  The player starts roughly in the middle
// of the map (to be defined in a later commit) and faces east (0 radians).
const player = {
  x: 2.5,
  y: 2.5,
  angle: 0,
  moveSpeed: 3, // units per second
  rotSpeed: Math.PI, // radians per second
};

// Track which keys are currently pressed.  We use a simple object
// with boolean flags to indicate key state.  Keys will be mapped
// to movement and rotation in the update() function.
const keysPressed = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  w: false,
  s: false,
  a: false,
  d: false,
};

// Register keyboard event listeners to track key state
window.addEventListener('keydown', (e) => {
  if (e.key in keysPressed) {
    keysPressed[e.key] = true;
    // Prevent scrolling the page
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key in keysPressed) {
    keysPressed[e.key] = false;
    e.preventDefault();
  }
});

/**
 * Main game loop.  Updates game state and renders the frame.
 * @param {DOMHighResTimeStamp} timestamp – The current time in milliseconds
 */
function gameLoop(timestamp) {
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // Update game state
  update(delta);

  // Render the frame
  render();

  // Queue the next frame
  requestAnimationFrame(gameLoop);
}

/**
 * Update game logic.  Moves and rotates the player based on input.
 * @param {number} delta – Time in milliseconds since last frame
 */
function update(delta) {
  const dt = delta / 1000;

  // Rotation: left/right arrow or A/D rotate the player
  if (keysPressed.ArrowLeft || keysPressed.a) {
    player.angle -= player.rotSpeed * dt;
  }
  if (keysPressed.ArrowRight || keysPressed.d) {
    player.angle += player.rotSpeed * dt;
  }
  // Normalize angle
  if (player.angle < 0) {
    player.angle += Math.PI * 2;
  } else if (player.angle >= Math.PI * 2) {
    player.angle -= Math.PI * 2;
  }

  // Movement: forward/backward or W/S
  const moveStep = player.moveSpeed * dt;
  let dx = 0;
  let dy = 0;
  if (keysPressed.ArrowUp || keysPressed.w) {
    dx += Math.cos(player.angle) * moveStep;
    dy += Math.sin(player.angle) * moveStep;
  }
  if (keysPressed.ArrowDown || keysPressed.s) {
    dx -= Math.cos(player.angle) * moveStep;
    dy -= Math.sin(player.angle) * moveStep;
  }
  // Update player position (no collision detection yet)
  player.x += dx;
  player.y += dy;
}

/**
 * Render the current frame.  Currently fills the canvas with a gradient
 * background and draws debug information.
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

  // Draw player debug info
  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  ctx.fillText(`Position: (${player.x.toFixed(2)}, ${player.y.toFixed(2)})`, 10, 20);
  ctx.fillText(`Angle: ${(player.angle * 180 / Math.PI).toFixed(0)}°`, 10, 36);
}

// Start the game loop once the page has loaded
window.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(gameLoop);
});
