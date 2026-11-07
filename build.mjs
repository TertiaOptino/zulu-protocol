import { build, transform } from 'esbuild'; import fs from 'fs'; import crypto from 'crypto'; import zlib from 'zlib'; import path from 'path'; import { swSource } from './sw-gen.mjs'; // upd
// soldier GLB: bundled as the visually-lossless repack from opt-glb.mjs (bit-identical mesh/textures/animation, smaller meshopt stream)
const packed = 'assets/soldier_packed.glb';
const tactical = 'assets/soldier_tactical.glb';
// The parked source archive omitted the Sketchfab GLBs. The mesh the published game
// actually ships is assets/soldier_packed.glb, recovered byte-for-byte from main's index.html.
// soldier_tactical.glb is only the pre-pack source used as a staleness sentinel; it was not in the archive or the bundle.
if (!fs.existsSync(packed)) throw new Error(packed + ' missing: recover the packed Sketchfab soldier from the published build (do not substitute another mesh)');
if (fs.existsSync(tactical) && fs.statSync(packed).mtimeMs < fs.statSync(tactical).mtimeMs) throw new Error(packed + ' stale vs ' + tactical + ': run node opt-glb.mjs');
const packedGlb = { name: 'packed-glb', setup(b) { b.onResolve({ filter: /soldier_tactical\.glb$/ }, () => ({ path: path.resolve(packed) })); } };
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none', loader: { '.glb': 'binary' }, plugins: [packedGlb] });
const js = r.outputFiles[0].text; const css = fs.readFileSync('src/style.css', 'utf8') + (fs.existsSync('src/b4.css') ? '\n' + fs.readFileSync('src/b4.css', 'utf8') : '') + '\n' + fs.readFileSync('src/w2-layout.css', 'utf8'); /* B4: append batch-4 styles */ // w2: layout-sweep CSS appended last
let base = fs.readFileSync('src/template.html', 'utf8').replace('/*CSS*/', () => css).replace('/*JS*/', () => js.replace(/<\/script/g, '<\\/script'));
// upd: auto-update script (src/update.js) bundled on its own and appended to <body>; build id + time go in <head> (outside the hash)
const upd = (await build({ entryPoints: ['src/update.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2017', legalComments: 'none' })).outputFiles[0].text; // upd
{ const at = base.lastIndexOf('</body>'); base = base.slice(0, at) + `<script>${upd.replace(/<\/script/g, '<\\/script')}</script>` + base.slice(at); } // upd
const verH = crypto.createHash('sha1').update(base); for (const f of fs.readdirSync('assets/icons').sort()) verH.update(fs.readFileSync('assets/icons/' + f)); const ver = verH.digest('hex').slice(0, 10); // code + icons, so a new icon also bumps the SW cache
const BUILD = 'zulu-' + ver, BUILT = new Date().toISOString(); const buildTag = `<script>window.__ZULU_BUILD=${JSON.stringify(BUILD)};window.__ZULU_BUILT=${JSON.stringify(BUILT)}</script>`; // upd
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync('assets/icons/' + f).toString('base64');
// 1) single-file build (works from file://, no manifest/service worker)
const html = base.replace('<!--HEAD-->', `${buildTag}<link rel="icon" type="image/png" sizes="32x32" href="${b64('favicon-32.png')}"><link rel="icon" type="image/png" sizes="16x16" href="${b64('favicon-16.png')}"><link rel="apple-touch-icon" sizes="180x180" href="${b64('apple-touch-icon.png')}">`);
fs.writeFileSync('index.html', html); console.log('index.html', (html.length / 1024).toFixed(0) + ' KB');
// 2) installable PWA in dist/ (relative paths so it works from any sub-folder)
fs.rmSync('dist', { recursive: true, force: true }); fs.mkdirSync('dist/icons', { recursive: true });
for (const f of fs.readdirSync('assets/icons')) fs.copyFileSync('assets/icons/' + f, 'dist/icons/' + f);
// upd: SW registration moved to src/update.js (updateViaCache:'none', update checks, reload toast)
fs.writeFileSync('dist/index.html', base.replace('<!--HEAD-->', `${buildTag}<link rel="manifest" href="./manifest.webmanifest"><link rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png"><link rel="icon" type="image/png" sizes="16x16" href="./icons/favicon-16.png"><link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png">`));
fs.writeFileSync('dist/manifest.webmanifest', JSON.stringify({ name: 'Zulu Protocol', short_name: 'Zulu', description: 'Tactical breach & clear game', id: './', start_url: './', scope: './', display: 'fullscreen', display_override: ['fullscreen', 'standalone'], orientation: 'landscape', background_color: '#0d1014', theme_color: '#0d1014',
  icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }, null, 1));
const files = ['./index.html', './manifest.webmanifest', ...fs.readdirSync('dist/icons').sort().map(f => './icons/' + f)]; // upd
fs.writeFileSync('dist/sw.js', swSource(BUILD, files)); // upd: network-first page, cache-first static (sw-gen.mjs)
fs.writeFileSync('dist/version.json', JSON.stringify({ build: BUILD, built: BUILT }) + '\n'); // upd: fetched with ?t=<now>, no-store
console.log('dist/ PWA', 'cache zulu-' + ver);
// 3) play.html: the full game as one tap-to-play file for chat/file viewers. Same code, same textures and
//    mesh as index.html; the script is gzip + base64 in short lines and unpacked by a small readable loader (native
//    DecompressionStream, tiny-inflate fallback). Every line stays short; doctype + full head kept.
{
  const gz = zlib.gzipSync(Buffer.from(js + '\n//# sourceURL=zulu-protocol.js', 'utf8'), { level: 9 }).toString('base64').replace(/.{1,100}/g, '$&\n');
  const inflate = (await transform(fs.readFileSync('node_modules/tiny-inflate/index.js', 'utf8'), { format: 'iife', globalName: 'tinyInflate', minify: true, target: 'es2017' })).code.replace(/;/g, ';\n');
  const head = base.split('<style>')[0].replace(/></g, '>\n<').replace('<!--HEAD-->', `<link rel="icon" href="${b64('favicon-32.png').replace(/.{1000}/g, '$&\n')}">`);
  const loader = `<script>
/* Zulu Protocol loader: the game script below is gzip + base64 to keep this file small. */
(function () {
  var box = document.getElementById('zboot');
  function fail(e) { box.textContent = 'Could not start the game: ' + (e && e.message || e); console.error(e); }
  function gunzip(bytes) {
    if (typeof DecompressionStream === 'function') {
      var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Response(stream).arrayBuffer().then(function (b) { return new Uint8Array(b); });
    }
    // fallback for older browsers: raw inflate after the 10-byte gzip header; output size is the last 4 bytes
    var n = bytes.length, size = (bytes[n - 4] | bytes[n - 3] << 8 | bytes[n - 2] << 16 | bytes[n - 1] << 24) >>> 0;
    return Promise.resolve(tinyInflate(bytes.subarray(10, n - 8), new Uint8Array(size)));
  }
  try {
    var text = document.getElementById('zulu-js').textContent.replace(/\\s+/g, '');
    var bin = atob(text), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    gunzip(bytes).then(function (out) {
      var s = document.createElement('script');
      s.textContent = new TextDecoder().decode(out);
      document.body.appendChild(s);
      var t = setInterval(function () { if (window.__app) { clearInterval(t); box.remove(); } }, 100);
    }).catch(fail);
  } catch (e) { fail(e); }
})();
</script>`;
  const play = `${head}
<style>
${css}
#zboot{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
  color:#9fb3c8;font:600 15px system-ui,sans-serif;letter-spacing:.12em;background:#0d1014;z-index:99}
</style>
</head>
<body>
<canvas id="cv"></canvas>
<div id="hud" class="hidden"></div>
<div id="menu"></div>
<div id="zboot">LOADING ZULU PROTOCOL…</div>
<script>
${inflate}
</script>
<script type="text/plain" id="zulu-js">
${gz}</script>
${loader}
</body>
</html>
`;
  for (const f of ['play.html', 'stage-17.html']) fs.writeFileSync(f, play);
  const maxLine = Math.max(...play.split('\n').map(l => l.length));
  console.log('play.html', (Buffer.byteLength(play) / 1024).toFixed(0) + ' KB', 'lines', play.split('\n').length, 'longest line', maxLine);
}
