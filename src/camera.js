import * as THREE from 'three';
import { clamp, lerp, angNorm } from './util.js';
// Free tactical camera: orbit around a ground target. Cinematic + follow modes override it smoothly.
// Modes: free orbit; 'follow' (overhead, keeps the followed operator centred); 'shoulder' (third-person over-the-right-shoulder
// chase cam behind one operator, boom shortened by walls via this.occlude(x0,z0,x1,z1) -> 0..1 clear fraction).
export class TacCam {
  constructor(cam) { this.cam = cam; this.target = new THREE.Vector3(); this.dist = 22; this.yaw = 0.6; this.pitch = 0.95; this.bounds = [0, 0, 40, 28]; this.cine = null; this.follow = null; this.keys = {}; this.cur = { p: new THREE.Vector3(), l: new THREE.Vector3() }; this.first = true; this.mode = 'free'; this.sh = { off: 0, dist: 2.7, h: 1.85, yaw: 0, init: false }; this.occlude = null; }
  setBounds(w, h) { this.bounds = [-4, -4, w + 4, h + 4]; }
  pan(dx, dz) { this.target.x = clamp(this.target.x + dx, this.bounds[0], this.bounds[2]); this.target.z = clamp(this.target.z + dz, this.bounds[1], this.bounds[3]); this.stopFollow(); }
  setFollow(u, mode = 'follow') { if (!u) return this.stopFollow(); const was = this.mode; this.follow = u; this.mode = mode; if (mode === 'shoulder') { if (was !== 'shoulder') this.sh.off = 0; this.sh.init = false; } else { this.dist = Math.min(this.dist, 11); this.pitch = Math.min(this.pitch, 0.75); } }
  stopFollow() { if (this.mode === 'shoulder' && this.follow) { this.target.set(this.follow.x, 0, this.follow.z); this.yaw = angNorm(this.sh.yaw + Math.PI); this.dist = Math.max(this.dist, 9); } this.follow = null; this.mode = 'free'; }
  zoom(f) { if (this.mode === 'shoulder') { this.sh.dist = clamp(this.sh.dist * Math.pow(f, this.sens || 1), 1.6, 6); return; } this.dist = clamp(this.dist * Math.pow(f, this.sens || 1), 6, 55); }
  rotate(d) { if (this.mode === 'shoulder') { this.sh.off = clamp(this.sh.off + d * (this.sens || 1), -2.6, 2.6); return; } this.yaw = angNorm(this.yaw + d * (this.sens || 1)); }
  tilt(d) { if (this.mode === 'shoulder') { this.sh.h = clamp(this.sh.h + d * 1.5 * (this.sens || 1), 1.45, 3.2); return; } this.pitch = clamp(this.pitch + d * (this.sens || 1), 0.35, 1.5); }
  centerOn(x, z) { this.target.x = clamp(x, this.bounds[0], this.bounds[2]); this.target.z = clamp(z, this.bounds[1], this.bounds[3]); this.stopFollow(); }
  topDown() { this.pitch = 1.5; }
  startCine(from, to, dur = 1.6) { this.cine = { from, to, t: 0, dur }; }
  update(rdt) {
    const k = this.keys; const sp = this.dist * 1.1 * rdt * (this.sens || 1);
    let r = 0, f = 0; if (k.KeyA || k.ArrowLeft) r -= 1; if (k.KeyD || k.ArrowRight) r += 1; if (k.KeyW || k.ArrowUp) f += 1; if (k.KeyS || k.ArrowDown) f -= 1;
    if (this.edge && this.mouse && !r && !f) { const m = this.mouse, E = 14; if (m.x < E) r = -1; else if (m.x > innerWidth - E) r = 1; if (m.y < E) f = 1; else if (m.y > innerHeight - E) f = -1; }
    if (r || f) { const s = Math.sin(this.yaw), c = Math.cos(this.yaw); this.pan((c * r - s * f) * sp, (-s * r - c * f) * sp); }
    if (k.KeyQ) this.rotate(-1.8 * rdt); if (k.KeyE) this.rotate(1.8 * rdt); if (k.KeyR || k.PageUp) this.tilt(1.2 * rdt); if (k.KeyF || k.PageDown) this.tilt(-1.2 * rdt); if (k.KeyZ) this.zoom(1 - 1.5 * rdt); if (k.KeyX) this.zoom(1 + 1.5 * rdt);
    if (this.follow && this.follow.alive) { this.target.x = lerp(this.target.x, this.follow.x, Math.min(1, rdt * 4)); this.target.z = lerp(this.target.z, this.follow.z, Math.min(1, rdt * 4)); }
    const cp = Math.cos(this.pitch), sp2 = Math.sin(this.pitch);
    const want = new THREE.Vector3(this.target.x + Math.sin(this.yaw) * cp * this.dist, this.target.y + sp2 * this.dist, this.target.z + Math.cos(this.yaw) * cp * this.dist);
    const look = this.target.clone();
    if (this.mode === 'shoulder' && this.follow && !this.follow.alive) this.stopFollow();
    if (this.mode === 'shoulder' && this.follow) { // third-person chase: behind the operator's facing, offset over the right shoulder, looking past them
      const u = this.follow, sh = this.sh; const face = u.ang + sh.off; if (!sh.init) { sh.yaw = face; sh.init = true; } sh.yaw += angNorm(face - sh.yaw) * Math.min(1, rdt * 3.2);
      const fx = Math.sin(sh.yaw), fz = Math.cos(sh.yaw), rx = -fz, rz = fx; const side = 0.55 * Math.min(1, sh.dist / 2.7);
      let bx = -fx * sh.dist + rx * side, bz = -fz * sh.dist + rz * side, lift = 0; const ox = u.x + rx * 0.25, oz = u.z + rz * 0.25;
      if (this.occlude) { const f = this.occlude(ox, oz, u.x + bx, u.z + bz); if (f < 1) { const k = Math.max(0.18, f - 0.12); bx *= k; bz *= k; lift = (1 - k) * 0.3; } } // pull the boom in front of walls
      want.set(u.x + bx, sh.h + lift, u.z + bz); look.set(u.x + fx * 5 + rx * 0.2, 1.0 + (sh.h - 1.85) * -0.35, u.z + fz * 5 + rz * 0.2);
      this.target.set(u.x, 0, u.z);
    }
    if (this.cine) { const c = this.cine; if (!this.cineHold) c.t += rdt; const e = Math.min(1, c.t / 0.45); want.lerpVectors(want, c.to.p, e); look.lerpVectors(look, c.to.l, e); if (c.t > c.dur) this.cine = null; }
    const a = this.first ? 1 : Math.min(1, rdt * (this.cine ? 7 : this.mode === 'shoulder' ? 9 : 12)); this.first = false;
    this.cur.p.lerp(want, a); this.cur.l.lerp(look, a);
    this.cam.position.copy(this.cur.p); this.cam.lookAt(this.cur.l);
  }
}
