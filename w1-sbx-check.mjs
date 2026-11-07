// w1 AI Sandbox check: main menu → AI Sandbox → pick map → AI vs AI runs on its own to a result screen; spectator bar
// (free/follow cam, speed, restart, exit); the save is untouched. Phones: portrait / landscape / Fold bar fits, no overlap.
// Usage: TAG=w1c node w1-sbx-check.mjs [file]   (MAPS=embassy,ranch)
import { chromium, devices } from 'playwright-core';
const file = process.argv[2] || 'index.html'; const TAG = process.env.TAG || 'w1c'; const OUT = process.env.OUT || process.cwd() + '/screenshots-w1c';
const RUN = (process.env.MAPS || 'embassy,ranch').split(',');
const url = 'file://' + (file.startsWith('/') ? file : process.cwd() + '/' + file);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const shotP = async (p, path) => { for (let k = 0; k < 3; k++) try { return await p.screenshot({ path, type: 'jpeg', quality: 72, timeout: 120000 }); } catch (e) { console.log('screenshot retry', path, e.message.split('\n')[0]); } };
const res = []; const ok = (n, c, d = '') => { res.push(c); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? ' — ' + d : '')); }; const errs = [];
const DEVS = { desktop: { viewport: { width: 1280, height: 720 } }, portrait: { ...devices['Pixel 7'], viewport: { width: 412, height: 839 } }, landscape: { ...devices['Pixel 7'], viewport: { width: 863, height: 360 } }, fold: { ...devices['Pixel 7'], viewport: { width: 344, height: 882 } } };
const saveSig = () => { const s = window.__app.save; return JSON.stringify({ cash: s.cash, stars: s.stars, completed: s.completed, best: s.best, rosters: s.rosters, stock: s.stock, stats: s.stats }); };
for (const dev of Object.keys(DEVS)) {
  const ctx = await b.newContext(DEVS[dev]); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(dev + ': ' + e.message));
  await p.goto(url); await p.waitForFunction(() => window.__app && document.querySelector('.mm-col'), null, { timeout: 90000 });
  await p.evaluate(() => { document.querySelectorAll('.modal,.rotate-hint,.tut-offer').forEach(m => m.remove()); window.__app.save.tutorialOffered = true; window.__app.menus.main(); });
  const sig0 = await p.evaluate(saveSig);
  const mm = await p.evaluate(() => { const b = document.querySelector('.mm-col .w1sbx-btn'); if (!b) return null; b.click(); return { maps: [...document.querySelectorAll('.w1sbx-map')].map(x => x.dataset.map), chips: document.querySelectorAll('.w1sbx-chip').length }; });
  ok(`${dev}: main menu has AI Sandbox → map picker`, mm && mm.maps.length >= 14 && mm.chips === 3, JSON.stringify(mm));
  await p.waitForTimeout(600); await shotP(p, `${OUT}/sandbox-${TAG}-menu-${dev}.jpg`);
  const maps = dev === 'desktop' ? RUN : ['embassy'];
  for (const map of maps) {
    await p.evaluate((map) => { document.querySelector('.w1sbx-chip:nth-of-type(1)')?.click(); document.querySelector(`.w1sbx-map[data-map="${map}"]`).click(); }, map);
    await p.waitForFunction(() => window.__game && window.__game.mission.sandbox, null, { timeout: 90000 });
    const st = await p.evaluate(() => { const g = window.__game, a = window.__app; return { map: g.mission.map, planning: !!a.hud.planning, paused: g.paused, bar: !!document.querySelector('.w1sbx-bar'), ops: g.ops.length, foes: g.enemies.length, menu: !a.menus.root.classList.contains('hidden') }; });
    ok(`${dev} ${map}: sandbox mission live, no plan screen, unpaused, spectator bar up`, st.map === map && !st.planning && !st.paused && st.bar && st.ops > 0 && st.foes > 0 && !st.menu, JSON.stringify(st));
    if (dev === 'desktop') {
      const cam = await p.evaluate(() => { const a = window.__app, c = a.env.cam, bs = [...document.querySelectorAll('.w1sbx-bar .w1sbx-b')]; const out = {};
        bs[1].click(); out.f1 = !!c.follow; out.l1 = bs[1].textContent; bs[1].click(); out.l2 = bs[1].textContent; out.cycle = c.follow !== null;
        bs[0].click(); out.free = !c.follow; bs[2].click(); out.speed = window.__game.timeScaleSet; out.lbl = bs[2].textContent; bs[2].click(); bs[2].click(); bs[2].click(); out.back = window.__game.timeScaleSet; return out; });
      ok(`${dev} ${map}: Follow cycles units, Free stops follow, speed ½–3× cycles`, cam.f1 && cam.l1 !== cam.l2 && cam.free && cam.speed === 2 && cam.lbl === '2×' && cam.back === 1, JSON.stringify(cam));
      await p.evaluate(() => document.querySelectorAll('.w1sbx-bar .w1sbx-b')[1].click());
      await p.waitForTimeout(2500); await shotP(p, `${OUT}/sandbox-${TAG}-${map}-follow.jpg`); await p.evaluate(() => document.querySelectorAll('.w1sbx-bar .w1sbx-b')[0].click());
      // let the AI play it out (stepped sim; nobody touches the squad)
      var mid = null; let r = null; for (let chunk = 0; chunk < 40; chunk++) {
        r = await p.evaluate(() => { const g = window.__game; if (!g) return { ended: true }; for (let k = 0; k < 150 && window.__game === g; k++) g.frame(0.1);
          const G = window.__game || g; return { ended: !window.__game, t: Math.round(G.time), cmds: G.w1cmds || 0, breaches: G.breaches.length, opened: G.level.doors.filter(d => d.state !== 'closed').length, foes: G.enemies.filter(e => e.alive).length, ops: G.ops.filter(o => o.alive).length }; });
        if (chunk === 2) { await shotP(p, `${OUT}/sandbox-${TAG}-${map}-live.jpg`); } if (r.ended) break; if (chunk % 5 === 0) console.log('  ', map, JSON.stringify(r)); if (!r.ended) var mid = r; }
      const end = await p.waitForFunction(() => document.querySelector('.w1sbx-res'), null, { timeout: 30000 }).then(() => p.evaluate(() => ({ res: document.querySelector('.w1sbx-res .res').textContent, mt: document.querySelector('.w1sbx-res .mt').textContent, aar: !!document.querySelector('.aar-head'), bar: !!document.querySelector('.w1sbx-bar') }))).catch(() => null);
      ok(`${dev} ${map}: AI commander drove the squad (orders + breaches + doors opened)`, mid && mid.cmds > 0 && mid.breaches > 0 && mid.opened > 0, JSON.stringify(mid));
      ok(`${dev} ${map}: AI vs AI plays out to the sandbox result screen (no campaign AAR)`, !!end && !end.aar && !end.bar, JSON.stringify({ end, last: r }));
      await shotP(p, `${OUT}/sandbox-${TAG}-${map}-result.jpg`);
      ok(`${dev} ${map}: save untouched (cash/stars/completed/roster/stock)`, (await p.evaluate(saveSig)) === sig0);
      if (map === RUN[0]) { // restart from the result screen, then restart + exit from the bar
        const rs = await p.evaluate(async () => { document.querySelector('.w1sbx-btns .mbtn').click(); await new Promise(r => setTimeout(r, 300)); const g1 = window.__game; document.querySelectorAll('.w1sbx-bar .w1sbx-b')[3].click(); await new Promise(r => setTimeout(r, 300)); const g2 = window.__game;
          const o = { r1: !!g1 && g1.mission.sandbox, r2: !!g2 && g2 !== g1 && g2.mission.map === g1.mission.map, bars: document.querySelectorAll('.w1sbx-bar').length }; document.querySelectorAll('.w1sbx-bar .w1sbx-b')[4].click(); await new Promise(r => setTimeout(r, 300));
          o.exit = !window.__game && !!document.querySelector('.mm-col') && !document.querySelector('.w1sbx-bar'); return o; });
        ok(`${dev}: Restart (result screen + bar) reloads the same map; Exit returns to the main menu`, rs.r1 && rs.r2 && rs.bars === 1 && rs.exit, JSON.stringify(rs));
        await p.evaluate(() => document.querySelector('.mm-col .w1sbx-btn').click()); }
    } else {
      await p.waitForTimeout(1500);
      const r = await p.evaluate(() => { const bar = document.querySelector('.w1sbx-bar'); const br = bar.getBoundingClientRect();
        const ctl = [...document.querySelectorAll('.hud button, .hud .cmd, .hud-teams > *, .hud-top > *, .w1cam, .hud-tbar, .hud-ports > *, .w1radio')].filter(n => n.offsetParent && !bar.contains(n)).map(n => ({ n: n.className.split(' ')[0] || n.tagName, r: n.getBoundingClientRect() })).filter(x => x.r.width && x.r.height);
        const hits = ctl.filter(x => br.left < x.r.right && br.right > x.r.left && br.top < x.r.bottom && br.bottom > x.r.top).map(x => x.n);
        const btns = [...bar.querySelectorAll('button')].map(x => x.getBoundingClientRect()); return { rect: [br.left, br.top, br.width, br.height].map(Math.round), hits, inView: br.left >= 0 && br.right <= innerWidth && br.top >= 0 && br.bottom <= innerHeight, tap: Math.min(...btns.map(x => x.height)), area: br.width * br.height / (innerWidth * innerHeight) }; });
      ok(`${dev}: sandbox bar inside the screen, tappable (≥26px), < 12% of view`, r.inView && r.tap >= 26 && r.area < 0.12, JSON.stringify(r));
      ok(`${dev}: sandbox bar overlaps no HUD control or radio feed`, r.hits.length === 0, r.hits.join(','));
      await shotP(p, `${OUT}/sandbox-${TAG}-live-${dev}.jpg`);
      const ex = await p.evaluate(() => { document.querySelectorAll('.w1sbx-bar .w1sbx-b')[4].click(); return !window.__game && !!document.querySelector('.mm-col'); }); ok(`${dev}: Exit → main menu`, ex);
      ok(`${dev}: save untouched`, (await p.evaluate(saveSig)) === sig0);
    }
  }
  await ctx.close();
}
ok('no page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
console.log(res.every(Boolean) ? 'W1 SANDBOX CHECK ALL PASS' : 'FAILURES', res.filter(x => !x).length + '/' + res.length); await b.close(); process.exit(0);
