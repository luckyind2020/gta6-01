// Painting: ground, pins and pickups, actors sorted by depth,
// buildings on top for a fake top-down occlusion feel, then the HUD
// and the menu screens. The sun-soaked look comes from warm light:
// a soft amber wash over everything and long soft shadows baked
// into the draw order.
import { TUNE, INK } from './tune.js';
import { paintGround, paintBlocks } from './bay.js';
import { paintRide, paintWalker } from './streets.js';
import { paintOfficer } from './cops.js';
import { paintHero } from './hero.js';
import { jobNow, legNow } from './jobs.js';

export function paintFrame(ctx, game) {
  const { session, hero, book } = game;
  const cam = session.cam;
  ctx.clearRect(0, 0, TUNE.viewW, TUNE.viewH);
  ctx.save();
  if (game.screen === 'title') { paintTitle(ctx, game); ctx.restore(); return; }
  paintGround(ctx, session.bay, cam);
  paintPin(ctx, game);
  paintPickups(ctx, game);
  // Actors in one pass, roughly sorted by y for depth.
  const cast = [];
  for (const ride of session.rides) cast.push({ y: ride.y, draw: () => paintRide(ctx, ride, cam) });
  for (const w of session.walkers) cast.push({ y: w.y, draw: () => paintWalker(ctx, w, cam) });
  for (const cop of session.officers) cast.push({ y: cop.y, draw: () => paintOfficer(ctx, cop, cam) });
  for (const goon of session.goons) cast.push({ y: goon.y, draw: () => paintGoon(ctx, goon, cam) });
  cast.push({ y: hero.y, draw: () => paintHero(ctx, hero, cam) });
  cast.sort((a, b) => a.y - b.y);
  for (const a of cast) a.draw();
  paintBlocks(ctx, session.bay, cam);
  // Warm sunset light.
  ctx.fillStyle = 'rgba(255,170,60,0.06)';
  ctx.fillRect(0, 0, TUNE.viewW, TUNE.viewH);
  paintHud(ctx, game);
  if (game.screen === 'paused') paintPaused(ctx);
  if (game.screen === 'busted') paintBusted(ctx, game);
  ctx.restore();
}

function paintGoon(ctx, goon, cam) {
  const x = goon.x - cam.x; const y = goon.y - cam.y;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 5, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = goon.top;
  ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK.skinDark;
  ctx.beginPath(); ctx.arc(x, y - 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 5, y - 9, 10, 4);
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(x - 10, y - 20, 20 * Math.max(0, goon.health) / 3, 3);
}

function paintPin(ctx, game) {
  const leg = legNow(game.book);
  if (!leg || game.screen !== 'play') return;
  const cam = game.session.cam;
  const x = leg.at.x - cam.x; const y = leg.at.y - cam.y;
  const pulse = 1 + Math.sin(game.session.clock * 4) * 0.15;
  ctx.strokeStyle = INK.pin;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, 30 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,71,87,0.25)';
  ctx.beginPath(); ctx.arc(x, y, 30 * pulse, 0, Math.PI * 2); ctx.fill();
  // A bouncing beacon diamond above the pin.
  const by = y - 52 - Math.sin(game.session.clock * 3) * 8;
  ctx.fillStyle = INK.pin;
  ctx.save();
  ctx.translate(x, by); ctx.rotate(Math.PI / 4);
  ctx.fillRect(-9, -9, 18, 18);
  ctx.restore();
  ctx.strokeStyle = INK.pinRing; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x, by + 10); ctx.stroke();
  // An off-screen arrow at the screen edge points the way.
  if (x < 0 || x > TUNE.viewW || y < 0 || y > TUNE.viewH) {
    const cx = Math.max(40, Math.min(TUNE.viewW - 40, x));
    const cy = Math.max(90, Math.min(TUNE.viewH - 60, y));
    const a = Math.atan2(y - TUNE.viewH / 2, x - TUNE.viewW / 2);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = INK.pin;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -11); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function paintPickups(ctx, game) {
  const cam = game.session.cam;
  for (const pk of game.session.pickups) {
    if (pk.taken) continue;
    const x = pk.x - cam.x; const y = pk.y - cam.y;
    const bob = Math.sin(game.session.clock * 3 + pk.x) * 4;
    ctx.fillStyle = pk.kind === 'cash' ? '#2ecc71' : '#f39c12';
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-11, -11, 22, 22);
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'cash' ? '$' : '▣', x, y + bob + 5);
    ctx.textAlign = 'left';
  }
}

function paintTitle(ctx, game) {
  const W = TUNE.viewW; const H = TUNE.viewH;
  // Sunset gradient sky over a drawn skyline silhouette.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2b1055');
  g.addColorStop(0.45, '#ff6a3d');
  g.addColorStop(0.75, '#ff9a3d');
  g.addColorStop(1, '#ffd23f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff7d6';
  ctx.beginPath(); ctx.arc(W * 0.72, 170, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(20,10,40,0.85)';
  const base = H - 180;
  const towers = [[60, 260], [180, 200], [300, 300], [430, 180], [560, 260], [700, 150], [830, 280], [960, 210], [1090, 300], [1200, 190]];
  for (const [x, h] of towers) ctx.fillRect(x, base - h, 90, h + 180);
  ctx.fillStyle = INK.gold;
  for (let i = 0; i < 40; i += 1) {
    const tx = 70 + (i * 97) % 1150;
    const ty = base - 40 - (i * 53) % 220;
    ctx.fillRect(tx, ty, 6, 8);
  }
  ctx.fillStyle = '#123';
  ctx.fillRect(0, H - 90, W, 90);
  ctx.fillStyle = INK.sea;
  ctx.fillRect(0, H - 90, W, 14);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 92px system-ui';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 18;
  ctx.fillText('SUNSET BAY', W / 2, 240);
  ctx.shadowBlur = 0;
  ctx.font = 'bold 26px system-ui';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('An open-world crime story — steal cars, dodge the SBPD, run Rico\u2019s jobs', W / 2, 290);
  ctx.font = '18px system-ui';
  ctx.fillStyle = '#fff';
  const lines = [
    'WASD / arrows — move & drive   ·   E — steal / exit car',
    'SPACE — punch   ·   SHIFT — boost / nitro   ·   P — pause   ·   M — mute',
    '5 missions, wanted stars 1–5, police chases, cash rewards. Progress saves automatically.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 360 + i * 30));
  const blink = Math.sin(game.session.clock * 4) > -0.2;
  if (blink) {
    ctx.fillStyle = INK.gold;
    ctx.font = 'bold 30px system-ui';
    ctx.fillText('— PRESS ENTER TO START —', W / 2, 520);
  }
  ctx.font = '14px system-ui';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('A fully original game. Sunset Bay, Rico, the SBPD and every character are invented for this game.', W / 2, H - 40);
  ctx.textAlign = 'left';
}

function paintPaused(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, TUNE.viewW, TUNE.viewH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', TUNE.viewW / 2, TUNE.viewH / 2 - 10);
  ctx.font = '18px system-ui';
  ctx.fillText('Press P to resume · progress is saved', TUNE.viewW / 2, TUNE.viewH / 2 + 30);
  ctx.textAlign = 'left';
}

function paintBusted(ctx, game) {
  ctx.fillStyle = 'rgba(20,0,0,0.6)';
  ctx.fillRect(0, 0, TUNE.viewW, TUNE.viewH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 52px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('BUSTED!', TUNE.viewW / 2, TUNE.viewH / 2 - 40);
  ctx.font = '20px system-ui';
  ctx.fillText('The SBPD caught up with you. Rico paid your bail — $200.', TUNE.viewW / 2, TUNE.viewH / 2 + 4);
  ctx.fillStyle = INK.gold;
  ctx.font = 'bold 24px system-ui';
  ctx.fillText('Press ENTER to get back out there', TUNE.viewW / 2, TUNE.viewH / 2 + 52);
  ctx.textAlign = 'left';
}

export function paintHud(ctx, game) {
  const { hero, heat, book, session } = game;
  const W = TUNE.viewW; const H = TUNE.viewH;
  ctx.save();
  // Top-left: cash and health.
  hudPanel(ctx, 12, 12, 250, 64);
  ctx.fillStyle = INK.gold;
  ctx.font = 'bold 26px system-ui';
  ctx.fillText(`$${hero.cash.toLocaleString()}`, 24, 42);
  ctx.fillStyle = '#e74c3c';
  ctx.font = 'bold 13px system-ui';
  ctx.fillText('HEALTH', 24, 64);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(84, 54, 160, 12);
  ctx.fillStyle = hero.health > 30 ? '#2ecc71' : '#e74c3c';
  ctx.fillRect(84, 54, 160 * Math.max(0, hero.health) / 100, 12);
  // Top-right: wanted stars.
  hudPanel(ctx, W - 212, 12, 200, 52);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px system-ui';
  ctx.fillText('WANTED', W - 200, 30);
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < heat.stars ? INK.starLit : INK.starDim;
    ctx.font = '22px system-ui';
    ctx.fillText('★', W - 200 + i * 26, 56);
  }
  // Current job, top centre.
  const j = jobNow(book);
  const leg = legNow(book);
  if (j && leg) {
    const text = `${j.name} — ${leg.line}`;
    ctx.font = 'bold 15px system-ui';
    const tw = ctx.measureText(text).width;
    hudPanel(ctx, (W - tw) / 2 - 14, 12, tw + 28, 34);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, (W - tw) / 2, 35);
    // Progress dots for multi-leg jobs.
    ctx.fillStyle = '#fff';
    ctx.font = '12px system-ui';
    ctx.fillText(`Mission ${j.id}/5 · step ${book.leg + 1}/${j.legs.length}`, (W - tw) / 2, 62);
  } else if (book.done) {
    ctx.font = 'bold 16px system-ui';
    const text = '👑 KING OF SUNSET BAY — free roam!';
    const tw = ctx.measureText(text).width;
    hudPanel(ctx, (W - tw) / 2 - 14, 12, tw + 28, 34);
    ctx.fillStyle = INK.gold;
    ctx.fillText(text, (W - tw) / 2, 35);
  }
  // Speed, bottom edge left of the minimap.
  if (hero.ride) {
    const mph = Math.round(Math.abs(hero.ride.speed) * 0.14);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(`${mph}`, W - 250, H - 24);
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('MPH', W - 242, H - 24);
    const hp = Math.max(0, hero.ride.health);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(W - 390, H - 44, 110, 8);
    ctx.fillStyle = hp > 40 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(W - 390, H - 44, 110 * hp / 100, 8);
    ctx.fillStyle = '#fff';
    ctx.font = '11px system-ui';
    ctx.fillText('CAR', W - 390, H - 50);
  }
  // Dialogue line, bottom centre.
  if (book.lineFor > 0) {
    ctx.font = '15px system-ui';
    const text = book.line;
    const tw = ctx.measureText(text).width;
    hudPanel(ctx, (W - tw) / 2 - 14, H - 118, tw + 28, 32);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(text, (W - tw) / 2, H - 96);
  }
  // Banner, centre.
  if (book.bannerFor > 0) {
    ctx.font = 'bold 26px system-ui';
    const tw = ctx.measureText(book.banner).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect((W - tw) / 2 - 18, H / 2 - 118, tw + 36, 44);
    ctx.fillStyle = INK.gold;
    ctx.fillText(book.banner, (W - tw) / 2, H / 2 - 87);
  }
  paintMap(ctx, game);
  ctx.restore();
}

function hudPanel(ctx, x, y, w, h) {
  ctx.fillStyle = INK.panel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

export function paintMap(ctx, game) {
  const { session, hero, book } = game;
  const mw = 190; const mh = 146;
  const x0 = TUNE.viewW - mw - 12;
  const y0 = TUNE.viewH - mh - 12;
  const sx = mw / TUNE.mapW; const sy = mh / TUNE.mapH;
  ctx.fillStyle = INK.mapPanel;
  ctx.beginPath(); ctx.roundRect(x0, y0, mw, mh, 8); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, mw, mh); ctx.clip();
  // Sea strip.
  ctx.fillStyle = INK.mapSea;
  ctx.fillRect(x0, y0 + (TUNE.mapH - 100) * sy, mw, 100 * sy);
  // Roads.
  ctx.fillStyle = INK.mapRoad;
  for (const sxv of session.bay.vStreets) ctx.fillRect(x0 + sxv * sx - 2, y0, 4, mh);
  for (const syv of session.bay.hStreets) ctx.fillRect(x0, y0 + syv * sy - 2, mw, 4);
  // Job pin.
  const leg = legNow(book);
  if (leg) {
    ctx.fillStyle = '#ff4757';
    ctx.beginPath(); ctx.arc(x0 + leg.at.x * sx, y0 + leg.at.y * sy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x0 + leg.at.x * sx, y0 + leg.at.y * sy, 9, 0, Math.PI * 2); ctx.stroke();
  }
  // Cruiser blips.
  ctx.fillStyle = '#3b82f6';
  for (const pc of session.cruisers) {
    ctx.beginPath(); ctx.arc(x0 + pc.x * sx, y0 + pc.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Hero arrow.
  ctx.save();
  ctx.translate(x0 + hero.x * sx, y0 + hero.y * sy);
  ctx.rotate(hero.angle);
  ctx.fillStyle = INK.gold;
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x0, y0, mw, mh, 8); ctx.stroke();
}
