// BATCH 4 — in-mission side of the marketplace: gear effects, the Kit menu (NVG, scope, new consumables),
// stage quit. Installed from main.js; wraps App.startMission / App.endGame and TacCam.update from outside
// so game.js / hud.js / camera.js stay untouched apart from one input.js line (stinger / CS throw modes).
import { el } from './util.js';
import { sfx } from './audio.js';
import { ZOOM, CONSUMABLES, ensureB4, gearMods } from './market-data.js';
import { WEAPONS } from './data.js';

const NVG_EFF = { night: 1, dusk: 0.6, overcast: 0.2, day: 0 };
const baseFov = () => innerWidth < innerHeight ? 62 : 45;
export function opticZoom(cfg) { const w = WEAPONS.find(x => x.id === cfg.weapon); let o = cfg.optic || 'iron'; if (w && w.type === 'dmr' && ['iron', 'reddot', 'holo', 'laser'].includes(o)) return 3.4; return ZOOM[o] || 1.3; }

export function installMissionKit(app) {
  const start = app.startMission.bind(app);
  app.startMission = function (mission, squad, entries) { const r = start(mission, squad, entries); try { if (app.game && !mission.training) setupKit(app, app.game); else hideKit(app); } catch (e) { console.error('missionkit', e); } return r; };
  const end = app.endGame.bind(app);
  app.endGame = function () { clearVisuals(app); return end(); };
  const cam = app.env.cam, upd = cam.update.bind(cam); let zf = 1, zoomed = false;
  cam.update = function (rdt) { upd(rdt); const g = app.game; let want = 1;
    if (g && g.kit && g.kit.ads) { if (cam.mode !== 'shoulder' || !cam.follow) { g.kit.ads = false; syncKit(app); } else want = cam.follow.zoom || 1.3; }
    zf += (want - zf) * Math.min(1, rdt * 8); if (Math.abs(zf - want) < 0.005) zf = want;
    const ov = app.hud.adsOv; if (ov) ov.classList.toggle('show', want > 1 && zf > 1.05);
    if (g && (zf !== 1 || want !== 1 || zoomed)) { app.camera.fov = baseFov() / zf; app.camera.updateProjectionMatrix(); zoomed = zf !== 1; } };
  addEventListener('keydown', (e) => { const g = app.game; if (!g || g.over || !g.kit || e.repeat) return; const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.code === 'KeyN') { toggleNvg(app); e.preventDefault(); } else if (e.code === 'KeyK') { toggleKitMenu(app); e.preventDefault(); } else if (e.code === 'KeyL') { toggleAds(app); e.preventDefault(); } });
}

function ui(app) { const h = app.hud; if (h.kitBtn) return h;
  h.kitBtn = el('button', 'hbtn small kitb', '🎒<span class="kb-lb">Kit</span>'); h.kitBtn.title = 'Kit: night vision (N), scope (L), stinger / CS gas, sensor, trauma kit, stim (K)';
  h.top.insertBefore(h.kitBtn, h.menuBtn); h.kitBtn.onclick = (e) => { e.stopPropagation(); toggleKitMenu(app); };
  h.kitMenu = el('div', 'kitmenu hidden'); h.nvgOv = el('div', 'nvg-ov'); h.adsOv = el('div', 'ads-ov', '<i></i>');
  h.root.prepend(h.nvgOv, h.adsOv); h.root.append(h.kitMenu); // overlays sit beneath HUD controls
  for (const ev of ['pointerdown', 'wheel']) h.kitMenu.addEventListener(ev, e => e.stopPropagation());
  // close the kit menu with the other HUD menus
  const cm = h.closeMenus.bind(h); h.closeMenus = function () { h.kitMenu.classList.add('hidden'); return cm(); };
  const ao = h.anyOpen.bind(h); h.anyOpen = function () { return ao() || !h.kitMenu.classList.contains('hidden'); };
  return h; }
function hideKit(app) { const h = app.hud; if (h.kitBtn) { h.kitBtn.style.display = 'none'; h.kitMenu.classList.add('hidden'); } clearVisuals(app); }
function clearVisuals(app) { const h = app.hud; const cv = app.renderer && app.renderer.domElement; if (cv) cv.classList.remove('nvg-on'); if (h.nvgOv) h.nvgOv.classList.remove('show'); if (h.adsOv) h.adsOv.classList.remove('show'); app.camera.fov = baseFov(); app.camera.updateProjectionMatrix(); }

export function setupKit(app, g) {
  const s = ensureB4(app.save); const h = ui(app); h.kitBtn.style.display = ''; clearVisuals(app);
  const time = (g.level.def.theme && g.level.def.theme.time) || 'day'; g.kit = { nvg: false, ads: false, time, ammo: [] };
  for (const u of g.ops) { const gm = gearMods(u.cfg); if (gm.mag) { u.mag = Math.max(1, Math.round(u.mag * gm.mag.mag)); u.ammo = u.mag; u.reload *= gm.mag.reload; }
    if (u.cfg.optic === 'thermal') u.sight *= 1.2; u.baseSight = u.sight; u.nvgMul = gm.nvg.mul || 1; u.nvgName = gm.nvg.id !== 'none' ? gm.nvg.name : null; u.flashProof = !!gm.helmet.flashProof; u.zoom = opticZoom(u.cfg);
    const ar = u.cfg.armor === 'eod'; if (ar) u.blastRed = 0.5; }
  // ammo crates the player chose to bring (Armory → Ammo, or the stage screen): one crate per mission, whole squad
  for (const c of CONSUMABLES.filter(c => c.ammo)) if (s.loadout[c.id] && g.pool[c.id] > 0) { g.pool[c.id]--; g.kit.ammo.push(c.name.replace(/ \(crate\)/, ''));
    for (const u of g.ops) { const a = c.ammo; if (a.dmg) u.dmg *= a.dmg; if (a.noise) u.noise *= a.noise; if (a.acc) u.acc *= a.acc; if (a.range) u.range *= a.range; if (a.aim) u.aim *= a.aim; } }
  if (g.kit.ammo.length) setTimeout(() => app.game === g && g.toast('Loaded: ' + g.kit.ammo.join(', '), 'good'), 900);
  // per-instance wrappers (no edits to game.js)
  const dmg = g.damage.bind(g); g.damage = function (t, d, src, explosive = false) { if (explosive && t.blastRed) d *= 1 - t.blastRed; return dmg(t, d, src, explosive); };
  const throwN = g.throwNade.bind(g); g.throwNade = function (u, gadget, x, z, fuse) { if (gadget !== 'stinger' && gadget !== 'cs') return throwN(u, gadget, x, z, fuse); if (!(g.pool[gadget] > 0)) return; g.pool[gadget]--;
    g.fx.throwNade(u.x, u.z, x, z, 0.45, () => g.timers.push({ t: fuse ?? (gadget === 'cs' ? 0.3 : 0.5), fn: () => g.detonate(u, gadget, x, z) })); g.toast(`${u.name}: ${gadget === 'cs' ? 'Gas, gas, gas!' : 'Stinger out!'}`); };
  const det = g.detonate.bind(g); g.detonate = function (u, k, x, z) { const L = g.level;
    if (k === 'stinger') { g.fx.flash(x, z); sfx.flash(); for (const e of g.enemies) { if (!e.alive) continue; const d = Math.hypot(e.x - x, e.z - z); if (d < 5 && L.los(x, z, e.x, e.z)) { e.stun = Math.max(e.stun, 2.5 * (u.flashT || 1)); e.state = 'combat'; g.damage(e, 20, u, false); } } g.noise(x, z, 12, u); return; }
    if (k === 'cs') { sfx.door(); g.fx.smokeCloud(x, z, 12); for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) { if (xx * xx + yy * yy > 10) continue; const i = L.cellOf(x + xx, z + yy); if (i >= 0 && L.los(x, z, x + xx, z + yy, false)) L.smoke[i] = 10; }
      for (const e of g.units) { if (!e.alive || e.kind === 'vip') continue; const d = Math.hypot(e.x - x, e.z - z); if (d < 3.4 && L.los(x, z, e.x, e.z, false)) { if (e.kind === 'enemy') { e.stun = Math.max(e.stun, 6); e.state = 'combat'; } else if (e.kind === 'op' && d < 1.6) e.stun = Math.max(e.stun, 0.6); } } g.noise(x, z, 8, u); return; }
    const keep = k === 'flash' ? g.ops.filter(o => o.flashProof).map(o => [o, o.stun]) : null; const r = det(u, k, x, z); if (keep) for (const [o, st] of keep) o.stun = st; return r; };
  h.kitMenu.classList.add('hidden'); syncKit(app);
}

const selOps = (g) => { const s = g.selected().filter(u => u.alive); return s.length ? s : g.opsAlive.slice(0, 1); };
export function toggleNvg(app, force) { const g = app.game; if (!g || !g.kit) return; const has = g.ops.some(u => u.nvgName); if (!has) { g.toast('No NVGs equipped — buy them in Armory → Night vision, then equip.', 'bad'); return; }
  const k = g.kit; k.nvg = force ?? !k.nvg; const eff = NVG_EFF[k.time] ?? 0;
  for (const u of g.ops) u.sight = u.baseSight * (k.nvg && u.nvgName ? 1 + (u.nvgMul - 1) * eff : 1);
  app.renderer.domElement.classList.toggle('nvg-on', k.nvg); app.hud.nvgOv.classList.toggle('show', k.nvg); sfx.ui();
  if (k.nvg) g.toast(eff >= 1 ? 'NVG on — night sight boosted' : eff > 0 ? 'NVG on — partial boost in this light' : 'NVG on — washed out in daylight, no sight bonus', eff > 0 ? 'good' : 'info'); else g.toast('NVG off', 'info');
  g.updateVision && g.updateVision(); syncKit(app); }
export function toggleAds(app) { const g = app.game; if (!g || !g.kit) return; const cam = app.env.cam, h = app.hud;
  if (g.kit.ads) { g.kit.ads = false; g.toast('Scope off', 'info'); } else { const op = h.camOp(); if (!op) return; if (cam.mode !== 'shoulder' || cam.follow !== op) { cam.setFollow(op, 'shoulder'); h.syncCamBtn(false); } g.kit.ads = true; g.toast(`Scope: ${op.name} — ${(op.zoom || 1).toFixed(1)}× (${optName(op)})`, 'info'); }
  sfx.ui(); syncKit(app); }
const optName = (u) => ({ iron: 'iron sights', reddot: 'red dot', holo: 'holo', acog: 'ACOG 4x', laser: 'laser', prism: 'prism 2.5x', lpvo: 'LPVO', sniper8: '8x scope', thermal: 'thermal' })[u.cfg.optic] || u.cfg.optic;
export function useItem(app, id) { const g = app.game; if (!g || g.over) return false; const n = g.pool[id] || 0; if (n <= 0) { g.toast(`No ${id === 'cs' ? 'CS gas' : id} left — buy more in the Armory`, 'bad'); return false; }
  if (id === 'stinger' || id === 'cs') { app.input.setMode(id); app.hud.kitMenu.classList.add('hidden'); return true; }
  if (id === 'sensor') { g.pool.sensor--; g.reveal = Math.max(g.reveal || 0, 5); g.updateVision && g.updateVision(); g.toast('Heartbeat sensor: hostiles revealed for 5 s', 'good'); }
  if (id === 'trauma') { const t = selOps(g).filter(u => u.hp < u.maxHp).sort((a, b) => a.hp - b.hp)[0]; if (!t) { g.toast('Selected operators are at full health', 'info'); return false; } g.pool.trauma--; t.hp = t.maxHp; t.wounded = false; g.toast(`${t.name} patched up with a trauma kit`, 'good'); }
  if (id === 'stim') { const L = selOps(g).filter(u => !u.stimmed); if (!L.length) return false; g.pool.stim--; for (const u of L) { u.stimmed = true; u.speed *= 1.35; u.aim *= 0.75; } g.timers.push({ t: 12, fn: () => { for (const u of L) { u.stimmed = false; u.speed /= 1.35; u.aim /= 0.75; } } }); g.toast(`Stim: ${L.map(u => u.name).join(', ')} +35% speed for 12 s`, 'good'); }
  sfx.ui(); syncKit(app); return true; }
export function toggleKitMenu(app, force) { const h = ui(app); const show = force ?? h.kitMenu.classList.contains('hidden'); if (show) { h.closeMenus(); syncKit(app); } h.kitMenu.classList.toggle('hidden', !show); }
export function syncKit(app) { const g = app.game, h = app.hud; if (!g || !g.kit || !h.kitMenu) return; const m = h.kitMenu; const k = g.kit; const p = g.pool;
  const has = g.ops.some(u => u.nvgName); const op = h.camOp && h.camOp();
  m.innerHTML = `<div class="km-h"><b>Kit</b><small>${k.ammo.length ? 'Ammo: ' + k.ammo.join(', ') : 'Standard ball ammo'}</small><button class="km-x">✕</button></div>`;
  const row = (id, ic, name, sub, on, dis, fn, cnt) => { const b = el('button', 'km-row' + (on ? ' on' : '') + (dis ? ' dis' : ''), `<span class="ic">${ic}</span><span class="km-n"><b>${name}</b><small>${sub}</small></span>${cnt != null ? `<i class="km-c">×${cnt}</i>` : ''}`); b.dataset.id = id; b.onclick = (e) => { e.stopPropagation(); if (!dis) fn(); }; m.append(b); };
  row('nvg', '◐', 'Night vision ' + (k.nvg ? 'ON' : 'off'), has ? `N · ${k.time} map` : 'none equipped', k.nvg, !has, () => toggleNvg(app));
  row('ads', '⌖', 'Scope ' + (k.ads ? 'ON' : 'off'), op ? `L · ${op.name} ${(op.zoom || 1).toFixed(1)}× ${optName(op)}` : 'L', k.ads, !op, () => toggleAds(app));
  for (const [id, ic, name, sub] of [['stinger', '✺', 'Stinger', 'throw · stun 5 m'], ['cs', '♨', 'CS gas', 'throw · stun 6 s'], ['sensor', '♥', 'Heartbeat sensor', 'reveal 5 s'], ['trauma', '✚', 'Trauma kit', 'heal selected'], ['stim', '⚡', 'Stim', 'selected +35% speed']]) row(id, ic, name, sub, false, !(p[id] > 0), () => useItem(app, id), p[id] || 0);
  if (g.mission.stage) row('quit', '⏏', 'Quit stage', 'cleared stages are kept', false, false, () => { h.kitMenu.classList.add('hidden'); h.onAbort && h.onAbort(); });
  m.querySelector('.km-x').onclick = (e) => { e.stopPropagation(); m.classList.add('hidden'); };
  h.kitBtn.classList.toggle('on', k.nvg || k.ads); }
