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
let shotCooldown = 0; // cooldown timer between shots (seconds)

// Define the player state.  The player starts roughly in the middle
// of the map and faces east (0 radians).
const player = {
  x: 3.5,
  y: 3.5,
  angle: 0,
  moveSpeed: 3, // units per second
  rotSpeed: Math.PI, // radians per second
};

// Define the world map.  Each cell in this 2D array represents a square in
// the level.  A value of 0 indicates empty space, whereas any non‑zero
// value represents a wall.  This map roughly approximates the starting
// area of Doom’s E1M1 level.  Future commits may expand this map and
// introduce more varied wall types.
// A larger map that approximates the layout of Doom's first level.  The
// map is represented as a 2D array of 24 columns by 23 rows.  Values:
// 0 = empty space, 1 = wall, 2 = door.  Doors can be opened with
// the space bar.
const worldMap = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,1,1,1,1,1,0,1,2,1,0,1,0,1,1,1,1,0,1,0,1],
  [1,0,1,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,0,1,0,1],
  [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,0,0,0,1,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1],
  [1,1,1,1,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,1,0,1,1,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1],
  [1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,0,1],
  [1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const MAP_WIDTH = worldMap[0].length;
const MAP_HEIGHT = worldMap.length;
const FOV = Math.PI / 3; // 60 degrees field of view

// List of enemies (sprites) in the level.  Each enemy has a position (x,y)
// in map coordinates and an alive flag.  Enemies will be rendered as sprites
// and can be killed by the player in later commits.
const enemies = [
  { x: 5.5, y: 5.5, alive: true },
  { x: 15.5, y: 10.5, alive: true },
  { x: 20.5, y: 18.5, alive: true },
  { x: 12.5, y: 3.5, alive: true },
];

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
  ' ': false, // space bar for actions (door open)
};

// Register keyboard event listeners to track key state
window.addEventListener('keydown', (e) => {
  if (e.key in keysPressed) {
    keysPressed[e.key] = true;
    // Prevent scrolling the page
    e.preventDefault();
  }
  // Space bar action: attempt to open a door directly in front of the player
  if (e.key === ' ') {
    tryOpenDoor();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key in keysPressed) {
    keysPressed[e.key] = false;
    e.preventDefault();
  }
});

// Mouse input: shoot when the left mouse button is pressed.
window.addEventListener('mousedown', (e) => {
  // Only handle left button
  if (e.button === 0) {
    shoot();
  }
});

/**
 * Attempt to open a door directly in front of the player.  Doors are
 * represented by the value 2 in the world map.  When opened, the cell
 * becomes empty space (0).  This simple mechanism does not include
 * animations or closing doors; once opened, a door stays open.
 */
function tryOpenDoor() {
  // Check a short distance ahead of the player for a door
  const reach = 1.0;
  const targetX = player.x + Math.cos(player.angle) * reach;
  const targetY = player.y + Math.sin(player.angle) * reach;
  const cellX = Math.floor(targetX);
  const cellY = Math.floor(targetY);
  if (cellX >= 0 && cellX < MAP_WIDTH && cellY >= 0 && cellY < MAP_HEIGHT) {
    if (worldMap[cellY][cellX] === 2) {
      worldMap[cellY][cellX] = 0;
    }
  }
}

/**
 * Cast a single ray from the player at the given angle using a
 * Digital Differential Analyzer (DDA) algorithm.  This function
 * returns the distance to the first wall hit and which side of a
 * grid square was intersected (0 for vertical, 1 for horizontal).
 * @param {number} angle – Absolute world angle at which to cast the ray
 * @returns {{ distance: number, side: number }}
 */
function castRay(angle) {
  // Direction vector of the ray
  const rayDirX = Math.cos(angle);
  const rayDirY = Math.sin(angle);

  // Current square of the map the player is in
  let mapX = Math.floor(player.x);
  let mapY = Math.floor(player.y);

  // Length of ray from current position to next x or y side
  let sideDistX;
  let sideDistY;

  // Length of ray from one x or y side to next x or y side
  const deltaDistX = Math.abs(1 / rayDirX);
  const deltaDistY = Math.abs(1 / rayDirY);
  let distance = 0;

  // What direction to step in x or y direction (either +1 or -1)
  let stepX;
  let stepY;

  // Calculate step and initial sideDist
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
    // Jump to next map square, either in x-direction or y-direction
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    // Check if ray has hit a wall
    if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
      if (worldMap[mapY][mapX] > 0) {
        hit = true;
      }
    } else {
      // Out of bounds: treat as wall to avoid infinite loop
      hit = true;
    }
  }

  // Calculate distance projected on camera direction (to remove fish-eye effect)
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
 * Update game logic.  Handles player movement, rotation and collision.
 * @param {number} delta – Time in milliseconds since last frame
 */
function update(delta) {
  // Convert delta from milliseconds to seconds for movement calculations
  const dt = delta / 1000;

  // Rotation: left/right arrow or A/D rotate the player
  if (keysPressed.ArrowLeft || keysPressed.a) {
    player.angle -= player.rotSpeed * dt;
  }
  if (keysPressed.ArrowRight || keysPressed.d) {
    player.angle += player.rotSpeed * dt;
  }
  // Normalize angle to the range [0, 2π)
  if (player.angle < 0) {
    player.angle += Math.PI * 2;
  } else if (player.angle >= Math.PI * 2) {
    player.angle -= Math.PI * 2;
  }

  // Movement: forward/backward arrow or W/S move the player in facing direction
  let dx = 0;
  let dy = 0;
  const moveStep = player.moveSpeed * dt;
  // Forward
  if (keysPressed.ArrowUp || keysPressed.w) {
    dx += Math.cos(player.angle) * moveStep;
    dy += Math.sin(player.angle) * moveStep;
  }
  // Backward
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

  // Attempt to move the player. Perform simple collision detection by
  // checking the map cell at the proposed new position. If the cell
  // contains a wall (non-zero), the movement on that axis is blocked.
  const newX = player.x + dx;
  const newY = player.y + dy;
  // Check horizontal movement
  if (worldMap[Math.floor(player.y)][Math.floor(newX)] === 0) {
    player.x = newX;
  }
  // Check vertical movement
  if (worldMap[Math.floor(newY)][Math.floor(player.x)] === 0) {
    player.y = newY;
  }

  // Reduce shot cooldown over time
  if (shotCooldown > 0) {
    shotCooldown = Math.max(0, shotCooldown - dt);
  }

  // Simple enemy AI: alive enemies will slowly move towards the player
  // if the player is within a certain range.  Enemies perform a
  // rudimentary collision test against walls and doors.  There is no
  // pathfinding, so enemies may get stuck on corners.
  const enemySpeed = 1.5; // units per second
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dxEnemy = player.x - enemy.x;
    const dyEnemy = player.y - enemy.y;
    const distance = Math.hypot(dxEnemy, dyEnemy);
    // Only move if the player is within 6 map units
    if (distance > 0.2 && distance < 6.0) {
      const step = enemySpeed * dt;
      const moveX = (dxEnemy / distance) * step;
      const moveY = (dyEnemy / distance) * step;
      // Check collision with walls horizontally
      const newEx = enemy.x + moveX;
      const newEy = enemy.y + moveY;
      // Horizontal axis
      if (worldMap[Math.floor(enemy.y)][Math.floor(newEx)] === 0) {
        enemy.x = newEx;
      }
      // Vertical axis
      if (worldMap[Math.floor(newEy)][Math.floor(enemy.x)] === 0) {
        enemy.y = newEy;
      }
    }
  }
}

/**
 * Render the current frame using a simple ray casting renderer.
 * Draws a gradient sky and floor, then vertical wall slices with shading.
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
    // cameraX ranges from -1 (left) to +1 (right)
    const cameraX = 2 * x / width - 1;
    const rayAngle = player.angle + (cameraX * FOV / 2);
    const { distance, side } = castRay(rayAngle);
    // Correct distance for fish-eye effect
    const correctedDist = distance * Math.cos(rayAngle - player.angle);
    // Calculate height of line to draw on screen
    const lineHeight = Math.floor(height / correctedDist);
    // Calculate lowest and highest pixel to fill
    let drawStart = Math.floor(height / 2 - lineHeight / 2);
    let drawEnd = Math.floor(height / 2 + lineHeight / 2);
    if (drawStart < 0) drawStart = 0;
    if (drawEnd >= height) drawEnd = height - 1;
    // Choose base wall color. Darker for horizontal walls
    let baseColor = side === 0 ? 200 : 150;
    // Simple distance shading: further walls are darker
    const shadeFactor = Math.min(correctedDist / 5, 1);
    const colorValue = Math.max(0, baseColor - shadeFactor * baseColor);
    const color = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;
    ctx.fillStyle = color;
    ctx.fillRect(x, drawStart, 1, drawEnd - drawStart + 1);
  }

  // After drawing walls, draw enemy sprites.  Sprites are sorted back‑to‑front
  // so that closer enemies are drawn last and appear in front of farther ones.
  drawEnemies();

  // Draw player debug info overlay on top
  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  ctx.fillText(`Position: (${player.x.toFixed(2)}, ${player.y.toFixed(2)})`, 10, 20);
  ctx.fillText(`Angle: ${(player.angle * 180 / Math.PI).toFixed(0)}\u00b0`, 10, 36);

  // Draw the player's weapon as a simple overlay at the bottom of the screen.
  drawWeapon();
}

/**
 * Draw all enemies that are within the player's field of view and not
 * occluded by walls.  The enemies array is sorted by distance so that
 * farther sprites are drawn first.  For simplicity enemies are rendered
 * as red squares.  In later commits, this function can be extended to
 * use sprite images and animations.
 */
function drawEnemies() {
  const visible = [];
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);
    // Angle from player to enemy relative to player view direction
    let angleToEnemy = Math.atan2(dy, dx) - player.angle;
    // Normalize angle difference to [-π, π]
    while (angleToEnemy < -Math.PI) angleToEnemy += Math.PI * 2;
    while (angleToEnemy > Math.PI) angleToEnemy -= Math.PI * 2;
    // Skip if outside the field of view
    if (Math.abs(angleToEnemy) > FOV / 2) continue;
    // Check line of sight: if a wall is closer than the enemy, skip drawing
    const { distance: wallDist } = castRay(player.angle + angleToEnemy);
    if (wallDist < distance - 0.2) continue;
    visible.push({ enemy, distance, angleToEnemy });
  }
  // Sort from farthest to nearest
  visible.sort((a, b) => b.distance - a.distance);
  for (const { enemy, distance, angleToEnemy } of visible) {
    // Project enemy onto screen
    const size = Math.min(canvas.height / distance, canvas.height * 0.8);
    const screenX = (0.5 + angleToEnemy / FOV) * canvas.width;
    const spriteX = screenX - size / 2;
    const spriteY = canvas.height / 2 - size / 2;
    ctx.fillStyle = 'red';
    ctx.fillRect(spriteX, spriteY, size, size);
  }
}

/**
 * Draw a simple weapon overlay at the bottom of the screen.  When the player
 * shoots, a brief muzzle flash is displayed.  Future commits can replace
 * these rectangles with actual weapon sprites and animations.
 */
function drawWeapon() {
  const weaponWidth = canvas.width * 0.4;
  const weaponHeight = canvas.height * 0.25;
  const x = (canvas.width - weaponWidth) / 2;
  const y = canvas.height - weaponHeight;
  // Weapon body
  ctx.fillStyle = '#666';
  ctx.fillRect(x, y, weaponWidth, weaponHeight);
  // Muzzle flash when recently fired (0.4s window after shooting)
  if (shotCooldown > 0.4) {
    const flashWidth = weaponWidth * 0.3;
    const flashHeight = weaponHeight * 0.4;
    ctx.fillStyle = '#ffa500';
    ctx.fillRect((canvas.width - flashWidth) / 2, y - flashHeight, flashWidth, flashHeight);
  }
}

/**
 * Attempt to shoot the closest enemy directly in front of the player.  If
 * the shot cooldown has expired, this function scans for enemies close to
 * the center of the screen (small angular threshold) and not occluded by walls.
 * The closest such enemy is marked as dead.
 */
function shoot() {
  // Prevent shooting if still in cooldown
  if (shotCooldown > 0) {
    return;
  }
  shotCooldown = 0.5; // half a second cooldown
  let closestEnemy = null;
  let closestDist = Infinity;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);
    let angleToEnemy = Math.atan2(dy, dx) - player.angle;
    // Normalize angle difference
    while (angleToEnemy < -Math.PI) angleToEnemy += Math.PI * 2;
    while (angleToEnemy > Math.PI) angleToEnemy -= Math.PI * 2;
    // Only consider enemies within a narrow cone (~5 degrees) in front of the player
    if (Math.abs(angleToEnemy) > Math.PI / 36) continue;
    // Check if a wall is closer than the enemy along the player's line of sight
    const { distance: wallDist } = castRay(player.angle);
    if (distance < wallDist + 0.3 && distance < closestDist) {
      closestDist = distance;
      closestEnemy = enemy;
    }
  }
  if (closestEnemy) {
    closestEnemy.alive = false;
  }
}

// Start the game loop once the page has loaded
window.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(gameLoop);
});
