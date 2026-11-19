// Deterministic staged scenes for screenshots: ?shot=start|drive|chase|mission
// (plus &seed=N). Each one builds a full game state with the player, cars,
// cops and mission marker arranged so one still frame shows a whole system
// at once. The same seed always stages the same scene.

import { mulberry, pickInt } from './util.js';
import { buildCity, randomRoadPoint, randomSidewalkPoint } from './city.js';
import { makePlayer, makePed, makeThug, makeOfficer } from './actors.js';
import { makeCar, makeParkedCars, makeTrafficCar } from './vehicles.js';
import { makeWanted, commitCrime } from './police.js';
import { makeMissionState, MISSIONS, makeBags } from './missions.js';

export function stageScene(kind, seed) {
  const rng = mulberry(seed * 7919 + 13);
  const city = buildCity(seed);
  const G = {
    city,
    seed,
    time: 0,
    cash: 1250,
    bestStars: 0,
    bailPaid: 0,
    screen: 'play',
    wanted: makeWanted(),
    missions: makeMissionState(),
    player: null,
    cars: [],
    cruisers: [],
    peds: [],
    thugs: [],
    officers: [],
    smoke: [],
    toast: '',
    toastT: 0,
    cam: { x: 1520, y: 960 },
    objectiveText: '',
    marker: null,
  };

  // A lively street: parked cars and walkers everywhere.
  G.cars = makeParkedCars(rng, city, 14);
  for (let i = 0; i < 9; i++) {
    const t = makeTrafficCar(rng, city);
    G.cars.push(t);
  }
  for (let i = 0; i < 22; i++) G.peds.push(makePed(rng, city));

  if (kind === 'start') {
    G.screen = 'title';
    G.player = makePlayer(1520, 960);
    G.cash = 0;
    G.player.cash = 0;
    G.cam = { x: 1520, y: 960 };
    G.objectiveText = '';
    return G;
  }

  if (kind === 'drive') {
    const p = randomRoadPoint(rng, city);
    const car = makeCar(6, p.x, p.y, p.angle); // Turbo GT
    car.driver = 'player';
    car.speed = 420;
    G.cars.push(car);
    G.player = makePlayer(p.x, p.y);
    G.player.inCar = car;
    G.player.cash = 1250;
    G.cash = 1250;
    G.cam = { x: p.x + 120, y: p.y };
    G.missions.index = 1; // getaway in progress
    G.objectiveText = 'Getaway Driver: reach the garage — 58s left';
    const m = MISSIONS[1];
    G.marker = m.marker;
    return G;
  }

  if (kind === 'chase') {
    const p = randomRoadPoint(rng, city);
    const car = makeCar(0, p.x, p.y, p.angle); // Sunset Coupe
    car.driver = 'player';
    car.speed = 500;
    car.skid = 0.2;
    G.cars.push(car);
    G.player = makePlayer(p.x, p.y);
    G.player.inCar = car;
    G.cash = 2750;
    commitCrime(G.wanted, 62, 'joyride');
    G.bestStars = 3;
    // Three cruisers closing in from different sides.
    const spots = [
      { x: p.x - 260, y: p.y - 120 },
      { x: p.x + 200, y: p.y + 180 },
      { x: p.x - 80, y: p.y + 260 },
    ];
    for (const s of spots) {
      const c = makeCar(10, s.x, s.y, 0);
      c.driver = 'police';
      c.siren = true;
      c.speed = 480;
      G.cruisers.push(c);
    }
    const off = makeOfficer(p.x + 160, p.y - 60);
    G.officers.push(off);
    G.cam = { x: p.x + 60, y: p.y };
    G.missions.index = 4;
    G.objectiveText = 'The Big Escape: reach Rico\u2019s boat on the beach!';
    G.marker = MISSIONS[4].marker;
    G.toast = 'The heat is on — lose them!';
    G.toastT = 99;
    return G;
  }

  // mission: on foot in the park, two bags already collected.
  G.player = makePlayer(1920, 1310);
  G.cash = 1700;
  G.missions.index = 3;
  G.missions.bagsGot = 2;
  G.missions.bags = makeBags(rng);
  G.missions.bags[0].taken = true;
  G.missions.bags[1].taken = true;
  G.objectiveText = 'Cash Bags: 2/3 bags';
  G.marker = MISSIONS[3].marker;
  // Two thugs from the earlier brawl hanging around the park edge.
  G.thugs.push(makeThug(rng, 1780, 1180));
  G.thugs.push(makeThug(rng, 2080, 1420));
  G.cam = { x: 1920, y: 1310 };
  return G;
}
