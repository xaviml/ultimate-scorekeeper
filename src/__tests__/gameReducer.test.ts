import { describe, expect, it } from 'vitest';
import {
  canRecordEvent,
  canScore,
  canTurnover,
  canUndo,
  createInitialState,
  defaultConfig,
  gameReducer,
  isUniversePoint,
  leftEndzoneTeam,
  pullFromSide,
  ruleARatio,
  timeoutsConfigured,
} from '../state/gameReducer';
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

describe('score validation', () => {
  it('blocks scoring before the game starts', () => {
    const s = createInitialState(cfg());
    expect(canScore(s).ok).toBe(false);
    expect(gameReducer(s, { type: 'GOAL', team: 'A' }).scores.A).toBe(0);
  });

  it('blocks scoring before the pull is thrown', () => {
    const s = started();
    expect(s.status).toBe('awaitingPull');
    expect(gameReducer(s, { type: 'GOAL', team: 'A' }).scores.A).toBe(0);
  });

  it('allows scoring once the pull is thrown', () => {
    const s = gameReducer(live(), { type: 'GOAL', team: 'A' });
    expect(s.scores.A).toBe(1);
    expect(s.status).toBe('awaitingPull'); // next point frozen until next pull
  });

  it('blocks scoring while paused, in timeout, and during half-time', () => {
    const sotg = gameReducer(live(), { type: 'SOTG_TOGGLE' });
    expect(gameReducer(sotg, { type: 'GOAL', team: 'B' }).scores.B).toBe(0);

    const to = gameReducer(live(), { type: 'TIMEOUT_START', team: 'A' });
    expect(to.status).toBe('timeout');
    expect(gameReducer(to, { type: 'GOAL', team: 'A' }).scores.A).toBe(0);

    const half = gameReducer(live(cfg({ halfScore: 1 })), { type: 'GOAL', team: 'A' });
    expect(half.status).toBe('halftime');
    expect(gameReducer(half, { type: 'GOAL', team: 'B' }).scores.B).toBe(0);
  });

  it('blocks scoring after a goal until the next pull is thrown', () => {
    let s = gameReducer(live(), { type: 'GOAL', team: 'A' });
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.scores.A).toBe(1);
    s = gameReducer(s, { type: 'PULL_THROWN' });
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.scores.A).toBe(2);
  });
});

describe('undo', () => {
  it('never lets a score go below 0', () => {
    const s = gameReducer(live(), { type: 'UNDO_GOAL', team: 'A' });
    expect(s.scores.A).toBe(0);
  });

  it('reverts score AND gender ratio flawlessly', () => {
    const config = cfg({ division: 'mixed', mixedRule: 'A', startingRatio: 'female' });
    let s = live(config);
    const ratioBefore = s.ratio;
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.nextRatio).not.toBeNull();
    // Undo works right away, before the next pull is thrown.
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    expect(s.scores.A).toBe(0);
    expect(s.ratio).toBe(ratioBefore);
    expect(s.pullingTeam).toBe('B'); // back to pre-goal puller
  });

  it('allows undoing a goal before the next pull is thrown', () => {
    const before = live();
    let s = gameReducer(before, { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('awaitingPull');
    expect(canUndo(s, 'A').ok).toBe(true);
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    expect(s.scores.A).toBe(0);
    // Undo rewinds to the live point that was in progress right before the
    // goal, not to the post-goal awaitingPull state — no pull to re-throw.
    expect(s.status).toBe('live');
    expect(s.secondary).toBeNull();
    expect(s.possessionTeam).toBe(before.possessionTeam);
  });

  it('only undoes the most recent goal', () => {
    const s = run(
      live(),
      { type: 'GOAL', team: 'A' },
      { type: 'PULL_THROWN' },
      { type: 'GOAL', team: 'B' },
      { type: 'PULL_THROWN' },
    );
    // Team A did not score last: undo on A does nothing.
    const afterWrongUndo = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    expect(afterWrongUndo.scores).toEqual({ A: 1, B: 1 });
    // Undo on B (last scorer) works.
    const afterUndo = gameReducer(s, { type: 'UNDO_GOAL', team: 'B' });
    expect(afterUndo.scores).toEqual({ A: 1, B: 0 });
  });
});

describe('mixed gender ratio (Rule A)', () => {
  it('alternates every two points after the first (A B B A A B B ...)', () => {
    expect(
      ['female', 'male', 'male', 'female', 'female', 'male', 'male', 'female'].map((_, i) =>
        ruleARatio('female', i),
      ),
    ).toEqual(['female', 'male', 'male', 'female', 'female', 'male', 'male', 'female']);
  });
});

describe('caps', () => {
  it('applies end cap +1 when the time limit is reached (Option B)', () => {
    const config = cfg({ timeLimitMinutes: 1, endCap: { kind: 'cap', plus: 1 } });
    let s = run(live(config), { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' });
    s = ticks(s, 60);
    expect(s.timeCapReached).toBe(true);
    expect(s.cappedTarget).toBe(2); // max(1,0) + 1
    // Team A scores again -> reaches capped target -> game over.
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('finished');
  });

  it('Option A: finishes the current point and ends the game', () => {
    const config = cfg({ timeLimitMinutes: 1, endCap: { kind: 'none' } });
    let s = ticks(live(config), 60);
    expect(s.timeCapReached).toBe(true);
    s = gameReducer(s, { type: 'GOAL', team: 'B' });
    expect(s.status).toBe('finished');
    expect(s.scores.B).toBe(1);
  });

  it('Option C: ends immediately if diff after current point > X, otherwise caps', () => {
    const config = cfg({
      timeLimitMinutes: 1,
      endCap: { kind: 'conditional', plus: 1, minDiff: 1 },
    });
    // Case 1: A leads 2-0, cap hits, A scores -> diff 3 > 1 -> game over.
    let s = run(
      live(config),
      { type: 'GOAL', team: 'A' },
      { type: 'PULL_THROWN' },
      { type: 'GOAL', team: 'A' },
      { type: 'PULL_THROWN' },
    );
    s = ticks(s, 60);
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('finished');

    // Case 2: tied 1-1 after the point -> diff 0, not > 1 -> capped target set, play on.
    let s2 = run(live(config), { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' });
    s2 = ticks(s2, 60);
    s2 = gameReducer(s2, { type: 'GOAL', team: 'B' });
    expect(s2.status).not.toBe('finished');
    expect(s2.cappedTarget).toBe(2); // max(1,1)+1
  });

  it('applies the half-time cap when the half time limit is reached', () => {
    const config = cfg({
      halfTimeLimitMinutes: 1,
      halfCap: { kind: 'cap', plus: 1 },
      halfScore: 8,
    });
    let s = run(live(config), { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' });
    s = ticks(s, 60);
    expect(s.halfTimeCapReached).toBe(true);
    expect(s.halfCappedTarget).toBe(2);
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('halftime');
  });
});

describe('universe point', () => {
  it('flags a tie one point below the plain target', () => {
    const config = cfg({ targetScore: 3 });
    let s = run(live(config), { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' }); // 1-0
    expect(isUniversePoint(s)).toBe(false);
    s = run(s, { type: 'GOAL', team: 'B' }, { type: 'PULL_THROWN' }); // 1-1, not yet at target-1
    expect(isUniversePoint(s)).toBe(false);
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // 2-1, not tied
    expect(isUniversePoint(s)).toBe(false);
    s = gameReducer(s, { type: 'PULL_THROWN' });
    s = gameReducer(s, { type: 'GOAL', team: 'B' }); // 2-2, tied one below target 3
    expect(s.assist).toBe('universePoint');
    expect(isUniversePoint(s)).toBe(true);
    // The next goal, by either team, ends the game outright.
    s = gameReducer(s, { type: 'PULL_THROWN' });
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('finished');
  });

  it('flags a tie one point below a target already lowered by a time cap', () => {
    const config = cfg({ timeLimitMinutes: 1, endCap: { kind: 'cap', plus: 1 } });
    let s = run(live(config), { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' }); // 1-0
    s = run(s, { type: 'GOAL', team: 'B' }, { type: 'PULL_THROWN' }); // 1-1
    s = ticks(s, 60); // time cap fires while tied -> capped target = max(1,1)+1 = 2
    expect(s.timeCapReached).toBe(true);
    expect(s.cappedTarget).toBe(2);
    expect(s.assist).toBe('universePoint');
    expect(isUniversePoint(s)).toBe(true);
  });

  it('is false once the game has finished', () => {
    const config = cfg({ targetScore: 1 });
    const s = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('finished');
    expect(isUniversePoint(s)).toBe(false);
  });
});

describe('timeouts', () => {
  it('enforces the per-half allowance', () => {
    const config = cfg({ timeouts: { ...defaultConfig.timeouts, perHalf: 1 } });
    const s = run(live(config), { type: 'TIMEOUT_START', team: 'A' }, { type: 'TIMEOUT_END' });
    const blocked = gameReducer(s, { type: 'TIMEOUT_START', team: 'A' });
    expect(blocked.status).not.toBe('timeout');
    // Other team still has theirs.
    const okB = gameReducer(s, { type: 'TIMEOUT_START', team: 'B' });
    expect(okB.status).toBe('timeout');
  });

  it('treats both budgets being null the same as zero, never going negative', () => {
    const config = cfg({ timeouts: { ...defaultConfig.timeouts, perHalf: null, perGame: null } });
    expect(timeoutsConfigured(config.timeouts)).toBe(false);
    const s = live(config);
    const blocked = gameReducer(s, { type: 'TIMEOUT_START', team: 'A' });
    expect(blocked.status).not.toBe('timeout');
    expect(blocked.timeoutsUsed.A.half1).toBe(0);
  });

  it('blocks all timeouts when disabled, regardless of budget', () => {
    const config = cfg({
      timeouts: { ...defaultConfig.timeouts, enabled: false, perHalf: 2, perGame: null },
    });
    expect(timeoutsConfigured(config.timeouts)).toBe(false);
    const blocked = gameReducer(live(config), { type: 'TIMEOUT_START', team: 'A' });
    expect(blocked.status).not.toBe('timeout');
  });

  it('blocks timeouts in the last 5 minutes when configured', () => {
    const config = cfg({
      timeLimitMinutes: 10,
      timeouts: { ...defaultConfig.timeouts, disallowLastFiveMinutes: true },
    });
    const s = ticks(live(config), 5 * 60 + 1); // inside the last 5 minutes
    const blocked = gameReducer(s, { type: 'TIMEOUT_START', team: 'A' });
    expect(blocked.status).not.toBe('timeout');
  });

  it('keeps the game clock running during a regular timeout, but not during SOTG', () => {
    let s = gameReducer(live(), { type: 'TIMEOUT_START', team: 'A' });
    expect(s.status).toBe('timeout');
    s = ticks(s, 10);
    expect(s.gameSeconds).toBe(10);

    const sotg = gameReducer(live(), { type: 'SOTG_TOGGLE' });
    expect(ticks(sotg, 10).gameSeconds).toBe(0);
  });

  it('resumes the pull timer where it left off after a timeout called mid-pull', () => {
    let s = gameReducer(live(), { type: 'GOAL', team: 'A' }); // back to awaitingPull, secondary pull timer resets to 0
    expect(s.status).toBe('awaitingPull');
    s = ticks(s, 27);
    expect(s.secondary).toMatchObject({ kind: 'pull', seconds: 27 });

    s = gameReducer(s, { type: 'TIMEOUT_START', team: 'A' });
    expect(s.status).toBe('timeout');
    s = ticks(s, 5);
    s = gameReducer(s, { type: 'TIMEOUT_END' });

    expect(s.status).toBe('awaitingPull');
    expect(s.secondary).toMatchObject({ kind: 'pull', seconds: 27 });
    s = ticks(s, 1);
    expect(s.secondary).toMatchObject({ kind: 'pull', seconds: 28 });
  });
});

describe('halves and pulls', () => {
  it('reaching the half score triggers half-time and the second half swaps the pull', () => {
    const config = cfg({ halfScore: 1, startingOffense: 'A' });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'B' });
    expect(s.status).toBe('halftime');
    s = gameReducer(s, { type: 'HALFTIME_END' });
    expect(s.half).toBe(2);
    expect(s.pullingTeam).toBe('A'); // A received first, so A pulls the second half
    expect(s.status).toBe('awaitingPull');
  });

  it('second-half message: no physical swap after an odd number of first-half points', () => {
    const config = cfg({ halfScore: 1, startingOffense: 'A' });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' }); // 1 point (odd)
    s = gameReducer(s, { type: 'HALFTIME_END' });
    expect(s.assist).toBe('secondHalfNoSwap');
  });

  it('second-half message: a physical swap is needed after an even number of first-half points', () => {
    const config = cfg({ halfScore: 2, startingOffense: 'A' });
    let s = run(
      live(config),
      { type: 'GOAL', team: 'A' },
      { type: 'PULL_THROWN' },
      { type: 'GOAL', team: 'A' }, // 2 points (even)
    );
    expect(s.status).toBe('halftime');
    s = gameReducer(s, { type: 'HALFTIME_END' });
    expect(s.assist).toBe('secondHalfPull');
  });

  it('keeps the game clock running during halftime', () => {
    const config = cfg({ halfScore: 1, startingOffense: 'A' });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'B' });
    expect(s.status).toBe('halftime');
    const before = s.gameSeconds;
    s = ticks(s, 10);
    expect(s.gameSeconds).toBe(before + 10);
  });

  it('flags one point away from half by plain score', () => {
    const config = cfg({ halfScore: 3, startingOffense: 'A' });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' }); // 1-0
    expect(s.assist).toBe('goalScored');
    s = gameReducer(s, { type: 'PULL_THROWN' });
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // 2-0, one short of halfScore 3
    expect(s.assist).toBe('halfPointAway');
    expect(s.status).not.toBe('halftime');
    s = gameReducer(s, { type: 'PULL_THROWN' });
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // 3-0 reaches half
    expect(s.assist).toBe('goHalftime');
    expect(s.status).toBe('halftime');
  });

  it('also flags one point away from a half target already lowered by a time cap', () => {
    const config = cfg({
      halfTimeLimitMinutes: 1,
      halfCap: { kind: 'cap', plus: 1 },
      halfScore: 8,
    });
    let s = run(live(config), { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' }); // 1-0
    s = ticks(s, 60);
    expect(s.halfCappedTarget).toBe(2); // max(1,0) + 1
    expect(s.assist).toBe('halfCapReached');
    // One more goal by either team reaches the capped target of 2 — one away first.
    s = gameReducer(s, { type: 'GOAL', team: 'B' }); // 1-1, one short of the capped target
    expect(s.assist).toBe('halfPointAway');
    expect(s.status).not.toBe('halftime');
  });

  it('half by time with no cap: finishes the current point, then goes to half', () => {
    const config = cfg({ halfTimeLimitMinutes: 1, halfCap: { kind: 'none' }, halfScore: 8 });
    // 1-1, still far from the half score, then the half time limit is reached mid-point.
    let s = run(
      live(config),
      { type: 'GOAL', team: 'A' },
      { type: 'PULL_THROWN' },
      { type: 'GOAL', team: 'B' },
      { type: 'PULL_THROWN' },
    );
    s = ticks(s, 60);
    expect(s.halfTimeCapReached).toBe(true);
    expect(s.halfCappedTarget).toBeNull(); // no cap: the half target is untouched
    expect(s.status).not.toBe('halftime'); // the point in progress must finish first
    // The next goal (finishing the current point) sends the game to half-time.
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('halftime');
    expect(s.scores).toEqual({ A: 2, B: 1 });
  });

  it('half by time called right after a goal still plays one more point before half', () => {
    const config = cfg({ halfTimeLimitMinutes: 1, halfCap: { kind: 'none' }, halfScore: 8 });
    // Reach the half time limit during the gap after a goal (status awaitingPull).
    let s = run(live(config), { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('awaitingPull');
    s = ticks(s, 60);
    expect(s.halfTimeCapReached).toBe(true);
    expect(s.status).toBe('awaitingPull'); // no half yet — a point must still be played
    // Play out the ensuing point; only when it finishes does half apply.
    s = gameReducer(s, { type: 'PULL_THROWN' });
    expect(s.status).toBe('live');
    s = gameReducer(s, { type: 'GOAL', team: 'B' });
    expect(s.status).toBe('halftime');
  });

  it('records holds vs breaks correctly', () => {
    // A receives the first pull (offense). A scores = hold; then B receives, A scores = break.
    const s = run(
      live(cfg({ startingOffense: 'A' })),
      { type: 'GOAL', team: 'A' }, // hold for A
      { type: 'PULL_THROWN' },
      { type: 'GOAL', team: 'A' }, // A was pulling -> defense -> break
    );
    expect(s.points[0].isBreak).toBe(false);
    expect(s.points[1].isBreak).toBe(true);
  });
});

describe('physical endzone sides', () => {
  it('opens with the puller on their starting end and swaps ends every point', () => {
    // startingSide A => A on the left end; startingOffense A => B pulls first, from the right.
    const config = cfg({ startingSide: 'A', startingOffense: 'A' });
    const s0 = started(config);
    expect(leftEndzoneTeam(s0)).toBe('A');
    expect(s0.pullingTeam).toBe('B');
    expect(pullFromSide(s0)).toBe('right');

    // After a point the ends swap: the left end is now the other team.
    const s1 = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    expect(leftEndzoneTeam(s1)).toBe('B');
    expect(s1.pullingTeam).toBe('A'); // scorer pulls next
    expect(pullFromSide(s1)).toBe('right');
  });

  it('a break flips the pulling end (A pulls left, A breaks, A then pulls right)', () => {
    // startingOffense B => A pulls first; startingSide A => A pulls from the left.
    const config = cfg({ startingSide: 'A', startingOffense: 'B' });
    const s0 = started(config);
    expect(s0.pullingTeam).toBe('A');
    expect(pullFromSide(s0)).toBe('left');

    // A pulls (defense); A scores => break; A now pulls from the right end.
    const s1 = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    expect(s1.points[0].isBreak).toBe(true);
    expect(s1.pullingTeam).toBe('A');
    expect(pullFromSide(s1)).toBe('right');
  });

  it('half-time mirrors the opening ends regardless of the first-half flow', () => {
    const config = cfg({ startingSide: 'A', startingOffense: 'A', halfScore: 1 });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('halftime');
    s = gameReducer(s, { type: 'HALFTIME_END' });
    expect(s.half).toBe(2);
    // A opened on the left end; the second half mirrors it, so B is on the left now.
    expect(leftEndzoneTeam(s)).toBe('B');
    expect(s.pullingTeam).toBe('A'); // the opening receiver pulls the second half
    expect(pullFromSide(s)).toBe('right');
  });

  it('restores the endzone side after an undo', () => {
    const config = cfg({ startingSide: 'A', startingOffense: 'A' });
    const before = pullFromSide(started(config));
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    expect(pullFromSide(s)).toBe(before);
  });
});

describe('player tracking', () => {
  it('adds a player to the right team roster', () => {
    const s = gameReducer(live(), { type: 'ADD_PLAYER', team: 'A', number: '7', name: 'Alex' });
    expect(s.config.players.A).toHaveLength(1);
    expect(s.config.players.A[0]).toMatchObject({ number: '7', name: 'Alex' });
    expect(s.config.players.B).toHaveLength(0);
  });

  it('ignores an add-player call with no number and no name', () => {
    const before = live();
    const s = gameReducer(before, { type: 'ADD_PLAYER', team: 'A', number: '  ', name: '' });
    expect(s.config.players.A).toHaveLength(0);
  });

  it('removes a player from the roster without touching the other team', () => {
    let s = gameReducer(live(), { type: 'ADD_PLAYER', team: 'A', number: '7', name: 'Alex' });
    s = gameReducer(s, { type: 'ADD_PLAYER', team: 'A', number: '9', name: 'Sam' });
    s = gameReducer(s, { type: 'ADD_PLAYER', team: 'B', number: '3', name: 'Jo' });
    const removedId = s.config.players.A[0].id;

    s = gameReducer(s, { type: 'REMOVE_PLAYER', team: 'A', id: removedId });

    expect(s.config.players.A).toHaveLength(1);
    expect(s.config.players.A[0]).toMatchObject({ number: '9', name: 'Sam' });
    expect(s.config.players.B).toHaveLength(1);
  });

  it('keeps a scored goal log entry after the scorer is removed from the roster', () => {
    let s = gameReducer(live(), { type: 'ADD_PLAYER', team: 'A', number: '7', name: 'Alex' });
    const scorerId = s.config.players.A[0].id;
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    s = gameReducer(s, { type: 'SET_GOAL_PLAYERS', team: 'A', scorerId, assistId: null });

    s = gameReducer(s, { type: 'REMOVE_PLAYER', team: 'A', id: scorerId });

    expect(s.config.players.A).toHaveLength(0);
    expect(s.points[0].scorerId).toBe(scorerId);
    const goalEntry = [...s.log].reverse().find((e) => e.type === 'goal');
    expect(goalEntry).toMatchObject({ scorerId });
  });

  it('records scorer and assist on the last point and the matching goal log entry', () => {
    let s = gameReducer(live(), { type: 'ADD_PLAYER', team: 'A', number: '7', name: 'Alex' });
    s = gameReducer(s, { type: 'ADD_PLAYER', team: 'A', number: '9', name: 'Sam' });
    const scorerId = s.config.players.A[0].id;
    const assistId = s.config.players.A[1].id;

    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    s = gameReducer(s, { type: 'SET_GOAL_PLAYERS', team: 'A', scorerId, assistId });

    expect(s.points[0]).toMatchObject({ scorerId, assistId });
    const goalEntry = [...s.log].reverse().find((e) => e.type === 'goal');
    expect(goalEntry).toMatchObject({ scorerId, assistId });
  });

  it('does nothing if the team does not match the most recent scorer', () => {
    let s = gameReducer(live(), { type: 'ADD_PLAYER', team: 'B', number: '3', name: 'Jo' });
    const assistId = s.config.players.B[0].id;
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // A scored, not B
    s = gameReducer(s, { type: 'SET_GOAL_PLAYERS', team: 'B', scorerId: null, assistId });
    expect(s.points[0].scorerId).toBeUndefined();
  });

  it('undo removes the attributed point along with the score', () => {
    let s = gameReducer(live(), { type: 'ADD_PLAYER', team: 'A', number: '7', name: 'Alex' });
    const scorerId = s.config.players.A[0].id;
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    s = gameReducer(s, { type: 'SET_GOAL_PLAYERS', team: 'A', scorerId, assistId: null });
    expect(s.points).toHaveLength(1);

    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    expect(s.points).toHaveLength(0);
  });
});

describe('turnovers', () => {
  it('is blocked until the pull is thrown, and allowed once the disc is live', () => {
    expect(canTurnover(started()).ok).toBe(false);
    expect(
      gameReducer(started(), { type: 'TURNOVER' }).log.some((e) => e.type === 'turnover'),
    ).toBe(false);

    const s = live(); // default config: A receives the first pull
    expect(canTurnover(s).ok).toBe(true);
    expect(s.possessionTeam).toBe('A');
  });

  it('flips possession without touching who is on offense for the point', () => {
    const s = gameReducer(live(), { type: 'TURNOVER' });
    expect(s.possessionTeam).toBe('B');
    expect(s.offenseTeam).toBe('A'); // fixed for the point, so hold/break stays right
    expect(s.log[s.log.length - 1]).toMatchObject({ type: 'turnover', team: 'A' });

    const back = gameReducer(s, { type: 'TURNOVER' });
    expect(back.possessionTeam).toBe('A');
    expect(back.log[back.log.length - 1]).toMatchObject({ type: 'turnover', team: 'B' });
  });

  it('still counts a goal after a turnover as a break for the defending team', () => {
    let s = gameReducer(live(), { type: 'TURNOVER' }); // A turns it over to B
    s = gameReducer(s, { type: 'GOAL', team: 'B' });
    expect(s.points[0]).toMatchObject({ scoredBy: 'B', offense: 'A', isBreak: true });
  });

  it('records the attacker and defender on the log entry', () => {
    let s = gameReducer(live(), { type: 'ADD_PLAYER', team: 'A', number: '7', name: 'Alex' });
    s = gameReducer(s, { type: 'ADD_PLAYER', team: 'B', number: '3', name: 'Sam' });
    const turnoverId = s.config.players.A[0].id;
    const defenseId = s.config.players.B[0].id;

    s = gameReducer(s, { type: 'TURNOVER', turnoverId, defenseId });
    expect(s.log[s.log.length - 1]).toMatchObject({
      type: 'turnover',
      team: 'A',
      turnoverId,
      defenseId,
    });
  });

  it('is blocked while paused, in a timeout and at half-time', () => {
    for (const action of [
      { type: 'SOTG_TOGGLE' },
      { type: 'TIMEOUT_START', team: 'A' },
    ] as Action[]) {
      const s = gameReducer(live(), action);
      expect(canTurnover(s).ok).toBe(false);
      expect(gameReducer(s, { type: 'TURNOVER' }).possessionTeam).toBe(s.possessionTeam);
    }
  });

  it('clears possession between points, so a stale turnover cannot be logged', () => {
    const s = gameReducer(live(), { type: 'GOAL', team: 'A' });
    expect(s.possessionTeam).toBeNull();
    expect(canTurnover(s).ok).toBe(false);

    const next = gameReducer(s, { type: 'PULL_THROWN' });
    expect(next.possessionTeam).toBe('B'); // A scored, so B receives
  });
});

describe('recorded events (travel, calls, notes)', () => {
  const lastLog = (s: GameState) => s.log[s.log.length - 1];

  it('records a travel against the calling team with no effect on the game', () => {
    const before = live();
    const s = gameReducer(before, { type: 'TRAVEL', team: 'B' });
    expect(lastLog(s)).toMatchObject({ type: 'travel', team: 'B' });
    expect(s.assist).toBe('travel');
    // Nothing about the game itself moved.
    expect(s.scores).toEqual(before.scores);
    expect(s.gameSeconds).toBe(before.gameSeconds);
    expect(s.status).toBe(before.status);
    expect(s.possessionTeam).toBe(before.possessionTeam);
  });

  it('stays available during a timeout, half-time and an SOTG pause', () => {
    // Unlike scoring, bookkeeping never stops — a foul called as the teams line up
    // still has to be written down.
    for (const action of [
      { type: 'SOTG_TOGGLE' },
      { type: 'TIMEOUT_START', team: 'A' },
    ] as Action[]) {
      const s = gameReducer(live(), action);
      expect(canRecordEvent(s).ok).toBe(true);
      expect(
        gameReducer(s, { type: 'TRAVEL', team: 'A' }).log.some((e) => e.type === 'travel'),
      ).toBe(true);
    }
  });

  it('records nothing before the game starts or after it ends', () => {
    for (const s of [createInitialState(cfg()), gameReducer(live(), { type: 'END_GAME' })]) {
      expect(canRecordEvent(s).ok).toBe(false);
      const after = run(
        s,
        { type: 'TRAVEL', team: 'A' },
        { type: 'CALL_MADE', kind: 'foul', team: 'A' },
        { type: 'NOTE', text: 'nope' },
      );
      expect(after.log.length).toBe(s.log.length);
      expect(after.pendingCall).toBeNull();
    }
  });

  it('opens a call against the team that made it, and shows its own signal', () => {
    const s = gameReducer(live(), { type: 'CALL_MADE', kind: 'foul', team: 'B' });
    expect(s.pendingCall).toEqual({ kind: 'foul', team: 'B', startedAtSeconds: 0 });
    expect(lastLog(s)).toMatchObject({ type: 'call', team: 'B', callKind: 'foul' });
    expect(s.assist).toBe('call_foul');
    expect(s.possessionTeam).toBe('A'); // a call never hands the disc over
  });

  it('logs the resolution with how long it took on the game clock', () => {
    let s = gameReducer(live(), { type: 'CALL_MADE', kind: 'pick', team: 'A' });
    s = ticks(s, 14);
    s = gameReducer(s, { type: 'CALL_RESOLVED', resolution: 'contested' });

    expect(s.pendingCall).toBeNull();
    expect(lastLog(s)).toMatchObject({
      type: 'callResolved',
      team: 'A', // still the caller, so the pair reads as one story
      callKind: 'pick',
      resolution: 'contested',
      resolutionSeconds: 14,
    });
    expect(s.assist).toBe('resolution_contested');
  });

  it('refuses a second call until the open one is resolved', () => {
    const first = gameReducer(live(), { type: 'CALL_MADE', kind: 'foul', team: 'A' });
    const second = gameReducer(first, { type: 'CALL_MADE', kind: 'travel' as never, team: 'B' });
    expect(second).toBe(first);

    const resolved = gameReducer(first, { type: 'CALL_RESOLVED', resolution: 'accepted' });
    const next = gameReducer(resolved, { type: 'CALL_MADE', kind: 'stallOut', team: 'B' });
    expect(next.pendingCall).toMatchObject({ kind: 'stallOut', team: 'B' });
  });

  it('ignores a resolution when no call is open', () => {
    const s = live();
    expect(gameReducer(s, { type: 'CALL_RESOLVED', resolution: 'accepted' })).toBe(s);
  });

  it('logs a note as free text and stays silent about it', () => {
    const s = gameReducer(live(), { type: 'NOTE', text: '  huge layout by #7  ' });
    expect(lastLog(s)).toMatchObject({ type: 'note', detail: 'huge layout by #7' });
    // `note` maps to neither a call-out nor a signal, so nothing is shown — but the
    // assist key must still change, or the previous announcement would replay.
    expect(s.assist).toBe('note');
  });

  it('drops an empty note instead of logging a blank row', () => {
    const s = live();
    expect(gameReducer(s, { type: 'NOTE', text: '   ' })).toBe(s);
  });
});
