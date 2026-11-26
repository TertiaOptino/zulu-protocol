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

  function kitOf(scene) {
    const all = [];
    let Mesh = null;
    scene.traverse((o) => {
      if (!Mesh && o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh) Mesh = o.constructor;
      if (!o.isInstancedMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      all.push({ mesh: o, sx: b.max.x - b.min.x, sy: b.max.y - b.min.y, sz: b.max.z - b.min.z, minY: b.min.y });
    });
    const car = all.find((o) => o.sx > 3.8 && o.sx < 4.5 && o.sz > 1.45 && o.sz < 2.05 && o.sy > 0.95 && o.sy < 1.9);
    const van = all.find((o) => o.sx > 4.5 && o.sx < 5.5 && o.sy > 1.45 && o.sy < 2.4);
    const pillar = all.find((o) => o.sy > 2.35 && o.sy < 2.85 && o.sx < 0.85 && o.sz < 0.85);
    const container = all.find((o) => o.sy > 2.3 && o.sy < 2.9 && o.sx > 0.85 && o.sx < 1.35 && o.sz > 0.85 && o.sz < 1.35);
    const desk = all.find((o) => o.sx > 0.8 && o.sx < 1.2 && o.sy > 0.9 && o.sy < 1.4 && o.sz > 0.45 && o.sz < 0.9);
    const plant = all.find((o) => o.sy > 0.95 && o.sy < 1.9 && o.sx > 0.45 && o.sx < 1.0 && o.sz > 0.45 && o.sz < 1.0 && o !== pillar && o !== desk);
    const box = pillar || container || all.find((o) => o.sy > 0.6 && o.sx > 0.4 && o.sz > 0.4);
    return { car, van, pillar, container, desk, plant, box, Mesh, all };
  }
  function solid(kit, w, h, d, color) {
    const src = kit.box;
    const mat = src.mesh.material.clone();
    mat.vertexColors = false;
    if (mat.color && mat.color.setHex) mat.color.setHex(color);
    const m = new kit.Mesh(src.mesh.geometry, mat);
    m.scale.set(w / src.sx, h / src.sy, d / src.sz);
    m.position.y = -src.minY * (h / src.sy);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function vehicle(entry, colorHex, x, y, z, yaw) {
    const src = entry.mesh;
    const im = new src.constructor(src.geometry, src.material, 1);
    if (colorHex != null && im.setColorAt && src.material && src.material.color && src.material.color.clone) {
      const c = src.material.color.clone();
      c.setHex(colorHex);
      im.setColorAt(0, c);
    }
    const pos = src.position.clone();
    pos.set(x, y - entry.minY, z);
    const euler = src.rotation.clone();
    euler.set(0, yaw || 0, 0);
    const q = src.quaternion.clone();
    q.setFromEuler(euler);
    const sc = src.scale.clone();
    sc.set(1, 1, 1);
    const M = src.matrix.clone();
    M.compose(pos, q, sc);
    im.position.set(0, 0, 0);
    im.setMatrixAt(0, M);
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
    im.castShadow = true;
    im.receiveShadow = true;
    return im;
  }
  function reshape(g, stage) {
    const L = g.level;
    const scene = g.env && g.env.scene;
    armBreachCam();
    armHostage();
    if (!L || !L.type || !scene || L.__zuluShaped) return;
    const bits = bitsOf(scene);
    if (!bits) return;
    const label = stage && stage.label;
    const recipe = stage && stage.recipe;
    const shape = shapeFor(label, recipe, stage && stage.scenery);
    if (shape !== 'lot') return;
    const enclosed = true;
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
    const kit = kitOf(scene);
    g.__kit = kit;
    window.__kitInfo = {
      car: !!(kit.car), van: !!(kit.van), pillar: !!(kit.pillar), desk: !!(kit.desk), plant: !!(kit.plant),
      box: kit.box ? [+kit.box.sx.toFixed(2), +kit.box.sy.toFixed(2), +kit.box.sz.toFixed(2)] : null,
      n: kit.all.length
    };
    const group = empty(bits);
    group.name = 'zstage';
    const canSolid = kit.box && kit.Mesh;
    if (canSolid) {
      const slab = solid(kit, Math.max(4, maxx - minx + 1), 0.06, Math.max(4, maxz - minz + 1), FLOORC[shape] || 0x666666);
      slab.position.set((minx + maxx) / 2 + 0.5, 0.02, (minz + maxz) / 2 + 0.5);
      group.add(slab);
    }
    let walls = 0;
    const wh = (x, y) => (enclosed ? 2.55 : (touchesOut(L, x, y) ? 1.15 : 2.55));
    if (canSolid) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (L.type[i] !== 1 && L.type[i] !== 2) continue;
      const h = L.type[i] === 2 ? 2.2 : wh(x, y);
      const wall = solid(kit, 0.92, h, 0.92, WALLC[shape] || 0xc8c2b4);
      wall.position.set(x + 0.5, 0, y + 0.5);
      group.add(wall);
      if (!touchesOut(L, x, y)) walls++;
    }
    const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && L.type[y * W + x] === 0 && !occ.has(y * W + x);
    let cars = 0;
    let placed = 0;
    const colors = [0xf4f4f4, 0xe53935, 0x1e88e5, 0x263238, 0xfdd835, 0x43a047, 0xfb8c00, 0x8e24aa];
    const addObj = (obj, kind) => { if (!obj) return; obj.userData.kind = kind; group.add(obj); placed++; };
    const furn = (kind, x, z, yaw) => {
      yaw = yaw || 0;
      if (kind === 'desk' && kit.desk) { addObj(vehicle(kit.desk, null, x, 0, z, yaw), 'desk'); return; }
      if (kind === 'plant' && kit.plant) { addObj(vehicle(kit.plant, null, x, 0, z, yaw), 'plant'); return; }
      if ((kind === 'container' || kind === 'crate') && kit.container && kind === 'container') { addObj(vehicle(kit.container, colors[placed % colors.length], x, 0, z, yaw), 'container'); return; }
      if (!canSolid) return;
      const root = empty(bits);
      const put = (mesh, px, py, pz) => { mesh.position.x += px; mesh.position.z += pz; mesh.position.y += py; root.add(mesh); };
      if (kind === 'sofa') {
        put(solid(kit, 2.2, 0.48, 0.9, 0x7a2424), 0, 0, 0);
        put(solid(kit, 2.2, 0.75, 0.18, 0x5c1818), 0, 0.48, -0.36);
        put(solid(kit, 0.18, 0.7, 0.9, 0x5c1818), -1.05, 0.2, 0);
        put(solid(kit, 0.18, 0.7, 0.9, 0x5c1818), 1.05, 0.2, 0);
      } else if (kind === 'chair') {
        put(solid(kit, 0.52, 0.1, 0.52, 0x243044), 0, 0.46, 0);
        put(solid(kit, 0.52, 0.62, 0.1, 0x243044), 0, 0.56, -0.22);
        put(solid(kit, 0.08, 0.46, 0.08, 0x1a1c22), -0.2, 0, -0.2);
        put(solid(kit, 0.08, 0.46, 0.08, 0x1a1c22), 0.2, 0, -0.2);
        put(solid(kit, 0.08, 0.46, 0.08, 0x1a1c22), -0.2, 0, 0.2);
        put(solid(kit, 0.08, 0.46, 0.08, 0x1a1c22), 0.2, 0, 0.2);
      } else if (kind === 'desk') {
        put(solid(kit, 1.7, 0.08, 0.75, 0x6b4228), 0, 0.76, 0);
        put(solid(kit, 0.08, 0.76, 0.08, 0x3a2a1c), -0.75, 0, -0.3);
        put(solid(kit, 0.08, 0.76, 0.08, 0x3a2a1c), 0.75, 0, -0.3);
        put(solid(kit, 0.08, 0.76, 0.08, 0x3a2a1c), -0.75, 0, 0.3);
        put(solid(kit, 0.08, 0.76, 0.08, 0x3a2a1c), 0.75, 0, 0.3);
        put(solid(kit, 0.55, 0.4, 0.05, 0x141820), 0.25, 0.96, -0.05);
      } else if (kind === 'plant') {
        put(solid(kit, 0.4, 0.35, 0.4, 0x6b4e3a), 0, 0, 0);
        put(solid(kit, 0.85, 1.1, 0.85, 0x2c6a34), 0, 0.55, 0);
      } else if (kind === 'bed') {
        put(solid(kit, 1.3, 0.45, 2.05, 0xe4e0d8), 0, 0, 0);
        put(solid(kit, 1.2, 0.22, 0.42, 0xf4f1ea), 0, 0.45, -0.75);
      } else if (kind === 'container') {
        put(solid(kit, 2.4, 2.5, 1.1, colors[placed % colors.length]), 0, 0, 0);
      } else if (kind === 'barrier' || kind === 'sandbag') {
        put(solid(kit, 1.5, 0.85, 0.4, kind === 'sandbag' ? 0x6e6848 : 0xd5d7da), 0, 0, 0);
      } else if (kind === 'barrel') {
        put(solid(kit, 0.55, 0.9, 0.55, 0x2f4a38), 0, 0, 0);
      } else {
        put(solid(kit, 0.85, 0.7, 0.85, 0x8a6238), 0, 0, 0);
      }
      root.position.set(x, 0, z);
      root.rotation.y = yaw;
      addObj(root, kind);
    };
    if (shape === 'lot' && canSolid) {
      const floorAt = (x, z) => {
        const ix = Math.floor(x), iz = Math.floor(z);
        if (ix < 2 || iz < 2 || ix >= W - 2 || iz >= H - 2) return false;
        return L.type[iz * W + ix] === 0;
      };
      let n = 0;
      for (let z = minz + 2; z < maxz - 2; z += 3.6) {
        if (canSolid) {
          const line = solid(kit, Math.max(6, maxx - minx - 2), 0.045, 0.1, 0xf4f1e8);
          line.position.set((minx + maxx) / 2 + 0.5, 0.08, z + 1.5);
          group.add(line);
        }
        for (let x = minx + 2; x < maxx - 4; x += 4.6) {
          if (!floorAt(x + 1.5, z + 0.6)) continue;
          const car = showCar(kit, bits, colors[n % colors.length], x + 1.8, z + 0.6, Math.PI / 2);
          group.add(car);
          cars++;
          placed++;
          n++;
        }
      }
      if (canSolid) for (let i = 0; i < 6; i++) {
        const step = solid(kit, 3.4, 0.32, 1.15, 0x8d8880);
        step.position.set(maxx - 2.4, i * 0.32, minz + 1.6 + i * 1.15);
        step.userData.kind = 'ramp';
        group.add(step);
      }
    } else {
      const kinds = kindsFor(shape, recipe).filter((k) => k !== 'car' && k !== 'van' && k !== 'line' && k !== 'pillar');
      const step = shape === 'rows' ? 5 : shape === 'offices' ? 5 : 6;
      const cx = (minx + maxx) / 2 + 0.5, cz = (minz + maxz) / 2 + 0.5;
      if (shape === 'hall' || shape === 'single' || shape === 'offices') {
        furn('desk', cx, cz, 0);
        furn(shape === 'offices' ? 'chair' : 'sofa', cx, cz + 2.2, 0);
        furn('plant', cx + 2.4, cz - 1.2, 0);
        if (shape === 'offices') furn('chair', cx + 1.2, cz + 1.1, 0.4);
      }
      let n = 0;
      for (let z = minz + 3; z < maxz - 2; z += step) for (let x = minx + 3; x < maxx - 2; x += step) {
        if (!open(x, z)) continue;
        if (Math.hypot(x - cx, z - cz) < 3) continue;
        furn(kinds[n % kinds.length] || 'crate', x + 0.5, z + 0.5, (n % 2) ? 1.2 : 0);
        n++;
      }
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
      cam.pitch = 0.72;
      cam.dist = 30;
    }
    g.zuluLayout = stage;
    try { wearMasks(g); armGas(g); } catch (err) { window.__maskErr = String(err && err.stack || err); }
  }
  function wearMasks(g) {
    const kit = g.__kit;
    if (!kit || !kit.box || !kit.Mesh || !window.__app || !window.__app.save || !window.__app.save.gasMask) return;
    for (const op of g.ops || []) {
      const head = op.ch && op.ch.B && op.ch.B.head;
      if (!head || head.getObjectByName('zmask')) continue;
      op.gasMask = true;
      const face = solid(kit, 0.2, 0.13, 0.07, 0x1a221c);
      face.name = 'zmask';
      face.position.set(0, 0.01, 0.12);
      const l1 = solid(kit, 0.055, 0.04, 0.025, 0x9fd4ea);
      l1.position.set(-0.045, 0.03, 0.16);
      const l2 = solid(kit, 0.055, 0.04, 0.025, 0x9fd4ea);
      l2.position.set(0.045, 0.03, 0.16);
      const can = solid(kit, 0.07, 0.12, 0.055, 0x2c3333);
      can.position.set(0.13, -0.02, 0.05);
      head.add(face, l1, l2, can);
    }
  }
  function armGas(g) {
    if (!g.detonate || g.__gasWrap) return;
    g.__gasWrap = true;
    const det = g.detonate.bind(g);
    g.detonate = function (unit, kind, x, z) {
      const saved = (this.ops || []).filter((o) => o.gasMask && o.alive).map((o) => [o, o.stun || 0]);
      const ret = det(unit, kind, x, z);
      if (kind === 'cs') for (let i = 0; i < saved.length; i++) saved[i][0].stun = saved[i][1];
      return ret;
    };
  }

  function brighten(mesh, color, glow) {
    const m = mesh && mesh.material;
    if (!m) return mesh;
    if (m.color && m.color.setHex) m.color.setHex(color);
    if (m.emissive && m.emissive.setHex) { m.emissive.setHex(color); m.emissiveIntensity = glow; }
    if (m.roughness != null) m.roughness = 0.48;
    if (m.metalness != null) m.metalness = 0.08;
    return mesh;
  }
  function glassPane(kit, w, h, d) {
    const m = solid(kit, w, h, d, 0xb9e6f5);
    const mat = m.material;
    if (mat) {
      mat.transparent = true;
      mat.opacity = 0.46;
      mat.depthWrite = false;
      if (mat.color && mat.color.setHex) mat.color.setHex(0x9fd8ea);
      if (mat.emissive && mat.emissive.setHex) { mat.emissive.setHex(0x1a4458); mat.emissiveIntensity = 0.55; }
      if (mat.roughness != null) mat.roughness = 0.06;
    }
    return m;
  }
  function tyreGeo(kit) {
    if (kit.__tyre) return kit.__tyre;
    const src = kit.box.mesh.geometry;
    const Geo = src.constructor;
    const Attr = src.attributes.position.constructor;
    const geo = new Geo();
    const segs = 18, radius = 0.34, half = 0.11;
    const pos = [], nrm = [], uv = [], idx = [];
    for (let s = 0; s < 2; s++) for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pos.push(Math.cos(a) * radius, Math.sin(a) * radius, s ? half : -half);
      nrm.push(Math.cos(a), Math.sin(a), 0);
      uv.push(i / segs, s);
    }
    const stride = segs + 1;
    for (let i = 0; i < segs; i++) idx.push(i, stride + i, i + 1, i + 1, stride + i, stride + i + 1);
    geo.setAttribute('position', new Attr(new Float32Array(pos), 3));
    geo.setAttribute('normal', new Attr(new Float32Array(nrm), 3));
    geo.setAttribute('uv', new Attr(new Float32Array(uv), 2));
    geo.setIndex(idx);
    kit.__tyre = geo;
    return geo;
  }
  function roundWheel(kit, bits) {
    const g = empty(bits);
    const mat = kit.box.mesh.material.clone();
    mat.map = null;
    mat.vertexColors = false;
    if (mat.color) mat.color.setHex(0x161616);
    if (mat.emissive) { mat.emissive.setHex(0x222222); mat.emissiveIntensity = 0.2; }
    const tyre = new kit.Mesh(tyreGeo(kit), mat);
    g.add(tyre);
    g.add(brighten(solid(kit, 0.16, 0.16, 0.2, 0xd5dbe2), 0xeef2f6, 0.5));
    return g;
  }
  function showCar(kit, bits, color, x, z, yaw) {
    const root = empty(bits);
    const put = (m, px, py, pz) => { m.position.x += px; m.position.y += py; m.position.z += pz; root.add(m); };
    const body = brighten(solid(kit, 4.05, 0.42, 1.62, color), color, 0.42);
    put(body, 0, 0.5, 0);
    const skirt = brighten(solid(kit, 3.7, 0.16, 1.72, color), color, 0.28);
    put(skirt, 0, 0.28, 0);
    const hood = brighten(solid(kit, 1.45, 0.1, 1.48, color), color, 0.48);
    hood.rotation.z = -0.38;
    put(hood, 1.15, 0.78, 0);
    const nose = brighten(solid(kit, 0.35, 0.22, 1.5, color), color, 0.4);
    put(nose, 1.95, 0.48, 0);
    const cabin = brighten(solid(kit, 1.55, 0.48, 1.42, color), color, 0.36);
    put(cabin, -0.35, 0.92, 0);
    const roof = brighten(solid(kit, 1.15, 0.08, 1.22, color), color, 0.5);
    put(roof, -0.4, 1.2, 0);
    for (const side of [0.78, -0.78]) {
      const bevel = brighten(solid(kit, 3.3, 0.08, 0.08, color), color, 0.4);
      bevel.rotation.x = Math.PI / 4;
      put(bevel, 0.1, 0.72, side);
    }
    const wind = glassPane(kit, 0.08, 0.58, 1.32);
    wind.rotation.z = 0.72;
    put(wind, 0.48, 1.08, 0);
    const rear = glassPane(kit, 0.08, 0.42, 1.2);
    rear.rotation.z = -0.55;
    put(rear, -1.15, 1.02, 0);
    put(glassPane(kit, 1.05, 0.32, 0.05), -0.35, 1.05, 0.72);
    put(glassPane(kit, 1.05, 0.32, 0.05), -0.35, 1.05, -0.72);
    for (const [wx, wz] of [[-1.25, 0.92], [1.15, 0.92], [-1.25, -0.92], [1.15, -0.92]]) {
      const well = brighten(solid(kit, 0.7, 0.28, 0.22, 0x141414), 0x1a1a1a, 0.15);
      put(well, wx, 0.34, wz > 0 ? 0.72 : -0.72);
      const wheel = roundWheel(kit, bits);
      wheel.position.set(wx, 0.34, wz);
      root.add(wheel);
    }
    for (const wz of [0.52, -0.52]) {
      const lamp = brighten(solid(kit, 0.12, 0.14, 0.3, 0xfff4c2), 0xfff6d0, 1.7);
      put(lamp, 2.08, 0.58, wz);
    }
    for (const wz of [0.55, -0.55]) {
      const tail = brighten(solid(kit, 0.1, 0.12, 0.32, 0xff2a2a), 0xff3030, 1.6);
      put(tail, -2.05, 0.58, wz);
    }
    put(brighten(solid(kit, 0.12, 0.16, 1.55, 0x2a2e32), 0x3a3e44, 0.3), 2.02, 0.36, 0);
    put(brighten(solid(kit, 0.12, 0.16, 1.55, 0x2a2e32), 0x3a3e44, 0.3), -2.02, 0.36, 0);
    for (const side of [0.82, -0.82]) {
      put(brighten(solid(kit, 1.5, 0.03, 0.03, 0x111111), 0x222222, 0.2), 0.15, 0.72, side);
      const mirror = brighten(solid(kit, 0.16, 0.08, 0.1, 0xd0d4d8), 0xe8eef2, 0.45);
      put(mirror, 0.55, 1.05, side > 0 ? 0.9 : -0.9);
    }
    root.position.set(x, 0, z);
    root.rotation.y = yaw || 0;
    root.userData.kind = 'car';
    return root;
  }
  function obstacleGrid(g) {
    const L = g.level, W = L.W, H = L.H;
    const block = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const t = L.type[i];
      if (t === 1 || t === 2 || t === 3 || t === 4) block[i] = 1;
    }
    const scene = g.env && g.env.scene;
    if (!scene) return block;
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || !o.geometry) return;
      let p = o, actor = false, skip = false;
      while (p) {
        const k = p.userData && p.userData.kind;
        if (k === 'stairs' || k === 'line' || k === 'ramp' || p.name === 'zact') skip = true;
        if (p.isSkinnedMesh || (p.children && p.children.some((c) => c.isSkinnedMesh))) actor = true;
        p = p.parent;
      }
      if (actor || skip) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox, e = o.matrixWorld.elements;
      let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, minz = 1e9, maxz = -1e9;
      for (const lx of [bb.min.x, bb.max.x]) for (const ly of [bb.min.y, bb.max.y]) for (const lz of [bb.min.z, bb.max.z]) {
        const wx = e[0] * lx + e[4] * ly + e[8] * lz + e[12];
        const wy = e[1] * lx + e[5] * ly + e[9] * lz + e[13];
        const wz = e[2] * lx + e[6] * ly + e[10] * lz + e[14];
        if (wx < minx) minx = wx; if (wx > maxx) maxx = wx;
        if (wy < miny) miny = wy; if (wy > maxy) maxy = wy;
        if (wz < minz) minz = wz; if (wz > maxz) maxz = wz;
      }
      if (maxy - miny < 0.4 || maxy - miny > 3 || maxx - minx > 6 || maxz - minz > 6) return;
      const x0 = Math.max(0, Math.floor(minx)), x1 = Math.min(W - 1, Math.floor(maxx));
      const z0 = Math.max(0, Math.floor(minz)), z1 = Math.min(H - 1, Math.floor(maxz));
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (L.type[z * W + x] === 0) block[z * W + x] = 1;
    });
    return block;
  }
  function cutRoute(L, block, x0, z0, x1, z1) {
    const W = L.W, H = L.H, N = W * H;
    const pass = (i) => i >= 0 && i < N && !block[i] && (L.type[i] === 0 || L.type[i] === 5);
    const near = (x, z) => {
      const ix = Math.max(0, Math.min(W - 1, Math.floor(x))), iz = Math.max(0, Math.min(H - 1, Math.floor(z)));
      const s = iz * W + ix;
      if (pass(s)) return s;
      for (let r = 1; r < 8; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const n = (iz + dz) * W + (ix + dx);
        if (pass(n)) return n;
      }
      return s;
    };
    const start = near(x0, z0), goal = near(x1, z1);
    const prev = new Int32Array(N);
    prev.fill(-1);
    const q = [start];
    prev[start] = start;
    let guard = 0;
    while (q.length && prev[goal] < 0 && guard++ < N) {
      const c = q.shift();
      const x = c % W, y = (c / W) | 0;
      const nxt = [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, y > 0 ? c - W : -1, y < H - 1 ? c + W : -1];
      for (let k = 0; k < nxt.length; k++) {
        const n = nxt[k];
        if (n < 0 || prev[n] >= 0 || !pass(n)) continue;
        prev[n] = c;
        q.push(n);
      }
    }
    if (prev[goal] < 0) return [{ x: x0, z: z0 }];
    const cells = [];
    let c = goal, safe = 0;
    while (c !== start && safe++ < N) { cells.push(c); c = prev[c]; }
    cells.push(start);
    cells.reverse();
    return cells.map((i) => ({ x: (i % W) + 0.5, z: ((i / W) | 0) + 0.5 }));
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
      armBreachCam();
      armHostage();
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
      this.block = obstacleGrid(g);
      const door = (L.doors || []).find((d) => !d.ext) || (L.doors || [])[0];
      let dx = L.W / 2, dz = L.H / 2;
      if (door) {
        const tries = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let k = 0; k < tries.length; k++) {
          const nx = door.x + tries[k][0], nz = door.y + tries[k][1];
          if (nx < 0 || nz < 0 || nx >= L.W || nz >= L.H) continue;
          const c = nz * L.W + nx, t = L.type[c];
          if ((t === 0 || t === 5) && !this.block[c]) { dx = nx + 0.5; dz = nz + 0.5; break; }
        }
      }
      let sx = dx, sz = dz;
      for (let z = 2; z < L.H - 8 && sx === dx; z++) for (let x = 2; x < L.W - 2; x++) {
        let ok = true;
        for (let i = 0; i < 6; i++) {
          const c = (z + i) * L.W + x;
          if (L.type[c] !== 0 || this.block[c]) ok = false;
        }
        if (ok) { sx = x + 0.5; sz = z + 0.5; break; }
      }
      const slot = (x, z, i) => nearestFloor(L, x + ((i % 3) - 1) * 0.85, z + Math.floor(i / 3) * 0.85);
      this.goals = {
        deploy: ops.map((o, i) => slot(o.x, o.z + 5, i)),
        enter: ops.map((o, i) => slot(o.x + 2, o.z + 3, i)),
        stack: ops.map((_, i) => slot(dx - 1.2, dz, i)),
        stairs: ops.map((_, i) => nearestFloor(L, sx + (i % 2) * 0.4, sz + 4.2)),
        breach: ops.map((_, i) => slot(dx + 1.5, dz, i))
      };
      this.spot = { stairs: { x: sx, z: sz }, door: { x: dx, z: dz } };
    },
    pieces(g) {
      const scene = g.env.scene;
      const kit = g.__kit || kitOf(scene);
      const bits = bitsOf(scene);
      if (!bits || !kit || !kit.box || !kit.Mesh) return;
      let group = scene.getObjectByName('zact');
      if (!group) { group = empty(bits); group.name = 'zact'; scene.add(group); }
      while (group.children && group.children.length) group.remove(group.children[0]);
      const base = this.spot && this.spot.stairs ? this.spot.stairs : { x: g.level.W / 2, z: g.level.H / 2 };
      this.stairBase = { x: base.x, z: base.z };
      const stairs = empty(bits);
      for (let i = 0; i < 6; i++) {
        const step = solid(kit, 1.4, 0.22, 0.72, 0xd5d0c6);
        step.position.set(0, i * 0.22, i * 0.7);
        stairs.add(step);
      }
      stairs.position.set(base.x, 0, base.z);
      stairs.userData.kind = 'stairs';
      stairs.visible = false;
      group.add(stairs);
      this.stairs = stairs;
      const door = solid(kit, 0.14, 2.3, 1.15, 0x6b4128);
      const doorAt = this.spot && this.spot.door ? this.spot.door : base;
      door.position.set(doorAt.x, 0, doorAt.z);
      door.userData.kind = 'door';
      door.visible = false;
      group.add(door);
      this.door = door;
      this.doorAt = { x: doorAt.x, z: doorAt.z };
    },
    setPhase(name) {
      this.phase = name || 'deploy';
      this.t = 0;
      if (this.stairs) this.stairs.visible = this.phase === 'stairs';
      if (this.door) this.door.visible = this.phase === 'stack' || this.phase === 'breach';
      const g = this.g;
      if (!g) return;
      const goals = (this.goals && this.goals[this.phase]) || [];
      this.block = this.block || obstacleGrid(g);
      this.paths = this.saved.map((s, i) => {
        const goal = goals[i] || goals[0] || { x: s.o.x, z: s.o.z };
        return cutRoute(g.level, this.block, s.o.x, s.o.z, goal.x, goal.z);
      });
      this.at = this.saved.map(() => 0);
      window.__cutClip = 0;
      if (['gear', 'drive', 'title', 'city'].includes(this.phase)) {
        try {
          const scene = g.env.scene;
          if (!scene.getObjectByName('zvan')) {
            const kit = g.__kit || kitOf(scene);
            const bits = bitsOf(scene);
            if (kit && kit.box && bits) {
              const van = showCar(kit, bits, 0x1c2430, this.saved[0] ? this.saved[0].o.x + 3 : 8, this.saved[0] ? this.saved[0].o.z : 8, 0.4);
              van.name = 'zvan';
              van.scale.set(1.15, 1.15, 1.15);
              scene.add(van);
            }
          }
        } catch (err) { /* the intro still plays without the van */ }
      }
    },
    tick(dt) {
      if (!this.on || !this.g) return;
      this.t += dt;
      const audio = window.__zuluCutAudio;
      const voiceT = audio && audio.currentTime > 0.05 ? audio.currentTime : this.t;
      const voiceDur = audio && isFinite(audio.duration) && audio.duration > 0.4 ? audio.duration : 4.6;
      const list = ({
        deploy: [
          { look: 'wide', dist: 20, pitch: 0.58, yaw: 0.2, push: 0, y: 1.1 },
          { look: 'lead', dist: 6.2, pitch: 0.16, yaw: 0.95, push: 0.6, y: 1.35 },
          { look: 'squad', dist: 11, pitch: 0.36, yaw: 0.4, push: 1, y: 1.0 }
        ],
        enter: [
          { look: 'wide', dist: 18, pitch: 0.5, yaw: 0.15, push: 0, y: 1.2 },
          { look: 'lead', dist: 6.4, pitch: 0.14, yaw: 1.2, push: 0.5, y: 1.35 },
          { look: 'squad', dist: 9, pitch: 0.32, yaw: 0.55, push: 1, y: 1.05 }
        ],
        stack: [
          { look: 'door', dist: 6.2, pitch: 0.18, yaw: 1.35, push: 0.25, y: 1.2 },
          { look: 'lead', dist: 5.8, pitch: 0.12, yaw: 0.35, push: 0.4, y: 1.4 },
          { look: 'door', dist: 7.2, pitch: 0.24, yaw: 1.05, push: 1, y: 1.15 }
        ],
        stairs: [
          { look: 'stairs', dist: 8, pitch: 0.2, yaw: 1.25, push: 0.2, y: 1.3 },
          { look: 'lead', dist: 6, pitch: 0.14, yaw: 0.45, push: 0.5, y: 1.4 },
          { look: 'stairs', dist: 9, pitch: 0.28, yaw: 1.05, push: 1, y: 1.4 }
        ],
        breach: [
          { look: 'door', dist: 8, pitch: 0.55, yaw: 0.4, push: 0, y: 1.3 },
          { look: 'door', dist: 5.5, pitch: 0.42, yaw: 1.7, push: 0.7, y: 1.2 },
          { look: 'lead', dist: 6, pitch: 0.35, yaw: 2.4, push: 0.4, y: 1.3 }
        ],
        cold: [
          { look: 'wide', dist: 28, pitch: 0.9, yaw: 0.2, push: 0, y: 0.4 },
          { look: 'wide', dist: 24, pitch: 0.72, yaw: 0.55, push: 0.3, y: 1 }
        ],
        title: [
          { look: 'squad', dist: 14, pitch: 0.4, yaw: 0.8, push: 1, y: 1.3 }
        ],
        city: [
          { look: 'wide', dist: 26, pitch: 0.95, yaw: 0.1, push: 0.5, y: 0.2 },
          { look: 'wide', dist: 18, pitch: 0.7, yaw: 1.1, push: 0.4, y: 1 }
        ],
        gear: [
          { look: 'lead', dist: 5.5, pitch: 0.28, yaw: 1.3, push: 0.6, y: 1.35 }
        ],
        drive: [
          { look: 'squad', dist: 12, pitch: 0.38, yaw: 0.4, push: 0.8, y: 1.2 },
          { look: 'wide', dist: 16, pitch: 0.5, yaw: 1.6, push: 0.3, y: 1.1 }
        ]
      })[this.phase] || [
        { look: 'squad', dist: 12, pitch: 0.4, yaw: 0.5, push: 0.6, y: 1 }
      ];
      const span = voiceDur / list.length;
      const idx = Math.max(0, Math.min(list.length - 1, Math.floor(voiceT / span)));
      const shot = list[idx];
      const local = Math.max(0, Math.min(1, (voiceT - idx * span) / span));
      const ease = local * local * (3 - 2 * local);
      const moving = shot.push > 0.15;
      window.__cutShot = (this.phase || 'deploy') + ':' + shot.look + ':' + idx;
      const L = this.g.level, block = this.block;
      const inside = (x, z) => {
        const ix = Math.floor(x), iz = Math.floor(z);
        if (ix < 0 || iz < 0 || ix >= L.W || iz >= L.H) return true;
        const c = iz * L.W + ix;
        return !!(block && block[c] && L.type[c] !== 5);
      };
      this.saved.forEach((s, i) => {
        const path = this.paths && this.paths[i];
        if (!path || !moving) { s.o.moving = false; return; }
        let at = this.at[i] || 0;
        let left = 2.1 * dt;
        while (left > 0.001 && at < path.length - 1) {
          const b = path[at + 1];
          const dx = b.x - s.o.x, dz = b.z - s.o.z;
          const dist = Math.hypot(dx, dz) || 0.001;
          const step = Math.min(left, dist);
          const nx = s.o.x + (dx / dist) * step, nz = s.o.z + (dz / dist) * step;
          if (inside(nx, nz)) { window.__cutClip = (window.__cutClip || 0) + 1; break; }
          s.o.x = nx; s.o.z = nz;
          s.o.ang = Math.atan2(dx, dz);
          left -= step;
          if (dist - step < 0.04) { at++; this.at[i] = at; }
        }
        s.o.moving = at < path.length - 1;
        s.o.mv = 'jog';
        if (this.phase === 'stairs' && this.stairBase) {
          const along = s.o.z - this.stairBase.z;
          s.o.__cutY = along > 0 ? Math.min(1.3, along * 0.31) : 0;
        } else s.o.__cutY = 0;
      });
      this.doorAng = (this.phase === 'breach' && idx > 0) ? Math.min(1.5, (idx === 1 ? ease : 1) * 1.5) : 0;
      const cam = this.g.env && this.g.env.cam;
      const ops = this.saved;
      if (cam && ops.length) {
        const lead = ops[0].o;
        let x = ops.reduce((sum, s) => sum + s.o.x, 0) / ops.length;
        let z = ops.reduce((sum, s) => sum + s.o.z, 0) / ops.length;
        if (shot.look === 'lead') { x = lead.x; z = lead.z; }
        else if (shot.look === 'door' && this.doorAt) { x = this.doorAt.x; z = this.doorAt.z; }
        else if (shot.look === 'stairs' && this.stairBase) { x = this.stairBase.x; z = this.stairBase.z; }
        cam.target.set(x, shot.y, z);
        const dist = shot.dist - ease * shot.push * 1.6;
        let yaw = shot.yaw + ease * 0.18 + (this.phase === 'breach' && idx === 1 ? Math.sin(this.t * 18) * 0.04 : 0);
        const wallAt = (px, pz) => {
          const ix = Math.floor(px), iz = Math.floor(pz);
          if (ix < 0 || iz < 0 || ix >= L.W || iz >= L.H) return false;
          const t = L.type[iz * L.W + ix];
          return t === 1 || t === 2 || t === 4;
        };
        if (shot.look === 'door' || this.phase === 'breach') {
          const cy = Math.cos(shot.pitch);
          for (let k = 0; k < 12; k++) {
            const tryYaw = yaw + k * 0.5;
            const px = x + Math.sin(tryYaw) * cy * dist;
            const pz = z + Math.cos(tryYaw) * cy * dist;
            if (!wallAt(px, pz)) { yaw = tryYaw; break; }
          }
        }
        cam.dist = dist;
        cam.pitch = shot.pitch;
        cam.yaw = yaw;
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
      st.textContent = '.zreplay{display:block;width:100%;text-align:left;margin-top:4px}body.zulu-cut #hud,body.zulu-cut .zfps-btn,body.zulu-cut .planmarks,body.zulu-cut .zstage,body.zulu-cut .w1sbx-bar{visibility:hidden!important}';
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

  function piece(kit, bits, kind, tint) {
    const root = empty(bits);
    const put = (m, px, py, pz) => { m.position.x += px; m.position.y += py; m.position.z += pz; root.add(m); };
    const wood = tint.wood, cloth = tint.cloth, leaf = tint.leaf;
    if (kind === 'sofa') {
      put(brighten(solid(kit, 2.15, 0.28, 0.82, cloth), cloth, 0.3), 0, 0.28, 0);
      put(brighten(solid(kit, 0.7, 0.16, 0.7, cloth), cloth, 0.4), -0.5, 0.46, 0.04);
      put(brighten(solid(kit, 0.7, 0.16, 0.7, cloth), cloth, 0.4), 0.5, 0.46, 0.04);
      put(brighten(solid(kit, 2.15, 0.62, 0.14, cloth), cloth, 0.28), 0, 0.7, -0.34);
      put(brighten(solid(kit, 0.16, 0.55, 0.82, cloth), cloth, 0.28), -1.02, 0.42, 0);
      put(brighten(solid(kit, 0.16, 0.55, 0.82, cloth), cloth, 0.28), 1.02, 0.42, 0);
      for (const [lx, lz] of [[-0.9, 0.32], [0.9, 0.32], [-0.9, -0.32], [0.9, -0.32]]) put(brighten(solid(kit, 0.07, 0.2, 0.07, wood), wood, 0.22), lx, 0, lz);
    } else if (kind === 'chair') {
      put(brighten(solid(kit, 0.46, 0.07, 0.46, cloth), cloth, 0.35), 0, 0.48, 0);
      put(brighten(solid(kit, 0.46, 0.5, 0.07, cloth), cloth, 0.32), 0, 0.74, -0.2);
      put(brighten(solid(kit, 0.08, 0.28, 0.08, 0x2a2e32), 0x3a3e44, 0.25), 0, 0.22, 0);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        put(brighten(solid(kit, 0.22, 0.04, 0.05, 0x2a2e32), 0x3a3e44, 0.25), Math.cos(a) * 0.16, 0.05, Math.sin(a) * 0.16);
      }
    } else if (kind === 'shelf') {
      for (let i = 0; i < 4; i++) put(brighten(solid(kit, 1.15, 0.05, 0.36, wood), wood, 0.32), 0, 0.28 + i * 0.38, 0);
      put(brighten(solid(kit, 0.06, 1.55, 0.36, wood), wood, 0.25), -0.55, 0, 0);
      put(brighten(solid(kit, 0.06, 1.55, 0.36, wood), wood, 0.25), 0.55, 0, 0);
      const books = [0xc4562a, 0x2f4a6b, 0x6b3a2f, 0x2f6b4f, 0xd8d2c4];
      for (let i = 0; i < books.length; i++) put(brighten(solid(kit, 0.08, 0.24, 0.18, books[i]), books[i], 0.35), -0.4 + i * 0.18, 0.48, 0);
    } else if (kind === 'lamp') {
      put(brighten(solid(kit, 0.28, 0.06, 0.28, 0x2a2e32), 0x3a3e44, 0.3), 0, 0.04, 0);
      put(brighten(solid(kit, 0.06, 1.15, 0.06, 0x2a2e32), 0x3a3e44, 0.25), 0, 0.1, 0);
      put(brighten(solid(kit, 0.36, 0.22, 0.36, 0xf4e2a8), 0xfff1c4, 0.7), 0, 1.2, 0);
    } else if (kind === 'plant') {
      put(brighten(solid(kit, 0.36, 0.28, 0.36, 0xc4a574), 0xc4a574, 0.3), 0, 0.14, 0);
      put(brighten(solid(kit, 0.22, 0.16, 0.22, 0x6b3a22), 0x6b3a22, 0.25), 0, 0.32, 0);
      put(brighten(solid(kit, 0.62, 0.7, 0.62, leaf), leaf, 0.35), 0, 0.75, 0);
      put(brighten(solid(kit, 0.36, 0.4, 0.36, leaf), leaf, 0.45), 0.12, 1.2, 0.05);
    } else if (kind === 'bed') {
      put(brighten(solid(kit, 1.2, 0.28, 2.0, wood), wood, 0.25), 0, 0.2, 0);
      put(brighten(solid(kit, 1.15, 0.18, 1.9, cloth), cloth, 0.3), 0, 0.4, 0);
      put(brighten(solid(kit, 0.7, 0.16, 0.4, 0xf7f4ee), 0xf7f4ee, 0.4), 0, 0.55, -0.7);
    } else {
      put(brighten(solid(kit, 1.5, 0.08, 0.7, wood), wood, 0.34), 0, 0.74, 0);
      for (const [lx, lz] of [[-0.66, -0.26], [0.66, -0.26], [-0.66, 0.26], [0.66, 0.26]]) put(brighten(solid(kit, 0.07, 0.74, 0.07, wood), wood, 0.22), lx, 0, lz);
      put(brighten(solid(kit, 0.42, 0.32, 0.05, 0x1c2430), 0x9fd4ea, 0.45), 0.2, 0.96, -0.08);
    }
    root.userData.kind = kind;
    return root;
  }
  function furnishKept(g) {
    armBreachCam();
    armHostage();
    if (!g || !g.level || !g.zuluStage || !g.zuluStage.kept) return;
    const scene = g.env && g.env.scene;
    const L = g.level;
    const bits = bitsOf(scene);
    const kit = kitOf(scene);
    if (!bits || !kit.box || !kit.Mesh) return;
    const label = g.zuluStage.label || '';
    const theme = /lobby|hall|gate|concourse|gangway/i.test(label) ? 'lobby' : /residence|quarters|safe|bunk|farm|lodge|ranch house/i.test(label) ? 'home' : /yard|store|warehouse|cargo|hold|vault|container/i.test(label) ? 'store' : 'office';
    const tint = theme === 'lobby' ? { wood: 0xc48a4a, cloth: 0xb23a3a, leaf: 0x3e9a4a } : theme === 'home' ? { wood: 0x8d5a32, cloth: 0x3d6b52, leaf: 0x2f8a44 } : theme === 'store' ? { wood: 0x6d5840, cloth: 0x8a7048, leaf: 0x4a7a3a } : { wood: 0xa56b3c, cloth: 0x2c3e50, leaf: 0x2e7d42 };
    let group = scene.getObjectByName('zfurn');
    if (!group) { group = empty(bits); group.name = 'zfurn'; scene.add(group); }
    while (group.children.length) group.remove(group.children[0]);
    const nearDoor = (x, z) => (L.doors || []).some((d) => Math.max(Math.abs(d.x - x), Math.abs(d.y - z)) <= 1);
    const open = (x, z) => x > 0 && z > 0 && x < L.W - 1 && z < L.H - 1 && L.type[z * L.W + x] === 0 && !(L.ext && L.ext[z * L.W + x]) && !nearDoor(x, z);
    const spots = [];
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isInstancedMesh || !o.geometry || !o.getMatrixAt) return;
      if (!o.geometry.boundingBox && o.geometry.computeBoundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      if (!bb) return;
      const sx = (bb.max.x - bb.min.x) * (o.scale ? o.scale.x : 1);
      const sy = (bb.max.y - bb.min.y) * (o.scale ? o.scale.y : 1);
      if (sy < 0.7 || sy > 1.5 || sx < 0.7 || sx > 1.6) return;
      const local = o.matrix.clone();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, local);
        const world = local.clone();
        world.premultiply(o.matrixWorld);
        const ix = Math.floor(world.elements[12]), iz = Math.floor(world.elements[14]);
        if (!open(ix, iz)) continue;
        local.elements[13] = -8;
        o.setMatrixAt(i, local);
        spots.push({ x: ix + 0.5, z: iz + 0.5 });
      }
      if (o.instanceMatrix) o.instanceMatrix.needsUpdate = true;
    });
    const used = new Set();
    const drop = (kind, x, z, yaw) => {
      const p = piece(kit, bits, kind, tint);
      p.position.set(x, 0, z);
      p.rotation.y = yaw || 0;
      group.add(p);
    };
    let n = 0;
    for (const s of spots) {
      if (n >= 7) break;
      const key = Math.floor(s.z) * L.W + Math.floor(s.x);
      if (used.has(key)) continue;
      used.add(key);
      drop(theme === 'home' && n % 3 === 2 ? 'bed' : 'desk', s.x, s.z, (n % 2) * 1.2);
      const cx = Math.floor(s.x) + 1, cz = Math.floor(s.z);
      if (open(cx, cz)) drop('chair', cx + 0.5, cz + 0.5, Math.PI);
      n++;
    }
    const rooms = new Map();
    for (let i = 0; i < L.W * L.H; i++) {
      if (L.type[i] !== 0 || (L.ext && L.ext[i]) || !L.room || !L.room[i]) continue;
      const id = L.room[i];
      if (!rooms.has(id)) rooms.set(id, []);
      rooms.get(id).push(i);
    }
    for (const cells of rooms.values()) {
      if (n >= 12 || cells.length < 8) continue;
      const c = cells[Math.floor(cells.length / 2)];
      const x = c % L.W, z = (c / L.W) | 0;
      if (!open(x, z) || used.has(c)) continue;
      used.add(c);
      const kind = spots.length < 3 && theme !== 'store' ? 'desk' : (theme === 'store' || theme === 'office' ? 'shelf' : 'sofa');
      drop(kind, x + 0.5, z + 0.5, 0.4);
      const p = cells[1] || cells[0];
      const px = p % L.W, pz = (p / L.W) | 0;
      if (open(px, pz)) { drop('plant', px + 0.5, pz + 0.5, 0); if (open(px + 1, pz)) drop('lamp', px + 1.5, pz + 0.5, 0); }
      n++;
    }
    g.zuluFurn = { n, theme, spots: spots.length };
  }
  function armHostage() {
    const g = window.__game;
    if (!g) return;
    const P = g.constructor.prototype;
    if (P.__hostageEscort || !P.civ || !P.checkObjectives || !P.objectiveText) return;
    P.__hostageEscort = true;
    const civ = P.civ, check = P.checkObjectives, text = P.objectiveText;
    P.objectiveText = function () {
      if (this.mission && this.mission.mode === 'hostage') {
        const t = this.enemies.filter((o) => o.alive).length;
        const alive = (this.civs || []).filter((o) => o.kind === 'hostage' && o.alive);
        const out = alive.filter((o) => o.extracted).length;
        return 'Escort hostages to the EXIT ' + out + '/' + alive.length + ' · Hostiles ' + t;
      }
      return text.call(this);
    };
    P.checkObjectives = function () {
      if (!(this.mission && this.mission.mode === 'hostage') || this.over) return check.call(this);
      const hs = (this.civs || []).filter((o) => o.kind === 'hostage');
      if (!this.opsAlive.length) return check.call(this);
      if (hs.length && hs.some((o) => !o.alive)) {
        this.over = { win: false, wait: 1.6, reason: 'A hostage was killed.' };
        this.endTime = this.time;
        this.toast('HOSTAGE KILLED — MISSION FAILED', 'bad');
        return;
      }
      const alive = hs.filter((o) => o.alive);
      if (alive.length && alive.every((o) => o.extracted)) {
        this.over = { win: true, wait: 1.6 };
        this.endTime = this.time;
        this.toast('HOSTAGES EXTRACTED', 'good');
      }
    };
    P.civ = function (e, t) {
      if (!(e && e.kind === 'hostage' && this.mission && this.mission.mode === 'hostage')) return civ.call(this, e, t);
      if (!e.alive || e.extracted) return;
      const near = (this.ops || []).find((s) => s.alive && Math.hypot(s.x - e.x, s.z - e.z) < 1.7);
      if (!e.secured && near) {
        e.secured = true;
        e.out = true;
        if (e.ch && e.ch.ring && e.ch.ring.material && e.ch.ring.material.color) e.ch.ring.material.color.setHex(0x3ddc78);
        this.toast(near.name + ': Hostage with you — take them to the EXIT', 'good');
      }
      if (!e.secured) return;
      e.followT = (e.followT || 0) - t;
      const zones = this.level.zones && this.level.zones.X;
      const exits = zones && zones.length ? zones : (this.level.doors || []).filter((d) => d.ext).map((d) => [d.x, d.y]);
      const nearest = (x, z) => {
        let best = null, dist = 1e9;
        for (let i = 0; i < exits.length; i++) {
          const d = Math.hypot(x - (exits[i][0] + 0.5), z - (exits[i][1] + 0.5));
          if (d < dist) { dist = d; best = exits[i]; }
        }
        return [dist, best];
      };
      if (nearest(e.x, e.z)[0] < 1.15) { e.extracted = true; e.path = []; return; }
      let leader = null, ld = 1e9;
      for (const f of this.ops) if (f.alive) {
        const d = Math.hypot(f.x - e.x, f.z - e.z);
        if (d < ld) { ld = d; leader = f; }
      }
      if (leader && e.followT <= 0 && this.pathTo && this.level.nearestPassable) {
        e.followT = 0.45;
        const goExit = nearest(leader.x, leader.z)[0] < 2.6 && ld < 7;
        const spot = goExit ? nearest(e.x, e.z)[1] : [Math.floor(leader.x - Math.sin(leader.ang) * 1.6), Math.floor(leader.z - Math.cos(leader.ang) * 1.6)];
        if (spot) this.pathTo(e, this.level.nearestPassable(spot[0], spot[1]), {});
      }
      if (this.moveUnit) this.moveUnit(e, t);
    };
  }
  function frameCine(g, lookX, lookZ, bias, method) {
    const cam = g.env && g.env.cam;
    const cine = cam && cam.cine;
    const L = g.level;
    if (!cine || !cine.to || !cine.to.p || !L || !L.type) return;
    const lx = bias ? (lookX + bias.x) / 2 : lookX;
    const lz = bias ? (lookZ + bias.z) / 2 : lookZ;
    const blocked = (x, z) => {
      const ix = Math.floor(x), iz = Math.floor(z);
      if (ix < 0 || iz < 0 || ix >= L.W || iz >= L.H) return false;
      const t = L.type[iz * L.W + ix];
      return t === 1 || t === 2 || t === 4;
    };
    const see = (x, z) => (L.los ? L.los(x, z, lx, lz, false) : !blocked(x, z));
    let best = null, score = -1e9;
    const dists = method === 'kill' ? [4.2, 6, 8] : method === 'lockpick' || method === 'open' ? [3.4, 4.6] : method === 'charge' ? [5.5, 7.5, 9] : [3.6, 5, 6.8];
    const highs = method === 'kill' ? [4.8, 6.5, 8.2] : method === 'charge' ? [3.2, 5.4, 7] : [2.4, 3.6, 5.2];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      for (const dist of dists) for (const hy of highs) {
        const x = lx + Math.sin(a) * dist, z = lz + Math.cos(a) * dist;
        const wall = blocked(x, z);
        const clear = see(x, z);
        let s = 0;
        if (clear && !wall) s += 120;
        else if (!wall && hy >= 4.8) s += 70;
        else if (hy >= 5) s += 25;
        else s -= 50;
        if (wall) s -= 80;
        s -= Math.abs(dist - 5.2) * 3;
        s -= Math.abs(hy - (method === 'kill' ? 6.5 : 3.4));
        if (s > score) { score = s; best = { x, y: hy, z, clear }; }
      }
    }
    if (!best) return;
    cine.to.p.x = best.x; cine.to.p.y = best.y; cine.to.p.z = best.z;
    if (cine.to.l) { cine.to.l.x = lx; cine.to.l.y = 1.15; cine.to.l.z = lz; }
    cine.t = Math.max(cine.t || 0, 0.5);
    fadeBlockers(g, !best.clear);
    if (method === 'charge') cine.dur = 2.5;
    else if (method === 'shotgun') cine.dur = 1.35;
    else if (method === 'lockpick' || method === 'open') cine.dur = 2.1;
    if (method === 'kick' || method === 'shotgun' || method === 'charge') shakeCam(g, method === 'charge' ? 0.28 : 0.14);
    if (method === 'flash') flashCam();
  }
  function fadeBlockers(g, on) {
    const scene = g.env && g.env.scene;
    if (!scene) return;
    if (!on) {
      for (const rec of g.__cineFade || []) rec.mesh.material = rec.mat;
      g.__cineFade = [];
      return;
    }
    if (g.__cineFade && g.__cineFade.length) return;
    g.__cineFade = [];
    scene.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || !o.geometry || !o.material || !o.material.clone) return;
      if (!o.geometry.boundingBox && o.geometry.computeBoundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      if (!bb) return;
      const h = (bb.max.y - bb.min.y) * (o.scale ? o.scale.y : 1);
      const w = Math.max((bb.max.x - bb.min.x) * (o.scale ? o.scale.x : 1), (bb.max.z - bb.min.z) * (o.scale ? o.scale.z : 1));
      if (h < 1.8 || w < 4) return;
      const copy = o.material.clone();
      copy.transparent = true;
      copy.opacity = 0.16;
      copy.depthWrite = false;
      g.__cineFade.push({ mesh: o, mat: o.material });
      o.material = copy;
    });
  }
  function shakeCam(g, amp) {
    const cine = g.env && g.env.cam && g.env.cam.cine;
    if (!cine || !cine.to || !cine.to.p || g.__shaking) return;
    g.__shaking = true;
    const p = cine.to.p, x = p.x, y = p.y, z = p.z;
    let n = 0;
    const step = () => {
      n++;
      if (!g.env.cam.cine || n > 10) { p.x = x; p.y = y; p.z = z; g.__shaking = false; return; }
      p.x = x + Math.sin(n * 2.2) * amp;
      p.y = y + Math.cos(n * 1.7) * amp * 0.4;
      p.z = z + Math.cos(n * 2.2) * amp;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function flashCam() {
    let el = document.querySelector('.zulu-flash');
    if (!el) { el = document.createElement('div'); el.className = 'zulu-flash'; el.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;z-index:79;pointer-events:none;transition:opacity .35s'; document.body.appendChild(el); }
    el.style.opacity = '0.85';
    setTimeout(() => { el.style.opacity = '0'; }, 80);
  }
  function armCineOverlay() {
    if (!document.getElementById('zulu-cine-style')) {
      const st = document.createElement('style');
      st.id = 'zulu-cine-style';
      st.textContent = 'body.zulu-cine #hud{z-index:40}body.zulu-cine .cine{z-index:2}body.zulu-cine .cine .bar{height:13vh}body.zulu-cine .cine-txt{left:max(12px,env(safe-area-inset-left))!important;right:max(12px,env(safe-area-inset-right));bottom:max(16vh,84px)!important;font:900 clamp(28px,8vw,48px)/1.05 system-ui,sans-serif!important;letter-spacing:.06em!important;z-index:3}#hud .cine.show{opacity:1!important}body.zulu-intro::before,body.zulu-intro::after{content:"";position:fixed;left:0;right:0;height:12vh;background:#000;z-index:70;pointer-events:none}body.zulu-intro::before{top:0}body.zulu-intro::after{bottom:0}.ztitle{position:fixed;left:8px;right:8px;top:36%;text-align:center;z-index:72;font:900 clamp(26px,8vw,60px)/1.05 system-ui,sans-serif;letter-spacing:.12em;color:#f4f1ea;text-shadow:0 10px 28px #000;pointer-events:none}.dm-list{display:flex;flex-direction:column;gap:4px}.dm-opt{text-align:left;min-height:44px}';
      document.head.appendChild(st);
    }
    const hud = window.__app && window.__app.hud;
    if (!hud || hud.__cineVis || !hud.setCine) return;
    hud.__cineVis = true;
    const orig = hud.setCine.bind(hud);
    hud.setCine = function (on, label) {
      orig(on, label);
      document.body.classList.toggle('zulu-cine', !!on);
      if (!on && window.__game) fadeBlockers(window.__game, false);
    };
  }
  function armBreachCam() {
    const g = window.__game;
    if (!g) return;
    const P = g.constructor.prototype;
    if (P.openDoor && !P.__breachCam) {
      const open = P.openDoor;
      P.openDoor = function (door, unit, method) {
        const held = (method === 'open' || method === 'enemy') && (this.breaches || []).some((b) => b.door === door && b.phase !== 'done' && (b.units || []).some((u) => u.alive && u.kind !== 'enemy'));
        if (held) return;
        return open.call(this, door, unit, method);
      };
      P.__breachCam = true;
    }
    if (P.cinematic && !P.__cineClear) {
      const cin = P.cinematic;
      P.cinematic = function (b) {
        const ret = cin.call(this, b);
        try {
          if (b && b.door) {
            const br = b.breacher || (b.units && b.units[0]);
            frameCine(this, b.door.x + 0.5, b.door.y + 0.5, br && { x: br.x, z: br.z }, b.flash ? 'flash' : b.method);
          }
        } catch (err) { /* keep the shot */ }
        this.__cineAt = (typeof performance !== 'undefined' && performance.now()) || Date.now();
        return ret;
      };
      P.__cineClear = true;
    }
    if (P.finalKill && !P.__finalCam) {
      const fk = P.finalKill;
      P.finalKill = function (victim, killer) {
        const k = killer || (this.ops || []).find((o) => o && o.alive) || victim;
        const ret = fk.call(this, victim, k);
        try { if (victim) frameCine(this, victim.x, victim.z, k && { x: k.x, z: k.z }, 'kill'); } catch (err) { /* keep the shot */ }
        this.__cineAt = (typeof performance !== 'undefined' && performance.now()) || Date.now();
        return ret;
      };
      P.__finalCam = true;
    }
    if (P.skipCine && !P.__skipGrace) {
      const skip = P.skipCine;
      P.skipCine = function () {
        const now = (typeof performance !== 'undefined' && performance.now()) || Date.now();
        if (this.__cineAt && now - this.__cineAt < 800) return false;
        return skip.call(this);
      };
      P.__skipGrace = true;
    }
    armCineOverlay();
  }
  window.__zuluReshape = reshape;
  window.__zuluFurnish = furnishKept;
  window.__zuluStageLine = stageLine;
  window.__zuluStageAudio = stageAudio;
  window.__zuluAct = Act;
  window.__zuluLore = STAGE_LORE;
  if (!window.__zuluCutObs) {
    window.__zuluCutObs = new MutationObserver(() => watchCuts());
    window.__zuluCutObs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-act', 'class'] });
  }
  const wait = setInterval(() => {
    armBreachCam();
    armHostage();
    if (window.__app && window.__app.menus) { clearInterval(wait); boot(); }
  }, 40);
})();
