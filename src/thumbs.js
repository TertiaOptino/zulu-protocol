// Offscreen three.js renders for UI: operator portraits / full-body cards and armory item pictures.
// One small hidden WebGL renderer; results are cached data URLs; work is queued so menus never stall.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeCharacter } from './models.js';
import { weaponParts, gadgetParts, partsGeometry, partsMaterial } from './gear.js';
import { DEFAULT_LOOK } from './looks.js';
import { hiDetail } from './guns.js';
import { WEAPONS } from './data.js';
let R = null, S = null, cam = null, fill = null, gunRim = null, gunKey = null, rig = null; const cache = new Map(), queue = []; let busy = false;
function init() {
  if (R) return; R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0; R.outputColorSpace = THREE.SRGBColorSpace; R.setPixelRatio(1);
  S = new THREE.Scene(); const hemi = new THREE.HemisphereLight(0xd0dae6, 0x3a3630, 0.9); S.add(hemi); const k = new THREE.DirectionalLight(0xfff0dc, 1.9); k.position.set(3.5, 4, 3); S.add(k); const rim = new THREE.DirectionalLight(0xbcd4ff, 3.6); rim.position.set(2.5, 3, -4); S.add(rim); const r = new THREE.DirectionalLight(0xff7a1a, 1.4); r.position.set(-4, 2.5, -3); S.add(r); const back = new THREE.DirectionalLight(0xdfe8ff, 1.6); back.position.set(0, 2, -5); S.add(back);
  const pm = new THREE.PMREMGenerator(R); S.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; S.environmentIntensity = 0.55; pm.dispose(); // studio reflections for metal
  cam = new THREE.PerspectiveCamera(30, 1, 0.05, 50); fill = new THREE.PointLight(0xffffff, 6, 0, 1.6); fill.position.set(0, 0.4, 0.2); cam.add(fill); S.add(cam);
  // weapon studio: hard cool rim from behind/above the gun's left side + warm softbox key over the camera shoulder
  gunRim = new THREE.DirectionalLight(0xcfe0ff, 5.5); gunRim.position.set(4, 3.2, -1.5); gunKey = new THREE.DirectionalLight(0xfff2e2, 1.6); gunKey.position.set(-3, 4, 2.5); S.add(gunRim, gunKey);
  rig = { hemi, k, r, back };
}
function shot(w, h, obj, setCam, lit = 2.2, studio = false) { init(); fill.intensity = lit; gunRim.visible = studio; gunKey.visible = studio; rig.hemi.intensity = studio ? 0.3 : 0.9; rig.k.intensity = studio ? 0.9 : 1.9; rig.r.intensity = studio ? 0.25 : 1.4; rig.back.intensity = studio ? 0.6 : 1.6; S.environmentIntensity = studio ? 0.45 : 0.55; R.setSize(w, h, false); cam.aspect = w / h; setCam(cam); cam.updateProjectionMatrix(); S.add(obj); R.render(S, cam); S.remove(obj); return R.domElement.toDataURL('image/png'); }
function pump() { if (busy) return; const job = queue.shift(); if (!job) return; busy = true; (window.requestIdleCallback || setTimeout)(() => { try { const url = cache.get(job.key) || job.make(); cache.set(job.key, url); for (const img of job.imgs) img.src = url; } catch (e) { console.warn('thumb', e); } busy = false; pump(); }, { timeout: 60 }); }
function lazy(key, make, img) { if (cache.has(key)) { img.src = cache.get(key); return img; } const j = queue.find(q => q.key === key); if (j) j.imgs.push(img); else queue.push({ key, make, imgs: [img] }); pump(); return img; }
const blank = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
function mkImg(cls) { const i = new Image(); i.className = cls; i.src = blank; i.alt = ''; i.decoding = 'async'; return i; }
// ---------- characters ----------
export function renderChar(style, mode = 'head', w = 160, h = 200) {
  const ch = makeCharacter({ ...style, ring: 0 }); ch.ring.visible = false; ch.root.rotation.y = mode === 'head' ? 0.38 : 0.45; if (ch.update) { ch.update(0, { aim: false }); ch.update(0.016, { aim: false }); }
  return shot(w, h, ch.root, (c) => { if (mode === 'head') { c.fov = 20; c.position.set(0.1, 1.6, 2.05); c.lookAt(0.02, 1.5, 0); } else { c.fov = 28; c.position.set(0.25, 1.15, 4.3); c.lookAt(0, 0.92, 0); } });
}
export function charImg(style, mode = 'head', cls = 'pimg', w, h) { const W = w || (mode === 'head' ? 128 : 240), H = h || (mode === 'head' ? 150 : 360); return lazy(JSON.stringify([style.look, style.skin, style.gun, style.optic, style.cls, style.country, style.kind, style.uni, mode, W, H]), () => renderChar(style, mode, W, H), mkImg(cls)); }
// ---------- items ----------
const itemMat = partsMaterial();
// 3/4 studio framing: camera on the right side (-X), 32° toward the muzzle and 16° up; fit by projecting the bbox corners.
const QDIR = new THREE.Vector3(-Math.cos(0.56) * Math.cos(0.28), Math.sin(0.28), Math.sin(0.56) * Math.cos(0.28)).normalize();
function fitQ(cm, bb, w, h, margin = 0.9) {
  const c = bb.getCenter(new THREE.Vector3()), r = bb.getSize(new THREE.Vector3()).length() / 2, P3 = new THREE.Vector3(); cm.fov = 22; cm.aspect = w / h; cm.updateProjectionMatrix();
  let D = r / Math.tan(cm.fov * Math.PI / 360), tgt = c.clone();
  for (let it = 0; it < 4; it++) { cm.position.copy(tgt).addScaledVector(QDIR, D); cm.lookAt(tgt); cm.updateMatrixWorld(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let k = 0; k < 8; k++) { P3.set(k & 1 ? bb.max.x : bb.min.x, k & 2 ? bb.max.y : bb.min.y, k & 4 ? bb.max.z : bb.min.z).project(cm); x0 = Math.min(x0, P3.x); x1 = Math.max(x1, P3.x); y0 = Math.min(y0, P3.y); y1 = Math.max(y1, P3.y); }
    const tH = Math.tan(cm.fov * Math.PI / 360), ru = new THREE.Vector3().setFromMatrixColumn(cm.matrixWorld, 0), uu = new THREE.Vector3().setFromMatrixColumn(cm.matrixWorld, 1);
    tgt.addScaledVector(ru, (x0 + x1) / 2 * tH * cm.aspect * D).addScaledVector(uu, (y0 + y1) / 2 * tH * D); D *= Math.max((x1 - x0) / 2, (y1 - y0) / 2) / margin; }
  cm.position.copy(tgt).addScaledVector(QDIR, D); cm.lookAt(tgt);
}
function fitShot(pp, w, h, view) {
  const g = partsGeometry(pp); const m = new THREE.Mesh(g, itemMat); g.computeBoundingBox(); const bb = g.boundingBox, c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
  const iso = view !== 'side'; const half = Math.max((iso ? Math.hypot(sz.x, sz.z) : sz.z) / 2 / (w / h), sz.y / 2 * (iso ? 1.4 : 1), 0.11); const url = shot(w, h, m, (cm) => { cm.fov = 24; const d = half * 1.18 / Math.tan(cm.fov * Math.PI / 360) + (iso ? sz.x : sz.x / 2);
    if (view === 'q') fitQ(cm, bb, w, h); else if (view === 'side') { cm.position.set(c.x - d * 0.96, c.y + d * 0.22, c.z + d * 0.12); cm.lookAt(c); } else { cm.position.set(c.x + d * 0.62, c.y + d * 0.62, c.z + d * 0.48); cm.lookAt(c); } }, view === 'q' ? 3 : 6, view === 'q');
  g.dispose(); return url;
}
// big studio render of one weapon (armory close-up / dev previews)
export function weaponShot(item, w = 900, h = 420, optic, muzzle = 'none') { return fitShot(hiDetail(() => weaponParts(item, optic ?? (item.type === 'pistol' ? 'iron' : 'reddot'), muzzle)), w, h, 'q'); }
const ARMOR_LOOK = { none: { vest: 'none', helm: 'none', hat: 'cap' }, light: { vest: 'chest', helm: 'none', hat: 'cap' }, plate: { vest: 'plate', helm: 'highcut' }, heavy: { vest: 'heavy', helm: 'highcut', nvg: true }, assault: { vest: 'heavy', helm: 'altyn', visor: true } };
export function itemImg(kind, item, cls = 'ithumb', w = 220, h = 120) {
  const key = 'item:' + kind + ':' + item.id + ':' + w + 'x' + h;
  return lazy(key, () => {
    if (kind === 'weapon') return fitShot(hiDetail(() => weaponParts(item, item.type === 'pistol' ? 'iron' : 'reddot', 'none')), w, h, 'q');
    if (kind === 'att') { const base = WEAPONS.find(x => x.id === 'm4a1') || WEAPONS.find(x => x.type === 'rifle'); const isOpt = item.slot === 'optic'; return fitShot(hiDetail(() => weaponParts(base, isOpt ? item.id : 'iron', isOpt ? 'none' : item.id)), w, h, 'q'); }
    if (kind === 'gadget') return fitShot(gadgetParts(item.id), w, h, 'iso');
    if (kind === 'armor') { const look = { ...DEFAULT_LOOK, ...(ARMOR_LOOK[item.id] || {}) }; const st = { kind: 'op', look, skin: 0xc99a74 }; const ch = makeCharacter(st); ch.ring.visible = false; ch.root.rotation.y = 0.5; if (ch.update) ch.update(0, {});
      return shot(w, h, ch.root, (c) => { c.fov = 26; c.position.set(0.2, 1.3, 2.6); c.lookAt(0, 1.22, 0); }); }
    return blank;
  }, mkImg(cls));
}
