// ===== Batch 3: ambient life (purely visual, outside the playable grid) =====
// Cheap by design: every moving family is ONE InstancedMesh (cars, lights, people, legs, birds, boats, animals),
// waves / flags animate in the vertex shader off one shared uTime uniform, and counts scale with quality.
// Ticked from the sky dome's onBeforeRender (see scenery.js), so no game-loop edits are needed.
import * as THREE from 'three';
import { GB, mat } from './geo.js';

const _o = new THREE.Object3D(), _c = new THREE.Color();
const geoCache = {};
const once = (k, f) => geoCache[k] || (geoCache[k] = f());

// polyline helper (optionally closed). sample(s) -> {x,z,dx,dz}
export class Path {
  constructor(pts, closed = true) {
    this.p = pts; this.closed = closed; this.len = [0];
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; this.len.push(this.len[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    this.L = this.len[this.len.length - 1]; this.r = { x: 0, z: 0, dx: 1, dz: 0 };
  }
  sample(s) {
    const L = this.L; s = this.closed ? ((s % L) + L) % L : Math.max(0, Math.min(L - 1e-3, s));
    let i = 0; while (i < this.len.length - 2 && this.len[i + 1] < s) i++;
    const a = this.p[i], b = this.p[(i + 1) % this.p.length], seg = this.len[i + 1] - this.len[i] || 1, t = (s - this.len[i]) / seg;
    const r = this.r; r.dx = (b[0] - a[0]) / seg; r.dz = (b[1] - a[1]) / seg; r.x = a[0] + (b[0] - a[0]) * t; r.z = a[1] + (b[1] - a[1]) * t; return r;
  }
}

const carGeo = () => once('car', () => { const b = new GB();
  b.box(0, 0.55, 0, 4.1, 0.62, 1.75, 0xffffff); b.box(-0.25, 1.12, 0, 2.2, 0.55, 1.6, 0x26303a, 0xffffff);
  for (const x of [-1.35, 1.35]) for (const z of [-0.86, 0.86]) b.box(x, 0.33, z, 0.66, 0.62, 0.22, 0x151515);
  return b.build(); });
const vanGeo = () => once('van', () => { const b = new GB();
  b.box(0, 1.05, 0, 4.8, 1.6, 1.9, 0xffffff); b.box(1.9, 1.35, 0, 0.9, 0.7, 1.84, 0x26303a, 0xffffff);
  for (const x of [-1.6, 1.5]) for (const z of [-0.92, 0.92]) b.box(x, 0.36, z, 0.7, 0.7, 0.22, 0x151515);
  return b.build(); });
const truckGeo = () => once('truck', () => { const b = new GB();
  b.box(2.3, 1.35, 0, 1.9, 2.0, 2.2, 0xffffff); b.box(2.9, 1.75, 0, 0.6, 0.8, 2.1, 0x26303a, 0xffffff); b.box(-1.3, 1.6, 0, 5.2, 2.5, 2.3, 0x9a9a92, 0xb0b0a8);
  for (const x of [-2.6, -1.4, 2.4]) for (const z of [-1.05, 1.05]) b.box(x, 0.45, z, 0.9, 0.9, 0.3, 0x151515);
  return b.build(); });
const lightsGeo = (len) => once('lights' + len, () => { const b = new GB();
  for (const z of [-0.62, 0.62]) { b.box(len / 2 + 0.03, 0.62, z, 0.08, 0.16, 0.34, 0xfff2c0); b.box(-len / 2 - 0.03, 0.66, z, 0.08, 0.14, 0.3, 0xff2a1a); }
  return b.build(); });
const bodyGeo = () => once('body', () => { const b = new GB();
  b.box(0, 1.2, 0, 0.3, 0.62, 0.46, 0xffffff); b.box(0, 1.66, 0, 0.24, 0.26, 0.24, 0xc09070); b.box(0, 1.2, -0.29, 0.12, 0.56, 0.1, 0xffffff); b.box(0, 1.2, 0.29, 0.12, 0.56, 0.1, 0xffffff);
  return b.build(); });
const legGeo = () => once('leg', () => { const b = new GB(); b.box(0, -0.45, 0, 0.15, 0.9, 0.15, 0xffffff); return b.build(); });
const birdGeo = () => once('bird', () => { const g = new THREE.BufferGeometry();
  const v = [0.28, 0, 0, -0.18, 0, 0, -0.05, 0.22, 0.62, 0.28, 0, 0, -0.05, 0.22, -0.62, -0.18, 0, 0];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g; });
const boatGeo = (kind) => once('boat' + kind, () => { const b = new GB();
  if (kind === 'ship') { b.box(0, 1.2, 0, 60, 6, 10, 0x2a2e34, 0x7a3a2a, 0x6a2a20); b.box(-24, 7, 0, 9, 7.5, 9, 0xe8e8e0); b.box(-26, 13, 0, 2, 4.5, 2, 0x8a2a20);
    const C = [0x8a3a2a, 0x2e5a7a, 0x4a6a3a, 0x9a7a3a, 0x6a6a6a, 0xa04a2a]; for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) b.box(-14 + i * 4.6, 5.3 + j * 2.5, (j % 2) * 0.4 - 0.2, 4.3, 2.4, 8.6, C[(i * 3 + j) % 6]); }
  else if (kind === 'tanker') { b.box(0, 1.2, 0, 70, 6, 12, 0x283038, 0x6a2a24, 0x5a2420); b.box(-30, 8, 0, 8, 8, 11, 0xe8e8e0); b.box(-31, 14, 0, 2, 5, 2, 0x2a2a2a); b.box(4, 4.6, 0, 50, 0.8, 3, 0x9a9a92); }
  else if (kind === 'supply') { b.box(0, 0.9, 0, 26, 3.4, 7, 0xd04a20, 0xa0a0a0, 0x2a2a2a); b.box(8, 4.5, 0, 7, 4, 6.4, 0xf0f0f0); b.box(9, 7.2, 0, 4, 1.6, 4, 0x2a3440); }
  else if (kind === 'ferry') { b.box(0, 0.8, 0, 22, 2.6, 7, 0x2a5a3a, 0xd8d8d0, 0x1a2a20); b.box(0, 3.1, 0, 17, 2.2, 6.4, 0xf0f0e8); b.box(0, 4.6, 0, 9, 1, 5, 0x2a5a3a); }
  else if (kind === 'tug') { b.box(0, 0.7, 0, 9, 2.2, 3.6, 0x2a2a2a, 0x8a3a2a); b.box(1, 2.6, 0, 3.4, 1.8, 2.8, 0xe8e0d0); b.box(0, 4, 0, 0.7, 1.4, 0.7, 0xc04020); }
  else { b.box(0, 0.4, 0, 5, 0.9, 1.8, 0xf0f0f0, 0x8a6a4a); b.box(0.3, 1.1, 0, 1.6, 0.7, 1.4, 0x2a3440); } // small boat
  return b.build(); });
const animalGeo = (kind) => once('an' + kind, () => { const b = new GB();
  if (kind === 'giraffe') { b.box(0, 1.9, 0, 1.6, 0.9, 0.7, 0xc89a4a); b.geom(new THREE.BoxGeometry(0.3, 2.2, 0.3), mat(0.9, 3.0, 0, 0, 0, -0.35), 0xc89a4a); b.box(1.4, 4.05, 0, 0.55, 0.3, 0.28, 0xb0843c); for (const x of [-0.6, 0.6]) for (const z of [-0.25, 0.25]) b.box(x, 0.75, z, 0.14, 1.5, 0.14, 0xb0843c); }
  else if (kind === 'deer') { b.box(0, 0.95, 0, 1.2, 0.5, 0.42, 0x7a5a3a); b.geom(new THREE.BoxGeometry(0.2, 0.6, 0.2), mat(0.62, 1.3, 0, 0, 0, -0.5), 0x7a5a3a); b.box(0.85, 1.6, 0, 0.36, 0.22, 0.2, 0x6a4a30); for (const x of [-0.45, 0.45]) for (const z of [-0.14, 0.14]) b.box(x, 0.36, z, 0.1, 0.72, 0.1, 0x5a4028); }
  else if (kind === 'goat') { b.box(0, 0.6, 0, 0.8, 0.4, 0.35, 0xd8d0c0); b.box(0.5, 0.85, 0, 0.3, 0.25, 0.2, 0xb8b0a0); for (const x of [-0.3, 0.3]) for (const z of [-0.12, 0.12]) b.box(x, 0.22, z, 0.08, 0.44, 0.08, 0x5a5040); }
  else { b.box(0, 1.1, 0, 1.6, 0.7, 0.6, 0xf0f0f0); b.box(-0.2, 1.1, 0, 0.18, 0.72, 0.62, 0x1a1a1a); b.box(0.35, 1.1, 0, 0.16, 0.72, 0.62, 0x1a1a1a); b.geom(new THREE.BoxGeometry(0.24, 0.7, 0.24), mat(0.9, 1.45, 0, 0, 0, -0.5), 0xe8e8e8); b.box(1.15, 1.75, 0, 0.45, 0.24, 0.22, 0x2a2a2a); for (const x of [-0.6, 0.6]) for (const z of [-0.2, 0.2]) b.box(x, 0.4, z, 0.12, 0.8, 0.12, 0xe0e0e0); } // zebra
  return b.build(); });
const heliGeo = () => once('heli', () => { const b = new GB(); b.box(0, 0, 0, 4.2, 1.6, 1.8, 0xe8e8e0, 0xd04020); b.box(-3.8, 0.3, 0, 4, 0.4, 0.4, 0xe8e8e0); b.box(-5.6, 1, 0, 0.8, 1.4, 0.15, 0xd04020); b.box(1.2, -0.1, 0, 1.4, 1, 1.7, 0x1a2a3a); b.box(0, -1.1, -0.8, 3.4, 0.1, 0.1, 0x2a2a2a); b.box(0, -1.1, 0.8, 3.4, 0.1, 0.1, 0x2a2a2a); return b.build(); });
const rotorGeo = () => once('rotor', () => { const b = new GB(); b.box(0, 0, 0, 10, 0.06, 0.35, 0x2a2a2a); b.box(0, 0, 0, 0.35, 0.06, 10, 0x2a2a2a); return b.build(); });

export class Ambient {
  constructor(root, quality) {
    this.root = root; this.q = quality; this.k = quality === 'low' ? 0.4 : quality === 'medium' ? 0.7 : 1;
    this.time = { value: 0 }; this.items = []; this.last = 0; this.mats = {};
  }
  n(c) { return Math.max(1, Math.round(c * this.k)); }
  tick(now) { // guarded: composer passes may render the sky more than once per frame
    if (this.last && now - this.last < 4) return; const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0.016; this.last = now; this.time.value += dt;
    for (let i = 0; i < this.items.length; i++) this.items[i](dt, this.time.value);
  }
  add(f) { this.items.push(f); }
  mat(key, f) { return this.mats[key] || (this.mats[key] = f()); }
  inst(geo, material, n, colors) {
    const im = new THREE.InstancedMesh(geo, material, n); im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (colors) for (let i = 0; i < n; i++) im.setColorAt(i, _c.set(colors[i % colors.length]).offsetHSL(0, 0, ((i * 37) % 10) / 100 - 0.05));
    this.root.add(im); return im;
  }
  // vehicles following a polyline in two lanes (lane >0 forward, <0 backwards)
  traffic(path, n, { lanes = [1.6, -1.6], kind = 'car', colors = [0xd8d8d8, 0x2a2a30, 0x8a1a1a, 0x1a3a6a, 0xb8b8b0, 0x5a5a5a, 0xe0c020], speed = [7, 12], y = 0, night = false, hgt = null } = {}) {
    n = this.n(n); if (!n) return;
    const geo = kind === 'van' ? vanGeo() : kind === 'truck' ? truckGeo() : carGeo(), len = kind === 'truck' ? 7.4 : kind === 'van' ? 4.8 : 4.1;
    const m = this.mat('veh', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.35 }));
    const body = this.inst(geo, m, n, colors);
    const lit = night ? this.inst(lightsGeo(len), this.mat('vehl', () => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })), n) : null;
    const cars = []; for (let i = 0; i < n; i++) cars.push({ s: (i / n) * path.L + Math.random() * 6, lane: lanes[i % lanes.length], v: speed[0] + Math.random() * (speed[1] - speed[0]) });
    const set = (dt) => { cars.forEach((c, i) => { c.s += (c.lane > 0 ? 1 : -1) * c.v * dt; if (!path.closed) c.s = ((c.s % path.L) + path.L) % path.L; const r = path.sample(c.s); const px = -r.dz, pz = r.dx;
      const x = r.x + px * c.lane, z = r.z + pz * c.lane; const dx = c.lane > 0 ? r.dx : -r.dx, dz = c.lane > 0 ? r.dz : -r.dz;
      _o.position.set(x, (hgt ? hgt(x, z) : 0) + y, z); _o.rotation.set(0, Math.atan2(-dz, dx), 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); body.setMatrixAt(i, _o.matrix); if (lit) lit.setMatrixAt(i, _o.matrix); });
      body.instanceMatrix.needsUpdate = true; if (lit) lit.instanceMatrix.needsUpdate = true; };
    set(0); this.add(set);
  }
  // pedestrians walking along a path (sidewalk offsets), swinging legs
  walkers(path, n, { offs = [3.4, -3.4], colors = [0x3a5a8a, 0xc8c0b0, 0x8a2a2a, 0x2a2a2a, 0x4a6a3a, 0xd8a040, 0xf0f0f0], legs = [0x2a2a34, 0x3a3a3a, 0x4a4030], speed = [1.1, 1.7], hgt = null, ymin = -1e9 } = {}) {
    n = this.n(n); if (!n) return;
    const m = this.mat('ped', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    const bodies = this.inst(bodyGeo(), m, n, colors), lg = this.inst(legGeo(), m, n * 2, legs);
    const ps = []; for (let i = 0; i < n; i++) ps.push({ s: Math.random() * path.L, off: offs[i % offs.length] + (Math.random() - 0.5) * 0.8, dir: Math.random() < 0.5 ? 1 : -1, v: speed[0] + Math.random() * (speed[1] - speed[0]), ph: Math.random() * 6 });
    const set = (dt, t) => { ps.forEach((p, i) => { p.s += p.dir * p.v * dt; const r = path.sample(p.s); const px = -r.dz, pz = r.dx;
      if (!path.closed && (p.s <= 0 || p.s >= path.L - 0.01)) p.dir *= -1;
      const x = r.x + px * p.off, z = r.z + pz * p.off, ry = Math.atan2(-(r.dz * p.dir), r.dx * p.dir), h = Math.max(ymin, hgt ? hgt(x, z) : 0), sw = Math.sin(t * p.v * 5 + p.ph);
      _o.position.set(x, h + Math.abs(sw) * 0.04, z); _o.rotation.set(0, ry, 0, 'YZX'); _o.updateMatrix(); bodies.setMatrixAt(i, _o.matrix);
      for (let k = 0; k < 2; k++) { const sd = k ? 0.1 : -0.1; _o.position.set(x + Math.sin(ry) * sd, h + 0.9, z + Math.cos(ry) * sd); _o.rotation.set(0, ry, (k ? 1 : -1) * sw * 0.45, 'YZX'); _o.updateMatrix(); lg.setMatrixAt(i * 2 + k, _o.matrix); } });
      bodies.instanceMatrix.needsUpdate = lg.instanceMatrix.needsUpdate = true; };
    set(0, 0); this.add(set);
  }
  // animals grazing / wandering slowly inside a rectangle (outside the grid)
  herd(kind, n, cx, cz, r, { hgt = null, speed = 0.6 } = {}) {
    n = this.n(n); if (!n) return;
    const m = this.mat('ped', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    const im = this.inst(animalGeo(kind), m, n); const an = [];
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, d = Math.random() * r; an.push({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, h: Math.random() * 6.28, t: Math.random() * 5, walk: Math.random() < 0.5 }); }
    const set = (dt) => { an.forEach((a, i) => { a.t -= dt; if (a.t < 0) { a.walk = !a.walk; a.t = 2 + Math.random() * 6; a.h += (Math.random() - 0.5) * 1.6; }
      if (a.walk) { a.x += Math.cos(a.h) * speed * dt; a.z += Math.sin(a.h) * speed * dt; if (Math.hypot(a.x - cx, a.z - cz) > r) a.h = Math.atan2(cz - a.z, cx - a.x); }
      _o.position.set(a.x, hgt ? hgt(a.x, a.z) : 0, a.z); _o.rotation.set(0, -a.h, 0); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); }); im.instanceMatrix.needsUpdate = true; };
    set(0); this.add(set);
  }
  // flocks circling (gulls, crows, pelicans); wings flap by flipping the V's y-scale
  birds(cx, cz, { n = 14, r = 30, y = 22, color = 0x222222, flocks = 2, spread = 60 } = {}) {
    n = this.n(n); if (!n) return;
    const im = this.inst(birdGeo(), this.mat('bird' + color, () => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })), n * flocks); const bs = [];
    for (let f = 0; f < flocks; f++) { const fx = cx + (Math.random() - 0.5) * spread, fz = cz + (Math.random() - 0.5) * spread, w = (0.12 + Math.random() * 0.1) * (f % 2 ? 1 : -1);
      for (let i = 0; i < n; i++) bs.push({ fx, fz, a: Math.random() * 6.28, r: r * (0.6 + Math.random() * 0.6), y: y + Math.random() * 8, w: w * (0.9 + Math.random() * 0.2), ph: Math.random() * 6.28, s: 0.9 + Math.random() * 0.5 }); }
    const set = (dt, t) => { bs.forEach((b, i) => { b.a += b.w * dt; const x = b.fx + Math.cos(b.a) * b.r, z = b.fz + Math.sin(b.a) * b.r; const tx = -Math.sin(b.a) * Math.sign(b.w), tz = Math.cos(b.a) * Math.sign(b.w);
      const fl = Math.sin(t * 9 + b.ph), by = b.y + Math.sin(t * 0.7 + b.ph) * 1.5, ss = b.s * this.near(x, by, z, 6, 20); _o.position.set(x, by, z); _o.rotation.set(0, Math.atan2(-tz, tx), 0); _o.scale.set(ss, ss * (fl > -0.3 ? fl : -0.3), ss); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); });
      im.instanceMatrix.needsUpdate = true; };
    set(0, 0); this.add(set);
  }
  // boats along a water path, bobbing
  boats(path, list, { y = 0, speed = 3 } = {}) {
    const m = this.mat('boat', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 }));
    list.forEach((kind, i) => { const mesh = new THREE.Mesh(boatGeo(kind), m); this.root.add(mesh); const st = { s: (i / list.length) * path.L, v: kind === 'ship' || kind === 'tanker' ? speed * 0.5 : speed * (0.8 + Math.random() * 0.6), ph: i * 1.7 };
      const set = (dt, t) => { st.s += st.v * dt; const r = path.sample(st.s); mesh.position.set(r.x, y + Math.sin(t * 0.8 + st.ph) * 0.15, r.z); mesh.rotation.set(Math.sin(t * 0.6 + st.ph) * 0.02, Math.atan2(-r.dz, r.dx), Math.sin(t * 0.9 + st.ph) * 0.03); };
      set(0, 0); this.add(set); });
  }
  moored(kind, x, y, z, ry) { const mesh = new THREE.Mesh(boatGeo(kind), this.mat('boat', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 }))); mesh.position.set(x, y, z); mesh.rotation.y = ry; this.root.add(mesh); const ph = Math.random() * 6; this.add((dt, t) => { mesh.position.y = y + Math.sin(t * 0.5 + ph) * 0.08; mesh.rotation.z = Math.sin(t * 0.4 + ph) * 0.01; }); return mesh; }
  // 0 when within d0 of the render camera, 1 beyond d1 (keeps birds/heli from filling the screen when they pass the camera)
  near(x, y, z, d0, d1) { const c = this.cam; if (!c) return 1; const p = c.position, d = Math.hypot(x - p.x, y - p.y, z - p.z); return d <= d0 ? 0 : d >= d1 ? 1 : (d - d0) / (d1 - d0); }
  // helicopter orbiting
  heli(cx, cz, r, y) {
    const m = this.mat('veh', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.35 }));
    const g = new THREE.Group(), body = new THREE.Mesh(heliGeo(), m), rot = new THREE.Mesh(rotorGeo(), m); rot.position.y = 1.05; g.add(body, rot); this.root.add(g); let a = Math.random() * 6;
    this.add((dt) => { a += dt * 0.12; g.position.set(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r); g.rotation.set(0, -a - Math.PI, 0.12); rot.rotation.y += dt * 28; g.visible = this.near(g.position.x, y, g.position.z, 22, 30) > 0.5; });
  }
  // anything that spins (wind turbines, fans, radar)
  spin(obj, axis, speed) { this.add((dt) => { obj.rotation[axis] += speed * dt; }); }
  // flame / beacon flicker
  flicker(obj, base = 1, amt = 0.25, f = 13) { const ph = Math.random() * 9; this.add((dt, t) => { const s = base * (1 + Math.sin(t * f + ph) * amt * 0.6 + Math.sin(t * f * 2.3 + ph) * amt * 0.4); obj.scale.set(s, s * 1.3, s); }); }
  blink(obj, period = 1.6) { const ph = Math.random() * period; this.add((dt, t) => { obj.visible = ((t + ph) % period) < period * 0.45; }); }
  // drifting planes (clouds, mist) that wrap inside a box
  drift(meshes, vx, vz, x0, x1, z0, z1) { this.add((dt) => { for (const m of meshes) { m.position.x += vx * dt * (m.userData.sp || 1); m.position.z += vz * dt * (m.userData.sp || 1); if (m.position.x > x1) m.position.x = x0; if (m.position.x < x0) m.position.x = x1; if (m.position.z > z1) m.position.z = z0; if (m.position.z < z0) m.position.z = z1; } }); }
  // flag cloth (vertex-shader wave) on a pole
  flag(x, y0, z, { h = 7, tex = null, color = 0xffffff, w = 2.2, ry = 0 } = {}) {
    const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry;
    const pole = new THREE.Mesh(once('pole', () => new THREE.CylinderGeometry(0.05, 0.07, 1, 6).translate(0, 0.5, 0)), this.mat('pole', () => new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.6, roughness: 0.4 })));
    pole.scale.y = h; g.add(pole);
    const cg = once('cloth', () => new THREE.PlaneGeometry(1, 0.66, 12, 4).translate(0.5, -0.33, 0));
    const key = 'flag' + (tex ? tex.uuid : color);
    const fm = this.mat(key, () => { const mm = new THREE.MeshStandardMaterial({ map: tex, color: tex ? 0xffffff : color, side: THREE.DoubleSide, roughness: 0.8 }); const T = this.time;
      mm.onBeforeCompile = (sh) => { sh.uniforms.uTime = T; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat fw = position.x; vec4 fwp = modelMatrix * vec4(0.0,0.0,0.0,1.0);\ntransformed.z += sin(position.x * 5.0 - uTime * 7.0 + fwp.x + fwp.z) * 0.12 * fw + sin(position.x * 9.0 - uTime * 11.0) * 0.03 * fw;\ntransformed.y -= 0.05 * fw * fw;'); };
      mm.customProgramCacheKey = () => 'b3flag'; return mm; });
    const cloth = new THREE.Mesh(cg, fm); cloth.scale.set(w, w, w); cloth.position.y = h - 0.05; g.add(cloth); this.root.add(g); return g;
  }
}
