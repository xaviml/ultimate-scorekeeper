import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canRecordEvent,
  canScore,
  canStoppage,
  canTurnover,
  canUndo,
  canUndoTurnover,
  canWaterBreak,
  capTargetOptions,
  createInitialState,
  defaultConfig,
  gameReducer,
  halfTargetApplies,
  isUniversePoint,
  leftEndzoneTeam,
  playerTrackingFor,
  possessionTracked,
  pullFromSide,
  ruleARatio,
  statsTrackingEnabled,
  timeoutAvailability,
  timeoutsConfigured,
} from '../state/gameReducer';
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

describe('late pull', () => {
  it('logs nothing when the pull is thrown within 75s', () => {
    let s = started();
    s = ticks(s, 74);
    s = gameReducer(s, { type: 'PULL_THROWN' });
    expect(s.log.some((e) => e.type === 'latePull')).toBe(false);
  });

  it('logs a latePull entry with the team and how long it took once past 75s', () => {
    let s = started(cfg({ startingOffense: 'A' })); // B pulls first
    s = ticks(s, 82);
    s = gameReducer(s, { type: 'PULL_THROWN' });
    expect(s.log[s.log.length - 1]).toMatchObject({
      type: 'latePull',
      team: 'B',
      resolutionSeconds: 82,
    });
  });

  it('a pull exactly at 75s is not late', () => {
    let s = started();
    s = ticks(s, 75);
    s = gameReducer(s, { type: 'PULL_THROWN' });
    expect(s.log.some((e) => e.type === 'latePull')).toBe(false);
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

  it('undoes the goal cleanly when nothing was recorded during the break', () => {
    const config = cfg({ halfScore: 1 });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('halftime');
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    expect(s.log.some((e) => e.type === 'goal')).toBe(false);
    expect(s.log.some((e) => e.type === 'halftimeStart')).toBe(false);
    expect(s.log.some((e) => e.type === 'undo')).toBe(false);
    expect(s.status).toBe('live');
    expect(s.halftimePlayed).toBe(false);
  });

  it('falls back to a visible correction when a note was written during the break', () => {
    const config = cfg({ halfScore: 1 });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('halftime');
    // A note is the one thing recordable during a break — the volunteer has a
    // free hand exactly then, so it must not be swallowed.
    s = gameReducer(s, { type: 'NOTE', text: 'checked in with captains' });
    expect(s.log.some((e) => e.type === 'note')).toBe(true);

    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    // Something was logged in between, so this is no longer a silent mis-tap fix:
    // the goal stays and the undo is recorded on top of it, the same fallback a
    // timeout called after the goal already produces.
    expect(s.log.some((e) => e.type === 'undo')).toBe(true);
    expect(s.log.some((e) => e.type === 'note')).toBe(true);
    // The score and the half are still rewound — only the log is more talkative.
    expect(s.scores).toEqual({ A: 0, B: 0 });
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

describe('naming a capped target by hand', () => {
  const halfConfig = cfg({
    halfTimeLimitMinutes: 1,
    halfCap: { kind: 'cap', plus: 1 },
    halfScore: 8,
    startingOffense: 'A',
  });

  /** 5-3 with the disc live and nothing on the clock yet — only TICK advances it. */
  function at5_3(config = halfConfig): GameState {
    let s = live(config);
    for (const team of ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'A'] as const) {
      s = run(s, { type: 'GOAL', team }, { type: 'PULL_THROWN' });
    }
    expect(s.scores).toEqual({ A: 5, B: 3 });
    return s;
  }

  it('offers both numbers the point in progress could still settle on', () => {
    const s = ticks(at5_3(), 60);
    expect(s.halfCappedTarget).toBeNull();
    // Leader 5 either stays put (half at 6) or goes to 6 (half at 7).
    expect(capTargetOptions(s, 'half')).toEqual([6, 7]);
    // Nothing to choose before the horn, and nothing to choose about a target no
    // cap has touched.
    expect(capTargetOptions(at5_3(), 'half')).toEqual([]);
    expect(capTargetOptions(s, 'game')).toEqual([]);
  });

  it('takes the hand-named half target and lets the next goal alone', () => {
    // The case the picker exists for: the goal that made it 5-3 was scored before the
    // horn, so the point it interrupted is the one already over and the half is 6 —
    // not "6 or 7, we'll see".
    let s = ticks(at5_3(), 60);
    s = gameReducer(s, { type: 'SET_CAP_TARGET', which: 'half', target: 6 });
    expect(s.halfCappedTarget).toBe(6);
    expect(s.halfAnnounced).toBe(true);
    // Silent: a correction to the bookkeeping, not a second cap to announce.
    expect(s.assist).toBe('capTargetSet');
    expect(currentWhistle(s)).toBeNull();
    expect(s.log[s.log.length - 1]).toMatchObject({ type: 'capTargetSet', detail: 'half:6' });
    // GOAL resolves a cap only while its target is null, so the point that finishes
    // after the pick leaves the named number alone rather than recomputing 6 or 7.
    s = gameReducer(s, { type: 'GOAL', team: 'B' }); // 5-4
    expect(s.halfCappedTarget).toBe(6);
    expect(s.status).not.toBe('halftime');
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' }); // 6-4 reaches it
    expect(s.status).toBe('halftime');
  });

  it('keeps the number movable by one after it has resolved', () => {
    let s = ticks(at5_3(), 60);
    s = gameReducer(s, { type: 'GOAL', team: 'B' }); // 5-4, half resolves to 6
    expect(s.halfCappedTarget).toBe(6);
    // The mirror mistake — that goal was scored before the horn too, so the point the
    // horn landed in is still being played and the half is one higher.
    expect(capTargetOptions(s, 'half')).toEqual([6, 7]);
    s = gameReducer(s, { type: 'SET_CAP_TARGET', which: 'half', target: 7 });
    expect(s.halfCappedTarget).toBe(7);
    s = run(s, { type: 'PULL_THROWN' }, { type: 'GOAL', team: 'A' }); // 6-4
    expect(s.status).not.toBe('halftime');
  });

  it('refuses a target the score or the configuration has ruled out', () => {
    const s = ticks(at5_3(), 60);
    for (const target of [5, 8, 0, 6.5]) {
      // 5 is already on the board, 8 is two points of doubt away, and the configured
      // half score is the ceiling.
      expect(gameReducer(s, { type: 'SET_CAP_TARGET', which: 'half', target })).toBe(s);
    }
    // No cap on that side of the game at all.
    expect(gameReducer(s, { type: 'SET_CAP_TARGET', which: 'game', target: 6 })).toBe(s);
  });

  it('offers nothing when the bounds leave a single number', () => {
    // Ceiling from the configured half score...
    let s = ticks(at5_3(cfg({ ...halfConfig, halfScore: 6 })), 60);
    expect(capTargetOptions(s, 'half')).toEqual([6]);
    // ...and from the game target, which the half has to stay below to ever arrive:
    // both horns sounded, the game named at 7, so the half can only be 6.
    const bothCaps = cfg({ ...halfConfig, timeLimitMinutes: 1, endCap: { kind: 'cap', plus: 1 } });
    s = ticks(at5_3(bothCaps), 60);
    s = run(
      s,
      { type: 'SET_CAP_TARGET', which: 'game', target: 7 },
      { type: 'SET_CAP_TARGET', which: 'half', target: 6 },
    );
    expect(capTargetOptions(s, 'half')).toEqual([6]);
    expect(halfTargetApplies(s)).toBe(true);
  });

  it('does the same for the end cap', () => {
    const config = cfg({ timeLimitMinutes: 1, endCap: { kind: 'cap', plus: 1 }, targetScore: 15 });
    let s = ticks(at5_3(config), 60);
    expect(s.timeCapReached).toBe(true);
    expect(capTargetOptions(s, 'game')).toEqual([6, 7]);
    s = gameReducer(s, { type: 'SET_CAP_TARGET', which: 'game', target: 6 });
    expect(s.cappedTarget).toBe(6);
    expect(s.gameAnnounced).toBe(true);
    expect(s.assist).toBe('capTargetSet');
    expect(currentWhistle(s)).toBeNull();
    s = gameReducer(s, { type: 'GOAL', team: 'A' }); // 6-3 ends it
    expect(s.status).toBe('finished');
  });

  it('offers nothing for a cap with no number to name', () => {
    // Option A ends the game on the point in progress, so there is no target to move.
    let s = ticks(at5_3(cfg({ timeLimitMinutes: 1, endCap: { kind: 'none' } })), 60);
    expect(capTargetOptions(s, 'game')).toEqual([]);
    // Option C before it resolves: one of its two outcomes is "the game is already
    // over", which a list of targets cannot say. Once resolved it moves like any other.
    const conditional = cfg({
      timeLimitMinutes: 1,
      endCap: { kind: 'conditional', plus: 1, minDiff: 3 },
      targetScore: 15,
    });
    s = ticks(at5_3(conditional), 60);
    expect(capTargetOptions(s, 'game')).toEqual([]);
    s = gameReducer(s, { type: 'GOAL', team: 'B' }); // 5-4, diff 1: game to 6
    expect(s.cappedTarget).toBe(6);
    expect(capTargetOptions(s, 'game')).toEqual([6, 7]);
  });

  it('lets undo take back a hand-named target with the goal it was named over', () => {
    let s = ticks(at5_3(), 60);
    s = gameReducer(s, { type: 'GOAL', team: 'B' }); // 5-4, half resolves to 6
    s = gameReducer(s, { type: 'SET_CAP_TARGET', which: 'half', target: 7 });
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'B' });
    expect(s.scores).toEqual({ A: 5, B: 3 });
    // Back to the horn's own state: pending, with both numbers on offer again.
    expect(s.halfCappedTarget).toBeNull();
    expect(capTargetOptions(s, 'half')).toEqual([6, 7]);
  });

  it('offers nothing once the cap has been spent', () => {
    let s = ticks(at5_3(), 60);
    s = gameReducer(s, { type: 'SET_CAP_TARGET', which: 'half', target: 6 });
    s = run(s, { type: 'GOAL', team: 'A' }); // 6-3 reaches the half
    expect(s.status).toBe('halftime');
    expect(capTargetOptions(s, 'half')).toEqual([]);
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

describe('game finish', () => {
  it('stays in phase game, status finished, once the target is reached', () => {
    const config = cfg({ targetScore: 1 });
    const s = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    expect(s.phase).toBe('game');
    expect(s.status).toBe('finished');
  });

  it('blocks scoring, timeouts and record events once finished', () => {
    const config = cfg({ targetScore: 1 });
    const s = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    expect(canScore(s).reason).toBe('gameFinished');
    expect(canRecordEvent(s).reason).toBe('gameFinished');
    expect(timeoutAvailability(s, 'A').ok).toBe(false);
    expect(timeoutAvailability(s, 'B').ok).toBe(false);
  });

  it('keeps the game clock running underneath while finished, but stops applying caps', () => {
    const config = cfg({ targetScore: 1, timeLimitMinutes: 1 });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('finished');
    const before = s.gameSeconds;
    s = ticks(s, 60);
    expect(s.gameSeconds).toBe(before + 60);
    // The time limit was blown right through, but a finished game has nothing left
    // for the end-game cap to do.
    expect(s.timeCapReached).toBe(false);
  });

  it('allows undoing the goal that finished the game, resuming with the elapsed clock', () => {
    const config = cfg({ targetScore: 1 });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('finished');
    expect(canUndo(s, 'A').ok).toBe(true);
    s = ticks(s, 10); // reviewing the finished screen for a while
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    expect(s.phase).toBe('game');
    expect(s.status).toBe('live');
    expect(s.scores.A).toBe(0);
    // Undo never touches the game clock — it kept advancing while finished, so the
    // resumed game picks up from there rather than losing the review time.
    expect(s.gameSeconds).toBe(10);
    // Nothing else was recorded in between, so both the goal and the automatic
    // gameEnd entry it triggered are dropped rather than left dangling.
    expect(s.log.some((e) => e.type === 'goal')).toBe(false);
    expect(s.log.some((e) => e.type === 'gameEnd')).toBe(false);
  });

  it('re-finishes once the corrected goal is replayed', () => {
    const config = cfg({ targetScore: 1 });
    let s = gameReducer(live(config), { type: 'GOAL', team: 'A' }); // mis-tap
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    s = gameReducer(s, { type: 'GOAL', team: 'B' }); // actual scorer
    expect(s.status).toBe('finished');
    expect(s.scores).toEqual({ A: 0, B: 1 });
  });

  it('OPEN_REPORT only moves to the report phase once the game has finished', () => {
    let s = live(cfg({ targetScore: 1 }));
    s = gameReducer(s, { type: 'OPEN_REPORT' });
    expect(s.phase).toBe('game'); // no-op: game not finished yet
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.status).toBe('finished');
    s = gameReducer(s, { type: 'OPEN_REPORT' });
    expect(s.phase).toBe('report');
  });

  it('END_GAME (manually ending it) skips the blocked review screen and opens the report right away', () => {
    // Unlike a goal finishing the game, there is no "goal that just did this" for the
    // volunteer to reconsider, so a manual end goes straight to the report.
    const s = gameReducer(live(), { type: 'END_GAME' });
    expect(s.status).toBe('finished');
    expect(s.phase).toBe('report');
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

  it('restarts the pull clock at 0 after a before-pull timeout ends', () => {
    let s = gameReducer(live(), { type: 'GOAL', team: 'A' }); // back to awaitingPull, pull clock at 0
    expect(s.status).toBe('awaitingPull');
    s = ticks(s, 27);
    expect(s.secondary).toMatchObject({ kind: 'pull', seconds: 27 });

    s = gameReducer(s, { type: 'TIMEOUT_START', team: 'A' });
    expect(s.status).toBe('timeout');
    // Before the pull, the timeout runs its plain configured duration (no +15).
    expect(s.secondary).toMatchObject({ kind: 'timeout', afterPull: false, total: 75 });

    s = gameReducer(s, { type: 'TIMEOUT_END' });
    expect(s.status).toBe('awaitingPull');
    expect(s.assist).toBe('timeoutOver');
    // The pull count restarts from 0 (WFDF: the standard pre-pull limits recommence),
    // NOT resumed at the 27 it had reached before the timeout.
    expect(s.secondary).toMatchObject({ kind: 'pull', seconds: 0 });
    s = ticks(s, 1);
    expect(s.secondary).toMatchObject({ kind: 'pull', seconds: 1 });
  });

  it('runs an after-pull timeout for duration + 15 and restarts play live', () => {
    let s = gameReducer(live(), { type: 'TIMEOUT_START', team: 'A' });
    expect(s.status).toBe('timeout');
    // After the pull, the disc stays dead for the configured duration plus a 15 s
    // "offence set" window before it goes live again (a 75 s timeout → 90 s).
    expect(s.secondary).toMatchObject({ kind: 'timeout', afterPull: true, total: 90, seconds: 90 });

    s = ticks(s, 90);
    expect(s.secondary).toMatchObject({ seconds: 0 });
    s = gameReducer(s, { type: 'TIMEOUT_END' });
    expect(s.status).toBe('live'); // disc back in play, not awaiting a pull
    expect(s.assist).toBe('timeoutRestart');
    expect(s.secondary).toBeNull();
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
    expect(s.assist).toBe('goHalftime');
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
    expect(s.assist).toBe('goHalftime');
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

  // The log prints the point length off the goal entry, so it has to carry the
  // same duration the point record does — see pointDurationDetail.
  it('stamps the point duration on the goal log entry', () => {
    const s = gameReducer(ticks(live(), 90), { type: 'GOAL', team: 'A' });
    const goal = s.log[s.log.length - 1];
    expect(s.points[0].durationSeconds).toBe(90);
    expect(goal.pointSeconds).toBe(90);
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

  // A Callahan is the answer to "who assisted?" — nobody, by the rules — so it
  // clears the assist rather than sitting beside a stale one, on the point and
  // the log entry alike.
  it('a Callahan clears the assist on both the point and the goal entry', () => {
    let s = gameReducer(live(), { type: 'ADD_PLAYER', team: 'A', number: '7', name: 'Alex' });
    s = gameReducer(s, { type: 'ADD_PLAYER', team: 'A', number: '9', name: 'Sam' });
    const scorerId = s.config.players.A[0].id;
    const assistId = s.config.players.A[1].id;

    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    s = gameReducer(s, { type: 'SET_GOAL_PLAYERS', team: 'A', scorerId, assistId, callahan: true });

    expect(s.points[0]).toMatchObject({ scorerId, callahan: true });
    expect(s.points[0].assistId).toBeUndefined();
    const goalEntry = [...s.log].reverse().find((e) => e.type === 'goal');
    expect(goalEntry).toMatchObject({ scorerId, callahan: true });
    expect(goalEntry?.assistId).toBeUndefined();
  });

  it('unticking the Callahan lets the assist be recorded again', () => {
    let s = gameReducer(live(), { type: 'ADD_PLAYER', team: 'A', number: '9', name: 'Sam' });
    const assistId = s.config.players.A[0].id;
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    s = gameReducer(s, {
      type: 'SET_GOAL_PLAYERS',
      team: 'A',
      scorerId: null,
      assistId: null,
      callahan: true,
    });
    s = gameReducer(s, { type: 'SET_GOAL_PLAYERS', team: 'A', scorerId: null, assistId });

    expect(s.points[0].assistId).toBe(assistId);
    expect(s.points[0].callahan).toBeUndefined();
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

describe('undoing a turnover', () => {
  it('gives the disc back and drops the entry when the turnover is the last thing logged', () => {
    const s = gameReducer(live(), { type: 'TURNOVER' });
    expect(canUndoTurnover(s).ok).toBe(true);

    const back = gameReducer(s, { type: 'UNDO_TURNOVER' });
    expect(back.possessionTeam).toBe('A');
    expect(back.log.some((e) => e.type === 'turnover')).toBe(false);
    expect(back.log.some((e) => e.type === 'undoTurnover')).toBe(false);
  });

  it('logs a visible correction instead once something else has been recorded since', () => {
    let s = gameReducer(live(), { type: 'TURNOVER' });
    s = gameReducer(s, { type: 'TRAVEL', team: 'B' });
    s = gameReducer(s, { type: 'UNDO_TURNOVER' });

    expect(s.possessionTeam).toBe('A');
    expect(s.log.filter((e) => e.type === 'turnover')).toHaveLength(1);
    expect(s.log[s.log.length - 1]).toMatchObject({ type: 'undoTurnover', team: 'A' });
  });

  it('refuses on a point where nothing has been turned over', () => {
    const s = live();
    expect(canUndoTurnover(s).reason).toBe('noTurnoverToUndo');
    expect(gameReducer(s, { type: 'UNDO_TURNOVER' })).toBe(s);
  });

  it('unwinds several turnovers one at a time, and no further', () => {
    let s = run(live(), { type: 'TURNOVER' }, { type: 'TURNOVER' });
    expect(s.possessionTeam).toBe('A');

    s = gameReducer(s, { type: 'UNDO_TURNOVER' });
    expect(s.possessionTeam).toBe('B');
    s = gameReducer(s, { type: 'UNDO_TURNOVER' });
    expect(s.possessionTeam).toBe('A');
    expect(canUndoTurnover(s).ok).toBe(false);
  });

  it('does not reach back into the previous point', () => {
    let s = gameReducer(live(), { type: 'TURNOVER' });
    s = run(s, { type: 'GOAL', team: 'B' }, { type: 'PULL_THROWN' });
    expect(s.possessionTeam).toBe('A'); // B scored, so A receives
    expect(canUndoTurnover(s).ok).toBe(false);
    expect(gameReducer(s, { type: 'UNDO_TURNOVER' }).possessionTeam).toBe('A');
  });

  it('comes back with the point when the goal that ended it is undone', () => {
    let s = gameReducer(live(), { type: 'TURNOVER' });
    s = gameReducer(s, { type: 'GOAL', team: 'B' });
    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'B' });

    expect(s.possessionTeam).toBe('B');
    expect(canUndoTurnover(s).ok).toBe(true);
    expect(gameReducer(s, { type: 'UNDO_TURNOVER' }).possessionTeam).toBe('A');
  });

  it('is refused wherever a turnover itself would be', () => {
    const s = gameReducer(live(), { type: 'TURNOVER' });
    for (const action of [
      { type: 'SOTG_TOGGLE' },
      { type: 'TIMEOUT_START', team: 'B' },
    ] as Action[]) {
      const blocked = gameReducer(s, action);
      expect(canUndoTurnover(blocked).ok).toBe(false);
      expect(gameReducer(blocked, { type: 'UNDO_TURNOVER' }).possessionTeam).toBe('B');
    }
  });

  it('puts the possession chip on screen for any tracked mode from the first pull, with no need to wait for a turnover', () => {
    expect(possessionTracked(live())).toBe(false); // statsMode 'none' by default
    expect(possessionTracked(live(cfg({ statsMode: 'game' })))).toBe(true);
    expect(possessionTracked(live(cfg({ statsMode: 'team', trackedTeam: 'A' })))).toBe(true);
    expect(possessionTracked(live(cfg({ statsMode: 'player' })))).toBe(true);

    // A turnover (or undoing one) never changes whether the chip is on the board —
    // only statsMode does — just what it currently says.
    const s = gameReducer(live(cfg({ statsMode: 'game' })), { type: 'TURNOVER' });
    expect(possessionTracked(s)).toBe(true);
    expect(possessionTracked(gameReducer(s, { type: 'UNDO_TURNOVER' }))).toBe(true);
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

  it('records a travel with no team when the game is not tracking activity', () => {
    const s = gameReducer(live(), { type: 'TRAVEL' });
    expect(lastLog(s)).toMatchObject({ type: 'travel', team: undefined });
  });

  it('opens a pending call with no team when the game is not tracking activity', () => {
    const s = gameReducer(live(), { type: 'CALL_MADE', kind: 'foul' });
    expect(lastLog(s)).toMatchObject({ type: 'call', team: undefined, callKind: 'foul' });
    expect(s.pendingCall).toMatchObject({ kind: 'foul', team: undefined });
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

  it('blocks travel and every call before the pull is thrown', () => {
    // The disc isn't in play yet, so there's no play for these to describe —
    // off-side included, since nothing has happened yet for the marker to call.
    const s = started();
    expect(s.status).toBe('awaitingPull');
    expect(canRecordEvent(s, { requiresPull: true }).ok).toBe(false);
    expect(canRecordEvent(s, { requiresPull: true }).reason).toBe('pullNotThrown');

    const afterTravel = gameReducer(s, { type: 'TRAVEL', team: 'A' });
    expect(afterTravel.log.some((e) => e.type === 'travel')).toBe(false);

    for (const kind of [
      'foul',
      'stallOut',
      'pick',
      'discDown',
      'out',
      'offside',
      'generic',
    ] as const) {
      const after = gameReducer(s, { type: 'CALL_MADE', kind, team: 'A' });
      expect(after.pendingCall).toBeNull();
    }

    // A note and a stoppage of any kind are still recordable while the teams are
    // lining up: neither is about the disc being live.
    expect(
      gameReducer(s, { type: 'NOTE', text: 'lining up' }).log.some((e) => e.type === 'note'),
    ).toBe(true);
    expect(canStoppage(s).ok).toBe(true);
    expect(
      gameReducer(s, { type: 'STOPPAGE', kind: 'injury', team: 'A' }).pendingStoppage,
    ).toMatchObject({ kind: 'injury' });
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
    expect(s.pendingCall).toEqual({ kind: 'foul', team: 'B', elapsedSeconds: 0 });
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

  it('marks a turnover when an accepted stall-out call is tracked', () => {
    let s = gameReducer(live(cfg({ statsMode: 'game' })), {
      type: 'CALL_MADE',
      kind: 'stallOut',
      team: 'B',
    });
    const before = s.possessionTeam; // A, by default config
    s = gameReducer(s, { type: 'CALL_RESOLVED', resolution: 'accepted' });

    expect(s.pendingCall).toBeNull();
    expect(s.possessionTeam).toBe(before === 'A' ? 'B' : 'A');
    expect(s.pointTurnovers).toBe(1);
    expect(s.turnoversCommitted[before!]).toBe(1);
    expect(lastLog(s)).toMatchObject({ type: 'turnover', team: before });
    // The resolution is still what gets announced — the turnover is bookkeeping,
    // same as one tapped by hand.
    expect(s.assist).toBe('resolution_accepted');

    // It reads and undoes exactly like a manually-tapped turnover.
    expect(canUndoTurnover(s).ok).toBe(true);
    const undone = gameReducer(s, { type: 'UNDO_TURNOVER' });
    expect(undone.possessionTeam).toBe(before);
    expect(undone.pointTurnovers).toBe(0);
    expect(lastLog(undone)).toMatchObject({ type: 'callResolved' });
  });

  it('does not mark a turnover on an accepted stall-out when stats are off', () => {
    let s = gameReducer(live(), { type: 'CALL_MADE', kind: 'stallOut', team: 'B' });
    const before = s.possessionTeam;
    s = gameReducer(s, { type: 'CALL_RESOLVED', resolution: 'accepted' });

    expect(s.possessionTeam).toBe(before);
    expect(s.pointTurnovers).toBe(0);
    expect(lastLog(s)).toMatchObject({ type: 'callResolved' });
  });

  it('does not mark a turnover for an accepted call of any other kind, or a contested/retracted stall-out', () => {
    const base = live(cfg({ statsMode: 'game' }));

    const foul = gameReducer(gameReducer(base, { type: 'CALL_MADE', kind: 'foul', team: 'B' }), {
      type: 'CALL_RESOLVED',
      resolution: 'accepted',
    });
    expect(foul.possessionTeam).toBe(base.possessionTeam);
    expect(foul.pointTurnovers).toBe(0);

    for (const resolution of ['contested', 'retracted'] as const) {
      const s = gameReducer(gameReducer(base, { type: 'CALL_MADE', kind: 'stallOut', team: 'B' }), {
        type: 'CALL_RESOLVED',
        resolution,
      });
      expect(s.possessionTeam).toBe(base.possessionTeam);
      expect(s.pointTurnovers).toBe(0);
    }
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
    let s = gameReducer(live(), {
      type: 'STOPPAGE',
      kind: 'injury',
      players: [{ team: 'B', playerId: 'p1' }],
    });
    expect(s.pendingStoppage).toEqual({
      kind: 'injury',
      team: 'B',
      players: [{ team: 'B', playerId: 'p1' }],
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
      players: [{ team: 'A', playerId: 'p1' }],
    });
    expect(s.pendingStoppage).toEqual({
      kind: 'technical',
      team: 'A',
      players: undefined,
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
    let s = gameReducer(live(), {
      type: 'STOPPAGE',
      kind: 'injury',
      players: [{ team: 'A', playerId: 'p1' }],
    });
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

  it('records a note during a timeout and half-time, unlike every other event', () => {
    // A break in play is exactly when a volunteer has a free hand to write
    // something down, and a note is not about the play, so nothing about the
    // break makes it premature. Everything else still waits for play to resume.
    const timeout = gameReducer(live(), { type: 'TIMEOUT_START', team: 'A' });
    expect(timeout.status).toBe('timeout');

    const noted = gameReducer(timeout, { type: 'NOTE', text: 'sub for #4' });
    expect(lastLog(noted)).toMatchObject({ type: 'note', detail: 'sub for #4' });

    const halftime = gameReducer(live(cfg({ halfScore: 1 })), { type: 'GOAL', team: 'A' });
    expect(halftime.status).toBe('halftime');
    expect(
      gameReducer(halftime, { type: 'NOTE', text: 'captains talked' }).log.some(
        (e) => e.type === 'note',
      ),
    ).toBe(true);

    // Travel and calls are unchanged: a break is still a break for anything that
    // describes the play. A stoppage is the exception — see canStoppage.
    for (const action of [
      { type: 'TRAVEL', team: 'A' },
      { type: 'CALL_MADE', kind: 'foul', team: 'A' },
    ] as const) {
      expect(gameReducer(timeout, action).log).toBe(timeout.log);
    }
  });
});

/**
 * A stoppage (injury/technical) and a clock stop (SOTG, manual pause) can be raised
 * at any moment of a game in progress. Whatever was counting at the time freezes and
 * picks up from exactly where it was — the pull clock, a running timeout, the
 * half-time break, and an open call's discussion timer.
 */
describe('a stoppage raised over whatever else was running', () => {
  const pullSeconds = (s: GameState) => (s.secondary?.kind === 'pull' ? s.secondary.seconds : null);
  const breakSeconds = (s: GameState) => s.secondary?.seconds ?? null;
  const lastLog = (s: GameState) => s.log[s.log.length - 1];

  it('is available between points, during a timeout and during half-time', () => {
    const timeout = gameReducer(live(), { type: 'TIMEOUT_START', team: 'A' });
    const halftime = gameReducer(live(cfg({ halfScore: 1 })), { type: 'GOAL', team: 'A' });
    expect(halftime.status).toBe('halftime');

    for (const s of [started(), live(), timeout, halftime]) {
      expect(canStoppage(s).ok).toBe(true);
      expect(gameReducer(s, { type: 'STOPPAGE', kind: 'injury' }).pendingStoppage).not.toBeNull();
      expect(gameReducer(s, { type: 'SOTG_TOGGLE' }).status).toBe('paused');
    }
  });

  it('is refused before the game starts and once it has finished', () => {
    expect(canStoppage(createInitialState(cfg())).reason).toBe('gameNotStarted');
    // The game reached its target: still on the game screen (so the finishing goal can
    // be undone), but nothing is left to stop.
    const finished = gameReducer(live(cfg({ targetScore: 1 })), { type: 'GOAL', team: 'A' });
    expect(finished.status).toBe('finished');
    expect(canStoppage(finished).reason).toBe('gameFinished');
  });

  it('refuses a second stoppage — including an SOTG one — until the open one is resolved', () => {
    const injury = gameReducer(live(), { type: 'STOPPAGE', kind: 'injury' });
    expect(canStoppage(injury).reason).toBe('stoppageInProgress');
    expect(gameReducer(injury, { type: 'SOTG_TOGGLE' })).toBe(injury);

    const sotg = gameReducer(live(), { type: 'SOTG_TOGGLE' });
    expect(canStoppage(sotg).reason).toBe('stoppageInProgress');
    expect(gameReducer(sotg, { type: 'STOPPAGE', kind: 'technical' })).toBe(sotg);
  });

  it('freezes the pull clock between points and resumes it where it was', () => {
    let s = ticks(started(), 20);
    expect(pullSeconds(s)).toBe(20);

    s = gameReducer(s, { type: 'STOPPAGE', kind: 'injury' });
    s = ticks(s, 30);
    expect(pullSeconds(s)).toBe(20); // the teams are not lining up during an injury
    expect(s.gameSeconds).toBe(50); // ...but the game clock is untouched by a stoppage
    // Nor can the pull be thrown into it.
    expect(gameReducer(s, { type: 'PULL_THROWN' })).toBe(s);

    s = ticks(gameReducer(s, { type: 'STOPPAGE_RESOLVED' }), 5);
    expect(pullSeconds(s)).toBe(25);
  });

  it('freezes the pull clock AND the game clock for an SOTG stoppage', () => {
    let s = ticks(started(), 20);
    s = gameReducer(s, { type: 'SOTG_TOGGLE' });
    const gameSeconds = s.gameSeconds;

    s = ticks(s, 30);
    expect(pullSeconds(s)).toBe(20);
    expect(s.gameSeconds).toBe(gameSeconds);

    s = ticks(gameReducer(s, { type: 'SOTG_TOGGLE' }), 5);
    expect(s.status).toBe('awaitingPull');
    expect(pullSeconds(s)).toBe(25);
    expect(s.gameSeconds).toBe(gameSeconds + 5);
  });

  it('attributes an SOTG stoppage to a team, and carries it through to the resume log', () => {
    let s = gameReducer(live(), { type: 'SOTG_TOGGLE', team: 'B' });
    expect(s.pauseTeam).toBe('B');
    expect(lastLog(s)).toMatchObject({ type: 'sotgStart', team: 'B' });

    s = gameReducer(s, { type: 'SOTG_TOGGLE' });
    expect(s.pauseTeam).toBeNull();
    expect(lastLog(s)).toMatchObject({ type: 'sotgEnd', team: 'B' });
  });

  it('leaves no team on an SOTG stoppage when the game is not tracking activity', () => {
    const s = gameReducer(live(), { type: 'SOTG_TOGGLE' });
    expect(s.pauseTeam).toBeNull();
    expect(lastLog(s)).toMatchObject({ type: 'sotgStart', team: undefined });
  });

  it('freezes a running timeout and resumes it where it was', () => {
    let s = ticks(gameReducer(live(), { type: 'TIMEOUT_START', team: 'A' }), 10);
    const left = breakSeconds(s);

    s = ticks(gameReducer(s, { type: 'STOPPAGE', kind: 'technical' }), 30);
    expect(breakSeconds(s)).toBe(left);
    expect(gameReducer(s, { type: 'TIMEOUT_END' })).toBe(s); // the stoppage answers first

    s = ticks(gameReducer(s, { type: 'STOPPAGE_RESOLVED' }), 5);
    expect(s.status).toBe('timeout');
    expect(breakSeconds(s)).toBe((left ?? 0) - 5);
  });

  it('keeps the timeout its own way back when an SOTG stoppage interrupts it', () => {
    // statusBeforeTimeout and statusBeforePause are separate fields for exactly this:
    // the pause remembers 'timeout', the timeout still remembers 'awaitingPull'.
    let s = gameReducer(started(), { type: 'TIMEOUT_START', team: 'A' });
    expect(s.statusBeforeTimeout).toBe('awaitingPull');

    s = ticks(gameReducer(ticks(s, 10), { type: 'SOTG_TOGGLE' }), 30);
    expect(s.status).toBe('paused');
    expect(s.statusBeforePause).toBe('timeout');
    expect(s.statusBeforeTimeout).toBe('awaitingPull');
    expect(s.gameSeconds).toBe(10);

    s = gameReducer(s, { type: 'SOTG_TOGGLE' });
    expect(s.status).toBe('timeout');

    // And the before-pull timeout still ends back on a fresh pull clock, not 'live'.
    s = gameReducer(s, { type: 'TIMEOUT_END' });
    expect(s.status).toBe('awaitingPull');
    expect(s.secondary).toMatchObject({ kind: 'pull', seconds: 0 });
  });

  it('freezes the half-time break and holds the second half until it is resolved', () => {
    let s = ticks(gameReducer(live(cfg({ halfScore: 1 })), { type: 'GOAL', team: 'A' }), 10);
    const left = breakSeconds(s);

    s = ticks(gameReducer(s, { type: 'STOPPAGE', kind: 'injury' }), 30);
    expect(breakSeconds(s)).toBe(left);
    expect(gameReducer(s, { type: 'HALFTIME_END' })).toBe(s);

    s = gameReducer(gameReducer(s, { type: 'STOPPAGE_RESOLVED' }), { type: 'HALFTIME_END' });
    expect(s.half).toBe(2);
  });

  it("freezes an open call's discussion timer, and logs only the time it really had", () => {
    let s = ticks(gameReducer(live(), { type: 'CALL_MADE', kind: 'foul', team: 'A' }), 12);
    expect(s.pendingCall).toMatchObject({ elapsedSeconds: 12 });

    // The injury interrupts the discussion, so its 30 s are not the players' to answer for.
    s = ticks(gameReducer(s, { type: 'STOPPAGE', kind: 'injury' }), 30);
    expect(s.pendingCall).toMatchObject({ elapsedSeconds: 12 });
    expect(s.pendingStoppage).toMatchObject({ elapsedSeconds: 30 });

    s = ticks(gameReducer(s, { type: 'STOPPAGE_RESOLVED' }), 3);
    expect(s.pendingCall).toMatchObject({ elapsedSeconds: 15 });

    s = gameReducer(s, { type: 'CALL_RESOLVED', resolution: 'accepted' });
    expect(lastLog(s)).toMatchObject({ type: 'callResolved', resolutionSeconds: 15 });
  });

  it("freezes an open call's discussion timer for an SOTG stoppage too", () => {
    let s = ticks(gameReducer(live(), { type: 'CALL_MADE', kind: 'pick', team: 'B' }), 12);
    s = ticks(gameReducer(s, { type: 'SOTG_TOGGLE' }), 30);
    expect(s.pendingCall).toMatchObject({ elapsedSeconds: 12 });

    s = ticks(gameReducer(s, { type: 'SOTG_TOGGLE' }), 3);
    expect(s.pendingCall).toMatchObject({ elapsedSeconds: 15 });
  });

  it('holds the call resolution until the stoppage that froze it is cleared', () => {
    let s = ticks(gameReducer(live(), { type: 'CALL_MADE', kind: 'foul', team: 'A' }), 12);
    s = gameReducer(s, { type: 'STOPPAGE', kind: 'injury' });

    // The three answers are off the screen (see CallResolutionRow), so the reducer
    // refuses them too rather than leaving a path the UI no longer offers.
    const attempted = gameReducer(s, { type: 'CALL_RESOLVED', resolution: 'accepted' });
    expect(attempted).toBe(s);
    expect(s.pendingCall).toMatchObject({ kind: 'foul', elapsedSeconds: 12 });

    s = gameReducer(gameReducer(s, { type: 'STOPPAGE_RESOLVED' }), {
      type: 'CALL_RESOLVED',
      resolution: 'accepted',
    });
    expect(s.pendingCall).toBeNull();
    expect(lastLog(s)).toMatchObject({ type: 'callResolved', resolutionSeconds: 12 });
  });

  it('holds the call resolution through an SOTG pause as well', () => {
    let s = gameReducer(live(), { type: 'CALL_MADE', kind: 'pick', team: 'B' });
    s = gameReducer(s, { type: 'SOTG_TOGGLE' });
    expect(gameReducer(s, { type: 'CALL_RESOLVED', resolution: 'contested' })).toBe(s);

    s = gameReducer(gameReducer(s, { type: 'SOTG_TOGGLE' }), {
      type: 'CALL_RESOLVED',
      resolution: 'contested',
    });
    expect(s.pendingCall).toBeNull();
  });

  it('refuses a timeout while a stoppage is open', () => {
    const s = gameReducer(live(), { type: 'STOPPAGE', kind: 'injury' });
    expect(timeoutAvailability(s, 'A').reason).toBe('stoppageInProgress');
    expect(gameReducer(s, { type: 'TIMEOUT_START', team: 'A' })).toBe(s);
  });

  it('refuses scoring and turnovers while a stoppage is open', () => {
    const s = gameReducer(live(), { type: 'STOPPAGE', kind: 'injury' });
    expect(canScore(s).reason).toBe('stoppageInProgress');
    expect(canTurnover(s).reason).toBe('stoppageInProgress');
    expect(gameReducer(s, { type: 'GOAL', team: 'A' })).toBe(s);
    expect(gameReducer(s, { type: 'TURNOVER' })).toBe(s);
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

  it('waits for a manual "Start game" tap if the configured time has already passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T10:10:00'));
    const config = cfg({ startingTime: { enabled: true, time: '10:05' } });

    const s = gameReducer(createInitialState(config), { type: 'START_GAME', config });
    expect(s.status).toBe('notStarted');
    expect(s.startingAtMs).toBeNull();

    const opened = gameReducer(s, { type: 'BEGIN_PLAY' });
    expect(opened.status).toBe('awaitingPull');
  });

  it('waits for a manual "Start game" tap when no kickoff is scheduled', () => {
    const config = cfg();
    const s = gameReducer(createInitialState(config), { type: 'START_GAME', config });
    expect(s.phase).toBe('game');
    expect(s.status).toBe('notStarted');
    expect(s.startingAtMs).toBeNull();
    expect(canScore(s).reason).toBe('gameNotStarted');
    expect(canRecordEvent(s).reason).toBe('gameNotStarted');
    expect(canUndo(s, 'A').reason).toBe('gameNotStarted');
    // A goal attempt, or any TICK, changes nothing before "Start game" is tapped.
    expect(gameReducer(s, { type: 'GOAL', team: 'A' }).scores.A).toBe(0);
    expect(gameReducer(s, { type: 'TICK' }).status).toBe('notStarted');

    const opened = gameReducer(s, { type: 'BEGIN_PLAY' });
    expect(opened.status).toBe('awaitingPull');
    expect(opened.assist).toBe('firstPull');
  });

  it('lets the volunteer tap "Start game" early to override a scheduled kickoff', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T10:00:00'));
    const config = cfg({ startingTime: { enabled: true, time: '10:05' } });
    const s = gameReducer(createInitialState(config), { type: 'START_GAME', config });
    expect(s.status).toBe('awaitingStart');

    // Tapped well before the scheduled time — opens the pull right away instead of
    // waiting for TICK to reach startingAtMs.
    const opened = gameReducer(s, { type: 'BEGIN_PLAY' });
    expect(opened.status).toBe('awaitingPull');
    expect(opened.startingAtMs).toBeNull();
  });

  it('starts immediately when no starting time is configured, as before', () => {
    const s = started();
    expect(s.status).toBe('awaitingPull');
    expect(s.startingAtMs).toBeNull();
  });

  it('blows the one-minute warning once, exactly a minute before a scheduled start', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T10:00:00'));
    const config = cfg({ startingTime: { enabled: true, time: '10:05' } });
    let s = gameReducer(createInitialState(config), { type: 'START_GAME', config });
    expect(s.startWarned).toBe(false);

    // More than a minute out: no warning yet.
    vi.setSystemTime(new Date('2024-06-01T10:03:59'));
    s = gameReducer(s, { type: 'TICK' });
    expect(s.startWarned).toBe(false);
    expect(s.assist).not.toBe('startWarning');

    // Exactly a minute out: the warning fires and latches.
    vi.setSystemTime(new Date('2024-06-01T10:04:00'));
    s = gameReducer(s, { type: 'TICK' });
    expect(s.startWarned).toBe(true);
    expect(s.assist).toBe('startWarning');

    // It never fires twice — a later tick leaves an unrelated assist alone.
    s = { ...s, assist: 'goalScored' };
    vi.setSystemTime(new Date('2024-06-01T10:04:30'));
    s = gameReducer(s, { type: 'TICK' });
    expect(s.assist).toBe('goalScored');
  });

  it('skips the one-minute warning when the scheduled start is already under a minute away', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T10:04:30')); // 30 s before 10:05
    const config = cfg({ startingTime: { enabled: true, time: '10:05' } });
    let s = gameReducer(createInitialState(config), { type: 'START_GAME', config });
    expect(s.status).toBe('awaitingStart');
    expect(s.startWarned).toBe(true); // seeded — too close for a one-minute warning

    vi.setSystemTime(new Date('2024-06-01T10:04:45'));
    s = gameReducer(s, { type: 'TICK' });
    expect(s.assist).not.toBe('startWarning');
  });

  it('ignores a "Start game" tap once the game is already under way', () => {
    const s = live();
    expect(gameReducer(s, { type: 'BEGIN_PLAY' })).toBe(s);
  });
});

describe('water breaks', () => {
  const hot = (patch: Partial<GameConfig['waterBreaks']> = {}) =>
    cfg({ waterBreaks: { enabled: true, atScores: [4, 12], durationSeconds: 180, ...patch } });

  /** Plays `n` goals for A, each one point long (pull, goal, next pull, ...). */
  function goalsForA(state: GameState, n: number): GameState {
    let s = state;
    for (let i = 0; i < n; i++) {
      if (s.status === 'awaitingPull') s = gameReducer(s, { type: 'PULL_THROWN' });
      s = gameReducer(s, { type: 'GOAL', team: 'A' });
    }
    return s;
  }

  it('calls one automatically when the first team reaches a configured score', () => {
    const s = goalsForA(started(hot()), 4);

    expect(s.scores.A).toBe(4);
    expect(s.status).toBe('waterBreak');
    expect(s.secondary).toEqual({ kind: 'waterBreak', seconds: 0, total: 180 });
    expect(s.waterBreaksTaken).toEqual([4]);
    expect(s.assist).toBe('goWaterBreak');
    expect(s.log[s.log.length - 1].type).toBe('waterBreakStart');
  });

  it('never calls the same one twice, whichever team gets there first', () => {
    let s = goalsForA(started(hot()), 4);
    s = gameReducer(s, { type: 'WATER_BREAK_END' });

    // B catches up to 4 — the score is reached again, the break is not.
    s = gameReducer(s, { type: 'PULL_THROWN' });
    s = gameReducer(s, { type: 'GOAL', team: 'B' });
    expect(s.status).toBe('awaitingPull');
    expect(s.waterBreaksTaken).toEqual([4]);
  });

  it('leaves the game alone when automatic breaks are switched off', () => {
    const s = goalsForA(started(cfg()), 4);
    expect(s.status).toBe('awaitingPull');
    expect(s.waterBreaksTaken).toEqual([]);
  });

  it('gives way to half-time, and spends the score doing it', () => {
    // Half at 4 and a break at 4: the longer break wins and the water break is
    // marked used, so it can never fire on the way back from half-time.
    const s = goalsForA(started(cfg({ ...hot(), halfScore: 4 })), 4);

    expect(s.status).toBe('halftime');
    expect(s.waterBreaksTaken).toEqual([4]);
    expect(s.assist).toBe('goHalftime');
  });

  it('never interrupts the game that goal just finished', () => {
    // Game to 4 and a break at 4: the goal that reaches the target ends the game,
    // and the break never gets a look in.
    const s = goalsForA(started(cfg({ ...hot(), targetScore: 4, halfScore: 4 })), 4);
    expect(s.status).toBe('finished');
    expect(s.log.some((e) => e.type === 'waterBreakStart')).toBe(false);
  });

  it('counts up, keeps going past the duration, and announces the crossing once', () => {
    let s = goalsForA(started(hot({ durationSeconds: 20 })), 4);

    s = ticks(s, 19);
    expect(s.secondary?.seconds).toBe(19);
    expect(s.assist).toBe('goWaterBreak');

    s = ticks(s, 1);
    expect(s.secondary?.seconds).toBe(20);
    expect(s.assist).toBe('waterBreakDue');

    // Still running afterwards — nothing ends it but the volunteer — and the
    // crossing is not re-announced.
    s = { ...s, assist: 'goalScored' };
    s = ticks(s, 5);
    expect(s.status).toBe('waterBreak');
    expect(s.secondary?.seconds).toBe(25);
    expect(s.assist).toBe('goalScored');
  });

  it('keeps the game clock running, and freezes the break clock under a stoppage', () => {
    let s = goalsForA(started(hot()), 4);
    const clockAtBreak = s.gameSeconds;

    s = ticks(s, 5);
    expect(s.gameSeconds).toBe(clockAtBreak + 5);
    expect(s.secondary?.seconds).toBe(5);

    s = gameReducer(s, { type: 'STOPPAGE', kind: 'injury' });
    s = ticks(s, 10);
    expect(s.secondary?.seconds).toBe(5); // frozen where it was
    expect(s.gameSeconds).toBe(clockAtBreak + 15); // the game clock is not

    // And the break can't be ended out from under the open stoppage.
    expect(gameReducer(s, { type: 'WATER_BREAK_END' }).status).toBe('waterBreak');

    s = gameReducer(s, { type: 'STOPPAGE_RESOLVED' });
    s = ticks(s, 2);
    expect(s.secondary?.seconds).toBe(7); // picks up from exactly where it stopped
  });

  it('hands back to the pull with the pull clock restarted', () => {
    let s = goalsForA(started(hot()), 4);
    const puller = s.pullingTeam;
    s = ticks(s, 200);
    s = gameReducer(s, { type: 'WATER_BREAK_END' });

    expect(s.status).toBe('awaitingPull');
    expect(s.secondary).toEqual({ kind: 'pull', seconds: 0, total: 75 });
    expect(s.pullingTeam).toBe(puller); // a break is not a point: nothing about it moves on
    expect(s.assist).toBe('waterBreakOver');
    expect(s.log[s.log.length - 1].type).toBe('waterBreakEnd');
  });

  it('locks the score and blocks recorded events while it runs, but not a stoppage', () => {
    const s = goalsForA(started(hot()), 4);

    expect(canScore(s)).toEqual({ ok: false, reason: 'waterBreakActive' });
    expect(gameReducer(s, { type: 'GOAL', team: 'A' }).scores.A).toBe(4);
    expect(canRecordEvent(s)).toEqual({ ok: false, reason: 'waterBreakActive' });
    // A note is written from the log dialog, which stays open through any break.
    expect(canRecordEvent(s, { allowDuringBreaks: true }).ok).toBe(true);
    expect(canStoppage(s).ok).toBe(true);
    expect(timeoutAvailability(s, 'A')).toEqual({ ok: false, reason: 'timeoutNotNow' });
  });

  it('undoes the goal that triggered it, break and log entry included', () => {
    let s = goalsForA(started(hot()), 4);
    expect(s.status).toBe('waterBreak');

    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });

    expect(s.scores.A).toBe(3);
    expect(s.status).toBe('live'); // back into the point that goal ended
    expect(s.waterBreaksTaken).toEqual([]); // and the break is due again
    expect(s.log.some((e) => e.type === 'waterBreakStart')).toBe(false);
    expect(s.log.some((e) => e.type === 'goal' && e.detail?.startsWith('4-'))).toBe(false);
  });

  it('can be called by hand between points, and only there', () => {
    const s = live(cfg());

    expect(canWaterBreak(s)).toEqual({ ok: false, reason: 'waterBreakNotNow' });
    expect(gameReducer(s, { type: 'WATER_BREAK_START' })).toBe(s);

    const between = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(canWaterBreak(between).ok).toBe(true);
    const onBreak = gameReducer(between, { type: 'WATER_BREAK_START' });
    expect(onBreak.status).toBe('waterBreak');
    expect(onBreak.secondary).toEqual({ kind: 'waterBreak', seconds: 0, total: 180 });
  });

  it('is refused by hand before the game starts, once it is over, and under a stoppage', () => {
    expect(canWaterBreak(createInitialState(cfg()))).toEqual({
      ok: false,
      reason: 'gameNotStarted',
    });

    const halted = gameReducer(gameReducer(live(), { type: 'GOAL', team: 'A' }), {
      type: 'STOPPAGE',
      kind: 'injury',
    });
    expect(canWaterBreak(halted)).toEqual({ ok: false, reason: 'stoppageInProgress' });

    const finished = gameReducer(live(cfg({ targetScore: 1, halfScore: 1 })), {
      type: 'GOAL',
      team: 'A',
    });
    expect(finished.status).toBe('finished');
    expect(canWaterBreak(finished)).toEqual({ ok: false, reason: 'gameFinished' });
  });

  it('spends the scores already due when one is called by hand', () => {
    // 4 is due but the volunteer calls the break themselves first: the automatic
    // one must not fire again on the very next goal.
    let s = goalsForA(started(hot({ atScores: [4] })), 3);
    s = gameReducer(s, { type: 'WATER_BREAK_START' });
    expect(s.waterBreaksTaken).toEqual([]); // 4 not reached yet, nothing spent

    s = gameReducer(s, { type: 'WATER_BREAK_END' });
    s = goalsForA(s, 1);
    expect(s.scores.A).toBe(4);
    expect(s.status).toBe('waterBreak'); // the automatic one, as configured

    s = gameReducer(s, { type: 'WATER_BREAK_END' });
    s = gameReducer(s, { type: 'WATER_BREAK_START' });
    expect(s.waterBreaksTaken).toEqual([4]); // already spent, not spent twice
  });
});

describe('stats modes', () => {
  it('statsTrackingEnabled is only false for none', () => {
    expect(statsTrackingEnabled(cfg({ statsMode: 'none' }))).toBe(false);
    expect(statsTrackingEnabled(cfg({ statsMode: 'game' }))).toBe(true);
    expect(statsTrackingEnabled(cfg({ statsMode: 'team', trackedTeam: 'A' }))).toBe(true);
    expect(statsTrackingEnabled(cfg({ statsMode: 'player' }))).toBe(true);
  });

  it('playerTrackingFor is per-team only in team mode, both teams in player mode, neither otherwise', () => {
    expect(playerTrackingFor(cfg({ statsMode: 'none' }), 'A')).toBe(false);
    expect(playerTrackingFor(cfg({ statsMode: 'game' }), 'A')).toBe(false);
    expect(playerTrackingFor(cfg({ statsMode: 'game' }), 'B')).toBe(false);

    const teamA = cfg({ statsMode: 'team', trackedTeam: 'A' });
    expect(playerTrackingFor(teamA, 'A')).toBe(true);
    expect(playerTrackingFor(teamA, 'B')).toBe(false);

    const teamB = cfg({ statsMode: 'team', trackedTeam: 'B' });
    expect(playerTrackingFor(teamB, 'A')).toBe(false);
    expect(playerTrackingFor(teamB, 'B')).toBe(true);

    const player = cfg({ statsMode: 'player' });
    expect(playerTrackingFor(player, 'A')).toBe(true);
    expect(playerTrackingFor(player, 'B')).toBe(true);
  });

  it('holds the goal message back for the scorer/assist dialog only when the scoring team is player-tracked', () => {
    const base = live(cfg({ statsMode: 'team', trackedTeam: 'A' }));
    const beforeAssist = base.assist;

    // Tracked team scores: the dialog is about to open over this goal, so the
    // sign/message waits in pendingGoalAssist for REVEAL_GOAL_ASSIST instead.
    const trackedScores = gameReducer(base, { type: 'GOAL', team: 'A' });
    expect(trackedScores.assist).toBe(beforeAssist);
    expect(trackedScores.pendingGoalAssist).toBe('goalScored');

    // Untracked team scores: no dialog ever opens for it, so nothing to hold back.
    const untrackedScores = gameReducer(base, { type: 'GOAL', team: 'B' });
    expect(untrackedScores.assist).toBe('goalScored');
    expect(untrackedScores.pendingGoalAssist).toBeNull();
  });

  it('an injury can name a specific player and, independently, a whole other team with no player', () => {
    // Team stats mode's hybrid step: a named player from the tracked team, plus
    // the untracked team marked with no one named — same shape Game stats mode's
    // team-only step dispatches on its own.
    const s = gameReducer(live(), {
      type: 'STOPPAGE',
      kind: 'injury',
      team: 'B',
      players: [{ team: 'A', playerId: 'p1' }],
    });
    expect(s.pendingStoppage?.players).toEqual([{ team: 'A', playerId: 'p1' }]);
    // Both teams involved at once (one named, one generic) — no single-team badge.
    expect(s.pendingStoppage?.team).toBeUndefined();
    expect(s.log[s.log.length - 1].detail).toContain(s.config.teams.B.name);
  });

  it("an injury naming only the untracked team's generic entry gets a plain team badge, same as a named single-team injury", () => {
    const generic = gameReducer(live(), { type: 'STOPPAGE', kind: 'injury', team: 'B' });
    expect(generic.pendingStoppage?.team).toBe('B');

    const named = gameReducer(live(), {
      type: 'STOPPAGE',
      kind: 'injury',
      players: [{ team: 'B', playerId: 'p1' }],
    });
    expect(named.pendingStoppage?.team).toBe('B');
  });
});

describe('turnover stats', () => {
  it('TURNOVER credits the team that lost the disc, and UNDO_TURNOVER nets it back out', () => {
    // A receives the pull, so A is attacking first.
    const s1 = gameReducer(live(), { type: 'TURNOVER' });
    expect(s1.turnoversCommitted).toEqual({ A: 1, B: 0 });

    const s2 = gameReducer(s1, { type: 'TURNOVER' }); // now B is attacking
    expect(s2.turnoversCommitted).toEqual({ A: 1, B: 1 });

    const s3 = gameReducer(s2, { type: 'UNDO_TURNOVER' });
    expect(s3.turnoversCommitted).toEqual({ A: 1, B: 0 });
  });

  it('stays correct even when the log keeps the turnover as a visible correction instead of dropping it', () => {
    // Something else recorded after the turnover (a note) forces UNDO_TURNOVER onto
    // the visible-correction log path rather than a clean removal — the lifetime
    // counter must still net out, unlike a naive count of 'turnover' log entries.
    let s = gameReducer(live(), { type: 'TURNOVER' });
    s = gameReducer(s, { type: 'NOTE', text: 'checking' });
    expect(s.log.filter((e) => e.type === 'turnover')).toHaveLength(1);
    s = gameReducer(s, { type: 'UNDO_TURNOVER' });
    // The log keeps the original 'turnover' entry as history (not scraped for stats).
    expect(s.log.filter((e) => e.type === 'turnover')).toHaveLength(1);
    expect(s.turnoversCommitted).toEqual({ A: 0, B: 0 });
  });

  it('bakes the total turnovers of the point into the PointRecord for clean hold/break', () => {
    // A holds clean: no turnovers before the goal.
    const cleanHold = gameReducer(live(), { type: 'GOAL', team: 'A' });
    expect(cleanHold.points[0]).toMatchObject({ isBreak: false, turnovers: 0 });

    // One turnover, then B (now attacking) scores immediately — a clean break.
    const oneTurn = run(live(), { type: 'TURNOVER' }, { type: 'GOAL', team: 'B' });
    expect(oneTurn.points[0]).toMatchObject({ isBreak: true, turnovers: 1 });

    // Disc changes hands twice more before A closes it out on a hold that isn't clean.
    const messyHold = run(
      live(),
      { type: 'TURNOVER' },
      { type: 'TURNOVER' },
      { type: 'GOAL', team: 'A' },
    );
    expect(messyHold.points[0]).toMatchObject({ isBreak: false, turnovers: 2 });
  });
});

describe('possession seconds per point', () => {
  const tracked = () => live(cfg({ statsMode: 'game' }));

  it('accrues to whoever holds the disc, and to the other team after a turnover', () => {
    let s = ticks(tracked(), 5); // A received the pull (default startingOffense)
    expect(s.possessionSeconds).toEqual({ A: 5, B: 0 });

    s = ticks(gameReducer(s, { type: 'TURNOVER' }), 3);
    expect(s.possessionSeconds).toEqual({ A: 5, B: 3 });
  });

  it('accrues nothing while play is halted — an open call, a stoppage or a pause', () => {
    const call = ticks(
      gameReducer(ticks(tracked(), 2), { type: 'CALL_MADE', kind: 'foul', team: 'B' }),
      10,
    );
    expect(call.possessionSeconds).toEqual({ A: 2, B: 0 });

    const stopped = ticks(
      gameReducer(ticks(tracked(), 2), { type: 'STOPPAGE', kind: 'injury' }),
      10,
    );
    expect(stopped.possessionSeconds).toEqual({ A: 2, B: 0 });

    const paused = ticks(gameReducer(ticks(tracked(), 2), { type: 'SOTG_TOGGLE' }), 10);
    expect(paused.possessionSeconds).toEqual({ A: 2, B: 0 });
  });

  it('writes the pair onto the PointRecord at the goal, and the next pull starts from zero', () => {
    let s = ticks(tracked(), 4);
    s = ticks(gameReducer(s, { type: 'TURNOVER' }), 2);
    s = gameReducer(s, { type: 'GOAL', team: 'B' });

    expect(s.points[0].possessionSeconds).toEqual({ A: 4, B: 2 });
    expect(s.possessionSeconds).toEqual({ A: 0, B: 0 });

    // B scored, so A receives the next pull and the fresh counter accrues to A.
    s = ticks(gameReducer(s, { type: 'PULL_THROWN' }), 3);
    expect(s.possessionSeconds).toEqual({ A: 3, B: 0 });
  });

  it('restores the live counter with the goal it was snapshotted before', () => {
    let s = ticks(tracked(), 7);
    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.possessionSeconds).toEqual({ A: 0, B: 0 });

    s = gameReducer(s, { type: 'UNDO_GOAL', team: 'A' });
    expect(s.possessionSeconds).toEqual({ A: 7, B: 0 });
    expect(s.points).toHaveLength(0);
  });

  it('accrues nothing in statsMode none, and the PointRecord field stays absent', () => {
    let s = ticks(live(), 6); // default config is statsMode 'none'
    expect(s.possessionSeconds).toEqual({ A: 0, B: 0 });

    s = gameReducer(s, { type: 'GOAL', team: 'A' });
    expect(s.points[0].possessionSeconds).toBeUndefined();
  });
});
