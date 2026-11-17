// Sunset Bay — entry point and game loop.
// States: start → playing ⇄ paused → gameover → playing.
// The loop is fixed-step (60 Hz) with a render each frame; progress
// (cash, mission, health) saves to localStorage on mission complete
// and every 10 seconds of play.
import { CFG, START_CASH, START_HEALTH } from './config.js';
import { createWorld, updateCamera } from './world.js';
import { createPlayer, updatePlayer } from './player.js';
import { spawnTraffic, updateTraffic, scarePeds } from './traffic.js';
import { createPolice, addWanted, updatePolice } from './police.js';
import { buildMissions, createMissionState, updateMissions, resolvePunch, updateThugs, startMission } from './missions.js';
import { render } from './render.js';
import { initInput, isHeld, wasPressed, endFrameInput } from './input.js';
import { initAudio, resumeAudio, toggleMute, updateSiren } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export const game = createGame();

function createGame() {
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed') || 7);
  const world = createWorld(seed);
  const player = createPlayer(world.city.streetXs[2], world.city.streetYs[2]);
  const police = createPolice();
  const missions = createMissionState(buildMissions(world.city));
  world.policeRef = police;
  spawnTraffic(world);
  const g = {
    world, player, police, missions,
    state: 'start',
    saveTimer: 0,
    params,
  };
  loadSave(g);
  startMission(missions, world, player);
  return g;
}

function loadSave(g) {
  try {
    const raw = localStorage.getItem(CFG.saveKey);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.cash === 'number') g.player.cash = s.cash;
    if (typeof s.mission === 'number' && s.mission >= 0 && s.mission < 5) {
      g.missions.index = s.mission;
      g.missions.step = 0;
    }
    if (typeof s.health === 'number') g.player.health = Math.max(20, Math.min(100, s.health));
  } catch { /* a corrupt save never blocks play */ }
}

export function saveGame(g) {
  try {
    localStorage.setItem(CFG.saveKey, JSON.stringify({
      cash: g.player.cash,
      mission: g.missions.index,
      health: g.player.health,
    }));
  } catch { /* storage may be unavailable headless */ }
}

function onCrime(stars, reason) {
  addWanted(game.police, stars, reason);
  game.police.calmTimer = 0;
}

function onBusted() {
  game.player.cash = Math.max(0, game.player.cash - 200);
  game.player.health = START_HEALTH;
  game.player.x = game.world.city.streetXs[2];
  game.player.y = game.world.city.streetYs[2];
  if (game.player.inCar) { game.player.inCar.driver = null; game.player.inCar = null; }
  game.police.wanted = 0;
  game.police.calmTimer = 0;
  game.world.policeCars.length = 0;
  game.world.footCops.length = 0;
  game.state = 'gameover';
  saveGame(game);
}

function startPlaying() {
  game.state = 'playing';
  resumeAudio();
}

function step(dt) {
  const { world, player, police, missions } = game;
  world.time += dt;
  if (game.state !== 'playing') return;
  // Pause toggle.
  if (wasPressed('pause')) { game.state = 'paused'; return; }
  if (wasPressed('mute')) toggleMute();
  updatePlayer(world, player, dt, onCrime);
  // Punch hits land on the frame the punch fires.
  if (player.punchTimer > 0.18 && player.punchCooldown > 0.3) {
    if (resolvePunch(missions, world, player, police)) scarePeds(world, player.x, player.y, 160);
  }
  updateTraffic(world, player, dt);
  updatePolice(world, player, police, dt, onBusted);
  updateThugs(world, player, dt);
  const earned = updateMissions(missions, world, player, police, dt);
  if (earned > 0) saveGame(game);
  // Health regen when calm and on foot.
  if (police.wanted === 0 && !player.inCar) player.health = Math.min(100, player.health + 1.2 * dt);
  // Autosave.
  game.saveTimer += dt;
  if (game.saveTimer > 10) { game.saveTimer = 0; saveGame(game); }
  updateSiren(dt, police.wanted);
  const focusX = player.x;
  const focusY = player.y;
  updateCamera(world, focusX, focusY);
}

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;

function frame(now) {
  const dtMs = Math.min(100, now - last);
  last = now;
  acc += dtMs / 1000;
  // Menu keys work outside the fixed step.
  if (game.state === 'start' && wasPressed('start')) startPlaying();
  else if (game.state === 'paused' && wasPressed('pause')) game.state = 'playing';
  else if (game.state === 'gameover' && wasPressed('start')) {
    game.state = 'playing';
    resumeAudio();
  }
  if (wasPressed('mute')) toggleMute();
  while (acc >= STEP) { step(STEP); acc -= STEP; }
  render(ctx, game);
  endFrameInput();
  requestAnimationFrame(frame);
}

initInput();
initAudio();
applyShot(game, game.params);
// Expose a tiny hook for headless play-tests.
window.__sunsetBay = game;
requestAnimationFrame(frame);
