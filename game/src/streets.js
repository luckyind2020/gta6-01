// Street life: traffic rides and pedestrians. Traffic rides follow
// a street lane, turn at junctions and ease off behind the ride in
// front. Walkers stroll the pavements and run when a punch lands
// nearby.
import { TUNE, INK } from './tune.js';
import { oneOf, span } from './dice.js';
import { closestStreet, onStreet } from './bay.js';
import { rollRide, turnToward, gap, headTo } from './state.js';

export function fillStreets(session) {
  const dice = session.dice;
  session.walkers = [];
  for (let i = 0; i < TUNE.walkers; i += 1) {
    const sx = oneOf(dice, session.bay.vStreets);
    const sy = oneOf(dice, session.bay.hStreets);
    session.walkers.push({
      x: sx + span(dice, -70, 70), y: sy + span(dice, -70, 70),
      angle: span(dice, 0, Math.PI * 2),
      speed: span(dice, 28, 55),
      top: oneOf(dice, INK.walkerTops),
      flee: 0, stepPhase: span(dice, 0, 6),
    });
  }
  // Put drivers in a few parked rides so the streets feel alive.
  let placed = 0;
  for (const ride of session.rides) {
    if (placed >= TUNE.carsMoving || ride.cab) continue;
    if (ride.driver) continue;
    ride.driver = 'traffic';
    ride.speed = span(dice, 90, 150);
    const sp = closestStreet(session.bay, ride.x, ride.y);
    ride.angle = sp.along ? (dice() < 0.5 ? 0 : Math.PI) : (dice() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    ride.brain = { lane: sp.along ? 'h' : 'v', offset: dice() < 0.5 ? -24 : 24 };
    placed += 1;
  }
}

export function moveStreets(session, hero, dt) {
  // Traffic rides.
  for (const ride of session.rides) {
    if (ride.driver !== 'traffic') continue;
    const brain = ride.brain || { lane: 'h', offset: 24 };
    // Steer back toward the lane line.
    const sp = closestStreet(session.bay, ride.x, ride.y);
    const target = brain.lane === 'h'
      ? { x: ride.x + Math.cos(ride.angle) * 60, y: sp.y + brain.offset }
      : { x: sp.x + brain.offset, y: ride.y + Math.sin(ride.angle) * 60 };
    const want = Math.atan2(target.y - ride.y, target.x - ride.x);
    ride.angle += turnToward(ride.angle, want) * Math.min(1, dt * 2.2);
    // Ease off behind the ride ahead.
    let blocked = false;
    for (const other of session.rides) {
      if (other === ride) continue;
      const d = gap(ride, other);
      if (d < 70 && Math.abs(turnToward(ride.angle, Math.atan2(other.y - ride.y, other.x - ride.x))) < 0.5) { blocked = true; break; }
    }
    if (hero.ride === ride) blocked = false;
    const wantSpeed = blocked ? 0 : 120;
    ride.speed += (wantSpeed - ride.speed) * Math.min(1, dt * 1.5);
    rollRide(session, ride, dt);
    // Ran off the end of a street: swing around at the map edge.
    if (ride.x < 120 || ride.x > TUNE.mapW - 120 || ride.y < 120 || ride.y > TUNE.mapH - 460) {
      ride.angle += Math.PI;
      ride.x = Math.max(140, Math.min(TUNE.mapW - 140, ride.x));
      ride.y = Math.max(140, Math.min(TUNE.mapH - 480, ride.y));
    }
  }
  // Walkers.
  for (const w of session.walkers) {
    w.stepPhase += dt * 6;
    if (w.flee > 0) {
      w.flee -= dt;
      const away = Math.atan2(w.y - hero.y, w.x - hero.x);
      w.angle = away;
      w.x += Math.cos(away) * 110 * dt;
      w.y += Math.sin(away) * 110 * dt;
      continue;
    }
    if (Math.random() < dt * 0.08) w.angle += (Math.random() - 0.5) * 2.4;
    const nx = w.x + Math.cos(w.angle) * w.speed * dt;
    const ny = w.y + Math.sin(w.angle) * w.speed * dt;
    if (onStreet(session.bay, nx, ny) || Math.random() < 0.3) { w.x = nx; w.y = ny; }
    else w.angle += Math.PI / 2;
    w.x = Math.max(30, Math.min(TUNE.mapW - 30, w.x));
    w.y = Math.max(30, Math.min(TUNE.mapH - 30, w.y));
  }
}

export function frightenWalkers(session, x, y, radius) {
  for (const w of session.walkers) {
    if (Math.hypot(w.x - x, w.y - y) < radius) w.flee = 2.5;
  }
}

export function paintRide(ctx, ride, cam) {
  const x = ride.x - cam.x; const y = ride.y - cam.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ride.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-20, -10, 42, 24);
  ctx.fillStyle = ride.cruiser ? INK.cruiser : ride.paint;
  rounded(ctx, -21, -12, 42, 24, 6);
  ctx.fill();
  // Roof and windscreen.
  ctx.fillStyle = 'rgba(20,30,50,0.85)';
  ctx.fillRect(-6, -10, 14, 20);
  ctx.fillStyle = ride.cruiser ? '#ffffff' : 'rgba(255,255,255,0.75)';
  ctx.fillRect(-16, -9, 5, 18);
  if (ride.cruiser) {
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(-2, -12, 6, 5);
    ctx.fillStyle = '#2266ff';
    ctx.fillRect(-2, 7, 6, 5);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px system-ui';
    ctx.fillText('SBPD', -12, 3);
  }
  if (ride.cab) {
    ctx.fillStyle = '#111';
    ctx.font = 'bold 7px system-ui';
    ctx.fillText('TAXI', -11, 3);
  }
  // Smoke from a battered ride.
  if (ride.health < 45) {
    ctx.fillStyle = 'rgba(120,120,120,0.6)';
    ctx.beginPath(); ctx.arc(-18, 0, 6 + Math.random() * 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // Health bar over a damaged ride.
  if (ride.health < 100) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 18, y - 26, 36, 5);
    ctx.fillStyle = ride.health > 40 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(x - 18, y - 26, 36 * Math.max(0, ride.health) / 100, 5);
  }
}

export function paintWalker(ctx, w, cam) {
  const x = w.x - cam.x; const y = w.y - cam.y;
  const bob = Math.sin(w.stepPhase) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 5, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = w.top;
  ctx.beginPath(); ctx.arc(x, y + bob * 0.3, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK.skinDark;
  ctx.beginPath(); ctx.arc(x, y - 2, 5, 0, Math.PI * 2); ctx.fill();
}

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
