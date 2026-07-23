import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { defaultConfig } from '../state/gameReducer';
import { GameProvider } from '../state/GameContext';
import { useGame, useGameDispatch } from '../state/gameHooks';
import ConfigScreen from '../components/ConfigScreen';

/**
 * Starts a game with an already-configured startingTime and immediately sends it back to
 * the config screen (as ReportScreen's "back to config" button does), without a page reload.
 */
function GameThenBackToConfig({ startingTime }: { startingTime: string }) {
  const dispatch = useGameDispatch();
  const state = useGame();
  return (
    <div>
      <button
        onClick={() =>
          dispatch({
            type: 'START_GAME',
            config: {
              ...defaultConfig,
              teams: {
                A: { ...defaultConfig.teams.A, name: 'Foxes' },
                B: { ...defaultConfig.teams.B, name: 'Wolves' },
              },
              startingTime: { enabled: true, time: startingTime },
            },
          })
        }
      >
        start game
      </button>
      <button onClick={() => dispatch({ type: 'BACK_TO_CONFIG' })}>back to config</button>
      {state.phase !== 'game' && <ConfigScreen />}
    </div>
  );
}

function renderGameThenBackToConfig(startingTime: string) {
  return render(
    <I18nProvider>
      <GameProvider>
        <GameThenBackToConfig startingTime={startingTime} />
      </GameProvider>
    </I18nProvider>,
  );
}

/** Labels sit above their input as plain sibling text, not an associated <label for>. */
function startingTimeInput(): HTMLInputElement {
  const label = screen.getByText('Starting time');
  return label.parentElement!.querySelector('input') as HTMLInputElement;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('config screen starting time refresh', () => {
  it('refreshes a past starting time to the next quarter-hour when coming back from the game screen', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 20, 25, 0));

    renderGameThenBackToConfig('20:00');
    fireEvent.click(screen.getByText('start game'));
    fireEvent.click(screen.getByText('back to config'));

    expect(startingTimeInput().value).toBe('20:30');
  });

  it('keeps a starting time that is still in the future untouched', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 20, 25, 0));

    renderGameThenBackToConfig('20:45');
    fireEvent.click(screen.getByText('start game'));
    fireEvent.click(screen.getByText('back to config'));

    expect(startingTimeInput().value).toBe('20:45');
  });
});
