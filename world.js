export const REGIONS = [
  { id: 'pinefall', name: 'Pinefall Reach', shop: 'Pinefall Forge', motif: '✧', color: '#83dcb5',
    detail: 'Ancient pines hide the first of the old gates.', cost: 60,
    foes: ['Brambleback', 'Hollow Stag', 'The Thornwarden'] },
  { id: 'emberglass', name: 'Emberglass Basin', shop: 'Emberglass Kiln', motif: '✦', color: '#ffab78',
    detail: 'Ash coats the glass roads under a restless caldera.', cost: 90,
    foes: ['Cinderwing', 'Obsidian Ram', 'The Furnace Drake'] },
  { id: 'moonfen', name: 'Moonfen Hollow', shop: 'Moonfen Foundry', motif: '☽', color: '#c3afff',
    detail: 'Marsh lights lead to the observatory beneath the water.', cost: 120,
    foes: ['Mirefang', 'Gloam Moth', 'The Pale Oracle'] },
];

export const JOBS = {
  mine: { name: 'Mining', time: 60, yield: '2 ore + 1 skill XP per minute' },
  scout: { name: 'Scouting', time: 90, yield: '3 gold + 1 skill XP per 90 seconds' },
  forage: { name: 'Foraging', time: 45, yield: '1 ore + 2 skill XP per 45 seconds' }
};
export const TACTICS = {
  strike: { name: 'Assault', info: 'Your partner adds damage.' },
  guard: { name: 'Bulwark', info: 'Your partner softens incoming attacks.' },
  mend: { name: 'Mender', info: 'Your partner restores health.' },
};

export function randomSeed() {
  return (crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646) + 1;
}
function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x = (1664525 * x + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
const families = [
  ['Vesper', 'Striker', 'flare', 'A fast burst breaks the enemy’s charge.'],
  ['Mosskin', 'Guardian', 'ward', 'A living shield softens the next attack.'],
  ['Lantern', 'Mender', 'bloom', 'A warm pulse restores health mid-fight.'],
  ['Duskhorn', 'Striker', 'flare', 'A headlong charge breaks the enemy’s focus.'],
  ['Gloamcat', 'Guardian', 'ward', 'An ethereal veil protects the pair.'],
  ['Mistwing', 'Mender', 'bloom', 'Silver dust closes fresh wounds.']
];
const first = ['Ash', 'Briar', 'Moon', 'Flint', 'Fern', 'Copper', 'Thistle', 'Dusk', 'Frost', 'Rain', 'Wisp', 'Rowan'];
const second = ['whisker', 'spark', 'shade', 'paw', 'wing', 'step', 'glow', 'thorn', 'bloom', 'crest', 'song'];
const patterns = ['Speckled', 'Ringed', 'Streaked', 'Crowned', 'Mottled', 'Twin-marked'];

export function petSeed(seed, index) {
  return ((Math.imul(seed, 48271) ^ Math.imul(index + 1, 2654435761)) >>> 0) % 2147483646 + 1;
}
export function makePet(seed) {
  const rand = rng(seed);
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const familyIndex = Math.floor(rand() * families.length);
  const [family, role, move, note] = families[familyIndex];
  const hue = Math.floor(rand() * 360);
  const roll = rand();
  const rarity = roll > .965 ? 'Mythic' : roll > .78 ? 'Uncommon' : 'Wild';
  const size = Math.round(rand() * 10) + 10;
  return { seed, family, familyIndex, role, move, note, hue, rarity, size,
    name: pick(first) + pick(second), pattern: pick(patterns),
    power: 7 + Math.floor(rand() * 8) + (rarity === 'Mythic' ? 4 : 0),
    heart: 6 + Math.floor(rand() * 10), speed: 6 + Math.floor(rand() * 11) };
}
const fronts = [
  ['Lantern Hour', 'Companion ability recharges faster.', 'haste'],
  ['Iron Fog', 'Guard blocks more incoming damage.', 'guard'],
  ['Ash Winds', 'Heavy attacks hit harder.', 'strike'],
  ['Still Watch', 'A calm spell. Encounters use standard combat rules.', 'calm'],
  ['Bloomtide', 'Start encounters with extra vitality.', 'health']
];
export function worldAt(millis, place = 0) {
  const interval = 15 * 60 * 1000;
  const slot = Math.floor(millis / interval);
  const [name, description, effect] = fronts[(slot + 2 * place) % fronts.length];
  return { name, description, effect, ends: (slot + 1) * interval };
}
export function pendingWork(wallet, now = Date.now()) {
  if (!wallet?.tick) return 0;
  return Math.max(0, Math.min(24, Math.floor((now - wallet.tick.toMillis()) / (JOBS[wallet.job].time * 1000))));
}

export class Encounter {
  constructor({ pet, region, tier, gear, weather, tactic, raid }) {
    const hp = 93 + pet.heart * 2 + (weather === 'health' ? 20 : 0);
    const foe = raid ? 260 : 78 + region * 33 + tier * 24;
    Object.assign(this, { pet, region, tier, gear: Math.min(gear, 3), weather, tactic, raid,
      hp, maxHp: hp, foe, maxFoe: foe, energy: 100, time: 0, spent: -5, petAt: 0, guardUntil: 0,
      dodgeUntil: 0, nextHit: 3.2, windup: .82, lastAid: 0, phase: 0, done: '', event: null,
      seconds: raid ? 40 : 34, dealt: 0, hits: 0 });
  }

  advance(delta) {
    if (this.done) return;
    this.time += delta;
    this.energy = Math.min(100, this.energy + delta * 15);
    if (this.tactic && this.time - this.lastAid >= 5) {
      this.lastAid = this.time;
      if (this.tactic === 'strike') this.damage(9, 'Ally strike');
      if (this.tactic === 'guard') this.guardUntil = Math.max(this.guardUntil, this.time + 1.6);
      if (this.tactic === 'mend') this.hp = Math.min(this.maxHp, this.hp + 12);
      if (this.done) return;
    }
    if (this.time >= this.nextHit) {
      const heavy = this.phase % 3 === 2;
      const raw = (heavy ? 30 : 14) + 5 * this.region + 4 * this.tier;
      const scale = this.dodgeUntil >= this.time ? 0 : this.guardUntil >= this.time ? (this.weather === 'guard' ? .15 : .32) : 1;
      const hit = Math.round(raw * scale);
      this.hp = Math.max(0, this.hp - hit);
      this.hits += Number(hit > 0);
      this.emit(hit ? 'hurt' : 'dodge', hit ? '−' + hit : 'Evaded');
      this.phase += 1;
      this.nextHit += heavy ? 3.1 : 2.65;
      this.windup = this.phase % 3 === 2 ? 1.2 : .82;
    }
    if (this.hp === 0 || this.time >= this.seconds) this.done = 'lost';
  }

  act(action) {
    if (this.done) return false;
    const costs = { strike: 20, heavy: 38, guard: 15, dodge: 21, pet: 0 };
    const cost = costs[action];
    if (cost === undefined || this.energy < cost || this.time - this.spent < .34 ||
        (action === 'pet' && this.time < this.petAt)) return false;
    this.spent = this.time;
    this.energy -= cost;
    if (action === 'strike') this.damage(10 + this.gear * 3, 'Strike');
    if (action === 'heavy') {
      const charging = this.nextHit - this.time <= this.windup;
      if (charging) this.nextHit += 1.3;
      this.damage(22 + this.gear * 4 + (this.weather === 'strike' ? 5 : 0), charging ? 'Interrupted' : 'Heavy blow');
    }
    if (action === 'guard') {
      this.guardUntil = this.time + 1.35;
      this.emit('guard', 'Guard up');
    }
    if (action === 'dodge') {
      this.dodgeUntil = this.time + .75;
      this.emit('dodge', 'Dodge');
    }
    if (action === 'pet') {
      this.petAt = this.time + Math.max(4, (this.weather === 'haste' ? 7 : 10) - this.pet.speed / 5);
      if (this.pet.move === 'flare') {
        if (this.nextHit - this.time < this.windup) this.nextHit += 1.2;
        this.damage(19 + this.pet.power, this.pet.name);
      } else if (this.pet.move === 'ward') {
        this.guardUntil = this.time + 3.35;
        this.damage(this.pet.power, this.pet.name);
      } else {
        this.hp = Math.min(this.maxHp, this.hp + 19 + this.pet.heart);
        this.emit('guard', 'Mended');
      }
    }
    return true;
  }

  damage(n, label) {
    this.dealt += Math.min(n, this.foe);
    this.foe = Math.max(0, this.foe - n);
    this.emit('hit', label + ' · ' + n);
    if (!this.foe) this.done = 'won';
  }

  emit(kind, label) {
    this.event = { kind, label };
  }
}
