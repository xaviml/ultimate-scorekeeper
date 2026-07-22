import type {
  Action,
  GameConfig,
  GameState,
  Gender,
  GoalSnapshot,
  LogEntry,
  LogType,
  TeamId,
  TimeoutConfig,
} from './types';
import { findPlayer, playerLabel } from './stats';
import { uid } from './uid';

export const defaultConfig: GameConfig = {
  division: 'mixed',
  fieldNumber: '1',
  teams: {
    A: { name: 'Team A', color: '#d94141' },
    B: { name: 'Team B', color: '#2f6fd9' },
  },
  mixedRule: 'A',
  startingOffense: 'A',
  startingSide: 'A',
  startingRatio: 'female',
  targetScore: 15,
  halfScore: 8,
  timeLimitMinutes: 100,
  halfTimeLimitMinutes: 55,
  halfTimeBreakSeconds: 75,
  endCap: { kind: 'cap', plus: 1 },
  halfCap: { kind: 'cap', plus: 1 },
  timeouts: {
    enabled: true,
    perHalf: 2,
    perGame: null,
    durationSeconds: 75,
    disallowLastFiveMinutes: false,
  },
  startingTime: { enabled: false, time: '' },
  trackPlayers: false,
  players: { A: [], B: [] },
};

const other = (t: TeamId): TeamId => (t === 'A' ? 'B' : 'A');

function wallClock(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function log(
  state: GameState,
  type: LogType,
  team?: TeamId,
  detail?: string,
  extra?: Pick<
    LogEntry,
    'turnoverId' | 'defenseId' | 'callKind' | 'resolution' | 'resolutionSeconds' | 'stoppageKind'
  >,
): GameState {
  return {
    ...state,
    log: [
      ...state.log,
      {
        id: state.nextLogId,
        wallClock: wallClock(),
        atMs: Date.now(),
        gameSeconds: state.gameSeconds,
        type,
        team,
        detail,
        ...extra,
      },
    ],
    nextLogId: state.nextLogId + 1,
  };
}

/**
 * WFDF Appendix, Rule A ("prescribed"): the starting ratio applies to point 1,
 * then the ratio alternates every two points (A, B, B, A, A, B, B, ...).
 * pointIndex is 0-based (the point about to be played).
 */
export function ruleARatio(start: Gender, pointIndex: number): Gender {
  const flip: Gender = start === 'male' ? 'female' : 'male';
  // Pattern by index: 0:start 1:flip 2:flip 3:start 4:start 5:flip 6:flip ...
  const block = Math.floor((pointIndex + 1) / 2);
  return block % 2 === 0 ? start : flip;
}

export function createInitialState(config: GameConfig = defaultConfig): GameState {
  return {
    phase: 'config',
    config,
    status: 'notStarted',
    statusBeforePause: null,
    pauseSilent: false,
    half: 1,
    scores: { A: 0, B: 0 },
    // Rule B leaves the ratio to the end zone the teams are playing into — the
    // scorekeeper never tracks or announces it, same as open/women divisions.
    ratio: config.division === 'mixed' && config.mixedRule === 'A' ? config.startingRatio : null,
    nextRatio: null,
    pullingTeam: other(config.startingOffense),
    offenseTeam: config.startingOffense,
    possessionTeam: null,
    gameSeconds: 0,
    startingAtMs: null,
    pointStartSeconds: null,
    secondary: null,
    pausedPullSeconds: null,
    timeoutsUsed: { A: { half1: 0, half2: 0 }, B: { half1: 0, half2: 0 } },
    timeoutTeam: null,
    cappedTarget: null,
    halfCappedTarget: null,
    timeCapReached: false,
    halfTimeCapReached: false,
    halftimePlayed: false,
    halfAnnounced: false,
    gameAnnounced: false,
    pendingCall: null,
    pendingStoppage: null,
    points: [],
    log: [],
    history: [],
    nextLogId: 1,
    assist: 'welcome',
    ratioSignalId: 0,
  };
}

/** Central validation: may this team's score change right now? */
export function canScore(state: GameState): { ok: boolean; reason?: string } {
  if (state.phase !== 'game' || state.status === 'notStarted' || state.status === 'awaitingStart')
    return { ok: false, reason: 'gameNotStarted' };
  if (state.status === 'finished') return { ok: false, reason: 'gameFinished' };
  if (state.status === 'paused') return { ok: false, reason: 'gamePaused' };
  if (state.status === 'timeout') return { ok: false, reason: 'timeoutActive' };
  if (state.status === 'halftime') return { ok: false, reason: 'halftimeActive' };
  if (state.status === 'awaitingPull') return { ok: false, reason: 'pullNotThrown' };
  return { ok: true };
}

/**
 * A turnover can only be registered while the disc is genuinely in play, which is
 * exactly when the score may change — so the blocking reasons (and therefore the
 * `assist_blocked_*` messages the UI shows) are shared with canScore.
 */
export function canTurnover(state: GameState): { ok: boolean; reason?: string } {
  const base = canScore(state);
  if (!base.ok) return base;
  if (state.possessionTeam === null) return { ok: false, reason: 'pullNotThrown' };
  return { ok: true };
}

/**
 * May a bookkeeping-only event (a stoppage, travel, a call, a free-text note) be
 * recorded right now?
 *
 * More permissive than canScore in one respect only: an SOTG pause doesn't block
 * it — a foul called as the teams line up is still a foul. But a timeout or
 * half-time is a break in play, not a pause mid-dispute, so recording waits for
 * the game to resume, same as scoring does.
 *
 * `requiresPull` narrows this further to events that only make sense once the
 * disc is actually live: a travel, a stoppage, any of the six calls (off-side
 * included — nothing has happened yet for the marker to call). A free-text
 * note is the one recorded event that never passes it: it isn't about the
 * play, so there's nothing about the pull it needs to wait for.
 */
export function canRecordEvent(
  state: GameState,
  opts?: { requiresPull?: boolean },
): { ok: boolean; reason?: string } {
  if (state.phase !== 'game' || state.status === 'awaitingStart')
    return { ok: false, reason: 'gameNotStarted' };
  if (state.status === 'finished') return { ok: false, reason: 'gameFinished' };
  if (state.status === 'timeout') return { ok: false, reason: 'timeoutActive' };
  if (state.status === 'halftime') return { ok: false, reason: 'halftimeActive' };
  if (opts?.requiresPull && state.status === 'awaitingPull')
    return { ok: false, reason: 'pullNotThrown' };
  return { ok: true };
}

export function canUndo(state: GameState, team: TeamId): { ok: boolean; reason?: string } {
  // Deliberately does not reuse canScore: a goal leaves the game in 'awaitingPull'
  // until the next pull is thrown, or in 'halftime' if it reached the half score —
  // either way that shouldn't block undoing the goal that just put it there (halftime
  // is only ever entered straight out of a goal, so it's always that same goal).
  // Every other non-live status still blocks undo.
  if (state.phase !== 'game' || state.status === 'notStarted' || state.status === 'awaitingStart')
    return { ok: false, reason: 'gameNotStarted' };
  if (state.status === 'finished') return { ok: false, reason: 'gameFinished' };
  if (state.status === 'paused') return { ok: false, reason: 'gamePaused' };
  if (state.status === 'timeout') return { ok: false, reason: 'timeoutActive' };
  if (state.scores[team] <= 0) return { ok: false, reason: 'minScoreZero' }; // never below 0
  if (state.history.length === 0) return { ok: false, reason: 'nothingToUndo' };
  const last = state.history[state.history.length - 1];
  // Only the goal most recently scored can be undone; it must belong to `team`.
  if (state.scores[team] === last.scores[team]) return { ok: false, reason: 'notLastScorer' };
  return { ok: true };
}

/**
 * Physical field orientation — which team is currently on the LEFT endzone.
 *
 * The ends swap after every point, so the left-endzone team flips each point.
 * At half-time the whole field configuration mirrors the opening (WFDF: teams
 * swap ends and the opening receiver now pulls), so the second half starts from
 * the opposite of the opening left team and flips from there.
 *
 * This is the PHYSICAL field, not the scoreboard: the scoreboard keeps each team
 * on a fixed side for the whole game (see GameScreen), while this value tracks the
 * real ends the players are switching between.
 */
export function leftEndzoneTeam(state: GameState): TeamId {
  const opening = state.config.startingSide; // left-field team at the opening pull
  const base = state.half === 1 ? opening : other(opening);
  const pointsThisHalf = state.points.filter((p) => p.half === state.half).length;
  return pointsThisHalf % 2 === 0 ? base : other(base);
}

/** Which physical end the current/next puller pulls from. */
export function pullFromSide(state: GameState): 'left' | 'right' {
  return state.pullingTeam === leftEndzoneTeam(state) ? 'left' : 'right';
}

/** Whether the configured budget allows any timeouts at all. Both budgets null is the same as 0. */
export function timeoutsConfigured(timeouts: TimeoutConfig): boolean {
  if (!timeouts.enabled) return false;
  const budget = timeouts.perHalf !== null ? timeouts.perHalf : (timeouts.perGame ?? 0);
  return budget > 0;
}

export function timeoutAvailability(
  state: GameState,
  team: TeamId,
): { ok: boolean; reason?: string } {
  const { timeouts } = state.config;
  if (!timeoutsConfigured(timeouts)) return { ok: false, reason: 'timeoutNoneLeft' };
  if (state.status !== 'live' && state.status !== 'awaitingPull')
    return { ok: false, reason: 'timeoutNotNow' };
  if (
    timeouts.disallowLastFiveMinutes &&
    state.config.timeLimitMinutes * 60 - state.gameSeconds <= 5 * 60
  )
    return { ok: false, reason: 'timeoutLastFive' };
  const used = state.timeoutsUsed[team];
  if (timeouts.perHalf !== null) {
    const usedThisHalf = state.half === 1 ? used.half1 : used.half2;
    if (usedThisHalf >= timeouts.perHalf) return { ok: false, reason: 'timeoutNoneLeft' };
  } else {
    const perGame = timeouts.perGame ?? 0;
    if (used.half1 + used.half2 >= perGame) return { ok: false, reason: 'timeoutNoneLeft' };
  }
  return { ok: true };
}

function snapshot(state: GameState): GoalSnapshot {
  return {
    scores: { ...state.scores },
    ratio: state.ratio,
    nextRatio: state.nextRatio,
    pullingTeam: state.pullingTeam,
    offenseTeam: state.offenseTeam,
    possessionTeam: state.possessionTeam,
    status: state.status,
    half: state.half,
    pointStartSeconds: state.pointStartSeconds,
    cappedTarget: state.cappedTarget,
    halfCappedTarget: state.halfCappedTarget,
    halftimePlayed: state.halftimePlayed,
    halfAnnounced: state.halfAnnounced,
    gameAnnounced: state.gameAnnounced,
  };
}

export function effectiveTarget(state: GameState): number {
  return state.cappedTarget ?? state.config.targetScore;
}
export function effectiveHalfTarget(state: GameState): number {
  return state.halfCappedTarget ?? state.config.halfScore;
}

/**
 * Whether the half target is still a score worth naming — i.e. half-time is ahead
 * and will actually be decided by reaching that score.
 *
 * Three ways it stops being true even though half has not been played:
 *   - the game ends first. A goal is checked against the game target BEFORE the
 *     half target (see GOAL), so a half at or above the game target never fires.
 *   - an Option A time cap has been reached, which ends the game on the next goal.
 *   - the half time limit passed with no half cap, which sends the game to half on
 *     the next goal whatever the score — the threshold no longer governs anything.
 */
export function halfTargetApplies(state: GameState): boolean {
  if (state.phase !== 'game' || state.halftimePlayed || state.half !== 1) return false;
  if (state.timeCapReached && state.config.endCap.kind === 'none') return false;
  if (state.halfTimeCapReached && state.config.halfCap.kind === 'none') return false;
  return effectiveHalfTarget(state) < effectiveTarget(state);
}

/**
 * Universe point: both teams tied one goal below the target (plain target, or
 * whatever a time cap has adjusted it to — effectiveTarget covers both), so the
 * next goal, by either team, ends the game.
 */
export function isUniversePoint(state: GameState): boolean {
  if (state.phase !== 'game') return false;
  return state.scores.A === state.scores.B && state.scores.A === effectiveTarget(state) - 1;
}

/** Apply the configured end-game cap when the time limit is hit. */
function applyEndCap(state: GameState): GameState {
  const rule = state.config.endCap;
  const s = log({ ...state, timeCapReached: true }, 'timeCap', undefined, `rule:${rule.kind}`);
  if (rule.kind === 'none') return { ...s, assist: 'capNoneFinishPoint' };
  // Both capped rules depend on the score once the point in progress has finished, so
  // neither target can be computed here — see GOAL. Naming a number now would name one
  // that the point still being played is about to invalidate.
  return { ...s, assist: 'capPending' };
}

function applyHalfCap(state: GameState): GameState {
  const rule = state.config.halfCap;
  const s = log(
    { ...state, halfTimeCapReached: true },
    'halfTimeCap',
    undefined,
    `rule:${rule.kind}`,
  );
  if (rule.kind === 'none') return { ...s, assist: 'halfCapNone' };
  // The capped half target is deliberately NOT computed here: it is the leading score
  // once the point in progress has finished, plus the cap, so only GOAL can resolve it
  // (the same shape as the conditional end cap). Naming a number now would name one the
  // point still being played is about to invalidate.
  return { ...s, assist: 'halfCapPending' };
}

function finishGame(state: GameState): GameState {
  const s = log(state, 'gameEnd');
  return { ...s, status: 'finished', phase: 'report', secondary: null, assist: 'gameOver' };
}

/** Epoch ms for a configured kickoff time (today, local), or null if none is set. */
function startingTimeMs(config: GameConfig): number | null {
  if (!config.startingTime.enabled) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(config.startingTime.time);
  if (!match) return null;
  const d = new Date();
  d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return d.getTime();
}

/** Opens the pull, whether that happens right at START_GAME or once a scheduled kickoff arrives. */
function beginPlay(state: GameState): GameState {
  const s = log({ ...state, startingAtMs: null }, 'gameStart');
  return {
    ...s,
    status: 'awaitingPull',
    secondary: { kind: 'pull', seconds: 0, total: 75 },
    assist: 'firstPull',
  };
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const init: GameState = { ...createInitialState(action.config), phase: 'game' };
      const startingAtMs = startingTimeMs(action.config);
      // A kickoff time set for the future holds the game at 'awaitingStart' rather
      // than opening the pull right away; TICK below promotes it once the wall
      // clock actually reaches it. A time already in the past (the config screen
      // should prevent this, but the wall clock keeps moving while it's open)
      // starts play immediately instead of waiting forever.
      if (startingAtMs !== null && startingAtMs > Date.now()) {
        return { ...init, status: 'awaitingStart', startingAtMs, assist: 'awaitingGameStart' };
      }
      return beginPlay(init);
    }

    case 'PULL_THROWN': {
      if (state.status !== 'awaitingPull' && state.status !== 'notStarted') return state;
      const s = state;
      return {
        ...s,
        status: 'live',
        pointStartSeconds: s.gameSeconds,
        // The receiving team catches the pull, so the point opens with them on offense.
        possessionTeam: s.offenseTeam,
        secondary: null,
        ratio: s.nextRatio ?? s.ratio,
        nextRatio: null,
        assist: 'discInPlay',
      };
    }

    case 'GOAL': {
      if (!canScore(state).ok) return state;
      const team = action.team;
      let s: GameState = { ...state, history: [...state.history, snapshot(state)] };
      const newScore = s.scores[team] + 1;
      s = { ...s, scores: { ...s.scores, [team]: newScore } };

      const duration = s.pointStartSeconds !== null ? s.gameSeconds - s.pointStartSeconds : 0;
      const isBreak = team !== s.offenseTeam;
      s = {
        ...s,
        points: [
          ...s.points,
          {
            scoredBy: team,
            offense: s.offenseTeam,
            isBreak,
            durationSeconds: duration,
            half: s.half,
          },
        ],
      };
      s = log(s, 'goal', team, `${s.scores.A}-${s.scores.B}${isBreak ? ' (break)' : ''}`);

      // End cap by time (Options B and C): the target is the leading score now that the
      // point in progress has finished, plus the cap, never beyond the configured target.
      // Resolved here rather than when the horn sounded so that point counts — 9-9 at the
      // horn finishing 9-10 puts the game at 11, not 10. Option C differs only in getting
      // a chance to end the game outright first, when the margin already settles it.
      const cap = s.config.endCap;
      let capResolved = false;
      if (s.timeCapReached && cap.kind !== 'none' && s.cappedTarget === null) {
        if (cap.kind === 'conditional' && Math.abs(s.scores.A - s.scores.B) > cap.minDiff) {
          return finishGame(s);
        }
        const leader = Math.max(s.scores.A, s.scores.B);
        s = { ...s, cappedTarget: Math.min(leader + cap.plus, s.config.targetScore) };
        capResolved = true;
      }
      // End-cap Option A: time reached, finish this point, game over.
      if (s.timeCapReached && cap.kind === 'none') return finishGame(s);

      // Win by target (possibly capped)
      if (newScore >= effectiveTarget(s)) return finishGame(s);

      // Half cap (by time): the capped half target is the leading score now that the
      // point in progress has finished, plus the cap, never beyond the configured half
      // score. Resolved here rather than when the horn sounded so that point counts —
      // 4-5 at the horn finishing 4-6 puts the half at 7, not 6.
      const halfCapRule = s.config.halfCap;
      let halfCapResolved = false;
      if (
        s.halfTimeCapReached &&
        halfCapRule.kind === 'cap' &&
        s.halfCappedTarget === null &&
        !s.halftimePlayed &&
        s.half === 1
      ) {
        const leader = Math.max(s.scores.A, s.scores.B);
        s = {
          ...s,
          halfCappedTarget: Math.min(leader + halfCapRule.plus, s.config.halfScore),
        };
        halfCapResolved = true;
      }

      // Half-time never fires mid-point: it can only ever be reached here, when a
      // point finishes (a goal is scored). A point runs from one goal to the next, so
      // whether the half was "called" mid-point or in the gap right after a goal, the
      // point in progress is always played out before half applies. Then:
      //   - no half cap: the half applies as soon as this point is done, OR
      //   - half cap: play continues until the capped half target is reached.
      // Reaching the half by score (no time cap) is the same path with cap unset.
      const reachHalf =
        !s.halftimePlayed &&
        s.half === 1 &&
        (newScore >= effectiveHalfTarget(s) ||
          (s.halfTimeCapReached && s.config.halfCap.kind === 'none'));

      // First time a team is one goal short of half, name where the half actually is
      // rather than how far away it is. "One point from half" was misleading: at 7-0
      // with half at 8, the next point is just as likely to be 7-1. The target is a
      // fact whoever scores next, and it reads the same whether it came from the plain
      // halfScore or from a cap (effectiveHalfTarget covers both).
      //
      // Said once per game: both teams can reach one short of the target, and a cap
      // resolving already announced the number itself.
      const announceHalf =
        !reachHalf &&
        !s.halftimePlayed &&
        !s.halfAnnounced &&
        !halfCapResolved &&
        s.half === 1 &&
        newScore === effectiveHalfTarget(s) - 1;

      // The same, one goal short of the game target. Deliberately NOT suppressed on a
      // universe point: that shout is the more urgent one and wins the bar below, but
      // the target has still become known, which is what puts the chip on screen.
      const announceGame = !s.gameAnnounced && !capResolved && newScore === effectiveTarget(s) - 1;

      const universePoint = !reachHalf && isUniversePoint(s);

      // Prepare next point: scorer pulls, other team receives.
      // Rule B is end-zone-decided, so there is nothing for the scorekeeper to compute.
      const nextRatio =
        s.config.division === 'mixed' && s.config.mixedRule === 'A'
          ? ruleARatio(s.config.startingRatio, s.points.length)
          : null;

      s = {
        ...s,
        status: reachHalf ? s.status : 'awaitingPull',
        pullingTeam: team,
        offenseTeam: other(team),
        possessionTeam: null, // disc is dead until the next pull is caught
        pointStartSeconds: null,
        nextRatio,
        secondary: reachHalf ? null : { kind: 'pull', seconds: 0, total: 75 },
        // A resolved half cap announces the new half target itself, so it stands in
        // for the one-time "half at N" call-out.
        assist: reachHalf
          ? 'goHalftime'
          : universePoint
            ? 'universePoint'
            : capResolved
              ? 'capReached'
              : halfCapResolved
                ? 'halfCapReached'
                : announceGame
                  ? 'gameAt'
                  : announceHalf
                    ? 'halfAt'
                    : 'goalScored',
        halfAnnounced: s.halfAnnounced || announceHalf || halfCapResolved,
        gameAnnounced: s.gameAnnounced || announceGame || capResolved,
      };
      if (reachHalf) {
        s = log(s, 'halftimeStart');
        s = {
          ...s,
          status: 'halftime',
          halftimePlayed: true,
          secondary: {
            kind: 'halftime',
            seconds: s.config.halfTimeBreakSeconds,
            total: s.config.halfTimeBreakSeconds,
          },
        };
      }
      return s;
    }

    case 'UNDO_GOAL': {
      if (!canUndo(state, action.team).ok) return state;
      const prev = state.history[state.history.length - 1];
      // A goal that reaches the half appends a 'halftimeStart' entry right after its
      // own 'goal' entry — an automatic side effect of the goal, not something the
      // scorekeeper separately recorded, so it doesn't count as "something logged in
      // between" and is dropped along with the goal.
      const trailingHalftimeStart = state.log[state.log.length - 1]?.type === 'halftimeStart';
      const goalLogIdx = trailingHalftimeStart ? state.log.length - 2 : state.log.length - 1;
      const goalLog = state.log[goalLogIdx];
      // If nothing else has been recorded since the goal itself, this undo is just the
      // scorekeeper correcting a mis-tap — drop the goal entry (and the halftimeStart
      // it triggered, if any) rather than leaving both and a correction note in the
      // log. Once something else has been logged in between, fall back to a visible
      // correction entry instead.
      const s =
        goalLog !== undefined && goalLog.type === 'goal' && goalLog.team === action.team
          ? { ...state, history: state.history.slice(0, -1), log: state.log.slice(0, goalLogIdx) }
          : log(
              { ...state, history: state.history.slice(0, -1) },
              'undo',
              action.team,
              `${prev.scores.A}-${prev.scores.B}`,
            );
      return {
        ...s,
        scores: { ...prev.scores },
        ratio: prev.ratio,
        nextRatio: prev.nextRatio,
        pullingTeam: prev.pullingTeam,
        offenseTeam: prev.offenseTeam,
        possessionTeam: prev.possessionTeam,
        half: prev.half,
        // A goal appends exactly one point, so dropping the last entry rewinds it.
        points: state.points.slice(0, -1),
        cappedTarget: prev.cappedTarget,
        halfCappedTarget: prev.halfCappedTarget,
        halftimePlayed: prev.halftimePlayed,
        halfAnnounced: prev.halfAnnounced,
        gameAnnounced: prev.gameAnnounced,
        status: prev.status,
        pointStartSeconds: prev.pointStartSeconds,
        secondary: null,
        assist: 'undoDone',
      };
    }

    case 'REVEAL_NEXT_RATIO':
      return state.nextRatio ? { ...state, assist: 'nextRatio' } : state;

    // Manual re-show of the gender signal, triggered by tapping the ratio chip.
    // Bumps ratioSignalId so the signal card re-keys and re-arms even when assist
    // is already 'nextRatio' (e.g. it already auto-showed and dismissed itself).
    case 'SHOW_RATIO_SIGNAL':
      if (!state.ratio && !state.nextRatio) return state;
      return { ...state, assist: 'nextRatio', ratioSignalId: state.ratioSignalId + 1 };

    case 'TIMEOUT_START': {
      if (!timeoutAvailability(state, action.team).ok) return state;
      const used = { ...state.timeoutsUsed };
      const u = { ...used[action.team] };
      if (state.half === 1) u.half1 += 1;
      else u.half2 += 1;
      used[action.team] = u;
      const s = log(state, 'timeout', action.team);
      const pausedPullSeconds =
        state.status === 'awaitingPull' && state.secondary?.kind === 'pull'
          ? state.secondary.seconds
          : state.pausedPullSeconds;
      return {
        ...s,
        status: 'timeout',
        statusBeforePause: state.status,
        timeoutTeam: action.team,
        timeoutsUsed: used,
        pausedPullSeconds,
        secondary: {
          kind: 'timeout',
          seconds: state.config.timeouts.durationSeconds,
          total: state.config.timeouts.durationSeconds,
        },
        assist: 'timeoutRunning',
      };
    }

    case 'TIMEOUT_END': {
      if (state.status !== 'timeout') return state;
      const back = state.statusBeforePause ?? 'live';
      const s = log(state, 'timeoutEnd', state.timeoutTeam ?? undefined);
      return {
        ...s,
        status: back,
        statusBeforePause: null,
        timeoutTeam: null,
        pausedPullSeconds: null,
        secondary:
          back === 'awaitingPull'
            ? { kind: 'pull', seconds: state.pausedPullSeconds ?? 0, total: 75 }
            : null,
        assist: 'timeoutOver',
      };
    }

    case 'STOPPAGE': {
      // Logged but the game clock is NOT affected. An injury optionally records the
      // injured player; a technical stoppage is never attributed to a player.
      if (!canRecordEvent(state, { requiresPull: true }).ok) return state;
      // One open stoppage at a time — the "play can resume" button answers exactly
      // one question, same shape as CALL_MADE/CALL_RESOLVED.
      if (state.pendingStoppage !== null) return state;
      const injured =
        action.kind === 'injury' && action.team
          ? findPlayer(state.config.players[action.team], action.playerId)
          : undefined;
      const s = log(state, 'stoppage', action.team, injured ? playerLabel(injured) : undefined, {
        stoppageKind: action.kind,
      });
      return {
        ...s,
        pendingStoppage: {
          kind: action.kind,
          team: action.team,
          playerId: action.kind === 'injury' ? action.playerId : undefined,
          startedAtSeconds: s.gameSeconds,
        },
        assist: action.kind === 'injury' ? 'stoppageInjury' : 'stoppageTechnical',
      };
    }

    case 'STOPPAGE_RESOLVED': {
      const pending = state.pendingStoppage;
      if (pending === null) return state;
      // Measured on the game clock, same as a call resolution — the clock was never
      // stopped for the stoppage in the first place, so this just records how long
      // it took, not a correction to the clock.
      const s = log(state, 'stoppageResolved', pending.team, undefined, {
        stoppageKind: pending.kind,
        resolutionSeconds: Math.max(0, state.gameSeconds - pending.startedAtSeconds),
      });
      // Same call-out as coming back from an SOTG pause: the marker signals and
      // play is live again.
      return { ...s, pendingStoppage: null, assist: 'resumed' };
    }

    case 'TURNOVER': {
      // Possession changes hands, but `offenseTeam` does NOT: it is fixed for the
      // whole point so that hold-vs-break stays correct however many turns happen.
      const attacking = state.possessionTeam;
      if (!canTurnover(state).ok || attacking === null) return state;
      const s = log(state, 'turnover', attacking, undefined, {
        turnoverId: action.turnoverId,
        defenseId: action.defenseId,
      });
      return { ...s, possessionTeam: other(attacking), assist: 'turnover' };
    }

    case 'TRAVEL': {
      // Only the calling team is attributed, not a player: a travel is called on the
      // thrower by the marker, and chasing down which player it was is more than a
      // volunteer can follow. Unlike the six CALL_MADE kinds, there's no dispute to
      // resolve, so it registers in one step with no pendingCall.
      if (!canRecordEvent(state, { requiresPull: true }).ok) return state;
      return { ...log(state, 'travel', action.team), assist: 'travel' };
    }

    case 'CALL_MADE': {
      if (!canRecordEvent(state, { requiresPull: true }).ok) return state;
      // One open call at a time — the resolution buttons answer exactly one question,
      // and a second call would have no way to say which of the two it settled.
      if (state.pendingCall !== null) return state;
      const s = log(state, 'call', action.team, undefined, { callKind: action.kind });
      return {
        ...s,
        pendingCall: { kind: action.kind, team: action.team, startedAtSeconds: s.gameSeconds },
        assist: `call_${action.kind}`,
      };
    }

    case 'CALL_RESOLVED': {
      const pending = state.pendingCall;
      if (pending === null) return state;
      // Measured on the game clock, so an SOTG pause mid-discussion is not counted
      // against the teams — the same clock every other duration in the log uses.
      const s = log(state, 'callResolved', pending.team, undefined, {
        callKind: pending.kind,
        resolution: action.resolution,
        resolutionSeconds: Math.max(0, state.gameSeconds - pending.startedAtSeconds),
      });
      return { ...s, pendingCall: null, assist: `resolution_${action.resolution}` };
    }

    case 'NOTE': {
      if (!canRecordEvent(state).ok) return state;
      const text = action.text.trim();
      if (!text) return state;
      // A note is written down and nothing more: no signal, no call-out. `assist` still
      // has to change, because the bar and the signal card key off it plus the log
      // counter — leaving it alone would re-trigger whatever was last announced.
      return { ...log(state, 'note', undefined, text), assist: 'note' };
    }

    case 'SOTG_TOGGLE': {
      if (state.status === 'paused' && state.statusBeforePause !== null) {
        const s = log(state, state.pauseSilent ? 'pauseEnd' : 'sotgEnd');
        return {
          ...s,
          status: s.statusBeforePause ?? 'live',
          statusBeforePause: null,
          pauseSilent: false,
          assist: 'resumed',
        };
      }
      if (state.status !== 'live' && state.status !== 'awaitingPull') return state;
      const s = log(state, action.silent ? 'pauseStart' : 'sotgStart');
      return {
        ...s,
        status: 'paused',
        statusBeforePause: state.status,
        pauseSilent: !!action.silent,
        assist: action.silent ? 'pauseStart' : 'sotg',
      };
    }

    case 'HALFTIME_END': {
      if (state.status !== 'halftime') return state;
      const s = log(state, 'halftimeEnd');
      // Second half mirrors the opening: the team that received the first pull now
      // pulls, and the ends are the opposite of how half 1 started.
      const puller = s.config.startingOffense;
      // Ends flip after every point, so by the end of half 1 the teams have already
      // swapped an odd/even number of times. The mandated half-2 arrangement is the
      // opposite of the opening, so a real, physical swap is only needed when half 1
      // had an even number of points (odd => they're already on the mirrored ends).
      const half1Points = s.scores.A + s.scores.B;
      const swapNeeded = half1Points % 2 === 0;
      return {
        ...s,
        status: 'awaitingPull',
        half: 2,
        pullingTeam: puller,
        offenseTeam: other(puller),
        possessionTeam: null,
        secondary: { kind: 'pull', seconds: 0, total: 75 },
        assist: swapNeeded ? 'secondHalfPull' : 'secondHalfNoSwap',
      };
    }

    case 'TICK': {
      if (state.phase !== 'game') return state;
      let s = state;
      // Scheduled kickoff reached: open the pull exactly as START_GAME would have
      // if no starting time had been configured.
      if (s.status === 'awaitingStart' && s.startingAtMs !== null && Date.now() >= s.startingAtMs) {
        s = beginPlay(s);
      }
      // Game clock only stops for an SOTG stoppage (status 'paused');
      // halftime and timeouts don't stop it.
      const clockRuns =
        s.status === 'live' ||
        s.status === 'awaitingPull' ||
        s.status === 'timeout' ||
        s.status === 'halftime';
      if (clockRuns) {
        s = { ...s, gameSeconds: s.gameSeconds + 1 };
        // Half-time cap
        if (
          !s.halfTimeCapReached &&
          !s.halftimePlayed &&
          s.half === 1 &&
          s.gameSeconds >= s.config.halfTimeLimitMinutes * 60
        ) {
          s = applyHalfCap(s);
        }
        // End-game time cap
        if (!s.timeCapReached && s.gameSeconds >= s.config.timeLimitMinutes * 60) {
          s = applyEndCap(s);
        }
      }
      // Secondary timer
      if (s.secondary) {
        const sec = s.secondary;
        if (sec.kind === 'pull' && s.status === 'awaitingPull') {
          s = { ...s, secondary: { ...sec, seconds: sec.seconds + 1 } };
        } else if (
          (sec.kind === 'timeout' && s.status === 'timeout') ||
          (sec.kind === 'halftime' && s.status === 'halftime')
        ) {
          const next = Math.max(0, sec.seconds - 1);
          s = { ...s, secondary: { ...sec, seconds: next } };
        }
      }
      return s;
    }

    case 'END_GAME':
      return finishGame(state);

    case 'BACK_TO_CONFIG':
      return createInitialState(state.config);

    case 'ADD_PLAYER': {
      if (state.phase !== 'game') return state;
      const number = action.number.trim();
      const name = action.name.trim();
      if (!number && !name) return state;
      const player = { id: uid(), number, name };
      return {
        ...state,
        config: {
          ...state.config,
          players: {
            ...state.config.players,
            [action.team]: [...state.config.players[action.team], player],
          },
        },
      };
    }

    case 'REMOVE_PLAYER': {
      if (state.phase !== 'game') return state;
      return {
        ...state,
        config: {
          ...state.config,
          players: {
            ...state.config.players,
            [action.team]: state.config.players[action.team].filter((p) => p.id !== action.id),
          },
        },
      };
    }

    case 'SET_GOAL_PLAYERS': {
      if (state.points.length === 0) return state;
      const idx = state.points.length - 1;
      const lastPoint = state.points[idx];
      if (lastPoint.scoredBy !== action.team) return state;

      const points = [...state.points];
      points[idx] = {
        ...lastPoint,
        scorerId: action.scorerId ?? undefined,
        assistId: action.assistId ?? undefined,
      };

      let log = state.log;
      for (let i = log.length - 1; i >= 0; i--) {
        if (log[i].type === 'goal' && log[i].team === action.team) {
          log = [...log];
          log[i] = {
            ...log[i],
            scorerId: action.scorerId ?? undefined,
            assistId: action.assistId ?? undefined,
          };
          break;
        }
      }

      return { ...state, points, log };
    }

    default:
      return state;
  }
}
