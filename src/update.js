// upd: auto-update + build label. Bundled separately by build.mjs (inline <script> at the end of <body>), so the game code
// is untouched. Build id comes from window.__ZULU_BUILD (= SW cache name), written by build.mjs.
// - PWA build over http(s) (has <link rel=manifest>): registers ./sw.js with updateViaCache:'none', checks on launch,
//   on visibilitychange/focus/online and every 30 min (reg.update() + version.json?t=<now>, no-store).
// - New version: auto-reload when safe (no mission, on the main menu or tab hidden), else a small toast "tap to reload".
// - file:// (index.html, download zip) and play.html: no network, no SW; only the label.
(function () {
  var BUILD = window.__ZULU_BUILD || 'dev', BUILT = window.__ZULU_BUILT || '';
  var web = /^https?:$/.test(location.protocol), pwa = web && !!document.querySelector('link[rel=manifest]');
  var sw = pwa && 'serviceWorker' in navigator ? navigator.serviceWorker : null;
  var st = { build: BUILD, remote: null, status: pwa ? 'checking' : 'offline file', sw: sw ? 'pending' : 'none', ready: false, checks: 0 };
  var reg = null, hadCtl = !!(sw && sw.controller), lastCheck = 0, toastEl = null, AUTO = 'zulu-upd-auto';
  window.__zuluUpdate = st;

  // ---------- UI: style, build label, toast ----------
  var css = document.createElement('style');
  css.textContent = '.upd-ver{margin:14px 0 4px;font:12px/1.4 ui-monospace,Menlo,monospace;color:#8b97a5;text-align:center;opacity:.85;cursor:pointer;user-select:text}' +
    '.upd-ver b{color:#cfd8e3;font-weight:600}.upd-toast{position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:200;display:flex;gap:6px;align-items:center;' +
    'background:#14181ef2;border:1px solid #ff7a1a;border-radius:20px;box-shadow:0 6px 24px #000a;color:#f2f4f7;font:600 13px system-ui,sans-serif;padding:6px 6px 6px 14px;max-width:92vw}' +
    '.upd-toast button{background:none;border:0;color:inherit;font:inherit;padding:4px 6px;cursor:pointer}.upd-toast .upd-go{color:#ffb070}.upd-toast .upd-x{opacity:.6;font-size:15px}';
  document.head.appendChild(css);
  var when = BUILT ? new Date(BUILT) : null;
  function labelText() {
    var s = st.ready ? 'update ready — tap to reload' : st.status;
    return 'Build <b>' + BUILD + '</b>' + (when && !isNaN(when) ? ' · ' + when.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '') + ' · ' + s;
  }
  function paintLabels() { var ls = document.querySelectorAll('.upd-ver'); for (var i = 0; i < ls.length; i++) ls[i].innerHTML = labelText(); }
  function addLabel() {
    var bodies = document.querySelectorAll('#menu .screen.settings .scr-body, #menu .screen.credits .scr-body');
    for (var i = 0; i < bodies.length; i++) if (!bodies[i].querySelector('.upd-ver')) {
      var d = document.createElement('div'); d.className = 'upd-ver'; d.innerHTML = labelText();
      d.onclick = function () { if (st.ready) reload(); else check(true); }; bodies[i].appendChild(d);
    }
  }
  var menu = document.getElementById('menu');
  if (menu && window.MutationObserver) new MutationObserver(addLabel).observe(menu, { childList: true });
  function set(k, v) { st[k] = v; paintLabels(); }
  function toast() {
    if (toastEl || !document.body) return;
    toastEl = document.createElement('div'); toastEl.className = 'upd-toast'; toastEl.setAttribute('role', 'status');
    toastEl.innerHTML = '<button class="upd-go">New version ready — tap to reload</button><button class="upd-x" aria-label="Dismiss">✕</button>';
    toastEl.querySelector('.upd-go').onclick = reload;
    toastEl.querySelector('.upd-x').onclick = function () { toastEl.remove(); toastEl = null; };
    document.body.appendChild(toastEl);
  }
  if (!pwa) return;

  // ---------- update logic ----------
  function midMission() { return !!window.__game; }
  function safe() { return !midMission() && !document.querySelector('.modal:not(.tut-offer)') && (document.hidden || !!document.querySelector('#menu .mainmenu') || !window.__app); }
  function reload() {
    try { sessionStorage.setItem(AUTO, st.remote || 'x'); } catch (_) {}
    // without a SW a plain reload may come from the HTTP cache (itch: 31-day max-age), so refresh that first
    var pre = sw && sw.controller ? Promise.resolve() : fetch(location.href, { cache: 'reload', credentials: 'same-origin' }).catch(function () {});
    pre.then(function () { location.reload(); });
  }
  function ready(target) {
    if (st.ready) return; if (target) st.remote = target; set('ready', true);
    var tried = null; try { tried = sessionStorage.getItem(AUTO); } catch (_) {}
    if (safe() && tried !== (st.remote || 'x')) return reload(); // at most one automatic reload per new build
    toast();
  }
  function swVer() {
    return new Promise(function (res) {
      var c = sw && sw.controller; if (!c) return res(null);
      var ch = new MessageChannel(), t = setTimeout(function () { res(null); }, 2000);
      ch.port1.onmessage = function (e) { clearTimeout(t); res(e.data && e.data.ver); }; c.postMessage({ type: 'zulu-ver' }, [ch.port2]);
    });
  }
  function waitForSw(target, n) { // the new SW is installing (3 MB): poll until it controls the page
    swVer().then(function (v) { if (v === target) ready(target); else if (n > 0 && !st.ready) setTimeout(function () { waitForSw(target, n - 1); }, 3000); });
  }
  function check(force) {
    var now = Date.now(); if (!force && now - lastCheck < 5000) return; lastCheck = now; st.checks++;
    if (reg && reg.update) reg.update().catch(function () {});
    fetch('./version.json?t=' + now, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.build) return set('status', 'version check unavailable');
      st.remote = j.build;
      if (j.build === BUILD) { try { sessionStorage.removeItem(AUTO); } catch (_) {} return set('status', 'up to date (checked ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ')'); }
      set('status', 'new build ' + j.build + ' found');
      if (reg && sw.controller) waitForSw(j.build, 40); else ready(j.build);
    }).catch(function () { set('status', navigator.onLine === false ? 'offline' : 'version check failed'); });
  }
  if (sw) {
    try { sw.startMessages && sw.startMessages(); } catch (_) {}
    sw.addEventListener('message', function (e) { var d = e.data || {}; if (d.type === 'zulu-hello' && e.ports && e.ports[0]) e.ports[0].postMessage({ build: BUILD, busy: midMission() }); });
    sw.addEventListener('controllerchange', function () {
      if (!hadCtl) { hadCtl = true; return; } // first install, not an update
      swVer().then(function (v) { if (v && v !== BUILD) ready(v); });
    });
  }
  function start() {
    if (sw) sw.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(function (r) { if (!r) return set('sw', 'unavailable'); reg = r; set('sw', 'registered'); r.update().catch(function () {}); },
      function (e) { set('sw', 'failed: ' + (e && e.name || e)); }); // e.g. itch iframe with blocked storage: version.json path still works
    check(true);
  }
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); else if (st.ready && safe()) reload(); });
  addEventListener('focus', function () { check(); });
  addEventListener('online', function () { check(true); });
  setInterval(function () { check(true); }, 30 * 60 * 1000);
})();
