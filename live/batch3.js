/* Batch 3: boot footsteps, backdrop framing, and stage-named interiors.
   Hooks the published game. Does not replace the voice clips or the update toast. */
(function () {
  const STAGES = {
    embassy: ['Front Gate', 'Motor Pool', 'Consular Wing', 'Residence'],
    warehouse: ['Loading Yard', 'Cold Store', 'Container Stacks', 'Office Block'],
    kandahar: ['Outer Wall', 'Stables', 'Courtyard', 'Safe Rooms'],
    oilrig: ['Helideck', 'Pump Room', 'Drill Floor', 'Crew Quarters'],
    subway: ['Street Entrance', 'Service Tunnels', 'Ticket Hall', 'Platform B'],
    hkoffice: ['Lobby', 'Car Park', 'Floors 12–20', 'Floors 30–40'],
    bank: ['Lobby', 'Underground Car Park', 'Trading Floor', 'Vault Corridor'],
    ship: ['Gangway', 'Cargo Hold', 'Main Deck', 'Bridge Deck'],
    nairobi: ['Perimeter', 'Garage', 'Admin Wing', 'Records Room'],
    rio: ['Dock Gate', 'Truck Bay', 'Warehouse Floor', 'Mezzanine'],
    forest: ['Pine Ridge', 'Night in the Pines', 'Lodge Grounds', 'Woodshed Trail'],
    valley: ['Orchard Edge', 'Night Patrol', 'Irrigation Canals', 'Farmhouse'],
    port: ['Terminal Gate', 'Night Shift', 'Container Stacks', 'Quayside'],
    ranch: ['Paddocks', 'Night on the Ranch', 'Acacia Line', 'Ranch House'],
    killhouse: ['Lane 1', 'Lights Out', 'Lane 2', 'Lane 3'],
  };
  const MAPS = {
    embassy: { name: 'The Embassy', place: 'Ankara, Turkey', scenery: 'city', backdrop: 'City skyline around the compound' },
    warehouse: { name: 'Dockside Warehouse', place: 'Hamburg, Germany', scenery: 'docks', backdrop: 'Harbour water, cranes and quayside' },
    kandahar: { name: 'Mud-Brick Compound', place: 'Kandahar, Afghanistan', scenery: 'desert', backdrop: 'Desert terrain and compound walls' },
    oilrig: { name: 'Platform Skadi', place: 'North Sea, Norway', scenery: 'rig', backdrop: 'Open sea under the deck, distant rigs' },
    subway: { name: 'Line 2 Station', place: 'Seoul, South Korea', scenery: 'citynight', backdrop: 'Night city around the station' },
    hkoffice: { name: 'Harbour Tower 41F', place: 'Hong Kong', scenery: 'tower', backdrop: 'Tower skyline and harbour haze' },
    bank: { name: 'Banco Central', place: 'Mexico City, Mexico', scenery: 'colonial', backdrop: 'Colonial city blocks' },
    ship: { name: 'MV Esperanza', place: 'Buenaventura, Colombia', scenery: 'harbour', backdrop: 'Harbour water around the ship' },
    nairobi: { name: 'Consulate Annex', place: 'Nairobi, Kenya', scenery: 'savannacity', backdrop: 'Savanna city and acacia' },
    rio: { name: 'Porto Maravilha Depot', place: 'Rio de Janeiro, Brazil', scenery: 'riodocks', backdrop: 'Night docks and water' },
    forest: { name: 'Schwarzwald Lodge', place: 'Black Forest, Germany', scenery: 'forest', backdrop: 'Pine forest and hills' },
    valley: { name: 'Green Zone Farms', place: 'Helmand, Afghanistan', scenery: 'farm', backdrop: 'Orchard and irrigation country' },
    port: { name: 'Container Terminal', place: 'Buenaventura, Colombia', scenery: 'port', backdrop: 'Open terminal and sea' },
    ranch: { name: 'Rift Valley Ranch', place: 'Naivasha, Kenya', scenery: 'savanna', backdrop: 'Open savanna and acacia' },
    killhouse: { name: 'Kill House', place: 'Fort Liberty, North Carolina', scenery: 'training', backdrop: 'Training range and lanes' },
  };
  const SEA = { rig: 1, harbour: 1, port: 1, docks: 1, riodocks: 1 };

  function recipeFor(label, scenery) {
    const s = label || '';
    if (/car park|motor pool|garage/i.test(s)) return 'parking';
    if (/loading yard|truck bay|dock gate|gangway|quayside|terminal gate/i.test(s)) return 'loading';
    if (/cold store/i.test(s)) return 'cold';
    if (/container|cargo hold|warehouse floor/i.test(s)) return 'containers';
    if (/office block|floors 12|admin wing|trading|records|mezzanine/i.test(s)) return 'office';
    if (/floors 30/i.test(s)) return 'exec';
    if (/lobby/i.test(s)) return 'lobby';
    if (/front gate|outer wall|perimeter|paddock|lane|night patrol|terminal gate/i.test(s)) return 'checkpoint';
    if (/consular|ticket|street entrance|waiting/i.test(s)) return 'waiting';
    if (/residence|farmhouse|lodge|crew quarters/i.test(s)) return 'residence';
    if (/safe rooms|lights out/i.test(s)) return 'bunker';
    if (/stables|acacia/i.test(s)) return 'stables';
    if (/courtyard|orchard|pine ridge|night in the pines|woodshed|irrigation/i.test(s)) return 'yard';
    if (/pump|service tunnel|lower level/i.test(s)) return 'pump';
    if (/drill/i.test(s)) return 'drill';
    if (/helideck/i.test(s)) return 'heli';
    if (/platform/i.test(s)) return 'platform';
    if (/bridge/i.test(s)) return 'bridge';
    if (/main deck/i.test(s)) return 'deck';
    if (/vault/i.test(s)) return 'vault';
    if (scenery === 'forest') return 'yard';
    if (scenery === 'rig') return 'drill';
    if (scenery === 'docks' || scenery === 'port' || scenery === 'riodocks' || scenery === 'harbour') return 'containers';
    if (scenery === 'desert' || scenery === 'savanna' || scenery === 'farm') return 'yard';
    if (scenery === 'training') return 'checkpoint';
    if (scenery === 'subway' || scenery === 'citynight') return 'waiting';
    return 'lobby';
  }

  const CONTENTS = {
    parking: 'Parked cars, a van, pillars, a ramp and parking lines',
    loading: 'A van, pallets and loading lines',
    cold: 'Racks and crates in a cold room',
    containers: 'Containers, crates and barrels',
    office: 'Desks and chairs',
    exec: 'A long table and lounge chairs',
    lobby: 'A front desk, sofa and chairs',
    checkpoint: 'Barriers, sandbags and a guard console',
    waiting: 'Benches and a counter',
    residence: 'A sofa, table and bed',
    bunker: 'Bunks and crates',
    stables: 'Stalls and a trough',
    yard: 'Benches, crates and low cover',
    pump: 'Pipes, a pump and barrels',
    drill: 'Pipe racks, a winch and barrels',
    heli: 'A console and a bench on the deck',
    platform: 'Benches and a platform edge line',
    bridge: 'A helm console and a map table',
    deck: 'A winch, crates and barrels',
    vault: 'A cage counter and strongboxes',
  };

  function checklist() {
    const rows = [];
    for (const key of Object.keys(MAPS)) {
      const m = MAPS[key];
      const names = STAGES[key] || [];
      names.forEach((label, i) => {
        const recipe = recipeFor(label, m.scenery);
        rows.push({ map: key, mapName: m.name, place: m.place, stage: i + 1, label, scenery: m.scenery, backdrop: m.backdrop, recipe, contents: CONTENTS[recipe] });
      });
      rows.push({ map: key, mapName: m.name, place: m.place, stage: 5, label: 'Final', scenery: m.scenery, backdrop: m.backdrop, recipe: recipeFor('', m.scenery), contents: CONTENTS[recipeFor('', m.scenery)] + ' (the map’s own set)' });
    }
    return rows;
  }

  const OrigAC = window.AudioContext || window.webkitAudioContext;
  if (OrigAC && !window.__zuluAudioCtx) {
    function Patched(opts) { const c = new OrigAC(opts); window.__zuluAudioCtx = c; return c; }
    Patched.prototype = OrigAC.prototype;
    if (window.AudioContext) window.AudioContext = Patched;
    if (window.webkitAudioContext) window.webkitAudioContext = Patched;
  }

  let noiseBuf = null;
  function noise(ctx) {
    if (noiseBuf) return noiseBuf;
    const n = Math.floor(ctx.sampleRate * 0.25);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = b;
    return b;
  }
  function bootStep(vol, surface, gait) {
    const mix = window.__audio && window.__audio.getMix && window.__audio.getMix();
    if (!mix || mix.muted || mix.master < 0.02 || mix.sfx < 0.02) return;
    const ctx = window.__zuluAudioCtx;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const run = gait === 'run' || gait === 'jog' || gait === 'sprint';
    const quiet = gait === 'sneak' || gait === 'creep' || surface === 'carpet' || surface === 'snow';
    const master = 0.42 * (vol || 1) * mix.sfx * mix.master * (run ? 1.25 : quiet ? 0.45 : 1);
    const g = ctx.createGain();
    g.gain.value = master;
    g.connect(ctx.destination);
    const heel = ctx.createOscillator();
    heel.type = 'sine';
    heel.frequency.setValueAtTime(run ? 130 : 95, now);
    heel.frequency.exponentialRampToValueAtTime(42, now + 0.14);
    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0.001, now);
    eg.gain.exponentialRampToValueAtTime(1, now + 0.008);
    eg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    heel.connect(eg); eg.connect(g);
    heel.start(now); heel.stop(now + 0.22);
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = surface === 'tile' || surface === 'grate' ? 900 : 480;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(quiet ? 0.08 : 0.22, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    src.connect(lp); lp.connect(ng); ng.connect(g);
    src.start(now); src.stop(now + 0.1);
    const toe = ctx.createOscillator();
    toe.type = 'sine';
    toe.frequency.setValueAtTime(150, now + 0.07);
    toe.frequency.exponentialRampToValueAtTime(60, now + 0.16);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.001, now + 0.07);
    tg.gain.exponentialRampToValueAtTime(0.45, now + 0.08);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    toe.connect(tg); tg.connect(g);
    toe.start(now + 0.07); toe.stop(now + 0.2);
  }

  function bitsOf(scene) {
    let donor = null;
    scene.traverse((o) => {
      const n = o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position && o.geometry.attributes.position.count;
      if (!n || !o.material || o.material.transparent) return;
      if (n <= 36 && (!donor || n < donor.geometry.attributes.position.count)) donor = o;
    });
    if (!donor) return null;
    donor.geometry.computeBoundingBox();
    const bb = donor.geometry.boundingBox;
    return { donor, sx: Math.max(0.05, bb.max.x - bb.min.x), sy: Math.max(0.05, bb.max.y - bb.min.y), sz: Math.max(0.05, bb.max.z - bb.min.z) };
  }
  function box(bits, w, h, d, color) {
    const src = bits.donor;
    const mat = src.material.clone();
    if (mat.color && mat.color.set) mat.color.set(color);
    const m = new src.constructor(src.geometry, mat);
    m.scale.set(w / bits.sx, h / bits.sy, d / bits.sz);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function add(group, mesh, x, z, rot) {
    mesh.position.x = x; mesh.position.z = z;
    if (rot) mesh.rotation.y = rot;
    group.add(mesh);
  }
  function empty(bits) {
    const Obj = Object.getPrototypeOf(bits.donor.constructor.prototype).constructor;
    return new Obj();
  }
  function prop(bits, kind) {
    const root = empty(bits);
    const put = (mesh, x, y, z) => { mesh.position.set(x, y, z); root.add(mesh); return mesh; };
    if (kind === 'car' || kind === 'van') {
      const body = kind === 'van' ? 0x3a4550 : 0x1c3a6e;
      put(box(bits, 1.7, 0.45, 0.85, body), 0, 0.28, 0);
      put(box(bits, 0.9, 0.38, 0.78, 0x9ec8e8), 0.1, 0.72, 0);
      put(box(bits, 0.28, 0.28, 0.12, 0x111111), -0.55, 0.12, 0.42);
      put(box(bits, 0.28, 0.28, 0.12, 0x111111), 0.55, 0.12, 0.42);
      put(box(bits, 0.28, 0.28, 0.12, 0x111111), -0.55, 0.12, -0.42);
      put(box(bits, 0.28, 0.28, 0.12, 0x111111), 0.55, 0.12, -0.42);
    } else if (kind === 'pillar') put(box(bits, 0.45, 2.6, 0.45, 0xc8c2b4), 0, 0, 0);
    else if (kind === 'ramp') put(box(bits, 1.4, 0.35, 2.2, 0x6a675f), 0, 0, 0);
    else if (kind === 'line') put(box(bits, 0.08, 0.02, 2.2, 0xf2f0e6), 0, 0, 0);
    else if (kind === 'desk' || kind === 'console') {
      put(box(bits, 1.6, 0.08, 0.7, 0x6b4a2e), 0, 0.74, 0);
      put(box(bits, 0.08, 0.74, 0.08, 0x3a2a1c), -0.7, 0, -0.28);
      put(box(bits, 0.08, 0.74, 0.08, 0x3a2a1c), 0.7, 0, -0.28);
      put(box(bits, 0.08, 0.74, 0.08, 0x3a2a1c), -0.7, 0, 0.28);
      put(box(bits, 0.08, 0.74, 0.08, 0x3a2a1c), 0.7, 0, 0.28);
    } else if (kind === 'chair') {
      put(box(bits, 0.42, 0.08, 0.42, 0x2a3340), 0, 0.42, 0);
      put(box(bits, 0.42, 0.45, 0.06, 0x2a3340), 0, 0.5, -0.18);
    } else if (kind === 'sofa') {
      put(box(bits, 1.6, 0.35, 0.6, 0x6a3030), 0, 0.28, 0);
      put(box(bits, 1.6, 0.4, 0.1, 0x6a3030), 0, 0.55, -0.25);
    } else if (kind === 'bed') {
      put(box(bits, 1.1, 0.28, 1.9, 0xd8d2c8), 0, 0.2, 0);
      put(box(bits, 1.05, 0.12, 0.4, 0xf4f1ea), 0, 0.48, -0.7);
    } else if (kind === 'table') put(box(bits, 1.1, 0.08, 0.6, 0x5a3e28), 0, 0.42, 0);
    else if (kind === 'crate' || kind === 'pallet') put(box(bits, 0.7, 0.55, 0.7, kind === 'pallet' ? 0x8a6238 : 0xa07a45), 0, 0, 0);
    else if (kind === 'barrel') put(box(bits, 0.45, 0.7, 0.45, 0x2f4a38), 0, 0, 0);
    else if (kind === 'container') put(box(bits, 2.2, 1.15, 1.0, 0xb4532a), 0, 0, 0);
    else if (kind === 'barrier' || kind === 'sandbag') put(box(bits, 1.3, 0.45, 0.4, kind === 'sandbag' ? 0x6b6a52 : 0xd0d2d6), 0, 0, 0);
    else if (kind === 'pipe' || kind === 'rack') put(box(bits, 1.8, 0.18, 0.18, 0x8a9098), 0, 0.9, 0);
    else if (kind === 'pump' || kind === 'winch') put(box(bits, 0.8, 0.7, 0.6, 0xc4552a), 0, 0, 0);
    else if (kind === 'bench') put(box(bits, 1.3, 0.12, 0.4, 0x4a4038), 0, 0.42, 0);
    else if (kind === 'helm') put(box(bits, 0.7, 0.9, 0.45, 0x243038), 0, 0, 0);
    else if (kind === 'bunk') put(box(bits, 0.8, 0.25, 1.8, 0x3d4a38), 0, 0.3, 0);
    else if (kind === 'stall' || kind === 'fence') put(box(bits, 1.4, 1.1, 0.08, 0x6b5334), 0, 0, 0);
    else if (kind === 'trough') put(box(bits, 1.2, 0.35, 0.4, 0x5c6560), 0, 0, 0);
    else if (kind === 'plant') put(box(bits, 0.35, 0.7, 0.35, 0x2f6b3a), 0, 0.2, 0);
    else put(box(bits, 0.6, 0.5, 0.6, 0x666666), 0, 0, 0);
    root.userData.kind = kind;
    return root;
  }

  const KIT = {
    parking: ['car', 'car', 'van', 'pillar', 'ramp', 'line', 'line'],
    loading: ['van', 'pallet', 'crate', 'line'],
    cold: ['rack', 'crate', 'crate', 'barrel'],
    containers: ['container', 'crate', 'barrel', 'pallet'],
    office: ['desk', 'chair', 'desk', 'chair'],
    exec: ['table', 'chair', 'sofa'],
    lobby: ['desk', 'sofa', 'chair', 'plant'],
    checkpoint: ['barrier', 'sandbag', 'console'],
    waiting: ['bench', 'desk', 'chair'],
    residence: ['sofa', 'table', 'bed'],
    bunker: ['bunk', 'crate', 'barrel'],
    stables: ['stall', 'trough', 'crate'],
    yard: ['bench', 'crate', 'plant', 'barrier'],
    pump: ['pipe', 'pump', 'barrel'],
    drill: ['pipe', 'winch', 'barrel', 'crate'],
    heli: ['console', 'bench', 'barrier'],
    platform: ['bench', 'line', 'barrier'],
    bridge: ['helm', 'desk', 'chair'],
    deck: ['winch', 'crate', 'barrel'],
    vault: ['desk', 'crate', 'barrier'],
  };

  function roomsOf(L) {
    const rooms = new Map();
    const W = L.W, H = L.H;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const i = z * W + x;
      const r = L.room[i];
      if (r > 0 && L.type[i] === 0) {
        let rec = rooms.get(r);
        if (!rec) { rec = { cells: [], minx: x, maxx: x, minz: z, maxz: z }; rooms.set(r, rec); }
        rec.cells.push([x, z]);
        if (x < rec.minx) rec.minx = x; if (x > rec.maxx) rec.maxx = x;
        if (z < rec.minz) rec.minz = z; if (z > rec.maxz) rec.maxz = z;
      }
    }
    return [...rooms.values()].sort((a, b) => b.cells.length - a.cells.length);
  }
  function blocked(L) {
    const s = new Set();
    const W = L.W;
    if (L.doors) for (const d of L.doors) {
      const x = d.x | 0, y = d.y | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) s.add((y + dz) * W + (x + dx));
    }
    if (L.zones) for (const k in L.zones) {
      const list = L.zones[k];
      if (!list) continue;
      for (const c of list) if (c && c.length >= 2) s.add((c[1] | 0) * W + (c[0] | 0));
    }
    return s;
  }
  function spots(room, ban, W) {
    const out = [];
    for (const [x, z] of room.cells) {
      if (ban.has(z * W + x)) continue;
      const edge = x <= room.minx + 2 || x >= room.maxx - 2 || z <= room.minz + 2 || z >= room.maxz - 2;
      const mid = Math.abs(x - (room.minx + room.maxx) / 2) < 2 || Math.abs(z - (room.minz + room.maxz) / 2) < 2;
      if (!edge && !mid) continue;
      out.push([x + 0.5, z + 0.5]);
    }
    return out;
  }

  function dress(g, stageN) {
    const scene = g.env && g.env.scene;
    const L = g.level;
    if (!scene || !L) return null;
    const old = scene.getObjectByName('zstage');
    if (old) { scene.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    const bits = bitsOf(scene);
    if (!bits) return null;
    const mapKey = (L.def && (L.def.stageOf || L.def.key || L.def.id)) || (g.mission && g.mission.map) || '';
    const base = String(mapKey).split('@')[0];
    const info = MAPS[base] || { name: L.def && L.def.name || base, place: '', scenery: L.scenery || 'city', backdrop: 'Surrounding terrain' };
    const names = STAGES[base] || ['Approach', 'Lower Level', 'Inner Rooms', 'Upper Level'];
    const n = Math.max(1, Math.min(5, stageN || 1));
    const label = n === 5 ? 'Final: ' + (g.mission && g.mission.title || info.name) : names[n - 1];
    const recipe = recipeFor(n === 5 ? '' : label, info.scenery);
    const group = empty(bits);
    group.name = 'zstage';
    const kit = KIT[recipe] || KIT.lobby;
    const ban = blocked(L);
    const rooms = roomsOf(L).slice(0, 4);
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || !o.geometry || o.name === 'zstage') return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      if (!bb) return;
      const fw = (bb.max.x - bb.min.x) * Math.abs(o.scale.x || 1);
      const fd = (bb.max.z - bb.min.z) * Math.abs(o.scale.z || 1);
      if (fw > 18 || fd > 18) return;
      const e = o.matrixWorld.elements;
      const x = e[12], z = e[14];
      for (const room of rooms) {
        if (x > room.minx + 0.8 && x < room.maxx + 0.2 && z > room.minz + 0.8 && z < room.maxz + 0.2) { o.visible = false; break; }
      }
    });
    let placed = 0;
    rooms.forEach((room, ri) => {
      const sp = spots(room, ban, L.W);
      const use = kit.slice(0, Math.min(kit.length, Math.max(2, Math.floor(room.cells.length / 10))));
      use.forEach((kind, i) => {
        if (!sp.length) return;
        const [x, z] = sp[(i * 3 + ri) % sp.length];
        const p = prop(bits, kind);
        add(group, p, x, z, (i % 2) ? Math.PI / 2 : 0);
        placed++;
      });
    });
    const op = g.ops && g.ops.find((o) => o.alive);
    if (op) {
      const sig = kit[0];
      const p = prop(bits, sig);
      add(group, p, op.x + 2.6, op.z + 1.4, 0.6);
      placed++;
    }
    if (SEA[info.scenery]) {
      // a ring of water outside the playable grid, low enough that it cannot cover the camera
      const span = Math.max(L.W, L.H);
      for (const [x, z, rw, rd] of [[L.W / 2, -18, span + 30, 16], [L.W / 2, L.H + 18, span + 30, 16], [-18, L.H / 2, 16, span], [L.W + 18, L.H / 2, 16, span]]) {
        const sea = box(bits, rw, 0.15, rd, 0x1a6a88);
        sea.position.set(x, -4, z);
        sea.castShadow = false;
        group.add(sea);
      }
    }
    scene.add(group);
    if (info.scenery === 'forest' && scene.fog) { scene.fog.near = 58; scene.fog.far = Math.max(scene.fog.far || 0, 190); }
    const cam = g.env.cam;
    if (cam && cam.target) {
      const op = g.ops && g.ops[0];
      const x = op ? op.x : L.W / 2, z = op ? op.z : L.H / 2;
      const dx = L.W / 2 - x, dz = L.H / 2 - z, d = Math.hypot(dx, dz) || 1, m = Math.min(0.35 * d, 5) / d;
      cam.target.set(x + dx * m, 0, z + dz * m);
      cam.pitch = info.scenery === 'forest' ? 0.6 : (SEA[info.scenery] ? 0.78 : 0.9);
      cam.dist = Math.max(24, Math.min(cam.dist || 24, 32));
    }
    g.zuluStage = { n, label, recipe, contents: CONTENTS[recipe], map: base, mapName: info.name, place: info.place, scenery: info.scenery, backdrop: info.backdrop, placed };
    paintLabel(g);
    ensureMover(g, info, bits);
    return g.zuluStage;
  }

  function paintLabel(g) {
    const top = document.querySelector('#hud .hud-top');
    if (!top || !g.zuluStage) return;
    let el = top.querySelector('.zstage');
    if (!el) {
      el = document.createElement('button');
      el.className = 'zstage';
      el.type = 'button';
      el.title = 'Cycle the stage look. The name matches the furniture.';
      top.append(el);
      el.addEventListener('click', () => {
        const game = window.__game;
        if (!game) return;
        const cur = (game.zuluStage && game.zuluStage.n) || 1;
        dress(game, cur >= 5 ? 1 : cur + 1);
      });
    }
    const s = g.zuluStage;
    el.textContent = 'Stage ' + s.n + '/5 · ' + s.label;
  }

  let mover = null;
  function ensureMover(g, info, bits) {
    if (mover && mover.game === g) return;
    if (mover && mover.stop) mover.stop();
    const outdoor = SEA[info.scenery] || info.scenery === 'desert' || info.scenery === 'savanna' || info.scenery === 'farm' || info.scenery === 'forest' || info.scenery === 'city' || info.scenery === 'training';
    if (!outdoor) { mover = { game: g }; return; }
    const van = prop(bits, 'van');
    van.name = 'zmove';
    const L = g.level;
    van.position.set(-6, 0, L.H * 0.5);
    g.env.scene.add(van);
    let alive = true;
    function tick() {
      if (!alive || window.__game !== g) { van.removeFromParent(); return; }
      van.position.x += 0.045;
      if (van.position.x > L.W + 8) van.position.x = -8;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    mover = { game: g, stop() { alive = false; van.removeFromParent(); } };
  }

  function frameCam() {
    const app = window.__app;
    const cam = app && app.camera;
    if (!cam || cam.__zuluView || !cam.setViewOffset) return;
    cam.__zuluView = true;
    const set = cam.setViewOffset.bind(cam);
    const clear = cam.clearViewOffset.bind(cam);
    cam.setViewOffset = function (fw, fh, x, y, w, h) {
      const ny = innerWidth < innerHeight ? Math.round(y * 0.3) : -Math.round(fh * 0.09);
      return set(fw, fh, x, ny, w, h);
    };
    cam.clearViewOffset = function () {
      if (innerWidth >= innerHeight) return set(innerWidth, innerHeight, 0, -Math.round(innerHeight * 0.09), innerWidth, innerHeight);
      return clear();
    };
  }

  function boot() {
    const app = window.__app;
    if (!app || app.__batch3) return;
    app.__batch3 = true;
    if (!document.getElementById('batch3css')) {
      const st = document.createElement('style');
      st.id = 'batch3css';
      st.textContent = '.zstage{font:700 12px/1.2 system-ui,sans-serif;color:#d7e4c8;background:#12160fd0;border:1px solid #6a8a55;border-radius:8px;padding:4px 8px;cursor:pointer;max-width:46vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}@media (max-width:420px),(max-height:420px){.zstage{font-size:10px;padding:2px 6px}}';
      document.head.append(st);
    }
    frameCam();
    const sfx = window.__audio && window.__audio.sfx;
    if (sfx && !sfx.__boots) { sfx.__boots = true; sfx.step = bootStep; }
    const orig = app.startMission.bind(app);
    app.startMission = function () {
      const r = orig.apply(this, arguments);
      const g = window.__game;
      if (g) dress(g, (g.mission && g.mission.stage) || 1);
      return r;
    };
  }
  window.__zuluPlaces = { maps: MAPS, stages: STAGES, contents: CONTENTS, checklist, recipeFor };
  const wait = setInterval(() => { if (window.__app && window.__audio) { clearInterval(wait); boot(); } }, 40);
})();
