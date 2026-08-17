import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState, gameReducer, secondHalfPullSide } from '../state/gameReducer';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';
import { hold, tap } from './gestures';

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
  // Cloned rather than mutated in place: createInitialState hands out the
  // defaultConfig singleton by reference (see dialogs.test.tsx). Turnover players
  // are asked for here — off by default, so a test wanting the dialog says so.
  state.config = { ...state.config, statsMode: 'player', trackTurnoverPlayers: true };
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

    tap(screen.getByLabelText('Turnover — hold to undo'));

    expect(screen.queryByText('Turnover')).toBeNull(); // TurnoverDialog never opened
    const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
    expect(stored.log.some((e: { type: string }) => e.type === 'turnover')).toBe(true);
  });

  it('logs a turnover straight away when the game does not ask who turned it over', () => {
    const state = liveGame();
    // Player stats, full roster — but the setting behind the question is off,
    // which is the default: Turn registers and the row is free again.
    state.config = { ...state.config, trackTurnoverPlayers: false };
    mount(state);

    tap(screen.getByLabelText('Turnover — hold to undo'));

    expect(screen.queryByText('Turnover')).toBeNull(); // TurnoverDialog never opened
    const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
    expect(stored.log.some((e: { type: string }) => e.type === 'turnover')).toBe(true);
  });

  it('asks who turned it over once the game is set up to ask', () => {
    mount(liveGame());

    tap(screen.getByLabelText('Turnover — hold to undo'));

    expect(screen.getByText('Turnover')).toBeInTheDocument();
    const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
    // Nothing is logged until the dialog is saved — the players are part of the entry.
    expect(stored.log.some((e: { type: string }) => e.type === 'turnover')).toBe(false);
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
 * Possession is a 3 px rule between the score panels and the action row, lit on
 * the half belonging to whoever holds the disc — it replaced a chip that spelled
 * out a name already on screen in 52 px letters. It carries no wording, so these
 * read the `data-possession` attribute the strip exposes for exactly that reason.
 *
 * The rule is only worth drawing in a game where someone is actually pressing
 * Turn; in `none` there is no Turn button, so the fill could never move.
 */
describe('the possession rule', () => {
  const rule = () => document.querySelector('[data-possession]');
  /** The lit half, or null when the disc is dead. */
  const fill = () => rule()?.querySelector('div') ?? null;

  const turnedOver = (overrides: Partial<GameState> = {}): GameState =>
    liveGame({
      possessionTeam: 'A',
      pointTurnovers: 1,
      log: [
        { id: 1, wallClock: '17:00:00', atMs: 0, gameSeconds: 10, type: 'turnover', team: 'B' },
      ],
      ...overrides,
    });

  it('is lit from the first pull once the game tracks activity, with no turnover needed', () => {
    mount(liveGame());
    expect(rule()).toHaveAttribute('data-possession', 'B');
    expect(fill()).not.toBeNull();
  });

  it('stays off the board entirely when the game does not track activity', () => {
    const state = liveGame();
    state.config.statsMode = 'none';
    mount(state);
    expect(rule()).toBeNull();
  });

  it('moves to whoever has the disc once one has been turned over', () => {
    mount(turnedOver());
    expect(rule()).toHaveAttribute('data-possession', 'A');
  });

  it('lights the half the holding team sits on, not always the same one', () => {
    const state = liveGame();
    // startingSide fixes the left panel for the whole game; whichever team is not
    // on it gets the fill pushed across to the right half.
    const right = state.config.startingSide === 'A' ? 'B' : 'A';
    mount(liveGame({ possessionTeam: right }));
    expect(fill()?.className).toContain('translate-x-full');

    cleanup();
    mount(liveGame({ possessionTeam: state.config.startingSide }));
    expect(fill()?.className).not.toContain('translate-x-full');
  });

  it('keeps its track but goes dark between points, when the disc is dead', () => {
    mount(turnedOver({ status: 'awaitingPull', possessionTeam: null, pointTurnovers: 0 }));
    expect(rule()).toHaveAttribute('data-possession', 'none');
    expect(fill()).toBeNull();
  });

  it('follows a long-press on Turn back to the team that lost the disc', () => {
    vi.useFakeTimers();
    try {
      // Two turnovers this point (B → A → B), so undoing one still leaves the game
      // with a turnover in it.
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
      hold(screen.getByLabelText('Turnover — hold to undo'));

      // Back to A, and no turnover dialog: the hold replaced the tap.
      expect(rule()).toHaveAttribute('data-possession', 'A');
      expect(screen.queryByText('Turnover')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('explains itself rather than flipping possession with nothing to undo', () => {
    vi.useFakeTimers();
    try {
      mount(liveGame());
      hold(screen.getByLabelText('Turnover — hold to undo'));

      expect(screen.getByRole('tooltip')).toHaveTextContent(/no turnover to undo/i);
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * A tap that opens a dialog must not be able to land inside the dialog it opened.
 * On a touch screen the compatibility `click` after a release is hit-tested against
 * the DOM *as it is then*: with the tap firing on `pointerup`, Turn opened
 * TurnoverDialog as a bottom sheet whose Save button overlapped the bottom edge of
 * Turn, and the tap's own click hit Save — turnover recorded with nobody attributed,
 * dialog gone before it could be read. jsdom cannot lay the two out on top of each
 * other, so what is pinned here is the ordering that makes the overlap harmless.
 */
describe('the tap rides the click, not the pointerup', () => {
  it('leaves nothing for the click to reach by acting before it', () => {
    mount(liveGame());
    const turn = screen.getByLabelText('Turnover — hold to undo');

    fireEvent.pointerDown(turn);
    fireEvent.pointerUp(turn);
    expect(screen.queryByText('Turnover')).toBeNull(); // nothing yet — the dialog waits

    fireEvent.click(turn);
    expect(screen.getByText('Turnover')).toBeInTheDocument();
  });
});

/**
 * The count on the Turn button. Its real job is confirming a press landed: when
 * the disc goes back to a team that has already held it this point, the rule
 * returns to a half it has been on before and nothing else on screen moves.
 */
describe('the turn count badge', () => {
  const turnButton = () => screen.getByLabelText('Turnover — hold to undo');

  it('is absent before anything has been turned over', () => {
    mount(liveGame());
    expect(turnButton()).toHaveTextContent(/^Turn$/);
  });

  it('appears at the first turnover of the point', () => {
    mount(liveGame({ pointTurnovers: 1 }));
    expect(turnButton()).toHaveTextContent('1');
  });

  it('counts the point, not the game', () => {
    // Nine turnovers already in this game, but the point being played is clean.
    mount(liveGame({ pointTurnovers: 0, turnoversCommitted: { A: 5, B: 4 } }));
    expect(turnButton()).toHaveTextContent(/^Turn$/);
  });

  it('caps at 9+ so the disc keeps one size', () => {
    mount(liveGame({ pointTurnovers: 9 }));
    expect(turnButton()).toHaveTextContent('9');
    cleanup();

    mount(liveGame({ pointTurnovers: 10 }));
    expect(turnButton()).toHaveTextContent('9+');
  });

  it('stays up through a timeout, where the point has not ended and the count still holds', () => {
    mount(liveGame({ status: 'timeout', pointTurnovers: 2 }));
    expect(turnButton()).toHaveTextContent('2');
  });

  it('stays up while the button itself is refused, fading with it', () => {
    // A pause is one of the few things that actually disables Turn (a timeout
    // does not — the button stays live and tryTurnover explains the refusal).
    // The count is still true, so it is left inside `disabled`'s fade.
    mount(liveGame({ status: 'paused', pointTurnovers: 2 }));
    const turn = turnButton();
    expect(turn).toBeDisabled();
    expect(turn).toHaveTextContent('2');
    expect(turn.className).toContain('disabled:opacity-40');
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

describe('the resolution rows', () => {
  it('shows the three call answers while a call is the only thing open', () => {
    const state = liveGame();
    state.pendingCall = { kind: 'foul', team: 'A', elapsedSeconds: 12 };
    mount(state);

    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Contested')).toBeInTheDocument();
    expect(screen.getByText('Retracted')).toBeInTheDocument();
  });

  // The call answers share the action row's reserved slot with "Pull thrown" and
  // friends, which is only safe because a call can be open in no status that puts a
  // button there: CALL_MADE needs a live disc, and canScore/timeoutAvailability
  // refuse while one is pending, so the status cannot leave 'live' underneath it.
  // If a future rule lets a call outlive the point, this is what catches it.
  it.each([
    ['notStarted', 'Start game'],
    ['awaitingPull', 'Pull thrown'],
    ['timeout', 'End timeout'],
    ['halftime', 'End half-time'],
    ['waterBreak', 'End water break'],
    ['finished', 'Open report'],
  ] as const)('refuses to open a call in %s, whose slot is taken by "%s"', (status, label) => {
    const state = liveGame({ status });
    mount(state);

    expect(screen.getByText(label)).toBeInTheDocument();

    const next = gameReducer(state, { type: 'CALL_MADE', kind: 'foul', team: 'A' });
    expect(next.pendingCall).toBeNull();
  });

  it('puts the answers in the reserved slot, and hands it back empty', () => {
    const state = liveGame();
    state.pendingCall = { kind: 'foul', team: 'A', elapsedSeconds: 12 };
    state.pointStartSeconds = 0; // a point in progress, so the stats pager has something to show
    mount(state);

    // The slot itself, identified by the min-height that keeps the score panels
    // above from resizing — that reservation is what the answers are borrowing.
    const slot = (screen.getByText('Accepted').closest('div') as HTMLElement)
      .parentElement as HTMLElement;
    expect(slot.className).toContain('min-h-[72px]');

    fireEvent.click(screen.getByText('Contested'));

    // Resolving a call doesn't move play on — the point carries on live — so the
    // slot hands back to the live-stats pager (see StatsSlot), never to the
    // answers again.
    expect(within(slot).queryByText('Accepted')).toBeNull();
    expect(within(slot).getByRole('group', { name: 'Live statistics' })).toBeInTheDocument();
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

describe('the header menu', () => {
  const openMenu = () => fireEvent.click(screen.getByLabelText('Menu'));

  it('is one glyph in every status, not a leave button that changes its icon', () => {
    mount(liveGame({ status: 'notStarted' }));
    expect(screen.getByLabelText('Menu')).toBeInTheDocument();
    expect(screen.queryByLabelText('End game')).toBeNull();
    expect(screen.queryByLabelText('Back to setup')).toBeNull();
  });

  it('offers the way out that matches the moment: back to setup before kickoff', () => {
    mount(liveGame({ status: 'notStarted' }));
    openMenu();
    expect(screen.getByText('Back to setup')).toBeInTheDocument();
    expect(screen.queryByText('End game')).toBeNull();
  });

  it('offers ending the game once it is under way, still behind the confirm', () => {
    mount(liveGame());
    openMenu();
    expect(screen.queryByText('Back to setup')).toBeNull();
    fireEvent.click(screen.getByText('End game'));
    expect(screen.getByText('End game?')).toBeInTheDocument();
  });

  it('offers the report once the game is finished, with nothing left to confirm', () => {
    mount(liveGame({ status: 'finished' }));
    openMenu();
    // Scoped to the menu: the action row shows its own "Open report" button once
    // the game is over, which is what keeps the report one tap from the dashboard.
    const menu = screen.getByRole('heading', { name: 'Menu' }).parentElement!
      .parentElement as HTMLElement;
    expect(within(menu).getByText('Open report')).toBeInTheDocument();
    expect(within(menu).queryByText('End game')).toBeNull();
  });

  // Both were reachable only from the config screen before, which is to say not at
  // all once a game had started — including the walkthrough written for exactly
  // the volunteer who is mid-game and lost.
  it('opens the setup and the guide, replacing itself rather than stacking', () => {
    mount(liveGame());
    openMenu();
    fireEvent.click(screen.getByText('Game setup'));
    expect(screen.queryByText('Menu')).toBeNull();
    expect(screen.getByText('Coin toss results')).toBeInTheDocument();
  });

  it('opens the report so far mid-game, minus the finished-game furniture, with a way back', () => {
    mount(liveGame());
    openMenu();
    fireEvent.click(screen.getByText('Report so far'));

    // The report view, without the words that claim the game is over and
    // without the button that would start a new one.
    expect(screen.queryByText('Final report')).toBeNull();
    expect(screen.queryByText('Final score')).toBeNull();
    expect(screen.queryByText('New game')).toBeNull();
    // The working parts are all there.
    expect(screen.getByText('Copy to clipboard')).toBeInTheDocument();
    expect(screen.getByText('Game history')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Back to the game/));
    expect(screen.getByLabelText('Menu')).toBeInTheDocument();
  });

  it('drops the report-so-far row once the game is finished, whose leave row already opens the report', () => {
    mount(liveGame({ status: 'finished' }));
    openMenu();
    const menu = screen.getByRole('heading', { name: 'Menu' }).parentElement!
      .parentElement as HTMLElement;
    expect(within(menu).queryByText('Report so far')).toBeNull();
    expect(within(menu).getByText('Open report')).toBeInTheDocument();
  });

  it('reaches the guide, which is a screen rather than a dialog', () => {
    mount(liveGame());
    openMenu();
    fireEvent.click(screen.getByText('How to use this app'));
    expect(screen.getByText('How this app works')).toBeInTheDocument();
    // The dashboard is gone while it is up — it is an early return, not an overlay.
    expect(screen.queryByLabelText('Menu')).toBeNull();
  });
});
