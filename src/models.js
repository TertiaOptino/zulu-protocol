import * as THREE from 'three';
import { soldierOK, makeSoldier } from './soldier.js';
import { GB, mat } from './geo.js';
import { treeGeo } from './trees.js'; // batch3
export const charMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
const geoCache = new Map();
const DARK = 0x1d1e20, GUN = 0x26272a, BOOT = 0x2a2520;
const sph = new THREE.SphereGeometry(1, 10, 8), hsph = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
// style: {kind:'op'|'enemy'|'hostage'|'vip', uni, vest, helm, skin, armorLvl}
function bodyGeo(s) {
  const b = new GB();
  if (s.kind === 'vip') { b.box(0, 1.17, 0, 0.42, 0.52, 0.25, s.uni); b.box(0, 1.25, 0.11, 0.12, 0.3, 0.05, 0xe8e8e8); b.box(0, 1.25, 0.14, 0.04, 0.24, 0.02, 0x7a1e1e); }
  else if (s.kind === 'hostage') { b.box(0, 1.17, 0, 0.4, 0.5, 0.24, s.uni); }
  else {
    b.box(0, 1.17, 0, 0.4, 0.5, 0.24, s.uni);
    b.box(0, 1.2, 0, 0.44, 0.36, 0.3 + (s.armorLvl || 0) * 0.02, s.vest);
    for (let i = -1; i <= 1; i++) b.box(i * 0.12, 1.12, 0.17, 0.09, 0.11, 0.06, s.vest === s.uni ? DARK : s.vest);
    b.box(0, 1.26, -0.19, 0.3, 0.32, 0.12, s.kind === 'op' ? s.vest : DARK);
  }
  b.box(0, 0.94, 0, 0.41, 0.07, 0.26, DARK);
  b.geom(sph, mat(0, 1.56, 0, 0, 0, 0, 0.11, 0.12, 0.11), s.skin); // head
  b.box(0, 1.46, 0, 0.1, 0.06, 0.1, s.skin);
  if (s.kind === 'op') { b.geom(hsph, mat(0, 1.6, -0.005, 0, 0, 0, 0.135, 0.12, 0.14), s.helm); b.box(0, 1.65, 0.12, 0.08, 0.05, 0.05, DARK); b.box(0.13, 1.56, 0, 0.04, 0.08, 0.08, DARK); b.box(-0.13, 1.56, 0, 0.04, 0.08, 0.08, DARK); }
  else if (s.kind === 'enemy') { b.geom(hsph, mat(0, 1.57, 0, 0, 0, 0, 0.12, 0.13, 0.12), s.helm); b.box(0, 1.56, 0.09, 0.18, 0.04, 0.05, s.helm); }
  else if (s.kind === 'hostage') { b.geom(hsph, mat(0, 1.6, -0.01, 0, 0, 0, 0.115, 0.07, 0.115), 0x2b1d14); }
  else { b.geom(hsph, mat(0, 1.61, -0.01, 0, 0, 0, 0.115, 0.06, 0.115), 0x9a9a9a); }
  return b.build();
}
function legGeo(s) { const b = new GB(); const pants = s.kind === 'op' || s.kind === 'enemy' ? s.uni : s.kind === 'vip' ? s.uni : 0x3d4350; b.box(0, -0.38, 0, 0.15, 0.76, 0.17, pants, pants, pants); if (s.kind === 'op') b.box(0, -0.4, 0.09, 0.15, 0.1, 0.04, DARK); b.box(0, -0.83, 0.04, 0.16, 0.14, 0.26, s.kind === 'vip' ? 0x151515 : BOOT); const g = b.build(); return g; }
function armsGeo(s) {
  const b = new GB(); const sleeve = s.uni, hand = s.kind === 'op' ? DARK : s.skin;
  if (s.kind === 'hostage' || s.kind === 'vip') { // hands up / on head
    b.geom(new THREE.BoxGeometry(0.1, 0.36, 0.1), mat(0.24, 0.12, 0, 0, 0, -0.5), sleeve); b.geom(new THREE.BoxGeometry(0.1, 0.36, 0.1), mat(-0.24, 0.12, 0, 0, 0, 0.5), sleeve);
    b.geom(sph, mat(0.13, 0.3, 0, 0, 0, 0, 0.05, 0.05, 0.05), hand); b.geom(sph, mat(-0.13, 0.3, 0, 0, 0, 0, 0.05, 0.05, 0.05), hand);
    return b.build();
  }
  // shoulders at y=0 (pivot), gun forward along +z
  b.geom(new THREE.BoxGeometry(0.1, 0.1, 0.36), mat(0.15, -0.08, 0.14, 0.35, -0.35, 0), sleeve);
  b.geom(new THREE.BoxGeometry(0.1, 0.1, 0.42), mat(-0.12, -0.06, 0.2, 0.25, 0.45, 0), sleeve);
  b.geom(sph, mat(0.06, -0.16, 0.3, 0, 0, 0, 0.05, 0.05, 0.05), hand); b.geom(sph, mat(0.02, -0.12, 0.45, 0, 0, 0, 0.05, 0.05, 0.05), hand);
  const gl = s.gun === 'pistol' ? 0.22 : s.gun === 'dmr' ? 0.85 : s.gun === 'lmg' ? 0.78 : s.gun === 'smg' ? 0.5 : 0.66;
  b.box(0.05, -0.1, 0.18 + gl / 2, 0.06, 0.09, gl, GUN);
  if (s.gun !== 'pistol') { b.box(0.05, -0.18, 0.36, 0.04, 0.12, 0.06, GUN); b.box(0.05, -0.08, 0.1, 0.05, 0.08, 0.16, GUN); }
  if (s.gun === 'lmg') b.box(0.05, -0.18, 0.28, 0.1, 0.1, 0.12, 0x3a3f30);
  if (s.gun === 'dmr') b.box(0.05, -0.03, 0.4, 0.05, 0.05, 0.22, DARK);
  return b.build();
}
const ringGeo = new THREE.RingGeometry(0.4, 0.5, 32).rotateX(-Math.PI / 2);
// ===== CHARACTER MODEL CONTRACT (swap point for rigged GLB soldiers) =====
// makeCharacter(style) is the ONLY place character meshes are built. Callers: game.js (makeUnit) and main.js (squad preview).
// style: { kind: 'op'|'enemy'|'hostage'|'vip', uni, vest, helm, skin (hex colours), armorLvl 0-4, gun: weapon type, ring: hex }
// Must return { root: Group (positioned/rotated by game; y=0 floor, faces +Z), pose: Group (game sets pose.rotation.x for death/kneel),
//   body, legL, legR, arms: Object3D (game swings legL/legR.rotation.x for walk, arms.rotation.x for aim), ring: Mesh with .material.color }.
// A GLB version can keep this shape: put the SkinnedMesh under pose, expose bones (or dummy Object3Ds) as legL/legR/arms,
// and drive an AnimationMixer from those same values (or add an optional ch.update(dt, state) hook).
export function makeCharacter(style) {
  if (soldierOK()) return makeSoldier(style);
  style = { ...style, gun: style.gunType ?? style.gun, look: undefined };
  const key = JSON.stringify(style);
  let gs = geoCache.get(key); if (!gs) { gs = { body: bodyGeo(style), leg: legGeo(style), arms: armsGeo(style) }; geoCache.set(key, gs); }
  const root = new THREE.Group(); const pose = new THREE.Group(); root.add(pose);
  const body = new THREE.Mesh(gs.body, charMat); const legL = new THREE.Mesh(gs.leg, charMat), legR = new THREE.Mesh(gs.leg, charMat); const arms = new THREE.Mesh(gs.arms, charMat);
  legL.position.set(0.1, 0.92, 0); legR.position.set(-0.1, 0.92, 0); arms.position.set(0, 1.38, 0);
  for (const m of [body, legL, legR, arms]) { m.castShadow = true; m.receiveShadow = false; pose.add(m); }
  const ringMat = new THREE.MeshBasicMaterial({ color: style.ring ?? 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.y = 0.05; ring.renderOrder = 2; root.add(ring);
  return { root, pose, body, legL, legR, arms, ring };
}
// ---- static prop geometries (unit cell, centred at origin, y=0 floor) ----
export function propGeo(ch, theme) {
  if (ch === 'F' && theme && theme.tree) return treeGeo(theme.tree).clone(); // batch3: per-map tree species
  const b = new GB();
  switch (ch) {
    case 'c': b.box(0, 0.42, 0, 0.84, 0.84, 0.84, 0x8b6a40, 0x9a7a4e, 0x5e4528); b.box(0, 0.42, 0, 0.88, 0.1, 0.88, 0x6a4f2e); b.box(0, 0.8, 0, 0.88, 0.08, 0.88, 0x6a4f2e); break;
    case 'o': b.geom(cyl, mat(0, 0.45, 0, 0, 0, 0, 0.3, 0.9, 0.3), 0xffffff); b.geom(cyl, mat(0, 0.3, 0, 0, 0, 0, 0.31, 0.04, 0.31), 0xcccccc); b.geom(cyl, mat(0, 0.62, 0, 0, 0, 0, 0.31, 0.04, 0.31), 0xcccccc); break;
    case 't': b.box(0, 0.74, 0, 0.96, 0.06, 0.96, 0x5e3d24); for (const [x, z] of [[0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]]) b.box(x, 0.36, z, 0.06, 0.72, 0.06, 0x3e2a18); break;
    case 'k': b.box(0, 0.38, 0, 0.96, 0.76, 0.64, 0x6b5440, 0x7a6450, 0x3d3024); b.box(0.1, 0.94, 0, 0.42, 0.3, 0.04, 0x1a1a1c); b.box(0.1, 0.78, 0, 0.08, 0.06, 0.12, 0x1a1a1c); b.box(-0.3, 0.78, 0.15, 0.25, 0.02, 0.3, 0xe0ddd0); break;
    case 'p': b.geom(cyl, mat(0, 0.2, 0, 0, 0, 0, 0.22, 0.4, 0.22), 0x6b4e3a); b.geom(new THREE.IcosahedronGeometry(1, 0), mat(0, 0.75, 0, 0, 0, 0, 0.38, 0.5, 0.38), 0x3f5e30); break;
    case 'b': for (let r = 0; r < 3; r++) for (let i = -1; i <= 1; i += 2) b.box(i * 0.24 + (r % 2 ? 0.1 : -0.05), 0.15 + r * 0.27, 0, 0.46, 0.26, 0.6 - r * 0.05, 0xa08f6a, 0xb09f7a, 0x6e6248); break;
    case 's': b.box(0, 1.05, 0, 0.96, 2.1, 0.06, 0x4c5a6a); for (const x of [-0.46, 0.46]) b.box(x, 1.05, 0, 0.05, 2.1, 0.55, 0x3c4856); for (let i = 0; i < 4; i++) { b.box(0, 0.1 + i * 0.6, 0, 0.92, 0.04, 0.55, 0x5a6878); b.box(-0.2, 0.32 + i * 0.6, 0.02, 0.36, 0.4, 0.42, [0x9a7a4e, 0x8a6a40, 0x7a7a6a, 0xa48a5a][i]); b.box(0.24, 0.27 + i * 0.6, 0, 0.3, 0.3, 0.4, [0x7a7a6a, 0x9a7a4e, 0xa48a5a, 0x8a6a40][i]); } break;
    case 'C': b.box(0, 1.3, 0, 1.0, 2.6, 1.0, 0xffffff, 0xdddddd, 0x999999); break;
    case 'P': b.box(0, 1.3, 0, 0.62, 2.6, 0.62, theme.wall, theme.wall, 0x777777); break;
    case 'F': b.geom(cyl, mat(0, 0.9, 0, 0, 0, 0, 0.13, 1.8, 0.13), 0x4a3828); b.geom(new THREE.IcosahedronGeometry(1, 1), mat(0, 2.4, 0, 0, 0, 0, 1.0, 1.0, 1.0), 0x3b5230); b.geom(new THREE.IcosahedronGeometry(1, 1), mat(0.25, 3.1, 0.1, 0, 0, 0, 0.7, 0.7, 0.7), 0x445e36); break;
  }
  return b.build();
}
