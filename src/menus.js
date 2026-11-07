import { TRAINING } from './tutorial.js';
import { ACTIONS, bindings, keyName, controlsHTML, rebind } from './controls.js';
import { fsSupported, toggleFullscreen } from './hud.js';
import { WORLD_W, WORLD_H, WORLD_MASK, WORLD_LAT_TOP, WORLD_LAT_BOT } from './worldmask.js';
import { el, fmtTime } from './util.js';
import { GAME_TITLE, TEAMS, MODES, DIFFS, WEAPONS, ATTACHMENTS, ARMOR, GADGETS, CLASSES, UNITS } from './data.js';
import { MAPS, MISSIONS, REGIONS } from './maps.js';
import { writeSave, totalStars, defaultSave, roster } from './save.js';
import { sfx, setMix, audioMix, radio } from './audio.js';
import { itemImg, charImg } from './thumbs.js';
import { opStyle } from './charstyle.js';
import { flagURL } from './looks.js';
import { creditsHTML, creditsRoll } from './credits.js';
import { opStats } from './opstats.js';
// Menu screens (DOM). Each screen renders into app.menuRoot.
const stars = (n, max = 3) => '<span class="stars">' + Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('') + '</span>';
let __wmImg = null;
function worldMapImage() {
  if (__wmImg) return __wmImg; const S = 8, W = WORLD_W * S, H = WORLD_H * S;
  const m = document.createElement('canvas'); m.width = WORLD_W; m.height = WORLD_H; const mx = m.getContext('2d'); const md = mx.createImageData(WORLD_W, WORLD_H);
  for (let i = 0; i < WORLD_W * WORLD_H; i++) { md.data[i * 4 + 3] = WORLD_MASK[i] === '1' ? 255 : 0; } mx.putImageData(md, 0, 0);
  const b = document.createElement('canvas'); b.width = W; b.height = H; const bx = b.getContext('2d'); bx.imageSmoothingEnabled = true; bx.filter = 'blur(5px)'; bx.drawImage(m, 0, 0, W, H); bx.filter = 'none';
  const a = bx.getImageData(0, 0, W, H).data;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const sea = x.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.65); sea.addColorStop(0, '#16262f'); sea.addColorStop(1, '#0a1116'); x.fillStyle = sea; x.fillRect(0, 0, W, H);
  const out = x.getImageData(0, 0, W, H), o = out.data;
  for (let i = 0; i < W * H; i++) { const al = a[i * 4 + 3] / 255; const px = i % W, py = (i / W) | 0;
    if (al > 0.5) { const n = ((px * 7 + py * 13) % 17) / 17 * 6; const lat = py / H; const g = [46 + n, 60 + n - lat * 8, 50 + n]; o[i * 4] = g[0]; o[i * 4 + 1] = g[1]; o[i * 4 + 2] = g[2]; if (al < 0.62) { o[i * 4] = 120; o[i * 4 + 1] = 150; o[i * 4 + 2] = 130; } }
    else if (al > 0.32) { o[i * 4] += 14; o[i * 4 + 1] += 34; o[i * 4 + 2] += 44; } }
  x.putImageData(out, 0, 0);
  x.strokeStyle = 'rgba(120,170,190,0.12)'; x.lineWidth = 1; for (let lon = -180; lon <= 180; lon += 30) { const px = (lon + 180) / 360 * W; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, H); x.stroke(); }
  for (let lat = -60; lat <= 90; lat += 30) { const py = (WORLD_LAT_TOP - lat) / (WORLD_LAT_TOP - WORLD_LAT_BOT) * H; x.beginPath(); x.moveTo(0, py); x.lineTo(W, py); x.stroke(); }
  x.fillStyle = 'rgba(0,0,0,0.18)'; for (let py = 0; py < H; py += 3) x.fillRect(0, py, W, 1);
  const v = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
  return __wmImg = c.toDataURL('image/jpeg', 0.86);
}
export class Menus {
  constructor(app) { this.app = app; this.root = app.menuRoot; this.lastDeploy = {}; }
  get s() { return this.app.save; }
  screen(cls, title, back) {
    this.root.innerHTML = ''; this.root.classList.remove('hidden', 'see'); this.app.setPreview && this.app.setPreview(null); const sc = el('div', 'screen ' + cls);
    const hd = el('div', 'scr-head'); if (back) { const b = el('button', 'back', '‹ Back'); b.onclick = () => { sfx.ui(); back(); }; hd.append(b); }
    hd.append(el('h2', '', title), el('div', 'wallet', `<span class="cash">$${this.s.cash.toLocaleString()}</span> <span class="tstars">★ ${totalStars(this.s)}</span>`));
    sc.append(hd); const body = el('div', 'scr-body'); sc.append(body); this.root.append(sc); return body;
  }
  hide() { this.root.classList.add('hidden'); this.root.innerHTML = ''; }
  btn(label, cls, fn) { const b = el('button', 'mbtn ' + (cls || ''), label); b.onclick = () => { sfx.ui(); fn(); }; return b; }
  main() {
    this.root.innerHTML = ''; this.root.classList.remove('hidden', 'see'); this.app.setPreview && this.app.setPreview(null); const sc = el('div', 'screen mainmenu');
    sc.append(el('div', 'logo', `<div class="l1">${GAME_TITLE}</div><div class="l2">Tactical breach &amp; clear</div>`));
    const col = el('div', 'mm-col');
    col.append(this.btn('▶ Campaign', 'big primary', () => this.missions()), this.btn('Squad', 'big', () => this.app.squadScreen ? this.app.squadScreen() : this.squadLite()), this.btn('Armory', 'big', () => this.armory()), this.btn('🎯 Tutorial', 'big tutb', () => this.app.startTutorial()), this.btn('Settings', 'big', () => this.settings()), this.btn('Credits', 'big crb', () => this.credits()));
    if (this.s.ending) col.append(this.btn('★ Campaign ending', 'big', () => this.ending()));
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (window.__installEvt && !standalone) col.append(this.btn('⬇ Install app', 'big inst', () => this.app.installApp()));
    else if (this.app.ios && !standalone && /^https?:/.test(location.protocol)) col.append(this.btn('⬇ Add to Home Screen', 'big inst', () => { const m = el('div', 'modal ios-tip', `<div class="mbox to-box"><div class="to-ico">📲</div><h3>Install on iPhone / iPad</h3><p>In Safari tap <b>Share</b> <span class="shr">⎙</span> then <b>Add to Home Screen</b>. Zulu Protocol then opens full-screen and works offline.</p><div class="to-btns"><button class="mbtn primary">Got it</button></div></div>`); m.querySelector('button').onclick = () => m.remove(); document.body.append(m); }));
    sc.append(col, el('div', 'mm-foot', `$${this.s.cash.toLocaleString()} · ★ ${totalStars(this.s)} · ${Object.keys(this.s.completed).length}/${MISSIONS.length} missions cleared`));
    this.root.append(sc);
  }
  credits(back) { const body = this.screen('credits', 'Credits & Licences', back || (() => this.main())); body.append(el('div', 'cr-list', `<p class="cr-intro">Zulu Protocol is built on the work below. Thank you.</p>${creditsHTML()}`)); }
  ending() {
    const s = this.s; const body = this.screen('ending', 'Campaign Complete', () => this.main()); const tot = totalStars(s), max = MISSIONS.length * 3;
    const units = s.units.length, theatres = REGIONS.length; sfx.win();
    body.append(el('div', 'end-hero', `<div class="eh1">ZULU PROTOCOL</div><div class="eh2">All ${MISSIONS.length} operations across ${theatres} theatres are complete.</div>
      <div class="end-stats"><div><b>${tot}/${max}</b><span>Stars</span></div><div><b>${s.stats.kills}</b><span>Hostiles neutralised</span></div><div><b>${s.stats.missions}</b><span>Deployments</span></div><div><b>${units}</b><span>Units recruited</span></div><div><b>$${s.cash.toLocaleString()}</b><span>War chest</span></div></div>
      <p class="end-epi">The network that ran from the Ankara embassy to the docks of Rio is finished. Hostages are home, the bombs are cold and the files are on the Director's desk. Somewhere, the next call is already coming in — stand by, operator.</p>${tot < max ? `<p class="end-epi dim">${max - tot} stars still out there. Replay operations under par with no losses to earn them.</p>` : '<p class="end-epi gold">Every star earned. Flawless campaign.</p>'}`));
    const roll = el('div', 'end-roll', `<div class="roll-in">
      <h4>ZULU PROTOCOL</h4><p>A tactical breach &amp; clear game</p>
      ${creditsRoll()}
      <h4>Theatres</h4><p>${REGIONS.map(r => r.name).join(' · ')}</p>
      <h4>Thanks for playing</h4><p>★</p></div>`);
    body.append(roll);
    const bt = el('div', 'aar-btns'); bt.append(this.btn('World map', '', () => this.missions()), this.btn('Main menu', 'primary', () => this.main())); body.append(bt);
  }
  missionLocked(m) { return (m.req || 0) > totalStars(this.s); }
  missions(rid) {
    const body = this.screen('missions', 'World Map', () => this.main()); const s = this.s; const tot = totalStars(s);
    const regLocked = (r) => r.missions.every(id => this.missionLocked(MISSIONS.find(x => x.id === id) || {}));
    if (!rid) rid = this.region || (REGIONS.find(r => !regLocked(r) && r.missions.some(id => !s.completed[id])) || REGIONS[0]).id;
    this.region = rid;
    const wm = el('div', 'worldmap'); const inner = el('div', 'wm-inner'); wm.append(inner); const img = new Image(); img.className = 'wm-bg'; img.src = worldMapImage(); img.alt = ''; inner.append(img);
    const needOf = (r) => Math.min(...r.missions.map(id => (MISSIONS.find(x => x.id === id) || {}).req || 0));
    const ord = [...REGIONS].sort((a, b) => needOf(a) - needOf(b)).map(r => ({ r, lock: regLocked(r), px: (r.lon + 180) / 360 * 100, py: (WORLD_LAT_TOP - r.lat) / (WORLD_LAT_TOP - WORLD_LAT_BOT) * 100 }));
    const NS = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.classList.add('wm-routes');
    for (let i = 1; i < ord.length; i++) { const a = ord[i - 1], b = ord[i]; const ln = document.createElementNS(NS, 'path'); const mx = (a.px + b.px) / 2, my = (a.py + b.py) / 2 - Math.abs(a.px - b.px) * 0.18; ln.setAttribute('d', `M${a.px},${a.py} Q${mx},${my} ${b.px},${b.py}`); ln.setAttribute('class', b.lock ? 'rt locked' : 'rt'); svg.append(ln); }
    inner.append(svg);
    ord.forEach(({ r, lock, px, py }, n) => { const got = r.missions.reduce((a, id) => a + (s.stars[id] || 0), 0), max = r.missions.length * 3, done = r.missions.filter(id => s.completed[id]).length;
      const need = Math.min(...r.missions.map(id => (MISSIONS.find(x => x.id === id) || {}).req || 0)); const all = done === r.missions.length;
      const pips = r.missions.map(id => `<u class="${s.completed[id] ? 'ok' : ''}">${'★'.repeat(s.stars[id] || 0) || '·'}</u>`).join('');
      const pin = el('button', 'pin' + (lock ? ' locked' : '') + (all ? ' done' : '') + (r.id === rid ? ' on' : ''), `<i><b>${all ? '✓' : n + 1}</b></i><span>${r.name}<small>${lock ? '🔒 ' + need + '★ to unlock' : got + '/' + max + '★ · ' + done + '/' + r.missions.length + ' ops'}</small>${lock ? '' : `<em class="pips">${pips}</em>`}</span>`); pin.style.left = px + '%'; pin.style.top = py + '%'; pin.dataset.side = r.side || (r.left ? 'l' : 'r');
      pin.onclick = () => { sfx.ui(); this.missions(r.id); }; inner.append(pin); });
    { const T = TRAINING; const tp = el('button', 'pin training' + (s.tutorialDone ? ' done' : ''), `<i><b>${s.tutorialDone ? '✓' : 'T'}</b></i><span>Training<small>${T.place} · tutorial</small></span>`); tp.style.left = (T.lon + 180) / 360 * 100 + '%'; tp.style.top = (WORLD_LAT_TOP - T.lat) / (WORLD_LAT_TOP - WORLD_LAT_BOT) * 100 + '%'; tp.onclick = () => { sfx.ui(); this.app.startTutorial(); }; inner.append(tp); }
    const zb = el('div', 'wm-zoom', '<button data-z="1.4">+</button><button data-z="0.7">−</button><button data-z="0">⟲</button>'); wm.append(zb);
    this.wmz = this.wmz || { s: 1, x: 0, y: 0 }; installMapGestures(this, wm, inner, zb);
    const cleared = MISSIONS.filter(m => s.completed[m.id]).length, maxS = MISSIONS.length * 3; const pct = Math.round(cleared / MISSIONS.length * 100);
    body.append(wm, el('div', 'campaign-bar', `<div><b>Campaign</b> ${cleared}/${MISSIONS.length} operations cleared · ★ ${tot}/${maxS}</div><i><b style="width:${pct}%"></b></i><small>Earn stars to unlock new theatres. ${REGIONS.length} locations · ${MISSIONS.length} missions · 6 modes.</small>`));
    const r = REGIONS.find(x => x.id === rid); const sec = el('div', 'region', `<h3>${r.name}</h3>`); const grid = el('div', 'mgrid');
    for (const id of r.missions) { const m = MISSIONS.find(x => x.id === id); if (!m) continue; const map = MAPS[m.map]; const lock = this.missionLocked(m);
      const c = el('button', 'mcard' + (lock ? ' locked' : ''), `<div class="mc-mode">${MODES[m.mode].short}</div><b>${m.title}</b><small>${map.name} — ${map.place}</small><div class="mc-row">${stars(s.stars[m.id] || 0)}<span class="diff d${m.diff}">${DIFFS[m.diff].name}</span></div>${lock ? `<div class="mc-lock">🔒 ${m.req} ★ needed</div>` : `<div class="mc-best">${s.best[m.id] ? 'Best ' + fmtTime(s.best[m.id]) : 'Not cleared'}</div>`}${this.app.stagePips ? this.app.stagePips(m) : ''}`); /* B4: stage pips */
      c.onclick = () => { if (lock) return; sfx.ui(); if (this.app.stages) this.app.stages.select(m); else this.deploy(m); }; /* B4: stage select */ grid.append(c); }
    sec.append(grid); body.append(sec);
  }
  deploy(m) {
    const map = MAPS[m.map]; const body = this.screen('deploy', m.title, () => this.missions()); const s = this.s;
    body.append(el('div', 'brief', `<div class="br-mode">${MODES[m.mode].name} · ${DIFFS[m.diff].name}</div><p>${MODES[m.mode].desc}</p><p class="dim">${map.name}, ${map.place}. Par time ${fmtTime(m.par)}. ~${m.enemies} hostiles.</p>`));
    const zones = [1, 2, 3, 4].filter(z => map.ops.some(o => o[0] === 'F' && o[5] === String(z)));
    const entries = this.lastDeploy[m.map] || {}; TEAMS.forEach((t, i) => { if (!zones.includes(entries[i])) entries[i] = zones[i % zones.length]; });
    const ops = el('div', 'deploy-ops'); const ent = el('div', 'deploy-ent');
    const draw = () => {
      const U = UNITS.find(u => u.id === s.unit); const R = roster(s);
      ops.innerHTML = `<h4>Unit for this mission</h4>`; const us = el('div', 'chips'); for (const id of s.units) { const u = UNITS.find(x => x.id === id); if (!u) continue; const b = el('button', 'chip' + (id === s.unit ? ' on' : ''), u.name); b.onclick = () => { s.unit = id; roster(s); writeSave(s); sfx.ui(); draw(); }; us.append(b); }
      ops.append(us, el('div', 'perk', '★ ' + U.perk), el('small', 'dim', 'All teams come from this one unit. Buy more units in Squad → Units.'), el('h4', '', 'Squad — tap to change team'));
      for (const o of R) { const cls = CLASSES.find(c => c.id === o.cls); const unit = UNITS.find(u => u.id === o.unit); const w = WEAPONS.find(x => x.id === o.weapon);
        const r = el('div', 'dop'); const pi = charImg(opStyle(o), 'head', 'dpimg', 96, 112); pi.title = 'Tap for close-up'; pi.onclick = () => { sfx.ui(); this.closeup(o); }; r.innerHTML = `<span class="pc">${cls.icon}</span>`; r.append(pi); r.insertAdjacentHTML('beforeend', `<span class="dn"><b>${o.name}</b><small>${unit ? unit.name : ''} · ${w ? w.name : ''}</small></span>`);
        const tb = el('div', 'dteams'); for (const t of [...TEAMS, { id: -1, short: '—', css: '#555' }]) { const b = el('button', 'tsel' + (o.team === t.id ? ' on' : ''), t.short); b.style.setProperty('--tc', t.css); b.onclick = () => { o.team = t.id; sfx.ui(); writeSave(s); draw(); }; tb.append(b); }
        r.append(tb); ops.append(r); }
      ent.innerHTML = '<h4>Entry points</h4>';
      for (const t of TEAMS) { const n = R.filter(o => o.team === t.id).length; const row = el('div', 'erow', `<span class="tn" style="color:${t.css}">${t.name} <small>(${n})</small></span>`);
        for (const z of zones) { const b = el('button', 'esel' + (entries[t.id] === z ? ' on' : ''), String(z)); b.onclick = () => { entries[t.id] = z; sfx.ui(); draw(); }; row.append(b); }
        if (!n) row.classList.add('dim'); ent.append(row); }
      const st = s.stock; ent.append(el('div', 'kitline', `Gear: ✸ ${st.flash} flash · ● ${st.frag} frag · ☁ ${st.smoke} smoke · 💥 ${st.charge} charges · 🔓 ${st.lockpick} picks · ✚ ${st.medkit} medkits${st.drone ? ' · drone ' + st.drone : ''}`));
    };
    draw(); const cols = el('div', 'deploy-cols'); cols.append(ops, ent); body.append(cols);
    const go = this.btn('DEPLOY ▶', 'big primary deploybtn', () => { const squad = roster(s).filter(o => o.team >= 0); if (!squad.length) { this.app.toast('Assign at least one operator to a team.', 'bad'); return; } this.lastDeploy[m.map] = entries; this.app.startMission(m, squad, { ...entries }); });
    body.append(go);
  }
  aar(r) {
    const s = this.s; const m = r.mission;
    if (!r.applied) { r.applied = true; s.cash += r.cash; s.stats.missions++; s.stats.kills += r.kills; for (const k in r.used) s.stock[k] = Math.max(0, (s.stock[k] || 0) - r.used[k]);
      // the one-off training bonus is paid only on the first fully completed run (see game.js result)
      if (m.training) { if (r.win && !r.skipped) s.tutorialDone = true; } else if (r.win) { s.completed[m.id] = true; s.stars[m.id] = Math.max(s.stars[m.id] || 0, r.stars); if (!s.best[m.id] || r.time < s.best[m.id]) s.best[m.id] = Math.round(r.time); } writeSave(s); }
    const body = this.screen('aar', 'After-Action Report', null);
    body.append(el('div', 'aar-head ' + (r.win ? 'win' : 'lose'), `<div class="res">${r.win ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED'}</div><div class="mt">${m.title} — ${MODES[m.mode].name}</div>${stars(r.stars)}${r.reason ? `<div class="reason">${r.reason}</div>` : ''}`));
    const rows = [['Time', `${fmtTime(r.time)} <small>(par ${fmtTime(r.par)})</small>`], ['Shots fired', r.shots], ['Accuracy', r.acc + '%'], ['Hostiles neutralised', `${r.kills} / ${r.enemies}`], ['Operators wounded', r.wounded], ['Operators KIA', r.kia]];
    if (r.hostages) rows.push(['Hostages saved', r.win ? `${r.saved} / ${r.hostages}` : `0 / ${r.hostages} <small>(not extracted)</small>`]); if (r.vip) rows.push(['VIP', r.vip]);
    if (r.extra) for (const e of r.extra) rows.push(e);
    const used = Object.entries(r.used).filter(([k, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', '); if (used) rows.push(['Gear used', used]);
    rows.push(['Cash earned', `<b class="cash">+$${r.cash.toLocaleString()}</b>${r.aborted ? ' <small>(aborted — no pay)</small>' : !r.win ? ' <small>(failed — kill bonus only)</small>' : ''}`]);
    body.append(el('table', 'aar-tbl', rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')));
    body.append(el('div', 'aar-stars', `<div class="${r.win ? 'on' : ''}">★ Mission complete</div><div class="${r.win && r.underPar ? 'on' : ''}">★ Under par time</div><div class="${r.win && r.flawless ? 'on' : ''}">★ No operators or civilians lost</div>`));
    if (m.training) { body.querySelector('.aar-stars')?.remove(); body.append(el('div', 'tut-next', `<b>${r.win ? 'Training complete' : 'Training ended'}</b><p>Next steps: kit your operators out in the <b>Armory</b> (rifles, optics, armour, flashbangs) and recruit new special-forces units in the <b>Unit store</b>. Then pick your first operation on the world map.</p>`));
      const tb = el('div', 'aar-btns'); tb.append(this.btn('Armory ▶', 'primary', () => this.armory()), this.btn('Unit store ▶', 'primary', () => this.app.squadScreen ? this.app.squadScreen('units') : this.main()), this.btn('World map', '', () => this.missions()), this.btn('Replay tutorial', '', () => this.app.startTutorial())); body.append(tb); return; }
    const bt = el('div', 'aar-btns'); const finale = r.win && !s.ending && MISSIONS.every(x => s.completed[x.id]); if (finale) { s.ending = true; writeSave(s); }
    bt.append(this.btn('Retry', '', () => this.deploy(m)), finale ? this.btn('Campaign complete ▶', 'primary', () => this.ending()) : this.btn('Missions', 'primary', () => this.missions()), this.btn('Armory', '', () => this.armory()));
    body.append(bt);
  }
  closeup(o) {
    const st = opStats(o); const opt = ATTACHMENTS.find(a => a.id === o.optic), mz = ATTACHMENTS.find(a => a.id === o.muzzle); const m = el('div', 'modal'); const box = el('div', 'mbox');
    box.append(charImg(opStyle(o), 'body', 'bigimg', 300, 440), el('div', 'minfo', `<img class="flag" src="${flagURL(st.u.country)}"><h3>${o.name}</h3><small>${st.u.name} · ${st.c.name}</small><ul><li>▸ ${st.w.name}</li><li>◎ ${opt ? opt.name : 'Iron sights'} · ${mz ? mz.name : 'No muzzle'}</li><li>⛨ ${st.ar.name}</li><li>★ ${st.u.perk}</li></ul><small class="dim">Tap anywhere to close</small>`));
    m.append(box); m.onclick = () => m.remove(); document.body.append(m);
  }
  armory(tab = 'weapons') {
    if (this.app.market) return this.app.market(tab); // B4: expanded marketplace (src/market2.js)
    const s = this.s; const body = this.screen('armory', 'Armory', () => this.main()); const ts = totalStars(s);
    const tabs = el('div', 'tabs'); for (const [id, n] of [['weapons', 'Weapons'], ['att', 'Attachments'], ['armor', 'Armour'], ['gadgets', 'Gadgets']]) { const b = el('button', 'tab' + (tab === id ? ' on' : ''), n); b.onclick = () => { sfx.ui(); this.armory(id); }; tabs.append(b); }
    body.append(tabs); const list = el('div', 'shoplist cards'); body.append(list);
    const buy = (price, fn) => { if (s.cash < price) { sfx.lose(); return; } s.cash -= price; fn(); writeSave(s); sfx.click(); this.armory(tab); };
    const row = (name, desc, price, req, owned, onBuy, label, pic) => { const lock = (req || 0) > ts; const r = el('div', 'shoprow card' + (owned ? ' owned' : '') + (lock ? ' locked' : ''), `<div class="si"><b>${name}</b><small>${desc}</small></div>`); if (pic) r.prepend(pic);
      const b = el('button', 'buy', owned ? 'Owned' : lock ? `🔒 ${req}★` : (label || 'Buy') + ` $${price}`); if (!owned && !lock) { b.onclick = () => buy(price, onBuy); if (s.cash < price) b.classList.add('poor'); } else b.disabled = true; r.append(b); list.append(r); };
    if (tab === 'weapons') { const types = [...new Set(WEAPONS.map(w => w.type))]; for (const t of types) { list.append(el('h4', 'shop-h', t.toUpperCase())); for (const w of WEAPONS.filter(w => w.type === t)) row(w.name, `DMG ${w.dmg} · ${w.rof}/s · ACC ${Math.round(w.acc * 100)} · RNG ${w.range}m · MAG ${w.mag} · noise ${w.noise}m · speed ${Math.round(w.mob * 100)}%`, w.price, w.stars, s.owned.weapons.includes(w.id), () => s.owned.weapons.push(w.id), null, itemImg('weapon', w)); } }
    if (tab === 'att') for (const a of ATTACHMENTS) row(a.name, `${a.slot} · ${a.desc || 'Standard'}`, a.price, a.stars, s.owned.att.includes(a.id), () => s.owned.att.push(a.id), null, a.id === 'none' ? null : itemImg('att', a));
    if (tab === 'armor') for (const a of ARMOR) row(a.name, `Damage -${Math.round(a.red * 100)}% · speed ${Math.round(a.mob * 100)}%`, a.price, a.stars, s.owned.armor.includes(a.id), () => s.owned.armor.push(a.id), null, itemImg('armor', a));
    if (tab === 'gadgets') for (const g of GADGETS) row(`${g.name} <i class="have">×${s.stock[g.id] || 0}</i>`, g.desc, g.price, g.stars, false, () => s.stock[g.id] = (s.stock[g.id] || 0) + 1, '+1', itemImg('gadget', g));
  }
  squadLite() { const body = this.screen('squad', 'Squad', () => this.main()); for (const o of roster(this.s)) body.append(el('div', 'dop', `<b>${o.name}</b> <small>${o.cls} · ${o.weapon}</small>`)); }
  settings() {
    const s = this.s; const body = this.screen('settings', 'Settings', () => this.main()); const st = s.settings;
    const row = (label, val, fn) => { const b = el('button', 'pm-row', `${label}: <b>${val()}</b>`); b.onclick = () => { fn(); writeSave(s); sfx.ui(); b.innerHTML = `${label}: <b>${val()}</b>`; }; body.append(b); };
    row('Graphics quality', () => st.quality, () => { st.quality = { auto: 'low', low: 'medium', medium: 'high', high: 'auto' }[st.quality] || 'auto'; const rl = this.app.applyQuality(); let n = body.querySelector('.q-reload'); if (rl && !n) { writeSave(s); n = el('button', 'pm-row q-reload', '↻ Reload to apply antialiasing'); n.onclick = () => location.reload(); body.querySelector('.pm-row').after(n); } else if (!rl && n) n.remove(); });
    row('Enemy vision cones', () => st.cones ? 'On' : 'Off', () => st.cones = !st.cones);
    row('Operator sight lines', () => ({ all: 'All', sel: 'Selected', off: 'Off' })[st.sight || 'all'], () => st.sight = ({ all: 'sel', sel: 'off', off: 'all' })[st.sight || 'all']);
    row('Breach cinematics', () => st.cine ? 'On' : 'Off', () => st.cine = !st.cine);
    row('Sound', () => st.sound ? 'On' : 'Muted', () => { st.sound = !st.sound; setMix(audioMix(st)); });
    const slider = (label, min, max, step, get, set, fmt) => { const w = el('label', 'pm-row slider', `<span>${label}: <b>${fmt(get())}</b></span>`); const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = get();
      r.oninput = () => { set(+r.value); w.querySelector('b').textContent = fmt(+r.value); }; r.onchange = () => { writeSave(s); sfx.ui(); }; w.append(r); body.append(w); return r; };
    const pct = v => Math.round(v * 100) + '%';
    { const r = slider('Master volume', 0, 1, 0.05, () => st.volume ?? 0.8, v => { st.volume = v; setMix(audioMix(st)); }, pct); r.classList.add('vol'); r.addEventListener('change', () => sfx.shot(false, 0.7, 'm4a1')); } // w4: release the slider to hear the level
    slider('Music', 0, 1, 0.05, () => st.music ?? 0.55, v => { st.music = v; setMix(audioMix(st)); }, pct).classList.add('vol-music');
    { const r = slider('Sound effects', 0, 1, 0.05, () => st.sfx ?? 0.9, v => { st.sfx = v; setMix(audioMix(st)); }, pct); r.classList.add('vol-sfx'); r.addEventListener('change', () => { sfx.step(1, 'tile'); sfx.shot(false, 0.8, 'ak74m'); }); } // w4
    { const r = slider('Radio voice', 0, 1, 0.05, () => st.voice ?? 0.85, v => { st.voice = v; setMix(audioMix(st)); }, pct); r.classList.add('vol-voice'); r.addEventListener('change', () => radio.say('move', 0, 2)); }
    slider('Camera sensitivity', 0.4, 2, 0.1, () => st.sens || 1, v => { st.sens = v; this.app.env.cam.sens = v; }, v => v.toFixed(1) + '×').classList.add('sens');
    if (s.ending) { const c = el('button', 'pm-row', 'View campaign ending &amp; credits'); c.onclick = () => this.ending(); body.append(c); }
    { const cr = el('div', 'help credits', `<h4>Credits</h4><p>Tactical Soldier by MissingTray1151 (Sketchfab), CC BY 4.0 · three.js (MIT) · Natural Earth (public domain)</p>`); const cb = el('button', 'pm-row', 'Credits &amp; licences ›'); cb.onclick = () => { sfx.ui(); this.credits(() => this.settings()); }; cr.append(cb); body.append(cr); }
    const rs = el('button', 'pm-row bad', 'Reset all progress'); rs.onclick = () => { if (confirm('Erase all progress, cash and squad?')) { this.app.save = defaultSave(); writeSave(this.app.save); const ns = this.app.save.settings; setMix(audioMix(ns)); this.app.env.cam.sens = ns.sens || 1; this.app.applyQuality(); this.main(); } }; body.append(rs);
    const tut = el('button', 'pm-row', '🎯 Replay tutorial <b>(Fort Liberty kill house)</b>'); tut.onclick = () => this.app.startTutorial(); body.append(tut);
    body.append(el('h4', 'shop-h', 'CONTROLS'));
    row('Edge-scroll camera (mouse at screen edge)', () => st.edgeScroll ? 'On' : 'Off', () => { st.edgeScroll = !st.edgeScroll; this.app.applyCamSettings(); });
    if (fsSupported()) { const fs = el('button', 'pm-row', 'Fullscreen <b>⛶</b>'); fs.onclick = () => toggleFullscreen(); body.append(fs); }
    body.append(el('div', 'help ctl-help', controlsHTML(st)));
    const kb = el('div', 'keybinds'); body.append(el('h4', 'shop-h', 'KEY BINDINGS — click a key, then press the new key (Esc cancels)'), kb);
    const draw = () => { const B = bindings(st); kb.innerHTML = ''; for (const [id, label] of ACTIONS) { const r = el('div', 'keyrow', `<span>${label}</span>`); const k = el('button', '', B[id].map(keyName).join(' / ')); k.dataset.act = id;
      k.onclick = () => { k.classList.add('wait'); k.textContent = 'press…'; const on = (e) => { e.preventDefault(); e.stopPropagation(); removeEventListener('keydown', on, true); if (e.code !== 'Escape') { const err = rebind(st, id, e.code); if (err) this.app.toast(err, 'bad'); else writeSave(s); } draw(); }; addEventListener('keydown', on, true); };
      r.append(k); kb.append(r); } const rst = el('button', 'pm-row', 'Reset key bindings to defaults'); rst.onclick = () => { st.keys = {}; writeSave(s); draw(); }; kb.append(rst); };
    draw();
  }
}

// ---------- world map: 1-finger/mouse drag pans, pinch/wheel zooms; labels avoid each other ----------
function installMapGestures(menus, wm, inner, zb) {
  const z = menus.wmz; const ptr = new Map(); let pd = 0, moved = 0;
  const clamp = () => { const W = wm.clientWidth, H = wm.clientHeight; z.s = Math.max(1, Math.min(5, z.s)); z.x = Math.min(0, Math.max(W - W * z.s, z.x)); z.y = Math.min(0, Math.max(H - H * z.s, z.y)); };
  const apply = (relayout) => { clamp(); wm.classList.toggle('compact', wm.clientWidth < 760 && z.s < 1.6); inner.style.transform = `translate(${z.x}px,${z.y}px) scale(${z.s})`; inner.style.setProperty('--is', 1 / z.s); wm.classList.toggle('zoomed', z.s > 1.01); if (relayout) layoutLabels(inner); };
  const zoomAt = (f, cx, cy) => { const r = wm.getBoundingClientRect(); const px = cx - r.left, py = cy - r.top; const ns = Math.max(1, Math.min(5, z.s * f)); const k = ns / z.s; z.x = px - (px - z.x) * k; z.y = py - (py - z.y) * k; z.s = ns; };
  menus.wmReset = () => { z.s = 1; z.x = 0; z.y = 0; apply(true); };
  let lt = 0; const relayoutSoon = () => { clearTimeout(lt); lt = setTimeout(() => layoutLabels(inner), 120); };
  wm.addEventListener('pointerdown', e => { ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptr.size === 1) moved = 0; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pd = Math.hypot(a.x - b.x, a.y - b.y); moved = 99; } });
  wm.addEventListener('pointermove', e => { const q = ptr.get(e.pointerId); if (!q) return; const dx = e.clientX - q.x, dy = e.clientY - q.y; q.x = e.clientX; q.y = e.clientY;
    if (ptr.size === 1) { moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { if (!wm.hasPointerCapture?.(e.pointerId)) wm.setPointerCapture?.(e.pointerId); z.x += dx; z.y += dy; apply(); } }
    else if (ptr.size === 2) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pd > 0) zoomAt(d / pd, (a.x + b.x) / 2, (a.y + b.y) / 2); pd = d; apply(); relayoutSoon(); } });
  const up = e => { ptr.delete(e.pointerId); pd = 0; if (!ptr.size) relayoutSoon(); }; wm.addEventListener('pointerup', up); wm.addEventListener('pointercancel', up);
  wm.addEventListener('click', e => { if (moved > 6) { e.stopPropagation(); e.preventDefault(); } moved = 0; }, true);
  wm.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.deltaY > 0 ? 0.85 : 1.18, e.clientX, e.clientY); apply(); relayoutSoon(); }, { passive: false });
  zb.addEventListener('pointerdown', e => e.stopPropagation()); zb.onclick = (e) => { const f = +(e.target.dataset.z ?? -1); if (f < 0) return; e.stopPropagation(); if (f === 0) return menus.wmReset(); const r = wm.getBoundingClientRect(); zoomAt(f, r.left + r.width / 2, r.top + r.height / 2); apply(true); };
  const img = inner.querySelector('.wm-bg'); const go = () => requestAnimationFrame(() => apply(true)); if (img.complete) go(); else img.onload = go;
}
// Greedy label placement, highest priority first (selected region, then open, then locked). Each label tries 8 sides at full size, then 8 sides
// with the details line dropped ('lsm'); a label that still touches another label or pin is hidden ('lhide', shown on hover/focus) so none ever overlap.
function layoutLabels(inner) {
  const pins = [...inner.querySelectorAll('.pin')]; const box = inner.parentElement.getBoundingClientRect();
  pins.forEach(p => p.classList.remove('lsm', 'lhide')); const placed = pins.map(p => p.querySelector('i').getBoundingClientRect());
  const area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const out = (r) => Math.max(0, box.left - r.left) * r.height + Math.max(0, r.right - box.right) * r.height + Math.max(0, box.top - r.top) * r.width + Math.max(0, r.bottom - box.bottom) * r.width;
  const gap = (a, b) => Math.hypot(Math.max(0, a.left - b.right, b.left - a.right), Math.max(0, a.top - b.bottom, b.top - a.bottom)); const pinR = placed.slice();
  const pr = (p) => p.classList.contains('on') ? 0 : p.classList.contains('locked') ? 2 : 1;
  const order = pins.map((p, i) => i).sort((a, b) => pr(pins[a]) - pr(pins[b]) || placed[a].left - placed[b].left);
  const pad = (r) => ({ left: r.left - 1, right: r.right + 1, top: r.top - 1, bottom: r.bottom + 1, width: r.width + 2, height: r.height + 2 });
  for (const i of order) { const p = pins[i]; const pref = p.dataset.side || 'r'; const sides = [pref, ...['r', 'l', 'u', 'd', 'ur', 'dr', 'ul', 'dl'].filter(x => x !== pref)];
    let best = null, bs = 1e18, bh = 1e18;
    for (const sm of [false, true]) { p.classList.toggle('lsm', sm);
      for (const side of sides) { p.dataset.at = side; const r = pad(p.querySelector('span').getBoundingClientRect()); let hard = 0; placed.forEach((q, j) => { if (j !== i) hard += area(r, q); });
        let sc = out(r) * 4 + (side === pref ? 0 : 1) + (sm ? 40 : 0) + hard * 3; const own = gap(r, pinR[i]); pinR.forEach((q, j) => { if (j !== i) { const d = gap(r, q); if (d < own + 26) sc += (own + 26 - d) * 60; } }); // a label nearer (or nearly as near) to someone else's pin reads as theirs
        if (hard < 0.5 && bh >= 0.5) bs = 1e18; // any overlap-free spot beats every overlapping one
        if ((hard < 0.5 || bh >= 0.5) && sc < bs) { bs = sc; best = [side, sm]; bh = hard; } if (sc < 1) break; }
      if (bh < 0.5) break; }
    p.dataset.at = best[0]; p.classList.toggle('lsm', best[1]);
    if (bh >= 0.5) { p.classList.add('lhide'); continue; } placed.push(p.querySelector('span').getBoundingClientRect()); }
}
