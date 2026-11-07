// ===== Maps: built from a tiny drawing DSL so new maps are easy to author. =====
// Ops: ['G',ch] fill all | ['R',x,y,w,h,floor] walled room | ['F',x,y,w,h,ch] fill | ['H',x,y,len,ch] | ['V',x,y,len,ch]
//      ['P',x,y,ch] or ['P',[[x,y],...],ch] | ['S',x,y,'str'] (space = skip)
// Legend: # wall, W window (blocks movement, not sight), r railing (same), D door, L locked door, T trapped door, Z locked+trapped
//  , ground  . concrete  _ tile  = wood  ~ carpet  - metal grate  1-4 deploy zones  X exit zone
//  E enemy  e optional enemy  H hostage  V VIP  B bomb  I intel
//  c crate  o barrel  t table  k desk  p plant  b sandbags (half cover)   s shelf  C container  P pillar  F tree (full block)
export const MAPS = {
  embassy: {
    name: 'The Embassy', place: 'Ankara, Turkey', w: 40, h: 28,
    theme: { ground: 0x7d7a6a, wall: 0xd8d0bf, concrete: 0x9a958a, sun: [0.6, 1, 0.35], sky: 0x9fb2c2, time: 'day' },
    ops: [
      ['G', ','], ['R', 3, 3, 34, 21, '~'], ['F', 15, 4, 11, 8, '_'], ['V', 14, 4, 8, '#'], ['V', 26, 4, 8, '#'],
      ['H', 3, 12, 34, '#'], ['F', 4, 13, 32, 2, '_'], ['H', 3, 15, 34, '#'],
      ['V', 12, 16, 7, '#'], ['V', 22, 16, 7, '#'], ['V', 31, 16, 7, '#'], ['F', 13, 16, 9, 7, '='], ['F', 4, 16, 8, 7, '.'], ['F', 32, 16, 4, 7, '.'],
      ['P', [[17, 3], [18, 3], [22, 3], [23, 3], [3, 5], [3, 10], [36, 5], [36, 10]], 'W'],
      ['P', [[20, 3], [3, 8], [36, 8], [14, 8], [26, 8], [8, 12], [20, 12], [31, 12], [6, 15], [15, 15], [24, 15], [22, 19]], 'D'],
      ['P', 33, 15, 'T'], ['P', 27, 23, 'L'],
      ['F', 18, 1, 5, 1, '1'], ['F', 0, 7, 2, 3, '2'], ['F', 38, 7, 2, 3, '3'], ['F', 25, 25, 5, 1, '4'], ['F', 0, 25, 3, 3, 'X'],
      ['P', [[17, 5], [23, 5], [17, 10], [23, 10]], 'P'], ['H', 18, 8, 5, 'k'],
      ['P', [[6, 6], [7, 6], [10, 9], [11, 9], [29, 6], [30, 6], [32, 9], [33, 9]], 'k'], ['P', [[4, 4], [5, 4], [12, 4], [13, 4], [27, 4], [35, 4]], 's'],
      ['P', [[5, 14], [34, 14], [15, 4], [25, 4]], 'p'], ['F', 15, 18, 5, 2, 't'],
      ['H', 4, 17, 2, 's'], ['H', 7, 17, 2, 's'], ['H', 10, 17, 2, 's'], ['H', 4, 20, 2, 's'], ['H', 10, 20, 2, 's'],
      ['H', 25, 18, 3, 'k'], ['P', [[29, 21], [30, 21]], 't'], ['V', 35, 16, 3, 's'],
      ['P', [[2, 1], [37, 1], [2, 24], [37, 25], [10, 26], [32, 0]], 'F'], ['P', [[8, 1], [9, 1], [30, 1], [31, 1], [13, 25], [14, 25]], 'b'],
      ['P', [[20, 6], [16, 11], [7, 8], [31, 7], [19, 14], [17, 21], [28, 19], [6, 21], [33, 19]], 'E'],
      ['P', [[24, 7], [11, 5], [28, 10], [8, 13], [30, 13], [20, 17], [24, 17], [10, 19]], 'e'],
      ['P', [[14, 17], [20, 21], [26, 21], [5, 19]], 'H'], ['P', 27, 17, 'V'], ['P', [[9, 21], [34, 21]], 'B'], ['P', [[26, 19], [5, 10], [32, 21]], 'I'],
    ],
  },
  warehouse: {
    name: 'Dockside Warehouse', place: 'Hamburg, Germany', w: 40, h: 28,
    theme: { ground: 0x4e5154, wall: 0x8c8c86, concrete: 0x77746c, sun: [-0.5, 1, 0.5], sky: 0x6d7a86, time: 'overcast' },
    ops: [
      ['G', ','], ['R', 2, 4, 36, 21, '.'], ['H', 23, 17, 15, '#'], ['V', 23, 17, 8, '#'], ['V', 30, 17, 8, '#'],
      ['F', 24, 18, 6, 6, '~'], ['F', 31, 18, 6, 6, '_'], ['H', 2, 18, 12, '#'], ['V', 13, 18, 7, '#'],
      ['P', [[8, 4], [2, 11], [18, 24], [23, 20], [27, 17], [33, 17], [30, 21], [8, 18]], 'D'], ['P', 30, 4, 'L'], ['P', 13, 21, 'T'],
      ['P', [[14, 4], [15, 4], [22, 4], [23, 4], [37, 9], [37, 10]], 'W'],
      ['V', 6, 7, 8, 's'], ['V', 7, 7, 8, 's'], ['V', 11, 7, 8, 's'], ['V', 12, 7, 8, 's'], ['V', 16, 7, 8, 's'], ['V', 17, 7, 8, 's'],
      ['F', 26, 6, 6, 2, 'C'], ['F', 26, 11, 6, 2, 'C'],
      ['P', [[21, 9], [21, 10], [29, 14], [34, 14], [35, 14], [4, 16], [19, 15], [20, 15], [15, 20], [21, 22]], 'c'], ['P', [[35, 6], [36, 6], [36, 7], [3, 5]], 'o'],
      ['P', [[25, 19], [26, 19], [33, 20], [34, 20]], 'k'], ['P', [[3, 19], [3, 20], [3, 23], [12, 19]], 's'],
      ['F', 12, 0, 4, 2, 'C'], ['F', 33, 26, 5, 2, 'C'], ['F', 0, 26, 4, 2, 'C'], ['P', [[20, 1], [21, 1], [24, 26], [25, 26]], 'c'],
      ['F', 7, 1, 3, 1, '1'], ['F', 29, 1, 3, 1, '2'], ['F', 0, 10, 2, 3, '3'], ['F', 17, 26, 3, 1, '4'], ['F', 38, 24, 2, 3, 'X'],
      ['P', [[9, 9], [14, 12], [19, 6], [28, 9], [33, 13], [20, 20], [26, 21], [34, 22], [8, 21]], 'E'],
      ['P', [[4, 6], [10, 15], [15, 5], [22, 12], [29, 15], [35, 9], [16, 22], [33, 23], [5, 22]], 'e'],
      ['P', [[10, 22], [27, 22], [35, 19]], 'H'], ['P', 35, 23, 'V'], ['P', [[19, 11], [5, 20]], 'B'], ['P', [[25, 23], [32, 18], [14, 8]], 'I'],
    ],
  },
  kandahar: {
    name: 'Mud-Brick Compound', place: 'Kandahar, Afghanistan', w: 36, h: 24,
    theme: { ground: 0xa08a68, wall: 0xb89f7c, concrete: 0x9a8a72, sun: [0.5, 1, -0.4], sky: 0xc8c0a8, time: 'day' },
    ops: [
      ['G', ','], ['R', 4, 4, 13, 9, '='], ['V', 10, 4, 9, '#'], ['R', 22, 3, 10, 7, '.'], ['R', 20, 14, 13, 8, '.'], ['V', 26, 14, 8, '#'], ['R', 6, 16, 7, 6, '='],
      ['P', [[16, 8], [7, 4], [10, 8], [22, 6], [20, 17], [26, 18], [29, 14], [12, 18]], 'D'], ['P', [[4, 10], [32, 19]], 'L'], ['P', [[26, 9], [9, 16]], 'T'],
      ['P', [[13, 4], [27, 3], [24, 21]], 'W'],
      ['P', [[11, 5], [15, 11], [27, 20], [28, 20]], 's'], ['P', [[12, 7], [13, 7], [10, 20]], 't'], ['P', [[24, 4], [25, 4], [30, 8], [2, 7], [3, 17], [17, 19]], 'c'], ['P', [[22, 15], [24, 15]], 'k'],
      ['P', [[14, 15], [15, 15], [16, 15]], 'C'], ['P', [[18, 7], [19, 7], [33, 15]], 'o'],
      ['P', [[2, 1], [33, 1], [1, 20], [34, 22], [18, 22]], 'F'], ['P', [[14, 2], [15, 2], [20, 2], [21, 2], [2, 13], [3, 13], [33, 9], [34, 9]], 'b'],
      ['F', 15, 0, 5, 1, '1'], ['F', 0, 10, 1, 3, '2'], ['F', 35, 10, 1, 3, '3'], ['F', 15, 23, 5, 1, '4'], ['F', 0, 22, 2, 2, 'X'],
      ['P', [[7, 6], [13, 10], [26, 5], [29, 8], [23, 17], [30, 19], [8, 19], [18, 11], [20, 4]], 'E'],
      ['P', [[12, 6], [5, 11], [24, 8], [29, 16], [23, 20], [10, 18], [33, 12], [2, 4], [5, 14], [17, 2]], 'e'],
      ['P', [[14, 6], [30, 5], [29, 20], [7, 20]], 'H'], ['P', 5, 6, 'V'], ['P', [[28, 7], [22, 20]], 'B'], ['P', [[6, 10], [30, 4], [31, 16]], 'I'],
    ],
  },
  oilrig: {
    name: 'Platform Skadi', place: 'North Sea, Norway', w: 36, h: 24,
    theme: { ground: 0x4a5258, wall: 0x9aa4a8, concrete: 0x6a7074, sun: [-0.4, 1, 0.6], sky: 0x5e6e7c, time: 'overcast' },
    ops: [
      ['G', '-'], ['H', 0, 0, 36, 'r'], ['H', 0, 23, 36, 'r'], ['V', 0, 0, 24, 'r'], ['V', 35, 0, 24, 'r'],
      ['R', 3, 3, 12, 8, '_'], ['V', 9, 3, 8, '#'], ['R', 20, 3, 13, 8, '~'], ['V', 26, 3, 8, '#'], ['R', 4, 14, 11, 8, '.'], ['R', 22, 14, 11, 8, '-'], ['V', 27, 14, 8, '#'],
      ['P', [[9, 6], [14, 6], [6, 10], [20, 6], [26, 5], [29, 10], [14, 17], [9, 14], [4, 19], [22, 17], [27, 18], [32, 19]], 'D'], ['P', [[3, 7], [3, 7]], 'T'], ['P', 23, 10, 'L'], ['P', 30, 14, 'Z'],
      ['P', [[6, 3], [12, 3], [23, 3], [30, 3]], 'W'],
      ['F', 16, 4, 3, 2, 'C'], ['F', 16, 17, 3, 2, 'C'], ['P', [[17, 9], [18, 14]], 'P'], ['P', [[2, 3], [2, 4], [33, 16], [33, 17]], 'o'], ['P', [[19, 12], [20, 12], [15, 12]], 'c'],
      ['P', [[4, 4], [5, 4], [11, 9]], 'k'], ['P', [[5, 15], [5, 16]], 's'], ['P', [[30, 6], [31, 6]], 't'],
      ['F', 15, 0, 5, 1, '1'], ['F', 0, 11, 1, 3, '2'], ['F', 35, 11, 1, 3, '3'], ['F', 15, 23, 5, 1, '4'], ['F', 32, 0, 3, 1, 'X'],
      ['P', [[6, 5], [12, 8], [23, 5], [30, 8], [7, 17], [12, 19], [25, 16], [30, 19], [17, 12]], 'E'],
      ['P', [[11, 5], [22, 9], [29, 5], [6, 20], [24, 20], [18, 7], [2, 21], [33, 12], [17, 20]], 'e'],
      ['P', [[5, 8], [31, 5], [10, 20], [29, 17]], 'H'], ['P', 24, 8, 'V'], ['P', [[17, 11], [8, 16]], 'B'], ['P', [[13, 4], [31, 9], [30, 20]], 'I'],
    ],
  },
  subway: {
    name: 'Line 2 Station', place: 'Seoul, South Korea', w: 36, h: 26,
    theme: { ground: 0x3a3c40, wall: 0xb8b4a8, concrete: 0x6a6862, sun: [0.3, 1, 0.5], sky: 0x223040, time: 'night' },
    ops: [
      ['G', ','], ['R', 1, 2, 34, 23, '_'], ['H', 1, 9, 34, '#'], ['R', 13, 3, 8, 4, '.'],
      ['F', 2, 14, 32, 3, '-'], ['H', 2, 13, 32, 'r'], ['H', 2, 17, 32, 'r'], ['P', [[8, 13], [8, 17], [26, 13], [26, 17]], '-'], ['F', 12, 14, 10, 3, 'C'],
      ['H', 1, 19, 34, '#'], ['V', 12, 19, 6, '#'], ['V', 24, 19, 6, '#'],
      ['P', [[6, 2], [28, 2], [34, 12], [5, 9], [17, 9], [30, 9], [16, 6], [6, 19], [18, 19]], 'D'], ['P', [[1, 12], [29, 19]], 'L'], ['P', 17, 24, 'T'],
      ['P', [[9, 7], [10, 7], [11, 7], [24, 7], [25, 7], [26, 7]], 'r'], ['P', [[4, 11], [30, 11], [15, 11], [20, 11]], 'P'], ['P', [[3, 4], [32, 4]], 'p'],
      ['P', [[2, 20], [3, 20], [25, 23], [26, 23], [33, 21]], 's'], ['P', [[14, 20], [15, 20], [22, 23]], 'k'], ['P', [[10, 23], [4, 23]], 'c'],
      ['F', 5, 0, 4, 1, '1'], ['F', 27, 0, 4, 1, '2'], ['F', 0, 11, 1, 3, '3'], ['F', 15, 25, 5, 1, '4'], ['F', 35, 11, 1, 3, 'X'],
      ['P', [[16, 4], [5, 5], [29, 5], [10, 11], [24, 11], [30, 15], [6, 21], [18, 22], [30, 21]], 'E'],
      ['P', [[20, 8], [3, 11], [32, 11], [14, 18], [22, 18], [4, 15], [9, 22], [27, 22], [33, 4]], 'e'],
      ['P', [[19, 4], [3, 22], [21, 21], [32, 23]], 'H'], ['P', 15, 21, 'V'], ['P', [[17, 12], [10, 21]], 'B'], ['P', [[14, 4], [20, 22], [31, 20]], 'I'],
    ],
  },
  hkoffice: {
    name: 'Harbour Tower 41F', place: 'Hong Kong', w: 36, h: 24,
    theme: { ground: 0x55585c, wall: 0xc8ccd0, concrete: 0x7a7c80, sun: [-0.5, 1, -0.3], sky: 0x1c2638, time: 'night' },
    ops: [
      ['G', '.'], ['R', 2, 2, 32, 20, '~'], ['H', 2, 7, 32, '#'], ['V', 9, 2, 6, '#'], ['V', 17, 2, 6, '#'], ['V', 25, 2, 6, '#'],
      ['H', 2, 16, 32, '#'], ['V', 9, 16, 6, '#'], ['V', 17, 16, 6, '#'], ['V', 25, 16, 6, '#'], ['R', 14, 9, 8, 6, '-'],
      ['P', [[5, 7], [13, 7], [21, 7], [29, 7], [5, 16], [13, 16], [29, 16], [2, 11], [33, 11], [13, 2]], 'D'], ['P', [[17, 9], [21, 21]], 'L'], ['P', 21, 16, 'T'],
      ['P', [[4, 2], [6, 2], [20, 2], [23, 2], [28, 2], [31, 2], [4, 21], [7, 21], [12, 21], [27, 21], [30, 21], [2, 5], [2, 18], [33, 5], [33, 18]], 'W'],
      ['P', [[5, 10], [6, 10], [5, 13], [6, 13], [10, 10], [11, 13], [25, 10], [26, 10], [25, 13], [26, 13], [30, 12], [31, 12]], 'k'], ['P', [[3, 8], [32, 8], [3, 15], [32, 15]], 'p'],
      ['P', [[3, 6], [10, 3], [24, 3], [32, 3], [15, 10], [16, 10], [19, 10], [20, 10]], 's'], ['P', [[19, 18], [20, 18], [19, 19]], 't'],
      ['F', 12, 0, 4, 1, '1'], ['F', 0, 10, 1, 3, '2'], ['F', 35, 10, 1, 3, '3'], ['F', 20, 23, 4, 1, '4'], ['F', 0, 22, 2, 2, 'X'],
      ['P', [[5, 4], [13, 5], [21, 4], [29, 4], [16, 12], [6, 12], [28, 13], [5, 19], [21, 19], [29, 19]], 'E'],
      ['P', [[11, 11], [24, 9], [13, 19], [30, 10], [7, 9], [3, 14], [27, 4], [32, 22], [1, 1]], 'e'],
      ['P', [[3, 3], [22, 3], [11, 20], [31, 19]], 'H'], ['P', 30, 4, 'V'], ['P', [[19, 12], [6, 18]], 'B'], ['P', [[18, 11], [15, 4], [28, 20]], 'I'],
    ],
  },
  bank: {
    name: 'Banco Central', place: 'Mexico City, Mexico', w: 36, h: 24,
    theme: { ground: 0x6e665a, wall: 0xd8c8a8, concrete: 0x8a8274, sun: [0.7, 0.8, 0.3], sky: 0xc89870, time: 'dusk' },
    ops: [
      ['G', ','], ['R', 3, 3, 30, 18, '_'], ['H', 8, 8, 20, 't'], ['P', [[12, 8], [23, 8]], '_'], ['H', 3, 12, 30, '#'], ['R', 3, 12, 11, 9, '='], ['R', 13, 12, 10, 9, '.'],
      ['P', [[8, 12], [27, 12], [18, 3], [3, 7], [8, 20], [22, 17]], 'D'], ['P', [[18, 12], [32, 7]], 'L'], ['P', [[28, 20], [13, 16]], 'T'],
      ['P', [[6, 3], [9, 3], [12, 3], [23, 3], [26, 3], [29, 3]], 'W'], ['P', [[7, 5], [28, 5]], 'P'], ['P', [[4, 4], [31, 4]], 'p'],
      ['P', [[14, 13], [14, 14], [21, 13], [21, 14], [14, 19], [21, 19], [31, 13], [31, 15], [24, 19], [25, 19]], 's'], ['P', [[6, 13], [11, 13]], 'k'],
      ['P', [[33, 9], [34, 9], [33, 10], [34, 10]], 'C'], ['P', [[14, 1], [15, 1], [20, 1], [21, 1]], 'b'],
      ['F', 15, 0, 6, 1, '1'], ['F', 0, 6, 1, 3, '2'], ['F', 35, 6, 1, 3, '3'], ['F', 6, 23, 6, 1, '4'], ['F', 33, 22, 3, 2, 'X'],
      ['P', [[10, 5], [25, 6], [17, 9], [29, 10], [7, 15], [17, 15], [27, 16], [20, 19], [5, 10]], 'E'],
      ['P', [[15, 5], [21, 9], [11, 10], [30, 5], [10, 18], [15, 18], [30, 18], [2, 2], [34, 14]], 'e'],
      ['P', [[24, 9], [6, 18], [15, 17], [30, 14]], 'H'], ['P', 11, 15, 'V'], ['P', [[19, 16], [26, 9]], 'B'], ['P', [[5, 14], [20, 14], [31, 19]], 'I'],
    ],
  },
  ship: {
    name: 'MV Esperanza', place: 'Buenaventura, Colombia', w: 36, h: 24,
    theme: { ground: 0x5a5a52, wall: 0x8a4a3a, concrete: 0x6a6a64, sun: [-0.6, 0.9, 0.4], sky: 0x8a6a70, time: 'dusk' },
    ops: [
      ['G', ','], ['R', 2, 2, 32, 16, '='], ['R', 25, 3, 8, 10, '_'], ['H', 25, 7, 8, '#'], ['R', 11, 8, 10, 7, '-'],
      ['F', 4, 4, 3, 2, 'C'], ['F', 4, 12, 3, 2, 'C'], ['F', 12, 3, 4, 2, 'C'], ['F', 19, 4, 3, 2, 'C'], ['F', 22, 14, 2, 2, 'C'],
      ['P', [[8, 17], [33, 14], [25, 5], [28, 7], [29, 12], [15, 8], [20, 12]], 'D'], ['P', [[26, 17], [25, 10]], 'L'], ['P', [[2, 9], [11, 11]], 'T'],
      ['P', [[9, 10], [10, 10], [23, 12], [24, 12], [12, 20], [13, 20], [21, 21], [22, 21]], 'c'], ['P', [[3, 21], [4, 21], [31, 21], [32, 21]], 'o'], ['P', [[26, 4], [27, 4], [31, 8]], 'k'],
      ['F', 6, 23, 5, 1, '1'], ['F', 24, 23, 5, 1, '2'], ['F', 0, 20, 1, 3, '3'], ['F', 35, 20, 1, 3, '4'], ['F', 15, 23, 4, 1, 'X'],
      ['P', [[8, 8], [17, 6], [27, 5], [30, 10], [14, 11], [18, 13], [23, 9], [6, 15], [29, 15]], 'E'],
      ['P', [[9, 4], [22, 6], [31, 4], [13, 10], [24, 16], [4, 9], [10, 19], [30, 20], [17, 1]], 'e'],
      ['P', [[31, 5], [19, 10], [4, 16], [27, 11]], 'H'], ['P', 30, 9, 'V'], ['P', [[16, 13], [23, 4]], 'B'], ['P', [[29, 4], [12, 13], [7, 7]], 'I'],
    ],
  },
};

export const MISSIONS = [
  { id: 'emb_hr', map: 'embassy', mode: 'hostage', diff: 1, enemies: 12, par: 120, title: 'Hostage Rescue', cash: 900 },
  { id: 'emb_ex', map: 'embassy', mode: 'extract', diff: 1, enemies: 12, par: 150, title: 'Get the Ambassador Out', cash: 1000 },
  { id: 'emb_bd', map: 'embassy', mode: 'bomb', diff: 1, enemies: 11, par: 150, timer: 240, title: 'Embassy Bomb Threat', cash: 1000, req: 1 },
  { id: 'wh_th', map: 'warehouse', mode: 'hunt', diff: 1, enemies: 14, par: 150, title: 'Clear the Warehouse', cash: 900 },
  { id: 'wh_hr', map: 'warehouse', mode: 'hostage', diff: 2, enemies: 14, par: 150, title: 'Dock Workers Held', cash: 1100 },
  { id: 'wh_in', map: 'warehouse', mode: 'intel', diff: 1, enemies: 13, par: 150, title: 'Smuggler Ledgers', cash: 1000, req: 2 },
  { id: 'kan_th', map: 'kandahar', mode: 'hunt', diff: 1, enemies: 14, par: 150, title: 'Compound Sweep', cash: 1100, req: 3 },
  { id: 'kan_bd', map: 'kandahar', mode: 'bomb', diff: 2, enemies: 14, par: 180, timer: 240, title: 'IED Factory', cash: 1300, req: 5 },
  { id: 'kan_es', map: 'kandahar', mode: 'escort', diff: 2, enemies: 13, par: 140, title: 'Informant Run', cash: 1250, req: 6 },
  { id: 'rig_hr', map: 'oilrig', mode: 'hostage', diff: 2, enemies: 15, par: 170, title: 'Rig Workers Hostage', cash: 1400, req: 7 },
  { id: 'rig_in', map: 'oilrig', mode: 'intel', diff: 2, enemies: 14, par: 160, title: 'Drill Logs', cash: 1350, req: 9 },
  { id: 'sub_es', map: 'subway', mode: 'escort', diff: 2, enemies: 15, par: 160, title: 'Witness on the Platform', cash: 1450, req: 10 },
  { id: 'sub_th', map: 'subway', mode: 'hunt', diff: 2, enemies: 16, par: 180, title: 'Last Train', cash: 1500, req: 12 },
  { id: 'hk_in', map: 'hkoffice', mode: 'intel', diff: 2, enemies: 15, par: 160, title: 'Server Room', cash: 1550, req: 13 },
  { id: 'hk_hr', map: 'hkoffice', mode: 'hostage', diff: 3, enemies: 16, par: 170, title: 'Boardroom Siege', cash: 1800, req: 15 },
  { id: 'mex_hr', map: 'bank', mode: 'hostage', diff: 2, enemies: 16, par: 170, title: 'Bank Job', cash: 1700, req: 16 },
  { id: 'mex_bd', map: 'bank', mode: 'bomb', diff: 3, enemies: 16, par: 180, timer: 240, title: 'Vault Charges', cash: 1900, req: 18 },
  { id: 'col_ex', map: 'ship', mode: 'extract', diff: 3, enemies: 16, par: 180, title: 'Captain Overboard', cash: 2000, req: 20 },
  { id: 'col_th', map: 'ship', mode: 'hunt', diff: 3, enemies: 18, par: 200, title: 'Cartel Cargo', cash: 2200, req: 22 },
  { id: 'rig_bd', map: 'oilrig', mode: 'bomb', diff: 2, enemies: 15, par: 180, timer: 240, title: 'Wellhead Charges', cash: 1450, req: 11 },
  { id: 'hk_ex', map: 'hkoffice', mode: 'extract', diff: 3, enemies: 16, par: 170, title: 'Banker on 41', cash: 1750, req: 17 },
  { id: 'sub_in', map: 'subway', mode: 'intel', diff: 2, enemies: 15, par: 170, title: 'Dead Drop', cash: 1500, req: 14 },
  { id: 'nai_th', map: 'nairobi', mode: 'hunt', diff: 2, enemies: 15, par: 170, title: 'Annex Lockdown', cash: 1600, req: 19 },
  { id: 'nai_es', map: 'nairobi', mode: 'escort', diff: 3, enemies: 15, par: 170, title: 'Consul at Dusk', cash: 1800, req: 21 },
  { id: 'nai_in', map: 'nairobi', mode: 'intel', diff: 3, enemies: 16, par: 170, title: 'Cipher Room', cash: 1850, req: 23 },
  { id: 'rio_hr', map: 'rio', mode: 'hostage', diff: 3, enemies: 17, par: 180, title: 'Night Shift Hostages', cash: 2000, req: 25 },
  { id: 'rio_bd', map: 'rio', mode: 'bomb', diff: 3, enemies: 17, par: 190, timer: 230, title: 'Harbour Bombs', cash: 2100, req: 27 },
  { id: 'rio_ex', map: 'rio', mode: 'extract', diff: 3, enemies: 18, par: 200, title: 'Final Extraction', cash: 2500, req: 30 },
];
export const REGIONS = [
  { id: 'tr', name: 'Turkey', lon: 32.8, lat: 39.9, side: 'd', missions: ['emb_hr', 'emb_ex', 'emb_bd'] },
  { id: 'de', name: 'Germany', lon: 10, lat: 53.5, side: 'r', missions: ['wh_th', 'wh_hr', 'wh_in'] },
  { id: 'af', name: 'Afghanistan', lon: 65.7, lat: 31.6, side: 'r', missions: ['kan_th', 'kan_bd', 'kan_es'] },
  { id: 'no', name: 'North Sea', lon: 3, lat: 58, left: true, side: 'u', missions: ['rig_hr', 'rig_in'] },
  { id: 'kr', name: 'South Korea', lon: 127, lat: 37.5, side: 'l', missions: ['sub_es', 'sub_th'] },
  { id: 'hk', name: 'Hong Kong', lon: 114.2, lat: 22.3, missions: ['hk_in', 'hk_hr'] },
  { id: 'mx', name: 'Mexico', lon: -99.1, lat: 19.4, missions: ['mex_hr', 'mex_bd'] },
  { id: 'co', name: 'Colombia', lon: -77, lat: 3.9, missions: ['col_ex', 'col_th'] },
  { id: 'ke', name: 'Kenya', lon: 36.8, lat: -1.3, missions: ['nai_th', 'nai_es', 'nai_in'] },
  { id: 'br', name: 'Brazil', lon: -43.2, lat: -22.9, missions: ['rio_hr', 'rio_bd', 'rio_ex'] },
];
for (const [rid, mid] of [['no', 'rig_bd'], ['hk', 'hk_ex'], ['kr', 'sub_in']]) REGIONS.find(r => r.id === rid).missions.push(mid);
// new theatres reuse proven layouts with their own lighting / palette
// Tutorial kill house (Fort Liberty, NC): two plywood rooms, pop-up targets, one hostage role-player
MAPS.killhouse = {
  name: 'Kill House', place: 'Fort Liberty, North Carolina', w: 30, h: 23,
  theme: { ground: 0x6b6f4e, wall: 0xb59d78, concrete: 0x8d897d, sun: [0.5, 1, 0.3], sky: 0xa9bccb, time: 'day' },
  ops: [
    ['G', ','], ['R', 5, 3, 20, 13, '='], ['V', 14, 3, 13, '#'], ['F', 15, 4, 9, 11, '_'],
    ['P', [[10, 15], [19, 15], [14, 9]], 'D'], ['P', [[5, 8], [24, 8], [9, 3], [20, 3]], 'W'],
    ['F', 1, 18, 4, 3, '1'], ['F', 26, 19, 3, 3, 'X'],
    ['P', [[6, 4], [13, 14], [15, 14], [23, 4]], 'c'], ['P', [[18, 9], [19, 9]], 't'],
    ['H', 7, 20, 5, 'b'], ['H', 16, 20, 4, 'b'], ['P', [[26, 5], [26, 6], [27, 12]], 'o'], ['P', [[1, 1], [28, 1], [1, 11], [28, 15], [12, 22], [23, 22]], 'F'],
    ['P', [[7, 6], [12, 6], [7, 12], [12, 12], [17, 6], [22, 12]], 'E'], ['P', 10, 9, 'H'],
  ],
};
MAPS.nairobi = { ...MAPS.embassy, name: 'Consulate Annex', place: 'Nairobi, Kenya', theme: { ground: 0x8a6a4a, wall: 0xcbb89a, concrete: 0x9a8a78, sun: [-0.7, 0.55, 0.3], sky: 0xd8a070, time: 'dusk' } };
MAPS.rio = { ...MAPS.warehouse, name: 'Porto Maravilha Depot', place: 'Rio de Janeiro, Brazil', theme: { ground: 0x3e4440, wall: 0x9a8e7a, concrete: 0x6a665e, sun: [0.4, 1, 0.6], sky: 0x18202c, time: 'night' } };

export function buildGrid(def) {
  const W = def.w, H = def.h, g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill(','));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  for (const op of def.ops) {
    const [k] = op;
    if (k === 'G') for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y][x] = op[1];
    else if (k === 'R') { const [, x0, y0, w, h, f] = op; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, (x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1) ? '#' : f); }
    else if (k === 'F') { const [, x0, y0, w, h, c] = op; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c); }
    else if (k === 'H') { for (let i = 0; i < op[3]; i++) set(op[1] + i, op[2], op[4]); }
    else if (k === 'V') { for (let i = 0; i < op[3]; i++) set(op[1], op[2] + i, op[4]); }
    else if (k === 'P') { if (Array.isArray(op[1])) for (const [x, y] of op[1]) set(x, y, op[2]); else set(op[1], op[2], op[3]); }
    else if (k === 'S') { const s = op[3]; for (let i = 0; i < s.length; i++) if (s[i] !== ' ') set(op[1] + i, op[2], s[i]); }
  }
  return g;
}
