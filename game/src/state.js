// The session: one object every system reads and writes. A ride is a
// plain object {x, y, angle, speed, paint, health, cruiser, cab,
// driver, brain, stuck} where driver is 'hero' | 'traffic' | 'cops' |
// null (parked). The camera trails the hero (or their ride) and stays
// inside the map.
import { TUNE, INK } from './tune.js';
import { growBay } from './bay.js';
import { makeDice, oneOf, span } from './dice.js';

export function newSession(seed) {
  const bay = growBay(seed);
  const dice = makeDice(seed * 7 + 13);
  const rides = [];
  // Parked street rides the hero can steal.
  for (let i = 0; i < 10; i += 1) {
    const sx = oneOf(dice, bay.vStreets);
    const sy = oneOf(dice, bay.hStreets);
    const vertical = dice() < 0.5;
    rides.push(newRide(
      vertical ? sx + (dice() < 0.5 ? -24 : 24) : span(dice, 200, TUNE.mapW - 200),
      vertical ? span(dice, 200, TUNE.mapH - 500) : sy + (dice() < 0.5 ? -24 : 24),
      vertical ? (dice() < 0.5 ? 0 : Math.PI) : (dice() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      oneOf(dice, INK.paintJobs), dice,
    ));
  }
  // One cab for flavour.
  rides.push(newRide(bay.vStreets[2] + 24, bay.hStreets[1], 0, INK.cab, dice, { cab: true }));
  return {
    seed, bay, dice,
    rides,
    walkers: [],
    cruisers: [],
    officers: [],
    goons: [],
    pickups: [],
    clock: 0,
    cam: { x: 0, y: 0, w: TUNE.viewW, h: TUNE.viewH },
    jolt: 0,
    heat: null, // wired up by boot.js so jobs can raise the heat
  };
}

export function newRide(x, y, angle, paint, dice, opts = {}) {
  return {
    x, y, angle, speed: 0,
    paint, health: 100,
    cruiser: !!opts.cruiser,
    cab: !!opts.cab,
    driver: opts.driver || null,
    brain: null,
    stuck: 0,
  };
}

export function trailCam(session, focusX, focusY) {
  const cam = session.cam;
  const tx = focusX - cam.w / 2;
  const ty = focusY - cam.h / 2;
  cam.x += (tx - cam.x) * 0.12;
  cam.y += (ty - cam.y) * 0.12;
  cam.x = Math.max(0, Math.min(TUNE.mapW - cam.w, cam.x));
  cam.y = Math.max(0, Math.min(TUNE.mapH - cam.h, cam.y));
  if (session.jolt > 0) {
    session.jolt = Math.max(0, session.jolt - 0.03);
    cam.x += (Math.random() - 0.5) * session.jolt * 14;
    cam.y += (Math.random() - 0.5) * session.jolt * 14;
  }
}

// Roll a ride forward along its heading, bouncing off blocks and the
// map edge. True when it hit something solid.
export function rollRide(session, ride, dt) {
  const nx = ride.x + Math.cos(ride.angle) * ride.speed * dt;
  const ny = ride.y + Math.sin(ride.angle) * ride.speed * dt;
  const r = 20;
  const hit = session.bay.blocks.some((b) =>
    nx + r > b.x && nx - r < b.x + b.w && ny + r > b.y && ny - r < b.y + b.h);
  const inside = nx > 30 && nx < TUNE.mapW - 30 && ny > 30 && ny < TUNE.mapH - 30;
  if (hit || !inside) {
    ride.speed *= -0.25;
    ride.health -= Math.abs(ride.speed) * 0.02 + 2;
    session.jolt = Math.min(1, session.jolt + 0.4);
    return true;
  }
  ride.x = nx; ride.y = ny;
  return false;
}

export function gap(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function headTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
export function turnToward(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
