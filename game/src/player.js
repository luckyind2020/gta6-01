// The player: on foot (walk/run, punch) or in a car (drive, brake,
// handbrake turn). Stealing a car is E near a parked car; leaving it
// is E again. The player object is the single source of truth for
// health, cash and position.
import { CFG, PAL } from './config.js';
import { collidesBuilding } from './city.js';
import { moveCar, angleDiff } from './world.js';
import { isHeld, wasPressed } from './input.js';
import { thudPunch, blipHorn, crashSound, startEngine, setEngineSpeed, stopEngine } from './audio.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    health: 100, cash: 150,
    inCar: null,           // car object or null
    punchTimer: 0, punchCooldown: 0,
    hurtFlash: 0, invuln: 0,
    walkAnim: 0,
  };
}

export function nearestCar(world, x, y, maxDist) {
  let best = null; let bd = maxDist;
  for (const car of world.cars) {
    if (car.driver === 'player') continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

export function updatePlayer(world, player, dt, onCrime) {
  player.punchCooldown = Math.max(0, player.punchCooldown - dt);
  player.punchTimer = Math.max(0, player.punchTimer - dt);
  player.hurtFlash = Math.max(0, player.hurtFlash - dt);
  player.invuln = Math.max(0, player.invuln - dt);

  if (player.inCar) {
    updateDriving(world, player, dt, onCrime);
    return;
  }
  stopEngineIfIdle();
  // On foot.
  let mx = 0; let my = 0;
  if (isHeld('up')) my -= 1;
  if (isHeld('down')) my += 1;
  if (isHeld('left')) mx -= 1;
  if (isHeld('right')) mx += 1;
  const moving = mx !== 0 || my !== 0;
  const speed = isHeld('boost') ? CFG.playerRun : CFG.playerWalk;
  if (moving) {
    const len = Math.hypot(mx, my);
    const nx = player.x + (mx / len) * speed * dt;
    const ny = player.y + (my / len) * speed * dt;
    player.angle = Math.atan2(my, mx);
    player.walkAnim += dt * 10;
    if (!collidesBuilding(world.city, nx, player.y, CFG.playerRadius)) player.x = nx;
    if (!collidesBuilding(world.city, player.x, ny, CFG.playerRadius)) player.y = ny;
    player.x = Math.max(20, Math.min(CFG.worldW - 20, player.x));
    player.y = Math.max(20, Math.min(CFG.worldH - 20, player.y));
  }
  // Punch.
  if (wasPressed('punch') && player.punchCooldown <= 0) {
    player.punchTimer = 0.22;
    player.punchCooldown = 0.38;
    thudPunch();
  }
  // Enter a car.
  if (wasPressed('enter')) {
    const car = nearestCar(world, player.x, player.y, 56);
    if (car) {
      player.inCar = car;
      car.driver = 'player';
      car.speed = 0;
      if (car.ai) car.ai = null;
      startEngine();
      blipHorn();
      if (onCrime) onCrime(1, 'car stolen');
    }
  }
}

let engineWasOn = false;
function stopEngineIfIdle() {
  if (engineWasOn) { stopEngine(); engineWasOn = false; }
}

function updateDriving(world, player, dt, onCrime) {
  const car = player.inCar;
  engineWasOn = true;
  const forward = isHeld('up');
  const back = isHeld('down');
  const steer = (isHeld('left') ? -1 : 0) + (isHeld('right') ? 1 : 0);
  if (forward) car.speed += CFG.carAccel * dt;
  else if (back) car.speed -= (car.speed > 0 ? CFG.carBrake : CFG.carAccel * 0.5) * dt;
  else car.speed *= Math.pow(0.4, dt); // rolling drag
  if (isHeld('boost')) car.speed += CFG.carAccel * 0.5 * dt; // nitro
  car.speed = Math.max(-CFG.carReverse, Math.min(CFG.carMaxSpeed, car.speed));
  if (Math.abs(car.speed) > 8) {
    car.angle += steer * CFG.carTurn * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 120);
  }
  const before = car.health;
  if (moveCar(world, car, dt)) {
    if (before - car.health > 4) crashSound();
  }
  setEngineSpeed(Math.abs(car.speed) / CFG.carMaxSpeed);
  player.x = car.x; player.y = car.y; player.angle = car.angle;
  // Exit the car.
  if (wasPressed('enter')) {
    const ox = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    const oy = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    player.inCar = null;
    car.driver = null;
    car.speed = 0;
    player.x = ox; player.y = oy;
    stopEngine(); engineWasOn = false;
  }
  // Car wrecked while driving: bail out, take damage.
  if (car.health <= 0) {
    player.inCar = null;
    car.driver = null;
    player.health -= 15;
    player.hurtFlash = 0.6;
    world.shake = 1;
    crashSound();
    stopEngine(); engineWasOn = false;
  }
}

export function damagePlayer(player, amount) {
  if (player.invuln > 0) return;
  player.health -= amount;
  player.hurtFlash = 0.4;
  player.invuln = 0.5;
}

export function drawPlayer(ctx, player, cam) {
  const x = player.x - cam.x; const y = player.y - cam.y;
  if (player.inCar) return; // car drawing covers the driver
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 4, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
  // Body: shirt, head, cap.
  const bob = Math.sin(player.walkAnim) * 2;
  ctx.fillStyle = PAL.playerShirt;
  ctx.fillRect(-9, -8 + bob * 0.3, 18, 16);
  ctx.fillStyle = '#f5c99b';
  ctx.beginPath(); ctx.arc(8, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PAL.player;
  ctx.beginPath(); ctx.arc(8, -2, 8, Math.PI, Math.PI * 2); ctx.fill();
  // Punch arm.
  if (player.punchTimer > 0) {
    ctx.fillStyle = '#f5c99b';
    ctx.fillRect(10, -4, 16, 7);
  }
  ctx.restore();
  if (player.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255,40,40,${player.hurtFlash * 0.35})`;
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
  }
}
