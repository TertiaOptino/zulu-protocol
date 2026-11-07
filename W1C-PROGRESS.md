# W1C progress — Game Worker 1, fresh worktree /workspace/games/zulu-protocol-w1c (cp -a of zulu-protocol-m2, 2026-11-01 14:42 EST)
Rules: only this copy; new files + small `// w1` edits; no publish; tests one at a time (setsid/nohup), logs /workspace/tlog/w1c-*.log, JPGs screenshots-w1c/.
Scope (steering 3): 1 stack on every map → 2 stage names/objectives + single-goal ops → 3 radio log → 4 AI Sandbox → 5 select-all/1-2-3 keys if missing. DROPPED: AI/enemy placement, furniture, smart fire, vitals, cutscenes (GW6), stage interiors/props (GW7), tpcam (GW3).

## Milestones
- [x] 14:42 EST worktree made; w1 status read: stack2/breach fix/radiolog/vitals/firemode passed in w1; spawn2/ai3 never tested (dropped now).
- [x] 14:43 EST ported: src/stack2.js, src/radiolog.js (vitals import replaced by optional o.w1ammo hook), new src/w1.js (installer) + src/w1css.js (CSS injected at runtime, build.mjs untouched); main.js 2 lines; hud.js L33/L155/L156. Build OK.
- [x] w1-stack-check, one mission per map (14 maps) + plan flow: W1 STACK CHECK ALL PASS, 170 checks (log /workspace/tlog/w1c-stack.log)
- [x] Job 5 check: select-all and 1/2/3 are ALREADY live in m2 (controls.js L4 Digit1-3 team1-3, input.js L90 Ctrl/Cmd+A selectAll, L102 'all' action, hud.js L82 "All" chip, game.js L108 selectAll). Nothing to add.
- [x] Stage names/objectives decided → STAGE-NAMES.md written (src/stagenames.js is the source; `node gen-stage-names.mjs` regenerates it)
- [x] w1-stage-check (real stage missions through the menus): first run 58/62 (4 test-side faults: hunt win waited on real time; phone shots hit a locked stage 5) → fixed test → subset rerun ALL PASS 19/19 (log w1c-stage2.log); full rerun ALL PASS 62 checks (log w1c-stage3.log)
- [x] w1-breach-check (Breach pause fix + STACK & WAIT while paused at start, desktop + phone): ALL PASS 17 checks (log /workspace/tlog/w1c-breach.log)
- [x] w1-radio-check (real emb_hr mission, desktop + portrait/landscape/Fold): ALL PASS 20 checks (log /workspace/tlog/w1c-radio.log)
- [x] Job 4 AI Sandbox built (src/sandbox.js); w1-sbx-check.mjs running (log /workspace/tlog/w1c-sbx.log)



## Report — Job 1: door STACK on every map
What: wall-side split stack (3+ operators split both sides of the door, second rank behind), pre-stack while the plan view is paused, GO executes a pending plan, BREACH NOW / STACK & WAIT from the paused plan view unpause so the team actually walks (Breach pause fix kept). Stack timeout 25 s (4 s idle). Toggle settings.w1stack=false.
Files: NEW src/stack2.js (91 lines, from w1), NEW src/w1.js (installer), NEW src/w1css.js; src/main.js L30 (import) + L51 (installW1Hud(this)); src/hud.js L33 (GO → executePlan when a plan is pending), L155 (BREACH NOW unpauses), L156 (STACK & WAIT unpauses outside plan-assign). game.js untouched.
Tests: w1-stack-check.mjs on emb_hr, wh_th, kan_th, rig_hr, sub_es, hk_in, mex_hr, col_ex, nai_th, rio_hr, bf_hr, hel_in, port_ex, ran_hr (every map): each soldier reaches his slot < 0.6 m, min gap ≥ 0.75 m, slots beside the door against the wall (none in the doorway), breach starts only after the stack, door opened; plan flow pre-stacks and EXECUTE breaches → ALL PASS 170 checks (/workspace/tlog/w1c-stack.log).
Breach pause fix: w1-breach-check.mjs (emb_hr, desktop 1280×720 + phone): plan view BREACH NOW unpauses and the door is breached; Breach button with a team selected opens the nearest door menu; GO with a kept plan opens all 3 plan doors < 60 s; paused at start (plan closed with ✕) → STACK & WAIT unpauses, team stacks to 'ready' with the door still closed, GO then breaches → ALL PASS 17 checks (/workspace/tlog/w1c-breach.log).
Screenshots: screenshots-w1c/stack-w1c-<id>-tactical.jpg and stack-w1c-beforego-<id>-tactical.jpg (14 maps each); breach-w1c-{desktop,phone}-{menu,stackwait,after}.jpg.
Built: index.html, play.html, dist/.

## Report — Job 2: stage names + single-goal objectives
What: every one of an operation's 5 stages now uses the operation's own mode (was 4 random modes + the op mode). Stage names are places on that site (stage 2 = dark/lower level, stage 5 = the op's target room, per operation); all 14 maps have names (forest/valley/port/ranch no longer generic). Objective line = the op goal at that place, shown on the stage card, stage-select hero ("Goal: …"), deploy brief ("Stage n · Name: objective"; classic ops: "Objective: …") and stage AAR.
Files: NEW src/stagenames.js (SITE_STAGES, OP_FINAL, w1StageName/w1Goal/w1OpGoal); NEW gen-stage-names.mjs; NEW STAGE-NAMES.md; src/stages.js L11 (import), L29 (stageName uses the table), L30 (stageModes = op mode ×5), L48 (sm.goal), L78 (hero goal), L83 (card goal, tagged on L85), L102 (AAR goal); src/w1.js (deploy-brief goal line); src/w1css.js (.w1goal/.w1opgoal styles, landscape clamp).
Tests: w1-stage-check.mjs on emb_hr, emb_ex, emb_bd, wh_in, kan_es, wh_th, bf_hr, port_ex, hel_bd, ran_es (all 6 modes, indoor + outdoor maps): 5/5 stages use the op mode; cards = STAGE-NAMES.md; deploy brief line; the live mission spawns that goal (hostages / VIP / bombs / intel / hostiles); hunt stages 1, 2, 5 won for real → stage AAR shows the objective ("STAGE 1 CLEARED", "OPERATION COMPLETE"); phone portrait 390×844, landscape 844×390, Fold 344×882: no overlap/overflow on stage select + deploy brief; no page errors.
Screenshots: screenshots-w1c/stages-select-emb_hr.jpg, stages-deploy-emb_hr-s1.jpg, stages-live-emb_hr-s2.jpg, stages-live-port_ex-*.jpg, stages-aar-wh_th-s1.jpg, stages-portrait.jpg, stages-landscape.jpg, stages-fold.jpg, stages-deploy-{portrait,landscape,fold}.jpg.
Built: index.html, play.html, dist/.

## Report — Job 3: radio log
What: on-screen radio feed (≤5 lines, newest at the bottom, fades out, pointer-events none, placed by JS clear of HUD controls) + event bus `window.__radio.on(fn)` → fn({callsign, text, kind}) (also `.off(fn)`, `.push(callsign,text,kind)`). Kinds: go, stack, breach, contact, down, kill, hit, reload, lowammo, clear, alarm, hostage, vip, gear (all names Worker 4 audio uses). Toggle settings.radioLog=false (feed stays empty, no events).
Files: NEW src/radiolog.js (96 lines; Game hooks on say/toast/order paths, HUD feed; ammo state via optional o.w1ammo hook, no vitals dependency); installed from src/w1.js (installRadioLog(Game) + installRadioLogHud(hud)); CSS in src/w1css.js (.w1radio/.w1rl). No edits to designer files.
Tests: w1-radio-check.mjs, real emb_hr mission, GO with the kept plan, live enemies: radio lines for go/stack/breach/contact/reload, every event {callsign,text,kind}, feed ≤5 newest-last; phone portrait 412×839, landscape 863×360, Fold 344×882: feed inside screen, overlaps no HUD control, takes no input, < 12% of view; radioLog=false → empty; no page errors → ALL PASS 20 checks (/workspace/tlog/w1c-radio.log).
Screenshots: screenshots-w1c/radio-w1c-{desktop,portrait,landscape,fold}.jpg.
Built: index.html, play.html, dist/.

## Report — Job 5: select-all + 1/2/3 keys
Already live in m2, nothing added: controls.js L4 (Digit1-3 → team 1-3), input.js L90 (Ctrl/Cmd+A → selectAll), L102 ('all' action), hud.js L82 ("All" chip), game.js L108 (selectAll()).
