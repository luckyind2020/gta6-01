// People of Sunset Bay: the player on foot, pedestrians with a simple daily
// walk (and a flee reflex when something scary happens nearby), Rico's thugs
// who fight back, and foot officers who chase the player. No DOM here.

import { clamp, dist, angleBetween, turnToward, pickOne, pickInt } from './util.js';
import { shoveOut, randomSidewalkPoint, isOnRoad } from './city.js';

const PED_SHIRTS = ['#e2583e', '#3e7de2', '#e2b13e', '#7de23e', '#c23ee2', '#3ed9e2', '#e2e2e2', '#e28a3e'];
const PED_SKINS = ['#f0c08a', '#c98d5f', '#8a5a34', '#f5d0a8'];

export function makePlayer(x, y) {
  return {
    kind: 'player',
    x, y,
    angle: -Math.PI / 2,
    speed: 0,
    hp: 100,
    maxHp: 100,
    cash: 0,
    walkSpeed: 165,
    runSpeed: 265,
    punchCooldown: 0,
    punchArc: 0,
    inCar: null, // car object or null
    busted: false,
    moving: false,
  };
}

export function makePed(rng, city) {
  const p = randomSidewalkPoint(rng, city);
  return {
    kind: 'ped',
    x: p.x, y: p.y,
    angle: rng() * Math.PI * 2,
    speed: 28 + rng() * 30,
    shirt: pickOne(rng, PED_SHIRTS),
    skin: pickOne(rng, PED_SKINS),
    target: null,
    fleeing: 0,
    scared: 0,
    wobble: rng() * Math.PI * 2,
  };
}

export function makeThug(rng, x, y) {
  return {
    kind: 'thug',
    x, y,
    angle: rng() * Math.PI * 2,
    speed: 95,
    hp: 3,
    shirt: '#3a3a3a',
    skin: pickOne(rng, PED_SKINS),
    punchCooldown: 0,
    down: false,
  };
}

export function makeOfficer(x, y) {
  return {
    kind: 'officer',
    x, y,
    angle: 0,
    speed: 175,
    shirt: '#1e3a6e',
    skin: '#f0c08a',
    punchCooldown: 0,
  };
}

// Move the player on foot. `keys` is a set of pressed key codes; `dt` seconds.
export function stepPlayerOnFoot(player, keys, dt, city) {
  let mx = 0;
  let my = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = running ? player.runSpeed : player.walkSpeed;
  player.moving = mx !== 0 || my !== 0;
  if (player.moving) {
    const len = Math.hypot(mx, my);
    player.x += (mx / len) * speed * dt;
    player.y += (my / len) * speed * dt;
    // One push-out is enough: it slides the player along a wall instead of
    // stopping them dead when one axis is blocked.
    shoveOut(city, player, 16);
    player.angle = Math.atan2(my, mx);
  }
  if (player.punchCooldown > 0) player.punchCooldown -= dt;
  if (player.punchArc > 0) player.punchArc -= dt * 3;
}

// A punch hits everyone in a short arc in front of the puncher.
// Returns the list of victims hit.
export function punchHits(puncher, others, range, arcHalf) {
  const hit = [];
  for (const o of others) {
    if (o.down) continue;
    const d = dist(puncher.x, puncher.y, o.x, o.y);
    if (d > range) continue;
    const a = angleBetween(puncher.x, puncher.y, o.x, o.y);
    let diff = a - puncher.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < arcHalf) hit.push(o);
  }
  return hit;
}

export function stepPed(ped, city, dt, danger) {
  // danger: {x, y, radius} of something scary, or null.
  if (danger && dist(ped.x, ped.y, danger.x, danger.y) < danger.radius) {
    ped.fleeing = 1.6;
  }
  if (ped.fleeing > 0) {
    ped.fleeing -= dt;
    const away = angleBetween(danger.x, danger.y, ped.x, ped.y);
    ped.angle = turnToward(ped.angle, away, 6 * dt);
    ped.x += Math.cos(ped.angle) * 120 * dt;
    ped.y += Math.sin(ped.angle) * 120 * dt;
    shoveOut(city, ped, 14);
    return;
  }
  ped.wobble += dt;
  if (!ped.target || dist(ped.x, ped.y, ped.target.x, ped.target.y) < 24) {
    ped.target = randomSidewalkPoint(Math.random, city);
  }
  const a = angleBetween(ped.x, ped.y, ped.target.x, ped.target.y);
  ped.angle = turnToward(ped.angle, a, 3 * dt);
  const sway = Math.sin(ped.wobble * 2) * 0.25;
  ped.x += Math.cos(ped.angle + sway) * ped.speed * dt;
  ped.y += Math.sin(ped.angle + sway) * ped.speed * dt;
  shoveOut(city, ped, 14);
}

export function stepThug(thug, player, dt, city) {
  if (thug.down) return;
  const d = dist(thug.x, thug.y, player.x, player.y);
  if (d < 700) {
    const a = angleBetween(thug.x, thug.y, player.x, player.y);
    thug.angle = turnToward(thug.angle, a, 5 * dt);
    if (d > 26) {
      thug.x += Math.cos(thug.angle) * thug.speed * dt;
      thug.y += Math.sin(thug.angle) * thug.speed * dt;
      shoveOut(city, thug, 15);
    }
  }
  if (thug.punchCooldown > 0) thug.punchCooldown -= dt;
}

export function stepOfficer(off, player, dt, city) {
  const d = dist(off.x, off.y, player.x, player.y);
  const a = angleBetween(off.x, off.y, player.x, player.y);
  off.angle = turnToward(off.angle, a, 5 * dt);
  if (d > 24) {
    off.x += Math.cos(off.angle) * off.speed * dt;
    off.y += Math.sin(off.angle) * off.speed * dt;
    shoveOut(city, off, 15);
  }
  if (off.punchCooldown > 0) off.punchCooldown -= dt;
}
