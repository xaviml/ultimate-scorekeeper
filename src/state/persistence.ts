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
 * Every stored config, from any build, read back as one this build behaves the same
 * way on. The rule throughout is that a setting added since must come back as
 * whatever that game was already doing — a tab left open across a deploy, or a game
 * filed in the archive months ago, must not change behaviour halfway through or
 * re-render its report differently. The new defaults belong to games set up under
 * the new build, which write the fields themselves.
 *
 * Three deploys are layered here, oldest first:
 *
 * - The "Track game activity" checkbox that `statsMode` replaced: `true` was full
 *   player-level tracking, `false` was nothing.
 * - The four-value `statsMode` (`none`/`game`/`team`/`player`) that the detail +
 *   opt-in-features split replaced. `game` became `teams`; `team` and `player`
 *   became `players`, differing only in whether one team is named. All of them
 *   recorded turnovers, and the two with a roster asked who scored, so those flags
 *   come back on.
 * - `trackTurnoverPlayers`: before it existed a game with a roster always asked who
 *   turned it over.
 */
/** A stored config's `statsMode` is whatever the build that wrote it used, so it is read as a plain string and narrowed here. */
type StoredConfig = Omit<Partial<GameConfig>, 'statsMode'> & {
  trackPlayers?: boolean;
  statsMode?: string;
};

function migrateStoredConfig(stored: StoredConfig): Partial<GameConfig> {
  let config = stored;
  if (config.statsMode === undefined && typeof config.trackPlayers === 'boolean') {
    config = { ...config, statsMode: config.trackPlayers ? 'player' : 'none', trackedTeam: null };
  }
  // The legacy four-value set. `trackedTeam` is kept as stored for 'team' (the one
  // mode that named a team) and cleared for 'player', which followed both.
  if (config.statsMode === 'game') {
    config = { ...config, statsMode: 'teams', trackedTeam: null, trackTurnovers: true };
  } else if (config.statsMode === 'team' || config.statsMode === 'player') {
    config = {
      ...config,
      statsMode: 'players',
      trackedTeam: config.statsMode === 'team' ? (config.trackedTeam ?? 'A') : null,
      trackTurnovers: true,
      trackGoalPlayers: true,
    };
  }
  if (config.trackTurnovers === undefined) {
    // Anything still unmigrated predates the flag, where tracking at all meant a
    // Turn button; 'none' ignores it either way (see turnoversTracked).
    config = { ...config, trackTurnovers: true };
  }
  if (config.trackGoalPlayers === undefined) {
    config = { ...config, trackGoalPlayers: true };
  }
  if (config.trackTurnoverPlayers === undefined) {
    config = { ...config, trackTurnoverPlayers: true };
  }
  return config as Partial<GameConfig>;
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
