/* Sandbox, first person, armoury extras, and the credits pass. */
(function () {
  const SPEEDS = [0.5, 1, 2, 3];
  const COUNTS = [8, 14, 22];
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const mapName = (key) => (window.__zuluPlaces && window.__zuluPlaces.maps && window.__zuluPlaces.maps[key] && window.__zuluPlaces.maps[key].name) || key;

  function commandTeams(g) {
    const L = g.level;
    const foes = (g.enemies || []).filter((e) => e.alive);
    if (!foes.length || !L || !L.findPath) return 0;
    const used = new Set();
    let n = 0;
    for (const t of [0, 1, 2]) {
      const units = g.ops.filter((o) => o.alive && o.team === t);
      if (!units.length) continue;
      const busy = units.some((u) => (u.orders && u.orders.length) || u.cur) || (g.breaches || []).some((b) => b.phase !== 'done' && b.units && b.units.some((u) => units.includes(u)));
      if (busy) continue;
      const lead = units[0];
      const near = foes.map((e) => ({ e, d: Math.hypot(e.x - lead.x, e.z - lead.z) })).sort((a, b) => a.d - b.d);
      const hp = lead.hp / (lead.maxHp || 100);
      if (hp < 0.4 && near[0] && near[0].d < 9 && g.orderMove) {
        const e = near[0].e;
        const dx = lead.x - e.x, dz = lead.z - e.z, len = Math.hypot(dx, dz) || 1;
        g.orderMove(units, lead.x + dx / len * 5, lead.z + dz / len * 5);
        n++;
        continue;
      }
      for (const { e } of near) {
        if (used.has(e)) continue;
        const path = L.findPath(Math.floor(lead.x), Math.floor(lead.z), Math.floor(e.x), Math.floor(e.z), {});
        if (!path || !path.length) continue;
        const door = path.map((c) => (L.doors || []).find((d) => d.i === c)).find((d) => d && d.state === 'closed');
        if (door && g.orderBreach) {
          const method = door.locked || door.trapped ? 'charge' : 'kick';
          const allowed = !(g.canBreach && g.canBreach(units, method));
          if (allowed && g.orderBreach(units, door, method, false, false)) { used.add(e); n++; break; }
        }
        if (g.orderMove) { g.orderMove(units, e.x, e.z); used.add(e); n++; break; }
      }
    }
    return n;
  }

  function smart(g, dt) {
    if (!g || g.over) return;
    if (g.mission && g.mission.sandbox && !g.paused) {
      g.w1cmdT = (g.w1cmdT ?? 0.4) - dt;
      if (g.w1cmdT <= 0) { g.w1cmdT = 1; g.w1cmds = (g.w1cmds || 0) + commandTeams(g); }
    }
    g.smartT = (g.smartT || 0) - dt;
    if (g.smartT > 0 || !g.level || !g.level.findPath) return;
    g.smartT = 2;
    for (const e of g.enemies || []) {
      if (!e.alive || e.hp > (e.maxHp || 100) * 0.35) continue;
      if (e.path && e.path.length) continue;
      const op = (g.ops || []).filter((o) => o.alive).sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
      if (!op) continue;
      const dx = e.x - op.x, dz = e.z - op.z, len = Math.hypot(dx, dz) || 1;
      const tx = Math.floor(e.x + dx / len * 4), tz = Math.floor(e.z + dz / len * 4);
      if (g.level.inb && !g.level.inb(tx, tz)) continue;
      g.pathTo && g.pathTo(e, g.level.idx ? g.level.idx(tx, tz) : tz * g.level.W + tx, { enemy: true });
    }
  }

  function arm(g) {
    const P = g.constructor && g.constructor.prototype;
    if (!P || P.__smart) return;
    P.__smart = true;
    const step = P.step;
    P.step = function (dt) { const r = step.call(this, dt); try { smart(this, dt); } catch (e) { window.__smartErr = String(e && e.stack || e); } return r; };
  }

  const fps = { on: false, pitch: 0, keys: {}, op: null, fov: null, last: 0, look: false };
  function walkable(g, x, z) {
    const L = g.level;
    if (!L || x < 0.2 || z < 0.2 || x > L.W - 0.2 || z > L.H - 0.2) return false;
    const t = L.type[(Math.floor(z) * L.W) + Math.floor(x)];
    return t === 0 || t === 3 || t === 5;
  }
  function fpsMove(g, dt) {
    const op = fps.op;
    if (!op || !op.alive || !fps.on) return;
    op.orders = []; op.cur = null; op.path = []; op.hold = true;
    let x = 0, z = 0;
    if (fps.keys.KeyW || fps.touch.y < -0.2) z += 1;
    if (fps.keys.KeyS || fps.touch.y > 0.2) z -= 1;
    if (fps.keys.KeyA || fps.touch.x < -0.2) x -= 1;
    if (fps.keys.KeyD || fps.touch.x > 0.2) x += 1;
    const len = Math.hypot(x, z) || 1;
    if (x || z) {
      const sp = (op.speed || 2.4) * dt;
      const nx = op.x + (Math.sin(op.ang) * z + Math.cos(op.ang) * x) / len * sp;
      const nz = op.z + (Math.cos(op.ang) * z - Math.sin(op.ang) * x) / len * sp;
      if (walkable(g, nx, op.z)) op.x = nx;
      if (walkable(g, op.x, nz)) op.z = nz;
      op.moving = true;
    }
    if (fps.fire) {
      let best = null, bd = 0.45;
      for (const e of g.enemies || []) {
        if (!e.alive) continue;
        let d = Math.atan2(e.x - op.x, e.z - op.z) - op.ang;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        const dist = Math.hypot(e.x - op.x, e.z - op.z);
        if (Math.abs(d) < bd && dist < (op.range || 24)) { bd = Math.abs(d); best = e; }
      }
      if (best && g.fire) g.fire(op, best);
    }
  }
  fps.touch = { x: 0, y: 0 };
  function applyCam(camera) {
    const g = window.__game;
    if (g && g.mission && g.mission.sandbox && g.paused && g.setPaused) g.setPaused(false);
    const op = fps.op;
    if (!fps.on || !g || !op || !op.alive) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - (fps.last || now)) / 1000);
    fps.last = now;
    fpsMove(g, dt);
    const eye = 1.55;
    const cp = Math.cos(fps.pitch), sp = Math.sin(fps.pitch);
    camera.position.set(op.x, eye, op.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(op.x + Math.sin(op.ang) * cp * 8, eye + sp * 8, op.z + Math.cos(op.ang) * cp * 8);
    if (fps.fov == null) fps.fov = camera.fov;
    camera.fov = 74;
    if (camera.updateProjectionMatrix) camera.updateProjectionMatrix();
  }
  function setFps(on) {
    const g = window.__game;
    fps.on = on && !!(g && g.ops && g.ops.some((o) => o.alive));
    const ui = document.querySelector('.zfps');
    if (ui) ui.classList.toggle('on', fps.on);
    const btn = document.querySelector('.zfps-btn');
    if (btn) btn.textContent = fps.on ? 'Tactical' : '1st person';
    if (!fps.on) {
      fps.op = null;
      if (document.pointerLockElement) document.exitPointerLock();
      const cam = window.__app && window.__app.camera;
      if (cam && fps.fov != null) { cam.fov = fps.fov; cam.updateProjectionMatrix && cam.updateProjectionMatrix(); }
      return;
    }
    const op = (g.sel && g.sel.op && g.sel.op.alive && g.sel.op) || g.ops.find((o) => o.alive);
    fps.op = op;
    if (g.selectOp && op) g.selectOp(op);
    if (g.env && g.env.cam && g.env.cam.stopFollow) g.env.cam.stopFollow();
    if (g.setPaused) g.setPaused(false);
  }

  function sandboxEnd(app, r) {
    document.querySelector('.w1sbx-bar')?.remove();
    if (app.hud && app.hud.hide) app.hud.hide();
    if (app.input && app.input.setGame) app.input.setGame(null);
    if (app.endGame) app.endGame();
    const win = !!(r && r.win);
    const body = app.menus.screen('sandbox-end', 'AI Sandbox', () => sandboxScreen(app));
    body.append(el('div', 'w1sbx-res ' + (win ? 'win' : 'lose'), '<div class="res">' + (win ? 'OPERATORS WIN' : 'HOSTILES WIN') + '</div><p>Sandbox. Nothing was saved to the campaign.</p>'));
    const row = el('div', 'w1sbx-btns');
    const last = app.w1sbxLast || { map: 'embassy', n: 14 };
    row.append(app.menus.btn('Restart', 'primary', () => startSandbox(app, last.map, last.n)), app.menus.btn('Pick map', '', () => sandboxScreen(app)), app.menus.btn('Main menu', '', () => app.menus.main()));
    body.append(row);
  }
  function startSandbox(app, map, n) {
    const m = { id: 'sbx_' + map, map, mode: 'hunt', diff: 1, enemies: n || 14, par: 900, cash: 0, title: 'AI Sandbox · ' + mapName(map), sandbox: true, __zuluInternal: true };
    app.w1sbxLast = { map, n: m.enemies };
    app.__stageFlow = null;
    const squad = (app.save.rosters[app.save.unit] || []).filter((o) => o.team >= 0);
    app.startMission(m, squad, { 0: 1, 1: 1, 2: 1 });
    const g = window.__game;
    if (!g) return;
    arm(g);
    if (g.settings) g.settings.cine = false;
    if (app.hud && app.hud.closePlan) app.hud.closePlan();
    if (app.hud && app.hud.closeMenus) app.hud.closeMenus();
    g.plan = [];
    g.breaches = [];
    for (const o of g.ops) { o.orders = []; o.cur = null; o.path = []; o.hold = false; }
    if (g.setPaused) g.setPaused(false);
    document.querySelector('.w1sbx-bar')?.remove();
    const bar = el('div', 'w1sbx-bar');
    let fi = -1;
    const fol = el('button', 'w1sbx-b', 'Follow');
    const spd = el('button', 'w1sbx-b', '1×');
    fol.onclick = () => {
      const live = [...g.ops, ...g.enemies].filter((u) => u.alive);
      if (!live.length || !g.env.cam.setFollow) return;
      fi = (fi + 1) % live.length;
      g.env.cam.setFollow(live[fi], 'follow');
      fol.textContent = (live[fi].name || 'Hostile');
    };
    spd.onclick = () => {
      const i = SPEEDS.indexOf(g.timeScaleSet || 1);
      const v = SPEEDS[(i + 1) % SPEEDS.length];
      g.timeScaleSet = v;
      if (g.settings) g.settings.speed = v;
      if (app.hud.setSpeed) app.hud.setSpeed(v);
      spd.textContent = (v === 0.5 ? '½' : v) + '×';
    };
    bar.append(el('span', 'w1sbx-lab', 'AI SANDBOX'), el('button', 'w1sbx-b on', 'Free'), fol, spd, el('button', 'w1sbx-b', 'Restart'), el('button', 'w1sbx-b', 'Exit'));
    bar.children[1].onclick = () => { if (g.env.cam.stopFollow) g.env.cam.stopFollow(); fol.textContent = 'Follow'; };
    bar.children[4].onclick = () => { bar.remove(); startSandbox(app, map, n); };
    bar.children[5].onclick = () => { bar.remove(); if (app.hud.hide) app.hud.hide(); if (app.input.setGame) app.input.setGame(null); if (app.endGame) app.endGame(); app.menus.main(); };
    document.body.append(bar);
  }
  function sandboxScreen(app) {
    const body = app.menus.screen('sandbox', 'AI Sandbox', () => app.menus.main());
    let count = app.w1sbxCount || 14;
    body.append(el('p', 'w1sbx-intro', 'The squad plays itself. Hurt soldiers fall back, teams pick different targets, and closed doors get breached. Hostiles already take cover, and the wounded ones pull away. Nothing here is saved.'));
    const cnt = el('div', 'w1sbx-count');
    const draw = () => {
      cnt.innerHTML = '<span>Hostiles</span>';
      for (const c of COUNTS) {
        const b = el('button', 'w1sbx-chip' + (c === count ? ' on' : ''), String(c));
        b.onclick = () => { count = app.w1sbxCount = c; draw(); };
        cnt.append(b);
      }
    };
    draw();
    body.append(cnt);
    const grid = el('div', 'w1sbx-grid');
    const keys = (window.__zuluPlaces && window.__zuluPlaces.maps && Object.keys(window.__zuluPlaces.maps)) || [];
    const seen = new Set();
    for (const key of keys) {
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const b = el('button', 'w1sbx-map', '<b>' + mapName(key) + '</b><small>' + key + '</small>');
      b.onclick = () => startSandbox(app, key, count);
      grid.append(b);
    }
    body.append(grid);
  }

  const SHOP = [
    { id: 'gasmask', name: 'Gas mask', desc: 'A mask with lenses and a canister on every operator. CS gas does not stun them.', price: 500, kind: 'mask', color: '#1c2420', tall: 1 },
    { id: 'cs', name: 'CS gas ×4', desc: 'Tear gas. Blocks sight and stuns anyone without a mask.', price: 110, kind: 'stock', n: 4, color: '#c6a24a', tall: 0.7 },
    { id: 'flash', name: 'Flashbangs ×4', desc: 'Stun grenades.', price: 80, kind: 'stock', n: 4, color: '#d8d2c4', tall: 0.6 },
    { id: 'frag', name: 'Frag grenades ×2', desc: 'Lethal grenades.', price: 90, kind: 'stock', n: 2, color: '#3d6b32', tall: 0.6 },
    { id: 'smoke', name: 'Smoke ×4', desc: 'Hides a lane.', price: 70, kind: 'stock', n: 4, color: '#8a9098', tall: 0.6 },
    { id: 'stinger', name: 'Stingers ×2', desc: 'Hostage-safe stun grenades.', price: 100, kind: 'stock', n: 2, color: '#c45a2a', tall: 0.6 },
    { id: 'charge', name: 'Breaching charges ×2', desc: 'For locked doors.', price: 120, kind: 'stock', n: 2, color: '#8a3030', tall: 0.4 },
    { id: 'lockpick', name: 'Lockpick set', desc: 'Opens a locked door quietly.', price: 160, kind: 'stock', n: 1, color: '#c8b48a', tall: 0.3 },
    { id: 'medkit', name: 'Medkits ×2', desc: 'Stops a bleed.', price: 80, kind: 'stock', n: 2, color: '#c8d0d4', tall: 0.45 },
    { id: 'trauma', name: 'Trauma kit', desc: 'The heavier medical pack.', price: 140, kind: 'stock', n: 1, color: '#b7c4b0', tall: 0.55 },
    { id: 'stim', name: 'Adrenaline stim ×2', desc: 'Gets an operator moving.', price: 90, kind: 'stock', n: 2, color: '#d0e27a', tall: 0.5 },
    { id: 'sensor', name: 'Heartbeat sensor', desc: 'Shows heartbeats through a wall.', price: 220, kind: 'stock', n: 1, color: '#7ec8c0', tall: 0.35 },
    { id: 'drone', name: 'Recon drone', desc: 'A look over the next room.', price: 260, kind: 'stock', n: 1, color: '#d0d4d8', tall: 0.3 },
    { id: 'ap', name: 'AP rounds', desc: 'One crate of armour-piercing ammunition.', price: 150, kind: 'stock', n: 1, color: '#c4a15a', tall: 0.5 },
    { id: 'subsonic', name: 'Subsonic rounds', desc: 'One quieter crate.', price: 140, kind: 'stock', n: 1, color: '#6a7078', tall: 0.5 },
    { id: 'match', name: 'Match-grade rounds', desc: 'One precise crate.', price: 160, kind: 'stock', n: 1, color: '#8a9a6a', tall: 0.5 },
    { id: 'tracer', name: 'Tracer mix', desc: 'One crate with tracers.', price: 130, kind: 'stock', n: 1, color: '#e07030', tall: 0.5 },
    { id: 'b_nades', name: 'Grenade crate', desc: 'A mixed crate of throwables.', price: 200, kind: 'stock', n: 1, color: '#6a7a4a', tall: 0.7 },
    { id: 'b_breach', name: 'Breacher bundle', desc: 'Charges and lockpicks together.', price: 240, kind: 'stock', n: 1, color: '#8a5040', tall: 0.6 },
    { id: 'b_med', name: 'Field medic pack', desc: 'Medkits, trauma, and stims.', price: 220, kind: 'stock', n: 1, color: '#d8e0dc', tall: 0.65 }
  ];
  function thumb(color, tall) {
    const c = document.createElement('canvas');
    c.width = 120; c.height = 84; c.className = 'w1thumb';
    const g = c.getContext('2d');
    g.clearRect(0, 0, 120, 84);
    const h = 18 + tall * 36;
    const x = 60, y = 58;
    g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + 28, y - h - 14); g.lineTo(x + 28, y - 14); g.lineTo(x, y); g.closePath();
    g.fillStyle = color; g.fill();
    g.beginPath(); g.moveTo(x, y - h); g.lineTo(x - 28, y - h - 14); g.lineTo(x - 28, y - 14); g.lineTo(x, y); g.closePath();
    g.fillStyle = '#0006'; g.fill();
    g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + 28, y - h - 14); g.lineTo(x, y - h - 28); g.lineTo(x - 28, y - h - 14); g.closePath();
    g.fillStyle = '#fff4'; g.fill();
    return c;
  }
  function buy(app, item) {
    const s = app.save;
    if ((s.cash || 0) < item.price) return;
    s.cash -= item.price;
    if (item.kind === 'mask') s.gasMask = true;
    else { s.stock = s.stock || {}; s.stock[item.id] = (s.stock[item.id] || 0) + item.n; }
    if (app.persist) app.persist();
  }
  function shopScreen(app) {
    const body = app.menus.screen('armoury-extra', 'Armoury', () => app.menus.main());
    const cash = el('p', '', 'Budget ' + (app.save.cash || 0));
    body.append(cash);
    body.append(el('p', 'dim', 'Support money for equipment. It does not hire operators. The same stock the Armory uses.'));
    const grid = el('div', 'w1shop');
    for (const item of SHOP) {
      const row = el('div', 'w1shop-card');
      const owned = item.kind === 'mask' && app.save.gasMask;
      row.append(thumb(item.color, item.tall));
      const b = el('b', '', item.name);
      const d = el('div', 'w8v-w', item.desc + (owned ? ' Owned.' : '') + ' ' + item.price);
      const btn = el('button', 'w8v-go', owned ? 'Owned' : 'Buy');
      btn.disabled = owned;
      btn.onclick = () => { buy(app, item); shopScreen(app); };
      row.append(b, d, btn);
      grid.append(row);
    }
    body.append(grid);
  }
  function attachMasks(g) {
    if (!g || !window.__app.save.gasMask) return;
    let donor = null;
    g.env.scene.traverse((o) => { if (!donor && o.isMesh && !o.isSkinnedMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position && o.geometry.attributes.position.count <= 48) donor = o; });
    if (!donor) return;
    donor.geometry.computeBoundingBox();
    const bb = donor.geometry.boundingBox;
    const sx = Math.max(0.05, bb.max.x - bb.min.x), sy = Math.max(0.05, bb.max.y - bb.min.y), sz = Math.max(0.05, bb.max.z - bb.min.z);
    for (const op of g.ops || []) {
      const head = op.ch && op.ch.B && op.ch.B.head;
      if (!head || head.getObjectByName('zmask')) continue;
      op.gasMask = true;
      const mat = donor.material.clone();
      if (mat.color) mat.color.set(0x1c1e1c);
      const m = new donor.constructor(donor.geometry, mat);
      m.name = 'zmask';
      m.scale.set(0.18 / sx, 0.12 / sy, 0.14 / sz);
      m.position.set(0, 0.02, 0.06);
      head.add(m);
    }
  }

  const CREDITS_HTML = '<div class="zcred"><h3>Line check for this build</h3>'
    + '<p><b>Tactical Soldier</b> — MissingTray1151, CC BY 4.0. Still the operator, hostile, hostage and VIP mesh. Not replaced.</p>'
    + '<p><b>Weapons, helmets, vests, level props</b> — original, built in code. Parked cars, vans and trucks are the same procedural traffic meshes as the street, not a downloaded car pack. Desks, plants, pillars and containers are the level’s own prop meshes. Sofas, chairs, ramps and the gas mask are extra boxes in code. No third-party furniture pack.</p>'
    + '<p><b>Textures</b> — the soldier atlas is still the CC BY 4.0 atlas. Walls, floors and icons are still generated here. The world map is still Natural Earth public-domain data.</p>'
    + '<p><b>Sound effects, music, ambience, radio static, boot steps</b> — still synthesised in the browser. The track “Tensions Run High” is not included.</p>'
    + '<p><b>Radio callouts</b> — Piper en_US-libritts-high, speaker 66, LibriTTS reader 5717 (male), CC BY 4.0, http://www.openslr.org/60/. The Piper program and the weights are not in the game. espeak-ng is used only while rendering and is not shipped. Device speechSynthesis is not used.</p>'
    + '<p><b>Cutscene lines</b> — the same speaker and the same licence. One file per stage and for the opening. Calm pace, length scale about 1.15. Not a separate actor.</p>'
    + '<p><b>three.js 0.170.0</b> — MIT. meshoptimizer decoder — MIT, via three.js. Build tools (esbuild, glTF Transform, sharp, tiny-inflate, topojson-client, Playwright) are not in the download.</p>'
    + '<p><b>Older builds</b> in Settings are earlier copies of this game, including the 24 Oct 2026 Pages deploy. Opening one backs up the save and restores it on the way back.</p></div>';

  function polishDoors(app) {
    const hud = app.hud;
    if (!hud || hud.__doorList || !hud.openDoorMenu) return;
    hud.__doorList = true;
    const orig = hud.openDoorMenu.bind(hud);
    const names = { kick: 'Kick', shotgun: 'Shotgun (hinges)', charge: 'Explosive charge', lockpick: 'Lockpick / quiet open', open: 'Quiet open' };
    hud.openDoorMenu = function () {
      const ret = orig.apply(this, arguments);
      const list = this.doorMenu && this.doorMenu.querySelector('.dm-list');
      if (!list) return ret;
      for (const b of list.querySelectorAll('.dm-opt')) {
        const id = b.dataset.id;
        const strong = b.querySelector('b');
        if (!strong || !names[id]) continue;
        const stock = strong.querySelector('i');
        strong.innerHTML = names[id] + (stock ? ' ' + stock.outerHTML : '');
      }
      if (!list.querySelector('[data-id="flashentry"]')) {
        const flash = document.createElement('button');
        flash.className = 'dm-opt';
        flash.dataset.id = 'flashentry';
        const n = (this.g && this.g.pool && this.g.pool.flash) || 0;
        flash.innerHTML = '<b>Flashbang + entry</b><small>Throw a flash, then kick. Needs a flashbang. ×' + n + '</small>';
        if (!(n > 0)) flash.classList.add('dis');
        flash.onclick = () => {
          if (flash.classList.contains('dis')) return;
          const kick = list.querySelector('[data-id="kick"]');
          if (kick) kick.click();
          const tog = this.doorMenu.querySelector('.dm-flash');
          if (tog && !tog.classList.contains('on')) tog.click();
        };
        list.append(flash);
      }
      return ret;
    };
  }
  const GUNS = [
    { id: 'm4a1', name: 'M4A1', type: 'rifle', dmg: 34, rof: 8, acc: 0.72, range: 16, mob: 1 },
    { id: 'hk416', name: 'HK416', type: 'rifle', dmg: 36, rof: 7.5, acc: 0.76, range: 17, mob: 0.98 },
    { id: 'mp5', name: 'MP5A3', type: 'smg', dmg: 24, rof: 11, acc: 0.74, range: 10, mob: 1.06 },
    { id: 'm870', name: 'M870', type: 'shotgun', dmg: 85, rof: 1.3, acc: 0.85, range: 7, mob: 1.02 },
    { id: 'glock17', name: 'Glock 17', type: 'pistol', dmg: 24, rof: 5, acc: 0.68, range: 9, mob: 1 },
    { id: 'm249', name: 'M249', type: 'lmg', dmg: 32, rof: 12, acc: 0.6, range: 18, mob: 0.88 }
  ];
  function polishArmory(app) {
    const menus = app.menus;
    if (!menus || menus.__armRich || !menus.armory) return;
    menus.__armRich = true;
    const orig = menus.armory.bind(menus);
    menus.armory = function (tab) {
      const ret = orig(tab || 'weapons');
      const host = document.querySelector('#menu .scr-body') || document.querySelector('#menu');
      if (!host || host.querySelector('.zarm')) return ret;
      const panel = document.createElement('div');
      panel.className = 'zarm';
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 150; canvas.className = 'zarm-view';
      panel.append(canvas);
      let ang = 0.2, gun = 0;
      const draw = () => {
        if (!canvas.isConnected) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#10141a'; ctx.fillRect(0, 0, 320, 150);
        ctx.save(); ctx.translate(160, 88); ctx.scale(1, 0.72); ctx.rotate(ang);
        ctx.fillStyle = '#d5d8dc'; ctx.fillRect(-78, -7, 96, 14);
        ctx.fillStyle = '#9aa0a8'; ctx.fillRect(-18, -16, 34, 12);
        ctx.fillStyle = '#6e747c'; ctx.fillRect(16, -5, 30, 7);
        ctx.fillStyle = '#3a3e44'; ctx.fillRect(-48, 6, 7, 24);
        ctx.restore();
        ctx.fillStyle = '#e7efe4'; ctx.font = '700 14px system-ui';
        ctx.fillText(GUNS[gun].name + ' · ' + GUNS[gun].type, 12, 22);
        ang += 0.02;
        requestAnimationFrame(draw);
      };
      draw();
      const save = app.save || {};
      const ids = Object.keys(save.rosters || {});
      const unit = save.unit && save.rosters[save.unit] ? save.unit : ids[0];
      const roster = (save.rosters && save.rosters[unit]) || [];
      const ops = document.createElement('div');
      ops.className = 'zarm-ops';
      roster.filter((o) => o.team >= 0).slice(0, 8).forEach((op) => {
        const b = document.createElement('button');
        b.className = 'zarm-op';
        const label = () => (op.name || 'Op') + ' · ' + (op.weapon || 'rifle');
        b.textContent = label();
        b.onclick = () => {
          const i = Math.max(0, GUNS.findIndex((g) => g.id === op.weapon));
          const next = GUNS[(i + 1) % GUNS.length];
          op.weapon = next.id;
          gun = (i + 1) % GUNS.length;
          b.textContent = label();
          if (app.persist) app.persist();
        };
        ops.append(b);
      });
      panel.append(ops);
      host.querySelectorAll('small').forEach((small) => {
        const row = small.parentElement;
        if (!row || row.querySelector('.zbars')) return;
        const text = small.textContent || '';
        const num = (re) => { const m = text.match(re); return m ? +m[1] : 0; };
        const bars = [['DMG', num(/DMG ([0-9.]+)/) / 150], ['RATE', num(/([0-9.]+)\/s/) / 15], ['ACC', num(/ACC ([0-9.]+)/) / 100], ['RNG', num(/RNG ([0-9.]+)/) / 32], ['MOVE', num(/speed ([0-9.]+)/) / 110]];
        if (!bars[0][1]) return;
        const box = document.createElement('div');
        box.className = 'zbars';
        for (const [name, v] of bars) {
          const lab = document.createElement('span'); lab.textContent = name;
          const bar = document.createElement('div'); bar.className = 'zbar';
          const fill = document.createElement('i'); fill.style.width = Math.max(4, Math.min(100, v * 100)) + '%';
          bar.append(fill); box.append(lab, bar);
        }
        small.after(box);
      });
      host.prepend(panel);
      return ret;
    };
  }
  function boot() {
    const app = window.__app;
    if (!app || app.__batch6) return;
    app.__batch6 = true;
    if (!document.getElementById('batch6css')) {
      const st = document.createElement('style');
      st.id = 'batch6css';
      st.textContent = '.w1sbx-bar{position:fixed;left:8px;top:max(8px,env(safe-area-inset-top));bottom:auto;transform:none;z-index:30;display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-start;max-width:min(520px,calc(100vw - 16px));background:#101410e6;color:#def;border:1px solid #6a8;border-radius:8px;padding:4px}.w1sbx-b,.w1sbx-chip{font:600 13px system-ui;color:#def;background:#ffffff14;border:1px solid #ffffff30;border-radius:8px;padding:6px 8px;min-height:36px}.w1sbx-chip.on{background:#2a6a3a}.w1sbx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}.w1sbx-map{text-align:left;color:#e8efe4;background:#ffffff10;border:1px solid #ffffff28;border-radius:8px;padding:8px}.zfps{position:fixed;left:12px;bottom:78px;z-index:28;display:none;gap:8px;align-items:flex-end}.zfps.on{display:flex}.zfps-stick{width:108px;height:108px;border-radius:50%;background:#0006;border:1px solid #fff4;touch-action:none}.zfps-fire{width:84px;height:84px;border-radius:50%;background:#e37b22;border:0;color:#1a1008;font:800 14px system-ui}.zfps-btn{font:700 13px system-ui;background:#12160fd0;color:#d7e4c8;border:1px solid #6a8a55;border-radius:8px;padding:6px 8px;min-height:36px}.zcred{margin-top:14px;padding-top:8px;border-top:1px solid #334;line-height:1.45}.zcred p{margin:8px 0}.w1shop{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.w1shop-card{background:#14181c;border:1px solid #ffffff22;border-radius:10px;padding:8px;color:#e8efe4}.w1thumb{width:100%;height:auto;background:#0e1216;border-radius:8px}.zarm{display:flex;flex-direction:column;gap:8px;margin:0 0 10px}.zarm-view{width:100%;max-width:420px;height:auto;background:#10141a;border-radius:10px}.zarm-ops{display:flex;flex-wrap:wrap;gap:6px}.zarm-op{font:600 12px system-ui;background:#1c232c;color:#e8efe4;border:1px solid #ffffff22;border-radius:8px;padding:6px 8px;min-height:36px}.zbars{display:grid;grid-template-columns:52px 1fr;gap:2px 6px;align-items:center;margin-top:4px;font:600 10px system-ui;color:#c5d0c0}.zbar{height:7px;background:#ffffff18;border-radius:4px;overflow:hidden}.zbar i{display:block;height:100%;background:#e37b22}@media (max-width:420px){.shoplist.cards{display:flex;flex-direction:column}.shoprow{flex-wrap:wrap}.zarm-view{max-width:none}}@media (pointer:fine){.zfps-stick,.zfps-fire{display:none}}';
      document.head.append(st);
    }
    const menus = app.menus;
    const main = menus.main.bind(menus);
    menus.main = function () {
      const r = main();
      const col = menus.root.querySelector('.mm-col') || document.querySelector('.mm-col');
      if (col && !col.querySelector('.w1sbx-btn')) {
        const b = menus.btn('AI Sandbox', 'big w1sbx-btn', () => sandboxScreen(app));
        const shop = menus.btn('Armoury extras', 'big', () => shopScreen(app));
        const tut = col.querySelector('.tutb');
        if (tut) { tut.after(shop); tut.after(b); } else col.append(b, shop);
      }
      return r;
    };
    polishDoors(app);
    polishArmory(app);
    const credits = menus.credits.bind(menus);
    menus.credits = function () {
      const r = credits.apply(menus, arguments);
      const host = document.querySelector('#menu .scr-body') || document.querySelector('.cr-list') || document.querySelector('#menu');
      if (host && !host.querySelector('.zcred')) host.insertAdjacentHTML('beforeend', CREDITS_HTML);
      return r;
    };
    const end = app.onEnd.bind(app);
    app.onEnd = function (r) {
      if (r && r.mission && r.mission.sandbox) return sandboxEnd(app, r);
      return end(r);
    };
    const start = app.startMission.bind(app);
    app.startMission = function () {
      const r = start.apply(app, arguments);
      const g = window.__game;
      if (g) { arm(g); attachMasks(g); if (g.pool && app.save.stock && app.save.stock.cs) g.pool.cs = Math.max(g.pool.cs || 0, app.save.stock.cs); }
      return r;
    };
    const renderer = app.renderer;
    if (renderer && !renderer.__fps) {
      renderer.__fps = true;
      const render = renderer.render.bind(renderer);
      renderer.render = function (scene, camera) { applyCam(camera); return render(scene, camera); };
    }
    const hud = document.querySelector('#hud') || document.body;
    const btn = el('button', 'zfps-btn', '1st person');
    btn.title = 'Play as the selected soldier. Mouse to look, WASD to move, click to fire. Touch: stick, drag, FIRE.';
    btn.onclick = () => setFps(!fps.on);
    const stick = el('div', 'zfps-stick');
    const fire = el('button', 'zfps-fire', 'FIRE');
    const box = el('div', 'zfps');
    box.append(stick, fire);
    document.body.append(btn, box);
    btn.style.cssText = 'position:fixed;right:12px;top:46px;z-index:28';
    stick.addEventListener('pointerdown', (e) => { stick.setPointerCapture(e.pointerId); stick._id = e.pointerId; stick._ox = e.clientX; stick._oy = e.clientY; });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId !== stick._id) return; fps.touch.x = Math.max(-1, Math.min(1, (e.clientX - stick._ox) / 40)); fps.touch.y = Math.max(-1, Math.min(1, (e.clientY - stick._oy) / 40)); });
    const stickUp = () => { fps.touch.x = 0; fps.touch.y = 0; stick._id = null; };
    stick.addEventListener('pointerup', stickUp);
    stick.addEventListener('pointercancel', stickUp);
    fire.addEventListener('pointerdown', (e) => { e.preventDefault(); fps.fire = true; });
    fire.addEventListener('pointerup', () => { fps.fire = false; });
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', () => { if (fps.on && canvas.requestPointerLock) canvas.requestPointerLock(); });
      canvas.addEventListener('pointerdown', (e) => { if (fps.on && e.button === 0 && matchMedia('(pointer:fine)').matches) fps.fire = true; });
      window.addEventListener('pointerup', () => { if (matchMedia('(pointer:fine)').matches) fps.fire = false; });
    }
    window.addEventListener('mousemove', (e) => {
      if (!fps.on || !fps.op || document.pointerLockElement !== canvas) return;
      fps.op.ang += e.movementX * 0.003;
      fps.pitch = Math.max(-0.8, Math.min(0.6, fps.pitch - e.movementY * 0.003));
    });
    let lookId = null, lx = 0, ly = 0;
    window.addEventListener('pointerdown', (e) => { if (!fps.on || e.target === stick || e.target === fire || e.target === btn) return; if (e.pointerType === 'touch') { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; } });
    window.addEventListener('pointermove', (e) => { if (e.pointerId !== lookId || !fps.op) return; fps.op.ang += (e.clientX - lx) * 0.005; fps.pitch = Math.max(-0.8, Math.min(0.6, fps.pitch - (e.clientY - ly) * 0.005)); lx = e.clientX; ly = e.clientY; });
    window.addEventListener('pointerup', (e) => { if (e.pointerId === lookId) lookId = null; });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backslash') { e.preventDefault(); setFps(!fps.on); return; }
      if (fps.keys) fps.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => { if (fps.keys) fps.keys[e.code] = false; });
    window.__zuluFps = fps;
    window.__zuluSandbox = { start: (map, n) => startSandbox(app, map, n), screen: () => sandboxScreen(app) };
  }
  const wait = setInterval(() => { if (window.__app && window.__app.menus) { clearInterval(wait); boot(); } }, 40);
})();
