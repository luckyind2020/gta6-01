// Shared game state: one object every system reads and writes.
// Cars are plain objects {x,y,angle,speed,color,health,police,taxi,driver}.
// The camera follows the player (or their car) and clamps to the world.
import { CFG } from './config.js';
import { buildCity } from './city.js';
import { makeRng, pick, range } from './random.js';
import { PAL } from './config.js';

export function createWorld(seed) {
  const city = buildCity(seed);
  const rng = makeRng(seed * 7 + 13);
  const cars = [];
  // Parked / drivable street cars.
  for (let i = 0; i < 10; i++) {
    const sx = pick(rng, city.streetXs);
    const sy = pick(rng, city.streetYs);
    const onVertical = rng() < 0.5;
    cars.push(makeCar(
      onVertical ? sx + (rng() < 0.5 ? -24 : 24) : range(rng, 200, CFG.worldW - 200),
      onVertical ? range(rng, 200, CFG.worldH - 500) : sy + (rng() < 0.5 ? -24 : 24),
      onVertical ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      pick(rng, PAL.carBody), rng,
    ));
  }
  // One taxi for flavour.
  cars.push(makeCar(city.streetXs[2] + 24, city.streetYs[1], 0, PAL.taxi, rng, { taxi: true }));
  return {
    seed, city, rng,
    cars,
    peds: [],
    policeCars: [],
    footCops: [],
    thugs: [],
    pickups: [],
    time: 0,
    camera: { x: 0, y: 0, w: CFG.canvasW, h: CFG.canvasH },
    shake: 0,
    flash: 0,
  };
}

export function makeCar(x, y, angle, color, rng, opts = {}) {
  return {
    x, y, angle, speed: 0,
    color, health: 100,
    police: !!opts.police,
    taxi: !!opts.taxi,
    driver: opts.driver || null, // 'player' | 'traffic' | 'police' | null (parked)
    ai: null,
    stuck: 0,
  };
}

export function updateCamera(world, focusX, focusY) {
  const cam = world.camera;
  const tx = focusX - cam.w / 2;
  const ty = focusY - cam.h / 2;
  cam.x += (tx - cam.x) * 0.12;
  cam.y += (ty - cam.y) * 0.12;
  cam.x = Math.max(0, Math.min(CFG.worldW - cam.w, cam.x));
  cam.y = Math.max(0, Math.min(CFG.worldH - cam.h, cam.y));
  if (world.shake > 0) {
    world.shake = Math.max(0, world.shake - 0.03);
    cam.x += (Math.random() - 0.5) * world.shake * 14;
    cam.y += (Math.random() - 0.5) * world.shake * 14;
  }
}

// Move a car forward along its heading, colliding with buildings and
// the world edge; returns true when it hit something hard.
export function moveCar(world, car, dt) {
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const r = 20;
  const hit = world.city.buildings.some((b) =>
    nx + r > b.x && nx - r < b.x + b.w && ny + r > b.y && ny - r < b.y + b.h);
  const inWorld = nx > 30 && nx < CFG.worldW - 30 && ny > 30 && ny < CFG.worldH - 30;
  if (hit || !inWorld) {
    car.speed *= -0.25;
    car.health -= Math.abs(car.speed) * 0.02 + 2;
    world.shake = Math.min(1, world.shake + 0.4);
    return true;
  }
  car.x = nx; car.y = ny;
  return false;
}

export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function angleTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
