// Maps game entities -> character style. Shared by game.js (missions), squad.js (editor preview), thumbs/lineup.
import { KITS, SKIN, WEAPONS, ARMOR, UNITS, TEAMS } from './data.js';
import { CAMOS, lookForUnit, ENEMY_LOOKS, civLook } from './looks.js';
const KIT2CAMO = { desert: 'dcu', winter: 'alpine', urban: CAMOS.urban ? 'urban' : 'granite' };
export function opLook(o) {
  const L = lookForUnit(o.unit); if (!o.kit || o.kit === 'unit') return L;
  const c = CAMOS[o.kit] ? o.kit : KIT2CAMO[o.kit]; return c ? { ...L, camo: c, pants: c } : L;
}
export function opStyle(o) {
  const kit = KITS.find(k => k.id === o.kit) || KITS[0]; const w = WEAPONS.find(x => x.id === o.weapon) || WEAPONS[0]; const u = UNITS.find(x => x.id === o.unit) || UNITS[0];
  return { kind: 'op', look: opLook(o), country: u.country, cls: o.cls, gun: w.id, optic: o.optic, muzzle: o.muzzle,
    uni: kit.c[0], vest: kit.c[1], helm: kit.c[2], skin: SKIN[(o.skin || 0) % SKIN.length], armorLvl: Math.max(0, ARMOR.findIndex(a => a.id === o.armor)), gunType: w.type, ring: o.team >= 0 && TEAMS[o.team] ? TEAMS[o.team].color : 0x888888 };
}
export function enemyStyle(i, wid, k) { const w = WEAPONS.find(q => q.id === wid) || WEAPONS[0]; return { kind: 'enemy', look: ENEMY_LOOKS[i % ENEMY_LOOKS.length], gun: w.id, optic: 'iron', uni: k[0], vest: k[1], helm: k[2], skin: SKIN[1 + (i % 4)], armorLvl: 0, gunType: w.type, ring: 0xff4a2a }; }
export function civStyle(i, vip) { return { kind: vip ? 'vip' : 'hostage', look: civLook(i, vip), uni: vip ? 0x23272e : [0x8a8f96, 0x9a7a5a, 0x5a6a8a, 0xb0a890][i % 4], skin: SKIN[vip ? 0 : i % 5], ring: vip ? 0x40ff70 : 0xffd23a }; }
