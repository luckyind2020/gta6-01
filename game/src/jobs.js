// Rico's jobs: five runs for the fixer who owns Sunset Bay, told in
// short dialogue lines. Each job is a chain of legs (reach a pin,
// grab a bag, knock out goons, outrun the SBPD). Finishing one pays
// cash and opens the next; finishing all five crowns the hero King
// of Sunset Bay.
import { TUNE, JOB_PAY } from './tune.js';
import { cashChime, grabBlip, jobDoneTune } from './sound.js';

export const FIXER = {
  name: 'Rico',
  opener: 'New in Sunset Bay? Rico runs this town. Do his jobs, get paid, stay out of jail.',
};

function pinAt(bay, col, row) {
  return {
    x: bay.vStreets[Math.min(col, bay.vStreets.length - 1)],
    y: bay.hStreets[Math.min(row, bay.hStreets.length - 1)],
  };
}

export function scriptJobs(bay) {
  const p = (col, row) => pinAt(bay, col, row);
  return [
    {
      id: 1, name: 'Sunset Pickup',
      brief: 'Rico: "Grab the package at the marina kiosk, drop it at the hotel. Easy money."',
      legs: [
        { kind: 'goto', at: p(7, 6), line: 'Pick up the package at the marina kiosk' },
        { kind: 'goto', at: p(2, 1), line: 'Deliver the package to the Sunset Hotel' },
      ],
    },
    {
      id: 2, name: 'Getaway Driver',
      brief: 'Rico: "The crew needs wheels. Steal a car — any car — and bring it to the garage. Cops will notice."',
      legs: [
        { kind: 'steal', at: p(4, 3), line: 'Steal a car (press E near one)' },
        { kind: 'goto', at: p(1, 5), line: 'Deliver the car to Rico\u2019s garage — lose the cops' },
      ],
    },
    {
      id: 3, name: 'Beachside Brawl',
      brief: 'Rico: "The Wave Riders think the beach is theirs. Show them it isn\u2019t. Fists only."',
      legs: [
        { kind: 'brawl', at: p(5, 7), line: 'Knock out 3 Wave Riders on the beach (Space to punch)' },
      ],
    },
    {
      id: 4, name: 'The Big Score',
      brief: 'Rico: "Three cash bags, three corners of town. Grab them all before the SBPD locks the streets down."',
      legs: [
        { kind: 'collect', at: p(1, 1), line: 'Grab cash bag 1 of 3' },
        { kind: 'collect', at: p(7, 2), line: 'Grab cash bag 2 of 3' },
        { kind: 'collect', at: p(3, 6), line: 'Grab cash bag 3 of 3' },
      ],
    },
    {
      id: 5, name: 'King of Sunset Bay',
      brief: 'Rico: "One last run. The whole SBPD will be on you. Reach the marina alive and this city is yours."',
      legs: [
        { kind: 'escape', at: p(7, 6), line: 'Reach the marina with the SBPD on your tail' },
      ],
    },
  ];
}

export function newJobBook(jobs) {
  return {
    jobs,
    index: 0, // current job
    leg: 0, // current leg within it
    goonsLeft: 0,
    done: false,
    banner: '',
    bannerFor: 0,
    line: FIXER.opener,
    lineFor: 6,
  };
}

export function jobNow(book) {
  if (book.index >= book.jobs.length) return null;
  return book.jobs[book.index];
}

export function legNow(book) {
  const j = jobNow(book);
  return j ? j.legs[book.leg] : null;
}

export function flashBanner(book, text, secs = 3) {
  book.banner = text;
  book.bannerFor = secs;
}

export function openJob(book, session, hero) {
  const j = jobNow(book);
  if (!j) return;
  book.line = j.brief;
  book.lineFor = 6;
  flashBanner(book, `MISSION ${j.id}: ${j.name}`, 3.5);
  const leg = legNow(book);
  if (leg && leg.kind === 'brawl') {
    book.goonsLeft = 3;
    callGoons(session, leg.at);
  }
  if (leg && leg.kind === 'escape') {
    if (session.heat && session.heat.stars < 3) session.heat.stars = 3;
  }
  if (leg && (leg.kind === 'collect' || leg.kind === 'goto')) {
    session.pickups.push({ x: leg.at.x, y: leg.at.y, kind: leg.kind === 'collect' ? 'cash' : 'package', taken: false });
  }
}

function callGoons(session, at) {
  session.goons = [];
  for (let i = 0; i < 3; i += 1) {
    session.goons.push({
      x: at.x + (i - 1) * 70, y: at.y + (i % 2) * 50 - 20,
      angle: 0, health: 3, top: '#8e44ad', speed: 120, swingIn: 0,
    });
  }
}

// Move the job forward when the hero meets the current leg.
// Returns the cash earned (0 when nothing finished).
export function tickJobs(book, session, hero, heat, dt) {
  book.bannerFor = Math.max(0, book.bannerFor - dt);
  book.lineFor = Math.max(0, book.lineFor - dt);
  const j = jobNow(book);
  if (!j) { book.done = true; return 0; }
  const leg = legNow(book);
  if (!leg) return 0;
  const d = Math.hypot(hero.x - leg.at.x, hero.y - leg.at.y);

  if (leg.kind === 'goto' || leg.kind === 'escape') {
    if (d < 64) return finishLeg(book, session, hero, heat);
  } else if (leg.kind === 'steal') {
    if (hero.ride) return finishLeg(book, session, hero, heat);
  } else if (leg.kind === 'collect') {
    const pk = session.pickups.find((p) => !p.taken && p.kind === 'cash');
    if (pk && Math.hypot(hero.x - pk.x, hero.y - pk.y) < 52) {
      pk.taken = true;
      grabBlip();
      return finishLeg(book, session, hero, heat);
    }
  } else if (leg.kind === 'brawl') {
    if (book.goonsLeft <= 0) return finishLeg(book, session, hero, heat);
  }
  return 0;
}

function finishLeg(book, session, hero, heat) {
  const j = jobNow(book);
  book.leg += 1;
  grabBlip();
  // Clear this leg's pickup; the next leg places a fresh one.
  session.pickups = [];
  if (book.leg >= j.legs.length) {
    const pay = JOB_PAY[book.index] || 500;
    hero.cash += pay;
    jobDoneTune();
    flashBanner(book, `MISSION COMPLETE — +$${pay}`, 4);
    book.index += 1;
    book.leg = 0;
    if (book.index >= book.jobs.length) {
      book.done = true;
      flashBanner(book, 'KING OF SUNSET BAY — you own this city!', 6);
      return pay;
    }
    openJob(book, session, hero);
    return pay;
  }
  // Next leg setup.
  const leg = legNow(book);
  if (leg.kind === 'brawl') { book.goonsLeft = 3; callGoons(session, leg.at); }
  if (leg.kind === 'collect' || leg.kind === 'goto') {
    session.pickups.push({ x: leg.at.x, y: leg.at.y, kind: leg.kind === 'collect' ? 'cash' : 'package', taken: false });
  }
  if (leg.kind === 'escape' && heat) heat.stars = Math.max(heat.stars, 3);
  return 0;
}

// A punch lands on goons (and officers nearby, which heats things up).
export function swingAt(book, session, hero, heat) {
  const px = hero.x + Math.cos(hero.angle) * 30;
  const py = hero.y + Math.sin(hero.angle) * 30;
  let landed = false;
  for (const goon of session.goons) {
    if (Math.hypot(goon.x - px, goon.y - py) < 42) {
      goon.health -= 1;
      goon.x += Math.cos(hero.angle) * 26;
      goon.y += Math.sin(hero.angle) * 26;
      landed = true;
      if (goon.health <= 0) {
        session.goons = session.goons.filter((g) => g !== goon);
        book.goonsLeft = Math.max(0, book.goonsLeft - 1);
        cashChime();
      }
    }
  }
  for (const cop of session.officers) {
    if (Math.hypot(cop.x - px, cop.y - py) < 42) {
      cop.x += Math.cos(hero.angle) * 40;
      cop.y += Math.sin(hero.angle) * 40;
      landed = true;
      if (heat) heat.stars = Math.min(5, heat.stars + 1);
    }
  }
  return landed;
}

export function tickGoons(session, hero, dt) {
  for (const goon of session.goons) {
    const d = Math.hypot(hero.x - goon.x, hero.y - goon.y);
    const want = Math.atan2(hero.y - goon.y, hero.x - goon.x);
    goon.angle = want;
    if (d > 30) {
      goon.x += Math.cos(want) * goon.speed * dt;
      goon.y += Math.sin(want) * goon.speed * dt;
    } else {
      goon.swingIn -= dt;
      if (goon.swingIn <= 0) {
        goon.swingIn = 0.9;
        hero.health -= 6;
        hero.painFlash = 0.3;
      }
    }
  }
}
