// Seeded dice for Sunset Bay. The city, traffic and pedestrians are
// all dealt from one seed, so a staged screenshot scene is the same
// every time it is dealt. xorshift32 with a scramble on the seed.
export function makeDice(seed) {
  let s = (seed >>> 0) || 1;
  s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
  s >>>= 0;
  if (s === 0) s = 0x9e3779b9;
  return function roll() {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export function oneOf(dice, list) {
  return list[Math.floor(dice() * list.length)];
}

export function span(dice, lo, hi) {
  return lo + dice() * (hi - lo);
}

export function whole(dice, lo, hi) {
  return lo + Math.floor(dice() * (hi - lo + 1));
}

// Fisher-Yates on a copy: the input list is never rearranged.
export function jumble(dice, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(dice() * (i + 1));
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}
