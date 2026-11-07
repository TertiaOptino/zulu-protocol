// BATCH 4 — five stages per mission. Each stage is a derived map (mirrored / rotated layout of the mission map,
// stage 2 is the dark "lower level") with its own mode, hostile count, par time, pay and 3-star rating.
// Progress lives in save.stages[missionId][stage] = best stars, save.stageBest[missionId][stage] = best seconds.
// Old saves: a mission already completed in the classic mode unlocks all of its stages.
import { el, fmtTime } from './util.js';
import { MAPS, MISSIONS, buildGrid } from './maps.js';
import { MODES, DIFFS } from './data.js';
import { writeSave } from './save.js';
import { sfx } from './audio.js';
import { ensureB4, CONSUMABLES } from './market-data.js';
import { w1StageName, w1Goal, w1OpGoal } from './stagenames.js'; // w1: stage names = places on the site, one goal per operation

export const STAGE_COUNT = 5;
const NAMES = {
  hkoffice: ['Lobby', 'Car Park', 'Floors 12–20', 'Floors 30–40'], embassy: ['Front Gate', 'Motor Pool', 'Consular Wing', 'Residence'],
  warehouse: ['Loading Yard', 'Cold Store', 'Container Stacks', 'Office Block'], kandahar: ['Outer Wall', 'Stables', 'Courtyard', 'Safe Rooms'],
  oilrig: ['Helideck', 'Pump Room', 'Drill Floor', 'Crew Quarters'], subway: ['Street Entrance', 'Service Tunnels', 'Ticket Hall', 'Platform B'],
  bank: ['Lobby', 'Underground Car Park', 'Trading Floor', 'Vault Corridor'], ship: ['Gangway', 'Cargo Hold', 'Main Deck', 'Bridge Deck'],
  nairobi: ['Perimeter', 'Garage', 'Admin Wing', 'Records Room'], rio: ['Dock Gate', 'Truck Bay', 'Warehouse Floor', 'Mezzanine'],
};
const GENERIC = ['Approach', 'Lower Level', 'Inner Rooms', 'Upper Level'];
const XF = ['flipY', 'transpose', 'flipX', 'rot180', 'none'];
const ENEMY = [0.45, 0.6, 0.7, 0.85, 1], PAR = [0.6, 0.7, 0.8, 0.9, 1], CASH = [0.25, 0.3, 0.35, 0.4, 0.6];
const MODE_POOL = ['hunt', 'intel', 'hostage', 'bomb', 'extract'];
const stars = (n, max = 3) => '<span class="stars">' + Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('') + '</span>';
const hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0');
const dim = (c, k) => ((((c >> 16) & 255) * k) << 16) | ((((c >> 8) & 255) * k) << 8) | ((c & 255) * k);

export function stageName(m, n) { const w1 = w1StageName(m, n); if (w1) return w1; /* w1 */ if (n === STAGE_COUNT) return 'Final: ' + m.title; return (NAMES[m.map] || GENERIC)[n - 1] || GENERIC[n - 1]; }
export function stageModes(m) { return Array(STAGE_COUNT).fill(m.mode); } // w1: single-goal operations — every stage serves the operation's own objective (was a mix from MODE_POOL)

function transform(g, how) { const H = g.length, W = g[0].length; const out = [];
  if (how === 'transpose') { for (let y = 0; y < W; y++) { const r = []; for (let x = 0; x < H; x++) r.push(g[x][y]); out.push(r); } return out; }
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) { const sy = how === 'flipY' || how === 'rot180' ? H - 1 - y : y, sx = how === 'flipX' || how === 'rot180' ? W - 1 - x : x; r.push(g[sy][sx]); } out.push(r); } return out; }

export function stageMapKey(m, n) { return `${m.map}@s${n}`; }
export function ensureStageMap(m, n) { const key = stageMapKey(m, n); if (MAPS[key]) return key; const base = MAPS[m.map];
  let g = transform(buildGrid(base), XF[n - 1]); const H = g.length, W = g[0].length; const want = stageEnemies(m, n);
  let keepE = want; for (const r of g) for (let x = 0; x < W; x++) if (r[x] === 'E') { if (keepE > 0) keepE--; else r[x] = 'e'; } // thin forced spawns
  const dark = n === 2; if (dark) for (const r of g) for (let x = 0; x < W; x++) if ('~_='.includes(r[x])) r[x] = '.';
  const ops = [['G', ',']]; g.forEach((r, y) => ops.push(['S', 0, y, r.join('')]));
  for (const z of ['1', '2', '3', '4']) { const y = g.findIndex(r => r.includes(z)); if (y >= 0) ops.push(['F', g[y].indexOf(z), y, 1, 1, z]); } // deploy screen reads entry zones from F ops
  const th = base.theme; const theme = dark ? { ...th, time: 'night', sky: dim(th.sky, 0.25), ground: dim(th.ground, 0.7), wall: dim(th.wall, 0.75), concrete: dim(th.concrete, 0.75) } : { ...th };
  MAPS[key] = { name: `${base.name} · ${stageName(m, n).replace(/^Final: .*/, 'Final')}`, place: base.place, w: W, h: H, theme, ops, stageOf: m.map };
  return key; }
const stageEnemies = (m, n) => Math.max(3, Math.round((m.enemies || 10) * ENEMY[n - 1]));
export function stageMission(m, n) { const mode = stageModes(m)[n - 1]; const sm = { ...m, id: `${m.id}#s${n}`, parent: m.id, stage: n, mode, map: ensureStageMap(m, n),
  title: `${m.title} — ${n}/${STAGE_COUNT} ${stageName(m, n).replace(/^Final: .*/, 'Final')}`, stageTitle: stageName(m, n), goal: w1Goal(m, stageName(m, n)) /* w1 */, enemies: stageEnemies(m, n), par: Math.round(m.par * PAR[n - 1]), cash: Math.round(m.cash * CASH[n - 1] / 10) * 10 };
  if (mode === 'bomb') sm.timer = m.mode === 'bomb' ? (m.timer || 210) : 180; else delete sm.timer; delete sm.req; return sm; }

export function stageInfo(s, m) { ensureB4(s); const st = s.stages[m.id] || {}, best = s.stageBest[m.id] || {}; const legacy = !!s.completed[m.id];
  const list = []; for (let n = 1; n <= STAGE_COUNT; n++) list.push({ n, stars: st[n] || 0, best: best[n] || 0, open: n === 1 || legacy || (st[n - 1] || 0) > 0, cleared: (st[n] || 0) > 0 });
  const total = list.reduce((a, x) => a + x.stars, 0); return { list, total, cleared: list.filter(x => x.cleared).length, legacy }; }

export function recordStage(s, r) { ensureB4(s); const m = r.mission, pid = m.parent, n = m.stage;
  s.cash += r.cash; s.stats.missions++; s.stats.kills += r.kills; for (const k in r.used) s.stock[k] = Math.max(0, (s.stock[k] || 0) - r.used[k]);
  if (r.win) { const st = s.stages[pid] = s.stages[pid] || {}, bt = s.stageBest[pid] = s.stageBest[pid] || {};
    st[n] = Math.max(st[n] || 0, r.stars); if (!bt[n] || r.time < bt[n]) bt[n] = Math.round(r.time);
    const info = stageInfo(s, MISSIONS.find(x => x.id === pid) || { id: pid });
    s.stars[pid] = Math.max(s.stars[pid] || 0, Math.floor(info.total / STAGE_COUNT)); // stage stars roll up into campaign stars
    if (info.cleared === STAGE_COUNT) { s.completed[pid] = true; const sum = info.list.reduce((a, x) => a + x.best, 0); if (!s.best[pid] || sum < s.best[pid]) s.best[pid] = sum; } }
  writeSave(s); }

export function installStages(app) { const menus = app.menus;
  app.stages = { select: (m) => stageSelect(menus, m), mission: stageMission, info: (m) => stageInfo(menus.s, m) };
  app.stagePips = (m) => { const i = stageInfo(menus.s, m); return `<div class="mc-stages" title="Stages cleared">${i.list.map(x => `<i class="${x.cleared ? 'c' + x.stars : x.open ? 'o' : ''}"></i>`).join('')}<small>${i.cleared}/${STAGE_COUNT}</small></div>`; };
  const aar = menus.aar.bind(menus); menus.aar = function (r) { if (r.mission && r.mission.stage) return stageDone(menus, r); return aar(r); };
  const deploy = menus.deploy.bind(menus); menus.deploy = function (m) { const r = deploy(m); if (m.stage) { const b = menus.root.querySelector('.scr-head .back'); const P = MISSIONS.find(x => x.id === m.parent); if (b && P) b.onclick = () => { sfx.ui(); stageSelect(menus, P); }; menus.root.querySelector('.screen.deploy')?.classList.add('stage-deploy'); } return r; };
}

function themeStrip(key) { const t = MAPS[key].theme; return `background:linear-gradient(135deg, ${hex(t.sky)} 0%, ${hex(t.ground)} 60%, ${hex(t.wall)} 100%)`; }
function miniMap(key) { const d = MAPS[key]; const g = buildGrid(d); const W = d.w, H = d.h; let p = '';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = g[y][x]; const col = c === '#' ? '#cfd8dc' : c === 'W' || c === 'r' ? '#7fb3d5' : 'DLTZ'.includes(c) ? '#f0b429' : 'cotkpbsCPF'.includes(c) ? '#7b8790' : '1234'.includes(c) ? '#6ee07a' : c === 'X' ? '#3ddc97' : c === 'I' ? '#59c3ff' : c === 'H' || c === 'V' ? '#ffd166' : c === 'B' ? '#ff5d5d' : ''; if (col) p += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col}"/>`; }
  return `<svg class="st-mini" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${p}</svg>`; }

export function stageSelect(menus, m) { const s = menus.s; ensureB4(s); const body = menus.screen('stages', m.title, () => menus.missions()); const info = stageInfo(s, m); const map = MAPS[m.map];
  const pct = Math.round(info.total / (STAGE_COUNT * 3) * 100);
  body.append(el('div', 'st-hero', `<div class="st-hero-t"><div class="br-mode">${MODES[m.mode].name} · ${DIFFS[m.diff].name}</div><h3>${map.name}</h3><small>${map.place} · ${STAGE_COUNT} stages · clear them in order</small><small class="w1opgoal">Goal: ${w1OpGoal(m, map.name)}</small></div><div class="st-prog"><b>★ ${info.total}<small>/${STAGE_COUNT * 3}</small></b><i><b style="width:${pct}%"></b></i><small>${info.cleared}/${STAGE_COUNT} cleared${info.legacy ? ' · unlocked by your classic clear' : ''}</small></div>`)); // w1: operation goal line (.w1opgoal)
  const grid = el('div', 'st-grid'); const next = info.list.find(x => x.open && !x.cleared);
  for (const it of info.list) { const sm = stageMission(m, it.n); const lock = !it.open;
    const c = el('button', 'stcard' + (lock ? ' locked' : '') + (it.cleared ? ' done' : '') + (next && next.n === it.n ? ' next' : '') + (it.n === STAGE_COUNT ? ' final' : ''),
      `<div class="st-strip" style="${themeStrip(sm.map)}">${miniMap(sm.map)}<span class="st-num">${it.n}</span>${it.n === 2 ? '<span class="st-tag">Low light</span>' : ''}${it.n === STAGE_COUNT ? '<span class="st-tag gold">Final</span>' : ''}</div>
      <div class="st-body"><b>${sm.stageTitle}</b><small class="w1goal">${sm.goal}</small><small>${MODES[sm.mode].name} · ~${sm.enemies} hostiles · par ${fmtTime(sm.par)}</small><div class="mc-row">${stars(it.stars)}<span class="st-pay">$${sm.cash}</span></div>
      <div class="mc-best">${lock ? '🔒 Clear stage ' + (it.n - 1) + ' first' : it.cleared ? (it.best ? '✓ Cleared · best ' + fmtTime(it.best) : '✓ Cleared') : next && next.n === it.n ? 'Next up ▶' : 'Not cleared'}</div></div>`);
    c.dataset.stage = it.n; c.onclick = () => { if (lock) { sfx.ui(); menus.app.toast(`Clear stage ${it.n - 1} first.`, 'bad'); return; } sfx.ui(); menus.deploy(sm); }; grid.append(c); } // w1: L83 stage card shows the stage objective (.w1goal)
  body.append(grid);
  const kit = el('div', 'st-kit'); const crates = CONSUMABLES.filter(c => c.ammo);
  kit.innerHTML = `<h4>Ammo for the next deployment <small>one crate is used per mission</small></h4>`; const ch = el('div', 'chips');
  for (const c of crates) { const n = s.stock[c.id] || 0; const on = !!s.loadout[c.id]; const b = el('button', 'chip' + (on ? ' on' : '') + (n ? '' : ' dis'), `${c.name.replace(/ \(crate\)/, '')} <small>×${n}</small>`);
    b.onclick = () => { if (!n) { menus.app.toast('Buy ammo crates in Armory → Ammo.', 'bad'); return; } s.loadout[c.id] = !on; writeSave(s); sfx.ui(); stageSelect(menus, m); }; ch.append(b); }
  kit.append(ch); const st = s.stock; kit.append(el('div', 'kitline', `Gear: ✸ ${st.flash} flash · ● ${st.frag} frag · ☁ ${st.smoke} smoke · ✺ ${st.stinger || 0} stinger · ♨ ${st.cs || 0} CS · 💥 ${st.charge} charges · ✚ ${st.medkit} medkits · ${st.trauma || 0} trauma`));
  const row = el('div', 'st-btns'); row.append(menus.btn('Armory', '', () => menus.armory()), menus.btn('Full operation (classic)', 'st-classic', () => menus.deploy(m)));
  if (next) row.append(menus.btn(`Stage ${next.n} ▶`, 'primary st-go', () => menus.deploy(stageMission(m, next.n))));
  kit.append(row); body.append(kit);
}

export function stageDone(menus, r) { const s = menus.s; const m = r.mission; const P = MISSIONS.find(x => x.id === m.parent) || m; const n = m.stage;
  const before = stageInfo(s, P); if (!r.applied) { r.applied = true; recordStage(s, r); } const info = stageInfo(s, P);
  const opDone = info.cleared === STAGE_COUNT && before.cleared < STAGE_COUNT;
  const body = menus.screen('aar stagedone', r.win ? `Stage ${n} complete` : 'Stage report', null);
  const res = r.win ? (n === STAGE_COUNT || opDone ? 'OPERATION COMPLETE' : `STAGE ${n} CLEARED`) : r.aborted ? 'STAGE ABANDONED' : 'STAGE FAILED';
  body.append(el('div', 'aar-head ' + (r.win ? 'win' : 'lose'), `<div class="res">${res}</div><div class="mt">${m.stageTitle} — ${MODES[m.mode].name}</div>${m.goal ? `<div class="w1goal">${m.goal}</div>` : ''}${stars(r.stars)}${r.reason ? `<div class="reason">${r.reason}</div>` : ''}${r.aborted ? '<div class="reason">Cleared stages are kept. Pick up where you left off any time.</div>' : ''}`)); // w1: stage objective under the AAR title (.w1goal)
  body.append(el('div', 'st-track', info.list.map(x => `<div class="${x.cleared ? 'c' : ''}${x.n === n ? ' cur' : ''}${!x.open ? ' lk' : ''}"><i>${x.n}</i>${stars(x.stars)}<small>${stageName(P, x.n).replace(/^Final: .*/, 'Final')}</small></div>`).join('')));
  const rows = [['Time', `${fmtTime(r.time)} <small>(par ${fmtTime(r.par)})</small>`], ['Accuracy', r.acc + '%'], ['Hostiles neutralised', `${r.kills} / ${r.enemies}`], ['Operators wounded', r.wounded], ['Operators KIA', r.kia]];
  if (r.hostages) rows.push(['Hostages saved', r.win ? `${r.saved} / ${r.hostages}` : `0 / ${r.hostages}`]); if (r.vip) rows.push(['VIP', r.vip]);
  const used = Object.entries(r.used).filter(([k, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', '); if (used) rows.push(['Gear used', used]);
  rows.push(['Cash earned', `<b class="cash">+$${r.cash.toLocaleString()}</b>${r.aborted ? ' <small>(quit — no pay)</small>' : ''}`]); rows.push(['Operation progress', `★ ${info.total}/${STAGE_COUNT * 3} · ${info.cleared}/${STAGE_COUNT} stages`]);
  body.append(el('table', 'aar-tbl', rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')));
  body.append(el('div', 'aar-stars', `<div class="${r.win ? 'on' : ''}">★ Stage complete</div><div class="${r.win && r.underPar ? 'on' : ''}">★ Under par time</div><div class="${r.win && r.flawless ? 'on' : ''}">★ No operators or civilians lost</div>`));
  const bt = el('div', 'aar-btns'); const nx = info.list[n]; const finale = r.win && !s.ending && MISSIONS.every(x => s.completed[x.id]); if (finale) { s.ending = true; writeSave(s); }
  if (finale) bt.append(menus.btn('Campaign complete ▶', 'primary', () => menus.ending()));
  else if (r.win && nx && nx.open) bt.append(menus.btn(`Next: stage ${n + 1} ▶`, 'primary st-next', () => menus.deploy(stageMission(P, n + 1))));
  bt.append(menus.btn('Retry stage', '', () => menus.deploy(stageMission(P, n))), menus.btn('Stage select', r.win && !nx ? 'primary' : '', () => stageSelect(menus, P)), menus.btn('World map', '', () => menus.missions()), menus.btn('Armory', '', () => menus.armory()));
  body.append(bt);
}
