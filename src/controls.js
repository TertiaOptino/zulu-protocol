// Key bindings (rebindable action keys) + controls help text shared by the HUD overlay and Settings.
export const ACTIONS = [
  ['pause', 'Pause / resume', ['Space']], ['menu', 'Menu / close panels', ['Escape']], ['help', 'Controls overlay', ['F1', 'Slash']],
  ['team1', 'Select Alpha (double-tap: centre)', ['Digit1']], ['team2', 'Select Bravo (double-tap: centre)', ['Digit2']], ['team3', 'Select Charlie (double-tap: centre)', ['Digit3']],
  ['cycle', 'Cycle operators', ['Tab']], ['all', 'Select everyone (also Ctrl+A)', ['Backquote', 'Digit4']], ['center', 'Centre on selection', ['Home', 'KeyC']],
  ['frag', 'Frag grenade', ['KeyG']], ['flash', 'Flashbang', ['KeyB']], ['smoke', 'Smoke', ['KeyV']], ['hold', 'Hold position', ['KeyH']],
  ['follow', 'Camera: follow → 3rd person → free', ['KeyT']], ['tps', '3rd-person shoulder cam (selected soldier)', ['KeyO']], ['go', 'GO (execute waiting breaches)', ['Enter', 'KeyY']], ['move', 'Move mode (ignore doors)', ['KeyM']],
  ['undo', 'Undo last order (also Ctrl+Z)', ['KeyU']], ['clear', 'Clear path', ['Backspace']], ['faster', 'Game speed +', ['Equal', 'NumpadAdd']], ['slower', 'Game speed −', ['Minus', 'NumpadSubtract']],
];
export const CAMERA_KEYS = [['W A S D / Arrows', 'Pan'], ['Q / E', 'Rotate'], ['R / F or PgUp / PgDn', 'Tilt'], ['Mouse wheel or Z / X', 'Zoom'], ['Right- or middle-drag', 'Rotate + tilt'], ['Screen edge', 'Pan (edge-scroll, off by default — Settings)']];
export const MOUSE = [['Left-click operator', 'Select (click again: whole team)'], ['Shift + click operator', 'Add / remove from selection'], ['Left-drag on ground', 'Box-select several operators'], ['Left- or right-click ground', 'Move selected'], ['Shift + click ground', 'Queue a waypoint'], ['Drag from selected operator', 'Draw a path'], ['Click a door', 'Breach menu (1–5 pick, F flash, Enter breach, Shift+Enter stack & wait)']];
export const TOUCH = [['Tap operator / team', 'Select'], ['Tap ground', 'Move'], ['Tap door', 'Breach menu'], ['Drag from selected operator', 'Draw a path'], ['One-finger drag', 'Pan'], ['Pinch', 'Zoom'], ['Two-finger twist', 'Rotate'], ['Two fingers up / down', 'Tilt']];
// Camera keys are fixed (held-key camera); they cannot be taken by an action.
export const CAMERA_CODES = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyZ', 'KeyX', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'];
// Effective bindings: custom keys (string or array) override defaults; each code belongs to one action only (custom binds win, then list order).
export function bindings(settings) { const k = (settings && settings.keys) || {}; const m = {}, used = new Set();
  for (const [id] of ACTIONS) if (k[id] != null) { m[id] = [].concat(k[id]).filter(c => c && !used.has(c) && !CAMERA_CODES.includes(c)); m[id].forEach(c => used.add(c)); }
  for (const [id, , def] of ACTIONS) if (k[id] == null) { m[id] = def.filter(c => !used.has(c)); m[id].forEach(c => used.add(c)); }
  return m; }
// Rebind action id to code. A code held by another action is swapped: that action takes this action's old keys (or keeps its remaining ones). Returns an error string or null.
export function rebind(settings, id, code) { if (CAMERA_CODES.includes(code)) return 'That key moves the camera and cannot be rebound'; if (code === 'Escape') return null;
  const B = bindings(settings), keys = settings.keys = settings.keys || {}; const old = B[id];
  for (const o in B) if (o !== id && B[o].includes(code)) { const rest = B[o].filter(c => c !== code); keys[o] = rest.length ? rest : old.filter(c => c !== code); }
  keys[id] = [code]; return null; }
export function actionFor(code, settings) { const b = bindings(settings); for (const id in b) if (b[id].includes(code)) return id; return null; }
export const keyName = (c) => ({ Space: 'Space', Escape: 'Esc', Backquote: '`', Slash: '?', Equal: '+', Minus: '−', NumpadAdd: 'Num+', NumpadSubtract: 'Num−', Backspace: '⌫', Enter: 'Enter', Home: 'Home', Tab: 'Tab' }[c] || c.replace(/^Key|^Digit/, ''));
export function controlsHTML(settings, touch) {
  const b = bindings(settings); const rows = (list) => list.map(([a, d]) => `<tr><td><kbd>${a}</kbd></td><td>${d}</td></tr>`).join('');
  return `<div class="ctl-cols"><div><h4>Camera</h4><table>${rows(CAMERA_KEYS)}</table><h4>Mouse</h4><table>${rows(MOUSE)}</table></div>
  <div><h4>Keys</h4><table>${ACTIONS.map(([id, d]) => `<tr><td>${b[id].map(c => `<kbd>${keyName(c)}</kbd>`).join(' ')}</td><td>${d}</td></tr>`).join('')}</table></div>
  <div><h4>Touch</h4><table>${rows(TOUCH)}</table><p class="dim">Keys never fire while typing in a text box.</p></div></div>`;
}
