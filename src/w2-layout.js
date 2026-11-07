// w2: layout helpers (Game Worker 2 layout sweep). Kept in one file so it merges cleanly.
//  - w2ObjHTML: compact two-line objective counter for narrow portrait screens (e.g. 344px Fold cover screen).
//  - w2TutLayout: keeps the tutorial card and its "Exit tutorial" button off the Breach-plan, door and pause panels
//    (and off the highlighted target) on every screen size: tries other spots, then a narrower card, then a collapsed
//    one-line card (tap to read, tap again to collapse).

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// short form of the objective line: drop filler words, one segment per line
export function w2Short(t) {
  return String(t)
    .replace(/^Kill house · targets down /, 'Targets ')
    .replace(/^Neutralise hostiles: /, 'Hostiles ')
    .replace(/^Defuse bombs /, 'Bombs ')
    .replace(/Hostiles (\d+) left/, 'Hostiles $1')
    .replace(/Hostages alive /, 'Hostages ')
    .replace(/^Escort the VIP to the green EXIT$/, 'Escort VIP → EXIT')
    .replace(/^Escort the VIP to the EXIT$/, 'Escort VIP → EXIT')
    .split(' · ');
}
export function w2ObjHTML(t) { return `<span class="w2-of">${esc(t)}</span><span class="w2-os">${w2Short(t).map(s => `<span>${esc(s)}</span>`).join('')}</span>`; }

const vis = (e) => { if (!e || !e.isConnected || e.classList.contains('hidden') || e.closest('.hidden')) return null; const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return null; const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 ? r : null; };
const area = (a, b, g = 0) => Math.max(0, Math.min(a.right, b.right) + g - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) + g - Math.max(a.top, b.top));
const box = (l, t, w, h) => ({ left: l, top: t, right: l + w, bottom: t + h, width: w, height: h });
const rects = (sel) => [...document.querySelectorAll(sel)].map(vis).filter(Boolean);
const HARD = '#hud .planmenu, #hud .doormenu, #hud .pausemenu, .modal .mbox';
const SOFT = '#hud .hud-top button, #hud .hud-timer, #hud .hud-obj, #hud .hud-teams, #hud .hud-ports, #hud .hud-cmds, #hud .pausebtn, #hud .hud-tbar';

// place element `c` (fixed) at the first candidate with no hard overlap and least soft overlap
function place(c, cands, hard, soft) {
  let best = null;
  for (const [l, t] of cands) { const b = box(l, t, c.offsetWidth, c.offsetHeight);
    if (b.left < 0 || b.top < 0 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5) continue;
    const h = hard.reduce((s, r) => s + area(b, r, 4), 0), sft = soft.reduce((s, r) => s + area(b, r), 0), score = h * 1000 + sft;
    if (!best || score < best.score) best = { l, t, score, h }; if (!h && !sft) break; }
  return best;
}
function spots(cw, ch, top) { const W = innerWidth, H = innerHeight, m = 8; const xs = [(W - cw) / 2, m, W - cw - m], out = [];
  for (let y = top; y <= H - ch - m; y += Math.max(12, Math.round(H / 40))) for (const x of xs) out.push([Math.round(Math.max(m, x)), Math.round(y)]);
  return out; }

// spots for the Exit-tutorial button right next to the (moved) card, so both fit in the gap between panels
const nextTo = (b, ew, eh) => [[b.right + 6, b.top], [b.left - ew - 6, b.top], [b.right - ew, b.bottom + 6], [b.left, b.bottom + 6], [b.right - ew, b.top - eh - 6], [b.left, b.top - eh - 6]].map(([l, t]) => [Math.round(l), Math.round(t)]);
const clear = (b, hard) => b.left >= 0 && b.top >= 0 && b.right <= innerWidth + 0.5 && b.bottom <= innerHeight + 0.5 && !hard.some(r => area(b, r, 4) > 0);
let last = 0;
export function w2TutLayout(T) {
  const c = T.card, ex = T.exitB; if (!c || !c.isConnected) return;
  const now = performance.now(); if (now - last < 120) return; last = now;
  const panels = rects(HARD), hard = panels.slice(); const hl = vis(T.hlEl); if (hl) hard.push(hl); const soft = rects(SOFT);
  const topBar = (vis(document.querySelector('#hud .hud-top button')) || { bottom: 44 }).bottom + 4;
  const tuck = (on) => { if (!ex) return; ex.classList.toggle('w2-tuck', on); const px = c.querySelector('.w2-ex'); // collapsed card carries its own Exit button, so the floating one never needs a spot
    if (on && !px) { const bb = c.querySelector('.tc-b'); if (bb) { const b = document.createElement('button'); b.className = 'tc-skip w2-ex'; b.textContent = '✕ Exit tutorial'; b.onclick = (e) => { e.stopPropagation(); ex.click(); }; bb.prepend(b); } }
    if (!on && px) px.remove(); };
  const reset = () => { c.dataset.w2 = ''; c.classList.remove('w2-mini', 'w2-peek'); c.style.width = ''; tuck(false); };
  if (c.dataset.w2step !== String(T.i)) { c.dataset.w2step = String(T.i); reset(); } // tutorial.next() already reset free/left/top
  if (c.dataset.w2 && !panels.length) { reset(); c.classList.remove('free'); c.style.left = c.style.top = ''; } // panels closed: back to the normal spot
  const cur = vis(c);
  if (panels.length && cur && !c.classList.contains('w2-peek') && hard.some(r => area(cur, r, 4) > 0)) {
    let done = false, fallback = null; c.style.width = ''; c.classList.remove('w2-mini'); const w0 = c.offsetWidth;
    const ew = ex && ex.isConnected ? ex.offsetWidth : 0, eh = ex && ex.isConnected ? ex.offsetHeight : 0;
    // full card at another spot, then narrower, then collapsed; a spot only counts when the Exit button also fits beside it
    for (const mini of [false, true]) { for (const w of mini ? [0, 300, 240, 180] : [0, 300, 240]) { if (w && (w >= w0 || w < 160)) continue; c.style.width = w ? w + 'px' : ''; c.classList.toggle('w2-mini', mini); c.classList.add('free');
        const cw = c.offsetWidth, ch = c.offsetHeight;
        for (const [l, t] of spots(cw, ch, Math.min(topBar, 54)).concat([[8, 4], [innerWidth - cw - 8, 4]])) { const b = box(l, t, cw, ch); if (!clear(b, hard)) continue;
          const exOk = !ew || mini || clear(box(Math.round((innerWidth - ew) / 2), innerHeight - eh - 10, ew, eh), hard.concat([b])) || nextTo(b, ew, eh).some(([el, et]) => clear(box(el, et, ew, eh), hard.concat([b])));
          if (!exOk) { if (!fallback) fallback = { l, t, w, mini }; continue; }
          c.style.left = l + 'px'; c.style.top = t + 'px'; c.dataset.w2 = mini ? 'mini' : 'moved'; done = true; break; } if (done) break; } if (done) break; }
    if (!done && fallback) { c.style.width = fallback.w ? fallback.w + 'px' : ''; c.classList.toggle('w2-mini', fallback.mini); c.style.left = fallback.l + 'px'; c.style.top = fallback.t + 'px'; c.dataset.w2 = fallback.mini ? 'mini' : 'moved'; done = true; }
    if (!done) { c.classList.add('w2-mini', 'free'); c.style.width = ''; const p = place(c, spots(c.offsetWidth, c.offsetHeight, 4).concat([[8, 4]]), hard, soft) || { l: 8, t: 4 }; c.style.left = p.l + 'px'; c.style.top = p.t + 'px'; c.dataset.w2 = 'mini'; }
  }
  if (c.dataset.w2 === 'mini') tuck(true);
  if (!c.dataset.w2bound) { c.dataset.w2bound = '1'; c.addEventListener('click', (e) => { if (!c.classList.contains('w2-mini') && !c.classList.contains('w2-peek')) return; if (e.target.closest('button')) return; e.stopPropagation(); c.classList.toggle('w2-peek'); c.classList.toggle('w2-mini'); last = 0;
      const r = c.getBoundingClientRect(); if (r.bottom > innerHeight - 6) c.style.top = Math.max(4, innerHeight - r.height - 6) + 'px'; if (r.right > innerWidth - 6) c.style.left = Math.max(4, innerWidth - r.width - 6) + 'px'; }); } // keep the opened card on screen
  // exit button: never on top of a panel or the card
  if (ex && ex.isConnected && !ex.classList.contains('w2-tuck')) { const hx = hard.concat([vis(c)].filter(Boolean), rects('#hud .hud-timer, #hud .hud-top button, #hud .hud-obj, #hud .pausebtn')); const er = vis(ex);
    if (er && hx.some(r => area(er, r, 2) > 0)) { const ew = ex.offsetWidth, eh = ex.offsetHeight, W = innerWidth, H = innerHeight;
      const cr = vis(c); const cand = [[(W - ew) / 2, H - eh - 10]].concat(cr && c.dataset.w2 ? nextTo(cr, ew, eh) : [], [[8, topBar], [W - ew - 8, topBar], [8, H - eh - 8], [W - ew - 8, H - eh - 8]], spots(ew, eh, topBar)).map(([l, t]) => [Math.round(l), Math.round(t)]);
      ex.classList.add('w2-free'); const p = place(ex, cand, hx, soft); if (p) { ex.style.left = p.l + 'px'; ex.style.top = p.t + 'px'; } }
    else if (ex.classList.contains('w2-free')) { const sv = [ex.style.left, ex.style.top]; ex.classList.remove('w2-free'); ex.style.left = ex.style.top = ''; // try the normal spot again, keep the moved one if that is still covered
      const d = vis(ex); if (d && hx.some(r => area(d, r, 2) > 0)) { ex.classList.add('w2-free'); ex.style.left = sv[0]; ex.style.top = sv[1]; } } }
}

// w2: Breach (door) menu anchored to the right edge instead of over the door, so the view stays clear.
// Top: just under the top-right buttons. Bottom: above any bottom HUD block (team chips, ports, commands, PLAY) in the same column.
// The menu keeps its size and content; if space is short its option list scrolls (actions stay pinned, see style.css .dm-body).
export function w2DoorPlace(m) {
  if (!m) return; if (!m.dataset.w2rs) { m.dataset.w2rs = '1'; addEventListener('resize', () => w2DoorPlace(m)); } // re-anchor on rotate / resize
  if (m.classList.contains('hidden')) return;
  const W = innerWidth, H = innerHeight, g = 6;
  m.style.left = 'auto'; m.style.right = 'calc(8px + env(safe-area-inset-right))'; m.style.maxHeight = '';
  const r0 = m.getBoundingClientRect();
  const tops = rects('#hud .hud-top button, #hud .hud-timer'); const top = Math.round(Math.max(8, ...tops.filter(t => t.right > r0.left).map(t => t.bottom)) + g);
  const low = rects('#hud .hud-left, #hud .hud-right, #hud .hud-teams, #hud .hud-ports, #hud .hud-cmds, #hud .hud-tbar')
    .filter(b => b.right > r0.left && b.left < r0.right && b.top > top + 120).map(b => b.top);
  let bottom = Math.min(H - g, ...low.map(t => t - g));
  if (bottom - top < 150) bottom = H - g; // tiny screens: never squash below a usable size
  m.style.top = top + 'px'; m.style.maxHeight = Math.max(0, bottom - top) + 'px';
}
