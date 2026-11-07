import { SAVE_KEY, UNITS, WEAPONS, KITS } from './data.js';
// Breach & Clear-style roster: each owned unit has its own 10-operator roster; a mission uses ONE unit.
const CALLSIGNS = ['Viper', 'Ghost', 'Bishop', 'Mako', 'Reaper', 'Nomad', 'Echo', 'Saber', 'Frost', 'Kodiak', 'Havoc', 'Raven', 'Blaze', 'Talon', 'Wraith', 'Jinx', 'Rook', 'Hawk', 'Atlas', 'Cobra', 'Dusk', 'Flint', 'Grim', 'Halo', 'Lynx', 'Moose', 'Nova', 'Onyx', 'Pike', 'Rogue', 'Sparrow', 'Tank', 'Wolf', 'Yeti', 'Badger', 'Comet', 'Ember', 'Fox', 'Gunner', 'Hammer', 'Ivan', 'Jackal'];
const DEF_CLASS = ['assaulter', 'breacher', 'assaulter', 'medic', 'marksman', 'assaulter', 'breacher', 'support', 'assaulter', 'medic'];
const CLASS_WEP = { assaulter: 'm4a1', breacher: 'm870', marksman: 'sr25', medic: 'mp5', support: 'm249' };
export const START_UNIT = 'rangers';
export function defaultOp(i, unit = START_UNIT) {
  const cls = DEF_CLASS[i % 10]; const ui = Math.max(0, UNITS.findIndex(x => x.id === unit)); const u = UNITS[ui];
  return { id: unit + '_' + i, name: CALLSIGNS[(i + ui * 7) % CALLSIGNS.length], unit, cls, kit: 'unit', skin: (i + ui) % 5, weapon: CLASS_WEP[cls], muzzle: 'none', optic: 'reddot', armor: cls === 'breacher' ? 'plate' : 'light', team: i < 4 ? 0 : i < 7 ? 1 : 2 };
}
export function roster(s, unit = s.unit) { if (!s.rosters[unit]) s.rosters[unit] = Array.from({ length: 10 }, (_, i) => defaultOp(i, unit)); for (const o of s.rosters[unit]) o.unit = unit; return s.rosters[unit]; }
export function defaultSave() {
  const s = { v: 2, cash: 1500, stars: {}, completed: {}, best: {}, owned: { weapons: WEAPONS.filter(w => !w.price).map(w => w.id), att: ['none', 'iron', 'reddot'], armor: ['none', 'light', 'plate'] }, stock: { flash: 10, charge: 4, lockpick: 4, frag: 2, smoke: 2, medkit: 2, drone: 0 }, units: [START_UNIT], unit: START_UNIT, rosters: {}, settings: { quality: 'auto', cones: true, sight: 'all', cine: true, sound: true, ff: false, volume: 0.8, music: 0.55, sfx: 0.9, voice: 0.85, sens: 1 }, ending: false, stats: { missions: 0, kills: 0 } };
  roster(s); return s;
}
export function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && (s.v === 1 || s.v === 2)) { const d = defaultSave();
    if (s.v === 1) { s.v = 2; s.units = [START_UNIT]; s.unit = START_UNIT; s.rosters = {}; if (s.ops) { s.rosters[START_UNIT] = s.ops; delete s.ops; } }
    for (const k in d) if (s[k] === undefined) s[k] = d[k]; for (const k in d.settings) if (s.settings[k] === undefined) s.settings[k] = d.settings[k]; for (const k in d.stock) if (s.stock[k] === undefined) s.stock[k] = 0;
    if (!s.units.includes(s.unit)) s.unit = s.units[0]; for (const id in s.rosters || {}) for (const o of s.rosters[id] || []) { const u = UNITS.find(x => x.id === o.unit); if (!o.kit || (u && o.kit === u.kit)) o.kit = 'unit'; } roster(s); return s; } } catch (e) { }
  return defaultSave();
}
export function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
export const totalStars = (s) => Object.values(s.stars).reduce((a, b) => a + b, 0);
