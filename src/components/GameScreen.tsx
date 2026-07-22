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
import { useLongPress } from '../hooks/useLongPress';
import type { CallKind, CallResolution, GameState, TeamId } from '../state/types';
import { AssistanceBar } from './AssistanceBar';
import { AssistGoalDialog } from './AssistGoalDialog';
import { CallTeamDialog } from './CallTeamDialog';
import { ConfirmEndGameDialog } from './ConfirmEndGameDialog';
import { GameLog } from './GameLog';
import { InjuryDialog } from './InjuryDialog';
import { NoteDialog } from './NoteDialog';
import { PlayersDialog } from './PlayersDialog';
import { RecordEventDialog, type RecordEventChoice } from './RecordEventDialog';
import { SignalCard } from './SignalCard';
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

export default function GameScreen() {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const now = useNow();
  const [showLog, setShowLog] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showInjury, setShowInjury] = useState(false);
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

  // The action row (Pull thrown / Resume game / End timeout / End halftime) only
  // exists in the DOM while one of these statuses is active, which shrinks the
  // score panels above to make room for it the instant it appears. A goal is the
  // most common way into it, so the button materialises exactly where the
  // volunteer's finger already was tapping to score — see the min-height reserved
  // on its container below, which keeps the score panels a constant size instead.
  const actionRowStatus =
    state.status === 'awaitingPull' ||
    state.status === 'paused' ||
    state.status === 'timeout' ||
    state.status === 'halftime'
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
  const timeoutsOn = timeoutsConfigured(state.config.timeouts);

  // Scheduled kickoff not yet reached: the game clock counts down to it instead of
  // up from it (see the header dot and the clock label below), and TICK in the
  // reducer promotes the game to 'awaitingPull' on its own once it arrives.
  const countdownSeconds =
    state.status === 'awaitingStart' && state.startingAtMs !== null
      ? Math.max(0, Math.round((state.startingAtMs - now.getTime()) / 1000))
      : null;

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
            : t('timeoutBlockedNotNow'),
      );
      return;
    }
    dispatch({ type: 'TIMEOUT_START', team });
  };

  // Injury and turnover only prompt for players when the game is tracking them;
  // otherwise the event is logged straight away, with no dialog in the way.
  const tryInjury = () => {
    if (state.config.trackPlayers) setShowInjury(true);
    else dispatch({ type: 'INJURY' });
  };

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
  // choice. Turnover and injury keep their own guards and player prompts, so they
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
      case 'injury':
        return tryInjury();
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

  // Whether the Record event launcher itself should be disabled: a call awaiting
  // resolution, an SOTG stoppage in progress (its own dedicated "Resume game"
  // button is the one way out), or any other record-event flow already open —
  // none of these should be interrupted by starting a second one on top.
  const recordEventBusy =
    state.pendingCall !== null ||
    paused ||
    showInjury ||
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
        <span className="font-clock justify-self-center flex items-center gap-1.5">
          {state.status === 'awaitingStart' && (
            <span
              aria-label={t('awaitingStartDotLabel')}
              title={t('awaitingStartDotLabel')}
              className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"
            />
          )}
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
                state.cappedTarget !== null ? 'border-signal text-signal' : 'border-line text-chalk'
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
      </div>

      {/* Timeout / pull / halftime action. Height is reserved (min-h) rather than
          only appearing when active: the score panels above are flex-1, so an
          on/off row would resize them the instant this appears — most often
          right when a goal is scored, putting a new button exactly where the
          volunteer's finger already was tapping to score. A fixed-height slot
          keeps the score panel boundary stable so that never happens. */}
      <div className="min-h-16 lscape:min-h-10 px-3 lscape:px-2 py-2 lscape:py-1 bg-panel border-t border-line shrink-0 flex items-center">
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
            onClick={() => dispatch({ type: 'SOTG_TOGGLE' })}
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
      </div>

      {/* Clocks + actions */}
      <div className="flex flex-col gap-2 lscape:gap-1 px-3 lscape:px-2 py-2 lscape:py-0.5 bg-panel border-t border-line shrink-0">
        {/* Answer to an open call, above the clocks — nothing else matters until it's given. */}
        <CallResolutionRow />

        {/* Both clocks side by side. */}
        <div className="grid grid-cols-2 gap-2 lscape:gap-1">
          <div className="rounded-lg bg-pitch border border-line p-2 lscape:p-0.5">
            <div className="text-[10px] lscape:text-[8px] uppercase tracking-widest text-chalk/50">
              {countdownSeconds !== null ? t('timeBeforeGame') : t('gameClock')}
            </div>
            <div
              className={`font-clock text-3xl lscape:text-base ${paused ? 'text-chalk/40' : 'text-chalk'}`}
            >
              {formatClock(countdownSeconds ?? state.gameSeconds)}
            </div>
          </div>

          <div className="rounded-lg bg-pitch border border-line p-2 lscape:p-0.5">
            <div className="text-[10px] lscape:text-[8px] uppercase tracking-widest text-chalk/50">
              {state.secondary?.kind === 'timeout'
                ? t('timeoutTimer')
                : state.secondary?.kind === 'halftime'
                  ? t('halftimeTimer')
                  : t('pullTimer')}
            </div>
            <div
              className={`font-clock text-3xl lscape:text-base ${
                state.secondary?.kind === 'pull' && state.secondary.seconds >= 45
                  ? 'text-signal'
                  : 'text-chalk'
              }`}
            >
              {state.secondary ? formatClock(state.secondary.seconds) : '--:--'}
            </div>
          </div>
        </div>

        {/* Timeout (left) / Record event / Log / Players / Timeout (right), in one row
            under both clocks. Turnover, injury and the SOTG toggle live inside Record
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

      {/* Utility row */}
      <div className="px-3 lscape:px-2 pb-1 bg-panel shrink-0">
        <button
          className="w-full mt-1 text-[11px] lscape:text-[9px] uppercase tracking-widest text-chalk/40 py-1 lscape:py-0.5"
          onClick={openEndGameConfirm}
        >
          {t('btnEndGame')}
        </button>
      </div>

      <AssistanceBar />

      {showLog && <GameLog onClose={() => setShowLog(false)} />}
      {showPlayers && <PlayersDialog onClose={() => setShowPlayers(false)} />}
      {showRecordEvent && (
        <RecordEventDialog onClose={() => setShowRecordEvent(false)} onChoose={recordEvent} />
      )}
      {callKind && <CallTeamDialog kind={callKind} onClose={() => setCallKind(null)} />}
      {showNote && <NoteDialog onClose={() => setShowNote(false)} />}
      {showTravel && <TravelTeamDialog onClose={() => setShowTravel(false)} />}
      {showInjury && <InjuryDialog onClose={() => setShowInjury(false)} />}
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
    </div>
  );
}
