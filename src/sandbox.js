// w1: AI Sandbox — AI vs AI on any map, separate from the campaign. Main menu → "🤖 AI Sandbox" → pick a map + hostiles.
// The operators run themselves (the mission's auto-plan breach, then a commander that sends each idle team at the nearest
// hostile, breaching closed doors on the way); hostiles use the normal enemy AI. Spectator bar: free / follow camera
// (cycles through every live unit), speed ½×–3×, restart, exit. Sandbox results never touch the save (no cash, stars,
// stock or roster changes): App.onEnd is bypassed for missions flagged .sandbox.
import { MAPS, MISSIONS } from './maps.js';
import { roster } from './save.js';
const SPEEDS = [0.5, 1, 2, 3];
const COUNTS = [8, 14, 22];
const CMD_EVERY = 1.0; // s of game time between commander passes
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };

export function sandboxMaps() { const seen = new Set(); return MISSIONS.filter(m => !m.training && !m.tut && MAPS[m.map] && !m.map.includes('@') && !seen.has(m.map) && seen.add(m.map)).map(m => m.map); }
export function sandboxMission(map, enemies = COUNTS[1]) { return { id: 'sbx_' + map, map, mode: 'hunt', diff: 1, enemies, par: 900, cash: 0, title: 'AI Sandbox · ' + MAPS[map].name, sandbox: true }; }

// ---- commander: one pass over the three teams ----
function pickMethod(g, units, door) { const tough = door.locked || door.trapped; for (const m of tough ? ['charge', 'shotgun', 'lockpick'] : ['kick']) if (!g.canBreach(units, m)) return m; return null; }
export function commandTeams(g) { const L = g.level; const foes = g.enemies.filter(e => e.alive); if (!foes.length) return 0; let n = 0;
  for (const t of [0, 1, 2]) { const units = g.ops.filter(o => o.alive && o.team === t); if (!units.length) continue;
    const busy = units.some(u => u.orders.length || u.cur) || g.breaches.some(b => b.phase !== 'done' && b.units.some(u => units.includes(u))); if (busy) continue;
    const lead = units[0]; const lx = Math.floor(lead.x), lz = Math.floor(lead.z);
    const tgts = foes.map(e => ({ e, d: Math.hypot(e.x - lead.x, e.z - lead.z) })).sort((a, b) => a.d - b.d);
    for (const { e } of tgts.slice(0, 4)) { const path = L.findPath(lx, lz, Math.floor(e.x), Math.floor(e.z), {}); if (!path || !path.length) continue;
      const door = path.map(c => L.doors.find(d => d.i === c)).find(d => d && d.state === 'closed');
      if (door) { const m = pickMethod(g, units, door); if (!m) continue; if (g.orderBreach(units, door, m, false, false)) { n++; break; } continue; }
      g.orderMove(units, e.x, e.z); n++; break; } }
  return n; }

export function installSandbox(Game) { if (Game.prototype.__w1sbx) return; Game.prototype.__w1sbx = true;
  const step = Game.prototype.step; Game.prototype.step = function (dt) { step.call(this, dt);
    if (!this.mission || !this.mission.sandbox || this.over || this.paused) return; this.w1cmdT = (this.w1cmdT ?? 0.5) - dt;
    if (this.w1cmdT <= 0) { this.w1cmdT = CMD_EVERY; this.w1cmds = (this.w1cmds || 0) + commandTeams(this); } };
}

// ---- menus + spectator bar ----
export function installSandboxApp(app) { const menus = app.menus; if (!menus || menus.__w1sbx) return; menus.__w1sbx = true;
  const main = menus.main.bind(menus); menus.main = function () { const r = main(); const col = menus.root.querySelector('.mm-col');
    if (col && !col.querySelector('.w1sbx-btn')) { const b = menus.btn('🤖 AI Sandbox', 'big w1sbx-btn', () => sandboxScreen(app)); const tut = col.querySelector('.tutb'); tut ? tut.after(b) : col.append(b); } return r; };
  const onEnd = app.onEnd.bind(app); app.onEnd = function (r) { if (r && r.mission && r.mission.sandbox) return sandboxEnd(app, r); return onEnd(r); };
  app.sandbox = { start: (map, n) => startSandbox(app, map, n), screen: () => sandboxScreen(app), mission: sandboxMission, maps: sandboxMaps };
}
function sandboxScreen(app) { const menus = app.menus; const body = menus.screen('sandbox', 'AI Sandbox', () => menus.main()); let count = app.w1sbxCount || COUNTS[1];
  body.append(el('div', 'w1sbx-intro', '<b>AI vs AI.</b> Your squad runs itself against the hostiles. Watch with a free or follow camera, change the speed, restart any time. Nothing here counts for the campaign.'));
  const cnt = el('div', 'w1sbx-count'); const drawCnt = () => { cnt.innerHTML = '<span>Hostiles</span>'; for (const c of COUNTS) { const b = el('button', 'w1sbx-chip' + (c === count ? ' on' : ''), String(c)); b.onclick = () => { count = app.w1sbxCount = c; drawCnt(); }; cnt.append(b); } }; drawCnt(); body.append(cnt);
  const grid = el('div', 'w1sbx-grid'); for (const k of sandboxMaps()) { const d = MAPS[k]; const b = el('button', 'w1sbx-map', `<b>${d.name}</b><small>${d.place}</small>`); b.dataset.map = k; b.onclick = () => startSandbox(app, k, count); grid.append(b); } body.append(grid); }
function squadOf(app) { return roster(app.save).filter(o => o.team >= 0); }
function startSandbox(app, map, n) { const m = sandboxMission(map, n || COUNTS[1]); app.w1sbxLast = { map, n: m.enemies };
  app.startMission(m, squadOf(app), { ...(app.menus.lastDeploy?.[map] || {}) }); const g = app.game; if (!g) return; g.settings.cine = false;
  const hud = app.hud; if (hud.planning) { if (g.plan && g.plan.length && hud.executePlan) hud.executePlan(); else { hud.closePlan(); } } g.setPaused(false);
  sandboxBar(app); }
function sandboxBar(app) { document.querySelector('.w1sbx-bar')?.remove(); const g = app.game, hud = app.hud, cam = app.env.cam; const bar = el('div', 'w1sbx-bar'); let fi = -1;
  const lab = el('span', 'w1sbx-lab', 'AI SANDBOX'); const free = el('button', 'w1sbx-b on', 'Free cam'); const fol = el('button', 'w1sbx-b', 'Follow ▸'); const spd = el('button', 'w1sbx-b w1sbx-spd', '1×'); const rs = el('button', 'w1sbx-b', '↻ Restart'); const ex = el('button', 'w1sbx-b', '✕ Exit');
  const live = () => [...g.ops, ...g.enemies].filter(u => u.alive);
  free.onclick = () => { cam.stopFollow(); fi = -1; free.classList.add('on'); fol.classList.remove('on'); fol.textContent = 'Follow ▸'; };
  fol.onclick = () => { const L = live(); if (!L.length) return; fi = (fi + 1) % L.length; const u = L[fi]; cam.setFollow(u, 'follow'); free.classList.remove('on'); fol.classList.add('on'); fol.textContent = (u.kind === 'op' ? (u.name || 'Operator') : 'Hostile') + ' ▸'; };
  spd.onclick = () => { const i = SPEEDS.indexOf(g.timeScaleSet || 1); const v = SPEEDS[(i + 1) % SPEEDS.length]; hud.setSpeed(v); spd.textContent = (v === 0.5 ? '½' : v) + '×'; };
  rs.onclick = () => { const l = app.w1sbxLast; bar.remove(); startSandbox(app, l.map, l.n); };
  ex.onclick = () => { bar.remove(); app.hud.hide(); app.input.setGame(null); app.endGame(); app.menus.main(); };
  bar.append(lab, free, fol, spd, rs, ex); document.body.append(bar); app.w1sbxBar = bar;
  const tick = setInterval(() => { if (app.game !== g) { clearInterval(tick); if (bar.isConnected && app.game !== g && !app.w1sbxEnding) bar.remove(); } }, 500); }
function sandboxEnd(app, r) { app.w1sbxEnding = true; document.querySelector('.w1sbx-bar')?.remove(); app.hud.hide(); app.input.setGame(null); app.lastResult = r; window.__aar = r; app.endGame(); app.w1sbxEnding = false;
  const menus = app.menus; const body = menus.screen('sandbox-end', 'AI Sandbox', () => sandboxScreen(app)); const t = Math.round(r.time || 0);
  body.append(el('div', 'w1sbx-res ' + (r.win ? 'win' : 'lose'), `<div class="res">${r.win ? 'OPERATORS WIN' : 'HOSTILES WIN'}</div><div class="mt">${MAPS[r.mission.map]?.name || ''} · ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} · hostiles down ${r.kills ?? '?'}</div><small>Sandbox — nothing was saved.</small>`));
  const row = el('div', 'w1sbx-btns'); const l = app.w1sbxLast; row.append(menus.btn('↻ Restart', 'primary', () => startSandbox(app, l.map, l.n)), menus.btn('Pick map', '', () => sandboxScreen(app)), menus.btn('Main menu', '', () => menus.main())); body.append(row); }
const SBX_CSS = `.w1sbx-bar{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 58px);z-index:6;display:flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 16px);padding:4px 6px;background:rgba(10,14,12,.78);border:1px solid rgba(120,200,140,.35);border-radius:8px;font:600 12px system-ui,sans-serif;color:#cfe;pointer-events:auto}
.w1sbx-lab{color:#8f8;letter-spacing:.08em;font-size:11px;margin-right:2px}
.w1sbx-b{font:inherit;color:#dfe;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:5px 8px;min-height:30px;cursor:pointer;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}
.w1sbx-b.on{background:rgba(110,210,130,.28);border-color:#7d7}
.w1sbx-intro{max-width:720px;margin:0 auto 10px;opacity:.85;line-height:1.4}
.w1sbx-count{display:flex;gap:6px;align-items:center;justify-content:center;margin:0 0 12px}.w1sbx-count span{opacity:.7;margin-right:4px}
.w1sbx-chip{font:inherit;color:#dfe;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:6px 14px;cursor:pointer}.w1sbx-chip.on{background:rgba(110,210,130,.3);border-color:#7d7}
.w1sbx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;max-width:960px;margin:0 auto}
.w1sbx-map{font:inherit;text-align:left;color:#e6efe8;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:10px 12px;cursor:pointer;display:flex;flex-direction:column;gap:2px}.w1sbx-map small{opacity:.65}
.w1sbx-map:hover{border-color:#7d7}
.w1sbx-res{text-align:center;margin:20px auto}.w1sbx-res .res{font:800 30px system-ui,sans-serif;letter-spacing:.06em}.w1sbx-res.win .res{color:#8e8}.w1sbx-res.lose .res{color:#f88}.w1sbx-res .mt{margin:6px 0;opacity:.85}
.w1sbx-btns{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
@media (max-width:600px){.w1sbx-bar{top:calc(env(safe-area-inset-top,0px) + 164px);gap:3px;padding:3px 4px}.w1sbx-lab{display:none}.w1sbx-b{padding:4px 6px;font-size:11px;min-height:30px;max-width:100px}.w1sbx-grid{grid-template-columns:1fr 1fr}}
@media (max-height:460px) and (orientation:landscape){.w1sbx-bar{top:calc(env(safe-area-inset-top,0px) + 50px);left:auto;right:8px;transform:none;max-width:calc(100vw - 340px)}.w1sbx-lab{display:none}}`;
if (typeof document !== 'undefined' && !document.getElementById('w1sbxcss')) { const s = document.createElement('style'); s.id = 'w1sbxcss'; s.textContent = SBX_CSS; document.head.append(s); }
