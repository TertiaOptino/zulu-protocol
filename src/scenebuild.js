import * as THREE from 'three';
import { GB, mat } from './geo.js';
import { T } from './level.js';
import { floorTex, wallTex, labelTex, iconTex, containerTex, pbrMaps } from './textures.js';
import { propGeo } from './models.js';
import { ORANGE } from './data.js';
import { buildScenery } from './scenery.js'; // batch3: map surroundings + ambient life
export const WALL_H = 2.5;
const FLOORCOL = { concrete: null, tile: 0xcdc6b6, wood: 0x8a5c38, carpet: 0x6e4644, grate: 0x6a6e70, ground: null };
const FLOORSPAN = { concrete: 0.25, tile: 0.5, wood: 0.5, carpet: 0.34, grate: 0.6, ground: 0.12 };
// fog of war injected into every level material: darkens by per-tile value
export function makeFogUniforms(level) {
  const data = new Uint8Array(level.W * level.H);
  const tex = new THREE.DataTexture(data, level.W, level.H, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  return { data, tex, uniforms: { uFog: { value: tex }, uFogSize: { value: new THREE.Vector2(level.W, level.H) } } };
}
export function applyFog(m, fog) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, fog.uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFogW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvFogW = (modelMatrix * vec4(transformed,1.0)).xyz;\n#ifdef USE_INSTANCING\nvFogW = (modelMatrix * instanceMatrix * vec4(transformed,1.0)).xyz;\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFogW; uniform sampler2D uFog; uniform vec2 uFogSize;').replace('#include <dithering_fragment>', '#include <dithering_fragment>\nvec2 fuv = vFogW.xz / uFogSize; float fv = texture2D(uFog, fuv).r; if (fuv.x<0.||fuv.y<0.||fuv.x>1.||fuv.y>1.) fv = 0.6; gl_FragColor.rgb *= mix(0.16, 1.0, fv); gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.05,0.07,0.09)*0.6, (1.0-fv)*0.25);');
  };
  m.customProgramCacheKey = () => 'fog';
  return m;
}
export function buildLevelScene(level, scene, fog, quality) {
  const th = level.def.theme; const W = level.W, H = level.H; const root = new THREE.Group(); scene.add(root);
  const std = (o) => applyFog(new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.02, ...o }), fog);
  const pbr = quality !== 'low'; const PB = (tx, st, ns) => pbr ? pbrMaps(tx, st, ns) : {};
  // ground
  const gt = floorTex('ground', th.ground).clone(); gt.needsUpdate = true; gt.repeat.set((W + 80) / 8, (H + 80) / 8);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 80, H + 80).rotateX(-Math.PI / 2), std({ map: gt, ...PB(gt, 4, 0.9) }));
  ground.position.set(W / 2, 0, H / 2); ground.receiveShadow = true; root.add(ground);
  // floors (interior + concrete paths)
  const fb = {};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; const f = level.floor[i]; if (f === 'ground' && level.ext[i]) continue; const k = f || 'concrete'; (fb[k] ||= new GB()).hquad(x, y, x + 1, y + 1, 0.02, 0xffffff, FLOORSPAN[k] || 0.25); }
  for (const k in fb) { const col = FLOORCOL[k] ?? (k === 'ground' ? th.ground : th.concrete); const m = new THREE.Mesh(fb[k].build(), std((() => { const ft = floorTex(k, col); return { map: ft, ...PB(ft, k === 'carpet' ? 2 : 5, 1), roughness: k === 'tile' ? 0.6 : k === 'wood' ? 0.8 : 1.0 }; })())); m.receiveShadow = true; root.add(m); }
  // walls
  const wb = new GB(), gb = new GB(), rb = new GB(); const wc = th.wall, wcb = new THREE.Color(wc).multiplyScalar(0.62).getHex(), cap = 0x3b3b3b, t = 0.3;
  const isW = (x, y) => level.inb(x, y) && level.type[y * W + x] === T.WALL;
  const isOpen = (x, y) => level.inb(x, y) && (level.type[y * W + x] === T.DOOR || level.type[y * W + x] === T.WIN);
  const seg = (x0, z0, x1, z1, y0, y1) => { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, sx = Math.max(t, Math.abs(x1 - x0)), sz = Math.max(t, Math.abs(z1 - z0)); wb.box(cx, (y0 + y1) / 2, cz, sx, y1 - y0, sz, wc, cap, y0 < 0.1 ? wcb : wc, 0.5); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, ty = level.type[i]; const cx = x + 0.5, cz = y + 0.5;
    if (ty === T.WALL) {
      seg(cx, cz, cx, cz, 0, WALL_H);
      if (isW(x + 1, y)) seg(cx, cz, cx + 1, cz, 0, WALL_H); if (isOpen(x + 1, y)) seg(cx, cz, cx + 0.5, cz, 0, WALL_H); if (isOpen(x - 1, y)) seg(cx - 0.5, cz, cx, cz, 0, WALL_H);
      if (isW(x, y + 1)) seg(cx, cz, cx, cz + 1, 0, WALL_H); if (isOpen(x, y + 1)) seg(cx, cz, cx, cz + 0.5, 0, WALL_H); if (isOpen(x, y - 1)) seg(cx, cz - 0.5, cx, cz, 0, WALL_H);
    } else if (ty === T.WIN) {
      const horiz = (isW(x - 1, y) || isOpen(x - 1, y)) && (isW(x + 1, y) || isOpen(x + 1, y)) || !(isW(x, y - 1) || isOpen(x, y - 1));
      const [x0, z0, x1, z1] = horiz ? [x, cz, x + 1, cz] : [cx, y, cx, y + 1];
      if (level.prop[i] === 'r') { const L = 1; for (const p of [0.1, 0.5, 0.9]) rb.box(horiz ? x + p : cx, 0.5, horiz ? cz : y + p, 0.05, 1, 0.05, 0x55595e); rb.box((x0 + x1) / 2, 1.0, (z0 + z1) / 2, horiz ? L : 0.06, 0.06, horiz ? 0.06 : L, 0x6a6e72); rb.box((x0 + x1) / 2, 0.55, (z0 + z1) / 2, horiz ? L : 0.04, 0.04, horiz ? 0.04 : L, 0x6a6e72); }
      else { seg(x0, z0, x1, z1, 0, 0.9); seg(x0, z0, x1, z1, 2.15, WALL_H); gb.box((x0 + x1) / 2, 1.52, (z0 + z1) / 2, horiz ? 1 : 0.04, 1.25, horiz ? 0.04 : 1, 0xffffff); wb.box((x0 + x1) / 2, 0.92, (z0 + z1) / 2, horiz ? 1 : 0.36, 0.05, horiz ? 0.36 : 1, 0x8a8a86); }
    }
  }
  const walls = new THREE.Mesh(wb.build(), std({ map: wallTex(), vertexColors: true, ...PB(wallTex(), 5, 0.55) })); walls.castShadow = walls.receiveShadow = true; root.add(walls);
  if (rb.p.length) { const rm = new THREE.Mesh(rb.build(), std({ vertexColors: true, metalness: 0.5, roughness: 0.5 })); rm.castShadow = true; root.add(rm); }
  if (gb.p.length) { const gm = new THREE.Mesh(gb.build(), applyFog(new THREE.MeshStandardMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.6, depthWrite: false }), fog)); root.add(gm); }
  // props: instanced per type
  const byType = {};
  for (let i = 0; i < W * H; i++) { const p = level.prop[i]; if (p && p !== 'W' && p !== 'r') (byType[p] ||= []).push(i); }
  const BARREL = [0x2f4f7a, 0x7a3a2a, 0x3d5a3a, 0x6a6a6a], CONT = [0x8a3a2a, 0x2e5a7a, 0x4a6a3a, 0x9a7a3a, 0x6a6a6a];
  const dummy = new THREE.Object3D(); const col = new THREE.Color();
  for (const p in byType) {
    const list = byType[p]; const g = propGeo(p, th); const m = quality === 'low' ? new THREE.MeshLambertMaterial({ vertexColors: true, map: p === 'C' ? containerTex() : null }) : std({ vertexColors: true, map: p === 'C' ? containerTex() : null, roughness: p === 'o' || p === 'C' ? 0.6 : 0.9, metalness: p === 'o' || p === 'C' ? 0.3 : 0.02 });
    const im = new THREE.InstancedMesh(g, m, list.length); im.castShadow = quality !== 'low'; im.receiveShadow = quality !== 'low';
    list.forEach((i, n) => { const x = i % W, y = (i / W) | 0; const nb = level.prop[i + 1] === p || level.prop[i - 1] === p; dummy.position.set(x + 0.5, 0, y + 0.5); dummy.rotation.set(0, p === 's' ? (nb ? 0 : Math.PI / 2) : (p === 'c' || p === 'F' || p === 'p') ? ((x * 7 + y * 13) % 5) * 0.2 - 0.4 : 0, 0); dummy.scale.set(1, p === 'F' ? 0.8 + ((x * 3 + y) % 4) * 0.12 : 1, 1); dummy.updateMatrix(); im.setMatrixAt(n, dummy.matrix);
      if (p === 'o') im.setColorAt(n, col.set(BARREL[(x * 5 + y * 3) % 4])); else if (p === 'C') { let cid = 0, xx = x; while (level.prop[y * W + xx - 1] === 'C') xx--; let yy = y; while (yy > 0 && level.prop[(yy - 1) * W + x] === 'C') yy--; cid = (xx * 7 + yy * 11) % 5; im.setColorAt(n, col.set(CONT[cid])); } });
    root.add(im);
  }
  // doors
  const frameMat = std({ color: 0x8a4a1c, emissive: ORANGE, emissiveIntensity: 0.25 }), frameMatX = std({ color: 0xc8641e, emissive: ORANGE, emissiveIntensity: 0.9 });
  const panelMatI = std({ color: 0x6b4a2e }), panelMatE = std({ color: 0x5a5f66, metalness: 0.5, roughness: 0.5 });
  const jamb = new THREE.BoxGeometry(0.1, 2.3, 0.36), head = new THREE.BoxGeometry(1.1, 0.2, 0.36), lint = new THREE.BoxGeometry(1, WALL_H - 2.4, t), panel = new THREE.BoxGeometry(0.86, 2.15, 0.07).translate(0.44, 1.08, 0), knob = new THREE.BoxGeometry(0.06, 0.06, 0.16).translate(0.78, 1.0, 0);
  const lintMat = std({ color: wc });
  for (const d of level.doors) {
    const g = new THREE.Group(); g.position.set(d.x + 0.5, 0, d.y + 0.5); g.rotation.y = d.orient === 'h' ? 0 : Math.PI / 2;
    const fm = d.ext ? frameMatX : frameMat;
    for (const sx of [-0.5, 0.5]) { const j = new THREE.Mesh(jamb, fm); j.position.set(sx, 1.15, 0); j.castShadow = true; g.add(j); }
    const hd = new THREE.Mesh(head, fm); hd.position.set(0, 2.35, 0); g.add(hd); const ln = new THREE.Mesh(lint, lintMat); ln.position.set(0, 2.45, 0); ln.scale.y = 1; g.add(ln);
    const piv = new THREE.Group(); piv.position.set(-0.44, 0, 0); const pm = new THREE.Mesh(panel, d.ext ? panelMatE : panelMatI); pm.castShadow = true; piv.add(pm); const kn = new THREE.Mesh(knob, panelMatE); piv.add(kn); g.add(piv);
    d.mesh = g; d.pivot = piv; root.add(g);
    if (d.entry) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(String(d.entry)), depthTest: false })); s.scale.set(0.8, 0.8, 1); s.position.set(d.x + 0.5, 3.2, d.y + 0.5); s.renderOrder = 5; root.add(s); d.label = s; }
    const ic = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(d.locked ? 'lock' : 'trap'), depthTest: false })); ic.scale.set(0.55, 0.55, 1); ic.position.set(d.x + 0.5, d.entry ? 2.6 : 2.9, d.y + 0.5); ic.renderOrder = 5; ic.visible = d.locked; root.add(ic); d.icon = ic;
  }
  // zones
  const zb = new GB(), xb = new GB();
  for (const k of ['1', '2', '3', '4']) for (const [x, y] of level.zones[k]) zb.hquad(x + 0.06, y + 0.06, x + 0.94, y + 0.94, 0.04, 0xffffff);
  for (const [x, y] of level.zones.X) xb.hquad(x, y, x + 1, y + 1, 0.05, 0xffffff);
  if (zb.p.length) { const z = new THREE.Mesh(zb.build(), new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.14, depthWrite: false })); root.add(z); level.zoneMesh = z; }
  if (xb.p.length) { const z = new THREE.Mesh(xb.build(), new THREE.MeshBasicMaterial({ color: 0x40ff70, transparent: true, opacity: 0.25, depthWrite: false })); root.add(z); level.exitMesh = z; }
  // lights
  scene.background = new THREE.Color(th.sky); scene.fog = new THREE.Fog(th.sky, 45, 110);
  const hemi = new THREE.HemisphereLight(th.time === 'night' ? 0x9aa8c8 : th.sky, th.ground, th.time === 'night' ? 1.3 : 1.25); root.add(hemi); if (th.time === 'night') root.add(new THREE.AmbientLight(0x8090b0, 0.9));
  const sun = new THREE.DirectionalLight(th.time === 'night' ? 0x8090c0 : th.time === 'dusk' ? 0xffb070 : 0xfff2dc, th.time === 'overcast' ? 1.6 : th.time === 'night' ? 1.2 : 2.6);
  const sd = th.sun; sun.position.set(W / 2 + sd[0] * 40, sd[1] * 40, H / 2 + sd[2] * 40); sun.target.position.set(W / 2, 0, H / 2); root.add(sun, sun.target);
  sun.castShadow = quality !== 'low'; const S = Math.max(W, H) * 0.62; Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 120 }); sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  buildScenery(level, scene, root, quality, { fog, std, sun, hemi, ground }); // batch3: backdrop, sky dome, horizon fog, ambient (overrides background/fog set above)
  return root;
}
