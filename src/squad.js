import { el } from './util.js';
import { opStyle } from './charstyle.js';
import { CAMOS, camoCSS, lookForUnit, flagURL } from './looks.js';
import { charImg } from './thumbs.js';
import { UNITS, CLASSES, WEAPONS, ATTACHMENTS, ARMOR, KITS, SKIN, TEAMS } from './data.js';
import { opStats } from './opstats.js';
import { writeSave, roster } from './save.js';
import { sfx } from './audio.js';
// Squad roster, unit recruitment and the full operator creator.
const NAMES = ['Havoc', 'Raven', 'Blaze', 'Talon', 'Wraith', 'Jinx', 'Rook', 'Hawk', 'Atlas', 'Cobra', 'Dusk', 'Flint', 'Grim', 'Halo', 'Ivy', 'Jester', 'Kestrel', 'Lynx', 'Moose', 'Nova', 'Onyx', 'Pike', 'Quill', 'Rogue', 'Sparrow', 'Tank', 'Ursa', 'Vandal', 'Wolf', 'Yeti', 'Zephyr', 'Badger', 'Comet', 'Drift', 'Ember', 'Fox'];
export function charStyle(o) { return opStyle(o); }
// Showcase operator for a unit in the store: its own look, signature weapon and plate carrier.
export function unitShowStyle(u) { const sig = (lookForUnit(u.id).sig || []).find(id => WEAPONS.some(w => w.id === id)) || 'm4a1'; return opStyle({ unit: u.id, kit: 'unit', cls: 'assault', weapon: sig, optic: 'reddot', muzzle: 'none', armor: 'plate', skin: (u.id.length * 7) % 5, team: -1 }); }
const allowed = (cls) => [...(CLASSES.find(c => c.id === cls) || CLASSES[0]).weapons, 'pistol'];
export function installSquad(menus) {
  const app = menus.app;
  app.squadScreen = (tab = 'ops', reopen) => {
    closeUnitPreview(app, true); app.setPreview(null); const s = app.save; const body = menus.screen('squad', 'Squad', () => menus.main());
    const tabs = el('div', 'tabs'); for (const [id, n] of [['ops', 'Operators'], ['units', `Buy units (${s.units.length}/${UNITS.length} owned)`]]) { const b = el('button', 'tab' + (tab === id ? ' on' : ''), n); b.onclick = () => { sfx.ui(); app.squadScreen(id); }; tabs.append(b); }
    body.append(tabs);
    if (tab === 'ops') {
      const U = UNITS.find(u => u.id === s.unit); const R = roster(s);
      const us = el('div', 'chips'); for (const id of s.units) { const u = UNITS.find(x => x.id === id); if (!u) continue; const b = el('button', 'chip' + (id === s.unit ? ' on' : ''), u.name); b.onclick = () => { s.unit = id; roster(s); writeSave(s); sfx.ui(); app.squadScreen(); }; us.append(b); }
      const buyMore = el('button', 'chip', '+ Buy units'); buyMore.onclick = () => app.squadScreen('units'); us.append(buyMore);
      body.append(el('h4', 'shop-h', 'ACTIVE UNIT'), us, el('div', 'unit-banner', `<b>${U.name}</b> <small>${U.country} · ${U.type}</small><div class="perk">★ ${U.perk}</div><small class="dim">Each unit has its own operators. A mission uses one unit for every team.</small>`));
      const grid = el('div', 'opgrid');
      for (const o of R) { const st = opStats(o); const t = TEAMS[o.team]; const c = el('button', 'opcard', `<div class="oc-t" style="background:${t ? t.css : '#555'}">${t ? t.short : '—'}</div><b>${o.name}</b><small>${st.c.name} · ${st.u.name}</small><small class="dim">${st.w.name} · ${st.ar.name}</small>`); c.onclick = () => { sfx.ui(); app.opEditor(o); }; grid.append(c); }
      body.append(grid);
      const auto = menus.btn('Auto-assign teams (4 / 3 / 3)', '', () => { roster(s).forEach((o, i) => o.team = i < 4 ? 0 : i < 7 ? 1 : 2); writeSave(s); app.squadScreen(); }); body.append(auto);
    } else {
      const buy = (u) => { if (s.cash < u.cost) { sfx.lose(); return false; } s.cash -= u.cost; s.units.push(u.id); s.unit = u.id; for (const wid of (lookForUnit(u.id).sig || [])) if (WEAPONS.some(w => w.id === wid) && !s.owned.weapons.includes(wid)) s.owned.weapons.push(wid); roster(s); writeSave(s); sfx.click(); return true; };
      const pick = (u) => openUnitPreview(app, u, { buy, onChange: () => app.squadScreen('units', u.id) }); body.querySelectorAll?.('.urow');
      const byC = {}; for (const u of UNITS) (byC[u.country] = byC[u.country] || []).push(u);
      for (const [country, list] of Object.entries(byC)) { body.append(el('h4', 'shop-h', `<img class="flag" src="${flagURL(country)}"> ${country.toUpperCase()}`)); for (const u of list) { const own = s.units.includes(u.id); const r = el('div', 'shoprow urow' + (own ? ' owned' : ''), `<div class="si"><b>${u.name}</b><small>${u.type} · <span class="perk">${u.perk}</span></small></div>`); r.dataset.u = u.id; r.prepend(charImg(unitShowStyle(u), 'head', 'upimg', 96, 112)); r.onclick = (e) => { if (e.target.closest('.buy')) return; sfx.ui(); pick(u); body.querySelectorAll('.urow').forEach(x => x.classList.toggle('sel', x === r)); }; const b = el('button', 'buy', own ? (s.unit === u.id ? 'Active' : 'Select') : `Buy $${u.cost}`); if (own) { if (s.unit === u.id) b.disabled = true; else b.onclick = () => { s.unit = u.id; roster(s); writeSave(s); sfx.ui(); app.squadScreen('units'); }; } else { if (s.cash < u.cost) b.classList.add('poor'); b.onclick = () => { if (buy(u)) app.squadScreen('units'); }; } r.append(b); body.append(r); } }
      if (reopen) { const u = UNITS.find(x => x.id === reopen); if (u) pick(u); }
    }
  };
  app.opEditor = (o) => {
    const s = app.save; const body = menus.screen('editor', 'Operator', () => app.squadScreen()); menus.root.classList.add('see');
    const save = () => { writeSave(s); app.setPreview(charStyle(o)); draw(); };
    const panel = el('div', 'ed-panel'); body.append(panel);
    const sec = (title) => { const d = el('div', 'ed-sec', `<h4>${title}</h4>`); panel.append(d); return d; };
    const chips = (parent, items, cur, fn, cls = '') => { const w = el('div', 'chips ' + cls); for (const it of items) { const b = el('button', 'chip' + (it.id === cur ? ' on' : '') + (it.dis ? ' dis' : ''), it.label); if (it.style) b.style.cssText = it.style; if (it.title) b.title = it.title; b.onclick = () => { if (it.dis) return; sfx.ui(); fn(it.id); }; w.append(b); } parent.append(w); };
    function draw() {
      panel.innerHTML = '';
      const n = sec('Callsign'); const inp = el('input', 'ed-name'); inp.value = o.name; inp.maxLength = 14; inp.oninput = () => { o.name = inp.value.trim() || 'Operator'; writeSave(s); }; const rb = el('button', 'chip', '🎲'); rb.onclick = () => { o.name = NAMES[Math.floor(Math.random() * NAMES.length)]; save(); }; const row = el('div', 'chips'); row.append(inp, rb); n.append(row);
      const st = opStats(o);
      sec('Unit').append(el('div', '', `<b>${st.u.name}</b> <small class="dim">${st.u.country}</small>`), el('div', 'perk', '★ ' + st.u.perk));
      chips(sec('Class'), CLASSES.map(c => ({ id: c.id, label: c.name, title: c.desc })), o.cls, (id) => { o.cls = id; const ok = allowed(id); if (!ok.includes(st.w.type)) { const w = WEAPONS.find(w => ok.includes(w.type) && s.owned.weapons.includes(w.id)); if (w) o.weapon = w.id; } save(); }); panel.lastChild.append(el('small', 'dim', st.c.desc));
      chips(sec('Team'), [...TEAMS.map(t => ({ id: t.id, label: t.name, style: `color:${t.css}` })), { id: -1, label: 'Bench' }], o.team, (id) => { o.team = id; save(); });
      const ap = sec('Appearance'); chips(ap, [{ id: 'unit', label: 'Unit', title: 'Unit standard issue (camo, headgear, vest)' }, ...['multicam', 'woodland', 'aor1', 'dcu', 'flecktarn', 'dpm', 'auscam', 'm05', 'tiger', 'alpine', 'black', 'navy', 'olive', 'coyote'].filter(id => CAMOS[id]).map(id => ({ id, label: '', title: CAMOS[id].name, style: `background:${camoCSS(id)};background-size:cover;width:34px;height:34px` }))], o.kit || 'unit', (id) => { o.kit = id; save(); }, 'sw');
      chips(ap, SKIN.map((c, i) => ({ id: i, label: '', style: `background:#${c.toString(16).padStart(6, '0')};width:30px;height:30px;border-radius:50%` })), o.skin, (id) => { o.skin = id; save(); }, 'sw');
      const ok = allowed(o.cls); chips(sec('Weapon'), WEAPONS.filter(w => ok.includes(w.type)).map(w => ({ id: w.id, label: `${w.name}<small>${w.type}</small>`, dis: !s.owned.weapons.includes(w.id), title: s.owned.weapons.includes(w.id) ? '' : 'Buy in the Armory' })), o.weapon, (id) => { o.weapon = id; save(); }, 'weps');
      const at = sec('Attachments & armour');
      chips(at, ATTACHMENTS.filter(a => a.slot === 'muzzle').map(a => ({ id: a.id, label: a.name, dis: !s.owned.att.includes(a.id) })), o.muzzle, (id) => { o.muzzle = id; save(); });
      chips(at, ATTACHMENTS.filter(a => a.slot === 'optic').map(a => ({ id: a.id, label: a.name, dis: !s.owned.att.includes(a.id) })), o.optic, (id) => { o.optic = id; save(); });
      chips(at, ARMOR.map(a => ({ id: a.id, label: a.name, dis: !s.owned.armor.includes(a.id) })), o.armor, (id) => { o.armor = id; save(); });
      at.append(el('small', 'dim', 'Greyed-out items can be bought in the Armory.'));
      const bar = (label, v, max, txt) => `<div class="stat"><span>${label}</span><i><b style="width:${Math.min(100, v / max * 100)}%"></b></i><em>${txt}</em></div>`;
      sec('Stats').insertAdjacentHTML('beforeend', bar('Health', st.hp, 130, st.hp) + bar('Speed', st.speed / 3.3, 1.25, Math.round(st.speed / 3.3 * 100) + '%') + bar('Accuracy', st.acc, 1, Math.round(st.acc * 100)) + bar('Reactions', 1.2 - st.aim, 1.2, st.aim.toFixed(2) + 's') + bar('Damage', st.dmg, 150, Math.round(st.dmg)) + bar('Range', st.range, 30, Math.round(st.range) + 'm') + bar('Armour', st.armor, 0.8, Math.round(st.armor * 100) + '%') + bar('Stealth', 30 - st.noise, 30, Math.round(st.noise) + 'm noise'));
      const R = roster(s); const nav = el('div', 'ed-nav'); const i = R.indexOf(o); nav.append(menus.btn('‹ Prev', '', () => app.opEditor(R[(i + 9) % R.length])), menus.btn('Done', 'primary', () => app.squadScreen()), menus.btn('Next ›', '', () => app.opEditor(R[(i + 1) % R.length]))); panel.append(nav);
    }
    draw(); app.setPreview(charStyle(o));
  };
}

// ---------- right-side unit preview (store) ----------
// The 3D soldier is drawn by the main canvas behind the menu (App.pvRect frames it inside the panel's transparent stage).
let PV = null;
export function closeUnitPreview(app, silent) {
  if (!PV) return; const p = PV; PV = null; p.el.classList.remove('open'); removeEventListener('keydown', p.onKey, true); removeEventListener('pointerdown', p.onOut, true); app.pvRect = null; app.pvView = null; app.setPreview(null); app.menus.root.classList.remove('see', 'pv-open');
  if (silent) p.el.remove(); else setTimeout(() => p.el.remove(), 220); document.querySelectorAll('.urow.sel').forEach(x => x.classList.remove('sel'));
}
function bindPreviewStage(app, stage) {
  const ptr = new Map(); let pd = 0;
  stage.addEventListener('pointerdown', e => { if (!app.pvView) return; try { stage.setPointerCapture?.(e.pointerId); } catch (_) { } ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); app.pvView.spin = false; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pd = Math.hypot(a.x - b.x, a.y - b.y); } });
  stage.addEventListener('pointermove', e => { const q = ptr.get(e.pointerId); const v = app.pvView; if (!q || !v) return; if (ptr.size === 1) v.yaw += (e.clientX - q.x) * 0.012; q.x = e.clientX; q.y = e.clientY;
    if (ptr.size === 2) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pd > 0) v.dist = Math.max(2.2, Math.min(6.5, v.dist * pd / d)); pd = d; } });
  const up = e => { ptr.delete(e.pointerId); pd = 0; }; stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('touchmove', e => e.preventDefault(), { passive: false }); // drag/pinch rotates the model instead of scrolling the page
  stage.addEventListener('wheel', e => { e.preventDefault(); const v = app.pvView; if (!v) return; v.spin = false; v.dist = Math.max(2.2, Math.min(6.5, v.dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
}
export function openUnitPreview(app, u, { buy, onChange }) {
  const s = app.save; const own = s.units.includes(u.id); const active = s.unit === u.id;
  let host = PV && PV.el; if (!host) { host = el('div', 'uprev'); document.body.append(host); }
  host.innerHTML = `<button class="up-x" aria-label="Close">✕</button><div class="up-stage"><div class="up-hint">${matchMedia('(pointer: coarse)').matches ? 'Drag to spin · pinch to zoom' : 'Drag to spin · scroll to zoom'}</div></div>
    <div class="up-info"><div class="up-head"><img class="flag big" src="${flagURL(u.country)}"><div><b>${u.name}</b><small>${u.country} · ${u.type}</small></div></div>
    <div class="perk">★ ${u.perk}</div><div class="up-price">${own ? (active ? 'Active unit' : 'Owned') : '$' + u.cost.toLocaleString()}</div>
    <button class="buy up-act">${own ? (active ? '✓ Active' : 'Select unit') : (s.cash >= u.cost ? `Buy $${u.cost.toLocaleString()}` : `Need $${(u.cost - s.cash).toLocaleString()} more`)}</button></div>`;
  const act = host.querySelector('.up-act'); if (own && active) act.disabled = true; if (!own && s.cash < u.cost) act.classList.add('poor');
  act.onclick = () => { if (own) { s.unit = u.id; roster(s); writeSave(s); sfx.ui(); } else if (!buy(u)) return; onChange(); };
  host.querySelector('.up-x').onclick = (e) => { e.stopPropagation(); sfx.ui(); closeUnitPreview(app); };
  const stage = host.querySelector('.up-stage'); app.setPreview(unitShowStyle(u)); app.pvView = app.pvView || { yaw: 0.4, dist: 4.2, spin: true };
  app.pvRect = () => stage.getBoundingClientRect(); app.menus.root.classList.add('see', 'pv-open');
  bindPreviewStage(app, stage); // every open (incl. switching units) rebuilds .up-stage, so the fresh element needs its own drag/pinch/wheel listeners
  if (!PV) {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeUnitPreview(app); } };
    const onOut = (e) => { if (!e.target.closest('.uprev') && !e.target.closest('.urow')) closeUnitPreview(app); };
    addEventListener('keydown', onKey, true); addEventListener('pointerdown', onOut, true);
    PV = { el: host, onKey, onOut }; requestAnimationFrame(() => { if (PV && PV.el === host) host.classList.add('open'); }); // a quick outside tap can close it before this frame; don't re-open
  }
}
