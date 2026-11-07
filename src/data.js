// ===== Zulu Protocol content data. Everything here is plain data: add rows to extend. =====
export const GAME_TITLE = 'ZULU PROTOCOL';
export const SAVE_KEY = 'zulu_protocol_save_v1';
export const MAX_OPS = 10;
export const TEAMS = [
  { id: 0, name: 'Alpha', short: 'A', color: 0x4fa3ff, css: '#4fa3ff' },
  { id: 1, name: 'Bravo', short: 'B', color: 0x5fd068, css: '#5fd068' },
  { id: 2, name: 'Charlie', short: 'C', color: 0xc77dff, css: '#c77dff' },
];
export const ORANGE = 0xff7a1a;

// Kit colours: [uniform, vest, helmet]
export const KITS = [
  { id: 'multicam', name: 'Multicam', c: [0x8a7d5c, 0x6b6248, 0x5d5644] },
  { id: 'black', name: 'Black Ops', c: [0x2a2c30, 0x1c1d20, 0x232428] },
  { id: 'olive', name: 'Olive Drab', c: [0x5a5f3c, 0x474b30, 0x3e422a] },
  { id: 'navy', name: 'Navy', c: [0x2b3a52, 0x1f2a3c, 0x26324a] },
  { id: 'urban', name: 'Urban Grey', c: [0x6c7078, 0x4a4d54, 0x55585f] },
  { id: 'desert', name: 'Desert Tan', c: [0xb59e78, 0x9b8562, 0x8e7a5a] },
  { id: 'winter', name: 'Winter', c: [0xc9cdd2, 0x9fa4aa, 0xb3b8be] },
  { id: 'woodland', name: 'Woodland', c: [0x4b5a3a, 0x3a3326, 0x3f4a30] },
];
export const SKIN = [0xe8c4a0, 0xc99a74, 0x9a6a48, 0x6b4630, 0xf0d2b8];

// Perk modifiers: acc, hp, speed, aim (reaction-time multiplier, lower = faster), flashR, breach (time mult),
// noise (mult), vision (range mult), armor (+dmg reduction), heal (hp/s to self+allies near medic), cash (mult),
// reveal (drone seconds at start), pick (lockpick time mult), stun (flash resistance mult), extra: {gadget:n}
export const UNITS = [
  { id: 'rangers', name: '75th Ranger Regiment', country: 'USA', type: 'Military', perk: 'Hardy: +20 health, LMG suppression lasts longer', mods: { hp: 20, suppress: 1.5 }, kit: 'multicam', cost: 0 },
  { id: 'seals', name: 'Navy SEALs', country: 'USA', type: 'Military', perk: 'Quiet professionals: weapons 40% quieter, faster reactions', mods: { noise: 0.6, aim: 0.9 }, kit: 'navy', cost: 1200 },
  { id: 'greenberets', name: 'Army Special Forces (Green Berets)', country: 'USA', type: 'Military', perk: 'Force multiplier: +1 medkit, +10% move speed', mods: { speed: 1.1, extra: { medkit: 1 } }, kit: 'olive', cost: 900 },
  { id: 'covert', name: 'Covert Operations Group', country: 'USA', type: 'Agency', perk: 'Ghosts: lockpick 2x faster, enemies notice them slower', mods: { pick: 0.5, stealth: 1.6 }, kit: 'black', cost: 1500 },
  { id: 'sas', name: 'Special Air Service (SAS)', country: 'UK', type: 'Military', perk: 'Hostage rescue: fastest target acquisition, bigger flashbangs', mods: { aim: 0.78, flashR: 1.3 }, kit: 'black', cost: 1200 },
  { id: 'gsg9', name: 'GSG 9', country: 'Germany', type: 'Police', perk: 'Precision: +12% accuracy, never hits hostages by mistake', mods: { acc: 1.12, safeFire: true }, kit: 'navy', cost: 900 },
  { id: 'ksk', name: 'KSK', country: 'Germany', type: 'Military', perk: 'Recon: free 6s drone reveal at mission start, +15% vision', mods: { reveal: 6, vision: 1.15 }, kit: 'woodland', cost: 1000 },
  { id: 'spetsnaz', name: 'Spetsnaz', country: 'Russia', type: 'Military', perk: 'Heavy: +15% armour, breaches 30% faster, 8% slower', mods: { armor: 0.15, breach: 0.7, speed: 0.92 }, kit: 'urban', cost: 1100 },
  { id: 'swat', name: 'LAPD SWAT', country: 'USA', type: 'Police', perk: 'Door crew: kicks and shotgun breaches 40% faster', mods: { breach: 0.6 }, kit: 'navy', cost: 400 },
  { id: 'delta', name: 'Delta Force', country: 'USA', type: 'Military', perk: 'Elite: +8% accuracy, faster reactions, +10 health', mods: { acc: 1.08, aim: 0.88, hp: 10 }, kit: 'multicam', cost: 2500 },
  { id: 'marsoc', name: 'MARSOC (Marine Raiders)', country: 'USA', type: 'Military', perk: 'Raiders: +12% speed, +15% cash for fast missions', mods: { speed: 1.12, cash: 1.15 }, kit: 'desert', cost: 1200 },
  { id: 'sbs', name: 'Special Boat Service (SBS)', country: 'UK', type: 'Military', perk: 'Boarders: quieter weapons and faster door opening', mods: { noise: 0.7, breach: 0.8 }, kit: 'navy', cost: 1200 },
  { id: 'srr', name: 'Special Reconnaissance Regiment', country: 'UK', type: 'Military', perk: 'Surveillance: 10s drone reveal, +20% vision, light kit only', mods: { reveal: 10, vision: 1.2, speed: 1.05 }, kit: 'urban', cost: 1500 },
  { id: 'jtf2', name: 'Joint Task Force 2 (JTF2)', country: 'Canada', type: 'Military', perk: 'Marksmen: +15% accuracy at range', mods: { acc: 1.15, aim: 1.05 }, kit: 'winter', cost: 600 },
  { id: 'sasr', name: 'Special Air Service Regiment (SASR)', country: 'Australia', type: 'Military', perk: 'Long range: +25% vision range', mods: { vision: 1.25 }, kit: 'desert', cost: 900 },
  { id: 'nzsas', name: 'New Zealand SAS', country: 'New Zealand', type: 'Military', perk: 'Bushcraft: enemies notice them slower, +5% speed', mods: { stealth: 1.4, speed: 1.05 }, kit: 'woodland', cost: 900 },
  { id: 'gign', name: 'GIGN', country: 'France', type: 'Gendarmerie', perk: 'Shield wall: +20% armour, slower', mods: { armor: 0.2, speed: 0.93 }, kit: 'black', cost: 500 },
  { id: 'rpima', name: '1er RPIMa', country: 'France', type: 'Military', perk: 'Desert raiders: +8% speed and +10 health', mods: { speed: 1.08, hp: 10 }, kit: 'desert', cost: 800 },
  { id: 'gis', name: 'GIS', country: 'Italy', type: 'Carabinieri', perk: 'Counter-terror snipers: +20% accuracy for marksmen', mods: { acc: 1.1, marksAcc: 1.1 }, kit: 'navy', cost: 900 },
  { id: 'nocs', name: 'NOCS', country: 'Italy', type: 'Police', perk: 'Quiet entry: lockpick 40% faster, quiet doors make no noise', mods: { pick: 0.6, noise: 0.85 }, kit: 'black', cost: 700 },
  { id: 'colmoschin', name: '9th "Col Moschin" Regiment', country: 'Italy', type: 'Military', perk: 'Paratroopers: +10% speed, +1 flashbang', mods: { speed: 1.1, extra: { flash: 1 } }, kit: 'woodland', cost: 900 },
  { id: 'geo', name: 'GEO', country: 'Spain', type: 'Police', perk: 'Fast movers: +12% speed', mods: { speed: 1.12 }, kit: 'navy', cost: 700 },
  { id: 'kct', name: 'Korps Commandotroepen', country: 'Netherlands', type: 'Military', perk: 'Generalists: +1 extra gadget of any carried type', mods: { extra: { any: 1 } }, kit: 'olive', cost: 900 },
  { id: 'sorbe', name: 'Special Operations Regiment', country: 'Belgium', type: 'Military', perk: 'Crowd control: flashbangs stun 30% longer', mods: { flashT: 1.3 }, kit: 'olive', cost: 800 },
  { id: 'grom', name: 'GROM', country: 'Poland', type: 'Military', perk: 'Multi-role: +5% accuracy, speed and reactions', mods: { acc: 1.05, speed: 1.05, aim: 0.95 }, kit: 'multicam', cost: 1100 },
  { id: 'formoza', name: 'JW Formoza', country: 'Poland', type: 'Military', perk: 'Naval divers: quieter, +5 health', mods: { noise: 0.75, hp: 5 }, kit: 'navy', cost: 800 },
  { id: 'jagdkommando', name: 'Jagdkommando', country: 'Austria', type: 'Military', perk: 'Alpine: +15 health, flash resistance', mods: { hp: 15, stun: 0.6 }, kit: 'winter', cost: 900 },
  { id: 'cobra', name: 'EKO Cobra', country: 'Austria', type: 'Police', perk: 'Rapid response: breaches 25% faster, faster reactions', mods: { breach: 0.75, aim: 0.92 }, kit: 'black', cost: 1000 },
  { id: 'czech601', name: '601st Special Forces Group', country: 'Czech Republic', type: 'Military', perk: 'Saboteurs: defuse and grab intel 40% faster', mods: { objective: 0.6 }, kit: 'woodland', cost: 900 },
  { id: 'jaeger', name: 'Jaeger Corps', country: 'Denmark', type: 'Military', perk: 'Patrol: +15% vision, enemies notice them slower', mods: { vision: 1.15, stealth: 1.2 }, kit: 'woodland', cost: 900 },
  { id: 'mjk', name: 'Marinejegerkommandoen (MJK)', country: 'Norway', type: 'Military', perk: 'Maritime CT: +10% accuracy, quieter', mods: { acc: 1.1, noise: 0.8 }, kit: 'winter', cost: 1200 },
  { id: 'sog', name: 'Särskilda operationsgruppen', country: 'Sweden', type: 'Military', perk: 'Small teams: +10 health, +6% speed', mods: { hp: 10, speed: 1.06 }, kit: 'winter', cost: 1000 },
  { id: 'utti', name: 'Utti Jaeger Regiment', country: 'Finland', type: 'Military', perk: 'Heli-borne: +1 smoke, +8% speed', mods: { speed: 1.08, extra: { smoke: 1 } }, kit: 'winter', cost: 900 },
  { id: 'alpha', name: 'Alpha Group', country: 'Russia', type: 'Police/FSB', perk: 'Heavy hostage rescue: +20% armour, faster reactions', mods: { armor: 0.2, aim: 0.9, speed: 0.92 }, kit: 'urban', cost: 1400 },
  { id: 'matkal', name: 'Sayeret Matkal', country: 'Israel', type: 'Military', perk: 'Intel: 8s drone reveal and faster reactions', mods: { reveal: 8, aim: 0.92 }, kit: 'olive', cost: 1600 },
  { id: 'flotilla13', name: 'Shayetet 13', country: 'Israel', type: 'Military', perk: 'Naval commando: quieter and +6% accuracy', mods: { noise: 0.75, acc: 1.06 }, kit: 'navy', cost: 1300 },
  { id: 'smg707', name: '707th Special Mission Group', country: 'South Korea', type: 'Military', perk: 'Tunnel rats: +20% vision in the dark, faster reactions', mods: { vision: 1.2, aim: 0.92 }, kit: 'black', cost: 1200 },
  { id: 'sfgj', name: 'Special Forces Group (JGSDF)', country: 'Japan', type: 'Military', perk: 'Low collateral: never hits hostages, +5% accuracy', mods: { safeFire: true, acc: 1.05 }, kit: 'olive', cost: 1100 },
  { id: 'sdu', name: 'Special Duties Unit (SDU)', country: 'Hong Kong', type: 'Police', perk: 'High-rise CQB: faster reactions and breaches', mods: { aim: 0.88, breach: 0.85 }, kit: 'navy', cost: 1300 },
  { id: 'marcos', name: 'MARCOS', country: 'India', type: 'Military', perk: 'Marine commandos: +10 health and quieter', mods: { hp: 10, noise: 0.8 }, kit: 'woodland', cost: 1000 },
  { id: 'parasf', name: 'Para (Special Forces)', country: 'India', type: 'Military', perk: 'Mountain toughness: +15 health, flash resistance', mods: { hp: 15, stun: 0.7 }, kit: 'olive', cost: 1000 },
];

export const CLASSES = [
  { id: 'assaulter', name: 'Assaulter', icon: 'AS', weapons: ['rifle', 'smg'], desc: 'Fast entries. Rifles and SMGs.', mods: { speed: 1.03 } },
  { id: 'breacher', name: 'Breacher', icon: 'BR', weapons: ['shotgun', 'smg'], desc: 'Carries breaching tools; always allows the shotgun-lock breach. Breaches 30% faster.', mods: { breach: 0.7 } },
  { id: 'marksman', name: 'Marksman', icon: 'MK', weapons: ['dmr', 'rifle'], desc: 'Long-range precision. +10% accuracy, slightly slower.', mods: { acc: 1.1, speed: 0.95, vision: 1.1 } },
  { id: 'medic', name: 'Medic', icon: 'MD', weapons: ['smg', 'rifle'], desc: 'Heals wounded team-mates within 3 m.', mods: { heal: 4 } },
  { id: 'support', name: 'Support', icon: 'SP', weapons: ['lmg', 'rifle'], desc: 'LMGs suppress: enemies under fire aim slower.', mods: { suppress: 1.3, speed: 0.95 } },
];

// Weapon stats: dmg per hit, rof shots/s, acc 0..1, range (m), aim (reaction s), noise radius (m), mob (speed mult), mag, reload s
export const WEAPONS = [
  { id: 'm4a1', name: 'M4A1', type: 'rifle', dmg: 34, rof: 8, acc: 0.72, range: 16, aim: 0.45, noise: 22, mob: 1.0, mag: 30, reload: 2.4, price: 0, stars: 0 },
  { id: 'hk416', name: 'HK416', type: 'rifle', dmg: 36, rof: 7.5, acc: 0.76, range: 17, aim: 0.47, noise: 22, mob: 0.98, mag: 30, reload: 2.5, price: 900, stars: 3 },
  { id: 'c8a2', name: 'C8A2', type: 'rifle', dmg: 31, rof: 8, acc: 0.82, range: 18, aim: 0.48, noise: 22, mob: 0.99, mag: 30, reload: 2.4, price: 800, stars: 2 },
  { id: 'ak74m', name: 'AK-74M', type: 'rifle', dmg: 38, rof: 7, acc: 0.66, range: 16, aim: 0.46, noise: 24, mob: 0.98, mag: 30, reload: 2.7, price: 600, stars: 1 },
  { id: 'g36c', name: 'G36C', type: 'rifle', dmg: 32, rof: 8.5, acc: 0.72, range: 14, aim: 0.40, noise: 21, mob: 1.02, mag: 30, reload: 2.3, price: 750, stars: 2 },
  { id: 'scarl', name: 'SCAR-L', type: 'rifle', dmg: 37, rof: 7, acc: 0.75, range: 18, aim: 0.5, noise: 23, mob: 0.97, mag: 30, reload: 2.5, price: 1200, stars: 6 },
  { id: 'aug', name: 'AUG A3', type: 'rifle', dmg: 34, rof: 7.5, acc: 0.78, range: 17, aim: 0.46, noise: 22, mob: 1.0, mag: 30, reload: 2.6, price: 1000, stars: 5 },
  { id: 'mp5', name: 'MP5A3', type: 'smg', dmg: 24, rof: 11, acc: 0.74, range: 10, aim: 0.33, noise: 16, mob: 1.06, mag: 30, reload: 2.0, price: 0, stars: 0 },
  { id: 'mp7', name: 'MP7A1', type: 'smg', dmg: 23, rof: 12, acc: 0.72, range: 11, aim: 0.31, noise: 15, mob: 1.08, mag: 40, reload: 2.0, price: 700, stars: 2 },
  { id: 'ump45', name: 'UMP45', type: 'smg', dmg: 30, rof: 9, acc: 0.68, range: 10, aim: 0.34, noise: 15, mob: 1.05, mag: 25, reload: 2.2, price: 600, stars: 1 },
  { id: 'vector', name: 'Vector .45', type: 'smg', dmg: 27, rof: 15, acc: 0.64, range: 9, aim: 0.29, noise: 15, mob: 1.08, mag: 25, reload: 2.0, price: 1100, stars: 6 },
  { id: 'p90', name: 'P90', type: 'smg', dmg: 22, rof: 13, acc: 0.7, range: 11, aim: 0.32, noise: 16, mob: 1.06, mag: 50, reload: 2.6, price: 950, stars: 4 },
  { id: 'm870', name: 'M870', type: 'shotgun', dmg: 85, rof: 1.3, acc: 0.85, range: 7, aim: 0.36, noise: 26, mob: 1.02, mag: 7, reload: 3.6, price: 0, stars: 0 },
  { id: 'm1014', name: 'M1014', type: 'shotgun', dmg: 75, rof: 3, acc: 0.82, range: 7, aim: 0.38, noise: 26, mob: 1.0, mag: 7, reload: 3.4, price: 800, stars: 2 },
  { id: 'saiga', name: 'Saiga-12', type: 'shotgun', dmg: 70, rof: 3.5, acc: 0.78, range: 7, aim: 0.4, noise: 27, mob: 0.98, mag: 8, reload: 2.8, price: 1000, stars: 4 },
  { id: 'aa12', name: 'AA-12', type: 'shotgun', dmg: 65, rof: 5, acc: 0.72, range: 6, aim: 0.42, noise: 28, mob: 0.95, mag: 20, reload: 3.2, price: 1600, stars: 8 },
  { id: 'sr25', name: 'SR-25', type: 'dmr', dmg: 70, rof: 2.5, acc: 0.88, range: 26, aim: 0.6, noise: 26, mob: 0.95, mag: 20, reload: 2.8, price: 0, stars: 0 },
  { id: 'mk14', name: 'Mk14 EBR', type: 'dmr', dmg: 75, rof: 2.8, acc: 0.85, range: 24, aim: 0.62, noise: 27, mob: 0.93, mag: 20, reload: 3.0, price: 900, stars: 2 },
  { id: 'g28', name: 'G28', type: 'dmr', dmg: 72, rof: 2.6, acc: 0.9, range: 27, aim: 0.6, noise: 26, mob: 0.94, mag: 20, reload: 2.9, price: 1200, stars: 5 },
  { id: 'svd', name: 'SVD', type: 'dmr', dmg: 80, rof: 2, acc: 0.86, range: 26, aim: 0.65, noise: 28, mob: 0.93, mag: 10, reload: 3.0, price: 800, stars: 3 },
  { id: 'awm', name: 'AWM', type: 'dmr', dmg: 150, rof: 0.8, acc: 0.95, range: 32, aim: 0.8, noise: 32, mob: 0.88, mag: 5, reload: 3.6, price: 1800, stars: 10 },
  { id: 'm249', name: 'M249', type: 'lmg', dmg: 32, rof: 12, acc: 0.6, range: 18, aim: 0.6, noise: 26, mob: 0.88, mag: 100, reload: 5, price: 0, stars: 0 },
  { id: 'mg4', name: 'MG4', type: 'lmg', dmg: 33, rof: 13, acc: 0.62, range: 18, aim: 0.6, noise: 26, mob: 0.88, mag: 100, reload: 5, price: 1100, stars: 4 },
  { id: 'pkp', name: 'PKP Pecheneg', type: 'lmg', dmg: 42, rof: 10, acc: 0.58, range: 19, aim: 0.65, noise: 28, mob: 0.85, mag: 100, reload: 5.5, price: 1300, stars: 6 },
  { id: 'glock17', name: 'Glock 17', type: 'pistol', dmg: 24, rof: 5, acc: 0.68, range: 9, aim: 0.3, noise: 14, mob: 1.0, mag: 17, reload: 1.6, price: 0, stars: 0 },
  { id: 'm9', name: 'M9', type: 'pistol', dmg: 25, rof: 4.5, acc: 0.68, range: 9, aim: 0.31, noise: 14, mob: 1.0, mag: 15, reload: 1.7, price: 200, stars: 0 },
  { id: 'usp', name: 'USP .45', type: 'pistol', dmg: 30, rof: 4, acc: 0.7, range: 9, aim: 0.32, noise: 13, mob: 1.0, mag: 12, reload: 1.7, price: 350, stars: 1 },
  { id: 'mp443', name: 'MP-443 Grach', type: 'pistol', dmg: 26, rof: 4.5, acc: 0.66, range: 9, aim: 0.3, noise: 14, mob: 1.0, mag: 18, reload: 1.7, price: 250, stars: 1 },
];
export const ATTACHMENTS = [
  { id: 'none', slot: 'muzzle', name: 'No muzzle', price: 0 },
  { id: 'suppressor', slot: 'muzzle', name: 'Suppressor', desc: 'Noise x0.25, damage -10%', price: 600, stars: 1, m: { noise: 0.25, dmg: 0.9 } },
  { id: 'compensator', slot: 'muzzle', name: 'Compensator', desc: '+6% accuracy, +10% noise', price: 300, stars: 0, m: { acc: 1.06, noise: 1.1 } },
  { id: 'iron', slot: 'optic', name: 'Iron sights', price: 0 },
  { id: 'reddot', slot: 'optic', name: 'Red Dot', desc: 'Reactions 12% faster', price: 0, stars: 0, m: { aim: 0.88 } },
  { id: 'holo', slot: 'optic', name: 'Holographic', desc: 'Reactions 18% faster, -3% accuracy', price: 500, stars: 2, m: { aim: 0.82, acc: 0.97 } },
  { id: 'acog', slot: 'optic', name: 'ACOG 4x', desc: '+25% range, +8% accuracy, 10% slower reactions', price: 700, stars: 3, m: { range: 1.25, acc: 1.08, aim: 1.1 } },
  { id: 'laser', slot: 'optic', name: 'Laser + light', desc: 'Moving accuracy penalty halved', price: 450, stars: 1, m: { moveAcc: 0.5 } },
];
export const ARMOR = [
  { id: 'none', name: 'No armour', red: 0, mob: 1.04, price: 0, stars: 0 },
  { id: 'light', name: 'Light vest', red: 0.2, mob: 1.0, price: 0, stars: 0 },
  { id: 'plate', name: 'Plate carrier', red: 0.33, mob: 0.96, price: 0, stars: 0 },
  { id: 'heavy', name: 'Heavy plates + helmet', red: 0.45, mob: 0.88, price: 900, stars: 2 },
  { id: 'assault', name: 'Assault armour (Juggernaut)', red: 0.58, mob: 0.78, price: 1800, stars: 6 },
];
export const GADGETS = [
  { id: 'flash', name: 'Flashbang', desc: 'Stuns enemies in a 4 m radius for 3.5 s', price: 40, stars: 0 },
  { id: 'frag', name: 'Frag grenade', desc: 'Kills in 3 m. Lethal to hostages too!', price: 70, stars: 0 },
  { id: 'smoke', name: 'Smoke grenade', desc: 'Blocks line of sight in a 3 m radius for 15 s', price: 50, stars: 0 },
  { id: 'charge', name: 'Breaching charge', desc: 'Blows any door off its hinges, stuns behind it. Very loud. Safe on traps.', price: 90, stars: 0 },
  { id: 'lockpick', name: 'Lockpick set', desc: 'Silently opens locked doors; disarms traps', price: 25, stars: 0 },
  { id: 'medkit', name: 'Medkit', desc: 'Auto-heals 50 hp when badly wounded', price: 60, stars: 0 },
  { id: 'drone', name: 'Recon drone', desc: 'Reveals every enemy for 8 s at mission start', price: 300, stars: 2 },
];

// Breach methods (data rows): time s, noise m, item consumed, opensLocked, destroys door, trap: 'trigger'|'safe'|'disarm'
export const BREACH = [
  { id: 'open', name: 'Open quietly', time: 0.6, noise: 1, item: null, locked: false, destroy: false, trap: 'trigger', desc: 'Silent. Fails on locked doors.' },
  { id: 'lockpick', name: 'Lockpick', time: 4, noise: 0, item: 'lockpick', locked: true, destroy: false, trap: 'disarm', desc: 'Silent, slow. Opens locks, disarms traps.' },
  { id: 'kick', name: 'Kick', time: 1.0, noise: 9, item: null, locked: false, destroy: false, trap: 'trigger', desc: 'Fast, a bit loud. Fails on locked doors.' },
  { id: 'shotgun', name: 'Shotgun the lock', time: 1.2, noise: 18, item: null, needs: 'breacher', locked: true, destroy: true, trap: 'trigger', desc: 'Opens locks. Loud. Needs a breacher or shotgun.' },
  { id: 'charge', name: 'Breaching charge', time: 2.5, noise: 34, item: 'charge', locked: true, destroy: true, trap: 'safe', stun: 3, desc: 'Destroys door, stuns room. Alerts everyone.' },
];

export const MODES = {
  hunt: { name: 'Terrorist Hunt', short: 'HUNT', desc: 'Neutralise every hostile.' },
  hostage: { name: 'Hostage Rescue', short: 'RESCUE', desc: 'Neutralise all hostiles. Loud entries make executioners go for the hostages. Do not shoot the hostages.' },
  extract: { name: 'Extraction', short: 'EXTRACT', desc: 'Find the VIP inside, then escort them to the exit (green zone).' },
  bomb: { name: 'Bomb Defusal', short: 'DEFUSE', desc: 'Reach every bomb and defuse it before the timer runs out. Stand next to a bomb to defuse.' },
  escort: { name: 'VIP Protection', short: 'ESCORT', desc: 'The VIP starts with your team. Get them across to the exit alive.' },
  training: { name: 'Training', short: 'TRAIN', desc: 'Guided kill-house drill. Pop-up targets, one hostage role-player.' },
  intel: { name: 'Intel Grab', short: 'INTEL', desc: 'Grab every intel item. Once the alarm goes up, the enemy wipes the intel in 45 s.' },
};
export const DIFFS = [
  { name: 'Recruit', acc: 0.32, aim: 1.25, hp: 80 },
  { name: 'Regular', acc: 0.42, aim: 1.0, hp: 100 },
  { name: 'Veteran', acc: 0.52, aim: 0.85, hp: 110 },
  { name: 'Elite', acc: 0.6, aim: 0.75, hp: 120 },
];
