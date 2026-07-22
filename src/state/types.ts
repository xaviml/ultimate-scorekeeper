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
  perHalf: number | null; // null = use perGame; both null = no timeouts (same as 0)
  perGame: number | null;
  durationSeconds: number; // break duration
  disallowLastFiveMinutes: boolean;
}

/**
 * Optional scheduled kickoff. When enabled, START_GAME does not open the pull
 * immediately — it waits (status 'awaitingStart') until `time` (today, "HH:MM",
 * local) actually arrives. Per-game, like the coin toss results: never saved in a
 * template.
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
   * When true, every player-attributable event (goal, assist, turnover, defense,
   * injury) prompts for who was involved. When false the events are still logged,
   * just without names — no dialog ever interrupts the volunteer.
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
  | 'notStarted' // config done, waiting for first pull
  | 'awaitingStart' // scheduled kickoff configured, real-world clock hasn't reached it yet
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
  | 'turnover'
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
  team: TeamId; // team that made the call
  /** Game clock when the call was logged; the resolution duration counts from here. */
  startedAtSeconds: number;
}

/**
 * A stoppage that has been logged but not yet resolved. While one is open the
 * game screen shows the "Play can resume" button above the clocks, and no second
 * stoppage can be logged — same one-open-question shape as PendingCall.
 */
export interface PendingStoppage {
  kind: StoppageKind;
  team?: TeamId;
  /** `injury` only — a technical stoppage is never attributed to a player. */
  playerId?: string;
  /** Game clock when the stoppage was logged; the resolution duration counts from here. */
  startedAtSeconds: number;
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
  statusBeforePause: GameStatus | null;
  /** True while the open pause was started silently (the clock button, not the SOTG record-event entry) — decides the wording used when it closes. */
  pauseSilent: boolean;
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
  gameSeconds: number; // elapsed game clock
  /** Epoch ms of the scheduled kickoff, while status is 'awaitingStart'; null otherwise. */
  startingAtMs: number | null;
  pointStartSeconds: number | null; // gameSeconds when the current pull was thrown
  secondary: {
    kind: 'pull' | 'timeout' | 'halftime';
    seconds: number;
    total: number | null;
  } | null;
  /** Pull-timer seconds banked when a timeout interrupts the pull count, so it can resume afterward. */
  pausedPullSeconds: number | null;
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
  | { type: 'PULL_THROWN' }
  | { type: 'GOAL'; team: TeamId }
  | { type: 'UNDO_GOAL'; team: TeamId }
  | { type: 'REVEAL_NEXT_RATIO' }
  | { type: 'SHOW_RATIO_SIGNAL' }
  | { type: 'TIMEOUT_START'; team: TeamId }
  | { type: 'TIMEOUT_END' }
  | { type: 'STOPPAGE'; kind: StoppageKind; team?: TeamId; playerId?: string }
  | { type: 'STOPPAGE_RESOLVED' }
  | { type: 'TURNOVER'; turnoverId?: string; defenseId?: string }
  | { type: 'TRAVEL'; team: TeamId }
  | { type: 'CALL_MADE'; kind: CallKind; team: TeamId }
  | { type: 'CALL_RESOLVED'; resolution: CallResolution }
  | { type: 'NOTE'; text: string }
  /** `silent` pauses the clock without the SOTG call-out/signal — the generic pause button covers reasons (technical, weather, prolonged stoppage) that aren't spirit-related. */
  | { type: 'SOTG_TOGGLE'; silent?: boolean }
  | { type: 'HALFTIME_END' }
  | { type: 'TICK' } // 1 s of real time while clocks run
  | { type: 'END_GAME' }
  | { type: 'BACK_TO_CONFIG' }
  | { type: 'ADD_PLAYER'; team: TeamId; number: string; name: string }
  | { type: 'REMOVE_PLAYER'; team: TeamId; id: string }
  | { type: 'SET_GOAL_PLAYERS'; team: TeamId; scorerId: string | null; assistId: string | null };
