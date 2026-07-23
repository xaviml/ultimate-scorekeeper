import { useT } from '../i18n/useT';
import { useTransientKey } from '../hooks/useTransientKey';
import { useGame } from '../state/gameHooks';
import { isUniversePoint } from '../state/gameReducer';
import type { GameState } from '../state/types';

/** A call-out sits on screen exactly as long as its hand signal does. */
const SAY_MS = 7000;

/**
 * Assist messages that are words to SHOUT, mapped to the verbatim line.
 *
 * These are transient: they show for SAY_MS and then give way to the ambient
 * status line. Anything not listed here has nothing to announce — a turnover, a
 * disc-in-play are bookkeeping, so they never take over the bar.
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
  call_offside: 'say_callOffside',
  call_discDown: 'say_callDiscDown',
  call_generic: 'say_callGeneric',
  resolution_accepted: 'say_resolutionAccepted',
  resolution_contested: 'say_resolutionContested',
  resolution_retracted: 'say_resolutionRetracted',
};

/**
 * The ambient "what is happening right now, and what do I do about it" line.
 *
 * Derived from status rather than from `state.assist`, so it is always available
 * — it is what the bar falls back to once a call-out has had its moment.
 */
function statusKey(state: GameState): string {
  // While the pull is being counted, the whistle schedule is the useful thing to show.
  if (state.status === 'awaitingPull' && state.secondary?.kind === 'pull') {
    const s = state.secondary.seconds;
    if (s >= 75) return 'now_pull75';
    if (s >= 60) return 'now_pull60';
    if (s >= 45) return 'now_pull45';
  }
  // After-pull timeout: the disc must go live again on a fixed schedule (see
  // currentWhistle), so the ambient counts it down. Remaining maps to the milestone
  // just as the whistles do — 45→"30s until ready", 30→"15s", 15→"offence set".
  if (
    state.status === 'timeout' &&
    state.secondary?.kind === 'timeout' &&
    state.secondary.afterPull
  ) {
    const r = state.secondary.seconds;
    if (r <= 15) return 'now_toReady0';
    if (r <= 30) return 'now_toReady15';
    if (r <= 45) return 'now_toReady30';
  }
  // One minute to the second half, when the break is long enough to warn (see
  // currentWhistle) — otherwise the plain "half-time" line.
  if (state.status === 'halftime') {
    const sec = state.secondary;
    if (sec?.kind === 'halftime' && (sec.total ?? 0) >= 120 && sec.seconds <= 60) {
      return 'now_halftimeWarn';
    }
    return 'now_halftime';
  }
  // An open call or stoppage. Excluded once a stoppage has run long enough to
  // auto-stop the clock (status 'paused'), where the more specific clock-stopped
  // line below takes over.
  if (state.status !== 'paused') {
    // Past 45 s it has dragged on and the app whistles it, so say that.
    if ((state.pendingCall?.elapsedSeconds ?? state.pendingStoppage?.elapsedSeconds ?? 0) >= 45) {
      return 'now_callWait';
    }
    // Before that, an open call still needs its own line: `canScore` rejects while
    // one is pending, so the default "tap a panel when they score" would be a lie.
    // (A stoppage doesn't lock the score, so it keeps the ordinary status line.)
    if (state.pendingCall) return 'now_callPending';
  }
  // Universe point holds for the whole point it applies to (not just the moment it
  // starts), so it overrides the ambient line for as long as the condition is true —
  // unlike the pull whistle above, which the ambient falls back to inside its own window.
  if (isUniversePoint(state) && (state.status === 'live' || state.status === 'awaitingPull')) {
    return 'now_universePoint';
  }
  switch (state.status) {
    case 'notStarted':
      return 'now_setup';
    case 'awaitingStart':
      return 'now_awaitingStart';
    case 'awaitingPull':
      return 'now_awaitingPull';
    case 'timeout':
      return 'now_timeout';
    case 'paused':
      // A stoppage left open too long auto-stops the clock (see TICK in the
      // reducer) and takes priority here — it's a distinct reason from either a
      // manual pause or an SOTG stoppage, so it gets its own wording.
      if (state.pendingStoppage?.clockStopped) return 'now_stoppageClockStopped';
      // The generic pause button covers reasons (technical, weather, a prolonged
      // stoppage) that aren't spirit-related, so it gets its own, SOTG-free wording.
      return state.pauseSilent ? 'now_pauseManual' : 'now_paused';
    case 'finished':
      return 'now_finished';
    default:
      return 'now_discInPlay';
  }
}

function assistVars(state: GameState) {
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
    team:
      state.pendingCall !== null
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
    gender,
  };
}

function SpeechIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 lscape:w-3.5 lscape:h-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a7 7 0 01-7 7H8l-5 3 1.6-4.2A7 7 0 0110 5h4a7 7 0 017 7z" />
    </svg>
  );
}

/**
 * The bottom bar, in two flavours:
 * - green call-out — the exact words to shout, shown briefly alongside its signal;
 * - amber status line — the standing "what to do now", always there underneath.
 */
export function AssistanceBar() {
  const state = useGame();
  const { t } = useT();

  const sayKey = SAY[state.assist];
  // Keyed on the assist plus the log counter so a repeat of the same event (two
  // injuries, two goals with nothing between) still counts as a new call-out.
  const fresh = useTransientKey(sayKey ? `${state.assist}:${state.nextLogId}` : null, SAY_MS);
  const say = Boolean(sayKey) && fresh;

  const vars = assistVars(state);
  const genderLabel =
    vars.gender === 'male' ? t('ratioMale') : vars.gender === 'female' ? t('ratioFemale') : '';
  // The open call's kind, for the lines that name it. Translated here rather than in
  // assistVars, which has no `t` — empty when there is no call, where it goes unused.
  const kind = state.pendingCall ? t(`callKind_${state.pendingCall.kind}` as never) : '';
  const key = say ? sayKey : statusKey(state);

  return (
    <div
      aria-live="assertive"
      className={`flex items-center gap-3 lscape:gap-2 border-t-2 px-3 py-2 lscape:px-2 lscape:py-1 min-h-[3.5rem] lscape:min-h-[2rem] shrink-0 ${
        say ? 'bg-call/10 border-call text-call' : 'bg-signal/10 border-signal text-chalk'
      }`}
    >
      {say && <SpeechIcon />}
      <p
        className={`leading-snug ${
          say
            ? 'font-board font-semibold text-base sm:text-lg lscape:text-xs'
            : 'text-sm sm:text-base lscape:text-xs'
        }`}
      >
        {t(key as never, { ...vars, gender: genderLabel, kind } as never)}
      </p>
    </div>
  );
}
