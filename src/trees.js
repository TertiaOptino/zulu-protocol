// ===== Batch 3: tree / undergrowth geometry (merged, vertex-coloured, cached) =====
import * as THREE from 'three';
import { GB, mat } from './geo.js';
const cache = {};
const cone = (r, h, s = 7) => new THREE.ConeGeometry(r, h, s, 1);
const cyl = (r0, r1, h, s = 6) => new THREE.CylinderGeometry(r0, r1, h, s, 1);
const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
// origin at the base, unit ~ metres. Used for in-map 'F' props (theme.tree) and for backdrop forests.
export function treeGeo(kind = 'round', lod = 0) {
  const key = kind + lod; if (cache[key]) return cache[key];
  const b = new GB(), seg = lod ? 5 : 7;
  switch (kind) {
    case 'pine': {
      b.geom(cyl(0.09, 0.16, 1.6, 5), mat(0, 0.8, 0), 0x4a3424);
      const tiers = lod ? [[1.25, 2.2, 1.9], [0.8, 1.8, 3.4]] : [[1.3, 1.9, 1.6], [1.05, 1.7, 2.5], [0.8, 1.5, 3.3], [0.5, 1.2, 4.1]];
      tiers.forEach(([r, h, y], i) => b.geom(cone(r, h, seg), mat(0, y, 0, 0, i * 0.7, 0), i % 2 ? 0x2c4a2c : 0x24402a));
      break;
    }
    case 'acacia': {
      b.geom(cyl(0.07, 0.14, 2.4, 5), mat(0.15, 1.2, 0, 0, 0, -0.12), 0x5a4632);
      b.geom(cyl(0.05, 0.07, 1.2, 4), mat(-0.35, 2.3, 0.1, 0, 0, 0.7), 0x5a4632);
      b.geom(cyl(0.05, 0.07, 1.2, 4), mat(0.6, 2.4, -0.1, 0, 0, -0.8), 0x5a4632);
      b.geom(cyl(1.0, 1.25, 0.32, seg + 2), mat(0.1, 2.85, 0, 0, 0, 0, 1.25, 1, 1.0), 0x5f6a32);
      b.geom(cyl(0.7, 0.9, 0.26, seg), mat(-0.7, 2.75, 0.3, 0, 0, 0, 1, 1, 0.9), 0x6b7438);
      break;
    }
    case 'orchard': {
      b.geom(cyl(0.07, 0.11, 1.1, 5), mat(0, 0.55, 0), 0x5a4430);
      b.geom(ico(0.95, lod ? 0 : 1), mat(0, 1.7, 0, 0, 0, 0, 1, 0.8, 1), 0x56772f); b.geom(ico(0.55, 0), mat(0.3, 2.2, 0.2), 0x668a36);
      break;
    }
    case 'palm': {
      let x = 0, y = 0; for (let i = 0; i < 5; i++) { b.geom(cyl(0.11 - i * 0.012, 0.13 - i * 0.012, 1.05, 5), mat(x, y + 0.52, 0, 0, 0, -0.06 * i), 0x7a6448); x += 0.06 * i; y += 1.02; }
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; b.geom(new THREE.BoxGeometry(1.7, 0.05, 0.42), mat(x + Math.cos(a) * 0.8, y - 0.15, Math.sin(a) * 0.8, 0, -a, -0.45), i % 2 ? 0x4e6a2a : 0x5a7a30); }
      break;
    }
    case 'poplar': {
      b.geom(cyl(0.07, 0.12, 1.4, 5), mat(0, 0.7, 0), 0x5c5040);
      b.geom(ico(0.75, lod ? 0 : 1), mat(0, 3.4, 0, 0, 0, 0, 0.75, 2.9, 0.75), 0x4f6a2e);
      break;
    }
    case 'jungle': {
      b.geom(cyl(0.12, 0.2, 3.2, 5), mat(0, 1.6, 0), 0x5a4a38);
      b.geom(ico(1.6, 0), mat(0, 3.8, 0, 0, 0, 0, 1.2, 0.7, 1.2), 0x2e5a28); b.geom(ico(1.1, 0), mat(1.0, 3.4, 0.6), 0x3a6a2c); b.geom(ico(1.0, 0), mat(-0.9, 3.5, -0.5), 0x34602a);
      break;
    }
    case 'fern': for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.geom(new THREE.BoxGeometry(0.62, 0.03, 0.16), mat(Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3, 0, -a, 0.45), i % 2 ? 0x3e6a2e : 0x4a7a34); } break;
    case 'grass': for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; b.geom(new THREE.PlaneGeometry(0.42, 0.34), mat(0, 0.16, 0, 0, a, 0), 0x7a8a46); } break;
    case 'bush': b.geom(ico(0.5, 0), mat(0, 0.3, 0, 0, 0, 0, 1.2, 0.7, 1.1), 0x4a5e2e); b.geom(ico(0.35, 0), mat(0.35, 0.25, 0.2), 0x55693a); break;
    case 'rock': b.geom(new THREE.DodecahedronGeometry(0.5, 0), mat(0, 0.15, 0, 0.3, 0.5, 0, 1.2, 0.6, 0.9), 0x7a766c); break;
    default: { // 'round' deciduous (same silhouette as the original map tree)
      b.geom(cyl(0.1, 0.14, 1.8, 6), mat(0, 0.9, 0), 0x4a3828);
      b.geom(ico(1, lod ? 0 : 1), mat(0, 2.4, 0), 0x3b5230); b.geom(ico(0.7, lod ? 0 : 1), mat(0.25, 3.1, 0.1), 0x445e36);
    }
  }
  return (cache[key] = b.build());
}
