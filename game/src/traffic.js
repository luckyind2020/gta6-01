// Traffic cars and pedestrians: simple street-following AI.
// Traffic cars drive along a street lane, turn at intersections and
// slow for the car ahead. Pedestrians stroll the sidewalks and flee
// when a punch lands nearby.
import { CFG, PAL } from './config.js';
import { makeRng, pick, range } from './random.js';
import { nearestStreetPoint, isOnRoad } from './city.js';
import { moveCar, angleDiff, dist } from './world.js';

export function spawnTraffic(world) {
  const rng = world.rng;
  world.peds = [];
  for (let i = 0; i < CFG.pedCount; i++) {
    const sx = pick(rng, world.city.streetXs);
    const sy = pick(rng, world.city.streetYs);
    world.peds.push({
      x: sx + range(rng, -70, 70), y: sy + range(rng, -70, 70),
      angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 28, 55),
      shirt: pick(rng, PAL.pedShirt),
      flee: 0, walkPhase: range(rng, 0, 6),
    });
  }
  // Give a few parked cars traffic drivers so the streets feel alive.
  let assigned = 0;
  for (const car of world.cars) {
    if (assigned >= CFG.trafficCount || car.taxi) continue;
    if (car.driver) continue;
    car.driver = 'traffic';
    car.speed = range(rng, 90, 150);
    const sp = nearestStreetPoint(world.city, car.x, car.y);
    car.angle = sp.horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    car.ai = { lane: sp.horizontal ? 'h' : 'v', offset: rng() < 0.5 ? -24 : 24 };
    assigned++;
  }
}

export function updateTraffic(world, player, dt) {
  // Traffic cars.
  for (const car of world.cars) {
    if (car.driver !== 'traffic') continue;
    const ai = car.ai || { lane: 'h', offset: 24 };
    // Steer toward the lane line.
    const sp = nearestStreetPoint(world.city, car.x, car.y);
    const target = ai.lane === 'h'
      ? { x: car.x + Math.cos(car.angle) * 60, y: sp.y + ai.offset }
      : { x: sp.x + ai.offset, y: car.y + Math.sin(car.angle) * 60 };
    const want = Math.atan2(target.y - car.y, target.x - car.x);
    car.angle += angleDiff(car.angle, want) * Math.min(1, dt * 2.2);
    // Slow for the car ahead.
    let blocked = false;
    for (const other of world.cars) {
      if (other === car) continue;
      const d = dist(car, other);
      if (d < 70 && Math.abs(angleDiff(car.angle, Math.atan2(other.y - car.y, other.x - car.x))) < 0.5) { blocked = true; break; }
    }
    if (player.inCar === car) blocked = false;
    const targetSpeed = blocked ? 0 : 120;
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.5);
    moveCar(world, car, dt);
    // Reached a street end: turn around at the map edge.
    if (car.x < 120 || car.x > CFG.worldW - 120 || car.y < 120 || car.y > CFG.worldH - 460) {
      car.angle += Math.PI;
      car.x = Math.max(140, Math.min(CFG.worldW - 140, car.x));
      car.y = Math.max(140, Math.min(CFG.worldH - 480, car.y));
    }
  }
  // Pedestrians.
  for (const ped of world.peds) {
    ped.walkPhase += dt * 6;
    if (ped.flee > 0) {
      ped.flee -= dt;
      const away = Math.atan2(ped.y - player.y, ped.x - player.x);
      ped.angle = away;
      ped.x += Math.cos(away) * 110 * dt;
      ped.y += Math.sin(away) * 110 * dt;
      continue;
    }
    if (Math.random() < dt * 0.08) ped.angle += (Math.random() - 0.5) * 2.4;
    const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
    if (isOnRoad(world.city, nx, ny) || Math.random() < 0.3) { ped.x = nx; ped.y = ny; }
    else ped.angle += Math.PI / 2;
    ped.x = Math.max(30, Math.min(CFG.worldW - 30, ped.x));
    ped.y = Math.max(30, Math.min(CFG.worldH - 30, ped.y));
  }
}

export function scarePeds(world, x, y, radius) {
  for (const ped of world.peds) {
    if (Math.hypot(ped.x - x, ped.y - y) < radius) ped.flee = 2.5;
  }
}

export function drawCar(ctx, car, cam) {
  const x = car.x - cam.x; const y = car.y - cam.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-20, -10, 42, 24);
  ctx.fillStyle = car.police ? PAL.policeCar : car.color;
  roundRect(ctx, -21, -12, 42, 24, 6);
  ctx.fill();
  // Roof + windshield.
  ctx.fillStyle = 'rgba(20,30,50,0.85)';
  ctx.fillRect(-6, -10, 14, 20);
  ctx.fillStyle = car.police ? '#ffffff' : 'rgba(255,255,255,0.75)';
  ctx.fillRect(-16, -9, 5, 18);
  if (car.police) {
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(-2, -12, 6, 5);
    ctx.fillStyle = '#2266ff';
    ctx.fillRect(-2, 7, 6, 5);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px system-ui';
    ctx.fillText('SBPD', -12, 3);
  }
  if (car.taxi) {
    ctx.fillStyle = '#111';
    ctx.font = 'bold 7px system-ui';
    ctx.fillText('TAXI', -11, 3);
  }
  // Damage smoke.
  if (car.health < 45) {
    ctx.fillStyle = 'rgba(120,120,120,0.6)';
    ctx.beginPath(); ctx.arc(-18, 0, 6 + Math.random() * 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // Health bar for damaged cars.
  if (car.health < 100) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 18, y - 26, 36, 5);
    ctx.fillStyle = car.health > 40 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(x - 18, y - 26, 36 * Math.max(0, car.health) / 100, 5);
  }
}

export function drawPed(ctx, ped, cam) {
  const x = ped.x - cam.x; const y = ped.y - cam.y;
  const bob = Math.sin(ped.walkPhase) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 5, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ped.shirt;
  ctx.beginPath(); ctx.arc(x, y + bob * 0.3, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath(); ctx.arc(x, y - 2, 5, 0, Math.PI * 2); ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
