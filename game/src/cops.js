// The heat: wanted stars and the SBPD answer. Offences raise the
// stars; quiet time lowers them. Cruisers spawn at the map edge,
// chase and ram the hero (or their ride); officers on foot chase and
// swing. Getting busted (health gone) costs cash and clears the heat.
import { TUNE, INK } from './tune.js';
import { newRide, rollRide, turnToward, gap } from './state.js';
import { harmHero } from './hero.js';
import { heatBlare } from './sound.js';

export function newHeat() {
  return { stars: 0, quietFor: 0, spawnIn: 0, bustedIn: 0 };
}

export function raiseHeat(heat, stars) {
  const before = heat.stars;
  heat.stars = Math.min(TUNE.heatMax, heat.stars + stars);
  heat.quietFor = 0;
  if (heat.stars > before) heatBlare();
}

export function chaseHeat(session, hero, heat, dt, onBusted) {
  if (heat.stars <= 0) {
    // No heat: clear any leftover units.
    session.cruisers.length = 0;
    session.officers.length = 0;
    return;
  }
  // Quiet decay: a calm stretch drops a star.
  heat.quietFor += dt;
  if (heat.quietFor > TUNE.calmDrop) {
    heat.stars -= 1;
    heat.quietFor = 0;
  }
  // Pressure scales with the stars.
  const wantCruisers = Math.min(4, heat.stars);
  const wantOfficers = Math.min(6, heat.stars * 2);
  heat.spawnIn -= dt;
  if (heat.spawnIn <= 0) {
    heat.spawnIn = 1.6;
    if (session.cruisers.length < wantCruisers) launchCruiser(session, hero);
    if (session.officers.length < wantOfficers) launchOfficer(session, hero);
  }
  // Cruisers: chase and ram.
  for (const pc of session.cruisers) {
    const want = Math.atan2(hero.y - pc.y, hero.x - pc.x);
    pc.angle += turnToward(pc.angle, want) * Math.min(1, dt * 2.4);
    const d = gap(pc, hero);
    const wantSpeed = d > 260 ? 380 : d > 90 ? 330 : 180;
    pc.speed += (wantSpeed - pc.speed) * Math.min(1, dt * 1.8);
    rollRide(session, pc, dt);
    if (d < 46) {
      // Ram!
      if (hero.ride) {
        hero.ride.health -= 26 * dt * 4;
        session.jolt = Math.min(1, session.jolt + 0.5);
        pc.speed *= 0.4;
      } else {
        harmHero(hero, 22 * dt * 2);
      }
      heat.quietFor = 0;
    }
  }
  // Officers on foot: run the hero down and swing.
  for (const cop of session.officers) {
    const d = gap(cop, hero);
    const want = Math.atan2(hero.y - cop.y, hero.x - cop.x);
    cop.angle = want;
    if (d > 26) {
      cop.x += Math.cos(want) * 185 * dt;
      cop.y += Math.sin(want) * 185 * dt;
    } else if (hero.ride) {
      // Tugging at the door: wear the ride down.
      hero.ride.health -= 8 * dt;
    } else {
      harmHero(hero, 14 * dt);
    }
  }
  // Busted: health gone.
  if (hero.health <= 0 && heat.bustedIn <= 0) {
    heat.bustedIn = 2.5;
    onBusted();
  }
  if (heat.bustedIn > 0) heat.bustedIn -= dt;
}

function launchCruiser(session, hero) {
  const edge = Math.floor(Math.random() * 4);
  let x; let y;
  if (edge === 0) { x = hero.x - 700; y = hero.y; }
  else if (edge === 1) { x = hero.x + 700; y = hero.y; }
  else if (edge === 2) { x = hero.x; y = hero.y - 500; }
  else { x = hero.x; y = hero.y + 500; }
  x = Math.max(60, Math.min(TUNE.mapW - 60, x));
  y = Math.max(60, Math.min(TUNE.mapH - 60, y));
  const car = newRide(x, y, Math.atan2(hero.y - y, hero.x - x), INK.cruiser, session.dice, { cruiser: true, driver: 'cops' });
  session.cruisers.push(car);
  session.rides.push(car);
}

function launchOfficer(session, hero) {
  const a = Math.random() * Math.PI * 2;
  session.officers.push({
    x: hero.x + Math.cos(a) * 420,
    y: hero.y + Math.sin(a) * 420,
    angle: a, top: INK.copBlue,
  });
}

export function paintOfficer(ctx, cop, cam) {
  const x = cop.x - cam.x; const y = cop.y - cam.y;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 5, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK.copBlue;
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK.skin;
  ctx.beginPath(); ctx.arc(x, y - 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK.copHat;
  ctx.fillRect(x - 5, y - 8, 10, 4);
}
