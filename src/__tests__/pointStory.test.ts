import { beforeEach, describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import type { TFunc } from '../i18n/useT';
import { createInitialState, defaultConfig } from '../state/gameReducer';
import {
  lineResults,
  pointStories,
  pointsModel,
  type PointRowModel,
  type PointStory,
} from '../state/pointStory';
import type { GameState, LogEntry, PointRecord } from '../state/types';

const t: TFunc = (key, vars) => {
  const raw = en[key] as string;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
};

let nextLogId = 1;
function entry(type: LogEntry['type'], patch: Partial<LogEntry> = {}): LogEntry {
  return { id: nextLogId++, wallClock: '10:00:00', atMs: 0, gameSeconds: 0, type, ...patch };
}

function point(patch: Partial<PointRecord> = {}): PointRecord {
  return {
    scoredBy: 'A',
    offense: 'A',
    isBreak: false,
    durationSeconds: 10,
    half: 1,
    turnovers: 0,
    ...patch,
  };
}

function tracked(): GameState {
  const state = createInitialState(structuredClone(defaultConfig));
  state.phase = 'report';
  state.status = 'finished';
  state.config.statsMode = 'teams';
  state.config.trackTurnovers = true;
  return state;
}

const stories = (state: GameState): PointStory[] =>
  pointStories(state).flatMap((i) => (i.kind === 'point' ? [i.story] : []));
const rows = (state: GameState): PointRowModel[] =>
  pointsModel(state, t).rows.filter((r): r is PointRowModel => r.kind === 'point');

beforeEach(() => {
  nextLogId = 1;
});

describe('pointStories', () => {
  // UNDO_GOAL leaves the goal row standing once something was logged after it, and
  // appends an `undo`: the point resumed, so what was logged in between rejoins it.
  it('reopens a point whose goal was undone after something else was logged', () => {
    const state = tracked();
    state.points = [point({ scoredBy: 'B', offense: 'A', isBreak: true, turnovers: 1 })];
    state.log = [
      entry('goal', { team: 'A', gameSeconds: 20, pointSeconds: 20 }),
      entry('note', { detail: 'wrong team', gameSeconds: 21 }),
      entry('undo', { team: 'A', gameSeconds: 22 }),
      entry('turnover', { team: 'A', gameSeconds: 25 }),
      entry('goal', { team: 'B', gameSeconds: 40, pointSeconds: 40 }),
    ];
    const [story] = stories(state);
    expect(story.goal?.team).toBe('B');
    expect(story.events.map((e) => e.type)).toEqual(['note']);
    expect(story.possessions?.map((p) => [p.team, p.end, p.turnover?.gameSeconds])).toEqual([
      ['A', 'turn', 25],
      ['B', 'goal', undefined],
    ]);
  });

  // A Callahan (or a Turn nobody tapped) leaves the conceding team holding the last
  // recorded possession: the scorer's is added, marked as never recorded.
  it("adds the scorer's possession when a break has no turnover recorded", () => {
    const state = tracked();
    state.points = [point({ scoredBy: 'B', offense: 'A', isBreak: true, turnovers: 0 })];
    state.log = [entry('goal', { team: 'B', gameSeconds: 15, pointSeconds: 15, callahan: true })];
    const [row] = rows(state);
    // Neither can be timed: nobody logged where the disc changed hands.
    expect(row.track).toEqual([
      { team: 'A', seconds: null, passes: null, passText: '', time: '', state: 'done' },
      { team: 'B', seconds: null, passes: null, passText: '', time: '', state: 'inferred' },
    ]);
    // The undated turnover is listed before the goal rather than placed in time.
    expect(row.timeline.map((l) => [l.clock, l.text])).toEqual([
      ['00:00', 'Pull to TEAM A'],
      ['', 'TEAM A — Turnover'],
      ['00:15', 'TEAM B — Goal (break) — Callahan'],
    ]);
  });

  it('labels each block with its passes, and leaves a team nobody counted blank', () => {
    const state = tracked();
    state.config.trackPasses = true;
    state.config.trackedTeam = 'A';
    state.points = [
      point({
        scoredBy: 'A',
        offense: 'A',
        turnovers: 2,
        passRuns: [
          { team: 'A', passes: 4 },
          { team: 'B', passes: 0 },
          { team: 'A', passes: 7 },
        ],
      }),
    ];
    state.log = [
      entry('turnover', { team: 'A', gameSeconds: 10 }),
      entry('turnover', { team: 'B', gameSeconds: 20 }),
      entry('goal', { team: 'A', gameSeconds: 40, pointSeconds: 40 }),
    ];
    const [row] = rows(state);
    // Timed off the turnovers (10s, 20s) and the goal (40s); passes only for TEAM A.
    expect(row.track?.map((w) => [w.team, w.seconds, w.passes, w.state])).toEqual([
      ['A', 10, 4, 'done'],
      ['B', 10, null, 'done'],
      ['A', 20, 7, 'goal'],
    ]);
    expect(row.summary).toEqual(['2 turns', '11 passes by TEAM A']);
    expect(row.timeline.map((l) => l.text)).toEqual([
      'Pull to TEAM A',
      'TEAM A · 10s · 4 passes — Turnover',
      'TEAM B · 10s — Turnover',
      'TEAM A · 20s · 7 passes — Goal',
    ]);
  });

  // Following one team, the other side's passes are optional: once any is recorded
  // they are told like a both-teams game, and the total stops naming one team.
  it("shows the unfollowed team's passes once any were recorded for them", () => {
    const state = tracked();
    state.config.trackPasses = true;
    state.config.trackedTeam = 'A';
    state.passesCompleted = { A: 11, B: 3 };
    state.points = [
      point({
        scoredBy: 'A',
        offense: 'A',
        turnovers: 2,
        passRuns: [
          { team: 'A', passes: 4 },
          { team: 'B', passes: 3 },
          { team: 'A', passes: 7 },
        ],
      }),
    ];
    state.log = [
      entry('turnover', { team: 'A', gameSeconds: 10 }),
      entry('turnover', { team: 'B', gameSeconds: 20 }),
      entry('goal', { team: 'A', gameSeconds: 40, pointSeconds: 40 }),
    ];
    const [row] = rows(state);
    expect(row.track?.map((w) => [w.team, w.passes])).toEqual([
      ['A', 4],
      ['B', 3],
      ['A', 7],
    ]);
    expect(row.summary).toEqual(['2 turns', '14 passes']);
  });

  it('tells the point in progress as unfinished, its last possession still open', () => {
    const state = tracked();
    state.phase = 'game';
    state.status = 'live';
    state.gameSeconds = 95;
    state.pointStartSeconds = 60;
    state.aliveSeconds = 35;
    state.offenseTeam = 'B';
    state.pointTurnovers = 1;
    state.log = [entry('gameStart'), entry('turnover', { team: 'B', gameSeconds: 70 })];
    const items = pointStories(state);
    expect(items.map((i) => i.kind)).toEqual(['marker', 'point']);
    const [row] = rows(state);
    expect(row.outcome).toBe('Not finished');
    expect(row.duration).toBe('35s');
    expect(row.track?.map((w) => `${w.team}:${w.state}:${w.time}`)).toEqual([
      'B:done:10s',
      'A:open:25s',
    ]);
    expect(row.timeline.map((l) => l.text)).toEqual([
      'Pull to TEAM B',
      'TEAM B · 10s — Turnover',
      'TEAM A · 25s — in possession',
    ]);
  });

  // A log that cannot be lined up with the points (an old build's) still gets every
  // point's outline, rather than moments pinned to the wrong point.
  it('draws the outline alone when the log and the points disagree', () => {
    const state = tracked();
    state.points = [
      point({ turnovers: 2, durationSeconds: 30 }),
      point({ scoredBy: 'B', offense: 'B' }),
    ];
    state.log = [entry('gameStart'), entry('turnover', { team: 'A' })];
    const [first, second] = rows(state);
    expect(first.track?.map((w) => [w.team, w.seconds])).toEqual([
      ['A', null],
      ['B', null],
      ['A', null],
    ]);
    expect(first.duration).toBe('30s');
    expect(first.timeline.map((l) => l.text)).toEqual(['TEAM A — Turnover', 'TEAM B — Turnover']);
    expect(second.score).toBe('1-1');
  });

  it('has no strip and no turn count when the game records no turnovers', () => {
    const state = tracked();
    state.config.trackTurnovers = false;
    state.points = [point()];
    state.log = [entry('goal', { team: 'A', gameSeconds: 10, pointSeconds: 10 })];
    const [row] = rows(state);
    expect(row.track).toBeNull();
    expect(row.summary).toEqual([]);
  });
  it('tells leaving from the menu as the game ending, not as a pause and then an end', () => {
    const state = tracked();
    state.points = [point()];
    state.log = [
      entry('gameStart'),
      entry('goal', { team: 'A', gameSeconds: 10, pointSeconds: 10 }),
      entry('pauseStart', { gameSeconds: 12 }),
      entry('gameEnd', { gameSeconds: 12 }),
    ];
    const markers = pointsModel(state, t).rows.flatMap((r) =>
      r.kind === 'marker' ? [r.text] : [],
    );
    expect(markers).toEqual(['Game start', 'Game end']);
  });
});

describe('lineResults', () => {
  it("counts each named line's O points held and D points broken, in name order", () => {
    const state = tracked();
    state.config.trackedTeam = 'A';
    state.points = [
      point({ offense: 'A', scoredBy: 'A', lineName: 'O1' }),
      point({ offense: 'A', scoredBy: 'B', lineName: 'O1' }),
      point({ offense: 'B', scoredBy: 'A', isBreak: true, lineName: 'D10' }),
      point({ offense: 'B', scoredBy: 'B', lineName: 'D2' }),
      point({ offense: 'B', scoredBy: 'B' }),
    ];
    expect(lineResults(state)).toEqual([
      { name: 'D2', oPlayed: 0, oHeld: 0, dPlayed: 1, dBroken: 0 },
      { name: 'D10', oPlayed: 0, oHeld: 0, dPlayed: 1, dBroken: 1 },
      { name: 'O1', oPlayed: 2, oHeld: 1, dPlayed: 0, dBroken: 0 },
    ]);
    expect(pointsModel(state, t).lines?.rows).toEqual([
      { name: 'D2', o: '—', d: '0/1' },
      { name: 'D10', o: '—', d: '1/1' },
      { name: 'O1', o: '1/2', d: '—' },
    ]);
  });
});
