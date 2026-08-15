import { isUniversePoint, secondHalfPuller, secondHalfPullSide } from './gameReducer';
import { currentWhistle } from './whistleSignal';
import type { GameState } from './types';

/**
 * What the assistance bar and the signal card show, and in what order.
 *
 * The pair used to be two independent transients: each keyed itself off the current
 * state and a newer event simply overwrote the older one mid-window, so a call-out
 * three seconds into its seven could vanish unheard. Everything here is about the
 * queue that replaced that — see useAssistQueue for the mechanics.
 *
 * This module is pure. It answers "is there something new to show, and what is it",
 * and freezes the values that message needs, because by the time a queued message
 * reaches the screen the state it describes may have moved on.
 */

/** How long a message stays up when it went straight to the screen. */
export const ACTIVE_MS = 7000;
/**
 * ...and when it had to wait its turn. Shorter on purpose: a backlog has to drain
 * before the point it is describing is over, and the volunteer has already missed
 * the moment anyway.
 */
export const QUEUED_MS = 4000;
/** How many messages may wait behind the one on screen. */
export const MAX_QUEUED = 2;

/**
 * 0 routine, 1 an infraction or open dispute, 2 safety and game-state.
 *
 * Only the tier decides preemption: a higher tier takes the screen immediately and
 * pushes what it interrupted back to the front of the queue. Same tier always waits.
 */
export type AssistTier = 0 | 1 | 2;

export type SignalArt = { file: string; caption: string };
export type AssistVars = ReturnType<typeof assistVars>;

export type Occurrence = {
  /** Identifies this occurrence: a repeat of the same event is a different one. */
  key: string;
  /** The assist it was built from — '' for a whistle that fired on its own. */
  assist: string;
  tier: AssistTier;
  /** i18n key for the green call-out, or null when there is nothing to shout. */
  sayKey: string | null;
  signal: SignalArt | null;
  /** Interpolation values, frozen when the occurrence was built. */
  vars: AssistVars;
  /** Frozen i18n keys: what the open call/stoppage was about, and the pull side. */
  kindKey: string | null;
  halfSideKey: string;
  /** False once the situation this message describes has passed. */
  stillRelevant: (s: GameState) => boolean;
};

/** The two keys that together say whether anything new has happened. */
export type OccurrenceKeys = { assistKey: string | null; whistleKey: string | null };

/**
 * Assist messages that are words to SHOUT, mapped to the verbatim line.
 *
 * Anything not listed here has nothing to announce — a turnover, a disc-in-play are
 * bookkeeping, so they never take over the bar.
 */
const SAY: Record<string, string> = {
  startWarning: 'say_startSoon',
  firstPull: 'say_gameOn',
  secondHalfPull: 'say_secondHalf',
  secondHalfNoSwap: 'say_secondHalf',
  timeoutRestart: 'say_playRestart',
  goalScored: 'say_score',
  halfAt: 'say_halfAt',
  gameAt: 'say_gameAt',
  nextRatio: 'say_ratio',
  undoDone: 'say_scoreCorrection',
  resumed: 'say_discIn',
  timeoutRunning: 'say_timeout',
  timeoutOver: 'say_timeIn',
  stoppageInjury: 'say_injury',
  stoppageTechnical: 'say_technicalStoppage',
  sotg: 'say_spirit',
  goHalftime: 'say_halftime',
  goWaterBreak: 'say_waterBreak',
  waterBreakDue: 'say_waterBreakDue',
  waterBreakOver: 'say_waterBreakOver',
  capReached: 'say_timeCap',
  capNoneFinishPoint: 'say_timeCapFinish',
  capPending: 'say_timeCapPending',
  halfCapReached: 'say_halfCap',
  halfCapNone: 'say_halfCapNone',
  halfCapPending: 'say_halfCapPending',
  gameOver: 'say_gameOver',
  universePoint: 'say_universePoint',
  travel: 'say_travel',
  // A call and its outcome are both shouted: the players around the disc know what
  // was called, the rest of the field does not. `note` is the exception — a free-text
  // note is written down only, so it is absent here and from the signal map.
  call_foul: 'say_callFoul',
  call_stallOut: 'say_callStallOut',
  call_pick: 'say_callPick',
  call_discDown: 'say_callDiscDown',
  call_out: 'say_callOut',
  call_offside: 'say_callOffside',
  call_generic: 'say_callGeneric',
  resolution_accepted: 'say_resolutionAccepted',
  resolution_contested: 'say_resolutionContested',
  resolution_retracted: 'say_resolutionRetracted',
};

/**
 * Anything absent is tier 0. Nothing here is about how *important* the message is in
 * the abstract — it is only about what deserves to interrupt words already on screen.
 */
const TIER: Record<string, AssistTier> = {
  // Safety, and the things that change what game is being played.
  stoppageInjury: 2,
  stoppageTechnical: 2,
  sotg: 2,
  capReached: 2,
  capPending: 2,
  capNoneFinishPoint: 2,
  halfCapReached: 2,
  halfCapPending: 2,
  halfCapNone: 2,
  gameOver: 2,
  // An infraction on the field, and the answer to one.
  travel: 1,
  call_foul: 1,
  call_stallOut: 1,
  call_pick: 1,
  call_discDown: 1,
  call_out: 1,
  call_offside: 1,
  call_generic: 1,
  resolution_accepted: 1,
  resolution_contested: 1,
  resolution_retracted: 1,
};

/**
 * A whistle is a time signal: it tells the volunteer to blow *now*, so it outranks
 * routine news. It does not reach tier 2 — an injury still interrupts a pull count.
 */
const WHISTLE_TIER: AssistTier = 1;

/**
 * Occurrences that replace what is on screen outright instead of queueing behind it,
 * because the two are one designed sequence rather than two competing events.
 *
 * The only case: the gender-ratio reveal is already held back three seconds after a
 * goal (see GameContext) precisely so it lands while the goal sign is up. Queueing it
 * would delay a stagger that was deliberately timed.
 */
const SUPERSEDES: Record<string, string> = { nextRatio: 'goalScored' };

/**
 * When a queued message is no longer worth showing. Anything absent stays true: a
 * score, a correction, a cap are facts, and late news about them is still news.
 *
 * These are checked at dequeue time, not while a message is on screen — pulling words
 * off the bar half-read would be worse than letting them finish.
 */
const STILL_RELEVANT: Record<string, (s: GameState) => boolean> = {
  // A call announced after it has been resolved reads as a bug.
  call_foul: (s) => s.pendingCall !== null,
  call_stallOut: (s) => s.pendingCall !== null,
  call_pick: (s) => s.pendingCall !== null,
  call_discDown: (s) => s.pendingCall !== null,
  call_out: (s) => s.pendingCall !== null,
  call_offside: (s) => s.pendingCall !== null,
  call_generic: (s) => s.pendingCall !== null,
  stoppageInjury: (s) => s.pendingStoppage !== null,
  stoppageTechnical: (s) => s.pendingStoppage !== null,
  sotg: (s) => s.status === 'paused',
  timeoutRunning: (s) => s.status === 'timeout',
  goHalftime: (s) => s.status === 'halftime',
  goWaterBreak: (s) => s.status === 'waterBreak',
  waterBreakDue: (s) => s.status === 'waterBreak',
  universePoint: (s) => isUniversePoint(s),
};

/**
 * One picture per blast count: the same whistle pictogram badged "x1"/"x2"/"x3" in
 * its bottom-right corner, so the sign says *how many* blasts and not merely that
 * there were some — the count is the whole meaning of a pull countdown or a
 * timeout restart. Generated by scripts/whistle-signal-art.mjs; the badge is baked
 * into the art rather than overlaid here because the card shrinks to 44 px in the
 * landscape layout.
 */
const WHISTLE: Record<1 | 2 | 3, SignalArt> = {
  1: { file: 'whistle1', caption: 'signal_whistle1' },
  2: { file: 'whistle2', caption: 'signal_whistle2' },
  3: { file: 'whistle3', caption: 'signal_whistle3' },
};

/**
 * The official WFDF hand signal for an assist message — or nothing, for the many that
 * are announced or recorded but never hand-signalled by a scorekeeper (a turnover, a
 * score correction, a cap). `file` is a basename under `public/signals/`.
 *
 * Every *whistle* signal comes from `currentWhistle` instead, so this covers only the
 * non-whistle ones.
 */
const SIGNAL: Record<string, SignalArt> = {
  goalScored: { file: 'goal', caption: 'signal_goal' },
  timeoutRunning: { file: 'timeout', caption: 'signal_timeout' },
  stoppageInjury: { file: 'stoppage', caption: 'signal_stoppageInjury' },
  stoppageTechnical: { file: 'stoppage', caption: 'signal_stoppageTechnical' },
  sotg: { file: 'sotg', caption: 'signal_sotg' },
  universePoint: { file: 'match-point', caption: 'signal_universePoint' },
  // Recorded events. Each call shows the infraction when it is made, and one of the
  // three outcome signals when it is resolved. There is no WFDF pictogram for a
  // stall-out, so it borrows the timing signal — the stall count is what is at issue.
  // A free-text note (`note`) is deliberately absent: nothing to signal.
  travel: { file: 'travel', caption: 'signal_travel' },
  call_foul: { file: 'foul', caption: 'signal_foul' },
  call_stallOut: { file: 'timing', caption: 'signal_stallOut' },
  call_pick: { file: 'pick', caption: 'signal_pick' },
  call_discDown: { file: 'disc-down', caption: 'signal_discDown' },
  call_out: { file: 'in-out', caption: 'signal_out' },
  call_offside: { file: 'offside', caption: 'signal_offside' },
  call_generic: { file: 'play-stopped', caption: 'signal_call' },
  resolution_accepted: { file: 'uncontested', caption: 'signal_accepted' },
  resolution_contested: { file: 'contest', caption: 'signal_contested' },
  resolution_retracted: { file: 'retracted', caption: 'signal_retracted' },
  // No entry for half-time: it has no WFDF hand signal. A cap, by contrast, IS a
  // whistle scenario — handled by currentWhistle, not from this map.
};

/**
 * The words for the current assist, or null.
 *
 * A call logged without a team (Track game activity off) shouts the same words minus
 * the attribution — "Foul!", not "Foul — No team!". Only the `call_*` entries have
 * such a variant; the outcome call-outs never name a team.
 */
function sayFor(state: GameState): string | null {
  const base = SAY[state.assist];
  if (!base) return null;
  return state.assist.startsWith('call_') && !state.pendingCall?.team ? `${base}NoTeam` : base;
}

/**
 * The WFDF hand signal for a gender ratio, or null when no ratio is in play (open/
 * women's division, or Rule B, which has no prescribed ratio to signal). Distinct
 * art per composition — hands behind head for the 4-men point, arms out to the
 * sides for the 4-women point. Exported so `SignalCard` can fall back to it once the
 * queue is empty: unlike a routine message, a ref keeps making this signal until the
 * lines are actually set, which can outlast its normal window on screen.
 */
export function ratioSignalArt(g: 'male' | 'female' | null): SignalArt | null {
  if (g === 'male') return { file: 'ratio-4men', caption: 'signal_ratioMale' };
  if (g === 'female') return { file: 'ratio-4women', caption: 'signal_ratioFemale' };
  return null;
}

/** The non-whistle hand signal for the current assist, or null. */
function signalFor(state: GameState): SignalArt | null {
  if (state.assist === 'nextRatio') return ratioSignalArt(state.nextRatio ?? state.ratio);
  return SIGNAL[state.assist] ?? null;
}

/**
 * What the open question is about, for the lines that name it — or null when nothing
 * is open, where it goes unused. An i18n key, not a translation: this module has no
 * `t`. Stoppage first, matching the order the ambient line resolves them in.
 */
export function pendingKindKey(state: GameState): string | null {
  if (state.pendingStoppage) return `stoppageKind_${state.pendingStoppage.kind}`;
  if (state.pendingCall) return `callKind_${state.pendingCall.kind}`;
  return null;
}

/** Which physical end the second-half puller throws from, as an i18n key. */
export function halfSideKeyFor(state: GameState): string {
  return secondHalfPullSide(state) === 'left' ? 'sideLeft' : 'sideRight';
}

export function assistVars(state: GameState) {
  const a = state.config.teams.A;
  const b = state.config.teams.B;
  const gender = state.nextRatio ?? state.ratio ?? '';
  return {
    a: a.name,
    b: b.name,
    as: state.scores.A,
    bs: state.scores.B,
    // Whichever team the current message is about: the one with an unresolved call
    // on the field, else the one that called the timeout, else whoever holds the
    // disc, else the puller (the only one that matters between points, where
    // possession is null). An open call outranks possession because that is what
    // play has stopped for, and it is the only thing being talked about.
    //
    // A call logged in statsMode 'none' has no team and falls through: every
    // message about such a call uses a NoTeam wording that never reads `team`,
    // so there is no "No team" to print here.
    team: state.pendingCall?.team
      ? state.config.teams[state.pendingCall.team].name
      : state.timeoutTeam !== null
        ? state.config.teams[state.timeoutTeam].name
        : state.possessionTeam !== null
          ? state.config.teams[state.possessionTeam].name
          : state.config.teams[state.pullingTeam].name,
    // Strictly the game target. It used to fall back to halfCappedTarget, which would
    // print the half's number in a message about the game.
    n: state.cappedTarget ?? state.config.targetScore,
    // And the half target, for the messages about the half.
    halfN: state.halfCappedTarget ?? state.config.halfScore,
    // Who pulls to open the second half — fixed by config alone (see
    // secondHalfPuller), unlike `team` above which reads state.pullingTeam and
    // during the half-time break itself still names whoever scored into it.
    halfTeam: state.config.teams[secondHalfPuller(state)].name,
    gender,
  };
}

/** True when `incoming` is the designed follow-up to `active` — see SUPERSEDES. */
export function supersedes(incoming: Occurrence, active: Occurrence): boolean {
  return SUPERSEDES[incoming.assist] === active.assist;
}

/**
 * The occurrence identity of the current assist.
 *
 * `nextLogId` so a repeat of the same event (two injuries, two goals with nothing
 * between) counts as new rather than as the one already dismissed, and `ratioSignalId`
 * so re-tapping the ratio chip re-arms it even though `assist` never changed.
 */
function assistOccurrenceKey(state: GameState): string {
  return `${state.assist}:${state.nextLogId}:${state.ratioSignalId}`;
}

/**
 * Whether anything new happened since `prev`, and what to show for it.
 *
 * Both sources are read together so that an assist and a whistle landing in the same
 * update (the game-on blast and "Game on!") come out as *one* occurrence carrying both
 * — split in two they would queue against each other and the words would arrive four
 * seconds after the sign. Whistle art wins over the assist's own signal, the priority
 * the signal card has always used.
 *
 * Returns the keys to remember either way, so the caller stays in step even on the
 * updates that produce nothing to show.
 */
export function nextOccurrence(
  state: GameState,
  prev: OccurrenceKeys,
): { keys: OccurrenceKeys; occurrence: Occurrence | null } {
  const assistKey = assistOccurrenceKey(state);
  const w = currentWhistle(state);
  const whistleKey = w?.key ?? null;
  const keys: OccurrenceKeys = { assistKey, whistleKey };

  const assistNew = assistKey !== prev.assistKey;
  const whistleNew = whistleKey !== null && whistleKey !== prev.whistleKey;
  if (!assistNew && !whistleNew) return { keys, occurrence: null };

  const sayKey = assistNew ? sayFor(state) : null;
  const signal = whistleNew && w ? WHISTLE[w.blasts] : assistNew ? signalFor(state) : null;
  // Plenty of assists are pure bookkeeping — no words, no picture, nothing to queue.
  if (!sayKey && !signal) return { keys, occurrence: null };

  const tier = Math.max(
    assistNew ? (TIER[state.assist] ?? 0) : 0,
    whistleNew ? WHISTLE_TIER : 0,
  ) as AssistTier;

  // A whistle that fired on its own is stale once that blast is no longer the current
  // one — the pull has moved from 45 s to 60 s and the x1 sign would be a lie.
  // Anything with words attached is judged on the situation those words describe.
  const stillRelevant = sayKey
    ? (STILL_RELEVANT[state.assist] ?? (() => true))
    : (s: GameState) => currentWhistle(s)?.key === whistleKey;

  return {
    keys,
    occurrence: {
      key: `${assistNew ? assistKey : ''}|${whistleNew ? whistleKey : ''}`,
      assist: assistNew ? state.assist : '',
      tier,
      sayKey,
      signal,
      vars: assistVars(state),
      kindKey: pendingKindKey(state),
      halfSideKey: halfSideKeyFor(state),
      stillRelevant,
    },
  };
}
