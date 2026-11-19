// Sunset Bay itself: a street grid over lawn, a beach and the sea
// along the south edge, parks, palms, and blocks of buildings with
// roofs, windows and the odd neon sign. Dealt once from a seed.
// Drawing runs in two passes: ground first, then buildings and palms
// above the actors for a top-down depth feel.
import { TUNE, INK } from './tune.js';
import { makeDice, oneOf, span, whole } from './dice.js';

export function growBay(seed) {
  const dice = makeDice(seed);
  const blocks = [];
  const palms = [];
  const greens = [];
  const vStreets = [];
  const hStreets = [];
  for (let x = TUNE.roadW / 2 + TUNE.blockStep / 2; x < TUNE.mapW; x += TUNE.blockStep) vStreets.push(x);
  for (let y = TUNE.roadW / 2 + TUNE.blockStep / 2; y < TUNE.mapH - 320; y += TUNE.blockStep) hStreets.push(y);

  // Every block between two streets gets buildings or, sometimes, a park.
  for (let bx = 0; bx < vStreets.length - 1; bx += 1) {
    for (let by = 0; by < hStreets.length - 1; by += 1) {
      const left = vStreets[bx] + TUNE.roadW / 2 + 14;
      const top = hStreets[by] + TUNE.roadW / 2 + 14;
      const right = vStreets[bx + 1] - TUNE.roadW / 2 - 14;
      const bottom = hStreets[by + 1] - TUNE.roadW / 2 - 14;
      if (dice() < 0.12) {
        greens.push({ x: left, y: top, w: right - left, h: bottom - top });
        for (let i = 0; i < 5; i += 1) {
          palms.push({ x: span(dice, left + 20, right - 20), y: span(dice, top + 20, bottom - 20), s: span(dice, 0.8, 1.3) });
        }
        continue;
      }
      const count = whole(dice, 1, 2);
      for (let i = 0; i < count; i += 1) {
        const w = span(dice, 70, Math.max(80, (right - left) / count - 12));
        const h = span(dice, 60, Math.max(70, bottom - top - 16));
        const x = left + (i * (right - left)) / count + 6;
        const y = top + 6 + (count === 2 && i === 1 ? span(dice, 0, 30) : 0);
        blocks.push({
          x, y,
          w: Math.min(w, right - x - 6),
          h: Math.min(h, bottom - y - 6),
          roof: oneOf(dice, INK.roofs),
          neon: dice() < 0.4,
          floors: whole(dice, 1, 3),
        });
      }
    }
  }
  // A line of palms along the sand.
  for (let x = 120; x < TUNE.mapW - 80; x += 170) {
    palms.push({ x: x + span(dice, -30, 30), y: TUNE.mapH - 300 + span(dice, -14, 14), s: span(dice, 0.9, 1.4) });
  }
  return { blocks, palms, greens, vStreets, hStreets, seed };
}

export function onStreet(bay, x, y) {
  if (y > TUNE.mapH - 340) return false; // sand and sea, not road
  for (const sx of bay.vStreets) if (Math.abs(x - sx) < TUNE.roadW / 2) return true;
  for (const sy of bay.hStreets) if (Math.abs(y - sy) < TUNE.roadW / 2) return true;
  return false;
}

export function closestStreet(bay, x, y) {
  let best = null; let bestD = Infinity;
  for (const sx of bay.vStreets) {
    const d = Math.abs(x - sx);
    if (d < bestD) { bestD = d; best = { x: sx, y, along: false }; }
  }
  for (const sy of bay.hStreets) {
    const d = Math.abs(y - sy);
    if (d < bestD) { bestD = d; best = { x, y: sy, along: true }; }
  }
  return best;
}

export function hitsBlock(bay, x, y, r) {
  for (const b of bay.blocks) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

export function paintGround(ctx, bay, cam) {
  const w = cam.w; const h = cam.h;
  const ox = cam.x; const oy = cam.y;
  ctx.fillStyle = INK.lawn;
  ctx.fillRect(0, 0, w, h);
  // Mow stripes across the lawn.
  ctx.fillStyle = INK.lawnDark;
  const stripe = 120;
  for (let wy = Math.floor(oy / stripe) * stripe; wy < oy + h; wy += stripe * 2) {
    ctx.fillRect(0, wy - oy, w, stripe);
  }
  // Parks.
  for (const g of bay.greens) {
    const px = g.x - ox; const py = g.y - oy;
    if (px > w || px + g.w < 0 || py > h || py + g.h < 0) continue;
    ctx.fillStyle = INK.park;
    ctx.fillRect(px, py, g.w, g.h);
    ctx.fillStyle = INK.parkPond;
    ctx.beginPath(); ctx.arc(px + g.w / 2, py + g.h / 2, Math.min(g.w, g.h) * 0.22, 0, Math.PI * 2); ctx.fill();
  }
  // Asphalt.
  ctx.fillStyle = INK.asphalt;
  for (const sx of bay.vStreets) ctx.fillRect(sx - ox - TUNE.roadW / 2, 0, TUNE.roadW, h);
  for (const sy of bay.hStreets) ctx.fillRect(0, sy - oy - TUNE.roadW / 2, w, TUNE.roadW);
  // Centre dashes.
  ctx.fillStyle = INK.dash;
  for (const sx of bay.vStreets) {
    for (let wy = Math.floor(oy / 44) * 44; wy < oy + h; wy += 44) ctx.fillRect(sx - ox - 2, wy - oy, 4, 22);
  }
  for (const sy of bay.hStreets) {
    for (let wx = Math.floor(ox / 44) * 44; wx < ox + w; wx += 44) ctx.fillRect(wx - ox, sy - oy - 2, 22, 4);
  }
  // Beach, then the sea.
  const sandY = TUNE.mapH - 340 - oy;
  ctx.fillStyle = INK.sand;
  ctx.fillRect(0, sandY, w, 240);
  ctx.fillStyle = INK.sea;
  ctx.fillRect(0, sandY + 240, w, 120);
  ctx.fillStyle = INK.seaDeep;
  for (let wx = Math.floor(ox / 90) * 90; wx < ox + w; wx += 90) {
    ctx.beginPath(); ctx.arc(wx - ox + 30, sandY + 290, 18, 0, Math.PI); ctx.fill();
  }
  // Kerb lines along each street.
  ctx.strokeStyle = INK.kerb; ctx.lineWidth = 3;
  for (const sx of bay.vStreets) {
    ctx.beginPath(); ctx.moveTo(sx - ox - TUNE.roadW / 2, 0); ctx.lineTo(sx - ox - TUNE.roadW / 2, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - ox + TUNE.roadW / 2, 0); ctx.lineTo(sx - ox + TUNE.roadW / 2, h); ctx.stroke();
  }
}

export function paintPalm(ctx, x, y, s) {
  ctx.strokeStyle = INK.palmTrunk; ctx.lineWidth = 5 * s;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4 * s, y - 22 * s); ctx.stroke();
  ctx.fillStyle = INK.palmLeaf;
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    ctx.beginPath();
    ctx.ellipse(x + 4 * s + Math.cos(a) * 13 * s, y - 24 * s + Math.sin(a) * 9 * s, 15 * s, 5 * s, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintBlocks(ctx, bay, cam) {
  const ox = cam.x; const oy = cam.y;
  for (const b of bay.blocks) {
    const bx = b.x - ox; const by = b.y - oy;
    if (bx > cam.w || bx + b.w < 0 || by > cam.h || by + b.h < 0) continue;
    // A dropped shadow slab sells the height.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(bx + 6 * b.floors, by + 8 * b.floors, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(bx, by, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(bx, by, b.w, 8);
    // Windows.
    ctx.fillStyle = 'rgba(20,30,50,0.75)';
    for (let wx = bx + 10; wx < bx + b.w - 14; wx += 24) {
      for (let wy = by + 14; wy < by + b.h - 12; wy += 22) ctx.fillRect(wx, wy, 12, 10);
    }
    if (b.neon) {
      ctx.fillStyle = INK.neonPink;
      ctx.fillRect(bx + b.w / 2 - 16, by + b.h - 10, 32, 5);
    }
  }
  for (const p of bay.palms) {
    const px = p.x - ox; const py = p.y - oy;
    if (px < -40 || px > cam.w + 40 || py < -40 || py > cam.h + 40) continue;
    paintPalm(ctx, px, py, p.s);
  }
}
