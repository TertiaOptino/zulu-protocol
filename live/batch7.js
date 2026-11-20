/* Stage layouts, action cutscenes, replayable intros. */
(function () {
  const STAGE_LORE = {
    embassy: [
      "The Ankara job starts at the front gate. The team is here to get inside before the compound locks down.",
      "The motor pool holds the embassy vehicles. They are crossing it to reach the consular rooms.",
      "The consular wing is the public side of the embassy. The intel they came for is in this part of the building.",
      "The residence is where the people they came to get were being held.",
      "The chancery is the secure office. This is the last part of the embassy job before the extraction."
    ],
    warehouse: [
      "The loading yard is the way into the Hamburg warehouse. The team came in off the dock.",
      "The cold store is the chilled room. They are clearing it on the way through the warehouse.",
      "The container stacks are the freight rows. The smugglers were using this floor.",
      "The office block is where the warehouse paperwork is. The team is looking for the shipment record.",
      "The dispatch office is the last room. This is where the warehouse job ends."
    ],
    kandahar: [
      "The outer wall is the edge of the mud-brick compound. The team is coming in from the desert.",
      "The stables are inside the wall. They are moving through the stalls toward the courtyard.",
      "The courtyard is the open middle of the compound. This is the crossing to the inner rooms.",
      "The safe rooms are where people were kept. The team is here to get them out.",
      "The inner compound is the last walled yard. The Kandahar job finishes here."
    ],
    oilrig: [
      "The helideck is where the team landed on Platform Skadi, over open water.",
      "The pump room is the machinery space under the deck. They are passing through it.",
      "The drill floor is the open work deck. The well gear is here.",
      "The crew quarters are the bunks. They are clearing the rooms the crew used.",
      "The wellhead is the last station on the rig. The team is here to finish and get off."
    ],
    subway: [
      "The street entrance is the way down into the Seoul station. The team is entering from the street.",
      "The service tunnels run under the platforms. They are using them to move without the concourse.",
      "The ticket hall is the public room of the station. This is the crossing to the platforms.",
      "Platform B is the train platform. The team is moving along it.",
      "The concourse is the last hall. The station job ends here."
    ],
    hkoffice: [
      "The lobby is the open ground floor of Harbour Tower. The team is coming in from the street.",
      "The car park is the open parking level under the tower. Rows of cars, pillars, and a ramp. No offices.",
      "Floors 12 to 20 are office floors. The team is climbing and clearing the desks.",
      "Floors 30 to 40 are the upper offices. They are still moving up the tower.",
      "The executive floor is the top of the job. This is the last office in the tower."
    ],
    bank: [
      "The lobby is the open public hall of Banco Central. The team is entering the bank here.",
      "The underground car park is one open parking level. Parked cars, pillars, a ramp, and bay lines. It is not an office.",
      "The trading floor is the open desk floor above the garage. The team is crossing it toward the vault.",
      "The vault corridor is the last hall before the strongroom.",
      "The vault floor is the strongroom. The bank job finishes here."
    ],
    ship: [
      "The gangway is the way onto MV Esperanza. The team is boarding from the dock.",
      "The cargo hold is the container deck below. They are moving through the freight.",
      "The main deck is the open deck. This is the crossing to the bridge.",
      "The bridge deck is the level under the wheelhouse. They are coming up.",
      "The bridge is the wheelhouse. The ship job ends here."
    ],
    nairobi: [
      "The perimeter is the edge of the consulate annex. The team is coming in from the city.",
      "The garage is the parking level. Cars and pillars, not offices.",
      "The admin wing is the office side of the annex. They are clearing the desks.",
      "The records room is where the files are. The team is here for the papers.",
      "The annex archive is the last store. The Nairobi job finishes here."
    ],
    rio: [
      "The dock gate is the entrance to the Porto Maravilha depot. The team is coming in from the quay.",
      "The truck bay is the open loading floor. Vans and pallets, not offices.",
      "The warehouse floor is the freight hall. Containers and crates.",
      "The mezzanine is the upper walk over the floor. They are moving up.",
      "The depot office is the last room. The Rio job ends here."
    ],
    forest: [
      "Pine Ridge is the open approach through the Black Forest. The team is moving in under the trees.",
      "Pine Camp is the camp in the trees. Bunks and crates, not a city office.",
      "The lodge grounds are the open ground around the lodge.",
      "The woodshed trail is the path past the shed. They are following it.",
      "Ridge Road is the track out. The forest job finishes on this road."
    ],
    valley: [
      "The orchard edge is the way into the Helmand farm. The team is coming through the trees.",
      "The patrol track is the dirt road across the farm.",
      "The irrigation canals are the water cuts through the fields.",
      "The farmhouse is the house. Rooms, a table, and beds. This is the building they came for.",
      "The farm gate is the way out. The valley job ends at the gate."
    ],
    port: [
      "The terminal gate is the entrance to the container terminal. The team is coming in from the road.",
      "The control tower is the tower room over the yard.",
      "The container stacks are the freight rows on the quay.",
      "The quayside is the open edge by the water.",
      "The harbour office is the last room. The port job ends here."
    ],
    ranch: [
      "The paddocks are the open horse fields. Fences, not offices.",
      "The bunkhouse is the crew bunk room.",
      "The acacia line is the tree line across the ranch.",
      "The ranch house is the house. Rooms and furniture that belong in a house.",
      "The ranch yard is the open yard. The ranch job finishes here."
    ],
    killhouse: [
      "Lane 1 is the first shooting lane on the Fort Liberty range. Training starts here.",
      "The shoothouse is the room-clearing house. Walls, doorways, and lanes.",
      "Lane 2 is the second range lane.",
      "Lane 3 is the third range lane.",
      "The final range is the last lane. Training ends here."
    ]
  };

  function shapeFor(label, recipe, scenery) {
    const s = String(label || '').toLowerCase();
    if (/car park|motor pool|garage/.test(s)) return 'lot';
    if (/shoothouse/.test(s)) return 'rooms';
    if (/lane|final range/.test(s)) return 'lanes';
    if (/corridor|tunnel/.test(s)) return 'corridor';
    if (/stable|acacia/.test(s)) return 'stalls';
    if (/platform/.test(s) && (scenery === 'citynight' || scenery === 'subway')) return 'hall';
    if (/trading|lobby|concourse|ticket|consular|entrance|mezzanine|hall/.test(s)) return 'hall';
    if (/office|chancery|admin|records|dispatch|executive|floors/.test(s)) return 'offices';
    if (/residence|farmhouse|quarters|bunkhouse|safe room|archive|house/.test(s)) return 'rooms';
    if (/container|cargo|warehouse floor|hold/.test(s)) return 'rows';
    if (/pump|cold|the bridge|vault floor|control tower/.test(s)) return 'single';
    if (/deck|heli|wellhead|drill/.test(s)) return 'deck';
    if (/gangway|quay|dock|loading|yard|gate|perimeter|outer wall|paddock|ridge|track|orchard|courtyard|camp|trail|road|canal|compound|bay|bridge|lodge/.test(s)) return 'open';
    if (recipe === 'parking') return 'lot';
    if (recipe === 'office' || recipe === 'exec') return 'offices';
    if (recipe === 'vault') return 'corridor';
    if (recipe === 'containers') return 'rows';
    return 'hall';
  }

  function kindsFor(shape, recipe) {
    if (shape === 'lot') return ['car'];
    if (shape === 'rows') return ['container', 'crate', 'barrel', 'pallet'];
    if (shape === 'offices') return ['desk', 'chair'];
    if (shape === 'rooms') return ['bed', 'sofa', 'table'];
    if (shape === 'hall') return recipe === 'office' ? ['desk', 'chair'] : ['desk', 'sofa', 'chair', 'plant', 'bench'];
    if (shape === 'stalls') return ['stall', 'trough', 'crate'];
    if (shape === 'lanes') return ['barrier', 'sandbag'];
    if (shape === 'corridor') return ['crate', 'barrel', 'barrier'];
    if (shape === 'deck') return ['winch', 'crate', 'barrel', 'barrier'];
    if (shape === 'single') {
      if (recipe === 'bridge') return ['helm', 'desk', 'chair'];
      if (recipe === 'vault') return ['barrier', 'crate'];
      if (recipe === 'cold') return ['rack', 'crate'];
      if (recipe === 'pump' || recipe === 'drill') return ['pump', 'pipe', 'barrel'];
      return ['desk', 'crate', 'chair'];
    }
    if (recipe === 'loading') return ['van', 'pallet', 'crate', 'barrier'];
    if (recipe === 'checkpoint') return ['barrier', 'sandbag', 'console'];
    return ['barrier', 'bench', 'plant', 'crate'];
  }

  const WALLC = { lot: 0xb7b2a8, hall: 0xd5cfc3, offices: 0xded8d0, rooms: 0xc4b5a4, rows: 0x8a8178, open: 0x8d8458, lanes: 0x6e7268, stalls: 0x7a6244, corridor: 0x8e9398, single: 0x6a7076, deck: 0x667078 };
  const FLOORC = { lot: 0x34383e, hall: 0xc8bfb0, offices: 0xb1aaa2, rooms: 0x8a7564, rows: 0x5c564e, open: 0x66744a, lanes: 0x4c5148, stalls: 0x6b5a3e, corridor: 0x5e656c, single: 0x4a5158, deck: 0x5c656e };

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
  function empty(bits) {
    const Obj = Object.getPrototypeOf(bits.donor.constructor.prototype).constructor;
    return new Obj();
  }
  function flat(bits, w, h, d, color) {
    const src = bits.donor;
    const mat = src.material.clone();
    if (mat.color && mat.color.set) mat.color.set(color);
    mat.map = null;
    mat.needsUpdate = true;
    const m = new src.constructor(src.geometry, mat);
    m.scale.set(w / bits.sx, h / bits.sy, d / bits.sz);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function drop(root, x, z, rot) {
    root.rotation.y = rot || 0;
    root.position.set(x, 0.09, z);
    root.updateMatrixWorld(true);
    let minY = Infinity;
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      const e = o.matrixWorld.elements;
      for (const lx of [bb.min.x, bb.max.x]) for (const ly of [bb.min.y, bb.max.y]) for (const lz of [bb.min.z, bb.max.z]) {
        const wy = e[4] * lx + e[5] * ly + e[6] * lz + e[13];
        if (wy < minY) minY = wy;
      }
    });
    if (minY < Infinity) root.position.y += 0.09 - minY;
  }
  function prop(bits, kind, n) {
    const root = empty(bits);
    const put = (mesh, x, y, z) => { mesh.position.set(x, y, z); root.add(mesh); };
    if (kind === 'car' || kind === 'van') {
      const colors = [0x1c3a6e, 0x8a1e1e, 0xd0d0d0, 0x1a1a1a, 0x2f6b3a, 0xc4552a];
      const body = kind === 'van' ? 0x3a4550 : colors[(n || 0) % colors.length];
      const len = kind === 'van' ? 4.6 : 3.8;
      put(flat(bits, len, 1.15, 1.75, body), 0, 0.7, 0);
      put(flat(bits, len * 0.42, 0.85, 1.55, 0xd5e7f2), kind === 'van' ? 0.15 : -0.2, 1.55, 0);
      for (const [x, z] of [[-len * 0.32, 0.8], [len * 0.3, 0.8], [-len * 0.32, -0.8], [len * 0.3, -0.8]]) put(flat(bits, 0.62, 0.62, 0.28, 0x111111), x, 0.32, z);
    } else if (kind === 'desk' || kind === 'console' || kind === 'helm') {
      put(flat(bits, 2.2, 0.12, 0.8, kind === 'helm' ? 0x243038 : 0x8a5a32), 0, 0.9, 0);
      put(flat(bits, 2.2, 0.9, 0.12, 0x4a3018), 0, 0.45, -0.34);
      put(flat(bits, 0.1, 0.9, 0.8, 0x3a2a1c), -1.05, 0.45, 0);
      put(flat(bits, 0.1, 0.9, 0.8, 0x3a2a1c), 1.05, 0.45, 0);
    } else if (kind === 'chair') {
      put(flat(bits, 0.5, 0.1, 0.5, 0x2a3340), 0, 0.5, 0);
      put(flat(bits, 0.5, 0.7, 0.1, 0x2a3340), 0, 0.85, -0.2);
    } else if (kind === 'sofa') {
      put(flat(bits, 2.1, 0.5, 0.8, 0x8a2424), 0, 0.35, 0);
      put(flat(bits, 2.1, 0.8, 0.16, 0x6a1818), 0, 0.9, -0.32);
    } else if (kind === 'bed') {
      put(flat(bits, 1.2, 0.35, 2.0, 0xd8d2c8), 0, 0.25, 0);
      put(flat(bits, 1.15, 0.16, 0.45, 0xf4f1ea), 0, 0.5, -0.7);
    } else if (kind === 'table') put(flat(bits, 1.2, 0.08, 0.7, 0x5a3e28), 0, 0.72, 0);
    else if (kind === 'crate' || kind === 'pallet') put(flat(bits, 0.8, 0.6, 0.8, kind === 'pallet' ? 0x8a6238 : 0xa07a45), 0, 0.3, 0);
    else if (kind === 'barrel') put(flat(bits, 0.5, 0.8, 0.5, 0x2f4a38), 0, 0.4, 0);
    else if (kind === 'container') put(flat(bits, 2.4, 1.25, 1.05, [0xb4532a, 0x2e5a7a, 0x4a6a3a, 0x8a8a8a][(n || 0) % 4]), 0, 0.62, 0);
    else if (kind === 'barrier' || kind === 'sandbag') put(flat(bits, 1.4, 0.5, 0.4, kind === 'sandbag' ? 0x6b6a52 : 0xd0d2d6), 0, 0.25, 0);
    else if (kind === 'pipe' || kind === 'rack') put(flat(bits, 2.2, 0.22, 0.22, 0x8a9098), 0, 1.1, 0);
    else if (kind === 'pump' || kind === 'winch') put(flat(bits, 1.0, 0.8, 0.7, 0xc4552a), 0, 0.4, 0);
    else if (kind === 'bench') put(flat(bits, 1.4, 0.12, 0.42, 0x4a4038), 0, 0.46, 0);
    else if (kind === 'stall') put(flat(bits, 1.6, 1.2, 0.1, 0x6b5334), 0, 0.6, 0);
    else if (kind === 'trough') put(flat(bits, 1.3, 0.4, 0.45, 0x5c6560), 0, 0.25, 0);
    else if (kind === 'plant') put(flat(bits, 0.4, 1.1, 0.4, 0x2f6b3a), 0, 0.55, 0);
    else if (kind === 'line') put(flat(bits, 0.12, 0.04, 2.4, 0xf4f1e8), 0, 0.02, 0);
    else if (kind === 'pillar') put(flat(bits, 0.7, 2.6, 0.7, 0xc8c2b4), 0, 1.3, 0);
    else put(flat(bits, 0.6, 0.5, 0.6, 0x666666), 0, 0.25, 0);
    root.userData.kind = kind;
    return root;
  }

  function touchesOut(L, x, y) {
    const W = L.W, H = L.H;
    if (x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1) return true;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let k = 0; k < n.length; k++) {
      const nx = x + n[k][0], ny = y + n[k][1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) return true;
      if (L.ext && L.ext[ny * W + nx]) return true;
    }
    return false;
  }
  function occupied(g, L) {
    const s = new Set();
    const add = (x, z, rad) => {
      const ix = Math.floor(x), iz = Math.floor(z);
      for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
        const nx = ix + dx, nz = iz + dz;
        if (L.inb ? L.inb(nx, nz) : (nx >= 0 && nz >= 0 && nx < L.W && nz < L.H)) s.add(nz * L.W + nx);
      }
    };
    const units = [].concat(g.ops || [], g.enemies || [], g.civs || []);
    for (let i = 0; i < units.length; i++) if (units[i] && units[i].x != null) add(units[i].x, units[i].z, 1);
    if (L.zones) for (const k in L.zones) for (const c of L.zones[k] || []) if (c) add(c[0], c[1], 0);
    if (L.markers) for (const k in L.markers) for (const c of L.markers[k] || []) if (c) add(c[0], c[1], 0);
    return s;
  }
  function hideShell(scene, L) {
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || !o.geometry) return;
      const nm = o.name || '';
      if (nm === 'zstage' || nm === 'zmove' || nm.indexOf('b3') === 0) return;
      let p = o.parent, actor = false;
      while (p) {
        if (p.isSkinnedMesh || p.name === 'zstage' || p.name === 'zact') return;
        if (p.children && p.children.some((c) => c.isSkinnedMesh)) actor = true;
        p = p.parent;
      }
      if (actor) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      if (!bb) return;
      const fw = (bb.max.x - bb.min.x) * Math.abs(o.scale.x || 1);
      const fd = (bb.max.z - bb.min.z) * Math.abs(o.scale.z || 1);
      const fh = (bb.max.y - bb.min.y) * Math.abs(o.scale.y || 1);
      if (fh < 0.6 || fh > 8) return;
      if (Math.max(fw, fd) < 8 || Math.max(fw, fd) > 80) return;
      const x0 = bb.min.x, x1 = bb.max.x, z0 = bb.min.z, z1 = bb.max.z;
      if (x1 < 1 || x0 > L.W - 1 || z1 < 1 || z0 > L.H - 1) return;
      o.visible = false;
    });
  }
  function recomputeRooms(L) {
    if (!L.room) return 0;
    const W = L.W, H = L.H, N = W * H;
    for (let i = 0; i < N; i++) L.room[i] = (L.ext && L.ext[i]) ? 0 : -1;
    let rid = 1;
    for (let i = 0; i < N; i++) {
      if (L.room[i] !== -1) continue;
      const t = L.type[i];
      if (t === 1 || t === 2 || t === 5) continue;
      const q = [i];
      L.room[i] = rid;
      while (q.length) {
        const c = q.pop();
        const x = c % W, y = (c / W) | 0;
        const nxt = [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, y > 0 ? c - W : -1, y < H - 1 ? c + W : -1];
        for (let k = 0; k < nxt.length; k++) {
          const n = nxt[k];
          if (n < 0 || L.room[n] !== -1) continue;
          const tt = L.type[n];
          if (tt === 1 || tt === 2 || tt === 5) continue;
          L.room[n] = rid;
          q.push(n);
        }
      }
      rid++;
    }
    for (const d of L.doors || []) if (d.sides) d.rooms = d.sides.map(([x, y]) => (y >= 0 && x >= 0 && y < H && x < W) ? L.room[y * W + x] : -1);
    return rid - 1;
  }
  function punch(L, g, added) {
    const W = L.W, H = L.H, N = W * H;
    const pass = (i) => { const t = L.type[i]; return t === 0 || t === 5; };
    const reach = (from) => {
      const seen = new Uint8Array(N);
      const q = [from];
      seen[from] = 1;
      while (q.length) {
        const c = q.pop();
        const x = c % W, y = (c / W) | 0;
        const nxt = [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, y > 0 ? c - W : -1, y < H - 1 ? c + W : -1];
        for (let k = 0; k < nxt.length; k++) {
          const n = nxt[k];
          if (n < 0 || seen[n] || !pass(n)) continue;
          seen[n] = 1;
          q.push(n);
        }
      }
      return seen;
    };
    const seeds = [];
    const units = [].concat(g.ops || [], g.enemies || [], g.civs || []);
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (!u || u.x == null) continue;
      const x = Math.floor(u.x), y = Math.floor(u.z);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const id = y * W + x;
      if (pass(id)) seeds.push(id);
    }
    if (!seeds.length) return;
    let seen = reach(seeds[0]);
    for (let s = 1; s < seeds.length; s++) {
      const goal = seeds[s];
      if (seen[goal]) continue;
      const prev = new Int32Array(N);
      prev.fill(-1);
      const q = [goal];
      prev[goal] = goal;
      let hit = -1;
      while (q.length && hit < 0) {
        const c = q.shift();
        const x = c % W, y = (c / W) | 0;
        const nxt = [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, y > 0 ? c - W : -1, y < H - 1 ? c + W : -1];
        for (let k = 0; k < nxt.length; k++) {
          const n = nxt[k];
          if (n < 0 || prev[n] !== -1) continue;
          if (!(pass(n) || added.has(n))) continue;
          prev[n] = c;
          if (seen[n]) { hit = n; break; }
          q.push(n);
        }
      }
      if (hit >= 0) {
        let c = hit;
        let guard = 0;
        while (c !== goal && c >= 0 && guard++ < N) {
          if (added.has(c)) { L.type[c] = 0; added.delete(c); }
          c = prev[c];
        }
        seen = reach(seeds[0]);
      }
    }
  }

  function reshape(g, stage) {
    const L = g.level;
    const scene = g.env && g.env.scene;
    if (!L || !L.type || !scene || L.__zuluShaped) return;
    const bits = bitsOf(scene);
    if (!bits) return;
    const label = stage && stage.label;
    const recipe = stage && stage.recipe;
    const shape = shapeFor(label, recipe, stage && stage.scenery);
    const enclosed = shape === 'lot' || shape === 'hall' || shape === 'offices' || shape === 'rooms' || shape === 'corridor' || shape === 'single' || shape === 'lanes' || shape === 'stalls' || shape === 'rows';
    const W = L.W, H = L.H;
    const old = scene.getObjectByName('zstage');
    if (old) scene.remove(old);
    hideShell(scene, L);
    const occ = occupied(g, L);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const t = L.type[i];
      if ((t === 1 || t === 2) && !touchesOut(L, x, y)) L.type[i] = 0;
      else if ((t === 3 || t === 4) && !(L.ext && L.ext[i])) L.type[i] = 0;
    }
    const kept = [];
    if (L.doorAt && L.doorAt.clear) L.doorAt.clear();
    for (const d of L.doors || []) {
      const sides = d.sides || [];
      const ext = sides.some(([x, y]) => x < 0 || y < 0 || x >= W || y >= H || (L.ext && L.ext[y * W + x]));
      if (enclosed && ext) {
        kept.push(d);
        if (L.doorAt) L.doorAt.set(d.i, d);
        if (d.mesh) d.mesh.traverse((o) => { o.visible = true; });
      } else {
        L.type[d.i] = 0;
        d.state = 'open';
        if (d.mesh) d.mesh.visible = false;
      }
    }
    L.doors = kept;
    const added = new Set();
    const tryWall = (x, y) => {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return;
      const i = y * W + x;
      if (L.ext && L.ext[i]) return;
      if (L.type[i] !== 0) return;
      if (occ.has(i) || touchesOut(L, x, y)) return;
      L.type[i] = 1;
      added.add(i);
    };
    let minx = W, maxx = 0, minz = H, maxz = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (L.ext && L.ext[i]) continue;
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < minz) minz = y;
      if (y > maxz) maxz = y;
    }
    if (maxx <= minx) { minx = 2; maxx = W - 3; minz = 2; maxz = H - 3; }
    if (shape === 'lot') {
      for (let y = minz + 3; y < maxz - 2; y += 7) for (let x = minx + 3; x < maxx - 2; x += 8) tryWall(x, y);
    } else if (shape === 'offices' || shape === 'rooms') {
      const sx = shape === 'rooms' ? 10 : 8;
      const sz = shape === 'rooms' ? 8 : 6;
      for (let x = minx + sx - 2; x < maxx - 2; x += sx) for (let y = minz + 1; y < maxz; y++) if ((y - minz) % sz !== 3) tryWall(x, y);
      for (let y = minz + sz - 1; y < maxz - 2; y += sz) for (let x = minx + 1; x < maxx; x++) if ((x - minx) % sx !== 4) tryWall(x, y);
    } else if (shape === 'corridor') {
      const mid = ((minz + maxz) / 2) | 0;
      for (let y = minz + 1; y < maxz; y++) {
        if (Math.abs(y - mid) !== 2) continue;
        for (let x = minx + 1; x < maxx; x++) if (x % 6 !== 0) tryWall(x, y);
      }
    } else if (shape === 'lanes') {
      for (let x = minx + 4; x < maxx - 1; x += 5) for (let y = minz + 3; y < maxz - 3; y++) tryWall(x, y);
    } else if (shape === 'stalls') {
      const mid = ((minz + maxz) / 2) | 0;
      for (let x = minx + 3; x < maxx; x += 4) for (let y = minz + 1; y < maxz; y++) if (Math.abs(y - mid) > 1 && y % 5 !== 0) tryWall(x, y);
    }
    punch(L, g, added);
    const roomCount = recomputeRooms(L);
    const group = empty(bits);
    group.name = 'zstage';
    const slab = flat(bits, Math.max(4, maxx - minx + 1), 0.08, Math.max(4, maxz - minz + 1), FLOORC[shape] || 0x666666);
    drop(slab, (minx + maxx) / 2 + 0.5, (minz + maxz) / 2 + 0.5, 0);
    group.add(slab);
    let walls = 0;
    const wh = (x, y) => (enclosed ? 2.55 : (touchesOut(L, x, y) ? 1.05 : 2.55));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (L.type[i] !== 1 && L.type[i] !== 2) continue;
      const h = L.type[i] === 2 ? 0.9 : wh(x, y);
      const wall = flat(bits, 0.92, h, 0.92, WALLC[shape] || 0xc8c2b4);
      drop(wall, x + 0.5, y + 0.5, 0);
      group.add(wall);
      if (!touchesOut(L, x, y)) walls++;
    }
    const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && L.type[y * W + x] === 0 && !occ.has(y * W + x);
    let cars = 0;
    let placed = 0;
    const ops = (g.ops || []).filter((o) => o && o.alive);
    if (ops.length) {
      const ox = ops.reduce((s, o) => s + o.x, 0) / ops.length;
      const oz = ops.reduce((s, o) => s + o.z, 0) / ops.length;
      const cx = (minx + maxx) / 2 + 0.5, cz = (minz + maxz) / 2 + 0.5;
      const dx = cx - ox, dz = cz - oz, len = Math.hypot(dx, dz) || 1;
      const fx = dx / len, fz = dz / len;
      const kinds = kindsFor(shape, recipe);
      if (shape !== 'lot') for (let i = 0; i < Math.min(5, kinds.length + 1); i++) {
        const dist = 3.2 + i * 2.4;
        const side = (i % 2 ? 1 : -1) * 1.6;
        const x = ox + fx * dist + (-fz) * side;
        const y = oz + fz * dist + fx * side;
        if (!open(Math.floor(x), Math.floor(y))) continue;
        const kind = kinds[i % kinds.length];
        const p = prop(bits, kind, i + 3);
        drop(p, x, y, Math.atan2(fx, fz));
        group.add(p);
        if (kind === 'car' || kind === 'van') cars++;
        placed++;
      }
    }
    if (shape === 'lot') {
      for (let y = minz + 3; y < maxz - 3; y += 7) {
        const line = prop(bits, 'line', 0);
        drop(line, (minx + maxx) / 2 + 0.5, y + 3.4, Math.PI / 2);
        line.scale.z *= Math.max(3, (maxx - minx) / 2.6);
        group.add(line);
        for (let x = minx + 2; x < maxx - 4; x += 6) {
          if (!open(x, y) || !open(x + 2, y)) continue;
          const car = prop(bits, (cars % 6 === 0) ? 'van' : 'car', cars);
          drop(car, x + 1.6, y + 0.8, 0);
          group.add(car);
          cars++;
          placed++;
        }
      }
      const ramp = flat(bits, 6.5, 0.28, 3.2, 0x6e6a62);
      ramp.rotation.x = -0.28;
      const holder = empty(bits);
      holder.add(ramp);
      holder.userData.kind = 'ramp';
      drop(holder, maxx - 3, minz + 2, 0);
      group.add(holder);
    } else {
      const kinds = kindsFor(shape, recipe);
      const step = shape === 'rows' ? 4 : shape === 'offices' ? 4 : 5;
      let n = 0;
      for (let y = minz + 2; y < maxz - 1; y += step) for (let x = minx + 2; x < maxx - 1; x += step) {
        if (!open(x, y)) continue;
        const kind = kinds[n % kinds.length];
        const p = prop(bits, kind, n);
        drop(p, x + 0.5, y + 0.5, (n % 2) ? Math.PI / 2 : 0);
        group.add(p);
        if (kind === 'car' || kind === 'van') cars++;
        placed++;
        n++;
      }
    }
    if (shape === 'hall' || shape === 'single') {
      const desk = prop(bits, 'desk', 0);
      drop(desk, (minx + maxx) / 2 + 0.5, (minz + maxz) / 2 + 0.5, 0);
      group.add(desk);
      const sofa = prop(bits, shape === 'hall' ? 'sofa' : 'chair', 1);
      drop(sofa, (minx + maxx) / 2 + 0.5, (minz + maxz) / 2 + 3.4, 0);
      group.add(sofa);
      placed += 2;
    }
    scene.add(group);
    L.__zuluShaped = true;
    if (stage) {
      stage.shape = shape;
      stage.cars = cars;
      stage.interiorWalls = walls;
      stage.rooms = roomCount;
      stage.placed = placed;
      stage.enclosed = enclosed;
    }
    const cam = g.env.cam;
    if (cam) {
      cam.pitch = 0.58;
      cam.dist = 22;
    }
    g.zuluLayout = stage;
  }

  function nearestFloor(L, x, z) {
    const W = L.W, H = L.H;
    const ix = Math.max(0, Math.min(W - 1, Math.floor(x)));
    const iz = Math.max(0, Math.min(H - 1, Math.floor(z)));
    if (L.type[iz * W + ix] === 0) return { x: ix + 0.5, z: iz + 0.5 };
    for (let r = 1; r < 14; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const nx = ix + dx, nz = iz + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      if (L.type[nz * W + nx] === 0) return { x: nx + 0.5, z: nz + 0.5 };
    }
    return { x: ix + 0.5, z: iz + 0.5 };
  }
  const Act = {
    on: false, g: null, phase: '', t: 0, saved: [], routes: {}, door: null, stairs: null, doorAng: 0,
    start(g) {
      if (!g || !g.ops) return;
      this.stop();
      this.g = g;
      this.on = true;
      this.t = 0;
      this.phase = '';
      this.saved = g.ops.filter((o) => o.alive).map((o) => ({ o, x: o.x, z: o.z, ang: o.ang }));
      const self = this;
      g.step = function (dt) { try { self.tick(dt); } catch (e) { window.__actErr = String(e && e.stack || e); } };
      if (!g.__syncCut) {
        g.__syncCut = g.syncMeshes.bind(g);
        g.syncMeshes = function (rdt) {
          g.__syncCut(rdt);
          for (const o of g.ops || []) if (o.ch && o.ch.root && o.__cutY) o.ch.root.position.y = o.__cutY;
          if (self.door) self.door.rotation.y = self.doorAng || 0;
        };
      }
      this.layout(g);
      this.pieces(g);
      if (g.setPaused) g.setPaused(false);
    },
    layout(g) {
      const L = g.level;
      const ops = this.saved.map((s) => s.o);
      let minz = L.H, maxz = 0, minx = L.W, maxx = 0, n = 0;
      for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
        if (L.type[y * L.W + x] !== 0) continue;
        if (L.ext && L.ext[y * L.W + x]) continue;
        if (y < minz) minz = y;
        if (y > maxz) maxz = y;
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        n++;
      }
      if (!n) { minx = 2; maxx = L.W - 3; minz = 2; maxz = L.H - 3; }
      const cx = (minx + maxx) / 2, cz = (minz + maxz) / 2;
      const count = ops.length || 1;
      const fan = (x, z, along) => ops.map((_, i) => nearestFloor(L, x + (along ? (i - (count - 1) / 2) * 0.95 : 0), z + (along ? 0 : (i - (count - 1) / 2) * 0.8)));
      const south = fan(cx, minz + 1.2, true);
      const mid = fan(cx, cz - 1, true);
      const file = fan(cx + 0.4, cz, false);
      const through = fan(cx + 0.4, cz + 4, false);
      const up = fan(cx - 1, cz + 3, false);
      this.routes = {
        deploy: ops.map((_, i) => [south[i], mid[i]]),
        enter: ops.map((_, i) => [south[i], mid[i]]),
        stack: ops.map((_, i) => [mid[i], file[i]]),
        stairs: ops.map((_, i) => [file[i] || mid[i], up[i]]),
        breach: ops.map((_, i) => [file[i] || mid[i], through[i]])
      };
      this.spot = { stairs: up[0], door: file[0] || mid[0] };
    },
    pieces(g) {
      const scene = g.env.scene;
      const bits = bitsOf(scene);
      if (!bits) return;
      let group = scene.getObjectByName('zact');
      if (!group) { group = empty(bits); group.name = 'zact'; scene.add(group); }
      while (group.children && group.children.length) group.remove(group.children[0]);
      const stairs = empty(bits);
      for (let i = 0; i < 6; i++) {
        const step = flat(bits, 2.2, 0.18, 0.55, 0xc8c2b4);
        step.position.set(0, i * 0.18, i * 0.5);
        stairs.add(step);
      }
      stairs.userData.kind = 'stairs';
      if (this.spot && this.spot.stairs) drop(stairs, this.spot.stairs.x, this.spot.stairs.z, 0);
      stairs.visible = false;
      group.add(stairs);
      this.stairs = stairs;
      const door = flat(bits, 0.12, 2.2, 1.1, 0x6b4a2e);
      door.userData.kind = 'door';
      if (this.spot && this.spot.door) drop(door, this.spot.door.x + 0.8, this.spot.door.z, 0);
      door.visible = false;
      group.add(door);
      this.door = door;
    },
    setPhase(name) {
      this.phase = name || 'deploy';
      this.t = 0;
      if (this.stairs) this.stairs.visible = this.phase === 'stairs';
      if (this.door) this.door.visible = this.phase === 'stack' || this.phase === 'breach';
      const route = this.routes && this.routes[this.phase];
      if (route) this.saved.forEach((s, i) => {
        const a = route[i] && route[i][0];
        if (!a) return;
        s.o.x = a.x; s.o.z = a.z;
      });
    },
    tick(dt) {
      if (!this.on || !this.g) return;
      this.t += dt;
      const dur = this.phase === 'breach' ? 3.2 : 2.8;
      const u = Math.min(1, this.t / Math.max(0.2, dur));
      const route = (this.routes && this.routes[this.phase]) || this.routes.deploy;
      this.saved.forEach((s, i) => {
        const seg = route && route[i];
        if (!seg) return;
        const a = seg[0], b = seg[1];
        s.o.x = a.x + (b.x - a.x) * u;
        s.o.z = a.z + (b.z - a.z) * u;
        const dx = b.x - a.x, dz = b.z - a.z;
        if (Math.hypot(dx, dz) > 0.05) s.o.ang = Math.atan2(dx, dz);
        s.o.moving = u < 0.98;
        s.o.mv = 'sprint';
        s.o.__cutY = this.phase === 'stairs' ? Math.sin(u * Math.PI) * 1.15 : 0;
      });
      this.doorAng = (this.phase === 'breach' && u > 0.25) ? Math.min(1.5, (u - 0.25) * 2.2) : 0;
      const cam = this.g.env && this.g.env.cam;
      const ops = this.saved;
      if (cam && ops.length) {
        const x = ops.reduce((sum, s) => sum + s.o.x, 0) / ops.length;
        const z = ops.reduce((sum, s) => sum + s.o.z, 0) / ops.length;
        cam.target.set(x, 0.4, z);
        cam.dist = 11;
        cam.pitch = 0.62;
      }
    },
    stop() {
      if (!this.on && !this.saved.length) return;
      for (const s of this.saved) {
        s.o.x = s.x; s.o.z = s.z; s.o.ang = s.ang; s.o.__cutY = 0; s.o.moving = false;
      }
      if (this.door) this.door.visible = false;
      if (this.stairs) this.stairs.visible = false;
      const g = this.g;
      if (g && g.step) delete g.step;
      if (g && g.setPaused) g.setPaused(true);
      this.on = false;
      this.saved = [];
      this.phase = '';
    }
  };

  function watchCuts() {
    const root = document.querySelector('.zcut.live');
    const g = window.__game;
    if (!root || !g || !g.ops) { if (Act.on) Act.stop(); return; }
    if (!Act.on || Act.g !== g) Act.start(g);
    const act = root.dataset.act || 'deploy';
    if (act !== Act.phase) Act.setPhase(act);
  }

  function stageLine(mission, n, label, info) {
    const map = mission && mission.map;
    const lines = STAGE_LORE[map];
    const why = lines && lines[n - 1];
    if (!why) return label + '. ' + ((info && info.name) || '');
    return label + '. ' + why;
  }
  function stageAudio(mission, n) {
    const map = (mission && mission.map) || 'stage';
    return 'audio/cuts/stage/s-' + map + '-' + n + '.mp3';
  }

  function squadOf(app) {
    const save = app.save || {};
    const ids = Object.keys(save.rosters || {});
    const unit = save.unit && save.rosters[save.unit] ? save.unit : ids[0];
    let list = ((save.rosters || {})[unit] || []).filter((o) => o && o.team >= 0);
    if (!list.length) {
      for (let i = 0; i < ids.length && !list.length; i++) list = (save.rosters[ids[i]] || []).filter((o) => o && o.team >= 0);
    }
    if (!list.length) list = ((save.rosters || {})[unit] || []).slice(0, 8);
    return list;
  }
  function watchIntro(app) {
    const missions = (window.__zulu && window.__zulu.MISSIONS) || [];
    const m = missions.find((x) => x.map === 'killhouse') || missions.find((x) => x.map === 'embassy') || missions[0];
    const squad = squadOf(app);
    if (!m || !squad.length || !app.startMission) {
      if (app.toast) app.toast('Pick a squad first, then watch the intro.');
      return;
    }
    app.__forceLore = true;
    app.__watchOnly = true;
    if (app.menus && app.menus.root) app.menus.root.classList.remove('see');
    app.startMission(m, squad, { 0: 1, 1: 1, 2: 1 });
  }
  function replay(kind) {
    const app = window.__app;
    const cut = window.__zuluCut;
    const flow = app && app.__stageFlow;
    if (!cut || !flow) return;
    const menu = document.querySelector('.pausemenu');
    if (menu) menu.classList.add('hidden');
    const cards = kind === 'lore' ? cut.lore : kind === 'mission' ? cut.mission(flow.mission) : cut.stage(flow.mission, flow.n);
    cut.play(cards);
  }

  function boot() {
    const app = window.__app;
    if (!app || !app.menus || app.__batch7) return;
    app.__batch7 = true;
    if (!document.getElementById('batch7css')) {
      const st = document.createElement('style');
      st.id = 'batch7css';
      st.textContent = '.zreplay{display:block;width:100%;text-align:left;margin-top:4px}';
      document.head.append(st);
    }
    const menus = app.menus;
    const placeWatch = () => {
      const col = (menus.root && menus.root.querySelector('.mm-col')) || document.querySelector('.mm-col');
      if (!col || col.querySelector('.zwatch')) return !!col;
      const b = menus.btn('Watch intro', 'big zwatch', () => watchIntro(app));
      const tut = col.querySelector('.tutb');
      if (tut) tut.after(b); else col.append(b);
      return true;
    };
    const main = menus.main.bind(menus);
    menus.main = function () {
      const r = main.apply(menus, arguments);
      placeWatch();
      return r;
    };
    placeWatch();
    setInterval(placeWatch, 400);
    const settings = menus.settings.bind(menus);
    menus.settings = function () {
      const r = settings.apply(menus, arguments);
      const body = document.querySelector('#menu .scr-body') || document.querySelector('#menu .screen');
      if (body && !body.querySelector('.zwatch-set')) {
        const b = document.createElement('button');
        b.className = 'pm-row zwatch-set';
        b.textContent = 'Watch opening intro';
        b.onclick = () => watchIntro(app);
        body.insertBefore(b, body.firstChild);
      }
      return r;
    };
    if (!window.__zuluReplayObs) {
      window.__zuluReplayObs = new MutationObserver(() => {
        const menu = document.querySelector('.pausemenu');
        if (!menu || menu.classList.contains('hidden') || menu.querySelector('.zreplay')) return;
        const add = (text, kind) => {
          const b = document.createElement('button');
          b.className = 'pm-row zreplay';
          b.textContent = text;
          b.onclick = () => replay(kind);
          menu.append(b);
        };
        add('Watch opening intro', 'lore');
        add('Replay mission intro', 'mission');
        add('Replay stage intro', 'stage');
      });
      window.__zuluReplayObs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    }
  }

  window.__zuluReshape = reshape;
  window.__zuluStageLine = stageLine;
  window.__zuluStageAudio = stageAudio;
  window.__zuluAct = Act;
  window.__zuluLore = STAGE_LORE;
  if (!window.__zuluCutObs) {
    window.__zuluCutObs = new MutationObserver(() => watchCuts());
    window.__zuluCutObs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-act', 'class'] });
  }
  const wait = setInterval(() => { if (window.__app && window.__app.menus) { clearInterval(wait); boot(); } }, 40);
})();
