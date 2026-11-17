// Rendering: ground, markers and pickups, actors sorted by depth,
// buildings on top for a fake top-down occlusion feel, then HUD and
// menu screens. The sun-soaked look comes from warm light: a soft
// amber overlay and long soft shadows baked into the draw order.
import { CFG, PAL } from './config.js';
import { drawGround, drawBuildings } from './city.js';
import { drawCar, drawPed } from './traffic.js';
import { drawFootCop } from './police.js';
import { drawPlayer } from './player.js';
import { drawHud } from './hud.js';
import { currentStep } from './missions.js';

export function render(ctx, game) {
  const { world, player, missions } = game;
  const cam = world.camera;
  ctx.clearRect(0, 0, CFG.canvasW, CFG.canvasH);
  ctx.save();
  if (game.state === 'start') { drawStartScreen(ctx, game); ctx.restore(); return; }
  drawGround(ctx, world.city, cam);
  drawMissionMarker(ctx, game);
  drawPickups(ctx, game);
  // Actors in one pass, roughly sorted by y for depth.
  const actors = [];
  for (const car of world.cars) actors.push({ y: car.y, draw: () => drawCar(ctx, car, cam) });
  for (const ped of world.peds) actors.push({ y: ped.y, draw: () => drawPed(ctx, ped, cam) });
  for (const cop of world.footCops) actors.push({ y: cop.y, draw: () => drawFootCop(ctx, cop, cam) });
  for (const thug of world.thugs) actors.push({ y: thug.y, draw: () => drawThug(ctx, thug, cam) });
  actors.push({ y: player.y, draw: () => drawPlayer(ctx, player, cam) });
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) a.draw();
  drawBuildings(ctx, world.city, cam);
  // Warm sunset light.
  ctx.fillStyle = 'rgba(255,170,60,0.06)';
  ctx.fillRect(0, 0, CFG.canvasW, CFG.canvasH);
  drawHud(ctx, game);
  if (game.state === 'paused') drawPaused(ctx);
  if (game.state === 'gameover') drawGameOver(ctx, game);
  ctx.restore();
}

function drawThug(ctx, thug, cam) {
  const x = thug.x - cam.x; const y = thug.y - cam.y;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 5, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = thug.shirt;
  ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath(); ctx.arc(x, y - 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 5, y - 9, 10, 4);
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(x - 10, y - 20, 20 * Math.max(0, thug.health) / 3, 3);
}

function drawMissionMarker(ctx, game) {
  const step = currentStep(game.missions);
  if (!step || game.state !== 'playing') return;
  const cam = game.world.camera;
  const x = step.at.x - cam.x; const y = step.at.y - cam.y;
  const pulse = 1 + Math.sin(game.world.time * 4) * 0.15;
  ctx.strokeStyle = PAL.marker;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, 30 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,71,87,0.25)';
  ctx.beginPath(); ctx.arc(x, y, 30 * pulse, 0, Math.PI * 2); ctx.fill();
  // Bouncing beacon diamond above the marker.
  const by = y - 52 - Math.sin(game.world.time * 3) * 8;
  ctx.fillStyle = PAL.marker;
  ctx.save();
  ctx.translate(x, by); ctx.rotate(Math.PI / 4);
  ctx.fillRect(-9, -9, 18, 18);
  ctx.restore();
  ctx.strokeStyle = PAL.markerRing; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x, by + 10); ctx.stroke();
  // Off-screen direction arrow at the screen edge.
  if (x < 0 || x > CFG.canvasW || y < 0 || y > CFG.canvasH) {
    const cx = Math.max(40, Math.min(CFG.canvasW - 40, x));
    const cy = Math.max(90, Math.min(CFG.canvasH - 60, y));
    const a = Math.atan2(y - CFG.canvasH / 2, x - CFG.canvasW / 2);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = PAL.marker;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -11); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawPickups(ctx, game) {
  const cam = game.world.camera;
  for (const pk of game.world.pickups) {
    if (pk.taken) continue;
    const x = pk.x - cam.x; const y = pk.y - cam.y;
    const bob = Math.sin(game.world.time * 3 + pk.x) * 4;
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

function drawStartScreen(ctx, game) {
  const W = CFG.canvasW; const H = CFG.canvasH;
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
  ctx.fillStyle = '#ffd23f';
  for (let i = 0; i < 40; i++) {
    const tx = 70 + (i * 97) % 1150;
    const ty = base - 40 - (i * 53) % 220;
    ctx.fillRect(tx, ty, 6, 8);
  }
  ctx.fillStyle = '#123';
  ctx.fillRect(0, H - 90, W, 90);
  ctx.fillStyle = '#1f6f9e';
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
  const blink = Math.sin(game.world.time * 4) > -0.2;
  if (blink) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 30px system-ui';
    ctx.fillText('— PRESS ENTER TO START —', W / 2, 520);
  }
  ctx.font = '14px system-ui';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('A fully original game. Sunset Bay, Rico, the SBPD and every character are invented for this game.', W / 2, H - 40);
  ctx.textAlign = 'left';
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, CFG.canvasW, CFG.canvasH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', CFG.canvasW / 2, CFG.canvasH / 2 - 10);
  ctx.font = '18px system-ui';
  ctx.fillText('Press P to resume · progress is saved', CFG.canvasW / 2, CFG.canvasH / 2 + 30);
  ctx.textAlign = 'left';
}

function drawGameOver(ctx, game) {
  ctx.fillStyle = 'rgba(20,0,0,0.6)';
  ctx.fillRect(0, 0, CFG.canvasW, CFG.canvasH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 52px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('BUSTED!', CFG.canvasW / 2, CFG.canvasH / 2 - 40);
  ctx.font = '20px system-ui';
  ctx.fillText('The SBPD caught up with you. Rico paid your bail — $200.', CFG.canvasW / 2, CFG.canvasH / 2 + 4);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 24px system-ui';
  ctx.fillText('Press ENTER to get back out there', CFG.canvasW / 2, CFG.canvasH / 2 + 52);
  ctx.textAlign = 'left';
}
