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
  /**
   * When true, every player-attributable event (goal, assist, turnover, defense,
   * injury) prompts for who was involved. When false the events are still logged,
   * just without names — no dialog ever interrupts the volunteer.
   */
  trackPlayers: boolean;
  players: Record<TeamId, PlayerInfo[]>;
}

export type GameStatus =
  | 'notStarted' // config done, waiting for first pull
  | 'awaitingPull' // between points: score frozen until the pull is thrown
  | 'live' // disc in play
  | 'paused' // SOTG stoppage
  | 'timeout' // team timeout running
  | 'halftime'
  | 'finished';

export type LogType =
  | 'gameStart'
  | 'goal'
  | 'undo'
  | 'timeout'
  | 'timeoutEnd'
  | 'injury'
  | 'turnover'
  | 'sotgStart'
  | 'sotgEnd'
  | 'halftimeStart'
  | 'halftimeEnd'
  | 'timeCap'
  | 'halfTimeCap'
  | 'gameEnd';

export interface LogEntry {
  id: number;
  wallClock: string; // real-world time, e.g. "17:42:05"
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
}

export interface GameState {
  phase: 'config' | 'game' | 'report';
  config: GameConfig;
  status: GameStatus;
  statusBeforePause: GameStatus | null;
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
  points: PointRecord[];
  log: LogEntry[];
  history: GoalSnapshot[]; // undo stack for goals
  nextLogId: number;
  /** Transient hint key for the Assistance Message Bar. */
  assist: string;
}

export type Action =
  | { type: 'START_GAME'; config: GameConfig }
  | { type: 'PULL_THROWN' }
  | { type: 'GOAL'; team: TeamId }
  | { type: 'UNDO_GOAL'; team: TeamId }
  | { type: 'REVEAL_NEXT_RATIO' }
  | { type: 'TIMEOUT_START'; team: TeamId }
  | { type: 'TIMEOUT_END' }
  | { type: 'INJURY'; team?: TeamId; playerId?: string }
  | { type: 'TURNOVER'; turnoverId?: string; defenseId?: string }
  | { type: 'SOTG_TOGGLE' }
  | { type: 'HALFTIME_END' }
  | { type: 'TICK' } // 1 s of real time while clocks run
  | { type: 'END_GAME' }
  | { type: 'BACK_TO_CONFIG' }
  | { type: 'ADD_PLAYER'; team: TeamId; number: string; name: string }
  | { type: 'REMOVE_PLAYER'; team: TeamId; id: string }
  | { type: 'SET_GOAL_PLAYERS'; team: TeamId; scorerId: string | null; assistId: string | null };
