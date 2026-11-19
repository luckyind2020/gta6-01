// Small math + random helpers for Sunset Bay. No DOM here: every function is
// pure, so the simulation can run in Node as well as in the browser.

export function mulberry(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleBetween(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function turnToward(angle, target, maxStep) {
  let d = target - angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (d > maxStep) return angle + maxStep;
  if (d < -maxStep) return angle - maxStep;
  return target;
}

export function pickOne(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function pickInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function money(n) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}

export function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

export function fmtClock(totalSeconds) {
  const s = Math.floor(totalSeconds);
  return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60);
}
