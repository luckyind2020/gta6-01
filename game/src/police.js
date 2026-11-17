// Wanted level and police response. Crimes raise stars; calm time
// lowers them. Police cars spawn at the map edge, chase and ram the
// player (or their car); foot cops chase on foot and punch. Busted
// (health 0 or pinned by cops) costs cash and drops the wanted level.
import { CFG, PAL } from './config.js';
import { makeCar, moveCar, angleDiff, dist } from './world.js';
import { damagePlayer } from './player.js';
import { wantedSound } from './audio.js';

export function createPolice() {
  return { wanted: 0, calmTimer: 0, spawnTimer: 0, bustedTimer: 0 };
}

export function addWanted(police, stars, reason) {
  const before = police.wanted;
  police.wanted = Math.min(CFG.maxWanted, police.wanted + stars);
  police.calmTimer = 0;
  if (police.wanted > before) wantedSound();
  return reason;
}

export function updatePolice(world, player, police, dt, onBusted) {
  if (police.wanted <= 0) {
    // Clear out leftover units.
    world.policeCars.length = 0;
    world.footCops.length = 0;
    return;
  }
  // Calm decay: no crime for a while drops a star.
  police.calmTimer += dt;
  if (police.calmTimer > CFG.wantedDecay) {
    police.wanted -= 1;
    police.calmTimer = 0;
  }
  // Spawn pressure scales with stars.
  const wantCars = Math.min(4, police.wanted);
  const wantCops = Math.min(6, police.wanted * 2);
  police.spawnTimer -= dt;
  if (police.spawnTimer <= 0) {
    police.spawnTimer = 1.6;
    if (world.policeCars.length < wantCars) spawnPoliceCar(world, player);
    if (world.footCops.length < wantCops) spawnFootCop(world, player);
  }
  // Police cars: chase and ram.
  for (const pc of world.policeCars) {
    const want = Math.atan2(player.y - pc.y, player.x - pc.x);
    pc.angle += angleDiff(pc.angle, want) * Math.min(1, dt * 2.4);
    const d = dist(pc, player);
    const targetSpeed = d > 260 ? 380 : d > 90 ? 330 : 180;
    pc.speed += (targetSpeed - pc.speed) * Math.min(1, dt * 1.8);
    moveCar(world, pc, dt);
    if (d < 46) {
      // Ram!
      if (player.inCar) {
        player.inCar.health -= 26 * dt * 4;
        world.shake = Math.min(1, world.shake + 0.5);
        pc.speed *= 0.4;
      } else {
        damagePlayer(player, 22 * dt * 2);
      }
      police.calmTimer = 0;
    }
  }
  // Foot cops: run at the player and punch.
  for (const cop of world.footCops) {
    const d = dist(cop, player);
    const want = Math.atan2(player.y - cop.y, player.x - cop.x);
    cop.angle = want;
    if (d > 26) {
      cop.x += Math.cos(want) * 185 * dt;
      cop.y += Math.sin(want) * 185 * dt;
    } else if (player.inCar) {
      // Yank at the door: damage the car.
      player.inCar.health -= 8 * dt;
    } else {
      damagePlayer(player, 14 * dt);
    }
  }
  // Busted: health gone.
  if (player.health <= 0 && police.bustedTimer <= 0) {
    police.bustedTimer = 2.5;
    onBusted();
  }
  if (police.bustedTimer > 0) police.bustedTimer -= dt;
}

function spawnPoliceCar(world, player) {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = player.x - 700; y = player.y; }
  else if (edge === 1) { x = player.x + 700; y = player.y; }
  else if (edge === 2) { x = player.x; y = player.y - 500; }
  else { x = player.x; y = player.y + 500; }
  x = Math.max(60, Math.min(CFG.worldW - 60, x));
  y = Math.max(60, Math.min(CFG.worldH - 60, y));
  const car = makeCar(x, y, Math.atan2(player.y - y, player.x - x), PAL.policeCar, world.rng, { police: true, driver: 'police' });
  world.policeCars.push(car);
  world.cars.push(car);
}

function spawnFootCop(world, player) {
  const a = Math.random() * Math.PI * 2;
  world.footCops.push({
    x: player.x + Math.cos(a) * 420,
    y: player.y + Math.sin(a) * 420,
    angle: a, shirt: PAL.cop,
  });
}

export function drawFootCop(ctx, cop, cam) {
  const x = cop.x - cam.x; const y = cop.y - cam.y;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 5, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PAL.cop;
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f5c99b';
  ctx.beginPath(); ctx.arc(x, y - 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0b2a5e';
  ctx.fillRect(x - 5, y - 8, 10, 4);
}
