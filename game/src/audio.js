// Synthesized sound only — WebAudio oscillators, no audio files.
// Engine hum follows car speed, sirens wail while wanted, and short
// blips mark pickups, punches and mission events.
let ctx = null;
let muted = false;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let sirenTimer = 0;

export function initAudio() {
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch { ctx = null; }
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopEngine();
  return muted;
}
export function isMuted() { return muted; }

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* audio is best-effort */ }
}

export function blipPickup() { tone(660, 0.12, 'sine', 0.14, 990); tone(990, 0.14, 'sine', 0.1, 1320); }
export function blipCash() { tone(880, 0.1, 'triangle', 0.14); setTimeout(() => tone(1174, 0.16, 'triangle', 0.14), 90); }
export function thudPunch() { tone(140, 0.12, 'square', 0.16, 70); }
export function blipHorn() { tone(370, 0.18, 'sawtooth', 0.08, 340); }
export function crashSound() { tone(90, 0.3, 'sawtooth', 0.2, 45); }
export function missionDoneSound() {
  tone(523, 0.14, 'triangle', 0.15);
  setTimeout(() => tone(659, 0.14, 'triangle', 0.15), 120);
  setTimeout(() => tone(784, 0.26, 'triangle', 0.15), 240);
}
export function wantedSound() { tone(220, 0.25, 'sawtooth', 0.12, 440); }

export function startEngine() {
  if (!ctx || muted || engineOsc) return;
  try {
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain.gain.value = 0.03;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 420;
    engineOsc.connect(filt); filt.connect(engineGain); engineGain.connect(ctx.destination);
    engineOsc.start();
  } catch { engineOsc = null; }
}

export function setEngineSpeed(frac) {
  if (!engineOsc || !ctx) return;
  const f = 55 + frac * 130;
  engineOsc.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
  engineGain.gain.setTargetAtTime(0.02 + frac * 0.05, ctx.currentTime, 0.08);
}

export function stopEngine() {
  if (engineOsc) { try { engineOsc.stop(); } catch {} engineOsc = null; engineGain = null; }
}

export function updateSiren(dt, wanted) {
  if (!ctx || muted || wanted <= 0) {
    if (sirenOsc) { try { sirenOsc.stop(); } catch {} sirenOsc = null; sirenGain = null; }
    return;
  }
  if (!sirenOsc) {
    try {
      sirenOsc = ctx.createOscillator();
      sirenGain = ctx.createGain();
      sirenOsc.type = 'triangle';
      sirenGain.gain.value = 0.035;
      sirenOsc.connect(sirenGain); sirenGain.connect(ctx.destination);
      sirenOsc.start();
    } catch { sirenOsc = null; }
  }
  if (sirenOsc) {
    sirenTimer += dt;
    const f = 620 + Math.sin(sirenTimer * 3.2) * 260;
    sirenOsc.frequency.setTargetAtTime(f, ctx.currentTime, 0.05);
  }
}
