// w4: per-location sound for Zulu Protocol: ambience beds (procedural noise layers + random one-shots) and the tuning that makes
// the music of each place and each mission type sound different. No audio files; everything is synthesised.

// time of day, ambience bed and a small musical shift per map (keys match MAPS in maps.js)
export const PLACES = {
  embassy: { amb: 'office', time: 'day', root: 0 }, warehouse: { amb: 'dock', time: 'overcast', root: 0 }, kandahar: { amb: 'desert', time: 'day', root: 0 },
  oilrig: { amb: 'sea', time: 'overcast', root: -1 }, subway: { amb: 'metro', time: 'night', root: 0 }, hkoffice: { amb: 'highrise', time: 'night', root: 0 },
  bank: { amb: 'marble', time: 'dusk', root: 0 }, ship: { amb: 'harbour', time: 'dusk', root: 0 }, killhouse: { amb: 'field', time: 'day', root: 0 },
  nairobi: { amb: 'savanna', time: 'dusk', root: 0 }, rio: { amb: 'favela', time: 'night', root: 0 },
  // batch6: the batch 3 maps (maps3.js) get their own beds too
  forest: { amb: 'pines', time: 'day', root: 0 }, valley: { amb: 'orchard', time: 'day', root: 0 }, port: { amb: 'terminal', time: 'dusk', root: -1 }, ranch: { amb: 'acacia', time: 'day', root: 0 },
};
const TIMES = { night: { bpm: 0.95, pad: 0.8 }, dusk: { bpm: 0.98, pad: 0.9 }, overcast: { bpm: 0.98, pad: 0.85 }, day: { bpm: 1, pad: 1 } };
// mission type: hostage is tense and slow, bomb has a ticking clock, intel is stealthy, extract / escort drive forward
const MODES = { hostage: { bpm: 0.96, inten: 0.2 }, bomb: { bpm: 1.08, inten: 0.25, tick: true }, intel: { bpm: 0.9, inten: 0.1 }, extract: { bpm: 1.04, inten: 0.18 }, escort: { bpm: 1.04, inten: 0.18 }, hunt: { bpm: 1, inten: 0.15 }, training: { bpm: 1, inten: 0.1 } };
export function tuneTheme(th, mission) {
  if (!mission) return { ...th, inten0: 0.15 };
  const P = PLACES[mission.map] || {}, T = TIMES[P.time] || TIMES.day, M = MODES[mission.mode] || MODES.hunt;
  return { ...th, bpm: Math.round(th.bpm * T.bpm * M.bpm), pad: th.pad * T.pad, root: th.root + (P.root || 0), tick: !!M.tick, inten0: M.inten };
}
export const ambFor = (mission) => (mission && (PLACES[mission.map] || {}).amb) || null;

// ---------- ambience engine ----------
// loop layer: { t: filter type, f: Hz, q, g: gain, lfo: Hz, d: depth 0..1 of gain modulation } or { osc: 'sine', f, g } for hums
const BEDS = {
  office: { loops: [{ osc: 'sine', f: 118, g: 0.012 }, { osc: 'sine', f: 237, g: 0.006 }, { t: 'lowpass', f: 420, g: 0.045, lfo: 0.07, d: 0.4 }, { t: 'lowpass', f: 160, g: 0.05 }], once: [['ding', 25, 55], ['clank', 20, 45], ['siren', 40, 90]] },
  dock: { loops: [{ t: 'lowpass', f: 650, g: 0.07, lfo: 0.09, d: 0.6 }, { t: 'lowpass', f: 300, g: 0.09, lfo: 0.18, d: 0.7 }], once: [['gull', 5, 14], ['clank', 8, 20], ['horn', 40, 80], ['gust', 15, 30]] },
  desert: { loops: [{ t: 'bandpass', f: 520, q: 0.7, g: 0.08, lfo: 0.08, d: 0.7 }, { t: 'bandpass', f: 5600, q: 6, g: 0.012, lfo: 22, d: 0.8 }], once: [['gust', 10, 25], ['dog', 25, 60], ['bird', 14, 30]] },
  sea: { loops: [{ t: 'bandpass', f: 420, q: 0.6, g: 0.12, lfo: 0.13, d: 0.6 }, { t: 'lowpass', f: 240, g: 0.1, lfo: 0.16, d: 0.8 }, { t: 'bandpass', f: 1400, q: 3, g: 0.02, lfo: 0.11, d: 0.9 }], once: [['gull', 6, 16], ['creak', 8, 20], ['clank', 10, 25], ['gust', 12, 24]] },
  metro: { loops: [{ osc: 'sine', f: 100, g: 0.012 }, { osc: 'square', f: 50, g: 0.004 }, { t: 'lowpass', f: 90, g: 0.12, lfo: 0.05, d: 0.3 }, { t: 'lowpass', f: 300, g: 0.03 }], once: [['drip', 3, 9], ['train', 30, 60], ['chime', 35, 70], ['clank', 15, 35]] },
  highrise: { loops: [{ osc: 'sine', f: 110, g: 0.012 }, { t: 'lowpass', f: 260, g: 0.06 }, { t: 'bandpass', f: 1200, q: 4, g: 0.018, lfo: 0.12, d: 0.9 }, { t: 'lowpass', f: 700, g: 0.03, lfo: 0.2, d: 0.5 }], once: [['siren', 20, 50], ['ding', 30, 60], ['gust', 15, 30]] },
  marble: { loops: [{ osc: 'sine', f: 120, g: 0.009 }, { t: 'lowpass', f: 220, g: 0.05 }, { t: 'lowpass', f: 500, g: 0.025, lfo: 0.1, d: 0.5 }], once: [['bell', 40, 90], ['honk', 14, 35], ['clank', 20, 40]] },
  harbour: { loops: [{ t: 'lowpass', f: 320, g: 0.1, lfo: 0.17, d: 0.7 }, { t: 'bandpass', f: 900, q: 1, g: 0.03, lfo: 0.23, d: 0.8 }], once: [['gull', 4, 12], ['horn', 30, 70], ['creak', 8, 18], ['drip', 6, 14]] },
  field: { loops: [{ t: 'lowpass', f: 500, g: 0.035, lfo: 0.1, d: 0.6 }], once: [['bird', 3, 9], ['gust', 12, 24]] },
  savanna: { loops: [{ t: 'bandpass', f: 4600, q: 8, g: 0.02, lfo: 18, d: 0.8 }, { t: 'lowpass', f: 380, g: 0.03, lfo: 0.08, d: 0.6 }], once: [['bird', 3, 9], ['honk', 18, 40], ['dog', 30, 70]] },
  // batch6: Black Forest pines, Helmand orchards, Colombian container terminal, Kenyan ranch
  pines: { loops: [{ t: 'bandpass', f: 900, q: 0.5, g: 0.06, lfo: 0.06, d: 0.75 }, { t: 'highpass', f: 3000, g: 0.012, lfo: 0.09, d: 0.8 }], once: [['bird', 4, 11], ['knock', 18, 40], ['gust', 9, 20], ['creak', 25, 50]] },
  orchard: { loops: [{ t: 'bandpass', f: 3900, q: 9, g: 0.016, lfo: 14, d: 0.85 }, { t: 'lowpass', f: 420, g: 0.035, lfo: 0.07, d: 0.6 }], once: [['bird', 6, 14], ['bleat', 20, 45], ['dog', 30, 65], ['gust', 16, 32]] },
  terminal: { loops: [{ t: 'lowpass', f: 140, g: 0.08, lfo: 0.04, d: 0.3 }, { t: 'lowpass', f: 520, g: 0.05, lfo: 0.12, d: 0.6 }], once: [['reverse', 14, 30], ['clank', 6, 15], ['horn', 35, 75], ['gull', 10, 22]] },
  acacia: { loops: [{ t: 'bandpass', f: 6200, q: 10, g: 0.014, lfo: 30, d: 0.85 }, { t: 'lowpass', f: 330, g: 0.03, lfo: 0.06, d: 0.6 }], once: [['bird', 4, 10], ['moo', 22, 50], ['dog', 35, 80], ['gust', 14, 28]] },
  favela: { loops: [{ t: 'bandpass', f: 5200, q: 7, g: 0.016, lfo: 25, d: 0.8 }, { t: 'lowpass', f: 450, g: 0.04, lfo: 0.09, d: 0.5 }], once: [['bass', 9, 18], ['dog', 12, 30], ['moto', 25, 55], ['siren', 40, 90]] },
};
export function createAmbience(api) {
  let kind = null, out = null, nodes = [], timer = 0; const due = {};
  const C = () => api.ctx(), rnd = (a, b) => a + Math.random() * (b - a);
  const t0 = () => C().currentTime;
  function swell(dur, f, vol, type = 'lowpass') { const c = C(), s = c.createBufferSource(); s.buffer = api.noise(); s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = c.createGain(), t = t0(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(api.bus().amb); s.start(t, Math.random()); s.stop(t + dur + 0.1); }
  const T = (f0, f1, d, v, type = 'sine', at = 0) => api.tone(f0, f1, d, v, type, 'amb', at), Bn = (d, f, v, q, type, at = 0) => api.burst(d, f, v, q, type, 'amb', at);
  const ONE = {
    gull() { const f = rnd(1400, 1900); T(f, f * 0.7, 0.2, 0.03, 'triangle'); T(f * 1.05, f * 0.6, 0.28, 0.03, 'triangle', 0.24); if (Math.random() < 0.5) T(f, f * 0.65, 0.22, 0.025, 'triangle', 0.55); },
    horn() { T(92, 90, 1.8, 0.03, 'sawtooth'); T(138, 136, 1.8, 0.018, 'triangle'); T(115, 113, 1.8, 0.015, 'sawtooth'); },
    clank() { Bn(0.06, rnd(1400, 2400), 0.07, 6, 'bandpass'); T(900, 870, 0.18, 0.012, 'triangle'); },
    creak() { T(280, 420, 0.7, 0.012, 'sawtooth'); T(290, 440, 0.7, 0.01, 'triangle', 0.02); },
    drip() { T(1500, 800, 0.07, 0.05); T(2300, 1300, 0.05, 0.018, 'sine', 0.02); },
    chime() { T(659, 659, 0.5, 0.03); T(523, 523, 0.8, 0.03, 'sine', 0.42); },
    ding() { T(1318, 1318, 0.7, 0.03); T(1318 * 2.76, 1318 * 2.76, 0.2, 0.006); },
    bell() { for (const [m, v] of [[1, 0.04], [2.76, 0.012], [5.4, 0.006]]) T(330 * m, 330 * m, 3.5, v); },
    train() { swell(6, 380, 0.09); swell(5, 1400, 0.012, 'bandpass'); },
    bird() { const f = rnd(2800, 3800), n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) T(f, f * rnd(1.15, 1.4), 0.07, 0.022, 'sine', i * 0.11); },
    dog() { for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) { Bn(0.14, 650, 0.03, 3, 'bandpass', i * 0.32); T(420, 260, 0.14, 0.012, 'sawtooth', i * 0.32); } },
    siren() { for (let i = 0; i < 3; i++) { T(700, 960, 0.7, 0.008, 'sine', i * 1.4); T(960, 700, 0.7, 0.008, 'sine', i * 1.4 + 0.7); } },
    gust() { swell(3.2, rnd(350, 700), 0.06); },
    honk() { T(420, 410, 0.18, 0.02, 'square'); if (Math.random() < 0.6) T(420, 410, 0.18, 0.02, 'square', 0.28); },
    bass() { for (let i = 0; i < 6; i++) { T(85, 45, 0.18, 0.05, 'sine', i * 0.46); if (i % 2) Bn(0.05, 6000, 0.012, 1, 'highpass', i * 0.46); } },
    knock() { const n = 6 + Math.floor(Math.random() * 6); for (let i = 0; i < n; i++) Bn(0.02, 1700, 0.05, 5, 'bandpass', i * 0.055); }, // batch6: woodpecker
    bleat() { T(520, 470, 0.45, 0.012, 'sawtooth'); T(526, 476, 0.45, 0.009, 'sawtooth', 0.01); },
    reverse() { for (let i = 0; i < 4; i++) T(1040, 1040, 0.3, 0.012, 'square', i * 0.6); }, // reversing straddle carrier
    moo() { T(150, 120, 1.3, 0.02, 'sawtooth'); T(300, 240, 1.3, 0.006, 'triangle'); },
    moto() { T(110, 210, 1.3, 0.012, 'sawtooth'); T(110.7, 211, 1.3, 0.01, 'sawtooth'); },
  };
  function loop(L) {
    const c = C(), g = c.createGain(); g.gain.value = L.g; g.connect(out); let src;
    if (L.osc) { src = c.createOscillator(); src.type = L.osc; src.frequency.value = L.f; src.connect(g); src.start(); }
    else { src = c.createBufferSource(); src.buffer = api.noise(); src.loop = true; const f = c.createBiquadFilter(); f.type = L.t; f.frequency.value = L.f; f.Q.value = L.q || 0.7; src.connect(f); f.connect(g); src.start(0, Math.random()); }
    nodes.push(src);
    if (L.lfo) { const o = c.createOscillator(); o.frequency.value = L.lfo * (0.9 + Math.random() * 0.2); const og = c.createGain(); og.gain.value = L.g * L.d; o.connect(og); og.connect(g.gain); o.start(); nodes.push(o); }
  }
  function begin() {
    const c = C(); if (!c || !kind || out) return; const bed = BEDS[kind]; if (!bed) return;
    out = c.createGain(); out.gain.setValueAtTime(0.0001, c.currentTime); out.gain.exponentialRampToValueAtTime(1, c.currentTime + 3); out.connect(api.bus().amb);
    nodes = []; for (const L of bed.loops) loop(L);
    for (const [n, a] of bed.once) due[n] = c.currentTime + rnd(2, a);
    timer = setInterval(() => { const cc = C(); if (!cc || cc.state !== 'running' || !api.live()) return; for (const [n, a, b] of bed.once) if (cc.currentTime > due[n]) { due[n] = cc.currentTime + rnd(a, b); try { ONE[n](); } catch (e) { /* ignore */ } } }, 900);
  }
  function end() { if (timer) { clearInterval(timer); timer = 0; } if (out && C()) { const o = out, ns = nodes; o.gain.cancelScheduledValues(t0()); o.gain.setTargetAtTime(0.0001, t0(), 0.4); setTimeout(() => { for (const n of ns) try { n.stop(); } catch (e) { /* ignore */ } try { o.disconnect(); } catch (e) { /* ignore */ } }, 2200); } out = null; nodes = []; }
  return {
    set(k) { if (k === kind && (out || !C())) return; end(); kind = k; if (C()) begin(); }, // call before the context exists: remembered, started by resume()
    resume() { if (kind && !out && C()) begin(); }, stop() { end(); kind = null; },
    get state() { return { kind, running: !!out }; }, shots: ONE,
  };
}
// surface a soldier hears on open ground (floor type 'ground') in each map
export const GROUND = { forest: 'dirt', valley: 'dirt', ranch: 'dirt', port: 'concrete', /* batch6 */ kandahar: 'dirt', nairobi: 'dirt', killhouse: 'dirt', oilrig: 'grate', ship: 'grate', subway: 'concrete', hkoffice: 'concrete', bank: 'concrete' };
