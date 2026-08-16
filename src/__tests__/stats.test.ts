import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import type { TFunc } from '../i18n/useT';
import { createInitialState, defaultConfig, gameReducer } from '../state/gameReducer';
import {
  formatSeconds,
  playerStatLines,
  pointDurationDetail,
  stoppageDetail,
  teamStats,
} from '../state/stats';
import type { Action, GameConfig, GameState, LogEntry } from '../state/types';

const t: TFunc = (key, vars) => {
  let s: string = en[key] ?? String(key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
};

const entry = (patch: Partial<LogEntry>): LogEntry => ({
  id: 1,
  wallClock: '10:00:00',
  atMs: 0,
  gameSeconds: 0,
  type: 'stoppage',
  ...patch,
});

describe('stoppageDetail', () => {
  it('shows just the kind when no player is attached', () => {
    const e = entry({ stoppageKind: 'technical' });
    expect(stoppageDetail(e, t)).toBe('Technical');
  });

  // Regression: e.detail (the injured player) and the kind label used to be
  // printed side by side with no separator by the callers, reading as
  // "XaviInjury". stoppageDetail now composes the two itself.
  it('puts a separator between the kind and the injured player, not "XaviInjury"', () => {
    const e = entry({ stoppageKind: 'injury', detail: '#7 Xavi' });
    expect(stoppageDetail(e, t)).toBe('Injury — #7 Xavi');
  });

  it('shows the resolution duration once resolved, with no player repeated', () => {
    const e = entry({ type: 'stoppageResolved', stoppageKind: 'injury', resolutionSeconds: 42 });
    expect(stoppageDetail(e, t)).toBe('Injury — resolved in 42s');
  });

  it('returns nothing for entries with no stoppage kind', () => {
    expect(stoppageDetail(entry({ type: 'note', stoppageKind: undefined }), t)).toBe('');
  });
});

describe('formatSeconds', () => {
  it('drops the minutes below a minute and shows them from a minute up', () => {
    expect(formatSeconds(0)).toBe('0s');
    expect(formatSeconds(25)).toBe('25s');
    expect(formatSeconds(59)).toBe('59s');
    expect(formatSeconds(60)).toBe('1m 0s');
    expect(formatSeconds(90)).toBe('1m 30s');
    expect(formatSeconds(605)).toBe('10m 5s');
  });
});

describe('pointDurationDetail', () => {
  it('prints how long the point took on the goal that ended it', () => {
    expect(pointDurationDetail(entry({ type: 'goal', pointSeconds: 90 }), t)).toBe(' — in 1m 30s');
  });

  // A point with no recorded start says nothing, rather than claiming it took no time.
  it('says nothing without a recorded duration, or on a non-goal', () => {
    expect(pointDurationDetail(entry({ type: 'goal' }), t)).toBe('');
    expect(pointDurationDetail(entry({ type: 'turnover', pointSeconds: 30 }), t)).toBe('');
  });
});

const cfg = (patch: Partial<GameConfig> = {}): GameConfig => ({ ...defaultConfig, ...patch });
function run(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce(gameReducer, state);
}
function liveGame(config = cfg()): GameState {
  const started = gameReducer(createInitialState(config), { type: 'START_GAME', config });
  const begun = gameReducer(started, { type: 'BEGIN_PLAY' });
  return gameReducer(begun, { type: 'PULL_THROWN' });
}

describe('teamStats', () => {
  it('computes holds/breaks, their clean variants, break chances and lifetime turnovers per team', () => {
    let s = liveGame();
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // point0: clean hold for A
    s = run(
      s,
      { type: 'PULL_THROWN' },
      { type: 'TURNOVER' }, // B loses it
      { type: 'GOAL', team: 'A' }, // point1: clean break for A
      { type: 'PULL_THROWN' },
      { type: 'TURNOVER' }, // B loses it
      { type: 'TURNOVER' }, // A loses it right back
      { type: 'GOAL', team: 'B' }, // point2: messy (not clean) hold for B
      { type: 'PULL_THROWN' },
      { type: 'TURNOVER' }, // A loses it
      { type: 'TURNOVER' }, // B loses it right back
      { type: 'GOAL', team: 'B' }, // point3: messy (not clean) break for B
    );

    // Break chances = times each team, as D-line, gained the disc: point0 gave
    // B (pulling) none (A held wire-to-wire); point1's single turnover gave A
    // one, converted straight away; point2's two turnovers gave A one (B's
    // turnover handed it over, A's own turnover right after handed it right
    // back, so B's eventual hold leaves A with one failed chance); point3's
    // two turnovers likewise give B exactly one.
    expect(teamStats(s, 'A')).toMatchObject({
      score: 2,
      oLineHolds: 1,
      cleanHolds: 1,
      breakChances: 2,
      turnovers: 2,
      breaks: 1,
      cleanBreaks: 1,
      avgHoldSeconds: 0,
      avgBreakSeconds: 0,
      timeoutsUsed: 0,
    });
    expect(teamStats(s, 'B')).toMatchObject({
      score: 2,
      oLineHolds: 1,
      cleanHolds: 0,
      breakChances: 1,
      turnovers: 3,
      breaks: 1,
      cleanBreaks: 0,
      avgHoldSeconds: 0,
      avgBreakSeconds: 0,
      timeoutsUsed: 0,
    });
  });
});

describe('playerStatLines', () => {
  function withRoster(): GameState {
    const config = cfg({
      statsMode: 'player',
      players: {
        A: [
          { id: 'a1', number: '', name: 'Alex' },
          { id: 'a2', number: '', name: 'Sam' },
          { id: 'a3', number: '', name: 'Bench' },
        ],
        B: [{ id: 'b1', number: '', name: 'Jo' }],
      },
    });
    let s = liveGame(config);
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    s = gameReducer(s, { type: 'SET_GOAL_PLAYERS', team: 'A', scorerId: 'a1', assistId: 'a2' });
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'B' });
    s = gameReducer(s, { type: 'SET_GOAL_PLAYERS', team: 'B', scorerId: 'b1', assistId: null });
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' });
    s = gameReducer(s, { type: 'SET_GOAL_PLAYERS', team: 'A', scorerId: 'a2', assistId: 'a1' });
    return s;
  }

  it('only lists players with at least one goal or assist, sorted by their total descending', () => {
    const lines = playerStatLines(withRoster(), ['A'], t);
    expect(lines).toEqual([
      { team: 'A', playerId: 'a1', label: 'Alex', goals: 1, assists: 1, total: 2 },
      { team: 'A', playerId: 'a2', label: 'Sam', goals: 1, assists: 1, total: 2 },
    ]);
    // Bench never scored or assisted, so it never shows up.
    expect(lines.some((l) => l.playerId === 'a3')).toBe(false);
  });

  it('combines both rosters when asked, keeping the same total-descending order', () => {
    // B's one goal has a scorer but no assist, so B also gets an aggregate line.
    const lines = playerStatLines(withRoster(), ['A', 'B'], t);
    expect(lines.map((l) => l.playerId)).toEqual(['a1', 'a2', 'b1', '']);
    expect(lines[2]).toMatchObject({ team: 'B', label: 'Jo', goals: 1, assists: 0, total: 1 });
  });

  describe('the unassigned aggregate', () => {
    /** Two A goals: one fully named, one with nobody named at all. */
    function withGaps(): GameState {
      const config = cfg({
        statsMode: 'player',
        players: { A: [{ id: 'a1', number: '', name: 'Alex' }], B: [] },
      });
      let s = liveGame(config);
      s = gameReducer(s, { type: 'GOAL', team: 'A' });
      s = gameReducer(s, { type: 'SET_GOAL_PLAYERS', team: 'A', scorerId: 'a1', assistId: null });
      s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' });
      return s;
    }

    it('counts the unnamed scorers and assists per team, pinned below the players', () => {
      const lines = playerStatLines(withGaps(), ['A', 'B'], t);
      expect(lines).toEqual([
        { team: 'A', playerId: 'a1', label: 'Alex', goals: 1, assists: 0, total: 1 },
        // One goal with no scorer, two goals with no assist.
        {
          team: 'A',
          playerId: '',
          label: 'Not recorded',
          goals: 1,
          assists: 2,
          total: 3,
          unassigned: true,
        },
      ]);
    });

    // A Callahan has no assist by the rules, so counting it as unrecorded would
    // report a gap the volunteer had actually filled in.
    it('does not count a Callahan as an unrecorded assist', () => {
      let s = withGaps();
      s = gameReducer(s, {
        type: 'SET_GOAL_PLAYERS',
        team: 'A',
        scorerId: 'a1',
        assistId: null,
        callahan: true,
      });
      const aggregate = playerStatLines(s, ['A'], t).find((l) => l.unassigned);
      // The second goal now has a scorer and no assist to record: only the first
      // goal's missing assist is left.
      expect(aggregate).toMatchObject({ goals: 0, assists: 1, total: 1 });
    });

    // With nothing attributed anywhere the aggregate would be the whole table, and
    // it says nothing the score doesn't — the callers hide the section on [].
    it('never stands alone when no player was named at all', () => {
      const config = cfg({ statsMode: 'player', players: { A: [], B: [] } });
      let s = liveGame(config);
      s = gameReducer(s, { type: 'GOAL', team: 'A' });
      expect(playerStatLines(s, ['A', 'B'], t)).toEqual([]);
    });

    it('leaves out a team that named everyone', () => {
      let s = withGaps();
      // Fill in the second goal completely; nothing is missing any more.
      const goals = s.log.filter((e) => e.type === 'goal');
      s = gameReducer(s, {
        type: 'EDIT_LOG_ENTRY',
        id: goals[0].id,
        edit: { kind: 'goalPlayers', scorerId: 'a1', callahan: true },
      });
      s = gameReducer(s, {
        type: 'EDIT_LOG_ENTRY',
        id: goals[1].id,
        edit: { kind: 'goalPlayers', scorerId: 'a1', callahan: true },
      });
      expect(playerStatLines(s, ['A'], t).some((l) => l.unassigned)).toBe(false);
    });
  });
});
