// Staged scenes for screenshots: ?shot=start|drive|chase|mission
// (with &seed=) poses one fixed scene on a fixed seed so every
// screenshot is reproducible. Plain play (no ?shot=) is untouched —
// posing only pre-stages the session, never changes the rules.
import { TUNE, INK } from './tune.js';
import { newRide } from './state.js';

export function poseScene(game, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  const { session, hero, heat, book } = game;
  if (shot === 'start') {
    game.screen = 'title';
    return true;
  }
  game.screen = 'play';
  book.bannerFor = 0; // staged shots skip the boot banner
  const cross = (c, r) => ({
    x: session.bay.vStreets[Math.min(c, session.bay.vStreets.length - 1)],
    y: session.bay.hStreets[Math.min(r, session.bay.hStreets.length - 1)],
  });
  if (shot === 'drive') {
    const at = cross(3, 3);
    const ride = session.rides.find((c) => !c.cruiser && !c.cab) || session.rides[0];
    ride.x = at.x; ride.y = at.y + 24; ride.angle = 0; ride.speed = 210; ride.driver = 'hero';
    hero.ride = ride;
    hero.x = ride.x; hero.y = ride.y; hero.angle = 0;
    hero.cash = 1250;
    session.cam.x = ride.x - TUNE.viewW / 2;
    session.cam.y = ride.y - TUNE.viewH / 2;
    book.line = 'Rico: "Nice wheels. Now get to the hotel — and don\u2019t scratch the paint."';
    book.lineFor = 99;
  } else if (shot === 'chase') {
    const at = cross(4, 3);
    const ride = session.rides.find((c) => !c.cruiser && !c.cab) || session.rides[0];
    ride.x = at.x; ride.y = at.y + 24; ride.angle = 0; ride.speed = 300; ride.driver = 'hero';
    hero.ride = ride;
    hero.x = ride.x; hero.y = ride.y; hero.angle = 0;
    hero.cash = 2400;
    heat.stars = 3;
    heat.quietFor = 0;
    // Two cruisers in pursuit, right behind.
    for (let i = 0; i < 2; i += 1) {
      const pc = newRide(at.x - 180 - i * 120, at.y + 24 + (i ? -30 : 30), 0, INK.cruiser, session.dice, { cruiser: true, driver: 'cops' });
      pc.speed = 320;
      session.cruisers.push(pc);
      session.rides.push(pc);
    }
    session.officers.push({ x: at.x + 260, y: at.y - 60, angle: Math.PI, top: INK.copBlue });
    book.line = 'Rico: "Three stars! Lose them — cut through the park!"';
    book.lineFor = 99;
    session.cam.x = ride.x - TUNE.viewW / 2;
    session.cam.y = ride.y - TUNE.viewH / 2;
  } else if (shot === 'mission') {
    const at = cross(5, 6);
    hero.x = at.x; hero.y = at.y; hero.angle = -Math.PI / 2;
    hero.cash = 3400;
    hero.health = 92;
    // Job 4 in progress: a cash bag waiting at the pin.
    book.index = 3;
    book.leg = 1;
    book.line = 'Rico: "Bag two is at the north corner. Grab it and go — the SBPD is circling."';
    book.lineFor = 99;
    const leg = book.jobs[3].legs[1];
    session.pickups.push({ x: leg.at.x, y: leg.at.y, kind: 'cash', taken: false });
    heat.stars = 2;
    session.cam.x = hero.x - TUNE.viewW / 2;
    session.cam.y = hero.y - TUNE.viewH / 2;
  } else {
    return false;
  }
  // Keep the camera clamped inside the map.
  session.cam.x = Math.max(0, Math.min(TUNE.mapW - TUNE.viewW, session.cam.x));
  session.cam.y = Math.max(0, Math.min(TUNE.mapH - TUNE.viewH, session.cam.y));
  return true;
}
