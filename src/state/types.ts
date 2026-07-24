export type TeamId = 'A' | 'B';
export type Division = 'open' | 'women' | 'mixed';
export type MixedRule = 'A' | 'B';
export type Gender = 'male' | 'female';

export type EndCapRule =
  | { kind: 'none' } // Option A: finish the current point, no cap
  | { kind: 'cap'; plus: 1 | 2 } // Option B (default)
  | { kind: 'conditional'; plus: 1 | 2; minDiff: 1 | 2 | 3 }; // Option C

export type HalfCapRule = { kind: 'none' } | { kind: 'cap'; plus: 1 };

export interface TimeoutConfig {
  enabled: boolean; // when false, timeouts are unavailable regardless of the budgets below
  // Exactly one of these carries the budget; the other is null (the config UI
  // enforces this). perHalf wins if both are somehow set; both null = no timeouts.
  perHalf: number | null;
  perGame: number | null;
  durationSeconds: number; // break duration
  disallowLastFiveMinutes: boolean;
}

/**
 * Optional scheduled kickoff. When enabled, START_GAME does not open the pull
 * immediately — it waits (status 'awaitingStart') until `time` (today, "HH:MM",
 * local) actually arrives, or until the volunteer taps "Start game" early
 * (BEGIN_PLAY). Per-game, like the coin toss results: never saved in a template.
 */
export interface StartingTimeConfig {
  enabled: boolean;
  time: string; // "HH:MM", 24h, local time, today
}

export interface TeamConfig {
  name: string;
  color: string;
}

export interface PlayerInfo {
  id: string;
  number: string;
  name: string;
}

/** A team remembered in localStorage across games, keyed by name (see rosterStorage.ts). */
export interface SavedTeam {
  name: string;
  color: string;
  players: PlayerInfo[];
}

export interface GameConfig {
  division: Division;
  fieldNumber: string;
  teams: Record<TeamId, TeamConfig>;
  mixedRule: MixedRule;
  // Coin toss results
  startingOffense: TeamId; // team receiving the first pull
  startingSide: TeamId; // team that starts on the "left" side of the scoreboard
  startingRatio: Gender; // starting gender ratio (mixed only)
  targetScore: number; // game target
  halfScore: number; // half target
  timeLimitMinutes: number; // game time limit
  halfTimeLimitMinutes: number; // half time limit
  halfTimeBreakSeconds: number;
  endCap: EndCapRule;
  halfCap: HalfCapRule;
  timeouts: TimeoutConfig;
  startingTime: StartingTimeConfig;
  /**
   * The "Track game activity" stats toggle. When true: the Roster and Turn action-row
   * buttons appear, a call/travel/technical stoppage asks which team was involved, and
   * a goal/assist/turnover/injury additionally asks which player once the roster below
   * is filled in. When false, none of that is asked and both buttons are hidden — every
   * event is still logged, just with no team or player attached, and a turnover isn't
   * logged at all (there is no Turn button to log one with).
   */
  trackPlayers: boolean;
  players: Record<TeamId, PlayerInfo[]>;
}

/**
 * Rule settings a template can carry — everything except the per-game choices
 * templates must not touch: teams, coin toss results, players, trackPlayers.
 */
export type TemplateSettings = Omit<
  GameConfig,
  | 'teams'
  | 'startingOffense'
  | 'startingSide'
  | 'startingRatio'
  | 'trackPlayers'
  | 'players'
  | 'startingTime'
>;

/** A named bundle of rule settings, saved from the config screen (see templates.ts). */
export interface SavedTemplate {
  name: string;
  settings: TemplateSettings;
}

export type GameStatus =
  | 'notStarted' // config done, no kickoff scheduled: waiting for "Start game" (BEGIN_PLAY)
  | 'awaitingStart' // scheduled kickoff configured, real-world clock hasn't reached it yet (or "Start game" hasn't been tapped early)
  | 'awaitingPull' // between points: score frozen until the pull is thrown
  | 'live' // disc in play
  | 'paused' // clock manually stopped — an SOTG stoppage, or a generic pause via the clock button
  | 'timeout' // team timeout running
  | 'halftime'
  | 'finished';

/**
 * A call a player makes on the field. Purely observational for the scorekeeper:
 * recording one never touches the score, the clock or possession — it only writes
 * to the log and cues a hand signal.
 *
 * `generic` is the catch-all button (labelled just "Call") for anything the list
 * doesn't name; it signals "play stopped" rather than a specific infraction.
 */
export type CallKind = 'foul' | 'stallOut' | 'pick' | 'offside' | 'discDown' | 'generic';

export type CallResolution = 'accepted' | 'contested' | 'retracted';

/**
 * A stoppage covers anything that halts play without a call to dispute: `injury`
 * can be attributed to a player, `technical` (equipment, outside interference, ...)
 * can only be attributed to a team.
 */
export type StoppageKind = 'injury' | 'technical';

export type LogType =
  | 'gameStart'
  | 'goal'
  | 'undo'
  | 'timeout'
  | 'timeoutEnd'
  | 'stoppage'
  | 'stoppageResolved'
  | 'stoppageClockStopped'
  | 'turnover'
  | 'undoTurnover'
  | 'travel'
  | 'call'
  | 'callResolved'
  | 'note'
  | 'sotgStart'
  | 'sotgEnd'
  | 'pauseStart'
  | 'pauseEnd'
  | 'halftimeStart'
  | 'halftimeEnd'
  | 'timeCap'
  | 'halfTimeCap'
  | 'gameEnd';

export interface LogEntry {
  id: number;
  wallClock: string; // real-world time, e.g. "17:42:05"
  /** Same instant as wallClock but as an epoch ms, for computing real-world durations without reparsing a locale-formatted string. */
  atMs: number;
  gameSeconds: number; // elapsed game clock at the moment of the event
  type: LogType;
  team?: TeamId;
  detail?: string;
  scorerId?: string; // goal entries only, once assigned via SET_GOAL_PLAYERS
  assistId?: string;
  /** Turnover entries only: the attacker who lost the disc (team = attacking team). */
  turnoverId?: string;
  /** Turnover entries only: the defender who forced it, from the other team. */
  defenseId?: string;
  /** `call` and `callResolved` entries: which infraction was called (team = caller). */
  callKind?: CallKind;
  /** `callResolved` entries only. */
  resolution?: CallResolution;
  /** `callResolved` and `stoppageResolved` entries only: game-clock seconds the call/stoppage took to settle. */
  resolutionSeconds?: number;
  /** `stoppage` and `stoppageResolved` entries only. */
  stoppageKind?: StoppageKind;
}

/**
 * A call that has been made but not yet resolved. While one is open the game
 * screen shows the three resolution buttons above the clocks, and no second call
 * can be started — the volunteer has one thing to answer.
 */
export interface PendingCall {
  kind: CallKind;
  /** Undefined when the call was logged without tracking game activity — see trackPlayers. */
  team?: TeamId;
  /**
   * How long the discussion has been going. Ticked every TICK except while play is
   * halted (`playHalted`: an open stoppage, or a stopped clock) — a stoppage or an
   * SOTG pause interrupts the discussion, so the time it eats is not the players'.
   * This is both what the secondary clock shows and what CALL_RESOLVED logs.
   */
  elapsedSeconds: number;
}

/**
 * A stoppage that has been logged but not yet resolved. While one is open the
 * game screen shows the "Play can resume" button above the clocks, and no second
 * stoppage can be logged — same one-open-question shape as PendingCall.
 *
 * It can be raised at any point of a game in progress, and everything else waits
 * for it: the pull clock, a running timeout, the half-time break and an open
 * call's discussion timer all freeze until it resolves and then pick up exactly
 * where they left off (see `playHalted` in the reducer).
 *
 * Left unresolved for two minutes, the game clock auto-stops (see TICK in the
 * reducer), same as an SOTG pause — at that point the "Resume game" action row
 * button takes over from the small "Play can resume" button, and resuming also
 * resolves the stoppage.
 */
export interface PendingStoppage {
  kind: StoppageKind;
  /** Set for `technical` (the team responsible), and derived for `injury` when every injured player is on the same team — undefined once the injury spans both. */
  team?: TeamId;
  /** `injury` only — every injured player, each with their own team since an injury can involve people from both sides at once. A technical stoppage is never attributed to a player. */
  players?: { team: TeamId; playerId: string }[];
  /**
   * Seconds since the stoppage was logged, incremented every TICK regardless of
   * whether the game clock itself is running — so the resolution duration keeps
   * counting even after `clockStopped` freezes `gameSeconds`.
   */
  elapsedSeconds: number;
  /** True once two minutes elapsed unresolved and the game clock was auto-stopped. */
  clockStopped: boolean;
}

export interface PointRecord {
  scoredBy: TeamId;
  offense: TeamId; // team that received the pull for this point
  isBreak: boolean; // defense scored
  durationSeconds: number; // from pull thrown to goal
  half: 1 | 2;
  scorerId?: string;
  assistId?: string;
}

/**
 * Snapshot pushed before each goal so undo restores everything, ratio included.
 *
 * `points` is deliberately NOT stored: a goal appends exactly one PointRecord, so
 * undo reconstructs the list by dropping the last entry. Storing it here instead
 * would serialize a full copy of the point list per snapshot, making the persisted
 * payload grow quadratically over a game.
 */
export interface GoalSnapshot {
  scores: Record<TeamId, number>;
  ratio: Gender | null;
  nextRatio: Gender | null;
  pullingTeam: TeamId;
  offenseTeam: TeamId;
  possessionTeam: TeamId | null;
  pointTurnovers: number;
  status: GameStatus;
  half: 1 | 2;
  pointStartSeconds: number | null;
  cappedTarget: number | null;
  halfCappedTarget: number | null;
  halftimePlayed: boolean;
  halfAnnounced: boolean;
  gameAnnounced: boolean;
}

export interface GameState {
  phase: 'config' | 'game' | 'report';
  config: GameConfig;
  status: GameStatus;
  /**
   * Status to come back to when the clock restarts, set while `status` is 'paused'
   * (SOTG, the manual pause button, or a stoppage that ran past two minutes).
   * Kept separate from `statusBeforeTimeout` because a pause can now happen
   * *during* a timeout or half-time, and each has to remember its own way back.
   */
  statusBeforePause: GameStatus | null;
  /** Status to come back to when a timeout ends — 'awaitingPull' or 'live' (see TIMEOUT_END). */
  statusBeforeTimeout: GameStatus | null;
  /** True while the open pause was started silently (the clock button, not the SOTG record-event entry) — decides the wording used when it closes. */
  pauseSilent: boolean;
  /** Team that called the open SOTG pause, when `config.trackPlayers` asked — carried from `sotgStart` to `sotgEnd` the same way `pendingStoppage.team` survives to `stoppageResolved`. Null for a silent pause or when tracking is off. */
  pauseTeam: TeamId | null;
  half: 1 | 2;
  scores: Record<TeamId, number>;
  /** Gender ratio for the point currently being played (mixed only). */
  ratio: Gender | null;
  /** Ratio for the NEXT point; revealed a few seconds after a goal. */
  nextRatio: Gender | null;
  pullingTeam: TeamId; // team throwing the next/current pull
  offenseTeam: TeamId; // team receiving (offense) for the current point
  /**
   * Team holding the disc right now, flipped by every turnover. Distinct from
   * `offenseTeam`, which is fixed for the whole point (it decides hold vs break)
   * — this one tracks live possession and is null whenever the disc is dead.
   */
  possessionTeam: TeamId | null;
  /**
   * Turnovers recorded in the point currently being played, reset by every pull and
   * every goal. Only there to tell an undo of a turnover (long-press on Turn) from a
   * long-press on a point where nothing has been turned over yet — flipping
   * possession then would hand the disc away from the team that received the pull.
   */
  pointTurnovers: number;
  gameSeconds: number; // elapsed game clock
  /** Epoch ms of the scheduled kickoff, while status is 'awaitingStart'; null otherwise. */
  startingAtMs: number | null;
  pointStartSeconds: number | null; // gameSeconds when the current pull was thrown
  secondary: {
    kind: 'pull' | 'timeout' | 'halftime';
    seconds: number;
    total: number | null;
    /**
     * Timeout only: true when the timeout was called after the pull (disc live), so
     * the WFDF restart sequence applies — it counts down `duration + 15` and blows
     * 1/2/3 at 15/0-remaining before the disc goes live again. A before-pull timeout
     * (false/undefined) just runs the plain duration, then the pull clock restarts.
     */
    afterPull?: boolean;
  } | null;
  /**
   * True once the one-minute-to-scheduled-start whistle has fired (or was skipped
   * because the kickoff was already under a minute away at START_GAME), so it is
   * blown at most once.
   */
  startWarned: boolean;
  timeoutsUsed: Record<TeamId, { half1: number; half2: number }>;
  timeoutTeam: TeamId | null;
  cappedTarget: number | null; // target score after end-game cap applied
  halfCappedTarget: number | null;
  timeCapReached: boolean;
  halfTimeCapReached: boolean;
  halftimePlayed: boolean;
  /**
   * The one-time "half at N" call-out has already been made. Both teams can reach
   * one short of the half target, so without this it would be shouted twice. It is
   * also what puts the half target on screen: the chip appears when it is announced.
   */
  halfAnnounced: boolean;
  /** The same, for the game target — see `halfAnnounced`. */
  gameAnnounced: boolean;
  /** Open call awaiting an accepted/contested/retracted answer, or null. */
  pendingCall: PendingCall | null;
  /** Open stoppage awaiting resolution, or null. */
  pendingStoppage: PendingStoppage | null;
  points: PointRecord[];
  log: LogEntry[];
  history: GoalSnapshot[]; // undo stack for goals
  nextLogId: number;
  /** Transient hint key for the Assistance Message Bar. */
  assist: string;
  /** Bumped by SHOW_RATIO_SIGNAL so re-tapping the ratio chip re-keys the signal card even while assist is still 'nextRatio'. */
  ratioSignalId: number;
}

export type Action =
  | { type: 'START_GAME'; config: GameConfig }
  /** Manual "Start game" tap: opens the pull from 'notStarted', or early from 'awaitingStart' before the scheduled kickoff arrives. */
  | { type: 'BEGIN_PLAY' }
  | { type: 'PULL_THROWN' }
  | { type: 'GOAL'; team: TeamId }
  | { type: 'UNDO_GOAL'; team: TeamId }
  | { type: 'REVEAL_NEXT_RATIO' }
  | { type: 'SHOW_RATIO_SIGNAL' }
  | { type: 'TIMEOUT_START'; team: TeamId }
  | { type: 'TIMEOUT_END' }
  | {
      type: 'STOPPAGE';
      kind: StoppageKind;
      /** `technical` only — `injury` derives its team badge from `players` instead. */
      team?: TeamId;
      /** `injury` only — every player hurt, each with their own team. */
      players?: { team: TeamId; playerId: string }[];
    }
  | { type: 'STOPPAGE_RESOLVED' }
  | { type: 'TURNOVER'; turnoverId?: string; defenseId?: string }
  /** Long-press on Turn: hands the disc back to the team that lost it (see UNDO_TURNOVER). */
  | { type: 'UNDO_TURNOVER' }
  | { type: 'TRAVEL'; team?: TeamId }
  | { type: 'CALL_MADE'; kind: CallKind; team?: TeamId }
  | { type: 'CALL_RESOLVED'; resolution: CallResolution }
  | { type: 'NOTE'; text: string }
  /**
   * `silent` pauses the clock without the SOTG call-out/signal — the generic pause
   * button covers reasons (technical, weather, prolonged stoppage) that aren't
   * spirit-related. `team` attributes which team called it, asked for only when
   * `config.trackPlayers` is on; the caller (StoppageDialog) never sends it for a
   * silent pause.
   */
  | { type: 'SOTG_TOGGLE'; silent?: boolean; team?: TeamId }
  | { type: 'HALFTIME_END' }
  | { type: 'TICK' } // 1 s of real time while clocks run
  | { type: 'END_GAME' }
  /** "Open report" tap once the game has finished: the only way from 'finished' to phase 'report'. */
  | { type: 'OPEN_REPORT' }
  | { type: 'BACK_TO_CONFIG' }
  | { type: 'ADD_PLAYER'; team: TeamId; number: string; name: string }
  | { type: 'REMOVE_PLAYER'; team: TeamId; id: string }
  | { type: 'SET_GOAL_PLAYERS'; team: TeamId; scorerId: string | null; assistId: string | null };
