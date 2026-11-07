import * as THREE from 'three';
import { P } from './gear.js';
// Procedural headgear: shells with real cut profiles (FAST high-cut, MICH, police PASGT, Altyn), visors, masks, hats.
// All geometry is built in bind-pose metres (same space as gearParts) and cached.
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
// rim polar angle (fraction of PI from the crown) at azimuth a = |theta|/PI (0 front, 1 back)
const PROF = {
  fast: (a) => mix(mix(0.49, 0.6, sm(0.64, 0.86, a)), 0.395, sm(0.27, 0.37, a) * (1 - sm(0.6, 0.68, a))),
  mich: (a) => { let p = mix(0.5, 0.6, sm(0.14, 0.32, a)); p = mix(p, 0.55, sm(0.36, 0.42, a) * (1 - sm(0.56, 0.62, a))); return mix(p, 0.63, sm(0.68, 0.95, a)); },
  police: (a) => mix(mix(0.47, 0.63, sm(0.12, 0.35, a)), 0.67, sm(0.6, 0.95, a)),
  altyn: (a) => mix(mix(0.42, 0.66, sm(0.2, 0.33, a)), 0.69, sm(0.6, 0.95, a)),
};
export const SHELLS = {
  fast: { C: [0, 1.698, 0.006], R: [0.113, 0.118, 0.13], th: 0.075, flare: 0 },
  mich: { C: [0, 1.696, 0.004], R: [0.117, 0.12, 0.133], th: 0.075, flare: 0.008 },
  police: { C: [0, 1.69, 0.002], R: [0.122, 0.122, 0.138], th: 0.07, flare: 0.035 },
  altyn: { C: [0, 1.685, 0.0], R: [0.122, 0.125, 0.135], th: 0.08, flare: 0.02 },
};
const cache = {};
const memo = (k, f) => (cache[k] = cache[k] || f());
function ell(S, th, ph, s = 1) { // point + outward normal on the ellipsoid
  const [cx, cy, cz] = S.C, [rx, ry, rz] = S.R; const ux = Math.sin(ph) * Math.sin(th), uy = Math.cos(ph), uz = Math.sin(ph) * Math.cos(th);
  const p = new THREE.Vector3(cx + rx * s * ux, cy + ry * s * uy, cz + rz * s * uz); const n = new THREE.Vector3(ux / rx, uy / ry, uz / rz).normalize(); return { p, n };
}
// closed shell between theta range / phi range given by fn(theta)->[ph0, ph1]; thickness th (fraction), flare near the lower rim
function sector(S, NT, NP, wrap, thRange, phFn, th, flare = 0) {
  const pos = [], idx = []; const cols = wrap ? NT : NT + 1; const rows = NP + 1;
  const thAt = (i) => (wrap ? -Math.PI + (2 * Math.PI * i) / NT : thRange[0] + ((thRange[1] - thRange[0]) * i) / NT);
  const put = (i, j, s) => { const t = thAt(i), [a, b] = phFn(t), f = j / NP, ph = mix(a, b, f), fl = flare * Math.pow(f, 6); const { p } = ell(S, t, ph, s + fl); pos.push(p.x, p.y, p.z); };
  for (const s of [1, 1 - th]) for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) put(i, j, s);
  const L = cols * rows, id = (l, i, j) => l * L + j * cols + (wrap ? i % cols : i);
  const ci = wrap ? NT : NT;
  for (let j = 0; j < NP; j++) for (let i = 0; i < ci; i++) {
    const a = id(0, i, j), b = id(0, i, j + 1), c = id(0, i + 1, j), d = id(0, i + 1, j + 1); idx.push(a, b, c, c, b, d);
    const a2 = id(1, i, j), b2 = id(1, i, j + 1), c2 = id(1, i + 1, j), d2 = id(1, i + 1, j + 1); idx.push(a2, c2, b2, c2, d2, b2);
  }
  // edge strips (separate verts -> hard edges)
  const strip = (pairs) => { const base = pos.length / 3; for (const [o, n] of pairs) { pos.push(pos[o * 3], pos[o * 3 + 1], pos[o * 3 + 2], pos[n * 3], pos[n * 3 + 1], pos[n * 3 + 2]); }
    for (let k = 0; k < pairs.length - 1; k++) { const o0 = base + k * 2, n0 = o0 + 1, o1 = o0 + 2, n1 = o0 + 3; idx.push(o0, n0, o1, o1, n0, n1); } };
  const lower = []; for (let i = 0; i <= ci; i++) lower.push([id(0, i, NP), id(1, i, NP)]); strip(lower);
  if (!wrap) { // close the other three edges
    const upper = []; for (let i = ci; i >= 0; i--) upper.push([id(0, i, 0), id(1, i, 0)]); strip(upper);
    const s0 = []; for (let j = NP; j >= 0; j--) s0.push([id(0, 0, j), id(1, 0, j)]); strip(s0);
    const s1 = []; for (let j = 0; j <= NP; j++) s1.push([id(0, ci, j), id(1, ci, j)]); strip(s1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const shellGeo = (k) => memo('shell' + k, () => { const S = SHELLS[k]; return sector(S, 72, 16, true, null, (t) => [0, PROF[k](Math.abs(t) / Math.PI) * Math.PI], S.th, S.flare); });
const tube = (pts, r, closed, key) => memo(key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), pts.length * 3, r, 5, closed));
const rimPts = (S, k, s, a0 = -1, a1 = 1, n = 64, dph = 0) => { const pts = []; for (let i = 0; i < (a0 === -1 && a1 === 1 ? n : n + 1); i++) { const t = Math.PI * (a0 + ((a1 - a0) * i) / n); pts.push(ell(S, t, PROF[k](Math.abs(t) / Math.PI) * Math.PI - dph, s).p); } return pts; };
function basis(p, n, roll = 0) { const t = new THREE.Vector3(0, 1, 0).cross(n); if (t.lengthSq() < 1e-6) t.set(1, 0, 0); t.normalize(); const b = new THREE.Vector3().crossVectors(n, t); const m = new THREE.Matrix4().makeBasis(t, b, n); if (roll) m.multiply(new THREE.Matrix4().makeRotationZ(roll)); return m.setPosition(p); }
function strap(H, a, b, w, d, col, o) { const dir = b.clone().sub(a), len = dir.length(); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); H.frame(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), () => H.sharp(0, 0, 0, w, len, d, col, o)); }
// thin elliptical strap ring (TubeGeometry), tilted about X
const ring = (H, cx, cy, cz, rx, rz, tilt, r, col, o) => H.add(memo(`ring${rx},${rz},${r}`, () => { const pts = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(a) * rx, 0, Math.cos(a) * rz)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, r, 5, true); }), cx, cy, cz, 1, 1, 1, col, { rx: tilt, ...o });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const shade = (c, k) => { if (typeof c !== 'number') return c; const C = new THREE.Color(c).multiplyScalar(k); return C.getHex(); };

// face-front masks: sector of an ellipsoid around the face
const MASK = { C: [0, 1.618, 0.034], R: [0.089, 0.088, 0.122] };
const FACE = { C: [0, 1.66, 0.012], R: [0.1, 0.11, 0.128] };

export function buildHeadgear(H, look, st, k) {
  const { DK, cm, helmC, pc, eyeY: ey } = k; const hard = { r: 0.42, mt: 0.08 };
  const helm = look.helm === 'highcut' ? 'fast' : look.helm; const hasHelm = !!SHELLS[helm];
  const covered = helmC === 'camo'; const shellO = covered ? { r: 0.88, kind: 2 } : helm === 'police' ? { r: 0.3, mt: 0.12 } : { r: 0.5, mt: 0.05 };
  const op = st.kind === 'op' || st.kind === 'enemy';
  const velC = covered ? shade(look.vestCol ?? 0x5a5e44, 0.85) : shade(helmC, 0.78);
  if (hasHelm) {
    const S = SHELLS[helm];
    H.add(shellGeo(helm), 0, 0, 0, 1, 1, 1, helmC, shellO);
    H.add(tube(rimPts(S, helm, 1 - S.th / 2 + S.flare), 0.0055, true, 'trim' + helm), 0, 0, 0, 1, 1, 1, 0x161718, { r: 0.75 }); // rubber edge trim
    const patch = (th, ph, w, h, col, o = { r: 0.95 }, d = 0.004, roll = 0) => { const { p, n } = ell(S, th, ph, 1); H.frame(basis(p, n, roll), () => H.box(0, 0, d / 2, w, h, d, col, o)); };
    if (helm === 'fast' || helm === 'mich') {
      if (helm === 'fast') for (const s of [-1, 1]) H.add(tube(rimPts(S, 'fast', 1.04, s > 0 ? 0.24 : -0.62, s > 0 ? 0.62 : -0.24, 14, 0.06), 0.0062, false, 'rail' + s), 0, 0, 0, 1, 1, 1, 0x2a2b2c, { r: 0.55, mt: 0.1 }); // ARC side rails
      patch(0, 0.13 * Math.PI, 0.075, 0.05, velC); patch(Math.PI, 0.28 * Math.PI, 0.07, 0.04, velC); // crown + rear Velcro
      for (const s of [-1, 1]) patch(s * 0.5 * Math.PI, 0.24 * Math.PI, 0.055, 0.04, velC);
      patch(Math.PI * 0.92, 0.2 * Math.PI, 0.018, 0.018, 0x3a3e30, { r: 0.4 }, 0.012); // IR strobe
      if (helm === 'mich') { H.add(tube(rimPts(S, 'mich', 1.012, -1, 1, 64, 0.2 * Math.PI), 0.0045, true, 'band'), 0, 0, 0, 1, 1, 1, 0x2e3226, { r: 0.9 }); for (const s of [-1, 1]) patch(Math.PI + s * 0.12, 0.36 * Math.PI, 0.012, 0.008, 0x8a8a60, { r: 0.3, mt: 0.3 }, 0.003); }
      // counterweight pouch
      { const { p, n } = ell(S, Math.PI, 0.5 * Math.PI, 1); H.frame(basis(p, n), () => H.box(0, 0, 0.016, 0.075, 0.05, 0.032, look.vestCol ?? DK, { r: 0.85 })); }
      // NVG shroud + mount
      { const { p, n } = ell(S, 0, 0.36 * Math.PI, 1); H.frame(basis(p, n), () => { H.box(0, -0.004, 0.005, 0.055, 0.04, 0.01, 0x1e1f21, hard); if (look.nvg) { H.box(0, 0.006, 0.022, 0.05, 0.028, 0.03, 0x26282a, hard); for (const s of [-1, 1]) { H.cyl(s * 0.027, 0.03, 0.04, 0.016, 0.07, 0x1e2022, { rx: -0.35, r: 0.4, mt: 0.3 }); H.cyl(s * 0.027, 0.044, 0.075, 0.013, 0.006, 0x3a5a40, { rx: -0.35, r: 0.1, mt: 0.6 }); } } }); }
    } else if (helm === 'police') {
      patch(Math.PI, 0.4 * Math.PI, 0.09, 0.03, 0xd8d8d0, { r: 0.6 }, 0.002); // rear ID strip
      for (const s of [-1, 1]) { const { p, n } = ell(S, s * 0.5 * Math.PI, 0.5 * Math.PI, 1); H.frame(basis(p, n), () => H.cyl(0, 0, 0.006, 0.013, 0.012, 0x2a2c2e, { rx: Math.PI / 2, r: 0.4, mt: 0.5 })); }
      if (look.visor) { const VS = { C: [0, 1.69, 0.03], R: [0.132, 0.132, 0.14] };
        H.add(memo('visor', () => sector(VS, 30, 10, false, [-0.47 * Math.PI, 0.47 * Math.PI], (t) => [0.47 * Math.PI, (0.8 - 0.06 * Math.pow(Math.abs(t) / (0.47 * Math.PI), 2)) * Math.PI], 0.04)), 0, 0, 0, 1, 1, 1, 0x2c3740, { r: 0.06, mt: 0.55 });
        H.add(tube(Array.from({ length: 21 }, (_, i) => ell(VS, (-0.47 + 0.94 * i / 20) * Math.PI, 0.47 * Math.PI, 1.0).p), 0.006, false, 'visorTop'), 0, 0, 0, 1, 1, 1, 0x1a1b1c, { r: 0.6 }); }
    } else if (helm === 'altyn') {
      for (const s of [-1, 1]) { const { p, n } = ell(S, s * 0.5 * Math.PI, 0.56 * Math.PI, 1); H.frame(basis(p, n), () => H.add(P.sph, 0, 0, -0.008, 0.042, 0.05, 0.026, helmC, { ...shellO, ...cm(helmC) })); }
      const VS = { C: [0, 1.685, 0.012], R: [0.134, 0.137, 0.142] }; const up = look.visor ? 0 : -0.95;
      const rot = new THREE.Matrix4().makeTranslation(0, 1.685, 0.012).multiply(new THREE.Matrix4().makeRotationX(up)).multiply(new THREE.Matrix4().makeTranslation(0, -1.685, -0.012));
      H.frame(rot, () => { H.add(memo('altynV', () => sector(VS, 24, 10, false, [-0.36 * Math.PI, 0.36 * Math.PI], () => [0.4 * Math.PI, 0.7 * Math.PI], 0.09)), 0, 0, 0, 1, 1, 1, helmC, { ...shellO, ...cm(helmC) });
        const { p, n } = ell(VS, 0, 0.485 * Math.PI, 1); H.frame(basis(p, n), () => H.sharp(0, 0, 0.001, 0.12, 0.022, 0.006, 0x0c0d0e, { r: 0.1, mt: 0.6 })); });
      for (const s of [-1, 1]) H.cyl(s * 0.128, 1.685, 0.012, 0.016, 0.012, 0x3a3a38, { rz: Math.PI / 2, r: 0.4, mt: 0.6 });
    }
    // chinstrap (+ buckle)
    for (const s of [-1, 1]) { const top = helm === 'fast' ? V3(s * 0.1, 1.7, 0.035) : V3(s * 0.104, 1.66, 0.03), buck = V3(s * 0.07, 1.565, 0.05);
      strap(H, top, buck, 0.014, 0.003, 0x1c1d1e, { r: 0.9 }); strap(H, V3(s * 0.1, 1.69, -0.06), buck, 0.012, 0.003, 0x1c1d1e, { r: 0.9 }); }
    strap(H, V3(-0.07, 1.565, 0.05), V3(0, 1.546, 0.085), 0.016, 0.004, 0x1c1d1e, { r: 0.9 }); strap(H, V3(0.07, 1.565, 0.05), V3(0, 1.546, 0.085), 0.016, 0.004, 0x1c1d1e, { r: 0.9 });
    // ear-pro headset (Comtac-style) with ARC adaptors on the FAST rails; mic boom for operators
    if (op && helm !== 'altyn') { const hc = col2(look.headsetCol, covered ? 0x5a5446 : 0x24262a);
      for (const s of [-1, 1]) { H.add(P.cyl, s * 0.1, 1.642, 0.005, 0.04, 0.026, 0.047, hc, { rz: Math.PI / 2, r: 0.55 }); H.add(P.cyl, s * 0.113, 1.642, 0.005, 0.03, 0.01, 0.036, shade(hc, 0.7), { rz: Math.PI / 2, r: 0.6 });
        if (helm === 'fast') H.sharp(s * 0.105, 1.69, 0.004, 0.012, 0.06, 0.018, 0x1e1f20, { r: 0.6 }); }
      H.cyl(0.098, 1.612, 0.06, 0.004, 0.09, 0x151515, { rx: 1.05, rz: 0.55, r: 0.5 }); H.add(P.sph, 0.055, 1.58, 0.102, 0.009, 0.009, 0.012, 0x151515, { r: 0.9 }); }
  }
  // ---- masks ----
  const mask = look.mask;
  if (mask === 'gas') { const mc = col2(look.maskCol, 0x1d1f21);
    H.add(memo('gasmask', () => sector(MASK, 28, 12, false, [-0.56 * Math.PI, 0.56 * Math.PI], (t) => [(0.2 + 0.05 * Math.abs(t)) * Math.PI, 0.88 * Math.PI], 0.06)), 0, 0, 0, 1, 1, 1, mc, { r: 0.55 });
    for (const s of [-1, 1]) { const { p, n } = ell(MASK, s * 0.15 * Math.PI, 0.34 * Math.PI, 1); H.frame(basis(p, n), () => { H.cyl(0, 0, 0.004, 0.028, 0.012, 0x111213, { rx: Math.PI / 2, r: 0.5 }); H.cyl(0, 0, 0.0105, 0.023, 0.002, 0x3b4c58, { rx: Math.PI / 2, r: 0.04, mt: 0.6 }); }); }
    { const { p, n } = ell(MASK, 0, 0.64 * Math.PI, 1); H.frame(basis(p, n), () => { H.cyl(0, 0, 0.01, 0.021, 0.024, 0x181a1b, { rx: Math.PI / 2, r: 0.5 }); H.cyl(0, 0, 0.023, 0.016, 0.004, 0x2c2e30, { rx: Math.PI / 2, r: 0.4, mt: 0.4 }); }); }
    { const { p, n } = ell(MASK, 0.3 * Math.PI, 0.68 * Math.PI, 1); H.frame(basis(p, n), () => { H.cyl(0, 0, 0.018, 0.034, 0.036, col2(look.canCol, 0x2c2f2a), { rx: Math.PI / 2, r: 0.45, mt: 0.2 }); H.cyl(0, 0, 0.037, 0.028, 0.004, 0x151617, { rx: Math.PI / 2, r: 0.6 }); }); }
    for (const yy of [1.7, 1.63]) ring(H, 0, yy, 0.0, 0.099, 0.114, yy > 1.65 ? 0.25 : -0.05, 0.005, 0x141414, { r: 0.8 });
  } else if (mask === 'ball') { const mc = col2(look.maskCol, 0x2a2f37);
    H.add(memo('ballmask', () => sector({ C: [0, 1.622, 0.03], R: [0.092, 0.096, 0.126] }, 28, 12, false, [-0.47 * Math.PI, 0.47 * Math.PI], (t) => [0.22 * Math.PI, (0.86 - 0.08 * Math.pow(Math.abs(t) / 1.5, 2)) * Math.PI], 0.07)), 0, 0, 0, 1, 1, 1, mc, { r: 0.32, mt: 0.15 });
    const BM = { C: [0, 1.622, 0.03], R: [0.092, 0.096, 0.126] };
    for (const s of [-1, 1]) { const { p, n } = ell(BM, s * 0.14 * Math.PI, 0.38 * Math.PI, 1); H.frame(basis(p, n, -s * 0.12), () => H.box(0, 0, 0.001, 0.046, 0.017, 0.006, 0x0a0b0c, { r: 0.08, mt: 0.6 })); }
    { const { p, n } = ell(BM, 0, 0.5 * Math.PI, 1); H.frame(basis(p, n), () => H.box(0, 0, 0.003, 0.016, 0.05, 0.008, mc, { r: 0.32, mt: 0.15 })); }
    for (let i = -2; i <= 2; i++) { const { p, n } = ell(BM, i * 0.05 * Math.PI, 0.7 * Math.PI, 1); H.frame(basis(p, n), () => H.sharp(0, 0, 0.001, 0.008, 0.016, 0.004, 0x0d0e0f, { r: 0.6 })); }
    for (const s of [-1, 1]) strap(H, V3(s * 0.088, 1.64, 0.05), V3(s * 0.104, 1.69, -0.01), 0.012, 0.004, 0x151515, { r: 0.9 });
  }
  // ---- goggles: on eyes (police/fast/none) or parked on a MICH helmet ----
  if (look.face === 'goggles') { const onHelm = helm === 'mich';
    const GS = onHelm ? { C: [0, 1.73, 0.004], R: [0.122, 0.07, 0.138] } : { C: [0, ey + 0.002, 0.012], R: [0.098, 0.05, 0.128] };
    H.add(memo('gog' + onHelm, () => sector(GS, 22, 4, false, [-0.36 * Math.PI, 0.36 * Math.PI], () => [0.42 * Math.PI, 0.58 * Math.PI], 0.14)), 0, 0, 0, 1, 1, 1, 0x1a1b1c, { r: 0.7 });
    H.add(memo('gogL' + onHelm, () => sector({ C: GS.C, R: GS.R.map((r) => r * 1.02) }, 20, 3, false, [-0.31 * Math.PI, 0.31 * Math.PI], () => [0.445 * Math.PI, 0.555 * Math.PI], 0.03)), 0, 0, 0, 1, 1, 1, 0x4a4030, { r: 0.05, mt: 0.7 });
    ring(H, 0, GS.C[1], GS.C[2] - 0.004, GS.R[0] * 1.01, GS.R[2] * 0.97, 0, 0.006, 0x2a2b26, { r: 0.9 });
  }
  if (look.face === 'shades') { for (const s of [-1, 1]) H.box(s * 0.032, ey + 0.002, 0.119, 0.05, 0.022, 0.008, 0x0e0f10, { r: 0.08, mt: 0.7 }); H.sharp(0, ey + 0.012, 0.117, 0.13, 0.005, 0.006, 0x222222, hard); }
  if (look.face === 'shemagh') H.add(P.torus, 0, 1.557, 0.03, 0.085, 0.09, 0.6, col2(look.faceCol, 0x6a6448), { rx: Math.PI / 2 + 0.25, r: 1 });
  // ---- hats ----
  if (!hasHelm && look.hat) { const hatC = look.hatCol === 'camo' ? 'camo' : col2(look.hatCol, 0x2e3134), ho = { r: 0.95, ...cm(hatC) };
    if (look.hat === 'beret') {
      ring(H, 0, 1.728, 0.01, 0.096, 0.114, 0.1, 0.006, 0x1a1715, { r: 0.7 }); // leather band
      H.add(P.sph, -0.012, 1.765, 0.004, 0.118, 0.04, 0.122, hatC, { rz: 0.24, rx: -0.04, ...ho });
      H.add(P.sph, -0.075, 1.735, 0.0, 0.06, 0.04, 0.1, hatC, { rz: 0.75, ...ho }); // drape over the right ear
      H.add(P.sph, 0.03, 1.742, 0.06, 0.06, 0.032, 0.06, hatC, { rz: 0.1, ...ho }); // stiffened badge panel
      H.frame(basis(V3(0.04, 1.738, 0.112), V3(0.25, 0.25, 0.93).normalize()), () => { H.sharp(0, 0, 0.002, 0.024, 0.03, 0.004, 0xc9a24c, { r: 0.3, mt: 0.85 }); H.sharp(0, 0.002, 0.0045, 0.012, 0.016, 0.002, 0x7a1c1c, { r: 0.5 }); });
    } else if (look.hat === 'boonie') {
      H.add(memo('boonieC', () => new THREE.LatheGeometry([V3(0.106, 0.0, 0), V3(0.1, 0.05, 0), V3(0.08, 0.066, 0), V3(0.0, 0.07, 0)], 20)), 0, 1.71, 0.012, 1, 1, 1.1, hatC, ho);
      H.add(memo('boonieB', () => new THREE.LatheGeometry([V3(0.104, 0.0, 0), V3(0.135, -0.008, 0), V3(0.165, -0.022, 0), V3(0.172, -0.03, 0), V3(0.169, -0.032, 0), V3(0.133, -0.012, 0), V3(0.103, -0.003, 0)], 24)), 0, 1.71, 0.012, 1, 1, 1.07, hatC, ho);
      ring(H, 0, 1.722, 0.012, 0.107, 0.118, 0, 0.009, hatC === 'camo' ? 'camo' : shade(hatC, 0.8), { r: 0.95, ...cm(hatC) });
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; H.sharp(Math.sin(a) * 0.109, 1.722, 0.012 + Math.cos(a) * 0.119, 0.012, 0.022, 0.006, 0x3a3a2c, { ry: a, r: 0.95 }); }
      strap(H, V3(-0.1, 1.71, 0.0), V3(0, 1.545, 0.075), 0.004, 0.004, 0x2a2a22, { r: 0.9 }); strap(H, V3(0.1, 1.71, 0.0), V3(0, 1.545, 0.075), 0.004, 0.004, 0x2a2a22, { r: 0.9 });
    } else if (look.hat === 'cap') {
      H.add(P.domeLow, 0, 1.712, 0.006, 0.104, 0.092, 0.122, hatC, ho);
      H.add(memo('bill', () => { const g = new THREE.CylinderGeometry(0.12, 0.12, 0.008, 20, 1, false, -0.9, 1.8); g.scale(0.85, 1, 0.75); return g; }), 0, 1.714, 0.082, 1, 1, 1, hatC, { rx: 0.12, ...ho });
      H.add(P.sph, 0, 1.805, 0.006, 0.01, 0.006, 0.01, hatC, ho);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; H.sharp(Math.sin(a) * 0.06, 1.785, 0.006 + Math.cos(a) * 0.07, 0.002, 0.04, 0.003, shade(hatC, 0.75), { ry: a, rx: Math.cos(a) * 0.6, rz: -Math.sin(a) * 0.6, r: 0.9 }); }
      H.frame(basis(V3(0, 1.765, 0.11), V3(0, 0.45, 0.9).normalize()), () => H.box(0, 0, 0.002, 0.05, 0.03, 0.004, shade(hatC, 0.7), { r: 0.95 }));
    } else if (look.hat === 'beanie') {
      H.add(P.domeLow, 0, 1.702, 0.008, 0.103, 0.106, 0.12, hatC, ho);
      H.add(P.torus, 0, 1.705, 0.008, 0.101, 0.118, 0.17, hatC === 'camo' ? 'camo' : shade(hatC, 0.92), { rx: Math.PI / 2, r: 1, ...cm(hatC) });
    }
  }
}
const col2 = (c, fb) => (c == null ? fb : c);
