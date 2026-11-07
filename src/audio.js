// Web Audio for Zulu Protocol: no audio files. Everything is synthesised once into small buffers (cheap to play on phones)
// and routed through three buses (music / sfx / voice) under a master gain with a soft compressor.
import { SURFACES, STEP_GAIN, stepFill, creakFill, latchFill, slamFill, splinterFill, rubbleFill, casingFill, whizFill, ricochetFill, hitFill, staticFill, courtesyFill } from './audio-dsp.js'; // w4
import { createAmbience, tuneTheme, ambFor, GROUND } from './audio-amb.js'; // w4
let ctx = null, master = null, bus = null, comp = null, noiseBuf = null;
const mix = { master: 0.8, music: 0.55, sfx: 0.9, voice: 0.85, muted: false };
const cache = new Map(); // synthesised buffers by key
const AC = () => window.AudioContext || window.webkitAudioContext;

// ---------- unlock: iOS / Android only start audio from inside a user gesture ----------
let unlocked = false, speechPrimed = false;
function unlock() {
  if (!ctx) return;
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  if (!unlocked) { try { const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); unlocked = true; } catch (e) { /* ignore */ } }
  // iOS 17+: play through the silent switch like a game (otherwise the ringer switch mutes WebAudio)
  try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
  // iOS / Android Chrome: speech must be started once from a gesture, a silent utterance does it
  if (!speechPrimed && window.speechSynthesis && window.SpeechSynthesisUtterance) { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); speechPrimed = true; } catch (e) { /* ignore */ } }
}
export function initAudio() {
  if (ctx && ctx.state === 'closed') ctx = null;
  if (ctx) { unlock(); if (music.want && !music.out) music.restart(); amb.resume(); return; }
  try {
    const C = AC(); if (!C) return; ctx = new C({ latencyHint: 'interactive' });
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain(); master.connect(comp); comp.connect(ctx.destination);
    bus = { music: ctx.createGain(), sfx: ctx.createGain(), voice: ctx.createGain() }; for (const k in bus) bus[k].connect(master); bus.amb = ctx.createGain(); bus.amb.gain.value = 0.55; bus.amb.connect(bus.sfx); /* w4: ambience rides the effects slider */
    applyGain();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    unlock();
    // iOS 'interrupted' (call, Siri) and backgrounding: resume on return, pause when hidden to save battery
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); });
    ctx.onstatechange = () => { if (ctx && ctx.state === 'running' && music.want) music.kick(); };
    if (music.want) music.restart(); amb.resume(); // w4
  } catch (e) { ctx = null; }
}
export function audioState() { return ctx ? ctx.state : 'none'; }

// ---------- mixing ----------
const curve = (x) => x * Math.sqrt(x); // w4: slider position -> gain, ears hear loudness on a curve so the low half of a slider isn't all the same
function applyGain() {
  if (!master) return; const t = ctx.currentTime;
  master.gain.setTargetAtTime(mix.muted ? 0 : 0.72 * curve(mix.master), t, 0.02);
  bus.music.gain.setTargetAtTime(0.6 * curve(mix.music), t, 0.05); bus.sfx.gain.setTargetAtTime(curve(mix.sfx), t, 0.02); bus.voice.gain.setTargetAtTime(curve(mix.voice), t, 0.02);
  if (mix.muted || mix.voice <= 0) try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* ignore */ }
}
export function setMix(o) { for (const k of ['master', 'music', 'sfx', 'voice']) if (o[k] != null) mix[k] = Math.max(0, Math.min(1, +o[k])); if (o.muted != null) mix.muted = !!o.muted; applyGain(); }
export const audioMix = (st) => ({ master: st.volume ?? 0.8, music: st.music ?? 0.55, sfx: st.sfx ?? 0.9, voice: st.voice ?? 0.85, muted: !st.sound });
export function getMix() { return { ...mix }; }
export function setMuted(m) { setMix({ muted: m }); }
export function setVolume(v) { setMix({ master: v }); }
const live = () => ctx && !mix.muted && ctx.state === 'running';

// ---------- buffer synthesis helpers ----------
let seed = 1; const rn = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
function render(key, dur, fn) {
  let b = cache.get(key); if (b) return b; const sr = ctx.sampleRate, n = Math.ceil(dur * sr); b = ctx.createBuffer(1, n, sr); const d = b.getChannelData(0);
  seed = 1 + (Array.from(key).reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 100000); fn(d, sr, H); // w4: H = shared noise + filter helpers for audio-dsp.js
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i])); if (pk > 0) { const g = 0.95 / pk; for (let i = 0; i < n; i++) d[i] *= g; }
  const f = Math.floor(0.004 * sr); for (let i = 0; i < f; i++) d[n - 1 - i] *= i / f; // no click at the end
  cache.set(key, b); return b;
}
// one-pole filters on the fly
const lp = (a) => { let y = 0; return (x) => (y += a * (x - y)); };
const hp = (a) => { let y = 0, px = 0; return (x) => { y = a * (y + x - px); px = x; return y; }; };
const coef = (f, sr) => 1 - Math.exp(-2 * Math.PI * f / sr);
const H = { rn, lp, hp, coef }; // w4
function play(buf, { vol = 1, rate = 1, at = 0, to = 'sfx', pan = 0, lpf = 0 } = {}) {
  if (!live() || !buf) return null; const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate; const g = ctx.createGain(); g.gain.value = vol;
  let out = g; if (lpf) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lpf; g.connect(f); out = f; } // w4: distant sounds are darker
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); out.connect(p); out = p; }
  s.connect(g); out.connect(bus[to]); s.start(ctx.currentTime + at); return s;
}
function burst(dur, freq, vol, q = 1, type = 'lowpass', to = 'sfx', at = 0) { if (!live()) return; const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); const t = ctx.currentTime + at; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f); f.connect(g); g.connect(bus[to]); s.start(t, Math.random() * 0.5, dur + 0.05); }
function tone(f0, f1, dur, vol, type = 'sine', to = 'sfx', at = 0) { if (!live()) return; const o = ctx.createOscillator(); o.type = type; const g = ctx.createGain(); const t = ctx.currentTime + at; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(bus[to]); o.start(t); o.stop(t + dur + 0.02); }

// ---------- guns: one voice per weapon ----------
// crack = supersonic snap brightness, body = chamber thump pitch, boom = low-end weight, tail = room echo length, mech = action sound after the shot
const TYPE = {
  pistol: { crack: 3600, body: 240, boom: 0.5, tail: 0.28, snap: 0.9 },
  smg: { crack: 3000, body: 200, boom: 0.6, tail: 0.32, snap: 0.8 },
  rifle: { crack: 2500, body: 150, boom: 0.85, tail: 0.5, snap: 1 },
  dmr: { crack: 2100, body: 115, boom: 1.0, tail: 0.75, snap: 1.1 },
  sniper: { crack: 1900, body: 90, boom: 1.2, tail: 1.0, snap: 1.2, mech: 'bolt' },
  shotgun: { crack: 1300, body: 85, boom: 1.25, tail: 0.7, snap: 0.6, mech: 'pump' },
  lmg: { crack: 2300, body: 125, boom: 1.0, tail: 0.6, snap: 1 },
};
const ID = { // per-weapon character on top of its type
  m4a1: {}, hk416: { body: 140, crack: 2350 }, c8a2: { crack: 2700, body: 142, boom: 0.9, tail: 0.56, snap: 1.05 }, ak74m: { body: 125, crack: 2150, boom: 0.95 }, g36c: { crack: 2850, body: 168, tail: 0.42, snap: 0.92 }, scarl: { body: 130, boom: 0.95 }, aug: { crack: 2600, body: 158, tail: 0.45 },
  mp5: { crack: 3300, body: 230, boom: 0.5 }, mp7: { crack: 4000, body: 260, boom: 0.4, snap: 1 }, ump45: { crack: 2400, body: 175, boom: 0.75 }, vector: { crack: 2600, body: 185, boom: 0.65 }, p90: { crack: 4200, body: 270, boom: 0.42, snap: 1 },
  m870: { mech: 'pump' }, m1014: { mech: null, body: 95 }, saiga: { mech: null, body: 92, crack: 1500 }, aa12: { mech: null, body: 100, crack: 1600, tail: 0.55 },
  sr25: {}, mk14: { body: 105, boom: 1.1 }, g28: { body: 110 }, svd: { body: 100, crack: 1900, boom: 1.1 }, pkp: { type: 'lmg', body: 115, mech: 'belt' },
  awm: { type: 'sniper', mech: 'bolt' }, l96: { type: 'sniper', mech: 'bolt' }, m24: { type: 'sniper', mech: 'bolt' }, barrett: { type: 'sniper', body: 70, boom: 1.4, tail: 1.2, mech: null },
  m249: { type: 'lmg', body: 120, crack: 2250, boom: 1.05, mech: 'belt' }, mg4: { type: 'lmg', body: 138, crack: 2500, boom: 0.92, tail: 0.5, mech: 'belt' }, // w4: these four had no voice of their own
  glock17: { type: 'pistol', crack: 3850, body: 235 }, mp443: { type: 'pistol', body: 205, crack: 3250, boom: 0.62, tail: 0.3 },
  m9: { type: 'pistol' }, glock: { type: 'pistol', crack: 3800 }, usp: { type: 'pistol', body: 225 }, deagle: { type: 'pistol', body: 150, boom: 0.9, tail: 0.45 }, p226: { type: 'pistol' },
};
let WTYPE = {}; export function registerWeapons(list) { WTYPE = Object.fromEntries(list.map(w => [w.id, w.type])); }
function gunProfile(wid) { const o = ID[wid] || {}; const ty = o.type || WTYPE[wid] || (/pistol|glock|usp|m9|p226/.test(wid || '') ? 'pistol' : 'rifle'); return { ...(TYPE[ty] || TYPE.rifle), ...o, ty: TYPE[ty] ? ty : 'rifle' }; }
function shotBuf(wid, sup) {
  const P = gunProfile(wid); const key = 'shot:' + (wid || 'x') + (sup ? ':s' : ''); const dur = sup ? 0.35 : 0.25 + P.tail * 1.1 + (P.mech ? 0.9 : 0);
  return render(key, dur, (d, sr) => {
    const hC = hp(1 - coef(P.crack, sr) * 0.5), lC = lp(coef(P.crack * 1.6, sr)), lB = lp(coef(sup ? 700 : 1100, sr)), lT = lp(coef(sup ? 500 : 650, sr)), lT2 = lp(coef(280, sr));
    let ph = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr, n = rn();
      const crack = sup ? 0 : lC(hC(n)) * Math.exp(-t / 0.011) * 1.4 * P.snap;
      const f = P.body * (sup ? 0.8 : 1) * (1 + 1.6 * Math.exp(-t / 0.012)); ph += 2 * Math.PI * f / sr;
      const body = Math.sin(ph) * Math.exp(-t / (sup ? 0.035 : 0.05 + 0.03 * P.boom)) * (sup ? 0.6 : 0.9 * P.boom);
      const blast = lB(n) * Math.exp(-t / (sup ? 0.025 : 0.045)) * (sup ? 1.6 : 2.2);
      const tail = lT(lT2(n) * 3) * Math.exp(-t / (sup ? 0.06 : 0.12 + P.tail * 0.22)) * (sup ? 0.6 : 1.4);
      const tick = t < 0.0015 ? (sup ? 0.5 : 1) * (1 - t / 0.0015) * (i % 2 ? 1 : -1) : 0;
      d[i] = crack + body + blast + tail + tick + (sup ? Math.sin(2 * Math.PI * 2100 * t) * Math.exp(-t / 0.008) * 0.25 : 0);
    }
    // early reflections off walls: a couple of quieter, darker copies
    if (!sup) for (const [dl, g] of [[0.031, 0.22], [0.057, 0.15], [0.093, 0.09]]) { const o = Math.floor(dl * sr), lr = lp(coef(1200, sr)); for (let i = d.length - 1; i >= o; i--) d[i] += lr(d[i - o]) * g; }
    const mech = (t0, parts) => { for (const [dt, f, a, tau] of parts) { const s0 = Math.floor((t0 + dt) * sr), bh = hp(0.6); for (let i = 0; i < sr * 0.06 && s0 + i < d.length; i++) { const t = i / sr; d[s0 + i] += (bh(rn()) * 0.6 + Math.sin(2 * Math.PI * f * t)) * a * Math.exp(-t / tau); } } };
    if (P.mech === 'belt') mech(0.07, [[0, 2100, 0.1, 0.006], [0.045, 1700, 0.09, 0.007], [0.11, 2400, 0.08, 0.006]]); // w4: belt links rattling
    if (P.mech === 'pump') mech(0.38, [[0, 900, 0.18, 0.012], [0.05, 600, 0.16, 0.02], [0.2, 1100, 0.2, 0.01], [0.24, 700, 0.18, 0.018]]);
    if (P.mech === 'bolt') mech(0.6, [[0, 1500, 0.12, 0.01], [0.09, 1100, 0.13, 0.014], [0.3, 1300, 0.13, 0.012], [0.36, 900, 0.15, 0.016]]);
    if (sup) mech(0.015, [[0, 1800, 0.25, 0.008], [0.03, 1200, 0.2, 0.01]]);
  });
}
let lastShot = 0, shotsThisFrame = 0, lastCase = 0, lastImp = 0;
// w4: brass (or a shotgun hull) hitting the floor a moment after the shot
function casing(wid, vol, pan, now) { if (vol < 0.3 || now - lastCase < 0.09 || !live()) return; lastCase = now; const ty = gunProfile(wid).ty; const kind = ty === 'shotgun' ? 'shell' : ty === 'pistol' ? 'pistol' : (ty === 'sniper' || ty === 'lmg' || ty === 'dmr') ? 'big' : 'rifle'; play(B.casing(kind), { vol: 0.13 * vol, at: (ty === 'shotgun' ? 0.7 : 0.16) + Math.random() * 0.22, rate: 0.9 + Math.random() * 0.2, pan: pan + (Math.random() - 0.5) * 0.4, lpf: vol < 0.55 ? 3000 : 0 }); }
// w4: which surface / door material applies on this map
let place = null; const METAL_PLACES = ['oilrig', 'ship', 'subway', 'warehouse'];
const surfaceOf = (f) => SURFACES.includes(f) ? f : f === 'ground' ? (GROUND[place] || 'gravel') : f === 'metal' ? 'grate' : 'concrete';

// ---------- other sfx buffers ----------
const B = {
  kick: () => render('kick', 0.9, (d, sr) => { const l = lp(coef(400, sr)), l2 = lp(coef(2500, sr)); let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; ph += 2 * Math.PI * (70 + 80 * Math.exp(-t / 0.03)) / sr; const crunch = t > 0.012 ? l2(rn()) * Math.exp(-(t - 0.012) / 0.06) * (0.6 + 0.4 * Math.sin(t * 900)) : 0; const slam = t > 0.18 ? l(rn()) * 2.5 * Math.exp(-(t - 0.18) / 0.09) + Math.sin(2 * Math.PI * 95 * t) * Math.exp(-(t - 0.18) / 0.08) * 0.5 : 0; d[i] = Math.sin(ph) * Math.exp(-t / 0.07) + l(rn()) * 2 * Math.exp(-t / 0.04) + crunch + slam; } }),
  door: () => render('door', 0.7, (d, sr) => { const b = lp(coef(900, sr)); let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; const f = 180 + 70 * Math.sin(t * 9) + 40 * Math.sin(t * 31); ph += 2 * Math.PI * f / sr; const saw = ((ph / Math.PI) % 2) - 1; const env = Math.min(1, t / 0.05) * Math.exp(-t / 0.25); d[i] = b(saw * 0.6 + rn() * 0.2) * env + (t < 0.03 ? rn() * 0.3 * (1 - t / 0.03) : 0); } }),
  boom: () => render('boom', 2.6, (d, sr) => { const l = lp(coef(180, sr)), l2 = lp(coef(900, sr)), h = hp(0.97); let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr, n = rn(); ph += 2 * Math.PI * (38 + 60 * Math.exp(-t / 0.08)) / sr; d[i] = Math.sin(ph) * Math.exp(-t / 0.35) * 1.3 + l(n) * 4 * Math.exp(-t / 0.5) + l2(n) * Math.exp(-t / 0.12) * 1.2 + h(n) * 0.5 * Math.exp(-t / 0.05) + (t > 0.25 ? h(rn()) * 0.12 * Math.exp(-(t - 0.25) / 0.6) * (Math.random() < 0.02 ? 4 : 1) : 0); } }),
  flash: () => render('flash', 1.8, (d, sr) => { const h = hp(0.9), l = lp(coef(260, sr)); for (let i = 0; i < d.length; i++) { const t = i / sr, n = rn(); d[i] = h(n) * Math.exp(-t / 0.06) * 1.4 + l(n) * 2 * Math.exp(-t / 0.18) + Math.sin(2 * Math.PI * 3150 * t) * 0.12 * Math.exp(-t / 0.9); } }),
  step: (k) => render('step' + k, 0.16, (d, sr) => { const l = lp(coef(260 + k * 60, sr)), b = hp(0.5); for (let i = 0; i < d.length; i++) { const t = i / sr, n = rn(); d[i] = l(n) * 3 * Math.exp(-t / 0.025) + b(n) * 0.18 * Math.exp(-(Math.max(0, t - 0.03)) / 0.02) * (t > 0.03 ? 1 : 0) + Math.sin(2 * Math.PI * (80 + k * 6) * t) * 0.4 * Math.exp(-t / 0.02); } }),
  mag: () => render('mag', 1.2, (d, sr) => { const parts = [[0, 1300, 0.6, 0.01], [0.05, 500, 0.4, 0.03], [0.45, 900, 0.5, 0.012], [0.5, 1500, 0.7, 0.008], [0.85, 1900, 0.6, 0.007], [0.93, 1200, 0.7, 0.012]]; for (const [t0, f, a, tau] of parts) { const s0 = Math.floor(t0 * sr), h = hp(0.7); for (let i = 0; i < sr * 0.08 && s0 + i < d.length; i++) { const t = i / sr; d[s0 + i] += (h(rn()) * 0.7 + Math.sin(2 * Math.PI * f * t)) * a * Math.exp(-t / tau); } } }),
  stepS: (sf, k) => render('st:' + sf + k, 0.22, stepFill(sf, k)), // w4
  creak: (kind) => render('creak:' + kind, 0.95, creakFill(kind)), latch: () => render('latch', 0.2, latchFill()), slam: () => render('slam', 0.55, slamFill()), splinter: () => render('splinter', 0.75, splinterFill()), rubble: () => render('rubble', 1.1, rubbleFill()),
  casing: (kind) => render('case:' + kind, 0.6, casingFill(kind)), whiz: () => render('whiz', 0.2, whizFill()), ricochet: () => render('ricochet', 0.5, ricochetFill()), hitb: (kind) => render('hit:' + kind, 0.25, hitFill(kind)),
  static: () => render('static', 2.4, staticFill()), courtesy: () => render('courtesy', 0.2, courtesyFill()),
  smoke: () => render('smoke', 1.4, (d, sr, h) => { const l = h.lp(h.coef(7000, sr)), p = h.hp(0.5); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = l(p(h.rn())) * Math.min(1, t / 0.03) * Math.exp(-t / 0.5) + (t < 0.05 ? Math.sin(2 * Math.PI * 140 * t) * (1 - t / 0.05) : 0); } }),
  squelch: (on) => render('sq' + on, on ? 0.12 : 0.18, (d, sr) => { const b = hp(0.8), l = lp(coef(3500, sr)); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = l(b(rn())) * (on ? Math.exp(-t / 0.03) : Math.min(1, t / 0.02) * Math.exp(-t / 0.06)) * 1.2 + (on ? Math.sin(2 * Math.PI * 1250 * t) * 0.25 * (t < 0.06 ? 1 : 0) : 0); } }),
};
export const sfx = {
  // weapon shot: distinct per weapon id, suppressed variant, small pitch spread so autos don't machine-gun the same sample
  shot(suppressed, vol = 1, wid, pan = 0) { if (!live()) return; const n = ctx.currentTime; if (n - lastShot < 0.012) { if (++shotsThisFrame > 3) return; } else shotsThisFrame = 0; lastShot = n; play(shotBuf(wid || 'm4a1', suppressed), { vol: Math.min(1.4, vol) * (suppressed ? 0.6 : 0.85), rate: 0.96 + Math.random() * 0.08, pan, lpf: vol < 0.55 ? 1400 + vol * 8000 : 0 /* w4: far shots are darker */ }); casing(wid, vol, pan, n); },
  boom() { play(B.boom(), { vol: 1 }); },
  flash() { play(B.flash(), { vol: 0.9 }); },
  kick() { play(B.kick(), { vol: 0.95, rate: 0.95 + Math.random() * 0.1 }); },
  door() { const mt = METAL_PLACES.includes(place); play(B.creak(mt ? 'metal' : 'wood'), { vol: mt ? 0.2 : 0.3, rate: 0.85 + Math.random() * 0.3 }); play(B.latch(), { vol: 0.32, rate: 0.9 + Math.random() * 0.2 }); }, // w4: hinge creak + latch instead of one buzz
  smoke() { play(B.smoke(), { vol: 0.7 }); },
  whiz(pan = 0) { play(B.whiz(), { vol: 0.5, rate: 0.85 + Math.random() * 0.3, pan: pan || (Math.random() - 0.5) * 1.4 }); },
  ricochet(vol = 1) { play(B.ricochet(), { vol: 0.35 * vol, rate: 0.85 + Math.random() * 0.3, pan: (Math.random() - 0.5) }); },
  impact(flesh, vol = 1) { const n = ctx.currentTime; if (n - lastImp < 0.06) return; lastImp = n; play(B.hitb(flesh ? 'flesh' : 'wall'), { vol: (flesh ? 0.55 : 0.4) * vol, rate: 0.9 + Math.random() * 0.2, lpf: vol < 0.5 ? 2500 : 0 }); if (!flesh && Math.random() < 0.3) this.ricochet(vol); },
  // breach by method: kick / shotgun the lock / charge / lockpick / quiet open
  breach(method, wid) {
    const mt = METAL_PLACES.includes(place); // w4: debris + door slamming into the wall follow every forced entry
    if (method === 'kick') { this.kick(); play(B.splinter(), { vol: mt ? 0.25 : 0.55, at: 0.16, rate: mt ? 0.7 : 1 }); play(B.slam(), { vol: 0.5, at: 0.3 }); }
    else if (method === 'shotgun') { play(shotBuf(wid && gunProfile(wid).ty === 'shotgun' ? wid : 'm870', false), { vol: 1.1 }); play(B.kick(), { vol: 0.5, at: 0.06, rate: 1.2 }); play(B.splinter(), { vol: 0.5, at: 0.1 }); play(B.slam(), { vol: 0.45, at: 0.32 }); }
    else if (method === 'charge') { this.boom(); play(B.rubble(), { vol: 0.6, at: 0.2 }); play(B.slam(), { vol: 0.35, at: 0.5, rate: 0.8 }); }
    else this.door();
  },
  click() { tone(900, 700, 0.04, 0.08, 'square'); },
  ui() { tone(660, 880, 0.06, 0.06, 'triangle'); },
  hit() { this.impact(true); },
  // w4: footstep on the surface under the soldier ('concrete' tile wood carpet grate ground...), gait walk / run / sneak
  step(vol = 1, surface, gait) { if (!live()) return; const sf = surfaceOf(surface), g = gait === 'run' ? 1.25 : gait === 'sneak' ? 0.55 : 1; play(B.stepS(sf, Math.floor(Math.random() * 4)), { vol: 0.34 * vol * (STEP_GAIN[sf] || 1) * g, rate: (0.9 + Math.random() * 0.25) * (gait === 'run' ? 1.08 : 1), lpf: vol < 0.5 ? 2200 : 0 }); },
  reload(vol = 1) { play(B.mag(), { vol: 0.5 * vol, rate: 0.95 + Math.random() * 0.1 }); },
  pick() { tone(2600 + Math.random() * 600, 2400, 0.025, 0.035, 'square'); },
  beep(hi) { tone(hi ? 1800 : 1400, hi ? 1800 : 1400, 0.07, 0.07, 'sine'); },
  alarm() { if (!live()) return; for (let i = 0; i < 3; i++) { tone(620, 880, 0.28, 0.07, 'sawtooth', 'sfx', i * 0.6); tone(880, 620, 0.28, 0.07, 'sawtooth', 'sfx', i * 0.6 + 0.29); } },
  objective() { tone(880, 880, 0.08, 0.1, 'triangle'); tone(1320, 1320, 0.14, 0.1, 'triangle', 'sfx', 0.09); },
  win() { [523, 659, 784, 1046].forEach((f, i) => { tone(f, f, 0.5, 0.09, 'triangle', 'sfx', i * 0.12); tone(f * 2, f * 2, 0.3, 0.025, 'sine', 'sfx', i * 0.12); }); tone(131, 131, 1.2, 0.1, 'sine', 'sfx', 0); tone(196, 196, 1.2, 0.07, 'sine', 'sfx', 0.3); }, // w4
  lose() { [392, 349, 311, 262].forEach((f, i) => tone(f, f * 0.98, 0.55, 0.09, 'sawtooth', 'sfx', i * 0.3)); tone(65, 40, 1.8, 0.16, 'sine', 'sfx', 0.6); },
};

// ---------- radio callouts (speech synthesis + radio squelch through the voice bus) ----------
const LINES = {
  contact: ['Contact!', 'Contact front!', 'Tango spotted!', 'Eyes on hostile!'], down: ['Tango down.', 'Hostile down.', 'Target down.', 'Got him.'],
  reload: ['Reloading!', 'Changing mags!', 'Cover me, reloading!'], breach: ['Breaching!', 'Breach, breach, breach!', 'Going in!'], kick: ['Kicking it!'], charge: ['Charge set! Stand back!', 'Fire in the hole!'],
  flash: ['Flashbang out!', 'Bang out!'], frag: ['Frag out!'], smoke: ['Smoke out!'], go: ['Go go go!', 'Execute!', 'Move!'], move: ['Moving.', 'On the move.', 'Copy, moving.', 'Roger.'], hold: ['Holding.', 'Holding position.'],
  clear: ['Clear!', 'Room clear!', 'Area clear.'], hostage: ['Hostage secured!', 'Got the hostage!'], mandown: ['Man down!', 'Operator down!'], alarm: ['They know we\'re here!', 'We\'re compromised!'],
  intel: ['Intel secured.'], bomb: ['Bomb defused.'], vip: ['VIP with us!', 'Package secured.'], win: ['All teams, mission complete.', 'Objective complete. Good work.'], hurt: ['I\'m hit!', 'Taking fire!'],
  // w4: more callouts
  ack: ['Copy.', 'Roger that.', 'Understood.', 'Wilco.'], stack: ['Stacked up.', 'In position.', 'Ready to breach.', 'Set.'], last: ['Last hostile!', 'One left!'], cover: ['Covering!', 'I got you covered.'], flank: ['Hostile on the flank!', 'Flanker!'], ready: ['Ready.', 'Standing by.'],
};
const CALL_GAP = { ack: 3, stack: 4, last: 8, cover: 8, flank: 8, ready: 6, contact: 5, down: 2.5, reload: 6, move: 4, hold: 4, clear: 6, hurt: 6 };
let voices = null, lastSay = {}, talkingUntil = 0;
function pickVoice(i) { try { if (!voices || !voices.length) voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); } catch (e) { voices = []; } return voices.length ? voices[i % voices.length] : null; }
if (typeof window !== 'undefined' && window.speechSynthesis) try { speechSynthesis.onvoiceschanged = () => { voices = null; }; } catch (e) { /* ignore */ }
// every sfx is a silent no-op until the context is unlocked (first gesture) or while muted: game logic can call them any time
for (const k of Object.keys(sfx)) { const f = sfx[k]; sfx[k] = (...a) => { if (!live()) return; try { f(...a); } catch (e) { console.warn('sfx', k, e); } }; }
export const radio = {
  lines: LINES,
  say(key, who = 0, prio = 1) {
    if (!live() || mix.voice <= 0.01) return false; const now = ctx.currentTime; const gap = CALL_GAP[key] ?? 1.5;
    if (now - (lastSay[key] ?? -99) < gap) return false; if (now < talkingUntil && prio < 2) return false; lastSay[key] = now;
    const opts = LINES[key] || [key]; const text = opts[Math.floor(Math.random() * opts.length)];
    play(B.squelch(1), { to: 'voice', vol: 0.5 });
    talkingUntil = now + 0.35 + text.length * 0.06;
    { const sb = play(B.static(), { to: 'voice', vol: 0.06, at: 0.05, rate: 0.9 + Math.random() * 0.3 }); if (sb) try { sb.stop(ctx.currentTime + Math.min(2.2, 0.25 + text.length * 0.07)); } catch (e) { /* ignore */ } } // w4: channel static under the voice
    const ss = window.speechSynthesis; if (!ss || !window.SpeechSynthesisUtterance) { play(B.squelch(0), { to: 'voice', vol: 0.45, at: 0.5 }); return true; }
    try { if (prio >= 2) ss.cancel(); const u = new SpeechSynthesisUtterance(text); const v = pickVoice(who); if (v) u.voice = v; u.lang = v ? v.lang : 'en-US'; u.rate = 1.12 + (who % 3) * 0.04; u.pitch = 0.75 + (who % 4) * 0.08; u.volume = Math.min(1, mix.voice * mix.master * 1.2);
      u.onend = () => { play(B.courtesy(), { to: 'voice', vol: 0.18 }); play(B.squelch(0), { to: 'voice', vol: 0.45, at: 0.1 }); talkingUntil = 0; }; /* w4: courtesy beep */ setTimeout(() => { try { ss.speak(u); } catch (e) { /* ignore */ } }, 90); } catch (e) { /* ignore */ }
    return true;
  },
};

// ---------- music: generative score per theatre, intensity follows the fight ----------
const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SC = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phryg: [0, 1, 4, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], pent: [0, 3, 5, 7, 10], penta: [0, 2, 4, 7, 9], aeol: [0, 2, 3, 5, 7, 8, 10] };
// root midi, bpm, scale, chord degrees (scale steps), lead timbre, percussion kit, pad brightness
export const THEMES = {
  menu: { root: 45, bpm: 84, sc: 'dorian', ch: [0, 5, 3, 4], lead: 'bell', kit: 'soft', pad: 900 },
  tutorial: { root: 48, bpm: 92, sc: 'dorian', ch: [0, 3, 4, 3], lead: 'bell', kit: 'soft', pad: 1000 },
  tr: { root: 50, bpm: 98, sc: 'phryg', ch: [0, 1, 0, 6], lead: 'pluck', kit: 'darbuka', pad: 700 },
  de: { root: 43, bpm: 112, sc: 'minor', ch: [0, 5, 2, 6], lead: 'saw', kit: 'industrial', pad: 600 },
  af: { root: 45, bpm: 90, sc: 'phryg', ch: [0, 0, 1, 0], lead: 'pluck', kit: 'frame', pad: 650 },
  no: { root: 41, bpm: 80, sc: 'dorian', ch: [0, 2, 5, 3], lead: 'bell', kit: 'sparse', pad: 1300 },
  kr: { root: 47, bpm: 118, sc: 'pent', ch: [0, 3, 2, 4], lead: 'square', kit: 'electro', pad: 1100 },
  hk: { root: 46, bpm: 122, sc: 'minor', ch: [0, 5, 6, 4], lead: 'square', kit: 'electro', pad: 1000 },
  mx: { root: 52, bpm: 104, sc: 'harm', ch: [0, 3, 4, 0], lead: 'pluck', kit: 'latin', pad: 800 },
  co: { root: 49, bpm: 108, sc: 'minor', ch: [0, 5, 3, 4], lead: 'marimba', kit: 'latin', pad: 750 },
  ke: { root: 50, bpm: 100, sc: 'penta', ch: [0, 3, 1, 4], lead: 'marimba', kit: 'shaker', pad: 850 },
  br: { root: 48, bpm: 110, sc: 'minor', ch: [0, 3, 5, 4], lead: 'pluck', kit: 'surdo', pad: 800 },
};
const amb = createAmbience({ ctx: () => ctx, bus: () => bus, noise: () => noiseBuf, live, tone, burst }); // w4
const music = {
  want: null, theme: null, out: null, timer: 0, next: 0, step: 0, inten: 0.15, target: 0.15, lead: 0, bar: 0,
  kick() { if (!this.want || !live()) return; if (!this.timer) this.timer = setInterval(() => this.tick(), 90); },
  start(id, mission) { const th = tuneTheme(THEMES[id] || THEMES.menu, mission), key = id + ':' + (mission ? mission.map + ':' + mission.mode : ''); if (this.want === id && this.key === key && this.out) return; this.stop(0.8); this.want = id; this.key = key; this.theme = th; this.inten = this.target = th.inten0 ?? 0.15; /* w4: place + mission-type tuning */ this.step = 0; this.bar = 0; this.lead = 0; if (!ctx) return; this.out = ctx.createGain(); this.out.gain.setValueAtTime(0.0001, ctx.currentTime); this.out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2.5); this.out.connect(bus.music); this.next = ctx.currentTime + 0.1; this.kick(); },
  restart() { const id = this.want, key = this.key, th = this.theme, i0 = this.inten; this.want = null; this.start(id); this.key = key; this.theme = th; this.inten = this.target = i0; }, // w4: after the context unlocks, keep the tuned theme
  stop(fade = 1.5) { if (this.timer) { clearInterval(this.timer); this.timer = 0; } if (this.out && ctx) { const o = this.out; o.gain.cancelScheduledValues(ctx.currentTime); o.gain.setTargetAtTime(0.0001, ctx.currentTime, fade / 4); setTimeout(() => { try { o.disconnect(); } catch (e) { /* ignore */ } }, fade * 1000 + 200); } this.out = null; this.want = null; },
  tick() {
    if (!ctx || !this.out) return; if (ctx.state !== 'running') return; const th = this.theme; const s16 = 60 / th.bpm / 4; const now = ctx.currentTime;
    if (this.next < now - 0.2) this.next = now + 0.05; // after a suspend: don't machine-gun the backlog
    this.inten += (this.target - this.inten) * 0.04;
    while (this.next < now + 0.3) { this.note(this.step, this.next, s16); this.next += s16; this.step++; }
  },
  pitch(deg, oct = 0) { const th = this.theme, sc = SC[th.sc]; const o = Math.floor(deg / sc.length); return th.root + 12 * (oct + o) + sc[((deg % sc.length) + sc.length) % sc.length]; },
  voice(type, f, t, dur, vol, cut = 2000, at = 0.01) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + at); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); let n = o; if (cut) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; o.connect(fl); n = fl; } n.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05); return o; },
  hit(t, freq, dur, vol, type = 'bandpass', q = 1) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random(), dur + 0.05); },
  drum(t, f0, f1, dur, vol) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7); const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05); },
  note(st, t, s16) {
    const th = this.theme, I = this.inten, b16 = st % 16, bar = Math.floor(st / 16); const chordDeg = th.ch[Math.floor(bar / 2) % th.ch.length];
    // pad: a new chord every 2 bars, three detuned voices, slow swell
    if (st % 32 === 0) for (const [k, dt] of [[0, -4], [2, 3], [4, 0]]) { const o = this.voice('sawtooth', N(this.pitch(chordDeg + k, -1)), t, s16 * 34, 0.035 + 0.02 * (1 - I), th.pad * (0.7 + I * 0.6), s16 * 10); o.detune.value = dt * 2; }
    // drone root
    if (st % 64 === 0) this.voice('triangle', N(this.pitch(chordDeg, -2)), t, s16 * 66, 0.06, 400, s16 * 8);
    // bass pulse with the fight
    if (I > 0.3 && (b16 % 4 === 0 || (I > 0.65 && b16 % 2 === 0))) this.voice('sawtooth', N(this.pitch(chordDeg, -2)), t, s16 * 1.6, 0.07 * Math.min(1, I * 1.3), 300 + I * 500, 0.005);
    if (th.tick && b16 % 4 === 0) { this.voice('sine', b16 === 0 ? 1980 : 1480, t, 0.06, 0.035 + I * 0.03, 0, 0.001); } // w4: bomb timer tick
    // percussion
    const k = th.kit, P = (p) => p[b16] === 'x' || (p[b16] === 'o' && I > 0.6);
    const pat = { soft: ['x...............', '........o.......', '................'], darbuka: ['x.....x...x.....', '...o..o.o...o.oo', '..x...x...x...x.'], industrial: ['x...x...x...x...', '....x.......x...', 'x.x.x.x.x.x.x.x.'], frame: ['x.......x..x....', '....o.......o...', '..x...x...x...x.'],
      sparse: ['x...............', '................', '........x.......'], electro: ['x...x...x...x...', '....x.......x..o', 'x.xxx.xxx.xxx.xo'], latin: ['x..x..x.x..x..x.', '....x.......x...', 'x.xx.xx.x.xx.xx.'], shaker: ['x.....x...x.....', '....o.......o...', 'xxxxxxxxxxxxxxxx'], surdo: ['x.......x.......', '....x.......x.o.', 'x.x.xxx.x.x.xxx.'] }[k] || ['x...............', '................', '................'];
    const drumsOn = I > 0.12 || k === 'soft';
    if (drumsOn && P(pat[0])) this.drum(t, k === 'surdo' ? 120 : k === 'industrial' ? 150 : 110, 42, 0.35, 0.22 * (0.5 + I * 0.6));
    if (drumsOn && I > 0.35 && P(pat[1])) { if (k === 'darbuka' || k === 'frame') { this.hit(t, 900, 0.09, 0.14 * I, 'bandpass', 2); this.drum(t, 300, 200, 0.08, 0.06 * I); } else this.hit(t, k === 'industrial' ? 1600 : 2200, 0.14, 0.12 * I, 'bandpass', 0.8); }
    if (drumsOn && I > 0.25 && P(pat[2])) this.hit(t, k === 'shaker' || k === 'latin' ? 6500 : 8000, k === 'shaker' ? 0.05 : 0.03, (0.025 + 0.05 * I) * (b16 % 4 === 0 ? 1.3 : 0.8), 'highpass', 0.7);
    // lead: sparse motif, random walk on the scale, busier when tense
    const dens = th.lead === 'bell' ? 0.12 : 0.1 + I * 0.35;
    if ((b16 % 2 === 0) && Math.random() < dens) { this.lead = Math.max(-2, Math.min(9, this.lead + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)])); const f = N(this.pitch(chordDeg + this.lead, th.lead === 'bell' ? 1 : 0)), v = 0.04 + I * 0.025;
      if (th.lead === 'pluck') { this.voice('triangle', f, t, 0.5, v * 1.3, 2400, 0.003); this.voice('sawtooth', f * 2, t, 0.12, v * 0.3, 3000, 0.002); }
      else if (th.lead === 'marimba') { this.voice('sine', f, t, 0.35, v * 1.4, 0, 0.002); this.voice('sine', f * 4, t, 0.07, v * 0.4, 0, 0.002); }
      else if (th.lead === 'bell') { this.voice('sine', f, t, 1.6, v, 0, 0.004); this.voice('sine', f * 2.76, t, 0.5, v * 0.25, 0, 0.002); }
      else this.voice(th.lead === 'saw' ? 'sawtooth' : 'square', f, t, s16 * 2.5, v * 0.7, 1200 + I * 1500, 0.004);
    }
  },
};
export const musicCtl = {
  play(id, mission) { // w4: optional mission tunes the score, sets the ambience bed and the ground surface for footsteps
    place = mission ? mission.map : null; amb.set(ambFor(mission));
    if (!ctx) { music.want = id; music.key = id + ':' + (mission ? mission.map + ':' + mission.mode : ''); music.theme = tuneTheme(THEMES[id] || THEMES.menu, mission); music.inten = music.target = music.theme.inten0 ?? 0.15; return; } music.start(id, mission); },
  stop(f) { music.stop(f); },
  intensity(x) { music.target = Math.max(0, Math.min(1, x)); },
  get state() { return { id: music.want, inten: +music.inten.toFixed(2), running: !!music.timer, place, amb: amb.state } },
};
// test hook (read-only helpers for audio-check.mjs)
if (typeof window !== 'undefined') window.__audio = { amb, B: (k, ...a) => ctx && B[k] && B[k](...a), surfaces: SURFACES, sfx, radio, musicCtl, getMix, audioState, shotBuf: (w, s) => ctx && shotBuf(w, s), buf: (k) => ctx && B[k] && B[k](0), profile: gunProfile };
