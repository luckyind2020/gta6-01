// Synthesised sound: no audio files, everything is built with WebAudio
// oscillators and filtered noise. Safe to construct in Node (it becomes a
// silent no-op when there is no window/AudioContext).

function hasAudio() {
  return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined';
}

export function makeAudio() {
  const a = {
    ctx: null,
    master: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenLfo: null,
    started: false,
  };
  a.unlock = function unlock() {
    if (!hasAudio() || a.ctx) return;
    try {
      a.ctx = new window.AudioContext();
      a.master = a.ctx.createGain();
      a.master.gain.value = 0.5;
      a.master.connect(a.ctx.destination);
      a.started = true;
    } catch (e) {
      a.ctx = null;
    }
  };
  a.toggleMute = function toggleMute() {
    a.muted = !a.muted;
    if (a.master) a.master.gain.value = a.muted ? 0 : 0.5;
    return a.muted;
  };
  a.engine = function engine(speed01, on) {
    if (!a.ctx || a.muted) return;
    if (on && !a.engineOsc) {
      a.engineOsc = a.ctx.createOscillator();
      a.engineOsc.type = 'sawtooth';
      a.engineGain = a.ctx.createGain();
      a.engineGain.gain.value = 0.04;
      const filt = a.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 700;
      a.engineOsc.connect(filt);
      filt.connect(a.engineGain);
      a.engineGain.connect(a.master);
      a.engineOsc.start();
    }
    if (a.engineOsc) {
      a.engineOsc.frequency.value = 55 + speed01 * 130;
      a.engineGain.gain.value = on ? 0.03 + speed01 * 0.05 : 0;
    }
  };
  a.siren = function siren(on) {
    if (!a.ctx || a.muted) return;
    if (on && !a.sirenOsc) {
      a.sirenOsc = a.ctx.createOscillator();
      a.sirenOsc.type = 'triangle';
      a.sirenOsc.frequency.value = 750;
      a.sirenGain = a.ctx.createGain();
      a.sirenGain.gain.value = 0.035;
      a.sirenLfo = a.ctx.createOscillator();
      a.sirenLfo.frequency.value = 0.9;
      const lfoGain = a.ctx.createGain();
      lfoGain.gain.value = 320;
      a.sirenLfo.connect(lfoGain);
      lfoGain.connect(a.sirenOsc.frequency);
      a.sirenOsc.connect(a.sirenGain);
      a.sirenGain.connect(a.master);
      a.sirenOsc.start();
      a.sirenLfo.start();
    }
    if (a.sirenGain) a.sirenGain.gain.value = on ? 0.035 : 0;
  };
  a.blip = function blip(freq) {
    if (!a.ctx || a.muted) return;
    const o = a.ctx.createOscillator();
    const g = a.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq || 660;
    g.gain.setValueAtTime(0.16, a.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.ctx.currentTime + 0.14);
    o.connect(g);
    g.connect(a.master);
    o.start();
    o.stop(a.ctx.currentTime + 0.15);
  };
  a.thud = function thud() {
    if (!a.ctx || a.muted) return;
    const dur = 0.12;
    const buf = a.ctx.createBuffer(1, a.ctx.sampleRate * dur, a.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = a.ctx.createBufferSource();
    src.buffer = buf;
    const filt = a.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 320;
    const g = a.ctx.createGain();
    g.gain.value = 0.3;
    src.connect(filt);
    filt.connect(g);
    g.connect(a.master);
    src.start();
  };
  a.jingle = function jingle() {
    if (!a.ctx || a.muted) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => a.blip(f), i * 110);
    });
  };
  return a;
}
