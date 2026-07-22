import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';

function mountWith(state: GameState) {
  sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
  return render(
    <I18nProvider>
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.useRealTimers());

describe('the secondary clock while a call, stoppage or SOTG stoppage is open', () => {
  it('counts up since the call was made, labelled with the call kind', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'live';
    state.gameSeconds = 37;
    state.pendingCall = { kind: 'foul', team: 'A', startedAtSeconds: 10 };
    mountWith(state);

    expect(screen.getByText('Foul')).toBeInTheDocument();
    expect(screen.getByText('00:27')).toBeInTheDocument();
  });

  it('counts up since the stoppage was logged, labelled "Injury"', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'live';
    state.gameSeconds = 50;
    state.pendingStoppage = {
      kind: 'injury',
      team: 'B',
      elapsedSeconds: 45,
      clockStopped: false,
    };
    mountWith(state);

    expect(screen.getByText('Injury')).toBeInTheDocument();
    expect(screen.getByText('00:45')).toBeInTheDocument();
  });

  it('counts up on the wall clock during an SOTG stoppage, since the game clock is frozen', () => {
    const base = new Date('2024-06-01T10:00:00').getTime();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(base + 45_000));

    const state = createInitialState();
    state.phase = 'game';
    state.status = 'paused';
    state.statusBeforePause = 'live';
    state.gameSeconds = 0; // frozen — proves the SOTG timer can't be reading this
    state.log = [
      {
        id: 1,
        wallClock: '10:00:00',
        atMs: base,
        gameSeconds: 0,
        type: 'sotgStart',
      },
    ];
    mountWith(state);

    expect(screen.getByText('Spirit stoppage')).toBeInTheDocument();
    expect(screen.getByText('00:45')).toBeInTheDocument();
  });
});
