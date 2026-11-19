// Cars: eleven stealable models with their own feel, plus the traffic that
// cruises the street grid. Driving is arcade-simple: throttle, brake/reverse,
// steering that bites harder at low speed, drag, and damage from hard knocks.

import { clamp, dist, angleBetween, turnToward, pickOne, pickInt } from './util.js';
import { hitsSolid, nearestLane, randomRoadPoint, shoveOut } from './city.js';

export const CAR_MODELS = [
  { name: 'Sunset Coupe', color: '#e23e57', accel: 420, top: 620, turn: 2.6, grip: 0.92 },
  { name: 'Bay Cruiser', color: '#3e7de2', accel: 330, top: 520, turn: 2.2, grip: 0.9 },
  { name: 'Palm Taxi', color: '#e2c13e', accel: 300, top: 470, turn: 2.4, grip: 0.9 },
  { name: 'Vice Pickup', color: '#7a4d2e', accel: 360, top: 500, turn: 2.1, grip: 0.88 },
  { name: 'Neon Hatchback', color: '#c23ee2', accel: 380, top: 540, turn: 2.8, grip: 0.94 },
  { name: 'Boardwalk Van', color: '#e2e2e2', accel: 260, top: 420, turn: 1.9, grip: 0.86 },
  { name: 'Turbo GT', color: '#222831', accel: 520, top: 720, turn: 2.7, grip: 0.95 },
  { name: 'Coral Sedan', color: '#3ed9c2', accel: 320, top: 500, turn: 2.3, grip: 0.9 },
  { name: 'Retro Muscle', color: '#e26a3e', accel: 450, top: 600, turn: 2.2, grip: 0.87 },
  { name: 'Surf Wagon', color: '#7de23e', accel: 300, top: 460, turn: 2.2, grip: 0.89 },
  { name: 'Vice Interceptor', color: '#1e3a6e', accel: 480, top: 680, turn: 2.9, grip: 0.96 },
];

export function makeCar(modelIndex, x, y, angle) {
  const m = CAR_MODELS[modelIndex % CAR_MODELS.length];
  return {
    kind: 'car',
    model: modelIndex % CAR_MODELS.length,
    name: m.name,
    color: m.color,
    x, y,
    angle,
    speed: 0,
    hp: 100,
    maxHp: 100,
    wrecked: false,
    driver: null, // 'player' | 'traffic' | null (parked)
    brakeLight: false,
    skid: 0,
  };
}

export function makeParkedCars(rng, city, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(rng, city);
    // Parked cars hug the kerb: offset sideways from the lane centre.
    const side = rng() < 0.5 ? -1 : 1;
    const px = p.x + Math.cos(p.angle + Math.PI / 2) * side * 34;
    const py = p.y + Math.sin(p.angle + Math.PI / 2) * side * 34;
    if (hitsSolid(city, px, py, 20)) continue;
    out.push(makeCar(pickInt(rng, 0, CAR_MODELS.length - 1), px, py, p.angle));
  }
  return out;
}

export function makeTrafficCar(rng, city) {
  const p = randomRoadPoint(rng, city);
  const car = makeCar(pickInt(rng, 0, CAR_MODELS.length - 1), p.x, p.y, p.angle);
  car.driver = 'traffic';
  car.speed = 120 + rng() * 90;
  car.cruise = 120 + rng() * 90;
  return car;
}

// Drive the player's car. `keys` is the pressed set; dt in seconds.
export function stepPlayerCar(car, keys, dt, city) {
  const m = CAR_MODELS[car.model];
  const fwd = keys.has('KeyW') || keys.has('ArrowUp');
  const back = keys.has('KeyS') || keys.has('ArrowDown');
  const left = keys.has('KeyA') || keys.has('ArrowLeft');
  const right = keys.has('KeyD') || keys.has('ArrowRight');
  const handbrake = keys.has('Space');

  if (fwd) car.speed += m.accel * dt;
  if (back) car.speed -= m.accel * 0.8 * dt;
  // Drag plus rolling resistance; handbrake scrubs speed hard and lets the
  // tail step out (modelled as extra skid smoke, not full drift physics).
  car.speed -= car.speed * (handbrake ? 1.6 : 0.35) * dt;
  car.speed = clamp(car.speed, -m.top * 0.45, m.top);

  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const steerAuthority = clamp(Math.abs(car.speed) / 120, 0.25, 1);
  const dir = car.speed >= 0 ? 1 : -1;
  car.angle += steer * m.turn * steerAuthority * dir * dt * (handbrake ? 1.35 : 1);
  if (handbrake && Math.abs(car.speed) > 200) car.skid = 0.25;

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const before = car.speed;
  car.x = nx;
  car.y = ny;
  if (hitsSolid(city, car.x, car.y, 22)) {
    // Bounce off: back up to the pre-move spot, lose speed, take damage.
    car.x -= Math.cos(car.angle) * car.speed * dt;
    car.y -= Math.sin(car.angle) * car.speed * dt;
    const impact = Math.abs(before);
    car.speed *= -0.25;
    if (impact > 240) damageCar(car, Math.round((impact - 240) / 45));
  }
  car.brakeLight = back || handbrake;
  if (car.skid > 0) car.skid -= dt;
}

// A traffic car follows its lane and slows for the car ahead.
export function stepTrafficCar(car, dt, city, others) {
  const lane = nearestLane(city, car.x, car.y);
  const targetAngle = lane.vertical
    ? (Math.sin(car.angle) >= 0 ? Math.PI / 2 : -Math.PI / 2)
    : (Math.cos(car.angle) >= 0 ? 0 : Math.PI);
  car.angle = turnToward(car.angle, targetAngle, 1.6 * dt);
  // Nudge back onto the centreline.
  const pull = lane.vertical ? (lane.x - car.x) * 0.5 : (lane.y - car.y) * 0.5;
  if (lane.vertical) car.x += clamp(pull, -40, 40) * dt;
  else car.y += clamp(pull, -40, 40) * dt;

  // Slow down if something is right ahead.
  let clear = true;
  for (const o of others) {
    if (o === car || o.wrecked) continue;
    const d = dist(car.x, car.y, o.x, o.y);
    if (d < 90) {
      const a = angleBetween(car.x, car.y, o.x, o.y);
      let diff = a - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.7) { clear = false; break; }
    }
  }
  const want = clear ? car.cruise : 0;
  car.speed += clamp(want - car.speed, -260 * dt, 160 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (hitsSolid(city, car.x, car.y, 22)) {
    car.x -= Math.cos(car.angle) * car.speed * dt;
    car.y -= Math.sin(car.angle) * car.speed * dt;
    car.speed = 0;
    car.angle += Math.PI / 2;
  }
}

export function damageCar(car, amount) {
  car.hp -= amount;
  if (car.hp <= 0) {
    car.hp = 0;
    car.wrecked = true;
    car.speed = 0;
  }
}

// Nearest car to a point within maxDist, or null.
export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const c of cars) {
    if (c.wrecked) continue;
    const d = dist(x, y, c.x, c.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
