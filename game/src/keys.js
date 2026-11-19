// Keyboard state for Sunset Bay. The loop asks two questions per
// frame: which actions are held down right now, and which were just
// pressed on this frame. Taps are cleared at the end of each frame so
// a single keypress is never read twice.
const downSet = new Set();
const tapSet = new Set();
let anyTap = false;

const BINDINGS = {
  KeyW: 'north', ArrowUp: 'north',
  KeyS: 'south', ArrowDown: 'south',
  KeyA: 'west', ArrowLeft: 'west',
  KeyD: 'east', ArrowRight: 'east',
  KeyE: 'act',
  Space: 'hit',
  ShiftLeft: 'dash', ShiftRight: 'dash',
  KeyP: 'hold',
  Escape: 'hold',
  KeyM: 'quiet',
  Enter: 'go',
};

export function wireKeys() {
  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Space') ev.preventDefault();
    const name = BINDINGS[ev.code];
    if (!name) return;
    if (!downSet.has(name)) tapSet.add(name);
    downSet.add(name);
    anyTap = true;
  });
  window.addEventListener('keyup', (ev) => {
    const name = BINDINGS[ev.code];
    if (name) downSet.delete(name);
  });
  window.addEventListener('blur', () => { downSet.clear(); });
}

export function held(name) { return downSet.has(name); }
export function tapped(name) { return tapSet.has(name); }
export function flushFrame() { tapSet.clear(); anyTap = false; }
export function takeAnyTap() { const v = anyTap; anyTap = false; return v; }

// Headless play-tests drive the game through the same key sets.
export function pushKey(code, isDown) {
  window.dispatchEvent(new KeyboardEvent(isDown ? 'keydown' : 'keyup', { code, bubbles: true }));
}
