import { describe, expect, it } from 'vitest';
import { createInitialState, defaultConfig, gameReducer } from '../state/gameReducer';
import { currentWhistle } from '../state/whistleSignal';
import type { Action, GameConfig, GameState } from '../state/types';

const cfg = (patch: Partial<GameConfig> = {}): GameConfig => ({ ...defaultConfig, ...patch });
function run(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce(gameReducer, state);
}
function started(config = cfg()): GameState {
  return gameReducer(createInitialState(config), { type: 'START_GAME', config });
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

  it('blows three at 45 s of an unresolved call, then every 15 s', () => {
    const s = gameReducer(live(), { type: 'CALL_MADE', kind: 'foul', team: 'A' });
    expect(currentWhistle(ticks(s, 44))).toBeNull();
    expect(currentWhistle(ticks(s, 45))).toMatchObject({ key: 'callWait:45', blasts: 3 });
    expect(currentWhistle(ticks(s, 46))).toBeNull();
    expect(currentWhistle(ticks(s, 60))).toMatchObject({ key: 'callWait:60', blasts: 3 });
  });

  it('the same cadence applies to an unresolved stoppage', () => {
    const s = gameReducer(live(), { type: 'STOPPAGE', kind: 'injury', team: 'A' });
    expect(currentWhistle(ticks(s, 45))).toMatchObject({ key: 'callWait:45', blasts: 3 });
  });

  it('never whistles for a cap', () => {
    let s = live(cfg({ timeLimitMinutes: 1 }));
    s = ticks(s, 60); // reaches the end-game time cap
    expect(s.timeCapReached).toBe(true);
    expect(currentWhistle(s)).toBeNull();
  });
});
