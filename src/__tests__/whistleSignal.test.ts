import { describe, expect, it } from 'vitest';
import { createInitialState, defaultConfig, gameReducer } from '../state/gameReducer';
import { currentWhistle } from '../state/whistleSignal';
import type { Action, GameConfig, GameState } from '../state/types';

const cfg = (patch: Partial<GameConfig> = {}): GameConfig => ({ ...defaultConfig, ...patch });
function run(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce(gameReducer, state);
}
function started(config = cfg()): GameState {
  const s = gameReducer(createInitialState(config), { type: 'START_GAME', config });
  return gameReducer(s, { type: 'BEGIN_PLAY' });
}
function live(config = cfg()): GameState {
  return run(started(config), { type: 'PULL_THROWN' });
}
function ticks(state: GameState, n: number): GameState {
  let s = state;
  for (let i = 0; i < n; i++) s = gameReducer(s, { type: 'TICK' });
  return s;
}

describe('currentWhistle — the single source for every whistle-and-sign', () => {
  it('blows 1/2/3 at 45/60/75 of the pull count, and nothing before 45', () => {
    const s = gameReducer(live(), { type: 'GOAL', team: 'A' }); // awaitingPull, pull clock at 0
    expect(currentWhistle(ticks(s, 44))).toBeNull();
    expect(currentWhistle(ticks(s, 45))).toMatchObject({ key: 'pull45', blasts: 1 });
    expect(currentWhistle(ticks(s, 60))).toMatchObject({ key: 'pull60', blasts: 2 });
    expect(currentWhistle(ticks(s, 75))).toMatchObject({ key: 'pull75', blasts: 3 });
  });

  it('blows one blast at the start of the game (the first pull)', () => {
    const s = started();
    expect(s.assist).toBe('firstPull');
    expect(currentWhistle(s)).toMatchObject({ blasts: 1 });
    expect(currentWhistle(s)?.key).toMatch(/^firstPull:/);
  });

  it('blows one blast at the start of the second half', () => {
    let s = live(cfg({ halfScore: 1, halfTimeBreakSeconds: 75 }));
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // reaches half
    s = gameReducer(s, { type: 'HALFTIME_END' });
    expect(currentWhistle(s)).toMatchObject({ blasts: 1 });
    expect(currentWhistle(s)?.key).toMatch(/^secondHalf:/);
  });

  it('after-pull timeout: message-only at 45 remaining, then 1 blast at 30 and 2 at 15', () => {
    const s = gameReducer(live(), { type: 'TIMEOUT_START', team: 'A' }); // total 90, afterPull
    expect(currentWhistle(ticks(s, 45))).toBeNull(); // remaining 45 — message only, no blast
    expect(currentWhistle(ticks(s, 60))).toMatchObject({ key: 'toReady30', blasts: 1 });
    expect(currentWhistle(ticks(s, 75))).toMatchObject({ key: 'toReady15', blasts: 2 });
  });

  it('three blasts when an after-pull timeout restarts play', () => {
    let s = gameReducer(live(), { type: 'TIMEOUT_START', team: 'A' });
    s = gameReducer(ticks(s, 90), { type: 'TIMEOUT_END' });
    expect(currentWhistle(s)).toMatchObject({ blasts: 3 });
    expect(currentWhistle(s)?.key).toMatch(/^timeoutRestart:/);
  });

  it('one blast when a before-pull timeout ends', () => {
    let s = gameReducer(live(), { type: 'GOAL', team: 'A' }); // awaitingPull
    s = gameReducer(s, { type: 'TIMEOUT_START', team: 'A' });
    s = gameReducer(gameReducer(s, { type: 'TICK' }), { type: 'TIMEOUT_END' });
    expect(currentWhistle(s)).toMatchObject({ blasts: 1 });
    expect(currentWhistle(s)?.key).toMatch(/^timeoutOver:/);
  });

  it('warns one minute before the second half only when the break is >= 120 s', () => {
    // Long break: one blast at 60 s remaining.
    let long = live(cfg({ halfScore: 1, halfTimeBreakSeconds: 180 }));
    long = gameReducer(long, { type: 'GOAL', team: 'A' });
    expect(long.status).toBe('halftime');
    expect(currentWhistle(ticks(long, 120))).toMatchObject({ key: 'halfWarn60', blasts: 1 });

    // Short break: same 60-s-remaining moment, but no warning.
    let short = live(cfg({ halfScore: 1, halfTimeBreakSeconds: 90 }));
    short = gameReducer(short, { type: 'GOAL', team: 'A' });
    expect(currentWhistle(ticks(short, 30))).toBeNull();
  });

  it('blows three at 45 s and 60 s of an unresolved call, and no more', () => {
    const s = gameReducer(live(), { type: 'CALL_MADE', kind: 'foul', team: 'A' });
    expect(currentWhistle(ticks(s, 44))).toBeNull();
    expect(currentWhistle(ticks(s, 45))).toMatchObject({ key: 'callWait:45', blasts: 3 });
    expect(currentWhistle(ticks(s, 46))).toBeNull();
    expect(currentWhistle(ticks(s, 60))).toMatchObject({ key: 'callWait:60', blasts: 3 });
    // The cadence stops there, however long the call drags on.
    expect(currentWhistle(ticks(s, 61))).toBeNull();
    expect(currentWhistle(ticks(s, 75))).toBeNull();
    expect(currentWhistle(ticks(s, 90))).toBeNull();
    expect(currentWhistle(ticks(s, 120))).toBeNull();
  });

  it('the same cadence applies to an unresolved stoppage', () => {
    const s = gameReducer(live(), { type: 'STOPPAGE', kind: 'injury', team: 'A' });
    expect(currentWhistle(ticks(s, 45))).toMatchObject({ key: 'callWait:45', blasts: 3 });
  });

  it('blows one blast when a time cap is reached, and again once the point that follows fixes the target', () => {
    let s = live(cfg({ timeLimitMinutes: 1 })); // default endCap: { kind: 'cap', plus: 1 }
    s = ticks(s, 60); // reaches the end-game time cap
    expect(s.assist).toBe('capPending');
    expect(currentWhistle(s)).toMatchObject({ blasts: 1 });
    expect(currentWhistle(s)?.key).toMatch(/^capPending:/);

    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // finishes the point, fixes the target
    expect(s.assist).toBe('capReached');
    expect(currentWhistle(s)).toMatchObject({ blasts: 1 });
    expect(currentWhistle(s)?.key).toMatch(/^capReached:/);
  });

  it('blows one blast for a "no cap" time limit too — the game ends right after this point', () => {
    const s = ticks(live(cfg({ timeLimitMinutes: 1, endCap: { kind: 'none' } })), 60);
    expect(s.assist).toBe('capNoneFinishPoint');
    expect(currentWhistle(s)).toMatchObject({ blasts: 1 });
    expect(currentWhistle(s)?.key).toMatch(/^capNoneFinishPoint:/);
  });

  it('blows one blast when the half cap is reached, and again once the point that follows fixes the half target', () => {
    let s = live(cfg({ halfTimeLimitMinutes: 1 })); // default halfCap: { kind: 'cap', plus: 1 }
    s = ticks(s, 60); // reaches the half-time cap
    expect(s.assist).toBe('halfCapPending');
    expect(currentWhistle(s)).toMatchObject({ blasts: 1 });
    expect(currentWhistle(s)?.key).toMatch(/^halfCapPending:/);

    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // finishes the point, fixes the half target
    expect(s.assist).toBe('halfCapReached');
    expect(currentWhistle(s)).toMatchObject({ blasts: 1 });
    expect(currentWhistle(s)?.key).toMatch(/^halfCapReached:/);
  });

  it('blows one blast for a "no half cap" time limit too — half starts right after this point', () => {
    const s = ticks(live(cfg({ halfTimeLimitMinutes: 1, halfCap: { kind: 'none' } })), 60);
    expect(s.assist).toBe('halfCapNone');
    expect(currentWhistle(s)).toMatchObject({ blasts: 1 });
    expect(currentWhistle(s)?.key).toMatch(/^halfCapNone:/);
  });

  it('does not whistle a target known in advance, only one hit by time', () => {
    // One goal short of the (plain, uncapped) half target is announced in the bar
    // (`halfAt`) but never whistled — it was known from the start, not discovered
    // by a clock running out.
    const s = gameReducer(live(cfg({ halfScore: 2 })), { type: 'GOAL', team: 'A' });
    expect(s.assist).toBe('halfAt');
    expect(currentWhistle(s)).toBeNull();
  });
});

describe('water break', () => {
  const hot = cfg({ waterBreaks: { enabled: true, atScores: [1], durationSeconds: 20 } });

  it('blows once when the break ends, and stays silent while it runs out', () => {
    let s = gameReducer(live(hot), { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('waterBreak');
    expect(currentWhistle(s)).toBeNull();

    // The configured duration passing is the volunteer's cue, not a whistle.
    s = ticks(s, 25);
    expect(s.assist).toBe('waterBreakDue');
    expect(currentWhistle(s)).toBeNull();

    s = gameReducer(s, { type: 'WATER_BREAK_END' });
    expect(currentWhistle(s)).toEqual({ key: `waterBreakOver:${s.nextLogId}`, blasts: 1 });
  });
});
