import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import {
  canRecordEvent,
  canScore,
  canStoppage,
  canTurnover,
  canUndo,
  canUndoTurnover,
  effectiveHalfTarget,
  halfTargetApplies,
  isUniversePoint,
  playHalted,
  possessionTracked,
  pullFromSide,
  timeoutAvailability,
  timeoutsConfigured,
} from '../state/gameReducer';
import { formatClock } from '../state/stats';
import { useBackGuard } from '../hooks/useBackGuard';
import { useLongPress } from '../hooks/useLongPress';
import type { CallKind, CallResolution, GameState, TeamId } from '../state/types';
import { AssistanceBar } from './AssistanceBar';
import { AssistGoalDialog } from './AssistGoalDialog';
import { CallDialog, type CallChoice } from './CallDialog';
import { CallTeamDialog } from './CallTeamDialog';
import { ConfirmEndGameDialog } from './ConfirmEndGameDialog';
import { ConfirmLeaveGameDialog } from './ConfirmLeaveGameDialog';
import { ConfirmPauseGameDialog } from './ConfirmPauseGameDialog';
import { GameLog } from './GameLog';
import {
  ArrowBackIcon,
  CallIcon,
  CrossIcon,
  LogIcon,
  PlayersIcon,
  StoppageIcon,
  TurnIcon,
} from './icons';
import { NoteDialog } from './NoteDialog';
import { PlayersDialog } from './PlayersDialog';
import { SignalCard } from './SignalCard';
import { StoppageDialog } from './StoppageDialog';
import { TravelTeamDialog } from './TravelTeamDialog';
import { TurnoverDialog } from './TurnoverDialog';
import { contrastText } from './ui';

const END_GAME_CONFIRM_KEY = 'ultimate-scorekeeper:end-game-confirm-open';
const ASSIST_DISMISSED_KEY = 'ultimate-scorekeeper:assist-dismissed-up-to';

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function ScorePanel({ team, side }: { team: TeamId; side: 'left' | 'right' }) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const [flash, setFlash] = useState<string | null>(null);

  const scoreCheck = canScore(state);
  const tap = () => {
    if (!scoreCheck.ok) {
      setFlash(scoreCheck.reason ?? null);
      setTimeout(() => setFlash(null), 1800);
      return;
    }
    dispatch({ type: 'GOAL', team });
  };
  const hold = () => {
    const check = canUndo(state, team);
    if (!check.ok) {
      setFlash(check.reason ?? null);
      setTimeout(() => setFlash(null), 1800);
      return;
    }
    dispatch({ type: 'UNDO_GOAL', team });
  };
  const press = useLongPress(tap, hold);

  const cfg = state.config.teams[team];
  const ink = contrastText(cfg.color);
  return (
    <button
      {...press}
      aria-label={`${cfg.name}: ${state.scores[team]}`}
      className={`relative flex-1 flex flex-col items-center justify-center overflow-hidden select-none touch-none transition-opacity ${
        scoreCheck.ok ? '' : 'opacity-70'
      } ${side === 'left' ? 'rounded-r-none' : 'rounded-l-none'}`}
      style={{ backgroundColor: cfg.color }}
    >
      <span
        className="font-board font-semibold text-base sm:text-xl lscape:text-[9px] leading-tight drop-shadow px-2 truncate max-w-full"
        style={{ color: ink, opacity: 0.9 }}
      >
        {cfg.name}
      </span>
      <span
        className="font-clock font-semibold text-[clamp(4rem,20vw,9rem)] lscape:text-[clamp(1.5rem,16vh,4.5rem)] leading-none drop-shadow-lg"
        style={{ color: ink }}
      >
        {state.scores[team]}
      </span>
      {flash && (
        <span className="absolute bottom-2 inset-x-2 text-center text-xs sm:text-sm lscape:text-[10px] bg-black/60 text-white rounded-md px-2 py-1">
          {t(`assist_blocked_${flash}` as never)}
        </span>
      )}
    </button>
  );
}

/** Timeouts this team still has, under whichever of the two budgets is configured. */
function timeoutsLeft(state: GameState, team: TeamId): number {
  const { perHalf, perGame } = state.config.timeouts;
  const used = state.timeoutsUsed[team];
  return perHalf !== null
    ? perHalf - (state.half === 1 ? used.half1 : used.half2)
    : (perGame ?? 0) - used.half1 - used.half2;
}

const utility =
  'rounded-lg bg-panel border border-line px-2 py-2 lscape:px-1 lscape:py-1 text-xs sm:text-sm lscape:text-[9px] font-board uppercase tracking-wide active:scale-95 disabled:opacity-40';

/**
 * The two flavours of the wide action-row button under the score panels: the amber
 * one that moves play on (start, pull, resume, report) and the quieter outline one
 * that ends a break.
 *
 * Both fade and stop pulsing while an open stoppage blocks them — a stoppage
 * freezes the pull/timeout/half-time clocks and the reducer refuses all three
 * until it is resolved, so a button still inviting a tap would be lying.
 */
const playAdvanceButton =
  'w-full rounded-lg bg-signal text-pitch px-3 py-3 lscape:py-1.5 font-board font-bold text-base lscape:text-xs animate-pulse disabled:opacity-40 disabled:animate-none';
const breakEndButton =
  'w-full rounded-lg bg-panel border border-line px-3 py-3 lscape:py-1.5 font-board text-base lscape:text-xs';

/**
 * One action-row button: a glyph with a micro-label — a 9px uppercase word small
 * enough to read as part of the icon rather than as a caption, the same treatment
 * the clock tile headings already use.
 *
 * The two orientations stack it differently on purpose. Portrait is narrow
 * (~60px a button at 360px wide) and tall, so the label goes underneath.
 * Landscape is the reverse — `lscape:` is capped on *height*, not width, and
 * gives each button ~160px — so there the label sits beside the glyph, spending
 * the axis that is actually free and costing the row no extra height.
 *
 * `label` is optional: the stoppage button leaves it off because no single short
 * word covers injury, technical and SOTG without misleading, so it carries its
 * meaning in `aria-label`/`title` alone.
 *
 * `onHold` is optional too, and only Turn has one: tap records a turnover, hold
 * takes the last one back — the same tap/hold pair the score panels use for
 * goal/undo. A button with one swaps its click handler for the press handlers
 * rather than keeping both, or the tap would fire twice.
 */
function ActionButton({
  icon,
  label,
  name,
  onClick,
  onHold,
  disabled,
}: {
  icon: React.ReactNode;
  label?: string;
  /** Accessible name — the full wording, which the micro-label abbreviates. */
  name: string;
  onClick: () => void;
  onHold?: () => void;
  disabled?: boolean;
}) {
  const press = useLongPress(onClick, onHold ?? (() => {}));
  return (
    <button
      {...(onHold ? press : { onClick })}
      className={`${utility} flex flex-col lscape:flex-row items-center justify-center gap-0.5 lscape:gap-1.5 ${
        onHold ? 'select-none touch-none' : ''
      }`}
      disabled={disabled}
      aria-label={name}
      title={name}
    >
      {icon}
      {label && (
        <span className="text-[9px] lscape:text-[10px] leading-none tracking-wide">{label}</span>
      )}
    </button>
  );
}

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 lscape:w-3 lscape:h-3"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 lscape:w-3 lscape:h-3"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 5v14l12-7z" />
    </svg>
  );
}

/**
 * Timeout caller, parked in the top outer corner of its own team's score panel:
 * each team's timeout now sits on that team's side of the board, so there is
 * nothing to work out about which button belongs to whom.
 *
 * It is a sibling of the score panels rather than a child, absolutely positioned
 * over them — ScorePanel is itself a `<button>`, and a button inside a button is
 * invalid. That also means it does swallow taps in its corner, unlike SignalCard
 * which is pointer-events-none: intended here, since it *is* a control, which is
 * why it stays small and hugs the outer edge, well away from where a thumb goes
 * for the score.
 *
 * The remaining count is unchanged from when this lived under the clocks, still
 * ordered so the icon sits inboard and the number outboard.
 */
function TimeoutButton({
  team,
  side,
  onCall,
}: {
  team: TeamId;
  side: 'left' | 'right';
  onCall: (team: TeamId) => void;
}) {
  const state = useGame();
  const { t } = useT();
  const cfg = state.config.teams[team];
  const left = timeoutsLeft(state, team);
  const label = `${cfg.name} — ${t('timeoutsLeft', { n: left })}`;

  const icon = (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 lscape:w-3 lscape:h-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="14" r="7" />
      <path d="M12 11v3M9.5 2h5M12 2v3" />
    </svg>
  );
  const count = <span className="font-clock text-sm lscape:text-[10px] leading-none">{left}</span>;

  return (
    <button
      onClick={() => onCall(team)}
      disabled={state.status === 'finished'}
      aria-label={label}
      title={label}
      className={`absolute top-2 lscape:top-1 ${
        side === 'left' ? 'left-2 lscape:left-1' : 'right-2 lscape:right-1'
      } z-10 flex items-center justify-center gap-1 rounded-lg bg-black/60 border border-white/25 px-2 py-1.5 lscape:px-1.5 lscape:py-1 text-chalk active:scale-95 disabled:opacity-40`}
    >
      {/* Invisible, larger-than-visible hit area: the pill itself stays small so it
          doesn't eat into the score panel's thumb zone, but a near-miss tap should
          still hit the timeout button rather than falling through to the goal tap
          underneath. */}
      <span aria-hidden="true" className="absolute -inset-3 lscape:-inset-2" />
      {side === 'left' ? (
        <>
          {count}
          {icon}
        </>
      ) : (
        <>
          {icon}
          {count}
        </>
      )}
    </button>
  );
}

const RESOLUTIONS: CallResolution[] = ['accepted', 'contested', 'retracted'];

/**
 * The three answers to an open call, parked directly above the clocks so they are
 * the first thing the thumb finds while the discussion is still going on. Rendered
 * only while a call is pending; picking one logs how long it took and clears it.
 *
 * A stoppage or an SOTG pause raised mid-discussion takes the row away entirely
 * (`playHalted`), leaving only the button that clears that stoppage: the discussion
 * itself is frozen — `pendingCall.elapsedSeconds` stops ticking — so there is
 * nothing for the players to be deciding, and one question at a time above the
 * clocks is the whole point of this row. It comes back untouched, with the call
 * still open, the moment play resumes.
 */
function CallResolutionRow() {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const pending = state.pendingCall;
  if (!pending || playHalted(state)) return null;

  return (
    <div className="space-y-1 lscape:space-y-0.5">
      <p className="text-[10px] lscape:text-[8px] uppercase tracking-widest text-signal">
        {/* No team when activity isn't tracked — then the kind stands alone, rather
            than being trailed by a "No team" that reads like a team's name. */}
        {pending.team
          ? t('callPending', {
              kind: t(`callKind_${pending.kind}` as never),
              team: state.config.teams[pending.team].name,
            })
          : t('callPendingNoTeam', { kind: t(`callKind_${pending.kind}` as never) })}
      </p>
      <div className="grid grid-cols-3 gap-2 lscape:gap-1">
        {RESOLUTIONS.map((resolution) => (
          <button
            key={resolution}
            className="rounded-lg bg-signal/20 border border-signal text-signal px-2 py-2 lscape:px-1 lscape:py-1 text-xs sm:text-sm lscape:text-[9px] font-board uppercase tracking-wide active:scale-95"
            onClick={() => dispatch({ type: 'CALL_RESOLVED', resolution })}
          >
            {t(`callResolution_${resolution}` as never)}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The one answer to an open stoppage, parked next to the call resolution row
 * above the clocks. Rendered only while a stoppage (injury or technical) is
 * awaiting resolution; tapping it logs how long the stoppage took and clears it.
 *
 * Hidden once the stoppage has run long enough to auto-stop the game clock
 * (`clockStopped`) — at that point the game is 'paused' exactly like an SOTG
 * stoppage, so the action row's own "Resume game" button is the one way out
 * instead (see the `actionRowStatus === 'paused'` button below).
 */
function StoppageResolutionRow() {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  if (!state.pendingStoppage || state.pendingStoppage.clockStopped) return null;
  const kind = t(`stoppageKind_${state.pendingStoppage.kind}` as never);

  return (
    <div className="space-y-1 lscape:space-y-0.5">
      <p className="text-[10px] lscape:text-[8px] uppercase tracking-widest text-signal">
        {t('stoppagePending' as never, { kind })}
      </p>
      <button
        className="w-full rounded-lg bg-signal/20 border border-signal text-signal px-2 py-2 lscape:px-1 lscape:py-1 text-xs sm:text-sm lscape:text-[9px] font-board uppercase tracking-wide active:scale-95"
        onClick={() => dispatch({ type: 'STOPPAGE_RESOLVED' })}
      >
        {t('btnStoppageResolved')}
      </button>
    </div>
  );
}

function ratioLabel(
  state: GameState,
  t: (k: never, v?: Record<string, string | number>) => string,
) {
  const g = state.nextRatio ?? state.ratio;
  if (!g) return null;
  const gender = g === 'male' ? t('ratioMale' as never) : t('ratioFemale' as never);
  return t('currentRatio' as never, { gender });
}

function pullLabel(state: GameState, t: (k: never, v?: Record<string, string | number>) => string) {
  // The pull side is the PHYSICAL end the puller pulls from, which swaps each point —
  // not the puller's fixed spot on the scoreboard.
  const side = pullFromSide(state) === 'left' ? t('sideLeft' as never) : t('sideRight' as never);
  const team = state.config.teams[state.pullingTeam].name;
  return t('pullChip' as never, { team, side });
}

/**
 * While a call, a stoppage or an SOTG stoppage is open, the secondary clock box
 * gives up its usual pull/timeout/half-time role and counts up instead — how long
 * the wait has been so far, labelled with what's being waited on. The number
 * shown is exactly the one that gets logged once it resolves.
 *
 * Ordered by priority, not by which started first: a stoppage can be raised over
 * anything and everything else waits on it (see playHalted), then a stopped clock,
 * then an open call — so whichever is showing is the one the volunteer has to
 * clear next.
 *
 * A call and a stoppage each carry their own `elapsedSeconds`, which TICK stops
 * advancing while play is halted; that is what makes the pull/timeout/call clocks
 * resume where they left off rather than jumping. SOTG has no such counter, so it
 * is measured on the wall clock (via the most recent 'sotgStart' log entry's
 * `atMs`) — it's the one status that actually stops gameSeconds, so a game-clock
 * diff would be stuck at 0 for its whole duration.
 */
function secondaryOverride(
  state: GameState,
  now: Date,
  t: (k: never, v?: Record<string, string | number>) => string,
): { label: string; seconds: number } | null {
  if (state.pendingStoppage) {
    return {
      label: t(`stoppageKind_${state.pendingStoppage.kind}` as never),
      seconds: state.pendingStoppage.elapsedSeconds,
    };
  }
  if (state.status === 'paused') {
    const logType = state.pauseSilent ? 'pauseStart' : 'sotgStart';
    const start = [...state.log].reverse().find((e) => e.type === logType);
    return {
      label: t((state.pauseSilent ? 'pauseLabel' : 'signal_sotg') as never),
      seconds: start ? Math.max(0, Math.floor((now.getTime() - start.atMs) / 1000)) : 0,
    };
  }
  if (state.pendingCall) {
    return {
      label: t(`callKind_${state.pendingCall.kind}` as never),
      seconds: state.pendingCall.elapsedSeconds,
    };
  }
  return null;
}

export default function GameScreen() {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const now = useNow();
  const [showLog, setShowLog] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showStoppage, setShowStoppage] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showTravel, setShowTravel] = useState(false);
  // The call kind chosen in the Call dialog, waiting on "who called it?".
  const [callKind, setCallKind] = useState<CallKind | null>(null);
  // Attacking team captured when the turnover dialog opens, since recording the
  // turnover is what flips possession.
  const [turnoverTeam, setTurnoverTeam] = useState<TeamId | null>(null);
  const [actionHint, setActionHint] = useState<string | null>(null);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(
    () => sessionStorage.getItem(END_GAME_CONFIRM_KEY) === '1',
  );

  // Nothing that touches the score, the clock or possession is allowed before the
  // volunteer taps "Start game" — see the action row button and the hidden
  // pause/play toggle below.
  const gameStarted = state.status !== 'notStarted' && state.status !== 'awaitingStart';

  // Phone back button while a game is running: same intent as the beforeunload
  // guard in GameContext, but that only fires on an actual page unload, which a
  // back-gesture in an installed PWA skips entirely. This traps it and asks first.
  // A script can't force a real app exit on confirm (browsers reserve that for a
  // direct user gesture), so confirming instead abandons back to setup — a real,
  // one-tap, always-working in-app transition, same as BACK_TO_CONFIG elsewhere.
  //
  // Before the game has started there's nothing to lose, so the press just goes
  // straight back to setup (the same as the "Back to setup" button) with no
  // confirmation — only once play is under way does it stop to ask.
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const resolveBack = useBackGuard(true, ({ stay }) => {
    if (!gameStarted) {
      // Nothing to lose yet — the gesture already popped our guard entry, so
      // just drop back to setup, exactly like the "Back to setup" button.
      dispatch({ type: 'BACK_TO_CONFIG' });
      return;
    }
    // Absorb the press and keep guarding while the dialog is up, so a second
    // back can't slip past it.
    stay();
    setShowLeaveConfirm(true);
  });
  // Every path that unmounts the game screen to another screen consumes the
  // trapped history entry first, so nothing dead is left on the stack for the
  // destination's own back button to swallow.
  const leaveGameTo = (action: Parameters<typeof dispatch>[0]) => {
    resolveBack();
    dispatch(action);
  };

  // The action row (Start game / Pull thrown / Resume game / End timeout / End
  // halftime) only exists in the DOM while one of these statuses is active, which
  // shrinks the score panels above to make room for it the instant it appears. A
  // goal is the most common way into it, so the button materialises exactly where
  // the volunteer's finger already was tapping to score — see the min-height
  // reserved on its container below, which keeps the score panels a constant size
  // instead.
  const actionRowStatus =
    state.status === 'notStarted' ||
    state.status === 'awaitingStart' ||
    state.status === 'awaitingPull' ||
    state.status === 'paused' ||
    state.status === 'timeout' ||
    state.status === 'halftime' ||
    state.status === 'finished'
      ? state.status
      : null;

  // Post-goal assist dialog: pops up once per new point once trackPlayers is on,
  // tracked by how many points have already been resolved (skipped or saved).
  //
  // Persisted alongside the game state: that state now survives a reload, so a
  // counter that reset to 0 on mount would make an already-answered point look
  // unresolved and re-open this dialog on top of the pull controls.
  const [dismissedUpTo, setDismissedUpTo] = useState(
    () => Number(sessionStorage.getItem(ASSIST_DISMISSED_KEY)) || 0,
  );
  useEffect(() => {
    // Also self-heals a stale counter: undo and a brand-new game both shrink points.
    setDismissedUpTo((d) => Math.min(d, state.points.length));
  }, [state.points.length]);
  useEffect(() => {
    sessionStorage.setItem(ASSIST_DISMISSED_KEY, String(dismissedUpTo));
  }, [dismissedUpTo]);
  const pendingAssistPoint =
    state.config.trackPlayers && state.points.length > dismissedUpTo
      ? state.points[state.points.length - 1]
      : null;
  const resolveAssistDialog = () => setDismissedUpTo(state.points.length);

  const openEndGameConfirm = () => {
    setShowEndGameConfirm(true);
    sessionStorage.setItem(END_GAME_CONFIRM_KEY, '1');
  };
  const closeEndGameConfirm = () => {
    setShowEndGameConfirm(false);
    sessionStorage.removeItem(END_GAME_CONFIRM_KEY);
  };

  // The scoreboard layout is fixed for the whole game: whichever team started on the
  // left side of the field stays on the left of the screen from start to finish. The
  // physical ends still swap each point and at half-time, but the board never follows
  // them — that's tracked separately (see pullFromSide / the pull chip).
  const left: TeamId = state.config.startingSide;
  const right: TeamId = left === 'A' ? 'B' : 'A';

  const target = state.cappedTarget ?? state.config.targetScore;
  const isMixed = state.config.division === 'mixed';
  const paused = state.status === 'paused';
  // Mirrors the SOTG_TOGGLE guard in the reducer: the clock can be stopped at any
  // point of a game in progress, a timeout or half-time included; resuming is always
  // available while paused.
  const canTogglePause = paused || canStoppage(state).ok;
  // A stoppage left open long enough auto-stops the clock (state.pendingStoppage
  // .clockStopped) exactly like an SOTG pause — resuming from there also has to
  // resolve the stoppage, since its own small "Play can resume" button is hidden
  // in favour of this one (see StoppageResolutionRow).
  const resumeFromPause = () => {
    dispatch(
      state.pendingStoppage?.clockStopped ? { type: 'STOPPAGE_RESOLVED' } : { type: 'SOTG_TOGGLE' },
    );
  };
  const togglePause = () => {
    if (paused) {
      resumeFromPause();
      return;
    }
    setShowPauseConfirm(true);
  };
  const timeoutsOn = timeoutsConfigured(state.config.timeouts);
  // A call, a stoppage or an SOTG stoppage takes over the secondary clock box while
  // it's open — see secondaryOverride for why each is measured differently.
  const stoppage = secondaryOverride(state, now, t as never);

  // Scheduled kickoff not yet reached: the game clock counts down to it instead of
  // up from it (see the header dot and the clock label below), and TICK in the
  // reducer promotes the game to 'awaitingPull' on its own once it arrives.
  const countdownSeconds =
    state.status === 'awaitingStart' && state.startingAtMs !== null
      ? Math.max(0, Math.round((state.startingAtMs - now.getTime()) / 1000))
      : null;

  // Once finished, gameSeconds keeps advancing underneath (see TICK) so an undo of
  // the finishing goal resumes from the right elapsed time — but the clock reads as
  // stopped, so the displayed number is frozen at whatever it showed the moment the
  // game finished, not the live value ticking on behind it. State rather than a
  // ref so that undoing the goal (status leaving 'finished') repaints the correct,
  // caught-up number right away instead of waiting on the next TICK to re-render.
  const [frozenGameSeconds, setFrozenGameSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (state.status === 'finished') {
      setFrozenGameSeconds((prev) => prev ?? state.gameSeconds);
    } else {
      setFrozenGameSeconds(null);
    }
  }, [state.status, state.gameSeconds]);
  const displayGameSeconds = frozenGameSeconds ?? state.gameSeconds;

  const flashHint = (message: string) => {
    setActionHint(message);
    setTimeout(() => setActionHint(null), 2500);
  };

  const tryTimeout = (team: TeamId) => {
    const check = timeoutAvailability(state, team);
    if (!check.ok) {
      flashHint(t(`assist_blocked_${check.reason}` as never));
      return;
    }
    dispatch({ type: 'TIMEOUT_START', team });
  };

  // A stoppage always opens its dialog — it needs to ask injury vs. technical vs.
  // SOTG either way, and StoppageDialog itself skips the team/player attribution
  // steps when the game isn't tracking activity. Turn only exists as a button
  // once tracking is on, so tryTurnover never needs the untracked branch.
  //
  // canStoppage, not canRecordEvent: this is the one thing that can interrupt
  // whatever else is running. The only refusal that reaches a game in progress is
  // "there is already one open", which the hint says rather than the button going
  // dead — the volunteer pressing it is trying to stop play, and needs telling why
  // that isn't the button for it.
  const tryStoppage = () => {
    const check = canStoppage(state);
    if (!check.ok) {
      flashHint(t(`assist_blocked_${check.reason}` as never));
      return;
    }
    setShowStoppage(true);
  };

  const tryTurnover = () => {
    const check = canTurnover(state);
    if (!check.ok) {
      flashHint(t(`assist_blocked_${check.reason}` as never));
      return;
    }
    setTurnoverTeam(state.possessionTeam);
  };

  // Long-press on the same button: the disc goes back to the team that lost it and
  // the turnover leaves the log (or is corrected in it — see UNDO_TURNOVER). Only
  // reachable within the point the turnover was recorded in, which is what the
  // refusal says when it isn't.
  const tryUndoTurnover = () => {
    const check = canUndoTurnover(state);
    if (!check.ok) {
      flashHint(t(`assist_blocked_${check.reason}` as never));
      return;
    }
    dispatch({ type: 'UNDO_TURNOVER' });
  };

  // The Call menu closes on every choice. Both a call and a travel then ask "who
  // called it?" — but only when the game is tracking activity; otherwise they log
  // straight away with no team, same as StoppageDialog does for a technical stoppage.
  const chooseCall = (choice: CallChoice) => {
    setShowCall(false);
    if (choice.type === 'call') {
      if (state.config.trackPlayers) setCallKind(choice.kind);
      else dispatch({ type: 'CALL_MADE', kind: choice.kind });
    } else {
      if (state.config.trackPlayers) setShowTravel(true);
      else dispatch({ type: 'TRAVEL' });
    }
  };

  // Between points, nothing has happened yet for a call to be about — requiresPull
  // catches that here, the same way canTurnover already does for tryTurnover,
  // rather than the button going quietly dead: it stays tappable and explains
  // itself, same as every other reason on this row.
  const openCall = () => {
    const check = canRecordEvent(state, { requiresPull: true });
    if (!check.ok) {
      flashHint(t(`assist_blocked_${check.reason}` as never));
      return;
    }
    setShowCall(true);
  };

  // One of the record flows is already on screen — starting a second one on top of
  // it would answer a question nobody asked yet.
  const dialogBusy =
    showStoppage ||
    showNote ||
    showTravel ||
    showCall ||
    callKind !== null ||
    turnoverTeam !== null;

  // Shared by the action-row buttons that record something about the play: a call
  // or a stoppage awaiting resolution, an SOTG stoppage in progress (its own
  // dedicated "Resume game" button is the one way out), the game having finished.
  // Log and Roster are exempt: they only read.
  const recordBusy =
    state.pendingCall !== null ||
    state.pendingStoppage !== null ||
    paused ||
    state.status === 'finished' ||
    dialogBusy;

  // The raised hand is deliberately NOT part of recordBusy: a stoppage interrupts
  // whatever is running, an open call included, so the only thing that greys it out
  // is another dialog already being up. Every other refusal is left to tryStoppage,
  // which explains itself instead.
  const stoppageBusy = dialogBusy;

  // Nothing that advances play may run past an open stoppage: the pull, timeout and
  // half-time clocks are frozen under one (see playHalted), and the reducer refuses
  // all three, so the buttons say so rather than doing nothing.
  const stoppageBlocksPlay = state.pendingStoppage !== null;

  return (
    <div className="h-dvh flex flex-col bg-pitch text-chalk overflow-y-auto">
      {/* Header */}
      <header className="grid grid-cols-3 items-center px-3 py-1.5 lscape:py-0.5 text-sm lscape:text-[11px] bg-panel border-b border-line shrink-0">
        <span className="flex items-center gap-2 justify-self-start min-w-0">
          {/* Leaving the game, moved up here out of the old full-width row at the
              bottom — that row cost the score panels a line of height on every
              screen for a button pressed once a game. The glyph says which of the
              two things it does: an arrow back while nothing has been played and
              there is nothing to lose, a cross once the game is real. It stays put
              once the game is finished, where it goes straight to the report — the
              game is already over, so there is nothing left to confirm. */}
          <button
            className="shrink-0 flex items-center justify-center w-7 h-7 lscape:w-6 lscape:h-6 rounded-lg border border-line text-chalk/70 active:scale-95"
            onClick={
              state.status === 'finished'
                ? () => leaveGameTo({ type: 'OPEN_REPORT' })
                : gameStarted
                  ? openEndGameConfirm
                  : () => leaveGameTo({ type: 'BACK_TO_CONFIG' })
            }
            aria-label={t(
              state.status === 'finished'
                ? 'openReport'
                : gameStarted
                  ? 'btnEndGame'
                  : 'btnBackToSetup',
            )}
            title={t(
              state.status === 'finished'
                ? 'openReport'
                : gameStarted
                  ? 'btnEndGame'
                  : 'btnBackToSetup',
            )}
          >
            {gameStarted ? (
              <CrossIcon size="w-4 h-4 lscape:w-3.5 lscape:h-3.5" />
            ) : (
              <ArrowBackIcon size="w-4 h-4 lscape:w-3.5 lscape:h-3.5" />
            )}
          </button>
          <span className="font-board text-signal truncate">
            {t('field', { n: state.config.fieldNumber })}
          </span>
        </span>
        <span className="font-clock justify-self-center">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="font-board justify-self-end flex flex-col items-end leading-tight">
          <span>{state.half === 1 ? t('half1') : t('half2')}</span>
          {/* Always the target actually in force: the configured score until a cap
              lowers it, and the capped one from then on. */}
          <span>{t('target', { n: target })}</span>
        </span>
      </header>

      {actionHint && (
        <p
          role="tooltip"
          className="text-center text-xs lscape:text-[10px] text-signal bg-panel px-3 py-1 border-b border-line shrink-0"
        >
          {actionHint}
        </p>
      )}

      {/* Score panels */}
      <div className="flex flex-1 min-h-0 relative">
        <ScorePanel team={left} side="left" />
        <ScorePanel team={right} side="right" />
        {/* Each team's timeout, in the top outer corner of that team's own panel.
            Siblings of the panels, not children — see TimeoutButton. */}
        {timeoutsOn && (
          <>
            <TimeoutButton team={left} side="left" onCall={tryTimeout} />
            <TimeoutButton team={right} side="right" onCall={tryTimeout} />
          </>
        )}
        {/* Hand signal for the current message, floating over the bottom-left corner. */}
        <SignalCard />
        {/* Once finished, none of these chips mean anything any more (no more pulls,
            no more universe point, targets already reached) — hidden along with the
            rest of the blocked UI, and back the moment an undo of the finishing goal
            un-finishes the game. */}
        {state.status !== 'finished' && (
          <div className="absolute left-1/2 top-2 -translate-x-1/2 flex flex-col items-center gap-1">
            {isUniversePoint(state) && (
              <div
                aria-live="polite"
                className="rounded-full px-3 py-1 text-xs sm:text-sm font-board bg-black/70 border border-signal text-signal animate-pulse"
              >
                {t('universePointBadge' as never)}
              </div>
            )}
            {/* Each target goes on screen at the moment it is first announced — one goal
                short of it, or when a cap fixes a new one — and stays as the standing
                reminder of what was just shouted. Highlighted while it is a capped value,
                since that is the number nobody can infer. The half chip also retires once
                the half score stops deciding anything. */}
            {state.halfAnnounced && halfTargetApplies(state) && (
              <div
                aria-live="polite"
                className={`rounded-full px-3 py-1 text-xs sm:text-sm font-board bg-black/70 border ${
                  state.halfCappedTarget !== null
                    ? 'border-signal text-signal'
                    : 'border-line text-chalk'
                }`}
              >
                {t('halfCapChip', { n: effectiveHalfTarget(state) })}
              </div>
            )}
            {state.gameAnnounced && (
              <div
                aria-live="polite"
                className={`rounded-full px-3 py-1 text-xs sm:text-sm font-board bg-black/70 border ${
                  state.cappedTarget !== null
                    ? 'border-signal text-signal'
                    : 'border-line text-chalk'
                }`}
              >
                {t('gameCapChip', { n: target })}
              </div>
            )}
            {isMixed && (state.ratio || state.nextRatio) && (
              <button
                type="button"
                aria-live="polite"
                onClick={() => dispatch({ type: 'SHOW_RATIO_SIGNAL' })}
                className={`rounded-full px-3 py-1 text-xs sm:text-sm font-board bg-black/70 border active:scale-95 ${
                  state.nextRatio
                    ? 'border-signal text-signal animate-pulse'
                    : 'border-line text-chalk'
                }`}
              >
                {ratioLabel(state, t as never)}
              </button>
            )}
            {/* Who has the disc, but only in a game where that has turned out to be
                worth following: it appears with the first turnover recorded and then
                stands for the rest of the game (possessionTracked), and only while a
                point is actually being played — between points the disc is dead and
                the pull chip below already names who throws it. */}
            {state.possessionTeam !== null && possessionTracked(state) && (
              <div
                aria-live="polite"
                className="rounded-full px-3 py-1 text-xs sm:text-sm font-board bg-black/70 border border-line text-chalk"
              >
                {t('possessionChip', {
                  team: state.config.teams[state.possessionTeam].name,
                })}
              </div>
            )}
            {/* Only meaningful up to the moment the pull is thrown — the same
                window the "Pull thrown" button occupies in the action row below.
                Leaving it up once the point is live risks reading as "this team
                still has to pull", when the disc may since have changed hands
                entirely (see the possession chip above, which takes over that
                job for the rest of the point). */}
            {state.status === 'awaitingPull' && (
              <div
                aria-live="polite"
                className="rounded-full px-3 py-1 text-xs sm:text-sm font-board bg-black/70 border border-line text-chalk"
              >
                {pullLabel(state, t as never)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeout / pull / halftime action. Height is reserved (min-h) rather than
          only appearing when active: the score panels above are flex-1, so an
          on/off row would resize them the instant this appears — most often
          right when a goal is scored, putting a new button exactly where the
          volunteer's finger already was tapping to score. A fixed-height slot
          keeps the score panel boundary stable so that never happens. */}
      <div className="min-h-16 lscape:min-h-10 px-3 lscape:px-2 py-2 lscape:py-1 bg-panel border-t border-line shrink-0 flex items-center">
        {(actionRowStatus === 'notStarted' || actionRowStatus === 'awaitingStart') && (
          <button className={playAdvanceButton} onClick={() => dispatch({ type: 'BEGIN_PLAY' })}>
            {t('startGame')}
          </button>
        )}
        {actionRowStatus === 'awaitingPull' && (
          <button
            className={playAdvanceButton}
            disabled={stoppageBlocksPlay}
            onClick={() => dispatch({ type: 'PULL_THROWN' })}
          >
            {t('pullThrown')}
          </button>
        )}
        {actionRowStatus === 'paused' && (
          <button className={playAdvanceButton} onClick={resumeFromPause}>
            {t('btnResumeGame')}
          </button>
        )}
        {actionRowStatus === 'timeout' && (
          <button
            className={`${breakEndButton} disabled:opacity-40`}
            disabled={stoppageBlocksPlay}
            onClick={() => dispatch({ type: 'TIMEOUT_END' })}
          >
            {t('btnEndTimeout')}
          </button>
        )}
        {actionRowStatus === 'halftime' && (
          <button
            className={`${breakEndButton} disabled:opacity-40`}
            disabled={stoppageBlocksPlay}
            onClick={() => dispatch({ type: 'HALFTIME_END' })}
          >
            {t('btnEndHalftime')}
          </button>
        )}
        {actionRowStatus === 'finished' && (
          <button
            className={playAdvanceButton}
            onClick={() => leaveGameTo({ type: 'OPEN_REPORT' })}
          >
            {t('openReport')}
          </button>
        )}
      </div>

      {/* Clocks + actions */}
      <div className="flex flex-col gap-2 lscape:gap-1 px-3 lscape:px-2 py-2 lscape:py-0.5 bg-panel border-t border-line shrink-0">
        {/* Answer to an open call or stoppage, above the clocks — nothing else matters
            until it's given. Mutually exclusive in practice: recordEventBusy blocks
            starting either kind while the other is still open. */}
        <CallResolutionRow />
        <StoppageResolutionRow />

        {/* Clocks and action buttons stack in portrait; landscape has the height to
            spare but not the width, so they share one row instead — clocks first,
            then buttons, each keeping its own internal grid. */}
        <div className="flex flex-col gap-2 lscape:flex-row lscape:items-stretch lscape:gap-1.5">
          {/* Both clocks side by side. */}
          <div className="grid grid-cols-2 gap-2 lscape:gap-1 lscape:flex-none lscape:basis-[38%]">
            <div className="rounded-lg bg-pitch border border-line p-2 lscape:p-0.5">
              <div className="text-[10px] lscape:text-[8px] uppercase tracking-widest text-chalk/50">
                {countdownSeconds !== null ? t('timeBeforeGame') : t('gameClock')}
              </div>
              <div className="flex items-center justify-between gap-1">
                <div
                  className={`font-clock text-3xl lscape:text-base ${paused ? 'text-chalk/40' : 'text-chalk'}`}
                >
                  {formatClock(countdownSeconds ?? displayGameSeconds)}
                </div>
                {gameStarted && state.status !== 'finished' && (
                  <button
                    type="button"
                    onClick={togglePause}
                    disabled={!canTogglePause}
                    aria-label={t(paused ? 'btnResumeGame' : 'btnPauseGame')}
                    title={t(paused ? 'btnResumeGame' : 'btnPauseGame')}
                    className="shrink-0 flex items-center justify-center w-7 h-7 lscape:w-5 lscape:h-5 rounded-full border border-line text-chalk active:scale-95 disabled:opacity-30"
                  >
                    {paused ? <PlayIcon /> : <PauseIcon />}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-pitch border border-line p-2 lscape:p-0.5">
              <div className="text-[10px] lscape:text-[8px] uppercase tracking-widest text-chalk/50">
                {stoppage
                  ? stoppage.label
                  : state.secondary?.kind === 'timeout'
                    ? t('timeoutTimer')
                    : state.secondary?.kind === 'halftime'
                      ? t('halftimeTimer')
                      : t('pullTimer')}
              </div>
              <div
                className={`font-clock text-3xl lscape:text-base ${
                  stoppage || (state.secondary?.kind === 'pull' && state.secondary.seconds >= 45)
                    ? 'text-signal'
                    : 'text-chalk'
                }`}
              >
                {stoppage
                  ? formatClock(stoppage.seconds)
                  : state.secondary
                    ? formatClock(state.secondary.seconds)
                    : '--:--'}
              </div>
            </div>
          </div>

          {/* Roster / Log / Stoppage / Call / Turn, ordered from the surfaces that only
            read (left) to the ones that record something (right), so the thumb's
            reach matches how consequential the button is. Timeouts left this row
            for the score panels; Roster and Turn are both hidden unless the game is
            tracking activity (see trackPlayers), leaving three. */}
          <div
            className={`grid ${state.config.trackPlayers ? 'grid-cols-5' : 'grid-cols-3'} gap-2 lscape:gap-1 lscape:flex-1`}
          >
            {state.config.trackPlayers && (
              <ActionButton
                icon={<PlayersIcon />}
                label={t('lblRoster')}
                name={t('btnPlayers')}
                onClick={() => setShowPlayers(true)}
              />
            )}
            <ActionButton
              icon={<LogIcon />}
              label={t('lblLog')}
              name={t('btnLog')}
              onClick={() => setShowLog(true)}
            />
            <ActionButton
              icon={<StoppageIcon />}
              name={t('btnStoppageSotg')}
              onClick={tryStoppage}
              disabled={stoppageBusy}
            />
            <ActionButton
              icon={<CallIcon />}
              label={t('lblCall')}
              name={t('callDialogTitle')}
              onClick={openCall}
              disabled={recordBusy}
            />
            {state.config.trackPlayers && (
              <ActionButton
                icon={<TurnIcon />}
                label={t('lblTurn')}
                name={t('btnTurnoverHold')}
                onClick={tryTurnover}
                onHold={tryUndoTurnover}
                disabled={recordBusy}
              />
            )}
          </div>
        </div>
      </div>

      <AssistanceBar />

      {showLog && (
        <GameLog
          onClose={() => setShowLog(false)}
          onAddEvent={() => {
            setShowLog(false);
            setShowNote(true);
          }}
        />
      )}
      {showPlayers && <PlayersDialog onClose={() => setShowPlayers(false)} />}
      {showCall && <CallDialog onClose={() => setShowCall(false)} onChoose={chooseCall} />}
      {callKind && <CallTeamDialog kind={callKind} onClose={() => setCallKind(null)} />}
      {showNote && <NoteDialog onClose={() => setShowNote(false)} />}
      {showTravel && <TravelTeamDialog onClose={() => setShowTravel(false)} />}
      {showStoppage && <StoppageDialog onClose={() => setShowStoppage(false)} />}
      {turnoverTeam && (
        <TurnoverDialog attacking={turnoverTeam} onClose={() => setTurnoverTeam(null)} />
      )}
      {pendingAssistPoint && (
        <AssistGoalDialog
          team={pendingAssistPoint.scoredBy}
          onCancel={resolveAssistDialog}
          onSave={resolveAssistDialog}
        />
      )}
      {showEndGameConfirm && (
        <ConfirmEndGameDialog
          onCancel={closeEndGameConfirm}
          onConfirm={() => {
            closeEndGameConfirm();
            dispatch({ type: 'END_GAME' });
          }}
        />
      )}
      {showPauseConfirm && (
        <ConfirmPauseGameDialog
          onCancel={() => setShowPauseConfirm(false)}
          onConfirm={() => {
            setShowPauseConfirm(false);
            dispatch({ type: 'SOTG_TOGGLE', silent: true });
          }}
        />
      )}
      {showLeaveConfirm && (
        <ConfirmLeaveGameDialog
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={() => {
            setShowLeaveConfirm(false);
            leaveGameTo({ type: 'BACK_TO_CONFIG' });
          }}
        />
      )}
    </div>
  );
}
