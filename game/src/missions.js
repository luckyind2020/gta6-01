// Rico's five jobs, in order. Each mission has a marker on the map and a
// clear finish condition; finishing one pays cash and unlocks the next.
// The mission state is plain data so the boot loop can save it. No DOM here.

import { dist } from './util.js';

export const MISSIONS = [
  {
    id: 'pickup',
    name: 'The Pickup',
    brief: 'Rico needs a package from the docks. Walk to the yellow marker and grab it.',
    pay: 500,
    marker: { x: 3120, y: 2010, label: 'Docks' },
    radius: 46,
  },
  {
    id: 'getaway',
    name: 'Getaway Driver',
    brief: 'Cops are sniffing around. Steal any car and reach the garage before the timer runs out.',
    pay: 800,
    marker: { x: 320, y: 260, label: 'Garage' },
    radius: 60,
    timer: 75,
    needsCar: true,
  },
  {
    id: 'brawl',
    name: 'Alley Brawl',
    brief: 'Three of Rico\u2019s rivals are waiting in the alley. Put all three down with your fists.',
    pay: 1200,
    marker: { x: 1520, y: 960, label: 'Alley' },
    radius: 90,
    thugs: 3,
  },
  {
    id: 'bags',
    name: 'Cash Bags',
    brief: 'Three cash bags are stashed around the park. Collect them all.',
    pay: 1500,
    marker: { x: 1920, y: 1310, label: 'Park' },
    radius: 110,
    bags: 3,
  },
  {
    id: 'escape',
    name: 'The Big Escape',
    brief: 'Final job: reach Rico\u2019s boat on the beach while the heat is on. Lose the law or outrun it.',
    pay: 3000,
    marker: { x: 2320, y: 2330, label: 'Boat' },
    radius: 60,
  },
];

export function makeMissionState() {
  return {
    index: 0, // which mission is current; 5 means all done
    timerLeft: 0,
    bagsGot: 0,
    bags: [], // bag positions for the bags mission
    thugsDown: 0,
    done: [],
  };
}

export function currentMission(ms) {
  return ms.index < MISSIONS.length ? MISSIONS[ms.index] : null;
}

export function missionObjectiveText(ms) {
  const m = currentMission(ms);
  if (!m) return 'All jobs done — Sunset Bay is yours. Free roam!';
  if (m.id === 'bags') return m.name + ': ' + ms.bagsGot + '/' + m.bags + ' bags';
  if (m.id === 'brawl') return m.name + ': ' + ms.thugsDown + '/' + m.thugs + ' down';
  if (m.id === 'getaway' && ms.timerLeft > 0) return m.name + ': ' + Math.ceil(ms.timerLeft) + 's left';
  return m.name + ': ' + m.brief;
}

// Advance the mission clock. Returns an event string when something notable
// happens ('started', 'tick', 'complete', 'failed'), otherwise null.
// `world` carries { player, cars, thugs, bags } the mission reads.
export function stepMissions(ms, world, dt) {
  const m = currentMission(ms);
  if (!m) return null;
  if (ms.timerLeft === 0 && m.timer) {
    ms.timerLeft = m.timer;
    return 'started';
  }
  if (m.timer) {
    ms.timerLeft -= dt;
    if (ms.timerLeft <= 0) {
      ms.timerLeft = 0;
      return 'failed';
    }
  }
  if (m.id === 'pickup' || m.id === 'escape') {
    const p = world.player;
    if (p.inCar) {
      const c = p.inCar;
      if (dist(c.x, c.y, m.marker.x, m.marker.y) < m.radius) return 'complete';
    } else if (dist(p.x, p.y, m.marker.x, m.marker.y) < m.radius) {
      return 'complete';
    }
  }
  if (m.id === 'getaway') {
    const p = world.player;
    if (p.inCar && dist(p.inCar.x, p.inCar.y, m.marker.x, m.marker.y) < m.radius) return 'complete';
  }
  if (m.id === 'brawl') {
    const down = world.thugs.filter((t) => t.down).length;
    if (down !== ms.thugsDown) {
      ms.thugsDown = down;
      if (down >= m.thugs) return 'complete';
      return 'tick';
    }
  }
  if (m.id === 'bags') {
    for (const bag of ms.bags) {
      if (bag.taken) continue;
      const p = world.player;
      const px = p.inCar ? p.inCar.x : p.x;
      const py = p.inCar ? p.inCar.y : p.y;
      if (dist(px, py, bag.x, bag.y) < 42) {
        bag.taken = true;
        ms.bagsGot += 1;
        if (ms.bagsGot >= m.bags) return 'complete';
        return 'tick';
      }
    }
  }
  return null;
}

export function completeMission(ms) {
  const m = currentMission(ms);
  if (!m) return 0;
  ms.done.push(m.id);
  ms.index += 1;
  ms.timerLeft = 0;
  ms.bagsGot = 0;
  ms.bags = [];
  ms.thugsDown = 0;
  return m.pay;
}

export function failMission(ms) {
  // A failed timed mission restarts from its beginning.
  ms.timerLeft = 0;
  ms.bagsGot = 0;
  for (const b of ms.bags) b.taken = false;
  ms.thugsDown = 0;
}

// Bag spots for the cash-bags job, scattered around the park block.
export function makeBags(rng) {
  const spots = [
    { x: 1780, y: 1180 },
    { x: 2080, y: 1420 },
    { x: 1960, y: 1100 },
    { x: 1720, y: 1440 },
    { x: 2120, y: 1240 },
  ];
  const chosen = [];
  while (chosen.length < 3) {
    const s = spots[Math.floor(rng() * spots.length)];
    if (!chosen.includes(s)) chosen.push(s);
  }
  return chosen.map((s) => ({ x: s.x, y: s.y, taken: false }));
}
