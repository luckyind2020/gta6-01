// Sunset Bay — boot and the one loop.
// Screens: title → play ⇄ paused → busted → play.
// The loop is fixed-step (60 Hz) with a paint each frame; progress
// (cash, job, health) saves to localStorage when a job is finished
// and every 10 seconds of play.
import { TUNE, HEALTH_START } from './tune.js';
import { newSession, trailCam } from './state.js';
import { newHero, steerHero } from './hero.js';
import { fillStreets, moveStreets, frightenWalkers } from './streets.js';
import { newHeat, raiseHeat, chaseHeat } from './cops.js';
import { scriptJobs, newJobBook, tickJobs, swingAt, tickGoons, openJob } from './jobs.js';
import { paintFrame } from './paint.js';
import { wireKeys, tapped, flushFrame } from './keys.js';
import { bootSound, unmuteSound, flipMute, wailSiren } from './sound.js';
import { poseScene } from './stage.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

export const game = buildGame();

function buildGame() {
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed') || 7);
  const session = newSession(seed);
  const hero = newHero(session.bay.vStreets[2], session.bay.hStreets[2]);
  const heat = newHeat();
  const book = newJobBook(scriptJobs(session.bay));
  session.heat = heat;
  fillStreets(session);
  const g = {
    session, hero, heat, book,
    screen: 'title',
    saveIn: 0,
    params,
  };
  readSave(g);
  openJob(book, session, hero);
  return g;
}

function readSave(g) {
  try {
    const raw = localStorage.getItem(TUNE.saveName);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.cash === 'number') g.hero.cash = s.cash;
    if (typeof s.job === 'number' && s.job >= 0 && s.job < 5) {
      g.book.index = s.job;
      g.book.leg = 0;
    }
    if (typeof s.health === 'number') g.hero.health = Math.max(20, Math.min(100, s.health));
  } catch { /* a broken save never blocks play */ }
}

export function writeSave(g) {
  try {
    localStorage.setItem(TUNE.saveName, JSON.stringify({
      cash: g.hero.cash,
      job: g.book.index,
      health: g.hero.health,
    }));
  } catch { /* storage may be off headless */ }
}

function onOffence(stars) {
  raiseHeat(game.heat, stars);
  game.heat.quietFor = 0;
}

function onBusted() {
  game.hero.cash = Math.max(0, game.hero.cash - 200);
  game.hero.health = HEALTH_START;
  game.hero.x = game.session.bay.vStreets[2];
  game.hero.y = game.session.bay.hStreets[2];
  if (game.hero.ride) { game.hero.ride.driver = null; game.hero.ride = null; }
  game.heat.stars = 0;
  game.heat.quietFor = 0;
  game.session.cruisers.length = 0;
  game.session.officers.length = 0;
  game.screen = 'busted';
  writeSave(game);
}

function beginPlay() {
  game.screen = 'play';
  unmuteSound();
}

function tick(dt) {
  const { session, hero, heat, book } = game;
  session.clock += dt;
  if (game.screen !== 'play') return;
  // Pause toggle.
  if (tapped('hold')) { game.screen = 'paused'; return; }
  if (tapped('quiet')) flipMute();
  steerHero(session, hero, dt, onOffence);
  // A punch lands on the frame it fires.
  if (hero.swingTimer > 0.18 && hero.swingWait > 0.3) {
    if (swingAt(book, session, hero, heat)) frightenWalkers(session, hero.x, hero.y, 160);
  }
  moveStreets(session, hero, dt);
  chaseHeat(session, hero, heat, dt, onBusted);
  tickGoons(session, hero, dt);
  const earned = tickJobs(book, session, hero, heat, dt);
  if (earned > 0) writeSave(game);
  // Health comes back when calm and on foot.
  if (heat.stars === 0 && !hero.ride) hero.health = Math.min(100, hero.health + 1.2 * dt);
  // Autosave.
  game.saveIn += dt;
  if (game.saveIn > 10) { game.saveIn = 0; writeSave(game); }
  wailSiren(dt, heat.stars);
  trailCam(session, hero.x, hero.y);
}

let last = performance.now();
let acc = 0;
const STEP = 1 / TUNE.stepHz;

function frame(now) {
  const dtMs = Math.min(100, now - last);
  last = now;
  acc += dtMs / 1000;
  // Menu keys work outside the fixed step.
  if (game.screen === 'title' && tapped('go')) beginPlay();
  else if (game.screen === 'paused' && tapped('hold')) game.screen = 'play';
  else if (game.screen === 'busted' && tapped('go')) {
    game.screen = 'play';
    unmuteSound();
  }
  if (tapped('quiet')) flipMute();
  while (acc >= STEP) { tick(STEP); acc -= STEP; }
  paintFrame(ctx, game);
  flushFrame();
  requestAnimationFrame(frame);
}

wireKeys();
bootSound();
poseScene(game, game.params);
// A tiny hook for headless play-tests.
window.__sunsetBay = game;
requestAnimationFrame(frame);
