import * as THREE from 'three';
import { Level, T } from './level.js';
import { buildLevelScene, makeFogUniforms } from './scenebuild.js';
import { makeCharacter } from './models.js';
import { opStyle, enemyStyle, civStyle } from './charstyle.js';
import { FX, ribbonGeo } from './fx.js';
import { opStats } from './opstats.js';
import { sfx, radio, musicCtl } from './audio.js';
import { iconTex } from './textures.js';
import { MAPS } from './maps.js';
import { UNITS, CLASSES, WEAPONS, ATTACHMENTS, ARMOR, BREACH, DIFFS, TEAMS, KITS, SKIN, ORANGE } from './data.js';
import { rand, rnd, pick, shuffle, clamp, dist, angNorm, turnToward, angTo, distPointSeg, setSeed } from './util.js';

const ENEMY_WEPS = ['ak74m', 'ak74m', 'ump45', 'm870', 'mp5', 'pkp', 'svd', 'm4a1', 'ak74m'];
const ENEMY_KITS = [[0x5b5040, 0x3a3226, 0x2a2622], [0x44474c, 0x2b2d30, 0x1d1e20], [0x6a5a44, 0x4a4030, 0x3a2e24], [0x3c4a3a, 0x2c3428, 0x5a2a24]];
const VIS_HZ = 0.16, CONE = Math.PI * 2 / 3, NEAR = 2.5;
let UID = 1;

export class Game {
  constructor(env, mission, save, squadCfg, entries, hooks) {
    this.env = env; this.mission = mission; this.save = save; this.hooks = hooks; this.settings = save.settings;
    setSeed((Date.now() & 0xffff) + 7);
    const def = MAPS[mission.map]; this.level = new Level(def); const L = this.level;
    this.diff = DIFFS[clamp(mission.diff ?? 1, 0, DIFFS.length - 1)];
    this.scene = new THREE.Scene(); env.scene = this.scene;
    this.fog = makeFogUniforms(L); this.fogState = new Uint8Array(L.W * L.H); for (let i = 0; i < L.W * L.H; i++) this.fogState[i] = L.ext[i] ? 1 : 0;
    buildLevelScene(L, this.scene, this.fog, env.quality);
    this.fx = new FX(this.scene);
    this.time = 0; this.paused = true; this.slowmo = 0; this.over = null; this.alarm = false; this.visT = 0; this.objT = 0; this.reveal = 0;
    this.stats = { shots: 0, hits: 0, kills: 0, kia: 0, wounded: 0, hostages: 0, hostagesTotal: 0, hostagesLost: 0, start: performance.now() };
    this.units = []; this.ops = []; this.enemies = []; this.civs = []; this.breaches = []; this.undoStack = []; this.timers = [];
    this.pool = Object.assign({}, save.stock); this.poolStart = Object.assign({}, this.pool);
    this.coneMatOp = new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide });
    this.coneMatEn = new THREE.MeshBasicMaterial({ color: 0xff5a30, transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide });
    // operators
    squadCfg.forEach((cfg, i) => this.spawnOp(cfg, entries));
    for (const op of this.ops) { const ex = op.unitDef.mods.extra || {}; for (const g in ex) { if (g === 'any') this.pool.flash = (this.pool.flash || 0) + 1; else this.pool[g] = (this.pool[g] || 0) + ex[g]; } }
    this.poolBonus = {}; for (const k in this.pool) this.poolBonus[k] = this.pool[k] - (this.poolStart[k] || 0);
    this.reveal = Math.max(0, ...this.ops.map(o => o.m.reveal || 0)); if ((this.pool.drone || 0) > 0) { this.pool.drone--; this.reveal = Math.max(this.reveal, 8); }
    this.spawnEnemies(); this.spawnCivs();
    this.sel = { team: this.ops[0]?.team ?? 0, op: null };
    const z = L.zones[String(entries[this.sel.team] || 1)] || L.zones['1']; const c = z[0] || [L.W / 2, L.H / 2];
    env.cam.setBounds(L.W, L.H); env.cam.target.set(c[0] + 0.5, 0, c[1] + 0.5); env.cam.dist = 20; env.cam.first = true; env.cam.yaw = Math.atan2(c[0] - L.W / 2, c[1] - L.H / 2); env.cam.pitch = 0.95; env.cam.cine = null; env.cam.follow = null; env.cam.mode = 'free';
    env.cam.occlude = (x0, z0, x1, z1) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.1); for (let k = 1; k <= n; k++) { const t = k / n, i = L.cellOf(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t); if (i >= 0 && L.blocksSight(i, false)) return (k - 1) / n; } return 1; };
    this.updateVision(); this.refreshDoors();
  }
  // ---------- spawning ----------
  spawnOp(cfg, entries) {
    const L = this.level; const unitDef = UNITS.find(u => u.id === cfg.unit) || UNITS[0]; const cls = CLASSES.find(c => c.id === cfg.cls) || CLASSES[0];
    const st = opStats(cfg); const { w, ar, m } = st;
    const zoneK = String(entries[cfg.team] || 1); const zone = L.zones[zoneK].length ? L.zones[zoneK] : L.zones['1'];
    const taken = new Set(this.ops.map(o => L.cellOf(o.x, o.z)));
    let cell = zone.map(([x, y]) => L.idx(x, y)).find(i => !taken.has(i) && L.type[i] === T.FLOOR); if (cell == null) cell = L.freeCellsNear(zone[0][0], zone[0][1], 1, taken, false)[0];
    const kit = KITS.find(k => k.id === cfg.kit) || KITS[0];
    const u = this.makeUnit('op', (cell % L.W) + 0.5, ((cell / L.W) | 0) + 0.5, { ...opStyle(cfg), armorLvl: ARMOR.indexOf(ar), ring: TEAMS[cfg.team].color });
    Object.assign(u, { wid: w.id, cfg, name: cfg.name, team: cfg.team, unitDef, cls: cls.id, m, wName: w.name, wtype: w.type,
      maxHp: st.hp, acc: st.acc, aim: st.aim, dmg: st.dmg, rof: w.rof, range: st.range,
      noise: st.noise, suppressed: st.suppressed, mag: w.mag, ammo: w.mag, reload: w.reload, speed: st.speed, armorRed: st.armor, moveAcc: st.moveAcc,
      sight: 15 * (m.vision || 1), stealth: m.stealth || 1, safeFire: !!m.safeFire, breachMul: m.breach || 1, pickMul: m.pick || 1, flashR: m.flashR || 1, flashT: m.flashT || 1, heal: m.heal || 0, suppress: m.suppress || 1, objMul: m.objective || 1 });
    u.hp = u.maxHp; u.ang = angTo(u.x, u.z, L.W / 2, L.H / 2);
    u.ribbon = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: TEAMS[u.team].color, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide })); u.ribbon.renderOrder = 3; this.scene.add(u.ribbon);
    u.coneMat = this.coneMatOp.clone(); u.coneMat.color.set(TEAMS[cfg.team]?.color ?? 0x9fd0ff); u.cone = this.makeCone(u.coneMat);
    { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); const m = new THREE.Line(g, new THREE.LineBasicMaterial({ color: TEAMS[cfg.team]?.color ?? 0xffffff, transparent: true, opacity: 0.85, depthTest: false })); m.frustumCulled = false; m.renderOrder = 6; m.visible = false; this.scene.add(m); u.sightLine = m; }
    this.ops.push(u); return u;
  }
  makeUnit(kind, x, z, style) {
    const ch = makeCharacter({ kind, ...style }); this.scene.add(ch.root);
    const u = { uid: UID++, kind, x, z, ang: 0, hp: 100, maxHp: 100, alive: true, path: [], pi: 0, orders: [], cur: null, target: null, seen: [], aimT: 0, cd: 0, reloadT: 0, stun: 0, walk: 0, doorT: 0, dieT: 0, ch, moving: false, team: -1 };
    this.units.push(u); return u;
  }
  makeCone(mat) { const N = 20; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 2) * 3), 3)); const idx = []; for (let i = 0; i < N; i++) idx.push(0, i + 1, i + 2); g.setIndex(idx); const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 1; this.scene.add(m); m.userData.N = N; return m; }
  spawnEnemies() {
    const L = this.level; const mode = this.mission.mode; const must = L.markers.E.slice(), opt = shuffle(L.markers.e.slice());
    const want = this.mission.enemies || must.length; const spots = must.concat(opt).slice(0, Math.max(want, must.length));
    const d = this.diff;
    for (const [x, y] of spots) {
      const wid = pick(ENEMY_WEPS); const w = WEAPONS.find(q => q.id === wid); const k = pick(ENEMY_KITS);
      const e = this.makeUnit('enemy', x + 0.5, y + 0.5, enemyStyle(x * 3 + y, wid, k));
      Object.assign(e, { wid, name: 'Hostile', team: 9, maxHp: d.hp, hp: d.hp, acc: d.acc * (w.acc / 0.7), aim: w.aim * d.aim * 1.25, dmg: w.dmg * 0.8, rof: w.rof * 0.7, range: w.range, noise: w.noise, mag: w.mag, ammo: w.mag, reload: w.reload * 1.2, speed: 2.7, armorRed: 0, moveAcc: 0.65, sight: 14, wtype: w.type, state: 'idle', beh: rand() < 0.35 ? 'rusher' : rand() < 0.5 ? 'patrol' : 'guard', noticeT: 0, homeX: x + 0.5, homeZ: y + 0.5, seed: rand() * 10, lostT: 0, execT: 0, idleT: rnd(1, 4) });
      e.ang = rand() * 6.28; e.ch.ring.visible = false; e.cone = this.makeCone(this.coneMatEn); this.enemies.push(e);
    }
  }
  spawnCivs() {
    const L = this.level, mode = this.mission.mode;
    if (mode === 'training') for (const e of this.enemies) { Object.assign(e, { dummy: true, down: true, hp: 1, maxHp: 1, name: 'Target' }); e.ch.root.scale.y = 0.04; }
    if (mode === 'hostage' || mode === 'training') for (const [x, y] of L.markers.H) { const h = this.makeUnit('hostage', x + 0.5, y + 0.5, civStyle(x + y)); h.ang = rand() * 6.28; h.maxHp = h.hp = 60; this.civs.push(h); this.stats.hostagesTotal++; }
    if (mode === 'hostage') { // nearest enemy to each hostage becomes an executioner
      for (const h of this.civs) { let best = null, bd = 1e9; for (const e of this.enemies) { if (e.beh === 'exec') continue; const dd = dist(e.x, e.z, h.x, h.z); if (dd < bd) { bd = dd; best = e; } } if (best && bd < 9) { best.beh = 'exec'; best.execH = h; } }
    }
    this.objs = []; const ms = this.mission;
    const addObj = (kind, x, y, need) => { const g = new THREE.Group(); g.position.set(x + 0.5, 0, y + 0.5);
      const base = new THREE.Mesh(kind === 'B' ? new THREE.CylinderGeometry(0.22, 0.26, 0.5, 12) : new THREE.BoxGeometry(0.42, 0.08, 0.32), new THREE.MeshStandardMaterial({ color: kind === 'B' ? 0x3a3d33 : 0xc9c2a8, emissive: kind === 'B' ? 0xff3010 : 0x000000, emissiveIntensity: 0.5, roughness: 0.6 }));
      base.position.y = kind === 'B' ? 0.25 : 0.82; base.castShadow = true; g.add(base);
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(kind), depthTest: false, transparent: true })); icon.scale.set(0.75, 0.75, 1); icon.position.y = 2.1; icon.renderOrder = 6; g.add(icon);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.9, 32, 1, 0, 0.001), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
      this.scene.add(g); this.objs.push({ kind, x: x + 0.5, z: y + 0.5, need, t: 0, done: false, g, icon, ring }); };
    if (mode === 'bomb') { for (const [x, y] of L.markers.B) addObj('B', x, y, 5); this.bombT = ms.timer || 210; }
    if (mode === 'intel') { for (const [x, y] of L.markers.I) addObj('I', x, y, 2.5); this.wipeT = null; }
    if (mode === 'escort') { const o0 = this.ops[0]; const sp = this.vipSpawn(o0); const v = this.makeUnit('vip', sp.x, sp.z, civStyle(0, true)); v.maxHp = v.hp = 100; v.speed = 3.0; v.joined = true; this.vip = v; this.civs.push(v); this.vipMark(v, o0); }
    if (mode === 'extract' && L.markers.V.length) { const [x, y] = L.markers.V[0]; const v = this.makeUnit('vip', x + 0.5, y + 0.5, civStyle(0, true)); v.maxHp = v.hp = 100; v.speed = 3.0; v.joined = false; this.vip = v; this.civs.push(v); }
  }
  // ---------- queries ----------
  get opsAlive() { return this.ops.filter(o => o.alive); }
  teamOps(t) { return this.ops.filter(o => o.alive && o.team === t); }
  selected() { if (this.sel.multi) return this.sel.multi.filter(o => o.alive); if (this.sel.op && this.sel.op.alive) return [this.sel.op]; return this.teamOps(this.sel.team); }
  selectMulti(list) { list = [...new Set(list)].filter(o => o.alive); if (!list.length) return; if (list.length === 1) return this.selectOp(list[0]); this.sel = { team: list[0].team, op: null, multi: list }; this.hooks.onSel && this.hooks.onSel(); }
  toggleSel(op) { const cur = this.selected(); this.selectMulti(cur.includes(op) ? cur.filter(o => o !== op) : [...cur, op]); }
  selectAll() { this.selectMulti(this.opsAlive); }
  isSel(u) { return this.sel.multi ? this.sel.multi.includes(u) : this.sel.op ? this.sel.op === u : this.sel.team === u.team; }
  clearPath(units) { for (const u of units) this.clearOrders(u); this.refreshRibbons(); this.toast('Paths cleared'); }
  setSpeed(v) { this.settings.speed = v; this.settings.ff = v > 1; }
  selectTeam(t) { this.sel = { team: t, op: null }; this.hooks.onSel && this.hooks.onSel(); }
  selectOp(op) { this.sel = { team: op.team, op }; this.hooks.onSel && this.hooks.onSel(); }
  cycleOp() { const list = this.opsAlive; if (!list.length) return; const i = list.indexOf(this.sel.op); this.selectOp(list[(i + 1) % list.length]); }
  doorNear(x, z, r = 0.8) { let best = null, bd = r; for (const d of this.level.doors) { const dd = dist(x, z, d.x + 0.5, d.y + 0.5); if (dd < bd) { bd = dd; best = d; } } return best; }
  // ---------- orders ----------
  planEnd(u) { for (let i = u.orders.length - 1; i >= 0; i--) { const o = u.orders[i]; if (o.end) return o.end; } return { x: u.x, z: u.z }; }
  pushOrders(list, append) { // list: [[unit, order]]
    const rec = [];
    for (const [u, o] of list) { if (append !== 'force' && (!append || !this.paused)) { this.clearOrders(u); } o.id = UID++; u.orders.push(o); rec.push([u, o]); }
    this.undoStack.push(rec); if (this.undoStack.length > 60) this.undoStack.shift(); this.refreshRibbons(); sfx.click();
  }
  clearOrders(u) { for (const o of u.orders) if (o.b) o.b.units = o.b.units.filter(x => x !== u); u.orders = []; u.cur = null; u.path = []; u.pi = 0; }
  undo() {
    const rec = this.undoStack.pop(); if (!rec) { this.toast('Nothing to undo'); return; }
    for (const [u, o] of rec) { const i = u.orders.indexOf(o); if (i >= 0) { u.orders.splice(i, 1); if (o.b) o.b.units = o.b.units.filter(x => x !== u); if (u.cur === o) { u.cur = null; u.path = []; u.pi = 0; } } }
    this.breaches = this.breaches.filter(b => b.units.length || b.phase === 'act' || b.phase === 'flash'); this.refreshRibbons(); this.toast('Order undone'); sfx.ui();
  }
  previewPath(from, cell) { const L = this.level; const p = L.findPath(Math.floor(from.x), Math.floor(from.z), cell % L.W, (cell / L.W) | 0); return p ? L.waypoints(p, from.x, from.z) : null; }
  orderMove(units, wx, wz, append = false) {
    const L = this.level; units = units.filter(u => u.alive); if (!units.length) return;
    const tc = L.nearestPassable(Math.floor(wx), Math.floor(wz)); const taken = new Set();
    for (const o of this.ops) if (!units.includes(o) && o.alive) taken.add(L.cellOf(o.x, o.z));
    let cells = L.freeCellsNear(tc % L.W, (tc / L.W) | 0, units.length, taken, true); if (cells.length < units.length) cells = L.freeCellsNear(tc % L.W, (tc / L.W) | 0, units.length, taken, false);
    const list = []; const rem = units.slice(); const gs = units.length > 1 ? Math.min(...units.map(u => u.speed)) : 0;
    for (const c of cells) { if (!rem.length) break; let bi = 0, bd = 1e9; rem.forEach((u, i) => { const e = this.planEnd(u); const d = dist(e.x, e.z, c % L.W, (c / L.W) | 0); if (d < bd) { bd = d; bi = i; } }); const u = rem.splice(bi, 1)[0]; const from = (append === 'force' || (append && this.paused)) ? this.planEnd(u) : u; const pv = this.previewPath(from, c); if (!pv) continue; list.push([u, { type: 'move', gs, cell: c, preview: pv, end: { x: (c % L.W) + 0.5, z: ((c / L.W) | 0) + 0.5 } }]); }
    if (!list.length) { this.toast("Can't reach there"); return; }
    this.pushOrders(list, append); radio.say('move', list[0] ? list[0][0].uid : 0);
  }
  orderPath(u, pts, append = false) {
    const L = this.level; if (!u.alive || pts.length < 2) return; const cells = [];
    for (const p of pts) { const c = L.nearestPassable(Math.floor(p.x), Math.floor(p.z)); if (cells[cells.length - 1] !== c) cells.push(c); }
    const keep = [cells[0]]; for (let i = 1; i < cells.length; i++) { const a = keep[keep.length - 1], b = cells[i]; if (Math.hypot(a % L.W - b % L.W, ((a / L.W) | 0) - ((b / L.W) | 0)) >= 1.5 || i === cells.length - 1) keep.push(b); }
    let from = (append === 'force' || (append && this.paused)) ? this.planEnd(u) : u; const preview = [];
    for (const c of keep) { const pv = this.previewPath(from, c); if (!pv) continue; preview.push(...pv); from = { x: (c % L.W) + 0.5, z: ((c / L.W) | 0) + 0.5 }; }
    const last = keep[keep.length - 1];
    this.pushOrders([[u, { type: 'move', cells: keep, preview, end: { x: (last % L.W) + 0.5, z: ((last / L.W) | 0) + 0.5 } }]], append);
  }
  orderHold(units) { for (const u of units) { this.clearOrders(u); u.hold = true; } this.refreshRibbons(); this.toast('Holding position'); sfx.click(); }
  canBreach(units, method) {
    const m = BREACH.find(b => b.id === method); if (!m) return 'Unknown';
    if (m.needs === 'breacher' && !units.some(u => u.cls === 'breacher' || u.wtype === 'shotgun')) return 'Needs a breacher or shotgun';
    if (m.item && !(this.pool[m.item] > 0)) return 'No ' + m.item + 's left';
    return null;
  }
  orderBreach(units, door, method, flash, wait = false) {
    units = units.filter(u => u.alive); if (!units.length) return; const L = this.level;
    const err = this.canBreach(units, method); if (err) { this.toast(err, 'bad'); return; }
    if (flash && !(this.pool.flash > 0)) { this.toast('No flashbangs left', 'bad'); flash = false; }
    if (door.state !== 'closed') { // already open: just stack & enter
    }
    // which side? the side the team's leader is on (shortest path)
    const lead = units[0]; const from = this.planEnd(lead);
    let side = 0, best = 1e9; door.sides.forEach(([sx, sy], k) => { if (!L.inb(sx, sy) || L.type[L.idx(sx, sy)] !== T.FLOOR) return; const p = L.findPath(Math.floor(from.x), Math.floor(from.z), sx, sy, { noDoors: false }); const ok = p && !p.includes(door.i); const len = p ? p.length : 1e9; if (ok && len < best) { best = len; side = k; } });
    if (best === 1e9) { this.toast("Can't reach that door", 'bad'); return; }
    const front = door.sides[side], far = door.sides[1 - side]; const fi = L.idx(front[0], front[1]);
    let breacher = units.find(u => method === 'shotgun' && (u.cls === 'breacher' || u.wtype === 'shotgun')) || units.find(u => u.cls === 'breacher') || units[0];
    const others = units.filter(u => u !== breacher);
    const taken = new Set([fi, door.i]); const stack = this.stackLine(front, [far[0] - front[0], far[1] - front[1]], others.length, taken);
    const b = { door, method, flash, units: [breacher, ...others], breacher, front, far, phase: 'stack', t: 0, wait, stackCells: new Map([[breacher, fi]]), dir: [far[0] - front[0], far[1] - front[1]] };
    others.forEach((u, i) => b.stackCells.set(u, stack[i] ?? fi));
    const list = b.units.map(u => { const c = b.stackCells.get(u); const pv = this.previewPath(this.paused ? this.planEnd(u) : u, c) || []; return [u, { type: 'breach', b, cell: c, preview: pv, end: { x: (c % L.W) + 0.5, z: ((c / L.W) | 0) + 0.5 } }]; });
    this.breaches.push(b); this.pushOrders(list, true);
    this.toast(`${BREACH.find(x => x.id === method).name}${flash ? ' + flash' : ''}${wait ? ' — stacking, press GO' : ''}`); return b;
  }
  goAll() { let n = 0; for (const b of this.breaches) if (b.wait) { b.wait = false; n++; } this.toast(n ? `GO GO GO! (${n} team${n > 1 ? 's' : ''})` : 'No teams waiting to breach'); if (n) radio.say('go', 0, 2); if (n && this.paused) this.setPaused(false); }
  orderThrow(units, gadget, wx, wz) {
    units = units.filter(u => u.alive); if (!units.length) return; if (!(this.pool[gadget] > 0)) { this.toast(`No ${gadget}s left`, 'bad'); return; }
    const L = this.level; let best = null, bd = 1e9; for (const u of units) { const d = dist(u.x, u.z, wx, wz); if (d < bd) { bd = d; best = u; } }
    this.pushOrders([[best, { type: 'throw', gadget, x: wx, z: wz, end: null }]], true);
  }
  // ---------- simulation ----------
  setPaused(p) { this.paused = p; this.hooks.onPause && this.hooks.onPause(p); }
  get timeScale() { if (this.paused) return 0; if (this.slowmo > 0) return 0.25; return this.settings.speed || (this.settings.ff ? 2 : 1); }
  frame(rdt) {
    rdt = Math.min(rdt, 0.1);
    if (this.slowmo > 0 && !this.paused) { this.slowmo -= rdt; if (this.slowmo <= 0) this.hooks.onCine && this.hooks.onCine(false); }
    let dt = rdt * this.timeScale; while (dt > 0) { const s = Math.min(dt, 1 / 30); this.step(s); dt -= s; }
    this.fx.update(rdt * this.timeScale, rdt); this.syncMeshes(rdt); this.updateSightLines();
    if (this.over && !this.over.shown) { if (!this.paused) this.over.wait -= rdt; if (this.over.wait <= 0) { this.over.shown = true; this.hooks.onEnd(this.result()); } }
  }
  step(dt) {
    if (this.over && this.over.frozen) return;
    this.time += dt; this.musT = (this.musT || 0) - dt; if (this.musT <= 0) { this.musT = 0.5; const fight = this.time - (this.combatT ?? -99) < 6; musicCtl.intensity(this.over ? 0.1 : fight ? 0.9 : this.alarm ? 0.55 : this.ops.some(o => o.cur || o.path.length) ? 0.3 : 0.18); }
    this.visT -= dt; if (this.visT <= 0) { this.visT = VIS_HZ; this.updateVision(); }
    if (this.reveal > 0) this.reveal -= dt;
    for (let i = 0; i < this.level.smoke.length; i++) if (this.level.smoke[i] > 0) this.level.smoke[i] -= dt;
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
    for (const b of this.breaches) this.updateBreach(b, dt);
    if (this.planSync) { const pb = this.breaches.filter(b => b.plan && b.units.some(u => u.alive)); this.planSync.t += dt; if (!pb.length) this.planSync = null; else if (pb.every(b => b.phase === 'ready') || this.planSync.t > 45) { this.planSync = null; this.toast('All teams stacked — BREACH BREACH BREACH!', 'good'); this.goAll(); } } this.breaches = this.breaches.filter(b => b.phase !== 'done');
    for (const u of this.ops) if (u.alive) { this.runOrders(u, dt); this.moveUnit(u, dt); this.combat(u, dt); this.watch(u, dt); this.support(u, dt); }
    for (const e of this.enemies) if (e.alive) { if (e.dummy) { this.dummyTick(e, dt); continue; } this.ai(e, dt); this.moveUnit(e, dt); this.combat(e, dt); }
    for (const c of this.civs) if (c.alive) this.civ(c, dt);
    for (const d of this.level.doors) { const tgt = d.state === 'closed' ? 0 : 1; d.anim += clamp(tgt - d.anim, -dt * 4, dt * 4); }
    if (this.objs.length) this.updateObjs(dt);
    this.objT -= dt; if (this.objT <= 0) { this.objT = 0.25; this.checkObjectives(); }
  }
  runOrders(u, dt) {
    if (!u.cur && u.orders.length) { u.cur = u.orders[0]; this.startOrder(u, u.cur); }
    const o = u.cur; if (!o) return;
    if (o.type === 'move') { if (u.pi >= u.path.length) { if (o.cells && o.ci < o.cells.length) { this.pathTo(u, o.cells[o.ci++]); } else this.finishOrder(u); } }
    else if (o.type === 'breach') { if (!o.b.units.includes(u)) this.finishOrder(u); }
    else if (o.type === 'throw') {
      const d = dist(u.x, u.z, o.x, o.z); if (d <= 9 && this.level.los(u.x, u.z, o.x, o.z)) { u.path = []; u.pi = 0; u.ang = turnToward(u.ang, angTo(u.x, u.z, o.x, o.z), dt * 10); o.t = (o.t || 0) + dt; if (o.t > 0.35) { this.throwNade(u, o.gadget, o.x, o.z); this.finishOrder(u); } }
      else if (u.pi >= u.path.length) { if (o.tries++ > 0) { this.toast('No line of sight for throw', 'bad'); this.finishOrder(u); } else this.pathTo(u, this.level.nearestPassable(Math.floor(o.x), Math.floor(o.z))); }
    }
  }
  startOrder(u, o) { u.hold = false; if (o.type === 'move') { if (o.cells) { o.ci = 0; } else this.pathTo(u, o.cell); } else if (o.type === 'breach') { this.pathTo(u, o.cell); } else if (o.type === 'throw') { o.tries = 0; } }
  finishOrder(u) { const o = u.orders.shift(); u.cur = null; this.refreshRibbons(); }
  pathTo(u, cell, opt = {}) { const L = this.level; const p = L.findPath(Math.floor(u.x), Math.floor(u.z), cell % L.W, (cell / L.W) | 0, opt); if (!p) { u.path = []; u.pi = 0; return false; } u.path = L.waypoints(p, u.x, u.z); u.pi = 0; return true; }
  moveUnit(u, dt) {
    u.moving = false; if (u.stun > 0 || u.pi >= u.path.length || u.execT > 0) return;
    const wp = u.path[u.pi];
    if (wp.door && wp.door.state === 'closed') {
      const d = wp.door; const dd = dist(u.x, u.z, d.x + 0.5, d.y + 0.5);
      if (u.kind !== 'enemy' && !d.locked) { if (dd < 1.25) { u.doorT = 0; this.openDoor(d, u, 'open'); } } // friendlies: doors swing open as they walk in (no stop)
      else if (dd < 1.3) { u.ang = turnToward(u.ang, angTo(u.x, u.z, d.x + 0.5, d.y + 0.5), dt * 8); u.doorT += dt; if (u.doorT > (u.kind === 'enemy' ? 0.5 : 0.6)) { u.doorT = 0; if (u.kind === 'op' && d.locked) { this.toast('Door is locked', 'bad'); u.path = []; return; } this.openDoor(d, u, u.kind === 'enemy' ? 'enemy' : 'open'); } return; }
    }
    const dx = wp.x - u.x, dz = wp.z - u.z, L = Math.hypot(dx, dz);
    let sp = (u.cur && u.cur.gs && u.kind === 'op' ? u.cur.gs : u.speed) * (u.target && u.kind === 'op' ? 0.7 : 1) * (u.rush ? 1.1 : 1); if (u.kind === 'enemy' && u.state === 'idle') sp *= 0.45; if (u.kind === 'vip') sp = u.speed;
    const step = sp * dt;
    if (L <= step) { u.x = wp.x; u.z = wp.z; u.pi++; } else { u.x += dx / L * step; u.z += dz / L * step; }
    u.moving = true; const ph0 = Math.floor(u.walk / Math.PI); u.walk += step * 3.2;
    if (Math.floor(u.walk / Math.PI) !== ph0 && (u.kind === 'op' || (u.kind === 'enemy' && u.visible))) this.footstep(u);
    if (!u.target) u.ang = turnToward(u.ang, Math.atan2(dx, dz), dt * 8);
  }
  openDoor(d, by, method) {
    const m = BREACH.find(b => b.id === method); if (d.state !== 'closed') return;
    const s = d.orient === 'h' ? Math.sign(by.z - (d.y + 0.5)) || 1 : Math.sign(by.x - (d.x + 0.5)) || 1; d.swing = d.orient === 'h' ? s : -s;
    if (d.trapped && by.kind === 'op') {
      if (m && m.trap === 'disarm') { d.trapped = false; d.icon.visible = false; this.toast('Trap disarmed', 'good'); }
      else if (m && m.trap === 'safe') { d.trapped = false; d.icon.visible = false; this.toast('Trap destroyed by charge', 'good'); }
      else { d.trapped = false; d.icon.visible = false; this.explode(d.x + 0.5, d.y + 0.5, 2.6, 85, null); this.toast('BOOBY TRAP!', 'bad'); d.state = 'broken'; this.refreshDoors(); return; }
    }
    d.locked = false; if (d.icon && !d.trapped) d.icon.visible = false;
    d.state = m && m.destroy ? 'broken' : 'open';
    if (d.state === 'broken') { this.fx.explosion(d.x + 0.5, d.y + 0.5, method === 'charge'); }
    sfx.breach(method || 'open', by && by.wid);
    if (method === 'shotgun') this.fx.muzzle(d.x + 0.5, 1.0, d.y + 0.5);
    if (m && m.noise > 1) this.noise(d.x + 0.5, d.y + 0.5, m.noise, by);
    this.refreshDoors();
  }
  refreshDoors() { for (const d of this.level.doors) { d.pivot.visible = d.state !== 'broken'; } }
  // breach stack: a tidy line along the wall beside the door (one side for small teams, both sides for 4+), second rank behind, then any free cell
  stackLine(front, dir, n, taken) {
    const L = this.level; const room = L.room[L.idx(front[0], front[1])]; const out = []; dir = [Math.sign(dir[0]), Math.sign(dir[1])];
    const ok = (x, y) => { if (!L.inb(x, y)) return false; const j = L.idx(x, y); return L.type[j] === T.FLOOR && !taken.has(j) && L.room[j] === room; };
    const perp = [-dir[1], dir[0]]; const run = (sg, back) => { const r = []; for (let k = 1; k <= 4; k++) { const x = front[0] + perp[0] * k * sg - dir[0] * back, y = front[1] + perp[1] * k * sg - dir[1] * back; if (!ok(x, y)) break; r.push(L.idx(x, y)); } return r; };
    const A = run(1, 0), B = run(-1, 0); let [s1, s2] = A.length >= B.length ? [A, B] : [B, A];
    const lines = n >= 4 && s2.length ? [s1, s2] : [s1];
    if (n >= 4 && s2.length) { const h = Math.ceil(n / 2); s1 = s1.slice(0, Math.max(h, n - s2.length)); }
    const take = (c) => { if (out.length < n && !taken.has(c)) { taken.add(c); out.push(c); } };
    if (lines.length === 2) { for (let k = 0; out.length < n && k < 4; k++) { if (s1[k] != null) take(s1[k]); if (s2[k] != null && out.length < n) take(s2[k]); } }
    else for (const c of s1) take(c);
    if (out.length < n) { const sg = s1 === A ? 1 : -1; for (const c of run(sg, 1)) take(c); }
    if (out.length < n) for (const c of L.freeCellsNear(front[0], front[1], n - out.length, taken, true)) take(c);
    return out;
  }
  updateBreach(b, dt) {
    b.units = b.units.filter(u => u.alive && u.orders.some(o => o.b === b));
    if (!b.units.length && b.phase !== 'flash') { this.refundBreach(b); b.phase = 'done'; return; }
    const d = b.door; const L = this.level;
    if (b.phase === 'stack') {
      const ready = b.units.every(u => u.cur && u.cur.b === b && u.pi >= u.path.length && dist(u.x, u.z, (b.stackCells.get(u) % L.W) + 0.5, ((b.stackCells.get(u) / L.W) | 0) + 0.5) < 0.6);
      for (const u of b.units) if (!u.target && u.cur && u.cur.b === b && u.pi >= u.path.length) u.ang = turnToward(u.ang, angTo(u.x, u.z, d.x + 0.5, d.y + 0.5), dt * 6); // stacked: weapons toward the door
      if (ready) { b.phase = b.wait ? 'ready' : 'act'; b.t = 0; if (b.wait) { this.toast('Team stacked — press GO / BREACH to execute'); if (b.units[0] && b.units[0].kind === 'op') radio.say('stack', b.units[0].uid); /* w4 */ } }
    } else if (b.phase === 'ready') { for (const u of b.units) if (!u.target) u.ang = turnToward(u.ang, angTo(u.x, u.z, d.x + 0.5, d.y + 0.5), dt * 6); if (!b.wait) { b.phase = 'act'; b.t = 0; } }
    else if (b.phase === 'act') {
      if (!b.units.includes(b.breacher)) b.breacher = b.units[0];
      const br = b.breacher; br.ang = turnToward(br.ang, angTo(br.x, br.z, d.x + 0.5, d.y + 0.5), dt * 8);
      if (d.state !== 'closed') { this.enterRoom(b); return; }
      if (b.t === 0) { const m0 = BREACH.find(x => x.id === b.method); if (m0.item && !b.reserved) { if (this.pool[m0.item] > 0) { this.pool[m0.item]--; b.reserved = m0.item; } else { b.method = 'kick'; this.toast(`No ${m0.item}s left — kicking the door`, 'bad'); } } } // reserve gear at execution so two teams can't spend the same charge
      if (b.t === 0 && b.units[0] && b.units[0].kind === 'op') radio.say(b.method === 'charge' ? 'charge' : b.method === 'kick' ? 'kick' : b.method === 'open' || b.method === 'lockpick' ? 'move' : 'breach', b.breacher ? b.breacher.uid : 0, 2);
      const m = BREACH.find(x => x.id === b.method); const dur = m.time * br.breachMul * (b.method === 'lockpick' ? br.pickMul : 1) * (m.id === 'charge' ? 0.8 : 1);
      const tick = (p) => Math.floor(b.t / p) !== Math.floor((b.t - dt) / p);
      b.t += dt; if (b.method === 'lockpick' && tick(0.32)) sfx.pick(); if (b.method === 'charge' && tick(dur - b.t < 1 ? 0.15 : 0.5)) sfx.beep(dur - b.t < 1);
      if (b.t < dur) return;
      if (d.locked && !m.locked) { this.refundBreach(b); this.toast('LOCKED! Use shotgun, charge or lockpick', 'bad'); d.icon.visible = true; for (const u of b.units) this.finishOrderOf(u, b); b.phase = 'done'; return; }
      if (m.id === 'lockpick' && !d.locked) this.refundBreach(b); b.reserved = null; // lockpick only used up on a real lock
      this.openDoor(d, br, b.method);
      if (b.method === 'charge') { const fx = b.far[0] + 0.5, fz = b.far[1] + 0.5; for (const e of this.enemies) if (e.alive && dist(e.x, e.z, fx, fz) < 4.5 && L.los(fx, fz, e.x, e.z)) { e.stun = Math.max(e.stun, 3); if (dist(e.x, e.z, fx, fz) < 1.6) this.damage(e, 40, br); } }
      if (this.settings.cine && b.units.length >= 1) this.cinematic(b);
      if (b.flash && this.pool.flash > 0) { const th = b.units.find(u => u !== br) || br; const tx = b.far[0] + 0.5 + b.dir[0] * 2, tz = b.far[1] + 0.5 + b.dir[1] * 2; const ti = L.cellOf(tx, tz); const ok = ti >= 0 && !L.blocksSight(ti, false); this.throwNade(th, 'flash', ok ? tx : b.far[0] + 0.5, ok ? tz : b.far[1] + 0.5, 0.25); b.phase = 'flash'; b.t = 0; }
      else this.enterRoom(b);
    } else if (b.phase === 'flash') { b.t += dt; if (b.t > 0.75) this.enterRoom(b); }
  }
  finishOrderOf(u, b) { const i = u.orders.findIndex(o => o.b === b); if (i >= 0) { u.orders.splice(i, 1); if (u.cur && u.cur.b === b) { u.cur = null; u.path = []; u.pi = 0; } } this.refreshRibbons(); }
  enterRoom(b) {
    const L = this.level; const [fx, fy] = b.far; const taken = new Set(this.ops.filter(o => o.alive && !b.units.includes(o)).map(o => L.cellOf(o.x, o.z)));
    const cand = L.freeCellsNear(fx, fy, 40, taken, true).filter(c => dist(c % L.W, (c / L.W) | 0, fx, fy) >= 1);
    const n = b.units.length; const picks = [];
    // spread: alternate left/right of the entry axis, increasing depth
    const ax = b.dir[0], ay = b.dir[1]; const scored = cand.map(c => { const x = c % L.W - fx, y = ((c / L.W) | 0) - fy; const depth = x * ax + y * ay, lat = x * -ay + y * ax; return { c, depth, lat }; }).filter(s => s.depth >= 0.5);
    for (let i = 0; i < n; i++) { const wantLat = (i % 2 ? -1 : 1) * (1 + Math.floor(i / 2) * 1.5), wantDepth = 1.5 + (i % 3) * 1.2; let best = null, bd = 1e9; for (const s of scored) { if (picks.includes(s.c)) continue; const e = Math.abs(s.lat - wantLat) + Math.abs(s.depth - wantDepth) * 0.8; if (e < bd) { bd = e; best = s; } } picks.push(best ? best.c : (cand[i] ?? L.idx(fx, fy))); }
    const order = b.units.slice().sort((a, c) => (a === b.breacher) - (c === b.breacher));
    order.forEach((u, i) => { const oi = u.orders.findIndex(o => o.b === b); const mo = { type: 'move', cell: picks[i], id: UID++, end: null, preview: [] }; if (oi >= 0) u.orders[oi] = mo; else u.orders.unshift(mo); if (u.cur && u.cur.b === b) u.cur = null; u.rush = true; this.timers.push({ t: 2.5, fn: () => { u.rush = false; } }); });
    b.phase = 'done'; this.refreshRibbons();
  }
  // Breach cinematic. Fixes "sometimes doesn't show": the old fixed spot (3.2 back, 1.6 to the side) often landed inside a wall in narrow
  // corridors, so the shot was a wall; a second team's breach in the same moment also yanked the camera away mid-shot.
  // Now: search for a floor spot on the stack side with clear line of sight to the door, else an over-the-wall high angle; never cut an active shot.
  cineSpot(b) {
    const L = this.level, d = b.door, cx = d.x + 0.5, cz = d.y + 0.5; const [dx, dz] = b.dir; const lx = -dz, lz = dx; const fx = cx - dx * 0.7, fz = cz - dz * 0.7;
    const clear = (x, z) => { const i = L.cellOf(x, z); if (i < 0 || L.type[i] !== T.FLOOR) return false; for (const [ox, oz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) { const j = L.cellOf(x + ox, z + oz); if (j < 0 || L.type[j] === T.WALL || L.type[j] === T.FULL) return false; } return L.los(x, z, fx, fz, false); };
    for (const back of [3.2, 2.7, 2.2, 1.7]) for (const lat of [1.6, -1.6, 1.1, -1.1, 0.6, -0.6, 0]) { const x = cx - dx * back + lx * lat, z = cz - dz * back + lz * lat; if (clear(x, z)) return { p: new THREE.Vector3(x, 1.9 + back * 0.08, z), l: new THREE.Vector3(cx + dx * 3, 0.9, cz + dz * 3), kind: 'ground', back, lat }; }
    return { p: new THREE.Vector3(cx - dx * 2.2 + lx * 0.8, 6.2, cz - dz * 2.2 + lz * 0.8), l: new THREE.Vector3(cx + dx * 2.2, 0.6, cz + dz * 2.2), kind: 'high' };
  }
  cinematic(b) {
    const cam = this.env.cam; if (cam.cine && cam.cine.t < cam.cine.dur - 0.3) { (this.cineLog ||= []).push({ door: b.door.i, kind: 'skipped-busy', t: this.time }); return; }
    const s = this.cineSpot(b); cam.startCine(null, { p: s.p, l: s.l }, 1.7); this.slowmo = 1.7; this.hooks.onCine && this.hooks.onCine(true);
    (this.cineLog ||= []).push({ door: b.door.i, kind: s.kind, t: this.time, p: [+s.p.x.toFixed(2), +s.p.y.toFixed(2), +s.p.z.toFixed(2)] });
  }
  skipCine() { if (this.slowmo > 0 || this.env.cam.cine) { this.slowmo = 0; this.env.cam.cine = null; this.hooks.onCine && this.hooks.onCine(false); return true; } return false; }
  throwNade(u, gadget, x, z, fuseOverride) {
    if (!(this.pool[gadget] > 0)) return; this.pool[gadget]--; const L = this.level;
    const fuse = fuseOverride ?? (gadget === 'frag' ? 1.0 : gadget === 'flash' ? 0.35 : 0.2);
    this.fx.throwNade(u.x, u.z, x, z, 0.45, () => this.timers.push({ t: fuse, fn: () => this.detonate(u, gadget, x, z) }));
    this.toast(`${u.name}: ${gadget === 'flash' ? 'Flashbang out!' : gadget === 'frag' ? 'Frag out!' : 'Smoke out!'}`); if (u.kind === 'op') radio.say(gadget, u.uid, 2);
  }
  detonate(u, g, x, z) {
    const L = this.level;
    if (g === 'flash') { this.fx.flash(x, z); sfx.flash(); const R = 4 * (u.flashR || 1); for (const e of this.units) { if (!e.alive || e.kind === 'vip') continue; const d = dist(e.x, e.z, x, z); if (d < R && L.los(x, z, e.x, e.z)) { if (e.kind === 'enemy') { e.stun = Math.max(e.stun, 3.5 * (u.flashT || 1)); e.state = 'combat'; } else if (e.kind === 'op' && d < 2) e.stun = Math.max(e.stun, 0.8); } } this.noise(x, z, 14, u); }
    else if (g === 'frag') this.explode(x, z, 3.2, 130, u);
    else if (g === 'smoke') { sfx.smoke(); /* w4 */ this.fx.smokeCloud(x, z, 15); for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) { if (xx * xx + yy * yy > 10) continue; const i = L.cellOf(x + xx, z + yy); if (i >= 0 && L.los(x, z, x + xx, z + yy, false)) L.smoke[i] = 15; } }
  }
  explode(x, z, R, dmg, src) { const L = this.level; this.fx.explosion(x, z, true); sfx.boom(); for (const e of this.units) { if (!e.alive) continue; const d = dist(e.x, e.z, x, z); if (d < R && L.los(x, z, e.x, e.z, false)) this.damage(e, dmg * (1 - d / R * 0.6), src, true); } this.noise(x, z, 32, src); }
  noise(x, z, r, src) {
    const L = this.level; let heard = false;
    for (const e of this.enemies) { if (!e.alive || e.stun > 0) continue; const d = dist(e.x, e.z, x, z); if (d > r) continue; const w = L.wallsBetween(x, z, e.x, e.z); if (d < r * Math.pow(0.5, w)) { heard = true; if (e.state === 'idle' || e.state === 'alert') { e.state = 'alert'; e.alertX = x; e.alertZ = z; e.alertNew = true; } } }
    if (heard && r >= 14) this.raiseAlarm();
  }
  objMulExec() { return this.diff.aim; }
  raiseAlarm() { if (this.alarm) return; this.alarm = true; this.alarmT = this.time; sfx.alarm(); if (this.ops.some(o => o.alive)) radio.say('alarm', 1, 2); if (this.mission.mode === 'hostage') this.toast('ALARM! Executioners moving on hostages!', 'bad'); else this.toast('Alarm raised!', 'bad'); }
  // ---------- vision ----------
  updateVision() {
    const L = this.level, fs = this.fogState; for (let i = 0; i < fs.length; i++) if (fs[i] === 2) fs[i] = 1;
    const mark = (i) => { fs[i] = 2; };
    for (const u of this.ops) {
      if (!u.alive) { u.cone.visible = false; if (u.sightLine) u.sightLine.visible = false; continue; }
      const pos = u.cone.geometry.attributes.position.array, N = u.cone.userData.N; pos[0] = u.x; pos[1] = 0.06; pos[2] = u.z;
      for (let k = 0; k <= N; k++) { const a = u.ang - CONE / 2 + CONE * k / N; const d = L.castRay(u.x, u.z, a, u.sight, mark); pos[(k + 1) * 3] = u.x + Math.sin(a) * d; pos[(k + 1) * 3 + 1] = 0.06; pos[(k + 1) * 3 + 2] = u.z + Math.cos(a) * d; }
      for (let k = 0; k < 12; k++) L.castRay(u.x, u.z, k / 12 * 6.283, NEAR, mark);
      u.cone.geometry.attributes.position.needsUpdate = true; u.cone.geometry.computeBoundingSphere(); const sm = this.sightMode(), selU = this.isSel(u); u.cone.visible = sm === 'all' || (sm === 'sel' && selU); u.coneMat.opacity = selU ? 0.17 : 0.075;
      fs[L.cellOf(u.x, u.z)] = 2;
      u.seen = this.enemies.filter(e => e.alive && !e.down && this.canSee(u, e));
    }
    for (const e of this.enemies) {
      if (!e.alive) { e.cone.visible = false; continue; }
      const vis = fs[L.cellOf(e.x, e.z)] === 2 || this.reveal > 0; e.visible = vis; if (vis) e.everSeen = true;
      const targets = this.ops.filter(o => o.alive); if (this.vip && this.vip.alive && this.vip.joined) targets.push(this.vip);
      e.seen = targets.filter(o => this.canSee(e, o));
      if (vis && this.settings.cones && e.stun <= 0) { const pos = e.cone.geometry.attributes.position.array, N = e.cone.userData.N; pos[0] = e.x; pos[1] = 0.07; pos[2] = e.z; const C = Math.PI / 2; for (let k = 0; k <= N; k++) { const a = e.ang - C / 2 + C * k / N; const d = L.castRay(e.x, e.z, a, e.sight * 0.6); pos[(k + 1) * 3] = e.x + Math.sin(a) * d; pos[(k + 1) * 3 + 1] = 0.07; pos[(k + 1) * 3 + 2] = e.z + Math.cos(a) * d; } e.cone.geometry.attributes.position.needsUpdate = true; e.cone.geometry.computeBoundingSphere(); e.cone.visible = true; } else e.cone.visible = false;
    }
    // trap spotting
    for (const d of L.doors) if (d.trapped && !d.trapKnown) { for (const u of this.ops) if (u.alive && dist(u.x, u.z, d.x + 0.5, d.y + 0.5) < 4.5 && L.los(u.x, u.z, d.x + 0.5, d.y + 0.5)) { d.trapKnown = true; d.icon.material.map = iconTex('trap'); d.icon.material.needsUpdate = true; d.icon.visible = true; this.toast(`${u.name}: Booby trap on that door!`, 'bad'); break; } }
    for (const c of this.civs) c.visible = fs[L.cellOf(c.x, c.z)] === 2 || c.joined || c.secured;
    const data = this.fog.data; for (let i = 0; i < fs.length; i++) data[i] = fs[i] === 2 ? 255 : fs[i] === 1 ? 120 : 0; this.fog.tex.needsUpdate = true;
  }
  sightMode() { return this.settings.sight || 'all'; }
  // per-soldier sight line: operator -> current target, brightens when the shot is lined up
  updateSightLines() { const sm = this.sightMode(); for (const u of this.ops) { const l = u.sightLine; if (!l) continue; const t = u.target; const on = u.alive && t && t.alive && sm !== 'off' && (sm === 'all' || this.isSel(u)) && (t.visible !== false); l.visible = !!on; if (!on) continue; const a = l.geometry.attributes.position.array; a[0] = u.x; a[1] = 1.25; a[2] = u.z; a[3] = t.x; a[4] = 1.15; a[5] = t.z; l.geometry.attributes.position.needsUpdate = true; l.material.opacity = u.holdFire ? 0.3 : u.aimT >= u.aim ? 0.95 : 0.35 + 0.5 * clamp(u.aimT / u.aim, 0, 1); } }
  // idle operators check corners: each covers the most open / unexplored arc (doorways weighted), split from teammates nearby
  watch(u, dt) {
    if (u.target || u.moving || u.cur || u.pi < u.path.length || u.stun > 0) { u.watchT = 0; u.watchAng = null; return; }
    u.watchT = (u.watchT || 0) - dt;
    if (u.watchT <= 0) { u.watchT = rnd(1.1, 1.8); const L = this.level, fs = this.fogState; let best = u.ang, bs = -1;
      for (let k = 0; k < 16; k++) { const a = -Math.PI + k / 16 * 6.283; let unk = 0, door = 0; const d = L.castRay(u.x, u.z, a, 10, (i) => { if (fs[i] === 0) unk++; if (L.type[i] === T.DOOR) door = 1; });
        let sc = d + unk * 0.6 + door * 4; if (d < 1.2) sc *= 0.2; if (Math.abs(angNorm(a - u.ang)) < 0.45) sc *= 1.15;
        for (const o of this.ops) if (o !== u && o.alive && dist(o.x, o.z, u.x, u.z) < 4.5 && Math.abs(angNorm(a - (o.watchAng ?? o.ang))) < 0.75) sc *= 0.35;
        if (sc > bs) { bs = sc; best = a; } }
      u.watchAng = best; }
    if (u.watchAng != null) u.ang = turnToward(u.ang, u.watchAng, dt * 3);
  }
  // enemy tactics strength by difficulty
  get tact() { return [0.35, 0.6, 0.8, 0.95][Math.max(0, DIFFS.indexOf(this.diff))] ?? 0.6; }
  inCover(x, z, t) { const d = dist(x, z, t.x, t.z); if (d < 1.6) return false; const i = this.level.cellOf(x + (t.x - x) / d * 0.8, z + (t.z - z) / d * 0.8); return i >= 0 && this.level.type[i] === T.HALF; }
  findCover(e, t) { const L = this.level; let best = null, bs = 1e9;
    for (const c of L.freeCellsNear(Math.floor(e.x), Math.floor(e.z), 40, new Set(), false)) { const x = (c % L.W) + 0.5, z = ((c / L.W) | 0) + 0.5; const d = dist(x, z, e.x, e.z); if (d > 4.5) continue; if (this.enemies.some(o => o !== e && o.alive && o.coverCell === c)) continue; if (!this.inCover(x, z, t) || !L.los(x, z, t.x, t.z, false)) continue; const sc = d + dist(x, z, t.x, t.z) * 0.15; if (sc < bs) { bs = sc; best = c; } }
    return best; }
  findFlank(e) { const L = this.level, ax = e.alertX, az = e.alertZ; const a0 = angTo(ax, az, e.x, e.z); let best = null, bs = -1;
    for (const c of L.freeCellsNear(Math.floor(ax), Math.floor(az), 60, new Set(), false)) { const x = (c % L.W) + 0.5, z = ((c / L.W) | 0) + 0.5; const r = dist(x, z, ax, az); if (r < 2.5 || r > 6.5 || dist(x, z, e.x, e.z) > 16) continue; if (!L.los(x, z, ax, az, false)) continue; const sc = Math.abs(angNorm(angTo(ax, az, x, z) - a0)) + rand() * 0.3; if (sc > bs) { bs = sc; best = c; } }
    return bs > 0.9 ? best : null; }
  // an enemy who makes contact calls it out: nearby guards (≤1 wall between) turn toward / move on the contact
  shout(e) { const tx = e.alertX ?? e.x, tz = e.alertZ ?? e.z; for (const o of this.enemies) { if (o === e || !o.alive || o.dummy || o.state === 'combat' || o.stun > 0) continue; if (dist(o.x, o.z, e.x, e.z) > 10 || this.level.wallsBetween(o.x, o.z, e.x, e.z) > 1) continue; o.state = 'alert'; o.alertX = tx; o.alertZ = tz; o.alertNew = true; o.heardShout = true; } }
  canSee(a, b) {
    const d = dist(a.x, a.z, b.x, b.z); if (d > a.sight) return false;
    if (d > NEAR) { const half = a.kind === 'enemy' ? (a.state === 'idle' ? Math.PI / 4 : Math.PI / 2.4) : CONE / 2 + 0.15; if (Math.abs(angNorm(angTo(a.x, a.z, b.x, b.z) - a.ang)) > half) return false; }
    if (this.level.smoke[this.level.cellOf(b.x, b.z)] > 0 && d > 1.5) return false;
    return this.level.los(a.x, a.z, b.x, b.z);
  }
  // ---------- combat ----------
  combat(u, dt) {
    if (u.stun > 0) { u.stun -= dt; u.aimT = 0; u.target = null; return; }
    if (u.reloadT > 0) { u.reloadT -= dt; if (u.reloadT <= 0) u.ammo = u.mag; }
    // pick target every tick from seen list (cheap)
    let t = u.target; if (!t || !t.alive || !u.seen.includes(t)) { t = null; let bd = 1e9; for (const s of u.seen) { if (!s.alive) continue; const d = dist(u.x, u.z, s.x, s.z); if (d < bd) { bd = d; t = s; } } if (t !== u.target) { u.aimT = Math.min(u.aimT, 0.1); } u.target = t; }
    if (u.kind === 'enemy' && u.noticeT < 0.6 && u.state !== 'combat') { u.target = null; return; }
    if (u.kind === 'op' && t && !u.hadTarget) radio.say('contact', u.uid); if (u.kind === 'op') u.hadTarget = !!t;
    if (!t) { u.aimT = Math.max(0, u.aimT - dt); return; }
    const want = angTo(u.x, u.z, t.x, t.z); u.ang = turnToward(u.ang, want, dt * (u.kind === 'op' ? 9 : 6));
    u.aimT += dt; u.cd -= dt;
    let react = u.aim; if (u.kind === 'enemy' && u.suppT > 0) { react *= 1.6; u.suppT -= dt; }
    if (u.aimT >= react && Math.abs(angNorm(want - u.ang)) < 0.3 && u.cd <= 0 && u.reloadT <= 0) { if (u.kind === 'op' && this.civInLine(u, t)) { u.cd = 0.25; u.holdFire = true; } else { u.holdFire = false; this.fire(u, t); } }
  }
  // camera-relative loudness so distant fights don't drown out the squad you're watching
  earVol(x, z) { const c = this.env.cam && this.env.cam.target; if (!c) return 1; return clamp(1.15 - dist(x, z, c.x, c.z) / 26, 0.12, 1); }
  footstep(u) { const now = this.time; if (now - (this.stepT || -1) < 0.06) return; this.stepT = now; if (this.settings.ff) return; sfx.step(this.earVol(u.x, u.z) * (u.kind === 'enemy' ? 0.8 : u.stealth > 1 ? 0.5 : 1), this.level.floor[this.level.cellOf(u.x, u.z)], u.rush || (u.cur && u.cur.gs > u.speed * 1.05) ? 'run' : u.stealth > 1 || (u.kind === 'enemy' && u.state === 'idle') ? 'sneak' : 'walk'); /* w4: surface + gait */ }
  fire(u, t) {
    const L = this.level; u.cd = 1 / u.rof * rnd(0.9, 1.25); u.ammo--; u.firedN = (u.firedN || 0) + 1; if (u.ammo <= 0) { u.reloadT = u.reload; if (u.kind === 'op') { sfx.reload(this.earVol(u.x, u.z)); if (u.seen.some(s => s.alive)) radio.say('reload', u.uid); } }
    if (u.kind === 'op') this.stats.shots++;
    const s = Math.sin(u.ang), c = Math.cos(u.ang); const mx = u.x + s * 0.75, mz = u.z + c * 0.75;
    this.fx.muzzle(mx, 1.28, mz); this.fx.light(mx, 1.4, mz, 6, 0.05); sfx.shot(u.suppressed, (u.kind === 'op' ? 0.8 : 0.65) * Math.max(0.3, this.earVol(u.x, u.z)), u.wid); this.combatT = this.time;
    this.noise(u.x, u.z, u.noise, u); if (u.kind === 'enemy') this.raiseAlarm();
    const d = dist(u.x, u.z, t.x, t.z); let p = u.acc;
    if (d > u.range) p *= Math.max(0.25, 1 - (d - u.range) / u.range);
    if (u.moving) p *= u.moveAcc;
    const ci = L.cellOf(t.x - (t.x - u.x) / d * 0.8, t.z - (t.z - u.z) / d * 0.8); if (d > 1.6 && ci >= 0 && L.type[ci] === T.HALF) p *= 0.55;
    if (t.stun > 0) p *= 1.35; if (t.moving) p *= 0.9;
    if (u.wtype === 'shotgun') p *= d < 4 ? 1.1 : 0.75;
    p = clamp(p, 0.04, 0.96);
    if (u.kind === 'op' && u.wtype === 'lmg') t.suppT = 1.5 * u.suppress;
    if (rand() < p) {
      if (u.kind === 'op') this.stats.hits++;
      let dmg = u.dmg * (rand() < 0.12 ? 1.8 : 1) * rnd(0.85, 1.1); if (u.wtype === 'shotgun' && d > 4) dmg *= 0.6;
      this.fx.tracer(mx, 1.3, mz, t.x, 1.2, t.z, u.kind === 'op' ? 0xffe0a0 : 0xffa070); this.damage(t, dmg, u);
    } else {
      const off = (rand() - 0.5) * 1.4; const ex = t.x + c * off + s * 2, ez = t.z - s * off + c * 2;
      this.fx.tracer(mx, 1.3, mz, ex, 1.0 + rand() * 0.5, ez, u.kind === 'op' ? 0xffe0a0 : 0xffa070); if (u.kind === 'enemy') sfx.whiz(); sfx.impact(false, this.earVol(ex, ez)); /* w4: near miss whizz + wall hit */
      if (u.kind === 'op' && !u.safeFire) for (const h of this.civs) { if (!h.alive || h === t) continue; const hd = dist(u.x, u.z, h.x, h.z); if (dist(mx, mz, h.x, h.z) > 0.8 && hd < d + 1 && distPointSeg(h.x, h.z, mx, mz, ex, ez) < 0.45 && rand() < 0.35) { this.damage(h, u.dmg, u); this.toast(`${u.name} hit a civilian!`, 'bad'); break; } }
    }
  }
  // operators hold fire when a hostage/VIP stands in the line of fire (beyond the muzzle, short of the target)
  refundBreach(b) { if (b.reserved) { this.pool[b.reserved]++; b.reserved = null; } }
  vipSpawn(o0) { const L = this.level; let best = { x: o0.x, z: o0.z }, bs = -1;
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; for (const r of [1.8, 2.4, 1.4]) { const cx = Math.floor(o0.x + Math.sin(a) * r), cz = Math.floor(o0.z + Math.cos(a) * r); if (!L.inb(cx, cz)) continue; const i = L.idx(cx, cz); if (L.nearestPassable(cx, cz) !== i) continue; const x = cx + 0.5, z = cz + 0.5;
      if (!L.los(o0.x, o0.z, x, z)) continue; const m = Math.min(...this.ops.map(o => dist(o.x, o.z, x, z))); if (m > bs) { bs = m; best = { x, z }; } } } return best; }
  civInLine(u, t) { const d = dist(u.x, u.z, t.x, t.z); if (d < 0.01) return false; const dx = (t.x - u.x) / d, dz = (t.z - u.z) / d;
    for (const h of this.civs) { if (!h.alive) continue; const px = h.x - u.x, pz = h.z - u.z; const along = px * dx + pz * dz; if (along < 0.8 || along > d + 0.3) continue; if (Math.abs(px * dz - pz * dx) < 0.5) return true; } return false; }
  damage(t, dmg, src, explosive = false) {
    if (!t.alive) return; if (t.armorRed) dmg *= 1 - t.armorRed * (explosive ? 0.5 : 1);
    t.hp -= dmg; t.hitFlash = 0.15; this.fx.decal(t.x, t.z, 0x5a0e0e, 0.5); sfx.impact(true, this.earVol(t.x, t.z)); /* w4 */
    if (t.kind === 'op') { t.wounded = true; if (t.hp > 0 && t.hp < t.maxHp * 0.5) radio.say('hurt', t.uid); }
    if (t.kind === 'enemy' && src) { t.state = 'combat'; t.noticeT = 1; t.alertX = src.x; t.alertZ = src.z; }
    if (t.hp <= 0) this.kill(t, src);
  }
  kill(t, src) {
    t.alive = false; t.hp = 0; t.dieT = 0.001; t.path = []; t.ch.ring.visible = false; if (t.cone) t.cone.visible = false; this.fx.decal(t.x, t.z, 0x4a0a0a, 1.1);
    if (t.kind === 'enemy') { this.stats.kills++; const left = this.enemies.filter(e => e.alive).length; if (left === 0 && (this.mission.mode === 'hunt' || this.mission.mode === 'hostage')) this.finalKill(t, src); else if (left) { this.toast(`Hostile down — ${left} left`); if (left === 1 && src && src.kind === 'op') radio.say('last', src.uid + 1); /* w4 */ } if (src && src.kind === 'op') radio.say(left ? 'down' : 'clear', src.uid); }
    else if (t.kind === 'op') { this.stats.kia++; radio.say('mandown', t.uid + 1, 2); this.toast(`${t.name} is down!`, 'bad'); this.clearOrders(t); this.refreshRibbons(); if (this.sel.op === t) this.sel.op = null; this.hooks.onSel && this.hooks.onSel(); }
    else if (t.kind === 'hostage') { this.stats.hostagesLost++; this.toast('Hostage killed!', 'bad'); }
    else if (t.kind === 'vip') this.toast('VIP is down!', 'bad');
  }
  finalKill(t, src) {
    if (!this.settings.cine || !src) return; const dx = t.x - src.x, dz = t.z - src.z, L = Math.hypot(dx, dz) || 1;
    const p = new THREE.Vector3(src.x - dx / L * 1.5 + (-dz / L) * 1.2, 1.8, src.z - dz / L * 1.5 + (dx / L) * 1.2); const l = new THREE.Vector3(t.x, 0.6, t.z);
    this.env.cam.startCine(null, { p, l }, 2.0); this.slowmo = 2.0; this.hooks.onCine && this.hooks.onCine(true, 'FINAL KILL');
  }
  support(u, dt) {
    if (u.heal) for (const o of this.ops) if (o.alive && o.hp < o.maxHp * 0.8 && dist(o.x, o.z, u.x, u.z) < 3) o.hp = Math.min(o.maxHp * 0.8, o.hp + u.heal * dt);
    if (u.hp < 35 && this.pool.medkit > 0) { this.pool.medkit--; u.hp = Math.min(u.maxHp, u.hp + 50); this.toast(`${u.name} used a medkit`, 'good'); }
  }
  // ---------- enemy AI ----------
  ai(e, dt) {
    if (e.stun > 0) { e.path = []; e.execT = 0; return; }
    const L = this.level;
    if (e.seen.length) { let near = false; for (const o of e.seen) if (dist(o.x, o.z, e.x, e.z) < NEAR) near = true; const st = Math.max(...e.seen.map(o => o.stealth || 1)); e.noticeT += dt * (e.state === 'idle' ? 1 : 2.5) / st * (near ? 4 : 1); if (e.noticeT >= 0.6 && e.state !== 'combat') { e.state = 'combat'; this.raiseAlarm(); } e.lostT = 0; if (e.state === 'combat') { const t = e.seen[0]; e.alertX = t.x; e.alertZ = t.z; } }
    else e.noticeT = Math.max(0, e.noticeT - dt * 0.3);
    // executioners
    // hostage fairness: 5s grace after the alarm, an executioner who can see an operator fights instead, each has its own extra delay, and at most one execution per 10s
    if (e.beh === 'exec' && this.alarm && this.time - (this.alarmT || 0) > 5 && !e.seen.length) {
      let h = e.execH; if (!h || !h.alive || h.secured) { e.beh = 'guard'; h = null; } const bd = h ? dist(h.x, h.z, e.x, e.z) : 1e9;
      if (h) { if (bd < 2.6 && L.los(e.x, e.z, h.x, h.z)) { e.path = []; e.ang = turnToward(e.ang, angTo(e.x, e.z, h.x, h.z), dt * 6); if (!e.execWarned) { e.execWarned = true; if (this.time - (this.execToastT ?? -99) > 6) { this.execToastT = this.time; this.toast('Executioner on a hostage — hurry!', 'bad'); } } e.execT += dt; if (e.execDelay == null) e.execDelay = rnd(0, 6); if (e.execT > (10 + e.execDelay) * this.objMulExec() && this.time - (this.lastExecT ?? -99) > 10) { e.execT = 0; this.lastExecT = this.time; e.ammo--; this.fx.tracer(e.x, 1.3, e.z, h.x, 0.8, h.z, 0xffa070); this.fx.muzzle(e.x + Math.sin(e.ang) * 0.7, 1.28, e.z + Math.cos(e.ang) * 0.7); sfx.shot(false, 0.6); this.kill(h, e); } return; } else { e.execT = 0; if (!e.path.length || e.pi >= e.path.length || e.execTarget !== h) { e.execTarget = h; this.pathTo(e, L.nearestPassable(Math.floor(h.x), Math.floor(h.z)), { enemy: true }); } return; } }
    }
    e.execT = 0;
    if (e.state === 'idle') {
      if (e.beh === 'patrol') { if (e.pi >= e.path.length) { e.idleT -= dt; if (e.idleT <= 0) { e.idleT = rnd(2, 5); const hx = Math.floor(e.homeX), hz = Math.floor(e.homeZ); const cells = L.freeCellsNear(hx, hz, 30, new Set(), true); if (cells.length) this.pathTo(e, pick(cells), { enemy: true }); } } }
      else { e.ang += Math.sin(this.time * 0.5 + e.seed) * 0.5 * dt; }
    } else if (e.state === 'alert') {
      if (e.alertNew) { e.alertNew = false; const close = e.alertX != null && dist(e.x, e.z, e.alertX, e.alertZ) < 9; if (e.beh === 'rusher' || e.beh === 'patrol' || (e.beh === 'guard' && (e.heardShout || close) && rand() < this.tact * 0.6)) this.pathTo(e, L.nearestPassable(Math.floor(e.alertX), Math.floor(e.alertZ)), { enemy: true }); else e.lookAt = angTo(e.x, e.z, e.alertX, e.alertZ); }
      if (e.lookAt != null && e.pi >= e.path.length) e.ang = turnToward(e.ang, e.lookAt, dt * 3);
    } else if (e.state === 'combat' && !e.seen.length) {
      e.lostT += dt;
      if (e.beh === 'rusher' && e.lostT > 0.8 && e.pi >= e.path.length && e.alertX != null) { this.pathTo(e, L.nearestPassable(Math.floor(e.alertX), Math.floor(e.alertZ)), { enemy: true }); e.alertX = null; }
      if (e.lostT < 2 && e.alertX != null) e.ang = turnToward(e.ang, angTo(e.x, e.z, e.alertX, e.alertZ), dt * 4);
      if (e.beh !== 'rusher' && e.beh !== 'exec' && !e.flankTried && e.lostT > 2.2 && e.alertX != null && e.pi >= e.path.length) { e.flankTried = true; if (rand() < this.tact * (e.beh === 'patrol' ? 1 : 0.6)) { const c = this.findFlank(e); if (c != null && this.pathTo(e, c, { enemy: true })) { e.flanking = true; this.aiLog && this.aiLog.push({ t: this.time, kind: 'flank', id: this.enemies.indexOf(e) }); } } }
      if (e.lostT > 7) { e.state = 'alert'; e.lookAt = null; e.flankTried = false; e.flanking = false; e.coverCell = null; }
    }
    if (e.state === 'combat' && !e.shouted) { e.shouted = true; this.shout(e); this.aiLog && this.aiLog.push({ t: this.time, kind: 'shout', id: this.enemies.indexOf(e) }); }
    if (e.state === 'combat' && e.seen.length) { e.flankTried = false; e.flanking = false;
      if (e.beh !== 'rusher' && e.beh !== 'exec') { const t = e.seen[0]; e.coverT = (e.coverT ?? rnd(0.4, 1.2)) - dt;
        if (e.coverCell != null && e.pi >= e.path.length) { e.coverCell = null; e.path = []; }
        if (e.coverCell == null) { e.path = []; if (e.coverT <= 0) { e.coverT = rnd(2.5, 4.5); if (!this.inCover(e.x, e.z, t) && rand() < this.tact) { const c = this.findCover(e, t); if (c != null && this.pathTo(e, c, { enemy: true })) { e.coverCell = c; this.aiLog && this.aiLog.push({ t: this.time, kind: 'cover', id: this.enemies.indexOf(e) }); } } } } } else if (e.beh === 'exec') e.path = []; }
  }
  // tutorial pop-up target: rises when an operator first sees its cell, never moves or shoots
  dummyTick(e, dt) { if (e.down && e.visible) { e.popT = (e.popT || 0) + dt; if (e.popT > 0.3) { e.down = false; sfx.ui && sfx.ui(); } } const k = e.down ? 0.04 : 1; e.ch.root.scale.y += (k - e.ch.root.scale.y) * Math.min(1, dt * 12); }
  // rescued VIP wears the rescuing team's colour: ring + a star floating over the head
  vipMark(v, op) {
    if (!v || !op || v.star) return; const col = new THREE.Color(TEAMS[op.team]?.color ?? 0x40ff70); v.markTeam = op.team; if (v.ch.ring) v.ch.ring.material.color.copy(col);
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 23 : 54, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(64 + Math.cos(a) * r, 66 + Math.sin(a) * r); } x.closePath();
    x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 8; x.fillStyle = '#' + col.getHexString(); x.fill(); x.shadowBlur = 0; x.lineWidth = 7; x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.stroke();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true })); sp.scale.setScalar(0.42); sp.position.y = 2.2; sp.renderOrder = 20; sp.name = 'vipStar';
    v.ch.root.add(sp); v.star = sp;
  }
  civ(c, dt) {
    const near = this.ops.find(o => o.alive && dist(o.x, o.z, c.x, c.z) < 1.7);
    if (c.kind === 'hostage') { if (!c.secured && near) { c.secured = true; c.ch.ring.material.color.set(0x40ff70); this.toast(`${near.name}: Hostage secured`, 'good'); radio.say('hostage', near.uid, 2); } return; }
    if (c.kind === 'vip') {
      if (c.star) { c.starT = (c.starT || 0) + dt; c.star.position.y = 2.2 + Math.sin(c.starT * 2.4) * 0.05; c.star.visible = c.alive; }
      if (!c.joined && near) { c.joined = true; this.vipMark(c, near); this.toast('VIP is with you — get to the green EXIT zone', 'good'); }
      if (c.joined) { c.followT = (c.followT || 0) - dt; const L = this.level, X = L.zones.X;
        const exitD = (u) => { let b = 1e9, bc = null; for (const [x, y] of X) { const d = dist(u.x, u.z, x + 0.5, y + 0.5); if (d < b) { b = d; bc = [x, y]; } } return [b, bc]; };
        let lead = null, bd = 1e9; for (const o of this.ops) if (o.alive) { const d = dist(o.x, o.z, c.x, c.z); if (d < bd) { bd = d; lead = o; } }
        // an operator standing in (or right next to) the exit pulls the VIP into the zone itself, instead of the VIP parking 1.5-2 m behind them outside it
        const atExit = X.length && this.ops.some(o => o.alive && exitD(o)[0] < 2.2 && dist(o.x, o.z, c.x, c.z) < 6);
        if (lead && c.followT <= 0) { c.followT = 0.5;
          if (atExit) { const [, xc] = exitD(c); this.pathTo(c, L.nearestPassable(xc[0], xc[1]), {}); }
          else if (bd > 2.0 || bd < 1.2) this.pathTo(c, L.nearestPassable(Math.floor(lead.x - Math.sin(lead.ang) * 1.8), Math.floor(lead.z - Math.cos(lead.ang) * 1.8)), {}); else c.path = []; } // keep 1.5-2 m behind the nearest operator
        this.moveUnit(c, dt);
        const ci = L.cellOf(c.x, c.z); if (X.some(([x, y]) => L.idx(x, y) === ci) || (X.length && exitD(c)[0] < 0.9)) c.out = true; }
    }
  }
  // ---------- objectives ----------
  updateObjs(dt) {
    const m = this.mission.mode;
    if (m === 'bomb') { this.bombT -= dt; if (this.bombT <= 0 && !this.over) { this.objs.filter(o => !o.done).forEach(o => this.fx.explosion ? this.fx.explosion(o.x, o.z) : this.fx.flash(o.x, o.z)); sfx.boom(); this.over = { win: false, wait: 1.6, reason: 'The bomb detonated.' }; this.endTime = this.time; sfx.lose(); this.toast('BOMB DETONATED', 'bad'); return; } }
    if (m === 'intel' && this.alarm && this.wipeT == null) { this.wipeT = 45; this.toast('Enemy is wiping the intel — 45 s!', 'bad'); }
    if (this.wipeT != null) { this.wipeT -= dt; if (this.wipeT <= 0 && !this.over && this.objs.some(o => !o.done)) { this.over = { win: false, wait: 1.6, reason: 'The intel was wiped.' }; this.endTime = this.time; sfx.lose(); this.toast('INTEL WIPED', 'bad'); return; } }
    for (const o of this.objs) { if (o.done) continue;
      const u = this.ops.find(op => op.alive && !op.target && dist(op.x, op.z, o.x, o.z) < 1.35);
      if (u) { o.t += dt * (u.objMul || 1); if (o.t >= o.need) { o.done = true; sfx.objective(); o.icon.material.map = iconTex('ok'); o.icon.material.needsUpdate = true; o.g.children[0].material.emissive.set(0); if (o.kind === 'I') o.g.children[0].visible = false; sfx.ui(); const n = this.objs.filter(x => x.done).length; this.toast(`${u.name}: ${o.kind === 'B' ? 'Bomb defused' : 'Intel secured'} (${n}/${this.objs.length})`, 'good'); } }
      o.ring.geometry.dispose(); o.ring.geometry = new THREE.RingGeometry(0.75, 0.9, 32, 1, 0, Math.max(0.001, Math.PI * 2 * o.t / o.need));
      if (o.kind === 'B') o.g.children[0].material.emissiveIntensity = 0.3 + 0.5 * (Math.sin(this.time * (this.bombT < 30 ? 14 : 5)) * 0.5 + 0.5);
    }
  }
  objectiveText() {
    const m = this.mission.mode, left = this.enemies.filter(e => e.alive).length; const clk = (t) => `${Math.floor(Math.max(0, t) / 60)}:${String(Math.floor(Math.max(0, t) % 60)).padStart(2, '0')}`;
    const done = this.objs ? this.objs.filter(o => o.done).length : 0;
    if (m === 'bomb') return `Defuse bombs ${done}/${this.objs.length} · ⏱ ${clk(this.bombT)}`;
    if (m === 'intel') return `Intel ${done}/${this.objs.length}` + (this.wipeT != null ? ` · wipe in ${clk(this.wipeT)}` : ' · stay quiet');
    if (m === 'escort') return this.vip && this.vip.alive ? 'Escort the VIP to the green EXIT' : 'VIP down';
    if (m === 'training') return `Kill house · targets down ${this.enemies.length - left}/${this.enemies.length}`;
    if (m === 'hunt') return `Neutralise hostiles: ${this.enemies.length - left}/${this.enemies.length}`;
    if (m === 'hostage') { const alive = this.civs.filter(c => c.alive).length; return `Hostiles ${left} left · Hostages alive ${alive}/${this.stats.hostagesTotal}`; }
    if (m === 'extract') return !this.vip ? 'Extract' : this.vip.joined ? 'Escort the VIP to the EXIT' : 'Find the VIP';
    return '';
  }
  checkObjectives() {
    if (this.over) return; const m = this.mission.mode; const left = this.enemies.filter(e => e.alive).length; let win = null;
    if (!this.opsAlive.length) win = false;
    else if (m === 'hunt' && left === 0) win = true;
    else if (m === 'training' && this.trainingDone) win = true;
    else if (m === 'hostage') { const alive = this.civs.filter(c => c.alive).length; if (alive === 0) win = false; else if (left === 0) win = true; }
    else if ((m === 'bomb' || m === 'intel') && this.objs.length && this.objs.every(o => o.done)) win = true;
    else if ((m === 'extract' || m === 'escort') && this.vip) { if (!this.vip.alive) win = false; else if (this.vip.out) win = true; }
    if (win !== null) { this.over = { win, wait: this.slowmo > 0 ? 2.2 : 1.6 }; this.endTime = this.time; win ? sfx.win() : sfx.lose(); if (win) radio.say('win', 0, 2); musicCtl.intensity(0.1); this.toast(win ? 'MISSION COMPLETE' : 'MISSION FAILED', win ? 'good' : 'bad'); }
  }
  result() {
    const s = this.stats, win = this.over.win, ms = this.mission; const time = this.endTime ?? this.time;
    const civLost = this.civs.some(c => !c.alive);
    const stars = win ? 1 + (time <= ms.par ? 1 : 0) + (s.kia === 0 && !civLost ? 1 : 0) : 0;
    const aborted = !!this.over.aborted; const saved = win ? this.civs.filter(c => c.kind === 'hostage' && c.alive).length : 0; // only a won mission extracts hostages
    const cashMul = Math.max(1, ...this.ops.map(o => o.m.cash || 1));
    if (ms.training) return { win, stars: 0, time, par: ms.par, shots: s.shots, hits: s.hits, acc: s.shots ? Math.round(s.hits / s.shots * 100) : 0, kills: s.kills, enemies: this.enemies.length, wounded: 0, kia: 0, saved: this.civs.filter(c => c.alive).length, hostages: s.hostagesTotal, vip: null, cash: win && !this.trainingSkipped && !this.save.tutorialDone ? ms.cash : 0, used: {}, mission: ms, training: true, skipped: !!this.trainingSkipped, reason: this.over.reason };
    const cash = aborted ? 0 : win ? Math.round((ms.cash * (0.5 + stars / 6) + s.kills * 25 + saved * 100) * cashMul) : Math.min(150, s.kills * 15); // abort pays nothing; a loss pays a small capped kill bonus
    const wounded = this.ops.filter(o => o.alive && o.wounded).length;
    const used = {}; for (const k in this.pool) used[k] = Math.max(0, (this.poolStart[k] || 0) + (this.poolBonus[k] || 0) - this.pool[k]);
    return { win, stars, time, par: ms.par, shots: s.shots, hits: s.hits, acc: s.shots ? Math.round(s.hits / s.shots * 100) : 0, kills: s.kills, enemies: this.enemies.length, wounded, kia: s.kia, saved, hostages: s.hostagesTotal, vip: this.vip ? (this.vip.out ? 'Extracted' : this.vip.alive ? 'Not extracted' : 'KIA') : null, cash, used, aborted, mission: ms, flawless: s.kia === 0 && !civLost, underPar: time <= ms.par, reason: this.over.reason || (win ? '' : !this.opsAlive.length ? 'All operators down.' : this.vip && !this.vip.alive ? 'The VIP was killed.' : this.civs.length && !this.civs.some(c => c.alive) ? 'All hostages were killed.' : '') };
  }
  abort() { if (!this.over) { this.over = { win: false, wait: 0, shown: true, aborted: true, reason: 'Mission aborted.' }; this.endTime = this.time; } return this.result();
  }
  toast(msg, kind) { this.hooks.onToast && this.hooks.onToast(msg, kind); }
  // ---------- rendering sync ----------
  refreshRibbons() {
    for (const u of this.ops) {
      const pts = []; if (u.alive) { pts.push({ x: u.x, z: u.z }); if (u.cur) for (let i = u.pi; i < u.path.length; i++) pts.push(u.path[i]); for (const o of u.orders) if (o !== u.cur && o.preview) pts.push(...o.preview); if (u.cur && u.cur.cells) { /* drawn path remainder */ for (const p of u.cur.preview || []) { } } }
      if (pts.length < 2) { if (!u.ribEmpty) { u.ribbon.geometry.dispose(); u.ribbon.geometry = new THREE.BufferGeometry(); u.ribEmpty = true; } u.ribbon.visible = false; continue; }
      u.ribbon.geometry.dispose(); u.ribbon.geometry = ribbonGeo(pts, 0.11, 0.08); u.ribEmpty = false; u.ribbon.visible = true;
      u.ribbonN = u.pi;
    }
  }
  syncMeshes(rdt) {
    const t = performance.now() / 1000; const adt = rdt * this.timeScale; // animate in game time: pause freezes poses, 2x/slow-mo keep feet planted
    for (const u of this.units) {
      const ch = u.ch; ch.root.position.set(u.x, 0, u.z); ch.root.rotation.y = u.ang;
      if (u.star) u.star.visible = u.alive;
      if (u.kind === 'enemy') ch.root.visible = (u.visible || (!u.alive && u.everSeen)) || this.over != null;
      else if (u.kind === 'hostage' || u.kind === 'vip') ch.root.visible = u.visible || !u.alive || u.secured || u.joined || this.over != null;
      if (ch.update) { const sit = (u.kind === 'hostage' && !u.out) || (u.kind === 'vip' && !u.joined); if (ch.root.visible) ch.update(adt, { kneel: sit && u.alive, aim: !!u.target || (u.kind === 'op' && u.moving && !!u.cur && u.cur.type === 'breach'), handsUp: u.kind === 'hostage' && !u.out && u.alive, fired: u.firedN, dying: !u.alive, dead: !u.alive && u.dieT >= 1 }); }
      if (!u.alive) { u.dieT = Math.min(1, u.dieT + rdt * 2.5); if (ch.deathClip) continue; ch.pose.rotation.x = -Math.PI / 2 * u.dieT; ch.pose.position.y = 0.15 * u.dieT; ch.pose.position.z = -0.3 * u.dieT; continue; }
      const sitting = (u.kind === 'hostage' && !u.out) || (u.kind === 'vip' && !u.joined);
      if (ch.update) { ch.pose.position.y = 0; ch.pose.rotation.z = u.stun > 0 ? Math.sin(t * 8) * 0.08 : 0; }
      else if (sitting) { ch.pose.position.y = -0.78; ch.legL.rotation.x = ch.legR.rotation.x = -1.5; ch.arms.rotation.x = 0; }
      else {
        ch.pose.position.y = 0; const sw = u.moving ? Math.sin(u.walk) * 0.55 : 0; ch.legL.rotation.x = sw; ch.legR.rotation.x = -sw;
        const aimPose = u.target || u.kind === 'vip' ? 0 : 0.45; ch.arms.rotation.x += (aimPose - ch.arms.rotation.x) * Math.min(1, rdt * 10);
        if (u.stun > 0) { ch.pose.rotation.z = Math.sin(t * 8) * 0.08; } else ch.pose.rotation.z = 0;
      }
      if (u.kind === 'op') { const sel = this.isSel(u); ch.ring.material.opacity = sel ? 0.95 : 0.4; const solo = sel && this.sel.op === u; const sc = solo ? 1.3 + Math.sin(t * 7) * 0.1 : sel ? 1 + Math.sin(t * 5) * 0.06 : 0.9; ch.ring.material.color.set(solo ? 0xffffff : TEAMS[u.team].color); ch.ring.scale.set(sc, 1, sc); }
      if (u.kind === 'enemy') { ch.ring.visible = u.visible && u.alive; }
    }
    for (const d of this.level.doors) { if (d.pivot.visible) d.pivot.rotation.y = (d.swing || 1) * d.anim * 1.7; }
    // trim ribbons as units progress
    this.ribT = (this.ribT || 0) - rdt; if (this.ribT <= 0) { this.ribT = 0.2; const mv = this.ops.some(u => u.moving); if (mv || this.ribMoving) this.refreshRibbons(); this.ribMoving = mv; }
    // deploy-zone tiles are only a planning aid: fade them out once the clock starts
    const zm = this.level.zoneMesh; if (zm && zm.visible && this.time > 0) { zm.material.opacity = Math.max(0, zm.material.opacity - rdt * 0.3); if (zm.material.opacity <= 0) zm.visible = false; }
  }
  dispose() { this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
}
