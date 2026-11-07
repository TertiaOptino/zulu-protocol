import * as THREE from 'three';
// Procedural gun finishes: tileable canvas textures generated once at start-up (no image files).
// Finish ids (stored per part as MAT.*.f, packed with the edge-wear weight as wz = wear + 2 * f):
//   0 legacy (metal flag only) · 1 hard-coat anodized · 2 blued steel · 3 parkerized (phosphate) · 4 polymer
//   5 rubber · 6 wood · 7 glass/lens (untouched) · 8 stippled polymer grip · 9 checkered grip/wood
// Maps (256², repeat-wrapped, mipmapped):
//   uFinA  normal map pair: RG = stipple slope, BA = checkering slope
//   uFinB  normal map pair: RG = wood-grain slope, BA = parkerized crystal slope
//   uFinC  RG = polymer micro-texture slope, B = wood figure (albedo), A = scuff / handling-wear mask
//   uFinD  R = parkerized roughness mottling, G = anodized brushed streaks, B = scratch map, A = rubber/poly speckle
export const FIN = { legacy: 0, anod: 1, steel: 2, park: 3, poly: 4, rub: 5, wood: 6, glass: 7, stip: 8, check: 9 };
const N = 256;
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917), (s ^= s >>> 16) >>> 0) / 4294967296); }
// tileable value noise lattice with period f (in cells across the tile)
function lattice(rnd, f, f2 = f) { const g = Float32Array.from({ length: f * f2 }, rnd); return (x, y) => { const fx = x * f / N, fy = y * f2 / N, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const v = (i, j) => g[(((j % f2) + f2) % f2) * f + (((i % f) + f) % f)]; return (v(x0, y0) * (1 - sx) + v(x0 + 1, y0) * sx) * (1 - sy) + (v(x0, y0 + 1) * (1 - sx) + v(x0 + 1, y0 + 1) * sx) * sy; }; }
function fbm(rnd, base, oct, gain = 0.5, base2 = base) { const ls = []; for (let i = 0; i < oct; i++) ls.push(lattice(rnd, base << i, base2 << i)); return (x, y) => { let v = 0, a = 1, t = 0; for (const l of ls) { v += l(x, y) * a; t += a; a *= gain; } return v / t; }; }
const field = (fn) => { const a = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) a[y * N + x] = fn(x, y); return a; };
const W = (i) => ((i % N) + N) % N;
// slope (normal-map) of a height field: central differences with wrap, in height units per tile
function slope(h) { const s = new Float32Array(N * N * 2); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 2;
  s[i] = (h[y * N + W(x + 1)] - h[y * N + W(x - 1)]) * N / 2; s[i + 1] = (h[W(y + 1) * N + x] - h[W(y - 1) * N + x]) * N / 2; } return s; }
// pack slopes to bytes: value / k mapped to 0..255 around 128 (k = the full-scale slope, decoded in GLSL as (t - 0.5) * 2)
const enc = (v, k) => Math.max(0, Math.min(255, Math.round(128 + 127 * v / k)));
function maxAbs(s) { let m = 1e-6; for (const v of s) m = Math.max(m, Math.abs(v)); return m; }
// stamp a soft round bump into a height field (wrapping)
function bump(h, cx, cy, r, amp) { const R = Math.ceil(r); for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const d = Math.hypot(dx + (cx % 1), dy + (cy % 1)) / r; if (d >= 1) continue; const i = W(Math.floor(cy) + dy) * N + W(Math.floor(cx) + dx); h[i] = Math.max(h[i], amp * (Math.cos(d * Math.PI) * 0.5 + 0.5)); } }
let built = null;
export const FIN_SCALE = { stip: 0, check: 0, wood: 0, park: 0, poly: 0 }; // full-scale slope per map (filled at build)
function canvasTex(px) { const cv = document.createElement('canvas'); cv.width = cv.height = N; const cx = cv.getContext('2d'); const im = cx.createImageData(N, N); im.data.set(px); cx.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; t.premultiplyAlpha = false; t.needsUpdate = true; return { t, cv, cx }; }
export function finishTextures() {
  if (built) return built; const rnd = rng(90210);
  // --- stippling: dense overlapping soft dimples/bumps (laser-stipple look), slight size jitter
  const stip = new Float32Array(N * N); const sn = fbm(rnd, 8, 3); for (let k = 0; k < 2600; k++) bump(stip, rnd() * N, rnd() * N, 2.2 + rnd() * 2.2, 0.55 + rnd() * 0.45);
  for (let i = 0; i < stip.length; i++) stip[i] = stip[i] * 0.85 + sn(i % N, (i / N) | 0) * 0.15;
  // --- checkering: 24 pyramids across the tile (diamonds from two crossed V-grooves), flat-topped, slightly worn
  const ck = field((x, y) => { const u = x / N * 24, v = y / N * 24; const a = Math.abs(((u + v) % 2 + 2) % 2 - 1), b = Math.abs(((u - v) % 2 + 2) % 2 - 1); return Math.min(1, Math.min(a, b) * 1.35); });
  // --- wood: grain runs along u (the gun's barrel axis); growth rings warped by low-frequency noise, open pores + rays
  const wn = fbm(rnd, 1, 3, 0.5, 3), wfib = fbm(rnd, 2, 4, 0.6, 48), wpore = lattice(rnd, 48, 192); // anisotropic: slow along u, fast across
  const woodFig = new Float32Array(N * N); const wood = field((x, y) => { const warp = wn(x, y) * 2.4; const ring = (y / N) * 18 + warp; const fr = ring - Math.floor(ring);
    const late = Math.pow(Math.sin(fr * Math.PI), 8); const fib = wfib(x, y); // long fibres along u
    const pore = wpore(x, y) > 0.8 ? (wpore(x, y) - 0.8) * 4 : 0; woodFig[y * N + x] = Math.min(1, late * 0.6 + (1 - fib) * 0.45 + pore * 0.35); return late * 0.5 + fib * 0.35 - pore * 0.5; });
  // --- parkerized: crystalline phosphate = voronoi-ish random plateaus + micro noise
  const cells = Array.from({ length: 420 }, () => [rnd() * N, rnd() * N, rnd()]); const pmicro = lattice(rnd, 128); const parkR = new Float32Array(N * N);
  const park = field((x, y) => { let best = 1e9, second = 1e9, val = 0; for (const [cx, cy, v] of cells) { let dx = Math.abs(x - cx), dy = Math.abs(y - cy); dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy); const d = dx * dx + dy * dy; if (d < best) { second = best; best = d; val = v; } else if (d < second) second = d; }
    const edge = Math.min(1, (Math.sqrt(second) - Math.sqrt(best)) / 3); parkR[y * N + x] = val; return val * 0.6 * edge + pmicro(x, y) * 0.4; });
  // --- polymer: bead-blast micro texture (multi-octave high-frequency noise)
  const pf = fbm(rnd, 32, 3, 0.6); const poly = field((x, y) => pf(x, y));
  // --- scuff / handling-wear mask: blotches from thresholded fbm + scratches drawn on a 2D canvas (wrapped)
  const bl = fbm(rnd, 4, 5, 0.55); const scuff = field((x, y) => Math.max(0, Math.min(1, (bl(x, y) - 0.52) * 4)));
  const scv = document.createElement('canvas'); scv.width = scv.height = N; const sx = scv.getContext('2d'); sx.fillStyle = '#000'; sx.fillRect(0, 0, N, N); sx.lineCap = 'round';
  for (let k = 0; k < 220; k++) { const x0 = rnd() * N, y0 = rnd() * N, a = rnd() * Math.PI * 2, l = 6 + rnd() * 70, c = 50 + rnd() * 205 | 0; sx.strokeStyle = `rgb(${c},${c},${c})`; sx.lineWidth = rnd() < 0.85 ? 0.6 : 1.3; const bend = (rnd() - 0.5) * 0.4;
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { sx.beginPath(); sx.moveTo(x0 + ox, y0 + oy); sx.quadraticCurveTo(x0 + ox + Math.cos(a + bend) * l / 2, y0 + oy + Math.sin(a + bend) * l / 2, x0 + ox + Math.cos(a) * l, y0 + oy + Math.sin(a) * l); sx.stroke(); } }
  const scr = sx.getImageData(0, 0, N, N).data;
  // brushed anodizing streaks (along u) and rubber speckle
  const br = fbm(rnd, 64, 2); const sp = lattice(rnd, 128);
  const sStip = slope(stip), sCk = slope(ck), sWood = slope(wood), sPark = slope(park), sPoly = slope(poly);
  const k = { stip: maxAbs(sStip) * 0.8, check: maxAbs(sCk), wood: maxAbs(sWood) * 0.7, park: maxAbs(sPark) * 0.7, poly: maxAbs(sPoly) * 0.7 }; Object.assign(FIN_SCALE, k);
  const A = new Uint8ClampedArray(N * N * 4), B = new Uint8ClampedArray(N * N * 4), Cc = new Uint8ClampedArray(N * N * 4), D = new Uint8ClampedArray(N * N * 4);
  for (let i = 0; i < N * N; i++) { const j = i * 4, s = i * 2, x = i % N, y = (i / N) | 0;
    A[j] = enc(sStip[s], k.stip); A[j + 1] = enc(sStip[s + 1], k.stip); A[j + 2] = enc(sCk[s], k.check); A[j + 3] = enc(sCk[s + 1], k.check);
    B[j] = enc(sWood[s], k.wood); B[j + 1] = enc(sWood[s + 1], k.wood); B[j + 2] = enc(sPark[s], k.park); B[j + 3] = enc(sPark[s + 1], k.park);
    Cc[j] = enc(sPoly[s], k.poly); Cc[j + 1] = enc(sPoly[s + 1], k.poly); Cc[j + 2] = woodFig[i] * 255; Cc[j + 3] = Math.max(scuff[i], scr[j] / 255 * 0.9) * 255;
    D[j] = parkR[i] * 255; D[j + 1] = br(x * 4 % N, y) * 255; D[j + 2] = scr[j]; D[j + 3] = sp(x, y) * 255; }
  built = { A: canvasTex(A).t, B: canvasTex(B).t, C: canvasTex(Cc).t, D: canvasTex(D).t };
  return built;
}
export function finishUniforms() { const t = finishTextures(); return { uFinA: { value: t.A }, uFinB: { value: t.B }, uFinC: { value: t.C }, uFinD: { value: t.D } }; }
// GLSL: gunSurface(c, r, m, wz, p, n) shades albedo/roughness/metal and leaves a screen-space height gradient in gDH;
// gunNormal(normal) then bends the shading normal with it (bump from the normal maps' slopes, no tangents needed,
// works for both the static item meshes and the skinned in-hand guns). p = gun-space position (metres), n = gun-space normal.
export const FINISH_GLSL = `uniform sampler2D uGrain; uniform sampler2D uFinA; uniform sampler2D uFinB; uniform sampler2D uFinC; uniform sampler2D uFinD;
vec2 gDH = vec2(0.0); float gBumpOn = 0.0;
vec2 grainAt(vec3 p, vec3 n){ vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x+w.y+w.z+1e-4); p *= 9.0; return texture2D(uGrain, p.zy).rg*w.x + texture2D(uGrain, p.xz).rg*w.y + texture2D(uGrain, p.xy).rg*w.z; }
// triplanar projections, u along the barrel (z) where possible so wood grain and brushing follow the gun
struct TP { vec2 ux; vec2 uy; vec2 uz; vec3 w; };
TP tpOf(vec3 p, vec3 n, float s){ TP t; vec3 w = pow(abs(n), vec3(6.0)); t.w = w / (w.x+w.y+w.z+1e-4); t.ux = p.zy*s; t.uy = p.zx*s; t.uz = p.xy*s; return t; }
vec4 tpS(sampler2D tx, TP t){ return texture2D(tx, t.ux)*t.w.x + texture2D(tx, t.uy)*t.w.y + texture2D(tx, t.uz)*t.w.z; }
// screen-space height gradient from a slope pair stored in channels sel (0 = .rg, 1 = .ba); amp = metres of relief per tile-slope unit
vec2 tpDH(sampler2D tx, TP t, float sel, vec3 dpx, vec3 dpy, float s, float amp){
  vec4 a = texture2D(tx, t.ux), b = texture2D(tx, t.uy), c = texture2D(tx, t.uz);
  vec2 sa = (mix(a.rg, a.ba, sel) - 0.5) * 2.0, sb = (mix(b.rg, b.ba, sel) - 0.5) * 2.0, sc = (mix(c.rg, c.ba, sel) - 0.5) * 2.0;
  vec2 r;
  r.x = t.w.x * dot(sa, dpx.zy) + t.w.y * dot(sb, dpx.zx) + t.w.z * dot(sc, dpx.xy);
  r.y = t.w.x * dot(sa, dpy.zy) + t.w.y * dot(sb, dpy.zx) + t.w.z * dot(sc, dpy.xy);
  return r * s * amp;
}
void gunSurface(inout vec3 c, inout float r, inout float m, float wz, vec3 p, vec3 n){
  float f = floor(wz * 0.5 + 0.0001); float w = clamp(wz - 2.0 * f, 0.0, 1.0);
  vec2 g = grainAt(p, n); float fine = texture2D(uGrain, p.zx * 37.0 + p.y * 11.0).r; float metal = step(0.5, m);
  vec3 dpx = dFdx(p), dpy = dFdy(p);
  // fade relief out once a texel is smaller than a pixel (distant soldiers / small thumbnails): no shimmer
  float pxs = max(length(dpx), length(dpy));
  if (f < 0.5) { // legacy look (parts without a finish id)
    r = clamp(r + (g.x - 0.5) * mix(0.28, 0.14, metal) + (fine - 0.5) * 0.08, 0.05, 1.0); c *= 0.94 + 0.12 * g.x;
    float sc = g.y * mix(0.35, 0.8, metal); r = mix(r, r * 0.55, sc); c = mix(c, c * 1.5 + 0.03, sc * 0.5 * metal);
    float wr = smoothstep(0.3, 0.75, w * (0.45 + 0.9 * g.x));
    if (metal > 0.5) { c = mix(c, vec3(0.42, 0.43, 0.45), wr * 0.75); r = mix(r, 0.28, wr); m = mix(m, 1.0, wr); } else { c = mix(c, c * 1.55 + 0.035, wr * 0.6); r = mix(r, r * 0.7, wr); }
    return; }
  if (abs(f - 7.0) < 0.5) return; // glass / lenses
  TP big = tpOf(p, n, 4.0); vec4 sm = tpS(uFinC, big); vec4 dm = tpS(uFinD, tpOf(p, n, 9.0));
  float scuff = sm.a;                                   // blotchy handling wear + scratches (0..1)
  float edge = smoothstep(0.25, 0.8, w * (0.55 + 0.9 * g.x) + scuff * 0.25 * w);   // bevel/edge wear, broken up by grain
  float detail = 1.0 - smoothstep(0.0012, 0.004, pxs);  // relief visibility
  if (f < 1.5) { // hard-coat anodized aluminium: satin, faint brushing along the barrel, edges chip to bright alloy
    TP t = tpOf(p, n, 22.0); float brush = tpS(uFinD, t).g; r = clamp(r + (brush - 0.5) * 0.18 + (g.x - 0.5) * 0.1, 0.12, 0.9); c *= 0.95 + 0.1 * brush;
    gDH = tpDH(uFinC, t, 0.0, dpx, dpy, 22.0, 0.00002) * detail;
    float sc = dm.b * 0.7; c = mix(c, c * 1.6 + 0.04, sc * 0.35); r = mix(r, r * 0.6, sc * 0.5);
    c = mix(c, vec3(0.62, 0.63, 0.66), edge * 0.85); r = mix(r, 0.22, edge); m = mix(m, 1.0, edge);
  } else if (f < 2.5) { // blued / bare steel: smooth, crisp scratches, polished bright where worn
    r = clamp(r + (g.x - 0.5) * 0.1, 0.1, 0.8); float sc = max(dm.b, g.y) * 0.8; c = mix(c, c * 1.7 + 0.05, sc * 0.45); r = mix(r, r * 0.5, sc);
    c = mix(c, vec3(0.56, 0.57, 0.6), edge * 0.8); r = mix(r, 0.18, edge); m = mix(m, 1.0, edge);
  } else if (f < 3.5) { // parkerized: grey-black crystalline phosphate, very matte, mottled; worn edges go to grey steel
    TP t = tpOf(p, n, 70.0); float cr = mix(0.5, tpS(uFinD, t).r, 0.25 * (1.0 - smoothstep(0.0002, 0.0006, pxs))); r = clamp(0.62 + (cr - 0.5) * 0.25 + (g.x - 0.5) * 0.12, 0.35, 0.95); m = min(m, 0.55); c *= 0.97 + 0.06 * cr; c = mix(c, c * vec3(1.02, 1.0, 0.96) + 0.01, smoothstep(0.55, 0.9, g.x) * 0.5);
    // phosphate crystals are below pixel size at game distances: roughness/colour mottling only (no relief: it aliases into a grid)
    c = mix(c, vec3(0.44, 0.45, 0.47), edge * 0.8); r = mix(r, 0.3, edge); m = mix(m, 0.95, edge);
  } else if (f < 4.5 || (f > 7.5 && f < 8.5) || f > 8.5) { // polymer family (+ stippling / checkering on grips)
    TP t = tpOf(p, n, 26.0); c *= 0.82; r = clamp(r + (dm.a - 0.5) * 0.12 + (g.x - 0.5) * 0.1, 0.3, 0.95);
    gDH = tpDH(uFinC, t, 0.0, dpx, dpy, 26.0, 0.000025);
    if (f > 7.5 && f < 8.5) { TP ts = tpOf(p, n, 30.0); gDH += tpDH(uFinA, ts, 0.0, dpx, dpy, 30.0, 0.00028); r = clamp(r + 0.12, 0.3, 0.98); c *= 0.92; }
    else if (f > 8.5) { TP tc = tpOf(p, n, 14.0); gDH += tpDH(uFinA, tc, 1.0, dpx, dpy, 14.0, 0.00022); r = clamp(r + 0.06, 0.3, 0.98); }
    gDH *= detail;
    c = mix(c, c * 1.45 + 0.03, scuff * 0.22); r = mix(r, r * 0.75, scuff * 0.4);           // rubbed shiny patches
    c = mix(c, c * 1.5 + 0.03, edge * 0.35); r = mix(r, r * 0.7, edge);                    // polished edges
  } else if (f < 5.5) { // rubber: dead matte, speckled, dusty
    r = clamp(0.88 + (dm.a - 0.5) * 0.1, 0.7, 1.0); m = 0.0; c *= 0.9 + 0.2 * dm.a; c = mix(c, c + 0.035, scuff * 0.4);
  } else { // wood: figure follows the barrel axis, pores sunk, satin oil finish, edges handled lighter
    TP t = tpOf(p, n, 5.0); vec4 fig = tpS(uFinC, t); float d = fig.b;
    vec3 dark = c * vec3(0.55, 0.48, 0.44), light = c * vec3(1.15, 1.08, 1.0); c = mix(light, dark, d);
    r = clamp(0.42 + d * 0.22 + (g.x - 0.5) * 0.1, 0.25, 0.85); m = 0.0;
    gDH = tpDH(uFinB, t, 0.0, dpx, dpy, 5.0, 0.0001) * detail;
    c = mix(c, c * 1.35 + vec3(0.04, 0.025, 0.01), edge * 0.6 + scuff * 0.12); r = mix(r, 0.3, edge * 0.5);
  }
  gBumpOn = 1.0;
}
// bump the shading normal with gDH (Mikkelsen's surface-gradient bump; surf_pos = view-space position)
vec3 gunBump(vec3 surf_pos, vec3 nrm){ vec3 sx = dFdx(surf_pos), sy = dFdy(surf_pos); vec3 R1 = cross(sy, nrm), R2 = cross(nrm, sx); float det = dot(sx, R1);
  vec3 grad = sign(det) * (gDH.x * R1 + gDH.y * R2); return normalize(abs(det) * nrm - grad); }`;
