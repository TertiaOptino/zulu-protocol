import { UNITS, CLASSES, WEAPONS, ATTACHMENTS, ARMOR } from './data.js';
import { gearMods } from './market-data.js'; // B4: helmet / grip / magazine mods
// Single source of truth for operator stats: used by the squad screens AND by mission spawning.
export function mergeMods(...list) { const m = { extra: {} }; for (const src of list) { if (!src) continue; for (const k in src) { const v = src[k]; if (k === 'extra') { for (const g in v) m.extra[g] = (m.extra[g] || 0) + v[g]; } else if (typeof v === 'boolean') m[k] = m[k] || v; else if (k === 'hp' || k === 'armor' || k === 'reveal' || k === 'heal') m[k] = (m[k] || 0) + v; else m[k] = (m[k] ?? 1) * v; } } return m; }
export function opStats(cfg) {
  const u = UNITS.find(x => x.id === cfg.unit) || UNITS[0], c = CLASSES.find(x => x.id === cfg.cls) || CLASSES[0], w = WEAPONS.find(x => x.id === cfg.weapon) || WEAPONS[0];
  const mz = ATTACHMENTS.find(a => a.id === cfg.muzzle) || {}, op = ATTACHMENTS.find(a => a.id === cfg.optic) || {}, ar = ARMOR.find(a => a.id === cfg.armor) || ARMOR[1];
  const gm = gearMods(cfg); const m = mergeMods(u.mods, c.mods, gm.m), am = mergeMods(mz.m, op.m, gm.am); // B4: + gearMods
  return { u, c, w, ar, m, am, gm,
    hp: 100 + (m.hp || 0), speed: 3.3 * w.mob * ar.mob * (m.speed || 1), acc: w.acc * (m.acc || 1) * (am.acc || 1) * (w.type === 'dmr' ? (m.marksAcc || 1) : 1),
    aim: w.aim * (m.aim || 1) * (am.aim || 1), noise: w.noise * (m.noise || 1) * (am.noise || 1), armor: ar.red + (m.armor || 0), dmg: w.dmg * (am.dmg || 1), range: w.range * (am.range || 1),
    suppressed: (am.noise || 1) < 0.5, moveAcc: 1 - 0.3 * (am.moveAcc || 1) };
}
