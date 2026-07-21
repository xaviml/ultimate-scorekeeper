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
    return { ...createInitialState(), ...(JSON.parse(raw) as GameState) };
  } catch {
    return null;
  }
}
