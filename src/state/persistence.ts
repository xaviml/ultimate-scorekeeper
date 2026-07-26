import { createInitialState } from './gameReducer';
import type { GameState } from './types';

const STORAGE_KEY = 'ultimate-scorekeeper:game-state';

export function persistState(state: GameState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode, quota, ...) — game still works in-memory */
  }
}

export function loadPersistedState(): GameState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // Layered over fresh initial state so a game stored by an older build — a tab
    // left open across a deploy — comes back with any field added since defaulted
    // rather than undefined. JSON never emits absent keys, so nothing real is lost.
    // `config` is layered the same way for the same reason: it is one stored object,
    // so a config setting added since (waterBreaks, say) would otherwise come back
    // undefined and crash the first reducer that reads through it.
    const fresh = createInitialState();
    const stored = JSON.parse(raw) as GameState;
    return { ...fresh, ...stored, config: { ...fresh.config, ...stored.config } };
  } catch {
    return null;
  }
}
