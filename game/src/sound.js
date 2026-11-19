// Sound, synthesized only — WebAudio oscillators, no audio files.
// The motor hum tracks ride speed, the siren wails while the heat is
// on, and short blips mark grabs, punches and finished jobs.
let ac = null;
let silenced = false;
let motorOsc = null;
let motorGain = null;
let wailOsc = null;
let wailGain = null;
let wailClock = 0;

export function bootSound() {
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
  } catch { ac = null; }
}

export function unmuteSound() {
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}

export function flipMute() {
  silenced = !silenced;
  if (silenced) engineOff();
  return silenced;
}
export function isSilenced() { return silenced; }

function note(freq, dur, shape, vol, glideTo) {
  if (!ac || silenced) return;
  try {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = shape || 'sine';
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, ac.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur);
  } catch { /* sound is best-effort */ }
}

export function grabBlip() { note(660, 0.12, 'sine', 0.14, 990); note(990, 0.14, 'sine', 0.1, 1320); }
export function cashChime() { note(880, 0.1, 'triangle', 0.14); setTimeout(() => note(1174, 0.16, 'triangle', 0.14), 90); }
export function punchThud() { note(140, 0.12, 'square', 0.16, 70); }
export function hornBlip() { note(370, 0.18, 'sawtooth', 0.08, 340); }
export function crashBang() { note(90, 0.3, 'sawtooth', 0.2, 45); }
export function jobDoneTune() {
  note(523, 0.14, 'triangle', 0.15);
  setTimeout(() => note(659, 0.14, 'triangle', 0.15), 120);
  setTimeout(() => note(784, 0.26, 'triangle', 0.15), 240);
}
export function heatBlare() { note(220, 0.25, 'sawtooth', 0.12, 440); }

export function engineOn() {
  if (!ac || silenced || motorOsc) return;
  try {
    motorOsc = ac.createOscillator();
    motorGain = ac.createGain();
    motorOsc.type = 'sawtooth';
    motorOsc.frequency.value = 55;
    motorGain.gain.value = 0.03;
    const low = ac.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.value = 420;
    motorOsc.connect(low); low.connect(motorGain); motorGain.connect(ac.destination);
    motorOsc.start();
  } catch { motorOsc = null; }
}

export function enginePitch(frac) {
  if (!motorOsc || !ac) return;
  const f = 55 + frac * 130;
  motorOsc.frequency.setTargetAtTime(f, ac.currentTime, 0.05);
  motorGain.gain.setTargetAtTime(0.02 + frac * 0.05, ac.currentTime, 0.08);
}

export function engineOff() {
  if (motorOsc) { try { motorOsc.stop(); } catch {} motorOsc = null; motorGain = null; }
}

export function wailSiren(dt, stars) {
  if (!ac || silenced || stars <= 0) {
    if (wailOsc) { try { wailOsc.stop(); } catch {} wailOsc = null; wailGain = null; }
    return;
  }
  if (!wailOsc) {
    try {
      wailOsc = ac.createOscillator();
      wailGain = ac.createGain();
      wailOsc.type = 'triangle';
      wailGain.gain.value = 0.035;
      wailOsc.connect(wailGain); wailGain.connect(ac.destination);
      wailOsc.start();
    } catch { wailOsc = null; }
  }
  if (wailOsc) {
    wailClock += dt;
    const f = 620 + Math.sin(wailClock * 3.2) * 260;
    wailOsc.frequency.setTargetAtTime(f, ac.currentTime, 0.05);
  }
}
