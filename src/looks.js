import * as THREE from 'three';
// ===== Data-driven appearance. Every unit defines its own soldier look; gear meshes are built from this by soldier.js. =====
// Camo patterns: type + palette. type: solid | blobs | dots | digital | stripes | splinter | tiger
export const CAMOS = {
  multicam: { name: 'MultiCam', type: 'blobs', base: 0x9a8a68, cols: [0x7b6d4e, 0x5d553c, 0xb9a986, 0x3f3a2c], size: 1 },
  woodland: { name: 'M81 Woodland', type: 'blobs', base: 0x6a6a46, cols: [0x3e4a2e, 0x262520, 0x7d6a4c], size: 1.5 },
  dcu: { name: 'Desert 3-colour', type: 'blobs', base: 0xc4ae88, cols: [0xa48a66, 0x8a755a], size: 1.8 },
  marpatd: { name: 'MARPAT Desert', type: 'digital', base: 0xb8a37f, cols: [0x957e5d, 0x6e5f47, 0xc8b894], size: 1 },
  aor2: { name: 'AOR2', type: 'digital', base: 0x5c6347, cols: [0x3b4734, 0x7a7154, 0x2a2e24], size: 1 },
  aor1: { name: 'AOR1', type: 'digital', base: 0xb39c78, cols: [0x8e7a5c, 0x6d5c45, 0xcbb792], size: 1 },
  cadpat: { name: 'CADPAT', type: 'digital', base: 0x5f6b48, cols: [0x3f4b33, 0x2a2c23, 0x7a7656], size: 1.2 },
  flecktarn: { name: 'Flecktarn', type: 'dots', base: 0x6d7050, cols: [0x3d4630, 0x272820, 0x8a7a52, 0x56683a], size: 1 },
  m84: { name: 'M/84', type: 'dots', base: 0x6a7350, cols: [0x3a4a30, 0x2a2b22, 0x7b7048], size: 1.2 },
  flora: { name: 'Flora (VSR)', type: 'stripes', base: 0x7a8662, cols: [0x4c6b3f, 0xa59f72], size: 1 },
  partizan: { name: 'Partizan', type: 'blobs', base: 0x6e6247, cols: [0x4b4434, 0x8c7c57, 0x30302a], size: 0.7 },
  dpm: { name: 'DPM', type: 'blobs', base: 0x7f7650, cols: [0x4c5235, 0x5e4630, 0x242320], size: 1.1 },
  auscam: { name: 'AUSCAM', type: 'blobs', base: 0x8f8a66, cols: [0x5d6a43, 0x6c5236, 0x3a3a2c], size: 0.9 },
  ce: { name: 'CE', type: 'blobs', base: 0x6b6d4a, cols: [0x48563a, 0x5a4532, 0x2a2a24], size: 1.3 },
  vegetato: { name: 'Vegetato', type: 'splinter', base: 0x76744f, cols: [0x4d5a3a, 0x5d4a35, 0x2d2c26, 0x8f8a62], size: 0.8 },
  pantera: { name: 'wz.93 Pantera', type: 'blobs', base: 0x6e7150, cols: [0x40503a, 0x5c4532, 0x262622], size: 0.9 },
  jigsaw: { name: 'Jigsaw', type: 'splinter', base: 0x727350, cols: [0x48553a, 0x5c4a36, 0x2a2a24], size: 1.1 },
  nfp: { name: 'NFP Green', type: 'digital', base: 0x606a4a, cols: [0x3a4632, 0x7a7454, 0x2b2c24], size: 0.8 },
  m90: { name: 'M90 Splinter', type: 'splinter', base: 0x5f6c4c, cols: [0x2c3a2a, 0x8a9168, 0x1f241e], size: 1 },
  m05: { name: 'M05 Woodland', type: 'digital', base: 0x55603f, cols: [0x2f3a2a, 0x6e6a48, 0x202219], size: 0.7 },
  alpine: { name: 'Alpine', type: 'splinter', base: 0xc9ccc8, cols: [0x9aa09a, 0x7a807a, 0xe2e4e0], size: 1.2 },
  granite: { name: 'Granite', type: 'digital', base: 0x4a4f52, cols: [0x2c3033, 0x6b7074, 0x1c1e20], size: 0.8 },
  tiger: { name: 'Tiger stripe', type: 'tiger', base: 0x6e7050, cols: [0x2b3022, 0x485636], size: 1 },
  ind: { name: 'Indian disruptive', type: 'digital', base: 0x6a6646, cols: [0x4a5234, 0x7d6647, 0x2c2b22], size: 1 },
  jp2: { name: 'Jieitai Type II', type: 'blobs', base: 0x6e7552, cols: [0x445a38, 0x5c4b36, 0x2a2a24], size: 0.8 },
  black: { name: 'Black', type: 'solid', base: 0x30353e },
  navy: { name: 'Navy blue', type: 'solid', base: 0x262f3e },
  ranger: { name: 'Ranger green', type: 'solid', base: 0x4a4f3c },
  olive: { name: 'Olive drab', type: 'solid', base: 0x575c3c },
  coyote: { name: 'Coyote', type: 'solid', base: 0x8a7656 },
  grey: { name: 'Urban grey', type: 'solid', base: 0x63676d },
  slate: { name: 'Slate', type: 'solid', base: 0x3c4448 },
  khaki: { name: 'Khaki', type: 'solid', base: 0xa89a78 },
  denim: { name: 'Denim', type: 'solid', base: 0x3d4b66 },
  white: { name: 'Snow', type: 'solid', base: 0xd8dbd8 },
};
// country -> flag drawing spec. h: horizontal bands, v: vertical bands, extras drawn in flagTex
export const FLAGS = {
  USA: { k: 'usa' }, UK: { k: 'uk' }, Germany: { h: ['#111', '#c8102e', '#ffcc00'] }, Russia: { h: ['#fff', '#0039a6', '#d52b1e'] }, Canada: { k: 'canada' },
  Australia: { k: 'aus' }, 'New Zealand': { k: 'nz' }, France: { v: ['#0055a4', '#fff', '#ef4135'] }, Italy: { v: ['#009246', '#fff', '#ce2b37'] }, Spain: { h: ['#c60b1e', '#ffc400', '#ffc400', '#c60b1e'] },
  Netherlands: { h: ['#ae1c28', '#fff', '#21468b'] }, Belgium: { v: ['#111', '#fdda24', '#ef3340'] }, Poland: { h: ['#fff', '#dc143c'] }, Austria: { h: ['#ed2939', '#fff', '#ed2939'] },
  'Czech Republic': { k: 'czech' }, Denmark: { k: 'nordic', bg: '#c8102e', c: '#fff' }, Norway: { k: 'nordic', bg: '#ba0c2f', c: '#fff', c2: '#00205b' }, Sweden: { k: 'nordic', bg: '#006aa7', c: '#fecc00' },
  Finland: { k: 'nordic', bg: '#fff', c: '#002f6c' }, Israel: { k: 'israel' }, 'South Korea': { k: 'korea' }, Japan: { k: 'japan' }, 'Hong Kong': { k: 'hk' }, India: { k: 'india' },
};
// Unit looks. helm: highcut(FAST)|mich|altyn|police|none   hat: beret|boonie|cap|beanie   face: balaclava|goggles|shades|shemagh   mask: gas|ball (headgear.js)
// vest: plate|jpc|chest|heavy|police|none   colours are hex; sig: signature weapons (granted when the unit is bought)
// black kits read as charcoal/navy (not pure black) so portraits and the store stay legible
const liftDark = (c) => { if (typeof c !== 'number') return c; const r = c >> 16, g = (c >> 8) & 255, b = c & 255; if (Math.max(r, g, b) > 0x34) return c; const k = 0.55, T = [0x34, 0x3b, 0x47]; return (Math.round(r + (T[0] - r) * k) << 16) | (Math.round(g + (T[1] - g) * k) << 8) | Math.round(b + (T[2] - b) * k); };
const LIFT = ['vestCol', 'helmCol', 'faceCol', 'glove', 'boot', 'pouch', 'maskCol', 'hatCol'];
const L = (camo, helm, o = {}) => { const l = L0(camo, helm, o); if (camo === 'black') for (const k of LIFT) l[k] = liftDark(l[k]); return l; };
const L0 = (camo, helm, o = {}) => ({ camo, helm, hat: null, face: null, nvg: false, vest: 'plate', vestCol: 0x8a7656, pouch: null, helmCol: null, glove: 0x2a2a28, boot: 0x5e4c38, pants: null, sig: [], ...o });
export const UNIT_LOOKS = {
  rangers: L('multicam', 'highcut', { nvg: true, vestCol: 0x8a7656, helmCol: 'camo', sig: ['m4a1', 'm249', 'sr25'] }),
  seals: L('aor2', 'highcut', { nvg: true, vest: 'jpc', vestCol: 0x4a4f3c, helmCol: 0x3e4334, glove: 0x6e6450, sig: ['hk416', 'mp7'] }),
  greenberets: L('multicam', 'none', { hat: 'beret', hatCol: 0x2f4a2a, vest: 'chest', vestCol: 0x7a6a4e, face: 'shades', sig: ['m4a1', 'scarl'] }),
  covert: L('black', 'none', { hat: 'cap', hatCol: 0x2a2b2e, face: 'shades', vest: 'chest', vestCol: 0x2a2b2e, pants: 'denim', boot: 0x2a2725, sig: ['mp7', 'vector', 'glock17'] }),
  sas: L('black', 'highcut', { face: 'balaclava', faceCol: 0x1c1d1f, mask: 'gas', vest: 'heavy', vestCol: 0x1f2124, helmCol: 0x1c1d20, glove: 0x1c1c1c, boot: 0x1c1b1a, sig: ['mp5', 'c8a2'] }),
  gsg9: L('slate', 'police', { visor: true, vest: 'police', vestCol: 0x3a4246, helmCol: 0x30373b, sig: ['mp5', 'g36c', 'g28'] }),
  ksk: L('flecktarn', 'mich', { face: 'goggles', vest: 'chest', vestCol: 0x5a5e40, helmCol: 'camo', sig: ['g36c', 'mg4', 'g28'] }),
  spetsnaz: L('flora', 'altyn', { mask: 'gas', canCol: 0x4c5638, vest: 'heavy', vestCol: 0x55603f, helmCol: 0x4c5638, face: 'balaclava', faceCol: 0x3c4232, sig: ['ak74m', 'pkp', 'svd'] }),
  swat: L('navy', 'police', { face: 'goggles', vest: 'police', vestCol: 0x22293a, helmCol: 0x1e2433, boot: 0x1c1b1a, sig: ['m4a1', 'm870', 'mp5'] }),
  delta: L('multicam', 'highcut', { nvg: true, vest: 'jpc', vestCol: 0x6d5f45, helmCol: 0x7a6a4e, face: 'shades', sig: ['hk416', 'mp7', 'sr25'] }),
  marsoc: L('marpatd', 'highcut', { vestCol: 0x9a8662, helmCol: 0x9a8662, sig: ['hk416', 'm1014'] }),
  sbs: L('black', 'highcut', { nvg: true, face: 'balaclava', faceCol: 0x1f2022, vest: 'jpc', vestCol: 0x2a2c2e, helmCol: 0x222426, boot: 0x1c1b1a, sig: ['c8a2', 'mp7'] }),
  srr: L('grey', 'none', { hat: 'beanie', hatCol: 0x2e3134, face: 'shades', vest: 'chest', vestCol: 0x3a3d40, pants: 'denim', sig: ['c8a2', 'glock17'] }),
  jtf2: L('cadpat', 'highcut', { face: 'balaclava', faceCol: 0x3a3e30, vestCol: 0x5a5e44, helmCol: 'camo', sig: ['c8a2', 'awm'] }),
  sasr: L('auscam', 'none', { hat: 'boonie', hatCol: 'camo', vest: 'chest', vestCol: 0x7a7050, sig: ['hk416', 'sr25'] }),
  nzsas: L('dpm', 'none', { hat: 'boonie', hatCol: 'camo', vest: 'chest', vestCol: 0x5a5a3c, face: 'shemagh', faceCol: 0x6a6448, sig: ['c8a2', 'awm'] }),
  gign: L('black', 'highcut', { face: 'balaclava', faceCol: 0x1c1d1f, mask: 'ball', vest: 'heavy', vestCol: 0x1d1f22, helmCol: 0x26292d, sig: ['hk416', 'mp5'] }),
  rpima: L('ce', 'none', { hat: 'beret', hatCol: 0x7a1f24, vestCol: 0x5c5e42, sig: ['scarl', 'm249'] }),
  gis: L('vegetato', 'police', { face: 'balaclava', faceCol: 0x262626, vest: 'plate', vestCol: 0x4a4c3a, helmCol: 0x2c2e2a, sig: ['hk416', 'g28'] }),
  nocs: L('black', 'police', { face: 'balaclava', faceCol: 0x1c1d1f, mask: 'gas', vest: 'police', vestCol: 0x1f2124, helmCol: 0x1c1d20, sig: ['mp5', 'glock17'] }),
  colmoschin: L('vegetato', 'mich', { vest: 'chest', vestCol: 0x5c5a40, helmCol: 'camo', face: 'goggles', sig: ['scarl', 'mg4'] }),
  geo: L('navy', 'mich', { mask: 'ball', maskCol: 0x232a3a, face: 'balaclava', faceCol: 0x1c2030, vest: 'police', vestCol: 0x1c2230, helmCol: 0x1a1f2c, sig: ['g36c', 'mp5'] }),
  kct: L('nfp', 'mich', { vestCol: 0x50573f, helmCol: 'camo', sig: ['c8a2', 'mg4'] }),
  sorbe: L('jigsaw', 'mich', { vest: 'chest', vestCol: 0x52563e, helmCol: 'camo', sig: ['scarl', 'p90'] }),
  grom: L('pantera', 'highcut', { nvg: true, vest: 'jpc', vestCol: 0x5a5d42, helmCol: 0x4e5240, sig: ['hk416', 'g28'] }),
  formoza: L('navy', 'highcut', { nvg: true, face: 'balaclava', faceCol: 0x1e2430, vest: 'jpc', vestCol: 0x232a36, helmCol: 0x202631, sig: ['hk416', 'mp7'] }),
  jagdkommando: L('alpine', 'mich', { face: 'goggles', vest: 'plate', vestCol: 0xa8aca8, helmCol: 0xc2c5c2, glove: 0x8a8e8a, boot: 0x3a3632, sig: ['aug', 'mg4'] }),
  cobra: L('black', 'police', { face: 'balaclava', faceCol: 0x1c1d1f, vest: 'heavy', vestCol: 0x23262a, helmCol: 0x2a2d31, visor: true, sig: ['aug', 'glock17'] }),
  czech601: L('woodland', 'mich', { face: 'balaclava', faceCol: 0x3a3f30, vest: 'chest', vestCol: 0x4e5338, helmCol: 'camo', sig: ['scarl', 'm249'] }),
  jaeger: L('m84', 'none', { hat: 'boonie', hatCol: 'camo', vest: 'chest', vestCol: 0x4d5538, sig: ['c8a2', 'sr25'] }),
  mjk: L('multicam', 'highcut', { nvg: true, face: 'balaclava', faceCol: 0x2a2c26, vest: 'jpc', vestCol: 0x4a4f3c, helmCol: 0x3e4334, sig: ['hk416', 'mp7'] }),
  sog: L('m90', 'highcut', { vest: 'plate', vestCol: 0x44513c, helmCol: 'camo', sig: ['hk416', 'awm'] }),
  utti: L('m05', 'mich', { face: 'balaclava', faceCol: 0x30362a, vest: 'chest', vestCol: 0x3e4632, helmCol: 'camo', sig: ['ak74m', 'awm'] }),
  alpha: L('partizan', 'altyn', { visor: true, vest: 'heavy', vestCol: 0x2a2c2a, helmCol: 0x3a3e36, face: 'balaclava', faceCol: 0x262826, sig: ['ak74m', 'saiga', 'mp443'] }),
  matkal: L('olive', 'mich', { vest: 'chest', vestCol: 0x4f5436, helmCol: 0x575c3c, sig: ['m4a1', 'vector'] }),
  flotilla13: L('black', 'highcut', { nvg: true, face: 'balaclava', faceCol: 0x1c1d1f, vest: 'jpc', vestCol: 0x26282a, helmCol: 0x222426, sig: ['m4a1', 'mp7'] }),
  smg707: L('granite', 'highcut', { nvg: true, face: 'goggles', vest: 'plate', vestCol: 0x2c3033, helmCol: 0x26292c, sig: ['hk416', 'mp7'] }),
  sfgj: L('jp2', 'mich', { vest: 'plate', vestCol: 0x4c5a3a, helmCol: 'camo', sig: ['hk416', 'mp5'] }),
  sdu: L('navy', 'police', { mask: 'gas', face: 'balaclava', faceCol: 0x1c2030, vest: 'police', vestCol: 0x232a38, helmCol: 0x202634, sig: ['mp5', 'hk416'] }),
  marcos: L('tiger', 'none', { face: 'balaclava', faceCol: 0x2a2c24, hat: 'beanie', hatCol: 0x2a2c24, vest: 'chest', vestCol: 0x3a4230, sig: ['ak74m', 'mp5'] }),
  parasf: L('ind', 'none', { hat: 'beret', hatCol: 0x6b1e2a, vest: 'chest', vestCol: 0x575a3e, sig: ['ak74m', 'pkp'] }),
};
export const DEFAULT_LOOK = UNIT_LOOKS.rangers;
export const lookForUnit = (id) => UNIT_LOOKS[id] || DEFAULT_LOOK;
// Opposing forces and civilians (picked per spawn for variety)
export const ENEMY_LOOKS = [
  L('olive', 'none', { hat: 'beanie', hatCol: 0x2a2a28, face: 'balaclava', faceCol: 0x222220, vest: 'chest', vestCol: 0x3e3a30, pants: 'khaki', glove: 0x2a2a28 }),
  L('khaki', 'none', { face: 'shemagh', faceCol: 0x8a7e66, vest: 'chest', vestCol: 0x5a4c3a, pants: 'olive', glove: null }),
  L('black', 'none', { face: 'balaclava', faceCol: 0x1c1c1c, vest: 'plate', vestCol: 0x2a2a2a, pants: 'denim', glove: 0x1a1a1a }),
  L('woodland', 'mich', { helmCol: 0x3f4632, vest: 'chest', vestCol: 0x3e4432, glove: null }),
  L('grey', 'none', { hat: 'cap', hatCol: 0x2c2f33, face: 'shades', vest: 'none', pants: 'black', glove: null }),
];
const CIV_TOPS = ['khaki', 'grey', 'denim', 'slate', 'white', 'coyote'];
export function civLook(i, vip) { return vip ? L('black', 'none', { vest: 'suit', vestCol: 0x23272e, pants: 'black', glove: null, boot: 0x1a1816, hair: 0x8a8a8a }) : L(CIV_TOPS[i % CIV_TOPS.length], 'none', { vest: 'none', pants: ['denim', 'black', 'khaki'][i % 3], glove: null, boot: [0x3a2c22, 0x1c1c1c, 0x6a6a6a][i % 3], hair: [0x2b1d14, 0x5a3a20, 0x111111, 0x8a6a3a][i % 4] }); }
// ===== textures =====
const cache = {};
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s ^= s >>> 16) >>> 0) / 4294967296); }
const hx = (c) => '#' + c.toString(16).padStart(6, '0');
function hash(str) { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
// tileable camo canvas (draws wrapped copies so edges tile)
export function camoCanvas(id, N = 256) {
  const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); const C = CAMOS[id] || CAMOS.multicam; const r = rng(hash(id));
  x.fillStyle = hx(C.base); x.fillRect(0, 0, N, N); const S = C.size || 1;
  const wrap = (fn) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { x.save(); x.translate(ox, oy); fn(); x.restore(); } };
  if (C.type === 'blobs') C.cols.forEach((col, ci) => { const n = Math.round(14 / S); for (let i = 0; i < n; i++) { const cx = r() * N, cy = r() * N, rad = (10 + r() * 22) * S * (ci === C.cols.length - 1 ? 0.6 : 1); const pts = []; const k = 9; for (let j = 0; j < k; j++) { const a = j / k * 6.283, rr = rad * (0.55 + r() * 0.7); pts.push([cx + Math.cos(a) * rr * 1.5, cy + Math.sin(a) * rr]); } x.fillStyle = hx(col); wrap(() => { x.beginPath(); x.moveTo((pts[0][0] + pts[k - 1][0]) / 2, (pts[0][1] + pts[k - 1][1]) / 2); for (let j = 0; j < k; j++) { const p = pts[j], q = pts[(j + 1) % k]; x.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } x.fill(); }); } });
  else if (C.type === 'dots') C.cols.forEach((col) => { x.fillStyle = hx(col); for (let i = 0; i < 90; i++) { const cx = r() * N, cy = r() * N; for (let j = 0; j < 4; j++) { const px = cx + (r() - 0.5) * 18 * S, py = cy + (r() - 0.5) * 18 * S, rad = (2 + r() * 4) * S; wrap(() => { x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill(); }); } } });
  else if (C.type === 'digital') { const px = Math.round(6 * S); C.cols.forEach((col) => { x.fillStyle = hx(col); for (let i = 0; i < 26; i++) { let cx = r() * N, cy = r() * N; for (let j = 0; j < 28; j++) { cx += (r() - 0.5) * px * 3; cy += (r() - 0.5) * px * 2; const gx = Math.floor(cx / px) * px, gy = Math.floor(cy / px) * px; wrap(() => x.fillRect(gx, gy, px * (1 + (r() * 2 | 0)), px)); } } }); }
  else if (C.type === 'stripes' || C.type === 'tiger') C.cols.forEach((col, ci) => { x.fillStyle = hx(col); for (let i = 0; i < (C.type === 'tiger' ? 18 : 40); i++) { const cx = r() * N, cy = r() * N, w = C.type === 'tiger' ? 60 + r() * 80 : 10 + r() * 20, h = C.type === 'tiger' ? 5 + r() * 8 : 3 + r() * 4; const ang = C.type === 'tiger' ? (r() - 0.5) * 0.5 : Math.PI / 2 + (r() - 0.5) * 0.3; wrap(() => { x.save(); x.translate(cx, cy); x.rotate(ang); x.beginPath(); x.ellipse(0, 0, w / 2, h, 0, 0, 7); x.fill(); x.restore(); }); } });
  else if (C.type === 'splinter') C.cols.forEach((col) => { x.fillStyle = hx(col); for (let i = 0; i < Math.round(16 / S); i++) { const cx = r() * N, cy = r() * N, rad = (10 + r() * 20) * S; const k = 3 + (r() * 3 | 0); const pts = []; for (let j = 0; j < k; j++) { const a = j / k * 6.283 + r() * 0.6; pts.push([cx + Math.cos(a) * rad * (0.6 + r()), cy + Math.sin(a) * rad * (0.6 + r())]); } wrap(() => { x.beginPath(); x.moveTo(...pts[0]); for (const p of pts) x.lineTo(...p); x.fill(); }); } });
  // fabric weave + grime
  const d = x.getImageData(0, 0, N, N), a = d.data; for (let i = 0; i < a.length; i += 4) { const px = (i / 4) % N, py = (i / 4 / N) | 0; const f = 1 + ((px + py) % 2 ? 0.035 : -0.035) + (r() - 0.5) * 0.06; a[i] *= f; a[i + 1] *= f; a[i + 2] *= f; } x.putImageData(d, 0, 0);
  return c;
}
export function camoTex(id) { const key = 'camo' + id; if (cache[key]) return cache[key]; const t = new THREE.CanvasTexture(camoCanvas(id)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return cache[key] = t; }
export function camoCSS(id) { const C = CAMOS[id] || CAMOS.multicam; const cols = [C.base, ...(C.cols || [])].map(hx); return cols.length < 2 ? cols[0] : `linear-gradient(135deg,${cols.map((c, i) => `${c} ${i * 100 / cols.length}% ${(i + 1) * 100 / cols.length}%`).join(',')})`; }
export function flagCanvas(country, W = 96, H = 64, subdued = false) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const F = FLAGS[country] || { h: ['#888', '#666'] };
  const bands = (cols, vert) => cols.forEach((col, i) => { x.fillStyle = col; if (vert) x.fillRect(i * W / cols.length, 0, W / cols.length + 1, H); else x.fillRect(0, i * H / cols.length, W, H / cols.length + 1); });
  const cross = (col, w, cx = W / 2, cy = H / 2) => { x.fillStyle = col; x.fillRect(cx - w / 2, 0, w, H); x.fillRect(0, cy - w / 2, W, w); };
  const disc = (col, rr, cx = W / 2, cy = H / 2) => { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill(); };
  const star = (cx, cy, R, col) => { x.fillStyle = col; x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.45 : R; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); };
  const ukCanton = (w, h) => { x.save(); x.beginPath(); x.rect(0, 0, w, h); x.clip(); x.fillStyle = '#012169'; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = h / 5; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, h); x.moveTo(w, 0); x.lineTo(0, h); x.stroke(); x.strokeStyle = '#c8102e'; x.lineWidth = h / 12; x.stroke(); x.fillStyle = '#fff'; x.fillRect(w / 2 - h / 6, 0, h / 3, h); x.fillRect(0, h / 3, w, h / 3); x.fillStyle = '#c8102e'; x.fillRect(w / 2 - h / 10, 0, h / 5, h); x.fillRect(0, h * 0.4, w, h / 5); x.restore(); };
  if (F.h) bands(F.h); else if (F.v) bands(F.v, true);
  else switch (F.k) {
    case 'usa': bands(['#b22234', '#fff', '#b22234', '#fff', '#b22234', '#fff', '#b22234']); x.fillStyle = '#3c3b6e'; x.fillRect(0, 0, W * 0.42, H * 4 / 7); x.fillStyle = '#fff'; for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) x.fillRect(4 + j * W * 0.08, 4 + i * H * 0.13, 3, 3); break;
    case 'uk': ukCanton(W, H); break;
    case 'canada': bands(['#d80621', '#fff', '#fff', '#d80621'], true); x.fillStyle = '#d80621'; x.beginPath(); x.moveTo(W / 2, H * 0.18); x.lineTo(W * 0.6, H * 0.45); x.lineTo(W * 0.66, H * 0.38); x.lineTo(W * 0.62, H * 0.68); x.lineTo(W * 0.52, H * 0.66); x.lineTo(W * 0.52, H * 0.82); x.lineTo(W * 0.48, H * 0.82); x.lineTo(W * 0.48, H * 0.66); x.lineTo(W * 0.38, H * 0.68); x.lineTo(W * 0.34, H * 0.38); x.lineTo(W * 0.4, H * 0.45); x.fill(); break;
    case 'aus': case 'nz': x.fillStyle = '#012169'; x.fillRect(0, 0, W, H); ukCanton(W / 2, H / 2); for (const [sx, sy] of [[0.75, 0.25], [0.68, 0.5], [0.82, 0.45], [0.75, 0.8]]) star(W * sx, H * sy, H * 0.07, F.k === 'nz' ? '#c8102e' : '#fff'); if (F.k === 'aus') star(W * 0.25, H * 0.75, H * 0.12, '#fff'); break;
    case 'czech': bands(['#fff', '#d7141a']); x.fillStyle = '#11457e'; x.beginPath(); x.moveTo(0, 0); x.lineTo(W / 2, H / 2); x.lineTo(0, H); x.fill(); break;
    case 'nordic': x.fillStyle = F.bg; x.fillRect(0, 0, W, H); cross(F.c, H * 0.2, W * 0.36); if (F.c2) cross(F.c2, H * 0.1, W * 0.36); break;
    case 'israel': x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = '#0038b8'; x.fillRect(0, H * 0.1, W, H * 0.13); x.fillRect(0, H * 0.77, W, H * 0.13); x.strokeStyle = '#0038b8'; x.lineWidth = 3; for (const s of [1, -1]) { x.beginPath(); for (let i = 0; i < 3; i++) { const a = s * Math.PI / 2 + i * 2.094; x.lineTo(W / 2 + Math.cos(a) * H * 0.18, H / 2 - Math.sin(a) * H * 0.18); } x.closePath(); x.stroke(); } break;
    case 'korea': x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); disc('#cd2e3a', H * 0.22); x.fillStyle = '#0047a0'; x.beginPath(); x.arc(W / 2, H / 2, H * 0.22, 0, Math.PI); x.fill(); x.fillStyle = '#111'; for (const [sx, sy] of [[0.2, 0.25], [0.8, 0.25], [0.2, 0.75], [0.8, 0.75]]) x.fillRect(W * sx - 6, H * sy - 5, 12, 10); break;
    case 'japan': x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); disc('#bc002d', H * 0.3); break;
    case 'hk': x.fillStyle = '#de2910'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const a = i * 1.2566 - Math.PI / 2; x.beginPath(); x.ellipse(W / 2 + Math.cos(a) * H * 0.14, H / 2 + Math.sin(a) * H * 0.14, H * 0.13, H * 0.06, a, 0, 7); x.fill(); } break;
    case 'india': bands(['#ff9933', '#fff', '#138808']); x.strokeStyle = '#000080'; x.lineWidth = 2; x.beginPath(); x.arc(W / 2, H / 2, H * 0.12, 0, 7); x.stroke(); break;
  }
  if (subdued) { const d = x.getImageData(0, 0, W, H), a = d.data; for (let i = 0; i < a.length; i += 4) { const l = (a[i] + a[i + 1] + a[i + 2]) / 3; for (let k = 0; k < 3; k++) a[i + k] = a[i + k] * 0.55 + l * 0.25; } x.putImageData(d, 0, 0); }
  x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 4; x.strokeRect(0, 0, W, H); return c;
}
export function flagURL(country) { const key = 'flagurl' + country; return cache[key] || (cache[key] = flagCanvas(country, 48, 32).toDataURL()); }
// one atlas holding every flag (8 x 4 cells) so one material serves all soldiers
export const FLAG_IDS = Object.keys(FLAGS);
export function flagAtlas() { if (cache.atlas) return cache.atlas; const W = 96, H = 64, c = document.createElement('canvas'); c.width = W * 8; c.height = H * 4; const x = c.getContext('2d'); FLAG_IDS.forEach((k, i) => x.drawImage(flagCanvas(k, W, H, true), (i % 8) * W, ((i / 8) | 0) * H)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return cache.atlas = t; }
export const flagCell = (country) => { const i = Math.max(0, FLAG_IDS.indexOf(country)); return [(i % 8) / 8, 1 - (((i / 8) | 0) + 1) / 4, 1 / 8, 1 / 4]; };
