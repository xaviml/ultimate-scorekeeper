import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import {
  canRecordEvent,
  canScore,
  canTurnover,
  canUndo,
  effectiveHalfTarget,
  halfTargetApplies,
  isUniversePoint,
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
import { CallTeamDialog } from './CallTeamDialog';
import { ConfirmEndGameDialog } from './ConfirmEndGameDialog';
import { ConfirmLeaveGameDialog } from './ConfirmLeaveGameDialog';
import { ConfirmPauseGameDialog } from './ConfirmPauseGameDialog';
import { GameLog } from './GameLog';
import { NoteDialog } from './NoteDialog';
import { PlayersDialog } from './PlayersDialog';
import { RecordEventDialog, type RecordEventChoice } from './RecordEventDialog';
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

// Tailwind's scanner needs each class name to appear literally in source, so the
// action row's column count (2 to 5, depending on whether timeouts and player
// tracking are configured) is looked up rather than interpolated.
const ACTION_GRID_COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

const iconButton = `${utility} flex items-center justify-center`;

// Shared by Log and Record event: the latter is the same list glyph with a
// "+" badge overlapping its bottom-right corner, since recording an event
// adds an entry to that same log.
const LIST_GLYPH_PATH =
  'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z';

function RecordEventIcon() {
  return (
    <span className="relative inline-flex w-5 h-5 lscape:w-4 lscape:h-4">
      <svg
        viewBox="0 0 24 24"
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={LIST_GLYPH_PATH} />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="absolute -bottom-1 -right-1 w-3 h-3 lscape:w-2.5 lscape:h-2.5 rounded-full bg-panel"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </span>
  );
}

function LogIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 lscape:w-4 lscape:h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={LIST_GLYPH_PATH} />
    </svg>
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

function PlayersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 lscape:w-4 lscape:h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0z" />
    </svg>
  );
}

/**
 * Timeout caller, sitting in the action row under the clocks alongside Record event
 * and Log. Tinted with the team colour and showing timeouts remaining — number and
 * icon ordered so the icon always sits toward the middle of the row, the number
 * toward the outer edge.
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
      className={`${utility} flex items-center justify-center gap-1`}
      style={{ color: cfg.color }}
    >
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
 */
function CallResolutionRow() {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const pending = state.pendingCall;
  if (!pending) return null;

  return (
    <div className="space-y-1 lscape:space-y-0.5">
      <p className="text-[10px] lscape:text-[8px] uppercase tracking-widest text-signal">
        {t('callPending', {
          kind: t(`callKind_${pending.kind}` as never),
          team: state.config.teams[pending.team].name,
        })}
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
 * SOTG is measured on the wall clock (via the most recent 'sotgStart' log entry's
 * `atMs`) rather than the game clock: it's the one status that actually stops
 * gameSeconds, so a game-clock diff would be stuck at 0 for its whole duration.
 * Calls never stop the clock, so their own startedAtSeconds against the still-
 * running gameSeconds is the right measure. A stoppage instead carries its own
 * `elapsedSeconds`, ticked forward every TICK regardless of the game clock — a
 * stoppage left open long enough auto-stops the game clock (see TICK in the
 * reducer), and this counter is what keeps counting through that.
 */
function secondaryOverride(
  state: GameState,
  now: Date,
  t: (k: never, v?: Record<string, string | number>) => string,
): { label: string; seconds: number } | null {
  if (state.pendingCall) {
    return {
      label: t(`callKind_${state.pendingCall.kind}` as never),
      seconds: Math.max(0, state.gameSeconds - state.pendingCall.startedAtSeconds),
    };
  }
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
  const [showRecordEvent, setShowRecordEvent] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showTravel, setShowTravel] = useState(false);
  // The call kind chosen in the Record event dialog, waiting on "who called it?".
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
  // Mirrors the SOTG_TOGGLE guard in the reducer: pausing only makes sense once the
  // disc is live (or about to be pulled); resuming is always available while paused.
  const canTogglePause = paused || state.status === 'live' || state.status === 'awaitingPull';
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
      flashHint(
        check.reason === 'timeoutLastFive'
          ? t('timeoutBlockedLastFive')
          : check.reason === 'timeoutNoneLeft'
            ? t('timeoutBlockedNone')
            : check.reason === 'callPending'
              ? t('timeoutBlockedCallPending')
              : t('timeoutBlockedNotNow'),
      );
      return;
    }
    dispatch({ type: 'TIMEOUT_START', team });
  };

  // Turnover only prompts for players when the game is tracking them; otherwise
  // it is logged straight away, with no dialog in the way. A stoppage always
  // opens its dialog — it needs to ask injury vs. technical either way, and
  // StoppageDialog itself skips the player picker when rosters aren't in use.
  const tryStoppage = () => setShowStoppage(true);

  const tryTurnover = () => {
    const check = canTurnover(state);
    if (!check.ok) {
      flashHint(t(`assist_blocked_${check.reason}` as never));
      return;
    }
    if (state.config.trackPlayers) setTurnoverTeam(state.possessionTeam);
    else dispatch({ type: 'TURNOVER' });
  };

  // The Record event menu closes on every choice; what happens next depends on the
  // choice. Turnover and stoppage keep their own guards and player prompts, so they
  // behave exactly as they did when they were dashboard buttons.
  const recordEvent = (choice: RecordEventChoice) => {
    setShowRecordEvent(false);
    if (choice.type === 'call') {
      setCallKind(choice.kind);
      return;
    }
    switch (choice.type) {
      case 'turnover':
        return tryTurnover();
      case 'stoppage':
        return tryStoppage();
      case 'note':
        return setShowNote(true);
      case 'travel':
        return setShowTravel(true);
      case 'sotg':
        return dispatch({ type: 'SOTG_TOGGLE' });
    }
  };

  const openRecordEvent = () => {
    const check = canRecordEvent(state);
    if (!check.ok) {
      flashHint(t(`assist_blocked_${check.reason}` as never));
      return;
    }
    setShowRecordEvent(true);
  };

  // Whether the Record event launcher itself should be disabled: a call or a
  // stoppage awaiting resolution, an SOTG stoppage in progress (its own dedicated
  // "Resume game" button is the one way out), the game having finished, or any
  // other record-event flow already open — none of these should be interrupted by
  // starting a second one on top.
  const recordEventBusy =
    state.pendingCall !== null ||
    state.pendingStoppage !== null ||
    paused ||
    state.status === 'finished' ||
    showStoppage ||
    showNote ||
    showTravel ||
    callKind !== null ||
    turnoverTeam !== null;

  return (
    <div className="h-dvh flex flex-col bg-pitch text-chalk overflow-y-auto">
      {/* Header */}
      <header className="grid grid-cols-3 items-center px-3 py-1.5 lscape:py-0.5 text-sm lscape:text-[11px] bg-panel border-b border-line shrink-0">
        <span className="font-board text-signal justify-self-start">
          {t('field', { n: state.config.fieldNumber })}
        </span>
        <span className="font-clock justify-self-center">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="font-board justify-self-end">
          {state.half === 1 ? t('half1') : t('half2')}
          {' · '}
          {/* Always the target actually in force: the configured score until a cap
              lowers it, and the capped one from then on. */}
          {t('target', { n: target })}
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
            <div
              aria-live="polite"
              className="rounded-full px-3 py-1 text-xs sm:text-sm font-board bg-black/70 border border-line text-chalk"
            >
              {pullLabel(state, t as never)}
            </div>
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
          <button
            className="w-full rounded-lg bg-signal text-pitch px-3 py-3 lscape:py-1.5 font-board font-bold text-base lscape:text-xs animate-pulse"
            onClick={() => dispatch({ type: 'BEGIN_PLAY' })}
          >
            {t('startGame')}
          </button>
        )}
        {actionRowStatus === 'awaitingPull' && (
          <button
            className="w-full rounded-lg bg-signal text-pitch px-3 py-3 lscape:py-1.5 font-board font-bold text-base lscape:text-xs animate-pulse"
            onClick={() => dispatch({ type: 'PULL_THROWN' })}
          >
            {t('pullThrown')}
          </button>
        )}
        {actionRowStatus === 'paused' && (
          <button
            className="w-full rounded-lg bg-signal text-pitch px-3 py-3 lscape:py-1.5 font-board font-bold text-base lscape:text-xs animate-pulse"
            onClick={resumeFromPause}
          >
            {t('btnResumeGame')}
          </button>
        )}
        {actionRowStatus === 'timeout' && (
          <button
            className="w-full rounded-lg bg-panel border border-line px-3 py-3 lscape:py-1.5 font-board text-base lscape:text-xs"
            onClick={() => dispatch({ type: 'TIMEOUT_END' })}
          >
            {t('btnEndTimeout')}
          </button>
        )}
        {actionRowStatus === 'halftime' && (
          <button
            className="w-full rounded-lg bg-panel border border-line px-3 py-3 lscape:py-1.5 font-board text-base lscape:text-xs"
            onClick={() => dispatch({ type: 'HALFTIME_END' })}
          >
            {t('btnEndHalftime')}
          </button>
        )}
        {actionRowStatus === 'finished' && (
          <button
            className="w-full rounded-lg bg-signal text-pitch px-3 py-3 lscape:py-1.5 font-board font-bold text-base lscape:text-xs animate-pulse"
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

        {/* Both clocks side by side. */}
        <div className="grid grid-cols-2 gap-2 lscape:gap-1">
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

        {/* Timeout (left) / Record event / Log / Players / Timeout (right), in one row
            under both clocks. Turnover, stoppage and the SOTG toggle live inside Record
            event now, alongside travels, calls and free-text notes. Timeouts are
            hidden entirely when none are configured — nothing to call. Players is
            hidden unless the game is configured to track players. */}
        <div
          className={`grid ${ACTION_GRID_COLS[2 + (timeoutsOn ? 2 : 0) + (state.config.trackPlayers ? 1 : 0)]} gap-2 lscape:gap-1`}
        >
          {timeoutsOn && <TimeoutButton team={left} side="left" onCall={tryTimeout} />}
          <button
            className={iconButton}
            onClick={openRecordEvent}
            disabled={recordEventBusy}
            aria-label={t('btnRecordEvent')}
            title={t('btnRecordEvent')}
          >
            <RecordEventIcon />
          </button>
          <button
            className={iconButton}
            onClick={() => setShowLog(true)}
            aria-label={t('btnLog')}
            title={t('btnLog')}
          >
            <LogIcon />
          </button>
          {state.config.trackPlayers && (
            <button
              className={iconButton}
              onClick={() => setShowPlayers(true)}
              aria-label={t('btnPlayers')}
              title={t('btnPlayers')}
            >
              <PlayersIcon />
            </button>
          )}
          {timeoutsOn && <TimeoutButton team={right} side="right" onCall={tryTimeout} />}
        </div>
      </div>

      {/* Utility row — hidden once the game is finished: "Open report" above already
          does the same job as "End game" did, and there is nothing left for "Back to
          setup" to mean while a finished game is still sitting here awaiting either
          that tap or an undo of the goal that finished it. */}
      {state.status !== 'finished' && (
        <div className="px-3 lscape:px-2 pb-1 bg-panel shrink-0">
          <button
            className="w-full mt-1 text-[11px] lscape:text-[9px] uppercase tracking-widest text-chalk/40 py-1 lscape:py-0.5"
            onClick={
              gameStarted ? openEndGameConfirm : () => leaveGameTo({ type: 'BACK_TO_CONFIG' })
            }
          >
            {t(gameStarted ? 'btnEndGame' : 'btnBackToSetup')}
          </button>
        </div>
      )}

      <AssistanceBar />

      {showLog && <GameLog onClose={() => setShowLog(false)} />}
      {showPlayers && <PlayersDialog onClose={() => setShowPlayers(false)} />}
      {showRecordEvent && (
        <RecordEventDialog onClose={() => setShowRecordEvent(false)} onChoose={recordEvent} />
      )}
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
