import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState, gameReducer, secondHalfPullSide } from '../state/gameReducer';
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
  state.config.statsMode = 'player';
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
    expect(names).toEqual([
      'Roster',
      'Log',
      'Stoppage or SOTG',
      'What was called?',
      'Turnover — hold to undo',
    ]);
  });

  it('drops Roster and Turn when the game does not track activity', () => {
    const state = liveGame();
    state.config.statsMode = 'none';
    mount(state);

    expect(screen.queryByLabelText('Roster')).toBeNull();
    expect(screen.queryByLabelText('Turnover — hold to undo')).toBeNull();
    expect(screen.getByLabelText('What was called?')).toBeInTheDocument();
  });

  it('keeps Turn but drops Roster in Game stats mode, with no roster to view', () => {
    const state = liveGame();
    state.config = { ...state.config, statsMode: 'game' };
    mount(state);

    expect(screen.queryByLabelText('Roster')).toBeNull();
    expect(screen.getByLabelText('Turnover — hold to undo')).toBeInTheDocument();
  });

  it('logs a turnover straight away in Game stats mode, with no player dialog to ask', () => {
    const state = liveGame();
    state.config = { ...state.config, statsMode: 'game' };
    mount(state);

    const turn = screen.getByLabelText('Turnover — hold to undo');
    fireEvent.pointerDown(turn);
    fireEvent.pointerUp(turn);

    expect(screen.queryByText('Turnover')).toBeNull(); // TurnoverDialog never opened
    const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
    expect(stored.log.some((e: { type: string }) => e.type === 'turnover')).toBe(true);
  });

  it('shows both Roster and Turn in Team stats mode', () => {
    const state = liveGame();
    state.config = { ...state.config, statsMode: 'team', trackedTeam: 'A' };
    mount(state);

    expect(screen.getByLabelText('Roster')).toBeInTheDocument();
    expect(screen.getByLabelText('Turnover — hold to undo')).toBeInTheDocument();
  });

  it('labels every button but the stoppage one, which no short word covers', () => {
    mount(liveGame());
    expect(screen.getByLabelText('Turnover — hold to undo')).toHaveTextContent('Turn');
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
    state.pendingCall = { kind: 'foul', team: 'A', elapsedSeconds: 0 };
    mount(state);

    expect(screen.getByLabelText('What was called?')).toBeDisabled();
    expect(screen.getByLabelText('Turnover — hold to undo')).toBeDisabled();
    // The raised hand is the exception: an injury during a call is still an injury,
    // and raising it freezes the discussion rather than competing with it.
    expect(screen.getByLabelText('Stoppage or SOTG')).not.toBeDisabled();
    // Reading what has happened so far is never blocked.
    expect(screen.getByLabelText('Log')).not.toBeDisabled();
    expect(screen.getByLabelText('Roster')).not.toBeDisabled();
  });

  it('explains rather than goes dead when a stoppage is already open', () => {
    const state = liveGame();
    state.pendingStoppage = { kind: 'injury', team: 'A', elapsedSeconds: 5, clockStopped: false };
    mount(state);

    const hand = screen.getByLabelText('Stoppage or SOTG');
    expect(hand).not.toBeDisabled();
    fireEvent.click(hand);
    expect(screen.getByRole('tooltip')).toHaveTextContent(/already in progress/i);
    expect(screen.queryByText('What stopped play?')).toBeNull();
  });

  it('keeps Call and Turn tappable between points, but explains why on tap', () => {
    const state = liveGame();
    state.status = 'awaitingPull';
    state.possessionTeam = null; // the disc is dead until the pull is caught
    mount(state);

    // Nothing has happened yet for a call or a turnover to be about, but that's
    // a reason worth telling the volunteer, not a reason to go quietly dead.
    expect(screen.getByLabelText('What was called?')).not.toBeDisabled();
    expect(screen.getByLabelText('Turnover — hold to undo')).not.toBeDisabled();
    // An SOTG stoppage can still be called while the teams line up, and it is the
    // only way to stop the clock from here.
    expect(screen.getByLabelText('Stoppage or SOTG')).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText('What was called?'));
    expect(screen.getByRole('tooltip')).toHaveTextContent(/pull thrown/i);
  });
});

/**
 * Possession is only worth a chip in a game where someone is actually pressing
 * Turn — until then it is just the team that received the pull, which the pull
 * chip already says.
 */
describe('the possession chip', () => {
  const turnedOver = (overrides: Partial<GameState> = {}): GameState =>
    liveGame({
      possessionTeam: 'A',
      pointTurnovers: 1,
      log: [
        { id: 1, wallClock: '17:00:00', atMs: 0, gameSeconds: 10, type: 'turnover', team: 'B' },
      ],
      ...overrides,
    });

  it('shows from the first pull once the game tracks activity, with no turnover needed', () => {
    mount(liveGame());
    expect(screen.getByText('Possession: Team B')).toBeInTheDocument();
  });

  it('stays off the board entirely when the game does not track activity', () => {
    const state = liveGame();
    state.config.statsMode = 'none';
    mount(state);
    expect(screen.queryByText(/Possession/)).toBeNull();
  });

  it('names whoever has the disc once one has been', () => {
    mount(turnedOver());
    expect(screen.getByText('Possession: Team A')).toBeInTheDocument();
  });

  it('goes away between points, when the disc is dead', () => {
    mount(turnedOver({ status: 'awaitingPull', possessionTeam: null, pointTurnovers: 0 }));
    expect(screen.queryByText(/Possession/)).toBeNull();
  });

  it('follows a long-press on Turn back to the team that lost the disc', () => {
    vi.useFakeTimers();
    try {
      // Two turnovers this point (B → A → B), so undoing one still leaves the game
      // with a turnover in it and the chip on screen.
      mount(
        turnedOver({
          possessionTeam: 'B',
          pointTurnovers: 2,
          log: [
            { id: 1, wallClock: '17:00:00', atMs: 0, gameSeconds: 10, type: 'turnover', team: 'B' },
            { id: 2, wallClock: '17:00:20', atMs: 0, gameSeconds: 30, type: 'turnover', team: 'A' },
          ],
        }),
      );
      const turn = screen.getByLabelText('Turnover — hold to undo');

      fireEvent.pointerDown(turn);
      act(() => void vi.advanceTimersByTime(700));
      fireEvent.pointerUp(turn);

      // Back to A, and no turnover dialog: the hold replaced the tap.
      expect(screen.getByText('Possession: Team A')).toBeInTheDocument();
      expect(screen.queryByText('Turnover')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('explains itself rather than flipping possession with nothing to undo', () => {
    vi.useFakeTimers();
    try {
      mount(liveGame());
      const turn = screen.getByLabelText('Turnover — hold to undo');

      fireEvent.pointerDown(turn);
      act(() => void vi.advanceTimersByTime(700));
      fireEvent.pointerUp(turn);

      expect(screen.getByRole('tooltip')).toHaveTextContent(/no turnover to undo/i);
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * The pull chip used to hide for the whole half-time break — it only made sense
 * from 'awaitingPull' onward. Half-time settles who pulls next, and from which
 * side, the instant it starts (see goHalftime/secondHalfPuller/secondHalfPullSide
 * in the reducer), so the chip and the assistance bar both name it through the
 * break too, not just after HALFTIME_END applies it to pullingTeam/pullFromSide.
 */
describe('the pull chip and assistance bar through half-time', () => {
  function reachHalftime(scoringTeam: 'A' | 'B', halfScore: number): GameState {
    // statsMode explicitly 'none': in 'player' mode, GOAL holds the real assist back
    // in pendingGoalAssist for the scorer dialog instead of applying it (see
    // CLAUDE.md) — not what this test is about, and createInitialState()'s default
    // config object is shared/mutated by other tests in this file (liveGame() flips
    // it to 'player'), so relying on the default here would make this test
    // order-dependent.
    const config = { ...createInitialState().config, halfScore, statsMode: 'none' as const };
    let s = gameReducer(createInitialState(config), { type: 'START_GAME', config });
    s = gameReducer(s, { type: 'BEGIN_PLAY' });
    s = gameReducer(s, { type: 'PULL_THROWN' });
    s = gameReducer(s, { type: 'GOAL', team: scoringTeam });
    s.phase = 'game';
    return s;
  }

  it('names the second-half puller and side in the pull chip, not just from awaitingPull', () => {
    // halfScore 1, one goal (odd first-half point count) => no physical swap,
    // and A (startingOffense, the opening receiver) pulls the second half.
    const state = reachHalftime('B', 1);
    expect(state.status).toBe('halftime');
    mount(state);

    const side = secondHalfPullSide(state) === 'left' ? 'Left' : 'Right';
    expect(screen.getByText(`Pull: Team A (${side})`)).toBeInTheDocument();
  });

  it('shows the call-out naming the next puller and the side they pull from', () => {
    const state = reachHalftime('B', 1);
    expect(state.assist).toBe('goHalftime');
    mount(state);

    const side = secondHalfPullSide(state) === 'left' ? 'Left' : 'Right';
    expect(screen.getByText(`"Half-time! Team A pulls from the ${side}!"`)).toBeInTheDocument();
  });

  it('keeps naming it in the ambient line once the call-out has had its moment', () => {
    const state = reachHalftime('B', 1);
    // Force the amber fallback deterministically, the same way the open-call
    // tests do, rather than fast-forwarding the 7s transient window.
    state.assist = 'idle';
    mount(state);

    const side = secondHalfPullSide(state) === 'left' ? 'Left' : 'Right';
    expect(
      screen.getByText(new RegExp(`Half-time break — Team A pulls from the ${side}\\b`)),
    ).toBeInTheDocument();
  });
});

describe('the resolution rows above the clocks', () => {
  it('shows the three call answers while a call is the only thing open', () => {
    const state = liveGame();
    state.pendingCall = { kind: 'foul', team: 'A', elapsedSeconds: 12 };
    mount(state);

    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Contested')).toBeInTheDocument();
    expect(screen.getByText('Retracted')).toBeInTheDocument();
  });

  it('replaces them with the stoppage answer once a stoppage freezes the discussion', () => {
    const state = liveGame();
    state.pendingCall = { kind: 'foul', team: 'A', elapsedSeconds: 12 };
    state.pendingStoppage = { kind: 'injury', team: 'B', elapsedSeconds: 3, clockStopped: false };
    mount(state);

    expect(screen.queryByText('Accepted')).toBeNull();
    expect(screen.queryByText('Contested')).toBeNull();
    expect(screen.queryByText('Retracted')).toBeNull();
    expect(screen.getByText('Play can resume')).toBeInTheDocument();
  });

  it('does the same for an SOTG pause, which offers "Resume game" instead', () => {
    const state = liveGame();
    state.pendingCall = { kind: 'foul', team: 'A', elapsedSeconds: 12 };
    state.status = 'paused';
    state.statusBeforePause = 'live';
    mount(state);

    expect(screen.queryByText('Accepted')).toBeNull();
    expect(screen.getByText('Resume game')).toBeInTheDocument();
  });

  it('gives the call answers back, with the call still open, once play resumes', () => {
    const state = liveGame();
    state.pendingCall = { kind: 'foul', team: 'A', elapsedSeconds: 12 };
    state.pendingStoppage = { kind: 'injury', team: 'B', elapsedSeconds: 3, clockStopped: false };
    mount(state);

    fireEvent.click(screen.getByText('Play can resume'));

    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.queryByText('Play can resume')).toBeNull();
  });
});

describe('the stoppage dialog', () => {
  // Play has already stopped on the field by the time this dialog is open, so all
  // three kinds are offered at every moment of a game in progress — between points
  // and during a break included, where they used to be refused.
  it.each([
    ['live', { status: 'live' } as const],
    ['awaitingPull', { status: 'awaitingPull', possessionTeam: null } as const],
    ['timeout', { status: 'timeout', timeoutTeam: 'A' } as const],
    ['halftime', { status: 'halftime' } as const],
  ])('offers injury, technical and SOTG during %s', (_name, overrides) => {
    mount(liveGame(overrides));
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
