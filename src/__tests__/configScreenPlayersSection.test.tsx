import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { defaultConfig } from '../state/gameReducer';
import { GameProvider } from '../state/GameContext';
import { useGame, useGameDispatch } from '../state/gameHooks';
import ConfigScreen from '../components/ConfigScreen';

function renderConfigScreen() {
  return render(
    <I18nProvider>
      <GameProvider>
        <ConfigScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

const TRACK_PLAYERS_LABEL = 'Track player activity (goals, assists, turnovers, defense, injuries)';

/**
 * Starts a game and immediately sends it back to the config screen (as ReportScreen's
 * "back to config" button does), without a page reload — the one case where a
 * previously-expanded Players section should reappear expanded.
 */
function GameThenBackToConfig() {
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

function renderGameThenBackToConfig() {
  return render(
    <I18nProvider>
      <GameProvider>
        <GameThenBackToConfig />
      </GameProvider>
    </I18nProvider>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('config screen players section', () => {
  it('is collapsed by default on a fresh load', () => {
    renderConfigScreen();

    expect(screen.queryByText(TRACK_PLAYERS_LABEL)).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand Players' })).toBeInTheDocument();
  });

  it('expands on toggle, showing the roster editors', () => {
    renderConfigScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Expand Players' }));

    expect(screen.getByText(TRACK_PLAYERS_LABEL)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse Players' })).toBeInTheDocument();
  });

  it('stays collapsed on a fresh reload even if it was left expanded last time', () => {
    const { unmount } = renderConfigScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Players' }));
    unmount();

    // A new render with no BACK_TO_CONFIG in between simulates a reload.
    renderConfigScreen();

    expect(screen.queryByText(TRACK_PLAYERS_LABEL)).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand Players' })).toBeInTheDocument();
  });

  it('reopens expanded when coming back from the game screen, not a reload', () => {
    renderGameThenBackToConfig();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Players' }));

    fireEvent.click(screen.getByText('start game'));
    fireEvent.click(screen.getByText('back to config'));

    expect(screen.getByText(TRACK_PLAYERS_LABEL)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse Players' })).toBeInTheDocument();
  });

  it('stays collapsed coming back from the game screen if it was never expanded', () => {
    renderGameThenBackToConfig();

    fireEvent.click(screen.getByText('start game'));
    fireEvent.click(screen.getByText('back to config'));

    expect(screen.queryByText(TRACK_PLAYERS_LABEL)).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand Players' })).toBeInTheDocument();
  });
});
