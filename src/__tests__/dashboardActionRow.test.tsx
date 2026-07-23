import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';

/**
 * The dashboard after Record event was broken up: the action row holds Roster,
 * Log, Stoppage, Call and Turn, the timeouts moved onto the score panels, and
 * leaving the game moved into the header.
 */
function liveGame(overrides: Partial<GameState> = {}): GameState {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'live';
  state.possessionTeam = 'B';
  state.offenseTeam = 'B';
  state.pullingTeam = 'A';
  state.config.trackPlayers = true;
  state.config.timeouts = { ...state.config.timeouts, enabled: true, perHalf: 2, perGame: null };
  return { ...state, ...overrides };
}

function mount(state: GameState) {
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

describe('the action row', () => {
  it('is Roster, Log, Stoppage, Call, Turn in that order', () => {
    mount(liveGame());
    const row = screen.getByLabelText('Roster').parentElement as HTMLElement;
    const names = within(row)
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['Roster', 'Log', 'Stoppage or SOTG', 'What was called?', 'Turn']);
  });

  it('drops Roster, and only Roster, when the game does not track players', () => {
    const state = liveGame();
    state.config.trackPlayers = false;
    mount(state);

    expect(screen.queryByLabelText('Roster')).toBeNull();
    // Turn is not gated on player tracking — a turnover is still worth logging.
    expect(screen.getByLabelText('Turn')).toBeInTheDocument();
    expect(screen.getByLabelText('What was called?')).toBeInTheDocument();
  });

  it('labels every button but the stoppage one, which no short word covers', () => {
    mount(liveGame());
    expect(screen.getByLabelText('Turn')).toHaveTextContent('Turn');
    expect(screen.getByLabelText('Log')).toHaveTextContent('Log');
    expect(screen.getByLabelText('Roster')).toHaveTextContent('Roster');
    expect(screen.getByLabelText('What was called?')).toHaveTextContent('Call');
    expect(screen.getByLabelText('Stoppage or SOTG')).toHaveTextContent('');
  });

  it('opens the call menu with travel in it and nothing that is not a call', () => {
    mount(liveGame());
    fireEvent.click(screen.getByLabelText('What was called?'));

    expect(screen.getByText('Foul')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.queryByText('SOTG')).toBeNull();
  });

  it('offers injury, technical and SOTG behind the raised hand', () => {
    mount(liveGame());
    fireEvent.click(screen.getByLabelText('Stoppage or SOTG'));

    expect(screen.getByText('Injury')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('SOTG')).toBeInTheDocument();
  });

  it('disables the recording buttons while a call is unresolved, but not the reading ones', () => {
    const state = liveGame();
    state.pendingCall = { kind: 'foul', team: 'A', startedAtSeconds: 0, elapsedSeconds: 0 };
    mount(state);

    expect(screen.getByLabelText('What was called?')).toBeDisabled();
    expect(screen.getByLabelText('Turn')).toBeDisabled();
    expect(screen.getByLabelText('Stoppage or SOTG')).toBeDisabled();
    // Reading what has happened so far is never blocked.
    expect(screen.getByLabelText('Log')).not.toBeDisabled();
    expect(screen.getByLabelText('Roster')).not.toBeDisabled();
  });

  it('disables Call and Turn between points, but leaves the raised hand for SOTG', () => {
    const state = liveGame();
    state.status = 'awaitingPull';
    state.possessionTeam = null; // the disc is dead until the pull is caught
    mount(state);

    expect(screen.getByLabelText('What was called?')).toBeDisabled();
    expect(screen.getByLabelText('Turn')).toBeDisabled();
    // An SOTG stoppage can still be called while the teams line up, and it is the
    // only way to stop the clock from here.
    expect(screen.getByLabelText('Stoppage or SOTG')).not.toBeDisabled();
  });
});

describe('the stoppage dialog before the pull', () => {
  it('offers SOTG but not injury or technical', () => {
    const state = liveGame();
    state.status = 'awaitingPull';
    state.possessionTeam = null;
    mount(state);

    fireEvent.click(screen.getByLabelText('Stoppage or SOTG'));
    expect(screen.getByText('Injury')).toBeDisabled();
    expect(screen.getByText('Technical')).toBeDisabled();
    expect(screen.getByText('SOTG')).not.toBeDisabled();
    expect(screen.getByText(/need the pull thrown first/)).toBeInTheDocument();
  });

  it('offers all three once the disc is live', () => {
    mount(liveGame());
    fireEvent.click(screen.getByLabelText('Stoppage or SOTG'));

    expect(screen.getByText('Injury')).not.toBeDisabled();
    expect(screen.getByText('Technical')).not.toBeDisabled();
    expect(screen.getByText('SOTG')).not.toBeDisabled();
  });
});

describe('timeouts on the score panels', () => {
  it('gives each team its own, showing the count it had under the clocks', () => {
    mount(liveGame());
    expect(screen.getByLabelText('Team A — 2 timeouts left')).toBeInTheDocument();
    expect(screen.getByLabelText('Team B — 2 timeouts left')).toBeInTheDocument();
  });

  it('shows none at all when the game is configured without timeouts', () => {
    const state = liveGame();
    state.config.timeouts = { ...state.config.timeouts, enabled: false };
    mount(state);
    expect(screen.queryByLabelText(/timeouts left/)).toBeNull();
  });
});

describe('the header leave control', () => {
  it('is a cross once the game is under way', () => {
    mount(liveGame());
    expect(screen.getByLabelText('End game')).toBeInTheDocument();
    expect(screen.queryByLabelText('Back to setup')).toBeNull();
  });

  it('stays put once the game is finished, going straight to the report', () => {
    const state = liveGame();
    state.status = 'finished';
    mount(state);

    // No longer "End game" — the game is already over, so there is nothing to confirm.
    expect(screen.getByLabelText('Open report')).toBeInTheDocument();
    expect(screen.queryByText('End game?')).toBeNull();
  });
});
