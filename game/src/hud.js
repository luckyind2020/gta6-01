// The HUD: cash, health, wanted stars, the current objective, speed when
// driving, and a live minimap. All drawing is immediate-mode canvas.

import { money, clamp } from './util.js';
import { WORLD_W, WORLD_H } from './city.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawHud(ctx, view, G) {
  const W = view.w;
  const H = view.h;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Top-left: cash and health.
  ctx.fillStyle = 'rgba(10, 12, 20, 0.62)';
  roundRect(ctx, 14, 12, 218, 64, 10);
  ctx.fill();
  ctx.fillStyle = '#7de23e';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(money(G.cash), 28, 42);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, 28, 52, 150, 10, 5);
  ctx.fill();
  const hpFrac = clamp(G.player.hp / G.player.maxHp, 0, 1);
  ctx.fillStyle = hpFrac > 0.5 ? '#7de23e' : hpFrac > 0.25 ? '#e2b13e' : '#e23e57';
  roundRect(ctx, 28, 52, 150 * hpFrac, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('HEALTH', 184, 61);

  // Top-right: wanted stars.
  const stars = G.wanted.stars;
  ctx.fillStyle = 'rgba(10, 12, 20, 0.62)';
  roundRect(ctx, W - 214, 12, 200, 58, 10);
  ctx.fill();
  ctx.font = '26px system-ui, sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < stars ? '#ffd23e' : 'rgba(255,255,255,0.22)';
    ctx.fillText('\u2605', W - 196 + i * 38, 44);
  }
  if (stars > 0) {
    ctx.fillStyle = '#ff5a5a';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('WANTED', W - 196, 64);
  }

  // Top-centre: current objective.
  const obj = G.objectiveText;
  if (obj) {
    ctx.font = 'bold 15px system-ui, sans-serif';
    const tw = ctx.measureText(obj).width;
    ctx.fillStyle = 'rgba(10, 12, 20, 0.62)';
    roundRect(ctx, W / 2 - tw / 2 - 14, 12, tw + 28, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.fillText(obj, W / 2 - tw / 2, 35);
  }

  // Bottom-right: speed, only while driving.
  if (G.player.inCar) {
    const mph = Math.round(Math.abs(G.player.inCar.speed) * 0.12);
    ctx.fillStyle = 'rgba(10, 12, 20, 0.62)';
    roundRect(ctx, W - 154, H - 66, 140, 52, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(String(mph), W - 138, H - 28);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#9fb3c8';
    ctx.fillText('MPH', W - 78, H - 28);
    ctx.fillStyle = '#9fb3c8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(G.player.inCar.name, W - 138, H - 44 - 12);
  }

  // Bottom-left: minimap.
  const mw = 190;
  const mh = 132;
  const mx = 14;
  const my = H - mh - 14;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(10, 12, 20, 0.66)';
  roundRect(ctx, mx - 4, my - 4, mw + 8, mh + 8, 10);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  ctx.fillStyle = '#2e4a2f';
  ctx.fillRect(mx, my, mw, mh);
  // Sea along the bottom.
  ctx.fillStyle = '#2a6db0';
  ctx.fillRect(mx, my + mh * 0.925, mw, mh * 0.075);
  ctx.fillStyle = '#d9c08a';
  ctx.fillRect(mx, my + mh * 0.855, mw, mh * 0.07);
  // Roads.
  ctx.strokeStyle = '#5a6068';
  ctx.lineWidth = 3;
  for (const rx of G.city.vRoads) {
    ctx.beginPath();
    ctx.moveTo(mx + rx * sx, my);
    ctx.lineTo(mx + rx * sx, my + mh);
    ctx.stroke();
  }
  for (const ry of G.city.hRoads) {
    ctx.beginPath();
    ctx.moveTo(mx, my + ry * sy);
    ctx.lineTo(mx + mw, my + ry * sy);
    ctx.stroke();
  }
  // Mission marker.
  if (G.marker) {
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(mx + G.marker.x * sx, my + G.marker.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Cops red, player white.
  ctx.fillStyle = '#ff4d4d';
  for (const c of G.cruisers) {
    ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4);
  }
  const px = G.player.inCar ? G.player.inCar.x : G.player.x;
  const py = G.player.inCar ? G.player.inCar.y : G.player.y;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mx + px * sx, my + py * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Toast message line (mission updates, busted warnings).
  if (G.toast && G.toastT > 0) {
    ctx.font = 'bold 17px system-ui, sans-serif';
    const tw = ctx.measureText(G.toast).width;
    ctx.fillStyle = 'rgba(10, 12, 20, 0.72)';
    roundRect(ctx, W / 2 - tw / 2 - 14, H - 96, tw + 28, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(G.toast, W / 2 - tw / 2, H - 73);
  }

  ctx.restore();
}
