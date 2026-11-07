// BATCH 4 — expanded marketplace data. Pure data + the stat merge used by opStats (src/opstats.js).
// New armour/optics/muzzles are appended to the existing data.js arrays so the squad editor, old armory and
// mission spawning all see them. New slots (helmet, NVG, grip, magazine) live on the operator as o.helmet,
// o.nvg, o.grip, o.mag and are merged in gearMods(). New consumables live in save.stock like the old gadgets.
import { ATTACHMENTS, ARMOR } from './data.js';

const NEW_ATT = [
  { id: 'flashhider', slot: 'muzzle', name: 'Flash hider', desc: '+3% accuracy, noise x0.95', price: 200, stars: 0, m: { acc: 1.03, noise: 0.95 }, look: 'compensator' },
  { id: 'brake', slot: 'muzzle', name: 'Muzzle brake', desc: '+10% accuracy, +25% noise', price: 450, stars: 2, m: { acc: 1.1, noise: 1.25 }, look: 'compensator' },
  { id: 'heavysup', slot: 'muzzle', name: 'Heavy suppressor', desc: 'Noise x0.18, damage -12%, range -5%', price: 1200, stars: 5, m: { noise: 0.18, dmg: 0.88, range: 0.95 }, look: 'suppressor' },
  { id: 'prism', slot: 'optic', name: 'Prism 2.5x', desc: '+15% range, +4% accuracy, reactions 8% faster', price: 650, stars: 2, m: { range: 1.15, acc: 1.04, aim: 0.92 }, look: 'holo' },
  { id: 'lpvo', slot: 'optic', name: 'LPVO 1-6x', desc: '+30% range, +6% accuracy, reactions 4% faster', price: 1100, stars: 5, m: { range: 1.3, acc: 1.06, aim: 0.96 }, look: 'acog' },
  { id: 'sniper8', slot: 'optic', name: 'Precision 8x scope', desc: '+45% range, +12% accuracy, 22% slower reactions', price: 1400, stars: 6, m: { range: 1.45, acc: 1.12, aim: 1.22 }, look: 'scope' },
  { id: 'thermal', slot: 'optic', name: 'Thermal sight', desc: '+20% range, reactions 10% faster, +20% sight in missions', price: 2200, stars: 9, m: { range: 1.2, acc: 1.05, aim: 0.9 }, look: 'scope', sight: 1.2 },
  { id: 'vgrip', slot: 'grip', name: 'Vertical grip', desc: 'Moving accuracy penalty -30%, +2% accuracy', price: 350, stars: 1, m: { moveAcc: 0.7, acc: 1.02 } },
  { id: 'angled', slot: 'grip', name: 'Angled grip', desc: 'Reactions 6% faster', price: 400, stars: 2, m: { aim: 0.94 } },
  { id: 'bipod', slot: 'grip', name: 'Bipod', desc: '+10% accuracy standing still, moving penalty +30%', price: 500, stars: 3, m: { acc: 1.1, moveAcc: 1.3 } },
  { id: 'extmag', slot: 'mag', name: 'Extended magazine', desc: 'Magazine x1.5, reload 15% slower', price: 450, stars: 1, mag: 1.5, reload: 1.15 },
  { id: 'fastmag', slot: 'mag', name: 'Speed-pull magazine', desc: 'Reload 30% faster', price: 380, stars: 1, mag: 1, reload: 0.7 },
  { id: 'drum', slot: 'mag', name: 'Drum magazine', desc: 'Magazine x2.2, reload 40% slower, speed -4%', price: 900, stars: 4, mag: 2.2, reload: 1.4, mob: 0.96 },
];
const NEW_ARMOR = [
  { id: 'lowvis', name: 'Low-vis plate carrier', red: 0.28, mob: 1.0, price: 650, stars: 1 },
  { id: 'ceramic', name: 'Ceramic plates', red: 0.4, mob: 0.93, price: 1300, stars: 4 },
  { id: 'eod', name: 'EOD bomb suit', red: 0.7, mob: 0.62, price: 2600, stars: 10, blast: 0.5 },
];
for (const a of NEW_ATT) if (!ATTACHMENTS.some(x => x.id === a.id)) ATTACHMENTS.push(a);
for (const a of NEW_ARMOR) if (!ARMOR.some(x => x.id === a.id)) ARMOR.push(a);

// visual stand-ins for new optics / muzzles (src/guns.js only models the original ones)
export const ATT_LOOK = Object.fromEntries(NEW_ATT.filter(a => a.look).map(a => [a.id, a.look]));
// camera magnification per optic: used by the in-mission scope (ADS) button
export const ZOOM = { iron: 1.15, laser: 1.15, reddot: 1.3, holo: 1.35, acog: 2.4, prism: 1.9, lpvo: 3, sniper8: 4.2, thermal: 2.6 };

export const HELMETS = [
  { id: 'none', name: 'Unit-issue headgear', desc: 'Whatever the unit wears. No protection bonus.', red: 0, mob: 1, price: 0, stars: 0 },
  { id: 'bump', name: 'Bump helmet', desc: 'Light shell. Damage -3%.', red: 0.03, mob: 1, price: 150, stars: 0 },
  { id: 'fast', name: 'FAST ballistic helmet', desc: 'Damage -7%, +5 health.', red: 0.07, mob: 0.99, hp: 5, price: 500, stars: 1 },
  { id: 'ach', name: 'ACH high-cut + comms', desc: 'Damage -9%. Hearing protection: immune to friendly flashbangs.', red: 0.09, mob: 0.98, flashProof: true, price: 850, stars: 3 },
  { id: 'visor', name: 'Ballistic visor helmet', desc: 'Damage -14%, +10 health, speed -7%.', red: 0.14, mob: 0.93, hp: 10, price: 1500, stars: 7 },
];
export const NVGS = [
  { id: 'none', name: 'No night vision', desc: '', mul: 1, price: 0, stars: 0 },
  { id: 'pvs14', name: 'PVS-14 monocular', desc: 'Night: sight +25% with NVG on. Dusk: +15%.', mul: 1.25, price: 700, stars: 2 },
  { id: 'pvs31', name: 'PVS-31 binocular', desc: 'Night: sight +35% with NVG on. Dusk: +21%.', mul: 1.35, price: 1400, stars: 5 },
  { id: 'gpnvg', name: 'GPNVG-18 panoramic', desc: 'Night: sight +50% with NVG on. Dusk: +30%.', mul: 1.5, price: 2400, stars: 8 },
];
// consumables: cat picks the store tab, use describes how it is used in a mission
export const CONSUMABLES = [
  { id: 'flash', cat: 'gadgets', name: 'Flashbang', desc: 'Stuns enemies in a 4 m radius for 3.5 s.', price: 40, stars: 0, use: 'Throw (B)', look: 'flash' },
  { id: 'frag', cat: 'gadgets', name: 'Frag grenade', desc: 'Kills in 3 m. Lethal to hostages too!', price: 70, stars: 0, use: 'Throw (G)', look: 'frag' },
  { id: 'smoke', cat: 'gadgets', name: 'Smoke grenade', desc: 'Blocks line of sight in a 3 m radius for 15 s.', price: 50, stars: 0, use: 'Throw (V)', look: 'smoke' },
  { id: 'stinger', cat: 'gadgets', name: 'Stinger grenade', desc: 'Rubber-ball stun: 5 m radius, 2.5 s stun, 20 damage to hostiles only. Hostage-safe.', price: 85, stars: 1, use: 'Kit menu → throw', look: 'flash' },
  { id: 'cs', cat: 'gadgets', name: 'CS gas', desc: 'Tear gas: blocks sight 3 m and stuns hostiles inside for 6 s.', price: 110, stars: 3, use: 'Kit menu → throw', look: 'smoke' },
  { id: 'charge', cat: 'breach', name: 'Breaching charge', desc: 'Blows any door off its hinges, stuns behind it. Very loud. Safe on traps.', price: 90, stars: 0, use: 'Door menu', look: 'charge' },
  { id: 'lockpick', cat: 'breach', name: 'Lockpick set', desc: 'Silently opens locked doors; disarms traps.', price: 25, stars: 0, use: 'Door menu', look: 'lockpick' },
  { id: 'drone', cat: 'recon', name: 'Recon drone', desc: 'Reveals every enemy for 8 s at mission start.', price: 300, stars: 2, use: 'Automatic at start', look: 'drone' },
  { id: 'sensor', cat: 'recon', name: 'Heartbeat sensor', desc: 'Pulse any time: reveals every hostile for 5 s.', price: 220, stars: 2, use: 'Kit menu', look: 'drone' },
  { id: 'medkit', cat: 'medical', name: 'Medkit', desc: 'Auto-heals 50 hp when an operator drops below 35 hp.', price: 60, stars: 0, use: 'Automatic', look: 'medkit' },
  { id: 'trauma', cat: 'medical', name: 'Trauma kit', desc: 'Heals the selected operators to full health.', price: 140, stars: 1, use: 'Kit menu', look: 'medkit' },
  { id: 'stim', cat: 'medical', name: 'Adrenaline stim', desc: 'Selected operators: +35% speed, 25% faster reactions for 12 s.', price: 120, stars: 2, use: 'Kit menu', look: 'medkit' },
  { id: 'ap', cat: 'ammo', name: 'AP rounds (crate)', desc: 'Squad-wide +20% damage for one mission.', price: 160, stars: 1, use: 'Bring: toggle ON', ammo: { dmg: 1.2 } },
  { id: 'subsonic', cat: 'ammo', name: 'Subsonic rounds (crate)', desc: 'Squad-wide noise x0.6, damage -5% for one mission.', price: 140, stars: 1, use: 'Bring: toggle ON', ammo: { noise: 0.6, dmg: 0.95 } },
  { id: 'match', cat: 'ammo', name: 'Match-grade rounds (crate)', desc: 'Squad-wide +8% accuracy, +10% range for one mission.', price: 180, stars: 3, use: 'Bring: toggle ON', ammo: { acc: 1.08, range: 1.1 } },
  { id: 'tracer', cat: 'ammo', name: 'Tracer mix (crate)', desc: 'Squad-wide reactions 8% faster, +15% noise for one mission.', price: 100, stars: 0, use: 'Bring: toggle ON', ammo: { aim: 0.92, noise: 1.15 } },
];
export const BUNDLES = [
  { id: 'b_nades', cat: 'gadgets', name: 'Grenade crate', desc: '5 flashbangs, 2 frags, 2 smokes.', items: { flash: 5, frag: 2, smoke: 2 }, price: 390, stars: 0 },
  { id: 'b_breach', cat: 'breach', name: 'Breacher bundle', desc: '3 charges + 4 lockpicks.', items: { charge: 3, lockpick: 4 }, price: 290, stars: 0 },
  { id: 'b_med', cat: 'medical', name: 'Field medic pack', desc: '3 medkits + 1 trauma kit.', items: { medkit: 3, trauma: 1 }, price: 280, stars: 1 },
];
export const STOCK_KEYS = CONSUMABLES.map(c => c.id);

// Make a save B4-ready without touching src/save.js (old saves keep working; new keys default to empty).
export function ensureB4(s) {
  if (!s) return s; s.owned = s.owned || {};
  for (const k of ['weapons', 'att', 'armor']) s.owned[k] = s.owned[k] || [];
  s.owned.helmets = s.owned.helmets || ['none']; s.owned.nvg = s.owned.nvg || ['none'];
  if (!s.owned.att.includes('none')) s.owned.att.push('none');
  s.stock = s.stock || {}; for (const k of STOCK_KEYS) if (typeof s.stock[k] !== 'number') s.stock[k] = 0;
  s.loadout = s.loadout || {}; s.stages = s.stages || {}; s.stageBest = s.stageBest || {};
  return s;
}

const find = (L, id) => L.find(x => x.id === id);
// Extra mods for opStats: helmet + grip go into the operator mods / attachment mods.
export function gearMods(cfg) {
  const h = find(HELMETS, cfg.helmet) || HELMETS[0], g = find(ATTACHMENTS, cfg.grip), mg = find(ATTACHMENTS, cfg.mag);
  const m = {}; if (h.red) m.armor = h.red; if (h.hp) m.hp = h.hp; let mob = h.mob || 1; if (mg && mg.mob) mob *= mg.mob; if (mob !== 1) m.speed = mob;
  return { m, am: g && g.slot === 'grip' ? g.m : null, helmet: h, nvg: find(NVGS, cfg.nvg) || NVGS[0], mag: mg && mg.slot === 'mag' ? mg : null };
}
