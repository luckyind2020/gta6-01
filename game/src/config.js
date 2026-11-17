// Sunset Bay — tuning constants and palette. One place for every number
// the rest of the game shares, so balancing is a single-file edit.
export const CFG = {
  canvasW: 1280,
  canvasH: 720,
  worldW: 3400,
  worldH: 2600,
  block: 340,          // city block pitch (streets every 340px)
  streetW: 96,         // street width
  playerRadius: 13,
  playerWalk: 235,
  playerRun: 330,
  carAccel: 520,
  carMaxSpeed: 430,
  carReverse: 170,
  carTurn: 2.9,
  carBrake: 700,
  trafficCount: 14,
  pedCount: 26,
  wantedDecay: 9,      // seconds of calm to drop one star
  maxWanted: 5,
  saveKey: 'sunset-bay-save-v1',
};

export const PAL = {
  grass: '#2e6b34',
  grassDark: '#27592d',
  road: '#33363d',
  roadEdge: '#454a55',
  lane: '#e8d44d',
  sidewalk: '#8a8f98',
  sand: '#e8c97a',
  sea: '#1f6f9e',
  seaDeep: '#155a85',
  buildingRoof: ['#c96a4a', '#4a7ec9', '#c9a44a', '#7a4ac9', '#4ac9a0', '#c94a7a', '#8a6a4a', '#5a8ac9'],
  palm: '#2f7a3a',
  trunk: '#7a5a34',
  player: '#ffd23f',
  playerShirt: '#e74c3c',
  cop: '#2f6fd0',
  thug: '#8e44ad',
  pedShirt: ['#e67e22', '#1abc9c', '#9b59b6', '#f1c40f', '#ecf0f1', '#e74c3c'],
  carBody: ['#d63031', '#0984e3', '#fdcb6e', '#00b894', '#e84393', '#6c5ce7', '#dfe6e9', '#2d3436'],
  policeCar: '#1e5fd0',
  taxi: '#f7c948',
  hudBg: 'rgba(8,12,24,0.72)',
  hudText: '#ffffff',
  gold: '#ffd23f',
  star: '#ffd23f',
  starEmpty: 'rgba(255,255,255,0.35)',
  marker: '#ff4757',
  markerRing: '#ffffff',
  minimapBg: 'rgba(6,10,20,0.78)',
  minimapRoad: '#5a6270',
  minimapWater: '#1f6f9e',
};

export const MISSION_REWARDS = [400, 900, 1200, 2000, 5000];
export const START_CASH = 150;
export const START_HEALTH = 100;
