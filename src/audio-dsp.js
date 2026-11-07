// w4: pure buffer synthesis for Zulu Protocol audio. Every fill function gets (d, sr, h): d = Float32Array to write into,
// sr = sample rate, h = { rn, lp, hp, coef } (the seeded noise + one-pole filters from audio.js). No audio files, no licences.
const TAU = Math.PI * 2;
const hpc = (h, f, sr) => h.hp(1 - h.coef(f, sr));
const r01 = (h) => (h.rn() + 1) / 2;
// filtered noise burst: window starting at t0 (s), `dur` long, band hpHz..lpHz, exponential decay tau
function nburst(d, sr, h, t0, dur, lpHz, hpHz, amp, tau) { const l = h.lp(h.coef(lpHz, sr)), p = hpc(h, hpHz, sr), s0 = Math.floor(t0 * sr), n = Math.floor(dur * sr); for (let i = 0; i < n && s0 + i < d.length; i++) d[s0 + i] += l(p(h.rn())) * amp * Math.exp(-(i / sr) / tau); }
// pitched thump that drops from f0 to f1
function thump(d, sr, f0, f1, tau, amp, t0 = 0) { let ph = 0; const s0 = Math.floor(t0 * sr); for (let i = s0; i < d.length; i++) { const t = (i - s0) / sr; if (t > tau * 7) break; ph += TAU * (f1 + (f0 - f1) * Math.exp(-t / 0.015)) / sr; d[i] += Math.sin(ph) * amp * Math.exp(-t / tau); } }
// ringing tone (metal / glass / brass)
function ring(d, sr, f, amp, tau, t0 = 0, glide = 0) { const s0 = Math.floor(t0 * sr); let ph = 0; for (let i = s0; i < d.length; i++) { const t = (i - s0) / sr; if (t > tau * 7) break; ph += TAU * f * (1 + glide * Math.exp(-t / 0.03)) / sr; d[i] += Math.sin(ph) * amp * Math.exp(-t / tau); } }

// ---------- footsteps: one fill per surface, k = 0..3 variant (left/right foot, heel/toe) ----------
export const SURFACES = ['concrete', 'tile', 'wood', 'carpet', 'grate', 'gravel', 'snow', 'dirt'];
export const STEP_GAIN = { concrete: 0.9, tile: 1, wood: 0.85, carpet: 0.5, grate: 1.1, gravel: 0.85, snow: 0.7, dirt: 0.7 };
export function stepFill(surface, k) {
  return (d, sr, h) => {
    const j = 1 + k * 0.07;
    switch (surface) {
      case 'tile': nburst(d, sr, h, 0, 0.04, 5200 * j, 900, 1.5, 0.004); ring(d, sr, 2300 * j, 0.3, 0.02); thump(d, sr, 110, 70, 0.025, 0.45); nburst(d, sr, h, 0.02, 0.11, 3500, 1000, 0.25, 0.03); break;
      case 'wood': thump(d, sr, 150 * j, 90, 0.04, 0.9); nburst(d, sr, h, 0, 0.05, 1500, 300, 0.9, 0.01); ring(d, sr, 300 * j, 0.25, 0.05); if (k === 3) { let ph = 0; const s0 = Math.floor(0.02 * sr); for (let i = 0; i < 0.14 * sr; i++) { const t = i / sr; ph += TAU * (380 + 1100 * t) / sr; d[s0 + i] += (((ph / Math.PI) % 2) - 1) * 0.16 * Math.sin(Math.PI * t / 0.14); } } break; // k=3: a board creaks
      case 'carpet': nburst(d, sr, h, 0, 0.1, 380 * j, 60, 1.4, 0.03); thump(d, sr, 72, 50, 0.04, 0.5); break;
      case 'grate': nburst(d, sr, h, 0, 0.03, 4200, 1200, 1, 0.003); ring(d, sr, 1180 * j, 0.35, 0.045); ring(d, sr, 1760 * j, 0.25, 0.04); ring(d, sr, 2930 * j, 0.15, 0.03); thump(d, sr, 120, 80, 0.02, 0.4); break;
      case 'gravel': for (let g = 0, n = 8 + k; g < n; g++) nburst(d, sr, h, 0.004 + r01(h) * 0.12, 0.02, 4500, 1800, 0.25 + r01(h) * 0.35, 0.006); thump(d, sr, 85, 55, 0.03, 0.5); break;
      case 'snow': for (let g = 0, n = 9; g < n; g++) nburst(d, sr, h, r01(h) * 0.13, 0.035, 2200, 500, 0.15 + r01(h) * 0.25, 0.012); { const s0 = Math.floor(0.02 * sr); let ph = 0; for (let i = 0; i < 0.06 * sr; i++) { const t = i / sr; ph += TAU * (2600 - 300 * t / 0.06) / sr; d[s0 + i] += Math.sin(ph) * 0.07 * Math.sin(Math.PI * t / 0.06); } } thump(d, sr, 70, 50, 0.05, 0.35); break;
      case 'dirt': nburst(d, sr, h, 0, 0.1, 900, 100, 1, 0.03); for (let g = 0; g < 3; g++) nburst(d, sr, h, 0.01 + r01(h) * 0.07, 0.02, 2500, 800, 0.25, 0.008); thump(d, sr, 80, 55, 0.035, 0.55); break;
      default: nburst(d, sr, h, 0, 0.05, 2800 + k * 250, 500, 1.6, 0.006); thump(d, sr, 95 + k * 8, 60, 0.03, 0.7); nburst(d, sr, h, 0.03, 0.08, 1800, 200, 0.5, 0.025); // concrete
    }
  };
}

// ---------- doors ----------
export function creakFill(kind) { // hinge creak: a saw tone dragged through stick-slip, band-passed. 'metal' squeals higher and rings
  return (d, sr, h) => {
    const metal = kind === 'metal', base = metal ? 430 : 150, l = h.lp(h.coef(metal ? 3200 : 1500, sr)), p = hpc(h, metal ? 400 : 160, sr); let ph = 0;
    const j1 = 5 + r01(h) * 3, j2 = 13 + r01(h) * 6;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr, x = t / (d.length / sr), f = base * (1 + 0.55 * x + 0.12 * Math.sin(TAU * j1 * t) + 0.07 * Math.sin(TAU * j2 * t));
      ph += TAU * f / sr; const saw = ((ph / Math.PI) % 2) - 1, sq = Math.sin(TAU * (9 + 5 * x) * t) > 0.2 ? 1 : 0.35; // stick-slip gate
      d[i] = l(p(saw * sq + h.rn() * 0.12)) * Math.sin(Math.PI * Math.min(1, x * 1.05)) ** 1.3;
    }
    if (metal) { ring(d, sr, 1250, 0.12, 0.25, 0.1); ring(d, sr, 2150, 0.07, 0.2, 0.1); }
  };
}
export const latchFill = () => (d, sr, h) => { nburst(d, sr, h, 0, 0.012, 5000, 1500, 1, 0.003); ring(d, sr, 2200, 0.4, 0.006); thump(d, sr, 190, 120, 0.03, 0.5); nburst(d, sr, h, 0.075, 0.015, 3800, 900, 1.1, 0.004); ring(d, sr, 1500, 0.5, 0.01, 0.075); thump(d, sr, 150, 90, 0.03, 0.6, 0.075); };
export const slamFill = () => (d, sr, h) => { thump(d, sr, 95, 45, 0.12, 1.2); nburst(d, sr, h, 0, 0.15, 900, 80, 1.6, 0.05); nburst(d, sr, h, 0.01, 0.08, 4000, 1500, 0.5, 0.01); for (const t of [0.14, 0.2, 0.27]) nburst(d, sr, h, t, 0.02, 3000, 1000, 0.25, 0.006); };
export const splinterFill = () => (d, sr, h) => { nburst(d, sr, h, 0, 0.08, 3200, 300, 1.6, 0.03); thump(d, sr, 140, 60, 0.06, 0.8); for (let i = 0; i < 6; i++) ring(d, sr, 600 + r01(h) * 1100, 0.3, 0.012, 0.02 + r01(h) * 0.22, 0.2); for (let i = 0; i < 14; i++) nburst(d, sr, h, 0.1 + r01(h) * 0.5, 0.015, 5000, 2000, 0.25 * (1 - i / 18), 0.006); };
export const rubbleFill = () => (d, sr, h) => { thump(d, sr, 70, 40, 0.15, 0.8, 0.02); for (let i = 0; i < 18; i++) nburst(d, sr, h, 0.05 + r01(h) * 0.9, 0.03, 1800 + r01(h) * 2500, 300, 0.4 * (1 - i / 24), 0.01); };

// ---------- weapon extras ----------
export const casingFill = (kind) => (d, sr, h) => { const f = { rifle: 3600, pistol: 4300, shell: 1700, big: 2900 }[kind] || 3600; let a = 1, t = 0, gap = 0.1; for (let b = 0; b < 4; b++) { ring(d, sr, f * (1 + (r01(h) - 0.5) * 0.08), a * 0.6, kind === 'shell' ? 0.012 : 0.02, t); ring(d, sr, f * 1.43, a * 0.3, 0.012, t); nburst(d, sr, h, t, 0.006, 6000, 2500, a * 0.5, 0.002); t += gap; gap *= 0.62; a *= 0.55; } };
export const whizFill = () => (d, sr, h) => { let y1 = 0, y2 = 0; const dur = d.length / sr; for (let i = 0; i < d.length; i++) { const t = i / sr, x = t / dur, f = 5200 - 3800 * x, n = h.rn(); y1 += h.coef(f * 1.5, sr) * (n - y1); y2 += h.coef(f * 0.6, sr) * (n - y2); d[i] = (y1 - y2) * Math.sin(Math.PI * x) ** 2; } };
export const ricochetFill = () => (d, sr, h) => { nburst(d, sr, h, 0, 0.02, 6000, 2000, 1, 0.004); ring(d, sr, 2800, 0.5, 0.09, 0.005, 0.6); ring(d, sr, 1900, 0.3, 0.14, 0.012, 0.8); };
export const hitFill = (kind) => (d, sr, h) => { if (kind === 'wall') { nburst(d, sr, h, 0, 0.05, 3500, 400, 1, 0.012); thump(d, sr, 160, 90, 0.04, 0.6); } else { thump(d, sr, 130, 55, 0.05, 1); nburst(d, sr, h, 0, 0.06, 800, 100, 1.1, 0.02); nburst(d, sr, h, 0, 0.01, 2500, 700, 0.35, 0.004); } };

// ---------- radio ----------
export const staticFill = () => (d, sr, h) => { const l = h.lp(h.coef(3600, sr)), p = hpc(h, 600, sr); let pop = 0; for (let i = 0; i < d.length; i++) { if (Math.random() < 0.0007) pop = 0.8; pop *= 0.985; d[i] = l(p(h.rn())) * (0.55 + 0.45 * Math.sin(i / sr * 23)) + h.rn() * pop; } };
export const courtesyFill = () => (d, sr, h) => { ring(d, sr, 1500, 0.8, 0.03); ring(d, sr, 1100, 0.7, 0.03, 0.07); nburst(d, sr, h, 0, 0.14, 4500, 600, 0.12, 0.05); };
