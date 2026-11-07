import * as THREE from 'three';
// Simple geometry accumulator with vertex colours + world-scale UVs. One draw call per builder.
const tmpC = new THREE.Color();
export class GB {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; }
  quad(a, b, c, d, n, col, uvs) { // a,b,c,d corners CCW
    const P = this.p, N = this.n, U = this.u, C = this.c; tmpC.set(col);
    for (const v of [a, b, c, a, c, d]) { P.push(v[0], v[1], v[2]); N.push(n[0], n[1], n[2]); C.push(tmpC.r, tmpC.g, tmpC.b); }
    for (const i of [0, 1, 2, 0, 2, 3]) U.push(uvs[i][0], uvs[i][1]);
  }
  // axis-aligned box; col for sides, top colour optional; shadeBottom darkens lower verts
  box(cx, cy, cz, sx, sy, sz, col, top = col, bottom = null, uvScale = 1) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, s = uvScale;
    const bc = bottom ?? col;
    const sideQuad = (a, b, c, d, n, u0, u1) => { // a,b bottom; c,d top
      const P = this.p, N = this.n, U = this.u, C = this.c; const cb = new THREE.Color(bc), ct = new THREE.Color(col);
      const verts = [[a, cb, [u0, y0 * s]], [b, cb, [u1, y0 * s]], [c, ct, [u1, y1 * s]], [a, cb, [u0, y0 * s]], [c, ct, [u1, y1 * s]], [d, ct, [u0, y1 * s]]];
      for (const [v, cc, uv] of verts) { P.push(v[0], v[1], v[2]); N.push(...n); C.push(cc.r, cc.g, cc.b); U.push(uv[0], uv[1]); }
    };
    sideQuad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], x0 * s, x1 * s);
    sideQuad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], x1 * s, x0 * s);
    sideQuad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], z1 * s, z0 * s);
    sideQuad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], z0 * s, z1 * s);
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], top, [[x0 * s, z1 * s], [x1 * s, z1 * s], [x1 * s, z0 * s], [x0 * s, z0 * s]]);
  }
  hquad(x0, z0, x1, z1, y, col, s = 1) { this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], col, [[x0 * s, z1 * s], [x1 * s, z1 * s], [x1 * s, z0 * s], [x0 * s, z0 * s]]); }
  // merge an existing three geometry (transformed) with flat colour
  geom(g, mat4, col) {
    const gg = g.index ? g.toNonIndexed() : g.clone(); gg.applyMatrix4(mat4);
    const pos = gg.attributes.position.array, nor = gg.attributes.normal.array, uv = gg.attributes.uv ? gg.attributes.uv.array : null; tmpC.set(col);
    for (let i = 0; i < pos.length / 3; i++) { this.p.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); this.n.push(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]); this.c.push(tmpC.r, tmpC.g, tmpC.b); this.u.push(uv ? uv[i * 2] : 0, uv ? uv[i * 2 + 1] : 0); }
  }
  build() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.computeBoundingSphere(); return g; }
}
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), V = new THREE.Vector3();
export function mat(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) { return M.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz)).clone(); }
