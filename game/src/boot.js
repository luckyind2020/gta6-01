// Sunset Bay boot: input, the frame loop, screens, crime and wanted flow,
// missions, getting busted, saving. This is the only module that touches
// the DOM; everything it calls is pure and Node-testable.

import { clamp, dist, mulberry, pickInt } from './util.js';
import { buildCity, randomRoadPoint, randomSidewalkPoint, WORLD_W, WORLD_H } from './city.js';
import { makePlayer, makePed, makeThug, makeOfficer, stepPlayerOnFoot, stepPed, stepThug, stepOfficer, punchHits } from './actors.js';
import { makeCar, makeParkedCars, makeTrafficCar, stepPlayerCar, stepTrafficCar, nearestCar, damageCar } from './vehicles.js';
import { makeWanted, commitCrime, decayWanted, cruisersWanted, officersWanted, makeCruiser, stepCruiser, copInSight } from './police.js';
import { MISSIONS, makeMissionState, currentMission, missionObjectiveText, stepMissions, completeMission, failMission, makeBags } from './missions.js';
import { makeAudio } from './audio.js';
import { saveGame, loadGame } from './store.js';
import { drawWorld, drawOverlay } from './draw.js';
import { drawHud } from './hud.js';
import { stageScene } from './staging.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

const params = new URLSearchParams(location.search);
const shotKind = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const rng = mulberry(seed * 31 + 7);
const audio = makeAudio();

let G;
if (shotKind) {
  G = stageScene(shotKind, seed);
  G.audio = audio;
} else {
  G = newRun(seed);
}

function newRun(seed) {
  const city = buildCity(seed);
  const save = loadGame();
  const start = randomSidewalkPoint(rng, city);
  const player = makePlayer(start.x, start.y);
  const g = {
    city,
    seed,
    time: 0,
    cash: 0,
    bestStars: 0,
    bailPaid: 0,
    screen: 'title',
    wanted: makeWanted(),
    missions: makeMissionState(),
    player,
    cars: [],
    cruisers: [],
    peds: [],
    thugs: [],
    officers: [],
    smoke: [],
    toast: '',
    toastT: 0,
    cam: { x: player.x, y: player.y },
    objectiveText: '',
    marker: null,
    audio,
    hurtAt: -99,
    saveAt: 0,
  };
  g.cars = makeParkedCars(rng, city, 11);
  for (let i = 0; i < 8; i++) g.cars.push(makeTrafficCar(rng, city));
  for (let i = 0; i < 26; i++) g.peds.push(makePed(rng, city));
  if (save) {
    g.cash = save.cash || 0;
    g.player.cash = g.cash;
    g.missions.done = save.missionsDone || [];
    g.missions.index = save.missionIndex || 0;
    g.bestStars = save.bestStars || 0;
    if (save.playerX) { g.player.x = save.playerX; g.player.y = save.playerY; }
  }
  beginMission(g);
  g.objectiveText = missionObjectiveText(g.missions);
  return g;
}

// Set up whatever the current mission needs (thugs, bags, marker).
function beginMission(g) {
  const m = currentMission(g.missions);
  g.thugs = [];
  if (!m) { g.marker = null; return; }
  g.marker = m.marker;
  if (m.id === 'brawl') {
    for (let i = 0; i < m.thugs; i++) {
      g.thugs.push(makeThug(rng, m.marker.x + (i - 1) * 70, m.marker.y + (i % 2) * 50 - 25));
    }
  }
  if (m.id === 'bags') {
    g.missions.bags = makeBags(rng);
  }
}

function setToast(g, text, seconds) {
  g.toast = text;
  g.toastT = seconds || 3.5;
}

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

// ---- input ----
const keys = new Set();
let enterCarQueued = false;
let punchQueued = false;

addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  audio.unlock();
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'Enter') {
    if (G.screen === 'title') { G.screen = 'play'; announce('Playing Sunset Bay'); }
    else if (G.screen === 'busted') { respawnAfterBust(G); }
    else if (G.screen === 'pause') { G.screen = 'play'; }
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (G.screen === 'play') G.screen = 'pause';
    else if (G.screen === 'pause') G.screen = 'play';
  }
  if (e.code === 'KeyM') {
    const muted = audio.toggleMute();
    setToast(G, muted ? 'Sound off' : 'Sound on', 1.5);
  }
  if (e.code === 'KeyE') enterCarQueued = true;
  if (e.code === 'Space' && !G.player.inCar) punchQueued = true;
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

function respawnAfterBust(g) {
  const p = g.player;
  p.hp = p.maxHp;
  p.x = 720;
  p.y = 610;
  p.angle = -Math.PI / 2;
  p.inCar = null;
  g.wanted = makeWanted();
  g.cruisers = [];
  g.officers = [];
  g.screen = 'play';
  setToast(g, 'Back on the streets. Rico is waiting.', 3);
  announce('Back on the streets');
}

function getBusted(g, reason) {
  const bail = Math.min(g.cash, 200 + g.wanted.stars * 100);
  g.bailPaid = bail;
  g.cash -= bail;
  g.player.cash = g.cash;
  g.screen = 'busted';
  audio.siren(false);
  audio.engine(0, false);
  saveGame(g);
  announce('Busted! Bail paid ' + bail);
}

function tryEnterExitCar(g) {
  const p = g.player;
  if (p.inCar) {
    const car = p.inCar;
    car.driver = null;
    p.inCar = null;
    // Step out to the side of the car.
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    p.angle = car.angle;
    audio.engine(0, false);
    return;
  }
  const car = nearestCar(g.cars, p.x, p.y, 78);
  if (!car) return;
  if (car.driver === 'traffic' && Math.abs(car.speed) > 60) {
    setToast(g, 'Too fast to jack!', 1.5);
    return;
  }
  if (car.driver === 'traffic') {
    // Yank the driver out: they flee on foot.
    const driver = makePed(rng, g.city);
    driver.x = car.x + 40;
    driver.y = car.y + 40;
    driver.fleeing = 2;
    g.peds.push(driver);
    commitCrime(g.wanted, 14, 'carjack');
    setToast(g, 'Carjacked a ' + car.name + '!', 2.5);
  } else {
    const seen = copInSight(g.cruisers, g.officers, p, 520);
    if (seen) {
      commitCrime(g.wanted, 12, 'theft');
      setToast(g, 'A cop saw you take that ' + car.name + '!', 2.5);
    }
  }
  car.driver = 'player';
  p.inCar = car;
  p.x = car.x;
  p.y = car.y;
}

function doPunch(g) {
  const p = g.player;
  if (p.punchCooldown > 0) return;
  p.punchCooldown = 0.45;
  p.punchArc = 0.4;
  audio.thud();
  const victims = punchHits(p, [...g.peds, ...g.thugs, ...g.officers], 52, 0.85);
  for (const v of victims) {
    if (v.kind === 'ped') {
      v.fleeing = 2.5;
      commitCrime(g.wanted, 10, 'assault');
      setToast(g, 'Hey! That was assault, pal.', 1.5);
    } else if (v.kind === 'thug') {
      v.hp -= 1;
      if (v.hp <= 0) {
        v.down = true;
        setToast(g, 'One down!', 1.5);
      }
    } else if (v.kind === 'officer') {
      v.stun = 1.4;
      commitCrime(g.wanted, 20, 'assault officer');
      setToast(g, 'You hit a cop! Run!', 2);
    }
  }
}

// ---- police upkeep ----
function upkeepPolice(g, dt) {
  const wantCruisers = cruisersWanted(g.wanted.stars);
  while (g.cruisers.length < wantCruisers) {
    // Spawn far from the player, on a road.
    let spot;
    for (let tries = 0; tries < 12; tries++) {
      spot = randomRoadPoint(rng, g.city);
      const px = g.player.inCar ? g.player.inCar.x : g.player.x;
      const py = g.player.inCar ? g.player.inCar.y : g.player.y;
      if (dist(spot.x, spot.y, px, py) > 700) break;
    }
    const c = makeCruiser(spot.x, spot.y);
    g.cruisers.push(c);
  }
  while (g.cruisers.length > wantCruisers) g.cruisers.pop();
  const wantOfficers = officersWanted(g.wanted.stars);
  while (g.officers.length < wantOfficers) {
    const p = randomSidewalkPoint(rng, g.city);
    g.officers.push(makeOfficer(p.x, p.y));
  }
  while (g.officers.length > wantOfficers) g.officers.pop();
}

// ---- one simulation step ----
function step(g, dt) {
  const p = g.player;
  g.time += dt;

  if (enterCarQueued) {
    enterCarQueued = false;
    tryEnterExitCar(g);
  }
  if (punchQueued) {
    punchQueued = false;
    if (!p.inCar) doPunch(g);
  }

  // Player movement.
  if (p.inCar) {
    stepPlayerCar(p.inCar, keys, dt, g.city);
    p.x = p.inCar.x;
    p.y = p.inCar.y;
    p.angle = p.inCar.angle;
    if (p.inCar.skid > 0 && Math.abs(p.inCar.speed) > 200 && Math.random() < 0.5) {
      g.smoke.push({ x: p.inCar.x - Math.cos(p.inCar.angle) * 20, y: p.inCar.y - Math.sin(p.inCar.angle) * 20, life: 0.55 });
    }
    if (p.inCar.wrecked) {
      p.inCar.driver = null;
      p.inCar = null;
      p.x += 40;
      setToast(g, 'Your ride is wrecked!', 2.5);
    }
  } else {
    stepPlayerOnFoot(p, keys, dt, g.city);
  }
  if (p.hp < p.maxHp && g.time - g.hurtAt > 8) {
    p.hp = Math.min(p.maxHp, p.hp + 6 * dt);
  }

  // Traffic + pedestrians.
  for (const car of g.cars) {
    if (car.driver === 'traffic') stepTrafficCar(car, dt, g.city, g.cars);
  }
  const danger = p.inCar
    ? { x: p.inCar.x, y: p.inCar.y, radius: 130 }
    : (p.punchArc > 0 ? { x: p.x, y: p.y, radius: 120 } : null);
  for (const ped of g.peds) stepPed(ped, g.city, dt, danger);

  // Thugs fight the player.
  for (const thug of g.thugs) {
    stepThug(thug, p, dt, g.city);
    if (!thug.down && thug.punchCooldown <= 0 && !p.inCar) {
      const d = dist(thug.x, thug.y, p.x, p.y);
      if (d < 34) {
        thug.punchCooldown = 0.9;
        p.hp -= 12;
        g.hurtAt = g.time;
        audio.thud();
        if (p.hp <= 0) { getBusted(g, 'beaten'); return; }
      }
    }
  }

  // Wanted decay + police.
  const hidden = !copInSight(g.cruisers, g.officers, p, 620);
  decayWanted(g.wanted, dt, hidden);
  if (g.wanted.stars > g.bestStars) g.bestStars = g.wanted.stars;
  upkeepPolice(g, dt);
  for (const cruiser of g.cruisers) {
    const target = p.inCar ? p.inCar : p;
    const rammed = stepCruiser(cruiser, target, dt, g.city);
    if (rammed) {
      if (p.inCar) {
        damageCar(p.inCar, 9);
        setToast(g, 'Ram! Your car is taking damage.', 1.5);
      } else {
        p.hp -= 10;
        g.hurtAt = g.time;
        if (p.hp <= 0) { getBusted(g, 'rammed'); return; }
      }
      audio.thud();
    }
  }
  // Foot officers chase and, on contact, start the bust clock.
  let touching = false;
  for (const off of g.officers) {
    if (off.stun > 0) { off.stun -= dt; continue; }
    stepOfficer(off, p, dt, g.city);
    const d = dist(off.x, off.y, p.x, p.y);
    if (d < 30 && !p.inCar) {
      touching = true;
      if (off.punchCooldown <= 0) {
        off.punchCooldown = 1.0;
        p.hp -= 8;
        g.hurtAt = g.time;
        if (p.hp <= 0) { getBusted(g, 'beaten'); return; }
      }
    }
  }
  if (touching) {
    g.wanted.bustTimer += dt;
    if (g.wanted.bustTimer > 1.2) { getBusted(g, 'caught'); return; }
  } else {
    g.wanted.bustTimer = 0;
  }

  // Missions.
  const ev = stepMissions(g.missions, { player: p, thugs: g.thugs }, dt);
  if (ev === 'complete') {
    const pay = completeMission(g.missions);
    g.cash += pay;
    p.cash = g.cash;
    audio.jingle();
    const m = MISSIONS[g.missions.index - 1];
    setToast(g, 'Job done: ' + m.name + ' — paid ' + pay + '!', 4);
    announce('Mission complete: ' + m.name);
    beginMission(g);
    saveGame(g);
  } else if (ev === 'failed') {
    failMission(g.missions);
    setToast(g, 'Too slow! Rico wants you to try that job again.', 3.5);
    beginMission(g);
  } else if (ev === 'tick') {
    audio.blip(880);
  } else if (ev === 'started') {
    setToast(g, currentMission(g.missions).brief, 4);
  }
  const m = currentMission(g.missions);
  g.marker = m ? m.marker : null;
  g.objectiveText = missionObjectiveText(g.missions);

  // Smoke fades.
  for (const s of g.smoke) s.life -= dt * 0.9;
  g.smoke = g.smoke.filter((s) => s.life > 0);
  if (g.toastT > 0) g.toastT -= dt;

  // Camera follows the player (or their car), zooming out a little at speed.
  const focusX = p.inCar ? p.inCar.x : p.x;
  const focusY = p.inCar ? p.inCar.y : p.y;
  g.cam.x += (focusX - g.cam.x) * Math.min(1, dt * 5);
  g.cam.y += (focusY - g.cam.y) * Math.min(1, dt * 5);

  // Sound.
  audio.engine(p.inCar ? Math.abs(p.inCar.speed) / 700 : 0, !!p.inCar);
  audio.siren(g.wanted.stars > 0);

  // Periodic autosave.
  if (g.time - g.saveAt > 20) {
    g.saveAt = g.time;
    saveGame(g);
  }
}

// ---- frame loop ----
function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener('resize', resize);
resize();

let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0.001, 0.05);
  last = now;
  const view = { w: canvas.width, h: canvas.height, zoom: 1 };
  if (G.screen === 'play' && !shotKind) {
    step(G, dt);
  }
  const speed = G.player.inCar ? Math.abs(G.player.inCar.speed) : 0;
  view.zoom = G.player.inCar ? 0.92 - Math.min(0.12, speed / 5000) : 1;
  drawWorld(ctx, view, G, G.time);
  if (G.screen === 'play') {
    drawHud(ctx, view, G);
  } else {
    drawOverlay(ctx, view, G.screen, G);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Exposed for headless smoke tests.
window.__sunset = { get G() { return G; }, step, newRun };
