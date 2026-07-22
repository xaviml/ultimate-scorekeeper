import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canRecordEvent,
  canScore,
  canTurnover,
  canUndo,
  createInitialState,
  defaultConfig,
  gameReducer,
  halfTargetApplies,
  isUniversePoint,
  leftEndzoneTeam,
  pullFromSide,
  ruleARatio,
  timeoutAvailability,
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

  it('blocks scoring and turnovers while a call is unresolved, and unblocks on resolution', () => {
    const s = gameReducer(live(), { type: 'CALL_MADE', kind: 'foul', team: 'A' });
    expect(canScore(s).ok).toBe(false);
    expect(canScore(s).reason).toBe('callPending');
    expect(gameReducer(s, { type: 'GOAL', team: 'A' }).scores.A).toBe(0);

    expect(canTurnover(s).ok).toBe(false);
    expect(canTurnover(s).reason).toBe('callPending');
    expect(gameReducer(s, { type: 'TURNOVER' }).possessionTeam).toBe(s.possessionTeam);

    const resolved = gameReducer(s, { type: 'CALL_RESOLVED', resolution: 'accepted' });
    expect(canScore(resolved).ok).toBe(true);
    expect(gameReducer(resolved, { type: 'GOAL', team: 'A' }).scores.A).toBe(1);
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

  it('removes the goal entry outright when nothing was logged since the goal', () => {
    let s = gameReducer(live(), { type: 'GOAL', team: 'A' });
    expect(s.log.some((e) => e.type === 'goal')).toBe(true);
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    expect(s.log.some((e) => e.type === 'goal')).toBe(false);
    expect(s.log.some((e) => e.type === 'undo')).toBe(false);
  });

  it('logs a correction entry instead when something was recorded after the goal', () => {
    let s = gameReducer(live(), { type: 'GOAL', team: 'A' });
    s = gameReducer(s, { type: 'NOTE', text: 'checked in with captains' });
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    expect(s.log.some((e) => e.type === 'goal')).toBe(true);
    expect(s.log.some((e) => e.type === 'undo')).toBe(true);
  });

  it('allows undoing the goal that just reached half-time by score', () => {
    const config = cfg({ halfScore: 1 });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('halftime');
    expect(s.halftimePlayed).toBe(true);
    expect(canUndo(s, 'A').ok).toBe(true);

    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    expect(s.scores.A).toBe(0);
    expect(s.status).toBe('live');
    expect(s.half).toBe(1);
    // Reverting the goal also reverts the half itself, not just the score, so
    // half-time is eligible to trigger again once the point is replayed.
    expect(s.halftimePlayed).toBe(false);
    expect(s.secondary).toBeNull();
    // Nothing else was recorded in between, so both the goal and the automatic
    // halftimeStart entry it triggered are dropped rather than left dangling.
    expect(s.log.some((e) => e.type === 'goal')).toBe(false);
    expect(s.log.some((e) => e.type === 'halftimeStart')).toBe(false);
  });

  it('re-triggers half-time once the corrected goal is replayed', () => {
    const config = cfg({ halfScore: 1 });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' }); // mis-tap
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    s = gameReducer(s, { type: 'GOAL', team: 'B' }); // actual scorer
    expect(s.status).toBe('halftime');
    expect(s.scores).toEqual({ A: 0, B: 1 });
  });

  it('cannot pick up a stray correction entry from the break, since recording is blocked during half-time', () => {
    const config = cfg({ halfScore: 1 });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('halftime');
    const attempted = gameReducer(s, { type: 'NOTE', text: 'checked in with captains' });
    expect(attempted.log).toBe(s.log); // rejected outright, nothing appended
    s = gameReducer(attempted, { type: 'UNDO_GOAL', team: 'A' });
    // Nothing was actually recorded during the break, so this is the same clean
    // removal as when nothing happens at all between the goal and the undo.
    expect(s.log.some((e) => e.type === 'goal')).toBe(false);
    expect(s.log.some((e) => e.type === 'halftimeStart')).toBe(false);
    expect(s.log.some((e) => e.type === 'undo')).toBe(false);
    expect(s.status).toBe('live');
    expect(s.halftimePlayed).toBe(false);
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

describe('SHOW_RATIO_SIGNAL', () => {
  it('sets assist to nextRatio and bumps ratioSignalId so the signal card re-arms', () => {
    const config = cfg({ division: 'mixed', mixedRule: 'A', startingRatio: 'female' });
    const before = live(config);
    const idBefore = before.ratioSignalId;
    let s = gameReducer(before, { type: 'SHOW_RATIO_SIGNAL' });
    expect(s.assist).toBe('nextRatio');
    expect(s.ratioSignalId).toBe(idBefore + 1);
    // Tapping again while assist is already 'nextRatio' still bumps the id.
    s = gameReducer(s, { type: 'SHOW_RATIO_SIGNAL' });
    expect(s.ratioSignalId).toBe(idBefore + 2);
  });

  it('is a no-op when the division has no active ratio', () => {
    const config = cfg({ division: 'open' });
    const s = gameReducer(live(config), { type: 'SHOW_RATIO_SIGNAL' });
    expect(s.assist).not.toBe('nextRatio');
    expect(s.ratioSignalId).toBe(0);
  });
});

describe('caps', () => {
  it('resolves end cap +1 only once the point in progress has finished (Option B)', () => {
    const config = cfg({ timeLimitMinutes: 1, endCap: { kind: 'cap', plus: 1 } });
    let s = run(live(config), { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' }); // 1-0
    s = ticks(s, 60);
    expect(s.timeCapReached).toBe(true);
    // The horn names no number yet — the point still being played counts towards it.
    expect(s.cappedTarget).toBeNull();
    expect(s.assist).toBe('capPending');
    // That point finishes 2-0, so the game lands on the leader (2) plus the cap.
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.cappedTarget).toBe(3);
    expect(s.assist).toBe('capReached');
    expect(s.status).not.toBe('finished');
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' }); // 3-0 reaches it
    expect(s.status).toBe('finished');
  });

  it('caps the game on the score after the point, not the score at the horn', () => {
    // Horn at 9-9 with CAP +1: the point finishes 9-10, so the game is to 11 — not the
    // 10 that capping on the horn score would have given, which would have ended it.
    const config = cfg({
      timeLimitMinutes: 1,
      endCap: { kind: 'cap', plus: 1 },
      targetScore: 15,
      halfScore: 99, // keep half-time out of the way; this is about the end cap
    });
    let s = live(config);
    for (let i = 0; i < 9; i++) {
      s = run(s, { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' });
      s = run(s, { type: 'GOAL', team: 'B' }, { type: 'PULL_THROWN' });
    }
    expect(s.scores).toEqual({ A: 9, B: 9 });
    s = ticks(s, 60); // horn sounds mid-point
    expect(s.cappedTarget).toBeNull();
    s = gameReducer(s, { type: 'GOAL', team: 'B' }); // point finishes 9-10
    expect(s.cappedTarget).toBe(11);
    expect(s.status).not.toBe('finished');
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'B' }); // 9-11 wins it
    expect(s.status).toBe('finished');
  });

  it('never caps the game beyond the configured target score', () => {
    const config = cfg({ timeLimitMinutes: 1, endCap: { kind: 'cap', plus: 1 }, targetScore: 1 });
    let s = ticks(live(config), 60); // horn during the opening point, still 0-0
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // leader 1 + 1 = 2, clamped to 1
    expect(s.cappedTarget).toBe(1);
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

  it('resolves the half-time cap only once the point in progress has finished', () => {
    const config = cfg({
      halfTimeLimitMinutes: 1,
      halfCap: { kind: 'cap', plus: 1 },
      halfScore: 8,
    });
    let s = run(live(config), { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' }); // 1-0
    s = ticks(s, 60);
    expect(s.halfTimeCapReached).toBe(true);
    // The horn names no number yet — the point still being played counts towards it.
    expect(s.halfCappedTarget).toBeNull();
    expect(s.assist).toBe('halfCapPending');
    // That point finishes 2-0, so the half lands on the leader (2) plus the cap.
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.halfCappedTarget).toBe(3);
    expect(s.assist).toBe('halfCapReached');
    expect(s.status).not.toBe('halftime');
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' }); // 3-0 reaches the cap
    expect(s.status).toBe('halftime');
  });

  it('caps the half on the score after the point, not the score at the horn', () => {
    // Horn at 4-5 with CAP +1: the point finishes 4-6, so the half is at 7 — not the
    // 6 that capping on the horn score would have given.
    const config = cfg({
      halfTimeLimitMinutes: 1,
      halfCap: { kind: 'cap', plus: 1 },
      halfScore: 8,
      startingOffense: 'A',
    });
    let s = live(config);
    // Walk to 4-5 without touching the clock: only TICK advances it.
    for (const team of ['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B', 'B'] as const) {
      s = run(s, { type: 'GOAL', team }, { type: 'PULL_THROWN' });
    }
    expect(s.scores).toEqual({ A: 4, B: 5 });
    s = ticks(s, 60); // horn sounds mid-point
    expect(s.halfCappedTarget).toBeNull();
    s = gameReducer(s, { type: 'GOAL', team: 'B' }); // point finishes 4-6
    expect(s.halfCappedTarget).toBe(7);
    expect(s.status).not.toBe('halftime');
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'B' }); // 4-7 reaches it
    expect(s.status).toBe('halftime');
  });

  it('never caps the half beyond the configured half score', () => {
    const config = cfg({
      halfTimeLimitMinutes: 1,
      halfCap: { kind: 'cap', plus: 1 },
      halfScore: 1,
    });
    let s = ticks(live(config), 60); // horn during the opening point, still 0-0
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // leader 1 + 1 = 2, clamped to 1
    expect(s.halfCappedTarget).toBe(1);
    expect(s.status).toBe('halftime');
  });
});

describe('game target announcement', () => {
  it('names where the game ends the first time a team is one goal short', () => {
    const config = cfg({ targetScore: 3, halfScore: 99, startingOffense: 'A' });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' }); // 1-0
    expect(s.gameAnnounced).toBe(false);
    expect(s.assist).toBe('goalScored');
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' }); // 2-0, one short of 3
    expect(s.assist).toBe('gameAt');
    expect(s.gameAnnounced).toBe(true);
    expect(s.status).not.toBe('finished');
  });

  it('announces it only once, even when both teams get one short', () => {
    const config = cfg({ targetScore: 3, halfScore: 99, startingOffense: 'A' });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' }); // 1-0
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' }); // 2-0
    expect(s.assist).toBe('gameAt');
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'B' }); // 2-1
    // 2-2 leaves B one short too, and is a universe point — the more urgent shout wins,
    // but either way the target is not announced a second time.
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'B' }); // 2-2
    expect(s.assist).toBe('universePoint');
  });

  it('marks the target announced on a universe point even though the shout differs', () => {
    // The chip keys off gameAnnounced, so it must be set whenever the target becomes
    // known — including when "Universe point!" is what actually gets shouted.
    const config = cfg({ targetScore: 3, halfScore: 99, startingOffense: 'A' });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' }); // 1-0
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'B' }); // 1-1
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'B' }); // 1-2, B one short
    expect(s.gameAnnounced).toBe(true);
  });

  it('a resolved end cap announces the target instead of a separate call-out', () => {
    const config = cfg({ timeLimitMinutes: 1, endCap: { kind: 'cap', plus: 1 }, halfScore: 99 });
    let s = run(live(config), { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' }); // 1-0
    s = ticks(s, 60);
    expect(s.gameAnnounced).toBe(false);
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // 2-0, game capped to 3
    expect(s.assist).toBe('capReached');
    expect(s.gameAnnounced).toBe(true);
  });

  it('undoing the announcing goal lets it be announced again', () => {
    const config = cfg({ targetScore: 3, halfScore: 99, startingOffense: 'A' });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' }); // 1-0
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' }); // 2-0
    expect(s.gameAnnounced).toBe(true);
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    expect(s.gameAnnounced).toBe(false);
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.assist).toBe('gameAt');
  });
});

describe('half target applies', () => {
  it('is true while the half score is still what decides half-time', () => {
    expect(halfTargetApplies(live(cfg({ halfScore: 8, targetScore: 15 })))).toBe(true);
  });

  it('is false once half has been played', () => {
    const s = gameReducer(live(cfg({ halfScore: 1 })), { type: 'GOAL', team: 'A' });
    expect(s.halftimePlayed).toBe(true);
    expect(halfTargetApplies(s)).toBe(false);
  });

  it('is false when the game target is at or below the half target', () => {
    // The game-end check runs before the half check, so half can never be reached.
    expect(halfTargetApplies(live(cfg({ halfScore: 8, targetScore: 8 })))).toBe(false);
    expect(halfTargetApplies(live(cfg({ halfScore: 8, targetScore: 5 })))).toBe(false);
  });

  it('is false once an end cap has dropped the game target below the half target', () => {
    const config = cfg({
      halfScore: 8,
      targetScore: 15,
      timeLimitMinutes: 1,
      endCap: { kind: 'cap', plus: 1 },
    });
    let s = run(live(config), { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' }); // 1-0
    expect(halfTargetApplies(s)).toBe(true);
    s = ticks(s, 60);
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // 2-0 -> game capped to 3
    expect(s.cappedTarget).toBe(3);
    // Half was at 8; the game now ends at 3, so naming the half score is meaningless.
    expect(halfTargetApplies(s)).toBe(false);
  });

  it('is false when an Option A time cap will end the game on the next goal', () => {
    const config = cfg({ halfScore: 8, targetScore: 15, timeLimitMinutes: 1 });
    const s = ticks(live({ ...config, endCap: { kind: 'none' } }), 60);
    expect(s.timeCapReached).toBe(true);
    expect(halfTargetApplies(s)).toBe(false);
  });

  it('is false when the half time limit passed with no half cap', () => {
    // Half comes on the next goal whatever the score, so the threshold governs nothing.
    const config = cfg({ halfScore: 8, halfTimeLimitMinutes: 1, halfCap: { kind: 'none' } });
    const s = ticks(live(config), 60);
    expect(s.halfTimeCapReached).toBe(true);
    expect(halfTargetApplies(s)).toBe(false);
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

  it('flags a tie one point below a target just lowered by a time cap', () => {
    // The cap resolves on the goal that ends the point, so the universe point it
    // creates only appears then — never at the horn, which names no target yet.
    const config = cfg({ timeLimitMinutes: 1, endCap: { kind: 'cap', plus: 1 } });
    let s = run(live(config), { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' }); // 1-0
    s = run(s, { type: 'GOAL', team: 'B' }, { type: 'PULL_THROWN' }); // 1-1
    s = run(s, { type: 'GOAL', team: 'B' }, { type: 'PULL_THROWN' }); // 1-2
    s = ticks(s, 60);
    expect(s.timeCapReached).toBe(true);
    expect(s.cappedTarget).toBeNull();
    expect(isUniversePoint(s)).toBe(false);
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // 2-2 -> target = 2 + 1 = 3
    expect(s.cappedTarget).toBe(3);
    expect(isUniversePoint(s)).toBe(true);
    // Universe point outranks the cap announcement: it is the more urgent thing to shout.
    expect(s.assist).toBe('universePoint');
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

  it('blocks a timeout while a call is unresolved', () => {
    const s = gameReducer(live(), { type: 'CALL_MADE', kind: 'foul', team: 'A' });
    expect(timeoutAvailability(s, 'A').ok).toBe(false);
    expect(timeoutAvailability(s, 'A').reason).toBe('callPending');
    const blocked = gameReducer(s, { type: 'TIMEOUT_START', team: 'A' });
    expect(blocked.status).not.toBe('timeout');

    const resolved = gameReducer(s, { type: 'CALL_RESOLVED', resolution: 'accepted' });
    expect(timeoutAvailability(resolved, 'A').ok).toBe(true);
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

  it('names where half is the first time a team is one goal short', () => {
    const config = cfg({ halfScore: 3, startingOffense: 'A' });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' }); // 1-0
    expect(s.assist).toBe('goalScored');
    s = gameReducer(s, { type: 'PULL_THROWN' });
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // 2-0, one short of halfScore 3
    expect(s.assist).toBe('halfAt');
    expect(s.halfAnnounced).toBe(true);
    expect(s.status).not.toBe('halftime');
    s = gameReducer(s, { type: 'PULL_THROWN' });
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // 3-0 reaches half
    expect(s.assist).toBe('goHalftime');
    expect(s.status).toBe('halftime');
  });

  it('announces where half is only once, even when both teams get one short', () => {
    // 2-0 announces it; 2-2 must not, or the same fact is shouted twice a game.
    const config = cfg({ halfScore: 3, startingOffense: 'A' });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' }); // 1-0
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' }); // 2-0
    expect(s.assist).toBe('halfAt');
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'B' }); // 2-1
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'B' }); // 2-2, B one short too
    expect(s.assist).toBe('goalScored');
  });

  it('undoing the announcing goal lets it be announced again', () => {
    const config = cfg({ halfScore: 3, startingOffense: 'A' });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' }); // 1-0
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' }); // 2-0
    expect(s.halfAnnounced).toBe(true);
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' }); // back to 1-0
    expect(s.halfAnnounced).toBe(false);
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // 2-0 again
    expect(s.assist).toBe('halfAt');
  });

  it('a resolved half cap announces the new target instead of a separate call-out', () => {
    const config = cfg({
      halfTimeLimitMinutes: 1,
      halfCap: { kind: 'cap', plus: 1 },
      halfScore: 8,
    });
    let s = run(live(config), { type: 'GOAL', team: 'A' }, { type: 'PULL_THROWN' }); // 1-0
    s = ticks(s, 60);
    s = gameReducer(s, { type: 'GOAL', team: 'B' }); // 1-1, half capped to 2
    expect(s.halfCappedTarget).toBe(2);
    // The cap message already says "half at 2", so it stands in for the one-time
    // call-out rather than being followed by it.
    expect(s.assist).toBe('halfCapReached');
    expect(s.halfAnnounced).toBe(true);
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

  it('stays available during an SOTG pause', () => {
    // A foul called as the teams line up mid-dispute still has to be written down.
    const s = gameReducer(live(), { type: 'SOTG_TOGGLE' });
    expect(canRecordEvent(s).ok).toBe(true);
    expect(gameReducer(s, { type: 'TRAVEL', team: 'A' }).log.some((e) => e.type === 'travel')).toBe(
      true,
    );
  });

  it('blocks recording during a timeout or half-time', () => {
    // Unlike an SOTG pause, a timeout or half-time is a break in play — recording
    // waits for the game to resume, same as scoring does.
    const timeout = gameReducer(live(), { type: 'TIMEOUT_START', team: 'A' });
    expect(canRecordEvent(timeout).ok).toBe(false);
    expect(
      gameReducer(timeout, { type: 'TRAVEL', team: 'A' }).log.some((e) => e.type === 'travel'),
    ).toBe(false);

    const half = gameReducer(live(cfg({ halfScore: 1 })), { type: 'GOAL', team: 'A' });
    expect(half.status).toBe('halftime');
    expect(canRecordEvent(half).ok).toBe(false);
    expect(
      gameReducer(half, { type: 'TRAVEL', team: 'A' }).log.some((e) => e.type === 'travel'),
    ).toBe(false);
  });

  it('blocks travel, stoppage and every call before the pull is thrown', () => {
    // The disc isn't in play yet, so there's no play for these to describe —
    // off-side included, since nothing has happened yet for the marker to call.
    const s = started();
    expect(s.status).toBe('awaitingPull');
    expect(canRecordEvent(s, { requiresPull: true }).ok).toBe(false);
    expect(canRecordEvent(s, { requiresPull: true }).reason).toBe('pullNotThrown');

    const afterTravel = gameReducer(s, { type: 'TRAVEL', team: 'A' });
    expect(afterTravel.log.some((e) => e.type === 'travel')).toBe(false);

    const afterStoppage = gameReducer(s, { type: 'STOPPAGE', kind: 'injury', team: 'A' });
    expect(afterStoppage.log.some((e) => e.type === 'stoppage')).toBe(false);

    for (const kind of ['foul', 'stallOut', 'pick', 'offside', 'discDown', 'generic'] as const) {
      const after = gameReducer(s, { type: 'CALL_MADE', kind, team: 'A' });
      expect(after.pendingCall).toBeNull();
    }

    // A note and an SOTG stoppage are the only things still recordable while the
    // teams are lining up for the pull.
    expect(
      gameReducer(s, { type: 'NOTE', text: 'lining up' }).log.some((e) => e.type === 'note'),
    ).toBe(true);
  });

  it('records nothing before the game starts or after it ends', () => {
    for (const s of [createInitialState(cfg()), gameReducer(live(), { type: 'END_GAME' })]) {
      expect(canRecordEvent(s).ok).toBe(false);
      const after = run(
        s,
        { type: 'TRAVEL', team: 'A' },
        { type: 'CALL_MADE', kind: 'foul', team: 'A' },
        { type: 'NOTE', text: 'nope' },
        { type: 'STOPPAGE', kind: 'injury', team: 'A' },
      );
      expect(after.log.length).toBe(s.log.length);
      expect(after.pendingCall).toBeNull();
      expect(after.pendingStoppage).toBeNull();
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

  it('opens an injury without touching the clock, and logs how long the check took', () => {
    let s = gameReducer(live(), { type: 'STOPPAGE', kind: 'injury', team: 'B' });
    expect(s.pendingStoppage).toEqual({
      kind: 'injury',
      team: 'B',
      playerId: undefined,
      elapsedSeconds: 0,
      clockStopped: false,
    });
    expect(lastLog(s)).toMatchObject({ type: 'stoppage', team: 'B', stoppageKind: 'injury' });
    expect(s.assist).toBe('stoppageInjury');

    s = ticks(s, 30);
    const before = s.gameSeconds;
    s = gameReducer(s, { type: 'STOPPAGE_RESOLVED' });

    expect(s.pendingStoppage).toBeNull();
    expect(lastLog(s)).toMatchObject({
      type: 'stoppageResolved',
      team: 'B',
      stoppageKind: 'injury',
      resolutionSeconds: 30,
    });
    expect(s.assist).toBe('resumed');
    // Stoppages never touch the clock, resolving them included — this one settled
    // well within the two-minute grace period.
    expect(s.gameSeconds).toBe(before);
    expect(s.status).toBe('live');
  });

  it('opens a technical stoppage attributed to a team, never a player', () => {
    const s = gameReducer(live(), {
      type: 'STOPPAGE',
      kind: 'technical',
      team: 'A',
      playerId: 'p1',
    });
    expect(s.pendingStoppage).toEqual({
      kind: 'technical',
      team: 'A',
      playerId: undefined,
      elapsedSeconds: 0,
      clockStopped: false,
    });
    expect(lastLog(s)).toMatchObject({ type: 'stoppage', team: 'A', stoppageKind: 'technical' });
    expect(s.assist).toBe('stoppageTechnical');
  });

  it('refuses a second stoppage until the open one is resolved', () => {
    const first = gameReducer(live(), { type: 'STOPPAGE', kind: 'injury', team: 'A' });
    const second = gameReducer(first, { type: 'STOPPAGE', kind: 'technical', team: 'B' });
    expect(second).toBe(first);

    const resolved = gameReducer(first, { type: 'STOPPAGE_RESOLVED' });
    const next = gameReducer(resolved, { type: 'STOPPAGE', kind: 'technical', team: 'B' });
    expect(next.pendingStoppage).toMatchObject({ kind: 'technical', team: 'B' });
  });

  it('ignores a resolution when no stoppage is open', () => {
    const s = live();
    expect(gameReducer(s, { type: 'STOPPAGE_RESOLVED' })).toBe(s);
  });

  it('auto-stops the game clock once a stoppage runs unresolved for two minutes', () => {
    let s = gameReducer(live(), { type: 'STOPPAGE', kind: 'injury', team: 'A' });
    s = ticks(s, 119);
    expect(s.status).toBe('live');
    expect(s.gameSeconds).toBe(119);
    expect(s.pendingStoppage).toMatchObject({ elapsedSeconds: 119, clockStopped: false });

    s = ticks(s, 1);
    expect(s.status).toBe('paused');
    expect(s.statusBeforePause).toBe('live');
    expect(s.gameSeconds).toBe(120); // this tick's game-clock second still lands before the freeze
    expect(s.pendingStoppage).toMatchObject({ elapsedSeconds: 120, clockStopped: true });
    expect(lastLog(s)).toMatchObject({
      type: 'stoppageClockStopped',
      team: 'A',
      stoppageKind: 'injury',
    });
    expect(s.assist).toBe('stoppageClockStopped');

    // The game clock is frozen from here, but the stoppage keeps counting for
    // the eventual resolutionSeconds.
    s = ticks(s, 10);
    expect(s.gameSeconds).toBe(120);
    expect(s.pendingStoppage).toMatchObject({ elapsedSeconds: 130 });

    // "Resume game" (STOPPAGE_RESOLVED once clockStopped) un-pauses AND resolves.
    s = gameReducer(s, { type: 'STOPPAGE_RESOLVED' });
    expect(s.status).toBe('live');
    expect(s.statusBeforePause).toBeNull();
    expect(s.pendingStoppage).toBeNull();
    expect(lastLog(s)).toMatchObject({
      type: 'stoppageResolved',
      team: 'A',
      stoppageKind: 'injury',
      resolutionSeconds: 130,
    });
    expect(s.assist).toBe('resumed');

    // The clock resumes ticking normally afterward.
    s = ticks(s, 1);
    expect(s.gameSeconds).toBe(121);
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

describe('scheduled kickoff', () => {
  afterEach(() => vi.useRealTimers());

  it('holds the game at awaitingStart until the scheduled time, then opens the pull on its own', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T10:00:00'));
    const config = cfg({ startingTime: { enabled: true, time: '10:05' } });

    let s = gameReducer(createInitialState(config), { type: 'START_GAME', config });
    expect(s.phase).toBe('game');
    expect(s.status).toBe('awaitingStart');
    expect(s.startingAtMs).toBe(new Date('2024-06-01T10:05:00').getTime());
    expect(canScore(s).reason).toBe('gameNotStarted');
    expect(canRecordEvent(s).reason).toBe('gameNotStarted');
    expect(canUndo(s, 'A').reason).toBe('gameNotStarted');
    // A goal attempt (or any TICK before the scheduled time) changes nothing.
    expect(gameReducer(s, { type: 'GOAL', team: 'A' }).scores.A).toBe(0);

    vi.setSystemTime(new Date('2024-06-01T10:04:59'));
    s = gameReducer(s, { type: 'TICK' });
    expect(s.status).toBe('awaitingStart');
    expect(s.gameSeconds).toBe(0); // the game clock doesn't run before kickoff

    vi.setSystemTime(new Date('2024-06-01T10:05:00'));
    s = gameReducer(s, { type: 'TICK' });
    expect(s.status).toBe('awaitingPull');
    expect(s.startingAtMs).toBeNull();
    expect(s.assist).toBe('firstPull');
    expect(s.log[s.log.length - 1]).toMatchObject({ type: 'gameStart' });
    expect(canScore({ ...s, status: 'live' }).ok).toBe(true);
  });

  it('starts immediately if the configured time has already passed by the time Start game is pressed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T10:10:00'));
    const config = cfg({ startingTime: { enabled: true, time: '10:05' } });

    const s = gameReducer(createInitialState(config), { type: 'START_GAME', config });
    expect(s.status).toBe('awaitingPull');
    expect(s.startingAtMs).toBeNull();
  });

  it('starts immediately when no starting time is configured, as before', () => {
    const s = started();
    expect(s.status).toBe('awaitingPull');
    expect(s.startingAtMs).toBeNull();
  });
});
