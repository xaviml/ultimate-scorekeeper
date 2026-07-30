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

/** Labels sit above their input as plain sibling text, not an associated <label for>. */
function fieldSelect(labelText: string): HTMLSelectElement {
  const label = screen.getByText(labelText);
  return label.parentElement!.querySelector('select') as HTMLSelectElement;
}

const ROSTER_HELP_TEXT =
  "You can add players once the game is underway — there's no need to fill in the full roster before kickoff.";

/** The Roster section only exists at all once a mode with a roster is picked. */
function pickPlayerStats() {
  fireEvent.change(fieldSelect('What to track'), { target: { value: 'player' } });
}

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
              statsMode: 'player',
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
  it('does not exist at all while the game is not tracking a roster', () => {
    renderConfigScreen();

    expect(screen.queryByText(ROSTER_HELP_TEXT)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Expand Roster' })).toBeNull();

    fireEvent.change(fieldSelect('What to track'), { target: { value: 'game' } });
    expect(screen.queryByRole('button', { name: 'Expand Roster' })).toBeNull();
  });

  it('appears, collapsed by default, once Team or Player stats is picked', () => {
    renderConfigScreen();
    pickPlayerStats();

    expect(screen.queryByText(ROSTER_HELP_TEXT)).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand Roster' })).toBeInTheDocument();
  });

  it('expands on toggle, showing the roster editors', () => {
    renderConfigScreen();
    pickPlayerStats();

    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));

    expect(screen.getByText(ROSTER_HELP_TEXT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse Roster' })).toBeInTheDocument();
  });

  it('stays collapsed on a fresh reload even if it was left expanded last time', () => {
    const { unmount } = renderConfigScreen();
    pickPlayerStats();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    unmount();

    // A new render with no BACK_TO_CONFIG in between simulates a reload.
    renderConfigScreen();
    pickPlayerStats();

    expect(screen.queryByText(ROSTER_HELP_TEXT)).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand Roster' })).toBeInTheDocument();
  });

  it('reopens expanded when coming back from the game screen, not a reload', () => {
    renderGameThenBackToConfig();
    pickPlayerStats();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));

    fireEvent.click(screen.getByText('start game'));
    fireEvent.click(screen.getByText('back to config'));

    expect(screen.getByText(ROSTER_HELP_TEXT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse Roster' })).toBeInTheDocument();
  });

  it('stays collapsed coming back from the game screen if it was never expanded', () => {
    renderGameThenBackToConfig();

    fireEvent.click(screen.getByText('start game'));
    fireEvent.click(screen.getByText('back to config'));

    expect(screen.queryByText(ROSTER_HELP_TEXT)).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand Roster' })).toBeInTheDocument();
  });
});
