// BATCH 4 — the expanded Armory / marketplace. Replaces Menus.armory() via a one-line redirect in menus.js.
// Keeps the old class names the tests rely on (.tab, .shoplist.cards, .shoprow.card, .buy, .ithumb).
import { el } from './util.js';
import { WEAPONS, ATTACHMENTS, ARMOR, CLASSES, UNITS } from './data.js';
import { writeSave, totalStars, roster } from './save.js';
import { sfx } from './audio.js';
import { itemImg } from './thumbs.js';
import { HELMETS, NVGS, CONSUMABLES, BUNDLES, ensureB4 } from './market-data.js';
import { opticZoom } from './missionkit.js';

export const TABS = [
  ['weapons', 'Weapons', '▸', 'Guns'], ['optics', 'Optics', '◎', 'Guns'], ['att', 'Attachments', '⚙', 'Guns'],
  ['armor', 'Armour', '⛨', 'Gear'], ['helmets', 'Helmets', '⛑', 'Gear'], ['nvg', 'Night vision', '◐', 'Gear'],
  ['gadgets', 'Gadgets', '✸', 'Consumables'], ['breach', 'Breaching', '💥', 'Consumables'], ['recon', 'Recon', '⌖', 'Consumables'], ['medical', 'Medical', '✚', 'Consumables'], ['ammo', 'Ammo', '⁍', 'Consumables'],
];
const BLURB = { weapons: 'Primary and side arms. Each class can carry its own weapon types plus a pistol.', optics: 'Optics change reaction speed and range, and set the zoom of the in-mission scope (Kit → Scope).', att: 'Muzzles, grips and magazines. Grips and mags are new slots on every operator.',
  armor: 'Body armour cuts incoming damage; heavier plates slow you down.', helmets: 'Helmets stack with body armour. ACH comms make you immune to your own flashbangs.', nvg: 'Toggle NVG in missions with Kit → Night vision (N). Big boost on night maps and in stage 2 low-light areas.',
  gadgets: 'Thrown grenades. Stinger and CS are thrown from the in-mission Kit menu.', breach: 'Door tools, used from the door menu.', recon: 'Intel tools. The drone fires automatically, the heartbeat sensor from the Kit menu.', medical: 'Keep the team alive. Trauma kits and stims are used from the Kit menu.', ammo: 'Special ammunition crates. Toggle “Bring” and one crate is used by the whole squad on the next deployment.' };
const W_MAX = { dmg: Math.max(...WEAPONS.map(w => w.dmg)), rof: Math.max(...WEAPONS.map(w => w.rof)), acc: Math.max(...WEAPONS.map(w => w.acc)), range: Math.max(...WEAPONS.map(w => w.range)), mag: Math.max(...WEAPONS.map(w => w.mag)) };
const pct = (v, m) => Math.max(4, Math.min(100, Math.round(v / m * 100)));
const bar = (label, v, txt, cls = '') => `<div class="mk-bar ${cls}"><span>${label}</span><i><b style="width:${v}%"></b></i><em>${txt}</em></div>`;
const MODN = { acc: 'accuracy', aim: 'reaction time', range: 'range', noise: 'noise', dmg: 'damage', moveAcc: 'moving penalty' };
const LOWGOOD = { aim: 1, noise: 1, moveAcc: 1 };
function modChips(m) { if (!m) return ''; return '<div class="mk-mods">' + Object.entries(m).map(([k, v]) => { const d = Math.round((v - 1) * 100); const good = LOWGOOD[k] ? d < 0 : d > 0; return `<span class="${good ? 'g' : 'b'}">${d > 0 ? '+' : ''}${d}% ${MODN[k] || k}</span>`; }).join('') + '</div>'; }

const SVG = (inner, vb = '0 0 64 40') => { const d = el('div', 'ithumb mk-ico'); d.innerHTML = `<svg viewBox="${vb}" aria-hidden="true">${inner}</svg>`; return d; };
const ICON = {
  helmet: (c) => SVG(`<path d="M14 30 Q14 8 32 8 Q50 8 50 26 L50 30 Z" fill="${c}" stroke="#0b0f12" stroke-width="1.5"/><rect x="12" y="29" width="40" height="4" rx="2" fill="#20262b"/><rect x="40" y="18" width="10" height="5" rx="1" fill="#3a444c"/>`),
  nvg: (n) => SVG(`<rect x="18" y="6" width="28" height="6" rx="2" fill="#2c3338"/>${Array.from({ length: n }, (_, i) => { const x = 32 + (i - (n - 1) / 2) * 11; return `<rect x="${x - 4.5}" y="12" width="9" height="20" rx="3" fill="#3b464d" stroke="#0b0f12"/><circle cx="${x}" cy="31" r="4" fill="#5dff8a" opacity=".85"/>`; }).join('')}`),
  grip: (id) => SVG(id === 'bipod' ? `<rect x="10" y="10" width="44" height="6" rx="2" fill="#3a444c"/><path d="M30 16 L18 36 M34 16 L46 36" stroke="#20262b" stroke-width="4" stroke-linecap="round"/>` : id === 'angled' ? `<rect x="10" y="10" width="44" height="6" rx="2" fill="#3a444c"/><path d="M22 16 L38 16 L44 30 L28 30 Z" fill="#20262b"/>` : `<rect x="10" y="10" width="44" height="6" rx="2" fill="#3a444c"/><rect x="27" y="16" width="10" height="20" rx="3" fill="#20262b"/>`),
  mag: (id) => SVG(id === 'drum' ? `<circle cx="32" cy="22" r="14" fill="#20262b" stroke="#4a555c" stroke-width="3"/><circle cx="32" cy="22" r="4" fill="#4a555c"/>` : `<path d="M26 4 L38 4 L${id === 'extmag' ? '46 38 L34 38' : '42 28 L30 28'} Z" fill="#20262b" stroke="#4a555c" stroke-width="2"/>${id === 'fastmag' ? '<rect x="24" y="1" width="16" height="4" rx="2" fill="#e0483a"/>' : ''}`),
  ammo: (c) => SVG(`${[0, 1, 2, 3].map(i => `<g transform="translate(${14 + i * 10} 6)"><rect x="0" y="10" width="7" height="22" fill="#c9a24a"/><path d="M0 10 Q3.5 -2 7 10 Z" fill="${c}"/></g>`).join('')}`),
  bundle: () => SVG(`<rect x="8" y="12" width="48" height="24" rx="3" fill="#56603a" stroke="#0b0f12"/><rect x="8" y="12" width="48" height="6" fill="#6a7548"/><rect x="28" y="20" width="8" height="8" fill="#d6c27a"/>`),
};
const HCOL = { none: '#555d63', bump: '#6b7a5a', fast: '#4f5a3a', ach: '#5a5e52', visor: '#2e3438' };
const ACOL = { ap: '#3a3f44', subsonic: '#4a7a4a', match: '#c0c8cc', tracer: '#e0483a' };

export function installMarket(app) { const menus = app.menus; app.market = (tab) => market(menus, tab || 'weapons'); }

function slotOf(item, kind) { if (kind === 'weapon') return 'weapon'; if (kind === 'armor') return 'armor'; if (kind === 'helmet') return 'helmet'; if (kind === 'nvg') return 'nvg'; return item.slot; }
const DEFAULT = { optic: 'iron', muzzle: 'none', grip: 'none', mag: 'none', armor: 'none', helmet: 'none', nvg: 'none' };
const allowedW = (cls) => [...(CLASSES.find(c => c.id === cls) || CLASSES[0]).weapons, 'pistol'];
const canEquip = (o, item, slot) => slot !== 'weapon' || allowedW(o.cls).includes(item.type);

export function market(menus, tab = 'weapons') {
  const s = ensureB4(menus.s); const ts = totalStars(s); const prevScroll = menus._mkTab === tab ? (menus.root.querySelector('.scr-body')?.scrollTop || 0) : 0; menus._mkTab = tab;
  const body = menus.screen('armory market', 'Armory', () => menus.main()); const sc = menus.root.querySelector('.screen'); if (menus._mkAnim !== tab) sc.classList.add('mk-enter'); menus._mkAnim = tab;
  const tabs = el('div', 'tabs mk-tabs'); let grp = '';
  for (const [id, n, ic, g] of TABS) { if (g !== grp) { grp = g; tabs.append(el('span', 'mk-grp', g)); } const b = el('button', 'tab' + (tab === id ? ' on' : ''), `<span class="ti">${ic}</span>${n}`); b.dataset.tab = id; b.onclick = () => { sfx.ui(); market(menus, id); }; tabs.append(b); }
  body.append(tabs);
  const R = roster(s); const U = UNITS.find(u => u.id === s.unit);
  body.append(el('div', 'mk-sub', `<span>${BLURB[tab] || ''}</span><small>Equipping applies to <b>${U ? U.name : 'your unit'}</b> · ${R.length} operators</small>`));
  const list = el('div', 'shoplist cards mk-list'); body.append(list); let idx = 0;
  const redraw = () => market(menus, tab);
  const pay = (price, fn) => { if (s.cash < price) { sfx.lose(); menus.app.toast(`Not enough cash — need $${(price - s.cash).toLocaleString()} more.`, 'bad'); return false; } s.cash -= price; fn(); writeSave(s); sfx.click(); redraw(); return true; };
  const head = (t) => list.append(el('h4', 'shop-h', t));
  // generic card: { name, desc, price, req, owned, pic, stats, count, onBuy, buyLabel, equip:{item,kind}, extra }
  const card = (c) => { const lock = (c.req || 0) > ts; const r = el('div', 'shoprow card mk-card' + (c.owned ? ' owned' : '') + (lock ? ' locked' : '') + (c.cls ? ' ' + c.cls : ''));
    r.style.setProperty('--i', Math.min(idx++, 14)); if (c.pic) r.append(c.pic);
    r.append(el('div', 'si', `<b>${c.name}${c.count != null ? ` <i class="have">×${c.count}</i>` : ''}</b><small>${c.desc || ''}</small>${c.stats || ''}`));
    const ft = el('div', 'mk-foot'); if (c.tag) ft.append(el('span', 'mk-tag', c.tag));
    const b = el('button', 'buy', c.owned ? '✓ Owned' : lock ? `🔒 ${c.req}★` : `${c.buyLabel || 'Buy'} <b>$${c.price.toLocaleString()}</b>`);
    if (!c.owned && !lock) { b.onclick = (e) => { e.stopPropagation(); pay(c.price, c.onBuy); }; if (s.cash < c.price) b.classList.add('poor'); } else b.disabled = true; ft.append(b);
    if (c.more && !lock) for (const [lab, price, fn] of c.more) { const x = el('button', 'buyx', `${lab} <b>$${price}</b>`); if (s.cash < price) x.classList.add('poor'); x.onclick = (e) => { e.stopPropagation(); pay(price, fn); }; ft.append(x); }
    if (c.toggle) { const t = el('button', 'mk-bring' + (c.toggle.on ? ' on' : ''), c.toggle.on ? '✓ Bringing' : 'Bring'); t.onclick = (e) => { e.stopPropagation(); c.toggle.fn(); sfx.ui(); redraw(); }; ft.append(t); }
    if (c.equip && c.owned) { const { item, kind } = c.equip; const slot = slotOf(item, kind); const n = R.filter(o => (o[slot] || DEFAULT[slot]) === item.id).length; const q = el('button', 'equip' + (n ? ' some' : ''), n ? `Equipped ${n}/${R.length}` : 'Equip ▸'); q.onclick = (e) => { e.stopPropagation(); sfx.ui(); equipSheet(menus, item, kind, redraw); }; ft.append(q); }
    r.append(ft); list.append(r); return r; };

  if (tab === 'weapons') { const types = [...new Set(WEAPONS.map(w => w.type))]; for (const t of types) { head(t.toUpperCase()); for (const w of WEAPONS.filter(w => w.type === t)) card({ name: w.name, desc: `${w.type} · noise ${w.noise} m · speed ${Math.round(w.mob * 100)}%`, price: w.price, req: w.stars, owned: s.owned.weapons.includes(w.id), pic: itemImg('weapon', w),
    stats: `<div class="mk-bars">${bar('DMG', pct(w.dmg, W_MAX.dmg), w.dmg)}${bar('ROF', pct(w.rof, W_MAX.rof), w.rof + '/s')}${bar('ACC', pct(w.acc, W_MAX.acc), Math.round(w.acc * 100))}${bar('RNG', pct(w.range, W_MAX.range), w.range + 'm')}${bar('MAG', pct(w.mag, W_MAX.mag), w.mag)}</div>`,
    onBuy: () => s.owned.weapons.push(w.id), equip: { item: w, kind: 'weapon' } }); } }
  if (tab === 'optics') { head('OPTICS'); for (const a of ATTACHMENTS.filter(a => a.slot === 'optic')) card({ name: a.name, desc: a.desc || 'Standard', price: a.price, req: a.stars, owned: s.owned.att.includes(a.id), pic: a.id === 'iron' ? null : itemImg('att', a),
    stats: `<div class="mk-bars">${bar('ZOOM', pct(opticZoom({ optic: a.id }), 4.2), opticZoom({ optic: a.id }).toFixed(1) + '×', 'z')}</div>${modChips(a.m)}`, onBuy: () => s.owned.att.push(a.id), equip: { item: a, kind: 'att' } }); }
  if (tab === 'att') for (const [slot, t] of [['muzzle', 'MUZZLES'], ['grip', 'GRIPS'], ['mag', 'MAGAZINES']]) { head(t); for (const a of ATTACHMENTS.filter(a => a.slot === slot)) { if (a.id === 'none') continue; card({ name: a.name, desc: a.desc || 'Standard', price: a.price, req: a.stars, owned: s.owned.att.includes(a.id), pic: slot === 'muzzle' ? itemImg('att', a) : slot === 'grip' ? ICON.grip(a.id) : ICON.mag(a.id),
    stats: slot === 'mag' ? `<div class="mk-mods"><span class="${a.mag > 1 ? 'g' : ''}">mag ×${a.mag}</span><span class="${a.reload < 1 ? 'g' : 'b'}">reload ×${a.reload}</span>${a.mob ? `<span class="b">speed ×${a.mob}</span>` : ''}</div>` : modChips(a.m), onBuy: () => s.owned.att.push(a.id), equip: { item: a, kind: 'att' } }); } }
  if (tab === 'armor') { head('BODY ARMOUR'); for (const a of ARMOR) card({ name: a.name, desc: a.blast ? 'Blast suit: explosives do 50% less on top of armour.' : a.red ? 'Plates and soft armour.' : 'Travel light.', price: a.price, req: a.stars, owned: s.owned.armor.includes(a.id), pic: itemImg('armor', a),
    stats: `<div class="mk-bars">${bar('PROT', pct(a.red, 0.7), '-' + Math.round(a.red * 100) + '%')}${bar('MOB', pct(a.mob, 1.04), Math.round(a.mob * 100) + '%', 'm')}</div>`, onBuy: () => s.owned.armor.push(a.id), equip: { item: a, kind: 'armor' } }); }
  if (tab === 'helmets') { head('HELMETS'); for (const h of HELMETS) card({ name: h.name, desc: h.desc, price: h.price, req: h.stars, owned: s.owned.helmets.includes(h.id), pic: ICON.helmet(HCOL[h.id] || '#555'),
    stats: `<div class="mk-bars">${bar('PROT', pct(h.red, 0.14), '-' + Math.round(h.red * 100) + '%')}${bar('HP', pct(h.hp || 0, 10), '+' + (h.hp || 0))}${bar('MOB', pct(h.mob, 1), Math.round(h.mob * 100) + '%', 'm')}</div>${h.flashProof ? '<div class="mk-mods"><span class="g">flash-proof</span></div>' : ''}`, onBuy: () => s.owned.helmets.push(h.id), equip: { item: h, kind: 'helmet' } }); }
  if (tab === 'nvg') { head('NIGHT VISION'); for (const n of NVGS) card({ name: n.name, desc: n.desc || 'Standard eyes.', price: n.price, req: n.stars, owned: s.owned.nvg.includes(n.id), pic: n.id === 'none' ? null : ICON.nvg(n.id === 'gpnvg' ? 4 : n.id === 'pvs31' ? 2 : 1),
    stats: `<div class="mk-bars">${bar('NIGHT', pct(n.mul - 1, 0.5), '+' + Math.round((n.mul - 1) * 100) + '%', 'n')}</div>`, onBuy: () => s.owned.nvg.push(n.id), equip: { item: n, kind: 'nvg' } }); }
  const consum = CONSUMABLES.filter(c => c.cat === tab);
  if (consum.length) { head(TABS.find(t => t[0] === tab)[1].toUpperCase());
    for (const c of consum) { const add = (n) => () => { s.stock[c.id] = (s.stock[c.id] || 0) + n; }; const p5 = Math.round(c.price * 5 * 0.9);
      card({ name: c.name, desc: c.desc, price: c.price, req: c.stars, count: s.stock[c.id] || 0, buyLabel: '+1', pic: c.look ? itemImg('gadget', { id: c.look }) : ICON.ammo(ACOL[c.id] || '#888'), cls: c.look && c.look !== c.id ? 'alt-' + c.id : '',
        tag: c.use, onBuy: add(1), more: [['+5', p5, add(5)]], toggle: c.ammo ? { on: !!s.loadout[c.id], fn: () => { s.loadout[c.id] = !s.loadout[c.id]; writeSave(s); } } : null }); }
    const bun = BUNDLES.filter(b => b.cat === tab); if (bun.length) { head('BUNDLES'); for (const b of bun) { const worth = Object.entries(b.items).reduce((a, [k, n]) => a + n * (CONSUMABLES.find(c => c.id === k)?.price || 0), 0);
      card({ name: b.name, desc: b.desc, price: b.price, req: b.stars, pic: ICON.bundle(), tag: `Save $${worth - b.price}`, buyLabel: 'Buy', onBuy: () => { for (const [k, n] of Object.entries(b.items)) s.stock[k] = (s.stock[k] || 0) + n; } }); } } }
  // loadout summary strip at the bottom: what the team will carry
  const st = s.stock; body.append(el('div', 'mk-carry', `<b>Carrying</b> ${CONSUMABLES.filter(c => !c.ammo).map(c => `<span class="${st[c.id] ? '' : 'z'}">${c.name.replace(/ grenade| set| kit/i, '')} ×${st[c.id] || 0}</span>`).join('')}${CONSUMABLES.filter(c => c.ammo && s.loadout[c.id]).map(c => `<span class="am">${c.name.replace(/ \(crate\)/, '')}</span>`).join('')}`));
  if (prevScroll) { const sb = menus.root.querySelector('.scr-body'); if (sb) sb.scrollTop = prevScroll; }
  const on = tabs.querySelector('.tab.on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { }
}

export function equipSheet(menus, item, kind, done) { const s = menus.s; const R = roster(s); const slot = slotOf(item, kind); const def = DEFAULT[slot];
  document.querySelector('.mk-sheet')?.remove(); const wrap = el('div', 'mk-sheet'); const box = el('div', 'mk-sbox'); wrap.append(box);
  const close = () => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 180); done && done(); };
  wrap.onclick = (e) => { if (e.target === wrap) close(); };
  const draw = () => { box.innerHTML = ''; box.append(el('div', 'mk-sh', `<b>Equip: ${item.name}</b><small>${slot === 'weapon' ? 'Only classes that can carry a ' + item.type + ' can take it.' : 'Tap operators to equip or remove.'}</small>`));
    const ls = el('div', 'mk-ops'); for (const o of R) { const cls = CLASSES.find(c => c.id === o.cls); const ok = canEquip(o, item, slot); const has = (o[slot] || def) === item.id;
      const cur = slot === 'weapon' ? (WEAPONS.find(w => w.id === o.weapon) || {}).name : nameOf(slot, o[slot] || def);
      const b = el('button', 'mk-op' + (has ? ' on' : '') + (ok ? '' : ' dis'), `<span class="pc">${cls ? cls.icon : ''}</span><span class="dn"><b>${o.name}</b><small>${cls ? cls.name : ''} · ${cur || '—'}</small></span><i>${has ? '✓' : ok ? '+' : '✕'}</i>`);
      b.onclick = () => { if (!ok) { menus.app.toast(`${cls ? cls.name : 'This class'} can't carry a ${item.type}.`, 'bad'); return; } if (has) { if (slot === 'weapon') return; o[slot] = def; } else o[slot] = item.id; writeSave(s); sfx.ui(); draw(); }; ls.append(b); }
    box.append(ls); const bt = el('div', 'mk-sbtn');
    const all = el('button', 'mbtn primary', 'Equip all eligible'); all.onclick = () => { for (const o of R) if (canEquip(o, item, slot)) o[slot] = item.id; writeSave(s); sfx.click(); draw(); };
    const dn = el('button', 'mbtn', 'Done'); dn.onclick = close; bt.append(all, dn); box.append(bt); };
  draw(); document.body.append(wrap); requestAnimationFrame(() => wrap.classList.add('in')); }
function nameOf(slot, id) { const L = slot === 'armor' ? ARMOR : slot === 'helmet' ? HELMETS : slot === 'nvg' ? NVGS : ATTACHMENTS; const x = L.find(a => a.id === id); return x ? x.name : id === 'none' ? 'None' : id; }
