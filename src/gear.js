import { buildWeapon } from './guns.js';
import { FINISH_GLSL, finishUniforms } from './finish.js';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
// Parts = list of {g, m, col, kind, r, mt}. kind 1 = solid colour, 2 = camo x tint, 3 = flag patch (uv into flag atlas).
// The same parts feed rigid-skinned soldier gear (soldier.js) and standalone meshes for item thumbnails (thumbs.js).
const E = new THREE.Euler(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3();
export const P = {
  box: new THREE.BoxGeometry(1, 1, 1), rbox: new RoundedBoxGeometry(1, 1, 1, 2, 0.12), rbox2: new RoundedBoxGeometry(1, 1, 1, 3, 0.3),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14), cyl6: new THREE.CylinderGeometry(1, 1, 1, 8), sph: new THREE.SphereGeometry(1, 16, 12),
  dome: new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), domeLow: new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
  plane: new THREE.PlaneGeometry(1, 1), torus: new THREE.TorusGeometry(1, 0.18, 6, 18),
};
export class Parts {
  constructor() { this.list = []; this.base = new THREE.Matrix4(); }
  add(g, x, y, z, sx, sy, sz, col, o = {}) { const m = new THREE.Matrix4().compose(V.set(x, y, z), Q.setFromEuler(E.set(o.rx || 0, o.ry || 0, o.rz || 0)), S.set(sx, sy, sz)); this.list.push({ g, m: this.base.clone().multiply(m), col, kind: o.kind || 1, r: o.r ?? 0.8, mt: o.mt ?? 0, f: o.f ?? 0, uv: o.uv }); return this; }
  box(...a) { return this.add(P.rbox, ...a); } sharp(...a) { return this.add(P.box, ...a); }
  cyl(x, y, z, r, h, col, o) { return this.add(P.cyl, x, y, z, r, h, r, col, o); }
  // push a sub-frame (all subsequent parts are transformed by it)
  frame(m, fn) { const old = this.base; this.base = old.clone().multiply(m); fn(); this.base = old; return this; }
}
const tmpC = new THREE.Color();
// Edge wear: bevelled / rounded edges of extruded profiles and rounded boxes get a per-vertex wear weight (0..1)
// derived from the part-local normal: faces that are neither cap, wall nor axis-aligned are the bevels.
export function wearOf(g, n) {
  const w = g.userData.wear; if (!w) return 0;
  const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
  if (w === 'x' || w === 'z') { const a = w === 'x' ? ax : az; return a > 0.12 && a < 0.94 ? 1 : 0; }
  if (w === 'xs') return ax > 0.3 && ax < 0.85 ? 0.45 : 0; // big moulded radius: only the mid-radius rubs
  return Math.min(1, Math.max(0, (1 - Math.max(ax, ay, az)) * 4));
}
P.rbox.userData.wear = 'box'; P.rbox2.userData.wear = 'box';
// merge parts into one plain vertex-coloured geometry (for thumbnails/standalone meshes); rm = (roughness, metalness, wear)
export function partsGeometry(parts) {
  const pos = [], nor = [], col = [], rm = [], nm = new THREE.Matrix3();
  for (const p of parts.list) { const g = p.g.index ? p.g.toNonIndexed() : p.g; const a = g.attributes.position, n = g.attributes.normal; nm.getNormalMatrix(p.m); tmpC.set(p.col === 'camo' ? 0x8a7d5c : p.col);
    for (let i = 0; i < a.count; i++) { V.fromBufferAttribute(a, i).applyMatrix4(p.m); pos.push(V.x, V.y, V.z); V.fromBufferAttribute(n, i); const wr = wearOf(p.g, V); V.applyMatrix3(nm).normalize(); nor.push(V.x, V.y, V.z); col.push(tmpC.r, tmpC.g, tmpC.b); rm.push(p.r, p.mt, wr + 2 * (p.f || 0)); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('rm', new THREE.Float32BufferAttribute(rm, 3)); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
// Generated 128² tileable surface map: R = fbm grain (roughness variation / casting texture), G = fine scratches.
let grainT = null;
export function grainTex() {
  if (grainT) return grainT; const N = 128, d = new Uint8Array(N * N * 4); let sd = 1234567; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const oct = (f) => { const g = Array.from({ length: f * f }, rnd); return (x, y) => { const fx = x * f / N, fy = y * f / N, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const v = (i, j) => g[((j % f) + f) % f * f + ((i % f) + f) % f]; return (v(x0, y0) * (1 - sx) + v(x0 + 1, y0) * sx) * (1 - sy) + (v(x0, y0 + 1) * (1 - sx) + v(x0 + 1, y0 + 1) * sx) * sy; }; };
  const os = [oct(4), oct(8), oct(16), oct(32), oct(64)], sc = new Float32Array(N * N);
  for (let k = 0; k < 160; k++) { let x = rnd() * N, y = rnd() * N; const a = rnd() * Math.PI, l = 4 + rnd() * 26, s = 0.25 + rnd() * 0.75; for (let t = 0; t < l; t++) { sc[((Math.floor(y) % N + N) % N) * N + ((Math.floor(x) % N + N) % N)] = s; x += Math.cos(a); y += Math.sin(a); } }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0, am = 0.5, t = 0; for (const o of os) { v += o(x, y) * am; t += am; am *= 0.55; } const i = (y * N + x) * 4; d[i] = Math.round(v / t * 255); d[i + 1] = Math.round(sc[y * N + x] * 255); d[i + 2] = 0; d[i + 3] = 255; }
  grainT = new THREE.DataTexture(d, N, N); grainT.wrapS = grainT.wrapT = THREE.RepeatWrapping; grainT.magFilter = THREE.LinearFilter; grainT.minFilter = THREE.LinearMipmapLinearFilter; grainT.generateMipmaps = true; grainT.needsUpdate = true; return grainT;
}
// Shared GLSL (finish.js): triplanar grain + per-finish textures (anodized, parkerized, polymer, stipple, checkering, wood) + wear.
export const WEAR_GLSL = FINISH_GLSL;
// material honouring per-vertex roughness/metalness/wear (attribute rm), with the generated grain map
export function partsMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1 }); const U = { uGrain: { value: grainTex() }, ...finishUniforms() };
  m.onBeforeCompile = (s) => { Object.assign(s.uniforms, U); s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 rm; varying vec3 vRM; varying vec3 vOP; varying vec3 vON;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRM = rm; vOP = position; vON = normal;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRM; varying vec3 vOP; varying vec3 vON;\n' + WEAR_GLSL)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRM.x; float metalnessFactor = vRM.y; gunSurface(diffuseColor.rgb, roughnessFactor, metalnessFactor, vRM.z, vOP, normalize(vON));').replace('#include <metalnessmap_fragment>', '').replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (gBumpOn > 0.5) normal = gunBump(-vViewPosition, normal);'); };
  m.customProgramCacheKey = () => 'parts3'; return m;
}
// ===== WEAPONS (gun space: grip at origin, barrel +Z, top +Y, metres) =====
export function weaponParts(w, optic = 'reddot', muzzle = 'none', pp = new Parts()) { return buildWeapon(w, optic, muzzle, pp); }
// ===== GADGETS (for armory thumbnails) =====
export function gadgetParts(id) {
  const pp = new Parts(); const M = { r: 0.5, mt: 0.5 };
  switch (id) {
    case 'flash': pp.cyl(0, 0.07, 0, 0.03, 0.12, 0x3a3d40, M); for (let i = 0; i < 3; i++) pp.cyl(0, 0.03 + i * 0.04, 0, 0.031, 0.008, 0x1a1a1a); pp.box(0.028, 0.12, 0, 0.012, 0.08, 0.02, 0x6a6a62, M); pp.add(P.torus, -0.02, 0.15, 0, 0.012, 0.012, 0.012, 0xb0b0b0, M); break;
    case 'frag': pp.add(P.sph, 0, 0.05, 0, 0.035, 0.045, 0.035, 0x4a5236, { r: 0.6 }); pp.cyl(0, 0.1, 0, 0.012, 0.025, 0x6a6a62, M); pp.box(0.02, 0.09, 0, 0.01, 0.05, 0.015, 0x6a6a62, M); pp.add(P.torus, -0.02, 0.12, 0, 0.01, 0.01, 0.01, 0xb0b0b0, M); break;
    case 'smoke': pp.cyl(0, 0.07, 0, 0.032, 0.13, 0x6a7080, { r: 0.6 }); pp.cyl(0, 0.07, 0, 0.0325, 0.03, 0xe8e8e0); pp.box(0.03, 0.12, 0, 0.012, 0.08, 0.02, 0x6a6a62, M); break;
    case 'charge': pp.box(0, 0.025, 0, 0.16, 0.05, 0.08, 0xc8b88a, { r: 0.8 }); pp.box(0, 0.055, 0, 0.05, 0.02, 0.03, 0x2a2a2a); pp.cyl(0.06, 0.07, 0, 0.004, 0.06, 0xc23a2a); for (let i = 0; i < 3; i++) pp.sharp(0, 0.026, -0.03 + i * 0.03, 0.161, 0.051, 0.004, 0x2a2a2a); break;
    case 'lockpick': pp.box(0, 0.01, 0, 0.12, 0.02, 0.05, 0x3a3a3a); for (let i = 0; i < 4; i++) pp.sharp(0.08, 0.01, -0.018 + i * 0.012, 0.09, 0.003, 0.004, 0xb8b8b8, M); break;
    case 'medkit': pp.box(0, 0.05, 0, 0.16, 0.1, 0.08, 0x8a2a2a, { r: 0.85 }); pp.sharp(0, 0.05, 0.041, 0.06, 0.018, 0.002, 0xeeeeee); pp.sharp(0, 0.05, 0.041, 0.018, 0.06, 0.002, 0xeeeeee); break;
    case 'drone': pp.box(0, 0.03, 0, 0.08, 0.03, 0.08, 0x2a2c2e, M); for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { pp.sharp(x * 0.05, 0.03, z * 0.05, 0.1, 0.008, 0.012, 0x2a2c2e, { ry: x * z * 0.785 }); pp.cyl(x * 0.085, 0.045, z * 0.085, 0.045, 0.003, 0x5a5e62, M); } pp.add(P.sph, 0, 0.012, 0.035, 0.012, 0.012, 0.012, 0x0a0a0a, { r: 0.1, mt: 0.5 }); break;
  }
  return pp;
}
