// ===== Guided tutorial: Fort Liberty kill house. Steps advance when the player performs the action. =====
import { el } from './util.js';
import { sfx } from './audio.js';
import { w2TutLayout } from './w2-layout.js'; // w2

export const TRAINING = { lon: -79.0, lat: 35.14, place: 'Fort Liberty, NC' };
export const TUTORIAL_MISSION = { id: 'tutorial', map: 'killhouse', mode: 'training', diff: 0, enemies: 6, par: 900, title: 'Kill House (Tutorial)', cash: 400, training: true };

const DOOR_A = { x: 10.5, z: 15.5 }, SPOT = { x: 8.5, z: 17.6 };
const inRoomA = (e) => e.x > 5 && e.x < 14 && e.z > 3 && e.z < 15;

// Each step: text for touch (t) and keyboard/mouse (k), optional checklist, a highlight, and done().
const STEPS = [
  { id: 'camera', title: 'Camera', t: '👆 Drag one finger to <b>pan</b>. ✌️ Twist two fingers to <b>rotate</b>, pinch to <b>zoom</b>, drag two fingers up/down to <b>tilt</b>.', k: '⌨️ <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to <b>pan</b> · <kbd>Q</kbd>/<kbd>E</kbd> or right-drag to <b>rotate</b> · 🖱️ scroll or <kbd>Z</kbd>/<kbd>X</kbd> to <b>zoom</b>.',
    enter(T) { const c = T.cam; T.c0 = { x: c.target.x, z: c.target.z, yaw: c.yaw, dist: c.dist }; T.got = {}; },
    checks: [['pan', 'Pan'], ['rot', 'Rotate'], ['zoom', 'Zoom']],
    done(T) { const c = T.cam, a = T.c0; if (Math.hypot(c.target.x - a.x, c.target.z - a.z) > 1.5) T.got.pan = 1; let dy = Math.abs(c.yaw - a.yaw); dy = Math.min(dy, Math.PI * 2 - dy); if (dy > 0.25) T.got.rot = 1; if (Math.abs(c.dist - a.dist) > 1.5) T.got.zoom = 1; return T.got.pan && T.got.rot && T.got.zoom; } },
  { id: 'camModes', title: 'Camera modes', t: '👆 Tap <b>◎ Camera</b> to cycle: <b>Follow</b> (tracks the selected soldier from above) → <b>3rd person</b> (over the shoulder) → back to the <b>free</b> camera.', k: '⌨️ Press <kbd>T</kbd> (or click <b>◎ Camera</b>) to cycle Follow → 3rd person → free. <kbd>O</kbd> jumps straight in or out of 3rd person; <kbd>Tab</kbd> switches soldier.',
    hl: () => '.cmd[data-id=follow]', checks: [['follow', 'Follow cam'], ['shoulder', '3rd person'], ['free', 'Back to free cam']],
    enter(T) { T.got = {}; }, tick(T) { T.steps[T.i].mark(T, T.cam.mode); }, on(T, n) { if (n.startsWith('cam:')) T.steps[T.i].mark(T, n.slice(4)); }, // events catch a mode that lasted less than a frame on a slow device
    mark(T, m) { if (m === 'follow') T.got.follow = 1; if (m === 'shoulder') T.got.shoulder = 1; if (m === 'free' && T.got.follow && T.got.shoulder) T.got.free = 1; }, done: (T) => T.got.follow && T.got.shoulder && T.got.free },
  { id: 'selectOp', title: 'Select an operator', t: '👆 Tap one of your soldiers (blue rings) to select just that operator.', k: '🖱️ Click one of your soldiers. <kbd>Tab</kbd> cycles operators, <kbd>Shift</kbd>-click adds more, drag a box to select several.',
    hl: (T) => T.opPoint(), enter(T) { if (T.g.sel.op) T.g.selectTeam(T.g.sel.team); }, done: (T) => !!T.g.sel.op },
  { id: 'selectTeam', title: 'Select a fireteam', t: '👆 Tap the team chip (top left) to command the whole fireteam.', k: '⌨️ Press <kbd>1</kbd> (or click the team chip). Double-tap <kbd>1</kbd> to centre the camera on the team.',
    hl: () => '.hud-teams', done: (T) => !T.g.sel.op },
  { id: 'selectAll', title: 'Select everyone', t: '👆 Tap the <b>All</b> chip (next to the team chips) to command every operator at once.', k: '⌨️ Press <kbd>`</kbd> or <kbd>Ctrl</kbd>+<kbd>A</kbd> (or click the <b>All</b> chip) to select every operator.',
    hl: () => '.teamchip.everyone', done: (T) => { const g = T.g; return g.opsAlive.length < 2 || (!!g.sel.multi && g.opsAlive.every(o => g.sel.multi.includes(o))); } },
  { id: 'portrait', title: 'Pick from the portraits', t: '👆 Tap one operator\'s portrait to select only them.', k: '🖱️ Click a portrait in the row on the left to select that operator.',
    hl: () => '.hud-ports .port:not(.all)', done: (T) => T.seen.has('portrait') || (!!T.g.sel.op && T.seen.has('selectOp')) },
  { id: 'move', title: 'Move', t: '👆 Tap the ground at the pulsing marker to move there.', k: '🖱️ Left- or right-click the ground at the pulsing marker. <kbd>Shift</kbd>-click queues waypoints.',
    hl: () => ({ world: SPOT }), done: (T) => T.g.ops.some(o => o.alive && Math.hypot(o.x - SPOT.x, o.z - SPOT.z) < 2.2) },
  { id: 'path', title: 'Draw a path', t: '👆 Put your finger <b>on the selected operator</b> and drag to draw a route, then lift.', k: '🖱️ Press on the <b>selected operator</b> and drag to draw a route. <kbd>Backspace</kbd> clears it.',
    hl: (T) => T.opPoint(true), done: (T) => T.seen.has('path') || T.seen.has('queue') },
  { id: 'pause', title: 'Tactical pause', t: '👆 Tap ⏸ to pause. Time stops, but you can still plan.', k: '⌨️ Press <kbd>Space</kbd> (or click ⏸) to pause.',
    hl: () => '.pausebtn', done: (T) => T.g.paused },
  { id: 'paused', title: 'Plan while paused', t: 'Give any order while paused (tap the ground), then tap ▶ to resume. Orders run when time restarts.', k: 'Give any order while paused (click the ground), then press <kbd>Space</kbd> to resume.',
    checks: [['ord', 'Order while paused'], ['res', 'Resume']], hl: (T) => T.got.ord ? '.pausebtn' : null, enter(T) { T.got = {}; if (!T.g.paused) T.g.setPaused(true); },
    on(T, n) { if (T.g.paused && /^(move|queue|path|door|stack|breach|throw|hold)/.test(n)) T.got.ord = 1; }, done: (T) => { if (T.got.ord && !T.g.paused) T.got.res = 1; return T.got.ord && T.got.res; } },
  { id: 'stack', title: 'Stack on the door', t: '👆 Select the team chip, then tap <b>Door A</b>. Choose an entry (Open, Kick, Shotgun, Charge…), tick <b>Flashbang</b>, then <b>Stack &amp; wait</b>.', k: '⌨️ Press <kbd>1</kbd>, click <b>Door A</b>. Pick an entry with <kbd>1</kbd>–<kbd>5</kbd>, <kbd>F</kbd> toggles <b>Flashbang</b>, <kbd>Shift</kbd>+<kbd>Enter</kbd> = <b>Stack &amp; wait</b>.',
    hl: () => ({ world: DOOR_A }), done: (T) => T.seen.has('stack') || T.seen.has('breach') },
  { id: 'go', title: 'GO — breach!', t: '👆 Tap <b>GO ▶▶</b>. The stack breaches, the flashbang goes in and the team floods the room. Enjoy the breach cam.', k: '⌨️ Press <kbd>Enter</kbd> or <kbd>Y</kbd> (or click <b>GO ▶▶</b>) to breach. <kbd>Space</kbd> skips the cinematic.',
    hl: () => '.cmd[data-id=go]', done: (T) => T.doorA() && T.doorA().state !== 'closed' },
  { id: 'clear', title: 'Clear the room', t: 'Pop-up targets rise when your operators see them; they engage automatically. <b>Don\'t shoot the kneeling hostage</b> — walk an operator next to them to secure.', k: 'Pop-up targets rise when your operators see them; they engage automatically. <b>Don\'t shoot the kneeling hostage</b> — move an operator next to them to secure.',
    hl: (T) => T.stuck > 20 ? { world: { x: 9.5, z: 9.5 } } : null, checks: [['tgt', 'Room A targets'], ['hos', 'Hostage secured']],
    enter(T) { T.got = {}; T.stuck = 0; }, tick(T, dt) { T.stuck += dt; },
    done(T) { const ts = T.g.enemies.filter(inRoomA); const dn = ts.filter(e => !e.alive).length; T.lbl.tgt = `Room A targets ${dn}/${ts.length}`; if (dn === ts.length) T.got.tgt = 1; const h = T.g.civs[0]; if (h && (h.secured || !h.alive)) T.got.hos = 1; if (h && !h.alive && !T.warned) { T.warned = 1; T.g.toast('Hostage hit! Watch your lines of fire.', 'bad'); } return T.got.tgt && T.got.hos; } },
  { id: 'plan', title: 'Breach & Clear plan', t: '👆 Tap <b>☰</b> → <b>📋 Breach plan</b>. Pick a team, tap its door and entry (or <b>AUTO</b>), then <b>EXECUTE</b>: every team stacks and they breach together. Tapping a door while paused opens the same menu.', k: '🖱️ Click <b>☰</b> → <b>📋 Breach plan</b>. Pick a team, choose its door and entry (or <b>AUTO</b>), then <b>EXECUTE</b> — all teams stack and breach together. Clicking a door while paused opens the same menu.',
    hl: (T) => T.app.hud.planning ? '.pl-go' : document.querySelector('.pm-plan') && document.querySelector('.pm-plan').offsetParent ? '.pm-plan' : '.menub', checks: [['open', 'Open the plan'], ['go', 'Execute']],
    enter(T) { T.got = {}; }, on(T, n) { if (n === 'plan') T.got.open = 1; if (n === 'planGo') { T.got.open = 1; T.got.go = 1; } }, done: (T) => T.got.go },
  { id: 'autoDoor', title: 'Doors open themselves', t: 'Your soldiers open unlocked doors as they walk through — no need to stop. 👆 Tap the ground beyond the marked door (or give any move order if every door is open).', k: 'Your soldiers open unlocked doors as they walk through — no need to stop. 🖱️ Click the ground beyond the marked door (or give any move order if every door is open).',
    enter(T) { const ops = T.g.ops.filter(o => o.alive); const ds = T.g.level.doors.filter(d => d.state === 'closed' && !d.locked && !d.trapped); const c = ops[0] || { x: 0, z: 0 }; ds.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.z) - Math.hypot(b.x - c.x, b.y - c.z)); T.adoor = ds[0] || null; },
    hl: (T) => T.adoor && T.adoor.state === 'closed' ? { world: { x: T.adoor.x + 0.5, z: T.adoor.y + 0.5 } } : null,
    done: (T) => T.adoor ? T.adoor.state !== 'closed' : (T.seen.has('move') || T.seen.has('path') || T.seen.has('queue')) },
  { id: 'sight', title: 'Sight lines', t: 'Each soldier has a <b>team-coloured vision cone</b>, and a line to whoever they are engaging — it brightens when the shot is lined up. Idle soldiers watch doors and corners on their own. 👆 Tap a soldier: their cone lights up. (Settings → <b>Operator sight lines</b>: All / Selected / Off.)', k: 'Each soldier has a <b>team-coloured vision cone</b>, and a line to whoever they are engaging — it brightens when the shot is lined up. Idle soldiers watch doors and corners on their own. 🖱️ Click a soldier: their cone lights up. (Settings → <b>Operator sight lines</b>: All / Selected / Off.)',
    enter: (T) => { const o = T.g.ops.find(o => o.alive); if (o && T.cam.centerOn) T.cam.centerOn(o.x, o.z); }, // bring a soldier to mid-screen so the tap target is not under the top HUD
    hl: (T) => T.opPoint(), done: (T) => T.seen.has('selectOp') || T.seen.has('portrait') || (T.seen.has('select') && !!T.g.sel.op) },
  { id: 'undo', title: 'Undo', t: 'Give a move order, then tap <b>↶ Undo</b> to take it back.', k: 'Give a move order, then press <kbd>Ctrl</kbd>+<kbd>Z</kbd> (or <b>↶ Undo</b>).',
    hl: () => '.cmd[data-id=undo]', done: (T) => T.seen.has('undo') },
  { id: 'stop', title: 'Stop', t: 'Give another order, then tap <b>■ Stop</b> to cancel the selected unit\'s path.', k: 'Give another order, then press <kbd>Backspace</kbd> (or <b>■ Stop</b>) to cancel it.',
    hl: () => '.cmd[data-id=stop]', done: (T) => T.seen.has('stop') },
  { id: 'finish', title: 'Training complete', t: 'Good work, operator. Room B still has targets if you want more practice. Tap <b>Finish</b> for your after-action report, then visit the <b>Armory</b> and the <b>Unit store</b>.', k: 'Good work, operator. Room B still has targets for extra practice. Press <b>Finish</b> for your after-action report, then visit the <b>Armory</b> and the <b>Unit store</b>. <kbd>F1</kbd> shows every control.',
    finish: true, done: () => false },
];

export class Tutorial {
  constructor(app, g) {
    this.app = app; this.g = g; this.cam = app.env.cam; this.i = -1; this.skipped = false; this.seen = new Set(); this.got = {}; this.lbl = {}; this.steps = STEPS;
    this.touch = document.documentElement.classList.contains('touch');
    this.card = el('div', 'tut-card'); this.exitB = el('button', 'tut-exit', '✕ Exit tutorial'); this.hlEl = el('div', 'tut-hl hidden');
    this.exitB.onclick = (e) => { e.stopPropagation(); sfx.ui(); app.tutorialExit(); };
    document.body.append(this.hlEl, this.card, this.exitB);
    g.hooks.onInput = (n) => this.onEv(n); if (g.paused) g.setPaused(false); // training runs live: the move step needs real movement
    this.next();
  }
  get step() { return this.i; }
  doorA() { return this.g.level.doors.find(d => d.x === 10 && d.y === 15); }
  opPoint(sel) { const o = (sel && this.g.selected()[0]) || this.g.ops.find(o => o.alive); return o ? { world: { x: o.x, z: o.z }, y: 0.9 } : null; }
  onEv(n) { this.seen.add(n.split(':')[0]); const s = STEPS[this.i]; if (s && s.on) s.on(this, n); }
  next() {
    this.i++; this.seen = new Set(); this.got = {}; this.lbl = {}; const s = STEPS[this.i]; if (!s) return;
    if (s.enter) s.enter(this); if (this.i > 0) sfx.ui(); this.card.classList.remove('free'); this.card.style.left = this.card.style.top = '';
    const txt = this.touch ? s.t : s.k;
    this.card.innerHTML = `<div class="tc-h"><span>TRAINING · ${this.i + 1}/${STEPS.length}</span><b>${s.title}</b></div><p>${txt}</p><ul class="tc-chk"></ul><div class="tc-b"></div>`;
    const bb = this.card.querySelector('.tc-b');
    if (s.finish) { const f = el('button', 'mbtn primary tc-fin', 'Finish ▶'); f.onclick = (e) => { e.stopPropagation(); this.finish(); }; bb.append(f); }
    else { const sk = el('button', 'tc-skip', 'Skip step ›'); sk.onclick = (e) => { e.stopPropagation(); this.skipped = true; if (s.id === 'paused' && this.g.paused) this.g.setPaused(false); this.next(); }; bb.append(sk); } // skipping the pause drill must not leave the game frozen
    this.card.classList.remove('pop'); void this.card.offsetWidth; this.card.classList.add('pop'); this.renderChecks();
  }
  renderChecks() { const s = STEPS[this.i]; const ul = this.card.querySelector('.tc-chk'); if (!ul) return; if (!s.checks) { ul.innerHTML = ''; return; }
    const h = s.checks.map(([k, l]) => `<li class="${this.got[k] ? 'ok' : ''}">${this.got[k] ? '✔' : '○'} ${this.lbl[k] || l}</li>`).join(''); if (ul.innerHTML !== h) ul.innerHTML = h; }
  finish() { if (this.g.paused) this.g.setPaused(false); this.g.trainingDone = true; this.g.trainingSkipped = this.skipped; this.g.over = null; this.g.checkObjectives(); }
  tick(dt) {
    const s = STEPS[this.i]; if (!s || this.g.over) { this.hlEl.classList.add('hidden'); return; }
    if (s.tick) s.tick(this, dt);
    if (s.done(this)) { this.renderChecks(); this.next(); return; }
    this.renderChecks(); this.highlight(s.hl ? s.hl(this) : null); w2TutLayout(this); // w2: keep card/exit off panels
  }
  highlight(h) {
    const e = this.hlEl; if (!h) { e.classList.add('hidden'); return; }
    let x, y, w, hh;
    if (typeof h === 'string') { const t = [...document.querySelectorAll(h)].find(n => n.offsetParent); if (!t) { e.classList.add('hidden'); return; } const r = t.getBoundingClientRect(); x = r.left - 5; y = r.top - 5; w = r.width + 10; hh = r.height + 10; e.classList.remove('round'); }
    else { const [sx, sy, sz] = this.app.input.screenOf(h.world.x, h.y || 0.1, h.world.z); if (sz > 1) { e.classList.add('hidden'); return; } x = sx - 30; y = sy - 30; w = hh = 60; e.classList.add('round'); }
    e.classList.remove('hidden'); e.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${hh}px`;
    if (typeof h !== 'string') this.dodge(x, y, w, hh);
  }
  // keep the card off a world-space target: stay put while the current spot is clear, else jump (no slide, so it never sweeps across the
  // target) to top-centre if clear by a wide margin, else to whichever clear spot is farthest from the target (the target may still be moving with the intro camera)
  dodge(x, y, w, h) { const c = this.card, cw = c.offsetWidth, ch = c.offsetHeight, W = innerWidth, H = innerHeight, m = 12, top = Math.min(54, H * 0.08);
    const hit = (l, t, g = 8) => !(l + cw < x - g || l > x + w + g || t + ch < y - g || t > y + h + g); const low = H - ch - Math.min(170, H * 0.3);
    const cands = [[(W - cw) / 2, top], [m, top], [W - cw - m, top], [(W - cw) / 2, low], [m, low], [W - cw - m, low]].map(([l, t]) => [Math.max(m, l), Math.max(4, t)]);
    const r = c.getBoundingClientRect(); if (!hit(r.left, r.top, 16)) return;
    const tx = x + w / 2, ty = y + h / 2, far = (l, t) => Math.hypot(l + cw / 2 - tx, t + ch / 2 - ty);
    let pick = !hit(...cands[0], 40) ? cands[0] : cands.filter(([l, t]) => !hit(l, t, 24)).sort((a, b) => far(...b) - far(...a))[0];
    if (!pick) pick = cands.slice().sort((a, b) => far(...b) - far(...a))[0];
    if (pick === cands[0]) { c.classList.remove('free'); c.style.left = c.style.top = ''; if (!hit(...cands[0], 16)) return; }
    c.classList.add('free'); c.style.left = pick[0] + 'px'; c.style.top = pick[1] + 'px'; }
  dispose() { this.card.remove(); this.exitB.remove(); this.hlEl.remove(); if (this.g && this.g.hooks) this.g.hooks.onInput = null; }
}

// First-run offer: shown once on a fresh save.
export function tutorialOffer(app) {
  const m = el('div', 'modal tut-offer', `<div class="mbox to-box"><div class="to-ico">🎯</div><h3>Welcome, operator</h3><p>New to Zulu Protocol? Run a 5-minute guided drill at the <b>Fort Liberty kill house</b>: camera &amp; 3rd-person cam, selection (incl. everyone at once), movement, pause, door breaching, flashbangs, clearing a room, the Breach &amp; Clear plan and sight lines. You can replay it any time from the main menu, the world map or Settings.</p><div class="to-b"></div></div>`);
  const b = m.querySelector('.to-b'); const done = () => { app.save.tutorialOffered = true; app.persist(); m.remove(); };
  const go = el('button', 'mbtn primary big', '▶ Start tutorial'); go.onclick = () => { sfx.ui(); done(); app.startTutorial(); };
  const sk = el('button', 'mbtn', 'Skip'); sk.onclick = () => { sfx.ui(); done(); };
  b.append(go, sk); document.body.append(m); return m;
}
