import { beforeEach, describe, expect, it } from 'vitest';
import { loadPersistedState } from '../state/persistence';
import { createInitialState, defaultConfig } from '../state/gameReducer';
import type { GameState } from '../state/types';

const STORAGE_KEY = 'ultimate-scorekeeper:game-state';

/** What a tab left open across a deploy has: the state an older build wrote. */
function storeAsOlderBuild(state: GameState, drop: string[]) {
  const raw = JSON.parse(JSON.stringify(state)) as { config: Record<string, unknown> };
  for (const key of drop) delete raw.config[key];
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
}

function playerModeGame(): GameState {
  const state = createInitialState(structuredClone(defaultConfig));
  state.phase = 'game';
  state.config.statsMode = 'players';
  state.config.trackTurnovers = true;
  return state;
}

beforeEach(() => sessionStorage.clear());

/** Rewrites the stored config the way a named older build wrote it. */
function storeWithLegacyConfig(patch: Record<string, unknown>, drop: string[] = []) {
  const state = playerModeGame();
  storeAsOlderBuild(state, ['statsMode', 'trackedTeam', 'trackTurnovers', ...drop]);
  const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
  Object.assign(raw.config, patch);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
}

describe('restoring a game stored by an older build', () => {
  it('reads the old trackPlayers boolean back as the closest stats mode', () => {
    storeWithLegacyConfig({ trackPlayers: true });

    const config = loadPersistedState()!.config;
    // Player-level detail for both teams is what that checkbox meant.
    expect(config.statsMode).toBe('players');
    expect(config.trackedTeam).toBeNull();
  });

  it('reads it back as no tracking at all when it was off', () => {
    storeWithLegacyConfig({ trackPlayers: false });

    expect(loadPersistedState()!.config.statsMode).toBe('none');
  });

  // The four-value statsMode the detail/features split replaced. Every one of them
  // recorded turnovers, and the two with a roster asked who scored, so a game stored
  // under any of them must come back doing exactly that.
  it("reads the legacy 'game' mode back as team-level detail, still recording turnovers", () => {
    storeWithLegacyConfig({ statsMode: 'game' });

    const config = loadPersistedState()!.config;
    expect(config.statsMode).toBe('teams');
    expect(config.trackedTeam).toBeNull();
    expect(config.trackTurnovers).toBe(true);
  });

  it("reads the legacy 'team' mode back as player detail narrowed to that team", () => {
    storeWithLegacyConfig({ statsMode: 'team', trackedTeam: 'B' });

    const config = loadPersistedState()!.config;
    expect(config.statsMode).toBe('players');
    expect(config.trackedTeam).toBe('B');
    expect(config.trackTurnovers).toBe(true);
    expect(config.trackGoalPlayers).toBe(true);
  });

  it("reads the legacy 'player' mode back as player detail across both teams", () => {
    storeWithLegacyConfig({ statsMode: 'player' });

    const config = loadPersistedState()!.config;
    expect(config.statsMode).toBe('players');
    expect(config.trackedTeam).toBeNull();
    expect(config.trackTurnovers).toBe(true);
    expect(config.trackGoalPlayers).toBe(true);
  });

  // The new defaults are off/on respectively, but applying them to a game stored
  // before the flags existed would change what it does halfway through.
  it('keeps recording turnovers for a game stored before the flag existed', () => {
    storeAsOlderBuild(playerModeGame(), ['trackTurnovers']);

    expect(loadPersistedState()!.config.trackTurnovers).toBe(true);
  });

  it('leaves the turnover flag as stored once the game carries one', () => {
    const state = playerModeGame();
    state.config.trackTurnovers = false;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    expect(loadPersistedState()!.config.trackTurnovers).toBe(false);
  });

  it('keeps asking who turned it over, the only thing that game has ever done', () => {
    storeAsOlderBuild(playerModeGame(), ['trackTurnoverPlayers']);

    // The new default is off, but applying it here would change what a game
    // already in progress does halfway through it.
    expect(loadPersistedState()!.config.trackTurnoverPlayers).toBe(true);
  });

  it('leaves the setting as stored once the game carries one', () => {
    const state = playerModeGame();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    expect(loadPersistedState()!.config.trackTurnoverPlayers).toBe(false);
  });
});

describe('restoring a game stored before line tracking existed', () => {
  // A new top-level config key needs no migration code: loadPersistedState spreads
  // defaultConfig underneath the stored config, so the default fills the gap.
  it('defaults the line settings rather than crashing on their absence', () => {
    storeAsOlderBuild(playerModeGame(), ['lines']);
    const config = loadPersistedState()!.config;
    expect(config.lines).toEqual(defaultConfig.lines);
    expect(config.lines.enabled).toBe(false);
  });

  it('defaults the live line state the same way', () => {
    const state = playerModeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    for (const key of ['line', 'pointLine', 'nextLine', 'lineName']) delete raw[key];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

    const restored = loadPersistedState()!;
    expect(restored.line).toEqual([]);
    expect(restored.pointLine).toEqual([]);
    expect(restored.nextLine).toBeNull();
    expect(restored.lineName).toBeNull();
  });
});
