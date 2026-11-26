import { useLayoutEffect, useRef } from 'react';
import { useT } from '../i18n/useT';
import { NowIcon, SayIcon } from './icons';
import { useAssist, useGame } from '../state/gameHooks';
import {
  assistVars,
  halfSideKeyFor,
  pendingKindKey,
  ratioPhrase,
  type AssistVars,
} from '../state/assistOccurrence';
import { capTargetOptions, isUniversePoint } from '../state/gameReducer';
import type { GameState } from '../state/types';

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
  // currentWhistle) — otherwise the plain half-time line. Either way it names the
  // next puller and the side they pull from (halfTeam/halfSide), same as the
  // goHalftime call-out.
  if (state.status === 'halftime') {
    const sec = state.secondary;
    if (sec?.kind === 'halftime' && (sec.total ?? 0) >= 120 && sec.seconds <= 60) {
      return 'now_halftimeWarn';
    }
    return 'now_halftime';
  }
  // A water break runs on its own terms: the timer counts up and nothing ends it
  // but the volunteer, so the line says "still drinking" until the configured
  // duration is up and "send them back" from then on.
  if (state.status === 'waterBreak') {
    const sec = state.secondary;
    if (sec?.kind === 'waterBreak' && sec.total !== null && sec.seconds >= sec.total) {
      return 'now_waterBreakDue';
    }
    return 'now_waterBreak';
  }
  // An open call or stoppage. Excluded once a stoppage has run long enough to
  // auto-stop the clock (status 'paused'), where the more specific clock-stopped
  // line below takes over.
  if (state.status !== 'paused') {
    // Past 45 s it has dragged on and the app whistles it, so say that — the 60 s
    // mark gets its own wording once it passes, since the "three more at 60" warning
    // stops being true the moment those three whistles have already sounded. The
    // stoppage is read first when both are open, same order as currentWhistle: it
    // has priority and has frozen the call's counter anyway.
    const callWaitElapsed =
      state.pendingStoppage?.elapsedSeconds ?? state.pendingCall?.elapsedSeconds ?? 0;
    if (callWaitElapsed >= 60) return 'now_callWaitLong';
    if (callWaitElapsed >= 45) return 'now_callWait';
    // Before that, each open question needs its own line. A stoppage comes first:
    // it can be raised over anything, and while it is open the pull, timeout,
    // half-time and call clocks are all waiting on it.
    if (state.pendingStoppage) return 'now_stoppagePending';
    // An open call: `canScore` rejects while one is pending, so the default "tap a
    // panel when they score" would be a lie.
    // Two wordings, because a call logged without tracking game activity has no
    // team to name — see the NoTeam variants in the SAY map.
    if (state.pendingCall) {
      // WFDF's on-field discussion timing: captains are asked to step in once a
      // call has sat unresolved for 15 s, before it reaches the 45/60 s whistles
      // above. This is call-specific (not a stoppage) — an injury or technical
      // stoppage has no captains-in-discussion step, so this only reads
      // `pendingCall`, never the merged `callWaitElapsed`.
      if (state.pendingCall.elapsedSeconds >= 15) {
        return state.pendingCall.team ? 'now_callWaitCaptains' : 'now_callWaitCaptainsNoTeam';
      }
      return state.pendingCall.team ? 'now_callPending' : 'now_callPendingNoTeam';
    }
  }
  // Universe point holds for the whole point it applies to (not just the moment it
  // starts), so it overrides the ambient line for as long as the condition is true —
  // unlike the pull whistle above, which the ambient falls back to inside its own window.
  if (isUniversePoint(state) && (state.status === 'live' || state.status === 'awaitingPull')) {
    return 'now_universePoint';
  }
  // A capped target the volunteer can still move (see capTargetOptions) adds a tail to
  // the two lines that cover the whole window it can be moved in — before the pull and
  // with the disc live — since the chip it points at is a small thing to notice on its
  // own. It rides on these two rather than overriding anything above: the pull-clock
  // whistles and the universe point are about the seconds passing, and the target can
  // wait for them.
  const capEditable =
    capTargetOptions(state, 'game').length > 1 || capTargetOptions(state, 'half').length > 1;
  // Same idea, before the pull specifically: a mixed ratio in play adds the reminder
  // to keep making the hand signal while the lines are being set (see SignalCard's
  // fallback, which is what actually keeps that picture on screen through this
  // window). Rides on the same line as the cap tail rather than a status of its own.
  const ratioApplies =
    state.config.division === 'mixed' && (state.ratio !== null || state.nextRatio !== null);
  switch (state.status) {
    case 'notStarted':
      return 'now_setup';
    case 'awaitingStart':
      return 'now_awaitingStart';
    case 'awaitingPull':
      if (capEditable && ratioApplies) return 'now_awaitingPullCapRatio';
      if (ratioApplies) return 'now_awaitingPullRatio';
      return capEditable ? 'now_awaitingPullCap' : 'now_awaitingPull';
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
      return capEditable ? 'now_discInPlayCap' : 'now_discInPlay';
  }
}

/** The smallest size a long message steps down to; see the fitting in AssistanceBar. */
const FIT_MIN_PX = 11;

/**
 * The bottom bar, in two flavours:
 * - green call-out — the exact words to shout, shown briefly alongside its signal;
 * - amber status line — the standing "what to do now", always there underneath.
 */
export function AssistanceBar() {
  const state = useGame();
  const occurrence = useAssist();
  const { t } = useT();

  // The queue decides whether there are words to shout and whose turn it is; the
  // ambient line is what shows the rest of the time.
  //
  // A call-out renders from the values frozen when it was queued — by the time it
  // reaches the screen the call may be resolved or the score moved on, and it should
  // still read as the announcement it was. The ambient line is about right now, so it
  // reads live state instead.
  const source: { key: string; vars: AssistVars; kindKey: string | null; halfSideKey: string } =
    occurrence?.sayKey
      ? {
          key: occurrence.sayKey,
          vars: occurrence.vars,
          kindKey: occurrence.kindKey,
          halfSideKey: occurrence.halfSideKey,
        }
      : {
          key: statusKey(state),
          vars: assistVars(state),
          kindKey: pendingKindKey(state),
          halfSideKey: halfSideKeyFor(state),
        };
  const say = Boolean(occurrence?.sayKey);

  const vars = source.vars;
  const genderLabel = vars.gender
    ? ratioPhrase(
        vars.gender === 'male' ? 'male' : 'female',
        vars.genderPosition ?? null,
        t as never,
      )
    : '';
  // What the open question is about, and which end the second-half pull comes from.
  // Both arrive as i18n keys — assistOccurrence has no `t` — and are translated here.
  const kind = source.kindKey ? t(source.kindKey as never) : '';
  const halfSide = t(source.halfSideKey as never);
  const key = source.key;
  const text = t(key as never, { ...vars, gender: genderLabel, kind, halfSide } as never);

  // The bar is one fixed height whatever it says, because it sits under the score
  // panels and anything taller pushed the whole board up mid-game — so the words
  // fit the bar, not the other way round. Each message starts at its normal size and
  // steps down a pixel at a time until it fits, never below FIT_MIN_PX. The height
  // was measured against every `now_*`/`say_*` message in all three languages at
  // 360 px: four lines of the 12 px step, which most messages never need to reach.
  const box = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const p = line.current;
      const b = box.current;
      if (!p || !b) return;
      p.style.fontSize = '';
      const room = b.clientHeight - parseFloat(getComputedStyle(b).paddingTop) * 2;
      let px = parseFloat(getComputedStyle(p).fontSize);
      while (p.scrollHeight > room && px > FIT_MIN_PX) {
        px -= 1;
        p.style.fontSize = `${px}px`;
      }
    };
    fit();
    // Turning the phone changes the width, and with it how many lines a message takes.
    if (typeof ResizeObserver === 'undefined' || !box.current) return;
    const observer = new ResizeObserver(fit);
    observer.observe(box.current);
    return () => observer.disconnect();
  }, [text, say]);

  return (
    <div
      ref={box}
      aria-live="assertive"
      data-assistance-bar
      className={`flex items-center gap-3 lscape:gap-2 overflow-hidden border-t bg-panel px-3 py-2 lscape:px-2 lscape:py-1 h-[82px] lscape:h-11 shrink-0 ${
        say ? 'border-call text-call' : 'border-line text-chalk'
      }`}
    >
      {/* The tag says which of the two this is before a word is read: the words to
          shout, or what to do now. */}
      <span
        aria-hidden="true"
        className={`shrink-0 flex items-center justify-center w-8 h-8 lscape:w-5 lscape:h-5 rounded-md text-panel ${
          say ? 'bg-call' : 'bg-signal'
        }`}
      >
        {say ? (
          <SayIcon size="w-5 h-5 lscape:w-3.5 lscape:h-3.5" />
        ) : (
          <NowIcon size="w-5 h-5 lscape:w-3.5 lscape:h-3.5" />
        )}
      </span>
      <p
        ref={line}
        className={`leading-snug ${
          say
            ? 'font-board font-semibold text-base sm:text-lg lscape:text-xs'
            : 'text-sm sm:text-base lscape:text-xs'
        }`}
      >
        {text}
      </p>
    </div>
  );
}
