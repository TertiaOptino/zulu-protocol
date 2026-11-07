// w1: one goal per operation. Every stage of an operation keeps the operation's mode (its single goal) and gets a
// stage name that is a real place on that site plus an objective line that names the place and the goal.
// Stage 2 is always the dark / lower-level layout (stages.js), so its name is an underground or night location.
// Used by stages.js (stageName / stageModes / stageMission) and listed in STAGE-NAMES.md (gen-stage-names.mjs).
export const SITE_STAGES = { // map id -> stage 1..4 names (stage 5 = the operation's own target location, OP_FINAL)
  embassy: ['Front Gate', 'Underground Garage', 'Consular Wing', 'Chancery Offices'],
  nairobi: ['Perimeter Gate', 'Basement Garage', 'Visa Hall', 'Admin Wing'],
  warehouse: ['Loading Yard', 'Cold Store', 'Container Aisles', 'Site Offices'],
  rio: ['Dock Gate', 'Underground Truck Bay', 'Warehouse Floor', 'Mezzanine Offices'],
  kandahar: ['Outer Wall', 'Cellar Stores', 'Courtyard', 'Living Quarters'],
  oilrig: ['Helideck', 'Pump Room', 'Drill Floor', 'Crew Quarters'],
  subway: ['Street Entrance', 'Service Tunnels', 'Ticket Hall', 'Concourse'],
  hkoffice: ['Lobby', 'Car Park', 'Open-Plan Office', 'Executive Floor'],
  bank: ['Banking Hall', 'Underground Car Park', 'Trading Floor', 'Executive Offices'],
  ship: ['Gangway', 'Cargo Hold', 'Main Deck', 'Crew Quarters'],
  forest: ['Forest Trail', 'Wine Cellar', 'Lodge Hall', 'Guest Bedrooms'],
  valley: ['Orchard Rows', 'Barn at Night', 'Farmhouse', 'Storage Compound'],
  port: ['Terminal Gate', 'Container Stacks', 'Cargo Warehouses', 'Harbour Offices'],
  ranch: ['Ranch Gate', 'Barn at Night', 'Workshop & Stores', 'Main House'],
};
// operation id -> [final-stage location, who/what the goal is about]
export const OP_FINAL = {
  emb_hr: ["Ambassador's Residence", 'the embassy staff'], emb_ex: ["Ambassador's Office", 'the Ambassador'], emb_bd: ['Server Room', 'the bombs'],
  wh_th: ['Main Warehouse Floor', ''], wh_hr: ['Break Room', 'the dock workers'], wh_in: ["Smugglers' Office", 'the smuggler ledgers'],
  kan_th: ['Command Room', ''], kan_bd: ['IED Workshop', 'the IEDs'], kan_es: ['Safe House', 'the informant'],
  rig_hr: ['Mess Hall', 'the rig workers'], rig_in: ['Control Room', 'the drill logs'], rig_bd: ['Wellhead Deck', 'the wellhead charges'],
  sub_es: ['Platform 2', 'the witness'], sub_th: ['Train Platform', ''], sub_in: ['Station Control Room', 'the dead-drop intel'],
  hk_in: ['Server Room', 'the server data'], hk_hr: ['Boardroom', 'the board members'], hk_ex: ["Banker's Office", 'the banker'],
  mex_hr: ["Manager's Office", 'the bank staff'], mex_bd: ['Vault', 'the vault charges'],
  col_ex: ["Captain's Bridge", 'the captain'], col_th: ['Engine Room', ''],
  nai_th: ['Operations Centre', ''], nai_es: ["Consul's Office", 'the consul'], nai_in: ['Cipher Room', 'the cipher keys'],
  rio_hr: ['Night Shift Break Room', 'the night shift'], rio_bd: ['Quayside Sheds', 'the harbour bombs'], rio_ex: ['Depot Exit Yard', 'the asset'],
  bf_hr: ['Hunting Lodge Study', 'the lodge guests'], bf_th: ['Woodsheds', ''],
  hel_in: ["Couriers' Hideout", 'the courier documents'], hel_bd: ['Bomb Workshop', 'the IEDs'],
  port_ex: ["Harbourmaster's Office", 'the harbourmaster'], port_th: ['Control Tower', ''],
  ran_hr: ['Living Room', 'the ranch family'], ran_es: ['Acacia Track', 'the rancher'],
};
const DEF_WHO = { hunt: '', hostage: 'the hostages', extract: 'the VIP', escort: 'the VIP', bomb: 'the bombs', intel: 'the intel' };
// operation goal (whole op) and per-stage objective, same verb so the stage serves the op goal
const GOAL = {
  hunt: (w, p) => `Clear every hostile from the ${p}`,
  hostage: (w, p) => `Rescue ${w} held at the ${p}`,
  extract: (w, p) => `Get ${w} out through the ${p}`,
  escort: (w, p) => `Escort ${w} safely through the ${p}`,
  bomb: (w, p) => `Defuse ${w} at the ${p} before they blow`,
  intel: (w, p) => `Secure ${w} at the ${p}`,
};
const finalOf = (m) => OP_FINAL[m.id] || null;
export const whoOf = (m) => { const f = finalOf(m); return (f && f[1]) || DEF_WHO[m.mode] || ''; };
export function w1StageName(m, n) { if (n >= 5) { const f = finalOf(m); return f ? f[0] : null; } const s = SITE_STAGES[m.map]; return s ? s[n - 1] : null; }
export function w1Goal(m, place) { const f = GOAL[m.mode]; return f ? f(whoOf(m), place) : ''; }
export function w1OpGoal(m, mapName) { const f = finalOf(m); return f ? `${w1Goal(m, f[0])} (${mapName})` : w1Goal(m, mapName); }
