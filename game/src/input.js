// Keyboard input: held keys, pressed-this-frame edges, and helpers
// the game loop consumes once per frame.
const held = new Set();
const pressed = new Set();
let anyKey = false;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyE: 'enter',
  Space: 'punch',
  ShiftLeft: 'boost', ShiftRight: 'boost',
  KeyP: 'pause',
  Escape: 'pause',
  KeyM: 'mute',
  Enter: 'start',
};

export function initInput() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    const action = KEYMAP[e.code];
    if (!action) return;
    if (!held.has(action)) pressed.add(action);
    held.add(action);
    anyKey = true;
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) held.delete(action);
  });
  window.addEventListener('blur', () => { held.clear(); });
}

export function isHeld(action) { return held.has(action); }
export function wasPressed(action) { return pressed.has(action); }
export function endFrameInput() { pressed.clear(); anyKey = false; }
export function consumeAnyKey() { const v = anyKey; anyKey = false; return v; }

// Synthetic key events for headless play-tests: the game reads the same
// held/pressed sets, so a test can drive it like a player.
export function injectKey(code, down) {
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
}
