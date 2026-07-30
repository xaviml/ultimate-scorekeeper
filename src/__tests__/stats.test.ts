import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import type { TFunc } from '../i18n/useT';
import { createInitialState, defaultConfig, gameReducer } from '../state/gameReducer';
import { playerStatLines, stoppageDetail, teamStats } from '../state/stats';
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

    expect(teamStats(s, 'A')).toMatchObject({
      score: 2,
      oLineHolds: 1,
      cleanHolds: 1,
      breakChances: 3,
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
      breakChances: 2,
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
    const lines = playerStatLines(withRoster(), ['A']);
    expect(lines).toEqual([
      { team: 'A', playerId: 'a1', label: 'Alex', goals: 1, assists: 1, total: 2 },
      { team: 'A', playerId: 'a2', label: 'Sam', goals: 1, assists: 1, total: 2 },
    ]);
    // Bench never scored or assisted, so it never shows up.
    expect(lines.some((l) => l.playerId === 'a3')).toBe(false);
  });

  it('combines both rosters when asked, keeping the same total-descending order', () => {
    const lines = playerStatLines(withRoster(), ['A', 'B']);
    expect(lines.map((l) => l.playerId)).toEqual(['a1', 'a2', 'b1']);
    expect(lines[2]).toMatchObject({ team: 'B', label: 'Jo', goals: 1, assists: 0, total: 1 });
  });
});
