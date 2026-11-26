/* Batch 1 on the published game: door stacks, radio log, shots counter.
   Hooks the live Game/HUD by method name. Does not replace voice clips or the update toast. */
(function () {
  const TEAMS = [{ name: 'Alpha' }, { name: 'Bravo' }, { name: 'Charlie' }];
  const STACK_TIMEOUT = 25, IDLE_TIMEOUT = 4, STEP_IN_MAX = 3;
  const sgn = Math.sign;
  const MAX_LINES = 5, DEDUPE = 3, KEEP = 30;
  const life = () => (typeof window !== 'undefined' && window.__w1radioLife) || 6500;
  const BREACH_TXT = { kick: 'kicking the door', shotgun: 'shotgun breach!', charge: 'breach, breach, breach!', lockpick: 'picking the lock', open: 'opening up quiet' };

  class RadioBus extends EventTarget {
    constructor() { super(); this.lines = []; this.last = new Map(); this.game = null; }
    on(fn) { const h = (e) => fn(e.detail); this.addEventListener('line', h); return () => this.removeEventListener('line', h); }
    push(callsign, text, kind = 'info', extra = {}) {
      const g = this.game; const t = g ? g.time : 0; const key = callsign + '|' + kind;
      if (kind !== 'stack' && kind !== 'breach' && t - (this.last.get(key) ?? -99) < DEDUPE) return null;
      this.last.set(key, t);
      const line = { callsign, text, kind, t: +t.toFixed(2), uid: extra.uid ?? null };
      this.lines.push(line); if (this.lines.length > KEEP) this.lines.shift();
      this.dispatchEvent(new CustomEvent('line', { detail: line }));
      return line;
    }
    reset(g) { this.lines.length = 0; this.last.clear(); this.game = g; this.dispatchEvent(new CustomEvent('reset')); }
  }
  const bus = (window.__radio instanceof EventTarget) ? window.__radio : new RadioBus();
  window.__radio = bus;

  function callsign(g, u) {
    if (!u) return 'HQ';
    if (u.kind !== 'op') return u.kind === 'vip' ? 'VIP' : 'HQ';
    const T = TEAMS[u.team]; if (!T) return u.name || 'Op';
    const mates = g.ops.filter(o => o.team === u.team);
    return T.name + ' ' + (mates.indexOf(u) + 1);
  }
  const teamName = (u) => (u && TEAMS[u.team] ? TEAMS[u.team].name : 'Team');
  const opByUid = (g, uid) => g && g.ops.find(o => o.uid === uid);
  function bearing(u, t) {
    if (!t) return 'front';
    let a = Math.atan2(t.x - u.x, t.z - u.z) - u.ang;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    const d = Math.abs(a);
    return d < 0.8 ? 'front' : d > 2.4 ? 'rear' : a > 0 ? 'left' : 'right';
  }
  function lineFor(g, key, who) {
    const u = opByUid(g, who);
    switch (key) {
      case 'contact': if (u) bus.push(callsign(g, u), 'contact ' + bearing(u, u.target) + '!', 'contact', { uid: u.uid }); break;
      case 'reload': if (u) bus.push(callsign(g, u), 'reloading', 'reload', { uid: u.uid }); break;
      case 'hurt': if (u) bus.push(callsign(g, u), "I'm hit!", 'hit', { uid: u.uid }); break;
      case 'mandown': { const d = opByUid(g, who - 1); bus.push(d ? callsign(g, d) : 'HQ', 'man down!', 'down', { uid: d && d.uid }); break; }
      case 'down': if (u) bus.push(callsign(g, u), 'tango down', 'kill', { uid: u.uid }); break;
      case 'clear': if (u) bus.push(callsign(g, u), 'last hostile down — area clear', 'clear', { uid: u.uid }); break;
      case 'hostage': if (u) bus.push(callsign(g, u), 'hostage secured', 'hostage', { uid: u.uid }); break;
      case 'alarm': bus.push('HQ', 'alarm raised — they know we are here', 'alarm'); break;
      case 'go': bus.push('HQ', 'go, go, go!', 'go'); break;
      case 'flash': case 'frag': case 'smoke': if (u) bus.push(callsign(g, u), key === 'flash' ? 'flashbang out' : key === 'frag' ? 'frag out' : 'smoke out', 'gear', { uid: u.uid }); break;
      default: break;
    }
  }

  function stackSlots(g, b) {
    const L = g.level, d = b.door, f = b.front;
    const dir = [sgn(b.dir[0]), sgn(b.dir[1])], perp = [-dir[1], dir[0]];
    const room = L.room[L.idx(f[0], f[1])];
    const taken = new Set([d.i, L.idx(f[0], f[1])]);
    for (const o of g.breaches) if (o !== b && o.phase !== 'done') for (const c of o.stackCells.values()) taken.add(c);
    const ok = (x, y) => { if (!L.inb(x, y)) return false; const j = L.idx(x, y); return L.type[j] === 0 && !taken.has(j) && L.room[j] === room; };
    const run = (sg, back) => { const r = []; for (let k = 1; k <= 4; k++) { const x = f[0] + perp[0] * k * sg - dir[0] * back, y = f[1] + perp[1] * k * sg - dir[1] * back; if (!ok(x, y)) break; r.push(L.idx(x, y)); } return r; };
    const A = run(1, 0), B = run(-1, 0);
    const pick = A.length >= B.length ? [A, B, 1] : [B, A, -1];
    const s1 = pick[0], s2 = pick[1], sg1 = pick[2];
    const n = b.units.length;
    if (!s1.length) return null;
    const out = [];
    const take = (c) => { if (c != null && out.length < n && !out.includes(c)) out.push(c); };
    if (n >= 3 && s2.length) { for (let k = 0; out.length < n && k < 4; k++) { take(s1[k]); take(s2[k]); } }
    else for (const c of s1) take(c);
    for (const c of run(sg1, 1)) take(c);
    for (const c of run(-sg1, 1)) take(c);
    return out.length === n ? out : null;
  }
  function reslot(g, b) {
    const slots = stackSlots(g, b); if (!slots) return false;
    const L = g.level;
    b.units.forEach((u, i) => {
      const c = slots[i]; b.stackCells.set(u, c);
      const o = u.orders.find(x => x.b === b); if (!o) return;
      o.cell = c; o.end = { x: (c % L.W) + 0.5, z: ((c / L.W) | 0) + 0.5 };
      const k = u.orders.indexOf(o); u.orders.splice(k, 1);
      const from = g.paused ? g.planEnd(u) : u;
      u.orders.splice(k, 0, o);
      o.preview = g.previewPath(from, c) || o.preview;
      if (u.cur === o) g.pathTo(u, c);
    });
    b.w1slots = true;
    if (g.refreshRibbons) g.refreshRibbons();
    return true;
  }
  function dropPre(g, units) {
    for (const u of units) for (const o of [...u.orders]) if (o.b && o.b.w1pre) {
      g.finishOrderOf(u, o.b);
      o.b.units = o.b.units.filter(x => x !== u);
      if (!o.b.units.length) { o.b.phase = 'done'; if (g.plan) g.plan = g.plan.filter(p => p.team !== o.b.w1team); }
    }
  }

  function installStack2(Game) {
    const P = Game.prototype;
    const oB = P.orderBreach;
    P.orderBreach = function (units, door, method, flash, wait) {
      if (!this.w1sync) { try { dropPre(this, (units || []).filter(u => u.alive)); } catch (e) { /* keep the order */ } }
      const b = oB.call(this, units, door, method, flash, wait);
      try { if (b && b.units.length && this.settings.w1stack !== false) reslot(this, b); } catch (e) { /* original stack stands */ }
      return b;
    };
    const oPush = P.pushOrders;
    P.pushOrders = function (list, append) {
      if (!this.w1sync) dropPre(this, list.map(([u]) => u));
      return oPush.call(this, list, append);
    };
    const oU = P.updateBreach;
    P.updateBreach = function (b, dt) {
      const L = this.level;
      try {
      if ((b.phase === 'stack' || b.phase === 'ready') && b.units.length && !this.paused) {
        b.w1t = (b.w1t || 0) + dt;
        const br = b.units.includes(b.breacher) ? b.breacher : b.units[0];
        const fx = b.front[0] + 0.5, fz = b.front[1] + 0.5;
        const near = br && Math.hypot(br.x - fx, br.z - fz) < 1.45;
        b.w1near = near ? (b.w1near || 0) + dt : 0;
        const idle = b.units.every(u => !u.cur || u.cur.b !== b || u.pi >= u.path.length);
        b.w1idle = idle ? (b.w1idle || 0) + dt : 0;
        // One soldier stuck off his mark used to hold the whole breach in "stack", so the camera never started.
        if (b.phase === 'stack' && (b.w1near > 0.35 || b.w1idle > 1.6 || b.w1t > 6)) {
          b.w1timeout = !(b.w1near > 0.35);
          b.phase = b.wait ? 'ready' : 'act';
          b.t = 0;
        }
      }
      if (b.phase === 'act' && b.door && b.door.state !== 'closed' && !b.w1cined && this.settings && this.settings.cine !== false) {
        b.w1cined = true;
        try { this.cinematic(b); } catch (err) { /* the original update still runs */ }
      }
      if (b.phase === 'act' && b.w1slots && !b.w1in && b.door.state === 'closed') {
        const br = b.units.includes(b.breacher) ? b.breacher : b.units[0];
        if (br) {
          const fi = L.idx(b.front[0], b.front[1]);
          const fx = b.front[0] + 0.5, fz = b.front[1] + 0.5;
          b.w1st = (b.w1st || 0) + dt;
          if (b.w1st < 1.1 && Math.hypot(br.x - fx, br.z - fz) > 1.45) {
            if (!b.w1go) { b.w1go = true; this.pathTo(br, fi); b.stackCells.set(br, fi); }
            return;
          }
        }
        b.w1in = true;
      }
      } catch (e) { /* fall through to the original breach update */ }
      const doorWas = b.door && b.door.state;
      const r = oU.call(this, b, dt);
      try {
        if (!b.w1cined && b.door && doorWas === 'closed' && b.door.state !== 'closed' && this.settings && this.settings.cine !== false) {
          b.w1cined = true;
          const played = (this.cineLog || []).some((x) => x.door === b.door.i && x.kind !== 'skipped-busy');
          if (!played) this.cinematic(b);
        }
      } catch (err) { /* overlay is optional */ }
      return r;
    };
    const oF = P.frame;
    P.frame = function (rdt) {
      try {
      if (this.paused && !this.over && this.breaches.some(b => b.w1pre && b.phase === 'stack')) {
        const dt = Math.min(rdt, 0.1);
        const bs = this.breaches.filter(b => b.w1pre && b.phase === 'stack');
        const us = new Set();
        for (const b of bs) for (const u of b.units) us.add(u);
        for (const u of us) if (u.alive && (u.cur ? u.cur.b && u.cur.b.w1pre : u.orders[0] && u.orders[0].b && u.orders[0].b.w1pre)) { this.runOrders(u, dt); this.moveUnit(u, dt); }
        for (const b of bs) oU.call(this, b, dt);
      }
      } catch (e) { /* the original frame still runs */ }
      return oF.call(this, rdt);
    };
    const oGo = P.goAll;
    P.goAll = function () {
      if (this.w1execPlan && this.plan && this.plan.length && !this.w1inExec) return this.w1execPlan();
      return oGo.call(this);
    };
  }

  function installStack2Hud(hud) {
    const sync = () => {
      const g = hud.g; if (!g || g.over || g.settings.w1stack === false) return;
      g.w1execPlan = () => hud.executePlan();
      const plan = g.plan || [];
      const quiet = g.toast; g.toast = () => {}; g.w1sync = true;
      try {
        for (const b of g.breaches) if (b.w1pre && b.phase !== 'done' && !plan.some(p => p.team === b.w1team && p.door === b.door && p.method === b.method && !!p.flash === !!b.flash)) {
          for (const u of [...b.units]) g.finishOrderOf(u, b);
          b.units = []; b.phase = 'done';
        }
        for (const p of plan) {
          if (g.breaches.some(b => b.w1pre && b.phase !== 'done' && b.w1team === p.team)) continue;
          if (p.door.state !== 'closed') continue;
          const ops = g.ops.filter(o => o.alive && o.team === p.team);
          if (!ops.length) continue;
          ops.forEach(o => g.clearOrders(o));
          const b = g.orderBreach(ops, p.door, p.method, p.flash, true);
          if (b) { b.plan = true; b.w1pre = true; b.w1team = p.team; }
        }
        g.breaches = g.breaches.filter(b => b.phase !== 'done');
      } finally { g.toast = quiet; g.w1sync = false; }
    };
    const oR = hud.renderPlan.bind(hud);
    hud.renderPlan = function (...a) { const r = oR(...a); sync(); return r; };
    const oE = hud.executePlan.bind(hud);
    hud.executePlan = function () {
      const g = this.g; if (!g) return oE();
      g.w1inExec = true;
      try {
        const plan = g.plan || []; const pre = []; const rest = [];
        for (const p of plan) {
          const b = g.breaches.find(x => x.w1pre && x.phase !== 'done' && x.w1team === p.team && x.door === p.door && x.units.some(u => u.alive));
          if (b) pre.push(b); else rest.push(p);
        }
        for (const b of pre) b.w1pre = false;
        const total = pre.length + rest.filter(p => p.door.state === 'closed').length;
        const allReady = pre.every(b => b.phase === 'ready');
        if (pre.length && allReady && !rest.length) g.toast('GO GO GO! (' + pre.length + ' team' + (pre.length > 1 ? 's' : '') + ')', 'good');
        else if (pre.length && total === 1) for (const b of pre) b.wait = false;
        g.plan = rest; oE();
        if (total > 1 && !(allReady && !rest.length)) g.planSync = g.planSync || { t: 0 };
      } finally { g.w1inExec = false; }
    };
    hud.w1stackSync = sync;
  }

  function installRadioLog(Game) {
    const P = Game.prototype;
    const on = (g) => g.settings.radioLog !== false;
    const oU = P.updateBreach;
    P.updateBreach = function (b, dt) {
      const ph = b.phase;
      const r = oU.call(this, b, dt);
      bus.game = this;
      if (on(this) && b.units[0] && b.units[0].kind === 'op' && ph !== b.phase) {
        if (ph === 'stack' && (b.phase === 'ready' || b.phase === 'act')) bus.push(teamName(b.units[0]), b.w1timeout ? 'stack incomplete, going anyway' : 'stacked on door', 'stack');
        if (b.phase === 'act' && !b.w1rl) {
          b.w1rl = true;
          const br = b.breacher || b.units[0];
          bus.push(callsign(this, br), BREACH_TXT[b.method] || 'breaching', 'breach', { uid: br.uid });
        }
        if ((b.phase === 'done' || b.phase === 'flash') && b.door.state !== 'closed' && !b.w1room) {
          b.w1room = true;
          const L = this.level;
          const room = L.room[L.idx(b.far[0], b.far[1])];
          (this.w1rooms || (this.w1rooms = [])).push({ room, team: b.units[0].team, t: this.time, b });
        }
      }
      return r;
    };
    const oS = P.step;
    P.step = function (dt) {
      const r = oS.call(this, dt);
      bus.game = this;
      if (!on(this)) return r;
      this.w1rlT = (this.w1rlT || 0) - dt;
      if (this.w1rlT > 0) return r;
      this.w1rlT = 0.4;
      const L = this.level;
      if (this.w1rooms && this.w1rooms.length) this.w1rooms = this.w1rooms.filter(q => {
        if (this.time - q.t < 1.5) return true;
        if (this.time - q.t > 40) return false;
        const inside = this.ops.some(o => o.alive && o.team === q.team && L.room[L.cellOf(o.x, o.z)] === q.room);
        if (!inside) return true;
        if (this.enemies.some(e => e.alive && L.room[L.cellOf(e.x, e.z)] === q.room)) return true;
        bus.push(TEAMS[q.team].name, 'room clear', 'clear');
        return false;
      });
      return r;
    };
    if (P.vipMark) {
      const oV = P.vipMark;
      P.vipMark = function (v, op) {
        const r = oV.call(this, v, op);
        if (on(this)) bus.push(callsign(this, op), 'VIP secured, moving to exit', 'vip', { uid: op && op.uid });
        return r;
      };
    }
    const radio = window.__audio && window.__audio.radio;
    if (radio && !radio.__batch1) {
      radio.__batch1 = true;
      const oSay = radio.say.bind(radio);
      radio.say = function (key, who = 0, prio = 1) {
        const g = bus.game;
        try { if (g && on(g)) lineFor(g, key, who); } catch (e) { /* keep the callout playing */ }
        return oSay(key, who, prio);
      };
    }
  }

  function installRadioLogHud(hud) {
    const box = document.createElement('div');
    box.className = 'w1radio';
    box.setAttribute('aria-live', 'polite');
    hud.root.append(box);
    let fit = MAX_LINES, posT = 0;
    const obstacles = () => [...hud.root.querySelectorAll('.hud-top > *, .hud-left, .hud-right, .w1cam, .pausebtn, .hud-tbar')].filter(n => n.offsetParent && !n.classList.contains('hidden')).map(n => n.getBoundingClientRect()).filter(r => r.width && r.height);
    const hit = (a, r) => a.left < r.right && a.right > r.left && a.top < r.bottom && a.bottom > r.top;
    const place = () => {
      const W = innerWidth, H = innerHeight, obs = obstacles();
      const top = hud.root.querySelector('.hud-top');
      const tb = top ? top.getBoundingClientRect().bottom : 40;
      const lh = W < 420 || H < 420 ? 15 : 17;
      const w = Math.min(W < 420 ? W * 0.56 : 300, W - 16);
      const lefts = [8, (W - w) / 2];
      const leftCol = hud.root.querySelector('.hud-left');
      if (leftCol) { const lr = leftCol.getBoundingClientRect(); if (lr.width) lefts.push(lr.right + 6); }
      for (let n = MAX_LINES; n >= 2; n--) for (const x of lefts) for (const y of [tb + 6, tb + 40]) {
        const a = { left: x, right: x + w, top: y, bottom: y + n * lh + 6 };
        if (a.right > W - 4 || a.bottom > H - 4) continue;
        if (!obs.some(r => hit(a, r))) { box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = w + 'px'; fit = n; box.dataset.fit = n; return; }
      }
      fit = 0; box.dataset.fit = 0;
    };
    const render = () => { while (box.children.length > fit) box.firstChild.remove(); box.classList.toggle('empty', !box.children.length); };
    const add = (line) => {
      const g = hud.g; if (!g || (g.settings && g.settings.radioLog === false)) return;
      const now = performance.now(); if (now - posT > 500) { posT = now; place(); }
      if (!fit) return;
      const d = document.createElement('div'); d.className = 'w1rl k-' + line.kind;
      const b = document.createElement('b'); b.textContent = line.callsign + ': ';
      d.append(b, document.createTextNode(line.text));
      box.append(d); render();
      const L = life();
      setTimeout(() => d.classList.add('fade'), L - 900);
      setTimeout(() => { d.remove(); render(); }, L);
    };
    bus.on(add);
    bus.addEventListener('reset', () => { box.textContent = ''; render(); });
    addEventListener('resize', () => { posT = 0; place(); render(); });
    const oB = hud.bind.bind(hud);
    hud.bind = function (g, ...a) { const r = oB(g, ...a); bus.reset(g); posT = 0; requestAnimationFrame(() => { place(); render(); }); return r; };
    const oX = hud.executePlan.bind(hud);
    hud.executePlan = function () {
      const g = this.g; const n = g && g.plan ? g.plan.length : 0;
      const r = oX();
      if (n && g && g.settings.radioLog !== false) bus.push('HQ', n > 1 ? 'all teams, execute — go, go, go!' : 'execute — go, go, go!', 'go');
      return r;
    };
    const oP = hud.openPauseMenu.bind(hud);
    hud.openPauseMenu = function () {
      const r = oP();
      const g = this.g, m = this.pauseMenu;
      if (!g || !m) return r;
      const s = g.settings;
      const b = document.createElement('button'); b.className = 'pm-row';
      const lab = () => { b.innerHTML = 'Radio log: <b>' + (s.radioLog === false ? 'Off' : 'On') + '</b>'; };
      lab();
      b.onclick = () => { s.radioLog = s.radioLog === false; lab(); if (s.radioLog === false) { box.textContent = ''; render(); } };
      const plan = m.querySelector('.pm-plan');
      if (plan) m.insertBefore(b, plan); else m.append(b);
      return r;
    };
    hud.w1radio = { box, place, bus };
  }

  function installShots(hud) {
    const top = hud.root.querySelector('.hud-top');
    if (!top || top.querySelector('.zshots')) return;
    const el = document.createElement('div');
    el.className = 'zshots';
    el.title = 'Shots fired';
    el.textContent = 'Shots 0';
    top.append(el);
    const orig = hud.update.bind(hud);
    hud.update = function () {
      const r = orig();
      const n = this.g && this.g.stats ? this.g.stats.shots : 0;
      el.textContent = 'Shots ' + n;
      return r;
    };
  }

  const CSS = '.w1radio{position:absolute;left:8px;top:64px;width:300px;z-index:4;pointer-events:none;display:flex;flex-direction:column;justify-content:flex-end;gap:1px;font:600 12px/16px system-ui,sans-serif;color:#e8f0e8}.w1radio.empty{display:none}.w1radio .w1rl{background:rgba(8,14,10,.42);border-left:2px solid rgba(120,220,140,.7);padding:0 6px;border-radius:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px #000;transition:opacity .9s;opacity:.92}.w1radio .w1rl b{color:#9fe0b0;font-weight:700}.w1radio .w1rl.fade{opacity:0}.w1radio .k-contact,.w1radio .k-hit,.w1radio .k-down,.w1radio .k-alarm{border-left-color:#ff6a5a}.w1radio .k-lowammo,.w1radio .k-reload{border-left-color:#ffc04a}.w1radio .k-breach,.w1radio .k-go{border-left-color:#ff9a3c}.w1radio .k-clear,.w1radio .k-hostage,.w1radio .k-vip{border-left-color:#5fd068}.zshots{font:700 13px ui-monospace,monospace;background:#0008;padding:3px 8px;border-radius:6px;color:#e8e2d0;white-space:nowrap}#hud>.w1radio{pointer-events:none}@media (max-width:420px),(max-height:420px){.w1radio{font-size:10.5px;line-height:14px}.zshots{font-size:11px;padding:2px 6px}}';

  function install(Game) {
    if (!Game || Game.prototype.__batch1) return;
    Game.prototype.__batch1 = true;
    installStack2(Game);
    installRadioLog(Game);
  }

  function boot() {
    const app = window.__app;
    if (!app || app.__batch1) return;
    app.__batch1 = true;
    if (!document.getElementById('batch1css')) {
      const st = document.createElement('style');
      st.id = 'batch1css';
      st.textContent = CSS;
      document.head.append(st);
    }
    installStack2Hud(app.hud);
    installRadioLogHud(app.hud);
    installShots(app.hud);
    const orig = app.startMission.bind(app);
    app.startMission = function () {
      const r = orig.apply(this, arguments);
      if (window.__game && window.__game.constructor) install(window.__game.constructor);
      return r;
    };
  }
  const wait = setInterval(() => { if (window.__app) { clearInterval(wait); boot(); } }, 40);
})();
