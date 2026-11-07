import * as THREE from 'three';
import { ribbonGeo } from './fx.js';
import { initAudio } from './audio.js';
import { actionFor } from './controls.js';
// Pointer/touch/keyboard handling. Distinguishes tap / pan / path-draw / pinch-twist.
export class Input {
  constructor(canvas, env, hud) {
    this.cv = canvas; this.env = env; this.hud = hud; this.ptrs = new Map(); this.mode = null; this.g = null; this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); this.v = new THREE.Vector3();
    canvas.addEventListener('pointerdown', e => this.down(e)); window.addEventListener('pointermove', e => this.move(e)); window.addEventListener('pointerup', e => this.up(e)); window.addEventListener('pointercancel', e => this.up(e, true));
    canvas.addEventListener('wheel', e => { e.preventDefault(); this.env.cam.zoom(e.deltaY > 0 ? 1.1 : 0.9); this.ev('zoom'); }, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => this.key(e, true)); window.addEventListener('keyup', e => this.key(e, false));
    const release = () => { const k = this.env.cam.keys; for (const c in k) k[c] = false; }; window.addEventListener('blur', release); document.addEventListener('visibilitychange', release); // no stuck camera keys after alt-tab
    this.drawMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
  }
  setGame(g) { this.g = g; this.ptrs.clear(); this.state = null; this.mode = null; if (this.drawMesh) { this.drawMesh = null; } }
  ground(cx, cy) { const r = this.cv.getBoundingClientRect(); const ndc = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(ndc, this.env.camera); const p = new THREE.Vector3(); return this.ray.ray.intersectPlane(this.plane, p) ? p : null; }
  screenOf(x, y, z) { const r = this.cv.getBoundingClientRect(); this.v.set(x, y, z).project(this.env.camera); return [(this.v.x + 1) / 2 * r.width + r.left, (1 - this.v.y) / 2 * r.height + r.top, this.v.z]; }
  pickOp(cx, cy, R = 32) { const g = this.g; let best = null, bd = R; for (const o of g.ops) { if (!o.alive) continue; for (const h of [0.9, 0.2, 1.6]) { const [sx, sy, sz] = this.screenOf(o.x, h, o.z); if (sz > 1) continue; const d = Math.hypot(sx - cx, sy - cy); if (d < bd) { bd = d; best = o; } } } return best; }
  ev(n) { const h = this.g && this.g.hooks.onInput; if (h) h(n); }
  down(e) {
    initAudio(); if (!this.g || this.g.over) return; e.preventDefault?.(); this.cv.setPointerCapture?.(e.pointerId);
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, btn: e.button, touch: e.pointerType !== 'mouse' });
    if (this.ptrs.size === 1) {
      const op = this.pickOp(e.clientX, e.clientY, 30); const g = this.g; const selOps = g.selected();
      const canDraw = op && !e.shiftKey && (g.sel.op === op || (selOps.includes(op) && selOps.length === 1)) && e.button === 0;
      this.state = { kind: canDraw ? 'drawPending' : 'pending', op, btn: e.button, shift: e.shiftKey, touch: e.pointerType !== 'mouse', t: performance.now() };
    } else if (this.ptrs.size === 2) { this.cancelDraw(); this.hideBox(); const [a, b] = [...this.ptrs.values()]; for (const q of [a, b]) { q.gy = q.y; } const d0 = Math.hypot(a.x - b.x, a.y - b.y); this.state = { kind: 'pinch', d: d0, d0: Math.max(d0, 1), cy: (a.y + b.y) / 2, ang: Math.atan2(b.y - a.y, b.x - a.x), rot: false, tilt: false, acc: 0 }; }
    else this.state = { kind: 'pinch', d: 0, ang: 0, rot: false, acc: 0, dead: true };
  }
  move(e) {
    if (e.pointerType === 'mouse') this.env.cam.mouse = { x: e.clientX, y: e.clientY };
    const p = this.ptrs.get(e.pointerId); if (!p || !this.state) return; const px = p.x, py = p.y; p.x = e.clientX; p.y = e.clientY; const st = this.state; const cam = this.env.cam;
    if (st.kind === 'pending' || st.kind === 'drawPending') { if (Math.hypot(p.x - p.sx, p.y - p.sy) > (st.touch ? 10 : 6)) {
      if (st.kind === 'drawPending') { st.kind = 'draw'; st.pts = [{ x: st.op.x, z: st.op.z }]; }
      else if (st.btn === 2 || st.btn === 1 || (st.shift && st.touch)) st.kind = 'rotate';
      else if (!st.touch && st.btn === 0) { st.kind = 'box'; }
      else st.kind = 'pan'; } }
    if (st.kind === 'pan' && cam.mode === 'shoulder') { cam.rotate(-(p.x - px) * 0.008); cam.tilt((p.y - py) * 0.004); this.ev('pan'); } // 3rd person: drag looks around instead of dropping the chase cam
    else if (st.kind === 'pan') { const a = this.ground(px, py), b = this.ground(p.x, p.y); if (a && b) { cam.pan(a.x - b.x, a.z - b.z); this.ev('pan'); } }
    else if (st.kind === 'rotate') { cam.rotate(-(p.x - px) * 0.008); cam.tilt((p.y - py) * 0.006); this.ev('rotate'); }
    else if (st.kind === 'box') this.showBox(p.sx, p.sy, p.x, p.y);
    else if (st.kind === 'draw') { const w = this.ground(p.x, p.y); if (w) { const l = st.pts[st.pts.length - 1]; if (Math.hypot(w.x - l.x, w.z - l.z) > 0.35) { st.pts.push({ x: w.x, z: w.z }); this.showDraw(st.pts); } } }
    else if (st.kind === 'pinch' && !st.dead && this.ptrs.size === 2) {
      const [a, b] = [...this.ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      // zoom: ratio of finger spread (pinch); applied every move, no dead-zone so it feels direct
      if (st.d > 10 && d > 10) { const f = st.d / d; if (Math.abs(f - 1) > 0.002) { cam.zoom(f); this.ev('zoom'); } }
      // twist: small dead-zone first so a pure pinch doesn't wobble the view, then 1:1 rotation about the view centre
      let da = ang - st.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
      if (!st.rot) { st.acc += da; if (Math.abs(st.acc) > (st.tilt ? 0.3 : 0.08)) { st.rot = true; da = st.acc; } else da = 0; }
      if (da) { cam.rotate(-da); this.ev('rotate'); }
      // tilt: both fingers moving vertically the same way (cumulative since gesture start) with near-constant spread; driven by the centroid
      const cy = (a.y + b.y) / 2; const ca = a.y - a.gy, cb = b.y - b.gy;
      if (!st.tilt && Math.sign(ca) === Math.sign(cb) && Math.abs(ca) > 8 && Math.abs(cb) > 8 && Math.abs(d / st.d0 - 1) < 0.2 && !st.rot) st.tilt = true;
      if (st.tilt) { cam.tilt((cy - st.cy) * 0.006); this.ev('tilt'); } st.cy = cy;
      for (const q of [a, b]) { q.px = q.x; q.py = q.y; } st.d = d; st.ang = ang;
    }
  }
  up(e, cancel) {
    const p = this.ptrs.get(e.pointerId); if (!p) return; this.ptrs.delete(e.pointerId); const st = this.state; if (!st) return;
    if (st.kind === 'pinch') { if (this.ptrs.size === 0) this.state = null; else st.dead = true; return; } // a 2-finger gesture never becomes a tap
    if (this.ptrs.size > 0) return;
    this.state = null; if (cancel) { this.cancelDraw(); this.hideBox(); return; }
    if (st.kind === 'pending' || st.kind === 'drawPending') this.tap(p.x, p.y, st.op, st.btn, st.shift);
    else if (st.kind === 'box') { this.hideBox(); this.boxSelect(p.sx, p.sy, p.x, p.y, st.shift); }
    else if (st.kind === 'draw') { const pts = st.pts; this.cancelDraw(); if (pts.length > 2) { this.g.orderPath(st.op, pts, true); this.ev('path'); } }
  }
  showBox(x0, y0, x1, y1) { if (!this.box) { this.box = document.createElement('div'); this.box.className = 'selbox'; document.body.append(this.box); } Object.assign(this.box.style, { display: 'block', left: Math.min(x0, x1) + 'px', top: Math.min(y0, y1) + 'px', width: Math.abs(x1 - x0) + 'px', height: Math.abs(y1 - y0) + 'px' }); }
  hideBox() { if (this.box) this.box.style.display = 'none'; }
  boxSelect(x0, y0, x1, y1, add) { const g = this.g; const [l, r, t, b] = [Math.min(x0, x1), Math.max(x0, x1), Math.min(y0, y1), Math.max(y0, y1)]; const hit = g.ops.filter(o => { if (!o.alive) return false; const [sx, sy, sz] = this.screenOf(o.x, 0.9, o.z); return sz < 1 && sx >= l && sx <= r && sy >= t && sy <= b; }); if (!hit.length) return; g.selectMulti(add ? [...g.selected(), ...hit] : hit); this.ev('select'); }
  showDraw(pts) { const s = this.g.scene; if (this.drawMesh) { s.remove(this.drawMesh); this.drawMesh.geometry.dispose(); } this.drawMesh = new THREE.Mesh(ribbonGeo(pts, 0.16, 0.1), this.drawMat); this.drawMesh.renderOrder = 4; s.add(this.drawMesh); }
  cancelDraw() { if (this.drawMesh && this.g) { this.g.scene.remove(this.drawMesh); this.drawMesh.geometry.dispose(); this.drawMesh = null; } }
  tap(cx, cy, op, btn, shift) {
    const g = this.g; if (g.skipCine()) return; this.hud.closeMenus();
    if (op && !this.mode && btn !== 2) { if (shift) g.toggleSel(op); else if (g.sel.op === op) g.selectTeam(op.team); else g.selectOp(op); this.ev(g.sel.op ? 'selectOp' : 'selectTeam'); return; }
    const w = this.ground(cx, cy); if (!w) return;
    const sel = g.selected(); if (!sel.length) { g.toast('Select an operator or team first'); return; }
    if (this.mode === 'flash' || this.mode === 'frag' || this.mode === 'smoke' || this.mode === 'stinger' || this.mode === 'cs') { /* B4: + stinger, cs */ g.orderThrow(sel, this.mode, w.x, w.z); this.ev('throw:' + this.mode); this.setMode(null); return; }
    const door = this.mode === 'move' ? null : g.doorNear(w.x, w.z, 0.8);
    if (door && btn !== 2) { this.hud.openDoorMenu(door, cx, cy); this.ev('door'); return; }
    g.orderMove(sel, w.x, w.z, shift ? 'force' : true); this.ev(shift ? 'queue' : 'move'); if (this.mode === 'move') this.setMode(null);
  }
  setMode(m) { this.mode = m; this.hud.onMode(m); }
  key(e, down) {
    const g = this.g; const ae = document.activeElement; if (!g || (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable))) return;
    const mod = e.ctrlKey || e.metaKey; const cam = this.env.cam; cam.keys[e.code] = down && !mod; if (mod) for (const c of ['KeyZ', 'KeyX', 'KeyA', 'KeyS', 'KeyD', 'KeyW']) cam.keys[c] = false; if (!down) return;
    const k = e.code; initAudio(); if (/^(Key[WASDQERFZX]|Arrow|Page)/.test(k) && !mod) this.ev('camkey');
    if (this.hud.doorKey && this.hud.doorKey(e)) { e.preventDefault(); return; }
    if (mod && k === 'KeyZ') { e.preventDefault(); g.undo(); this.ev('undo'); return; }
    if (mod && k === 'KeyA') { e.preventDefault(); g.selectAll(); this.ev('select'); return; }
    if (mod) return;
    const a = (e.key === '?' ? 'help' : null) || actionFor(k, this.settings && this.settings()); if (!a) return;
    if (['pause', 'cycle', 'help', 'go', 'clear', 'center', 'all'].includes(a) || k === 'Tab' || k === 'Space') e.preventDefault();
    const team = (t) => { const now = performance.now(); if (this.lastTeam && this.lastTeam.t === t && now - this.lastTeam.at < 350) { const ops = g.teamOps(t); if (ops.length) cam.centerOn(ops.reduce((s, o) => s + o.x, 0) / ops.length, ops.reduce((s, o) => s + o.z, 0) / ops.length); } this.lastTeam = { t, at: now }; g.selectTeam(t); this.ev('selectTeam'); };
    const sel = g.selected(); const mode = (m) => this.setMode(this.mode === m ? null : m);
    switch (a) {
      case 'pause': if (e.repeat) break; if (!g.skipCine()) this.hud.togglePause(); break; // holding Space must not flicker pause
      case 'menu': if (this.mode || this.hud.anyOpen()) { this.setMode(null); this.hud.closeMenus(); } else this.hud.openPauseMenu(); break;
      case 'help': this.hud.toggleControls(); break;
      case 'team1': case 'team2': case 'team3': team(+a.slice(4) - 1); break;
      case 'cycle': g.cycleOp(); this.ev('selectOp'); break;
      case 'all': g.selectAll(); this.ev('select'); break;
      case 'center': if (sel.length) cam.centerOn(sel.reduce((s, o) => s + o.x, 0) / sel.length, sel.reduce((s, o) => s + o.z, 0) / sel.length); break;
      case 'frag': mode('frag'); break; case 'flash': mode('flash'); break; case 'smoke': mode('smoke'); break; case 'move': mode('move'); break;
      case 'hold': g.orderHold(sel); this.ev('hold'); break;
      case 'follow': this.hud.toggleFollow(); break;
      case 'tps': this.hud.toggleShoulder(); break;
      case 'go': g.goAll(); this.ev('go'); break;
      case 'undo': g.undo(); this.ev('undo'); break;
      case 'clear': g.clearPath(sel); this.ev('stop'); break;
      case 'faster': this.hud.stepSpeed(1); break; case 'slower': this.hud.stepSpeed(-1); break;
    }
  }
}
