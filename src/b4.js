// BATCH 4 installer: expanded marketplace, five-stage missions and in-mission kit. Called once from main.js.
import { installMarket } from './market2.js';
import { installStages } from './stages.js';
import { installMissionKit } from './missionkit.js';
import { ensureB4 } from './market-data.js';
import { writeSave } from './save.js';
export function installB4(app) { ensureB4(app.save); try { writeSave(app.save); } catch (e) { }
  installMarket(app); installStages(app); installMissionKit(app); window.__b4 = { app, ok: true }; }
