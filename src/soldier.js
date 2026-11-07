import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import GLB from '../assets/soldier_tactical.glb';
import { Parts, P } from './gear.js';
import { weaponParts, wearOf, grainTex, WEAR_GLSL } from './gear.js'; import { gunLod } from './guns.js'; import { finishUniforms } from './finish.js';
import { buildHeadgear } from './headgear.js';
import { CAMOS, camoTex, flagAtlas, flagCell, DEFAULT_LOOK } from './looks.js';
import { WEAPONS } from './data.js';
import { gunBounds, w3Hold, w3bind, w3Gait, w3GaitInit } from './anim.js'; // w3
// ===== Realistic rigged soldier body + per-unit gear/camo =====
// BODY is the only body-specific config: swap the GLB + this block to change the base soldier.
// Source: "Tactical Soldier" by MissingTray1151 (Sketchfab), CC-BY 4.0 — Mixamo rig. Optimised by tools-soldier.mjs
// (7 materials -> one 2048 atlas, meshopt, WebP, 6 clips). Regions come from the atlas tile of each vertex.
export const BODY = {
  glb: GLB, scale: 0.93, height: 1.8,
  bones: { hips: 'mixamorigHips', spine: 'mixamorigSpine', spine1: 'mixamorigSpine1', chest: 'mixamorigSpine2', neck: 'mixamorigNeck', head: 'mixamorigHead', armL: 'mixamorigLeftArm', foreL: 'mixamorigLeftForeArm', handL: 'mixamorigLeftHand', armR: 'mixamorigRightArm', foreR: 'mixamorigRightForeArm', handR: 'mixamorigRightHand', thighL: 'mixamorigLeftUpLeg', shinL: 'mixamorigLeftLeg', footL: 'mixamorigLeftFoot', thighR: 'mixamorigRightUpLeg', shinR: 'mixamorigRightLeg', footR: 'mixamorigRightFoot' },
  // game state -> clip (static = one frame used as a pose). Missing clips fall back to bind pose + IK.
  clips: { stand: ['standing_firing', 0.25], walk: 'walking_firing', run: 'walking_firing', crouch: ['crouch_firing', 0.0], death: ['death_from_front_headshot', 'dying', 'crouch_death'] },
  walkSpeed: 1.3, runSpeed: 1.3,
  tiles: [[0, 0, 0.5, 0.5, 'top'], [0.5, 0, 1, 0.5, 'pants'], [0, 0.5, 0.5, 1, 'head'], [0.5, 0.5, 0.75, 0.75, 'helmet'], [0.75, 0.5, 1, 0.75, 'glove'], [0.5, 0.75, 0.75, 1, 'boot'], [0.75, 0.75, 1, 1, 'eyewear']],
  vestY: [0.98, 1.45], eyeY: 1.658, rimY: 1.688, chinY: 1.552, headC: [0, 1.67, 0.02], skullR: 0.098, faceZ: 0.122,
  torsoRe: /spine|hips/i,
};
// regions (per body vertex): 0 shirt, 1 pants, 2 vest, 3 helmet, 4 boots, 5 head skin, 6 hands, 7 eyewear. Gear: 10 solid, 11 camo x tint, 12 flag.
const R = { SHIRT: 0, PANTS: 1, VEST: 2, HELM: 3, BOOT: 4, HEAD: 5, HAND: 6, EYE: 7 };
const TILE_R = { top: -1, pants: R.PANTS, head: R.HEAD, helmet: R.HELM, glove: R.HAND, boot: R.BOOT, eyewear: R.EYE };
let T = null; // template
export const soldierReady = new Promise((res) => {
  try {
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(BODY.glb.buffer.slice(BODY.glb.byteOffset, BODY.glb.byteOffset + BODY.glb.byteLength), '', (g) => { try { T = prep(g); } catch (e) { console.warn('soldier prep failed', e); T = null; } res(!!T); }, (e) => { console.warn('soldier load failed', e); res(false); });
  } catch (e) { console.warn(e); res(false); }
});
export const soldierOK = () => !!T;
const W = new THREE.Vector3(), V = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), M = new THREE.Matrix4(), M2 = new THREE.Matrix4();
function poseClip(c, t, name) { // single-frame clip sampled from c at fraction t
  const tr = c.tracks.map(k => { const it = k.createInterpolant(); const v = Array.from(it.evaluate(t * c.duration)); return new k.constructor(k.name, [0], v); });
  return new THREE.AnimationClip(name, 1, tr);
}
function prep(g) {
  const scene = g.scene; let mesh = null; scene.traverse(o => { if (o.isSkinnedMesh && !mesh) mesh = o; }); if (!mesh) throw Error('no skinned mesh');
  const skel = mesh.skeleton, bones = skel.bones, names = bones.map(b => b.name);
  const bi = (n) => names.indexOf(n); const hips = bones[bi(BODY.bones.hips)]; const armature = hips.parent;
  armature.scale.multiplyScalar(BODY.scale); scene.updateMatrixWorld(true);
  const b0 = bones[0]; const X = b0.matrixWorld.clone().multiply(skel.boneInverses[0]).multiply(mesh.bindMatrix); const Xi = X.clone().invert();
  const geo = mesh.geometry; for (const k of Object.keys(geo.attributes)) { const a = geo.attributes[k]; if (a.isInterleavedBufferAttribute || a.normalized || !(a.array instanceof Float32Array) && k !== 'skinIndex') { const f = new Float32Array(a.count * a.itemSize); for (let i = 0; i < a.count; i++) for (let j = 0; j < a.itemSize; j++) f[i * a.itemSize + j] = a.getComponent(i, j); geo.setAttribute(k, new THREE.BufferAttribute(f, a.itemSize)); } }
  const pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, uv = geo.attributes.uv, n = pos.count;
  const region = new Float32Array(n * 4), bb = {};
  const img = mesh.material.map.image; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, 128, 128); const px = cx.getImageData(0, 0, 128, 128).data;
  const sumL = new Float32Array(8), cnt = new Float32Array(8), skinC = [0, 0, 0], lin = (v) => Math.pow(v / 255, 2.2); skinC.n = 0;
  const shell = new THREE.Box3(), headSkin = new THREE.Box3(), vestC = new THREE.Box3();
  for (let i = 0; i < n; i++) {
    V.fromBufferAttribute(pos, i).applyMatrix4(X); const u0 = uv.getX(i), v0 = uv.getY(i);
    let tile = 'top'; for (const t of BODY.tiles) if (u0 >= t[0] && u0 <= t[2] && v0 >= t[1] && v0 <= t[3]) { tile = t[4]; break; }
    let r = TILE_R[tile];
    if (r < 0) { let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } } r = BODY.torsoRe.test(names[best] || '') && V.y > BODY.vestY[0] && V.y < BODY.vestY[1] ? R.VEST : R.SHIRT; }
    region[i * 4] = r; (bb[r] = bb[r] || new THREE.Box3()).expandByPoint(V);
    if (r === R.HELM && V.y > BODY.eyeY + 0.035) shell.expandByPoint(V);
    if (r === R.VEST && Math.abs(V.x) < 0.07) vestC.expandByPoint(V);
    if (r === R.HEAD && V.y > BODY.eyeY - 0.03) headSkin.expandByPoint(V);
    const u = Math.min(127, Math.max(0, (u0 * 128) | 0)), v = Math.min(127, Math.max(0, (v0 * 128) | 0)); const o = (v * 128 + u) * 4;
    const L = 0.2126 * lin(px[o]) + 0.7152 * lin(px[o + 1]) + 0.0722 * lin(px[o + 2]); sumL[r] += L; cnt[r]++;
    if (r === R.HEAD && V.y < BODY.eyeY - 0.02 && V.y > BODY.chinY && V.z > 0.06) { skinC[0] += lin(px[o]); skinC[1] += lin(px[o + 1]); skinC[2] += lin(px[o + 2]); skinC.n++; }
  }
  const meanL = Array.from(sumL, (s, i) => cnt[i] ? s / cnt[i] : 0.2);
  const skin = skinC.n ? new THREE.Color(skinC[0] / skinC.n, skinC[1] / skinC.n, skinC[2] / skinC.n) : new THREE.Color(0.5, 0.35, 0.25);
  geo.setAttribute('gpar', new THREE.BufferAttribute(region, 4)); geo.setAttribute('gcol', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  // clips: drop scale tracks, pin hips x/z (in place); static poses sampled from clips
  const upL = new THREE.Vector3(0, 1, 0).applyQuaternion(armature.getWorldQuaternion(new THREE.Quaternion()).invert()); const upAx = [0, 1, 2].reduce((m, a) => Math.abs(upL.getComponent(a)) > Math.abs(upL.getComponent(m)) ? a : m, 0);
  const src = {}; for (const c of g.animations) {
    c.tracks = c.tracks.filter(t => !t.name.endsWith('.scale'));
    for (const t of c.tracks) if (t.name === hips.name + '.position') { // in-place: pin both horizontal axes (armature-local; Mixamo armatures are rotated, so 'up' is usually local z) to bind
      const v = t.values, n = v.length / 3; let dh = 0; for (const a of [0, 1, 2]) if (a !== upAx) dh += (v[(n - 1) * 3 + a] - v[a]) ** 2;
      c.userData = { speed: Math.sqrt(dh) * armature.scale.x / c.duration };
      if (!/death|dying|die/i.test(c.name)) for (let k = 0; k < v.length; k += 3) for (const a of [0, 1, 2]) if (a !== upAx) v[k + a] = hips.position.getComponent(a);
    }
    src[c.name] = c;
  }
  const clips = {};
  const tr = []; for (const b of bones) tr.push(new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', [0], b.quaternion.toArray()));
  tr.push(new THREE.VectorKeyframeTrack(hips.name + '.position', [0], hips.position.toArray())); clips.idle = new THREE.AnimationClip('idle', 1, tr);
  for (const [k, spec] of Object.entries(BODY.clips)) {
    if (Array.isArray(spec) && typeof spec[1] === 'number') { const c = src[spec[0]]; if (c) clips[k] = poseClip(c, spec[1], k); }
    else if (Array.isArray(spec)) clips[k] = spec.map(s => src[s]).filter(Boolean);
    else if (src[spec]) clips[k] = src[spec];
  }
  if (clips.death && !clips.death.length) delete clips.death;
  const speeds = { walk: clips.walk?.userData?.speed || BODY.walkSpeed, run: clips.run?.userData?.speed || BODY.runSpeed };
  // reference chest height per base pose (gun height follows the chest)
  const chest = bones[bi(BODY.bones.chest)]; const bindQ = Object.fromEntries(bones.map(b => [b.name, b.quaternion.clone()])); const mx = new THREE.AnimationMixer(armature); const chestY = {};
  for (const k of ['idle', 'stand', 'crouch']) { if (!clips[k]) continue; mx.stopAllAction(); mx.clipAction(clips[k]).play(); mx.update(0); scene.updateMatrixWorld(true); chestY[k] = chest.getWorldPosition(V).y; }
  mx.stopAllAction(); mx.clipAction(clips.idle).play(); mx.update(0); mx.stopAllAction(); scene.updateMatrixWorld(true); mx.uncacheRoot(armature);
  const map = mesh.material.map, normal = mesh.material.normalMap; for (const t of [map, normal]) if (t) t.anisotropy = 4;
  const tex = { map, normal, full: { map: map.image, normal: normal && normal.image } };
  if (typeof window !== 'undefined') window.__soldierDbg = { bb: Object.fromEntries(Object.entries(bb).map(([k, b]) => [k, [b.min.toArray().map(x => +x.toFixed(3)), b.max.toArray().map(x => +x.toFixed(3))]])), shell: [shell.min.toArray(), shell.max.toArray()], headSkin: [headSkin.min.toArray(), headSkin.max.toArray()], speeds, chestY, clips: Object.keys(clips), hipsY: hips.getWorldPosition(V).y };
  return { scene, mesh, geo, bones, names, bi, X, Xi, armature, hips, clips, speeds, chestY, bindQ, meanL, skin, bb, shell, headSkin, vestC, tex, hipsY: hips.getWorldPosition(new THREE.Vector3()).y, cache: new Map(), mats: new Map() };
}
let texQ = 'high';
export function setSoldierQuality(q) { // High: 2048 albedo / 1024 normal; Medium/Low: 1024 / 512 (Low) downscaled once
  texQ = q; if (!T) return; const t = T.tex; const half = (img, s) => { const c = document.createElement('canvas'); c.width = c.height = s; c.getContext('2d').drawImage(img, 0, 0, s, s); return c; };
  if (q === 'high') { t.map.image = t.full.map; if (t.normal) t.normal.image = t.full.normal; }
  else { t.small = t.small || { map: half(t.full.map, 1024), normal: t.normal && half(t.full.normal, 512) }; t.map.image = t.small.map; if (t.normal) t.normal.image = q === 'low' ? t.small.normal : t.full.normal; }
  t.map.needsUpdate = true; if (t.normal) t.normal.needsUpdate = true;
}
// ---------- gear per look (bind-space world metres, grouped by bone) ----------
const col = (c, fb) => (c == null ? fb : c);
function gearParts(look, st) {
  const out = {}; const B = BODY.bones; const P_ = (bone) => (out[bone] = out[bone] || new Parts());
  const hb = !T.shell.isEmpty() ? T.shell.clone() : new THREE.Box3(new THREE.Vector3(-0.13, 1.62, -0.13), new THREE.Vector3(0.13, 1.8, 0.15)); const hc = new THREE.Vector3(); hb.getCenter(hc); const hs = new THREE.Vector3(); hb.getSize(hs);
  const vb = T.bb[R.VEST] || new THREE.Box3(new THREE.Vector3(-0.2, 0.95, -0.15), new THREE.Vector3(0.2, 1.5, 0.17));
  const fz = T.vestC.isEmpty() ? vb.max.z : T.vestC.max.z, bz = T.vestC.isEmpty() ? vb.min.z : T.vestC.min.z; const H = P_(B.head), C = P_(B.chest), S1 = P_(B.spine1), S0 = P_(B.spine);
  const helmC = look.helmCol === 'camo' ? 'camo' : col(look.helmCol, 0x4a4d3c), DK = 0x1c1d1f, vc = look.vestCol ?? 0x5a5e44, pc = look.pouch ?? vc;
  const g = { r: 0.75 }, hard = { r: 0.5, mt: 0.1 }, cm = (c) => (c === 'camo' ? { kind: 2 } : {});
  const hTop = hb.max.y, hFront = hb.max.z;
  // ---- hair cap (the body's scalp is cut where the model helmet was; that helmet is always hidden now) ----
  { const hs2 = T.headSkin; const c2 = new THREE.Vector3(); hs2.getCenter(c2); const sz = new THREE.Vector3(); hs2.getSize(sz);
    const capC = look.face === 'balaclava' ? col(look.faceCol, 0x2a2c26) : col(look.hair, 0x2b1d14);
    H.add(P.domeLow, c2.x, BODY.eyeY + 0.035, c2.z - 0.012, sz.x * 0.5 * 0.97, (hs2.max.y - BODY.eyeY) * 0.95 + 0.03, sz.z * 0.5 * 0.93, capC, { r: 0.95 }); }
  buildHeadgear(H, look, st, { DK, cm, helmC, pc, eyeY: BODY.eyeY });
  // ---- vest additions over the base plate carrier ----
  const v = look.vest; const midY = (vb.min.y + vb.max.y) / 2;
  if (v === 'chest') { for (let i = 0; i < 4; i++) S1.box(-0.105 + i * 0.07, midY - 0.07, fz - 0.005, 0.06, 0.11, 0.03, pc, g); }
  if (v === 'heavy') {
    for (const [bn, s] of [[B.armL, 1], [B.armR, -1]]) { const a = T.bones[T.bi(bn)]; const ap = a.getWorldPosition(new THREE.Vector3()); P_(bn).box(ap.x + s * 0.06, ap.y - 0.03, ap.z, 0.13, 0.04, 0.15, vc, { rz: -s * 0.75, ...g }); }
    C.add(P.torus, 0, vb.max.y + 0.02, (fz + bz) / 2, 0.11, 0.1, 0.32, vc, { rx: Math.PI / 2, r: 0.85 });
    P_(B.hips).box(0, 0.86, fz - 0.03, 0.17, 0.15, 0.03, vc, { rx: -0.15, ...g });
  }
  if (v === 'police') { C.sharp(0, midY + 0.04, fz + 0.004, 0.26, 0.055, 0.006, 0xb8bcbf, { r: 0.7 }); C.sharp(0, midY + 0.04, fz + 0.008, 0.2, 0.018, 0.004, 0x1c1d20, { r: 0.7 }); }
  if (v === 'suit') { C.sharp(0, 1.36, fz - 0.03, 0.06, 0.16, 0.012, 0xe8e6e0, { r: 0.8 }); C.sharp(0, 1.33, fz - 0.022, 0.025, 0.15, 0.012, 0x6a1c22, { r: 0.7 }); }
  const opLike = st.kind === 'op' || st.kind === 'enemy';
  if (opLike && v !== 'none' && v !== 'suit') { // radio + antenna on back, hydration/back panel
    C.box(-0.07, vb.max.y - 0.12, bz + 0.01, 0.06, 0.13, 0.04, 0x26282a, g); C.cyl(-0.07, vb.max.y + 0.03, bz + 0.01, 0.004, 0.2, 0x111111, { r: 0.6 });
    S0.box(0, 0.965, 0.0, 0.36, 0.05, 0.29, 0x2a2a28, g); // belt
    P_(B.thighR).box(-0.165, 0.78, 0.02, 0.05, 0.13, 0.09, 0x1c1d1f, { r: 0.6 }); // thigh holster
  }
  if (st.cls === 'breacher') { C.box(0, midY + 0.04, bz - 0.03, 0.26, 0.34, 0.11, pc, g); C.box(0.0, midY + 0.17, bz - 0.07, 0.22, 0.06, 0.06, 0x8a3a1a, { r: 0.6 }); C.cyl(0.09, midY + 0.06, bz - 0.09, 0.02, 0.3, 0x3a3a3a, { r: 0.4, mt: 0.6 }); }
  if (st.cls === 'medic') { C.box(0, midY - 0.02, bz - 0.01, 0.16, 0.16, 0.06, pc, g); C.sharp(0, midY - 0.02, bz - 0.042, 0.07, 0.018, 0.004, 0xb22020, { r: 0.7 }); C.sharp(0, midY - 0.02, bz - 0.042, 0.018, 0.07, 0.004, 0xb22020, { r: 0.7 }); }
  if (st.cls === 'marksman' && opLike) H.box(0, hTop - 0.005, hc.z, 0.001, 0.001, 0.001, DK);
  // ---- flag patch on left upper arm ----
  if (st.kind === 'op' && st.country) {
    const a = T.bones[T.bi(B.armL)], f = T.bones[T.bi(B.foreL)]; const A = a.getWorldPosition(new THREE.Vector3()), F = f.getWorldPosition(new THREE.Vector3());
    const d = F.clone().sub(A).normalize(), nrm = new THREE.Vector3(-d.y, d.x, 0); if (nrm.x < 0) nrm.negate(); const up = d.clone().negate(), right = new THREE.Vector3().crossVectors(up, nrm);
    const p = A.clone().addScaledVector(d, 0.085).addScaledVector(nrm, 0.064); const m = new THREE.Matrix4().makeBasis(right, up, nrm).setPosition(p);
    const [u0, v0, du, dv] = flagCell(st.country); const pa = P_(B.armL); pa.frame(m, () => { pa.sharp(0, 0, -0.004, 0.072, 0.052, 0.006, 0x2a2a26, { r: 0.9 }); pa.add(P.plane, 0, 0, 0.0005, 0.064, 0.044, 1, 0xffffff, { kind: 3, r: 0.9, uv: [u0, v0, du, dv] }); });
  }
  return out;
}
// gun pose (model space, metres): grip position for aim / low ready
// gun placement in body space: [x, y, z, pitch (+ = muzzle down), yaw (+ = muzzle toward the soldier's left)]
// LOW is a real low-ready: grip by the right hip-bone line, rifle angled across the body so the support hand reaches the handguard
const AIM = { rifle: [-0.1, 1.45, 0.3, 0, 0], pistol: [-0.03, 1.43, 0.47, 0, 0] }, LOW = { rifle: [-0.075, 1.21, 0.16, 0.3, 0.4], pistol: [-0.04, 1.16, 0.28, 0.5, 0.1] };
function lookGeometry(look, st) {
  const key = JSON.stringify([look, st.kind, st.cls, st.country, st.gun, st.optic, st.muzzle, gunLod()]); let geo = T.cache.get(key); if (geo) return geo;
  const groups = gearParts(look, st); const gunBone = T.bones.length; // extra bone index
  let gunInfo = null;
  if (st.gun) { const w = WEAPONS.find(x => x.id === st.gun) || { id: st.gun, type: 'rifle' }; const pp = new Parts(); weaponParts(w, st.optic || 'reddot', st.muzzle || 'none', pp); groups.__gun = pp; gunInfo = { pistol: w.type === 'pistol', len: pp.len || 0.45 }; }
  // merge body + gear
  const base = T.geo; const nb = base.attributes.position.count; const parts = [];
  for (const [bn, pp] of Object.entries(groups)) { const bidx = bn === '__gun' ? gunBone : T.bi(bn); if (bidx < 0) continue; for (const p of pp.list) parts.push([p, bidx, bn === '__gun']); }
  let ng = 0; const geos = parts.map(([p]) => { const g = p.g.index ? p.g.toNonIndexed() : p.g; ng += g.attributes.position.count; return g; });
  const N = nb + ng; const pos = new Float32Array(N * 3), nor = new Float32Array(N * 3), uv = new Float32Array(N * 2), sI = new Uint16Array(N * 4), sW = new Float32Array(N * 4), gp = new Float32Array(N * 4), gc = new Float32Array(N * 3);
  pos.set(base.attributes.position.array); nor.set(base.attributes.normal.array); uv.set(base.attributes.uv.array); sI.set(base.attributes.skinIndex.array); sW.set(base.attributes.skinWeight.array); gp.set(base.attributes.gpar.array);
  if (look.vest === 'none' || look.vest === 'suit') { // civilians: sink the baked plate carrier into the torso so the shirt reads as cloth
    const v = new THREE.Vector3(), vi = [], bands = new Map(), q = (arr, f) => { arr.sort((x, y) => x - y); return arr[Math.min(arr.length - 1, Math.floor(arr.length * f))]; };
    for (let i = 0; i < nb; i++) { if (gp[i * 4] !== 2) continue; v.fromArray(pos, i * 3).applyMatrix4(T.X); const b = Math.floor(v.y / 0.05); let e = bands.get(b); if (!e) bands.set(b, (e = { x: [], z: [] })); e.x.push(Math.abs(v.x)); e.z.push(v.z); vi.push(i, b, v.x, v.y, v.z); }
    for (const e of bands.values()) { e.ex = q(e.x, 0.7); e.zf = q(e.z, 0.85); e.zb = q(e.z, 0.12); e.zc = (e.zf + e.zb) / 2; }
    for (let j = 0; j < vi.length; j += 5) { const e = bands.get(vi[j + 1]); let x = THREE.MathUtils.clamp(vi[j + 2], -e.ex, e.ex) * 0.9, z = e.zc + (THREE.MathUtils.clamp(vi[j + 4], e.zb, e.zf) - e.zc) * 0.86; v.set(x, vi[j + 3], z).applyMatrix4(T.Xi); pos.set([v.x, v.y, v.z], vi[j] * 3); }
  }
  const hide = new Set([R.HELM, R.EYE]);
  const bi0 = base.index.array, ga = base.attributes.gpar.array, idx = []; for (let t = 0; t < bi0.length; t += 3) if (!hide.has(ga[bi0[t] * 4])) idx.push(bi0[t], bi0[t + 1], bi0[t + 2]);
  let o = nb; const nm = new THREE.Matrix3(), c = new THREE.Color();
  const gunW = gunInfo ? gunBindWorld(gunInfo.pistol) : null;
  parts.forEach(([p, bidx, isGun], k) => {
    const g = geos[k]; const a = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv; const mw = isGun ? gunW.clone().multiply(p.m) : p.m; const ml = T.Xi.clone().multiply(mw); nm.getNormalMatrix(ml);
    const kind = p.kind === 3 ? 12 : p.col === 'camo' || p.kind === 2 ? 11 : 10; if (p.col !== 'camo') c.set(p.col); else c.setRGB(1, 1, 1);
    if (isGun) gunBounds(gunInfo, a, p.m); // w3: gun-space extents for the hold solver
    for (let i = 0; i < a.count; i++, o++) {
      V.fromBufferAttribute(a, i).applyMatrix4(ml); pos.set([V.x, V.y, V.z], o * 3); V.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); nor.set([V.x, V.y, V.z], o * 3);
      sI[o * 4] = bidx; sW[o * 4] = 1; gp.set([kind, p.r, p.mt, isGun ? 1 + wearOf(p.g, W.fromBufferAttribute(na, i)) + 2 * (p.f || 0) : 0], o * 4);
      if (kind === 12) { const [u0, v0, du, dv] = p.uv; gc.set([u0 + ua.getX(i) * du, v0 + ua.getY(i) * dv, 0], o * 3); } else gc.set([c.r, c.g, c.b], o * 3);
      idx.push(o);
    }
  });
  geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sI, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sW, 4)); geo.setAttribute('gpar', new THREE.BufferAttribute(gp, 4)); geo.setAttribute('gcol', new THREE.BufferAttribute(gc, 3));
  geo.setIndex(idx); geo.computeBoundingSphere(); geo.userData.gun = gunInfo; T.cache.set(key, geo); return geo;
}
function gunBindWorld(pistol) { const p = AIM[pistol ? 'pistol' : 'rifle']; return new THREE.Matrix4().makeTranslation(p[0], p[1], p[2]); }
// ---------- material ----------
const SH_V = `attribute vec4 gpar; attribute vec3 gcol; flat varying vec4 vGpar; varying vec3 vGcol; varying vec3 vBP; varying vec3 vBN; uniform mat4 uX; uniform vec4 uSkull; uniform float uNoHelm;`;
const SH_F = `flat varying vec4 vGpar; varying vec3 vGcol; varying vec3 vBP; varying vec3 vBN;
uniform sampler2D uCamo; uniform sampler2D uCamo2; uniform sampler2D uFlag; uniform float uMeanL[8]; uniform vec3 uSkinC; uniform vec3 uVest; uniform vec3 uHelm; uniform vec3 uBoot; uniform vec3 uGlove; uniform vec3 uFace; uniform vec3 uSkinT; uniform vec3 uHair;
uniform vec4 uMode; // x: helm mode (0 tex,1 colour,2 camo,3 hair), y: face mode (0 none,1 balaclava,2 shemagh), z: vest mode (0 colour,1 shirt camo), w: glove (0 colour, 1 skin)
uniform float uCamoS;
float lumi(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec3 tri(sampler2D t, vec3 p, vec3 n){ vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x+w.y+w.z+1e-4); p *= uCamoS; return texture2D(t, p.zy).rgb*w.x + texture2D(t, p.xz).rgb*w.y + texture2D(t, p.xy).rgb*w.z; }`;
const SH_MAP = `
  vec3 txc = texture2D(map, vMapUv).rgb; vec3 txb = texture2D(map, vMapUv, 3.5).rgb; float reg = vGpar.x + 0.5; vec3 cc;
  if (reg > 10.0) { cc = vGcol; if (reg > 11.0 && reg < 12.0) cc = tri(uCamo, vBP, vBN) * 1.05; if (reg > 12.0) cc = texture2D(uFlag, vGcol.xy).rgb; }
  else {
    int ri = int(reg); float Lb = lumi(txb), L = lumi(txc);
    float det = clamp(Lb / max(uMeanL[ri], 1e-3), 0.45, 1.7) * mix(1.0, clamp(L / max(Lb, 1e-3), 0.35, 2.2), 0.4);
    if (ri == 0) cc = tri(uCamo, vBP, vBN) * det;
    else if (ri == 1) cc = tri(uCamo2, vBP, vBN) * det;
    else if (ri == 2) cc = uMode.z > 0.5 ? tri(uCamo, vBP, vBN) * mix(1.0, det, 0.25) : uVest * det;
    else if (ri == 3) cc = uMode.x < 0.5 ? txc : uMode.x < 1.5 ? uHelm * det : uMode.x < 2.5 ? tri(uCamo, vBP, vBN) * det : uHair * clamp(det, 0.6, 1.3);
    else if (ri == 4) cc = uBoot * det;
    else if (ri == 6) cc = uMode.w > 0.5 ? uSkinC * clamp(det, 0.7, 1.3) : uGlove * det;
    else if (ri == 7) cc = txc;
    else { cc = txc * uSkinT; float eye = smoothstep(0.024, 0.016, abs(vBP.y - ${BODY.eyeY.toFixed(3)})) * step(0.04, vBP.z);
      if (uMode.y > 0.5 && uMode.y < 1.5) cc = mix(uFace * det, cc, eye);
      else if (uMode.y > 1.5) cc = mix(cc, uFace * det, smoothstep(${(BODY.eyeY - 0.03).toFixed(3)}, ${(BODY.eyeY - 0.045).toFixed(3)}, vBP.y)); }
  }
  diffuseColor.rgb *= cc;`;
function lookMaterial(look, st) {
  const key = JSON.stringify([look, st.skin, st.kind]); let m = T.mats.get(key); if (m) return m;
  m = new THREE.MeshStandardMaterial({ map: T.tex.map, normalMap: T.tex.normal, roughness: 0.85, metalness: 0, normalScale: new THREE.Vector2(1, 1) });
  const lin = (h) => new THREE.Color(h); const skinT = st.skin != null ? new THREE.Color(st.skin).multiply(new THREE.Color(1 / T.skin.r, 1 / T.skin.g, 1 / T.skin.b)).multiplyScalar(0.72) : new THREE.Color(1, 1, 1);
  const camoId = CAMOS[look.camo] ? look.camo : 'multicam', pantsId = look.pants && CAMOS[look.pants] ? look.pants : camoId;
  const hasHelm = look.helm && look.helm !== 'none';
  const helmMode = !hasHelm ? 3 : look.helm === 'highcut' || look.helm === 'mich' ? (look.helmCol === 'camo' ? 2 : look.helmCol != null ? 1 : 0) : 1;
  const faceMode = look.face === 'balaclava' ? 1 : look.face === 'shemagh' ? 2 : 0;
  const vestMode = look.vest === 'none' ? 1 : 0;
  const hc = T.Xi.clone(); const skC = new THREE.Vector3(...BODY.headC).applyMatrix4(T.Xi); const skR = BODY.skullR / T.X.getMaxScaleOnAxis();
  const U = { uCamo: { value: camoTex(camoId) }, uCamo2: { value: camoTex(pantsId) }, uFlag: { value: flagAtlas() }, uMeanL: { value: T.meanL }, uVest: { value: lin(look.vestCol ?? 0x5a5e44) }, uHelm: { value: lin(look.helmCol && look.helmCol !== 'camo' ? look.helmCol : 0x4a4d3c) },
    uBoot: { value: lin(look.boot ?? 0x5e4c38) }, uGlove: { value: lin(look.glove ?? 0x2a2a28) }, uFace: { value: lin(look.faceCol ?? 0x2a2c26) }, uSkinT: { value: skinT }, uSkinC: { value: new THREE.Color(st.skin ?? 0xc99a74) }, uHair: { value: lin(look.hair ?? 0x2b1d14) },
    uMode: { value: new THREE.Vector4(helmMode, faceMode, vestMode, look.glove == null ? 1 : 0) }, uCamoS: { value: 1.6 }, uX: { value: T.X }, uSkull: { value: new THREE.Vector4(skC.x, skC.y, skC.z, skR) }, uNoHelm: { value: hasHelm ? 0 : 1 }, uGrain: { value: grainTex() }, ...finishUniforms() };
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\n' + SH_V).replace('#include <begin_vertex>', `#include <begin_vertex>
      vGpar = gpar; vGcol = gcol;
      vBP = (uX * vec4(transformed, 1.0)).xyz; vBN = normalize(mat3(uX) * normal);`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\n' + SH_F + WEAR_GLSL).replace('#include <map_fragment>', SH_MAP)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness; float metalnessFactor = metalness; if (vGpar.x > 9.5) { roughnessFactor = vGpar.y; metalnessFactor = vGpar.z; if (vGpar.w > 0.5) gunSurface(diffuseColor.rgb, roughnessFactor, metalnessFactor, vGpar.w - 1.0, vBP, normalize(vBN)); } else if (abs(vGpar.x - 5.0) < 0.1) roughnessFactor = 0.62; else if (abs(vGpar.x - 3.0) < 0.1 || abs(vGpar.x - 7.0) < 0.1) roughnessFactor = 0.55;`)
      .replace('#include <metalnessmap_fragment>', '')
      .replace('#include <normal_fragment_maps>', `vec3 nGeo = normal;\n#include <normal_fragment_maps>\nif (vGpar.x > 9.5 || (uMode.z > 0.5 && abs(vGpar.x - 2.0) < 0.1)) normal = nGeo;\nif (gBumpOn > 0.5) normal = gunBump(-vViewPosition, normal);`);
  };
  m.customProgramCacheKey = () => 'soldier4'; T.mats.set(key, m); return m;
}
// ---------- runtime character ----------
const ringGeo = new THREE.RingGeometry(0.4, 0.5, 32).rotateX(-Math.PI / 2);
let shadows = true; export function setSoldierShadows(v) { shadows = v; }
const BASES = ['idle', 'stand', 'walk', 'run', 'crouch'];
export function makeSoldier(style) {
  const look = style.look || DEFAULT_LOOK; const geo = lookGeometry(look, style); const mat = lookMaterial(look, style);
  const root = new THREE.Group(), pose = new THREE.Group(); root.add(pose);
  const cont = T.armature.clone(false); cont.position.copy(T.armature.position); cont.quaternion.copy(T.armature.quaternion); cont.scale.copy(T.armature.scale); pose.add(cont);
  const hips = T.hips.clone(true); cont.add(hips); const byName = {}; hips.traverse(b => { byName[b.name] = b; });
  const bones = T.names.map(n => byName[n]); const gun = new THREE.Bone(); gun.name = 'gun'; gun.matrixAutoUpdate = false; cont.add(gun);
  const inv = T.mesh.skeleton.boneInverses.slice(); const gi = geo.userData.gun;
  const gunInv = gunBindWorld(gi ? gi.pistol : false).invert().multiply(T.X).multiply(M.copy(T.mesh.bindMatrix).invert()); inv.push(gunInv);
  const skel = new THREE.Skeleton([...bones, gun], inv);
  const mesh = new THREE.SkinnedMesh(geo, mat); mesh.position.copy(T.mesh.position); mesh.quaternion.copy(T.mesh.quaternion); mesh.scale.copy(T.mesh.scale);
  T.mesh.parent === T.armature ? cont.add(mesh) : pose.add(mesh); mesh.bind(skel, T.mesh.bindMatrix); mesh.castShadow = shadows; mesh.frustumCulled = false;
  const mixer = new THREE.AnimationMixer(cont); const act = {};
  for (const k of BASES) { const c = T.clips[k]; if (!c) continue; const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); act[k] = a; }
  if (act.walk && act.run && T.clips.walk === T.clips.run) { act.run = mixer.clipAction(T.clips.run.clone()); act.run.play(); act.run.setEffectiveWeight(0); }
  act.idle.setEffectiveWeight(1);
  let death = null; if (T.clips.death) { const dc = T.clips.death[Math.floor(Math.random() * T.clips.death.length)]; death = mixer.clipAction(dc); death.setLoop(THREE.LoopOnce, 1); death.clampWhenFinished = true; death.timeScale = dc.duration > 3 ? 1.35 : 1.1; }
  const ringMat = new THREE.MeshBasicMaterial({ color: style.ring ?? 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.y = 0.05; ring.renderOrder = 2; root.add(ring);
  const D = () => new THREE.Object3D();
  const B = {}; for (const [k, n] of Object.entries(BODY.bones)) B[k] = byName[n];
  const S = { w: Object.fromEntries(BASES.map(k => [k, k === 'idle' ? 1 : 0])), last: null, spd: 0, aimK: 0, kick: 0, fired: 0, kneelK: 0, armed: !!gi, gi, ph: Math.random() * 10, death, dying: false, deadDone: false, stride: 1, bones, mixQ: null };
  S.bq = Object.fromEntries(['thighL', 'thighR', 'shinL', 'shinR'].filter(n => B[n] && T.bindQ[B[n].name]).map(n => [n, T.bindQ[B[n].name]])); // bind pose (before any clip runs) for stride scaling
  const fingers = (side) => { const pre = 'mixamorig' + side + 'Hand'; const ch = (n) => [1, 2, 3].map(i => byName[pre + n + i]); const f = { idx: ch('Index'), mid: ch('Middle'), ring: ch('Ring'), pin: ch('Pinky') }; return f.mid[0] && f.idx[0] && f.pin[0] ? f : null; };
  S.fingL = fingers('Left'); S.fingR = fingers('Right');
  const ch = { root, pose, body: mesh, legL: D(), legR: D(), arms: D(), ring, mixer, soldier: true, deathClip: !!death, B, S };
  ch.update = (dt, st = {}) => { if (!root.visible) { S.last = null; if (!(st.dying && S.death)) return; } animate(ch, B, cont, gun, act, S, dt, st); };
  ch.update(0, {}); return ch;
}
const tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion(), tv = new THREE.Vector3(), tv2 = new THREE.Vector3(), tv3 = new THREE.Vector3(), tm = new THREE.Matrix4(), tm2 = new THREE.Matrix4(), ts = new THREE.Vector3();
function wpos(o, v = new THREE.Vector3()) { return v.setFromMatrixPosition(o.matrixWorld); }
// rotate bone so that world-direction `from` maps to `to` (both from the bone's pivot)
function aimBone(b, from, to) {
  if (from.lengthSq() < 1e-10 || to.lengthSq() < 1e-10) return; tq.setFromUnitVectors(from.normalize(), to.normalize());
  b.matrixWorld.decompose(tv3, tq2, ts); tq2.premultiply(tq); b.parent.matrixWorld.decompose(tv3, Q2, ts); b.quaternion.copy(Q2.invert().multiply(tq2)); b.updateMatrixWorld(true);
}
function ik(a, b, c, target, pole) {
  const A = wpos(a), Bp = wpos(b), C = wpos(c); const l1 = A.distanceTo(Bp), l2 = Bp.distanceTo(C);
  const dir = target.clone().sub(A); const d = THREE.MathUtils.clamp(dir.length(), Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.999); dir.normalize();
  const ca = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), sa = Math.sqrt(1 - ca * ca);
  const pd = pole.clone().sub(A); pd.addScaledVector(dir, -pd.dot(dir)); if (pd.lengthSq() < 1e-8) pd.set(0, -1, 0); pd.normalize();
  const Bd = A.clone().addScaledVector(dir, ca * l1).addScaledVector(pd, sa * l1);
  aimBone(a, Bp.clone().sub(A), Bd.clone().sub(A));
  const B2 = wpos(b), C2 = wpos(c); aimBone(b, C2.clone().sub(B2), A.clone().addScaledVector(dir, d).sub(B2));
}
// orient a hand so its fingers point along fd and its pinky->index axis along sd (world), then curl the fingers
const HM = new THREE.Matrix4(), HM2 = new THREE.Matrix4(), HQ = new THREE.Quaternion(), hv = [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3());
function handFrame(f, s, out) { const F = f.clone().normalize(); const S = s.clone().addScaledVector(F, -s.dot(F)).normalize(); return out.makeBasis(F, S, F.clone().cross(S)); }
function gripHand(hand, fing, fd, sd, curl, left) {
  if (!fing) return;
  // the clips only key the first knuckle, so reset every finger joint to bind each frame before curling (otherwise the curl accumulates frame after frame and the fingers spin = "floppy hands")
  for (const c of [fing.idx, fing.mid, fing.ring, fing.pin]) for (const b of c) if (b && T.bindQ[b.name]) b.quaternion.copy(T.bindQ[b.name]); hand.updateMatrixWorld(true);
  const h = wpos(hand, hv[0]);
  const cf = wpos(fing.mid[0], hv[1]).sub(h), cs = wpos(fing.idx[0], hv[2]).sub(wpos(fing.pin[0], hv[3]));
  handFrame(cf, cs, HM); handFrame(fd, sd, HM2); HQ.setFromRotationMatrix(HM2.multiply(HM.invert()));
  hand.matrixWorld.decompose(tv3, tq2, ts); tq2.premultiply(HQ); hand.parent.matrixWorld.decompose(tv3, Q2, ts); hand.quaternion.copy(Q2.invert().multiply(tq2)); hand.updateMatrixWorld(true);
  const F = wpos(fing.mid[0], hv[1]).sub(wpos(hand, hv[0])).normalize(), Sx = wpos(fing.idx[0], hv[2]).sub(wpos(fing.pin[0], hv[3])).normalize();
  const pn = F.clone().cross(Sx).multiplyScalar(left ? 1 : -1); const ax = F.clone().cross(pn).normalize();
  for (const ch of [fing.idx, fing.mid, fing.ring, fing.pin]) for (let i = 0; i < 3; i++) if (ch[i]) rotW(ch[i], ax, curl * (window.__curlK ?? 1) * (i === 0 ? 0.8 : 1));
}
w3bind({ ik, rotW, wpos, gripHand }); // w3
const GE = new THREE.Euler(); const lerp = THREE.MathUtils.lerp; const UPV = new THREE.Vector3(0, 1, 0);
function rotW(b, axis, ang) { tq.setFromAxisAngle(axis, ang); b.matrixWorld.decompose(tv3, tq2, ts); tq2.premultiply(tq); b.parent.matrixWorld.decompose(tv3, Q2, ts); b.quaternion.copy(Q2.invert().multiply(tq2)); b.updateMatrixWorld(true); }
// ---- store preview: a library of short idle actions played back in random order ----
// Each action writes into P (pose params) with its own easing; lh = support-hand keyframes [u, target] where target is
// 'guard' (handguard), a gun-space point {g:[x,y,z]} or a body-space point {p:[x,y,z]}, optionally with hand orientation.
const sm = (k) => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
const bump = (u, a, b, c, d) => Math.min(sm((u - a) / (b - a)), 1 - sm((u - c) / (d - c))); // 0 -> 1 over a..b, hold, 1 -> 0 over c..d
const LOOK_KEYS = [[0, 0], [0.14, 0], [0.25, 0.62], [0.42, 0.62], [0.56, -0.58], [0.74, -0.58], [0.86, 0], [1, 0]];
function keys(K, u) { for (let i = 1; i < K.length; i++) { const [t1, v1] = K[i], [t0, v0] = K[i - 1]; if (u <= t1) return v0 + (v1 - v0) * sm((u - t0) / Math.max(1e-6, t1 - t0)); } return K[K.length - 1][1]; }
const MAG = { g: [0.0, -0.1, 0.06] }, MAGP = { g: [0.0, -0.085, 0.05] }, BOLT = { g: [0.03, -0.005, 0.0] };
const POUCH = { p: [0.13, 1.03, 0.16], fd: [0, -1, 0.3], sd: [0, 0, 1], curl: 0.75 };
const RADIO = { p: [0.075, 1.36, 0.17], fd: [-0.5, 1, 0.1], sd: [0, 0, 1], curl: 0.35 };
export const SHOW_ACTS = {
  look: { d: 7, f(u, P) { const l = keys(LOOK_KEYS, u); P.sY += l * 0.14; P.hY += l * 0.85; P.hP += Math.abs(l) * 0.06; } },
  check: { d: 4.6, f(u, P) { const w = bump(u, 0.08, 0.3, 0.72, 0.92); P.gy += 0.13 * w; P.gz += 0.02 * w; P.pit -= 0.32 * w; P.yaw += 0.12 * w; P.rol += 0.55 * w; P.hP += 0.3 * w; P.hY += 0.12 * w;
    P.rol += Math.sin(Math.max(0, u - 0.3) * 9) * 0.08 * bump(u, 0.3, 0.4, 0.62, 0.72); } },
  shoulder: { d: 5, f(u, P) { const w = bump(u, 0.08, 0.27, 0.74, 0.92); P.aim = Math.max(P.aim, w); const sc = bump(u, 0.27, 0.34, 0.66, 0.74) * Math.sin((u - 0.27) / 0.47 * Math.PI * 2); P.sY += sc * 0.22; P.hY += sc * 0.05; } },
  reload: { d: 5.4, f(u, P) { const w = bump(u, 0.04, 0.16, 0.86, 0.97); P.rol += 0.38 * w; P.pit -= 0.12 * w; P.gy += 0.05 * w; P.yaw -= 0.06 * w; P.hP += 0.32 * w; P.hY -= 0.1 * w;
    P.gy += 0.012 * bump(u, 0.64, 0.66, 0.67, 0.7); }, lh: [[0, 'guard'], [0.14, MAG], [0.2, MAG], [0.34, POUCH], [0.44, POUCH], [0.58, MAGP], [0.65, MAG], [0.7, MAG], [0.77, BOLT], [0.8, BOLT], [0.93, 'guard'], [1, 'guard']] },
  kneel: { d: 6.5, f(u, P) { P.kn = bump(u, 0.06, 0.28, 0.72, 0.94); const sc = bump(u, 0.3, 0.38, 0.62, 0.7) * Math.sin((u - 0.3) / 0.4 * Math.PI * 2); P.hY += sc * 0.5; } },
  turn: { d: 5.6, f(u, P, side) { const w = bump(u, 0.1, 0.34, 0.66, 0.9); P.turn += side * 0.8 * w; P.hY += side * 0.35 * bump(u, 0.02, 0.16, 0.6, 0.8); } },
  radio: { d: 4.4, f(u, P) { const w = bump(u, 0.08, 0.26, 0.74, 0.92); P.pit += 0.3 * w; P.yaw -= 0.1 * w; P.gy -= 0.02 * w; P.hR += 0.12 * w; P.hP += 0.1 * w; P.hY += 0.18 * w; },
    lh: [[0, 'guard'], [0.08, 'guard'], [0.26, RADIO], [0.74, RADIO], [0.92, 'guard'], [1, 'guard']] },
  nod: { d: 3.2, f(u, P) { const w = bump(u, 0.05, 0.15, 0.85, 0.95); const n = Math.max(0, u - 0.2) / 0.6; P.hP += w * (0.05 + (n < 1 ? 0.13 * (0.5 - 0.5 * Math.cos(n * Math.PI * 4)) : 0)); } },
};
function nextAct(S) {
  if (!S.bag || !S.bag.length) { const ks = Object.keys(SHOW_ACTS); for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; } if (ks[ks.length - 1] === S.lastAct) ks.unshift(ks.pop()); S.bag = ks; }
  return S.bag.pop();
}
// advance the preview sequence; returns pose params + the active action (for the support hand)
function showPose(S, dt) {
  const Q = S.show ||= { act: null, t: 0, rest: 1.2, side: 1, forced: null };
  if (window.__showAct === 'idle') { Q.act = null; Q.rest = 1; Q.forced = null; } else
  if (window.__showAct && window.__showAct !== Q.forced) { Q.forced = window.__showAct; Q.act = Q.forced; Q.t = 0; Q.rest = 0; } // tests: pin an action
  if (!Q.act) { Q.rest -= dt; if (Q.rest <= 0) { Q.act = nextAct(S); S.lastAct = Q.act; Q.t = 0; Q.side = Math.random() < 0.5 ? 1 : -1; } }
  else { Q.t += dt; const A = SHOW_ACTS[Q.act]; if (Q.forced && window.__showU != null) Q.t = A.d * window.__showU; if (Q.t >= A.d) { { Q.act = null; Q.forced = null; window.__showAct = null; Q.rest = 0.9 + Math.random() * 1.6; } } }
  const P = { gx: 0, gy: 0, gz: 0, pit: 0, yaw: 0, rol: 0, aim: 0, sY: 0, hY: 0, hP: 0, hR: 0, kn: 0, turn: 0, u: 0, A: null, side: Q.side };
  if (Q.act) { const A = SHOW_ACTS[Q.act]; P.u = Math.min(1, Q.t / A.d); P.A = A; A.f(P.u, P, Q.side); }
  return P;
}
function animate(ch, B, cont, gun, act, S, dt, st) {
  const root = ch.root; const p = root.position;
  // ---- death: play a death clip once, then freeze ----
  if ((st.dying || st.dead) && S.death) {
    if (!S.dying) { S.dying = true; for (const n in act) act[n].fadeOut(0.15); S.death.reset().fadeIn(0.15).play(); }
    if (!S.deadDone) { ch.mixer.update(dt); if (S.death.time >= S.death.getClip().duration - 1e-3) S.deadDone = true; }
    return;
  }
  const SP = st.show && S.armed && !st.dead ? showPose(S, dt) : null; if (SP) ch.pose.rotation.y = SP.turn;
  if (S.last && dt > 0) { const sp = Math.hypot(p.x - S.last.x, p.z - S.last.z) / dt; S.spd = lerp(S.spd, Math.min(sp, 8), Math.min(1, dt * 8)); } S.last = { x: p.x, z: p.z };
  const dead = !!st.dead, kneel = !!st.kneel && !dead;
  const moving = !dead && !kneel && S.spd > 0.25; const run = moving && S.spd > 2.3;
  const armedStand = S.armed && act.stand;
  const bound = kneel && !!st.handsUp; // hostage: kneel on both knees, hands behind head
  const crouchClip = kneel && act.crouch && !bound && !S.bound;
  const tw = { idle: 0, stand: 0, walk: moving && !run ? 1 : 0, run: run ? 1 : 0, crouch: crouchClip ? 1 : 0 };
  const W3G = !window.__w3off && !!S.g; // w3: procedural gait replaces the walk / run clips
  if ((!moving || W3G) && !crouchClip) { if (armedStand && !st.show && !(W3G && moving)) tw.stand = 1; /* w3: upright base pose while walking */ else tw.idle = 1; } // show (store preview): upright bind stance, not the wide firing crouch
  if (!act.run && run) tw.walk = 1; if (W3G) { tw.walk = 0; tw.run = 0; } // w3
  if (SP && act.crouch) { tw.crouch = SP.kn; tw.idle = 1 - SP.kn; tw.stand = 0; }
  const k = dead || dt === 0 || SP ? 1 : Math.min(1, dt * 8); // preview: the action curves are already eased
  for (const n in act) { S.w[n] = lerp(S.w[n], tw[n], k); act[n].setEffectiveWeight(S.w[n]); }
  // gait: match the clip to ground speed so feet don't skate. Faster than the clip's natural pace -> longer stride (leg swing amplified about bind) + quicker cadence
  const ratioW = S.spd / T.speeds.walk; S.stride = ratioW > 1 ? Math.min(1.5, 1 + (ratioW - 1) * 0.35) : 1;
  if (act.walk) act.walk.timeScale = THREE.MathUtils.clamp(ratioW / S.stride, 0.5, 2.2); if (act.run) act.run.timeScale = THREE.MathUtils.clamp(S.spd / T.speeds.run / S.stride, 0.6, 2.2);
  if (!S.hip0) { S.hip0 = B.hips.position.clone(); w3GaitInit({ ch, B, S }); /* w3: bind-pose leg data */ } else B.hips.position.copy(S.hip0); // undo last frame's kneel offset (clips may not key hip position)
  if (bound) S.bound = true; else if (S.kneelK < 0.02) S.bound = false;
  // three's PropertyMixer only writes a bone when the blended clip value changed since its last write, so a held pose (single-key idle, paused clip)
  // would keep last frame's IK / look rotations and they would pile up frame after frame. Put back the pure clip pose first, then let the mixer update it.
  if (!dead) { if (S.mixQ) for (let i = 0; i < S.bones.length; i++) S.bones[i].quaternion.copy(S.mixQ[i]); ch.mixer.update(dt); if (!S.mixQ) S.mixQ = S.bones.map(b => b.quaternion.clone()); else for (let i = 0; i < S.bones.length; i++) S.mixQ[i].copy(S.bones[i].quaternion); }
  if (S.g && !window.__w3off) { if (S.last && dt > 0) { const yw = Math.atan2(ch.pose.matrixWorld.elements[8], ch.pose.matrixWorld.elements[10]), vx = S.pp ? (p.x - S.pp.x) / dt : 0, vz = S.pp ? (p.z - S.pp.z) / dt : 0; S.vx = vx * Math.cos(yw) - vz * Math.sin(yw); S.vz = vx * Math.sin(yw) + vz * Math.cos(yw); } S.pp = { x: p.x, z: p.z }; if (st.spd != null) { S.vx = 0; S.vz = 1; } if (!dead && !bound) w3Gait({ ch, B, S, dt, moving, spd: S.spd, mv: st.mv }); } // w3
  const gaitW = window.__w3off ? Math.min(1, (S.w.walk || 0) + (S.w.run || 0)) : 0; if (!dead && gaitW > 0.02 && S.stride > 1.01) { const m = 1 + (S.stride - 1) * gaitW; for (const n in S.bq) B[n].quaternion.copy(S.bq[n].clone().slerp(B[n].quaternion, m)); }
  S.kneelK = lerp(S.kneelK, kneel ? 1 : 0, dead || dt === 0 ? 1 : Math.min(1, dt * 6));
  root.updateMatrixWorld(true);
  const toW = (x, y, z, v = new THREE.Vector3()) => v.set(x, y, z).applyMatrix4(ch.pose.matrixWorld);
  // idle breathing / sway
  S.ph += dt; if (!moving && !dead) { B.chest.rotateX(Math.sin(S.ph * 1.6) * 0.012); B.chest.updateMatrixWorld(true); }
  // kneel fallback (no crouch clip): legs IK, hips lowered
  if ((!act.crouch || S.bound) && S.kneelK > 0.01) {
    const hy = lerp(0, -0.4, S.kneelK); const hw = wpos(B.hips, new THREE.Vector3()); hw.y += hy; hw.z -= 0.06 * S.kneelK; B.hips.position.copy(B.hips.parent.worldToLocal(hw)); B.hips.updateMatrixWorld(true);
    const fy = (y, a) => lerp(a, y, S.kneelK);
    const fl = wpos(B.footL, new THREE.Vector3()).applyMatrix4(tm.copy(ch.pose.matrixWorld).invert()), fr = wpos(B.footR, new THREE.Vector3()).applyMatrix4(tm);
    ik(B.thighL, B.shinL, B.footL, toW(fy(0.11, fl.x), fy(0.1, fl.y), fy(-0.4, fl.z)), toW(0.12, 0.3, 1.2));
    ik(B.thighR, B.shinR, B.footR, toW(fy(-0.11, fr.x), fy(0.1, fr.y), fy(-0.4, fr.z)), toW(-0.12, 0.3, 1.2));
    if (S.kneelK > 0.5) { rotW(B.footL, toW(1, 0, 0).sub(toW(0, 0, 0)).normalize(), 0.9 * S.kneelK); rotW(B.footR, toW(1, 0, 0).sub(toW(0, 0, 0)).normalize(), 0.9 * S.kneelK); }
  }
  const chestNow = wpos(B.chest, tv2).applyMatrix4(tm.copy(ch.pose.matrixWorld).invert()).y;
  const dy = chestNow - (T.chestY.idle ?? chestNow); // body drop vs bind (crouch / walk bob)
  if (S.armed && !dead) {
    S.aimK = SP ? SP.aim : lerp(S.aimK, st.aim ? 1 : 0, dt === 0 ? 1 : Math.min(1, dt * 7)); if ((st.fired || 0) !== S.fired) { S.fired = st.fired || 0; S.kick = 1; } S.kick = Math.max(0, S.kick - dt * 9);
    const side = toW(1, 0, 0).sub(toW(0, 0, 0)).normalize(), fwd = toW(0, 0, 1).sub(toW(0, 0, 0)).normalize();
    if (SP) { // store preview: support side forward (left shoulder toward the camera side), head squared up, then the action's head/torso moves
      const t = 1 - SP.aim; rotW(B.spine1, UPV, (S.gi.pistol ? 0 : -0.14) * t + SP.sY); rotW(B.neck, UPV, (S.gi.pistol ? 0 : 0.12) * t + SP.hY * 0.45); rotW(B.head, UPV, SP.hY * 0.55);
      rotW(B.head, side, SP.hP); rotW(B.head, fwd, SP.hR); B.spine1.updateMatrixWorld(true);
    } else if (!act.stand && !S.gi.pistol) { rotW(B.spine1, UPV, 0.32); rotW(B.neck, UPV, -0.3); }
    if (!window.__w3off && !S.gi.pistol && w3Hold({ ch, B, S, cont, gun, SP, dt, dy, toW })) { /* w3: new rifle hold (src/anim.js) */ } else {
    const pis = S.gi.pistol; const a = AIM[pis ? 'pistol' : 'rifle'], l = LOW[pis ? 'pistol' : 'rifle'], t = S.aimK, o = SP || { gx: 0, gy: 0, gz: 0, pit: 0, yaw: 0, rol: 0 };
    const gx = lerp(l[0], a[0], t) + o.gx, gy = lerp(l[1], a[1], t) + dy * 0.9 + o.gy, gz = lerp(l[2], a[2], t) - S.kick * 0.035 + o.gz;
    GE.set(lerp(l[3], a[3], t) - S.kick * 0.09 + o.pit, lerp(l[4], a[4], t) + o.yaw, o.rol, 'YXZ'); tm.makeRotationFromEuler(GE).setPosition(gx, gy, gz); tm2.copy(ch.pose.matrixWorld).multiply(tm); gun.matrix.copy(cont.matrixWorld).invert().multiply(tm2); gun.updateMatrixWorld(true);
    const G = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(gun.matrixWorld);
    const gX = new THREE.Vector3().setFromMatrixColumn(gun.matrixWorld, 0).normalize(), gY = new THREE.Vector3().setFromMatrixColumn(gun.matrixWorld, 1).normalize(), gZ = new THREE.Vector3().setFromMatrixColumn(gun.matrixWorld, 2).normalize();
    // right hand on the pistol grip, always
    const hand = pis ? G(0.0, -0.05, -0.01) : G(0, -0.055, -0.005); ik(B.armR, B.foreR, B.handR, hand, toW(-0.6, 0.6 + dy, -0.4));
    // support hand: on the handguard, or following the action's keyframes (mag, pouch, bolt, radio)
    const sz = Math.min(0.16, S.gi.len * 0.3);
    const guard = pis ? G(0.015, -0.06, -0.02) : G(0.04, -0.042, sz - 0.03);
    const gFd = pis ? gZ.clone().addScaledVector(gX, -0.6) : gX.clone().negate().addScaledVector(gZ, 0.45).addScaledVector(gY, 0.25), gSd = pis ? gY.clone() : gZ.clone(), gCurl = pis ? 0.6 : 0.85;
    const tgt = (k) => { if (k === 'guard') return { v: guard, fd: gFd, sd: gSd, curl: gCurl }; if (k.g) return { v: G(...k.g), fd: gFd, sd: gSd, curl: 0.8 };
      const d = (x) => toW(...x).sub(toW(0, 0, 0)); return { v: toW(k.p[0], k.p[1] + dy, k.p[2]), fd: d(k.fd), sd: d(k.sd), curl: k.curl }; };
    let sup = guard, lFd = gFd, lSd = gSd, lCurl = gCurl;
    const LH = SP && SP.A && SP.A.lh; if (LH) { let i = 1; while (i < LH.length - 1 && SP.u > LH[i][0]) i++; const A0 = tgt(LH[i - 1][1]), A1 = tgt(LH[i][1]); const kk = sm((SP.u - LH[i - 1][0]) / Math.max(1e-6, LH[i][0] - LH[i - 1][0]));
      sup = A0.v.clone().lerp(A1.v, kk); lFd = A0.fd.clone().normalize().lerp(A1.fd.clone().normalize(), kk); lSd = A0.sd.clone().normalize().lerp(A1.sd.clone().normalize(), kk); lCurl = lerp(A0.curl, A1.curl, kk); }
    ik(B.armL, B.foreL, B.handL, sup, toW(0.55, 0.3 + dy, -0.5));
    if (pis) gripHand(B.handR, S.fingR, gZ.clone().addScaledVector(gY, -0.3), gY, 0.85, false);
    else gripHand(B.handR, S.fingR, gZ.clone().addScaledVector(gY, -0.45).addScaledVector(gX, 0.25), gY.clone().addScaledVector(gZ, 0.3), 0.95, false);
    gripHand(B.handL, S.fingL, lFd, lSd, lCurl, true);
    if (window.__dbgHands) { const r = wpos(B.handL, new THREE.Vector3()).distanceTo(sup), r2 = wpos(B.handR, new THREE.Vector3()).distanceTo(hand); (window.__handErr ||= []).push([+r.toFixed(3), +r2.toFixed(3), +t.toFixed(2)]); window.__marks = [sup.clone(), hand.clone(), G(0, 0, 0)]; }
    } // w3
  } else if (st.handsUp && !dead) { // hands laced behind the head, elbows out
    const hd = wpos(B.head, new THREE.Vector3()).applyMatrix4(tm.copy(ch.pose.matrixWorld).invert());
    ik(B.armR, B.foreR, B.handR, toW(hd.x - 0.075, hd.y + 0.02, hd.z - 0.13), toW(-0.9, hd.y + 0.05, hd.z + 0.25)); ik(B.armL, B.foreL, B.handL, toW(hd.x + 0.075, hd.y + 0.02, hd.z - 0.13), toW(0.9, hd.y + 0.05, hd.z + 0.25));
    const X = toW(1, 0, 0).sub(toW(0, 0, 0)).normalize(), Y = toW(0, 1, 0).sub(toW(0, 0, 0)).normalize();
    gripHand(B.handR, S.fingR, X.clone().addScaledVector(Y, 0.3), Y.clone().negate(), 0.35, false); gripHand(B.handL, S.fingL, X.clone().negate().addScaledVector(Y, 0.3), Y.clone().negate(), 0.35, true);
  } else if (!dead) { // relax T-pose arms (also while walking: the walk clip is a rifle walk)
    const sw = moving ? Math.sin(S.ph * 6) * 0.08 : 0;
    ik(B.armR, B.foreR, B.handR, toW(-0.24, 0.86 + dy, 0.03 - sw), toW(-0.4, 1.2 + dy, -0.6)); ik(B.armL, B.foreL, B.handL, toW(0.24, 0.86 + dy, 0.03 + sw), toW(0.4, 1.2 + dy, -0.6));
  }
}
