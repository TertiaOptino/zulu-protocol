// ===== Batch 3: map surroundings (backdrops) =====
// Everything outside the playable grid: sky dome, terrain, sea, skylines, forests, roads, rigs, ports,
// plus ambient life (src/ambient.js). Built once per level from buildLevelScene(). Cheap enough for phones:
// merged geometry per family, instancing for repeats, LOD by quality, all within camera far (200 m).
import * as THREE from 'three';
import { GB, mat } from './geo.js';
import { T } from './level.js';
import { floorTex, containerTex, glowTex } from './textures.js';
import { treeGeo } from './trees.js';
import { Ambient, Path } from './ambient.js';

// ---------- small utils ----------
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v); }
const fbm = (x, y, o = 4) => { let a = 0, s = 0.5, f = 1; for (let i = 0; i < o; i++) { a += vnoise(x * f, y * f) * s; f *= 2.03; s *= 0.5; } return a / (1 - Math.pow(0.5, o)); };
const ridge = (x, y) => { let a = 0, s = 0.5, f = 1; for (let i = 0; i < 4; i++) { a += (1 - Math.abs(vnoise(x * f, y * f) * 2 - 1)) * s; f *= 2.1; s *= 0.5; } return a / 0.9375; };
const TC = {};
function canvasTex(key, w, h, draw, opts = {}) {
  if (TC[key]) return TC[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return (TC[key] = t);
}
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const strSeed = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---------- canvas textures ----------
// building facade: window grid, white so vertex colour tints the wall. 1 tile = 12 m x 12 m (4 x 4 windows)
const winTex = () => canvasTex('win', 256, 256, (x, w) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, w); const c = w / 4;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 40 + ((i * 7 + j * 13) % 5) * 9; x.fillStyle = `rgb(${v},${v + 6},${v + 14})`; x.fillRect(i * c + c * 0.18, j * c + c * 0.22, c * 0.64, c * 0.5); x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(i * c + c * 0.18, j * c + c * 0.22, c * 0.64, c * 0.08); } }, { repeat: true });
const winLit = () => canvasTex('winlit', 256, 256, (x, w) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, w); const c = w / 4;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const r = hash2(i * 3.1, j * 7.7); if (r < 0.45) continue; x.fillStyle = r > 0.85 ? '#cfe6ff' : r > 0.7 ? '#ffd890' : '#ffbf66'; x.fillRect(i * c + c * 0.18, j * c + c * 0.22, c * 0.64, c * 0.5); } }, { repeat: true });
const blobTex = () => canvasTex('blob', 64, 64, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
const cloudTex = () => canvasTex('cloud', 256, 128, (x, w, h) => { const r = rng(7); for (let i = 0; i < 26; i++) { const cx = w * (0.15 + r() * 0.7), cy = h * (0.35 + r() * 0.35), rr = h * (0.15 + r() * 0.25); const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); } });
const shaftTex = () => canvasTex('shaft', 64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); const v = x.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.25, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = v; x.fillRect(0, 0, w, h); });
const padTex = () => canvasTex('pad', 256, 256, (x, w) => { x.fillStyle = '#2f3a34'; x.fillRect(0, 0, w, w); x.strokeStyle = '#e8d040'; x.lineWidth = 10; x.beginPath(); x.arc(w / 2, w / 2, w * 0.4, 0, 6.29); x.stroke(); x.fillStyle = '#f0f0f0'; x.font = 'bold 150px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('H', w / 2, w / 2 + 6); });
// flags (2:3 cloth); key = country code
const FLAGS = {
  tr: (x, w, h) => { x.fillStyle = '#e30a17'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.beginPath(); x.arc(w * 0.36, h / 2, h * 0.25, 0, 6.29); x.fill(); x.fillStyle = '#e30a17'; x.beginPath(); x.arc(w * 0.4, h / 2, h * 0.2, 0, 6.29); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(w * 0.55, h / 2, h * 0.08, 0, 6.29); x.fill(); },
  de: (x, w, h) => { ['#000', '#dd0000', '#ffce00'].forEach((c, i) => { x.fillStyle = c; x.fillRect(0, (i * h) / 3, w, h / 3 + 1); }); },
  us: (x, w, h) => { for (let i = 0; i < 13; i++) { x.fillStyle = i % 2 ? '#fff' : '#b22234'; x.fillRect(0, (i * h) / 13, w, h / 13 + 1); } x.fillStyle = '#3c3b6e'; x.fillRect(0, 0, w * 0.4, h * 0.54); x.fillStyle = '#fff'; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) x.fillRect(w * 0.03 + i * w * 0.075, h * 0.05 + j * h * 0.125, 3, 3); },
  mx: (x, w, h) => { ['#006847', '#fff', '#ce1126'].forEach((c, i) => { x.fillStyle = c; x.fillRect((i * w) / 3, 0, w / 3 + 1, h); }); x.fillStyle = '#8a5a2a'; x.beginPath(); x.arc(w / 2, h / 2, h * 0.12, 0, 6.29); x.fill(); },
  ke: (x, w, h) => { ['#000', '#fff', '#bb0000', '#fff', '#006600'].forEach((c, i) => { x.fillStyle = c; const hh = [0.3, 0.05, 0.3, 0.05, 0.3][i], y = [0, 0.3, 0.35, 0.65, 0.7][i]; x.fillRect(0, y * h, w, hh * h + 1); }); x.fillStyle = '#bb0000'; x.beginPath(); x.ellipse(w / 2, h / 2, w * 0.07, h * 0.3, 0, 0, 6.29); x.fill(); },
  co: (x, w, h) => { x.fillStyle = '#fcd116'; x.fillRect(0, 0, w, h / 2); x.fillStyle = '#003893'; x.fillRect(0, h / 2, w, h / 4); x.fillStyle = '#ce1126'; x.fillRect(0, h * 0.75, w, h / 4); },
  br: (x, w, h) => { x.fillStyle = '#009c3b'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffdf00'; x.beginPath(); x.moveTo(w * 0.08, h / 2); x.lineTo(w / 2, h * 0.1); x.lineTo(w * 0.92, h / 2); x.lineTo(w / 2, h * 0.9); x.fill(); x.fillStyle = '#002776'; x.beginPath(); x.arc(w / 2, h / 2, h * 0.22, 0, 6.29); x.fill(); },
  kr: (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#cd2e3a'; x.beginPath(); x.arc(w / 2, h / 2, h * 0.22, Math.PI, 0); x.fill(); x.fillStyle = '#0047a0'; x.beginPath(); x.arc(w / 2, h / 2, h * 0.22, 0, Math.PI); x.fill(); x.fillStyle = '#000'; for (const [a, b] of [[0.2, 0.25], [0.8, 0.25], [0.2, 0.75], [0.8, 0.75]]) x.fillRect(w * a - 8, h * b - 6, 16, 12); },
  un: (x, w, h) => { x.fillStyle = '#4b92db'; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.arc(w / 2, h / 2, h * 0.25, 0, 6.29); x.stroke(); },
};
const flagTex = (k) => canvasTex('flag' + k, 96, 64, FLAGS[k] || FLAGS.un);

// ---------- sky ----------
const SKY = {
  day: { top: 0x3f74c0, hor: 0xc4d4e0, sea: 0x1d5066, fog: [70, 195], sun: 1 },
  overcast: { top: 0x7c8892, hor: 0xaeb6bc, sea: 0x3a4c56, fog: [55, 185], sun: 0.25 },
  dusk: { top: 0x2c3a6c, hor: 0xe6a070, sea: 0x2a3a52, fog: [60, 190], sun: 1.2 },
  night: { top: 0x03050c, hor: 0x18202e, sea: 0x0a1420, fog: [45, 180], sun: 0, stars: 1 },
};
function skyDome(S, preset, horCol) {
  const u = { cTop: { value: new THREE.Color(preset.top) }, cHor: { value: horCol.clone() }, sunDir: { value: S.sunDir.clone() }, sunK: { value: preset.sun }, stars: { value: preset.stars || 0 } };
  const m = new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 cTop, cHor, sunDir; uniform float sunK, stars; varying vec3 vD;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      void main(){ vec3 d = normalize(vD); float e = clamp(d.y, -0.2, 1.0);
        vec3 col = mix(cHor, cTop, pow(max(e, 0.0), 0.55)); col = mix(col, cHor * 0.8, smoothstep(0.0, -0.2, e));
        float s = max(dot(d, normalize(sunDir)), 0.0); col += vec3(1.0, 0.85, 0.6) * (pow(s, 8.0) * 0.25 + pow(s, 400.0) * 1.5) * sunK;
        if (stars > 0.5 && e > 0.05) { vec3 q = floor(d * 260.0); float st = step(0.9975, h3(q)); col += vec3(st) * 0.9 * smoothstep(0.05, 0.4, e); }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12), m); dome.frustumCulled = false; dome.renderOrder = -100; dome.name = 'b3sky';
  return dome;
}

// ---------- context ----------
function makeCtx(level, scene, root, quality, ctx) {
  const W = level.W, H = level.H, th = level.def.theme || {}; const time = th.time || 'day';
  const sd = th.sun || [0.5, 1, 0.3]; const sunDir = new THREE.Vector3(sd[0], Math.max(0.15, sd[1] * (time === 'dusk' ? 0.25 : 0.7)), sd[2]).normalize();
  const amb = new Ambient(root, quality); const k = amb.k; const rnd = rng(strSeed(level.def.key || level.def.name || 'map'));
  const S = { level, scene, root, quality, ctx, W, H, cx: W / 2, cz: H / 2, th, time, night: time === 'night', dusk: time === 'dusk', k, amb, rnd, sunDir, flats: [], waterFn: null, hfn: null, flatY: -0.12, mats: {} };
  S.n = (c) => Math.max(1, Math.round(c * k));
  S.pick = (a) => a[Math.floor(rnd() * a.length)];
  S.R = (a, b) => a + rnd() * (b - a);
  // signed distance outside the map rectangle (negative inside)
  S.dRect = (x, z) => { const dx = Math.max(-x, x - W, 0), dz = Math.max(-z, z - H, 0); const o = Math.hypot(dx, dz); return o > 0 ? o : -Math.min(x, W - x, z, H - z); };
  S.sideD = (x, z, s) => s === 'n' ? -z : s === 's' ? z - H : s === 'w' ? -x : x - W;
  S.outward = (s) => s === 'n' ? [0, -1] : s === 's' ? [0, 1] : s === 'w' ? [-1, 0] : [1, 0];
  S.sideMid = (s, d) => s === 'n' ? [W / 2, -d] : s === 's' ? [W / 2, H + d] : s === 'w' ? [-d, H / 2] : [W + d, H / 2];
  // a long straight road parallel to side s at distance d, running far past both corners
  S.sideRoad = (s, d, ext = 95) => (s === 'n' || s === 's') ? [[-ext, S.sideMid(s, d)[1]], [W + ext, S.sideMid(s, d)[1]]] : [[S.sideMid(s, d)[0], -ext], [S.sideMid(s, d)[0], H + ext]];
  // the side with the fewest deploy/exit cells: water, decks and other "busy" scenery go there
  const cnt = { n: 0, s: 0, w: 0, e: 0 }; const zs = level.zones || {};
  for (const key of Object.keys(zs)) for (const c of zs[key] || []) { const x = c.x ?? c[0], z = c.y ?? c[1]; const ds = { n: z, s: H - 1 - z, w: x, e: W - 1 - x }; let best = 'n'; for (const q in ds) if (ds[q] < ds[best]) best = q; cnt[best]++; }
  S.quiet = ['n', 's', 'w', 'e'].sort((a, b) => cnt[a] - cnt[b] || ({ n: 0, e: 1, s: 2, w: 3 }[a] - { n: 0, e: 1, s: 2, w: 3 }[b]))[0];
  S.busy = { n: 's', s: 'n', w: 'e', e: 'w' }[S.quiet];
  const distSeg = (x, z, a, b) => { const vx = b[0] - a[0], vz = b[1] - a[1], l = vx * vx + vz * vz || 1; const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l)); return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t); };
  S.nearFlat = (x, z) => { let m = 1e9; for (const f of S.flats) for (let i = 0; i < f.pts.length - (f.closed ? 0 : 1); i++) { const d = distSeg(x, z, f.pts[i], f.pts[(i + 1) % f.pts.length]) - f.w; if (d < m) m = d; } return m; };
  S.h = (x, z) => S.hfn ? S.hfn(x, z) : 0;
  S.inWater = (x, z, m = 0) => S.waterFn ? S.waterFn(x, z) > -m : false;
  S.std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.02, ...o });
  S.vmat = (key, o = {}) => S.mats[key] || (S.mats[key] = S.std({ vertexColors: true, ...o }));
  S.add = (geo, material, { shadow = false, recv = false, y = 0 } = {}) => { const m = new THREE.Mesh(geo, material); m.position.y = y; m.castShadow = shadow; m.receiveShadow = recv; m.matrixAutoUpdate = false; m.updateMatrix(); root.add(m); return m; };
  // random point in the ring d0..d1 outside the map that passes ok(x,z)
  S.ring = (d0, d1, ok = null, tries = 30) => { for (let t = 0; t < tries; t++) { const R = Math.max(W, H) / 2 + d1 + 4; const x = S.cx + (rnd() * 2 - 1) * R, z = S.cz + (rnd() * 2 - 1) * R; const d = S.dRect(x, z); if (d < d0 || d > d1) continue; if (ok && !ok(x, z)) continue; return [x, z]; } return null; };
  return S;
}

// ---------- terrain / water ----------
function terrain(S, { start = 40, ramp = 40, amp = 6, freq = 0.02, mtn = null, colors = [0x5a6a3a, 0x6e7a44], rock = 0x6a645a, snow = null, tex = true } = {}) {
  const R = Math.max(S.W, S.H) / 2 + 178, seg = S.quality === 'high' ? 150 : S.quality === 'medium' ? 110 : 72;
  const fy = S.flatY;
  S.hfn = (x, z) => {
    const d = S.dRect(x, z); let h = 0;
    if (d > start * 0.5) { h += amp * sm(start, start + ramp, d) * fbm(x * freq + 3.1, z * freq + 7.7); if (mtn) { const ds = mtn.side ? S.sideD(x, z, mtn.side) : d; h += mtn.amp * sm(mtn.d0, mtn.d1, ds) * (0.35 + 0.65 * ridge(x * mtn.f + 11, z * mtn.f + 5)); } }
    if (h > 0.05 && S.flats.length) { const nf = S.nearFlat(x, z); if (nf < 9) h = lerp(h * 0.18, h, sm(0, 9, nf)); }
    if (S.waterFn) { const wv = S.waterFn(x, z); if (wv > 0) h = lerp(h, -4.5, sm(0, 6, wv)); }
    return fy + h;
  };
  const g = new THREE.PlaneGeometry(R * 2, R * 2, seg, seg).rotateX(-Math.PI / 2); g.translate(S.cx, 0, S.cz);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), c2 = new THREE.Color();
  const top = (amp + (mtn ? mtn.amp : 0)) || 1;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const y = S.hfn(x, z); p.setY(i, y);
    c.set(colors[0]).lerp(c2.set(colors[1]), fbm(x * 0.05, z * 0.05, 3)); const hr = (y - fy) / top;
    if (hr > 0.35) c.lerp(c2.set(rock), sm(0.35, 0.7, hr)); if (snow && y - fy > snow) c.lerp(c2.set(0xf0f2f4), sm(snow, snow + 8, y - fy));
    if (y < fy - 0.6) c.lerp(c2.set(0x8a7e62), 0.6);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  let map = null; if (tex) { const key = 'tg' + Math.round(R); map = TC[key] || (TC[key] = (() => { const t = floorTex('ground', 0xffffff).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(R / 5, R / 5); return t; })()); }
  const m = S.add(g, S.std({ vertexColors: true, map, roughness: 0.95 }), { recv: true }); m.name = 'b3terrain'; return m;
}
function water(S, { y = -1.2, color = null, size = null, rough = 1 } = {}) {
  const R = size || Math.max(S.W, S.H) / 2 + 190, seg = S.quality === 'high' ? 140 : S.quality === 'medium' ? 90 : 50;
  const g = new THREE.PlaneGeometry(R * 2, R * 2, seg, seg).rotateX(-Math.PI / 2); g.translate(S.cx, 0, S.cz);
  const m = new THREE.MeshStandardMaterial({ color: color ?? S.sky.sea, roughness: 0.22, metalness: 0.15 });
  const T = S.amb.time, sky = { value: S.horCol.clone() }, A = { value: rough };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = T; sh.uniforms.uSky = sky; sh.uniforms.uAmp = A;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
uniform float uTime, uAmp; varying float vB3H;
#define B3W(dx,dz,f,a,s) { vec2 D = normalize(vec2(dx,dz)); float ph = dot(D,P)*f + uTime*s; hh += a*uAmp*sin(ph); g += a*uAmp*f*cos(ph)*D; }`)
      .replace('#include <beginnormal_vertex>', `vec2 P = (modelMatrix * vec4(position,1.0)).xz; float hh = 0.0; vec2 g = vec2(0.0);
B3W(1.0,0.35,0.16,0.32,1.0) B3W(-0.4,1.0,0.27,0.18,1.5) B3W(0.8,-0.7,0.53,0.08,2.3) B3W(-1.0,-0.2,1.1,0.035,3.4)
vB3H = hh; vec3 objectNormal = normalize(vec3(-g.x, 1.0, -g.y));
#ifdef USE_TANGENT
vec3 objectTangent = vec3(tangent.xyz);
#endif`)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position); transformed.y += hh;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSky; uniform float uAmp; varying float vB3H;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float b3f = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.0); totalEmissiveRadiance += uSky * b3f * 0.55;
float b3foam = smoothstep(0.34 * uAmp, 0.55 * uAmp, vB3H); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.9, 0.92), b3foam * 0.55);`);
  };
  m.customProgramCacheKey = () => 'b3water';
  const mesh = new THREE.Mesh(g, m); mesh.position.y = y; mesh.receiveShadow = true; mesh.name = 'b3water'; S.root.add(mesh); return mesh;
}
function clipGround(S, x0, z0, x1, z1) {
  const gr = S.ctx.ground; if (!gr) return; gr.geometry.dispose(); gr.geometry = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2); gr.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const mp = gr.material.map; if (mp) mp.repeat.set((x1 - x0) / 8, (z1 - z0) / 8);
}
// ground clipped at distance d on side s (so water can come in there)
function clipSide(S, s, d, far = 40) { const W = S.W, H = S.H; clipGround(S, s === 'w' ? -d : -far, s === 'n' ? -d : -far, s === 'e' ? W + d : W + far, s === 's' ? H + d : H + far); }
// concrete quay wall + bollards + edge stripe along side s at distance d
function quay(S, s, d, { ext = 95, y = 0.03 } = {}) {
  const b = new GB(), W = S.W, H = S.H, hz = s === 'n' || s === 's';
  const [mx, mz] = S.sideMid(s, d), L = (hz ? W : H) + ext * 2, o = S.outward(s);
  if (hz) { b.box(W / 2, -1.6, mz - o[1] * 0.5, L, 3.3, 1, 0x7a786e, 0x8a887e, 0x3a3a34); b.hquad(-ext, mz - o[1] * 1.2 - 0.25, W + ext, mz - o[1] * 1.2 + 0.25, y + 0.01, 0xd8b020); }
  else { b.box(mx - o[0] * 0.5, -1.6, H / 2, 1, 3.3, L, 0x7a786e, 0x8a887e, 0x3a3a34); b.hquad(mx - o[0] * 1.2 - 0.25, -ext, mx - o[0] * 1.2 + 0.25, H + ext, y + 0.01, 0xd8b020); }
  for (let t = -ext; t < (hz ? W : H) + ext; t += 9) { const x = hz ? t : mx - o[0] * 0.6, z = hz ? mz - o[1] * 0.6 : t; b.box(x, 0.3, z, 0.4, 0.55, 0.4, 0x2a2a2a); }
  // tyre fenders on the wall face
  for (let t = -ext + 4; t < (hz ? W : H) + ext; t += 12) { const x = hz ? t : mx + o[0] * 0.05, z = hz ? mz + o[1] * 0.05 : t; b.box(x, -0.9, z, hz ? 0.9 : 0.3, 1.4, hz ? 0.3 : 0.9, 0x1a1a1a); }
  // concrete apron between ground clip and quay edge (so there is no gap)
  if (hz) { b.hquad(-ext, s === 'n' ? -d : H, -40, s === 'n' ? 0 : H + d, 0.01, 0x8a887e, 0.25); b.hquad(W + 40, s === 'n' ? -d : H, W + ext, s === 'n' ? 0 : H + d, 0.01, 0x8a887e, 0.25); }
  else { b.hquad(s === 'w' ? -d : W, -ext, s === 'w' ? 0 : W + d, -40, 0.01, 0x8a887e, 0.25); b.hquad(s === 'w' ? -d : W, H + 40, s === 'w' ? 0 : W + d, H + ext, 0.01, 0x8a887e, 0.25); }
  S.add(b.build(), S.vmat('quay', { map: floorTex('concrete', 0xffffff) }), { recv: true });
}

// ---------- buildings ----------
// box sides with facade UVs (1 tile = 12 m) + flat roof in a second builder
function sideBox(b, rb, x, z, w, d, h, col, roof, y0 = -0.5) {
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y0 + h, s = 1 / 12, v0 = 0, v1 = h * s;
  b.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, [[x0 * s, v0], [x1 * s, v0], [x1 * s, v1], [x0 * s, v1]]);
  b.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col, [[x1 * s, v0], [x0 * s, v0], [x0 * s, v1], [x1 * s, v1]]);
  b.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col, [[z1 * s, v0], [z0 * s, v0], [z0 * s, v1], [z1 * s, v1]]);
  b.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col, [[z0 * s, v0], [z1 * s, v0], [z1 * s, v1], [z0 * s, v1]]);
  rb.hquad(x0, z0, x1, z1, y1, roof, 0.1);
  return y1;
}
function city(S, { n = 40, d0 = 18, d1 = 120, h = [8, 30], w = [10, 22], pal = [0xb8b0a0, 0xc8c0b0, 0x9a948a, 0xd0c8b8, 0x8a8a90], roof = 0x5a5a58, ok = null, tallP = 0.15, tall = [40, 70], beacons = true, lit = null, base = null, details = true, list = null } = {}) {
  const b = new GB(), rb = new GB(), out = list || [], N = S.n(n);
  for (let i = 0; i < N; i++) {
    const p = S.ring(d0, d1, (x, z) => !S.inWater(x, z, 8) && S.nearFlat(x, z) > 4 && (!ok || ok(x, z))); if (!p) continue;
    const ww = S.R(w[0], w[1]), dd = S.R(w[0], w[1]); if (out.some((o) => Math.abs(o.x - p[0]) < (o.w + ww) / 2 + 2 && Math.abs(o.z - p[1]) < (o.d + dd) / 2 + 2)) continue;
    const dd0 = S.dRect(p[0], p[1]), isT = S.rnd() < tallP && dd0 > 40; let hh = isT ? S.R(tall[0], tall[1]) : S.R(h[0], h[1]); const y0 = (base ?? S.h(p[0], p[1])) - 0.6;
    if (dd0 < 36) hh = Math.max(4, Math.min(hh, base != null ? -4 + (30 * dd0) / 36 - y0 : lerp(10, 22, dd0 / 36))); // keep the tactical camera's view of edge cells clear
    const top = sideBox(b, rb, p[0], p[1], ww, dd, hh, S.pick(pal), roof, y0); out.push({ x: p[0], z: p[1], w: ww, d: dd, top });
    if (details && S.rnd() < 0.6) { rb.box(p[0] + S.R(-ww / 4, ww / 4), top + 0.8, p[1] + S.R(-dd / 4, dd / 4), 2.2, 1.6, 1.6, 0x8a8a88); }
    if (isT && S.rnd() < 0.5) { rb.box(p[0], top + 2.5, p[1], ww * 0.5, 5, dd * 0.5, S.pick(pal), roof); }
    if (beacons && isT && (S.night || S.dusk) && out.length % 2 === 0) { const g = glow(S, p[0], top + 0.8, p[1], 2.2, 'rgba(255,60,40,1)'); S.amb.blink(g, 1.4 + S.rnd()); }
  }
  const L = lit ?? (S.night ? 1.0 : S.dusk ? 0.45 : 0);
  const m = S.mats.bld || (S.mats.bld = S.std({ vertexColors: true, map: winTex(), emissiveMap: winLit(), emissive: 0xffffff, emissiveIntensity: L, roughness: 0.75 }));
  if (b.p.length) S.add(b.build(), m); if (rb.p.length) S.add(rb.build(), S.vmat('roof'));
  return out;
}
function village(S, { n = 30, d0 = 12, d1 = 90, pal = [0xb89a74, 0xc4a882, 0xa88a68], ok = null, h = [3, 5.5], w = [5, 10], walls = true } = {}) {
  const b = new GB(), N = S.n(n), out = [];
  for (let i = 0; i < N; i++) { const p = S.ring(d0, d1, (x, z) => !S.inWater(x, z, 6) && S.nearFlat(x, z) > 3 && (!ok || ok(x, z))); if (!p) continue;
    const ww = S.R(w[0], w[1]), dd = S.R(w[0], w[1]); if (out.some((o) => Math.abs(o.x - p[0]) < (o.w + ww) / 2 + 3 && Math.abs(o.z - p[1]) < (o.d + dd) / 2 + 3)) continue;
    const hh = S.R(h[0], h[1]), y = S.h(p[0], p[1]), col = S.pick(pal); out.push({ x: p[0], z: p[1], w: ww, d: dd });
    b.box(p[0], y + hh / 2 - 0.4, p[1], ww, hh, dd, col, col, null, 0.25); b.box(p[0], y + hh - 0.3, p[1], ww + 0.3, 0.35, dd + 0.3, col, new THREE.Color(col).multiplyScalar(0.85).getHex());
    b.box(p[0] + ww / 2 + 0.01, y + hh * 0.55 - 0.4, p[1], 0.05, 0.9, 0.8, 0x2a2420); b.box(p[0], y + 0.6, p[1] - dd / 2 - 0.01, 1.1, 2, 0.05, 0x4a3828);
    if (walls && S.rnd() < 0.5) { const e = 3, X0 = p[0] - ww / 2 - e, X1 = p[0] + ww / 2 + e, Z0 = p[1] - dd / 2 - e, Z1 = p[1] + dd / 2 + e; for (const [ax, az, bx, bz] of [[X0, Z0, X1, Z0], [X0, Z1, X1, Z1], [X0, Z0, X0, Z1], [X1, Z0, X1, Z1]]) b.box((ax + bx) / 2, y + 0.6, (az + bz) / 2, Math.abs(bx - ax) + 0.4, 1.8, Math.abs(bz - az) + 0.4, col); }
  }
  if (b.p.length) S.add(b.build(), S.vmat('vil', { map: floorTex('concrete', 0xffffff) }), { recv: true });
  return out;
}

// ---------- vegetation ----------
const _o = new THREE.Object3D(), _c = new THREE.Color();
function forest(S, kind, n, d0, d1, { ok = null, scale = [1.6, 3], near = 26, tint = 0.08, list = null } = {}) {
  const pts = list || []; const N = S.n(n);
  if (!list) for (let i = 0; i < N; i++) { const p = S.ring(d0, d1, (x, z) => !S.inWater(x, z, 1) && S.nearFlat(x, z) > 2.5 && (!ok || ok(x, z))); if (p) pts.push(p); }
  if (!pts.length) return;
  const nearP = pts.filter((p) => S.dRect(p[0], p[1]) < near), farP = pts.filter((p) => S.dRect(p[0], p[1]) >= near);
  const m = S.vmat('tree', { roughness: 0.92 });
  for (const [P, lod] of [[nearP, 0], [farP, 1]]) { if (!P.length) continue;
    const im = new THREE.InstancedMesh(treeGeo(kind, lod), m, P.length); im.castShadow = lod === 0 && S.quality === 'high';
    P.forEach((p, i) => { const s = S.R(scale[0], scale[1]) * lerp(0.55, 1, sm(0, 22, S.dRect(p[0], p[1]))); _o.position.set(p[0], S.h(p[0], p[1]) - 0.1, p[1]); _o.rotation.set((S.rnd() - 0.5) * 0.08, S.rnd() * 6.28, (S.rnd() - 0.5) * 0.08); _o.scale.set(s, s * S.R(0.85, 1.2), s); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); im.setColorAt(i, _c.setRGB(1, 1, 1).offsetHSL((S.rnd() - 0.5) * tint * 0.3, 0, (S.rnd() - 0.5) * tint)); });
    im.computeBoundingSphere(); S.root.add(im); }
  return pts;
}
// undergrowth on the exterior ground cells of the map (uses the fog-of-war material so it hides like the map does)
function groundDetail(S, kinds, dens = 0.5, { outside = 0, cap = null, scale = [0.7, 1.2] } = {}) {
  const L = S.level, W = S.W, H = S.H, CAP = cap ?? (S.quality === 'high' ? 2200 : S.quality === 'medium' ? 1100 : 350);
  const per = kinds.map(() => []); let tot = 0;
  for (let y = 0; y < H && tot < CAP; y++) for (let x = 0; x < W && tot < CAP; x++) { const i = y * W + x;
    if (!L.ext[i] || L.floor[i] !== 'ground' || L.type[i] !== T.FLOOR || L.prop[i]) continue; if (S.rnd() > dens) continue;
    const k = Math.floor(S.rnd() * kinds.length); per[k].push([x + 0.15 + S.rnd() * 0.7, y + 0.15 + S.rnd() * 0.7, true]); tot++; }
  for (let i = 0; i < S.n(outside); i++) { const p = S.ring(0.5, 38, (x, z) => !S.inWater(x, z, 1) && S.nearFlat(x, z) > 1); if (p) per[Math.floor(S.rnd() * kinds.length)].push([p[0], p[1], false]); }
  const fm = S.ctx.std ? S.ctx.std({ vertexColors: true, roughness: 0.95 }) : S.vmat('tree');
  kinds.forEach((kind, k) => { const P = per[k]; if (!P.length) return; const im = new THREE.InstancedMesh(treeGeo(kind, 1), fm, P.length);
    P.forEach((p, i) => { const s = S.R(scale[0], scale[1]) * (kind === 'rock' ? 0.7 : 1); _o.position.set(p[0], p[2] ? 0.01 : Math.max(0, S.h(p[0], p[1])), p[1]); _o.rotation.set(0, S.rnd() * 6.28, 0); _o.scale.set(s, s, s); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); im.setColorAt(i, _c.setRGB(1, 1, 1).offsetHSL(0, 0, (S.rnd() - 0.5) * 0.12)); });
    im.computeBoundingSphere(); im.receiveShadow = true; S.root.add(im); });
}
// soft coloured patches on the ground outside the map (fields, dirt, sand)
function groundPatches(S, n, colors, { d0 = 0, d1 = 110, size = [10, 30], op = 0.5, y = null } = {}) {
  const b = new GB(); for (let i = 0; i < S.n(n); i++) { const p = S.ring(d0, d1, (x, z) => !S.inWater(x, z, 2)); if (!p) continue; const r = S.R(size[0], size[1]); const yy = y ?? (S.dRect(p[0], p[1]) < 40 ? 0.015 : S.h(p[0], p[1]) + 0.08); b.quad([p[0] - r, yy, p[1] + r], [p[0] + r, yy, p[1] + r], [p[0] + r, yy, p[1] - r], [p[0] - r, yy, p[1] - r], [0, 1, 0], S.pick(colors), [[0, 0], [1, 0], [1, 1], [0, 1]]); }
  if (!b.p.length) return; const m = new THREE.MeshBasicMaterial({ vertexColors: true, map: blobTex(), transparent: true, opacity: op, depthWrite: false }); const mesh = S.add(b.build(), m); mesh.renderOrder = -1;
}
// field patchwork: flat coloured rectangles following the terrain loosely
function fields(S, n, colors, { d0 = 8, d1 = 120, w = [14, 34], ok = null } = {}) {
  const b = new GB(); for (let i = 0; i < S.n(n); i++) { const p = S.ring(d0, d1, (x, z) => !S.inWater(x, z, 3) && S.nearFlat(x, z) > 6 && (!ok || ok(x, z))); if (!p) continue;
    const ww = S.R(w[0], w[1]), dd = S.R(w[0], w[1]), col = S.pick(colors), seg = 4; const y = (x, z) => (S.dRect(x, z) < 40 ? 0.016 : S.h(x, z) + 0.1);
    for (let a = 0; a < seg; a++) for (let c = 0; c < seg; c++) { const x0 = p[0] - ww / 2 + (ww * a) / seg, x1 = x0 + ww / seg, z0 = p[1] - dd / 2 + (dd * c) / seg, z1 = z0 + dd / seg; b.quad([x0, y(x0, z1), z1], [x1, y(x1, z1), z1], [x1, y(x1, z0), z0], [x0, y(x0, z0), z0], [0, 1, 0], col, [[x0 * 0.3, z1 * 0.3], [x1 * 0.3, z1 * 0.3], [x1 * 0.3, z0 * 0.3], [x0 * 0.3, z0 * 0.3]]); } }
  if (b.p.length) S.add(b.build(), S.vmat('field', { map: floorTex('ground', 0xffffff), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), { recv: true });
}

// ---------- roads (planned before terrain so terrain flattens under them, drawn after) ----------
function roads(S, pts, { w = 7, closed = false, color = 0x4a4a4e, line = true, walk = 0 } = {}) {
  S.flats.push({ pts, w: w / 2 + walk + 1, closed }); (S.roadQ ||= []).push({ pts, w, closed, color, line, walk });
  return new Path(pts, closed);
}
function ringPts(S, d, dq = null) { const W = S.W, H = S.H, q = S.quiet, D = (s) => (dq != null && s === q ? dq : d); return [[-D('w'), -D('n')], [W + D('e'), -D('n')], [W + D('e'), H + D('s')], [-D('w'), H + D('s')]]; }
function inGround(S, x, z) { const g = S.ctx.ground; if (!g || !g.visible) return false; const p = g.geometry.parameters; return Math.abs(x - g.position.x) < p.width / 2 && Math.abs(z - g.position.z) < p.height / 2; }
function roadY(S, x, z) { return inGround(S, x, z) ? 0.03 : S.h(x, z) + 0.07; }
function drawRoads(S) {
  if (!S.roadQ) return; const b = new GB(), lb = new GB();
  for (const r of S.roadQ) { const P = r.pts, n = r.closed ? P.length : P.length - 1;
    for (let i = 0; i < n; i++) { const a = P[i], c = P[(i + 1) % P.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]); if (len < 0.1) continue; const dx = (c[0] - a[0]) / len, dz = (c[1] - a[1]) / len, px = -dz, pz = dx;
      const st = Math.max(1, Math.ceil(len / 5)); const hw = r.w / 2 + r.walk;
      for (let j = 0; j < st; j++) { const t0 = (j / st) * len - (j === 0 ? hw * 0.5 : 0), t1 = ((j + 1) / st) * len + (j === st - 1 ? hw * 0.5 : 0); const p0 = [a[0] + dx * t0, a[1] + dz * t0], p1 = [a[0] + dx * t1, a[1] + dz * t1];
        const q = (o0, o1, col, dy = 0, tgt = b) => { const A = [p0[0] + px * o0, p0[1] + pz * o0], B = [p1[0] + px * o0, p1[1] + pz * o0], C = [p1[0] + px * o1, p1[1] + pz * o1], D = [p0[0] + px * o1, p0[1] + pz * o1];
          const v = (p) => [p[0], roadY(S, p[0], p[1]) + dy, p[1]]; const pts = [v(A), v(B), v(C), v(D)]; const up = (B[0] - A[0]) * (D[1] - A[1]) - (B[1] - A[1]) * (D[0] - A[0]) > 0; // ensure upward winding
          if (up) tgt.quad(pts[0], pts[3], pts[2], pts[1], [0, 1, 0], col, [[A[0] * 0.2, A[1] * 0.2], [D[0] * 0.2, D[1] * 0.2], [C[0] * 0.2, C[1] * 0.2], [B[0] * 0.2, B[1] * 0.2]]);
          else tgt.quad(pts[0], pts[1], pts[2], pts[3], [0, 1, 0], col, [[A[0] * 0.2, A[1] * 0.2], [B[0] * 0.2, B[1] * 0.2], [C[0] * 0.2, C[1] * 0.2], [D[0] * 0.2, D[1] * 0.2]]); };
        q(-r.w / 2, r.w / 2, r.color);
        if (r.walk) { q(r.w / 2, r.w / 2 + r.walk, 0x8a8880, 0.08); q(-r.w / 2 - r.walk, -r.w / 2, 0x8a8880, 0.08); }
        if (r.line && j % 2 === 0) { p1[0] = p0[0] + (p1[0] - p0[0]) * 0.5; p1[1] = p0[1] + (p1[1] - p0[1]) * 0.5; q(-0.09, 0.09, 0xd8d4c0, 0.01, lb); }
      } } }
  if (b.p.length) S.add(b.build(), S.vmat('road', { map: floorTex('concrete', 0xffffff), roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { recv: true });
  if (lb.p.length) S.add(lb.build(), S.vmat('roadl', { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
}
// street lamps along a path (glow sprites at night/dusk)
function lamps(S, path, { every = 22, off = 4.6, max = 40 } = {}) {
  const b = new GB(); const lit = S.night || S.dusk; let n = 0;
  for (let s = 0; s < path.L && n < S.n(max); s += every, n++) { const r = path.sample(s); const side = n % 2 ? 1 : -1; const x = r.x - r.dz * off * side, z = r.z + r.dx * off * side, y = roadY(S, x, z);
    b.box(x, y + 3.5, z, 0.16, 7, 0.16, 0x4a4c50); b.box(x + r.dz * side * 0.8, y + 7, z - r.dx * side * 0.8, 0.5, 0.18, 0.3, 0x3a3c40);
    if (lit) glow(S, x + r.dz * side * 0.8, y + 6.75, z - r.dx * side * 0.8, 3.2, 'rgba(255,200,120,1)'); }
  if (b.p.length) S.add(b.build(), S.vmat('lamp', { metalness: 0.5, roughness: 0.5 }));
}
function glow(S, x, y, z, size, css = 'rgba(255,220,140,1)', { op = 0.9 } = {}) {
  const key = 'glow' + css + op; const m = S.mats[key] || (S.mats[key] = new THREE.SpriteMaterial({ map: glowTex(css), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op, toneMapped: false }));
  const sp = new THREE.Sprite(m); sp.position.set(x, y, z); sp.scale.set(size, size, size); S.root.add(sp); return sp;
}
function clouds(S, n = 12, { y = [28, 60], color = 0xffffff, op = 0.75, d = [95, 150] } = {}) {
  const g = new THREE.Group(); g.position.set(S.cx, 0, S.cz); S.root.add(g);
  const m = new THREE.SpriteMaterial({ map: cloudTex(), color, transparent: true, opacity: op, depthWrite: false, fog: false });
  for (let i = 0; i < S.n(n); i++) { const a = S.rnd() * 6.28, r = S.R(d[0], d[1]); const sp = new THREE.Sprite(m); sp.position.set(Math.cos(a) * r, S.R(y[0], y[1]), Math.sin(a) * r); const s = S.R(40, 75); sp.scale.set(s, s * 0.45, 1); sp.renderOrder = -50; g.add(sp); }
  S.amb.spin(g, 'y', 0.004); return g;
}
// god rays: crossed additive planes leaning along the sun
function shafts(S, n = 8, { op = 0.07, color = 0xfff2d0, inMap = 0.5, h = 26 } = {}) {
  const m = new THREE.MeshBasicMaterial({ map: shaftTex(), color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(4, h).translate(0, h / 2, 0); const tilt = Math.atan2(Math.hypot(S.sunDir.x, S.sunDir.z), S.sunDir.y) * 0.8, yaw = Math.atan2(S.sunDir.x, S.sunDir.z);
  for (let i = 0; i < S.n(n); i++) { const p = S.rnd() < inMap ? [S.R(2, S.W - 2), S.R(2, S.H - 2)] : S.ring(2, 40); if (!p) continue;
    const g = new THREE.Group(); g.position.set(p[0], 0, p[1]); g.rotation.set(0, yaw, 0);
    for (const ry of [0, Math.PI / 2]) { const pl = new THREE.Mesh(geo, m); pl.rotation.set(tilt, ry, 0, 'YXZ'); pl.renderOrder = 5; g.add(pl); }
    g.scale.setScalar(S.R(0.7, 1.5)); S.root.add(g); const ph = S.rnd() * 6; S.amb.add((dt, t) => { g.children[0].material.opacity = op * (0.75 + 0.25 * Math.sin(t * 0.3 + ph)); }); }
}
function mist(S, n = 10, { d = [10, 90], y = [0.5, 3], op = 0.22, color = 0xdfe6ea, size = [30, 60], vx = 0.6, yb = null } = {}) {
  const m = new THREE.SpriteMaterial({ map: blobTex(), color, transparent: true, opacity: op, depthWrite: false }); const list = [];
  for (let i = 0; i < S.n(n); i++) { const p = S.ring(d[0], d[1]); if (!p) continue; const sp = new THREE.Sprite(m); const s = S.R(size[0], size[1]); sp.scale.set(s, s * 0.22, 1); sp.position.set(p[0], (yb ?? Math.max(0, S.h(p[0], p[1]))) + S.R(y[0], y[1]), p[1]); sp.userData.sp = S.R(0.6, 1.4); S.root.add(sp); list.push(sp); }
  const R = Math.max(S.W, S.H) / 2 + d[1]; S.amb.drift(list, vx, vx * 0.3, S.cx - R, S.cx + R, S.cz - R, S.cz + R);
}
function flagsAt(S, list, { h = 8 } = {}) { for (const [x, z, code] of list) S.amb.flag(x, Math.max(0, S.h(x, z)), z, { h, tex: flagTex(code), w: 2.4 }); }

// ---------- steel & landmarks ----------
const UP = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
const CYL = {}; const unitCyl = (seg) => CYL[seg] || (CYL[seg] = new THREE.CylinderGeometry(1, 1, 1, seg, 1));
function beam(b, a, c, r, col, seg = 6) { _v.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]); const L = _v.length(); if (L < 1e-3) return; _q.setFromUnitVectors(UP, _v.clone().normalize());
  _m.compose(new THREE.Vector3((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2), _q, new THREE.Vector3(r, L, r)); b.geom(unitCyl(seg), _m, col); }
// square lattice tower from y0 to y1 (derricks, pylons, masts)
function lattice(b, x, z, w0, w1, y0, y1, col, levels = 6, r = 0.12) {
  const c = (y) => { const t = (y - y0) / (y1 - y0), w = lerp(w0, w1, t) / 2; return [[x - w, y, z - w], [x + w, y, z - w], [x + w, y, z + w], [x - w, y, z + w]]; };
  const B = c(y0), Tp = c(y1); for (let i = 0; i < 4; i++) beam(b, B[i], Tp[i], r * 1.6, col, 4);
  for (let l = 0; l < levels; l++) { const ya = lerp(y0, y1, l / levels), yb = lerp(y0, y1, (l + 1) / levels); const A = c(ya), C = c(yb); for (let i = 0; i < 4; i++) { beam(b, C[i], C[(i + 1) % 4], r, col, 4); beam(b, A[i], C[(i + 1) % 4], r, col, 4); } }
}
// ship-to-shore container crane, local +x points out over the water
const GANTRY = {};
function gantryGeo(col) { return GANTRY[col] || (GANTRY[col] = (() => { const b = new GB(), dk = 0x2a2a2a;
  for (const z of [-7, 7]) { b.box(-8, 15, z, 1.4, 30, 1.4, col); b.box(8, 15, z, 1.4, 30, 1.4, col); b.box(0, 1, z, 18, 1, 1.2, dk); beam(b, [-8, 2, z], [8, 22, z], 0.5, col, 4); }
  b.box(-8, 22, 0, 1.2, 1.2, 15.4, col); b.box(8, 22, 0, 1.2, 1.2, 15.4, col);
  b.box(14, 31, 0, 70, 2.2, 3.2, col); b.box(-12, 38, 0, 2, 16, 2, col); beam(b, [-12, 46, 0], [44, 32, 0], 0.25, dk, 4); beam(b, [-12, 46, 0], [-22, 32, 0], 0.25, dk, 4);
  b.box(-17, 29, 0, 9, 4, 6, 0x6a6a6a); b.box(10, 28.6, 0, 3.2, 2.6, 3, 0xe8e8e0); b.box(20, 24, 0, 0.12, 12, 0.12, dk); b.box(20, 18, 0, 3, 0.6, 2.6, 0xd8a020);
  return b.build(); })()); }
function gantry(S, x, z, ry, col = 0xc8402a) { const m = new THREE.Mesh(gantryGeo(col), S.vmat('steel', { metalness: 0.4, roughness: 0.6 })); m.position.set(x, 0, z); m.rotation.y = ry; m.castShadow = S.quality === 'high'; S.root.add(m); S.amb.add(() => { m.visible = S.amb.near(x, 18, z, 16, 24) > 0.5; }); return m; }
function containers(S, rects, { maxN = 400 } = {}) {
  const cols = [0xb03a2a, 0x2a5a8a, 0x3a7a3a, 0xc8a030, 0x7a7a7a, 0xc86a20, 0x2a8a8a, 0x8a2a5a, 0xe0e0d8]; const list = [];
  for (const [x0, z0, nx, nz, mx, ry = 0] of rects) for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const st = 1 + Math.floor(S.rnd() * mx); for (let k = 0; k < st; k++) { if (S.rnd() < 0.08) continue; const lx = i * 6.4, lz = j * 2.7, c = Math.cos(ry), s = Math.sin(ry); list.push([x0 + lx * c + lz * s, k * 2.6 + 1.3, z0 - lx * s + lz * c, ry]); } }
  const N = Math.min(list.length, S.n(maxN)); if (!N) return;
  const tex = containerTex(); const im = new THREE.InstancedMesh(new THREE.BoxGeometry(6.1, 2.6, 2.44), S.mats.cont || (S.mats.cont = S.std({ map: tex, roughness: 0.7, metalness: 0.3 })), N);
  for (let i = 0; i < N; i++) { const [x, y, z, ry] = list[i]; _o.position.set(x, y + Math.max(0, S.h(x, z)), z); _o.rotation.set(0, ry, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); im.setColorAt(i, _c.set(cols[(i * 7 + (i >> 2)) % cols.length])); }
  im.castShadow = S.quality === 'high'; im.receiveShadow = true; S.root.add(im);
}
function turbine(S, x, z, h = 60) {
  const y = S.h(x, z); const m = S.vmat('white', { roughness: 0.5 });
  const b = new GB(); b.geom(new THREE.CylinderGeometry(0.9, 1.8, h, 10), mat(x, y + h / 2, z), 0xeeeeee); b.box(x, y + h + 1, z + 1, 2.2, 2.2, 6, 0xe8e8e8); S.add(b.build(), m);
  const rb = new GB(); for (let i = 0; i < 3; i++) rb.geom(new THREE.BoxGeometry(1.2, h * 0.48, 0.3).translate(0, h * 0.24, 0), mat(0, 0, 0, 0, 0, (i * Math.PI * 2) / 3), 0xf4f4f4);
  const rot = new THREE.Mesh(rb.build(), m); rot.position.set(x, y + h + 1, z - 2.2); rot.rotation.z = S.rnd() * 6; S.root.add(rot); S.amb.spin(rot, 'z', 0.9 + S.rnd() * 0.5);
  if (S.night || S.dusk) S.amb.blink(glow(S, x, y + h + 2.4, z + 1, 2, 'rgba(255,50,40,1)'), 2);
}
function cone(S, x, z, r, h, col = 0x6a6258, { snow = 0, seg = 18, y = null } = {}) {
  const g = new THREE.ConeGeometry(r, h, seg, 6); const p = g.attributes.position; const cc = new Float32Array(p.count * 3), c = new THREE.Color(), sn = new THREE.Color(0xf2f4f6);
  for (let i = 0; i < p.count; i++) { const px = p.getX(i), py = p.getY(i), pz = p.getZ(i); const t = (py + h / 2) / h; if (t < 0.98) { const j = 1 + (hash2(px * 0.3, pz * 0.3) - 0.5) * 0.25 * (1 - t); p.setX(i, px * j); p.setZ(i, pz * j); p.setY(i, py + (hash2(pz, px) - 0.5) * h * 0.05 * (1 - t)); }
    c.set(col).offsetHSL(0, 0, (hash2(px, pz) - 0.5) * 0.06); if (snow && t > 1 - snow) c.lerp(sn, sm(1 - snow, 1 - snow + 0.08, t)); cc[i * 3] = c.r; cc[i * 3 + 1] = c.g; cc[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(cc, 3)); g.computeVertexNormals(); g.translate(x, (y ?? S.flatY) + h / 2 - 2, z); return S.add(g, S.vmat('mtn', { flatShading: true }));
}
// oil platform legs + bracing from deck (top) down into the sea
function rigLegs(b, x0, z0, x1, z1, top, sea, col = 0x8a7a5a) {
  const xs = [x0, x1], zs = [z0, z1]; if (x1 - x0 > 40) xs.splice(1, 0, (x0 + x1) / 2); if (z1 - z0 > 40) zs.splice(1, 0, (z0 + z1) / 2);
  const legs = []; for (const x of xs) for (const z of zs) legs.push([x, z]);
  for (const [x, z] of legs) { beam(b, [x, top, z], [x, sea - 8, z], 1.5, col, 10); b.geom(new THREE.CylinderGeometry(1.9, 1.9, 1.2, 10), mat(x, sea + 0.4, z), 0xd0a020); }
  const lv = [top - 6, lerp(top, sea, 0.45), sea + 3];
  for (const y of lv) { for (let i = 0; i < xs.length - 1; i++) for (const z of zs) beam(b, [xs[i], y, z], [xs[i + 1], y, z], 0.45, col, 6); for (let j = 0; j < zs.length - 1; j++) for (const x of xs) beam(b, [x, y, zs[j]], [x, y, zs[j + 1]], 0.45, col, 6); }
  for (let l = 0; l < lv.length - 1; l++) { const ya = lv[l], yb = lv[l + 1]; for (let i = 0; i < xs.length - 1; i++) for (const z of [zs[0], zs[zs.length - 1]]) { beam(b, [xs[i], ya, z], [xs[i + 1], yb, z], 0.35, col, 5); beam(b, [xs[i + 1], ya, z], [xs[i], yb, z], 0.35, col, 5); }
    for (let j = 0; j < zs.length - 1; j++) for (const x of [xs[0], xs[xs.length - 1]]) { beam(b, [x, ya, zs[j]], [x, yb, zs[j + 1]], 0.35, col, 5); beam(b, [x, ya, zs[j + 1]], [x, yb, zs[j]], 0.35, col, 5); } }
  return legs;
}
function distantRig(S, x, z, sc = 1, sea = -28) {
  const b = new GB(), w = 34 * sc, d = 26 * sc, top = sea + 30 * sc;
  rigLegs(b, x - w / 2, z - d / 2, x + w / 2, z + d / 2, top, sea, 0x7a6e58);
  b.box(x, top + 1.5, z, w + 4, 3, d + 4, 0x6a6e70, 0x5a5e60); b.box(x - w * 0.25, top + 6, z + d * 0.2, w * 0.4, 8, d * 0.4, 0xe8e4d8, 0xb0b0a8); b.box(x + w * 0.2, top + 4.5, z - d * 0.2, w * 0.35, 5, d * 0.35, 0xc8a030);
  lattice(b, x + w * 0.15, z + d * 0.15, 7 * sc, 2 * sc, top + 3, top + 3 + 34 * sc, 0xc8c0b0, 6, 0.15 * sc);
  beam(b, [x + w / 2, top + 4, z], [x + w / 2 + 22 * sc, top + 22 * sc, z], 0.5 * sc, 0x9a9a9a, 4);
  S.add(b.build(), S.vmat('rig', { metalness: 0.35, roughness: 0.7 }));
  const f = glow(S, x + w / 2 + 22 * sc, top + 23.5 * sc, z, 7 * sc, 'rgba(255,150,50,1)'); S.amb.flicker(f, 7 * sc, 0.25, 9);
  if (S.night || S.dusk) for (const [dx, dz] of [[-1, -1], [1, 1]]) glow(S, x + dx * w / 2, top + 3.5, z + dz * d / 2, 2.5, 'rgba(255,230,180,1)');
}

// rectangle loop of water lanes beyond side s (between d0 and d1), long axis along the side
function laneLoop(S, s, d0, d1, ext = 120) {
  const W = S.W, H = S.H; if (s === 'n' || s === 's') { const a = S.sideMid(s, d0)[1], b = S.sideMid(s, d1)[1]; return new Path([[-ext, a], [W + ext, a], [W + ext, b], [-ext, b]], true); }
  const a = S.sideMid(s, d0)[0], b = S.sideMid(s, d1)[0]; return new Path([[a, -ext], [a, H + ext], [b, H + ext], [b, -ext]], true);
}
// point along side s at distance d, shifted by t along the side (t measured from the side's start corner)
function along(S, s, d, t) { return (s === 'n' || s === 's') ? [t, S.sideMid(s, d)[1]] : [S.sideMid(s, d)[0], t]; }
const ryOut = (S, s) => { const o = S.outward(s); return Math.atan2(-o[1], o[0]); }; // local +x -> outward
// slab under the whole map (decks / roofs where the ground plane is hidden)
function slab(S, y0, y1, col = 0x4a4e52, top = 0x2a2c2e) { const b = new GB(); b.box(S.W / 2, (y0 + y1) / 2, S.H / 2, S.W + 2, y1 - y0, S.H + 2, col, top, null, 0.5); S.add(b.build(), S.vmat('slab', { map: floorTex('concrete', 0xffffff), metalness: 0.2 }), { recv: true }); }
const hgt = (S) => (x, z) => roadY(S, x, z) - 0.06; // vehicles sit on the road surface

// ---------- per-map profiles ----------
const PROFILES = {
  generic(S) { terrain(S, { amp: 6, mtn: { d0: 80, d1: 140, amp: 30, f: 0.014 } }); forest(S, 'round', 200, 6, 130); clouds(S, 10); S.amb.birds(S.cx, S.cz, { n: 8 }); },

  city(S) { // Ankara
    const P = roads(S, ringPts(S, 9), { w: 8, closed: true, walk: 2 }); roads(S, [S.sideMid(S.quiet, 13), S.sideMid(S.quiet, 160)], { w: 9 }); roads(S, S.sideRoad(S.busy, 40), { w: 7 });
    terrain(S, { start: 50, ramp: 60, amp: 7, colors: [0x8a8460, 0x9c9472], mtn: { d0: 85, d1: 150, amp: 34, f: 0.012 } });
    city(S, { n: 85, d0: 17, d1: 135, h: [9, 30], tallP: 0.12, pal: [0xd8d0bf, 0xc8bca6, 0xe6e0d4, 0xb8ae9a, 0xd0b898] });
    const [mx, mz] = along(S, S.busy, 70, (S.busy === 'n' || S.busy === 's' ? S.W : S.H) * 0.75); const b = new GB(), y = S.h(mx, mz); // mosque
    b.box(mx, y + 4, mz, 22, 8, 22, 0xe0dccc); b.geom(new THREE.SphereGeometry(8, 16, 8, 0, 6.29, 0, 1.6), mat(mx, y + 8, mz), 0x8aa0a8); b.geom(new THREE.CylinderGeometry(1.2, 1.2, 4, 8), mat(mx, y + 16.5, mz), 0xd8d4c4);
    for (const [dx, dz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) { b.geom(new THREE.CylinderGeometry(0.9, 1.1, 34, 10), mat(mx + dx, y + 17, mz + dz), 0xf0ece0); b.geom(new THREE.CylinderGeometry(1.5, 1.5, 1, 10), mat(mx + dx, y + 26, mz + dz), 0xe0dccc); b.geom(new THREE.ConeGeometry(1, 5, 10), mat(mx + dx, y + 36.5, mz + dz), 0x6a7a80); }
    S.add(b.build(), S.vmat('lm'));
    forest(S, 'round', 140, 4, 120, { scale: [1.4, 2.4] }); groundDetail(S, ['grass', 'bush', 'rock'], 0.18, { outside: 160 });
    S.amb.traffic(P, 18, { hgt: hgt(S) }); S.amb.walkers(P, 22, { offs: [5, -5], hgt: hgt(S) }); lamps(S, P);
    const g = S.sideMid(S.busy, 6); flagsAt(S, [[g[0] - 6, g[1], 'tr'], [g[0] + 6, g[1], 'tr']]);
    S.amb.birds(S.cx, S.cz, { n: 10, y: 26, flocks: 2 }); clouds(S, 12);
  },

  docks(S) { harbourCity(S, 'de'); },
  riodocks(S) { harbourCity(S, 'br'); },

  desert(S) { // Kandahar
    const P = roads(S, S.sideRoad(S.quiet, 11), { w: 6, color: 0x8a7656, line: false }); roads(S, S.sideRoad(S.busy, 26), { w: 5, color: 0x8a7656, line: false });
    terrain(S, { start: 28, ramp: 50, amp: 5, freq: 0.03, colors: [0xa08a68, 0xb49c74], rock: 0x8a7a64, mtn: { d0: 70, d1: 140, amp: 48, f: 0.015 } });
    village(S, { n: 55, d0: 10, d1: 110, pal: [0xb89f7c, 0xa88c66, 0xc4aa84] });
    forest(S, 'palm', 40, 8, 70, { scale: [1.6, 2.4] }); forest(S, 'orchard', 70, 10, 90, { scale: [1.3, 1.9] }); forest(S, 'poplar', 40, 20, 110, { scale: [1.6, 2.4] });
    groundDetail(S, ['rock', 'grass'], 0.12, { outside: 160 }); groundPatches(S, 20, [0x7a8a4a, 0x8a7a5a], { op: 0.35 });
    S.amb.traffic(P, 7, { kind: 'van', colors: [0xe8e0d0, 0x2a6a9a, 0xd8c020, 0xb04030], hgt: hgt(S), speed: [6, 10] }); S.amb.traffic(P, 3, { kind: 'truck', colors: [0x3a6a3a, 0xc85a20, 0x2a4a8a], hgt: hgt(S), speed: [5, 8] });
    S.amb.walkers(P, 10, { offs: [4.2, -4.2], colors: [0xe0d8c8, 0x7a7a6a, 0x3a3a3a, 0x8a7a5a], hgt: hgt(S) });
    const gp = S.ring(25, 60); if (gp) S.amb.herd('goat', 12, gp[0], gp[1], 9, { hgt: S.h });
    mist(S, 6, { color: 0xd8c8a0, op: 0.12, d: [20, 100] }); S.amb.birds(S.cx, S.cz, { n: 5, y: 30, r: 40, flocks: 2, color: 0x3a3028 }); clouds(S, 6, { op: 0.5 });
  },

  rig(S) { // Platform Skadi, North Sea: we are ~28 m above the waves
    const sea = -28, q = S.quiet, W = S.W, H = S.H, hz = q === 'n' || q === 's', o = S.outward(q); S.ctx.ground && (S.ctx.ground.visible = false); S.hfn = () => sea - 6; S.flatY = sea;
    water(S, { y: sea, rough: 1.7, size: 230 });
    slab(S, -2.5, -0.05);
    // extension deck (production side) beyond the quiet edge, 22 m deep
    const E = 22, ex0 = hz ? 0 : q === 'w' ? -E : W, ex1 = hz ? W : q === 'w' ? 0 : W + E, ez0 = hz ? (q === 'n' ? -E : H) : 0, ez1 = hz ? (q === 'n' ? 0 : H + E) : H;
    const b = new GB(), st = 0x8a7a5a, mx = (ex0 + ex1) / 2, mz = (ez0 + ez1) / 2;
    b.box(mx, -1.25, mz, ex1 - ex0, 2.4, ez1 - ez0, 0x4a4e52, 0x3a3e42, 0x2a2c2e, 0.5);
    rigLegs(b, Math.min(-1, ex0), Math.min(-1, ez0), Math.max(W + 1, ex1), Math.max(H + 1, ez1), -2.5, sea, st);
    // cellar deck below the main deck
    b.box(W / 2, -9, H / 2, W - 4, 1.2, H - 4, 0x5a5e62, 0x5a5e62);
    for (let i = 0; i < 6; i++) b.box(S.R(4, W - 4), -7, S.R(4, H - 4), S.R(3, 7), 3, S.R(2, 5), S.pick([0xc8a030, 0x6a7a80, 0x9a3a2a]));
    // outer railing on the extension deck
    const rail = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0); b.box((x0 + x1) / 2, 1.05, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.08, 0.08, Math.abs(z1 - z0) + 0.08, 0xd8c020); b.box((x0 + x1) / 2, 0.55, (z0 + z1) / 2, Math.abs(x1 - x0) + 0.06, 0.06, Math.abs(z1 - z0) + 0.06, 0xd8c020); for (let t = 0; t <= L; t += 2.5) b.box(x0 + ((x1 - x0) * t) / L, 0.55, z0 + ((z1 - z0) * t) / L, 0.08, 1.1, 0.08, 0xd8c020); };
    if (hz) { const zo = q === 'n' ? ez0 : ez1; rail(ex0, zo, ex1, zo); rail(ex0, ez0, ex0, ez1); rail(ex1, ez0, ex1, ez1); } else { const xo = q === 'w' ? ex0 : ex1; rail(xo, ez0, xo, ez1); rail(ex0, ez0, ex1, ez0); rail(ex0, ez1, ex1, ez1); }
    // derrick + drill floor, quarters, process modules
    const far = (t, f) => hz ? [ex0 + t * (ex1 - ex0), mz + o[1] * f] : [mx + o[0] * f, ez0 + t * (ez1 - ez0)];
    const [DX, DZ] = far(0.28, 0); b.box(DX, 2.5, DZ, 11, 5, 11, 0x6a6e70, 0x5a5e60); lattice(b, DX, DZ, 9, 2.4, 5, 46, 0xd8d0c0, 9, 0.16); b.box(DX, 47, DZ, 3.4, 2, 3.4, 0xc83a2a);
    const [QX, QZ] = far(0.72, 2); const qw = hz ? 14 : 12, qd = 12; for (let f = 0; f < 3; f++) { b.box(QX, 1.6 + f * 3.2, QZ, qw, 3, qd, 0xe8e4d8, 0xb8b4a8); b.box(QX, 1.8 + f * 3.2, QZ, qw + 0.05, 0.7, qd + 0.05, 0x2a3a4a); }
    b.box(QX, 10.3, QZ, qw * 0.5, 1.2, qd * 0.5, 0x9a9a98);
    for (let i = -1; i <= 1; i++) { const [lx, lz] = hz ? [QX + i * 5, QZ + o[1] * (qd / 2 + 1.6)] : [QX + o[0] * (qw / 2 + 1.6), QZ + i * 5]; b.box(lx, 3.4, lz, hz ? 4.2 : 2.2, 2.2, hz ? 2.2 : 4.2, 0xf06a10, 0xf08a30); }
    for (let i = 0; i < 4; i++) { const [px, pz] = far([0.1, 0.3, 0.62, 0.84][i], -8); b.box(px, 2.4, pz, 4.4, 4.8, 4.4, S.pick([0xc8a030, 0x7a8a90, 0x3a6a8a])); b.geom(new THREE.CylinderGeometry(1.1, 1.1, 4, 10), mat(px - S.outward(q)[0] * 3.4, 2.2, pz - S.outward(q)[1] * 3.4, 0, ryOut(S, q), Math.PI / 2), 0xa8a8a0); }
    // helipad cantilevered out past the quarters corner
    const [HX, HZ] = hz ? [ex1 - 2, mz + o[1] * (E / 2 + 9)] : [mx + o[0] * (E / 2 + 9), ez1 - 2];
    b.geom(new THREE.CylinderGeometry(10.5, 10.5, 0.8, 8), mat(HX, 3.6, HZ, 0, Math.PI / 8, 0), 0x3a4a3e); beam(b, [HX, 3, HZ], [HX - o[0] * 9, -2, HZ - o[1] * 9], 0.6, st); beam(b, [HX + 6, 3, HZ], [HX - o[0] * 9 + 3, -2, HZ - o[1] * 9 + 3], 0.5, st);
    for (let a = 0; a < 8; a++) { const t = (a / 8) * 6.283 + Math.PI / 8; b.box(HX + Math.cos(t) * 10.6, 3.9, HZ + Math.sin(t) * 10.6, 0.25, 0.4, 0.25, 0xd8d8d8); }
    S.add(b.build(), S.vmat('rig', { metalness: 0.35, roughness: 0.7 }), { shadow: S.quality === 'high', recv: true });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(9.6, 32).rotateX(-Math.PI / 2), S.std({ map: padTex(), roughness: 0.8 })); pad.position.set(HX, 4.02, HZ); S.root.add(pad);
    // flare boom from the far corner, angled out over the sea
    const fb0 = hz ? [ex0 + 2, 1, mz + o[1] * (E / 2)] : [mx + o[0] * (E / 2), 1, ez0 + 2]; const fb1 = [fb0[0] + o[0] * 26 - (hz ? 12 : 0), 24, fb0[2] + o[1] * 26 - (hz ? 0 : 12)];
    const fbb = new GB(); beam(fbb, fb0, fb1, 0.9, 0xb0b0a8, 6); beam(fbb, [fb0[0], 1, fb0[2]], [fb1[0], 23, fb1[2]], 0.3, 0x8a8a80, 4); S.add(fbb.build(), S.vmat('rig'));
    for (const [sz, op, col] of [[13, 0.95, 'rgba(255,140,40,1)'], [7, 1, 'rgba(255,230,160,1)']]) { const f = glow(S, fb1[0], fb1[1] + 2.5, fb1[2], sz, col, { op }); S.amb.flicker(f, sz, 0.3, 11); }
    // pedestal crane slewing slowly
    const [CX, CZ] = far(0.04, 8); const cr = new THREE.Group(); cr.position.set(CX, 0, CZ); const cb = new GB(); cb.geom(new THREE.CylinderGeometry(1.4, 1.8, 10, 12), mat(0, 5, 0), 0xd8c020); const ped = S.add(cb.build(), S.vmat('rig')); ped.position.set(CX, 0, CZ); ped.updateMatrix();
    const ck = new GB(); ck.box(0, 11, 0, 4, 2.6, 3.2, 0xd8c020, 0xc8b010); ck.box(1.6, 11.4, 0.9, 1.6, 1.6, 1.4, 0x2a3a4a); beam(ck, [0, 11.5, 0], [Math.cos(0.6) * 30, 11.5 + Math.sin(0.6) * 30, 0], 0.55, 0xd8c020, 6); ck.box(Math.cos(0.6) * 30, 6 + Math.sin(0.6) * 15, 0, 0.06, 26, 0.06, 0x1a1a1a);
    const cm = new THREE.Mesh(ck.build(), S.vmat('rig')); cr.add(cm); S.root.add(cr); let ca = 0; S.amb.add((dt) => { ca += dt * 0.05; cr.rotation.y = Math.sin(ca) * 1.2 + ryOut(S, q); });
    // nav lights
    for (const [x, z] of [[-1, -1], [W + 1, -1], [-1, H + 1], [W + 1, H + 1]]) S.amb.blink(glow(S, x, -1.5, z, 1.6, 'rgba(255,240,120,1)'), 2.4);
    // the rest of the field
    const R0 = Math.max(W, H) / 2; const rigs = S.quality === 'low' ? 2 : 4; for (let i = 0; i < rigs; i++) { const a = (i / rigs) * 6.283 + 0.6, r = R0 + 85 + (i % 2) * 35; distantRig(S, S.cx + Math.cos(a) * r, S.cz + Math.sin(a) * r, 0.9 + (i % 3) * 0.2, sea); }
    S.amb.boats(new Path(ringPts(S, 75), true), ['tanker', 'supply', 'ship'], { y: sea, speed: 4 }); S.amb.moored('supply', W / 2 + (hz ? 0 : o[0] * 40), sea, H / 2 + (hz ? o[1] * 40 : 0) + (hz ? 0 : 20), hz ? 0 : Math.PI / 2);
    S.amb.heli(S.cx, S.cz, R0 + 70, 22); S.amb.birds(S.cx, S.cz, { n: 9, y: 8, r: 34, color: 0xf0f0f0, flocks: 2 });
    mist(S, 8, { d: [20, 120], y: [2, 6], op: 0.16, color: 0xc8d0d4, size: [50, 90], yb: sea });
    clouds(S, 14, { color: 0xd8dde0, op: 0.8, y: [15, 45] }); flagsAt(S, [[QX, QZ + (hz ? 0 : 4), 'un']], { h: 14 });
  },

  citynight(S) { // Seoul
    const P = roads(S, ringPts(S, 9), { w: 9, closed: true, walk: 2.5 });
    terrain(S, { start: 50, ramp: 50, amp: 6, colors: [0x3a3c40, 0x44464a], mtn: { d0: 95, d1: 150, amp: 45, f: 0.013 } });
    city(S, { n: 120, d0: 16, d1: 135, h: [12, 38], tallP: 0.28, tall: [48, 92], pal: [0x9aa0a8, 0x7a8088, 0xb8bcc0, 0x6a7078, 0xc8c4bc], lit: 1.15 });
    // elevated expressway along the busy side
    const ep = S.sideRoad(S.busy, 34, 110), b = new GB(), EY = 8; const hzE = ep[0][1] === ep[1][1];
    const L = Math.hypot(ep[1][0] - ep[0][0], ep[1][1] - ep[0][1]); b.box((ep[0][0] + ep[1][0]) / 2, EY - 0.6, (ep[0][1] + ep[1][1]) / 2, hzE ? L : 14, 1.2, hzE ? 14 : L, 0x7a7c80, 0x3a3c40); for (let t = 0; t < L; t += 24) { const x = ep[0][0] + (hzE ? t : 0), z = ep[0][1] + (hzE ? 0 : t); b.box(x, EY / 2 - 0.6, z, 2, EY, 2, 0x8a8c90); }
    b.box((ep[0][0] + ep[1][0]) / 2, EY + 0.4, (ep[0][1] + ep[1][1]) / 2, hzE ? L : 0.4, 0.8, hzE ? 0.4 : L, 0x9a9ca0); S.add(b.build(), S.vmat('expr'));
    S.amb.traffic(new Path(ep, false), 26, { lanes: [2, 5, -2, -5], night: true, y: EY, speed: [12, 18] });
    S.amb.traffic(P, 16, { night: true, hgt: hgt(S) }); S.amb.walkers(P, 24, { offs: [6, -6], hgt: hgt(S) }); lamps(S, P, { every: 18 });
    // N Seoul Tower on the hill
    const [tx, tz] = S.sideMid(S.quiet, 110); const ty = S.h(tx, tz), tb = new GB(); tb.geom(new THREE.CylinderGeometry(1.6, 2.4, 40, 12), mat(tx, ty + 20, tz), 0xd8d8d0); tb.geom(new THREE.CylinderGeometry(5.5, 4, 8, 16), mat(tx, ty + 44, tz), 0xe8e4dc); tb.geom(new THREE.CylinderGeometry(0.5, 0.8, 22, 8), mat(tx, ty + 59, tz), 0xc8c8c0);
    S.add(tb.build(), S.vmat('lm', { emissive: 0x334455, emissiveIntensity: 0.5 })); S.amb.blink(glow(S, tx, ty + 71, tz, 4, 'rgba(255,60,40,1)'), 1.8); glow(S, tx, ty + 44, tz, 22, 'rgba(120,160,255,1)', { op: 0.35 });
    const neon = ['rgba(255,60,180,1)', 'rgba(60,220,255,1)', 'rgba(255,200,60,1)', 'rgba(120,255,120,1)']; for (let i = 0; i < S.n(28); i++) { const p = S.ring(12, 45); if (p) { const g = glow(S, p[0], S.R(3, 9), p[1], S.R(2, 4), S.pick(neon), { op: 0.7 }); if (i % 4 === 0) S.amb.blink(g, S.R(0.8, 2)); } }
    forest(S, 'round', 60, 6, 60, { scale: [1.2, 2] }); flagsAt(S, [[...S.sideMid(S.busy, 5).map((v, i) => v + (i ? 0 : 5)), 'kr']]); clouds(S, 8, { color: 0x3a4050, op: 0.6 });
  },

  tower(S) { // Hong Kong, 41st floor: the street is ~88 m below
    const GY = -88, q = S.quiet, W = S.W, H = S.H; S.ctx.ground && (S.ctx.ground.visible = false); S.flatY = GY;
    S.waterFn = (x, z) => S.sideD(x, z, q) - 38;
    const P = roads(S, ringPts(S, 16), { w: 10, closed: true, walk: 2 });
    terrain(S, { start: 20, ramp: 40, amp: 4, colors: [0x3a3c40, 0x484a4c], mtn: { d0: 70, d1: 130, amp: 100, f: 0.012, side: S.busy } });
    water(S, { y: GY - 1.2, rough: 0.8 });
    // our own tower: lit facade below the floor, roof slab, parapet
    const b = new GB(), rb = new GB(); sideBox(b, rb, W / 2, H / 2, W + 2, H + 2, -GY - 0.6, 0x5a6470, 0x3a3c40, GY); S.add(b.build(), S.mats.bld || (S.mats.bld = S.std({ vertexColors: true, map: winTex(), emissiveMap: winLit(), emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.6 })));
    slab(S, -1.2, -0.05, 0x5a6470, 0x3a3e44);
    city(S, { n: 90, d0: 8, d1: 130, h: [30, 80], tallP: 0.35, tall: [85, 125], base: GY, pal: [0x8a96a4, 0x6a7684, 0xa8b0b8, 0x4a5664, 0xc0c4c8], ok: (x, z) => !S.inWater(x, z, 6) });
    S.amb.traffic(P, 20, { night: true, hgt: hgt(S) }); S.amb.walkers(P, 14, { offs: [6, -6], hgt: hgt(S) });
    S.amb.boats(laneLoop(S, q, 70, 110), ['ferry', 'ferry', 'tug', 'small', 'ship'], { y: GY - 1.2, speed: 5 }); S.amb.heli(S.cx, S.cz, Math.max(W, H) / 2 + 70, 8);
    for (let i = 0; i < S.n(20); i++) { const p = S.ring(60, 120, (x, z) => S.inWater(x, z, -4)); if (p) glow(S, p[0], GY + 2, p[1], 3, S.pick(['rgba(255,220,140,1)', 'rgba(120,200,255,1)']), { op: 0.6 }); }
    clouds(S, 10, { color: 0x404858, op: 0.55, y: [10, 40] });
  },

  colonial(S) { // Mexico City
    const P = roads(S, ringPts(S, 9), { w: 9, closed: true, walk: 2.5 }); roads(S, [S.sideMid(S.busy, 13), S.sideMid(S.busy, 160)], { w: 10 });
    terrain(S, { start: 45, ramp: 50, amp: 5, colors: [0x6e665a, 0x7a7262], mtn: { d0: 100, d1: 150, amp: 35, f: 0.012 } });
    city(S, { n: 90, d0: 16, d1: 130, h: [8, 20], tallP: 0.1, tall: [40, 70], pal: [0xd8c8a8, 0xc89a7a, 0xe0d0b0, 0xb87a5a, 0xd8b088, 0xa8a0c0] });
    const [cx, cz] = along(S, S.busy, 46, (S.busy === 'n' || S.busy === 's' ? S.W : S.H) * 0.3); const y = S.h(cx, cz), cb = new GB();
    cb.box(cx, y + 7, cz, 34, 14, 16, 0xc8b08a, 0x8a7a68); for (const dx of [-14, 14]) { cb.box(cx + dx, y + 13, cz + 6, 7, 26, 7, 0xd0b890); cb.geom(new THREE.SphereGeometry(3.4, 10, 6, 0, 6.29, 0, 1.6), mat(cx + dx, y + 26, cz + 6), 0xb8a078); } cb.geom(new THREE.SphereGeometry(6, 12, 8, 0, 6.29, 0, 1.6), mat(cx, y + 14, cz - 2), 0x9aa8a0);
    S.add(cb.build(), S.vmat('lm'));
    const [vx, vz] = S.sideMid(S.quiet, 118); cone(S, vx - 25, vz, 52, 64, 0x6a6058, { snow: 0.22 }); cone(S, vx + 50, vz + 10, 44, 46, 0x6a6460, { snow: 0.2 }); glow(S, vx - 25, 62, vz, 10, 'rgba(255,170,90,1)', { op: 0.25 });
    forest(S, 'round', 90, 5, 110, { scale: [1.3, 2.2] }); forest(S, 'palm', 25, 6, 40); groundDetail(S, ['grass', 'bush'], 0.12, { outside: 100 });
    S.amb.traffic(P, 18, { night: true, hgt: hgt(S), colors: [0x2a8a3a, 0xe8e0d0, 0xb03a5a, 0x2a2a30, 0xd8c020] }); S.amb.walkers(P, 24, { offs: [6, -6], hgt: hgt(S) }); lamps(S, P);
    const fz = S.sideMid(S.busy, 22); S.amb.flag(fz[0], 0, fz[1], { h: 18, tex: flagTex('mx'), w: 6 }); S.amb.birds(S.cx, S.cz, { n: 9, y: 24 }); clouds(S, 10, { color: 0xf0c0a0 });
  },

  harbour(S) { // MV Esperanza at the quay, Buenaventura: water all round the ship, land on the busy side
    const lb = S.busy, W = S.W, H = S.H; S.ctx.ground && (S.ctx.ground.visible = false);
    S.waterFn = (x, z) => { const d = S.sideD(x, z, lb); return d > 4 ? 4 - d : 6; };
    const P = roads(S, S.sideRoad(lb, 24), { w: 8, walk: 1.5 });
    terrain(S, { start: 6, ramp: 60, amp: 6, colors: [0x4a5a3a, 0x5a6a44], mtn: { d0: 70, d1: 130, amp: 50, f: 0.016, side: lb } });
    water(S, { y: -1.6, rough: 0.7 });
    // hull below the deck
    const hb = new GB(); hb.box(W / 2, -5, H / 2, W + 1.4, 10, H + 1.4, 0x2a3a4a, 0x2a3a4a, 0x7a2a20, 0.5); hb.box(W / 2, -1.9, H / 2, W + 1.5, 0.5, H + 1.5, 0xe8e8e0); S.add(hb.build(), S.vmat('hull', { metalness: 0.4, roughness: 0.6 }));
    // quay wall facing the ship + apron
    const qb = new GB(), hz = lb === 'n' || lb === 's'; const [qx, qz] = S.sideMid(lb, 4.5); const o = S.outward(lb);
    if (hz) { qb.box(W / 2, -1.6, qz, W + 190, 3.3, 1, 0x7a786e, 0x8a887e, 0x3a3a34); qb.hquad(-95, Math.min(qz, qz + o[1] * 20), W + 95, Math.max(qz, qz + o[1] * 20), 0.05, 0x8a887e, 0.25); }
    else { qb.box(qx, -1.6, H / 2, 1, 3.3, H + 190, 0x7a786e, 0x8a887e, 0x3a3a34); qb.hquad(Math.min(qx, qx + o[0] * 20), -95, Math.max(qx, qx + o[0] * 20), H + 95, 0.05, 0x8a887e, 0.25); }
    S.add(qb.build(), S.vmat('quay', { map: floorTex('concrete', 0xffffff) }), { recv: true });
    for (const t of [-24, (hz ? W : H) + 24]) { const p = along(S, lb, 13, t); gantry(S, p[0], p[1], ryOut(S, lb) + Math.PI, t < 0 ? 0xc8402a : 0x2a6aa8); } // past the bow and stern, clear of the play area
    const cp = along(S, lb, 30, -50); containers(S, [[cp[0], cp[1], 8, 4, 3, hz ? 0 : Math.PI / 2]]);
    city(S, { n: 40, d0: 34, d1: 110, h: [6, 14], tallP: 0.05, pal: [0xd8c8a8, 0x6a9aa8, 0xc87a5a, 0xe0d8c8, 0x8ab08a], ok: (x, z) => S.sideD(x, z, lb) > 32 });
    forest(S, 'jungle', 220, 40, 140, { ok: (x, z) => S.sideD(x, z, lb) > 45, scale: [2, 3.4] }); forest(S, 'palm', 40, 20, 80, { ok: (x, z) => S.sideD(x, z, lb) > 26, scale: [1.8, 2.6] });
    S.amb.traffic(P, 10, { kind: 'truck', hgt: hgt(S), colors: [0xc8402a, 0x2a6aa8, 0xe0c020, 0x3a3a3a] }); S.amb.traffic(P, 8, { hgt: hgt(S) }); S.amb.walkers(P, 12, { offs: [5.3, -5.3], hgt: hgt(S) }); lamps(S, P);
    S.amb.boats(laneLoop(S, S.quiet, 30, 70), ['tug', 'small', 'ship', 'small', 'tug'], { y: -1.6, speed: 4 });
    const fp = along(S, lb, 8, (hz ? W : H) * 0.5); flagsAt(S, [[fp[0], fp[1], 'co']], { h: 10 });
    S.amb.birds(S.cx, S.cz, { n: 12, y: 18, color: 0xf0f0f0, flocks: 2 }); clouds(S, 10, { color: 0xf0b8a0 });
  },

  training(S) { // Fort Liberty
    const P = roads(S, S.sideRoad(S.busy, 12), { w: 7 }); const J = roads(S, ringPts(S, 6), { w: 3, closed: true, color: 0x8a7a5a, line: false });
    terrain(S, { start: 40, ramp: 50, amp: 6, colors: [0x5a6a3a, 0x6a7444], mtn: { d0: 90, d1: 150, amp: 22, f: 0.014 } });
    forest(S, 'pine', 520, 18, 140, { scale: [2.2, 3.6], ok: (x, z) => S.sideD(x, z, S.quiet) < 18 || S.sideD(x, z, S.quiet) > 60 }); forest(S, 'round', 120, 12, 120, { scale: [1.5, 2.6] });
    // range on the quiet side: berm, target frames, firing line roof
    const b = new GB(); const hz = S.quiet === 'n' || S.quiet === 's', len = hz ? S.W : S.H;
    for (let i = 0; i < 8; i++) { const p = along(S, S.quiet, 30 + (i % 2) * 8, len * (0.1 + i * 0.11)); b.box(p[0], 0.9, p[1], hz ? 0.15 : 1.1, 1.8, hz ? 1.1 : 0.15, 0xe8e0c8); b.box(p[0], 0.2, p[1], 0.6, 0.4, 0.6, 0x5a4a3a); }
    const bp = S.sideMid(S.quiet, 48); b.box(bp[0], 2.5, bp[1], hz ? len + 20 : 6, 5, hz ? 6 : len + 20, 0x6a5a40, 0x5a6a3a); const fl = S.sideMid(S.quiet, 15); b.box(fl[0], 2.8, fl[1], hz ? len : 4, 0.2, hz ? 4 : len, 0x5a5e52); for (let t = 0; t <= len; t += 6) { const p = along(S, S.quiet, 15, t); b.box(p[0], 1.4, p[1], 0.15, 2.8, 0.15, 0x5a5e52); }
    const wt = S.sideMid(S.busy, 18); lattice(b, wt[0] + 20, wt[1], 3.4, 2.8, 0, 9, 0x6a5a40, 3, 0.1); b.box(wt[0] + 20, 10.4, wt[1], 3.6, 2.8, 3.6, 0x5a6a3a, 0x3a4a2a);
    S.add(b.build(), S.vmat('range'));
    groundDetail(S, ['grass', 'bush', 'rock'], 0.25, { outside: 220 });
    S.amb.traffic(P, 6, { kind: 'van', colors: [0x5a6a3a, 0x6a6a4a, 0x7a6a4a], hgt: hgt(S), speed: [6, 9] }); S.amb.traffic(P, 4, { kind: 'truck', colors: [0x5a6a3a], hgt: hgt(S) }); S.amb.walkers(J, 10, { offs: [0.6, -0.6], speed: [2.6, 3.2], colors: [0x5a6a3a, 0x3a3a3a, 0x8a8a8a], hgt: hgt(S) });
    const g = S.sideMid(S.busy, 6); flagsAt(S, [[g[0] - 5, g[1], 'us'], [g[0] + 5, g[1], 'us']]); S.amb.birds(S.cx, S.cz, { n: 8, y: 26 }); clouds(S, 12);
  },

  savanna(S) { kenya(S, false); },
  savannacity(S) { kenya(S, true); },

  forest(S) { // Black Forest
    const P = roads(S, S.sideRoad('s', 11), { w: 6, color: 0x5a5046, line: false }); roads(S, [S.sideMid('e', 0), S.sideMid('e', 150)], { w: 4, color: 0x6a5a48, line: false });
    terrain(S, { start: 34, ramp: 50, amp: 9, freq: 0.025, colors: [0x2e3e26, 0x3e4a2e], rock: 0x5a5a50, mtn: { d0: 50, d1: 130, amp: 46, f: 0.016 } });
    forest(S, 'pine', 1400, 1.5, 145, { scale: [2.2, 3.8], tint: 0.12 }); forest(S, 'round', 260, 1.5, 100, { scale: [1.6, 2.6] }); forest(S, 'poplar', 60, 4, 70, { scale: [1.6, 2.4] });
    groundDetail(S, ['fern', 'grass', 'bush', 'rock'], 0.45, { outside: 700, scale: [0.8, 1.4] });
    shafts(S, 10, { op: 0.075, inMap: 0.5 }); mist(S, 12, { d: [6, 110], y: [0.5, 2.5], op: 0.13, color: 0xd8e0d8 });
    S.amb.traffic(P, 4, { kind: 'truck', colors: [0x2a4a2a, 0x6a3a2a, 0x3a3a3a], hgt: hgt(S), speed: [6, 9] }); S.amb.traffic(P, 4, { hgt: hgt(S) });
    for (let i = 0; i < 2; i++) { const p = S.ring(14, 50); if (p) S.amb.herd('deer', 5, p[0], p[1], 8, { hgt: S.h, speed: 0.8 }); }
    const fp = S.sideMid('s', 4); flagsAt(S, [[fp[0] + 8, fp[1], 'de']]); S.amb.birds(S.cx, S.cz, { n: 9, y: 30, color: 0x1a1a1a, flocks: 2 }); clouds(S, 10, { op: 0.65 });
  },

  farm(S) { // Helmand green zone
    const P = roads(S, S.sideRoad('s', 9), { w: 6, color: 0x8a7656, line: false }); roads(S, [S.sideMid('w', 0), S.sideMid('w', 150)], { w: 4, color: 0x8a7656, line: false });
    terrain(S, { start: 34, ramp: 50, amp: 4, colors: [0x6e7a44, 0x8a8a5a], rock: 0x8a7a64, mtn: { d0: 85, d1: 150, amp: 62, f: 0.013 }, snow: 48 });
    fields(S, 46, [0x5a7a2a, 0x7a8a3a, 0x8a7a4a, 0xa87a8a, 0x6a8a3a, 0x9a8a5a], { d0: 6, d1: 110 }); village(S, { n: 45, d0: 12, d1: 110 });
    forest(S, 'poplar', 120, 5, 110, { scale: [1.8, 2.6] }); forest(S, 'orchard', 140, 4, 90, { scale: [1.3, 1.8] }); forest(S, 'round', 50, 6, 100);
    groundDetail(S, ['grass', 'bush', 'rock'], 0.2, { outside: 260 });
    S.amb.traffic(P, 5, { kind: 'van', colors: [0xe8e0d0, 0xd8c020, 0x2a6a9a], hgt: hgt(S), speed: [6, 10] }); S.amb.traffic(P, 3, { kind: 'truck', colors: [0xc85a20, 0x3a6a3a], hgt: hgt(S), speed: [5, 8] });
    S.amb.walkers(P, 10, { offs: [4, -4], colors: [0xe0d8c8, 0x7a7a6a, 0x3a3a3a, 0x5a6a8a], hgt: hgt(S) });
    const gp = S.ring(20, 60); if (gp) S.amb.herd('goat', 12, gp[0], gp[1], 9, { hgt: S.h }); S.amb.birds(S.cx, S.cz, { n: 10, y: 22, color: 0x2a2a2a }); clouds(S, 9); mist(S, 6, { op: 0.1, color: 0xe0dcc8 });
  },

  port(S) { // Container terminal: the map's north edge is the quay
    const W = S.W, H = S.H, q = 'n'; S.waterFn = (x, z) => -z - 1.2; clipSide(S, q, 1.2); quay(S, q, 1.2);
    const P = roads(S, S.sideRoad('s', 11), { w: 9, walk: 1.5 }); roads(S, [[-30, 9], [-30, H + 11]], { w: 7 }); roads(S, [[W + 30, 9], [W + 30, H + 11]], { w: 7 });
    terrain(S, { start: 40, ramp: 50, amp: 6, colors: [0x4a5a3a, 0x5a6a44], mtn: { d0: 60, d1: 130, amp: 50, f: 0.016, side: 's' } });
    water(S, { y: -1.8, rough: 0.8 });
    for (const x of [-20, -52, W + 20, W + 52]) gantry(S, x, 9, ryOut(S, q), x < 0 ? 0xc8402a : 0x2a6aa8);
    S.amb.moored('ship', W * 0.3, -1.8, -9, 0); S.amb.moored('tanker', W * 0.82 + 20, -1.8, -10, Math.PI);
    containers(S, [[-90, 16, 9, 6, 4, 0], [W + 34, 16, 9, 6, 4, 0], [-90, -0.5, 5, 2, 2, 0]], { maxN: 520 });
    city(S, { n: 50, d0: 22, d1: 130, h: [6, 16], tallP: 0.06, pal: [0xd8c8a8, 0x6a9aa8, 0xc87a5a, 0xe0d8c8, 0x8ab08a], ok: (x, z) => z > H + 20 });
    forest(S, 'jungle', 260, 30, 140, { ok: (x, z) => z > H + 40, scale: [2, 3.4] }); forest(S, 'palm', 50, 10, 80, { ok: (x, z) => z > H + 16, scale: [1.8, 2.6] });
    S.amb.traffic(P, 10, { kind: 'truck', hgt: hgt(S), colors: [0xc8402a, 0x2a6aa8, 0xe0c020, 0x3a3a3a] }); S.amb.traffic(P, 6, { night: true, hgt: hgt(S) }); S.amb.walkers(P, 10, { offs: [5.3, -5.3], hgt: hgt(S) }); lamps(S, P);
    S.amb.traffic(new Path([[-30, 9], [-30, H + 11]], false), 2, { kind: 'truck', colors: [0xe0c020], hgt: hgt(S), speed: [3, 5] }); S.amb.traffic(new Path([[W + 30, 9], [W + 30, H + 11]], false), 2, { kind: 'truck', colors: [0xe0c020], hgt: hgt(S), speed: [3, 5] });
    S.amb.boats(laneLoop(S, q, 32, 80), ['tug', 'ship', 'small', 'tanker', 'tug', 'small'], { y: -1.8, speed: 4 });
    for (let i = 0; i < S.n(10); i++) { const p = S.ring(40, 110, (x, z) => z < -30); if (p) S.amb.blink(glow(S, p[0], 2, p[1], 2.2, S.pick(['rgba(255,60,40,1)', 'rgba(60,255,90,1)'])), S.R(1.5, 3)); }
    flagsAt(S, [[W / 2 - 6, 3, 'co']], { h: 10 }); S.amb.birds(W / 2, -10, { n: 12, y: 16, color: 0xf0f0f0, flocks: 3 }); clouds(S, 10, { color: 0xf0b8a0 });
  },
};

function harbourCity(S, cc) { // Hamburg (de) / Rio (br): water on the quiet side, port + city inland
  const q = S.quiet, qd = 7, W = S.W, H = S.H, hz = q === 'n' || q === 's', len = hz ? W : H;
  S.waterFn = (x, z) => S.sideD(x, z, q) - qd; clipSide(S, q, qd); quay(S, q, qd);
  const P = roads(S, ringPts(S, 8, 3.3), { w: 6.6, closed: true, walk: cc === 'br' ? 1.5 : 0 }); const P2 = roads(S, S.sideRoad(S.busy, 40), { w: 8 });
  terrain(S, cc === 'br' ? { start: 40, ramp: 40, amp: 6, colors: [0x3e4a3a, 0x4a5a40], mtn: { d0: 45, d1: 100, amp: 70, f: 0.018, side: S.busy } } : { start: 40, ramp: 60, amp: 3, colors: [0x4e5a44, 0x5a6248] });
  water(S, { y: -1.6, rough: 0.8 });
  for (const t of [-34, len + 34, len + 70]) { const p = along(S, q, qd - 9, t); gantry(S, p[0], p[1], ryOut(S, q), t < 0 ? 0xc8402a : 0x2a6aa8); }
  const sp = along(S, q, qd + 7, len * 0.45); S.amb.moored('ship', sp[0], -1.6, sp[1], hz ? 0 : Math.PI / 2);
  const c0 = along(S, q, qd - 30, -100); containers(S, [[c0[0], c0[1], 8, 6, 4, hz ? 0 : Math.PI / 2]]); const c1 = along(S, q, qd - 30, len + 40); containers(S, [[c1[0], c1[1], 8, 6, 4, hz ? 0 : Math.PI / 2]]);
  const night = S.night || S.dusk;
  city(S, { n: 70, d0: 16, d1: 135, h: cc === 'br' ? [8, 22] : [10, 24], tallP: 0.12, pal: cc === 'br' ? [0xd8c8a8, 0xe0a070, 0x8ab0a8, 0xe8e0d0, 0xc87a6a] : [0x8a4a3a, 0x9a5a48, 0x7a7a7a, 0xa89a88, 0x6a3a30], ok: (x, z) => S.sideD(x, z, q) < -4 && (cc !== 'br' || S.h(x, z) < 12) });
  if (cc === 'br') { village(S, { n: 70, d0: 40, d1: 110, pal: [0xe07a5a, 0x5aa0c0, 0xe8d070, 0x8ac07a, 0xd8d0c0], ok: (x, z) => S.sideD(x, z, S.busy) > 30 && S.h(x, z) > 6, walls: false });
    for (let i = 0; i < S.n(40); i++) { const p = S.ring(40, 110, (x, z) => S.sideD(x, z, S.busy) > 30 && S.h(x, z) > 6); if (p) glow(S, p[0], S.h(p[0], p[1]) + 2, p[1], 1.6, 'rgba(255,200,120,1)', { op: 0.8 }); }
    const [ax, az] = S.sideMid(q, 105); cone(S, ax - 30, az, 22, 62, 0x4a5a44, { y: -6 }); cone(S, ax + 8, az + 12, 18, 34, 0x4a5a44, { y: -6 });
    const cr = S.sideMid(S.busy, 92); const cy = S.h(cr[0], cr[1]); const cb = new GB(); cb.box(cr[0], cy + 4, cr[1], 3, 8, 3, 0xc8c8c0); cb.box(cr[0], cy + 16, cr[1], 2, 16, 2, 0xe8e8e0); cb.box(cr[0], cy + 20, cr[1], 15, 1.8, 1.8, 0xe8e8e0); cb.box(cr[0], cy + 25, cr[1], 1.6, 2.4, 1.6, 0xe8e8e0);
    S.add(cb.build(), S.vmat('lm', { emissive: 0xffffff, emissiveIntensity: night ? 0.55 : 0 })); if (night) glow(S, cr[0], cy + 18, cr[1], 26, 'rgba(255,240,220,1)', { op: 0.3 });
    forest(S, 'jungle', 200, 30, 140, { ok: (x, z) => S.sideD(x, z, S.busy) > 20, scale: [2, 3.2] }); forest(S, 'palm', 50, 4, 50, { ok: (x, z) => S.sideD(x, z, q) < -3, scale: [1.8, 2.6] });
  } else { for (let i = 0; i < 5; i++) { const p = S.ring(80, 140, (x, z) => S.sideD(x, z, q) < -30); if (p) turbine(S, p[0], p[1], 55); }
    forest(S, 'round', 120, 12, 120, { ok: (x, z) => S.sideD(x, z, q) < -4, scale: [1.6, 2.6] }); forest(S, 'poplar', 40, 20, 100, { ok: (x, z) => S.sideD(x, z, q) < -4 }); }
  S.amb.traffic(P, 10, { kind: 'truck', night, hgt: hgt(S), colors: [0xc8402a, 0x2a6aa8, 0xe0c020, 0x3a3a3a, 0xe8e8e0] }); S.amb.traffic(P2, 14, { night, hgt: hgt(S) }); S.amb.walkers(P2, 14, { offs: [5.5, -5.5], hgt: hgt(S) }); lamps(S, P2); lamps(S, P, { every: 26, off: 4.2 });
  S.amb.boats(laneLoop(S, q, 30, 72), ['tug', 'ship', 'small', 'ferry', 'tug'], { y: -1.6, speed: 4 });
  const fp = along(S, q, 3, len * 0.15); flagsAt(S, [[fp[0], fp[1], cc]], { h: 10 }); S.amb.birds(S.cx, S.cz, { n: 12, y: 16, color: 0xf0f0f0, flocks: 2 }); clouds(S, 10, { color: S.night ? 0x303848 : 0xd0d4d8, op: 0.7 });
}

function kenya(S, isCity) { // Naivasha ranch / Nairobi
  const q = S.quiet, lk = S.sideMid(q, 95), o = S.outward(q), rx = o[0] ? 40 : 75, rz = o[0] ? 75 : 40;
  if (!isCity) S.waterFn = (x, z) => (1 - ((x - lk[0]) / rx) ** 2 - ((z - lk[1]) / rz) ** 2) * 30;
  const P = isCity ? roads(S, ringPts(S, 9), { w: 9, closed: true, walk: 2 }) : roads(S, S.sideRoad(S.busy, 12), { w: 6, color: 0x9a6a4a, line: false });
  terrain(S, { start: isCity ? 50 : 30, ramp: 50, amp: 5, colors: isCity ? [0x7a6a4a, 0x8a7a5a] : [0x9a8a5a, 0xa8965e], rock: 0x7a6a54, mtn: { d0: 75, d1: 115, amp: 36, f: 0.012, side: S.busy } });
  if (!isCity) water(S, { y: -0.9, rough: 0.3, color: 0x3a5a5a });
  if (isCity) { city(S, { n: 80, d0: 16, d1: 130, h: [10, 30], tallP: 0.15, tall: [40, 70], pal: [0xcbb89a, 0xb8a888, 0xe0d8c8, 0x9a9a98, 0xd8c0a0] }); S.amb.walkers(P, 26, { offs: [5.5, -5.5], hgt: hgt(S) }); lamps(S, P); }
  else { village(S, { n: 12, d0: 25, d1: 100, pal: [0xc8a878, 0xb08860], ok: (x, z) => !S.inWater(x, z, 12) }); }
  forest(S, 'acacia', isCity ? 70 : 190, 4, 140, { scale: [2, 3.2] }); forest(S, 'bush', isCity ? 40 : 160, 2, 120, { scale: [1.5, 3] });
  if (!isCity) forest(S, 'jungle', 50, 30, 120, { ok: (x, z) => { const w = S.waterFn(x, z); return w < -1 && w > -12; }, scale: [1.8, 2.6] });
  groundDetail(S, ['grass', 'bush', 'rock'], 0.22, { outside: 220 });
  const van = { kind: 'van', hgt: hgt(S), colors: isCity ? [0xe0c020, 0x2a8a3a, 0xc83a5a, 0xe8e8e0, 0x2a5aa8] : [0xd8c8a0, 0x6a7a4a, 0xe8e8e0] };
  S.amb.traffic(P, isCity ? 14 : 4, { ...van, night: S.night || S.dusk }); if (isCity) S.amb.traffic(P, 10, { hgt: hgt(S), night: true });
  const zp = S.ring(25, 60, (x, z) => !S.inWater(x, z, 4)); if (zp) S.amb.herd('zebra', isCity ? 4 : 14, zp[0], zp[1], 12, { hgt: S.h });
  const gp = S.ring(35, 80, (x, z) => !S.inWater(x, z, 4)); if (gp) S.amb.herd('giraffe', isCity ? 2 : 5, gp[0], gp[1], 14, { hgt: S.h, speed: 0.5 });
  if (!isCity) S.amb.birds(lk[0], lk[1], { n: 14, y: 2, r: 18, color: 0xe8a0a8, flocks: 2, spread: 40 });
  S.amb.birds(S.cx, S.cz, { n: 6, y: 34, r: 50, color: 0x2a2a2a, flocks: 2 });
  const g = S.sideMid(S.busy, 6); flagsAt(S, [[g[0] - 6, g[1], 'ke'], [g[0] + 6, g[1], 'ke']]); clouds(S, 12, { color: S.dusk ? 0xf0c0a0 : 0xffffff });
}

// map key -> profile (maps not listed fall back to 'generic')
export const SCENERY = { embassy: 'city', warehouse: 'docks', kandahar: 'desert', oilrig: 'rig', subway: 'citynight', hkoffice: 'tower', bank: 'colonial', ship: 'harbour', killhouse: 'training', nairobi: 'savannacity', rio: 'riodocks', forest: 'forest', valley: 'farm', port: 'port', ranch: 'savanna' };
const FOG = { forest: [34, 150], tower: [70, 199], rig: [60, 199] };

export function buildScenery(level, scene, root, quality, ctx = {}) {
  try {
    const key = level.def.key || '';
    const S = makeCtx(level, scene, root, quality, ctx); const prof = SCENERY[key] || 'generic';
    S.sky = SKY[S.time] || SKY.day; S.horCol = new THREE.Color(S.sky.hor).lerp(new THREE.Color(S.th.sky ?? S.sky.hor), 0.45);
    if (prof === 'forest') S.horCol.lerp(new THREE.Color(0x9aa89a), 0.4);
    PROFILES[prof](S); drawRoads(S);
    const dome = skyDome(S, S.sky, S.horCol); root.add(dome); dome.onBeforeRender = (r, sc, cam) => { S.amb.cam = cam; S.amb.tick(performance.now()); };
    const f = FOG[prof] || S.sky.fog; scene.background = S.horCol.clone(); scene.fog = new THREE.Fog(S.horCol.clone(), f[0], f[1]);
    level.ambient = S.amb; root.userData.ambient = S.amb; level.scenery = prof;
    return S.amb;
  } catch (e) { if (typeof console !== 'undefined') console.info('[scenery] skipped:', e && e.message); return null; }
}
