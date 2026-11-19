// Sunset Bay's map: a street grid with a beach and the sea along the south edge,
// parks, palm trees and buildings filling the blocks between the roads.
// Everything is generated from one seed, so the same seed always builds the
// same city. No DOM here — pure data plus collision queries.

import { mulberry, pickOne, pickInt, clamp } from './util.js';

export const WORLD_W = 3600;
export const WORLD_H = 2600;
export const ROAD_W = 110;
export const BEACH_TOP = 2220; // sand starts here
export const SEA_TOP = 2400; // water starts here (impassable)

const VERTICAL_ROADS = [320, 720, 1120, 1520, 1920, 2320, 2720, 3120];
const HORIZONTAL_ROADS = [260, 610, 960, 1310, 1660, 2010];

const ROOF_COLORS = ['#b0563a', '#7a6a8c', '#4d7a5e', '#8c7a4d', '#5e6f8c', '#94555e'];
const WALL_COLORS = ['#cbb79a', '#a8b0b8', '#d9c1a3', '#9fb3a4', '#c2a6a0'];

export function buildCity(seed) {
  const rng = mulberry(seed);
  const buildings = [];
  const palms = [];
  const parks = [];

  // Blocks are the rectangles between neighbouring roads. Each block becomes a
  // park, a row of buildings, or a mix with palm trees along its edges.
  for (let i = 0; i < VERTICAL_ROADS.length - 1; i++) {
    for (let j = 0; j < HORIZONTAL_ROADS.length - 1; j++) {
      const x0 = VERTICAL_ROADS[i] + ROAD_W / 2 + 24;
      const x1 = VERTICAL_ROADS[i + 1] - ROAD_W / 2 - 24;
      const y0 = HORIZONTAL_ROADS[j] + ROAD_W / 2 + 24;
      const y1 = HORIZONTAL_ROADS[j + 1] - ROAD_W / 2 - 24;
      if (y1 > BEACH_TOP - 40) continue;
      const roll = rng();
      if (roll < 0.22) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, trees: pickInt(rng, 4, 9) });
        for (let t = 0; t < 6; t++) {
          palms.push({ x: x0 + 30 + rng() * (x1 - x0 - 60), y: y0 + 30 + rng() * (y1 - y0 - 60) });
        }
        continue;
      }
      const cols = (x1 - x0) > 200 ? 2 : 1;
      const rows = (y1 - y0) > 160 ? 2 : 1;
      const cw = (x1 - x0) / cols;
      const ch = (y1 - y0) / rows;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rng() < 0.14) {
            palms.push({ x: x0 + c * cw + cw / 2, y: y0 + r * ch + ch / 2 });
            continue;
          }
          const bw = cw * (0.55 + rng() * 0.25);
          const bh = ch * (0.55 + rng() * 0.25);
          buildings.push({
            x: x0 + c * cw + (cw - bw) / 2,
            y: y0 + r * ch + (ch - bh) / 2,
            w: bw,
            h: bh,
            roof: pickOne(rng, ROOF_COLORS),
            wall: pickOne(rng, WALL_COLORS),
            floors: pickInt(rng, 1, 4),
          });
        }
      }
      // A couple of palms on the block corners.
      palms.push({ x: x0 + 12, y: y0 + 12 });
      palms.push({ x: x1 - 12, y: y1 - 12 });
    }
  }

  // Palm-lined promenade along the beach.
  for (let x = 120; x < WORLD_W - 100; x += 170) {
    palms.push({ x: x + (rng() - 0.5) * 40, y: BEACH_TOP + 42 + rng() * 60 });
  }

  return {
    seed,
    w: WORLD_W,
    h: WORLD_H,
    vRoads: VERTICAL_ROADS.slice(),
    hRoads: HORIZONTAL_ROADS.slice(),
    buildings,
    palms,
    parks,
  };
}

export function isOnRoad(city, x, y) {
  for (const rx of city.vRoads) {
    if (Math.abs(x - rx) < ROAD_W / 2) return true;
  }
  for (const ry of city.hRoads) {
    if (Math.abs(y - ry) < ROAD_W / 2) return true;
  }
  return false;
}

export function onSand(city, x, y) {
  return y >= BEACH_TOP && y < SEA_TOP;
}

export function inSea(city, x, y) {
  return y >= SEA_TOP;
}

// True when a circle of radius r at (x, y) overlaps a building or the sea.
export function hitsSolid(city, x, y, r) {
  if (inSea(city, x, y)) return true;
  if (x < r || y < r || x > city.w - r || y > city.h - r) return true;
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

// Push a circle out of whatever solid it overlaps (buildings and map edges).
// Returns true when anything was pushed.
export function shoveOut(city, p, r) {
  let moved = false;
  p.x = clamp(p.x, r, city.w - r);
  p.y = clamp(p.y, r, SEA_TOP - r);
  for (const b of city.buildings) {
    const nx = clamp(p.x, b.x, b.x + b.w);
    const ny = clamp(p.y, b.y, b.y + b.h);
    const dx = p.x - nx;
    const dy = p.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 < 0.0001) {
        p.y = b.y - r;
      } else {
        const d = Math.sqrt(d2);
        p.x = nx + (dx / d) * r;
        p.y = ny + (dy / d) * r;
      }
      moved = true;
    }
  }
  return moved;
}

// Nearest point on a road centreline, plus the road's direction (0 = east,
// PI/2 = south). Used by traffic cars to stay in their lane.
export function nearestLane(city, x, y) {
  let best = null;
  for (const rx of city.vRoads) {
    const d = Math.abs(x - rx);
    if (!best || d < best.d) best = { d, x: rx, y, angle: Math.PI / 2, vertical: true };
  }
  for (const ry of city.hRoads) {
    const d = Math.abs(y - ry);
    if (!best || d < best.d) best = { d, x, y: ry, angle: 0, vertical: false };
  }
  return best;
}

// A random point on a road, for spawning traffic and parked cars.
export function randomRoadPoint(rng, city) {
  if (rng() < 0.5) {
    const rx = pickOne(rng, city.vRoads);
    return { x: rx + (rng() - 0.5) * (ROAD_W - 44), y: 80 + rng() * (BEACH_TOP - 180), angle: rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2 };
  }
  const ry = pickOne(rng, city.hRoads);
  return { x: 80 + rng() * (WORLD_W - 160), y: ry + (rng() - 0.5) * (ROAD_W - 44), angle: rng() < 0.5 ? 0 : Math.PI };
}

// A random sidewalk point (just off a road) for a pedestrian. The offset
// stays inside the 24px clear margin between the road edge and the blocks,
// so walkers never spawn inside a building.
export function randomSidewalkPoint(rng, city) {
  if (rng() < 0.5) {
    const rx = pickOne(rng, city.vRoads);
    const side = rng() < 0.5 ? -1 : 1;
    return { x: rx + side * (ROAD_W / 2 + 14 + rng() * 6), y: 80 + rng() * (BEACH_TOP - 180) };
  }
  const ry = pickOne(rng, city.hRoads);
  const side = rng() < 0.5 ? -1 : 1;
  return { x: 80 + rng() * (WORLD_W - 160), y: ry + side * (ROAD_W / 2 + 14 + rng() * 6) };
}
