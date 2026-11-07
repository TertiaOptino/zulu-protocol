// w1: radio log — a compact, semi-transparent, auto-fading text feed driven by real game events.
// Bus (for Worker 4's audio): window.__radio — an EventTarget.
//   window.__radio.on(fn) → unsubscribe()   fn receives { callsign, text, kind, t, uid }
//   window.__radio.addEventListener('line', e => e.detail)   (same object)
//   window.__radio.lines   last 30 lines (oldest first);  window.__radio.push(callsign, text, kind) to add one
// kinds (w4 audio voices the first 11): breach, go, contact, down, alarm, hostage, vip, clear, stack, kill, reload; extra: lowammo, hit, gear
// Toggle: settings.radioLog === false (Pause menu row "Radio log").
import { radio } from './audio.js';
import { TEAMS } from './data.js';
const ammoState = (o) => (o.w1ammo ? o.w1ammo(o) : null); // w1c: vitals not ported; low-ammo lines only if a sensor provides o.w1ammo

const MAX_LINES = 5, life = () => (typeof window !== 'undefined' && window.__w1radioLife) || 6500, DEDUPE = 3, KEEP = 30;
class RadioBus extends EventTarget {
  constructor() { super(); this.lines = []; this.last = new Map(); this.game = null; }
  on(fn) { const h = (e) => fn(e.detail); this.addEventListener('line', h); return () => this.removeEventListener('line', h); }
  push(callsign, text, kind = 'info', extra = {}) {
    const g = this.game; const t = g ? g.time : 0; const key = callsign + '|' + kind;
    if (kind !== 'stack' && kind !== 'breach' && t - (this.last.get(key) ?? -99) < DEDUPE) return null; this.last.set(key, t);
    const line = { callsign, text, kind, t: +t.toFixed(2), uid: extra.uid ?? null };
    this.lines.push(line); if (this.lines.length > KEEP) this.lines.shift();
    this.dispatchEvent(new CustomEvent('line', { detail: line })); return line;
  }
  reset(g) { this.lines.length = 0; this.last.clear(); this.game = g; this.dispatchEvent(new CustomEvent('reset')); }
}
export const bus = (typeof window !== 'undefined' && window.__radio instanceof EventTarget) ? window.__radio : new RadioBus();
if (typeof window !== 'undefined') window.__radio = bus;

export function callsign(g, u) { if (!u) return 'HQ'; if (u.kind !== 'op') return u.kind === 'vip' ? 'VIP' : 'HQ'; const T = TEAMS[u.team]; if (!T) return u.name || 'Op';
  const mates = g.ops.filter(o => o.team === u.team); return `${T.name} ${mates.indexOf(u) + 1}`; }
const teamName = (u) => (u && TEAMS[u.team] ? TEAMS[u.team].name : 'Team');
const opByUid = (g, uid) => g && g.ops.find(o => o.uid === uid);
function bearing(u, t) { if (!t) return 'front'; let a = Math.atan2(t.x - u.x, t.z - u.z) - u.ang; a = Math.atan2(Math.sin(a), Math.cos(a)); const d = Math.abs(a);
  return d < 0.8 ? 'front' : d > 2.4 ? 'rear' : a > 0 ? 'left' : 'right'; }
const BREACH_TXT = { kick: 'kicking the door', shotgun: 'shotgun breach!', charge: 'breach, breach, breach!', lockpick: 'picking the lock', open: 'opening up quiet' };

export function installRadioLog(Game) {
  const P = Game.prototype; const on = (g) => g.settings.radioLog !== false;
  const oU = P.updateBreach; P.updateBreach = function (b, dt) { const ph = b.phase; const r = oU.call(this, b, dt); bus.game = this;
    if (on(this) && b.units[0] && b.units[0].kind === 'op' && ph !== b.phase) {
      if (ph === 'stack' && (b.phase === 'ready' || b.phase === 'act')) bus.push(teamName(b.units[0]), b.w1timeout ? 'stack incomplete, going anyway' : 'stacked on door', 'stack');
      if (b.phase === 'act' && !b.w1rl) { b.w1rl = true; const br = b.breacher || b.units[0]; bus.push(callsign(this, br), BREACH_TXT[b.method] || 'breaching', 'breach', { uid: br.uid }); }
      if ((b.phase === 'done' || b.phase === 'flash') && b.door.state !== 'closed' && !b.w1room) { const L = this.level; b.w1room = true; const room = L.room[L.idx(b.far[0], b.far[1])]; (this.w1rooms || (this.w1rooms = [])).push({ room, team: b.units[0].team, t: this.time, b }); } }
    return r; };
  const oS = P.step; P.step = function (dt) { const r = oS.call(this, dt); bus.game = this; if (!on(this)) return r;
    this.w1rlT = (this.w1rlT || 0) - dt; if (this.w1rlT > 0) return r; this.w1rlT = 0.4; const L = this.level;
    if (this.w1rooms && this.w1rooms.length) this.w1rooms = this.w1rooms.filter(q => { if (this.time - q.t < 1.5) return true; if (this.time - q.t > 40) return false;
      const inside = this.ops.some(o => o.alive && o.team === q.team && L.room[L.cellOf(o.x, o.z)] === q.room); if (!inside) return true;
      if (this.enemies.some(e => e.alive && L.room[L.cellOf(e.x, e.z)] === q.room)) return true; bus.push(TEAMS[q.team].name, 'room clear', 'clear'); return false; });
    for (const o of this.ops) { if (!o.alive) continue; const s = ammoState(o); if (s !== o.w1rlA) { if (o.w1rlA && s === 'low') bus.push(callsign(this, o), 'low on ammo', 'lowammo', { uid: o.uid }); else if (o.w1rlA && s === 'out') bus.push(callsign(this, o), 'out of ammo!', 'lowammo', { uid: o.uid }); o.w1rlA = s; } }
    return r; };
  const oV = P.vipMark; if (oV) P.vipMark = function (v, op) { const r = oV.call(this, v, op); if (on(this)) bus.push(callsign(this, op), 'VIP secured, moving to exit', 'vip', { uid: op && op.uid }); return r; };
  // radio.say is the game's voice line call; it carries the event key and the speaker uid
  const oSay = radio.say.bind(radio); radio.say = function (key, who = 0, prio = 1) { const g = bus.game; try { if (g && on(g)) lineFor(g, key, who); } catch (e) { /* never break audio */ } return oSay(key, who, prio); };
}
function lineFor(g, key, who) {
  const u = opByUid(g, who);
  switch (key) {
    case 'contact': if (u) bus.push(callsign(g, u), `contact ${bearing(u, u.target)}!`, 'contact', { uid: u.uid }); break;
    case 'reload': if (u) bus.push(callsign(g, u), 'reloading', 'reload', { uid: u.uid }); break;
    case 'hurt': if (u) bus.push(callsign(g, u), "I'm hit!", 'hit', { uid: u.uid }); break;
    case 'mandown': { const d = opByUid(g, who - 1); bus.push(d ? callsign(g, d) : 'HQ', 'man down!', 'down', { uid: d && d.uid }); break; }
    case 'down': if (u) bus.push(callsign(g, u), 'tango down', 'kill', { uid: u.uid }); break;
    case 'clear': if (u) bus.push(callsign(g, u), 'last hostile down — area clear', 'clear', { uid: u.uid }); break;
    case 'hostage': if (u) bus.push(callsign(g, u), 'hostage secured', 'hostage', { uid: u.uid }); break;
    case 'alarm': bus.push('HQ', 'alarm raised — they know we are here', 'alarm'); break;
    case 'go': bus.push('HQ', 'go, go, go!', 'go'); break;
    case 'flash': case 'frag': case 'smoke': if (u) bus.push(callsign(g, u), key === 'flash' ? 'flashbang out' : key === 'frag' ? 'frag out' : 'smoke out', 'gear', { uid: u.uid }); break;
  }
}

// ---------- HUD feed ----------
export function installRadioLogHud(hud) {
  const box = document.createElement('div'); box.className = 'w1radio'; box.setAttribute('aria-live', 'polite'); hud.root.append(box);
  let fit = MAX_LINES, posT = 0;
  const obstacles = () => [...hud.root.querySelectorAll('.hud-top > *, .hud-left, .hud-right, .w1cam, .pausebtn, .hud-tbar')].filter(n => n.offsetParent && !n.classList.contains('hidden')).map(n => n.getBoundingClientRect()).filter(r => r.width && r.height);
  const hit = (a, r) => a.left < r.right && a.right > r.left && a.top < r.bottom && a.bottom > r.top;
  const place = () => { const W = innerWidth, H = innerHeight; const obs = obstacles(); const top = hud.root.querySelector('.hud-top'); const tb = top ? top.getBoundingClientRect().bottom : 40;
    const lh = W < 420 || H < 420 ? 15 : 17; const w = Math.min(W < 420 ? W * 0.56 : 300, W - 16);
    const lefts = [8, (W - w) / 2]; const leftCol = hud.root.querySelector('.hud-left'); if (leftCol) { const lr = leftCol.getBoundingClientRect(); if (lr.width) lefts.push(lr.right + 6); }
    for (let n = MAX_LINES; n >= 2; n--) for (const x of lefts) for (const y of [tb + 6, tb + 40]) { const a = { left: x, right: x + w, top: y, bottom: y + n * lh + 6 }; if (a.right > W - 4 || a.bottom > H - 4) continue;
      if (!obs.some(r => hit(a, r))) { box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = w + 'px'; fit = n; box.dataset.fit = n; return; } }
    fit = 0; box.dataset.fit = 0; };
  const render = () => { while (box.children.length > fit) box.firstChild.remove(); box.classList.toggle('empty', !box.children.length); };
  const add = (line) => { const g = hud.g; if (!g || (g.settings && g.settings.radioLog === false)) return; const now = performance.now(); if (now - posT > 500) { posT = now; place(); } if (!fit) return;
    const d = document.createElement('div'); d.className = 'w1rl k-' + line.kind; const b = document.createElement('b'); b.textContent = line.callsign + ': '; d.append(b, document.createTextNode(line.text)); box.append(d); render();
    const L = life(); setTimeout(() => d.classList.add('fade'), L - 900); setTimeout(() => { d.remove(); render(); }, L); };
  bus.on(add); bus.addEventListener('reset', () => { box.textContent = ''; render(); });
  addEventListener('resize', () => { posT = 0; place(); render(); });
  const oB = hud.bind.bind(hud); hud.bind = function (g, ...a) { const r = oB(g, ...a); bus.reset(g); posT = 0; requestAnimationFrame(() => { place(); render(); }); return r; };
  const oX = hud.executePlan.bind(hud); hud.executePlan = function () { const g = this.g; const n = g && g.plan ? g.plan.length : 0; const r = oX(); if (n && g && g.settings.radioLog !== false) bus.push('HQ', n > 1 ? `all teams, execute — go, go, go!` : 'execute — go, go, go!', 'go'); return r; };
  const oP = hud.openPauseMenu.bind(hud); hud.openPauseMenu = function () { const r = oP(); const g = this.g, m = this.pauseMenu; if (!g || !m) return r; const s = g.settings;
    const b = document.createElement('button'); b.className = 'pm-row'; const lab = () => { b.innerHTML = `Radio log: <b>${s.radioLog === false ? 'Off' : 'On'}</b>`; }; lab();
    b.onclick = () => { s.radioLog = s.radioLog === false; lab(); if (s.radioLog === false) { box.textContent = ''; render(); } };
    const plan = m.querySelector('.pm-plan'); if (plan) m.insertBefore(b, plan); else m.append(b); return r; };
  hud.w1radio = { box, place, bus };
}
