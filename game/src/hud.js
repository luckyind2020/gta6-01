// HUD: cash, health bar, wanted stars, mission objective, speed,
// dialogue line, banners — plus a live minimap in the corner.
import { CFG, PAL } from './config.js';
import { currentMission, currentStep } from './missions.js';

export function drawHud(ctx, game) {
  const { player, police, missions, world } = game;
  const W = CFG.canvasW; const H = CFG.canvasH;
  ctx.save();
  // Top-left: cash + health.
  panel(ctx, 12, 12, 250, 64);
  ctx.fillStyle = PAL.gold;
  ctx.font = 'bold 26px system-ui';
  ctx.fillText(`$${player.cash.toLocaleString()}`, 24, 42);
  ctx.fillStyle = '#e74c3c';
  ctx.font = 'bold 13px system-ui';
  ctx.fillText('HEALTH', 24, 64);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(84, 54, 160, 12);
  ctx.fillStyle = player.health > 30 ? '#2ecc71' : '#e74c3c';
  ctx.fillRect(84, 54, 160 * Math.max(0, player.health) / 100, 12);
  // Top-right: wanted stars.
  panel(ctx, W - 212, 12, 200, 52);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px system-ui';
  ctx.fillText('WANTED', W - 200, 30);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < police.wanted ? PAL.star : PAL.starEmpty;
    ctx.font = '22px system-ui';
    ctx.fillText('★', W - 200 + i * 26, 56);
  }
  // Mission objective, top centre.
  const m = currentMission(missions);
  const step = currentStep(missions);
  if (m && step) {
    const text = `${m.title} — ${step.text}`;
    ctx.font = 'bold 15px system-ui';
    const tw = ctx.measureText(text).width;
    panel(ctx, (W - tw) / 2 - 14, 12, tw + 28, 34);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, (W - tw) / 2, 35);
    // Progress dots for multi-step missions.
    ctx.fillStyle = '#fff';
    ctx.font = '12px system-ui';
    ctx.fillText(`Mission ${m.id}/5 · step ${missions.step + 1}/${m.steps.length}`, (W - tw) / 2, 62);
  } else if (missions.done) {
    ctx.font = 'bold 16px system-ui';
    const text = '👑 KING OF SUNSET BAY — free roam!';
    const tw = ctx.measureText(text).width;
    panel(ctx, (W - tw) / 2 - 14, 12, tw + 28, 34);
    ctx.fillStyle = PAL.gold;
    ctx.fillText(text, (W - tw) / 2, 35);
  }
  // Speed, bottom edge left of the minimap (minimap occupies the corner).
  if (player.inCar) {
    const mph = Math.round(Math.abs(player.inCar.speed) * 0.14);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(`${mph}`, W - 250, H - 24);
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('MPH', W - 242, H - 24);
    const hp = Math.max(0, player.inCar.health);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(W - 390, H - 44, 110, 8);
    ctx.fillStyle = hp > 40 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(W - 390, H - 44, 110 * hp / 100, 8);
    ctx.fillStyle = '#fff';
    ctx.font = '11px system-ui';
    ctx.fillText('CAR', W - 390, H - 50);
  }
  // Dialogue line, bottom centre.
  if (missions.dialogueTimer > 0) {
    ctx.font = '15px system-ui';
    const text = missions.dialogue;
    const tw = ctx.measureText(text).width;
    panel(ctx, (W - tw) / 2 - 14, H - 118, tw + 28, 32);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(text, (W - tw) / 2, H - 96);
  }
  // Banner, centre.
  if (missions.bannerTimer > 0) {
    ctx.font = 'bold 26px system-ui';
    const tw = ctx.measureText(missions.banner).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect((W - tw) / 2 - 18, H / 2 - 118, tw + 36, 44);
    ctx.fillStyle = PAL.gold;
    ctx.fillText(missions.banner, (W - tw) / 2, H / 2 - 87);
  }
  drawMinimap(ctx, game);
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PAL.hudBg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

export function drawMinimap(ctx, game) {
  const { world, player, missions } = game;
  const mw = 190; const mh = 146;
  const x0 = CFG.canvasW - mw - 12;
  const y0 = CFG.canvasH - mh - 12;
  const sx = mw / CFG.worldW; const sy = mh / CFG.worldH;
  ctx.fillStyle = PAL.minimapBg;
  ctx.beginPath(); ctx.roundRect(x0, y0, mw, mh, 8); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, mw, mh); ctx.clip();
  // Sea strip.
  ctx.fillStyle = PAL.minimapWater;
  ctx.fillRect(x0, y0 + (CFG.worldH - 100) * sy, mw, 100 * sy);
  // Roads.
  ctx.fillStyle = PAL.minimapRoad;
  for (const sxv of world.city.streetXs) ctx.fillRect(x0 + sxv * sx - 2, y0, 4, mh);
  for (const syv of world.city.streetYs) ctx.fillRect(x0, y0 + syv * sy - 2, mw, 4);
  // Mission marker.
  const step = currentStep(missions);
  if (step) {
    ctx.fillStyle = '#ff4757';
    ctx.beginPath(); ctx.arc(x0 + step.at.x * sx, y0 + step.at.y * sy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x0 + step.at.x * sx, y0 + step.at.y * sy, 9, 0, Math.PI * 2); ctx.stroke();
  }
  // Police blips.
  ctx.fillStyle = '#3b82f6';
  for (const pc of world.policeCars) {
    ctx.beginPath(); ctx.arc(x0 + pc.x * sx, y0 + pc.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Player arrow.
  ctx.save();
  ctx.translate(x0 + player.x * sx, y0 + player.y * sy);
  ctx.rotate(player.angle);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x0, y0, mw, mh, 8); ctx.stroke();
}
