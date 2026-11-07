import * as THREE from 'three';
import { glowTex, smokeTex } from './textures.js';
// Pooled visual effects. Everything is pre-allocated so shaders/light counts never change mid-mission.
export class FX {
  constructor(scene) {
    this.scene = scene; this.t = 0;
    // tracers
    this.maxTr = 64; const tg = new THREE.BufferGeometry(); this.trPos = new Float32Array(this.maxTr * 6); this.trCol = new Float32Array(this.maxTr * 6);
    tg.setAttribute('position', new THREE.BufferAttribute(this.trPos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(this.trCol, 3));
    this.tracers = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.tracers.frustumCulled = false; scene.add(this.tracers); this.trLife = new Float32Array(this.maxTr); this.trN = 0;
    // sprites (muzzle, explosions, smoke)
    this.sprites = []; const glow = glowTex('rgba(255,210,120,1)'), smk = smokeTex();
    for (let i = 0; i < 48; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: i < 32 ? glow : smk, transparent: true, depthWrite: false, blending: i < 32 ? THREE.AdditiveBlending : THREE.NormalBlending })); s.visible = false; s.userData = { life: 0, max: 1, kind: i < 32 ? 'glow' : 'smoke', s0: 1, s1: 1 }; scene.add(s); this.sprites.push(s); }
    // two pooled point lights
    this.lights = []; for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0xffc070, 0, 9, 2); scene.add(l); this.lights.push({ l, life: 0, max: 1, I: 0 }); }
    // decals (blood, scorch)
    this.decals = []; const dg = new THREE.CircleGeometry(0.5, 10).rotateX(-Math.PI / 2);
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: 0x5a0e0e, transparent: true, opacity: 0.75, depthWrite: false })); m.visible = false; m.renderOrder = 1; scene.add(m); this.decals.push(m); } this.decalN = 0;
    // grenades in flight
    this.nadeGeo = new THREE.SphereGeometry(0.07, 8, 6); this.nadeMat = new THREE.MeshStandardMaterial({ color: 0x2c3a2c }); this.nades = [];
  }
  tracer(ax, ay, az, bx, by, bz, color = 0xffd890) {
    const i = this.trN++ % this.maxTr; const p = this.trPos, c = new THREE.Color(color);
    p.set([ax, ay, az, bx, by, bz], i * 6); this.trCol.set([c.r, c.g, c.b, c.r * 0.6, c.g * 0.6, c.b * 0.6], i * 6); this.trLife[i] = 0.07;
    this.tracers.geometry.attributes.position.needsUpdate = true; this.tracers.geometry.attributes.color.needsUpdate = true;
  }
  sprite(kind, x, y, z, life, s0, s1, color = 0xffffff, opacity = 1) {
    const pool = this.sprites.filter(s => s.userData.kind === kind); let s = pool.find(s => !s.visible) || pool.reduce((a, b) => a.userData.life < b.userData.life ? a : b);
    s.visible = true; s.position.set(x, y, z); Object.assign(s.userData, { life, max: life, s0, s1, op: opacity }); s.material.color.set(color); s.material.opacity = opacity; s.scale.setScalar(s0); s.material.rotation = Math.random() * 6; return s;
  }
  muzzle(x, y, z) { this.sprite('glow', x, y, z, 0.05, 0.45, 0.25); }
  light(x, y, z, I, life, color = 0xffc070) { const L = this.lights.reduce((a, b) => a.life < b.life ? a : b); L.l.position.set(x, y, z); L.l.color.set(color); L.I = I; L.life = L.max = life; L.l.intensity = I; }
  explosion(x, z, big = true) { this.sprite('glow', x, 0.8, z, 0.35, big ? 2.5 : 1.5, big ? 4.5 : 3, 0xffb050); for (let i = 0; i < 4; i++) this.sprite('smoke', x + (Math.random() - 0.5), 0.8 + Math.random(), z + (Math.random() - 0.5), 2.2, 1.2, 3.5, 0x555555, 0.7); this.light(x, 1.2, z, big ? 40 : 25, 0.35); this.decal(x, z, 0x1a1a1a, big ? 1.6 : 1.1); }
  flash(x, z) { this.sprite('glow', x, 0.6, z, 0.4, 3, 7, 0xffffff); this.light(x, 1.2, z, 80, 0.4, 0xffffff); }
  smokeCloud(x, z, dur) { for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28, r = Math.random() * 2.2; this.sprite('smoke', x + Math.sin(a) * r, 0.6 + Math.random() * 1.4, z + Math.cos(a) * r, dur, 2.5, 4.5, 0xbfc2c4, 0.85); } }
  decal(x, z, color = 0x5a0e0e, s = 1) { const d = this.decals[this.decalN++ % this.decals.length]; d.visible = true; d.position.set(x + (Math.random() - 0.5) * 0.3, 0.03 + (this.decalN % 10) * 0.001, z + (Math.random() - 0.5) * 0.3); d.scale.setScalar(s * (0.7 + Math.random() * 0.5)); d.material.color.set(color); }
  throwNade(x0, z0, x1, z1, dur, onLand) { const m = new THREE.Mesh(this.nadeGeo, this.nadeMat); this.scene.add(m); this.nades.push({ m, x0, z0, x1, z1, t: 0, dur, onLand }); }
  update(dt, rdt) {
    for (let i = 0; i < this.maxTr; i++) if (this.trLife[i] > 0) { this.trLife[i] -= rdt; if (this.trLife[i] <= 0) { this.trPos.fill(0, i * 6, i * 6 + 6); this.tracers.geometry.attributes.position.needsUpdate = true; } }
    for (const s of this.sprites) if (s.visible) { const u = s.userData; u.life -= u.kind === 'smoke' ? dt : rdt; if (u.life <= 0) { s.visible = false; continue; } const k = 1 - u.life / u.max; s.scale.setScalar(u.s0 + (u.s1 - u.s0) * k); s.material.opacity = u.op * (u.kind === 'smoke' ? Math.min(1, u.life / Math.min(2, u.max * 0.3)) : 1 - k); if (u.kind === 'smoke') s.position.y += dt * 0.05; }
    for (const L of this.lights) if (L.life > 0) { L.life -= rdt; L.l.intensity = Math.max(0, L.I * L.life / L.max); }
    for (let i = this.nades.length - 1; i >= 0; i--) { const n = this.nades[i]; n.t += dt; const k = Math.min(1, n.t / n.dur); n.m.position.set(n.x0 + (n.x1 - n.x0) * k, 1.4 + Math.sin(k * Math.PI) * 1.6 - k * 1.3, n.z0 + (n.z1 - n.z0) * k); if (k >= 1) { this.scene.remove(n.m); this.nades.splice(i, 1); n.onLand && n.onLand(); } }
  }
}
// flat ribbon along points (path previews)
export function ribbonGeo(pts, w = 0.12, y = 0.07) {
  const pos = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1; const nx = -dz / L * w / 2, nz = dx / L * w / 2; pos.push(a.x + nx, y, a.z + nz, b.x + nx, y, b.z + nz, b.x - nx, y, b.z - nz, a.x + nx, y, a.z + nz, b.x - nx, y, b.z - nz, a.x - nx, y, a.z - nz); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g;
}
