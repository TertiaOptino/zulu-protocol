// w1: door stacks that look like a real stack, and pre-stacking before GO.
//  * Slots: every operator (breacher included) waits beside the door, hugging the wall on our side,
//    never in the doorway approach cell. 3+ operators split onto both sides when both are open
//    (breacher on the longer side, nearest the frame); otherwise one line, with a second rank behind it.
//  * Act: the breacher steps into the doorway only when the breach is executed (≤3 s, then just goes).
//  * Timeout: a stack that cannot complete (blocked, stuck) still breaches after 25 s, or 4 s after
//    everyone stopped moving. b.w1timeout = true marks it.
//  * Planning: each assigned plan team is ordered to its door as a waiting breach (b.w1pre) right away and
//    walks to its slots even while the plan view has the game paused; EXECUTE/GO only triggers the breach.
const STACK_TIMEOUT = 25, IDLE_TIMEOUT = 4, STEP_IN_MAX = 3;
const sgn = Math.sign;

export function stackSlots(g, b) {
  const L = g.level, d = b.door, f = b.front; const dir = [sgn(b.dir[0]), sgn(b.dir[1])], perp = [-dir[1], dir[0]];
  const room = L.room[L.idx(f[0], f[1])]; const taken = new Set([d.i, L.idx(f[0], f[1])]);
  for (const o of g.breaches) if (o !== b && o.phase !== 'done') for (const c of o.stackCells.values()) taken.add(c);
  const ok = (x, y) => { if (!L.inb(x, y)) return false; const j = L.idx(x, y); return L.type[j] === 0 && !taken.has(j) && L.room[j] === room; };
  const run = (sg, back) => { const r = []; for (let k = 1; k <= 4; k++) { const x = f[0] + perp[0] * k * sg - dir[0] * back, y = f[1] + perp[1] * k * sg - dir[1] * back; if (!ok(x, y)) break; r.push(L.idx(x, y)); } return r; };
  const A = run(1, 0), B = run(-1, 0); const [s1, s2, sg1] = A.length >= B.length ? [A, B, 1] : [B, A, -1];
  const n = b.units.length; if (!s1.length) return null; // no wall-side cell at all: keep the vanilla slots
  const out = []; const take = (c) => { if (c != null && out.length < n && !out.includes(c)) out.push(c); };
  if (n >= 3 && s2.length) { for (let k = 0; out.length < n && k < 4; k++) { take(s1[k]); take(s2[k]); } } // split stack
  else for (const c of s1) take(c);
  for (const c of run(sg1, 1)) take(c); for (const c of run(-sg1, 1)) take(c); // second rank
  return out.length === n ? out : null;
}

function reslot(g, b) {
  const slots = stackSlots(g, b); if (!slots) return false; const L = g.level;
  b.units.forEach((u, i) => { const c = slots[i]; b.stackCells.set(u, c); const o = u.orders.find(x => x.b === b); if (!o) return;
    o.cell = c; o.end = { x: (c % L.W) + 0.5, z: ((c / L.W) | 0) + 0.5 };
    const k = u.orders.indexOf(o); u.orders.splice(k, 1); const from = g.paused ? g.planEnd(u) : u; u.orders.splice(k, 0, o);
    o.preview = g.previewPath(from, c) || o.preview; if (u.cur === o) g.pathTo(u, c); });
  b.w1slots = true; g.refreshRibbons && g.refreshRibbons(); return true;
}

function dropPre(g, units) { // a manual order to a pre-stacked operator replaces his plan stack
  for (const u of units) for (const o of [...u.orders]) if (o.b && o.b.w1pre) { g.finishOrderOf(u, o.b); o.b.units = o.b.units.filter(x => x !== u);
    if (!o.b.units.length) { o.b.phase = 'done'; if (g.plan) g.plan = g.plan.filter(p => p.team !== o.b.w1team); } }
}

export function installStack2(Game) {
  const P = Game.prototype;
  const oB = P.orderBreach; P.orderBreach = function (units, door, method, flash, wait) {
    if (!this.w1sync) dropPre(this, (units || []).filter(u => u.alive));
    const b = oB.call(this, units, door, method, flash, wait); if (b && b.units.length && this.settings.w1stack !== false) reslot(this, b); return b; };
  const oPush = P.pushOrders; P.pushOrders = function (list, append) { if (!this.w1sync) dropPre(this, list.map(([u]) => u)); return oPush.call(this, list, append); };
  const oU = P.updateBreach; P.updateBreach = function (b, dt) {
    const L = this.level;
    if (b.phase === 'stack' && b.units.length) { b.w1t = (b.w1t || 0) + dt;
      const idle = b.units.every(u => !u.cur || u.cur.b !== b || u.pi >= u.path.length); b.w1idle = idle ? (b.w1idle || 0) + dt : 0;
      if (!this.paused && (b.w1t > STACK_TIMEOUT || b.w1idle > IDLE_TIMEOUT)) { const r = oU.call(this, b, dt); if (b.phase === 'stack') { b.w1timeout = true; b.phase = b.wait ? 'ready' : 'act'; b.t = 0; } return r; } }
    if (b.phase === 'act' && b.w1slots && !b.w1in && b.door.state === 'closed') { const br = b.units.includes(b.breacher) ? b.breacher : b.units[0];
      if (br) { const fi = L.idx(b.front[0], b.front[1]); const fx = b.front[0] + 0.5, fz = b.front[1] + 0.5; b.w1st = (b.w1st || 0) + dt;
        if (b.w1st < STEP_IN_MAX && Math.hypot(br.x - fx, br.z - fz) > 0.45) { if (!b.w1go) { b.w1go = true; this.pathTo(br, fi); b.stackCells.set(br, fi); } return; } }
      b.w1in = true; }
    return oU.call(this, b, dt); };
  // stage pre-stacks while the plan view has the game paused
  const oF = P.frame; P.frame = function (rdt) {
    if (this.paused && !this.over && this.breaches.some(b => b.w1pre && b.phase === 'stack')) { const dt = Math.min(rdt, 0.1); const bs = this.breaches.filter(b => b.w1pre && b.phase === 'stack');
      const us = new Set(); for (const b of bs) for (const u of b.units) us.add(u);
      for (const u of us) if (u.alive && (u.cur ? u.cur.b && u.cur.b.w1pre : u.orders[0] && u.orders[0].b && u.orders[0].b.w1pre)) { this.runOrders(u, dt); this.moveUnit(u, dt); }
      for (const b of bs) oU.call(this, b, dt); }
    return oF.call(this, rdt); };
  const oGo = P.goAll; P.goAll = function () { if (this.w1execPlan && this.plan && this.plan.length && !this.w1inExec) return this.w1execPlan(); return oGo.call(this); };
}

export function installStack2Hud(hud) {
  const sync = () => { const g = hud.g; if (!g || g.over || g.settings.w1stack === false) return; g.w1execPlan = () => hud.executePlan();
    const plan = g.plan || []; const quiet = g.toast; g.toast = () => {}; g.w1sync = true;
    try {
      for (const b of g.breaches) if (b.w1pre && b.phase !== 'done' && !plan.some(p => p.team === b.w1team && p.door === b.door && p.method === b.method && !!p.flash === !!b.flash)) { for (const u of [...b.units]) g.finishOrderOf(u, b); b.units = []; b.phase = 'done'; }
      for (const p of plan) { if (g.breaches.some(b => b.w1pre && b.phase !== 'done' && b.w1team === p.team)) continue; if (p.door.state !== 'closed') continue;
        const ops = g.ops.filter(o => o.alive && o.team === p.team); if (!ops.length) continue; ops.forEach(o => g.clearOrders(o));
        const b = g.orderBreach(ops, p.door, p.method, p.flash, true); if (b) { b.plan = true; b.w1pre = true; b.w1team = p.team; } }
      g.breaches = g.breaches.filter(b => b.phase !== 'done');
    } finally { g.toast = quiet; g.w1sync = false; } };
  const oR = hud.renderPlan.bind(hud); hud.renderPlan = function (...a) { const r = oR(...a); sync(); return r; };
  const oE = hud.executePlan.bind(hud); hud.executePlan = function () { const g = this.g; if (!g) return oE();
    g.w1inExec = true; try {
      const plan = g.plan || []; const pre = []; const rest = [];
      for (const p of plan) { const b = g.breaches.find(x => x.w1pre && x.phase !== 'done' && x.w1team === p.team && x.door === p.door && x.units.some(u => u.alive)); if (b) pre.push(b); else rest.push(p); }
      for (const b of pre) b.w1pre = false;
      const total = pre.length + rest.filter(p => p.door.state === 'closed').length;
      const allReady = pre.every(b => b.phase === 'ready');
      if (pre.length && allReady && !rest.length) { for (const b of pre) b.wait = false; g.toast(`GO GO GO! (${pre.length} team${pre.length > 1 ? 's' : ''})`, 'good'); }
      else if (pre.length && total === 1) for (const b of pre) b.wait = false;
      g.plan = rest; oE(); if (total > 1 && !(allReady && !rest.length)) g.planSync = g.planSync || { t: 0 };
    } finally { g.w1inExec = false; } };
  hud.w1stackSync = sync;
}
