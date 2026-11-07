// ===== Batch 3: larger open outdoor maps + scenery profiles for every map =====
// Imported once (for side effects) from main.js, right after maps.js. It only ADDS to MAPS / MISSIONS / REGIONS:
//  - every map gets .key (its MAPS id) and .scenery (backdrop profile used by scenery.js)
//  - four new large outdoor maps (forest, valley, port, ranch) with two missions each, wired into existing regions
import { MAPS, MISSIONS, REGIONS, buildGrid } from './maps.js';

// deterministic scatter: put ch on open ground (',') cells that keep `clear` cells away from anything that is not ',' / ch
function scatter(def, ch, density, seed, clear = 2, keep = () => true) {
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const g = buildGrid(def), W = def.w, H = def.h, out = [];
  const near = (x, y) => { for (let dy = -clear; dy <= clear; dy++) for (let dx = -clear; dx <= clear; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const c = g[yy][xx]; if (c !== ',' && c !== ch) return true; } return false; };
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (g[y][x] !== ',' || !keep(x, y) || near(x, y)) continue;
    // never close a 1-wide gap: need 3 free orthogonal neighbours
    let free = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (g[y + dy][x + dx] === ',') free++;
    if (free < 4) continue;
    if (rnd() < density) { out.push([x, y]); g[y][x] = ch; }
  }
  def.ops.push(['P', out, ch]); return out.length;
}

// ---------- Schwarzwald hunting lodge (dense forest, Germany) ----------
MAPS.forest = {
  name: 'Schwarzwald Lodge', place: 'Black Forest, Germany', w: 56, h: 40,
  theme: { ground: 0x4c5034, wall: 0x7a5a3c, concrete: 0x6e6a5c, sun: [0.55, 0.75, 0.35], sky: 0xa8b8b0, time: 'day', tree: 'pine' },
  ops: [
    ['G', ','], ['F', 27, 25, 2, 15, '.'], ['F', 27, 1, 2, 11, '.'], ['F', 1, 19, 16, 1, '.'], ['F', 16, 15, 2, 5, '.'], ['F', 38, 21, 17, 1, '.'],
    ['R', 18, 12, 20, 13, '='], ['V', 26, 12, 13, '#'], ['V', 30, 12, 13, '#'], ['H', 18, 18, 9, '#'], ['H', 30, 18, 8, '#'], ['F', 19, 13, 7, 5, '~'], ['F', 31, 19, 6, 5, '_'],
    ['P', [[28, 24], [28, 12], [18, 15], [26, 15], [30, 15], [30, 21], [22, 18], [34, 18]], 'D'], ['P', 37, 21, 'L'], ['P', 26, 21, 'T'],
    ['P', [[21, 12], [23, 12], [33, 12], [35, 12], [21, 24], [34, 24], [18, 21], [37, 15]], 'W'],
    ['P', [[21, 14], [22, 14], [33, 20], [34, 20]], 't'], ['P', [[33, 14], [34, 14]], 'k'], ['P', [[19, 13], [36, 13]], 's'], ['P', 27, 13, 'p'],
    ['R', 5, 5, 8, 7, '='], ['P', 12, 8, 'D'], ['P', [[8, 5], [5, 8]], 'W'], ['P', [[7, 7]], 'k'],
    ['R', 42, 4, 9, 6, '.'], ['P', 46, 9, 'D'], ['P', 42, 6, 'L'], ['P', [[44, 5], [45, 5], [48, 7]], 'c'], ['P', 49, 5, 'o'],
    ['R', 41, 28, 9, 7, '~'], ['P', 41, 31, 'D'], ['P', 45, 28, 'T'], ['P', [[49, 31], [44, 34]], 'W'], ['P', [[43, 30], [47, 31]], 'k'], ['P', 46, 32, 't'],
    ['R', 6, 27, 7, 6, '.'], ['P', [[9, 27], [12, 30]], 'D'], ['P', [[8, 28], [11, 31]], 'c'],
    ['F', 26, 39, 4, 1, '1'], ['F', 0, 18, 1, 4, '2'], ['F', 55, 18, 1, 4, '3'], ['F', 26, 0, 4, 1, '4'], ['F', 52, 37, 4, 3, 'X'],
    ['P', [[22, 15], [33, 16], [28, 20], [21, 21], [34, 22], [8, 8], [46, 6], [45, 32], [9, 30], [28, 8], [40, 20], [15, 20]], 'E'],
    ['P', [[24, 22], [35, 15], [28, 15], [9, 9], [48, 8], [43, 32], [30, 31], [20, 31], [50, 15], [5, 21], [36, 4], [14, 34]], 'e'],
    ['P', [[20, 14], [35, 23], [47, 33], [7, 10]], 'H'], ['P', 23, 16, 'V'], ['P', [[32, 22], [45, 7]], 'B'], ['P', [[19, 22], [8, 30], [48, 29]], 'I'],
  ],
};
scatter(MAPS.forest, 'F', 0.34, 7, 1);

// ---------- Helmand green zone (open farmland, compounds, orchards) ----------
MAPS.valley = {
  name: 'Green Zone Farms', place: 'Helmand, Afghanistan', w: 60, h: 40,
  theme: { ground: 0x8f7c5a, wall: 0xb39a74, concrete: 0x9a8a70, sun: [0.6, 1, -0.3], sky: 0xc9c4b0, time: 'day', tree: 'orchard' },
  ops: [
    ['G', ','], ['F', 0, 18, 60, 2, '.'],
    ['R', 6, 6, 12, 10, '.'], ['R', 7, 7, 6, 5, '='], ['P', [[17, 12], [12, 9]], 'D'], ['P', 11, 15, 'L'], ['P', 10, 11, 'W'],
    ['R', 26, 4, 14, 11, '.'], ['H', 27, 10, 12, '#'], ['V', 32, 5, 5, '#'], ['F', 27, 5, 5, 5, '='], ['F', 33, 5, 6, 5, '~'],
    ['P', [[29, 10], [33, 14], [26, 12]], 'D'], ['P', 35, 10, 'T'], ['P', 39, 7, 'L'], ['P', [[29, 4], [36, 4]], 'W'],
    ['R', 44, 22, 12, 11, '.'], ['V', 50, 22, 11, '#'], ['H', 44, 27, 6, '#'], ['F', 51, 23, 4, 9, '='],
    ['P', [[47, 27], [50, 25], [44, 30], [52, 22]], 'D'], ['P', 50, 30, 'T'], ['P', 55, 28, 'L'], ['P', [[47, 32], [53, 32], [55, 24]], 'W'],
    ['R', 10, 26, 9, 7, '='], ['P', [[14, 26], [18, 29]], 'D'], ['P', 10, 29, 'T'], ['P', [[13, 32], [16, 32]], 'W'],
    ['H', 23, 21, 6, 'b'], ['H', 32, 21, 6, 'b'], ['V', 21, 25, 4, 'b'], ['H', 2, 23, 5, 'b'], ['P', [[42, 12], [43, 12], [8, 37], [9, 37]], 'b'],
    ['P', [24, 27, 30, 33, 36, 39].flatMap(x => [22.5, 25, 28, 31, 34].map(y => [x, Math.round(y + 0.5)])), 'F'],
    ['P', [[15, 7], [16, 7], [28, 12], [38, 12]], 'c'], ['P', [[28, 6], [37, 6]], 't'], ['P', [[52, 23], [53, 23]], 'k'], ['P', [[16, 30], [11, 27]], 's'],
    ['F', 0, 21, 1, 3, '1'], ['F', 28, 0, 4, 1, '2'], ['F', 59, 10, 1, 4, '3'], ['F', 28, 39, 4, 1, '4'], ['F', 0, 0, 3, 3, 'X'],
    ['P', [[10, 9], [15, 13], [29, 7], [36, 7], [33, 12], [47, 24], [52, 29], [47, 30], [14, 29], [30, 24], [40, 18], [20, 10]], 'E'],
    ['P', [[8, 13], [30, 12], [37, 12], [53, 25], [45, 29], [12, 30], [25, 30], [35, 32], [50, 15], [5, 35], [42, 8], [18, 22]], 'e'],
    ['P', [[9, 9], [37, 8], [52, 31], [16, 28]], 'H'], ['P', 30, 6, 'V'], ['P', [[11, 10], [48, 31]], 'B'], ['P', [[31, 8], [53, 26], [12, 31]], 'I'],
  ],
};
scatter(MAPS.valley, 'F', 0.05, 11, 2, (x, y) => !(x >= 22 && x <= 41 && y >= 20 && y <= 37));

// ---------- Buenaventura container terminal (big open port) ----------
const portOps = [['G', '.'], ['H', 0, 0, 64, 'r']];
for (const x of [22, 30, 38]) for (const y of [6, 10, 14, 18, 22]) if (!(x === 30 && y === 14)) portOps.push(['F', x, y, 6, 2, 'C']);
for (const x of [46, 54]) for (const y of [6, 10, 14, 18]) if (!(x === 54 && y === 10)) portOps.push(['F', x, y, 6, 2, 'C']);
MAPS.port = {
  name: 'Container Terminal', place: 'Buenaventura, Colombia', w: 64, h: 44,
  theme: { ground: 0x5c5e5c, wall: 0x9c9890, concrete: 0x707270, sun: [-0.7, 0.75, 0.35], sky: 0xb88a78, time: 'dusk' },
  ops: [...portOps,
    ['R', 3, 5, 15, 11, '_'], ['V', 10, 5, 11, '#'], ['H', 3, 10, 7, '#'], ['P', [[17, 8], [10, 7], [6, 10], [14, 5]], 'D'], ['P', 10, 12, 'T'], ['P', 6, 15, 'L'],
    ['P', [[13, 15], [16, 15], [3, 8], [3, 12], [12, 5]], 'W'], ['P', [[12, 8], [13, 8]], 'k'], ['P', [[16, 6], [4, 6]], 's'], ['P', [[7, 12], [8, 12]], 't'],
    ['R', 44, 26, 16, 13, '.'], ['H', 44, 32, 8, '#'], ['V', 52, 26, 13, '#'], ['P', [[48, 26], [44, 29], [52, 29], [48, 32], [59, 31], [55, 38]], 'D'], ['P', 44, 35, 'L'], ['P', 52, 35, 'T'],
    ['V', 55, 28, 4, 's'], ['V', 55, 33, 4, 's'], ['P', [[46, 28], [47, 28], [50, 36], [49, 36]], 'c'],
    ['R', 28, 37, 5, 4, '_'], ['P', 30, 37, 'D'], ['P', 28, 38, 'W'],
    ['P', [[24, 2], [24, 4], [34, 2], [34, 4], [44, 2], [44, 4]], 'P'], ['P', [[8, 2], [9, 2], [18, 30], [19, 30], [36, 30], [37, 30], [6, 33], [60, 22], [61, 22]], 'o'],
    ['P', [[14, 22], [15, 22], [16, 22], [24, 30], [25, 30], [40, 34], [41, 34], [10, 38], [11, 38]], 'c'], ['P', [[2, 20], [3, 20], [2, 24], [3, 24], [62, 40], [62, 41]], 'b'],
    ['F', 0, 40, 1, 3, '1'], ['F', 30, 43, 4, 1, '2'], ['F', 63, 20, 1, 4, '3'], ['F', 0, 21, 1, 3, '4'], ['F', 60, 1, 3, 2, 'X'],
    ['P', [[7, 8], [14, 10], [7, 13], [48, 29], [48, 35], [56, 35], [28, 12], [36, 16], [44, 8], [52, 12], [25, 20], [40, 24], [30, 39], [12, 2], [40, 3]], 'E'],
    ['P', [[15, 7], [5, 12], [50, 28], [57, 29], [54, 36], [21, 9], [29, 21], [37, 9], [45, 20], [60, 10], [20, 30], [35, 32], [10, 25], [58, 4]], 'e'],
    ['P', [[5, 7], [15, 13], [50, 30], [57, 37]], 'H'], ['P', 13, 12, 'V'], ['P', [[8, 13], [49, 34]], 'B'], ['P', [[16, 9], [46, 37], [31, 39]], 'I'],
  ],
};

// ---------- Rift Valley ranch (open savanna) ----------
MAPS.ranch = {
  name: 'Rift Valley Ranch', place: 'Naivasha, Kenya', w: 56, h: 40,
  theme: { ground: 0x9a8656, wall: 0xd4c4a0, concrete: 0x9a8c72, sun: [-0.6, 0.85, 0.4], sky: 0xc8b48c, time: 'day', tree: 'acacia' },
  ops: [
    ['G', ','], ['F', 26, 21, 3, 19, '.'], ['F', 26, 1, 3, 9, '.'], ['F', 1, 34, 25, 2, '.'],
    ['R', 20, 10, 16, 11, '='], ['V', 28, 10, 11, '#'], ['H', 20, 15, 8, '#'], ['H', 29, 16, 7, '#'], ['F', 21, 11, 7, 4, '~'], ['F', 29, 17, 6, 3, '_'],
    ['P', [[24, 10], [20, 18], [31, 20], [28, 12], [24, 15], [32, 16]], 'D'], ['P', 35, 13, 'L'], ['P', 28, 18, 'T'], ['P', [[22, 20], [26, 20], [33, 10], [35, 18], [20, 12]], 'W'],
    ['P', [[23, 12], [24, 12]], 't'], ['P', [[31, 12], [32, 12]], 'k'], ['P', 21, 19, 's'], ['P', 34, 11, 'p'],
    ['R', 40, 24, 12, 9, '.'], ['V', 46, 24, 9, '#'], ['P', [[43, 24], [46, 28], [40, 27]], 'D'], ['P', 51, 30, 'L'], ['P', 49, 32, 'T'], ['P', [[41, 25], [42, 25], [48, 30], [49, 30]], 'c'], ['P', 50, 25, 'o'],
    ['R', 6, 26, 7, 6, '~'], ['P', [[9, 26], [12, 29]], 'D'], ['P', 6, 28, 'W'], ['R', 6, 8, 7, 6, '.'], ['P', 12, 11, 'D'], ['P', 9, 13, 'T'],
    ['H', 38, 3, 15, 'r'], ['H', 38, 9, 15, 'r'], ['V', 38, 3, 7, 'r'], ['V', 52, 3, 7, 'r'], ['P', [[45, 3], [45, 9], [38, 6], [52, 6]], ','],
    ['P', [[44, 14], [45, 14], [44, 15], [45, 15]], 'P'], ['P', [[16, 22], [17, 22], [36, 30], [37, 30]], 'b'], ['P', [[14, 16], [15, 16]], 'o'],
    ['F', 0, 36, 1, 3, '1'], ['F', 26, 39, 3, 1, '2'], ['F', 55, 18, 1, 4, '3'], ['F', 26, 0, 3, 1, '4'], ['F', 52, 36, 4, 4, 'X'],
    ['P', [[24, 13], [25, 18], [31, 13], [32, 18], [44, 28], [49, 27], [9, 29], [9, 11], [45, 6], [16, 20], [38, 20], [28, 30]], 'E'],
    ['P', [[22, 11], [26, 17], [33, 14], [30, 18], [42, 30], [48, 26], [8, 30], [11, 9], [40, 5], [14, 37], [50, 15], [3, 15], [31, 4], [20, 37]], 'e'],
    ['P', [[22, 13], [33, 19], [47, 31], [8, 10]], 'H'], ['P', 26, 12, 'V'], ['P', [[30, 12], [43, 30]], 'B'], ['P', [[21, 17], [50, 28], [11, 30]], 'I'],
  ],
};
scatter(MAPS.ranch, 'F', 0.045, 23, 2, (x, y) => !(x >= 38 && x <= 52 && y >= 3 && y <= 9));

// ---------- scenery profile per map (see scenery.js) ----------
const SCENERY = { embassy: 'city', warehouse: 'docks', kandahar: 'desert', oilrig: 'rig', subway: 'citynight', hkoffice: 'tower', bank: 'colonial', ship: 'harbour',
  killhouse: 'training', nairobi: 'savannacity', rio: 'riodocks', forest: 'forest', valley: 'farm', port: 'port', ranch: 'savanna' };
for (const k in MAPS) { MAPS[k].key = k; MAPS[k].scenery = MAPS[k].scenery || SCENERY[k] || 'city'; }

// ---------- missions (two per new map) wired into existing theatres ----------
const NEW = [
  { id: 'bf_hr', map: 'forest', mode: 'hostage', diff: 2, enemies: 18, par: 220, title: 'Lodge in the Pines', cash: 1500, req: 8, region: 'de' },
  { id: 'bf_th', map: 'forest', mode: 'hunt', diff: 2, enemies: 20, par: 240, title: 'Black Forest Sweep', cash: 1600, req: 12, region: 'de' },
  { id: 'hel_in', map: 'valley', mode: 'intel', diff: 2, enemies: 19, par: 230, title: 'Orchard Couriers', cash: 1550, req: 10, region: 'af' },
  { id: 'hel_bd', map: 'valley', mode: 'bomb', diff: 3, enemies: 20, par: 260, timer: 300, title: 'Green Zone IEDs', cash: 1800, req: 15, region: 'af' },
  { id: 'port_ex', map: 'port', mode: 'extract', diff: 3, enemies: 22, par: 260, title: 'Harbourmaster', cash: 2300, req: 23, region: 'co' },
  { id: 'port_th', map: 'port', mode: 'hunt', diff: 3, enemies: 24, par: 280, title: 'Terminal Lockdown', cash: 2400, req: 26, region: 'co' },
  { id: 'ran_hr', map: 'ranch', mode: 'hostage', diff: 3, enemies: 20, par: 240, title: 'Ranch Siege', cash: 2100, req: 22, region: 'ke' },
  { id: 'ran_es', map: 'ranch', mode: 'escort', diff: 3, enemies: 20, par: 250, title: 'Out Through the Acacias', cash: 2200, req: 24, region: 'ke' },
];
for (const { region, ...m } of NEW) { if (MISSIONS.some(x => x.id === m.id)) continue; MISSIONS.push(m); const r = REGIONS.find(x => x.id === region); if (r) r.missions.push(m.id); }
