import type {
  Action,
  GameConfig,
  GameState,
  Gender,
  GoalSnapshot,
  LogEdit,
  LogEntry,
  LogType,
  StoppagePlayer,
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
  // Off by default: hydration breaks only exist when the officials declare the
  // hot-weather protocol. The numbers are the ones they most often declare (WFDF
  // Appendix B4.3 in practice: 3 minutes, at 4 and at 12).
  waterBreaks: { enabled: false, atScores: [4, 12], durationSeconds: 180 },
  startingTime: { enabled: false, time: '' },
  statsMode: 'none',
  trackedTeam: null,
  players: { A: [], B: [] },
};

/** Whether this game logs anything beyond the bare score — any mode but `none`. */
export function statsTrackingEnabled(config: GameConfig): boolean {
  return config.statsMode !== 'none';
}

/**
 * Whether `team`'s specific players get attributed in this game — the goal/assist
 * picker, a turnover's role (drop or D), an injury's named-player picker. True for
 * both teams in `player` mode, true for only `trackedTeam` in `team` mode (the
 * other team stays at `game`-mode, team-only detail), false otherwise.
 */
export function playerTrackingFor(config: GameConfig, team: TeamId): boolean {
  return (
    config.statsMode === 'player' || (config.statsMode === 'team' && config.trackedTeam === team)
  );
}

const other = (t: TeamId): TeamId => (t === 'A' ? 'B' : 'A');

/** How long an injury/technical stoppage may sit unresolved before the game clock auto-stops (see TICK), same threshold whether the stoppage started mid-point or between points. */
const PROLONGED_STOPPAGE_SECONDS = 2 * 60;

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
    | 'turnoverId'
    | 'defenseId'
    | 'callKind'
    | 'resolution'
    | 'resolutionSeconds'
    | 'stoppageKind'
    | 'stoppagePlayers'
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
 * Who an injury stoppage is attributed to: the players named, plus the generic
 * "this team, nobody in particular" attribution the team-only pickers produce
 * (see PendingStoppage.team).
 *
 * A team badge only makes sense when every injured party — named player or
 * generic team — is on the same side; more than one side involved (or nobody
 * named at all) leaves it off, and the label carries the full attribution
 * instead. Shared by STOPPAGE and EDIT_LOG_ENTRY so a corrected injury reads
 * exactly like one recorded right the first time.
 */
function injuryAttribution(
  state: GameState,
  team: TeamId | undefined,
  players: StoppagePlayer[] | undefined,
): { team?: TeamId; label?: string } {
  const named = players ?? [];
  const teams = [...new Set([...named.map((p) => p.team), ...(team ? [team] : [])])];
  const namedLabels = named
    .map((p) => {
      const label = playerLabel(findPlayer(state.config.players[p.team], p.playerId));
      return teams.length > 1 ? `${state.config.teams[p.team].name}: ${label}` : label;
    })
    .filter(Boolean);
  const label = team
    ? [...namedLabels, state.config.teams[team].name].join(', ')
    : namedLabels.join(', ');
  return { team: teams.length === 1 ? teams[0] : undefined, label: label || undefined };
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
    statusBeforeTimeout: null,
    pauseSilent: false,
    pauseTeam: null,
    pauseElapsedSeconds: 0,
    half: 1,
    scores: { A: 0, B: 0 },
    // Rule B leaves the ratio to the end zone the teams are playing into — the
    // scorekeeper never tracks or announces it, same as open/women divisions.
    ratio: config.division === 'mixed' && config.mixedRule === 'A' ? config.startingRatio : null,
    nextRatio: null,
    pullingTeam: other(config.startingOffense),
    offenseTeam: config.startingOffense,
    possessionTeam: null,
    pointTurnovers: 0,
    turnoversCommitted: { A: 0, B: 0 },
    gameSeconds: 0,
    startingAtMs: null,
    pointStartSeconds: null,
    secondary: null,
    startWarned: false,
    timeoutsUsed: { A: { half1: 0, half2: 0 }, B: { half1: 0, half2: 0 } },
    timeoutTeam: null,
    cappedTarget: null,
    halfCappedTarget: null,
    timeCapReached: false,
    halfTimeCapReached: false,
    halftimePlayed: false,
    halfAnnounced: false,
    gameAnnounced: false,
    waterBreaksTaken: [],
    pendingCall: null,
    pendingStoppage: null,
    points: [],
    log: [],
    history: [],
    nextLogId: 1,
    assist: 'welcome',
    pendingGoalAssist: null,
    ratioSignalId: 0,
  };
}

/**
 * Central validation: may this team's score change right now?
 *
 * Also blocks while a player call is unresolved (`pendingCall`): the disc is
 * dead until it's settled, so a goal or turnover can't be logged out from
 * under an open dispute — that would leave the call permanently stuck with
 * no way to resolve it against a point that has already moved on.
 */
export function canScore(state: GameState): { ok: boolean; reason?: string } {
  if (state.phase !== 'game' || state.status === 'notStarted' || state.status === 'awaitingStart')
    return { ok: false, reason: 'gameNotStarted' };
  if (state.status === 'finished') return { ok: false, reason: 'gameFinished' };
  if (state.status === 'paused') return { ok: false, reason: 'gamePaused' };
  if (state.status === 'timeout') return { ok: false, reason: 'timeoutActive' };
  if (state.status === 'halftime') return { ok: false, reason: 'halftimeActive' };
  if (state.status === 'waterBreak') return { ok: false, reason: 'waterBreakActive' };
  if (state.status === 'awaitingPull') return { ok: false, reason: 'pullNotThrown' };
  if (state.pendingCall !== null) return { ok: false, reason: 'callPending' };
  // A stoppage doesn't touch status (see canStoppage), so it has to be checked
  // explicitly here too — otherwise GOAL/TURNOVER stay live under an open injury
  // or technical call, same reason timeoutAvailability already guards against it.
  if (state.pendingStoppage !== null) return { ok: false, reason: 'stoppageInProgress' };
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
 * May the last turnover be taken back (long-press on Turn)? Same conditions as
 * recording one — it is the same button, and possession only means anything while
 * the disc is live — plus something to take back: only a turnover recorded in the
 * point being played can be undone, since undoing hands the disc to the other team
 * and on a point with no turnovers that would take it off the receiving team.
 */
export function canUndoTurnover(state: GameState): { ok: boolean; reason?: string } {
  const base = canTurnover(state);
  if (!base.ok) return base;
  if (state.pointTurnovers === 0) return { ok: false, reason: 'noTurnoverToUndo' };
  return { ok: true };
}

/**
 * Whether the possession chip belongs on the scoreboard. Any stats mode but `none`
 * shows it from the first pull onward — Game/Team/Player stats all put a Turn
 * button on screen, so there's no reason to wait for a first press of it before
 * telling the volunteer who has the disc. In `none` there is no Turn button at
 * all, so a possession chip would just repeat the pull chip and never change.
 */
export function possessionTracked(state: GameState): boolean {
  return state.config.statsMode !== 'none';
}

/**
 * May a bookkeeping-only event (travel, a call, a free-text note) be recorded
 * right now? A stoppage is the exception that has its own, wider guard — see
 * canStoppage.
 *
 * More permissive than canScore in one respect only: an SOTG pause doesn't block
 * it — a foul called as the teams line up is still a foul. But a timeout, half-time
 * or a water break is a break in play, not a pause mid-dispute, so recording waits
 * for the game to resume, same as scoring does.
 *
 * `requiresPull` narrows this further to events that only make sense once the
 * disc is actually live: a travel, any of the seven calls (off-side included —
 * nothing has happened yet for the marker to call). A free-text note is the one
 * recorded event that never passes it: it isn't about the play, so there's
 * nothing about the pull it needs to wait for.
 *
 * `allowDuringBreaks` widens it the other way, and for the same reason: a note
 * is not about the play, so a timeout or half-time is no reason to refuse it —
 * a break is exactly when a volunteer has a free hand to jot something down.
 * Only the note passes this; everything else describes play and still waits for
 * play to resume.
 */
export function canRecordEvent(
  state: GameState,
  opts?: { requiresPull?: boolean; allowDuringBreaks?: boolean },
): { ok: boolean; reason?: string } {
  if (state.phase !== 'game' || state.status === 'awaitingStart' || state.status === 'notStarted')
    return { ok: false, reason: 'gameNotStarted' };
  if (state.status === 'finished') return { ok: false, reason: 'gameFinished' };
  if (!opts?.allowDuringBreaks) {
    if (state.status === 'timeout') return { ok: false, reason: 'timeoutActive' };
    if (state.status === 'halftime') return { ok: false, reason: 'halftimeActive' };
    if (state.status === 'waterBreak') return { ok: false, reason: 'waterBreakActive' };
  }
  if (opts?.requiresPull && state.status === 'awaitingPull')
    return { ok: false, reason: 'pullNotThrown' };
  return { ok: true };
}

/**
 * Is play halted by something that has to be cleared before anything else can
 * happen — an open injury/technical stoppage, or a stopped clock (SOTG, the manual
 * pause, or a stoppage that ran past two minutes)?
 *
 * Everything that measures a stretch of play waits on this: the pull clock, a
 * running timeout, the half-time break and an open call's discussion timer all
 * freeze while it is true and resume from exactly where they were (see TICK). A
 * pause freezes them for free by leaving the status they tick under; a stoppage
 * leaves the status alone, which is why it needs saying here.
 */
export function playHalted(state: GameState): boolean {
  return state.pendingStoppage !== null || state.status === 'paused';
}

/**
 * May a stoppage — injury, technical, or an SOTG/manual pause — be raised right now?
 *
 * Deliberately not canRecordEvent: a stoppage is the one thing that interrupts
 * whatever else is running, because on the field it already has. So it is available
 * for the whole game, between points and during a timeout, half-time or an open
 * call included; only a game that hasn't started or has finished refuses it.
 *
 * The one bar is a stoppage already in progress: the buttons that resolve one
 * answer exactly one question, so the volunteer clears that one first (the action
 * row says as much rather than going quietly dead).
 */
export function canStoppage(state: GameState): { ok: boolean; reason?: string } {
  if (state.phase !== 'game' || state.status === 'notStarted' || state.status === 'awaitingStart')
    return { ok: false, reason: 'gameNotStarted' };
  if (state.status === 'finished') return { ok: false, reason: 'gameFinished' };
  if (playHalted(state)) return { ok: false, reason: 'stoppageInProgress' };
  return { ok: true };
}

/**
 * May a hydration break be called by hand right now (the water-break entry in the
 * stoppage dialog)?
 *
 * WFDF puts these breaks in the transitions, never mid-point — so unlike a stoppage,
 * which interrupts whatever is running because on the field it already has, this is
 * only offered in the gap the teams are already standing in: after a goal and before
 * the pull is thrown. That is also the only status the break can hand back to when it
 * ends (see WATER_BREAK_END), which is what keeps it from having to remember a way
 * back the way a timeout does.
 *
 * It stays open before the very first pull of a half — the teams are lining up there
 * exactly as they are between points, and the break returns them to the same place.
 */
export function canWaterBreak(state: GameState): { ok: boolean; reason?: string } {
  if (state.phase !== 'game' || state.status === 'notStarted' || state.status === 'awaitingStart')
    return { ok: false, reason: 'gameNotStarted' };
  if (state.status === 'finished') return { ok: false, reason: 'gameFinished' };
  // A stoppage (or a stopped clock) has priority over everything else: a break
  // started under one would be frozen by it anyway (see playHalted).
  if (playHalted(state)) return { ok: false, reason: 'stoppageInProgress' };
  if (state.status !== 'awaitingPull') return { ok: false, reason: 'waterBreakNotNow' };
  return { ok: true };
}

/**
 * The rows one recorded event writes, in the order it writes them. An attribution
 * edit applies to the whole group, so the log can never say a foul was Red's on
 * one line and Blue's on the next; the first type in each group opens an episode,
 * and only one episode of a kind can ever be open at a time (see PendingCall /
 * PendingStoppage), which is what makes finding a row's partners exact.
 *
 * The silent manual pause (`pauseStart`/`pauseEnd`) is absent on purpose: it is
 * never attributed to a team, so it has nothing for an edit to keep in sync.
 */
const EPISODE_GROUPS: LogType[][] = [
  ['call', 'callResolved'],
  ['stoppage', 'stoppageClockStopped', 'stoppageResolved'],
  ['sotgStart', 'sotgEnd'],
];

/** The rows that close an episode — their absence is what makes it still open. */
const EPISODE_CLOSERS: LogType[] = ['callResolved', 'stoppageResolved', 'sotgEnd'];

/**
 * Every index belonging to the same episode as `index`: the opening row, that row
 * itself and whatever else the same event wrote. Just `[index]` for the types that
 * write a single row (a goal, a turnover, a travel, a note).
 */
export function episodeIndices(log: LogEntry[], index: number): number[] {
  const group = EPISODE_GROUPS.find((g) => g.includes(log[index].type));
  if (!group) return [index];
  const [opener] = group;
  let start = index;
  while (start > 0 && log[start].type !== opener) start--;
  const indices: number[] = [];
  for (let i = start; i < log.length; i++) {
    if (i > start && log[i].type === opener) break; // the next episode of the same kind
    if (group.includes(log[i].type)) indices.push(i);
  }
  return indices;
}

/**
 * Which question the log dialog's pencil asks for an entry, or null when there is
 * nothing to fix — in which case the row shows no pencil at all.
 *
 * It mirrors this game's stats mode rather than widening it: an edit re-asks the
 * question the app asked when the event was recorded, so a game that never asked
 * which team (statsMode 'none') has nothing to edit on a call, and a team whose
 * players are not tracked has nothing to edit on its goals. What is deliberately
 * NOT here: which team scored, whether a goal happened at all, the kind of call or
 * stoppage, and a timeout's team — the first two are what undo is for, and the
 * rest would rewrite what the event *was* rather than who it involved.
 */
export function logEditKind(state: GameState, entry: LogEntry): LogEdit['kind'] | null {
  const { config } = state;
  switch (entry.type) {
    case 'goal':
      return entry.team && playerTrackingFor(config, entry.team) ? 'goalPlayers' : null;
    case 'turnover':
      // The team is possession-derived, so only the players are editable — and only
      // when at least one of the two sides involved has a roster to pick from.
      if (!entry.team) return null;
      return playerTrackingFor(config, entry.team) || playerTrackingFor(config, other(entry.team))
        ? 'turnoverPlayers'
        : null;
    case 'stoppage':
    case 'stoppageClockStopped':
    case 'stoppageResolved':
      if (!statsTrackingEnabled(config)) return null;
      return entry.stoppageKind === 'injury' ? 'injury' : 'team';
    case 'callResolved':
      return statsTrackingEnabled(config) ? 'callResolution' : null;
    case 'call':
    case 'travel':
    case 'sotgStart':
    case 'sotgEnd':
      return statsTrackingEnabled(config) ? 'team' : null;
    case 'note':
      return 'note';
    default:
      return null;
  }
}

/**
 * Whether the editor offers a way back to no team at all. Only a technical
 * stoppage's team was ever optional (StoppageDialog's "No team" skip); a call, a
 * travel and an SOTG stoppage all had to name one to be recorded, so clearing
 * theirs would put the log in a state the app cannot produce.
 */
export function logEditAllowsNoTeam(entry: LogEntry): boolean {
  return entry.stoppageKind === 'technical';
}

/**
 * May this entry be deleted (the log dialog's bin)? Only the newest one, and only
 * the handful of types whose effect on the game can be rewound completely:
 *
 * - a turnover — exactly what a long-press on Turn already undoes (see
 *   UNDO_TURNOVER), which is the code the delete reuses;
 * - a call, resolved or not — bookkeeping either way, and the two rows go together;
 * - a travel or a note — bookkeeping with no state behind it at all.
 *
 * Everything else keeps its row. A goal is undone with a long-press on the score,
 * which is a rule with a snapshot behind it; a stoppage, a timeout or a break moves
 * the clock and the status, and rewinding those from the log is where the corner
 * cases live. Restricting deletion to the newest entry is what keeps this list
 * short: nothing has happened since, so there is nothing to reconcile.
 */
export function canDeleteLogEntry(state: GameState, entry: LogEntry): boolean {
  if (state.log[state.log.length - 1]?.id !== entry.id) return false;
  switch (entry.type) {
    case 'turnover':
      return canUndoTurnover(state).ok;
    case 'call':
    case 'callResolved':
    case 'travel':
    case 'note':
      return true;
    default:
      return false;
  }
}

/**
 * The point a goal log entry belongs to, or null. A goal appends one PointRecord
 * and one log row, and only the most recently scored goal can be undone (canUndo)
 * — but an undo that had something logged after it leaves the goal row in place
 * and appends a correction instead (see UNDO_GOAL), so the n-th goal row is not
 * simply the n-th point. Replaying the log the way UNDO_GOAL did it is: each
 * 'undo' drops the goal row most recently added to the list.
 */
function pointIndexForGoal(log: LogEntry[], id: number): number | null {
  const live: number[] = [];
  for (const e of log) {
    if (e.type === 'goal') live.push(e.id);
    else if (e.type === 'undo') live.pop();
  }
  const index = live.indexOf(id);
  return index === -1 ? null : index;
}

/**
 * The configured water-break scores that this game has now reached and not yet used
 * — read against the LEADING score, since the protocol is announced as "a break when
 * the first team reaches N". Empty whenever automatic breaks are switched off.
 *
 * Called from GOAL (does this goal trigger one?) and from WATER_BREAK_START (a break
 * called by hand consumes whatever was already due, so the automatic one doesn't fire
 * again on the next goal).
 */
function dueWaterBreaks(state: GameState): number[] {
  const { enabled, atScores } = state.config.waterBreaks;
  if (!enabled) return [];
  const leader = Math.max(state.scores.A, state.scores.B);
  return atScores.filter((n) => n > 0 && leader >= n && !state.waterBreaksTaken.includes(n));
}

export function canUndo(state: GameState, team: TeamId): { ok: boolean; reason?: string } {
  // Deliberately does not reuse canScore: a goal leaves the game in 'awaitingPull'
  // until the next pull is thrown, in 'halftime' if it reached the half score, in
  // 'waterBreak' if it reached a hydration-break score, or in 'finished' if it
  // reached the game's end — every one of those shouldn't block
  // undoing the goal that just put it there (each is only ever entered straight out
  // of a goal, so it's always that same goal). Every other non-live status still
  // blocks undo.
  if (state.phase !== 'game' || state.status === 'notStarted' || state.status === 'awaitingStart')
    return { ok: false, reason: 'gameNotStarted' };
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

/**
 * The team that pulls to open the second half — the team that received the very
 * first pull of the game (WFDF: the opening receiver pulls at half). Fixed by
 * config alone, so it's the same fact whether asked the instant half-time starts,
 * mid-break, or right as HALFTIME_END applies it.
 */
export function secondHalfPuller(state: GameState): TeamId {
  return state.config.startingOffense;
}

/**
 * Whether the teams must physically swap ends to reach the mandated second-half
 * arrangement (see leftEndzoneTeam), from wherever they are now. Ends flip after
 * every point, so an odd number of first-half points already leaves them mirrored
 * from the opening — only an even count needs an actual swap. The score is fixed
 * for the whole break (half-time never starts mid-point), so this holds steady
 * from the moment reachHalf fires in GOAL through to HALFTIME_END.
 */
export function secondHalfSwapNeeded(state: GameState): boolean {
  return (state.scores.A + state.scores.B) % 2 === 0;
}

/** Which physical end the second-half puller throws from, for display during the break. */
export function secondHalfPullSide(state: GameState): 'left' | 'right' {
  const currentLeft = leftEndzoneTeam(state);
  const half2Left = secondHalfSwapNeeded(state) ? other(currentLeft) : currentLeft;
  return secondHalfPuller(state) === half2Left ? 'left' : 'right';
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
  if (state.pendingCall !== null) return { ok: false, reason: 'callPending' };
  // A stoppage has priority over everything else in play (see canStoppage), and a
  // timeout started under one would immediately be frozen by it anyway.
  if (state.pendingStoppage !== null) return { ok: false, reason: 'stoppageInProgress' };
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
    pointTurnovers: state.pointTurnovers,
    status: state.status,
    half: state.half,
    pointStartSeconds: state.pointStartSeconds,
    cappedTarget: state.cappedTarget,
    halfCappedTarget: state.halfCappedTarget,
    halftimePlayed: state.halftimePlayed,
    waterBreaksTaken: [...state.waterBreaksTaken],
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
 * The targets the volunteer may still put the game — or the half — on, which is what
 * the cap chip offers when it is tapped. Empty means there is nothing to choose and
 * the chip stays a plain label.
 *
 * The horn is a clock event, but which point it landed in is a human observation, and
 * the app only knows what has been tapped in. A goal scored a breath before the horn
 * and entered a breath after it (or the reverse) moves the target by exactly one, and
 * no guard can catch that — the reducer's view of the timing is the volunteer's typing
 * speed. So while a capped target is in force it stays editable, over the values it
 * could legitimately have taken:
 *   - still unresolved: the point in progress either leaves the leading score where it
 *     is or lifts it by one, so the target is `leader + plus` or one more. Both are
 *     named on the chip ("Half at 5 or 6") rather than the volunteer being told to wait
 *     for a number the game may already have decided.
 *   - resolved: the same one-goal uncertainty, now sitting around the number on screen.
 *
 * Bounded below by `leader + 1` — a target at or under the current score is not a
 * target — and above by the configured score, since a cap only ever shortens a game.
 * The half is held one further below the game target, because a half at or past it
 * never arrives (see halfTargetApplies). When those bounds leave a single value the
 * number was never in doubt, and the caller renders it as the plain chip it always was.
 *
 * Option A (`none`) has no number to offer at all. Option C is offered only once it has
 * resolved to one: before that its two outcomes are "game to N" and "the game is
 * already over", and a picker of targets cannot say the second.
 */
export function capTargetOptions(state: GameState, which: 'game' | 'half'): number[] {
  if (state.phase !== 'game' || state.status === 'finished') return [];
  const half = which === 'half';
  if (half) {
    if (state.halftimePlayed || state.half !== 1) return [];
    // Option A ends the game on the point in progress, so no half is coming. The rest
    // of halfTargetApplies is deliberately not consulted: while a half cap is pending
    // it reads the configured half score, which is precisely the number about to be
    // lowered, so it can retire the half one goal before the cap resolves it into
    // reach. The ceiling below is the same test, applied to the numbers on offer.
    if (state.timeCapReached && state.config.endCap.kind === 'none') return [];
  }
  if (!(half ? state.halfTimeCapReached : state.timeCapReached)) return [];
  const rule = half ? state.config.halfCap : state.config.endCap;
  if (rule.kind === 'none') return [];
  const current = half ? state.halfCappedTarget : state.cappedTarget;
  if (rule.kind === 'conditional' && current === null) return [];
  const leader = Math.max(state.scores.A, state.scores.B);
  const ceiling = half
    ? Math.min(state.config.halfScore, effectiveTarget(state) - 1)
    : state.config.targetScore;
  const candidates =
    current === null
      ? [leader + rule.plus, leader + rule.plus + 1]
      : [current - 1, current, current + 1];
  return [...new Set(candidates)].filter((n) => n > leader && n <= ceiling).sort((a, b) => a - b);
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

/**
 * Stays in phase 'game', status 'finished': the score panels, record event, timeouts
 * and pause are all blocked from here (see the various can* guards), but the game
 * screen stays mounted with everything blocked so the goal that finished it can still
 * be undone (see canUndo) before the volunteer taps "Open report" (OPEN_REPORT), the
 * only way from here into phase 'report'. END_GAME (manually ending the game) is the
 * one caller that immediately overrides phase to 'report' anyway — see its case below.
 */
function finishGame(state: GameState): GameState {
  const s = log(state, 'gameEnd');
  return { ...s, status: 'finished', secondary: null, assist: 'gameOver' };
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

/**
 * Opens the pull: whether that happens via a manual "Start game" tap (BEGIN_PLAY,
 * from 'notStarted' or early from 'awaitingStart'), or automatically once a
 * scheduled kickoff arrives (TICK).
 */
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
      // clock actually reaches it (or BEGIN_PLAY promotes it early, on a manual tap).
      if (startingAtMs !== null && startingAtMs > Date.now()) {
        // A kickoff already under a minute away is too soon for the one-minute-to-start
        // whistle (scenario 1a) to be meaningful — seed startWarned so it never fires.
        const startWarned = startingAtMs - Date.now() <= 60_000;
        return {
          ...init,
          status: 'awaitingStart',
          startingAtMs,
          startWarned,
          assist: 'awaitingGameStart',
        };
      }
      // No scheduled kickoff, or one already in the past (the config screen should
      // prevent this, but the wall clock keeps moving while it's open): the game
      // never opens the pull on its own — it waits for the volunteer to tap
      // "Start game" (BEGIN_PLAY below).
      return { ...init, status: 'notStarted', assist: 'awaitingGameStart' };
    }

    case 'BEGIN_PLAY': {
      if (state.status !== 'notStarted' && state.status !== 'awaitingStart') return state;
      return beginPlay(state);
    }

    case 'PULL_THROWN': {
      if (state.status !== 'awaitingPull') return state;
      // The pull clock is frozen while a stoppage is open (see playHalted), and the
      // disc can't be pulled into an injury either — resolve it, then pull.
      if (state.pendingStoppage !== null) return state;
      let s = state;
      // The pull clock counts up past its 75s total rather than stopping there (see
      // TICK), so a late pull is simply seconds > total at the moment it's thrown.
      // Logged only over the limit — a pull inside 75s is unremarkable and stays
      // silent, exactly as it does today.
      if (
        s.secondary?.kind === 'pull' &&
        s.secondary.total !== null &&
        s.secondary.seconds > s.secondary.total
      ) {
        s = log(s, 'latePull', s.pullingTeam, undefined, {
          resolutionSeconds: s.secondary.seconds,
        });
      }
      return {
        ...s,
        status: 'live',
        pointStartSeconds: s.gameSeconds,
        // The receiving team catches the pull, so the point opens with them on offense.
        possessionTeam: s.offenseTeam,
        pointTurnovers: 0,
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
            turnovers: s.pointTurnovers,
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

      // Hydration breaks (see dueWaterBreaks): resolved after the half, because
      // half-time is the longer break and the two must never run back to back — a
      // score that triggers both takes half-time and marks the water break as used
      // (the `dueScores` below are consumed either way).
      const dueScores = dueWaterBreaks(s);
      const waterBreakDue = !reachHalf && dueScores.length > 0;

      const universePoint = !reachHalf && !waterBreakDue && isUniversePoint(s);

      // Prepare next point: scorer pulls, other team receives.
      // Rule B is end-zone-decided, so there is nothing for the scorekeeper to compute.
      const nextRatio =
        s.config.division === 'mixed' && s.config.mixedRule === 'A'
          ? ruleARatio(s.config.startingRatio, s.points.length)
          : null;

      // A resolved half cap announces the new half target itself, so it stands in
      // for the one-time "half at N" call-out.
      const goalAssist = reachHalf
        ? 'goHalftime'
        : waterBreakDue
          ? 'goWaterBreak'
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
                    : 'goalScored';
      // When the scoring team is player-tracked, the scorer/assist picker is about
      // to pop up over this same goal — hold the sign/message back so it doesn't
      // fight the dialog for the volunteer's attention, and release it
      // (REVEAL_GOAL_ASSIST) once the dialog closes instead. In `team` mode a goal
      // by the untracked side never opens that dialog, so nothing needs holding
      // back there. The gender-ratio auto-reveal piggybacks on this for free: it
      // only arms off `assist === 'goalScored'`, so it naturally waits too.
      const trackingPlayers = playerTrackingFor(s.config, team);
      s = {
        ...s,
        status: reachHalf ? s.status : 'awaitingPull',
        pullingTeam: team,
        offenseTeam: other(team),
        possessionTeam: null, // disc is dead until the next pull is caught
        pointTurnovers: 0,
        pointStartSeconds: null,
        nextRatio,
        secondary: reachHalf ? null : { kind: 'pull', seconds: 0, total: 75 },
        assist: trackingPlayers ? s.assist : goalAssist,
        pendingGoalAssist: trackingPlayers ? goalAssist : null,
        halfAnnounced: s.halfAnnounced || announceHalf || halfCapResolved,
        gameAnnounced: s.gameAnnounced || announceGame || capResolved,
        // Consumed whichever break actually happens: half-time swallows a water
        // break due on the same goal, and a score can only ever come due once.
        waterBreaksTaken: dueScores.length
          ? [...s.waterBreaksTaken, ...dueScores]
          : s.waterBreaksTaken,
      };
      if (waterBreakDue) {
        s = log(s, 'waterBreakStart');
        s = {
          ...s,
          status: 'waterBreak',
          // Counts UP and stops at nothing: reaching `total` only turns the clock
          // amber and hands the volunteer the words — the teams come back when they
          // come back, and WATER_BREAK_END is the only way out (see canWaterBreak).
          secondary: {
            kind: 'waterBreak',
            seconds: 0,
            total: s.config.waterBreaks.durationSeconds,
          },
        };
      }
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
      // A goal that reaches the half appends a 'halftimeStart' entry, one that reaches
      // a hydration-break score appends a 'waterBreakStart', and one that finishes the
      // game appends a 'gameEnd' — all three are automatic side effects of the goal,
      // not something the scorekeeper separately recorded, so none of them counts as
      // "something logged in between" and each is dropped along with the goal. A goal
      // can trigger at most one of the three.
      const trailingAuto = state.log[state.log.length - 1]?.type;
      const trailingAutoEntry =
        trailingAuto === 'halftimeStart' ||
        trailingAuto === 'waterBreakStart' ||
        trailingAuto === 'gameEnd';
      const goalLogIdx = trailingAutoEntry ? state.log.length - 2 : state.log.length - 1;
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
        pointTurnovers: prev.pointTurnovers,
        half: prev.half,
        // A goal appends exactly one point, so dropping the last entry rewinds it.
        points: state.points.slice(0, -1),
        cappedTarget: prev.cappedTarget,
        halfCappedTarget: prev.halfCappedTarget,
        halftimePlayed: prev.halftimePlayed,
        waterBreaksTaken: prev.waterBreaksTaken,
        halfAnnounced: prev.halfAnnounced,
        gameAnnounced: prev.gameAnnounced,
        status: prev.status,
        pointStartSeconds: prev.pointStartSeconds,
        secondary: null,
        assist: 'undoDone',
        pendingGoalAssist: null,
      };
    }

    case 'REVEAL_GOAL_ASSIST':
      return state.pendingGoalAssist !== null
        ? { ...state, assist: state.pendingGoalAssist, pendingGoalAssist: null }
        : state;

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
      // A timeout taken after the pull (disc live) follows the WFDF restart sequence:
      // it runs the configured duration PLUS 15 s, blowing the graduated warnings on
      // the way (see currentWhistle), before the disc goes live again. Taken before
      // the pull, it just runs the plain duration; the pull clock then restarts at 0.
      const afterPull = state.status === 'live';
      const duration = state.config.timeouts.durationSeconds;
      const total = afterPull ? duration + 15 : duration;
      return {
        ...s,
        status: 'timeout',
        statusBeforeTimeout: state.status,
        timeoutTeam: action.team,
        timeoutsUsed: used,
        secondary: { kind: 'timeout', seconds: total, total, afterPull },
        assist: 'timeoutRunning',
      };
    }

    case 'TIMEOUT_END': {
      if (state.status !== 'timeout') return state;
      // A stoppage freezes the timeout clock and has to be resolved first — see
      // playHalted; ending the timeout under one would skip past it.
      if (state.pendingStoppage !== null) return state;
      const s = log(state, 'timeoutEnd', state.timeoutTeam ?? undefined);
      // After-pull: the disc goes straight back into play (3-whistle restart).
      // Before-pull: back to awaiting the pull, and the pull clock RESTARTS at 0 so
      // the standard 45/60/75 pre-pull sequence runs fresh (1-whistle "time in").
      const beforePull = state.statusBeforeTimeout === 'awaitingPull';
      return {
        ...s,
        status: beforePull ? 'awaitingPull' : 'live',
        statusBeforeTimeout: null,
        timeoutTeam: null,
        secondary: beforePull ? { kind: 'pull', seconds: 0, total: 75 } : null,
        assist: beforePull ? 'timeoutOver' : 'timeoutRestart',
      };
    }

    case 'STOPPAGE': {
      // Available for the whole game, whatever else is running — see canStoppage,
      // which also enforces the one-open-stoppage-at-a-time rule. Logged without
      // touching the game clock at first (it only auto-stops if the stoppage runs
      // long, see TICK), but every other clock freezes from here (see playHalted).
      // An injury optionally records every player hurt, from either team; a
      // technical stoppage is never attributed to a player, only (optionally) a
      // single team.
      if (!canStoppage(state).ok) return state;
      // Team stats mode's hybrid injury step (and Game stats mode's team-only
      // step) can name a team with no specific player at all — injuryAttribution
      // folds that into the same team/label derivation as named players, rather
      // than a separate code path. A technical stoppage names a team and nothing
      // else: nobody caused it.
      const injured =
        action.kind === 'injury'
          ? injuryAttribution(state, action.team, action.players)
          : { team: action.team, label: undefined };
      const team = injured.team;
      const s = log(state, 'stoppage', team, injured.label, {
        stoppageKind: action.kind,
        stoppagePlayers: action.kind === 'injury' ? action.players : undefined,
      });
      return {
        ...s,
        pendingStoppage: {
          kind: action.kind,
          team,
          players: action.kind === 'injury' ? action.players : undefined,
          elapsedSeconds: 0,
          clockStopped: false,
        },
        assist: action.kind === 'injury' ? 'stoppageInjury' : 'stoppageTechnical',
      };
    }

    case 'STOPPAGE_RESOLVED': {
      const pending = state.pendingStoppage;
      if (pending === null) return state;
      // elapsedSeconds is ticked forward every TICK regardless of whether the game
      // clock itself is running (see TICK), so this is accurate whether or not the
      // stoppage ran long enough to auto-stop the clock below.
      const s = log(state, 'stoppageResolved', pending.team, undefined, {
        stoppageKind: pending.kind,
        resolutionSeconds: pending.elapsedSeconds,
      });
      // A stoppage left open long enough auto-stops the clock exactly like an SOTG
      // pause (see TICK) — resolving it is then also what un-pauses the game, since
      // the dedicated "Resume game" button replaces the small "Play can resume" one
      // in that state. A stoppage resolved before that point never touched status.
      if (pending.clockStopped) {
        return {
          ...s,
          pendingStoppage: null,
          status: s.statusBeforePause ?? 'live',
          statusBeforePause: null,
          assist: 'resumed',
        };
      }
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
      return {
        ...s,
        possessionTeam: other(attacking),
        pointTurnovers: s.pointTurnovers + 1,
        turnoversCommitted: {
          ...s.turnoversCommitted,
          [attacking]: s.turnoversCommitted[attacking] + 1,
        },
        assist: 'turnover',
      };
    }

    case 'UNDO_TURNOVER': {
      // Only ever the turnovers of the point being played (canUndoTurnover), so
      // giving the disc back is just flipping possession the other way: a point
      // starts with the receiving team and every turnover since has been undone in
      // reverse order to get here.
      if (!canUndoTurnover(state).ok || state.possessionTeam === null) return state;
      const back = other(state.possessionTeam);
      // Same split as UNDO_GOAL: if the turnover is still the last thing in the log,
      // this is the scorekeeper correcting a mis-tap, so the entry goes rather than
      // leaving both it and a correction behind. Once something else has been
      // recorded since — a call, a note — the turnover is part of the history that
      // followed it, and the correction is logged visibly instead.
      const last = state.log[state.log.length - 1];
      const s =
        last !== undefined && last.type === 'turnover'
          ? { ...state, log: state.log.slice(0, -1) }
          : log(state, 'undoTurnover', back);
      return {
        ...s,
        possessionTeam: back,
        pointTurnovers: s.pointTurnovers - 1,
        turnoversCommitted: { ...s.turnoversCommitted, [back]: s.turnoversCommitted[back] - 1 },
        assist: 'turnoverUndone',
      };
    }

    case 'TRAVEL': {
      // Only the calling team is attributed, not a player: a travel is called on the
      // thrower by the marker, and chasing down which player it was is more than a
      // volunteer can follow. Unlike the seven CALL_MADE kinds, there's no dispute to
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
        pendingCall: { kind: action.kind, team: action.team, elapsedSeconds: 0 },
        assist: `call_${action.kind}`,
      };
    }

    case 'CALL_RESOLVED': {
      const pending = state.pendingCall;
      if (pending === null) return state;
      // A stoppage or a stopped clock has frozen the discussion, and takes the
      // resolution row off the screen with it (see CallResolutionRow) — the call
      // stays open and is answered once play resumes.
      if (playHalted(state)) return state;
      // elapsedSeconds counts only the time the discussion actually had: TICK stops
      // advancing it while play is halted, so a stoppage or an SOTG pause taken
      // mid-dispute is not counted against the teams.
      const s = log(state, 'callResolved', pending.team, undefined, {
        callKind: pending.kind,
        resolution: action.resolution,
        resolutionSeconds: pending.elapsedSeconds,
      });
      // An accepted stall-out is a turnover under the rules — the thrower held the
      // disc past the count — so it is marked as one automatically rather than
      // asking the volunteer to also tap Turn. Only when stats are tracked at all:
      // with statsMode 'none' there is no Turn button, no pointTurnovers counter and
      // no possession rule on screen for it to move. It logs as an ordinary
      // 'turnover' entry (see TURNOVER above), so it is editable and undoable the
      // same way — including by long-pressing Turn, since it lands as the newest
      // log entry.
      if (
        action.resolution === 'accepted' &&
        pending.kind === 'stallOut' &&
        statsTrackingEnabled(s.config) &&
        s.possessionTeam !== null
      ) {
        const attacking = s.possessionTeam;
        const t = log(s, 'turnover', attacking);
        return {
          ...t,
          pendingCall: null,
          possessionTeam: other(attacking),
          pointTurnovers: t.pointTurnovers + 1,
          turnoversCommitted: {
            ...t.turnoversCommitted,
            [attacking]: t.turnoversCommitted[attacking] + 1,
          },
          assist: `resolution_${action.resolution}`,
        };
      }
      return { ...s, pendingCall: null, assist: `resolution_${action.resolution}` };
    }

    case 'NOTE': {
      // A note is the one recorded event a break in play doesn't block — see
      // canRecordEvent. It is written from the log dialog, which stays reachable
      // throughout, so refusing here would silently swallow what was just typed.
      if (!canRecordEvent(state, { allowDuringBreaks: true }).ok) return state;
      const text = action.text.trim();
      if (!text) return state;
      // A note is written down and nothing more: no signal, no call-out. `assist` still
      // has to change, because the bar and the signal card key off it plus the log
      // counter — leaving it alone would re-trigger whatever was last announced.
      return { ...log(state, 'note', undefined, text), assist: 'note' };
    }

    case 'SOTG_TOGGLE': {
      if (state.status === 'paused' && state.statusBeforePause !== null) {
        // How long play was actually halted, the same thing a resolved call or
        // stoppage records: counted by TICK rather than measured off the wall
        // clock, so it is unaffected by the app being reloaded mid-pause.
        const s = log(
          state,
          state.pauseSilent ? 'pauseEnd' : 'sotgEnd',
          state.pauseTeam ?? undefined,
          undefined,
          { resolutionSeconds: state.pauseElapsedSeconds },
        );
        return {
          ...s,
          status: s.statusBeforePause ?? 'live',
          statusBeforePause: null,
          pauseSilent: false,
          pauseTeam: null,
          assist: 'resumed',
        };
      }
      // Stopping the clock is available for the whole game, same window as any other
      // stoppage — during a timeout, half-time or an open call included, each of
      // which freezes and resumes where it was (see playHalted). statusBeforePause
      // is what carries the way back, kept apart from statusBeforeTimeout precisely
      // so a pause taken during a timeout doesn't overwrite the timeout's own.
      if (!canStoppage(state).ok) return state;
      const s = log(state, action.silent ? 'pauseStart' : 'sotgStart', action.team);
      return {
        ...s,
        status: 'paused',
        statusBeforePause: state.status,
        pauseSilent: !!action.silent,
        pauseTeam: action.team ?? null,
        pauseElapsedSeconds: 0,
        assist: action.silent ? 'pauseStart' : 'sotg',
      };
    }

    case 'HALFTIME_END': {
      if (state.status !== 'halftime') return state;
      // Same as TIMEOUT_END: the break clock is frozen under a stoppage, so the
      // second half can't start until that stoppage is resolved.
      if (state.pendingStoppage !== null) return state;
      const s = log(state, 'halftimeEnd');
      // Second half mirrors the opening: the team that received the first pull now
      // pulls, and the ends are the opposite of how half 1 started.
      const puller = secondHalfPuller(s);
      const swapNeeded = secondHalfSwapNeeded(s);
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

    case 'WATER_BREAK_START': {
      // Manual, from the stoppage dialog. Only between points — see canWaterBreak.
      if (!canWaterBreak(state).ok) return state;
      // Anything the automatic protocol already had due is spent by this break:
      // without that, calling one by hand at 4-3 would be followed by the app
      // calling its own at the very next goal.
      const dueScores = dueWaterBreaks(state);
      const s = log(state, 'waterBreakStart');
      return {
        ...s,
        status: 'waterBreak',
        waterBreaksTaken: dueScores.length
          ? [...s.waterBreaksTaken, ...dueScores]
          : s.waterBreaksTaken,
        secondary: { kind: 'waterBreak', seconds: 0, total: s.config.waterBreaks.durationSeconds },
        assist: 'goWaterBreak',
      };
    }

    case 'WATER_BREAK_END': {
      if (state.status !== 'waterBreak') return state;
      // Same as TIMEOUT_END/HALFTIME_END: the break clock is frozen under a stoppage,
      // so play can't be sent back to the line until that stoppage is resolved.
      if (state.pendingStoppage !== null) return state;
      const s = log(state, 'waterBreakEnd');
      // A break only ever starts between points and hands back to the same place,
      // with the pull clock restarted at 0 so the standard 45/60/75 sequence runs
      // fresh — exactly what a before-pull timeout does when it ends.
      return {
        ...s,
        status: 'awaitingPull',
        secondary: { kind: 'pull', seconds: 0, total: 75 },
        assist: 'waterBreakOver',
      };
    }

    case 'SET_CAP_TARGET': {
      // The offered values are the whole guard: capTargetOptions already knows which
      // cap is live, what the rule allows and what the score has ruled out.
      if (!capTargetOptions(state, action.which).includes(action.target)) return state;
      const half = action.which === 'half';
      const current = half ? state.halfCappedTarget : state.cappedTarget;
      if (current === action.target) return state;
      // Writing the target IS the resolution: GOAL only resolves a cap while its
      // target is still null, so a hand-named number is what the next goal reads
      // rather than something it overwrites.
      let s: GameState = half
        ? { ...state, halfCappedTarget: action.target, halfAnnounced: true }
        : { ...state, cappedTarget: action.target, gameAnnounced: true };
      s = log(s, 'capTargetSet', undefined, `${action.which}:${action.target}`);
      // Silent, like every other correction to the bookkeeping (see EDIT_LOG_ENTRY):
      // the cap was announced and whistled when it landed, and this is the volunteer
      // fixing which point it landed in — not a second cap for the players to hear
      // about. `capTargetSet` is in none of SAY, SIGNAL or currentWhistle's cap list,
      // so nothing is queued and the ambient line stays on screen. It still has to be
      // *set*: the occurrence key carries nextLogId, which this entry has just moved,
      // so leaving the previous assist in place would re-announce it instead.
      return { ...s, assist: 'capTargetSet' };
    }

    case 'TICK': {
      if (state.phase !== 'game') return state;
      let s = state;
      // One-minute-to-start whistle for a scheduled kickoff (scenario 1a). Skipped
      // when the kickoff was already under a minute away at START_GAME (startWarned
      // seeded true there), so a near-immediate start never warns.
      if (
        s.status === 'awaitingStart' &&
        s.startingAtMs !== null &&
        !s.startWarned &&
        Date.now() >= s.startingAtMs - 60_000 &&
        Date.now() < s.startingAtMs
      ) {
        s = { ...s, startWarned: true, assist: 'startWarning' };
      }
      // Scheduled kickoff reached: open the pull exactly as START_GAME would have
      // if no starting time had been configured.
      if (s.status === 'awaitingStart' && s.startingAtMs !== null && Date.now() >= s.startingAtMs) {
        s = beginPlay(s);
      }
      // Game clock only stops for a pause (status 'paused') — manual, SOTG, or
      // auto-triggered by a prolonged stoppage below; halftime, timeouts and water
      // breaks don't stop it. 'finished' doesn't stop it either: the screen shows it
      // frozen (see
      // GameScreen) but it keeps advancing underneath so that undoing the goal that
      // finished the game (see canUndo) resumes from the time that would have
      // elapsed, not from a clock that lost however long the review took.
      const clockRuns =
        s.status === 'live' ||
        s.status === 'awaitingPull' ||
        s.status === 'timeout' ||
        s.status === 'halftime' ||
        s.status === 'waterBreak' ||
        s.status === 'finished';
      if (clockRuns) {
        s = { ...s, gameSeconds: s.gameSeconds + 1 };
        // Caps only ever matter to a game still being decided — once finished, the
        // time limit has nothing left to cap.
        if (s.status !== 'finished') {
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
      }
      // How long the clock has been stopped, logged by sotgEnd/pauseEnd when play
      // resumes. Read off the status this tick started with, so the pause that the
      // prolonged-stoppage rule below opens starts counting from its own 0.
      if (s.status === 'paused') {
        s = { ...s, pauseElapsedSeconds: s.pauseElapsedSeconds + 1 };
      }
      // Pending stoppage bookkeeping: elapsedSeconds keeps counting every tick for
      // recording purposes even once the clock below has stopped. Left unresolved
      // for PROLONGED_STOPPAGE_SECONDS, the game clock auto-stops exactly like an
      // SOTG pause, so a lingering injury/technical stoppage doesn't quietly eat
      // into game time — "Resume game" then also resolves the stoppage (see
      // STOPPAGE_RESOLVED). Gated on `clockRuns` (the status the clock actually had
      // this tick, before any of the above touches it) so this never fires twice —
      // once already paused (manually, or by this same rule), there's nothing left
      // to stop.
      if (s.pendingStoppage !== null) {
        const pending = {
          ...s.pendingStoppage,
          elapsedSeconds: s.pendingStoppage.elapsedSeconds + 1,
        };
        s = { ...s, pendingStoppage: pending };
        if (
          !pending.clockStopped &&
          clockRuns &&
          pending.elapsedSeconds >= PROLONGED_STOPPAGE_SECONDS
        ) {
          s = log(s, 'stoppageClockStopped', pending.team, undefined, {
            stoppageKind: pending.kind,
          });
          s = {
            ...s,
            status: 'paused',
            statusBeforePause: s.status,
            pauseElapsedSeconds: 0,
            pendingStoppage: { ...pending, clockStopped: true },
            assist: 'stoppageClockStopped',
          };
        }
      }
      // Everything below measures a stretch of play, so all of it waits while play is
      // halted — an open stoppage, or a stopped clock. A pause would freeze the
      // secondary timer for free (it leaves the status each one ticks under), but a
      // stoppage leaves the status alone, so both go through the one check and both
      // pick up from exactly where they were.
      const halted = playHalted(s);
      // Pending call bookkeeping: elapsedSeconds is how long the discussion has run,
      // driving both the 45/60 s "still unresolved" whistle and the duration logged
      // by CALL_RESOLVED. Independent of the game clock — a timeout doesn't stall a
      // dispute — but not of a stoppage, which interrupts the discussion itself.
      if (s.pendingCall !== null && !halted) {
        s = {
          ...s,
          pendingCall: { ...s.pendingCall, elapsedSeconds: s.pendingCall.elapsedSeconds + 1 },
        };
      }
      // Secondary timer — the pull countdown, a timeout, the half-time break, a
      // water break.
      if (s.secondary && !halted) {
        const sec = s.secondary;
        if (sec.kind === 'pull' && s.status === 'awaitingPull') {
          s = { ...s, secondary: { ...sec, seconds: sec.seconds + 1 } };
        } else if (sec.kind === 'waterBreak' && s.status === 'waterBreak') {
          // Counts up and keeps going past the configured duration: the break ends
          // when the volunteer says it does, not when the clock says so. Crossing
          // the duration is announced once — that is the whole event, and the
          // display turns amber off the same comparison.
          const next = sec.seconds + 1;
          s = { ...s, secondary: { ...sec, seconds: next } };
          if (sec.total !== null && sec.seconds < sec.total && next >= sec.total) {
            s = { ...s, assist: 'waterBreakDue' };
          }
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
      // Manually ending the game (as opposed to reaching it via a goal) is a
      // deliberate, confirmed choice to stop right now — there is no "goal that
      // just did this" for the volunteer to reconsider, so it skips the blocked
      // review screen finishGame otherwise leaves the game on and goes straight
      // to the report, same as it always has.
      return { ...finishGame(state), phase: 'report' };

    case 'OPEN_REPORT':
      if (state.status !== 'finished') return state;
      return { ...state, phase: 'report' };

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

      // A Callahan is the answer to "who assisted?", not a fact alongside it, so
      // it clears the assist rather than coexisting with a stale one.
      const attribution = {
        scorerId: action.scorerId ?? undefined,
        assistId: action.callahan ? undefined : (action.assistId ?? undefined),
        callahan: action.callahan || undefined,
      };

      const points = [...state.points];
      points[idx] = { ...lastPoint, ...attribution };

      let log = state.log;
      for (let i = log.length - 1; i >= 0; i--) {
        if (log[i].type === 'goal' && log[i].team === action.team) {
          log = [...log];
          log[i] = { ...log[i], ...attribution };
          break;
        }
      }

      return { ...state, points, log };
    }

    case 'EDIT_LOG_ENTRY': {
      const index = state.log.findIndex((e) => e.id === action.id);
      if (index === -1) return state;
      const entry = state.log[index];
      const edit = action.edit;
      // The row has to actually offer this question. The dialog only ever opens the
      // matching one, so this is about a stale dispatch (an entry deleted underneath
      // it) not being able to write a row the app itself could never record.
      if (logEditKind(state, entry) !== edit.kind) return state;
      const log = [...state.log];

      if (edit.kind === 'goalPlayers') {
        // Same rule as SET_GOAL_PLAYERS: a Callahan clears the assist.
        const attribution = {
          scorerId: edit.scorerId,
          assistId: edit.callahan ? undefined : edit.assistId,
          callahan: edit.callahan || undefined,
        };
        log[index] = { ...entry, ...attribution };
        // The point carries the same attribution (see SET_GOAL_PLAYERS), so it moves
        // with the row rather than being left behind disagreeing with it.
        const pointIndex = pointIndexForGoal(state.log, entry.id);
        const points =
          pointIndex === null
            ? state.points
            : state.points.map((p, i) => (i === pointIndex ? { ...p, ...attribution } : p));
        return { ...state, log, points };
      }

      if (edit.kind === 'turnoverPlayers') {
        log[index] = { ...entry, turnoverId: edit.turnoverId, defenseId: edit.defenseId };
        return { ...state, log };
      }

      if (edit.kind === 'note') {
        const text = edit.text.trim();
        // Same rule as NOTE itself: an empty note is not a note. Clearing the text is
        // "delete this entry", which is the other button on the row.
        if (!text) return state;
        log[index] = { ...entry, detail: text };
        return { ...state, log };
      }

      // Everything left is an attribution every row of the event shares.
      const episode = episodeIndices(state.log, index);
      const injury =
        edit.kind === 'injury' ? injuryAttribution(state, edit.team, edit.players) : null;
      const injuredPlayers = edit.kind === 'injury' ? edit.players : undefined;
      const team = injury ? injury.team : edit.team;
      for (const i of episode) {
        log[i] = { ...log[i], team };
        // Only the opening row of an injury names the players — the rows that follow
        // it are about the clock, not about who was hurt.
        if (injury && log[i].type === 'stoppage') {
          log[i] = { ...log[i], detail: injury.label, stoppagePlayers: injuredPlayers };
        }
      }
      if (edit.kind === 'callResolution') {
        log[index] = { ...log[index], resolution: edit.resolution };
      }

      // An episode with no closing row is the one still in progress, so the live
      // state that will write that closing row has to move with the edit — otherwise
      // resolving the call would put the old team back.
      const open = !episode.some((i) => EPISODE_CLOSERS.includes(state.log[i].type));
      if (!open) return { ...state, log };
      if (entry.type === 'call' && state.pendingCall !== null) {
        return { ...state, log, pendingCall: { ...state.pendingCall, team } };
      }
      if (entry.stoppageKind !== undefined && state.pendingStoppage !== null) {
        return {
          ...state,
          log,
          pendingStoppage: {
            ...state.pendingStoppage,
            team,
            players: injury ? injuredPlayers : state.pendingStoppage.players,
          },
        };
      }
      if (entry.type === 'sotgStart' && state.status === 'paused') {
        return { ...state, log, pauseTeam: team ?? null };
      }
      return { ...state, log };
    }

    case 'DELETE_LOG_ENTRY': {
      const entry = state.log[state.log.length - 1];
      if (entry === undefined || entry.id !== action.id) return state;
      if (!canDeleteLogEntry(state, entry)) return state;
      // A turnover is exactly what a long-press on Turn takes back, and its entry
      // being the newest is the very case UNDO_TURNOVER already handles by dropping
      // the row rather than logging a correction — so this is that action, not a
      // second way to rewind possession.
      if (entry.type === 'turnover') return gameReducer(state, { type: 'UNDO_TURNOVER' });
      // A resolution goes with the call it answered: half a call left in the log
      // reads as a dispute that never ended. Everything else here is a single row.
      const drop = new Set(episodeIndices(state.log, state.log.length - 1));
      return {
        ...state,
        log: state.log.filter((_, i) => !drop.has(i)),
        // Deleting a call nobody has answered yet takes the open question with it.
        pendingCall: entry.type === 'call' ? null : state.pendingCall,
        // nextLogId is deliberately left alone: ids stay unique for the lifetime of
        // the game, so a deleted row's id can never be handed to a later event (the
        // assistance queue keys its messages off it — see useAssistQueue).
      };
    }

    default:
      return state;
  }
}
