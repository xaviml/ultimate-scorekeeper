import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameLog } from '../components/GameLog';
import { GameProvider } from '../state/GameContext';
import {
  canDeleteLogEntry,
  createInitialState,
  defaultConfig,
  gameReducer,
  logEditKind,
} from '../state/gameReducer';
import type { Action, GameConfig, GameState, LogEntry } from '../state/types';

const cfg = (patch: Partial<GameConfig> = {}): GameConfig => ({ ...defaultConfig, ...patch });

function run(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce(gameReducer, state);
}

/** A live game with both rosters tracked, so every attribution question applies. */
function live(patch: Partial<GameConfig> = {}): GameState {
  const config = cfg({
    statsMode: 'player',
    players: {
      A: [
        { id: 'a1', number: '7', name: 'Alex' },
        { id: 'a2', number: '9', name: 'Sam' },
      ],
      B: [{ id: 'b1', number: '3', name: 'Kim' }],
    },
    ...patch,
  });
  return run(
    createInitialState(config),
    { type: 'START_GAME', config },
    { type: 'BEGIN_PLAY' },
    {
      type: 'PULL_THROWN',
    },
  );
}

const last = (s: GameState): LogEntry => s.log[s.log.length - 1];
const find = (s: GameState, type: LogEntry['type']): LogEntry =>
  s.log.find((e) => e.type === type) as LogEntry;

function mount(state: GameState) {
  sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
  return render(
    <I18nProvider>
      <GameProvider>
        <GameLog onClose={() => {}} onAddEvent={() => {}} />
      </GameProvider>
    </I18nProvider>,
  );
}

beforeEach(() => sessionStorage.clear());

describe('which rows offer an edit', () => {
  it('offers players on a goal and a turnover, and nothing on the automatic rows', () => {
    const s = run(live(), { type: 'TURNOVER' }, { type: 'GOAL', team: 'B' });
    expect(logEditKind(s, find(s, 'goal'))).toBe('goalPlayers');
    expect(logEditKind(s, find(s, 'turnover'))).toBe('turnoverPlayers');
    expect(logEditKind(s, find(s, 'gameStart'))).toBeNull();
  });

  it('offers nothing at all when the game tracks no activity', () => {
    const s = run(live({ statsMode: 'none', players: { A: [], B: [] } }), {
      type: 'CALL_MADE',
      kind: 'foul',
    });
    expect(logEditKind(s, last(s))).toBeNull();
  });

  it('offers the team but not the players when only teams are tracked', () => {
    const s = run(live({ statsMode: 'game', players: { A: [], B: [] } }), {
      type: 'TRAVEL',
      team: 'A',
    });
    expect(logEditKind(s, last(s))).toBe('team');

    const goal = run(s, { type: 'GOAL', team: 'A' });
    expect(logEditKind(goal, find(goal, 'goal'))).toBeNull();
  });

  it('offers players only for the tracked side in Team stats mode', () => {
    const s = run(live({ statsMode: 'team', trackedTeam: 'A' }), { type: 'GOAL', team: 'B' });
    expect(logEditKind(s, find(s, 'goal'))).toBeNull();

    const own = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' });
    expect(logEditKind(own, last(own))).toBe('goalPlayers');
  });
});

describe('editing an entry', () => {
  it('rewrites a goal’s scorer and assist, in the log and in the point', () => {
    let s = run(live(), { type: 'GOAL', team: 'A' });
    s = gameReducer(s, {
      type: 'SET_GOAL_PLAYERS',
      team: 'A',
      scorerId: 'a1',
      assistId: null,
    });
    const goalId = find(s, 'goal').id;

    s = gameReducer(s, {
      type: 'EDIT_LOG_ENTRY',
      id: goalId,
      edit: { kind: 'goalPlayers', scorerId: 'a2', assistId: 'a1' },
    });

    expect(find(s, 'goal')).toMatchObject({ scorerId: 'a2', assistId: 'a1' });
    expect(s.points[0]).toMatchObject({ scorerId: 'a2', assistId: 'a1' });
  });

  it('finds the right point after an undo left a correction in the log', () => {
    // A note between the goal and the undo pushes UNDO_GOAL onto its visible
    // correction path, so the goal row stays while its point is dropped — the n-th
    // goal row is then no longer the n-th point.
    let s = run(
      live(),
      { type: 'GOAL', team: 'A' },
      { type: 'NOTE', text: 'wind' },
      { type: 'UNDO_GOAL', team: 'A' },
      { type: 'PULL_THROWN' },
      { type: 'GOAL', team: 'B' },
    );
    expect(s.points).toHaveLength(1);
    const secondGoal = last(s);

    s = gameReducer(s, {
      type: 'EDIT_LOG_ENTRY',
      id: secondGoal.id,
      edit: { kind: 'goalPlayers', scorerId: 'b1' },
    });
    expect(s.points[0].scorerId).toBe('b1');
  });

  it('rewrites a turnover’s players without touching possession', () => {
    let s = run(live(), { type: 'TURNOVER', turnoverId: 'a1' });
    const possession = s.possessionTeam;

    s = gameReducer(s, {
      type: 'EDIT_LOG_ENTRY',
      id: last(s).id,
      edit: { kind: 'turnoverPlayers', turnoverId: 'a2', defenseId: 'b1' },
    });

    expect(last(s)).toMatchObject({ turnoverId: 'a2', defenseId: 'b1' });
    expect(s.possessionTeam).toBe(possession);
    expect(s.turnoversCommitted).toEqual({ A: 1, B: 0 });
  });

  it('keeps a call and its resolution on the same team, and moves the open call with it', () => {
    let s = run(live(), { type: 'CALL_MADE', kind: 'foul', team: 'A' });
    const callId = last(s).id;

    s = gameReducer(s, { type: 'EDIT_LOG_ENTRY', id: callId, edit: { kind: 'team', team: 'B' } });
    expect(last(s).team).toBe('B');
    expect(s.pendingCall?.team).toBe('B');

    s = gameReducer(s, { type: 'CALL_RESOLVED', resolution: 'accepted' });
    s = gameReducer(s, {
      type: 'EDIT_LOG_ENTRY',
      id: last(s).id,
      edit: { kind: 'callResolution', team: 'A', resolution: 'contested' },
    });

    expect(s.log.filter((e) => e.callKind === 'foul').map((e) => e.team)).toEqual(['A', 'A']);
    expect(last(s).resolution).toBe('contested');
  });

  it('leaves an earlier call alone when a later one is edited', () => {
    let s = run(
      live(),
      { type: 'CALL_MADE', kind: 'foul', team: 'A' },
      { type: 'CALL_RESOLVED', resolution: 'accepted' },
      { type: 'CALL_MADE', kind: 'pick', team: 'A' },
      { type: 'CALL_RESOLVED', resolution: 'retracted' },
    );

    s = gameReducer(s, {
      type: 'EDIT_LOG_ENTRY',
      id: last(s).id,
      edit: { kind: 'callResolution', team: 'B', resolution: 'retracted' },
    });

    expect(s.log.filter((e) => e.callKind === 'foul').every((e) => e.team === 'A')).toBe(true);
    expect(s.log.filter((e) => e.callKind === 'pick').every((e) => e.team === 'B')).toBe(true);
  });

  it('re-derives an injury’s players, label and team, and moves the open stoppage', () => {
    let s = run(live(), {
      type: 'STOPPAGE',
      kind: 'injury',
      players: [{ team: 'A', playerId: 'a1' }],
    });
    expect(last(s)).toMatchObject({ team: 'A', detail: '#7 Alex' });

    s = gameReducer(s, {
      type: 'EDIT_LOG_ENTRY',
      id: last(s).id,
      edit: { kind: 'injury', players: [{ team: 'B', playerId: 'b1' }] },
    });

    expect(last(s)).toMatchObject({ team: 'B', detail: '#3 Kim' });
    expect(s.pendingStoppage).toMatchObject({
      team: 'B',
      players: [{ team: 'B', playerId: 'b1' }],
    });
  });

  it('carries a technical stoppage’s team onto the row that resolved it', () => {
    let s = run(
      live(),
      { type: 'STOPPAGE', kind: 'technical', team: 'A' },
      { type: 'STOPPAGE_RESOLVED' },
    );

    s = gameReducer(s, {
      type: 'EDIT_LOG_ENTRY',
      id: find(s, 'stoppage').id,
      edit: { kind: 'team', team: 'B' },
    });

    expect(s.log.filter((e) => e.stoppageKind === 'technical').map((e) => e.team)).toEqual([
      'B',
      'B',
    ]);
  });

  it('keeps the injured players when the pencil is opened from the resolved row, not the opening one', () => {
    // Only the opening `stoppage` row carries stoppagePlayers (see EDIT_LOG_ENTRY);
    // the pencil on `stoppageResolved` used to prefill empty from its own row and
    // wipe the players out on Save.
    const s = run(
      live(),
      { type: 'STOPPAGE', kind: 'injury', players: [{ team: 'A', playerId: 'a1' }] },
      { type: 'STOPPAGE_RESOLVED' },
    );
    mount(s);

    const rows = screen.getAllByRole('row').slice(1);
    // Row 0 is the newest (stoppageResolved); row 1 is the opening stoppage row,
    // which is the only one that ever names the player.
    expect(within(rows[1]).getByText(/Alex/)).toBeInTheDocument();

    fireEvent.click(within(rows[0]).getByLabelText('Fix this entry'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const rowsAfter = screen.getAllByRole('row').slice(1);
    expect(within(rowsAfter[1]).getByText(/Alex/)).toBeInTheDocument();
  });

  it('rewords a note, and refuses to empty one', () => {
    let s = run(live(), { type: 'NOTE', text: 'wind picked up' });
    const id = last(s).id;

    s = gameReducer(s, { type: 'EDIT_LOG_ENTRY', id, edit: { kind: 'note', text: 'rain' } });
    expect(last(s).detail).toBe('rain');

    s = gameReducer(s, { type: 'EDIT_LOG_ENTRY', id, edit: { kind: 'note', text: '  ' } });
    expect(last(s).detail).toBe('rain');
  });

  it('refuses an edit the row does not offer', () => {
    const s = run(live(), { type: 'GOAL', team: 'A' });
    const edited = gameReducer(s, {
      type: 'EDIT_LOG_ENTRY',
      id: find(s, 'goal').id,
      edit: { kind: 'team', team: 'B' },
    });
    expect(edited).toBe(s);
  });
});

describe('deleting the newest entry', () => {
  it('takes back a turnover exactly as a long-press on Turn does', () => {
    const s = run(live(), { type: 'TURNOVER' });
    expect(canDeleteLogEntry(s, last(s))).toBe(true);

    const deleted = gameReducer(s, { type: 'DELETE_LOG_ENTRY', id: last(s).id });
    expect(deleted.log.some((e) => e.type === 'turnover')).toBe(false);
    expect(deleted.possessionTeam).toBe(s.log[s.log.length - 1].team);
    expect(deleted.pointTurnovers).toBe(0);
    expect(deleted.turnoversCommitted).toEqual({ A: 0, B: 0 });
  });

  it('drops a resolved call together with the call it answered', () => {
    const s = run(
      live(),
      { type: 'CALL_MADE', kind: 'foul', team: 'A' },
      { type: 'CALL_RESOLVED', resolution: 'accepted' },
    );

    const deleted = gameReducer(s, { type: 'DELETE_LOG_ENTRY', id: last(s).id });
    expect(deleted.log.some((e) => e.callKind !== undefined)).toBe(false);
  });

  it('closes the open question when an unresolved call is deleted', () => {
    const s = run(live(), { type: 'CALL_MADE', kind: 'foul', team: 'A' });
    const deleted = gameReducer(s, { type: 'DELETE_LOG_ENTRY', id: last(s).id });

    expect(deleted.pendingCall).toBeNull();
    expect(deleted.log.some((e) => e.type === 'call')).toBe(false);
  });

  it('keeps ids unique after a delete, so a later event never reuses one', () => {
    const s = run(live(), { type: 'NOTE', text: 'one' });
    const noteId = last(s).id;
    const deleted = gameReducer(s, { type: 'DELETE_LOG_ENTRY', id: noteId });
    const again = gameReducer(deleted, { type: 'NOTE', text: 'two' });

    expect(last(again).id).toBeGreaterThan(noteId);
  });

  it('refuses anything that is not the newest entry, and types that are not deletable', () => {
    const s = run(live(), { type: 'NOTE', text: 'one' }, { type: 'TRAVEL', team: 'A' });
    const note = find(s, 'note');
    expect(canDeleteLogEntry(s, note)).toBe(false);
    expect(gameReducer(s, { type: 'DELETE_LOG_ENTRY', id: note.id })).toBe(s);

    const goal = run(live(), { type: 'GOAL', team: 'A' });
    expect(canDeleteLogEntry(goal, find(goal, 'goal'))).toBe(false);

    const stoppage = run(live(), { type: 'STOPPAGE', kind: 'technical', team: 'A' });
    expect(canDeleteLogEntry(stoppage, last(stoppage))).toBe(false);
  });
});

describe('how long the clock was stopped', () => {
  it('logs the duration of an SOTG stoppage', () => {
    let s = run(live(), { type: 'SOTG_TOGGLE', team: 'A' });
    for (let i = 0; i < 42; i++) s = gameReducer(s, { type: 'TICK' });
    s = gameReducer(s, { type: 'SOTG_TOGGLE' });

    expect(last(s)).toMatchObject({ type: 'sotgEnd', team: 'A', resolutionSeconds: 42 });
  });

  it('counts each pause from zero, game clock or not', () => {
    let s = run(live(), { type: 'SOTG_TOGGLE' });
    for (let i = 0; i < 5; i++) s = gameReducer(s, { type: 'TICK' });
    s = gameReducer(s, { type: 'SOTG_TOGGLE' });
    const frozen = s.gameSeconds;

    s = gameReducer(s, { type: 'SOTG_TOGGLE', silent: true });
    for (let i = 0; i < 3; i++) s = gameReducer(s, { type: 'TICK' });
    s = gameReducer(s, { type: 'SOTG_TOGGLE' });

    expect(last(s)).toMatchObject({ type: 'pauseEnd', resolutionSeconds: 3 });
    // The game clock stood still throughout both, which is why the count is its own.
    expect(s.gameSeconds).toBe(frozen);
  });
});

describe('the log dialog', () => {
  it('shows the game clock and no time of day', () => {
    const s = run(live(), { type: 'NOTE', text: 'wind picked up' });
    mount(s);

    expect(screen.getByText('Clock')).toBeInTheDocument();
    expect(screen.queryByText('Time')).toBeNull();
    expect(screen.queryByText(s.log[0].wallClock)).toBeNull();
  });

  it('puts a pencil on the rows that can be fixed and a bin on the newest only', () => {
    const s = run(live(), { type: 'TURNOVER' }, { type: 'TRAVEL', team: 'A' });
    mount(s);

    // Newest first, so row 1 is the travel and row 2 the turnover.
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]).getByLabelText('Fix this entry')).toBeInTheDocument();
    expect(within(rows[0]).getByLabelText('Delete this entry')).toBeInTheDocument();
    expect(within(rows[1]).getByLabelText('Fix this entry')).toBeInTheDocument();
    expect(within(rows[1]).queryByLabelText('Delete this entry')).toBeNull();
    // The game-start row has nothing to offer at all.
    expect(within(rows[rows.length - 1]).queryByLabelText('Fix this entry')).toBeNull();
  });

  it('opens the matching dialog and writes the answer back into the row', () => {
    const s = run(live(), { type: 'TRAVEL', team: 'A' });
    mount(s);

    fireEvent.click(screen.getAllByLabelText('Fix this entry')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Team B' }));

    const row = screen.getAllByRole('row')[1];
    expect(within(row).getByText('Travel — Team B')).toBeInTheDocument();
  });

  it('removes the row when the bin is tapped', () => {
    const s = run(live(), { type: 'NOTE', text: 'wind picked up' });
    mount(s);

    fireEvent.click(screen.getByLabelText('Delete this entry'));
    expect(screen.queryByText('wind picked up')).toBeNull();
  });
});
