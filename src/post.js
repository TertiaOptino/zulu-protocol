// High-quality post stack: GTAO (screen-space ambient occlusion) + subtle bloom. Low/Medium render directly.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
export class Post {
  constructor(renderer) { this.r = renderer; this.c = null; this.scene = null; this.camera = null; }
  build(scene, camera) {
    this.dispose(); const r = this.r, sz = r.getSize(new THREE.Vector2()), dpr = r.getPixelRatio();
    const c = new EffectComposer(r); c.setPixelRatio(dpr); c.setSize(sz.x, sz.y);
    c.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, sz.x * dpr, sz.y * dpr); ao.blendIntensity = 0.85; ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: 12 }); ao.updatePdMaterial({ radius: 6, rings: 2, samples: 12 }); c.addPass(ao);
    { const ov = ao.overrideVisibility.bind(ao); ao.overrideVisibility = () => { ov(); scene.traverse((o) => { const m = o.material; if (o.isSprite || (m && m.transparent && m.depthWrite === false)) o.visible = false; }); }; } // batch3: keep sprites / soft see-through planes out of the AO normal+depth pass (they showed as dark slabs)
    c.addPass(new UnrealBloomPass(new THREE.Vector2(sz.x, sz.y), 0.32, 0.45, 0.88));
    c.addPass(new OutputPass()); this.c = c; this.scene = scene; this.camera = camera;
  }
  render(scene, camera) { if (!this.c || this.scene !== scene || this.camera !== camera) this.build(scene, camera); this.c.render(); }
  resize() { if (!this.c) return; const sz = this.r.getSize(new THREE.Vector2()); this.c.setPixelRatio(this.r.getPixelRatio()); this.c.setSize(sz.x, sz.y); }
  dispose() { if (this.c) { for (const p of this.c.passes) p.dispose && p.dispose(); this.c.dispose(); } this.c = null; this.scene = null; }
}
