// The wanted system: stars 0–5, heat that grows with crimes and cools when
// the player lies low, and the police cruisers that chase and ram. No DOM.

import { clamp, dist, angleBetween, turnToward, pickOne } from './util.js';
import { makeCar, CAR_MODELS } from './vehicles.js';

export const MAX_STARS = 5;

export function makeWanted() {
  return {
    stars: 0,
    heat: 0, // 0..100; crossing 20/40/60/80/95 raises a star
    quietFor: 0, // seconds since the last crime
    bustTimer: 0,
  };
}

const STAR_HEAT = [0, 20, 40, 60, 80, 95];

export function commitCrime(wanted, heat, reason) {
  wanted.heat = clamp(wanted.heat + heat, 0, 100);
  wanted.quietFor = 0;
  const stars = STAR_HEAT.reduce((n, t, i) => (wanted.heat >= t ? i : n), 0);
  if (stars > wanted.stars) wanted.stars = stars;
  return reason;
}

export function decayWanted(wanted, dt, hidden) {
  wanted.quietFor += dt;
  // Heat only cools once the player has been quiet for a while, and faster
  // when no cop can see them.
  if (wanted.quietFor > 6) {
    wanted.heat = Math.max(0, wanted.heat - dt * (hidden ? 3.2 : 1.1));
    const stars = STAR_HEAT.reduce((n, t, i) => (wanted.heat >= t ? i : n), 0);
    if (stars < wanted.stars) wanted.stars = stars;
  }
}

export function cruisersWanted(stars) {
  if (stars <= 0) return 0;
  if (stars === 1) return 1;
  if (stars === 2) return 2;
  if (stars === 3) return 3;
  return 4;
}

export function officersWanted(stars) {
  if (stars <= 1) return 0;
  if (stars === 2) return 1;
  if (stars === 3) return 2;
  return 3;
}

export function makeCruiser(x, y) {
  const car = makeCar(10, x, y, 0); // Vice Interceptor
  car.driver = 'police';
  car.siren = true;
  car.ramCooldown = 0;
  return car;
}

// A cruiser steers at the player and rams. Returns true when it just rammed.
export function stepCruiser(cruiser, target, dt, city) {
  const m = CAR_MODELS[cruiser.model];
  const a = angleBetween(cruiser.x, cruiser.y, target.x, target.y);
  cruiser.angle = turnToward(cruiser.angle, a, 2.4 * dt);
  const d = dist(cruiser.x, cruiser.y, target.x, target.y);
  const want = d > 260 ? m.top * 0.92 : m.top * 0.55;
  cruiser.speed += clamp(want - cruiser.speed, -420 * dt, 380 * dt);
  cruiser.x += Math.cos(cruiser.angle) * cruiser.speed * dt;
  cruiser.y += Math.sin(cruiser.angle) * cruiser.speed * dt;
  if (cruiser.ramCooldown > 0) cruiser.ramCooldown -= dt;
  if (d < 46 && cruiser.ramCooldown <= 0) {
    cruiser.ramCooldown = 1.1;
    cruiser.speed *= 0.4;
    return true;
  }
  return false;
}

// Is any cop close enough to see the player? Used for heat decay.
export function copInSight(cruisers, officers, player, range) {
  for (const c of cruisers) {
    if (dist(c.x, c.y, player.x, player.y) < range) return true;
  }
  for (const o of officers) {
    if (dist(o.x, o.y, player.x, player.y) < range) return true;
  }
  return false;
}
