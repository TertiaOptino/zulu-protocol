import { buildGrid } from './maps.js';
export const T = { FLOOR: 0, WALL: 1, WIN: 2, HALF: 3, FULL: 4, DOOR: 5 };
const FLOORCH = { ',': 'ground', '.': 'concrete', '_': 'tile', '=': 'wood', '~': 'carpet', '-': 'grate' };
const HALF = 'cotkpb', FULL = 'sCPF', DOORCH = 'DLTZ', MARK = 'EeHVBI', ZONE = '1234X';

class Heap { constructor() { this.a = []; } push(i, f) { const a = this.a; a.push([f, i]); let n = a.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (a[p][0] <= a[n][0]) break; [a[p], a[n]] = [a[n], a[p]]; n = p; } } pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === n) break; [a[m], a[n]] = [a[n], a[m]]; n = m; } } return top[1]; } get size() { return this.a.length; } }

export class Level {
  constructor(def) {
    this.def = def; const g = buildGrid(def); this.grid = g;
    const W = this.W = def.w, H = this.H = def.h, N = W * H;
    this.type = new Uint8Array(N); this.floor = new Array(N).fill(null); this.prop = new Array(N).fill(null);
    this.ext = new Uint8Array(N); this.room = new Int16Array(N).fill(-1); this.smoke = new Float32Array(N);
    this.zones = { 1: [], 2: [], 3: [], 4: [], X: [] }; this.markers = { E: [], e: [], H: [], V: [], B: [], I: [] };
    this.doors = []; this.doorAt = new Map();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, ch = g[y][x];
      if (ch === '#') this.type[i] = T.WALL;
      else if (ch === 'W' || ch === 'r') { this.type[i] = T.WIN; this.prop[i] = ch; }
      else if (DOORCH.includes(ch)) { this.type[i] = T.DOOR; const d = { i, x, y, ch, state: 'closed', locked: ch === 'L' || ch === 'Z', trapped: ch === 'T' || ch === 'Z', trapKnown: false, lockKnown: true, entry: null, anim: 0, busy: null }; this.doors.push(d); this.doorAt.set(i, d); }
      else if (HALF.includes(ch)) { this.type[i] = T.HALF; this.prop[i] = ch; }
      else if (FULL.includes(ch)) { this.type[i] = T.FULL; this.prop[i] = ch; }
      else if (ZONE.includes(ch)) { this.floor[i] = 'ground'; this.zones[ch].push([x, y]); }
      else if (MARK.includes(ch)) { this.markers[ch].push([x, y]); }
      else this.floor[i] = FLOORCH[ch] || 'concrete';
    }
    // exterior flood from border
    const st = [];
    for (let x = 0; x < W; x++) { st.push(x, (H - 1) * W + x); } for (let y = 0; y < H; y++) { st.push(y * W, y * W + W - 1); }
    while (st.length) { const i = st.pop(); if (this.ext[i]) continue; const t = this.type[i]; if (t === T.WALL || t === T.WIN || t === T.DOOR) continue; this.ext[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
    // rooms
    let rid = 1; for (let i = 0; i < N; i++) { if (this.ext[i]) { this.room[i] = 0; continue; } }
    for (let i = 0; i < N; i++) { const t = this.type[i]; if (this.room[i] !== -1 || t === T.WALL || t === T.WIN || t === T.DOOR) continue; const q = [i]; this.room[i] = rid; while (q.length) { const c = q.pop(); const x = c % W, y = (c / W) | 0; for (const n of [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, y > 0 ? c - W : -1, y < H - 1 ? c + W : -1]) { if (n < 0 || this.room[n] !== -1) continue; const tt = this.type[n]; if (tt === T.WALL || tt === T.WIN || tt === T.DOOR) continue; this.room[n] = rid; q.push(n); } } rid++; }
    this.roomCount = rid;
    // infer floors
    for (let i = 0; i < N; i++) { if (this.floor[i]) continue; if (this.ext[i]) { this.floor[i] = 'ground'; continue; } const x = i % W, y = (i / W) | 0; const cnt = {}; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; const f = FLOORCH[g[ny][nx]]; if (f && !this.ext[j] && f !== 'ground') cnt[f] = (cnt[f] || 0) + 1; } let best = 'concrete', bc = 0; for (const k in cnt) if (cnt[k] > bc) { bc = cnt[k]; best = k; } this.floor[i] = best; }
    // doors orientation + sides
    for (const d of this.doors) {
      const solid = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return false; const t = this.type[y * W + x]; return t === T.WALL || t === T.WIN || t === T.DOOR; };
      d.orient = (solid(d.x - 1, d.y) && solid(d.x + 1, d.y)) ? 'h' : 'v';
      d.sides = d.orient === 'h' ? [[d.x, d.y - 1], [d.x, d.y + 1]] : [[d.x - 1, d.y], [d.x + 1, d.y]];
      d.rooms = d.sides.map(([x, y]) => this.room[this.idx(x, y)]);
      d.ext = d.rooms.includes(0);
    }
    for (const k of ['1', '2', '3', '4']) {
      const z = this.zones[k]; if (!z.length) continue; const cx = z.reduce((s, p) => s + p[0], 0) / z.length, cy = z.reduce((s, p) => s + p[1], 0) / z.length;
      let best = null, bd = 1e9; for (const d of this.doors) { if (!d.ext || d.entry) continue; const dd = Math.hypot(d.x - cx, d.y - cy); if (dd < bd) { bd = dd; best = d; } }
      if (best) best.entry = +k;
    }
  }
  idx(x, y) { return y * this.W + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  cellOf(px, pz) { const x = Math.floor(px), y = Math.floor(pz); return this.inb(x, y) ? y * this.W + x : -1; }
  blocksSight(i, smoke = true) { const t = this.type[i]; if (t === T.WALL || t === T.FULL) return true; if (t === T.DOOR) return this.doorAt.get(i).state === 'closed'; return smoke && this.smoke[i] > 0; }
  walkable(i) { const t = this.type[i]; if (t === T.FLOOR) return true; if (t === T.DOOR) return this.doorAt.get(i).state !== 'closed'; return false; }
  los(x0, z0, x1, z1, smoke = true) {
    let cx = Math.floor(x0), cz = Math.floor(z0); const ex = Math.floor(x1), ez = Math.floor(z1);
    const dx = x1 - x0, dz = z1 - z0, sx = Math.sign(dx), sz = Math.sign(dz);
    const tdx = sx ? Math.abs(1 / dx) : Infinity, tdz = sz ? Math.abs(1 / dz) : Infinity;
    let tmx = sx > 0 ? (cx + 1 - x0) * tdx : sx < 0 ? (x0 - cx) * tdx : Infinity, tmz = sz > 0 ? (cz + 1 - z0) * tdz : sz < 0 ? (z0 - cz) * tdz : Infinity;
    for (let k = 0; k < 400; k++) {
      if (cx === ex && cz === ez) return true;
      if (tmx < tmz) { tmx += tdx; cx += sx; } else { tmz += tdz; cz += sz; }
      if (cx === ex && cz === ez) return true;
      if (!this.inb(cx, cz)) return false;
      if (this.blocksSight(cz * this.W + cx, smoke)) return false;
    }
    return true;
  }
  // returns distance to first sight blocker; calls onCell(i) for each visited cell (including the blocker)
  castRay(x, z, ang, maxD, onCell) {
    const s = Math.sin(ang), c = Math.cos(ang); let last = -1;
    for (let d = 0.2; d < maxD; d += 0.25) { const i = this.cellOf(x + s * d, z + c * d); if (i < 0) return d; if (i !== last) { last = i; onCell && onCell(i); if (this.blocksSight(i)) return d; } }
    return maxD;
  }
  wallsBetween(x0, z0, x1, z1) { const L = Math.hypot(x1 - x0, z1 - z0); let n = 0, last = -1; for (let d = 0; d < L; d += 0.5) { const t = d / L; const i = this.cellOf(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t); if (i !== last && i >= 0 && this.blocksSight(i, false)) n++; last = i; } return n; }
  // A* over cells. opt: {enemy:bool}
  canPass(i, opt) { const t = this.type[i]; if (t === T.FLOOR) return true; if (t !== T.DOOR) return false; const d = this.doorAt.get(i); if (d.state !== 'closed') return true; if (opt.enemy) return true; if (opt.noDoors) return false; return !d.locked && !d.trapKnown; }
  nearestPassable(x, y, opt = {}) { if (!this.inb(x, y)) { x = Math.max(0, Math.min(this.W - 1, x)); y = Math.max(0, Math.min(this.H - 1, y)); } const s = this.idx(x, y); if (this.type[s] === T.FLOOR) return s; const seen = new Set([s]); const q = [s]; while (q.length) { const c = q.shift(); if (this.type[c] === T.FLOOR) return c; const cx = c % this.W, cy = (c / this.W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (!this.inb(nx, ny)) continue; const n = this.idx(nx, ny); if (!seen.has(n)) { seen.add(n); q.push(n); } } } return s; }
  findPath(sx, sy, gx, gy, opt = {}) {
    const W = this.W; const start = this.idx(sx, sy); let goal = this.idx(gx, gy);
    if (!this.canPass(goal, opt) || this.type[goal] === T.DOOR) goal = this.nearestPassable(gx, gy, opt);
    if (start === goal) return [start];
    const g = new Float32Array(this.W * this.H).fill(Infinity), from = new Int32Array(this.W * this.H).fill(-1); const open = new Heap(); g[start] = 0; open.push(start, 0);
    const gxn = goal % W, gyn = (goal / W) | 0; const h = (i) => { const dx = Math.abs(i % W - gxn), dy = Math.abs(((i / W) | 0) - gyn); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const closed = new Uint8Array(this.W * this.H); let it = 0;
    while (open.size && it++ < 20000) {
      const c = open.pop(); if (c === goal) break; if (closed[c]) continue; closed[c] = 1;
      const cx = c % W, cy = (c / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (!this.inb(nx, ny)) continue; const n = ny * W + nx;
        if (!this.canPass(n, opt)) continue;
        let cost = 1;
        if (dx && dy) { const a = cy * W + nx, b = ny * W + cx; if (this.type[a] !== T.FLOOR || this.type[b] !== T.FLOOR || this.type[n] === T.DOOR || this.type[c] === T.DOOR) continue; cost = 1.414; }
        if (this.type[n] === T.DOOR && this.doorAt.get(n).state === 'closed') cost += 2;
        const ng = g[c] + cost; if (ng < g[n]) { g[n] = ng; from[n] = c; open.push(n, ng + h(n)); }
      }
    }
    if (from[goal] === -1) return null;
    const path = [goal]; let c = goal; while (c !== start) { c = from[c]; path.push(c); } path.reverse(); return path;
  }
  segWalkable(x0, z0, x1, z1) { const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.01) return true; const nx = -(z1 - z0) / L * 0.3, nz = (x1 - x0) / L * 0.3; for (let d = 0; d <= L; d += 0.2) { const t = d / L, px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t; for (const o of [0, 1, -1]) { const i = this.cellOf(px + nx * o, pz + nz * o); if (i < 0 || this.type[i] !== T.FLOOR) return false; } } return true; }
  // turn cell path into smoothed waypoints; doors kept as explicit points
  waypoints(path, fromX, fromZ) {
    const W = this.W; const pts = path.map(i => ({ x: (i % W) + 0.5, z: ((i / W) | 0) + 0.5, door: this.type[i] === T.DOOR ? this.doorAt.get(i) : null }));
    const out = []; let cx = fromX, cz = fromZ; let k = 0;
    while (k < pts.length) {
      let far = k;
      for (let j = k; j < pts.length; j++) { if (pts[j].door) { far = j; break; } if (this.segWalkable(cx, cz, pts[j].x, pts[j].z)) far = j; else break; }
      // if a door is ahead, make sure we approach it head-on: add the cell before the door
      const p = pts[far]; if (p.door && far > k && out[out.length - 1] !== pts[far - 1]) { out.push(pts[far - 1]); }
      if (p.door && far === k && k > 0 && out[out.length - 1] !== pts[k - 1]) { /* already adjacent */ }
      out.push(p); cx = p.x; cz = p.z; k = far + 1;
      if (p.door && k < pts.length) { out.push(pts[k]); cx = pts[k].x; cz = pts[k].z; k++; }
    }
    return out;
  }
  // BFS free cells near (x,y) in same room, not in 'taken'
  freeCellsNear(x, y, n, taken = new Set(), sameRoom = true) {
    const s = this.nearestPassable(x, y); const room = this.room[s]; const res = []; const seen = new Set([s]); const q = [s];
    while (q.length && res.length < n) { const c = q.shift(); if (this.type[c] === T.FLOOR && !taken.has(c)) res.push(c); const cx = c % this.W, cy = (c / this.W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nx = cx + dx, ny = cy + dy; if (!this.inb(nx, ny)) continue; const j = this.idx(nx, ny); if (seen.has(j) || this.type[j] !== T.FLOOR) continue; if (sameRoom && this.room[j] !== room) continue; seen.add(j); q.push(j); } }
    return res;
  }
}
