// Sunset Bay — tuning numbers and the sunset palette.
// Every number the rest of the game shares lives here, so balancing
// the game is a one-file job. Nothing here draws or moves anything.
export const TUNE = {
  viewW: 1280,
  viewH: 720,
  mapW: 3400,
  mapH: 2600,
  blockStep: 340, // distance between street centrelines
  roadW: 96, // street width
  heroR: 13,
  footWalk: 235, // on-foot walk speed, px/s
  footSprint: 330, // on-foot run speed while Shift is held
  carPush: 520, // car acceleration
  carTop: 430, // car top speed
  carBack: 170, // reverse top speed
  carSteer: 2.9, // car turn rate
  carStop: 700, // braking strength
  carsMoving: 14, // traffic cars with drivers
  walkers: 26, // pedestrians on the sidewalks
  calmDrop: 9, // quiet seconds needed to lose one wanted star
  heatMax: 5,
  saveName: 'sunset-bay-save-v2',
  stepHz: 60,
};

export const INK = {
  lawn: '#2e6b34',
  lawnDark: '#27592d',
  park: '#3f8f3a',
  parkPond: '#57a84e',
  asphalt: '#33363d',
  kerb: '#454a55',
  dash: '#e8d44d',
  pavement: '#8a8f98',
  sand: '#e8c97a',
  sea: '#1f6f9e',
  seaDeep: '#155a85',
  roofs: ['#c96a4a', '#4a7ec9', '#c9a44a', '#7a4ac9', '#4ac9a0', '#c94a7a', '#8a6a4a', '#5a8ac9'],
  palmLeaf: '#2f7a3a',
  palmTrunk: '#7a5a34',
  hero: '#ffd23f',
  heroTop: '#e74c3c',
  skin: '#f5c99b',
  skinDark: '#e8b98a',
  copBlue: '#2f6fd0',
  copHat: '#0b2a5e',
  goon: '#8e44ad',
  walkerTops: ['#e67e22', '#1abc9c', '#9b59b6', '#f1c40f', '#ecf0f1', '#e74c3c'],
  paintJobs: ['#d63031', '#0984e3', '#fdcb6e', '#00b894', '#e84393', '#6c5ce7', '#dfe6e9', '#2d3436'],
  cruiser: '#1e5fd0',
  cab: '#f7c948',
  panel: 'rgba(8,12,24,0.72)',
  paper: '#ffffff',
  gold: '#ffd23f',
  starLit: '#ffd23f',
  starDim: 'rgba(255,255,255,0.35)',
  pin: '#ff4757',
  pinRing: '#ffffff',
  mapPanel: 'rgba(6,10,20,0.78)',
  mapRoad: '#5a6270',
  mapSea: '#1f6f9e',
  neonPink: '#ff5fa2',
};

// Cash paid out when each of Rico's five jobs is finished.
export const JOB_PAY = [400, 900, 1200, 2000, 5000];
export const POCKET_START = 150;
export const HEALTH_START = 100;
