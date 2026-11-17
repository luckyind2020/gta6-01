// Sunset Bay — the city itself. A street grid over grass, a beach and
// sea along the south edge, parks, palms and buildings with roofs,
// awnings and neon signs. Generated once from a seed; drawn in two
// passes (ground, then buildings/roofs above the actors).
import { CFG, PAL } from './config.js';
import { makeRng, pick, range, intRange } from './random.js';

export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const palms = [];
  const parks = [];
  const streetXs = [];
  const streetYs = [];
  for (let x = CFG.streetW / 2 + CFG.block / 2; x < CFG.worldW; x += CFG.block) streetXs.push(x);
  for (let y = CFG.streetW / 2 + CFG.block / 2; y < CFG.worldH - 320; y += CFG.block) streetYs.push(y);

  // Buildings fill each block between streets, leaving a sidewalk ring.
  for (let bx = 0; bx < streetXs.length - 1; bx++) {
    for (let by = 0; by < streetYs.length - 1; by++) {
      const x0 = streetXs[bx] + CFG.streetW / 2 + 14;
      const y0 = streetYs[by] + CFG.streetW / 2 + 14;
      const x1 = streetXs[bx + 1] - CFG.streetW / 2 - 14;
      const y1 = streetYs[by + 1] - CFG.streetW / 2 - 14;
      const roll = rng();
      if (roll < 0.12) { // park block
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let i = 0; i < 5; i++) {
          palms.push({ x: range(rng, x0 + 20, x1 - 20), y: range(rng, y0 + 20, y1 - 20), s: range(rng, 0.8, 1.3) });
        }
        continue;
      }
      const n = intRange(rng, 1, 2);
      for (let i = 0; i < n; i++) {
        const w = range(rng, 70, Math.max(80, (x1 - x0) / n - 12));
        const h = range(rng, 60, Math.max(70, y1 - y0 - 16));
        const x = x0 + (i * (x1 - x0)) / n + 6;
        const y = y0 + 6 + (n === 2 && i === 1 ? range(rng, 0, 30) : 0);
        buildings.push({
          x, y, w: Math.min(w, x1 - x - 6), h: Math.min(h, y1 - y - 6),
          color: pick(rng, PAL.buildingRoof),
          neon: rng() < 0.4,
          height: intRange(rng, 1, 3),
        });
      }
    }
  }
  // Beach palms along the sand strip.
  for (let x = 120; x < CFG.worldW - 80; x += 170) {
    palms.push({ x: x + range(rng, -30, 30), y: CFG.worldH - 300 + range(rng, -14, 14), s: range(rng, 0.9, 1.4) });
  }
  return { buildings, palms, parks, streetXs, streetYs, seed };
}

export function isOnRoad(city, x, y) {
  if (y > CFG.worldH - 340) return false; // beach / sea
  for (const sx of city.streetXs) if (Math.abs(x - sx) < CFG.streetW / 2) return true;
  for (const sy of city.streetYs) if (Math.abs(y - sy) < CFG.streetW / 2) return true;
  return false;
}

export function nearestStreetPoint(city, x, y) {
  let best = null; let bd = Infinity;
  for (const sx of city.streetXs) {
    const d = Math.abs(x - sx);
    if (d < bd) { bd = d; best = { x: sx, y, horizontal: false }; }
  }
  for (const sy of city.streetYs) {
    const d = Math.abs(y - sy);
    if (d < bd) { bd = d; best = { x, y: sy, horizontal: true }; }
  }
  return best;
}

export function collidesBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

export function drawGround(ctx, city, cam) {
  const w = cam.w; const h = cam.h;
  const ox = cam.x; const oy = cam.y;
  ctx.fillStyle = PAL.grass;
  ctx.fillRect(0, 0, w, h);
  // Mow stripes for grass texture.
  ctx.fillStyle = PAL.grassDark;
  const stripe = 120;
  for (let wy = Math.floor(oy / stripe) * stripe; wy < oy + h; wy += stripe * 2) {
    ctx.fillRect(0, wy - oy, w, stripe);
  }
  // Parks.
  for (const p of city.parks) {
    const px = p.x - ox; const py = p.y - oy;
    if (px > w || px + p.w < 0 || py > h || py + p.h < 0) continue;
    ctx.fillStyle = '#3f8f3a';
    ctx.fillRect(px, py, p.w, p.h);
    ctx.fillStyle = '#57a84e';
    ctx.beginPath(); ctx.arc(px + p.w / 2, py + p.h / 2, Math.min(p.w, p.h) * 0.22, 0, Math.PI * 2); ctx.fill();
  }
  // Roads.
  ctx.fillStyle = PAL.road;
  for (const sx of city.streetXs) ctx.fillRect(sx - ox - CFG.streetW / 2, 0, CFG.streetW, h);
  for (const sy of city.streetYs) ctx.fillRect(0, sy - oy - CFG.streetW / 2, w, CFG.streetW);
  // Lane dashes.
  ctx.fillStyle = PAL.lane;
  for (const sx of city.streetXs) {
    for (let wy = Math.floor(oy / 44) * 44; wy < oy + h; wy += 44) ctx.fillRect(sx - ox - 2, wy - oy, 4, 22);
  }
  for (const sy of city.streetYs) {
    for (let wx = Math.floor(ox / 44) * 44; wx < ox + w; wx += 44) ctx.fillRect(wx - ox, sy - oy - 2, 22, 4);
  }
  // Beach + sea along the south edge.
  const beachY = CFG.worldH - 340 - oy;
  ctx.fillStyle = PAL.sand;
  ctx.fillRect(0, beachY, w, 240);
  ctx.fillStyle = PAL.sea;
  ctx.fillRect(0, beachY + 240, w, 120);
  ctx.fillStyle = PAL.seaDeep;
  for (let wx = Math.floor(ox / 90) * 90; wx < ox + w; wx += 90) {
    ctx.beginPath(); ctx.arc(wx - ox + 30, beachY + 290, 18, 0, Math.PI); ctx.fill();
  }
  // Sidewalk edge lines on the roads.
  ctx.strokeStyle = PAL.roadEdge; ctx.lineWidth = 3;
  for (const sx of city.streetXs) {
    ctx.beginPath(); ctx.moveTo(sx - ox - CFG.streetW / 2, 0); ctx.lineTo(sx - ox - CFG.streetW / 2, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - ox + CFG.streetW / 2, 0); ctx.lineTo(sx - ox + CFG.streetW / 2, h); ctx.stroke();
  }
}

export function drawPalm(ctx, x, y, s) {
  ctx.strokeStyle = PAL.trunk; ctx.lineWidth = 5 * s;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4 * s, y - 22 * s); ctx.stroke();
  ctx.fillStyle = PAL.palm;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    ctx.beginPath();
    ctx.ellipse(x + 4 * s + Math.cos(a) * 13 * s, y - 24 * s + Math.sin(a) * 9 * s, 15 * s, 5 * s, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBuildings(ctx, city, cam) {
  const ox = cam.x; const oy = cam.y;
  for (const b of city.buildings) {
    const bx = b.x - ox; const by = b.y - oy;
    if (bx > cam.w || bx + b.w < 0 || by > cam.h || by + b.h < 0) continue;
    // Fake height: offset shadow slab.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(bx + 6 * b.height, by + 8 * b.height, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(bx, by, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(bx, by, b.w, 8);
    // Windows.
    ctx.fillStyle = 'rgba(20,30,50,0.75)';
    for (let wx = bx + 10; wx < bx + b.w - 14; wx += 24) {
      for (let wy = by + 14; wy < by + b.h - 12; wy += 22) ctx.fillRect(wx, wy, 12, 10);
    }
    if (b.neon) {
      ctx.fillStyle = '#ff5fa2';
      ctx.fillRect(bx + b.w / 2 - 16, by + b.h - 10, 32, 5);
    }
  }
  for (const p of city.palms) {
    const px = p.x - ox; const py = p.y - oy;
    if (px < -40 || px > cam.w + 40 || py < -40 || py > cam.h + 40) continue;
    drawPalm(ctx, px, py, p.s);
  }
}
