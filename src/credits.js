// Every third-party asset and library that ships in (or builds) Zulu Protocol, with its licence. Single source for the Credits screen,
// the campaign-ending roll and the settings/pause footer.
export const CREDITS = [
  { group: '3D models & animation', items: [
    { name: 'Tactical Soldier', by: 'MissingTray1151 (Sketchfab)', lic: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', note: 'Operator, hostile, hostage and VIP body mesh, rig and its animation clips (walk, firing stance, crouch, deaths). Re-packed and optimised for the web (meshopt compression, texture atlas, recoloured camo).' },
    { name: 'Weapons, helmets, vests, gear, props & levels', by: 'Zulu Protocol', lic: 'Original', note: 'Built procedurally in code from three.js primitives.' } ] },
  { group: 'Textures', items: [
    { name: 'Soldier uniform & gear texture atlas', by: 'from Tactical Soldier by MissingTray1151', lic: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', note: 'Downscaled and packed into one atlas; unit camo patterns are re-tinted at runtime.' },
    { name: 'Camouflage, flags, insignia, walls, floors, UI icons', by: 'Zulu Protocol', lic: 'Original', note: 'Generated procedurally on canvas at load time.' },
    { name: 'World map land mask', by: 'Natural Earth via world-atlas 2.0.2 (Mike Bostock)', lic: 'Public domain data · ISC package', url: 'https://www.naturalearthdata.com/about/terms-of-use/' },
    { name: 'App icon & logo', by: 'Zulu Protocol', lic: 'Original' } ] },
  { group: 'Sound', items: [
    { name: 'All sound effects, music, ambience & radio static', by: 'Zulu Protocol', lic: 'Original', note: 'All audio is generated live in the browser with the Web Audio API (gunshots, breaches, footsteps, doors, per-location music and ambience); no recorded samples are used.' },
    { name: 'Radio callouts', by: 'Your device', lic: 'Built-in', note: 'Spoken with the Web Speech API using the voices already installed on your device, so the voices differ between devices.' } ] }, // batch6
  { group: 'Interface', items: [ // w2: mergeable spot. Other workers can append their own UI items to this array; nothing above was changed
    { name: 'Responsive layout for phones, Fold, tablets & desktop', by: 'Zulu Protocol', lic: 'Original', note: 'Compact mission counter on narrow screens, and a tutorial card that moves aside or shrinks instead of covering the Breach plan or the door menu.' } ] }, // w2
  { group: 'Runtime libraries', items: [
    { name: 'three.js 0.170.0', by: 'three.js authors', lic: 'MIT', url: 'https://github.com/mrdoob/three.js/blob/dev/LICENSE', note: 'Renderer plus addons: GLTFLoader, RoomEnvironment, RoundedBoxGeometry, BufferGeometryUtils, EffectComposer, RenderPass, GTAOPass, UnrealBloomPass, OutputPass.' },
    { name: 'meshoptimizer decoder (meshopt_decoder.module.js)', by: 'Arseny Kapoulkine', lic: 'MIT', url: 'https://github.com/zeux/meshoptimizer/blob/master/LICENSE.md', note: 'Bundled via three.js examples; decompresses the soldier mesh.' } ] },
  { group: 'Build tools (not shipped)', items: [
    { name: 'esbuild 0.28.2', by: 'Evan Wallace', lic: 'MIT' },
    { name: 'glTF Transform 4.5.1', by: 'Don McCurdy', lic: 'MIT' },
    { name: 'meshoptimizer 1.3.0 (encoder)', by: 'Arseny Kapoulkine', lic: 'MIT' },
    { name: 'sharp 0.35.5', by: 'Lovell Fuller', lic: 'Apache-2.0' },
    { name: 'tiny-inflate 1.0.3', by: 'Devon Govett', lic: 'MIT' },
    { name: 'topojson-client 3.1.0', by: 'Mike Bostock', lic: 'ISC', note: 'Used to bake the world-map mask.' },
    { name: 'Playwright 1.64.1', by: 'Microsoft', lic: 'Apache-2.0', note: 'Automated testing.' } ] },
];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function creditsHTML() {
  return CREDITS.map(g => `<section class="cr-group"><h3>${esc(g.group)}</h3>${g.items.map(i => `<div class="cr-item"><div class="cr-top"><b>${esc(i.name)}</b><span class="cr-lic${i.lic === 'Original' ? ' orig' : ''}">${i.url ? `<a href="${i.url}" target="_blank" rel="noopener">${esc(i.lic)}</a>` : esc(i.lic)}</span></div><div class="cr-by">${esc(i.by)}</div>${i.note ? `<div class="cr-note">${esc(i.note)}</div>` : ''}</div>`).join('')}</section>`).join('')
    + `<p class="cr-foot">"Tactical Soldier" by MissingTray1151 is licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>; it was modified (optimised, re-textured and re-rigged for gameplay). MIT / ISC / Apache-2.0 licence texts are available at each project's repository.</p>`;
}
export const creditsRoll = () => CREDITS.filter(g => !/Build/.test(g.group)).map(g => `<h4>${esc(g.group)}</h4>` + g.items.map(i => `<p>${esc(i.name)} — ${esc(i.by)} (${esc(i.lic)})</p>`).join('')).join('');
