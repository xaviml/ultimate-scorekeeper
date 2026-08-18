import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import GameScreen from '../components/GameScreen';
import { createInitialState } from '../state/gameReducer';
import type { GameState, PlayerInfo, SavedLine } from '../state/types';
import { tap } from './gestures';

const roster: PlayerInfo[] = [
  { id: 'p1', number: '1', name: 'One', gender: 'female' },
  { id: 'p2', number: '2', name: 'Two', gender: 'female' },
  { id: 'p3', number: '3', name: 'Three', gender: 'male' },
  { id: 'p4', number: '4', name: 'Four', gender: 'male' },
  { id: 'p5', number: '5', name: 'Five' },
];

/**
 * A line-tracked game with a line size of 3 and a ratio check, so an off-spec line is
 * two taps away rather than seven.
 */
function lineGame(overrides: Partial<GameState> = {}): GameState {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'awaitingPull';
  state.config = {
    ...state.config,
    statsMode: 'team',
    trackedTeam: 'A',
    lineSize: 3,
    lines: { enabled: true, genderCheck: 'gameRatio', fixedFemale: 2, saved: [] },
    players: { A: roster, B: [] },
  };
  // Ratio 'female' at three wants 2 FMP and 1 MMP.
  state.ratio = 'female';
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

/** Opens the dialog through the between-points prompt, the way a volunteer would. */
function openViaPrompt(state: GameState) {
  mount(state);
  tap(screen.getByRole('button', { name: /register line/i }));
}

/** Opens it the other way, from the Roster button — the only door once play is live. */
function openLineFromRoster() {
  tap(screen.getByRole('button', { name: /roster/i }));
  tap(screen.getByRole('button', { name: /^line$/i }));
}

const chip = (name: RegExp) => screen.getByRole('button', { name });
/**
 * The footer's commit button. Found by its data hook rather than its label, because
 * that label is one of three strings and "Save this line" above shares a word with
 * one of them — see LineDialog.
 */
const saveButton = () => document.querySelector('[data-line-save]') as HTMLElement;
const saveState = () => saveButton().getAttribute('data-line-save');
/**
 * Commits the line however many taps that takes — one when it matches the spec, two
 * when it doesn't. Tests about the confirmation itself tap `saveButton` directly.
 */
function commit() {
  tap(saveButton());
  if (saveState() === 'armed') tap(saveButton());
}

beforeEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
});

describe('the between-points prompt', () => {
  it('offers to register the line when nothing has been', () => {
    mount(lineGame());
    expect(screen.getByRole('button', { name: /register line/i })).toBeTruthy();
  });

  // Nothing carries over, so an empty pointLine is exactly the state worth asking
  // about — and answering it is what takes the prompt away.
  it('disappears once a line has been registered', () => {
    mount(lineGame({ pointLine: [{ playerId: 'p1' }] }));
    expect(screen.queryByRole('button', { name: /register line/i })).toBeNull();
  });

  it('never appears when line tracking is off', () => {
    const state = lineGame();
    state.config = { ...state.config, lines: { ...state.config.lines, enabled: false } };
    mount(state);
    expect(screen.queryByRole('button', { name: /register line/i })).toBeNull();
  });

  // Player mode has two rosters, so line tracking does not exist there whatever the
  // flag says — the gate is lineTrackingEnabled, not lines.enabled.
  /**
   * The first point's line is decided while the teams line up, exactly as every
   * other one is — so the prompt is there before the game has even been started.
   */
  it('appears before the game starts, and before a scheduled kickoff', () => {
    mount(lineGame({ status: 'notStarted' }));
    expect(screen.getByRole('button', { name: /register line/i })).toBeTruthy();
    cleanup();
    mount(lineGame({ status: 'awaitingStart', startingAtMs: Date.now() + 600_000 }));
    expect(screen.getByRole('button', { name: /register line/i })).toBeTruthy();
  });

  it("registers the first point's line before the pull is even possible", () => {
    mount(lineGame({ status: 'notStarted' }));
    tap(screen.getByRole('button', { name: /register line/i }));
    tap(chip(/One/));
    tap(chip(/Two/));
    tap(chip(/Three/));
    tap(saveButton());

    const stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    expect(stored.line).toEqual(['p1', 'p2', 'p3']);
    expect(stored.pointLine.every((p) => p.sub === undefined)).toBe(true);
  });

  it('is answered, so it goes away, before the game starts too', () => {
    mount(lineGame({ status: 'notStarted', pointLine: [{ playerId: 'p1' }] }));
    expect(screen.queryByRole('button', { name: /register line/i })).toBeNull();
  });

  it('never appears in player mode', () => {
    const state = lineGame();
    state.config = { ...state.config, statsMode: 'player', trackedTeam: null };
    mount(state);
    expect(screen.queryByRole('button', { name: /register line/i })).toBeNull();
  });
});

describe('registering a line', () => {
  it('records the picked players on the point', () => {
    openViaPrompt(lineGame());
    tap(chip(/One/));
    tap(chip(/Two/));
    tap(chip(/Three/));
    // Three of three, on ratio: it saves on the first tap.
    expect(saveState()).toBe('ready');
    tap(saveButton());

    const stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    expect(stored.line).toEqual(['p1', 'p2', 'p3']);
    expect(stored.pointLine.map((p) => p.playerId)).toEqual(['p1', 'p2', 'p3']);
  });

  it('shows the count and the split against what the point asks for', () => {
    openViaPrompt(lineGame());
    tap(chip(/One/));
    expect(screen.getByText('1 of 3')).toBeTruthy();
    // 2 FMP / 1 MMP is what ratio 'female' at three wants.
    expect(screen.getByText('/2')).toBeTruthy();
  });

  it('cancels without recording anything', () => {
    openViaPrompt(lineGame());
    tap(chip(/One/));
    tap(screen.getByRole('button', { name: /cancel/i }));

    const stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    expect(stored.line).toEqual([]);
    expect(stored.pointLine).toEqual([]);
  });
});

describe('an off-spec line', () => {
  /** Three MMP where the split allows one: wrong ratio, right size. */
  function pickOffRatio() {
    openViaPrompt(lineGame());
    tap(chip(/Three/));
    tap(chip(/Four/));
    tap(chip(/One/));
  }

  it('says what is wrong instead of blocking', () => {
    pickOffRatio();
    expect(saveState()).toBe('warned');
    expect(document.querySelector('[data-line-issues~="ratio"]')).toBeTruthy();
  });

  it('flags the wrong size too', () => {
    openViaPrompt(lineGame());
    tap(chip(/One/));
    expect(document.querySelector('[data-line-issues~="size"]')).toBeTruthy();
    expect(screen.getByText(/that is 1 on the field, not 3/i)).toBeTruthy();
  });

  // The warning has to be impossible to tap past by accident, and impossible to be
  // stopped by: recording the line that actually took the field always wins.
  it('takes two taps to save, and does save', () => {
    pickOffRatio();
    tap(saveButton());

    let stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    expect(stored.line).toEqual([]); // the first tap only arms it
    expect(saveState()).toBe('armed');

    tap(saveButton());
    stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!) as GameState;
    expect(stored.line).toEqual(['p3', 'p4', 'p1']);
  });

  it('disarms when the line is changed after the first tap', () => {
    pickOffRatio();
    tap(saveButton());
    tap(chip(/Four/)); // take one off again
    expect(saveState()).not.toBe('armed');
  });

  // An unmarked player makes the split unknown, not wrong — see lineIssues.
  it('does not warn about the ratio just because a player is unmarked', () => {
    openViaPrompt(lineGame());
    tap(chip(/One/));
    tap(chip(/Two/));
    tap(chip(/Five/)); // no marking
    expect(document.querySelector('[data-line-issues~="ratio"]')).toBeNull();
    expect(screen.getByText('1 unmarked')).toBeTruthy();
  });
});

describe('predefined lines', () => {
  const saved: SavedLine = { id: 'l1', name: 'O1', playerKeys: ['1|one', '3|three'] };

  it('fills the selection when one is loaded', () => {
    const state = lineGame();
    state.config = { ...state.config, lines: { ...state.config.lines, saved: [saved] } };
    openViaPrompt(state);
    tap(screen.getByRole('button', { name: /load o1/i }));
    // Two of three: an incomplete saved line still saves, it just warns first.
    commit();

    const stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    expect(stored.line).toEqual(['p1', 'p3']);
    // The name travels with it, so the report can say which line played the point.
    expect(stored.lineName).toBe('O1');
  });

  it('names the current selection and keeps it for the tournament', () => {
    const state = lineGame();
    state.config.teams = { ...state.config.teams, A: { name: 'Ravens', color: '#111111' } };
    localStorage.setItem(
      'ultimate-scorekeeper:saved-teams',
      JSON.stringify([{ name: 'Ravens', color: '#111111', players: roster }]),
    );
    openViaPrompt(state);
    tap(chip(/One/));
    tap(chip(/Three/));
    tap(screen.getByRole('button', { name: /save this line/i }));
    fireEvent.change(screen.getByLabelText(/name this line/i), { target: { value: 'D1' } });
    tap(screen.getByRole('button', { name: /^save$/i }));

    const teams = JSON.parse(localStorage.getItem('ultimate-scorekeeper:saved-teams')!);
    expect(teams[0].lines).toEqual([
      { id: expect.any(String), name: 'D1', playerKeys: ['1|one', '3|three'] },
    ]);
  });

  // A predefined line is a template, so trimming it down to whoever actually took the
  // field is the ordinary way to use one — the point is still that line's.
  it('keeps the name when a player is dropped from the loaded line', () => {
    const state = lineGame();
    state.config = { ...state.config, lines: { ...state.config.lines, saved: [saved] } };
    openViaPrompt(state);
    tap(screen.getByRole('button', { name: /load o1/i }));
    tap(chip(/Three/)); // one of O1's own, taken back off
    commit();

    const stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    expect(stored.line).toEqual(['p1']);
    expect(stored.lineName).toBe('O1');
  });

  // Bringing in somebody the template never held is the edit that ends its claim:
  // those seven were not drawn from it, and the report would repeat the lie all game.
  it('drops the name once a player from outside it is added', () => {
    const state = lineGame();
    state.config = { ...state.config, lines: { ...state.config.lines, saved: [saved] } };
    openViaPrompt(state);
    tap(screen.getByRole('button', { name: /load o1/i }));
    tap(chip(/Four/));
    commit();

    const stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    expect(stored.lineName).toBeNull();
  });

  // Dropping and re-adding one of the template's own is still the template.
  it('keeps the name when one of its own goes back on', () => {
    const state = lineGame();
    state.config = { ...state.config, lines: { ...state.config.lines, saved: [saved] } };
    openViaPrompt(state);
    tap(screen.getByRole('button', { name: /load o1/i }));
    tap(chip(/Three/));
    tap(chip(/Three/));
    commit();

    const stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    expect(stored.line).toEqual(['p1', 'p3']);
    expect(stored.lineName).toBe('O1');
  });
});

describe('the next line', () => {
  it('is not offered between points', () => {
    openViaPrompt(lineGame());
    expect(screen.queryByRole('button', { name: /next point/i })).toBeNull();
  });

  /**
   * Regression: switching to "Next point" and back used to reload the selection from
   * state, silently throwing away the substitution just picked. Both questions are
   * live at once, which is the whole argument for one dialog — so looking at one must
   * not cost the other.
   */
  it("keeps each mode's picks when switching between them", () => {
    mount(lineGame({ status: 'live', pointLine: [{ playerId: 'p2' }], line: ['p2'] }));
    openLineFromRoster();

    tap(chip(/Three/)); // add to this point's line
    tap(screen.getByRole('button', { name: /next point/i }));
    tap(chip(/One/)); // and pick a different next line
    tap(screen.getByRole('button', { name: /this point/i }));
    // The substitution is still there.
    expect(chip(/Three/).getAttribute('class')).toContain('bg-signal');

    commit();
    const stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    // One visit answered both questions.
    expect(stored.pointLine.map((p) => p.playerId)).toEqual(['p2', 'p3']);
    expect(stored.pointLine.find((p) => p.playerId === 'p3')?.sub).toBe(true);
    expect(stored.nextLine?.playerIds).toEqual(['p1']);
  });

  // Opening the dialog to glance at the next line must not re-register the current one.
  it('does not dispatch for a mode that was never touched', () => {
    mount(lineGame({ status: 'live', pointLine: [{ playerId: 'p2' }], line: ['p2'] }));
    openLineFromRoster();
    tap(screen.getByRole('button', { name: /next point/i }));
    tap(chip(/One/));
    commit();

    const stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    expect(stored.nextLine?.playerIds).toEqual(['p1']);
    // Untouched, so no SET_LINE went out and nobody became a substitution.
    expect(stored.pointLine.map((p) => p.playerId)).toEqual(['p2']);
  });

  it('is registered separately while the disc is live', () => {
    const state = lineGame({ status: 'live', pointLine: [{ playerId: 'p2' }] });
    mount(state);
    openLineFromRoster();
    tap(screen.getByRole('button', { name: /next point/i }));
    tap(chip(/One/));
    commit();

    const stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    expect(stored.nextLine).toEqual({ playerIds: ['p1'], name: null });
    // Pre-registering must leave the point being played alone.
    expect(stored.pointLine.map((p) => p.playerId)).toEqual(['p2']);
  });
});

describe('the Roster button', () => {
  // The other door to the same thing, and it has to work in the same window.
  it('opens the line dialog before the game starts', () => {
    mount(lineGame({ status: 'notStarted' }));
    openLineFromRoster();
    tap(chip(/One/));
    commit();

    const stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    expect(stored.line).toEqual(['p1']);
  });

  it('offers the line and the roster when lines are tracked', () => {
    mount(lineGame());
    tap(screen.getByRole('button', { name: /roster/i }));
    expect(screen.getByRole('button', { name: /^line$/i })).toBeTruthy();
  });

  it('opens the roster editor directly when they are not', () => {
    const state = lineGame();
    state.config = { ...state.config, lines: { ...state.config.lines, enabled: false } };
    mount(state);
    tap(screen.getByRole('button', { name: /roster/i }));
    expect(screen.queryByRole('button', { name: /^line$/i })).toBeNull();
    expect(screen.getByPlaceholderText('Name')).toBeTruthy();
  });

  it('marks a player MMP or FMP from the roster editor', () => {
    mount(lineGame());
    tap(screen.getByRole('button', { name: /roster/i }));
    // Five is unmarked, so the first tap on its toggle makes it MMP.
    tap(screen.getByRole('button', { name: /#5 Five — gender: Not set/i }));

    const stored = JSON.parse(
      sessionStorage.getItem('ultimate-scorekeeper:game-state')!,
    ) as GameState;
    expect(stored.config.players.A.find((p) => p.id === 'p5')?.gender).toBe('male');
  });
});
