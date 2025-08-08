/*
 * Portal‑based 2.5D renderer for our Doom‑inspired game.  Unlike the
 * simple ray‑casting renderer from earlier commits, this module uses
 * a sector/portal system similar to the original Doom engine.  The
 * world is described as a collection of convex polygons (sectors) with
 * floor and ceiling heights.  Each edge of a sector may point to a
 * neighbouring sector (a portal) or to empty space (a solid wall).
 *
 * The renderer starts from the sector the player is currently in and
 * traverses neighbouring sectors recursively, clipping the view frustum
 * along the way.  Walls are drawn as vertical quads by interpolating
 * the top and bottom edges across screen columns.  This approach
 * eliminates per‑column ray casting and allows for arbitrary shaped
 * rooms with differing floor heights.
 */

// Grab the canvas and its 2D context.  We assume the HTML page has
// already created a canvas element with id 'gameCanvas'.
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Screen dimensions for convenience
const SCREEN_WIDTH = canvas.width;
const SCREEN_HEIGHT = canvas.height;

// Field of view configuration.  Doom used a 90° horizontal FOV,
// but a narrower FOV often feels more natural on a widescreen display.
const HFOV = Math.PI / 3; // 60° horizontal field of view
const VFOV = HFOV * (SCREEN_HEIGHT / SCREEN_WIDTH);

// Player definition.  The player moves within the sector system
// and has an eye height (z) between the floor and ceiling of the
// current sector.
const player = {
  x: 5.0,           // world X coordinate
  y: 2.5,           // world Y coordinate
  z: 1.0,           // eye height above the floor
  angle: 0.0,       // viewing angle in radians
  sector: 0,        // index of the sector the player is in
  speed: 3.0,       // movement speed units per second
  rotSpeed: Math.PI // rotation speed (radians per second)
};

// Data structures for the sector based world.  Each sector is
// comprised of a list of vertices (x,y pairs) and a list of
// neighbouring sector indices.  A neighbour of -1 means that edge
// borders the void and is rendered as a solid wall.  Floor and
// ceiling heights can differ between sectors allowing for stepped
// structures.

class Sector {
  constructor(floor, ceil, verts, neighbours, color = '#888') {
    this.floor = floor;
    this.ceil = ceil;
    this.verts = verts;         // array of {x, y}
    this.neighbours = neighbours; // array of sector indices or -1
    this.color = color;         // base wall colour for this sector
  }
}

// Define a very small world composed of a handful of sectors.  This is
// not a full reproduction of E1M1 but demonstrates the portal system.
// Later commits can expand on this map to match the first level more
// closely.
const sectors = [
  // Sector 0: starting room.  A rectangular room with a door on
  // the east wall leading to sector 1.  Floor at 0 and ceiling at 3.
  new Sector(
    0, 3,
    [ { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 5 } ],
    [ -1,    /* north wall */
      1,     /* east wall goes to sector 1 */
      -1,    /* south wall */
      -1     /* west wall */
    ],
    '#6c6' // greenish walls
  ),
  // Sector 1: corridor leading to a larger room.  Has two portals:
  // the west wall leads back to sector 0, and the east wall leads to
  // sector 2.  Floor and ceiling heights match sector 0.
  new Sector(
    0, 3,
    [ { x: 10, y: 1 }, { x: 14, y: 1 }, { x: 14, y: 4 }, { x: 10, y: 4 } ],
    [ -1, 2, -1, 0 ],
    '#66c' // bluish walls
  ),
  // Sector 2: a larger room.  Floor at 0 and a taller ceiling.
  new Sector(
    0, 4,
    [ { x: 14, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 6 }, { x: 14, y: 6 } ],
    [ -1, -1, -1, 1 ],
    '#c66' // reddish walls
  )
];

// Key state tracking for movement and rotation
const keys = {
  w: false,
  s: false,
  a: false,
  d: false,
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};

// Handle key presses to update the keys object
window.addEventListener('keydown', (e) => {
  if (e.key in keys) {
    keys[e.key] = true;
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key in keys) {
    keys[e.key] = false;
    e.preventDefault();
  }
});

/**
 * Linear interpolation between a and b given factor t in [0,1].
 * @param {number} a
 * @param {number} b
 * @param {number} t
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Update the player's position and orientation based on input.  Uses
 * simple collision detection against the sector boundaries by
 * clipping movement to avoid walking through solid walls.  Only
 * horizontal movement is considered; the player's eye height z and
 * sector remain constant unless moving through a portal.
 *
 * @param {number} dt Delta time in seconds since last update
 */
function updatePlayer(dt) {
  // Rotation: A and D or left/right arrows rotate the view
  let rot = 0;
  if (keys.a || keys.ArrowLeft) rot -= player.rotSpeed * dt;
  if (keys.d || keys.ArrowRight) rot += player.rotSpeed * dt;
  player.angle += rot;
  // Normalize angle to [0, 2π)
  if (player.angle < 0) player.angle += Math.PI * 2;
  if (player.angle >= Math.PI * 2) player.angle -= Math.PI * 2;

  // Movement: W/S or up/down arrows move forward/backwards.  We
  // compute a proposed new position and then test if it lies within
  // the current sector or can pass through a portal.  If the move
  // crosses a portal, we update the player's current sector.
  let dx = 0;
  let dy = 0;
  const move = player.speed * dt;
  if (keys.w || keys.ArrowUp) {
    dx += Math.cos(player.angle) * move;
    dy += Math.sin(player.angle) * move;
  }
  if (keys.s || keys.ArrowDown) {
    dx -= Math.cos(player.angle) * move;
    dy -= Math.sin(player.angle) * move;
  }
  // Compute proposed position
  const newX = player.x + dx;
  const newY = player.y + dy;
  // Check against current sector walls
  const current = sectors[player.sector];
  let inside = pointInPolygon(newX, newY, current.verts);
  let crossedPortal = false;
  let newSector = player.sector;
  if (!inside) {
    // The player is attempting to leave the current sector; test
    // each edge to see if it has a neighbour and if the move crosses
    // that edge.  We'll perform a simple line/segment intersection.
    for (let i = 0; i < current.verts.length; i++) {
      const v1 = current.verts[i];
      const v2 = current.verts[(i + 1) % current.verts.length];
      // Only check portal edges
      const neighbour = current.neighbours[i];
      if (neighbour < 0) continue;
      // See if the movement vector intersects the wall segment
      if (segmentIntersect(player.x, player.y, newX, newY, v1.x, v1.y, v2.x, v2.y)) {
        // Check vertical clearance: ensure the player's eye height is
        // between the floor and ceiling of the neighbouring sector
        const ns = sectors[neighbour];
        if (player.z > ns.floor && player.z < ns.ceil) {
          crossedPortal = true;
          newSector = neighbour;
          break;
        }
      }
    }
  }
  // If we are inside current sector or crossed a portal, move
  if (inside || crossedPortal) {
    player.x = newX;
    player.y = newY;
    player.sector = newSector;
  }
}

/**
 * Test whether a point (px,py) lies inside a convex polygon defined
 * by verts (array of {x,y}).  Uses the winding method.  Assumes
 * vertices are ordered clockwise.
 * @param {number} px
 * @param {number} py
 * @param {Array<{x:number,y:number}>} verts
 */
function pointInPolygon(px, py, verts) {
  let sign = 0;
  for (let i = 0; i < verts.length; i++) {
    const v1 = verts[i];
    const v2 = verts[(i + 1) % verts.length];
    const cross = (v2.x - v1.x) * (py - v1.y) - (v2.y - v1.y) * (px - v1.x);
    if (cross === 0) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/**
 * Check if two line segments intersect.  Returns true if the
 * segments (x1,y1)-(x2,y2) and (x3,y3)-(x4,y4) cross each other.
 */
function segmentIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (x4 - x3) * (y2 - y1) - (y4 - y3) * (x2 - x1);
  if (denom === 0) return false; // parallel
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/**
 * Render the visible scene.  We perform a portal traversal starting
 * from the player's sector.  Each portal restricts the horizontal
 * range (xl,xr) of subsequent rendering.  Arrays yTop and yBottom
 * track the highest/lowest pixel drawn in each column to support
 * clipping between sectors.
 */
function render() {
  // Clear the screen
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  // Initialize top and bottom clipping arrays
  const yTop = new Array(SCREEN_WIDTH).fill(0);
  const yBottom = new Array(SCREEN_WIDTH).fill(SCREEN_HEIGHT - 1);
  // Set up queue for portal traversal: {sectorId, xl, xr}
  const queue = [];
  queue.push({ sectorId: player.sector, xl: 0, xr: SCREEN_WIDTH - 1 });
  while (queue.length > 0) {
    const { sectorId, xl, xr } = queue.shift();
    const sector = sectors[sectorId];
    const nverts = sector.verts.length;
    for (let i = 0; i < nverts; i++) {
      const v1 = sector.verts[i];
      const v2 = sector.verts[(i + 1) % nverts];
      const neighbour = sector.neighbours[i];
      // Transform vertices relative to player
      let p1x = v1.x - player.x;
      let p1y = v1.y - player.y;
      let p2x = v2.x - player.x;
      let p2y = v2.y - player.y;
      // Rotate around the player's angle
      const sinA = Math.sin(-player.angle);
      const cosA = Math.cos(-player.angle);
      let t1x = p1x * cosA - p1y * sinA;
      let t1z = p1x * sinA + p1y * cosA;
      let t2x = p2x * cosA - p2y * sinA;
      let t2z = p2x * sinA + p2y * cosA;
      // Near plane clipping: if both points are behind the player, skip
      const NEAR = 0.0001;
      if (t1z <= NEAR && t2z <= NEAR) continue;
      // Clip against near plane if necessary
      if (t1z <= NEAR || t2z <= NEAR) {
        const alpha = (NEAR - t1z) / (t2z - t1z);
        if (t1z < NEAR) {
          t1x = t1x + (t2x - t1x) * alpha;
          t1z = NEAR;
        } else {
          t2x = t1x + (t2x - t1x) * alpha;
          t2z = NEAR;
        }
      }
      // Project to screen coordinates
      const sx1 = Math.floor(
        SCREEN_WIDTH / 2 - (t1x * (SCREEN_WIDTH / 2)) / (t1z * Math.tan(HFOV / 2))
      );
      const sx2 = Math.floor(
        SCREEN_WIDTH / 2 - (t2x * (SCREEN_WIDTH / 2)) / (t2z * Math.tan(HFOV / 2))
      );
      // Skip wall segment if completely outside current horizontal bounds
      if (sx2 < xl || sx1 > xr) continue;
      // Compute world heights relative to player's eye for current sector
      const floor = sector.floor - player.z;
      const ceil = sector.ceil - player.z;
      // Compute world heights relative to neighbour sector if present
      let nf = 0, nc = 0;
      if (neighbour >= 0) {
        nf = sectors[neighbour].floor - player.z;
        nc = sectors[neighbour].ceil - player.z;
      }
      // Interpolate vertical coordinates for the left and right points
      const ya1 = ceil / t1z;
      const ya2 = ceil / t2z;
      const yb1 = floor / t1z;
      const yb2 = floor / t2z;
      const nya1 = nc / t1z;
      const nya2 = nc / t2z;
      const nyb1 = nf / t1z;
      const nyb2 = nf / t2z;
      // Convert to screen Y coordinates
      const sya1 = Math.floor(
        SCREEN_HEIGHT / 2 - ya1 * (SCREEN_HEIGHT / 2) / Math.tan(VFOV / 2)
      );
      const sya2 = Math.floor(
        SCREEN_HEIGHT / 2 - ya2 * (SCREEN_HEIGHT / 2) / Math.tan(VFOV / 2)
      );
      const syb1 = Math.floor(
        SCREEN_HEIGHT / 2 - yb1 * (SCREEN_HEIGHT / 2) / Math.tan(VFOV / 2)
      );
      const syb2 = Math.floor(
        SCREEN_HEIGHT / 2 - yb2 * (SCREEN_HEIGHT / 2) / Math.tan(VFOV / 2)
      );
      const snya1 = Math.floor(
        SCREEN_HEIGHT / 2 - nya1 * (SCREEN_HEIGHT / 2) / Math.tan(VFOV / 2)
      );
      const snya2 = Math.floor(
        SCREEN_HEIGHT / 2 - nya2 * (SCREEN_HEIGHT / 2) / Math.tan(VFOV / 2)
      );
      const snyb1 = Math.floor(
        SCREEN_HEIGHT / 2 - nyb1 * (SCREEN_HEIGHT / 2) / Math.tan(VFOV / 2)
      );
      const snyb2 = Math.floor(
        SCREEN_HEIGHT / 2 - nyb2 * (SCREEN_HEIGHT / 2) / Math.tan(VFOV / 2)
      );
      // Clamp horizontal range to current bounds
      let xStart = Math.max(sx1, xl);
      let xEnd = Math.min(sx2, xr);
      if (xStart < 0) xStart = 0;
      if (xEnd >= SCREEN_WIDTH) xEnd = SCREEN_WIDTH - 1;
      // Determine interpolation slopes
      const dx = sx2 - sx1;
      // Draw vertical slices
      for (let x = xStart; x <= xEnd; x++) {
        const t = dx !== 0 ? (x - sx1) / dx : 0;
        // Interpolate top and bottom of current wall
        let ya = Math.floor(lerp(sya1, sya2, t));
        let yb = Math.floor(lerp(syb1, syb2, t));
        // Clamp with current top/bottom clipping
        if (ya < yTop[x]) ya = yTop[x];
        if (yb > yBottom[x]) yb = yBottom[x];
        // Draw the wall segment if any
        if (yb >= ya) {
          ctx.fillStyle = sector.color;
          ctx.fillRect(x, ya, 1, yb - ya + 1);
        }
        // If this edge has a neighbour, compute the portal top/bottom for
        // the neighbour and update clipping arrays accordingly
        if (neighbour >= 0) {
          let nya = Math.floor(lerp(snya1, snya2, t));
          let nyb = Math.floor(lerp(snyb1, snyb2, t));
          // Clamp to current clipping
          if (nya < yTop[x]) nya = yTop[x];
          if (nyb > yBottom[x]) nyb = yBottom[x];
          // Store the new top/bottom for the neighbour.  If the portal
          // spans more than one column, we'll update the queue at the
          // end of this segment to avoid pushing multiple entries.
          yTop[x] = Math.max(yTop[x], nyb);
          yBottom[x] = Math.min(yBottom[x], nya);
        }
      }
      // If this edge has a neighbour, push it onto the queue once per
      // wall instead of per column.  The new horizontal range is the
      // intersection of this wall segment with the current xl/xr.
      if (neighbour >= 0 && xEnd >= xStart) {
        queue.push({ sectorId: neighbour, xl: xStart, xr: xEnd });
      }
    }
  }
}

/**
 * Main game loop.  Updates the player, renders the scene and
 * schedules the next frame.  This function is started once the
 * document has finished loading.
 *
 * @param {number} timestamp DOM high resolution timestamp
 */
let lastTime = 0;
function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  updatePlayer(dt);
  render();
  requestAnimationFrame(gameLoop);
}

// Start the main loop when the page is loaded
window.addEventListener('DOMContentLoaded', () => {
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
});