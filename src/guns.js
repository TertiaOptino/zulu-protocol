import { ATT_LOOK } from './market-data.js'; // B4
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { P } from './gear.js';
// Detailed procedural firearms. Gun space: pistol grip at origin, bore along +Z at y = BY, top +Y, -X = right side. Metres.
// Silhouettes are side profiles ([z, y] outlines) extruded across X with a small bevel; round parts are lathed/cylinders.
// LOD: 1 = full detail (armory, Medium/High), 0 = Low quality in-hand guns (drops rail teeth, slots, serrations, sling hardware)
let LOD = 1; export const setGunLod = (hi) => { LOD = hi ? 1 : 0; }; export const gunLod = () => LOD;
const cache = new Map(); const memo = (k, f) => { let g = cache.get(k); if (!g) { g = f(); cache.set(k, g); } return g; };
const BASIS = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0));
// extruded side profile; pts = [[z, y], ...]; holes = [[[z, y], ...]]
function prof(pts, w, holes = [], bev = 0.0022) {
  const k = JSON.stringify([pts, w, holes, bev]);
  return memo(k, () => { const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))); for (const h of holes) sh.holes.push(new THREE.Path(h.map(([z, y]) => new THREE.Vector2(z, y))));
    const b = Math.min(bev, w * 0.3); const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.0005, w - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b * 0.8, bevelSegments: b > 0.004 ? 4 : 2, curveSegments: 5 });
    g.applyMatrix4(BASIS); g.translate(w / 2 - b, 0, 0); g.deleteAttribute('uv'); g.userData.wear = b > 0.004 ? 'xs' : 'x'; return g; });
}
const arc = (cz, cy, r, a0, a1, n = 6) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cz + Math.cos(a) * r, cy + Math.sin(a) * r]; });
// cross-section ([x, y]) extruded along +Z from z = 0 to len
function profZ(pts, len, bev = 0.0012, key = '') {
  return memo('pz' + key + JSON.stringify([pts, len, bev]), () => { const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.0005, len - 2 * bev), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev * 0.7, bevelSegments: 1, curveSegments: 4 }); g.translate(0, 0, bev); g.deleteAttribute('uv'); g.userData.wear = 'z'; return g; });
}
// MIL-STD-1913 picatinny: continuous spine + dovetail teeth (5.35 mm wide, 10 mm pitch) with recoil grooves between; bottom at y = 0
const RAIL_BASE = [[-0.0078, 0], [0.0078, 0], [0.0078, 0.0048], [-0.0078, 0.0048]];
const RAIL_TOOTH = [[-0.0075, 0.0044], [0.0075, 0.0044], [0.0106, 0.0068], [0.0106, 0.0079], [0.0088, 0.0095], [-0.0088, 0.0095], [-0.0106, 0.0079], [-0.0106, 0.0068]];
const railGeo = (len) => memo('rail' + len + ':' + LOD, () => { const gs = [profZ(RAIL_BASE, len, 0.0008)]; const n = LOD ? Math.max(1, Math.floor(len / 0.01)) : 1;
  if (!LOD) gs.push(profZ(RAIL_TOOTH, len, 0.0008)); else { const tl = 0.0053, off = (len - (n - 1) * 0.01 - tl) / 2; for (let i = 0; i < n; i++) gs.push(profZ(RAIL_TOOTH, tl, 0.0006).clone().translate(0, 0, off + i * 0.01)); }
  const g = mergeGeometries(gs.map((x) => (x.index ? x.toNonIndexed() : x))); g.translate(0, 0, -len / 2); g.userData.wear = 'z'; return g; });
const ribs = (len, r, n, rr = 1.12) => memo(`ribs${len},${r},${n}`, () => { const gs = []; for (let i = 0; i < n; i++) { const c = new THREE.CylinderGeometry(r * rr, r * rr, len / n * 0.45, 16); c.rotateX(Math.PI / 2); c.translate(0, 0, -len / 2 + (i + 0.5) * (len / n)); gs.push(c.toNonIndexed()); } const g = mergeGeometries(gs); g.deleteAttribute('uv'); return g; });
const lathe = (pts, key) => memo('lathe' + key, () => { const g = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), 16); g.rotateX(Math.PI / 2); g.deleteAttribute('uv'); return g; }); // pts [r, z]

// materials
export const MAT = {
  anod: { r: 0.36, mt: 0.75, f: 1 }, steel: { r: 0.28, mt: 0.9, f: 2 }, park: { r: 0.5, mt: 0.6, f: 3 }, poly: { r: 0.62, mt: 0.04, f: 4 }, rub: { r: 0.85, mt: 0, f: 5 }, wood: { r: 0.5, mt: 0, f: 6 }, glass: { r: 0.04, mt: 0.9, f: 7 },
  grip: { r: 0.7, mt: 0.03, f: 8 }, check: { r: 0.6, mt: 0.02, f: 9 }, woodCk: { r: 0.55, mt: 0, f: 9 }, // stippled polymer grips, checkered panels
};
const C = { blk: 0x24262a, poly: 0x18191c, steel: 0x3a3d42, dark: 0x16171a, fde: 0x7d6849, fdeD: 0x645339, od: 0x4a4f3c, odD: 0x343829, plum: 0x4a2620, wood: 0x6e4528, woodD: 0x4e2f1a, grn: 0x3b4532, aug: 0x4e5240, glass: 0x5c7f92 };

class G { // small builder bound to a Parts list
  constructor(pp) { this.pp = pp; }
  p(pts, w, col, m, holes, x = 0, bev) { this.pp.add(prof(pts, w, holes, bev), x, 0, 0, 1, 1, 1, col, m); return this; }
  cyl(z0, z1, r, col, m, y, x = 0, seg) { this.pp.add(seg === 6 ? P.cyl6 : P.cyl, x, y, (z0 + z1) / 2, r, z1 - z0, r, col, { rx: Math.PI / 2, ...m }); return this; }
  box(x, y, z, sx, sy, sz, col, m, o = {}) { this.pp.add(P.box, x, y, z, sx, sy, sz, col, { ...m, ...o }); return this; }
  rbox(x, y, z, sx, sy, sz, col, m, o = {}) { this.pp.add(P.rbox, x, y, z, sx, sy, sz, col, { ...m, ...o }); return this; }
  rail(z0, z1, y, col = C.blk, x = 0, rz = 0) { this.pp.add(railGeo(+(z1 - z0).toFixed(3)), x, y, (z0 + z1) / 2, 1, 1, 1, col, { ...MAT.anod, rz }); return this; }
  geo(g, x, y, z, col, m, o = {}) { this.pp.add(g, x, y, z, 1, 1, 1, col, { ...m, ...o }); return this; }
}
// ---------- shared parts ----------
const BY = 0.045; // bore height
function arGrip(b, col = C.poly, z = 0) { b.p([[z - 0.035, 0.004], [z + 0.02, 0.004], [z + 0.012, -0.03], [z + 0.004, -0.05], [z - 0.006, -0.095], [z - 0.03, -0.1], [z - 0.05, -0.096], [z - 0.054, -0.088], [z - 0.04, -0.03]], 0.03, col, MAT.grip, [], 0, 0.004); }
function trigGuard(b, z0, z1, y, col = C.blk, drop = 0.03) { b.p([[z0, y], [z1, y], [z1, y - drop], [z0 + 0.01, y - drop], [z0, y - drop + 0.01]], 0.012, col, MAT.anod, [[[z0 + 0.006, y - 0.004], [z1 - 0.005, y - 0.004], [z1 - 0.005, y - drop + 0.005], [z0 + 0.012, y - drop + 0.005], [z0 + 0.006, y - drop + 0.012]]]); b.box(0, y - 0.012, z0 + 0.026, 0.005, 0.02, 0.006, C.steel, MAT.steel, { rx: 0.3 }); }
// curved box magazine: top at (z, y), length h, forward sweep at the bottom
function curvedMag(b, z, y, h, depth, w, curve, col, m = MAT.poly, n = 8, ribsOn = false) {
  const L = [], R = []; for (let i = 0; i <= n; i++) { const t = i / n, yy = y - h * t, dz = curve * t * t; L.push([z - depth / 2 + dz - (i === n ? 0.004 : 0), yy]); R.push([z + depth / 2 + dz + (i === n ? 0.004 : 0) + curve * 0.25 * t, yy]); }
  b.p([...R, ...L.reverse()], w, col, m);
  const bot = y - h; b.p([[z - depth / 2 + curve - 0.006, bot + 0.012], [z + depth / 2 + curve * 1.25 + 0.006, bot + 0.012], [z + depth / 2 + curve * 1.25 + 0.006, bot - 0.004], [z - depth / 2 + curve - 0.006, bot - 0.004]], w + 0.004, col, m); // base plate
  if (ribsOn) for (let i = 1; i < 4; i++) { const t = i / 4.2, yy = y - h * t, dz = curve * t * t; b.p([[z - depth / 2 + dz + 0.006, yy], [z + depth / 2 + dz - 0.006, yy], [z + depth / 2 + dz - 0.006, yy - 0.006], [z - depth / 2 + dz + 0.006, yy - 0.006]], w + 0.003, col, m); }
}
// STANAG polymer mag (PMAG-style): near-straight body, ribbed grip panel low on the sides, flared floorplate with pull tab
function stanag(b, z, y, col, h = 0.17) { const d = 0.062, w = 0.024, cv = 0.022;
  curvedMag(b, z, y, h, d, w, cv, col, MAT.poly, 8);
  if (LOD) { for (let i = 0; i < 6; i++) { const t = 0.5 + i * 0.07, yy = y - h * t, dz = cv * t * t; b.p([[z - d / 2 + dz + 0.008, yy], [z + d / 2 + dz - 0.006, yy], [z + d / 2 + dz - 0.006, yy - 0.0035], [z - d / 2 + dz + 0.008, yy - 0.0035]], w + 0.002, col, MAT.poly); }
    b.p([[z - d / 2 + 0.006, y - 0.012], [z + d / 2 - 0.004, y - 0.012], [z + d / 2 - 0.004, y - 0.03], [z - d / 2 + 0.006, y - 0.03]], w + 0.0016, col, MAT.poly); } // windowless top band
  const bot = y - h; b.p([[z + d / 2 + cv * 1.25 + 0.004, bot + 0.003], [z + d / 2 + cv * 1.25 + 0.012, bot - 0.006], [z + d / 2 + cv * 1.25 - 0.004, bot - 0.008]], w, col, MAT.poly); // pull tab
}
// AK-74 bakelite/polymer mag: strong curve, raised horizontal reinforcement ribs, spine rib and front lug
function akMag(b, z, y, col, h = 0.19) { const d = 0.07, w = 0.028, cv = 0.075; curvedMag(b, z, y, h, d, w, cv, col, MAT.poly, 12);
  const n = LOD ? 6 : 3; for (let i = 1; i <= n; i++) { const t = 0.1 + i * 0.8 / (n + 1), yy = y - h * t, dz = cv * t * t; b.p([[z - d / 2 + dz + 0.003, yy], [z + d / 2 + dz + cv * 0.25 * t - 0.002, yy], [z + d / 2 + dz + cv * 0.25 * t - 0.002, yy - 0.004], [z - d / 2 + dz + 0.003, yy - 0.004]], w + 0.0024, col, MAT.poly); }
  const R = []; for (let i = 0; i <= 8; i++) { const t = i / 8; R.push([z - d / 2 + cv * t * t - 0.0025, y - h * t]); } b.p([...R, ...R.slice().reverse().map(([zz, yy]) => [zz + 0.006, yy])], 0.012, col, MAT.poly); // spine
  b.p([[z + d / 2 - 0.002, y + 0.002], [z + d / 2 + 0.008, y + 0.002], [z + d / 2 + 0.006, y - 0.008], [z + d / 2 - 0.002, y - 0.01]], 0.014, C.steel, MAT.park); // front locking lug
}
// QD sling socket (+ optional swivel loop) on the side of a part; side -1 = right
function slingQD(b, z, y, side = 1, loop = false, col = C.blk) { if (!LOD) return; b.pp.add(P.cyl, side * 0.004, y, z, 0.0062, 0.006, 0.0062, col, { ...MAT.anod, rz: Math.PI / 2 }); b.pp.add(P.cyl, side * 0.0072, y, z, 0.0034, 0.0012, 0.0034, 0x0a0a0b, { ...MAT.rub, rz: Math.PI / 2 });
  if (loop) b.pp.add(P.torus, side * 0.0085, y - 0.012, z, 0.011, 0.011, 0.02, C.steel, { ...MAT.steel, ry: Math.PI / 2, rz: 0 }); }
// M-LOK free-float handguard: chamfered octagon tube, full-length top rail, M-LOK slots on sides + 45° faces, QD cup up front
function mlokHG(b, z1, len, col, y = BY - 0.002, slots = 4) { const r = 0.026, c = 0.011;
  b.geo(profZ([[-r + c, -r], [r - c, -r], [r, -r + c], [r, r - c], [r - c, r], [-r + c, r], [-r, r - c], [-r, -r + c]], len, 0.0018), 0, y, z1, col, MAT.anod);
  b.rail(z1, z1 + len, y + r - 0.0005, col);
  if (LOD) for (let i = 0; i < slots; i++) { const zz = z1 + 0.035 + i * (len - 0.06) / Math.max(1, slots - 1); for (const s of [-1, 1]) { b.rbox(s * r, y, zz, 0.003, 0.0075, 0.032, 0x060607, MAT.rub); b.rbox(s * (r - c / 2 + 0.0004), y - r + c / 2 - 0.0004, zz, 0.003, 0.0075, 0.032, 0x060607, { ...MAT.rub, rz: -s * Math.PI / 4 }); } }
  slingQD(b, z1 + len - 0.025, y - 0.008, 1, false, col);
}
function muzzleDev(b, kind, z, r = 0.011, y = BY) { { const BY = y;
  if (kind === 'bird') { b.geo(lathe([[0.006, 0], [r, 0.002], [r, 0.052], [r * 0.85, 0.056], [0.006, 0.056]], 'bird' + r), 0, BY, z, C.dark, MAT.park); for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; if (i !== 3) b.rbox(Math.cos(a) * r * 0.92, BY + Math.sin(a) * r * 0.92, z + 0.034, 0.0045, 0.0045, 0.03, 0x050506, MAT.rub, { rz: a }); } b.cyl(z + 0.055, z + 0.0565, 0.0062, 0x050506, MAT.rub, BY); }
  else if (kind === 'ak') { b.geo(lathe([[0.006, 0], [r * 1.12, 0.004], [r * 1.12, 0.06], [r * 1.05, 0.075], [0.006, 0.075]], 'akb' + r), 0, BY, z, C.dark, MAT.park); b.rbox(0, BY, z + 0.045, r * 2.3, 0.006, 0.018, 0x050506, MAT.rub); for (const s of [-1, 1]) b.cyl(z + 0.02, z + 0.026, 0.0028, 0x050506, MAT.rub, BY + 0.006, s * r * 0.95); b.cyl(z + 0.074, z + 0.0755, 0.0062, 0x050506, MAT.rub, BY); }
  else if (kind === 'brake') { b.geo(lathe([[0.006, 0], [r * 1.35, 0.004], [r * 1.35, 0.06], [r * 1.2, 0.064], [0.006, 0.064]], 'brk' + r), 0, BY, z, C.dark, MAT.park); for (let i = 0; i < 3; i++) for (const s of [-1, 1]) b.box(s * r * 1.2, BY, z + 0.014 + i * 0.016, r * 0.6, r * 1.5, 0.007, 0x050506, MAT.rub); b.cyl(z + 0.063, z + 0.0645, 0.0062, 0x050506, MAT.rub, BY); }
  else if (kind === 'cone') { // tapered 4-slot flash hider: shoulder + wrench flats, slotted tines, crowned bore
    const k = r / 0.011; b.geo(lathe([[0.0068 * k, 0], [0.0105 * k, 0.001], [0.0105 * k, 0.013], [0.0118 * k, 0.015], [0.0138 * k, 0.05], [0.0128 * k, 0.054], [0.0092 * k, 0.0555], [0.0074 * k, 0.052]], 'fh4' + k), 0, BY, z, C.dark, MAT.park);
    for (const s of [-1, 1]) b.box(s * 0.0098 * k, BY, z + 0.007, 0.0016, 0.012 * k, 0.009, 0x1a1b1d, MAT.park); // wrench flats
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2, rr = 0.0128 * k; b.rbox(Math.cos(a) * rr, BY + Math.sin(a) * rr, z + 0.036, 0.0032 * k, 0.0042 * k, 0.034, 0x050506, MAT.rub, { rz: a }); } // open slots between tines
    b.cyl(z + 0.0535, z + 0.0558, 0.0072 * k, 0x050506, MAT.rub, BY); b.cyl(z + 0.0125, z + 0.0145, 0.0112 * k, 0x151617, MAT.steel, BY); } // bore + shoulder ring
  else if (kind === 'p90') { // P90 flared flash hider with 3 cuts
    b.geo(lathe([[0.0075, 0], [0.011, 0.004], [0.011, 0.012], [0.0128, 0.016], [0.0142, 0.05], [0.0122, 0.054], [0.0078, 0.054]], 'p90m2'), 0, BY, z, C.dark, MAT.park);
    for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + i * 2 * Math.PI / 3; b.rbox(Math.cos(a) * 0.0132, BY + Math.sin(a) * 0.0132, z + 0.036, 0.003, 0.004, 0.028, 0x050506, MAT.rub, { rz: a }); }
    b.cyl(z + 0.0535, z + 0.0552, 0.0072, 0x050506, MAT.rub, BY); }
} }
// can suppressor: wrench flats + QD ring at the mount, ribbed tube, dark bore at the front cap
function suppressor(b, z, r = 0.019, len = 0.17) { b.geo(lathe([[0.011, 0], [r * 0.95, 0.004], [r, 0.03], [r, len - 0.006], [r * 0.92, len], [0.007, len]], 'sup' + r + len), 0, BY, z, 0x2a2b2d, { r: 0.6, mt: 0.45, f: 3 });
  b.cyl(z + 0.004, z + 0.024, r * 1.04, 0x1e1f21, MAT.anod, BY, 0, 6); if (LOD) b.geo(ribs(len * 0.45, r, 4, 1.03), 0, BY, z + 0.04 + len * 0.225, 0x232426, MAT.anod); b.cyl(z + len, z + len + 0.0015, 0.0065, 0x050506, MAT.rub, BY); }
function bufferStock(b, col, z = -0.07, kind = 'm4') {
  b.cyl(z - 0.2, z, 0.0145, C.blk, MAT.anod, BY + 0.003);
  if (kind === 'm4') b.p([[z - 0.1, BY + 0.03], [z - 0.235, BY + 0.03], [z - 0.24, BY + 0.024], [z - 0.24, BY - 0.068], [z - 0.215, BY - 0.07], [z - 0.15, BY - 0.02], [z - 0.11, BY - 0.012], [z - 0.095, BY + 0.0]], 0.036, col, MAT.poly, [[[z - 0.2, BY - 0.012], [z - 0.16, BY - 0.012], [z - 0.205, BY - 0.045]]]);
  else if (kind === 'crane') b.p([[z - 0.09, BY + 0.033], [z - 0.24, BY + 0.033], [z - 0.245, BY + 0.025], [z - 0.245, BY - 0.07], [z - 0.215, BY - 0.072], [z - 0.13, BY - 0.03], [z - 0.09, BY - 0.022]], 0.044, col, MAT.poly);
  if (kind === 'crane') { for (const s2 of [-1, 1]) b.cyl(z - 0.235, z - 0.1, 0.0115, col, MAT.poly, BY + 0.016, s2 * 0.019); b.rbox(0, BY + 0.036, z - 0.17, 0.03, 0.008, 0.1, col, MAT.poly); if (LOD) b.rbox(0, BY - 0.045, z - 0.2, 0.046, 0.012, 0.018, 0x0b0b0c, MAT.rub); } // battery tubes, cheek riser, sling slot
  b.p([[z - 0.236, BY + 0.032], [z - 0.252, BY + 0.032], [z - 0.252, BY - 0.074], [z - 0.236, BY - 0.074]], 0.04, C.dark, MAT.rub); // butt pad
}
function ar15(b, o) { // AR-15 family upper/lower; o: {fur, rec, hg: 'round'|'quad'|'mlok', hgLen, fsb, len, stock, mag}
  const f = o.fur, rec = o.rec || C.blk, z0 = -0.07, z1 = 0.17, hz = z1 + o.hgLen;
  // lower receiver: magwell flare, trigger-guard ears, buffer-tube boss, takedown/pivot pins, mag release, bolt catch, selector
  b.p([[z0, BY - 0.002], [z1 - 0.005, BY - 0.002], [z1 - 0.008, BY - 0.02], [z1 - 0.022, BY - 0.04], [0.142, BY - 0.064], [0.06, BY - 0.064], [0.056, BY - 0.04], [0.02, BY - 0.042], [-0.035, BY - 0.042], [z0 + 0.008, BY - 0.03], [z0, BY - 0.02]], 0.03, rec, MAT.anod);
  b.p([[0.058, BY - 0.04], [0.146, BY - 0.04], [0.142, BY - 0.066], [0.06, BY - 0.066]], 0.0326, rec, MAT.anod); // magwell flare lip
  for (const zz of [z0 + 0.012, z1 - 0.02]) { b.pp.add(P.cyl, 0, BY - 0.012, zz, 0.0032, 0.0335, 0.0032, C.steel, { ...MAT.steel, rz: Math.PI / 2 }); }
  b.pp.add(P.cyl, -0.015, BY - 0.026, 0.05, 0.0042, 0.006, 0.0042, rec, { ...MAT.anod, rz: Math.PI / 2 }); // mag release (right)
  b.rbox(0.0165, BY - 0.012, 0.045, 0.004, 0.018, 0.012, rec, MAT.anod); // bolt catch paddle (left)
  b.p([[-0.03, BY - 0.006], [-0.008, BY - 0.012], [-0.03, BY - 0.018]], 0.036, C.steel, MAT.steel); // selector lever
  trigGuard(b, 0.008, 0.07, BY - 0.042, rec); arGrip(b, f);
  // upper: flat-top body with brass deflector + forward-assist housing, ejection port door, dust-cover rod, T charging handle
  b.p([[z0, BY - 0.002], [z1, BY - 0.002], [z1, BY + 0.03], [z0 + 0.02, BY + 0.032], [z0, BY + 0.026]], 0.034, rec, MAT.anod);
  b.p([[0.012, BY + 0.006], [0.052, BY + 0.01], [0.05, BY + 0.03], [0.02, BY + 0.03], [0.006, BY + 0.024]], 0.046, rec, MAT.anod); // deflector / FA housing (right side bulge)
  b.pp.list.at(-1).m.premultiply(new THREE.Matrix4().makeTranslation(-0.006, 0, 0));
  b.cyl(0.004, 0.034, 0.0062, rec, MAT.anod, BY + 0.02, -0.024); b.cyl(-0.002, 0.006, 0.0052, C.steel, MAT.steel, BY + 0.02, -0.024); // forward assist plunger
  b.rbox(-0.0172, BY + 0.012, 0.09, 0.0022, 0.017, 0.056, C.dark, MAT.park); b.pp.add(P.cyl, -0.0178, BY + 0.003, 0.09, 0.0016, 0.058, 0.0016, C.steel, { ...MAT.steel, rx: Math.PI / 2 }); // ejection port door + hinge rod
  b.p([[z0 + 0.004, BY + 0.024], [z0 - 0.012, BY + 0.024], [z0 - 0.016, BY + 0.03], [z0 + 0.004, BY + 0.031]], 0.044, rec, MAT.anod); // charging handle T
  b.rail(z0 + 0.005, z1, BY + 0.031, rec);
  // handguard
  if (o.hg === 'round') { b.geo(lathe([[0.019, 0], [0.025, 0.008], [0.025, o.hgLen - 0.008], [0.019, o.hgLen]], 'hgR' + o.hgLen), 0, BY - 0.002, z1, f, MAT.poly); b.geo(ribs(o.hgLen - 0.03, 0.025, 9, 1.03), 0, BY - 0.002, z1 + o.hgLen / 2, f, MAT.poly);
    b.cyl(z1 - 0.004, z1 + 0.006, 0.028, rec, MAT.anod, BY); b.cyl(hz - 0.004, hz + 0.003, 0.021, rec, MAT.anod, BY); // delta ring + cap
    if (LOD) for (let i = 0; i < 6; i++) b.pp.add(P.cyl, Math.cos(i * 1.05) * 0.021, BY - 0.002 + Math.sin(i * 1.05) * 0.021, z1 + 0.03 + (i % 2) * 0.06, 0.003, 0.009, 0.003, 0x060607, { ...MAT.rub, rx: Math.PI / 2 }); } // heat-shield holes
  else if (o.hg === 'quad') { b.rbox(0, BY - 0.002, z1 + o.hgLen / 2, 0.046, 0.046, o.hgLen, rec, MAT.anod); b.rail(z1, hz, BY + 0.021, rec); b.rail(z1 + 0.02, hz - 0.01, BY - 0.025, rec, 0, Math.PI); for (const s of [-1, 1]) b.rail(z1 + 0.04, hz - 0.03, BY - 0.002, rec, s * 0.023, -s * Math.PI / 2);
    slingQD(b, hz - 0.012, BY - 0.002, 1, false, rec); }
  else mlokHG(b, z1, o.hgLen, o.hgCol ?? rec, BY - 0.002, Math.round(o.hgLen / 0.06));
  b.cyl(hz, o.len, 0.0085, C.steel, MAT.park, BY); if (o.hg !== 'round') b.cyl(hz - 0.002, hz + 0.02, 0.0105, C.dark, MAT.park, BY, 0, 6); // low-profile gas block
  if (o.fsb) { b.p([[0.0, 0.0], [0.03, 0.0], [0.024, 0.045], [0.014, 0.058], [0.008, 0.058], [0.004, 0.045]], 0.012, C.dark, MAT.park, [[[0.01, 0.03], [0.022, 0.03], [0.018, 0.046], [0.012, 0.046]]], 0); b.pp.list.at(-1).m.premultiply(new THREE.Matrix4().makeTranslation(0, BY - 0.012, hz + 0.01));
    for (const s of [-1, 1]) b.rbox(s * 0.0055, BY + 0.05, hz + 0.024, 0.0025, 0.016, 0.008, C.dark, MAT.park); b.box(0, BY + 0.05, hz + 0.024, 0.0035, 0.014, 0.0035, C.dark, MAT.park); b.pp.add(P.torus, 0, BY - 0.006, hz + 0.024, 0.008, 0.008, 0.008, C.steel, { ...MAT.steel, ry: Math.PI / 2 }); }
  else { b.p([[hz - 0.026, BY + 0.023], [hz - 0.012, BY + 0.023], [hz - 0.014, BY + 0.031], [hz - 0.024, BY + 0.031]], 0.016, C.dark, MAT.anod); } // folded front BUIS
  b.p([[z0 + 0.03, BY + 0.041], [z0 + 0.052, BY + 0.041], [z0 + 0.05, BY + 0.05], [z0 + 0.034, BY + 0.051]], 0.018, C.dark, MAT.anod); // folded rear BUIS
  bufferStock(b, f, z0, o.stock || 'm4'); b.cyl(z0 - 0.006, z0, 0.017, C.steel, MAT.park, BY + 0.003, 0, 6); // castle nut
  slingQD(b, z0 - 0.003, BY - 0.012, 1, true, rec);
  stanag(b, 0.1, BY - 0.042, o.mag ?? C.poly);
}
// ---------- per-weapon builders ----------
const B = {
  m4a1(b) { ar15(b, { fur: C.poly, hg: 'round', hgLen: 0.17, fsb: true, len: 0.5 }); muzzleDev(b, 'bird', 0.5); return { len: 0.55, railY: BY + 0.031, oz: 0.05 }; },
  hk416(b) { ar15(b, { fur: C.fdeD, hg: 'quad', hgLen: 0.23, len: 0.5, stock: 'crane', mag: C.fde }); b.cyl(0.17, 0.4, 0.007, C.dark, MAT.park, BY + 0.019); muzzleDev(b, 'cone', 0.5); return { len: 0.55, railY: BY + 0.031, oz: 0.05 }; },
  c8a2(b) { ar15(b, { fur: C.grn, hg: 'mlok', hgLen: 0.25, len: 0.52, mag: C.grn }); muzzleDev(b, 'bird', 0.52); return { len: 0.57, railY: BY + 0.031, oz: 0.05 }; },
  ak74m(b) { const rec = 0x2a2b2e, f = C.poly;
    b.p([[-0.08, BY - 0.026], [0.2, BY - 0.026], [0.205, BY + 0.012], [0.19, BY + 0.024], [-0.04, BY + 0.024], [-0.08, BY + 0.01]], 0.034, rec, MAT.park); // receiver
    b.p([[-0.075, BY + 0.022], [0.175, BY + 0.022], [0.17, BY + 0.034], [-0.03, BY + 0.04], [-0.075, BY + 0.034]], 0.03, rec, MAT.park); // dust cover
    for (let i = 0; i < 4; i++) b.box(0, BY + 0.038 - i * 0.0005, -0.02 + i * 0.012, 0.031, 0.002, 0.004, 0x1c1c1e, MAT.park);
    b.box(-0.019, BY + 0.01, 0.07, 0.008, 0.012, 0.11, rec, MAT.park); b.box(-0.022, BY + 0.0, 0.1, 0.004, 0.018, 0.035, 0x1c1c1e, MAT.park); // safety lever + charging handle
    b.box(0.019, BY - 0.006, 0.04, 0.003, 0.03, 0.12, rec, MAT.park); // side scope rail
    trigGuard(b, 0.01, 0.075, BY - 0.026, rec, 0.03);
    b.p([[-0.03, BY - 0.026], [0.012, BY - 0.026], [0.0, -0.06], [-0.012, -0.1], [-0.04, -0.1], [-0.035, -0.06]], 0.028, 0x3a2420, MAT.grip, [], 0, 0.004); // bakelite grip
    b.p([[0.2, BY - 0.022], [0.38, BY - 0.022], [0.383, BY + 0.004], [0.2, BY + 0.006]], 0.042, 0x6a3a22, MAT.wood, [], 0, 0.006); // laminated wood lower handguard
    for (let i = 0; i < 4; i++) b.box(0, BY - 0.012, 0.235 + i * 0.035, 0.0435, 0.008, 0.006, 0x3a1d12, MAT.wood); // finger grooves
    b.p([[0.205, BY + 0.012], [0.36, BY + 0.016], [0.36, BY + 0.038], [0.215, BY + 0.036]], 0.032, 0x6a3a22, MAT.wood, [], 0, 0.006); b.cyl(0.36, 0.42, 0.008, rec, MAT.park, BY + 0.027); // gas tube
    b.box(0, BY + 0.03, 0.18, 0.02, 0.012, 0.05, rec, MAT.park); b.box(0, BY + 0.038, 0.185, 0.012, 0.004, 0.03, 0x111214, MAT.park); // rear sight leaf
    b.cyl(0.38, 0.6, 0.009, C.steel, MAT.park, BY); b.p([[0.0, -0.01], [0.04, -0.01], [0.036, 0.05], [0.028, 0.05], [0.004, 0.02]], 0.016, rec, MAT.park); b.pp.list.at(-1).m.premultiply(new THREE.Matrix4().makeTranslation(0, BY, 0.555));
    muzzleDev(b, 'ak', 0.6, 0.011);
    akMag(b, 0.12, BY - 0.026, C.plum);
    b.p([[-0.08, BY + 0.03], [-0.33, BY + 0.03], [-0.335, BY - 0.075], [-0.31, BY - 0.078], [-0.1, BY - 0.022], [-0.08, BY - 0.02]], 0.036, 0x6a3a22, MAT.wood, [[[-0.27, BY + 0.012], [-0.13, BY + 0.012], [-0.13, BY - 0.012], [-0.27, BY - 0.045]]]);
    b.box(0, BY - 0.022, -0.334, 0.04, 0.11, 0.012, C.dark, MAT.rub);
    return { len: 0.68, railY: BY + 0.045, oz: 0.02 }; },
  g36c(b) { const f = 0x2a2d28;
    b.p([[-0.08, BY - 0.03], [0.2, BY - 0.03], [0.21, BY - 0.005], [0.21, BY + 0.025], [-0.08, BY + 0.025]], 0.04, f, MAT.poly); // receiver
    b.p([[0.21, BY - 0.026], [0.33, BY - 0.022], [0.335, BY + 0.024], [0.21, BY + 0.025]], 0.044, f, MAT.poly); for (let i = 0; i < 5; i++) b.box(0, BY, 0.225 + i * 0.022, 0.045, 0.026, 0.006, 0x101112, MAT.rub);
    b.p([[-0.06, BY + 0.025], [0.17, BY + 0.025], [0.165, BY + 0.06], [0.12, BY + 0.078], [-0.02, BY + 0.078], [-0.05, BY + 0.06]], 0.03, f, MAT.poly, [[[-0.02, BY + 0.033], [0.13, BY + 0.033], [0.12, BY + 0.055], [-0.01, BY + 0.055]]]); // carry handle
    b.cyl(-0.01, 0.11, 0.013, f, MAT.poly, BY + 0.068); b.geo(P.cyl, 0, BY + 0.068, 0.112, C.glass, MAT.glass, { rx: Math.PI / 2 }); b.pp.list.at(-1).m.scale(new THREE.Vector3(0.012, 0.002, 0.012));
    b.p([[-0.04, BY - 0.03], [0.01, BY - 0.03], [0.0, -0.06], [-0.014, -0.1], [-0.042, -0.1], [-0.04, -0.06]], 0.03, f, MAT.grip, [], 0, 0.004); trigGuard(b, 0.01, 0.075, BY - 0.03, f, 0.032);
    b.cyl(0.33, 0.47, 0.009, C.steel, MAT.park, BY); muzzleDev(b, 'cone', 0.47);
    curvedMag(b, 0.12, BY - 0.03, 0.165, 0.064, 0.025, 0.03, 0x3a4048, MAT.glass, 8, true);
    b.p([[-0.08, BY + 0.022], [-0.32, BY + 0.022], [-0.325, BY - 0.07], [-0.3, BY - 0.072], [-0.08, BY - 0.026]], 0.03, f, MAT.poly, [[[-0.29, BY + 0.008], [-0.11, BY + 0.008], [-0.11, BY - 0.016], [-0.29, BY - 0.055]]]);
    return { len: 0.52, railY: BY + 0.078, oz: 0.05, noOptic: true }; },
  scarl(b) { const up = C.fde, lo = C.fdeD;
    b.p([[-0.08, BY - 0.002], [0.17, BY - 0.002], [0.165, BY - 0.035], [0.135, BY - 0.065], [0.065, BY - 0.065], [0.058, BY - 0.04], [-0.04, BY - 0.04], [-0.08, BY - 0.02]], 0.032, lo, MAT.anod);
    b.p([[-0.08, BY - 0.002], [0.37, BY - 0.002], [0.37, BY + 0.034], [-0.08, BY + 0.034]], 0.044, up, MAT.anod); b.box(-0.023, BY + 0.016, 0.0, 0.004, 0.012, 0.11, C.blk, MAT.park);
    b.rail(-0.08, 0.37, BY + 0.034, up); for (const s of [-1, 1]) b.rail(0.22, 0.35, BY + 0.012, up, s * 0.022, -s * Math.PI / 2); b.rail(0.24, 0.35, BY - 0.004, C.blk, 0, Math.PI);
    b.box(-0.026, BY + 0.024, 0.2, 0.012, 0.01, 0.02, C.blk, MAT.park); // charging handle (left/right)
    trigGuard(b, 0.008, 0.07, BY - 0.04, lo); arGrip(b, C.blk); b.cyl(0.37, 0.5, 0.009, C.steel, MAT.park, BY); muzzleDev(b, 'brake', 0.5, 0.01);
    stanag(b, 0.1, BY - 0.04, C.fde);
    b.p([[-0.08, BY + 0.03], [-0.31, BY + 0.03], [-0.315, BY - 0.075], [-0.29, BY - 0.077], [-0.2, BY - 0.04], [-0.12, BY - 0.03], [-0.08, BY - 0.02]], 0.04, C.blk, MAT.poly, [[[-0.27, BY + 0.0], [-0.14, BY + 0.0], [-0.14, BY - 0.018], [-0.26, BY - 0.05]]]);
    b.p([[-0.17, BY + 0.03], [-0.29, BY + 0.03], [-0.29, BY + 0.048], [-0.18, BY + 0.046]], 0.03, C.blk, MAT.poly); // cheek riser
    return { len: 0.56, railY: BY + 0.034, oz: 0.04 }; },
  aug(b) { const f = C.aug;
    b.p([[-0.31, BY - 0.04], [-0.31, BY + 0.03], [-0.05, BY + 0.03], [0.02, BY + 0.012], [0.11, BY + 0.01], [0.11, BY - 0.025], [0.04, BY - 0.04], [-0.12, BY - 0.04], [-0.16, BY - 0.07], [-0.3, BY - 0.07]], 0.05, f, MAT.poly); // stock body
    b.p([[0.012, BY - 0.03], [0.1, BY - 0.03], [0.11, BY - 0.02], [0.105, -0.1], [0.07, -0.105], [0.06, -0.06], [-0.04, -0.065], [-0.05, -0.08], [-0.065, -0.07], [-0.06, BY - 0.03]], 0.04, f, MAT.poly, [[[-0.045, -0.054], [0.06, -0.05], [0.062, -0.01], [0.012, -0.012], [0.0, -0.025], [-0.045, -0.025]]]); // closed trigger guard
    b.p([[-0.008, -0.012], [0.012, -0.012], [0.006, -0.05], [-0.003, -0.095], [-0.03, -0.095], [-0.022, -0.05]], 0.03, f, MAT.poly);
    b.box(0.0, -0.08, 0.075, 0.03, 0.05, 0.022, f, MAT.poly, { rx: -0.15 }); // forward grip
    curvedMag(b, -0.11, BY - 0.04, 0.15, 0.06, 0.026, 0.035, 0x3a4048, MAT.glass, 8, true);
    b.cyl(0.11, 0.42, 0.0095, C.steel, MAT.park, BY); b.cyl(0.11, 0.17, 0.016, C.steel, MAT.park, BY); muzzleDev(b, 'cone', 0.42);
    b.p([[-0.12, BY + 0.03], [0.05, BY + 0.03], [0.04, BY + 0.06], [-0.11, BY + 0.06]], 0.016, f, MAT.poly, [[[-0.09, BY + 0.036], [0.02, BY + 0.036], [0.02, BY + 0.05], [-0.09, BY + 0.05]]]); // scope mount
    b.cyl(-0.12, 0.06, 0.016, f, MAT.poly, BY + 0.072); b.geo(lathe([[0.016, 0], [0.022, 0.025], [0.022, 0.04], [0.019, 0.04]], 'augO'), 0, BY + 0.072, 0.04, f, MAT.poly); b.cyl(0.076, 0.078, 0.019, C.glass, MAT.glass, BY + 0.072);
    b.box(0, BY - 0.022, -0.31, 0.05, 0.1, 0.01, C.dark, MAT.rub);
    return { len: 0.47, railY: BY + 0.06, oz: 0.0, noOptic: true }; },
  // ---- SMGs ----
  mp5(b) { const f = C.blk, st = 0x202124; // HK MP5A3: stamped receiver w/ claw-mount dimples, cocking tube + left charging handle, hooded front post, rotary drum rear sight, slim handguard, Navy trigger group, curved 30-rd steel mag, retractable stock
    b.p([[-0.065, BY - 0.022], [0.19, BY - 0.022], [0.19, BY + 0.018], [0.176, BY + 0.03], [-0.05, BY + 0.03], [-0.065, BY + 0.02]], 0.04, st, MAT.park); // receiver
    b.p([[0.075, BY - 0.022], [0.15, BY - 0.022], [0.146, BY - 0.04], [0.08, BY - 0.04]], 0.03, st, MAT.park); // magwell
    if (LOD) { for (const zz of [-0.03, 0.02, 0.07, 0.12]) for (const s2 of [-1, 1]) b.pp.add(P.sph, s2 * 0.017, BY + 0.03, zz, 0.004, 0.0025, 0.006, 0x101113, MAT.park); for (let i = 0; i < 2; i++) for (const s2 of [-1, 1]) b.rbox(s2 * 0.0205, BY + 0.004, 0.03 + i * 0.09, 0.002, 0.026, 0.004, 0x101113, MAT.park); }
    b.rbox(-0.0205, BY + 0.01, 0.065, 0.002, 0.014, 0.04, 0x08090a, MAT.rub); // ejection port
    b.cyl(0.19, 0.335, 0.0115, st, MAT.park, BY + 0.027); b.rbox(0.019, BY + 0.027, 0.27, 0.022, 0.006, 0.008, st, MAT.park, { ry: -0.35 }); b.pp.add(P.sph, 0.03, BY + 0.027, 0.266, 0.0055, 0.0055, 0.0055, st, MAT.park); // cocking tube + handle (left)
    b.p([[0.195, BY - 0.022], [0.3, BY - 0.022], [0.305, BY - 0.012], [0.305, BY + 0.017], [0.195, BY + 0.017]], 0.044, 0x151618, MAT.poly, [], 0, 0.005); if (LOD) for (let i = 0; i < 5; i++) for (const s2 of [-1, 1]) b.rbox(s2 * 0.022, BY - 0.005, 0.212 + i * 0.019, 0.003, 0.022, 0.006, 0x0a0a0b, MAT.rub);
    b.cyl(0.3, 0.37, 0.0075, C.steel, MAT.park, BY); for (let i = 0; i < 3; i++) b.pp.add(P.box, Math.cos(i * 2.094) * 0.009, BY + Math.sin(i * 2.094) * 0.009, 0.358, 0.004, 0.004, 0.018, C.steel, { ...MAT.park, rz: i * 2.094 }); // 3-lug barrel
    b.p([[0.322, BY + 0.016], [0.342, BY + 0.016], [0.34, BY + 0.05], [0.324, BY + 0.05]], 0.012, st, MAT.park); b.pp.add(P.torus, 0, BY + 0.05, 0.332, 0.012, 0.012, 0.03, st, MAT.park); b.box(0, BY + 0.048, 0.332, 0.002, 0.012, 0.002, st, MAT.park); // hooded front post
    b.pp.add(P.cyl, 0, BY + 0.043, -0.035, 0.011, 0.016, 0.011, st, { ...MAT.park, rz: Math.PI / 2 }); for (const s2 of [-1, 1]) b.p([[-0.052, BY + 0.03], [-0.02, BY + 0.03], [-0.026, BY + 0.05], [-0.046, BY + 0.05]], 0.004, st, MAT.park, [], s2 * 0.011); // drum sight + ears
    b.p([[-0.048, BY - 0.022], [0.072, BY - 0.022], [0.07, BY - 0.032], [0.052, BY - 0.062], [0.044, BY - 0.064], [0.002, -0.068], [-0.006, -0.1], [-0.04, -0.104], [-0.044, -0.064], [-0.048, BY - 0.04]], 0.032, 0x161719, MAT.grip, [[[0.004, BY - 0.03], [0.05, BY - 0.03], [0.044, BY - 0.056], [0.008, BY - 0.056]]], 0, 0.004); // Navy trigger pack + grip
    if (LOD) for (let i = 0; i < 3; i++) b.rbox(0, -0.072 - i * 0.01, -0.006 - i * 0.0012, 0.034, 0.003, 0.004, f, MAT.poly);
    b.p([[-0.03, BY - 0.026], [-0.012, BY - 0.022], [-0.03, BY - 0.018]], 0.036, C.steel, MAT.steel); // selector
    curvedMag(b, 0.112, BY - 0.04, 0.155, 0.034, 0.02, 0.055, 0x1c1d20, MAT.park, 10); if (LOD) for (let i = 1; i < 5; i++) { const t = i / 5.5; b.p([[0.112 - 0.012 + 0.055 * t * t, BY - 0.04 - 0.155 * t], [0.112 + 0.012 + 0.055 * t * t, BY - 0.04 - 0.155 * t], [0.112 + 0.012 + 0.055 * t * t, BY - 0.043 - 0.155 * t], [0.112 - 0.012 + 0.055 * t * t, BY - 0.043 - 0.155 * t]], 0.022, 0x1c1d20, MAT.park); }
    for (const s2 of [-1, 1]) b.cyl(-0.27, -0.06, 0.0045, C.steel, MAT.park, BY + 0.012, s2 * 0.017); // A3 struts
    b.p([[-0.262, BY + 0.03], [-0.282, BY + 0.03], [-0.29, BY + 0.0], [-0.29, BY - 0.06], [-0.276, BY - 0.068], [-0.266, BY - 0.05], [-0.268, BY + 0.0]], 0.042, st, MAT.park); b.rbox(0, BY - 0.018, -0.292, 0.04, 0.09, 0.006, C.dark, MAT.rub);
    slingQD(b, -0.055, BY - 0.005, 1, true, st);
    return { len: 0.37, railY: BY + 0.03, oz: 0.05 }; },
  mp7(b) { const f = 0x2a2c2e; // H&K MP7A1: compact polymer receiver, full top rail, grip-housed 40-rd mag, folding vertical grip, telescoping stock
    b.p([[-0.07, BY - 0.022], [0.15, BY - 0.022], [0.17, BY - 0.01], [0.19, BY + 0.0], [0.19, BY + 0.024], [0.176, BY + 0.028], [-0.064, BY + 0.028], [-0.07, BY + 0.018]], 0.042, f, MAT.poly);
    b.rail(-0.06, 0.185, BY + 0.028, f); for (const s2 of [-1, 1]) b.rail(0.13, 0.18, BY + 0.004, f, s2 * 0.021, -s2 * Math.PI / 2);
    b.p([[-0.02, BY - 0.022], [0.034, BY - 0.022], [0.028, -0.06], [0.03, -0.128], [-0.018, -0.13], [-0.03, -0.06]], 0.032, f, MAT.poly); if (LOD) for (let i = 0; i < 6; i++) b.rbox(0, -0.04 - i * 0.012, -0.024 + i * 0.0011, 0.03, 0.004, 0.004, 0x1c1d1f, MAT.rub);
    trigGuard(b, 0.036, 0.095, BY - 0.022, f, 0.036); b.rbox(0, -0.148, 0.005, 0.03, 0.04, 0.052, C.dark, MAT.poly); b.rbox(0, -0.17, 0.006, 0.034, 0.006, 0.056, C.dark, MAT.poly);
    b.p([[0.125, BY - 0.022], [0.155, BY - 0.022], [0.15, -0.075], [0.122, -0.078]], 0.026, f, MAT.poly); // folding foregrip
    b.rbox(-0.022, BY + 0.012, 0.06, 0.003, 0.012, 0.03, 0x08090a, MAT.rub); b.p([[-0.068, BY + 0.03], [-0.084, BY + 0.03], [-0.084, BY + 0.038], [-0.066, BY + 0.036]], 0.04, f, MAT.poly); // port + charging handle
    b.cyl(0.19, 0.24, 0.0075, C.steel, MAT.park, BY); muzzleDev(b, 'cone', 0.235);
    for (const s2 of [-1, 1]) b.cyl(-0.18, -0.06, 0.006, C.steel, MAT.park, BY + 0.008, s2 * 0.0155); b.p([[-0.17, BY + 0.024], [-0.19, BY + 0.024], [-0.19, BY - 0.05], [-0.17, BY - 0.05]], 0.044, f, MAT.poly);
    slingQD(b, 0.17, BY - 0.012, 1, false, f);
    return { len: 0.28, railY: BY + 0.028, oz: 0.03 }; },
  ump45(b) { const f = 0x232427; // H&K UMP45: slab-sided polymer receiver w/ fluted side bulges, integral trigger guard/grip, straight 25-rd mag, side-folding skeleton stock
    b.p([[-0.07, BY - 0.026], [0.29, BY - 0.026], [0.3, BY - 0.012], [0.3, BY + 0.026], [0.29, BY + 0.03], [-0.065, BY + 0.03], [-0.07, BY + 0.02]], 0.046, f, MAT.poly); b.rail(-0.06, 0.16, BY + 0.03, f); for (const s2 of [-1, 1]) b.rail(0.2, 0.28, BY + 0.002, f, s2 * 0.023, -s2 * Math.PI / 2); b.rail(0.2, 0.28, BY - 0.026, f, 0, Math.PI);
    if (LOD) for (let i = 0; i < 4; i++) for (const s2 of [-1, 1]) b.rbox(s2 * 0.0235, BY + 0.006, 0.02 + i * 0.03, 0.002, 0.014, 0.014, 0x0d0d0e, MAT.rub);
    b.p([[-0.045, BY - 0.026], [0.08, BY - 0.026], [0.08, BY - 0.045], [0.05, BY - 0.06], [0.004, -0.064], [-0.008, -0.1], [-0.04, -0.104], [-0.046, -0.064], [-0.045, BY - 0.045]], 0.034, f, MAT.poly, [[[0.004, BY - 0.034], [0.064, BY - 0.034], [0.05, BY - 0.054], [0.008, BY - 0.054]]]);
    curvedMag(b, 0.115, BY - 0.026, 0.135, 0.046, 0.026, 0.004, C.blk, MAT.poly, 4); b.rbox(0, BY - 0.165, 0.116, 0.032, 0.008, 0.056, C.blk, MAT.poly);
    b.cyl(0.3, 0.34, 0.0095, C.steel, MAT.park, BY); muzzleDev(b, 'cone', 0.335);
    b.box(-0.025, BY + 0.016, 0.24, 0.006, 0.008, 0.02, C.dark, MAT.park); // charging handle
    b.p([[-0.07, BY + 0.022], [-0.3, BY + 0.022], [-0.305, BY - 0.065], [-0.285, BY - 0.07], [-0.07, BY - 0.022]], 0.03, f, MAT.poly, [[[-0.27, BY + 0.007], [-0.1, BY + 0.007], [-0.1, BY - 0.01], [-0.27, BY - 0.052]]]); b.rbox(0, BY - 0.022, -0.305, 0.034, 0.09, 0.01, C.dark, MAT.rub);
    slingQD(b, -0.06, BY + 0.0, 1, true, f);
    return { len: 0.37, railY: BY + 0.03, oz: 0.02 }; },
  vector(b) { const f = C.blk;
    b.p([[-0.06, BY + 0.03], [0.2, BY + 0.03], [0.22, BY + 0.0], [0.22, BY - 0.02], [0.17, -0.02], [0.14, -0.06], [0.06, -0.05], [0.02, BY - 0.03], [-0.06, BY - 0.02]], 0.044, f, MAT.poly); b.rail(-0.05, 0.2, BY + 0.03, f); b.rail(0.17, 0.215, BY - 0.03, f, 0, Math.PI);
    b.p([[-0.03, BY - 0.02], [0.012, BY - 0.02], [0.0, -0.06], [-0.012, -0.1], [-0.042, -0.1], [-0.035, -0.06]], 0.03, f, MAT.poly); trigGuard(b, 0.01, 0.06, BY - 0.02, f, 0.028);
    curvedMag(b, 0.12, -0.05, 0.13, 0.04, 0.026, 0.0, f, MAT.poly, 4); b.cyl(0.22, 0.3, 0.009, C.steel, MAT.park, BY); muzzleDev(b, 'cone', 0.3);
    b.cyl(-0.2, -0.06, 0.012, f, MAT.anod, BY + 0.01); b.p([[-0.17, BY + 0.025], [-0.26, BY + 0.025], [-0.26, BY - 0.06], [-0.24, BY - 0.06], [-0.17, BY - 0.01]], 0.03, f, MAT.poly);
    return { len: 0.34, railY: BY + 0.03, oz: 0.04 }; },
  p90(b) { const f = 0x232426, g = 0x1a1b1d; // FN P90: sculpted bullpup (rounded moulded shell halves, stippled grip panels, thumbhole + trigger-finger loop), translucent 50-rd top mag, integrated ring sight, flared flash hider
    const body = [[-0.26, -0.098], [-0.262, BY + 0.016], [-0.24, BY + 0.026], [0.13, BY + 0.026], [0.19, BY + 0.012], [0.215, BY - 0.006], [0.215, BY - 0.028], [0.17, BY - 0.04], [0.15, -0.035], [0.125, -0.085], [0.1, -0.106], [0.06, -0.108], [0.03, -0.09], [0.0, -0.098], [-0.03, -0.108], [-0.12, -0.108], [-0.2, -0.104]];
    const holes = [[[0.04, -0.082], [0.035, -0.05], [0.06, -0.034], [0.115, -0.04], [0.11, -0.072], [0.085, -0.09], [0.06, -0.092]], [[-0.105, -0.09], [-0.1, -0.035], [-0.07, -0.022], [-0.03, -0.03], [-0.03, -0.086]]];
    b.p(body, 0.046, f, MAT.poly, holes, 0, 0.012); // core shell, heavily rounded edges
    b.p([[-0.255, -0.094], [-0.256, BY + 0.01], [-0.235, BY + 0.018], [-0.12, BY + 0.018], [-0.105, -0.03], [-0.11, -0.092], [-0.2, -0.1]], 0.056, f, MAT.poly, [], 0, 0.014); // bulbous rear shell (shoulder/cheek)
    b.p([[-0.1, -0.03], [-0.07, -0.016], [-0.02, -0.022], [-0.02, -0.03], [-0.07, -0.024], [-0.098, -0.036]], 0.05, g, MAT.poly, [], 0, 0.003); // thumbhole lip
    for (const s2 of [-1, 1]) b.p([[-0.098, -0.04], [-0.094, -0.088], [-0.04, -0.09], [-0.032, -0.036]], 0.004, g, MAT.grip, [], s2 * 0.0262, 0.0012); // stippled grip panels
    for (const s2 of [-1, 1]) b.p([[0.14, BY - 0.03], [0.2, BY - 0.012], [0.205, BY - 0.002], [0.15, BY - 0.018]], 0.003, g, MAT.grip, [], s2 * 0.0235, 0.001); // front thumb rests
    for (const s2 of [-1, 1]) b.rbox(s2 * 0.0236, BY - 0.012, -0.06, 0.0012, 0.0016, 0.34, 0x121314, MAT.rub); // moulded parting line
    b.p([[-0.2, BY + 0.024], [0.11, BY + 0.024], [0.118, BY + 0.034], [0.11, BY + 0.05], [-0.19, BY + 0.05], [-0.2, BY + 0.042]], 0.05, 0x4a463c, { r: 0.12, mt: 0.15 }, [], 0, 0.004); // smoked translucent mag
    if (LOD) for (let i = 0; i < 14; i++) b.pp.add(P.cyl, 0, BY + 0.037, -0.17 + i * 0.019, 0.0045, 0.052, 0.0045, 0xa88a4a, { ...MAT.steel, rz: Math.PI / 2 }); // rounds visible through the mag
    b.rbox(0, BY + 0.05, -0.192, 0.03, 0.006, 0.012, g, MAT.poly); for (let i = 0; i < 3; i++) b.box(0, BY + 0.052, -0.15 + i * 0.1, 0.044, 0.003, 0.006, 0x3a372f, { r: 0.2, mt: 0.1 }); // mag latch + ribs
    b.p([[0.03, BY + 0.05], [0.13, BY + 0.03], [0.14, BY + 0.05], [0.12, BY + 0.078], [0.06, BY + 0.08], [0.035, BY + 0.07]], 0.03, g, MAT.poly, [[[0.065, BY + 0.056], [0.11, BY + 0.054], [0.11, BY + 0.07], [0.068, BY + 0.072]]], 0, 0.006); // ring sight housing
    lens(b, 0.112, BY + 0.063, 0.0075, LENS.amber); b.pp.add(P.rbox2, 0, BY + 0.0, 0.17, 0.054, 0.034, 0.064, g, MAT.poly); // front barrel shroud
    for (const s2 of [-1, 1]) b.rbox(s2 * 0.026, BY + 0.002, 0.17, 0.004, 0.018, 0.04, f, MAT.grip); // shroud side pads
    b.cyl(0.19, 0.215, 0.0085, C.steel, MAT.park, BY - 0.012); muzzleDev(b, 'p90', 0.21, 0.011, BY - 0.012);
    b.p([[-0.262, BY + 0.012], [-0.268, BY + 0.0], [-0.27, -0.09], [-0.262, -0.1], [-0.255, -0.098], [-0.258, BY + 0.01]], 0.05, C.dark, MAT.rub, [], 0, 0.006); b.p([[0.002, -0.04], [0.02, -0.05], [0.016, -0.068], [0.004, -0.06]], 0.006, C.steel, MAT.steel); // curved butt pad + trigger
    b.pp.add(P.cyl, 0, -0.097, 0.02, 0.012, 0.05, 0.012, g, { ...MAT.poly, rz: Math.PI / 2 }); b.rbox(0, -0.108, -0.2, 0.02, 0.006, 0.04, 0x08090a, MAT.rub); // rotary selector + ejection chute
    for (const s2 of [-1, 1]) b.p([[0.09, BY - 0.034], [0.11, BY - 0.034], [0.104, BY - 0.022]], 0.004, C.dark, MAT.poly, [], s2 * 0.028); // charging handles
    slingQD(b, -0.2, BY - 0.02, 1, true, g);
    return { len: 0.27, railY: BY + 0.08, oz: 0.0, noOptic: true }; },
  // ---- shotguns ----
  m870(b) { const f = C.wood;
    b.p([[-0.06, BY - 0.03], [0.17, BY - 0.03], [0.17, BY + 0.025], [-0.04, BY + 0.03], [-0.06, BY + 0.02]], 0.04, C.blk, MAT.park); b.box(-0.0205, BY + 0.005, 0.07, 0.002, 0.02, 0.07, C.dark, MAT.park);
    trigGuard(b, 0.005, 0.075, BY - 0.03, C.blk, 0.03); b.cyl(0.17, 0.66, 0.0105, C.steel, MAT.park, BY + 0.008); b.cyl(0.17, 0.6, 0.012, C.steel, MAT.park, BY - 0.018); b.cyl(0.6, 0.62, 0.014, C.steel, MAT.park, BY - 0.012);
    b.geo(lathe([[0.016, 0], [0.022, 0.01], [0.022, 0.15], [0.016, 0.16]], 'pump'), 0, BY - 0.014, 0.25, f, MAT.wood); b.pp.list.at(-1).m.scale(new THREE.Vector3(1, 1.15, 1)); for (let i = 0; i < 8; i++) b.box(0, BY - 0.014, 0.27 + i * 0.016, 0.0475, 0.05, 0.004, C.woodD, MAT.wood);
    b.p([[-0.06, BY + 0.02], [-0.11, BY + 0.01], [-0.36, BY - 0.01], [-0.36, BY - 0.095], [-0.34, BY - 0.1], [-0.12, BY - 0.045], [-0.06, BY - 0.03]], 0.038, f, MAT.wood, [], 0, 0.006); b.box(0, BY - 0.045, -0.365, 0.04, 0.105, 0.014, C.dark, MAT.rub);
    b.box(0, BY + 0.022, 0.65, 0.004, 0.006, 0.004, 0xd8c070, MAT.steel);
    return { len: 0.66, railY: BY + 0.025, oz: 0.04 }; },
  m1014(b) { const f = C.poly;
    b.p([[-0.06, BY - 0.03], [0.19, BY - 0.03], [0.19, BY + 0.025], [-0.06, BY + 0.025]], 0.042, C.blk, MAT.park); b.rail(-0.04, 0.17, BY + 0.025, C.blk); b.box(-0.022, BY + 0.005, 0.07, 0.002, 0.02, 0.07, C.dark, MAT.park);
    trigGuard(b, 0.005, 0.075, BY - 0.03, C.blk, 0.03); arGrip(b, f); b.cyl(0.19, 0.62, 0.011, C.steel, MAT.park, BY + 0.008); b.cyl(0.19, 0.55, 0.013, C.steel, MAT.park, BY - 0.02); b.cyl(0.55, 0.57, 0.016, C.blk, MAT.park, BY - 0.016);
    b.rbox(0, BY - 0.012, 0.3, 0.05, 0.045, 0.2, f, MAT.poly); for (const z of [0.0, 0.6]) b.box(0, BY + 0.032, z === 0 ? -0.03 : 0.6, 0.02, 0.022, 0.012, C.dark, MAT.park);
    bufferStock(b, f, -0.06, 'm4'); return { len: 0.62, railY: BY + 0.025, oz: 0.04 }; },
  saiga(b) { const f = C.poly, rec = 0x2a2b2e;
    b.p([[-0.08, BY - 0.028], [0.21, BY - 0.028], [0.21, BY + 0.03], [-0.08, BY + 0.03]], 0.038, rec, MAT.park); b.rail(-0.06, 0.2, BY + 0.03, rec);
    b.p([[-0.03, BY - 0.028], [0.012, BY - 0.028], [0.0, -0.06], [-0.012, -0.1], [-0.04, -0.1], [-0.035, -0.06]], 0.028, f, MAT.grip, [], 0, 0.004); trigGuard(b, 0.01, 0.075, BY - 0.028, rec, 0.03);
    b.rbox(0, BY - 0.004, 0.31, 0.048, 0.05, 0.2, f, MAT.poly); b.cyl(0.21, 0.56, 0.012, C.steel, MAT.park, BY); muzzleDev(b, 'brake', 0.56, 0.012);
    curvedMag(b, 0.125, BY - 0.028, 0.15, 0.08, 0.036, 0.012, f, MAT.poly, 6, true);
    b.p([[-0.03, BY + 0.03], [0.2, BY + 0.03], [0.2, BY + 0.036], [-0.02, BY + 0.038]], 0.03, rec, MAT.park); b.rbox(-0.026, BY + 0.012, 0.14, 0.012, 0.008, 0.01, C.steel, MAT.steel); b.p([[0.02, BY - 0.012], [0.05, BY - 0.026], [0.05, BY - 0.018], [0.02, BY - 0.004]], 0.004, C.steel, MAT.steel, [], 0.021); // dust cover, charging handle, safety lever
    if (LOD) for (let i = 0; i < 6; i++) for (const s2 of [-1, 1]) b.rbox(s2 * 0.0245, BY - 0.004, 0.24 + i * 0.026, 0.002, 0.03, 0.008, 0x111213, MAT.rub); slingQD(b, -0.09, BY - 0.01, 1, true, rec);
    b.p([[-0.08, BY + 0.025], [-0.33, BY + 0.025], [-0.335, BY - 0.075], [-0.31, BY - 0.078], [-0.1, BY - 0.022]], 0.036, f, MAT.poly, [[[-0.27, BY + 0.008], [-0.13, BY + 0.008], [-0.13, BY - 0.012], [-0.27, BY - 0.045]]]);
    return { len: 0.62, railY: BY + 0.03, oz: 0.04 }; },
  aa12(b) { const f = 0x2a2c2a;
    b.p([[-0.32, BY - 0.07], [-0.32, BY + 0.04], [0.32, BY + 0.04], [0.32, BY - 0.02], [0.12, BY - 0.03], [-0.08, BY - 0.03], [-0.15, BY - 0.07]], 0.06, f, MAT.poly); b.rail(-0.2, 0.3, BY + 0.04, f);
    b.p([[-0.03, BY - 0.03], [0.012, BY - 0.03], [0.0, -0.06], [-0.012, -0.1], [-0.04, -0.1], [-0.035, -0.06]], 0.03, f, MAT.grip, [], 0, 0.004); trigGuard(b, 0.01, 0.075, BY - 0.03, f, 0.03);
    b.pp.add(P.cyl, 0, -0.07, 0.12, 0.075, 0.07, 0.075, f, { ...MAT.poly, rz: Math.PI / 2 }); // drum (axis along X)
    b.cyl(0.32, 0.47, 0.014, C.steel, MAT.park, BY); muzzleDev(b, 'brake', 0.47, 0.013); b.box(0, BY - 0.03, -0.32, 0.06, 0.11, 0.012, C.dark, MAT.rub);
    return { len: 0.52, railY: BY + 0.04, oz: 0.04 }; },
  // ---- DMR / sniper ----
  sr25(b) { ar15(b, { fur: C.fde, hg: 'mlok', hgCol: C.fdeD, hgLen: 0.33, len: 0.7, stock: 'crane' }); muzzleDev(b, 'brake', 0.7, 0.01); bipod(b, 0.42); return { len: 0.76, railY: BY + 0.031, oz: 0.05 }; },
  g28(b) { ar15(b, { fur: 0x6a5c45, rec: 0x5a4f3c, hg: 'quad', hgLen: 0.3, len: 0.72, stock: 'crane', mag: C.blk }); muzzleDev(b, 'brake', 0.72, 0.01); bipod(b, 0.42); return { len: 0.78, railY: BY + 0.031, oz: 0.05 }; },
  mk14(b) { const f = C.fde; b.p([[-0.08, BY - 0.035], [0.4, BY - 0.035], [0.4, BY + 0.03], [-0.08, BY + 0.03]], 0.05, f, MAT.anod); b.rail(-0.07, 0.38, BY + 0.03, f); for (const s of [-1, 1]) b.rail(0.25, 0.38, BY, f, s * 0.026, -s * Math.PI / 2);
    b.box(-0.026, BY + 0.01, 0.06, 0.008, 0.02, 0.1, C.steel, MAT.park); trigGuard(b, 0.008, 0.07, BY - 0.035, C.blk); arGrip(b, C.blk); b.cyl(0.4, 0.66, 0.0095, C.steel, MAT.park, BY); muzzleDev(b, 'brake', 0.66, 0.011);
    curvedMag(b, 0.11, BY - 0.035, 0.11, 0.07, 0.03, 0.006, C.blk, MAT.park, 4, true); bufferStock(b, C.blk, -0.08, 'crane'); bipod(b, 0.36); return { len: 0.72, railY: BY + 0.03, oz: 0.05 }; },
  svd(b) { const rec = 0x2a2b2e;
    b.p([[-0.08, BY - 0.026], [0.2, BY - 0.026], [0.2, BY + 0.024], [-0.08, BY + 0.024]], 0.034, rec, MAT.park); b.p([[-0.075, BY + 0.022], [0.18, BY + 0.022], [0.17, BY + 0.034], [-0.07, BY + 0.034]], 0.03, rec, MAT.park);
    trigGuard(b, 0.0, 0.065, BY - 0.026, rec, 0.03); b.p([[0.2, BY - 0.022], [0.43, BY - 0.018], [0.435, BY + 0.03], [0.2, BY + 0.03]], 0.044, C.wood, MAT.wood); for (let i = 0; i < 6; i++) for (const s of [-1, 1]) b.box(s * 0.022, BY + 0.005, 0.23 + i * 0.03, 0.002, 0.014, 0.01, 0x1a120c, MAT.rub);
    b.cyl(0.43, 0.82, 0.009, C.steel, MAT.park, BY); b.geo(lathe([[0.009, 0], [0.014, 0.01], [0.014, 0.07], [0.01, 0.08]], 'svdF'), 0, BY, 0.82, C.dark, MAT.park);
    curvedMag(b, 0.1, BY - 0.026, 0.11, 0.07, 0.028, 0.008, rec, MAT.park, 4, true);
    b.p([[-0.08, BY + 0.025], [-0.42, BY + 0.03], [-0.43, BY - 0.085], [-0.4, BY - 0.088], [-0.2, BY - 0.04], [-0.06, -0.1], [-0.03, -0.1], [-0.06, BY - 0.02], [-0.08, BY - 0.02]], 0.036, C.wood, MAT.wood, [[[-0.3, BY - 0.005], [-0.12, BY - 0.012], [-0.07, -0.05], [-0.1, -0.06], [-0.2, BY - 0.025], [-0.3, BY - 0.045]]]);
    b.p([[-0.24, BY + 0.03], [-0.38, BY + 0.031], [-0.38, BY + 0.05], [-0.25, BY + 0.048]], 0.03, C.woodD, MAT.wood); b.box(0, BY - 0.028, -0.428, 0.038, 0.12, 0.012, C.dark, MAT.rub);
    b.box(0.03, BY + 0.03, 0.06, 0.012, 0.03, 0.08, rec, MAT.park); b.cyl(-0.06, 0.18, 0.016, C.blk, MAT.anod, BY + 0.06, 0.03); b.cyl(0.14, 0.19, 0.022, C.blk, MAT.anod, BY + 0.06, 0.03); b.cyl(-0.1, -0.05, 0.02, C.dark, MAT.rub, BY + 0.06, 0.03); // PSO-1 (offset left)
    return { len: 0.9, railY: BY + 0.06, oz: 0.05, noOptic: true }; },
  awm(b) { const f = 0x4a5a3a;
    b.p([[-0.42, BY - 0.1], [-0.42, BY + 0.028], [-0.12, BY + 0.028], [-0.06, BY + 0.0], [0.38, BY + 0.0], [0.38, BY - 0.04], [0.06, BY - 0.045], [0.04, -0.105], [0.005, -0.105], [0.02, -0.05], [-0.07, -0.05], [-0.1, BY - 0.1]], 0.05, f, MAT.poly, [[[-0.075, -0.035], [-0.012, -0.032], [-0.03, -0.09], [-0.065, -0.09]], [[-0.36, BY - 0.02], [-0.18, BY - 0.02], [-0.16, BY - 0.075], [-0.36, BY - 0.075]]]);
    b.p([[-0.11, BY - 0.002], [0.17, BY - 0.002], [0.17, BY + 0.03], [-0.1, BY + 0.032]], 0.036, C.steel, MAT.park); b.rail(-0.08, 0.17, BY + 0.032, C.blk);
    
    b.pp.add(P.sph, -0.05, BY + 0.0, -0.04, 0.012, 0.012, 0.012, C.dark, MAT.park); b.box(-0.03, BY + 0.012, -0.04, 0.05, 0.006, 0.006, C.steel, MAT.steel, { rz: 0.5 });
    b.cyl(0.17, 0.66, 0.011, C.steel, MAT.park, BY); suppressor(b, 0.64, 0.022, 0.25); // AWM-F with integral .338 suppressor
    b.p([[-0.24, BY + 0.028], [-0.38, BY + 0.028], [-0.38, BY + 0.05], [-0.25, BY + 0.048]], 0.04, f, MAT.poly); b.box(0, BY - 0.035, -0.42, 0.05, 0.13, 0.014, C.dark, MAT.rub);
    curvedMag(b, 0.06, BY - 0.04, 0.07, 0.07, 0.032, 0, C.dark, MAT.park, 3); bipod(b, 0.34); return { len: 0.89, railY: BY + 0.032, oz: 0.03, supp: true }; },
  // ---- LMG ----
  m249(b) { const f = C.poly, rec = 0x2a2c2f;
    b.p([[-0.1, BY - 0.035], [0.2, BY - 0.035], [0.2, BY + 0.03], [0.12, BY + 0.05], [-0.1, BY + 0.05]], 0.05, rec, MAT.park); b.rail(-0.08, 0.1, BY + 0.05, rec);
    b.box(0, BY + 0.06, 0.15, 0.012, 0.06, 0.03, rec, MAT.park); b.p([[0.1, BY + 0.05], [0.3, BY + 0.05], [0.3, BY + 0.06], [0.11, BY + 0.06]], 0.012, rec, MAT.park); // carry handle
    trigGuard(b, 0.008, 0.07, BY - 0.035, rec); arGrip(b, f); b.rbox(0, BY - 0.012, 0.3, 0.06, 0.05, 0.2, f, MAT.poly); for (const s of [-1, 1]) b.rail(0.22, 0.38, BY - 0.012, f, s * 0.031, -s * Math.PI / 2);
    b.cyl(0.2, 0.68, 0.013, C.steel, MAT.park, BY); b.box(0, BY + 0.02, 0.48, 0.02, 0.012, 0.12, rec, MAT.park, { r: 0.6 }); muzzleDev(b, 'bird', 0.68, 0.013);
    b.rbox(0.0, -0.07, 0.09, 0.09, 0.12, 0.13, 0x5a5640, { r: 0.95, mt: 0 }); b.box(0, -0.008, 0.09, 0.075, 0.015, 0.05, C.dark, MAT.park); // ammo pouch + feed
    b.p([[-0.1, BY + 0.04], [-0.38, BY + 0.03], [-0.385, BY - 0.08], [-0.36, BY - 0.085], [-0.15, BY - 0.03], [-0.1, BY - 0.03]], 0.04, f, MAT.poly, [[[-0.32, BY + 0.01], [-0.16, BY + 0.018], [-0.16, BY - 0.012], [-0.32, BY - 0.06]]]);
    bipod(b, 0.55, true); return { len: 0.74, railY: BY + 0.05, oz: -0.02 }; },
  mg4(b) { const f = 0x2a2c2a;
    b.p([[-0.1, BY - 0.035], [0.22, BY - 0.035], [0.24, BY + 0.0], [0.22, BY + 0.045], [-0.1, BY + 0.045]], 0.052, f, MAT.poly); b.rail(-0.08, 0.2, BY + 0.045, f);
    trigGuard(b, 0.008, 0.07, BY - 0.035, f); arGrip(b, f); b.rbox(0, -0.07, 0.1, 0.08, 0.11, 0.12, 0x2e302e, MAT.poly);
    b.cyl(0.22, 0.66, 0.0135, C.steel, MAT.park, BY); b.box(0, BY + 0.03, 0.36, 0.012, 0.03, 0.03, f, MAT.poly); muzzleDev(b, 'cone', 0.66, 0.014);
    b.p([[-0.1, BY + 0.035], [-0.36, BY + 0.03], [-0.365, BY - 0.075], [-0.34, BY - 0.08], [-0.15, BY - 0.03], [-0.1, BY - 0.03]], 0.04, f, MAT.poly, [[[-0.3, BY + 0.01], [-0.16, BY + 0.015], [-0.16, BY - 0.012], [-0.3, BY - 0.055]]]);
    bipod(b, 0.52, true); return { len: 0.72, railY: BY + 0.045, oz: -0.02 }; },
  pkp(b) { const f = C.poly, rec = 0x2a2b2e;
    b.p([[-0.12, BY - 0.035], [0.18, BY - 0.035], [0.18, BY + 0.035], [-0.12, BY + 0.035]], 0.05, rec, MAT.park); b.p([[-0.11, BY + 0.035], [0.16, BY + 0.035], [0.15, BY + 0.05], [-0.1, BY + 0.05]], 0.046, rec, MAT.park);
    b.p([[-0.03, BY - 0.035], [0.012, BY - 0.035], [0.0, -0.065], [-0.012, -0.1], [-0.04, -0.1], [-0.035, -0.065]], 0.028, f, MAT.poly); trigGuard(b, 0.01, 0.075, BY - 0.035, rec);
    b.rbox(0.0, -0.075, 0.1, 0.07, 0.12, 0.13, C.od, MAT.park);
    b.cyl(0.18, 0.7, 0.016, C.steel, MAT.park, BY); b.geo(ribs(0.26, 0.016, 10, 1.25), 0, BY, 0.34, C.steel, MAT.park); b.cyl(0.18, 0.56, 0.008, rec, MAT.park, BY - 0.025); b.box(0, BY + 0.03, 0.42, 0.014, 0.05, 0.02, rec, MAT.park); muzzleDev(b, 'cone', 0.7, 0.015);
    b.p([[-0.12, BY + 0.03], [-0.42, BY + 0.03], [-0.425, BY - 0.085], [-0.4, BY - 0.088], [-0.14, BY - 0.03]], 0.036, f, MAT.poly, [[[-0.38, BY + 0.012], [-0.16, BY + 0.012], [-0.17, BY - 0.012], [-0.38, BY - 0.07]]]);
    bipod(b, 0.56, true); return { len: 0.76, railY: BY + 0.05, oz: -0.02 }; },
  // ---- pistols ----
  glock17(b) { return pistol(b, { slide: 0x2a2b2e, frame: 0x1c1d1f, len: 0.19, block: true }); },
  usp(b) { return pistol(b, { slide: 0x2a2b2e, frame: 0x1f2022, len: 0.2, block: true, round: true, hammer: true }); },
  m9(b) { return pistol(b, { slide: 0x2c2d30, frame: 0x2c2d30, len: 0.215, open: true, grips: 0x1e1f21, hammer: true }); },
  mp443(b) { return pistol(b, { slide: 0x2a2b2e, frame: 0x26272a, len: 0.2, block: true, hammer: true, front: true }); },
};
function bipod(b, z, big) { const L = big ? 0.2 : 0.17; b.box(0, BY - 0.022, z, 0.03, 0.012, 0.03, C.blk, MAT.park); for (const s of [-1, 1]) { b.box(s * 0.012, BY - 0.03, z - L / 2, 0.008, 0.008, L, C.blk, MAT.park); } }
function pistol(b, o) { // striker / hammer pistols: chamfered slide w/ rear (+ front) serrations, ejection port + barrel hood, dovetail sights, railed polymer frame, textured grip, mag floorplate
  const L = o.len, z0 = -0.05, y = 0.035, W = 0.0255, sl = o.slide;
  const top = o.round ? [[z0 + L, y + 0.012], [z0 + L - 0.004, y + 0.018], [z0 + L - 0.012, y + 0.02], [z0 + 0.006, y + 0.02], [z0, y + 0.014]] : [[z0 + L, y + 0.016], [z0 + L - 0.006, y + 0.02], [z0 + 0.004, y + 0.02], [z0, y + 0.016]];
  b.p([[z0, y - 0.012], [z0 + L, y - 0.012], ...top], W, sl, MAT.park, o.open ? [[[z0 + L * 0.42, y + 0.002], [z0 + L - 0.022, y + 0.002], [z0 + L - 0.022, y + 0.03], [z0 + L * 0.42, y + 0.03]]] : []);
  b.geo(profZ([[-W / 2 + 0.0035, 0], [W / 2 - 0.0035, 0], [W / 2 - 0.0005, -0.004], [-W / 2 + 0.0005, -0.004]], L - 0.01, 0.0006), 0, y + 0.0225, z0 + 0.004, sl, MAT.park); // top chamfer
  if (o.open) b.cyl(z0 + L * 0.4, z0 + L + 0.003, 0.0075, C.steel, MAT.steel, y + 0.008);
  b.cyl(z0 + L - 0.001, z0 + L + 0.0005, 0.0048, 0x050506, MAT.rub, y + 0.006);
  if (LOD) { for (let i = 0; i < 7; i++) for (const s2 of [-1, 1]) b.box(s2 * (W / 2 + 0.0003), y + 0.004, z0 + 0.008 + i * 0.0045, 0.0012, 0.02, 0.0018, 0x0d0d0e, MAT.rub, { rx: -0.25 }); if (o.front) for (let i = 0; i < 5; i++) for (const s2 of [-1, 1]) b.box(s2 * (W / 2 + 0.0003), y + 0.004, z0 + L - 0.04 + i * 0.0045, 0.0012, 0.018, 0.0018, 0x0d0d0e, MAT.rub, { rx: -0.25 }); }
  b.rbox(-W / 2 + 0.0004, y + 0.012, z0 + L * 0.42, 0.003, 0.012, 0.034, 0x08090a, MAT.rub); b.rbox(-0.001, y + 0.017, z0 + L * 0.42 - 0.012, 0.014, 0.008, 0.012, 0x34363a, MAT.steel); // ejection port + barrel hood
  b.p([[z0 + 0.004, y + 0.02], [z0 + 0.016, y + 0.02], [z0 + 0.014, y + 0.028], [z0 + 0.006, y + 0.028]], 0.018, C.dark, MAT.park, [[[z0 + 0.0, y + 0.024], [z0 + 0.02, y + 0.024], [z0 + 0.02, y + 0.03], [z0 + 0.0, y + 0.03]]]); for (const s2 of [-1, 1]) b.box(s2 * 0.0055, y + 0.025, z0 + 0.01, 0.006, 0.008, 0.01, C.dark, MAT.park); // rear sight w/ notch
  b.p([[z0 + L - 0.016, y + 0.02], [z0 + L - 0.006, y + 0.02], [z0 + L - 0.008, y + 0.027], [z0 + L - 0.014, y + 0.027]], 0.0035, C.dark, MAT.park); if (LOD) { b.pp.add(P.sph, 0, y + 0.0255, z0 + L - 0.0102, 0.0012, 0.0012, 0.0006, 0xe8e2c0, { r: 0.4, mt: 0 }); for (const s2 of [-1, 1]) b.pp.add(P.sph, s2 * 0.0055, y + 0.0275, z0 + 0.0158, 0.0011, 0.0011, 0.0006, 0xe8e2c0, { r: 0.4, mt: 0 }); } // sights + dots
  const fr = o.frame;
  b.p([[z0 + 0.006, y - 0.012], [z0 + L - 0.012, y - 0.012], [z0 + L - 0.012, y - 0.026], [0.07, y - 0.028], [0.066, y - 0.036], [0.06, y - 0.05], [0.05, y - 0.056], [0.02, y - 0.056], [0.012, y - 0.046], [0.002, -0.03], [-0.02, -0.1], [-0.06, -0.104], [-0.064, -0.09], [-0.042, -0.01], [z0 - 0.008, y - 0.012], [z0 - 0.004, y - 0.008]], 0.024, fr, MAT.poly,
    [[[0.018, y - 0.03], [0.058, y - 0.03], [0.054, y - 0.046], [0.047, y - 0.05], [0.025, y - 0.05], [0.017, y - 0.042]]]); // frame: raked grip, squared trigger guard, beavertail
  const zc = (yy) => -0.019 + 0.255 * (yy + 0.01);
  if (o.grips) b.p([[0.0, -0.012], [-0.004, -0.03], [-0.022, -0.094], [-0.056, -0.098], [-0.06, -0.088], [-0.04, -0.012]], 0.03, o.grips, MAT.check, [], 0, 0.004); // checkered grip panels
  else if (LOD) for (let i = 0; i < 9; i++) { const yy = -0.012 - i * 0.0095; for (const s2 of [-1, 1]) b.rbox(s2 * 0.0122, yy, zc(yy), 0.0012, 0.004, 0.03, 0x111213, MAT.rub, { rx: -0.25 }); } // grip ribs
  b.p([[-0.002, -0.022], [-0.018, -0.088], [-0.052, -0.092], [-0.04, -0.016]], 0.0258, fr, MAT.grip, [], 0, 0.0015); // stippled grip texture panel
  b.rbox(0, -0.107, -0.041, 0.026, 0.008, 0.046, C.dark, MAT.poly, { rx: -0.08 }); // mag floorplate
  if (o.block) b.rail(0.074, z0 + L - 0.014, y - 0.028, fr, 0, Math.PI);
  b.p([[0.03, y - 0.032], [0.036, y - 0.04], [0.032, y - 0.052], [0.026, y - 0.046]], 0.005, C.steel, MAT.steel); // trigger
  b.rbox(0.0135, y - 0.018, 0.022, 0.003, 0.006, 0.012, C.dark, MAT.park); b.pp.add(P.cyl, 0.0135, y - 0.022, 0.04, 0.0035, 0.004, 0.0035, C.dark, { ...MAT.park, rz: Math.PI / 2 }); // slide stop + takedown
  if (o.hammer) b.p([[z0 - 0.002, y - 0.006], [z0 - 0.012, y + 0.004], [z0 - 0.008, y + 0.008], [z0 + 0.002, y + 0.0]], 0.006, C.dark, MAT.park);
  return { len: L + z0, railY: y + 0.02, oz: 0.04, pistol: true };
}
// optics/attachments (y = rail top, z = optic centre)
const LENS = { red: 0x7a3326, blue: 0x3f6f8c, green: 0x3c6a4e, amber: 0x8a6a2a };
function lens(b, z, y, r, col, x = 0) { b.pp.add(P.cyl, x, y, z, r, 0.0016, r, col, { r: 0.03, mt: 0.95, rx: Math.PI / 2 }); }
function optic(b, kind, y, z) {
  if (kind === 'reddot') { // Aimpoint T-2 on a LaRue-style riser: tube with front/rear bells, elevation + windage turrets, flipped-open lens caps
    b.geo(profZ([[-0.0115, 0], [0.0115, 0], [0.0115, 0.006], [0.007, 0.016], [-0.007, 0.016], [-0.0115, 0.006]], 0.034, 0.0012), 0, y, z - 0.017, C.blk, MAT.anod); // riser
    b.rbox(0.014, y + 0.005, z, 0.008, 0.008, 0.02, C.blk, MAT.anod); b.p([[z - 0.012, y + 0.004], [z + 0.016, y + 0.006], [z + 0.016, y + 0.011], [z - 0.012, y + 0.009]], 0.004, C.dark, MAT.anod, [], 0.018); // throw lever (left)
    const cy = y + 0.032; b.geo(lathe([[0.0118, 0], [0.0152, 0.004], [0.0152, 0.012], [0.0138, 0.016], [0.0138, 0.032], [0.0152, 0.036], [0.0152, 0.046], [0.0118, 0.05]], 'aimT2'), 0, cy, z - 0.025, C.blk, MAT.anod);
    b.cyl(z - 0.008, z + 0.008, 0.0072, C.blk, MAT.anod, cy + 0.013); b.pp.add(P.cyl, -0.017, cy, z, 0.0072, 0.01, 0.0072, C.blk, { ...MAT.anod, rz: Math.PI / 2 }); // turrets (top, right)
    b.cyl(z - 0.006, z + 0.006, 0.0062, C.blk, MAT.anod, cy - 0.01, 0.0135); // battery cap (left)
    lens(b, z + 0.024, cy, 0.0118, LENS.red); lens(b, z - 0.024, cy, 0.0118, LENS.blue);
    if (LOD) for (const [zz, s] of [[z + 0.026, 1], [z - 0.026, -1]]) b.pp.add(P.cyl, 0.0, cy + 0.0165, zz, 0.0026, 0.004, 0.0026, 0x15161a, { ...MAT.rub, rz: Math.PI / 2 }); } // flip-cap hinges (caps removed)
  else if (kind === 'holo') { // EOTech EXPS3: low base with transverse battery bay, armoured hood with big window, rear control buttons, QD lever
    b.geo(profZ([[-0.0155, 0], [0.0155, 0], [0.0155, 0.012], [-0.0155, 0.012]], 0.092, 0.002), 0, y, z - 0.046, C.blk, MAT.anod);
    b.pp.add(P.cyl, 0, y + 0.012, z + 0.032, 0.0105, 0.031, 0.0105, C.blk, { ...MAT.anod, rz: Math.PI / 2 }); b.pp.add(P.cyl, 0.016, y + 0.012, z + 0.032, 0.0085, 0.003, 0.0085, C.dark, { ...MAT.anod, rz: Math.PI / 2 }); // battery cap
    b.p([[z - 0.034, y + 0.012], [z + 0.022, y + 0.012], [z + 0.022, y + 0.05], [z + 0.012, y + 0.056], [z - 0.024, y + 0.056], [z - 0.034, y + 0.05]], 0.034, C.blk, MAT.anod, [[[z - 0.03, y + 0.017], [z + 0.018, y + 0.017], [z + 0.018, y + 0.048], [z + 0.008, y + 0.0525], [z - 0.02, y + 0.0525], [z - 0.03, y + 0.048]]]); // hood side frame
    b.p([[z - 0.034, y + 0.05], [z + 0.022, y + 0.05], [z + 0.022, y + 0.057], [z - 0.034, y + 0.057]], 0.03, C.blk, MAT.anod, [], 0); // top strap
    b.box(0, y + 0.034, z + 0.008, 0.028, 0.03, 0.002, LENS.blue, { r: 0.03, mt: 0.9 }); b.box(0, y + 0.034, z - 0.032, 0.028, 0.03, 0.002, LENS.amber, { r: 0.03, mt: 0.9 });
    for (const dy of [0.006, -0.006]) b.rbox(-0.008, y + 0.018 + dy, z - 0.043, 0.006, 0.005, 0.004, 0x111214, MAT.rub); b.rbox(0.008, y + 0.018, z - 0.043, 0.006, 0.005, 0.004, 0x111214, MAT.rub); // buttons
    b.rbox(-0.018, y + 0.006, z - 0.012, 0.006, 0.009, 0.024, C.blk, MAT.anod); } // QD lever (right)
  else if (kind === 'acog') { // Trijicon TA31: tapered forged housing, fiber-optic strip + tritium cover on top, objective bell, eyepiece, thumb-nut mount
    b.geo(profZ([[-0.012, 0], [0.012, 0], [0.012, 0.009], [0.008, 0.016], [-0.008, 0.016], [-0.012, 0.009]], 0.06, 0.0012), 0, y, z - 0.035, C.blk, MAT.anod);
    for (const zz of [z - 0.018, z + 0.01]) { b.pp.add(P.cyl, 0.017, y + 0.006, zz, 0.0062, 0.008, 0.0062, C.blk, { ...MAT.anod, rz: Math.PI / 2 }); }
    const cy = y + 0.036; b.geo(lathe([[0.012, 0], [0.0165, 0.004], [0.0165, 0.02], [0.0158, 0.06], [0.0185, 0.075], [0.021, 0.09], [0.021, 0.118], [0.0175, 0.122]], 'ta31'), 0, cy, z - 0.055, C.blk, MAT.anod);
    b.geo(profZ([[-0.0105, -0.004], [0.0105, -0.004], [0.0105, 0.0], [0.006, 0.006], [-0.006, 0.006], [-0.0105, 0.0]], 0.07, 0.001), 0, cy + 0.0155, z - 0.04, C.blk, MAT.anod); // top flat
    b.geo(profZ([[-0.0028, 0], [0.0028, 0], [0.0028, 0.003], [-0.0028, 0.003]], 0.058, 0.0006), 0, cy + 0.0215, z - 0.032, 0x56c23a, { r: 0.3, mt: 0.1 }); // fiber optic
    b.cyl(z - 0.006, z + 0.006, 0.0075, C.blk, MAT.anod, cy + 0.01, -0.017); b.pp.add(P.cyl, -0.014, cy, z - 0.0, 0.0072, 0.012, 0.0072, C.blk, { ...MAT.anod, rz: Math.PI / 2 }); // adjuster caps
    lens(b, z + 0.067, cy, 0.0185, LENS.green); lens(b, z - 0.055, cy, 0.011, LENS.blue); }
  else if (kind === 'scope') { // variable sniper scope: rings w/ cap bolts, 30 mm tube, turret saddle, objective bell w/ sunshade, eyepiece + diopter ring, parallax knob
    for (const dz of [-0.045, 0.055]) { b.geo(profZ([[-0.012, 0], [0.012, 0], [0.012, 0.02], [0.016, 0.03], [-0.016, 0.03], [-0.012, 0.02]], 0.02, 0.0012), 0, y, z + dz - 0.01, C.blk, MAT.anod); b.cyl(z + dz - 0.01, z + dz + 0.01, 0.0185, C.blk, MAT.anod, y + 0.042); if (LOD) for (const s of [-1, 1]) b.pp.add(P.cyl, s * 0.0135, y + 0.034, z + dz, 0.0026, 0.004, 0.0026, C.steel, { ...MAT.steel, rz: Math.PI / 2 }); }
    const cy = y + 0.042; b.geo(lathe([[0.019, 0], [0.021, 0.006], [0.021, 0.035], [0.0175, 0.045], [0.0152, 0.06], [0.0152, 0.2], [0.02, 0.235], [0.0245, 0.25], [0.0245, 0.33], [0.022, 0.335]], 'scope2'), 0, cy, z - 0.11, C.blk, MAT.anod);
    b.cyl(z - 0.012, z + 0.03, 0.019, C.blk, MAT.anod, cy); b.cyl(z + 0.0, z + 0.022, 0.0125, C.blk, MAT.anod, cy + 0.022); b.pp.add(P.cyl, -0.026, cy, z + 0.011, 0.0125, 0.02, 0.0125, C.blk, { ...MAT.anod, rz: Math.PI / 2 }); b.pp.add(P.cyl, 0.024, cy, z + 0.011, 0.011, 0.014, 0.011, C.blk, { ...MAT.anod, rz: Math.PI / 2 });
    if (LOD) { b.geo(ribs(0.014, 0.0125, 4, 1.06), 0, cy + 0.03, z + 0.011, C.dark, MAT.anod, { rx: Math.PI / 2 }); b.geo(ribs(0.02, 0.021, 5, 1.04), 0, cy, z - 0.088, C.dark, MAT.anod); }
    lens(b, z + 0.222, cy, 0.0225, LENS.blue); lens(b, z - 0.108, cy, 0.017, LENS.green); }
}
export function hiDetail(fn) { const o = LOD; LOD = 1; try { return fn(); } finally { LOD = o; } }
export function buildWeapon(w, opt = 'reddot', muzzle = 'none', pp) {
  opt = ATT_LOOK[opt] || opt; muzzle = ATT_LOOK[muzzle] || muzzle; // B4: new optics/muzzles reuse existing models
  const id = w.id || w, type = w.type || 'rifle'; const b = new G(pp);
  const f = B[id] || (type === 'pistol' ? B.glock17 : type === 'smg' ? B.mp5 : type === 'shotgun' ? B.m870 : type === 'lmg' ? B.m249 : type === 'dmr' ? B.sr25 : B.m4a1);
  const info = f(b); if (type === 'dmr' && ['iron', 'reddot', 'holo', 'laser'].includes(opt)) opt = 'scope';
  if (!info.noOptic && !info.pistol && opt !== 'iron' && opt !== 'none' && opt !== 'laser') optic(b, opt, info.railY, info.oz ?? 0.05);
  if (opt === 'laser') b.rbox(-0.03, BY - 0.002, info.len * 0.6, 0.02, 0.025, 0.06, C.fde, MAT.poly);
  if (info.supp) { /* integral suppressor: no muzzle attachment */ }
  else if (muzzle === 'suppressor') suppressor(b, info.len - 0.01, info.pistol ? 0.016 : 0.019, info.pistol ? 0.15 : 0.17);
  else if (muzzle === 'compensator') muzzleDev(b, 'brake', info.len - 0.04, 0.011);
  pp.len = info.len; return pp;
}
