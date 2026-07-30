import { createInitialState } from './gameReducer';
import type { GameConfig, GameState } from './types';

const STORAGE_KEY = 'ultimate-scorekeeper:game-state';

export function persistState(state: GameState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode, quota, ...) — game still works in-memory */
  }
}

/**
 * A tab left open across the deploy that replaced the old "Track game activity"
 * checkbox with `statsMode`/`trackedTeam` still has the boolean in its persisted
 * config. Read it back as the closest new mode instead of losing tracking on
 * reload: `true` was full player-level tracking (`player`), `false` was `none`.
 */
function migrateStoredConfig(
  stored: Partial<GameConfig> & { trackPlayers?: boolean },
): Partial<GameConfig> {
  if (stored.statsMode !== undefined || typeof stored.trackPlayers !== 'boolean') return stored;
  return { ...stored, statsMode: stored.trackPlayers ? 'player' : 'none', trackedTeam: null };
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
    return {
      ...fresh,
      ...stored,
      config: { ...fresh.config, ...migrateStoredConfig(stored.config) },
    };
  } catch {
    return null;
  }
}
