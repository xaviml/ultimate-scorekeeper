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
 *
 * `trackTurnoverPlayers` is the same story one deploy later: before it existed,
 * a game with a roster always asked who turned it over, so a stored config from
 * then comes back with it on. Defaulting it to `false` there would change what a
 * game already in progress does halfway through it — the new default belongs to
 * games set up under the new build, which write the field themselves.
 */
function migrateStoredConfig(
  stored: Partial<GameConfig> & { trackPlayers?: boolean },
): Partial<GameConfig> {
  let config = stored;
  if (config.statsMode === undefined && typeof config.trackPlayers === 'boolean') {
    config = { ...config, statsMode: config.trackPlayers ? 'player' : 'none', trackedTeam: null };
  }
  if (config.trackTurnoverPlayers === undefined) {
    config = { ...config, trackTurnoverPlayers: true };
  }
  return config;
}

/**
 * A stored game read back as a state this build can run.
 *
 * Layered over fresh initial state so a game stored by an older build — a tab left
 * open across a deploy, or a game filed in the archive months ago — comes back with
 * any field added since defaulted rather than undefined. JSON never emits absent
 * keys, so nothing real is lost. `config` is layered the same way for the same
 * reason: it is one stored object, so a config setting added since (waterBreaks,
 * say) would otherwise come back undefined and crash the first reducer that reads
 * through it. `id` falls out of the same rule — a game stored before games had one
 * is handed a fresh one here.
 *
 * Shared with the archive of past games (`gameHistory.ts`) deliberately: both read
 * a whole `GameState` back out of storage, and a report drawn from a state missing
 * a field added since would break in exactly the same way.
 */
export function reviveGameState(stored: GameState): GameState {
  const fresh = createInitialState();
  return {
    ...fresh,
    ...stored,
    config: { ...fresh.config, ...migrateStoredConfig(stored.config) },
  };
}

export function loadPersistedState(): GameState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return reviveGameState(JSON.parse(raw) as GameState);
  } catch {
    return null;
  }
}
