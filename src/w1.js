// w1: Game Worker 1 add-ons, installed from one place (main.js imports this file + calls installW1Hud).
//  - stack2.js   wall-side / two-line door stacks, pre-stack before GO (settings.w1stack=false to disable)
//  - stagenames.js stage names + single-goal objectives (hooks in stages.js; goal line on the deploy brief here)
//  - radiolog.js radio log feed + window.__radio bus (settings.radioLog=false to disable)
//  - sandbox.js  AI Sandbox: AI vs AI on any map from the main menu (never touches the save)
import { Game } from './game.js';
import { installStack2, installStack2Hud } from './stack2.js';
import { installRadioLog, installRadioLogHud } from './radiolog.js';
import { W1_CSS } from './w1css.js';
import { MAPS } from './maps.js';
import { w1OpGoal } from './stagenames.js';
import { installSandbox, installSandboxApp } from './sandbox.js';
installStack2(Game); installRadioLog(Game); installSandbox(Game);
export function installW1Hud(app) {
  if (typeof document !== 'undefined' && !document.getElementById('w1css')) { const s = document.createElement('style'); s.id = 'w1css'; s.textContent = W1_CSS; document.head.append(s); }
  installStack2Hud(app.hud); installRadioLogHud(app.hud); installSandboxApp(app);
  const mn = app.menus; if (mn && mn.deploy) { const dep = mn.deploy.bind(mn); mn.deploy = function (m) { const r = dep(m); // w1: objective line on the brief
    try { const goal = m.goal || (MAPS[m.map] && w1OpGoal(m, MAPS[m.map].name)); const br = mn.root.querySelector('.brief'); if (goal && br && !br.querySelector('.w1goal')) { const p = document.createElement('p'); p.className = 'w1goal'; p.textContent = (m.stage ? `Stage ${m.stage} · ${m.stageTitle}: ` : 'Objective: ') + goal; const md = br.querySelector('.br-mode'); md ? md.after(p) : br.prepend(p); } } catch (e) { /* brief layout changed: skip */ }
    return r; }; }
}
