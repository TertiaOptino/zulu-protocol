import { el, fmtTime } from './util.js';
import { TEAMS, BREACH, CLASSES, MODES } from './data.js';
import { sfx } from './audio.js';
import { charImg } from './thumbs.js';
import { opStyle } from './charstyle.js';
import { controlsHTML } from './controls.js';
import { w2ObjHTML, w2DoorPlace } from './w2-layout.js'; // w2
export const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const fsSupported = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) && !/iP(hone|od)/.test(navigator.userAgent);
export async function toggleFullscreen(on) { const d = document, de = d.documentElement; const cur = d.fullscreenElement || d.webkitFullscreenElement; try { if (on === false || (on === undefined && cur)) { if (cur) await (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; } if (!cur) await (de.requestFullscreen || de.webkitRequestFullscreen).call(de, { navigationUI: 'hide' }); } catch (e) { return; } try { await screen.orientation.lock('landscape'); } catch (e) { /* not supported (iOS, desktop) */ } }
// In-mission HUD (DOM overlay). Big touch-friendly buttons.
export const SPEEDS = [0.5, 1, 1.5, 2, 3]; // shared by the speed button and +/- keys
export class HUD {
  constructor(root, env) {
    this.root = root; this.env = env; this.g = null; this.input = null; this.follow = false;
    root.innerHTML = '';
    this.top = el('div', 'hud-top'); this.title = el('div', 'hud-title'); this.obj = el('div', 'hud-obj'); this.timer = el('div', 'hud-timer');
    this.ffBtn = el('button', 'hbtn small ff', '1×'); this.menuBtn = el('button', 'hbtn small menub', '☰'); this.helpBtn = el('button', 'hbtn small helpb', '?'); this.fsBtn = el('button', 'hbtn small fsb', '⛶'); this.fsBtn.title = 'Fullscreen'; this.helpBtn.title = 'Controls (F1)';
    if (!fsSupported()) this.fsBtn.style.display = 'none';
    this.top.append(this.title, this.obj, this.timer, this.helpBtn, this.fsBtn, this.menuBtn);
    this.left = el('div', 'hud-left'); this.teams = el('div', 'hud-teams'); this.ports = el('div', 'hud-ports'); this.left.append(this.teams, this.ports);
    this.right = el('div', 'hud-right'); this.cmds = el('div', 'hud-cmds');
    const B = (id, label, icon, fn) => { const b = el('button', 'cmd', `<span class="ic">${icon}</span><span class="lb">${label}</span>`); b.dataset.id = id; b.onclick = (e) => { e.stopPropagation(); sfx.ui(); fn(); }; this.cmds.append(b); return b; };
    this.bMove = B('move', 'Move', '➜', () => this.input.setMode(this.input.mode === 'move' ? null : 'move'));
    this.bHold = B('hold', 'Hold', '✋', () => { this.g.orderHold(this.g.selected()); this.ev('hold'); });
    this.bBreach = B('breach', 'Breach', '💥', () => this.breachButton());
    this.bFlash = B('flash', 'Flash', '✸', () => this.input.setMode(this.input.mode === 'flash' ? null : 'flash'));
    this.bFrag = B('frag', 'Frag', '●', () => this.input.setMode(this.input.mode === 'frag' ? null : 'frag'));
    this.bSmoke = B('smoke', 'Smoke', '☁', () => this.input.setMode(this.input.mode === 'smoke' ? null : 'smoke'));
    this.bFollow = B('follow', 'Camera', '◎', () => this.toggleFollow()); this.bFollow.title = 'Camera: Follow → 3rd person → Free (T, O = 3rd person)';
    this.bUndo = B('undo', 'Undo', '↶', () => { this.g.undo(); this.ev('undo'); });
    this.bStop = B('stop', 'Stop', '■', () => { this.g.clearPath(this.g.selected()); this.ev('stop'); });
    this.bGo = B('go', 'GO', '▶▶', () => { const g = this.g; if (!g.breaches.some(b => b.wait) && g.plan && g.plan.length) this.executePlan(); else g.goAll(); this.ev('go'); }); // w1: GO runs a kept plan (closed with ✕) instead of 'No teams waiting'
    this.pauseBtn = el('button', 'pausebtn', 'PLAY'); this.pauseBtn.onclick = (e) => { e.stopPropagation(); this.togglePause(); };
    this.tbar = el('div', 'hud-tbar'); this.tbar.append(this.pauseBtn, this.ffBtn); this.right.append(this.cmds, this.tbar); this.ctl = el('div', 'ctl-overlay hidden');
    this.toasts = el('div', 'toasts'); this.banner = el('div', 'banner'); this.cine = el('div', 'cine', '<div class="bar t"></div><div class="bar b"></div><div class="cine-txt">BREACH</div><div class="cine-skip">tap to skip</div>');
    this.modeHint = el('div', 'modehint'); this.doorMenu = el('div', 'doormenu hidden'); this.pauseMenu = el('div', 'pausemenu hidden'); this.planMenu = el('div', 'planmenu hidden'); this.planMarks = el('div', 'planmarks');
    root.append(this.planMarks, this.top, this.left, this.right, this.toasts, this.banner, this.cine, this.modeHint, this.planMenu, this.doorMenu, this.pauseMenu, this.ctl);
    this.ffBtn.onclick = (e) => { e.stopPropagation(); const v = this.g.timeScaleSet || 1, i = SPEEDS.indexOf(v); this.setSpeed(i < 0 || i === SPEEDS.length - 1 ? 1 : SPEEDS[i + 1]); }; // cycles ½ → 1 → 1.5 → 2 → 3 → back to 1
    this.helpBtn.onclick = (e) => { e.stopPropagation(); this.toggleControls(); }; this.fsBtn.onclick = (e) => { e.stopPropagation(); toggleFullscreen(); };
    this.menuBtn.onclick = (e) => { e.stopPropagation(); this.openPauseMenu(); };
    for (const ev of ['pointerdown', 'wheel']) for (const n of [this.top, this.left, this.right, this.doorMenu, this.pauseMenu, this.planMenu, this.ctl]) n.addEventListener(ev, e => e.stopPropagation());
  }
  bind(g, input, onAbort) {
    this.g = g; this.input = input; this.onAbort = onAbort; this.follow = false; this.camMode = null; this.bFollow.classList.remove('on', 'tps'); this.setSpeed(g.settings.speed || (g.settings.ff ? 2 : 1));
    this.title.innerHTML = `<b>${g.mission.title}</b><small>${MODES[g.mission.mode].name} · ${g.level.def.name}</small>`;
    g.hooks.onToast = (m, k) => this.toast(m, k); g.hooks.onSel = () => { this.renderTeams(); this.camSel(); }; g.hooks.onPause = (p) => this.renderPause(); g.hooks.onCine = (on, txt) => this.setCine(on, txt);
    this.renderTeams(); this.renderPause(); this.closeMenus(); this.closePlan(); this.planMarks.innerHTML = ''; this.root.classList.remove('hidden');
    const planOK = !g.mission.training && !g.mission.tut && g.settings.planMenu !== false && g.ops.length > 1 && g.level.doors.some(d => d.state === 'closed');
    if (planOK) { this.openPlan(true); this.toast('BREACH PLAN — pick which team breaches which door, then EXECUTE', 'info'); } else this.toast('PLANNING — game is paused. Give orders, then press PLAY.', 'info');
  }
  ev(n) { const h = this.g && this.g.hooks.onInput; if (h) h(n); }
  setSpeed(v) { const g = this.g; if (!g) return; v = SPEEDS.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a, 1); g.setSpeed(v); g.timeScaleSet = v; this.ffBtn.textContent = (v === 0.5 ? '½' : v) + '×'; this.ffBtn.classList.toggle('on', v !== 1); }
  stepSpeed(d) { const L = SPEEDS; const i = L.indexOf(this.g.timeScaleSet || 1); this.setSpeed(L[Math.max(0, Math.min(L.length - 1, i + d))]); this.toast(`Game speed ${this.ffBtn.textContent}`); }
  anyOpen() { return [this.doorMenu, this.pauseMenu, this.ctl].some(n => !n.classList.contains('hidden')); }
  toggleControls(force) { const show = force ?? this.ctl.classList.contains('hidden'); if (show) { this.ctl.innerHTML = `<div class="ctl-box"><div class="ctl-h"><b>Controls</b><button class="dm-x">✕</button></div>${controlsHTML(this.settingsRef && this.settingsRef(), matchMedia('(pointer: coarse)').matches)}</div>`; this.ctl.querySelector('.dm-x').onclick = () => this.toggleControls(false); this.ctl.onclick = (e) => { if (e.target === this.ctl) this.toggleControls(false); }; } this.ctl.classList.toggle('hidden', !show); }
  doorKey(e) { if (this.doorMenu.classList.contains('hidden')) return false; const k = e.code; const opts = [...this.doorMenu.querySelectorAll('.dm-opt')];
    if (/^Digit[1-9]$/.test(k)) { const o = opts[+k.slice(5) - 1]; if (o) o.click(); return true; }
    if (k === 'KeyF') { this.doorMenu.querySelector('.dm-flash').click(); return true; }
    if (k === 'Enter' || k === 'KeyY') { this.doorMenu.querySelector(e.shiftKey ? '.dm-wait' : '.dm-go').click(); return true; }
    if (k === 'KeyM') { this.doorMenu.querySelector('.dm-mv').click(); return true; }
    if (k === 'Escape') { this.closeMenus(); return true; } return false; }
  hide() { this.root.classList.add('hidden'); }
  togglePause() { if (!this.g || this.g.over) return; if (!this.pauseMenu.classList.contains('hidden')) { this.pauseMenu.classList.add('hidden'); this.g.setPaused(false); this.ev('resume'); return; } // Space with the pause menu open = Resume
    this.g.setPaused(!this.g.paused); this.ev(this.g.paused ? 'pause' : 'resume'); }
  renderPause() { const p = this.g.paused; this.pauseBtn.textContent = p ? '▶ PLAY' : '❚❚ PAUSE'; this.pauseBtn.classList.toggle('paused', p); this.banner.textContent = p ? 'PAUSED — planning' : ''; this.banner.classList.toggle('show', p); }
  // camera button / T cycles: free -> Follow (overhead) -> 3rd person (over the shoulder) -> free. O jumps straight to / out of 3rd person.
  camOp() { const g = this.g; return (g.sel.op && g.sel.op.alive && g.sel.op) || g.selected()[0] || g.opsAlive[0]; }
  toggleFollow() { const cam = this.env.cam, op = this.camOp(); const next = cam.mode === 'free' ? 'follow' : cam.mode === 'follow' ? 'shoulder' : 'free';
    if (next === 'free' || !op) cam.stopFollow(); else cam.setFollow(op, next); this.syncCamBtn(true); this.ev('cam:' + cam.mode); }
  toggleShoulder() { const cam = this.env.cam, op = this.camOp(); if (cam.mode === 'shoulder' || !op) cam.stopFollow(); else cam.setFollow(op, 'shoulder'); this.syncCamBtn(true); this.ev('cam:' + cam.mode); }
  syncCamBtn(say) { const m = this.env.cam.mode, f = this.env.cam.follow; this.follow = m !== 'free'; if (this.camMode !== m) { this.camMode = m; this.bFollow.classList.toggle('on', m !== 'free'); this.bFollow.classList.toggle('tps', m === 'shoulder'); this.bFollow.querySelector('.lb').textContent = m === 'shoulder' ? '3rd P' : m === 'follow' ? 'Follow' : 'Camera'; this.bFollow.querySelector('.ic').textContent = m === 'shoulder' ? '◉' : '◎'; }
    if (say) this.toast(m === 'shoulder' ? `3rd-person cam: ${f.name} — Tab / tap a portrait to switch soldier` : m === 'follow' ? `Following ${f.name}` : 'Free camera', 'info'); }
  camSel() { const cam = this.env.cam; if (cam.mode === 'free') return; const op = this.camOp(); if (op && op !== cam.follow) cam.setFollow(op, cam.mode); } // selection change re-targets the follow / 3rd-person cam
  onMode(m) { for (const b of this.cmds.children) b.classList.toggle('on', b.dataset.id === m || (b.dataset.id === 'follow' && this.follow)); this.modeHint.textContent = m === 'move' ? 'Tap ground to move (doors ignored)' : m ? `Tap where to throw the ${m}` : ''; this.modeHint.classList.toggle('show', !!m); }
  setCine(on, txt) { this.cine.classList.toggle('show', on); this.root.classList.toggle('cinema', on); this.cine.querySelector('.cine-txt').textContent = txt || 'BREACH'; }
  toast(msg, kind = '') { const t = el('div', 'toast ' + kind, msg); this.toasts.prepend(t); while (this.toasts.children.length > 4) this.toasts.lastChild.remove(); setTimeout(() => t.classList.add('fade'), 2600); setTimeout(() => t.remove(), 3200); }
  renderTeams() {
    const g = this.g; this.teams.innerHTML = '';
    const fine = !matchMedia('(pointer: coarse)').matches; const multi = !!g.sel.multi; const allSel = multi && g.opsAlive.every(o => g.sel.multi.includes(o));
    for (const t of TEAMS) { const ops = g.ops.filter(o => o.team === t.id); if (!ops.length) continue; const alive = ops.filter(o => o.alive).length; const b = el('button', 'teamchip' + (multi ? (ops.some(o => g.sel.multi.includes(o)) ? ' half' : '') : g.sel.team === t.id && !g.sel.op ? ' on' : g.sel.team === t.id ? ' half' : ''), `<b>${t.name}</b><small>${alive}/${ops.length}</small>${fine ? `<i class="tk">${t.id + 1}</i>` : ''}`); b.dataset.team = t.id; b.style.setProperty('--tc', t.css); b.onclick = (e) => { e.stopPropagation(); g.selectTeam(t.id); sfx.ui(); }; this.teams.append(b); }
    if (g.ops.length > 1) { const a = el('button', 'teamchip everyone' + (allSel ? ' on' : ''), `<b>All</b><small>${g.opsAlive.length}/${g.ops.length}</small>${fine ? '<i class="tk">`</i>' : ''}`); a.title = 'Select every operator (` or Ctrl+A)'; a.onclick = (e) => { e.stopPropagation(); g.selectAll(); sfx.ui(); this.ev('select'); }; this.teams.append(a); }
    this.ports.innerHTML = ''; this.portEls = [];
    { const t = TEAMS[g.sel.team]; const all = el('button', 'port all' + (!g.sel.op && !multi ? ' on' : ''), `<span class="pn">ALL</span><span class="pc">${allSel ? 'Everyone' : multi ? g.sel.multi.length + ' selected' : t ? t.name : ''}</span><span class="psub">${g.sel.op || multi ? 'tap for team' : 'team orders'}</span>`); if (t) all.style.setProperty('--tc', t.css); all.onclick = (e) => { e.stopPropagation(); g.selectTeam(g.sel.team); sfx.ui(); this.ev('selectTeam'); }; this.ports.append(all); this.ports.classList.remove('pop'); void this.ports.offsetWidth; this.ports.classList.add('pop'); }
    for (const o of g.ops.filter(o => o.team === g.sel.team)) { const c = CLASSES.find(c => c.id === o.cls); const p = el('button', 'port' + (g.sel.op === o ? ' on' : '') + (o.alive ? '' : ' dead'), `<span class="pn">${o.name}</span><span class="pc">${c.icon} · ${c.name}</span><span class="hp"><i></i></span>`); p.style.setProperty('--tc', TEAMS[o.team].css); if (o.cfg) { p.classList.add('hasimg'); p.prepend(charImg(opStyle(o.cfg), 'head', 'ppimg', 72, 84)); } p.onclick = (e) => { e.stopPropagation(); if (o.alive) { g.selectOp(o); sfx.ui(); this.ev('portrait'); this.env.cam.target.set(o.x, 0, o.z); } }; this.ports.append(p); this.portEls.push([o, p.querySelector('.hp i'), p]); }
  }
  update() {
    const g = this.g; if (!g) return; this.syncCamBtn(false); this.timer.textContent = fmtTime(g.time) + ` / ${fmtTime(g.mission.par)}`; this.timer.classList.toggle('over', g.time > g.mission.par);
    const ot = g.objectiveText(); if (this.obj.dataset.t !== ot) { this.obj.dataset.t = ot; this.obj.innerHTML = w2ObjHTML(ot); this.obj.title = ot; } // w2: full + compact
    for (const [o, bar, p] of this.portEls || []) { bar.style.width = Math.max(0, o.hp / o.maxHp * 100) + '%'; p.classList.toggle('dead', !o.alive); p.classList.toggle('stun', o.stun > 0); p.classList.toggle('fire', !!o.target); }
    const P = g.pool; this.setCount(this.bFlash, P.flash); this.setCount(this.bFrag, P.frag); this.setCount(this.bSmoke, P.smoke);
    const waiting = g.breaches.some(b => b.wait); this.bGo.classList.toggle('pulse', waiting);
    if (this.planning && !g.paused) this.closePlan(); this.updatePlanMarks();
  }
  setCount(b, n) { let c = b.querySelector('.cnt'); if (!c) { c = el('span', 'cnt'); b.append(c); } if (c.textContent !== String(n || 0)) c.textContent = n || 0; b.classList.toggle('empty', !(n > 0)); }
  // ===== Breach & Clear style plan: which team breaches which door and how. Same door menu as in-mission (tap a door). =====
  doorName(d) { const g = this.g; return d.entry ? `Entry ${d.entry}` : `Door ${g.level.doors.indexOf(d) + 1}`; }
  bestMethod(ops, d) { const g = this.g; const pref = d.locked ? ['lockpick', 'shotgun', 'charge'] : d.trapKnown ? ['lockpick', 'shotgun', 'kick'] : ['kick', 'shotgun', 'open', 'lockpick', 'charge']; return pref.find(id => BREACH.some(b => b.id === id) && !g.canBreach(ops, id)) || (BREACH.find(b => !g.canBreach(ops, b.id)) || BREACH[0]).id; }
  autoPlan(replace) { const g = this.g; if (replace) g.plan = []; let fl = g.pool.flash || 0; const used = new Set(g.plan.map(p => p.door));
    for (const t of TEAMS) { const ops = g.ops.filter(o => o.team === t.id && o.alive); if (!ops.length || g.plan.some(p => p.team === t.id)) continue; const cx = ops.reduce((s, o) => s + o.x, 0) / ops.length, cz = ops.reduce((s, o) => s + o.z, 0) / ops.length;
      let best = null, bd = 1e9; for (const d of g.level.doors) { if (d.state !== 'closed' || used.has(d)) continue; const dd = Math.hypot(d.x + 0.5 - cx, d.y + 0.5 - cz); if (dd < bd) { bd = dd; best = d; } }
      if (!best) continue; used.add(best); const flash = fl > 0; if (flash) fl--; g.plan.push({ team: t.id, door: best, method: this.bestMethod(ops, best), flash }); } }
  openPlan(auto) { const g = this.g; if (!g || g.over) return; g.setPaused(true); this.planning = true; this.closeMenus(); if (!g.plan) g.plan = []; if (auto && !g.plan.length) this.autoPlan(); this.planTeam = null; this.renderPlan(); this.root.classList.add('planning'); this.ev('plan'); }
  closePlan() { this.planning = false; this.planMenu.classList.add('hidden'); this.root.classList.remove('planning'); }
  renderPlan() { const g = this.g; const m = this.planMenu;
    m.innerHTML = `<div class="pl-h"><b>BREACH PLAN</b><small>Tap a door on the map to assign a team</small><button class="dm-x" title="Close plan (orders kept)">✕</button></div>`;
    const list = el('div', 'pl-list');
    for (const t of TEAMS) { const ops = g.ops.filter(o => o.team === t.id && o.alive); if (!ops.length) continue; const p = g.plan.find(x => x.team === t.id);
      const r = el('div', 'pl-row' + (p ? ' set' : '')); r.style.setProperty('--tc', t.css); r.dataset.team = t.id;
      r.innerHTML = `<b class="pl-t">${t.name}<small>${ops.length} op${ops.length > 1 ? 's' : ''}</small></b><span class="pl-d">${p ? `<b>${this.doorName(p.door)}</b> · ${BREACH.find(b => b.id === p.method).name}${p.flash ? ' + ✸ flash' : ''}` : '<i>no door — free orders</i>'}</span>`;
      const edb = el('button', 'pl-ed', p ? 'Change' : 'Pick door'); edb.onclick = () => { sfx.ui(); this.planTeam = t.id; g.selectTeam(t.id); if (p) { const [sx, sy] = this.input.screenOf(p.door.x + 0.5, 1, p.door.y + 0.5); this.env.cam.target.set(p.door.x + 0.5, 0, p.door.y + 0.5); this.openDoorMenu(p.door, sx, sy); } else this.toast(`Tap a door for ${t.name}`, 'info'); };
      r.append(edb); if (p) { const x = el('button', 'pl-del', '✕'); x.title = 'Remove from plan'; x.onclick = () => { sfx.ui(); g.plan = g.plan.filter(q => q !== p); this.renderPlan(); }; r.append(x); }
      list.append(r); }
    const acts = el('div', 'pl-acts'); const au = el('button', 'pl-auto', 'Auto plan'); au.onclick = () => { sfx.ui(); this.autoPlan(true); this.renderPlan(); };
    const go = el('button', 'pl-go', g.plan.length ? `EXECUTE — ${g.plan.length} team${g.plan.length > 1 ? 's' : ''} breach together` : '▶ START (no plan)'); go.onclick = () => { sfx.ui(); this.executePlan(); };
    acts.append(au, go); m.append(list, acts); m.querySelector('.dm-x').onclick = () => { sfx.ui(); this.closePlan(); }; m.classList.remove('hidden'); }
  executePlan() { const g = this.g; let n = 0;
    for (const p of g.plan || []) { const ops = g.ops.filter(o => o.team === p.team && o.alive); if (!ops.length || p.door.state !== 'closed') continue; const b = g.orderBreach(ops, p.door, p.method, p.flash, g.plan.length > 1); if (b) { b.plan = true; n++; } }
    g.plan = []; this.closePlan(); this.closeMenus(); if (n > 1) { g.planSync = { t: 0 }; this.toast(`${n} teams moving to stack — they breach together`, 'good'); } g.setPaused(false); this.ev('planGo'); }
  updatePlanMarks() { const g = this.g; const items = [];
    if (this.planning) for (const p of g.plan || []) items.push([p.door, TEAMS[p.team], `${TEAMS[p.team].short} · ${BREACH.find(b => b.id === p.method).name}${p.flash ? ' ✸' : ''}`]);
    for (const b of g.breaches) if (b.plan || b.wait) { const t = TEAMS[b.units[0]?.team ?? 0]; items.push([b.door, t, `${t.short} · ${b.phase === 'ready' ? 'READY' : b.phase === 'stack' ? 'stacking' : 'GO'}`]); }
    const els = this.planMarks.children; while (els.length > items.length) els[els.length - 1].remove();
    items.forEach(([d, t, txt], i) => { let e = els[i]; if (!e) { e = el('div', 'planmark'); this.planMarks.append(e); } if (e.textContent !== txt) e.textContent = txt; e.style.setProperty('--tc', t.css); const [sx, sy] = this.input.screenOf(d.x + 0.5, 1.6, d.y + 0.5); e.style.transform = `translate(${sx | 0}px, ${sy | 0}px) translate(-50%, -100%)`; }); }
  closeMenus() { this.doorMenu.classList.add('hidden'); this.pauseMenu.classList.add('hidden'); this.ctl.classList.add('hidden'); }
  breachButton() {
    const g = this.g; if (g.breaches.some(b => b.wait)) { g.goAll(); return; }
    const sel = g.selected(); if (!sel.length) return; const cx = sel.reduce((s, o) => s + o.x, 0) / sel.length, cz = sel.reduce((s, o) => s + o.z, 0) / sel.length;
    let best = null, bd = 9; for (const d of g.level.doors) { if (d.state !== 'closed') continue; const dd = Math.hypot(d.x + 0.5 - cx, d.y + 0.5 - cz); if (dd < bd) { bd = dd; best = d; } }
    if (!best) { g.toast('No closed door nearby — tap a door to breach it'); return; }
    const [sx, sy] = this.input.screenOf(best.x + 0.5, 1, best.y + 0.5); this.openDoorMenu(best, sx, sy);
  }
  openDoorMenu(door, sx, sy) {
    const g = this.g; const m = this.doorMenu; const plan = !!this.planning; if (plan && this.planTeam == null) { const free = TEAMS.find(t => g.ops.some(o => o.team === t.id && o.alive) && !(g.plan || []).some(p => p.team === t.id && p.door !== door)); const here = (g.plan || []).find(p => p.door === door); this.planTeam = here ? here.team : free ? free.id : g.sel.team; }
    const sel = plan ? g.ops.filter(o => o.team === this.planTeam && o.alive) : g.selected(); this.menuDoor = door; const prev = plan ? (g.plan || []).find(p => p.team === this.planTeam) : null; let flash = prev && prev.door === door ? prev.flash : !!this.flashPref;
    const tags = []; if (door.entry) tags.push(`Entry ${door.entry}`); if (door.locked) tags.push('🔒 Locked'); if (door.trapKnown) tags.push('⚠ Booby-trapped'); if (door.state !== 'closed') tags.push('Open');
    const team = plan ? TEAMS[this.planTeam].name + ' team' : g.sel.multi ? sel.length + ' selected' : g.sel.op ? g.sel.op.name : TEAMS[g.sel.team].name + ' team';
    m.innerHTML = `<div class="dm-h"><b>${plan ? 'Plan · ' : ''}${this.doorName(door)}</b> <small>${tags.join(' · ') || 'Closed'}</small><span class="dm-team">${team}</span><button class="dm-x">✕</button></div>`;
    { const chips = el('div', 'dm-teams'); for (const t of TEAMS) { const n = g.ops.filter(o => o.team === t.id && o.alive).length; if (!n) continue; const on = plan ? this.planTeam === t.id : !g.sel.op && !g.sel.multi && g.sel.team === t.id; const c = el('button', 'dm-tc' + (on ? ' on' : ''), `${t.name} <small>${n}</small>`); c.style.setProperty('--tc', t.css); c.dataset.team = t.id; c.onclick = () => { sfx.ui(); if (plan) this.planTeam = t.id; else g.selectTeam(t.id); this.openDoorMenu(door, sx, sy); }; chips.append(c); } if (chips.children.length > 1) m.append(chips); }
    const list = el('div', 'dm-list');
    let chosen = prev && prev.door === door ? prev.method : door.locked ? (g.pool.lockpick > 0 ? 'lockpick' : 'shotgun') : door.trapKnown ? 'lockpick' : 'kick';
    for (const b of BREACH) {
      const err = g.canBreach(sel, b.id); const bad = (door.locked && !b.locked) || (door.trapKnown && b.trap === 'trigger');
      const cnt = b.item ? ` <i>×${g.pool[b.item] || 0}</i>` : '';
      const r = el('button', 'dm-opt' + (err ? ' dis' : '') + (bad ? ' warn' : ''), `<b>${b.name}${cnt}</b><small>${err || (door.locked && !b.locked ? 'Will fail: door is locked' : door.trapKnown && b.trap === 'trigger' ? 'Will set off the trap!' : b.desc)}</small>`);
      r.dataset.id = b.id; r.insertAdjacentHTML('afterbegin', `<kbd class="hk">${list.children.length + 1}</kbd>`); r.onclick = () => { if (err) return; chosen = b.id; upd(); }; list.append(r);
    }
    { const opt = (id) => list.querySelector(`[data-id="${id}"]`); const okId = (id) => opt(id) && !opt(id).classList.contains('dis'); // never preselect a disabled method
      if (!okId(chosen)) { const all = [...list.children]; const pick = all.find(r => !r.classList.contains('dis') && !r.classList.contains('warn')) || all.find(r => !r.classList.contains('dis')); if (pick) chosen = pick.dataset.id; } }
    const fl = el('button', 'dm-flash', ''); fl.onclick = () => { flash = !flash; this.flashPref = flash; upd(); };
    const acts = el('div', 'dm-acts'); const now = el('button', 'dm-go', 'BREACH NOW'); const wait = el('button', 'dm-wait', 'STACK & WAIT'); const mv = el('button', 'dm-mv', 'Move here');
    acts.append(now, wait, mv); const body = el('div', 'dm-body'); body.append(list, fl); m.append(body, acts);
    const upd = () => { for (const r of list.children) r.classList.toggle('on', r.dataset.id === chosen); fl.innerHTML = `${flash ? '☑' : '☐'} Flashbang first <i>×${g.pool.flash || 0}</i>`; fl.classList.toggle('on', flash); }; upd();
    if (plan) { now.textContent = `ASSIGN ${TEAMS[this.planTeam].name.toUpperCase()}`; now.classList.add('dm-assign'); wait.style.display = 'none'; mv.style.display = 'none'; }
    now.onclick = () => { if (plan) { g.plan = (g.plan || []).filter(p => p.team !== this.planTeam && p.door !== door); g.plan.push({ team: this.planTeam, door, method: chosen, flash }); this.closeMenus(); this.planTeam = null; this.renderPlan(); this.ev('plan:' + chosen); return; } g.orderBreach(sel, door, chosen, flash, false); this.closeMenus(); if (g.paused) { this.closePlan(); g.setPaused(false); } /* w1: BREACH NOW runs even from the paused planning view */ this.ev('breach:' + chosen); };
    wait.onclick = () => { g.orderBreach(sel, door, chosen, flash, true); this.closeMenus(); if (g.paused && !plan) { this.closePlan(); g.setPaused(false); } /* w1: STACK & WAIT walks to the door now; GO breaches */ this.ev('stack:' + chosen); };
    mv.onclick = () => { g.orderMove(sel, door.x + 0.5, door.y + 0.5, true); this.closeMenus(); };
    m.querySelector('.dm-x').onclick = () => this.closeMenus();
    m.classList.remove('hidden');
    const W = window.innerWidth, H = window.innerHeight; const r = m.getBoundingClientRect();
    m.style.left = Math.max(6, Math.min(W - r.width - 6, sx - r.width / 2)) + 'px'; m.style.top = Math.max(Math.min(50, H - r.height - 6), Math.min(H - r.height - 6, sy - r.height - 20)) + 'px'; // always fully on-screen (max-height keeps it ≤ viewport)
    w2DoorPlace(m); // w2: anchor the Breach menu to the right edge so it stops blocking the view
  }
  openPauseMenu() {
    const g = this.g; g.setPaused(true); const m = this.pauseMenu; const s = g.settings;
    m.innerHTML = `<h3>Mission paused</h3>`;
    const row = (label, val, fn) => { const b = el('button', 'pm-row', `${label}: <b>${val()}</b>`); b.onclick = () => { fn(); b.innerHTML = `${label}: <b>${val()}</b>`; }; m.append(b); };
    row('Vision cones', () => s.cones ? 'On' : 'Off', () => s.cones = !s.cones);
    row('Breach cinematics', () => s.cine ? 'On' : 'Off', () => s.cine = !s.cine);
    { const pl = el('button', 'pm-row pm-plan', '📋 Breach plan…'); pl.onclick = () => { this.pauseMenu.classList.add('hidden'); this.openPlan(false); }; m.append(pl); }
    const res = el('button', 'pm-row', 'Resume'); res.onclick = () => { this.closeMenus(); g.setPaused(false); };
    const ab = el('button', 'pm-row bad', 'Abort mission'); ab.onclick = () => { this.closeMenus(); this.onAbort(); };
    m.append(res, ab); m.classList.remove('hidden');
  }
}
