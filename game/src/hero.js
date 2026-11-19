// The hero: on foot (walk, sprint, punch) or behind the wheel
// (drive, brake, nitro). E near a parked ride steals it; E again
// steps back out. This object is the single source of truth for the
// hero's health, cash and position.
import { TUNE, INK, POCKET_START, HEALTH_START } from './tune.js';
import { hitsBlock } from './bay.js';
import { rollRide, turnToward } from './state.js';
import { held, tapped } from './keys.js';
import { punchThud, hornBlip, crashBang, engineOn, enginePitch, engineOff } from './sound.js';

export function newHero(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    health: HEALTH_START, cash: POCKET_START,
    ride: null, // ride object or null
    swingTimer: 0, swingWait: 0,
    painFlash: 0, safeFor: 0,
    stride: 0,
  };
}

export function closestRide(session, x, y, maxD) {
  let best = null; let bd = maxD;
  for (const ride of session.rides) {
    if (ride.driver === 'hero') continue;
    const d = Math.hypot(ride.x - x, ride.y - y);
    if (d < bd) { bd = d; best = ride; }
  }
  return best;
}

let motorRunning = false;

export function steerHero(session, hero, dt, onOffence) {
  hero.swingWait = Math.max(0, hero.swingWait - dt);
  hero.swingTimer = Math.max(0, hero.swingTimer - dt);
  hero.painFlash = Math.max(0, hero.painFlash - dt);
  hero.safeFor = Math.max(0, hero.safeFor - dt);

  if (hero.ride) {
    driveRide(session, hero, dt, onOffence);
    return;
  }
  if (motorRunning) { engineOff(); motorRunning = false; }
  // On foot.
  let mx = 0; let my = 0;
  if (held('north')) my -= 1;
  if (held('south')) my += 1;
  if (held('west')) mx -= 1;
  if (held('east')) mx += 1;
  const moving = mx !== 0 || my !== 0;
  const pace = held('dash') ? TUNE.footSprint : TUNE.footWalk;
  if (moving) {
    const len = Math.hypot(mx, my);
    const nx = hero.x + (mx / len) * pace * dt;
    const ny = hero.y + (my / len) * pace * dt;
    hero.angle = Math.atan2(my, mx);
    hero.stride += dt * 10;
    if (!hitsBlock(session.bay, nx, hero.y, TUNE.heroR)) hero.x = nx;
    if (!hitsBlock(session.bay, hero.x, ny, TUNE.heroR)) hero.y = ny;
    hero.x = Math.max(20, Math.min(TUNE.mapW - 20, hero.x));
    hero.y = Math.max(20, Math.min(TUNE.mapH - 20, hero.y));
  }
  // Swing a fist.
  if (tapped('hit') && hero.swingWait <= 0) {
    hero.swingTimer = 0.22;
    hero.swingWait = 0.38;
    punchThud();
  }
  // Climb into a ride.
  if (tapped('act')) {
    const ride = closestRide(session, hero.x, hero.y, 56);
    if (ride) {
      hero.ride = ride;
      ride.driver = 'hero';
      ride.speed = 0;
      if (ride.brain) ride.brain = null;
      engineOn();
      hornBlip();
      if (onOffence) onOffence(1, 'ride stolen');
    }
  }
}

function driveRide(session, hero, dt, onOffence) {
  const ride = hero.ride;
  motorRunning = true;
  const gas = held('north');
  const brake = held('south');
  const wheel = (held('west') ? -1 : 0) + (held('east') ? 1 : 0);
  if (gas) ride.speed += TUNE.carPush * dt;
  else if (brake) ride.speed -= (ride.speed > 0 ? TUNE.carStop : TUNE.carPush * 0.5) * dt;
  else ride.speed *= Math.pow(0.4, dt); // rolling drag
  if (held('dash')) ride.speed += TUNE.carPush * 0.5 * dt; // nitro
  ride.speed = Math.max(-TUNE.carBack, Math.min(TUNE.carTop, ride.speed));
  if (Math.abs(ride.speed) > 8) {
    ride.angle += wheel * TUNE.carSteer * dt * Math.sign(ride.speed) * Math.min(1, Math.abs(ride.speed) / 120);
  }
  const was = ride.health;
  if (rollRide(session, ride, dt)) {
    if (was - ride.health > 4) crashBang();
  }
  enginePitch(Math.abs(ride.speed) / TUNE.carTop);
  hero.x = ride.x; hero.y = ride.y; hero.angle = ride.angle;
  // Step out.
  if (tapped('act')) {
    const ox = ride.x + Math.cos(ride.angle + Math.PI / 2) * 34;
    const oy = ride.y + Math.sin(ride.angle + Math.PI / 2) * 34;
    hero.ride = null;
    ride.driver = null;
    ride.speed = 0;
    hero.x = ox; hero.y = oy;
    engineOff(); motorRunning = false;
  }
  // Ride written off while driving: bail out hurt.
  if (ride.health <= 0) {
    hero.ride = null;
    ride.driver = null;
    hero.health -= 15;
    hero.painFlash = 0.6;
    session.jolt = 1;
    crashBang();
    engineOff(); motorRunning = false;
  }
}

export function harmHero(hero, amount) {
  if (hero.safeFor > 0) return;
  hero.health -= amount;
  hero.painFlash = 0.4;
  hero.safeFor = 0.5;
}

export function paintHero(ctx, hero, cam) {
  const x = hero.x - cam.x; const y = hero.y - cam.y;
  if (hero.ride) return; // the ride drawing covers the driver
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(hero.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 4, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
  // Body: top, head, cap.
  const bob = Math.sin(hero.stride) * 2;
  ctx.fillStyle = INK.heroTop;
  ctx.fillRect(-9, -8 + bob * 0.3, 18, 16);
  ctx.fillStyle = INK.skin;
  ctx.beginPath(); ctx.arc(8, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK.hero;
  ctx.beginPath(); ctx.arc(8, -2, 8, Math.PI, Math.PI * 2); ctx.fill();
  // Punching fist.
  if (hero.swingTimer > 0) {
    ctx.fillStyle = INK.skin;
    ctx.fillRect(10, -4, 16, 7);
  }
  ctx.restore();
  if (hero.painFlash > 0) {
    ctx.fillStyle = `rgba(255,40,40,${hero.painFlash * 0.35})`;
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
  }
}
