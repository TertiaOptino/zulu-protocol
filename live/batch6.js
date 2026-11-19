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
    const seen = new Set();
    for (const m of window.__zulu.MISSIONS) {
      if (!m.map || m.training || m.tut || String(m.map).includes('@') || seen.has(m.map)) continue;
      seen.add(m.map);
      const b = el('button', 'w1sbx-map', '<b>' + mapName(m.map) + '</b><small>' + m.map + '</small>');
      b.onclick = () => startSandbox(app, m.map, count);
      grid.append(b);
    }
    body.append(grid);
  }

  const SHOP = [
    { id: 'gasmask', name: 'Gas mask', desc: 'Worn on every operator. Cuts gas damage.', price: 500, kind: 'mask' },
    { id: 'cs', name: 'CS gas ×4', desc: 'Tear gas. Throw from the kit or the GAS button.', price: 110, kind: 'stock', n: 4 },
    { id: 'flash', name: 'Flashbangs ×4', desc: 'More flashbangs for the armoury.', price: 80, kind: 'stock', n: 4 },
    { id: 'frag', name: 'Frag grenades ×2', desc: 'More frags.', price: 90, kind: 'stock', n: 2 },
    { id: 'smoke', name: 'Smoke ×4', desc: 'More smoke.', price: 70, kind: 'stock', n: 4 },
    { id: 'charge', name: 'Breaching charges ×2', desc: 'For locked doors.', price: 120, kind: 'stock', n: 2 },
    { id: 'medkit', name: 'Medkits ×2', desc: 'More medkits.', price: 80, kind: 'stock', n: 2 },
    { id: 'stinger', name: 'Stingers ×2', desc: 'Hostage-safe stun grenades.', price: 100, kind: 'stock', n: 2 }
  ];
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
    body.append(el('p', 'dim', 'This is support money for equipment. It does not hire operators.'));
    for (const item of SHOP) {
      const row = el('div', 'w8v-card');
      const owned = item.kind === 'mask' && app.save.gasMask;
      row.innerHTML = '<b></b><div class="w8v-w"></div>';
      row.querySelector('b').textContent = item.name + ' — ' + item.price;
      row.querySelector('.w8v-w').textContent = item.desc + (owned ? ' Owned.' : '');
      const b = el('button', 'w8v-go', owned ? 'Owned' : 'Buy');
      b.disabled = owned;
      b.onclick = () => { buy(app, item); shopScreen(app); };
      row.append(b);
      body.append(row);
    }
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

  const CREDITS_HTML = '<div class="zcred"><h3>This build</h3><p>Radio and cutscene voice: Piper en_US-libritts-high, speaker 66, LibriTTS reader 5717 (male). LibriTTS by Heiga Zen and others, CC BY 4.0, http://www.openslr.org/60/. The Piper program and the model weights are not in the game. Cutscene lines are the same speaker.</p><p>Boot steps, room props, water bands, and the gas-mask block are drawn in code. No extra texture pack.</p><p>Older builds in Settings are earlier published copies of this same game. Returning restores the save from before you opened one.</p><p>three.js is MIT. The soldier model is Tactical Soldier by MissingTray1151, CC BY 4.0. Natural Earth map data is public domain.</p></div>';

  function boot() {
    const app = window.__app;
    if (!app || app.__batch6) return;
    app.__batch6 = true;
    if (!document.getElementById('batch6css')) {
      const st = document.createElement('style');
      st.id = 'batch6css';
      st.textContent = '.w1sbx-bar{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:30;display:flex;gap:4px;flex-wrap:wrap;justify-content:center;background:#101410e6;color:#def;border:1px solid #6a8;border-radius:8px;padding:4px}.w1sbx-b,.w1sbx-chip{font:600 13px system-ui;color:#def;background:#ffffff14;border:1px solid #ffffff30;border-radius:8px;padding:6px 8px;min-height:36px}.w1sbx-chip.on{background:#2a6a3a}.w1sbx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}.w1sbx-map{text-align:left;color:#e8efe4;background:#ffffff10;border:1px solid #ffffff28;border-radius:8px;padding:8px}.zfps{position:fixed;left:12px;bottom:78px;z-index:28;display:none;gap:8px;align-items:flex-end}.zfps.on{display:flex}.zfps-stick{width:108px;height:108px;border-radius:50%;background:#0006;border:1px solid #fff4;touch-action:none}.zfps-fire{width:84px;height:84px;border-radius:50%;background:#e37b22;border:0;color:#1a1008;font:800 14px system-ui}.zfps-btn{font:700 13px system-ui;background:#12160fd0;color:#d7e4c8;border:1px solid #6a8a55;border-radius:8px;padding:6px 8px;min-height:36px}.zcred{margin-top:14px;padding-top:8px;border-top:1px solid #334;line-height:1.4}@media (pointer:fine){.zfps-stick,.zfps-fire{display:none}}';
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
