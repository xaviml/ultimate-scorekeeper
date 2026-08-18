import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import type { TFunc } from '../i18n/useT';
import { createInitialState, defaultConfig, gameReducer } from '../state/gameReducer';
import {
  formatSeconds,
  playerStatLines,
  pointDurationDetail,
  possessionTopShare,
  sortPlayerStatLines,
  stoppageDetail,
  teamStats,
} from '../state/stats';
import type { PlayerStatLine } from '../state/stats';
import type { Action, GameConfig, GameState, LogEntry, PointRecord } from '../state/types';

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
      statsMode: 'players',
      trackTurnovers: true,
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
    // toMatchObject rather than toEqual: it still pins the length and every value
    // this test is about, without also pinning the line-tracking columns (all zero
    // here — this game is in 'player' mode, where lines don't exist).
    expect(lines).toMatchObject([
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
        statsMode: 'players',
        trackTurnovers: true,
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
      expect(lines).toMatchObject([
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
      const config = cfg({ statsMode: 'players', trackTurnovers: true, players: { A: [], B: [] } });
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

describe('possessionTopShare', () => {
  const point = (patch: Partial<PointRecord> = {}): PointRecord => ({
    scoredBy: 'A',
    offense: 'A',
    isBreak: false,
    durationSeconds: 30,
    half: 1,
    turnovers: 0,
    ...patch,
  });

  it('is the tracked-seconds ratio when any accrued', () => {
    const p = point({ possessionSeconds: { A: 30, B: 10 } });
    expect(possessionTopShare(p, 'A')).toBe(0.75);
    expect(possessionTopShare(p, 'B')).toBe(0.25);
  });

  it('falls back to possession counting for a zero-second point, so a fast goal still gets a bar', () => {
    // No turnovers: the receiving team held the disc for the whole (instant) point.
    const clean = point({ possessionSeconds: { A: 0, B: 0 }, turnovers: 0, offense: 'A' });
    expect(possessionTopShare(clean, 'A')).toBe(1);
    expect(possessionTopShare(clean, 'B')).toBe(0);

    // One instant turnover: one possession each.
    const callahan = point({ possessionSeconds: { A: 0, B: 0 }, turnovers: 1, offense: 'A' });
    expect(possessionTopShare(callahan, 'A')).toBe(0.5);

    // Two turnovers: the offense held twice of three possessions.
    const messy = point({ possessionSeconds: { A: 0, B: 0 }, turnovers: 2, offense: 'B' });
    expect(possessionTopShare(messy, 'B')).toBeCloseTo(2 / 3);
    expect(possessionTopShare(messy, 'A')).toBeCloseTo(1 / 3);
  });

  it('stays null for a point that never tracked possession at all', () => {
    expect(possessionTopShare(point(), 'A')).toBeNull();
  });
});

describe('per-player line stats', () => {
  /** Enough of a roster for two distinguishable lines. */
  const roster = [
    { id: 'p1', number: '1', name: 'One' },
    { id: 'p2', number: '2', name: 'Two' },
    { id: 'p3', number: '3', name: 'Three' },
  ];
  const lineCfg = cfg({
    statsMode: 'players',
    trackTurnovers: true,
    trackedTeam: 'A',
    lineSize: 2,
    lines: { ...defaultConfig.lines, enabled: true },
    players: { A: roster, B: [] },
  });

  /**
   * Three points for A, all with a registered line. The scorer pulls, so scoring
   * puts a team on defence for the point after:
   *   0: A receives (startingOffense) and holds.       p1, p2  (O, won)
   *   1: A pulls; B gives the disc up once and A
   *      scores — a break, off one break chance.       p1, p2  (D, won)
   *   2: A pulls; B holds without ever losing it, so
   *      the line never touched the disc.              p1, p3  (D, lost, no D)
   */
  function played(): GameState {
    let s = gameReducer(createInitialState(lineCfg), { type: 'START_GAME', config: lineCfg });
    s = gameReducer(s, { type: 'BEGIN_PLAY' });
    s = run(
      s,
      { type: 'SET_LINE', playerIds: ['p1', 'p2'], lineName: 'O1' },
      { type: 'PULL_THROWN' },
      { type: 'GOAL', team: 'A' },
      { type: 'SET_LINE', playerIds: ['p1', 'p2'], lineName: 'D1' },
      { type: 'PULL_THROWN' },
      { type: 'TURNOVER' }, // B gives it up: a break chance for A's D-line
      { type: 'GOAL', team: 'A' },
      { type: 'SET_LINE', playerIds: ['p1', 'p3'], lineName: 'D1' },
      { type: 'PULL_THROWN' },
      { type: 'GOAL', team: 'B' },
    );
    return s;
  }

  it('counts points played, split into O and D', () => {
    const lines = playerStatLines(played(), ['A'], t);
    const byId = new Map(lines.map((l) => [l.playerId, l]));
    expect(byId.get('p1')).toMatchObject({ pointsPlayed: 3, oPoints: 1, dPoints: 2 });
    expect(byId.get('p2')).toMatchObject({ pointsPlayed: 2, oPoints: 1, dPoints: 1 });
    expect(byId.get('p3')).toMatchObject({ pointsPlayed: 1, oPoints: 0, dPoints: 1 });
  });

  it('splits the points played into holds, breaks and plus-minus', () => {
    const byId = new Map(playerStatLines(played(), ['A'], t).map((l) => [l.playerId, l]));
    // p1 was on for all three: one hold, one break, one loss.
    expect(byId.get('p1')).toMatchObject({ holds: 1, breaks: 1, plusMinus: 1 });
    // p2 won both of theirs.
    expect(byId.get('p2')).toMatchObject({ holds: 1, breaks: 1, plusMinus: 2 });
    // p3 was only on for the point A lost.
    expect(byId.get('p3')).toMatchObject({ holds: 0, breaks: 0, plusMinus: -1 });
  });

  it('counts break chances on the field', () => {
    const byId = new Map(playerStatLines(played(), ['A'], t).map((l) => [l.playerId, l]));
    // Point 2 was A on D with one turnover: one chance, for whoever was on.
    expect(byId.get('p1')).toMatchObject({ breakChances: 1 });
    expect(byId.get('p2')).toMatchObject({ breakChances: 1 });
    // p3's only point was the one B held clean — no chance at a break.
    expect(byId.get('p3')).toMatchObject({ breakChances: 0 });
  });

  it('lists the predefined lines a player appeared in', () => {
    const byId = new Map(playerStatLines(played(), ['A'], t).map((l) => [l.playerId, l]));
    expect(byId.get('p1')?.lines).toEqual([
      { name: 'D1', points: 2 },
      { name: 'O1', points: 1 },
    ]);
    expect(byId.get('p3')?.lines).toEqual([{ name: 'D1', points: 1 }]);
  });

  // Before line tracking a player only appeared once they had scored; someone who
  // played ten points without scoring is exactly who the coach is looking for.
  it('lists a player who took the field but never scored', () => {
    const lines = playerStatLines(played(), ['A'], t);
    expect(lines.map((l) => l.playerId)).toContain('p3');
    expect(lines.find((l) => l.playerId === 'p3')).toMatchObject({ goals: 0, assists: 0 });
  });

  it('counts turnovers attributed to the player who lost the disc', () => {
    let s = gameReducer(createInitialState(lineCfg), { type: 'START_GAME', config: lineCfg });
    s = gameReducer(s, { type: 'BEGIN_PLAY' });
    s = run(
      s,
      { type: 'PULL_THROWN' },
      // A received the pull, so A is the team that can lose it first — the
      // turnover's team is whoever gave the disc up, which is who turnoverId names.
      { type: 'TURNOVER', turnoverId: 'p1' },
      { type: 'GOAL', team: 'B' },
    );
    const byId = new Map(playerStatLines(s, ['A'], t).map((l) => [l.playerId, l]));
    expect(byId.get('p1')?.turns).toBe(1);
    // One turnover was attributed, so the column means what it says for everybody.
    expect(playerStatLines(s, ['A'], t).every((l) => l.turnsRecorded)).toBe(true);
  });

  // With "Ask who turned it over" off, every turnover is logged with no player. A
  // column of zeroes would then read as a roster that never lost the disc, which is
  // the opposite of what happened.
  it('reports turns as unrecorded when turnovers were logged but never attributed', () => {
    let s = gameReducer(createInitialState(lineCfg), { type: 'START_GAME', config: lineCfg });
    s = gameReducer(s, { type: 'BEGIN_PLAY' });
    s = run(
      s,
      { type: 'SET_LINE', playerIds: ['p1', 'p2'] },
      { type: 'PULL_THROWN' },
      { type: 'TURNOVER' },
      { type: 'GOAL', team: 'B' },
    );
    const lines = playerStatLines(s, ['A'], t);
    const players = lines.filter((l) => !l.unassigned);
    expect(players.length).toBeGreaterThan(0);
    expect(players.every((l) => l.turnsRecorded === false)).toBe(true);
    // The turnover itself is not lost: it goes to the aggregate, the one row whose
    // figure is meaningful, exactly as an unattributed goal does.
    expect(lines.find((l) => l.unassigned)).toMatchObject({ turns: 1, turnsRecorded: true });
  });

  // A team that never turned it over is recorded, not unknown: zero is the answer.
  it('counts turns as recorded when the team lost the disc no times at all', () => {
    let s = gameReducer(createInitialState(lineCfg), { type: 'START_GAME', config: lineCfg });
    s = gameReducer(s, { type: 'BEGIN_PLAY' });
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' });
    s = gameReducer(s, { type: 'SET_GOAL_PLAYERS', team: 'A', scorerId: 'p1', assistId: null });
    expect(playerStatLines(s, ['A'], t).every((l) => l.turnsRecorded)).toBe(true);
  });

  // `off` is about when, not whether: a player replaced mid-point still played it, so
  // every stat has to keep counting them.
  it('still counts a point for a player who was substituted off during it', () => {
    let s = gameReducer(createInitialState(lineCfg), { type: 'START_GAME', config: lineCfg });
    s = gameReducer(s, { type: 'BEGIN_PLAY' });
    s = run(
      s,
      { type: 'SET_LINE', playerIds: ['p1', 'p2'] },
      { type: 'PULL_THROWN' },
      // p1 rolls an ankle and p3 comes on.
      { type: 'SET_LINE', playerIds: ['p2', 'p3'] },
      { type: 'GOAL', team: 'A' },
    );
    const byId = new Map(playerStatLines(s, ['A'], t).map((l) => [l.playerId, l]));
    expect(byId.get('p1')).toMatchObject({ pointsPlayed: 1, holds: 1, plusMinus: 1 });
    expect(byId.get('p3')).toMatchObject({ pointsPlayed: 1, holds: 1 });
  });

  it('counts the points nobody registered onto the aggregate', () => {
    let s = gameReducer(createInitialState(lineCfg), { type: 'START_GAME', config: lineCfg });
    s = gameReducer(s, { type: 'BEGIN_PLAY' });
    s = run(
      s,
      { type: 'SET_LINE', playerIds: ['p1', 'p2'] },
      { type: 'PULL_THROWN' },
      { type: 'GOAL', team: 'A' },
      // Second point: nobody registered a line.
      { type: 'PULL_THROWN' },
      { type: 'GOAL', team: 'A' },
    );
    const aggregate = playerStatLines(s, ['A'], t).find((l) => l.unassigned);
    // Without this the points column would quietly under-report the game.
    expect(aggregate).toMatchObject({ pointsPlayed: 1 });
  });

  // The default-off invariant: nothing about the table changes until lines are on.
  it('leaves every line field at zero when line tracking is off', () => {
    const off = cfg({
      statsMode: 'players',
      trackTurnovers: true,
      trackedTeam: 'A',
      players: { A: roster, B: [] },
    });
    let s = gameReducer(createInitialState(off), { type: 'START_GAME', config: off });
    s = gameReducer(s, { type: 'BEGIN_PLAY' });
    s = run(
      s,
      { type: 'SET_LINE', playerIds: ['p1', 'p2'] },
      { type: 'PULL_THROWN' },
      { type: 'GOAL', team: 'A' },
    );
    s = gameReducer(s, { type: 'SET_GOAL_PLAYERS', team: 'A', scorerId: 'p1', assistId: null });
    const lines = playerStatLines(s, ['A'], t);
    expect(lines.every((l) => l.pointsPlayed === 0 && l.plusMinus === 0)).toBe(true);
    // And the aggregate does not start counting unregistered points either.
    expect(lines.find((l) => l.unassigned)?.pointsPlayed).toBe(0);
  });
});

describe('sortPlayerStatLines', () => {
  const line = (patch: Partial<PlayerStatLine>): PlayerStatLine => ({
    team: 'A',
    playerId: patch.label ?? 'x',
    label: 'x',
    goals: 0,
    assists: 0,
    total: 0,
    pointsPlayed: 0,
    oPoints: 0,
    dPoints: 0,
    holds: 0,
    breaks: 0,
    plusMinus: 0,
    turns: 0,
    turnsRecorded: true,
    defenses: 0,
    defensesRecorded: true,
    breakChances: 0,
    lines: [],
    ...patch,
  });

  // Each view ranks by the stat it is about — a Possession view ordered by goals
  // would be answering a different question than the one it asks.
  it('orders each view by its own primary column', () => {
    const lines = [
      line({ label: 'scorer', total: 5, goals: 5 }),
      line({ label: 'workhorse', pointsPlayed: 12 }),
      line({ label: 'defender', defenses: 7 }),
    ];
    expect(sortPlayerStatLines(lines, 'scoring')[0].label).toBe('scorer');
    expect(sortPlayerStatLines(lines, 'playing')[0].label).toBe('workhorse');
    expect(sortPlayerStatLines(lines, 'possession')[0].label).toBe('defender');
  });

  // Turns leads the Possession view, but sorting by it would rank the team by who
  // lost the disc most. Break chances stay the fallback they always were.
  it('ranks the possession view by defences, not by the turnovers it leads with', () => {
    const lines = [
      line({ label: 'sloppy', turns: 9 }),
      line({ label: 'defender', defenses: 3 }),
      line({ label: 'lurker', breakChances: 6 }),
    ];
    expect(sortPlayerStatLines(lines, 'possession').map((l) => l.label)).toEqual([
      'defender',
      'lurker',
      'sloppy',
    ]);
  });

  it('breaks ties by label, so the order is stable', () => {
    const lines = [line({ label: 'zoe', total: 2 }), line({ label: 'ana', total: 2 })];
    expect(sortPlayerStatLines(lines, 'scoring').map((l) => l.label)).toEqual(['ana', 'zoe']);
  });

  it('does not mutate the list it was given', () => {
    const lines = [line({ label: 'a', total: 1 }), line({ label: 'b', total: 9 })];
    sortPlayerStatLines(lines, 'scoring');
    expect(lines.map((l) => l.label)).toEqual(['a', 'b']);
  });
});
