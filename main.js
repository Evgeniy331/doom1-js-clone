/*
 * Doom 1 Clone – Main entry point
 *
 * This file sets up the HTML5 canvas, defines the world map, handles
 * player movement and collision detection, and renders the scene using
 * a simple ray‑casting engine.  Later commits will expand the map and
 * add features like doors.
 */

// Grab the canvas and its 2D context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let lastTimestamp = 0;

// Define the player state.  The player starts roughly in the middle
// of the map and faces east (0 radians).
const player = {
  x: 3.5,
  y: 3.5,
  angle: 0,
  moveSpeed: 3, // units per second
  rotSpeed: Math.PI, // radians per second
};

// Define a simple world map.  Each cell in this 2D array represents
// a square in the level.  A value of 0 indicates empty space; non‑zero
// values indicate walls.  We'll expand this map in future commits.
const worldMap = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const MAP_WIDTH = worldMap[0].length;
const MAP_HEIGHT = worldMap.length;
const FOV = Math.PI / 3; // 60° field of view

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
  q: false,
  e: false,
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
 * Cast a single ray from the player at the given angle using a
 * Digital Differential Analyzer (DDA) algorithm.  This function
 * returns the distance to the first wall hit and which side of a
 * grid square was intersected (0 for vertical, 1 for horizontal).
 * @param {number} angle – Absolute world angle at which to cast the ray
 * @returns {{ distance: number, side: number }}
 */
function castRay(angle) {
  const rayDirX = Math.cos(angle);
  const rayDirY = Math.sin(angle);

  let mapX = Math.floor(player.x);
  let mapY = Math.floor(player.y);

  let sideDistX;
  let sideDistY;

  const deltaDistX = Math.abs(1 / rayDirX);
  const deltaDistY = Math.abs(1 / rayDirY);
  let distance = 0;

  let stepX;
  let stepY;

  if (rayDirX < 0) {
    stepX = -1;
    sideDistX = (player.x - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
  }
  if (rayDirY < 0) {
    stepY = -1;
    sideDistY = (player.y - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
  }

  let hit = false;
  let side = 0;
  // Perform DDA
  while (!hit) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
      if (worldMap[mapY][mapX] > 0) {
        hit = true;
      }
    } else {
      hit = true;
    }
  }

  if (side === 0) {
    distance = (sideDistX - deltaDistX);
  } else {
    distance = (sideDistY - deltaDistY);
  }
  return { distance, side };
}

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
 * Update game logic.  Moves and rotates the player based on input
 * and performs simple collision detection.
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

  // Normalize angle to [0, 2π)
  if (player.angle < 0) {
    player.angle += Math.PI * 2;
  } else if (player.angle >= Math.PI * 2) {
    player.angle -= Math.PI * 2;
  }

  // Movement: forward/back (W/S or arrow up/down)
  let dx = 0;
  let dy = 0;
  const moveStep = player.moveSpeed * dt;

  if (keysPressed.ArrowUp || keysPressed.w) {
    dx += Math.cos(player.angle) * moveStep;
    dy += Math.sin(player.angle) * moveStep;
  }
  if (keysPressed.ArrowDown || keysPressed.s) {
    dx -= Math.cos(player.angle) * moveStep;
    dy -= Math.sin(player.angle) * moveStep;
  }
  // Strafe left (Q)
  if (keysPressed.q) {
    dx -= Math.sin(player.angle) * moveStep;
    dy += Math.cos(player.angle) * moveStep;
  }
  // Strafe right (E)
  if (keysPressed.e) {
    dx += Math.sin(player.angle) * moveStep;
    dy -= Math.cos(player.angle) * moveStep;
  }

  // Collision detection: update x and y separately
  const newX = player.x + dx;
  const newY = player.y + dy;

  if (worldMap[Math.floor(player.y)][Math.floor(newX)] === 0) {
    player.x = newX;
  }
  if (worldMap[Math.floor(newY)][Math.floor(player.x)] === 0) {
    player.y = newY;
  }
}

/**
 * Render the current frame.  Casts rays across the screen to draw
 * vertical wall slices, and fills in a simple sky and floor.  Also
 * displays basic debug information.
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

  // Cast rays for each vertical slice of the screen
  for (let x = 0; x < width; x++) {
    const cameraX = 2 * x / width - 1; // ranges from -1 to +1
    const rayAngle = player.angle + (cameraX * FOV / 2);
    const { distance, side } = castRay(rayAngle);
    const correctedDist = distance * Math.cos(rayAngle - player.angle);
    const lineHeight = Math.floor(height / correctedDist);
    let drawStart = Math.floor(height / 2 - lineHeight / 2);
    let drawEnd = Math.floor(height / 2 + lineHeight / 2);
    if (drawStart < 0) drawStart = 0;
    if (drawEnd >= height) drawEnd = height - 1;

    // Base colour depends on side (vertical vs horizontal) for subtle shading
    let baseColour = side === 0 ? 200 : 150;
    const shadeFactor = Math.min(correctedDist / 5, 1);
    const colourValue = Math.max(0, baseColour - shadeFactor * baseColour);
    const colour = `rgb(${colourValue}, ${colourValue}, ${colourValue})`;
    ctx.fillStyle = colour;
    ctx.fillRect(x, drawStart, 1, drawEnd - drawStart + 1);
  }

  // Draw player debug info overlay on top
  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  ctx.fillText(`Position: (${player.x.toFixed(2)}, ${player.y.toFixed(2)})`, 10, 20);
  ctx.fillText(`Angle: ${(player.angle * 180 / Math.PI).toFixed(0)}°`, 10, 36);
}

// Start the game loop once the page has loaded
window.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(gameLoop);
});
