import type { GameState } from './types';

/**
 * A whistle that is due right now: how many blasts, and a `key` that identifies
 * the *occurrence*. The key is stable for as long as this one blast is current and
 * changes the moment a new blast falls due — so a single `useRef(lastKey)` in
 * GameContext plays each occurrence exactly once, and SignalCard keys its transient
 * whistle picture off the same value.
 */
export type WhistleSignal = { key: string; blasts: 1 | 2 | 3 };

/**
 * The single source of truth for "should the whistle sound right now?". Both the
 * audio (GameContext) and the whistle hand-signal (SignalCard) consult this, which
 * is what structurally guarantees that every whistle also shows its sign.
 *
 * These are the only five WFDF time-signal scenarios the app whistles for; a
 * turnover, a score correction and the like are announced in the bar but never
 * whistled. See CLAUDE.md / the guide's "When the app whistles" card.
 */
export function currentWhistle(state: GameState): WhistleSignal | null {
  if (state.phase !== 'game') return null;
  const { assist, secondary } = state;

  // Scenario 2 — the pull countdown: 1/2/3 blasts at 45/60/75 s. Checked first so it
  // takes over from the one-off "game on" / "time in" blast once the clock reaches 45.
  if (state.status === 'awaitingPull' && secondary?.kind === 'pull') {
    const s = secondary.seconds;
    if (s >= 75) return { key: 'pull75', blasts: 3 };
    if (s >= 60) return { key: 'pull60', blasts: 2 };
    if (s >= 45) return { key: 'pull45', blasts: 1 };
  }

  // Scenario 1a — one minute to a scheduled start.
  if (assist === 'startWarning') return { key: `startWarn:${state.nextLogId}`, blasts: 1 };

  // Scenario 1b — the exact start of a half (game start, or the second-half restart).
  if (assist === 'firstPull') return { key: `firstPull:${state.nextLogId}`, blasts: 1 };
  if (assist === 'secondHalfPull' || assist === 'secondHalfNoSwap') {
    return { key: `secondHalf:${state.nextLogId}`, blasts: 1 };
  }

  // Scenario 3a — a before-pull timeout has ended; "time in", pull sequence begins.
  if (assist === 'timeoutOver') return { key: `timeoutOver:${state.nextLogId}`, blasts: 1 };
  // Scenario 3a again — a water break always ends between points, so it ends exactly
  // the way a before-pull timeout does: one blast to call the teams back to the line,
  // then the pull sequence starts fresh. Nothing is whistled when the break's own
  // clock runs out — that is the volunteer's cue, not the players'.
  if (assist === 'waterBreakOver') return { key: `waterBreakOver:${state.nextLogId}`, blasts: 1 };
  // Scenario 3b — an after-pull timeout has ended; three blasts, disc back in play.
  if (assist === 'timeoutRestart') return { key: `timeoutRestart:${state.nextLogId}`, blasts: 3 };

  // Scenario 3b — the after-pull timeout warnings. total = duration + 15, counting
  // down, so the milestones land at remaining 30 / 15 (and 0, handled by the restart
  // transition above). Remaining 45 is a message only — no blast, no sign.
  if (state.status === 'timeout' && secondary?.kind === 'timeout' && secondary.afterPull) {
    if (secondary.seconds === 30) return { key: 'toReady30', blasts: 1 };
    if (secondary.seconds === 15) return { key: 'toReady15', blasts: 2 };
  }

  // Scenario 1a — one minute to the second half, but only when the half-time break is
  // long enough (>= 120 s) for a one-minute warning to be meaningful.
  if (
    state.status === 'halftime' &&
    secondary?.kind === 'halftime' &&
    (secondary.total ?? 0) >= 120 &&
    secondary.seconds === 60
  ) {
    return { key: 'halfWarn60', blasts: 1 };
  }

  // Scenario 4 — an unresolved call or stoppage: three blasts at 45 s and three more
  // at 60 s, and that is all. elapsedSeconds is ticked independent of the game clock.
  // Deliberately not a repeating cadence: a dispute that is still going at 75 s is
  // one the whistle cannot hurry along, and a blast every 15 s from then on is noise
  // the scorekeeper has to sit through with no action to take.
  //
  // The stoppage is read first when both are open: a stoppage raised mid-discussion
  // takes priority and freezes the call's own counter (see playHalted), so it is the
  // stoppage that the whistle should be chasing.
  const elapsed =
    state.pendingStoppage?.elapsedSeconds ?? state.pendingCall?.elapsedSeconds ?? null;
  if (elapsed === 45 || elapsed === 60) {
    return { key: `callWait:${elapsed}`, blasts: 3 };
  }

  // Scenario 5 — a cap fires by time, never by a target score known in advance
  // (that is `halfAt`/`gameAt`, one goal early, and those stay silent). One whistle
  // each: the moment the time limit lands (Option A ends the game/half outright, a
  // capped rule leaves the point in progress to finish), and again once that point
  // ends and the new target is fixed.
  const capAssists = [
    'capNoneFinishPoint',
    'capPending',
    'capReached',
    'halfCapNone',
    'halfCapPending',
    'halfCapReached',
  ];
  if (capAssists.includes(assist)) {
    return { key: `${assist}:${state.nextLogId}`, blasts: 1 };
  }

  return null;
}
