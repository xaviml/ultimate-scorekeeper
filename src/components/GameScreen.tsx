import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import {
  canScore,
  canTurnover,
  canUndo,
  isUniversePoint,
  pullFromSide,
  timeoutAvailability,
  timeoutsConfigured,
} from '../state/gameReducer';
import { formatClock } from '../state/stats';
import { useLongPress } from '../hooks/useLongPress';
import type { GameState, TeamId } from '../state/types';
import { AssistanceBar } from './AssistanceBar';
import { AssistGoalDialog } from './AssistGoalDialog';
import { ConfirmEndGameDialog } from './ConfirmEndGameDialog';
import { GameLog } from './GameLog';
import { InjuryDialog } from './InjuryDialog';
import { PlayersDialog } from './PlayersDialog';
import { SignalCard } from './SignalCard';
import { TurnoverDialog } from './TurnoverDialog';

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
  return (
    <button
      {...press}
      aria-label={`${cfg.name}: ${state.scores[team]}`}
      className={`relative flex-1 flex flex-col items-center justify-center overflow-hidden select-none touch-none transition-opacity ${
        scoreCheck.ok ? '' : 'opacity-70'
      } ${side === 'left' ? 'rounded-r-none' : 'rounded-l-none'}`}
      style={{ backgroundColor: cfg.color }}
    >
      <span className="font-board font-semibold text-white/90 text-base sm:text-xl lscape:text-[9px] leading-tight drop-shadow px-2 truncate max-w-full">
        {cfg.name}
      </span>
      <span className="font-clock font-semibold text-white text-[clamp(4rem,20vw,9rem)] lscape:text-[clamp(1.5rem,16vh,4.5rem)] leading-none drop-shadow-lg">
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

/**
 * Timeout caller in the header: a stopwatch tinted with the team colour plus the
 * number remaining. Borderless and small on purpose — it sits beside the wall clock
 * and must not compete with the score panels for attention or thumb space.
 */
function TimeoutChip({ team, onCall }: { team: TeamId; onCall: (team: TeamId) => void }) {
  const state = useGame();
  const { t } = useT();
  const cfg = state.config.teams[team];
  const left = timeoutsLeft(state, team);
  const label = `${cfg.name} — ${t('timeoutsLeft', { n: left })}`;

  return (
    <button
      onClick={() => onCall(team)}
      disabled={state.status === 'finished'}
      aria-label={label}
      title={label}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md active:scale-95 disabled:opacity-40"
      style={{ color: cfg.color }}
    >
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
      <span className="font-clock text-sm lscape:text-[10px] leading-none">{left}</span>
    </button>
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
  // Attacking team captured when the turnover dialog opens, since recording the
  // turnover is what flips possession.
  const [turnoverTeam, setTurnoverTeam] = useState<TeamId | null>(null);
  const [actionHint, setActionHint] = useState<string | null>(null);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(
    () => sessionStorage.getItem(END_GAME_CONFIRM_KEY) === '1',
  );

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

  const utility =
    'rounded-lg bg-panel border border-line px-2 py-2 lscape:px-1 lscape:py-1 text-xs sm:text-sm lscape:text-[9px] font-board uppercase tracking-wide active:scale-95 disabled:opacity-40';

  return (
    <div className="h-dvh flex flex-col bg-pitch text-chalk overflow-y-auto">
      {/* Header */}
      <header className="grid grid-cols-3 items-center px-3 py-1.5 lscape:py-0.5 text-sm lscape:text-[11px] bg-panel border-b border-line shrink-0">
        <span className="font-board text-signal justify-self-start">
          {t('field', { n: state.config.fieldNumber })}
        </span>
        {/* Timeouts flank the clock, each on the same side as that team's score panel.
            Hidden entirely when no timeouts are configured — nothing to call. */}
        <span className="flex items-center gap-1 justify-self-center">
          {timeoutsOn && <TimeoutChip team={left} onCall={tryTimeout} />}
          <span className="font-clock">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {timeoutsOn && <TimeoutChip team={right} onCall={tryTimeout} />}
        </span>
        <span className="font-board justify-self-end">
          {state.half === 1 ? t('half1') : t('half2')}
          {' · '}
          {state.cappedTarget !== null ? t('cappedTo', { n: target }) : t('target', { n: target })}
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
          {isMixed && (state.ratio || state.nextRatio) && (
            <div
              aria-live="polite"
              className={`rounded-full px-3 py-1 text-xs sm:text-sm font-board bg-black/70 border ${
                state.nextRatio
                  ? 'border-signal text-signal animate-pulse'
                  : 'border-line text-chalk'
              }`}
            >
              {ratioLabel(state, t as never)}
            </div>
          )}
          <div
            aria-live="polite"
            className="rounded-full px-3 py-1 text-xs sm:text-sm font-board bg-black/70 border border-line text-chalk"
          >
            {pullLabel(state, t as never)}
          </div>
        </div>
      </div>

      {/* Timeout / pull / halftime action */}
      {(state.status === 'awaitingPull' ||
        state.status === 'timeout' ||
        state.status === 'halftime' ||
        state.status === 'paused') && (
        <div className="px-3 lscape:px-2 py-2 lscape:py-1 bg-panel border-t border-line shrink-0">
          {state.status === 'awaitingPull' && (
            <button
              className="w-full rounded-lg bg-signal text-pitch px-3 py-3 lscape:py-1.5 font-board font-bold text-base lscape:text-xs animate-pulse"
              onClick={() => dispatch({ type: 'PULL_THROWN' })}
            >
              {t('pullThrown')}
            </button>
          )}
          {state.status === 'paused' && (
            <button
              className="w-full rounded-lg bg-signal text-pitch px-3 py-3 lscape:py-1.5 font-board font-bold text-base lscape:text-xs animate-pulse"
              onClick={() => dispatch({ type: 'SOTG_TOGGLE' })}
            >
              {t('btnResumeGame')}
            </button>
          )}
          {state.status === 'timeout' && (
            <button
              className="w-full rounded-lg bg-panel border border-line px-3 py-3 lscape:py-1.5 font-board text-base lscape:text-xs"
              onClick={() => dispatch({ type: 'TIMEOUT_END' })}
            >
              {t('btnEndTimeout')}
            </button>
          )}
          {state.status === 'halftime' && (
            <button
              className="w-full rounded-lg bg-panel border border-line px-3 py-3 lscape:py-1.5 font-board text-base lscape:text-xs"
              onClick={() => dispatch({ type: 'HALFTIME_END' })}
            >
              {t('btnEndHalftime')}
            </button>
          )}
        </div>
      )}

      {/* Clocks + actions */}
      <div className="flex flex-col gap-2 lscape:gap-1 px-3 lscape:px-2 py-2 lscape:py-0.5 bg-panel border-t border-line shrink-0">
        {/* Both clocks side by side. */}
        <div className="grid grid-cols-2 gap-2 lscape:gap-1">
          <div className="rounded-lg bg-pitch border border-line p-2 lscape:p-0.5">
            <div className="text-[10px] lscape:text-[8px] uppercase tracking-widest text-chalk/50">
              {t('gameClock')}
            </div>
            <div
              className={`font-clock text-3xl lscape:text-base ${paused ? 'text-chalk/40' : 'text-chalk'}`}
            >
              {formatClock(state.gameSeconds)}
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

        {/* Turnover / injury / sotg / log, in one row under both clocks. */}
        <div className="grid grid-cols-4 gap-2 lscape:gap-1">
          <button className={utility} onClick={tryTurnover}>
            {t('btnTurnover')}
          </button>
          <button className={utility} onClick={tryInjury}>
            {t('btnInjury')}
          </button>
          <button className={utility} onClick={() => dispatch({ type: 'SOTG_TOGGLE' })}>
            {t('btnSotg')}
          </button>
          <button className={utility} onClick={() => setShowLog(true)}>
            {t('btnLog')}
          </button>
        </div>
      </div>

      {/* Utility row */}
      <div className="px-3 lscape:px-2 pb-1 bg-panel shrink-0">
        {state.config.trackPlayers && (
          <button className={`${utility} w-full`} onClick={() => setShowPlayers(true)}>
            {t('btnPlayers')}
          </button>
        )}
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
