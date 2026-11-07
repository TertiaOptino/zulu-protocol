import * as THREE from 'three';
const cache = {};
function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d')]; }
function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }
function shade(c, f) { const r = Math.min(255, ((c >> 16) & 255) * f), g = Math.min(255, ((c >> 8) & 255) * f), b = Math.min(255, (c & 255) * f); return `rgb(${r | 0},${g | 0},${b | 0})`; }
function noise(ctx, n, amt, count = 4000, size = 2) { for (let i = 0; i < count; i++) { const v = Math.random(); ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${amt * Math.random()})` : `rgba(0,0,0,${amt * Math.random()})`; const s = size * (0.5 + Math.random()); ctx.fillRect(Math.random() * n, Math.random() * n, s, s); } }
function tex(c, rep = 1) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.repeat.set(rep, rep); return t; }
// Each texture covers N world metres (texel scale handled with UVs in world units / span)
export function floorTex(kind, color) {
  const key = kind + color; if (cache[key]) return cache[key];
  const N = 256; const [c, x] = canvas(N);
  x.fillStyle = hex(color); x.fillRect(0, 0, N, N);
  if (kind === 'tile' || kind === '_') { noise(x, N, 0.05, 3000); x.strokeStyle = shade(color, 0.72); x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * N / 4, 0); x.lineTo(i * N / 4, N); x.stroke(); x.beginPath(); x.moveTo(0, i * N / 4); x.lineTo(N, i * N / 4); x.stroke(); } for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { x.fillStyle = 'rgba(0,0,0,0.05)'; x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); } }
  else if (kind === 'wood' || kind === '=') { for (let i = 0; i < 8; i++) { x.fillStyle = shade(color, 0.85 + Math.random() * 0.3); x.fillRect(0, i * 32, N, 32); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, i * 32, N, 2); const o = Math.random() * N; x.fillRect(o, i * 32, 2, 32); } noise(x, N, 0.06, 2000, 3); for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(60,30,10,0.12)'; x.fillRect(Math.random() * N, Math.random() * N, 30 + Math.random() * 40, 1); } }
  else if (kind === 'carpet' || kind === '~') { noise(x, N, 0.12, 9000, 1.5); x.strokeStyle = shade(color, 0.8); x.lineWidth = 6; x.strokeRect(10, 10, N - 20, N - 20); }
  else if (kind === 'grate' || kind === '-') { x.fillStyle = shade(color, 0.6); x.fillRect(0, 0, N, N); x.strokeStyle = shade(color, 1.15); x.lineWidth = 4; for (let i = -N; i < N * 2; i += 21) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + N, N); x.stroke(); x.beginPath(); x.moveTo(i, N); x.lineTo(i + N, 0); x.stroke(); } noise(x, N, 0.08, 2000); }
  else if (kind === 'ground' || kind === ',') { noise(x, N, 0.16, 12000, 2.5); for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; x.beginPath(); x.arc(Math.random() * N, Math.random() * N, 10 + Math.random() * 40, 0, 7); x.fill(); } }
  else { noise(x, N, 0.1, 6000, 2); x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 1.5; for (let i = 0; i < 6; i++) { x.beginPath(); let px = Math.random() * N, py = Math.random() * N; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (Math.random() - 0.5) * 40; py += (Math.random() - 0.5) * 40; x.lineTo(px, py); } x.stroke(); } x.strokeStyle = 'rgba(0,0,0,0.15)'; x.lineWidth = 2; x.strokeRect(0, 0, N, N); }
  return cache[key] = tex(c);
}
export function wallTex() { if (cache.wall) return cache.wall; const N = 128; const [c, x] = canvas(N); x.fillStyle = '#ffffff'; x.fillRect(0, 0, N, N); noise(x, N, 0.08, 3000, 2); return cache.wall = tex(c); }
export function containerTex() { if (cache.cont) return cache.cont; const N = 128; const [c, x] = canvas(N); x.fillStyle = '#fff'; x.fillRect(0, 0, N, N); for (let i = 0; i < N; i += 8) { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(i, 0, 3, N); } noise(x, N, 0.1, 1500); return cache.cont = tex(c); }
export function labelTex(text, bg = '#ff7a1a', fg = '#111', w = 128, h = 128, font = 'bold 84px sans-serif', round = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.beginPath(); if (round) x.arc(w / 2, h / 2, Math.min(w, h) / 2 - 4, 0, 7); else x.rect(4, 4, w - 8, h - 8); x.fill(); x.lineWidth = 6; x.strokeStyle = '#111'; x.stroke(); }
  x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function glowTex(color = 'rgba(255,220,140,1)') { const key = 'glow' + color; if (cache[key]) return cache[key]; const N = 64; const [c, x] = canvas(N); const g = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2); g.addColorStop(0, color); g.addColorStop(0.3, color.replace(/,[\d.]+\)$/, ',0.6)')); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, N, N); const t = new THREE.CanvasTexture(c); return cache[key] = t; }
export function smokeTex() { if (cache.smoke) return cache.smoke; const N = 128; const [c, x] = canvas(N); for (let i = 0; i < 30; i++) { const px = N / 2 + (Math.random() - 0.5) * 50, py = N / 2 + (Math.random() - 0.5) * 50, r = 20 + Math.random() * 30; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(220,220,220,0.25)'); g.addColorStop(1, 'rgba(220,220,220,0)'); x.fillStyle = g; x.fillRect(0, 0, N, N); } return cache.smoke = new THREE.CanvasTexture(c); }
export function iconTex(kind) {
  const key = 'icon' + kind; if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = kind.startsWith('ok') ? '#40c060' : kind === 'trap' ? '#d23a2a' : kind === 'lock' ? '#e8b020' : '#ff7a1a'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 6; x.strokeStyle = '#111'; x.stroke();
  x.fillStyle = '#111'; x.strokeStyle = '#111'; x.lineWidth = 10;
  if (kind === 'lock') { x.fillRect(38, 58, 52, 40); x.beginPath(); x.arc(64, 56, 17, Math.PI, 0); x.stroke(); }
  else if (kind === 'trap') { x.beginPath(); x.moveTo(64, 22); x.lineTo(104, 98); x.lineTo(24, 98); x.closePath(); x.fill(); x.fillStyle = '#d23a2a'; x.fillRect(59, 45, 10, 30); x.fillRect(59, 82, 10, 10); }
  else if (kind.length === 1 || kind.startsWith('ok')) { x.font = '900 76px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(kind.startsWith('ok') ? '✓' : kind, 64, 68); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return cache[key] = t;
}
// ---------- PBR helpers: normal + roughness maps derived from an albedo canvas (height = luminance) ----------
function pbrBase(t, strength) {
  const ud = t.userData; if (ud.pbr) return ud.pbr; const src = t.image; const N = src.width, M = src.height;
  const d = src.getContext('2d').getImageData(0, 0, N, M).data; const h = new Float32Array(N * M); let mean = 0;
  for (let i = 0; i < N * M; i++) { h[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255; mean += h[i]; } mean /= N * M;
  const [nc, nx] = canvas(N), [rc, rx] = canvas(N); const nd = nx.createImageData(N, M), rd = rx.createImageData(N, M);
  const H = (x, y) => h[((y + M) % M) * N + ((x + N) % N)];
  for (let y = 0; y < M; y++) for (let x = 0; x < N; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength; const l = Math.hypot(dx, dy, 1); const o = (y * N + x) * 4;
    nd.data[o] = (-dx / l * 0.5 + 0.5) * 255; nd.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; nd.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; nd.data[o + 3] = 255;
    const r = Math.min(1, Math.max(0.05, 0.5 + (mean - H(x, y)) * 1.6)); rd.data[o] = rd.data[o + 1] = rd.data[o + 2] = r * 255; rd.data[o + 3] = 255;
  }
  nx.putImageData(nd, 0, 0); rx.putImageData(rd, 0, 0);
  const mk = (c) => { const q = new THREE.CanvasTexture(c); q.wrapS = q.wrapT = THREE.RepeatWrapping; q.colorSpace = THREE.NoColorSpace; q.anisotropy = 4; return q; };
  return ud.pbr = { normalMap: mk(nc), roughnessMap: mk(rc) };
}
// returns { normalMap, roughnessMap, normalScale } using t's UV repeat; roughness map multiplies material roughness
export function pbrMaps(t, strength = 3, nScale = 1) {
  const b = pbrBase(t, strength); const out = {};
  for (const k of ['normalMap', 'roughnessMap']) { const q = b[k].clone(); q.repeat.copy(t.repeat); q.offset.copy(t.offset); q.needsUpdate = true; out[k] = q; }
  out.normalScale = new THREE.Vector2(nScale, nScale); return out;
}
