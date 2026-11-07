import * as __THUMBS from './thumbs.js';
import { opStyle as __opStyle } from './charstyle.js';
import * as THREE from 'three';
import { MISSIONS as __MISSIONS } from './maps.js';
import { TacCam } from './camera.js';
import { Post } from './post.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { Menus } from './menus.js';
import { loadSave, writeSave } from './save.js';
import { Level } from './level.js';
import { MAPS } from './maps.js';
import './maps3.js'; // batch3: open maps, missions, scenery keys
import { buildLevelScene, makeFogUniforms } from './scenebuild.js';
import { setMix, initAudio, musicCtl, registerWeapons, audioMix } from './audio.js';
import { REGIONS } from './maps.js';
const musicFor = (m) => (m.mode === 'training' || /tut/i.test(m.id || '')) ? 'tutorial' : (REGIONS.find(r => r.missions.includes(m.id)) || {}).id || 'de';
import { isIOS } from './hud.js';
import { setGunLod } from './guns.js';
import { GAME_TITLE, WEAPONS as __WEAPONS } from './data.js';
import { el } from './util.js';
import { installSquad } from './squad.js';
import { installB4 } from './b4.js'; // B4: marketplace + stages + mission kit
import { Tutorial, TUTORIAL_MISSION, tutorialOffer } from './tutorial.js';
import { roster } from './save.js';
import { rebind as __rebind, bindings as __bindings } from './controls.js';
import { makeCharacter } from './models.js';
import { soldierReady, setSoldierShadows, setSoldierQuality } from './soldier.js';
import { installW1Hud } from './w1.js'; // w1: door stacks + radio log

class App {
  constructor() {
    document.title = GAME_TITLE;
    this.save = loadSave(); setMix(audioMix(this.save.settings)); registerWeapons(__WEAPONS); musicCtl.play('menu');
    const cv = document.getElementById('cv'); this.cv = cv;
    this.mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600; this.ios = isIOS; document.documentElement.classList.toggle('ios', isIOS); document.documentElement.classList.toggle('touch', this.mobile);
    document.documentElement.classList.toggle('standalone', !!(navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches));
    this.quality = this.resolveQuality(); setGunLod(this.quality !== 'low');
    try { this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: this.quality === 'high', powerPreference: 'high-performance' }); }
    catch (e) { document.getElementById('menu').innerHTML = '<div class="screen"><h2>WebGL is unavailable</h2><p class="dim">Zulu Protocol needs WebGL. Turn on hardware acceleration in your browser settings, or try Chrome, Safari, Firefox or Edge.</p></div>'; throw e; }
    // Safety net for weak GPUs: if the 2048 soldier atlas exceeds the GPU limit, use the 1024 copy (full quality everywhere else).
    this.texCap = this.renderer.capabilities.maxTextureSize; if (this.texCap < 2048 && this.quality === 'high') setSoldierQuality('medium');
    // Android/iOS may drop the GL context when the tab is backgrounded; preventDefault lets the browser restore it.
    cv.addEventListener('webglcontextlost', e => e.preventDefault(), false);
    this.aa = this.quality === 'high'; this.renderer.shadowMap.enabled = this.quality !== 'low'; this.renderer.shadowMap.type = this.quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05; this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.3, 200); this.post = new Post(this.renderer);
    this.env = { renderer: this.renderer, camera: this.camera, cam: new TacCam(this.camera), quality: this.quality, scene: null }; this.env.cam.sens = this.save.settings.sens || 1;
    this.menuRoot = document.getElementById('menu'); this.hud = new HUD(document.getElementById('hud'), this.env); this.hud.hide();
    this.input = new Input(cv, this.env, this.hud); this.input.settings = () => this.save.settings; this.hud.settingsRef = () => this.save.settings; this.applyCamSettings(); this.menus = new Menus(this); installSquad(this.menus); installB4(this); /* B4 */ installW1Hud(this); // w1
    addEventListener('resize', () => this.resize()); this.resize();
    this.buildBackdrop(); this.menus.main(); this.portraitHint();
    if (!this.save.tutorialOffered && !Object.keys(this.save.completed).length) setTimeout(() => { if (!this.game && !this.save.tutorialOffered && document.querySelector('.mainmenu')) tutorialOffer(this); }, 400);
    this.last = performance.now(); this.hudT = 0; this.fpsN = 0; this.fpsT = 0; this.fps = 60;
    this.renderer.setAnimationLoop(() => this.loop());
    for (const t of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'click', 'keydown']) addEventListener(t, () => initAudio(), { capture: true, passive: true });
    // iOS: block page pinch/double-tap zoom; all gestures are handled in-game
    for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, e => e.preventDefault(), { passive: false });
    document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
    let lastTouch = 0; document.addEventListener('touchend', e => { const n = performance.now(); if (n - lastTouch < 300 && !e.target.closest('input,textarea,select')) e.preventDefault(); lastTouch = n; }, { passive: false });
    document.addEventListener('touchmove', e => { if (e.touches.length > 1 || e.target === this.renderer.domElement) e.preventDefault(); }, { passive: false });
  }
  applyCamSettings() { const s = this.save.settings; this.env.cam.edge = !!s.edgeScroll; }
  resolveQuality() { const q = this.save.settings.quality; const r = q === 'auto' ? (this.ios ? (Math.min(screen.width, screen.height) < 400 ? 'low' : 'medium') : this.mobile ? 'medium' : 'high') : q; setSoldierShadows(r !== 'low'); setSoldierQuality(r === 'high' && this.texCap < 2048 ? 'medium' : r); return r; }
  applyQuality() { this.quality = this.env.quality = this.resolveQuality(); setGunLod(this.quality !== 'low'); const sm = this.renderer.shadowMap; sm.enabled = this.quality !== 'low'; sm.type = this.quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; sm.needsUpdate = true;
    if (this.env.scene) this.env.scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) m.needsUpdate = true; }); // shadow type change needs shader recompile
    this.resize(); return this.aa !== (this.quality === 'high'); } // true → antialiasing only changes after a reload
  resize() { const dev = devicePixelRatio || 1; let dpr = Math.min(dev, 2, this.quality === 'high' ? 1.5 : this.quality === 'low' ? 1 : 1.15);
    // menu soldier preview (no mission): render at the full device pixel ratio (cap 3, and ~9 MP for the canvas) so the model is crisp on high-DPI phones
    if (this.preview && !this.game) dpr = Math.max(dpr, Math.min(dev, 3, Math.sqrt(9e6 / Math.max(1, innerWidth * innerHeight))));
    const sz = innerWidth + 'x' + innerHeight + '@' + dpr; if (this.lastSz !== sz) { this.lastSz = sz; this.renderer.setPixelRatio(dpr); this.renderer.setSize(innerWidth, innerHeight, false); if (this.post) this.post.resize(); } this.camera.aspect = innerWidth / innerHeight; this.camera.fov = innerWidth < innerHeight ? 62 : 45; this.camera.updateProjectionMatrix(); }
  // rotate hint: only over a running mission, never on top of menu lists such as the unit store
  // menu-level toast (the HUD's toasts live inside #hud, which is hidden on menus)
  toast(msg, kind = '') { if (this.game && this.hud && !document.getElementById('hud').classList.contains('hidden')) return this.hud.toast(msg, kind);
    let box = document.querySelector('.app-toasts'); if (!box) { box = el('div', 'app-toasts'); box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.append(box); }
    const t = el('div', 'toast ' + kind, msg); box.prepend(t); while (box.children.length > 3) box.lastChild.remove(); setTimeout(() => t.classList.add('fade'), 2600); setTimeout(() => t.remove(), 3200); }
  // Portrait phones: the HUD fills the lower half, so shift the projection to centre the squad in the open area above it
  freeAreaShift() { if (innerHeight <= innerWidth) return 0; const q = (s) => document.querySelector('#hud ' + s); const top = q('.hud-top'), l = q('.hud-left'), r = q('.hud-right'); if (!top || !l) return 0;
    const t = top.getBoundingClientRect().bottom, b = Math.min(l.getBoundingClientRect().top, r ? r.getBoundingClientRect().top : innerHeight); if (!(b > t + 80)) return 0; return Math.max(0, Math.round(innerHeight / 2 - (t + b) / 2)); }
  portraitHint() { const h = el('div', 'rotate-hint', '<span class="rh-ico">📱↻</span><b>Rotate your phone</b><span>Zulu Protocol plays best in landscape</span><button>Dismiss</button>'); document.body.append(h); const hud = document.getElementById('hud'); const upd = () => h.classList.toggle('show', this.mobile && innerHeight > innerWidth && !hud.classList.contains('hidden')); upd(); addEventListener('resize', upd); new MutationObserver(upd).observe(hud, { attributes: true, attributeFilter: ['class'] }); h.onclick = () => h.remove(); }
  buildBackdrop() {
    const L = new Level(MAPS.embassy); const scene = new THREE.Scene(); const fog = makeFogUniforms(L); fog.data.fill(255); fog.tex.needsUpdate = true;
    buildLevelScene(L, scene, fog, this.quality); for (const d of L.doors) { if (d.label) d.label.visible = false; if (d.icon) d.icon.visible = false; }
    if (L.zoneMesh) L.zoneMesh.visible = false; if (L.exitMesh) L.exitMesh.visible = false;
    this.backdrop = { scene, W: L.W, H: L.H, t: 0 };
  }
  setPreview(style) {
    // exactly one soldier on the preview stage: the old model always leaves the scene (and frees its per-instance GPU data: skeleton bone texture,
    // ring material; geometries/look materials are shared caches) before anything else, whether the preview is closing or switching units
    this.pvTok = (this.pvTok || 0) + 1; if (this.preview) { this.dropChar(this.preview.ch); this.preview = null; }
    if (this.pvScene) for (const o of this.pvScene.children.filter(o => o.userData.pvSoldier)) this.dropChar({ root: o });
    if (!style) { this.resize(); return; }
    if (!this.pvScene) { const sc = new THREE.Scene(); sc.background = new THREE.Color(0x15181c); sc.add(new THREE.HemisphereLight(0xc8d4e0, 0x3a3630, 1.4)); const d = new THREE.DirectionalLight(0xfff0dc, 2.4); d.position.set(3, 6, 4); d.castShadow = true; sc.add(d); const k = new THREE.DirectionalLight(0xff7a1a, 1.2); k.position.set(-4, 2, -3); sc.add(k);
      const fl = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.9 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl); this.pvScene = sc; }
    const ch = makeCharacter(style); ch.ring.visible = false; if (!ch.update) ch.arms.rotation.x = 0.45; ch.root.userData.pvSoldier = true; this.pvScene.add(ch.root); this.preview = { ch, t: 0, tok: this.pvTok }; this.resize();
  }
  dropChar(ch) { const r = ch.root; r.removeFromParent(); r.traverse(o => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose(); }); if (ch.ring && ch.ring.material) ch.ring.material.dispose(); }
  persist() { writeSave(this.save); }
  startTutorial() {
    document.querySelectorAll('.tut-offer,.modal').forEach(m => m.remove()); this.save.tutorialOffered = true; this.persist();
    const all = roster(this.save); let squad = all.filter(o => o.team >= 0);
    if (!squad.length) squad = all.slice(0, 4).map(o => ({ ...o, team: 0 }));
    this.startMission(TUTORIAL_MISSION, squad, { 0: 1, 1: 1, 2: 1 });
    this.tutorial = new Tutorial(this, this.game); window.__tut = this.tutorial;
  }
  get tutorialState() { return this.tutorial; }
  tutorialExit() { musicCtl.play('menu'); const t = this.tutorial; if (t) t.dispose(); this.tutorial = null; if (this.game) { this.hud.hide(); this.input.setGame(null); this.endGame(); } this.menus.main(); }
  installApp() { const e = window.__installEvt; if (!e) return; e.prompt(); e.userChoice.finally(() => { window.__installEvt = null; if (!this.game) this.menus.main(); }); }
  startMission(mission, squad, entries) { document.querySelectorAll('.tut-offer').forEach(n => n.remove()); this.setPreview(null);
    if (this.tutorial) { this.tutorial.dispose(); this.tutorial = null; }
    if (this.game) this.endGame();
    this.menus.hide();
    const g = new Game(this.env, mission, this.save, squad, entries, { onEnd: (r) => this.onEnd(r) }); musicCtl.play(musicFor(mission), mission); /* w4: place + mission type tune the score; base intensity comes from the mission type */
    this.game = g; window.__game = g; this.input.setGame(g); this.hud.bind(g, this.input, () => this.onEnd(g.abort()));
  }
  onEnd(r) { if (this.tutorial) { this.tutorial.dispose(); this.tutorial = null; } this.hud.hide(); this.input.setGame(null); this.lastResult = r; this.menus.aar(r); window.__aar = r; this.endGame(); musicCtl.play('menu'); }
  endGame() { if (this.post) this.post.dispose(); if (!this.game) return; this.game.dispose(); this.game = null; window.__game = null; this.env.scene = null; }
  loop() {
    const now = performance.now(); const rdt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    this.fpsN++; this.fpsT += rdt; if (this.fpsT > 1) { this.fps = this.fpsN / this.fpsT; this.fpsN = 0; this.fpsT = 0; }
    if (this.game) {
      this.game.frame(rdt); this.env.cam.cineHold = !!(this.game && this.game.paused); /* frame() can end the mission and null this.game */ this.env.cam.update(rdt); if (this.tutorial) this.tutorial.tick(rdt); this.hudT -= rdt; if (this.hudT <= 0) { this.hudT = 0.1; this.hud.update(); this.frameY = this.freeAreaShift(); }
      const cm = this.camera; if (this.frameY) cm.setViewOffset(innerWidth, innerHeight, 0, this.frameY, innerWidth, innerHeight); else if (cm.view && cm.view.enabled) cm.clearViewOffset();
      if (this.game) { if (this.quality === 'high') this.post.render(this.env.scene, this.camera); else this.renderer.render(this.env.scene, this.camera); }
    } else if (this.preview) {
      if (this.camera.view && this.camera.view.enabled) this.camera.clearViewOffset();
      const p = this.preview; p.t += rdt * 0.5; if (p.ch.update) p.ch.update(rdt, { show: true });
      const R = this.pvRect && this.pvRect(); const v = this.pvView;
      if (R && v) { // store preview panel: frame the soldier in the panel's stage via a view offset
        if (v.spin) v.yaw += rdt * 0.6; p.ch.root.rotation.y = v.yaw; const W = innerWidth, H = innerHeight; const fy = Math.min(1, R.height / H);
        const zf = v.dist / 4.2, visH = Math.max(2.45 * zf, 1.75 * zf * R.height / Math.max(1, R.width)); // soldier ~75% of the stage height; wide enough for the rifle while spinning on narrow phones
        const D = visH / (2 * Math.tan(this.camera.fov * Math.PI / 360) * fy); this.camera.position.set(0, 1.2, D); this.camera.lookAt(0, 0.93, 0); if (window.__pvCam) { const c = window.__pvCam; this.camera.position.set(...c.p); this.camera.lookAt(...c.l); } this.camera.setViewOffset(W, H, W / 2 - (R.x + R.width / 2), H / 2 - (R.y + R.height / 2), W, H);
        this.renderer.render(this.pvScene, this.camera); this.camera.clearViewOffset();
      } else { p.ch.root.rotation.y = Math.sin(p.t) * 0.8 + 0.4; const wide = innerWidth > innerHeight * 1.1;
      this.camera.position.set(wide ? -1.9 : 0, 1.6, 5.4); this.camera.lookAt(wide ? -1.9 : 0, wide ? 1.0 : 0.3, 0); this.renderer.render(this.pvScene, this.camera); }
    } else if (this.backdrop) {
      if (this.camera.view && this.camera.view.enabled) this.camera.clearViewOffset();
      const b = this.backdrop; b.t += rdt * 0.05; const cx = b.W / 2, cz = b.H / 2;
      this.camera.position.set(cx + Math.sin(b.t) * 34, 24, cz + Math.cos(b.t) * 34); this.camera.lookAt(cx, 0, cz); this.renderer.render(b.scene, this.camera);
    }
  }
}
window.__zulu = { MISSIONS: __MISSIONS, W: __WEAPONS, thumbs: __THUMBS, opStyle: __opStyle, controls: { rebind: __rebind, bindings: __bindings } }; soldierReady.then(() => { window.__app = new App(); });

// PWA: keep the install prompt for the main-menu Install button
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__installEvt = e; const a = window.__app; if (a && !a.game && document.querySelector('.mainmenu')) a.menus.main(); });
