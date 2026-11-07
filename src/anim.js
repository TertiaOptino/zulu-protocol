import * as THREE from 'three';
// w3: soldier animation helpers. Rifle hold solver (stock in the shoulder pocket, anchored to the chest bone, reach-aware support hand).
// All numbers are metres in the soldier's pose space (x = soldier's left, y up, z forward) measured on the bind pose of BODY (soldier.js).
let H = null; export function w3bind(h) { H = h; }
if (typeof window !== 'undefined') window.__THREE = THREE;
// gun-space extents (grip at origin, barrel +Z): used to put the butt of the stock, not the grip, against the shoulder
export function gunBounds(gi, attr, m) {
  if (!gi) return; const v = new THREE.Vector3(); const b = gi.bb || (gi.bb = { zmin: 9, zmax: -9, ymin: 9, ymax: -9, xmin: 9, xmax: -9, bz: [] });
  for (let i = 0; i < attr.count; i++) { v.fromBufferAttribute(attr, i).applyMatrix4(m); if (v.z < b.zmin) b.zmin = v.z; if (v.z > b.zmax) b.zmax = v.z; if (v.y < b.ymin) b.ymin = v.y; if (v.y > b.ymax) b.ymax = v.y; if (v.x < b.xmin) b.xmin = v.x; if (v.x > b.xmax) b.xmax = v.x; if (v.z < -0.1) b.bz.push(v.z, v.y, v.x); }
  // butt = centroid of the rearmost 12 mm
  let sy = 0, sx = 0, n = 0; for (let i = 0; i < b.bz.length; i += 3) if (b.bz[i] < b.zmin + 0.012) { sy += b.bz[i + 1]; sx += b.bz[i + 2]; n++; } b.buttY = n ? sy / n : 0.02; b.buttX = n ? sx / n : 0; gi.zmin = b.zmin; gi.buttY = b.buttY; gi.buttX = b.buttX; gi.ymax = b.ymax; gi.ymin = b.ymin;
}
// chest-local anchors (stock butt centre) per hold: [x, y, z]
export const HOLD = {
  aim: { A: [-0.125, 0.085, 0.20], pit: 0, yaw: 0, twist: -0.30, hand: 0.03 },
  low: { A: [-0.125, 0.07, 0.20], pit: 0.62, yaw: 0.12, twist: -0.18, hand: 0.03 },
};
const q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), M3 = new THREE.Matrix4(), E = new THREE.Euler();
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), V4 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const lerp = THREE.MathUtils.lerp;
// rigid (scale-free) frame of a bone in world space
function rigid(b, out) { b.matrixWorld.decompose(p, q, s); return out.compose(p, q, s.set(1, 1, 1)); }
export function w3Hold(c) {
  const { ch, B, S, cont, gun, SP, dt, dy, toW } = c; const { ik, rotW, wpos, gripHand } = H; const gi = S.gi; const bb = gi.bb; if (!bb) return false;
  const t = S.aimK, o = SP || { gx: 0, gy: 0, gz: 0, pit: 0, yaw: 0, rol: 0 }; const Hd = HOLD.aim, Lw = HOLD.low;
  const pw = ch.pose.matrixWorld; const pinv = M3.copy(pw).invert(); const up = V4.set(0, 1, 0).transformDirection(pw).clone();
  // 1) torso: bladed stance toward the support side so both hands reach, split over spine / spine1 / chest; head squares back to the sights
  const tw = lerp(Lw.twist, Hd.twist, t) * (1 - 0.0 * t); S.w3tw = S.w3tw === undefined ? tw : lerp(S.w3tw, tw, dt === 0 ? 1 : Math.min(1, dt * 9)); const Y = S.w3tw;
  rotW(B.spine, up, Y * 0.3); rotW(B.spine1, up, Y * 0.35); rotW(B.chest, up, Y * 0.35);
  rotW(B.neck, up, -Y * 0.35); rotW(B.head, up, -Y * 0.6);
  // 2) gun frame: butt on the chest anchor, axis in pose space
  ch.root.updateMatrixWorld(true); const cm = rigid(B.chest, M);
  const ax = lerp(Lw.A[0], Hd.A[0], t) + o.gx, ay = lerp(Lw.A[1], Hd.A[1], t) + o.gy, az = lerp(Lw.A[2], Hd.A[2], t) + o.gz;
  V1.set(ax, ay, az).applyMatrix4(cm).applyMatrix4(pinv); // butt anchor in pose space
  E.set(lerp(Lw.pit, Hd.pit, t) - S.kick * 0.09 + o.pit, lerp(Lw.yaw, Hd.yaw, t) + o.yaw, o.rol, 'YXZ'); q.setFromEuler(E);
  V2.set(-bb.buttX, -bb.buttY, -bb.zmin).applyQuaternion(q); V2.add(V1); // gun origin in pose space
  M2.compose(V2, q, V3.set(1, 1, 1)); const tm2 = M2.premultiply(pw); gun.matrix.copy(cont.matrixWorld).invert().multiply(tm2); gun.updateMatrixWorld(true);
  const G = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(gun.matrixWorld);
  const gX = new THREE.Vector3().setFromMatrixColumn(gun.matrixWorld, 0).normalize(), gY = new THREE.Vector3().setFromMatrixColumn(gun.matrixWorld, 1).normalize(), gZ = new THREE.Vector3().setFromMatrixColumn(gun.matrixWorld, 2).normalize();
  // 3) right hand on the pistol grip — offset to the right face (-X) + below receiver so palm wraps the grip, not through it
  const hand = G(-0.045, -0.085, 0.02); ik(B.armR, B.foreR, B.handR, hand, toW(-0.6, 0.6 + dy, -0.4)); // Peony: off mesh fire hand
  // 4) support hand: on the outside (+X) of the handguard, under the rail (not through the tube)
  const shL = wpos(B.armL, V3.clone()), reach = (wpos(B.armL, V1.clone()).distanceTo(wpos(B.foreL, V2.clone())) + wpos(B.foreL, V1.clone()).distanceTo(wpos(B.handL, V2.clone()))) * 0.985;
  const zf = Math.min(0.2, gi.len * 0.38), zr = 0.03; let sup = null; for (let k = 0; k <= 8; k++) { const z = lerp(zf, zr, k / 8); const g = G(0.085, -0.075, z); if (g.distanceTo(shL) <= reach || k === 8) { sup = g; S.w3z = z; break; } } // Peony: off mesh support
  let lFd = gX.clone().negate().addScaledVector(gZ, 0.35).addScaledVector(gY, 0.35), lSd = gZ.clone().addScaledVector(gY, 0.15), lCurl = 0.55;
  const LH = SP && SP.A && SP.A.lh; if (LH) { const sz = S.w3z; const guard = sup; const tgt = (k) => { if (k === 'guard') return { v: guard, fd: lFd, sd: lSd, curl: lCurl }; if (k.g) return { v: G(...k.g), fd: lFd, sd: lSd, curl: 0.8 };
      const d = (x) => toW(...x).sub(toW(0, 0, 0)); return { v: toW(k.p[0], k.p[1] + dy, k.p[2]), fd: d(k.fd), sd: d(k.sd), curl: k.curl }; };
    let i = 1; while (i < LH.length - 1 && SP.u > LH[i][0]) i++; const A0 = tgt(LH[i - 1][1]), A1 = tgt(LH[i][1]); const kk = THREE.MathUtils.smoothstep((SP.u - LH[i - 1][0]) / Math.max(1e-6, LH[i][0] - LH[i - 1][0]), 0, 1);
    sup = A0.v.clone().lerp(A1.v, kk); lFd = A0.fd.clone().normalize().lerp(A1.fd.clone().normalize(), kk); lSd = A0.sd.clone().normalize().lerp(A1.sd.clone().normalize(), kk); lCurl = lerp(A0.curl, A1.curl, kk); }
  ik(B.armL, B.foreL, B.handL, sup, toW(0.55, 0.3 + dy, -0.5));
  gripHand(B.handR, S.fingR, gZ.clone().addScaledVector(gY, -0.55).addScaledVector(gX, 0.35), gY.clone().addScaledVector(gZ, 0.25).addScaledVector(gX, 0.15), 0.55, false); // wrap, no stab through receiver
  gripHand(B.handL, S.fingL, lFd, lSd, lCurl, true);
  if (window.__dbgHands) { const r = wpos(B.handL, new THREE.Vector3()).distanceTo(sup), r2 = wpos(B.handR, new THREE.Vector3()).distanceTo(hand); (window.__handErr ||= []).push([+r.toFixed(3), +r2.toFixed(3), +t.toFixed(2)]); }
  return true;
}

// ---------------------------------------------------------------------------------------------------------------------------
// w3: procedural gait. Legs are driven by foot-plant IK from a gait phase, so the stance foot moves backwards in pose space at exactly the ground speed
// (no skating at any speed), stride length / cadence follow speed, the pelvis bobs and sways on an inverted-pendulum curve, the shoulders counter-rotate.
// Blends with the clip pose (idle / stand / crouch) through S.gw, so there is no pop going in or out of a walk.
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const fr = (x) => x - Math.floor(x);
const gq = new THREE.Quaternion(), gq2 = new THREE.Quaternion(), gq3 = new THREE.Quaternion(), gv = new THREE.Vector3(), gv2 = new THREE.Vector3(), gs = new THREE.Vector3(), PX = new THREE.Vector3(1, 0, 0);
function poseQuat(pw, out) { pw.decompose(gv, out, gs); return out; }
// Movement modes the AI can set on a unit (u.mv). spd is metres per second for a unit whose base speed is 3.0 (scaled by u.speed / 3).
export const MOVE_MODES = { creep: { spd: 1.0, crouch: 1 }, walk: { spd: 1.6 }, jog: { spd: 2.8 }, sprint: { spd: 4.4 } };
export function moveSpeed(u) { const m = u && MOVE_MODES[u.mv]; return m ? m.spd * ((u.speed || 3) / 3) : 0; }
// Suggested mode: opts { dist (to goal, m), contact (enemy known / shooting), nearDoor, clear (no threat in sight), stealth, hurt }
export function pickMove(o = {}) { if (o.stealth || o.nearDoor) return o.contact ? 'creep' : 'walk'; if (o.contact) return o.dist < 6 ? 'creep' : 'walk'; if (o.hurt) return 'walk'; if (o.clear && o.dist > 14) return 'sprint'; return o.dist > 5 ? 'jog' : 'walk'; }
if (typeof window !== 'undefined') window.ZuluMove = { MOVE_MODES, moveSpeed, pickMove };
export function w3GaitInit({ ch, B, S }) {
  if (S.g || !B.thighL || !B.footL || !B.hips) return; ch.root.updateMatrixWorld(true);
  const pw = ch.pose.matrixWorld, pinv = new THREE.Matrix4().copy(pw).invert(); const P = (b) => new THREE.Vector3().setFromMatrixPosition(b.matrixWorld).applyMatrix4(pinv);
  const pq = poseQuat(pw, new THREE.Quaternion()).clone(); const g = { pq };
  for (const sd of ['L', 'R']) { const th = P(B['thigh' + sd]), sh = P(B['shin' + sd]), ft = P(B['foot' + sd]); g[sd] = { th, ft, l1: th.distanceTo(sh), l2: sh.distanceTo(ft), fq: pq.clone().invert().multiply(B['foot' + sd].matrixWorld.decompose(gv, gq, gs) || gq).clone() }; }
  const hp = P(B.hips); g.hy = hp.y; g.hipOff = hp.y - (g.L.th.y + g.R.th.y) / 2; g.L.fq = pq.clone().invert().multiply(rigidQ(B.footL)); g.R.fq = pq.clone().invert().multiply(rigidQ(B.footR));
  { const tb = B.footL.children[0] && B.footR.children[0] ? (P(B.footL.children[0]).z - g.L.ft.z + P(B.footR.children[0]).z - g.R.ft.z) / 2 : 0.1; g.tz = Math.max(0.1, tb + 0.06); g.hz = 0.07; g.ah = Math.max(0.05, (g.L.ft.y + g.R.ft.y) / 2); }
  g.legLen = (g.L.l1 + g.L.l2 + g.R.l1 + g.R.l2) / 2; S.g = g; S.gw = 0; S.gph = 0; S.gdx = 0; S.gdz = 1; S.vx = 0; S.vz = 0;
  if (typeof window !== 'undefined') window.__w3gait = g;
}
function rigidQ(b) { const q0 = new THREE.Quaternion(); b.matrixWorld.decompose(gv, q0, gs); return q0; }

// batch6: static tactical stance for idle / stand / crouch / aim (feet ~0.20 m out from bind = ~0.40 m apart)
export function w3IdleStance(c) {
  const { ch, B, S } = c; const g = S.g; if (!g || !H) return; const { ik, wpos } = H;
  ch.root.updateMatrixWorld(true);
  const pw = ch.pose.matrixWorld; M3.copy(pw).invert();
  const fromP = (x, y, z, o) => o.set(x, y, z).applyMatrix4(pw);
  const HALF = 0.22; // shoulder-width+ tactical stance (~0.44 m apart)
  // crouch: two-leg tactical squat — hips down, knees bent, feet still apart
  const cr = Math.max(S.cr || 0, S.kneelK || 0, (S.w && S.w.crouch) || 0);
  if (cr > 0.01 && B.hips) {
    const hp = new THREE.Vector3().setFromMatrixPosition(B.hips.matrixWorld).applyMatrix4(M3);
    const drop = 0.28 * cr;
    fromP(hp.x, hp.y - drop, hp.z - 0.04 * cr, gv2);
    B.hips.position.copy(B.hips.parent.worldToLocal(gv2.clone()));
    B.hips.updateMatrixWorld(true);
    ch.root.updateMatrixWorld(true);
  }
  for (const sd of ['L', 'R']) {
    const ft = g[sd].ft; const side = sd === 'L' ? -1 : 1;
    const fy = ft.y; // plant on ground; bent knees come from lowered hips
    fromP(ft.x + side * HALF, fy, ft.z, gv);
    const A0 = wpos(B['thigh' + sd], new THREE.Vector3());
    const kneeDir = new THREE.Vector3(0.08 * (sd === 'L' ? 1 : -1), 0.4, 1).transformDirection(pw);
    ik(B['thigh' + sd], B['shin' + sd], B['foot' + sd], gv.clone(), A0.add(kneeDir.multiplyScalar(2)));
  }
}
export function w3Gait(c) {
  const { ch, B, S, dt, moving, spd } = c; const mvm = MOVE_MODES[c.mv]; const crT = mvm && mvm.crouch ? 1 : 0; S.cr = S.cr === undefined ? crT : lerp(S.cr, crT, Math.min(1, dt * 5)); const cr = S.cr; const g = S.g; if (!g) return; const { ik, rotW, wpos } = H;
  ch.root.updateMatrixWorld(true); // the mixer / restore just rewrote local transforms
  const target = moving ? 1 : 0; S.gw = dt === 0 ? target : lerp(S.gw, target, Math.min(1, dt * (target ? 9 : 7))); const w = S.gw;
  // batch6: idle/stand/crouch/aim — always push tactical stance when not fully in gait
  if (w < 0.15) { if (w < 0.01) S.gw = 0; if (!window.__w3off) w3IdleStance(c); if (w < 0.01) return; }
  const run01 = sm((spd - 1.9) / 1.3), sp01 = sm((spd - 3.3) / 1.3), v = Math.max(spd, 0.35), step = Math.min(1.0 + 0.3 * sp01, 0.36 + 0.24 * v - 0.06 * run01 + 0.08 * sp01) * (1 - 0.18 * cr), ds = lerp(lerp(0.62, 0.42, run01), 0.37, sp01), s = 2 * ds * step;
  S.gph = fr(S.gph + dt * v / (2 * step));
  // travel direction in pose space (feet keep planting along the real direction of travel)
  let dx = S.gdx, dz = S.gdz; if (S.vx !== undefined) { const l = Math.hypot(S.vx, S.vz); if (l > 0.2) { dx = S.vx / l; dz = S.vz / l; } } S.gdx = lerp(S.gdx, dx, Math.min(1, dt * 6)); S.gdz = lerp(S.gdz, dz, Math.min(1, dt * 6)); const dl = Math.hypot(S.gdx, S.gdz) || 1, ux = S.gdx / dl, uz = S.gdz / dl;
  const pw = ch.pose.matrixWorld, pinv = M3.copy(pw).invert(); const toP = (b, o) => o.setFromMatrixPosition(b.matrixWorld).applyMatrix4(pinv); const fromP = (x, y, z, o) => o.set(x, y, z).applyMatrix4(pw);
  const up = new THREE.Vector3(0, 1, 0).transformDirection(pw).clone(), side = new THREE.Vector3(1, 0, 0).transformDirection(pw).clone();
  const cur = { L: toP(B.footL, new THREE.Vector3()), R: toP(B.footR, new THREE.Vector3()) }; const hp = toP(B.hips, new THREE.Vector3());
  // foot targets along travel axis (z' = along travel)
  const Lmax = g.legLen * 0.985, Lmid = g.legLen * (0.955 - 0.012 * run01 - 0.02 * sp01 - 0.15 * cr); const feet = {}; const ph = { R: S.gph, L: fr(S.gph + 0.5) };
  let xs = 0; // furthest stance foot for the pelvis height
  for (const sd of ['R', 'L']) { const u = ph[sd]; let z, lift = 0; if (u < ds) z = 0.5 * s - s * (u / ds); else { const vv = (u - ds) / (1 - ds), m = -2 * (1 - ds) * step, h00 = 2 * vv ** 3 - 3 * vv ** 2 + 1, h10 = vv ** 3 - 2 * vv ** 2 + vv, h01 = -2 * vv ** 3 + 3 * vv ** 2, h11 = vv ** 3 - vv ** 2; z = h00 * (-0.5 * s) + h10 * m + h01 * (0.5 * s) + h11 * m; lift = (0.05 + 0.1 * run01 + 0.07 * sp01 - 0.02 * cr) * Math.pow(Math.sin(Math.PI * vv), 0.8); if (vv > 0.85) lift *= 1; }
    let th = 0, dz = 0, dy = 0; const tz = g.tz, hz = g.hz, ah = g.ah, uh = 0.16 * ds, ut = 0.62 * ds, TH = -0.3, TT = 0.45;
      const heelOff = (t) => [hz * (Math.cos(t) - 1) + ah * Math.sin(t), -hz * Math.sin(t) + ah * Math.cos(t) - ah], toeOff = (t) => [tz * (1 - Math.cos(t)) + ah * Math.sin(t), tz * Math.sin(t) + ah * (Math.cos(t) - 1)];
      if (u < ds) { if (u < uh) { th = TH * (1 - sm(u / uh)); [dz, dy] = heelOff(th); } else if (u > ut) { th = TT * sm((u - ut) / (ds - ut)); [dz, dy] = toeOff(th); } th *= 1 - 0.5 * cr; }
      else { const vv = (u - ds) / (1 - ds), k = sm(vv); th = lerp(TT, TH, k) * (1 - 0.5 * cr); const a = toeOff(TT), b = heelOff(TH); dz = lerp(a[0], b[0], k); dy = lerp(a[1], b[1], k); }
      z += dz * (1 - 0.5 * cr); lift += dy * (1 - 0.5 * cr);
      feet[sd] = { z, lift, u, stance: u < ds, th }; if (u < ds) xs = Math.max(xs, Math.abs(z)); }
  const A = 0.03 + 0.025 * run01 + 0.01 * sp01 - 0.012 * cr; const bob = 0.5 + 0.5 * Math.cos(4 * Math.PI * S.gph); // 1 at double support (lowest), 0 at mid-stance
  const hj = g.L.ft.y + Lmid - A * bob; // hip joint height
  const sway = 0.018 * Math.cos(2 * Math.PI * S.gph - Math.PI / 2) * (1 - 0.5 * run01); // pelvis shifts toward the stance leg
  const yaw = (0.07 + 0.05 * run01) * Math.cos(2 * Math.PI * S.gph), roll = 0.035 * Math.cos(2 * Math.PI * S.gph - Math.PI / 2) * (1 - 0.5 * run01);
  // pelvis: rotate, then place
  const X = (typeof window !== 'undefined' && window.__w3x) || {};
  if (!X.hr) { rotW(B.hips, up, yaw * w); rotW(B.hips, new THREE.Vector3(0, 0, 1).transformDirection(pw).clone(), roll * w); }
  if (!X.ln) {
  const lean = (0.035 + 0.12 * run01 + 0.1 * sp01 + 0.2 * cr) * w; rotW(B.spine, side, lean * 0.4); rotW(B.spine1, side, lean * 0.35); rotW(B.chest, side, lean * 0.25); }
  if (!X.cn) {
  const kc = 0.7; rotW(B.spine, up, -yaw * w * 0.25 * kc * 1.5); rotW(B.spine1, up, -yaw * w * 0.25 * kc * 1.5); rotW(B.chest, up, -yaw * w * 0.2 * kc * 1.5); rotW(B.neck, up, -yaw * w * 0.1); }
  if (!X.hp) { const hpt = new THREE.Vector3(lerp(hp.x, g.L.th.x * 0 + hp.x + sway, w), lerp(hp.y, hj + g.hipOff, w), hp.z); fromP(hpt.x, hpt.y, hpt.z, gv2); B.hips.position.copy(B.hips.parent.worldToLocal(gv2)); } ch.root.updateMatrixWorld(true);
  const hipJoint = (sd) => toP(B['thigh' + sd], new THREE.Vector3());
  if (!X.lg) for (const sd of ['R', 'L']) {
    const f = feet[sd], hjn = hipJoint(sd); const gx = g[sd].ft.x + (sd === 'L' ? -1 : 1) * 0.22, gz = g[sd].ft.z; // batch6: shoulder-width+ tactical stance (~0.44 m apart)
    const px = gx + ux * f.z, pz = gz + uz * f.z; let py = g[sd].ft.y + f.lift;
    // vertical reach: if the leg can't reach the ground at this stride, the heel / toe rolls up instead of the leg stretching
    const dh = Math.hypot(px - hjn.x, pz - hjn.z), maxDy = Math.sqrt(Math.max(0, Lmax * Lmax - dh * dh)), need = hjn.y - py; let raise = 0; if (need > maxDy) { raise = need - maxDy; py += raise; }
    const toe = f.z < 0 ? 1 : -1; // behind the hip -> toe-down (heel up); ahead -> toe-up
    const pitch = THREE.MathUtils.clamp(toe * Math.asin(Math.min(1, raise / (toe > 0 ? 0.2 : 0.14))) + f.th, -0.8, 0.8);
    const tgt = new THREE.Vector3(lerp(cur[sd].x, px, w), lerp(cur[sd].y, py, w), lerp(cur[sd].z, pz, w)); fromP(tgt.x, tgt.y, tgt.z, gv); const kneeDir = new THREE.Vector3(0.05 * (sd === 'L' ? 1 : -1), 0.4, 1).transformDirection(pw); const A0 = wpos(B['thigh' + sd], new THREE.Vector3());
    ik(B['thigh' + sd], B['shin' + sd], B['foot' + sd], gv.clone(), A0.add(kneeDir.multiplyScalar(2)));
    // foot: flat to the ground (pose-relative) plus pitch
    poseQuat(pw, gq); gq2.setFromAxisAngle(PX, pitch * w); const want = gq.clone().multiply(gq2).multiply(g[sd].fq); const cq = rigidQ(B['foot' + sd]); const fq = cq.clone().slerp(want, w);
    rigidQ(B['shin' + sd]); B['shin' + sd].matrixWorld.decompose(gv2, gq3, gs); B['foot' + sd].quaternion.copy(gq3.invert().multiply(fq)); B['foot' + sd].updateMatrixWorld(true);
  }
  S.gdbg = { ph: S.gph, step, s, ds, hj };
}
