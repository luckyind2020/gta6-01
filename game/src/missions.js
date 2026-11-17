// Missions and story: five jobs for Rico, a Sunset Bay fixer, told in
// short dialogue lines. Each mission is a chain of steps (go to a
// marker, pick up a bag, punch thugs, escape the police). Finishing
// one pays cash and unlocks the next; finishing all five crowns the
// player King of Sunset Bay.
import { CFG, MISSION_REWARDS } from './config.js';
import { blipCash, blipPickup, missionDoneSound } from './audio.js';

export const STORY = {
  fixer: 'Rico',
  intro: 'New in Sunset Bay? Rico runs this town. Do his jobs, get paid, stay out of jail.',
};

function markerAt(city, col, row) {
  return {
    x: city.streetXs[Math.min(col, city.streetXs.length - 1)],
    y: city.streetYs[Math.min(row, city.streetYs.length - 1)],
  };
}

export function buildMissions(city) {
  const m = (col, row) => markerAt(city, col, row);
  return [
    {
      id: 1, title: 'Sunset Pickup',
      brief: 'Rico: "Grab the package at the marina kiosk, drop it at the hotel. Easy money."',
      steps: [
        { type: 'goto', at: m(7, 6), text: 'Pick up the package at the marina kiosk' },
        { type: 'goto', at: m(2, 1), text: 'Deliver the package to the Sunset Hotel' },
      ],
    },
    {
      id: 2, title: 'Getaway Driver',
      brief: 'Rico: "The crew needs wheels. Steal a car — any car — and bring it to the garage. Cops will notice."',
      steps: [
        { type: 'steal', at: m(4, 3), text: 'Steal a car (press E near one)' },
        { type: 'goto', at: m(1, 5), text: 'Deliver the car to Rico\u2019s garage — lose the cops' },
      ],
    },
    {
      id: 3, title: 'Beachside Brawl',
      brief: 'Rico: "The Wave Riders think the beach is theirs. Show them it isn\u2019t. Fists only."',
      steps: [
        { type: 'brawl', at: m(5, 7), text: 'Knock out 3 Wave Riders on the beach (Space to punch)' },
      ],
    },
    {
      id: 4, title: 'The Big Score',
      brief: 'Rico: "Three cash bags, three corners of town. Grab them all before the SBPD locks the streets down."',
      steps: [
        { type: 'collect', at: m(1, 1), text: 'Grab cash bag 1 of 3' },
        { type: 'collect', at: m(7, 2), text: 'Grab cash bag 2 of 3' },
        { type: 'collect', at: m(3, 6), text: 'Grab cash bag 3 of 3' },
      ],
    },
    {
      id: 5, title: 'King of Sunset Bay',
      brief: 'Rico: "One last run. The whole SBPD will be on you. Reach the marina alive and this city is yours."',
      steps: [
        { type: 'escape', at: m(7, 6), text: 'Reach the marina with the SBPD on your tail' },
      ],
    },
  ];
}

export function createMissionState(missions) {
  return {
    missions,
    index: 0,            // current mission
    step: 0,             // current step within it
    brawlLeft: 0,
    done: false,
    banner: '',
    bannerTimer: 0,
    dialogue: STORY.intro,
    dialogueTimer: 6,
  };
}

export function currentMission(state) {
  if (state.index >= state.missions.length) return null;
  return state.missions[state.index];
}

export function currentStep(state) {
  const m = currentMission(state);
  return m ? m.steps[state.step] : null;
}

export function showBanner(state, text, secs = 3) {
  state.banner = text;
  state.bannerTimer = secs;
}

export function startMission(state, world, player) {
  const m = currentMission(state);
  if (!m) return;
  state.dialogue = m.brief;
  state.dialogueTimer = 6;
  showBanner(state, `MISSION ${m.id}: ${m.title}`, 3.5);
  const step = currentStep(state);
  if (step && step.type === 'brawl') {
    state.brawlLeft = 3;
    spawnThugs(world, step.at);
  }
  if (step && step.type === 'escape') {
    // Final mission starts hot.
    world.policeRef && world.policeRef.wanted < 3 && (world.policeRef.wanted = 3);
  }
  if (step && (step.type === 'collect' || step.type === 'goto')) {
    world.pickups.push({ x: step.at.x, y: step.at.y, kind: step.type === 'collect' ? 'cash' : 'package', taken: false });
  }
}

function spawnThugs(world, at) {
  world.thugs = [];
  for (let i = 0; i < 3; i++) {
    world.thugs.push({
      x: at.x + (i - 1) * 70, y: at.y + (i % 2) * 50 - 20,
      angle: 0, health: 3, shirt: '#8e44ad', speed: 120, punchCd: 0,
    });
  }
}

// Advance the mission when the player satisfies the current step.
// Returns the cash earned (0 when nothing completed).
export function updateMissions(state, world, player, police, dt) {
  state.bannerTimer = Math.max(0, state.bannerTimer - dt);
  state.dialogueTimer = Math.max(0, state.dialogueTimer - dt);
  const m = currentMission(state);
  if (!m) { state.done = true; return 0; }
  const step = currentStep(state);
  if (!step) return 0;
  const d = Math.hypot(player.x - step.at.x, player.y - step.at.y);

  if (step.type === 'goto' || step.type === 'escape') {
    if (d < 64) return completeStep(state, world, player, police);
  } else if (step.type === 'steal') {
    if (player.inCar) return completeStep(state, world, player, police);
  } else if (step.type === 'collect') {
    const pk = world.pickups.find((p) => !p.taken && p.kind === 'cash');
    if (pk && Math.hypot(player.x - pk.x, player.y - pk.y) < 52) {
      pk.taken = true;
      blipPickup();
      return completeStep(state, world, player, police);
    }
  } else if (step.type === 'brawl') {
    if (state.brawlLeft <= 0) return completeStep(state, world, player, police);
  }
  return 0;
}

function completeStep(state, world, player, police) {
  const m = currentMission(state);
  state.step += 1;
  blipPickup();
  // Clear this step's pickup marker (a fresh one is placed for the next step).
  world.pickups = [];
  if (state.step >= m.steps.length) {
    const reward = MISSION_REWARDS[state.index] || 500;
    player.cash += reward;
    missionDoneSound();
    showBanner(state, `MISSION COMPLETE — +$${reward}`, 4);
    state.index += 1;
    state.step = 0;
    if (state.index >= state.missions.length) {
      state.done = true;
      showBanner(state, 'KING OF SUNSET BAY — you own this city!', 6);
      return reward;
    }
    startMission(state, world, player);
    return reward;
  }
  // Next step setup.
  const step = currentStep(state);
  if (step.type === 'brawl') { state.brawlLeft = 3; spawnThugs(world, step.at); }
  if (step.type === 'collect' || step.type === 'goto') {
    world.pickups.push({ x: step.at.x, y: step.at.y, kind: step.type === 'collect' ? 'cash' : 'package', taken: false });
  }
  if (step.type === 'escape' && police) police.wanted = Math.max(police.wanted, 3);
  return 0;
}

// Punch resolution against thugs (and cops/peds nearby for wanted heat).
export function resolvePunch(state, world, player, police) {
  const px = player.x + Math.cos(player.angle) * 30;
  const py = player.y + Math.sin(player.angle) * 30;
  let hit = false;
  for (const thug of world.thugs) {
    if (Math.hypot(thug.x - px, thug.y - py) < 42) {
      thug.health -= 1;
      thug.x += Math.cos(player.angle) * 26;
      thug.y += Math.sin(player.angle) * 26;
      hit = true;
      if (thug.health <= 0) {
        world.thugs = world.thugs.filter((t) => t !== thug);
        state.brawlLeft = Math.max(0, state.brawlLeft - 1);
        blipCash();
      }
    }
  }
  for (const cop of world.footCops) {
    if (Math.hypot(cop.x - px, cop.y - py) < 42) {
      cop.x += Math.cos(player.angle) * 40;
      cop.y += Math.sin(player.angle) * 40;
      hit = true;
      if (police) police.wanted = Math.min(5, police.wanted + 1);
    }
  }
  return hit;
}

export function updateThugs(world, player, dt) {
  for (const thug of world.thugs) {
    const d = Math.hypot(player.x - thug.x, player.y - thug.y);
    const want = Math.atan2(player.y - thug.y, player.x - thug.x);
    thug.angle = want;
    if (d > 30) {
      thug.x += Math.cos(want) * thug.speed * dt;
      thug.y += Math.sin(want) * thug.speed * dt;
    } else {
      thug.punchCd -= dt;
      if (thug.punchCd <= 0) {
        thug.punchCd = 0.9;
        player.health -= 6;
        player.hurtFlash = 0.3;
      }
    }
  }
}
