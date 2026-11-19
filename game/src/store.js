// Save / load through localStorage. Guarded so importing this in Node (for
// the smoke test) never throws.

const KEY = 'sunset-bay-save-v1';

export function saveGame(state) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: state.cash,
      missionsDone: state.missions.done.slice(),
      missionIndex: state.missions.index,
      bestStars: state.bestStars,
      playerX: state.player.x,
      playerY: state.player.y,
      savedAt: Date.now(),
    }));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* ignore */
  }
}
