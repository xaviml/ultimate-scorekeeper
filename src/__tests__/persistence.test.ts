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
  state.config.statsMode = 'player';
  return state;
}

beforeEach(() => sessionStorage.clear());

describe('restoring a game stored by an older build', () => {
  it('reads the old trackPlayers boolean back as the closest stats mode', () => {
    const state = playerModeGame();
    storeAsOlderBuild(state, ['statsMode', 'trackedTeam']);
    const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
    raw.config.trackPlayers = true;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

    expect(loadPersistedState()!.config.statsMode).toBe('player');
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
