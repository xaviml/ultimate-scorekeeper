import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState, gameReducer, secondHalfPullSide } from '../state/gameReducer';
import App from '../App';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';
import { hold, tap } from './gestures';

/**
 * The dashboard after Record event was broken up: the action row holds Log,
 * Stoppage, Call, Turn and Pass, the timeouts moved onto the score panels, and
 * leaving the game — along with the roster and the line dialog — moved into the
 * header menu.
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
  state.config = {
    ...state.config,
    statsMode: 'players',
    trackTurnovers: true,
    trackTurnoverPlayers: true,
  };
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
  const labelsIn = (el: HTMLElement) =>
    within(el)
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'));

  // Five buttons reflow into two columns in portrait: the three that only read on
  // the left, the two that record on the right. One DOM tree serves both layouts
  // (the wrappers are `display: contents` in landscape), so the order the buttons
  // appear in is the same either way.
  it('splits five buttons into a reading column and a recording column', () => {
    const state = liveGame();
    state.config = { ...state.config, trackPasses: true };
    mount(state);

    const left = screen.getByLabelText('Log').parentElement as HTMLElement;
    const right = screen.getByLabelText('Turnover — hold to undo').parentElement as HTMLElement;
    expect(labelsIn(left)).toEqual(['Log', 'Stoppage or SOTG', 'What was called?']);
    // Markup order stays Turn then Pass, because this same tree is the landscape
    // row — portrait floats Pass to the top of the column with `order` instead.
    expect(labelsIn(right)).toEqual(['Turnover — hold to undo', 'Completed pass — hold to undo']);
    const pass = screen.getByLabelText('Completed pass — hold to undo');
    expect(pass.className).toContain('order-first');
    expect(pass.className).toContain('lscape:order-none');
    // Matched on whole classes: "border-line" contains the substring "order-".
    const turnClasses = screen.getByLabelText('Turnover — hold to undo').className.split(/\s+/);
    expect(turnClasses).not.toContain('order-first');
    expect(turnClasses).not.toContain('lscape:order-none');

    // Three rows against two at one shared height, which is what makes Turn and
    // Pass the tallest targets on the screen.
    expect(left.className).toContain('grid-rows-3');
    expect(right.className).toContain('grid-rows-2');
    // Both dissolve in landscape, handing their buttons back to the outer grid.
    expect(left.className).toContain('lscape:contents');
    expect(right.className).toContain('lscape:contents');
    expect((left.parentElement as HTMLElement).className).toContain('grid-cols-2');
  });

  // Three and four keep the single row they have always had. The wrappers are
  // still in the DOM — `contents` only takes them out of the *layout* — so the row
  // itself is one level further up, which is also why the five-button test reads
  // the columns rather than the row.
  it('keeps four buttons in one row, with no columns to speak of', () => {
    mount(liveGame()); // turnovers on, passes off

    const wrapper = screen.getByLabelText('Log').parentElement as HTMLElement;
    const row = wrapper.parentElement as HTMLElement;
    expect(labelsIn(row)).toEqual([
      'Log',
      'Stoppage or SOTG',
      'What was called?',
      'Turnover — hold to undo',
    ]);
    expect(row.className).toContain('grid-cols-4');
    // Laid out as if the wrappers were not there, in either orientation.
    expect(wrapper.className).toBe('contents');
  });

  // Roster was the leftmost button until Pass needed the space. The row is capped
  // at five for a 360px phone, and Roster was the one button on it that only reads.
  it('keeps the roster in the header menu rather than on the row', () => {
    mount(liveGame());

    expect(screen.queryByLabelText('Roster')).toBeNull();
    fireEvent.click(screen.getByLabelText('Menu'));
    expect(screen.getByText('Roster')).toBeInTheDocument();
  });

  it('drops Turn when the game does not track activity', () => {
    const state = liveGame();
    state.config.statsMode = 'none';
    mount(state);

    expect(screen.queryByLabelText('Turnover — hold to undo')).toBeNull();
    expect(screen.getByLabelText('What was called?')).toBeInTheDocument();
  });

  // The tournament scorekeeper's game: players are named on goals, but the most
  // frequent button on the row is not wanted at all.
  it('drops Turn when the game names players and skips turnovers', () => {
    const state = liveGame();
    state.config = { ...state.config, statsMode: 'players', trackTurnovers: false };
    mount(state);

    expect(screen.queryByLabelText('Turnover — hold to undo')).toBeNull();
    // And nothing is left on the board claiming to follow the disc.
    expect(document.querySelector('[data-possession]')).toBeNull();
  });

  it('keeps Turn with team-level detail', () => {
    const state = liveGame();
    state.config = { ...state.config, statsMode: 'teams', trackTurnovers: true };
    mount(state);

    expect(screen.getByLabelText('Turnover — hold to undo')).toBeInTheDocument();
  });

  it('logs a turnover straight away with team-level detail, with no player dialog to ask', () => {
    const state = liveGame();
    state.config = { ...state.config, statsMode: 'teams', trackTurnovers: true };
    mount(state);

    tap(screen.getByLabelText('Turnover — hold to undo'));

    expect(screen.queryByText('Turnover')).toBeNull(); // TurnoverDialog never opened
    const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
    expect(stored.log.some((e: { type: string }) => e.type === 'turnover')).toBe(true);
  });

  it('logs a turnover straight away when the game does not ask who turned it over', () => {
    const state = liveGame();
    // Player detail, full roster — but the setting behind the question is off,
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

  it('shows Turn when a single team is followed', () => {
    const state = liveGame();
    state.config = {
      ...state.config,
      statsMode: 'players',
      trackTurnovers: true,
      trackedTeam: 'A',
    };
    mount(state);

    expect(screen.getByLabelText('Turnover — hold to undo')).toBeInTheDocument();
  });

  // Every button carries a visible label, the raised hand included — it went
  // unlabelled while the row was five across and 60px wide. The accessible name
  // stays the fuller wording, which is what names the two things it leads to.
  it('labels every button, the stoppage one included', () => {
    const state = liveGame();
    state.config = { ...state.config, trackPasses: true };
    mount(state);
    expect(screen.getByLabelText('Turnover — hold to undo')).toHaveTextContent('Turn');
    expect(screen.getByLabelText('Completed pass — hold to undo')).toHaveTextContent('Pass');
    expect(screen.getByLabelText('Log')).toHaveTextContent('Log');
    expect(screen.getByLabelText('What was called?')).toHaveTextContent('Call');
    expect(screen.getByLabelText('Stoppage or SOTG')).toHaveTextContent('Stoppage');
  });

  // The label is there in the narrow single row too, not just the wide block.
  it('labels the stoppage button in the single-row layout as well', () => {
    mount(liveGame()); // four buttons, one row
    expect(screen.getByLabelText('Stoppage or SOTG')).toHaveTextContent('Stoppage');
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
  });

  it('disables every button but Log once the game is finished', () => {
    mount(liveGame({ status: 'finished' }));

    expect(screen.getByLabelText('Stoppage or SOTG')).toBeDisabled();
    expect(screen.getByLabelText('What was called?')).toBeDisabled();
    expect(screen.getByLabelText('Turnover — hold to undo')).toBeDisabled();
    expect(screen.getByLabelText('Log')).not.toBeDisabled();
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

  // Two digits, not one: the cap is shared with Pass, where a point of thirty is
  // ordinary and "9+" for the whole point would say nothing. Turn simply never
  // reaches it.
  it('caps at 99+ so the disc keeps one size', () => {
    mount(liveGame({ pointTurnovers: 99 }));
    expect(turnButton()).toHaveTextContent('99');
    cleanup();

    mount(liveGame({ pointTurnovers: 100 }));
    expect(turnButton()).toHaveTextContent('99+');
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
 * The Pass button: the badge is the whole of its feedback, since a tap writes no
 * log entry and leaves the possession rule exactly where it was.
 */
describe('the pass button', () => {
  const passing = (overrides: Partial<GameState> = {}) => {
    // liveGame gives B the disc, so the point's only possession so far is theirs.
    const state = liveGame({ passRuns: [{ team: 'B', passes: 0 }], ...overrides });
    state.config = { ...state.config, trackPasses: true };
    return state;
  };
  const passButton = () => screen.getByLabelText('Completed pass — hold to undo');
  const badge = () => passButton().querySelector('[data-badge]');

  it('is absent unless the game counts passes', () => {
    mount(liveGame());
    expect(screen.queryByLabelText('Completed pass — hold to undo')).toBeNull();
  });

  it('counts a pass on a tap, with nothing written to the log', () => {
    mount(passing());
    tap(passButton());

    const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
    expect(stored.passRuns).toEqual([{ team: 'B', passes: 1 }]);
    expect(stored.log).toEqual([]);
  });

  it('takes the last one back on a long press', () => {
    vi.useFakeTimers();
    try {
      mount(passing({ passRuns: [{ team: 'B', passes: 2 }] }));
      hold(passButton());

      const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
      expect(stored.passRuns).toEqual([{ team: 'B', passes: 1 }]);
    } finally {
      vi.useRealTimers();
    }
  });

  // The badge is the possession in progress, not the point and not the game: it is
  // the last run's count, so a turnover starts it again from nothing.
  it('badges the possession in progress, starting again at every turnover', () => {
    mount(
      passing({
        passRuns: [
          { team: 'A', passes: 9 },
          { team: 'B', passes: 4 },
        ],
        passesCompleted: { A: 40, B: 30 },
      }),
    );
    // Not 13 (the point), not 30 (B's game), not 70 (both): 4, this possession.
    expect(badge()).toHaveTextContent('4');
    cleanup();

    // The possession a turnover has just opened has nothing in it yet.
    mount(
      passing({
        passRuns: [
          { team: 'A', passes: 9 },
          { team: 'B', passes: 0 },
        ],
      }),
    );
    expect(badge()).toBeNull();
    expect(passButton()).toHaveTextContent(/^Pass$/);
  });

  // One team's count, so it is painted in that team's colour rather than the amber
  // every other badge on the row uses.
  it('carries the colour of the team whose possession it counts', () => {
    const state = passing({ passRuns: [{ team: 'B', passes: 3 }] });
    mount(state);
    expect(badge()).toHaveAttribute('data-badge', state.config.teams.B.color);
    cleanup();

    // Turn's count is both teams', so it stays amber.
    mount(passing({ pointTurnovers: 2 }));
    const turn = screen.getByLabelText('Turnover — hold to undo').querySelector('[data-badge]');
    expect(turn).toHaveAttribute('data-badge', 'signal');
  });

  it('caps the badge at 99+, which is the reason the cap is two digits', () => {
    mount(passing({ passRuns: [{ team: 'B', passes: 100 }] }));
    expect(badge()).toHaveTextContent('99+');
  });

  // Greys out rather than explaining itself: the refusal is "the other team has
  // the disc", which is not a mistake and would flash dozens of times a point.
  it('goes dead while the other team holds the disc, in a game following one', () => {
    // liveGame gives B the disc. Following B, the button is live.
    const followingB = passing();
    followingB.config = { ...followingB.config, trackedTeam: 'B' };
    mount(followingB);
    expect(passButton()).not.toBeDisabled();
    cleanup();

    // Following A, with B holding it, there is nothing this tap could count.
    const followingA = passing();
    followingA.config = { ...followingA.config, trackedTeam: 'A' };
    mount(followingA);
    expect(passButton()).toBeDisabled();
    // And the badge simply disappears — B's run is real, but its count is 0
    // because nobody is counting them, which is what the greyed button says too.
    expect(badge()).toBeNull();
  });

  it('stays live for either team when the game follows both', () => {
    const state = passing();
    state.config = { ...state.config, trackedTeam: null };
    mount(state);
    expect(passButton()).not.toBeDisabled();
  });

  // The refusals Pass shares with Turn are explained, not greyed out. Two buttons
  // side by side, one dead and one not, for reasons the volunteer cannot tell
  // apart, is worse than either rule on its own.
  // No disc in play means no possession open: a run is what PULL_THROWN starts.
  it.each<[string, Partial<GameState>]>([
    ['before the game starts', { status: 'notStarted', possessionTeam: null, passRuns: [] }],
    ['between points', { status: 'awaitingPull', possessionTeam: null, passRuns: [] }],
  ])('stays tappable %s and explains itself, exactly as Turn does', (_name, overrides) => {
    mount(passing(overrides));

    const pass = passButton();
    expect(pass).not.toBeDisabled();
    expect(screen.getByLabelText('Turnover — hold to undo')).not.toBeDisabled();

    fireEvent.click(pass);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    // Nothing was counted on the way.
    const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
    expect(stored.passRuns).toEqual([]);
  });

  it('explains a long press with nothing to take back', () => {
    vi.useFakeTimers();
    try {
      mount(passing());
      hold(passButton());
      expect(screen.getByRole('tooltip')).toHaveTextContent(/no pass to undo/i);
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
    expect(screen.getByText('Game summary')).toBeInTheDocument();

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
    fireEvent.click(screen.getByText("Beginner's guide"));
    expect(screen.getByRole('heading', { name: "Beginner's guide" })).toBeInTheDocument();
    // The dashboard is gone while it is up — it is an early return, not an overlay.
    expect(screen.queryByLabelText('Menu')).toBeNull();
  });
});

/**
 * The report is a layer over the game rather than the end of the line: it is
 * reached from the menu with the game still running, and every way in has a way
 * back. Which is why it is App that is mounted here — the round trip crosses the
 * phase boundary, and that is the thing being tested.
 */
describe('leaving for the report, and coming back', () => {
  const mountApp = (state: GameState) => {
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
    return render(
      <I18nProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </I18nProvider>,
    );
  };

  it('leaves a game in progress on "Resume game", with no words claiming it is over', () => {
    mountApp(liveGame());
    fireEvent.click(screen.getByLabelText('Menu'));
    fireEvent.click(screen.getByText('End game'));
    fireEvent.click(screen.getByRole('button', { name: 'End game' }));

    // The report, with the same furniture the mid-game one has: a way back, and
    // nothing headed "Final". Starting a new game is offered here, where the game
    // screen has actually been left behind.
    expect(screen.getByText('Game summary')).toBeInTheDocument();
    expect(screen.queryByText('Final report')).toBeNull();
    expect(screen.queryByText('Final score')).toBeNull();
    expect(screen.getByText('New game')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Back to the game/));
    // The clock was stopped on the way out, so the dashboard is waiting on the
    // same button any other pause leaves it on.
    expect(screen.getByText('Resume game')).toBeInTheDocument();
  });

  it('leaves a finished game on "Open report", the way it found it', () => {
    mountApp(liveGame({ status: 'finished' }));
    fireEvent.click(screen.getByLabelText('Menu'));
    // Scoped: the action row behind the menu carries its own "Open report" button.
    const menu = screen.getByRole('heading', { name: 'Menu' }).parentElement!
      .parentElement as HTMLElement;
    fireEvent.click(within(menu).getByText('Open report'));
    expect(screen.getByText('Game summary')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Back to the game/));
    expect(screen.getByText('Open report')).toBeInTheDocument();
    expect(screen.queryByText('Resume game')).toBeNull();
  });
});
