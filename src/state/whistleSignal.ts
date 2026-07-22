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
 * These are the only four WFDF time-signal scenarios the app whistles for; caps,
 * turnovers, score corrections and the like are announced in the bar but never
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

  // Scenario 4 — an unresolved call or stoppage: three blasts at 45 s, then every
  // 15 s until it is settled. elapsedSeconds is ticked independent of the game clock.
  const elapsed =
    state.pendingCall?.elapsedSeconds ?? state.pendingStoppage?.elapsedSeconds ?? null;
  if (elapsed !== null && elapsed >= 45 && (elapsed - 45) % 15 === 0) {
    return { key: `callWait:${elapsed}`, blasts: 3 };
  }

  return null;
}
