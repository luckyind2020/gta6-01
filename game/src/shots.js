// Deterministic staged scenes for screenshots: ?shot=start|drive|
// chase|mission (with &seed=) sets up a fixed scene on a fixed seed
// so every screenshot is reproducible. Plain play (no ?shot=) is
// untouched — shots only pre-stage the world, never change rules.
import { CFG } from './config.js';
import { makeCar } from './world.js';
import { PAL } from './config.js';

export function applyShot(game, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = Number(params.get('seed') || 1);
  const { world, player, police, missions } = game;
  if (shot === 'start') {
    game.state = 'start';
    return true;
  }
  game.state = 'playing';
  missions.bannerTimer = 0; // staged shots skip the boot banner
  const street = (c, r) => ({
    x: world.city.streetXs[Math.min(c, world.city.streetXs.length - 1)],
    y: world.city.streetYs[Math.min(r, world.city.streetYs.length - 1)],
  });
  if (shot === 'drive') {
    const at = street(3, 3);
    const car = world.cars.find((c) => !c.police && !c.taxi) || world.cars[0];
    car.x = at.x; car.y = at.y + 24; car.angle = 0; car.speed = 210; car.driver = 'player';
    player.inCar = car;
    player.x = car.x; player.y = car.y; player.angle = 0;
    player.cash = 1250;
    world.camera.x = car.x - CFG.canvasW / 2;
    world.camera.y = car.y - CFG.canvasH / 2;
    missions.dialogue = 'Rico: "Nice wheels. Now get to the hotel — and don\u2019t scratch the paint."';
    missions.dialogueTimer = 99;
  } else if (shot === 'chase') {
    const at = street(4, 3);
    const car = world.cars.find((c) => !c.police && !c.taxi) || world.cars[0];
    car.x = at.x; car.y = at.y + 24; car.angle = 0; car.speed = 300; car.driver = 'player';
    player.inCar = car;
    player.x = car.x; player.y = car.y; player.angle = 0;
    player.cash = 2400;
    police.wanted = 3;
    police.calmTimer = 0;
    // Two police cars in pursuit, right behind.
    for (let i = 0; i < 2; i++) {
      const pc = makeCar(at.x - 180 - i * 120, at.y + 24 + (i ? -30 : 30), 0, PAL.policeCar, world.rng, { police: true, driver: 'police' });
      pc.speed = 320;
      world.policeCars.push(pc);
      world.cars.push(pc);
    }
    world.footCops.push({ x: at.x + 260, y: at.y - 60, angle: Math.PI, shirt: PAL.cop });
    missions.dialogue = 'Rico: "Three stars! Lose them — cut through the park!"';
    missions.dialogueTimer = 99;
    world.camera.x = car.x - CFG.canvasW / 2;
    world.camera.y = car.y - CFG.canvasH / 2;
  } else if (shot === 'mission') {
    const at = street(5, 6);
    player.x = at.x; player.y = at.y; player.angle = -Math.PI / 2;
    player.cash = 3400;
    player.health = 92;
    // Mission 4 in progress: cash bag visible at the marker.
    missions.index = 3;
    missions.step = 1;
    missions.dialogue = 'Rico: "Bag two is at the north corner. Grab it and go — the SBPD is circling."';
    missions.dialogueTimer = 99;
    const step = missions.missions[3].steps[1];
    world.pickups.push({ x: step.at.x, y: step.at.y, kind: 'cash', taken: false });
    police.wanted = 2;
    world.camera.x = player.x - CFG.canvasW / 2;
    world.camera.y = player.y - CFG.canvasH / 2;
  } else {
    return false;
  }
  // Keep the camera clamped inside the world.
  world.camera.x = Math.max(0, Math.min(CFG.worldW - CFG.canvasW, world.camera.x));
  world.camera.y = Math.max(0, Math.min(CFG.worldH - CFG.canvasH, world.camera.y));
  return true;
}
