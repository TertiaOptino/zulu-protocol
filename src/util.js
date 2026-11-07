export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export let rand = Math.random;
export function setSeed(s) { rand = mulberry32(s); }
export const rnd = (a, b) => a + (b - a) * rand();
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];
export function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export function angNorm(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
export function turnToward(cur, target, maxStep) { const d = angNorm(target - cur); if (Math.abs(d) <= maxStep) return target; return cur + Math.sign(d) * maxStep; }
// facing angle convention: forward vector = (sin a, cos a) in (x,z)
export const angTo = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);
export function distPointSeg(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az; const L = dx * dx + dz * dz; let t = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0; t = clamp(t, 0, 1); return Math.hypot(px - (ax + t * dx), pz - (az + t * dz)); }
export function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
export function fmtTime(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
