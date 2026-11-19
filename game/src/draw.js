// World rendering: the camera, the ground (grass, roads, sand, sea), parks,
// buildings, palms, cars, people, mission markers and skid smoke. Canvas 2D,
// drawn shapes only — no image assets.

import { clamp } from './util.js';
import { BEACH_TOP, SEA_TOP } from './city.js';

function drawPalm(ctx, x, y, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#6b4a2a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(3, -12, 0, -22);
  ctx.stroke();
  ctx.strokeStyle = '#3f8f4f';
  ctx.lineWidth = 3;
  const sway = Math.sin(t * 1.3 + x * 0.01) * 0.12;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.55 + sway;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(Math.cos(a) * 14, -22 + Math.sin(a) * 14, Math.cos(a) * 22, -22 + Math.sin(a) * 22 + 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCarShape(ctx, car, t) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const L = 46;
  const W = 22;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-L / 2 + 3, -W / 2 + 4, L, W);
  // Body.
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -W / 2, L, W, 7);
  ctx.fill();
  // Cabin + windows.
  ctx.fillStyle = 'rgba(20, 30, 46, 0.85)';
  ctx.beginPath();
  ctx.roundRect(-L / 2 + 10, -W / 2 + 4, L - 22, W - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(160, 210, 255, 0.7)';
  ctx.fillRect(-L / 2 + 13, -W / 2 + 6, 8, W - 12);
  // Headlights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(L / 2 - 3, -W / 2 + 2, 3, 5);
  ctx.fillRect(L / 2 - 3, W / 2 - 7, 3, 5);
  // Brake lights.
  if (car.brakeLight) {
    ctx.fillStyle = '#ff2a2a';
    ctx.fillRect(-L / 2, -W / 2 + 2, 3, 5);
    ctx.fillRect(-L / 2, W / 2 - 7, 3, 5);
  }
  // Siren bar on police cruisers.
  if (car.siren) {
    const on = Math.floor(t * 6) % 2 === 0;
    ctx.fillStyle = on ? '#ff2a2a' : '#2a6bff';
    ctx.fillRect(-6, -W / 2 + 2, 12, 5);
    ctx.fillStyle = on ? '#2a6bff' : '#ff2a2a';
    ctx.fillRect(-6, W / 2 - 7, 12, 5);
  }
  // Wreck smoke.
  if (car.wrecked) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(-6, -4, 7 + Math.sin(t * 5) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPersonShape(ctx, p, t, isPlayer) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = p.shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = p.skin || '#f0c08a';
  ctx.beginPath();
  ctx.arc(7, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick.
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, -3);
  ctx.lineTo(15, 0);
  ctx.lineTo(10, 3);
  ctx.stroke();
  if (isPlayer) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // Punch arc flash.
  if (p.punchArc > 0) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(255, 220, 80, ' + (p.punchArc * 1.6) + ')';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 34, -0.7, 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function drawWorld(ctx, view, G, t) {
  const cam = G.cam;
  const zoom = view.zoom;
  ctx.save();
  ctx.fillStyle = '#79a85b';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.translate(view.w / 2 - cam.x * zoom, view.h / 2 - cam.y * zoom);
  ctx.scale(zoom, zoom);

  const vx0 = cam.x - view.w / 2 / zoom - 80;
  const vx1 = cam.x + view.w / 2 / zoom + 80;
  const vy0 = cam.y - view.h / 2 / zoom - 80;
  const vy1 = cam.y + view.h / 2 / zoom + 80;

  // Sand, then sea.
  ctx.fillStyle = '#e0c88f';
  ctx.fillRect(0, BEACH_TOP, G.city.w, G.city.h - BEACH_TOP);
  ctx.fillStyle = '#2a6db0';
  ctx.fillRect(0, SEA_TOP, G.city.w, G.city.h - SEA_TOP);
  // Animated wave line.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = Math.max(0, vx0); x < Math.min(G.city.w, vx1); x += 48) {
    const y = SEA_TOP + Math.sin(x * 0.02 + t * 1.6) * 4;
    if (x === Math.max(0, vx0)) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Parks.
  for (const park of G.city.parks) {
    if (park.x > vx1 || park.x + park.w < vx0 || park.y > vy1 || park.y + park.h < vy0) continue;
    ctx.fillStyle = '#4d8a44';
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.strokeStyle = '#3a6e35';
    ctx.lineWidth = 3;
    ctx.strokeRect(park.x, park.y, park.w, park.h);
  }

  // Roads: dark asphalt with centre dashes.
  ctx.fillStyle = '#3c4148';
  for (const rx of G.city.vRoads) {
    ctx.fillRect(rx - 55, 0, 110, BEACH_TOP);
  }
  for (const ry of G.city.hRoads) {
    ctx.fillRect(0, ry - 55, G.city.w, 110);
  }
  ctx.strokeStyle = 'rgba(255, 214, 90, 0.75)';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 22]);
  for (const rx of G.city.vRoads) {
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx, BEACH_TOP);
    ctx.stroke();
  }
  for (const ry of G.city.hRoads) {
    ctx.beginPath();
    ctx.moveTo(0, ry);
    ctx.lineTo(G.city.w, ry);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Buildings with roof + wall + windows.
  for (const b of G.city.buildings) {
    if (b.x > vx1 || b.x + b.w < vx0 || b.y > vy1 || b.y + b.h < vy0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.wall;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x, b.y, b.w, Math.min(18, b.h * 0.25));
    ctx.fillStyle = 'rgba(255, 240, 180, 0.85)';
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor(b.h / 36));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if ((c * 7 + r * 3 + b.floors) % 3 === 0) {
          ctx.fillRect(b.x + 10 + c * 34, b.y + 26 + r * 36, 12, 14);
        }
      }
    }
  }

  // Cash bags.
  for (const bag of G.missions.bags) {
    if (bag.taken) continue;
    ctx.save();
    ctx.translate(bag.x, bag.y + Math.sin(t * 3 + bag.x) * 3);
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 1);
    ctx.restore();
  }

  // Mission marker: pulsing pin + label.
  if (G.marker) {
    const pulse = 1 + Math.sin(t * 4) * 0.12;
    ctx.save();
    ctx.translate(G.marker.x, G.marker.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5b00';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#7a5b00';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, 1);
    ctx.restore();
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(G.marker.label, G.marker.x, G.marker.y - 26);
  }

  // Skid smoke behind the player's car.
  for (const s of G.smoke) {
    ctx.fillStyle = 'rgba(200,200,200,' + clamp(s.life, 0, 0.55) + ')';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 6 + (0.6 - s.life) * 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Palms.
  for (const palm of G.city.palms) {
    if (palm.x < vx0 || palm.x > vx1 || palm.y < vy0 || palm.y > vy1) continue;
    drawPalm(ctx, palm.x, palm.y, t);
  }

  // Cars: parked + traffic + cruisers + player's.
  for (const car of G.cars) {
    if (car.x < vx0 || car.x > vx1 || car.y < vy0 || car.y > vy1) continue;
    drawCarShape(ctx, car, t);
  }
  for (const car of G.cruisers) {
    drawCarShape(ctx, car, t);
  }

  // People.
  for (const ped of G.peds) {
    if (ped.x < vx0 || ped.x > vx1 || ped.y < vy0 || ped.y > vy1) continue;
    drawPersonShape(ctx, ped, t, false);
  }
  for (const thug of G.thugs) {
    if (thug.down) continue;
    drawPersonShape(ctx, thug, t, false);
  }
  for (const off of G.officers) {
    drawPersonShape(ctx, off, t, false);
  }
  if (!G.player.inCar) {
    drawPersonShape(ctx, G.player, t, true);
  }

  ctx.restore();
}

// Title / pause / busted overlays. `kind` is 'title' | 'pause' | 'busted'.
export function drawOverlay(ctx, view, kind, G) {
  const W = view.w;
  const H = view.h;
  ctx.save();
  ctx.fillStyle = kind === 'title' ? 'rgba(8, 10, 22, 0.72)' : 'rgba(8, 10, 22, 0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  if (kind === 'title') {
    // Sunset band.
    const grad = ctx.createLinearGradient(0, H * 0.18, 0, H * 0.56);
    grad.addColorStop(0, '#ff7a3d');
    grad.addColorStop(0.55, '#e23e8c');
    grad.addColorStop(1, '#5b2a86');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H * 0.18, W, H * 0.38);
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.47, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText('SUNSET BAY', W / 2, H * 0.28);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('An open-world crime game in the spirit of GTA 6', W / 2, H * 0.28 + 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('WASD drive & walk  •  E steal / exit car  •  SPACE punch / handbrake', W / 2, H * 0.62);
    ctx.fillText('Missions from Rico pay cash  •  Mind the wanted stars  •  P pause  •  M mute', W / 2, H * 0.62 + 28);
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#7de23e';
    ctx.fillText('Press ENTER to play', W / 2, H * 0.62 + 74);
    if (G.cash > 0 || G.missions.done.length > 0) {
      ctx.fillStyle = '#9fb3c8';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('Save found: ' + G.missions.done.length + ' jobs done, ' + G.cash + ' in cash — ENTER continues', W / 2, H * 0.62 + 106);
    }
  } else if (kind === 'pause') {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('PAUSED', W / 2, H / 2 - 20);
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('P or ESC to resume  •  ENTER restarts the run  •  M mute', W / 2, H / 2 + 18);
  } else if (kind === 'busted') {
    ctx.fillStyle = '#ff5a5a';
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.fillText('BUSTED!', W / 2, H / 2 - 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('The Sunset Bay PD caught you. Bail cost you ' + G.bailPaid + '.', W / 2, H / 2 + 8);
    ctx.fillText('Press ENTER to get back on the streets', W / 2, H / 2 + 38);
  }
  ctx.restore();
}
