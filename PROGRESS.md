# Game Worker 1 (w1c) - HOLD, Nov 1 ~3:30 PM
Done (tested in real missions, see W1C-PROGRESS.md for files/lines/logs):
- Job 1 door stack on every map + Breach pause fix (170 + 17 checks pass)
- Job 2 stage names + single-goal objectives (STAGE-NAMES.md, src/stagenames.js)
- Job 3 radio log (window.__radio, 20 checks pass)
- Job 5 select-all + 1/2/3 keys: already live in m2
- Job 4 AI Sandbox built (src/sandbox.js); w1-sbx-check.mjs was running when stopped, last run 29/31 pass (see log for the 2 FAIL lines)
Left:
- Verify AI Sandbox (rerun w1-sbx-check.mjs, log /workspace/tlog/w1c-sbx.log)
- Dropped by Peony: AI/enemy placement, furniture, cutscenes (W6), stage interiors (W7)
