export type TeamId = 'A' | 'B';
export type Division = 'open' | 'women' | 'mixed';
export type MixedRule = 'A' | 'B';
export type Gender = 'male' | 'female';

/**
 * The four levels of "how much do we log":
 * - `none` — the basic app: score, clock, ratio. No Roster/Turn buttons, a
 *   call/travel/technical/SOTG stoppage logs with no team attached.
 * - `game` — Turn appears and a call/travel/stoppage asks which team, but
 *   nothing is ever attributed to a specific player (no roster either).
 * - `team` — `game`-level detail for both teams, PLUS a roster and
 *   player-level attribution (goal/assist, a turnover's role, injury) for
 *   `trackedTeam` only. Anything about the other team behaves exactly like
 *   `game` — team-only, never a player picker.
 * - `player` — full detail: a roster and player-level attribution for both
 *   teams, same as this app always behaved before this mode existed.
 */
export type StatsMode = 'none' | 'game' | 'team' | 'player';

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
 * Hot-weather hydration breaks (WFDF Appendix B4.3): extra stops *between points*
 * that the tournament officials add when the heat is a health risk, and which
 * deliberately do NOT come out of either team's timeouts.
 *
 * `enabled` only governs the automatic ones — the breaks the officials announce
 * before the game ("a break when the first team reaches 4, and again at 12"),
 * which the reducer fires off `atScores` so the volunteer never has to remember
 * them. A break called on the spot is always available from the stoppage dialog,
 * whatever this says (see canWaterBreak).
 */
export interface WaterBreakConfig {
  enabled: boolean; // automatic breaks at `atScores`; manual ones work regardless
  /** Scores that trigger a break, read against the *leading* score — "when the first team reaches N". Each fires at most once. */
  atScores: number[];
  durationSeconds: number; // break duration, in seconds like every other break
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
  waterBreaks: WaterBreakConfig;
  startingTime: StartingTimeConfig;
  /** See `StatsMode`. Replaces the old "Track game activity" checkbox with four levels. */
  statsMode: StatsMode;
  /** The team followed in `team` mode; null in every other mode. */
  trackedTeam: TeamId | null;
  players: Record<TeamId, PlayerInfo[]>;
}

/**
 * Rule settings a template can carry — everything except the per-game choices
 * templates must not touch: teams, coin toss results, players, statsMode/trackedTeam.
 */
export type TemplateSettings = Omit<
  GameConfig,
  | 'teams'
  | 'startingOffense'
  | 'startingSide'
  | 'startingRatio'
  | 'statsMode'
  | 'trackedTeam'
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
  | 'waterBreak' // hydration break between points — never ends on its own, see WATER_BREAK_END
  | 'finished';

/**
 * A call a player makes on the field. Purely observational for the scorekeeper:
 * recording one never touches the score, the clock or possession — it only writes
 * to the log and cues a hand signal.
 *
 * `generic` is the catch-all button (labelled just "Call") for anything the list
 * doesn't name; it signals "play stopped" rather than a specific infraction.
 */
export type CallKind = 'foul' | 'stallOut' | 'pick' | 'discDown' | 'out' | 'offside' | 'generic';

export type CallResolution = 'accepted' | 'contested' | 'retracted';

/**
 * A stoppage covers anything that halts play without a call to dispute: `injury`
 * can be attributed to a player, `technical` (equipment, outside interference, ...)
 * can only be attributed to a team.
 */
export type StoppageKind = 'injury' | 'technical';

/** One person named in an injury stoppage — a collision can hurt players on both sides at once, so the team travels with the id. */
export interface StoppagePlayer {
  team: TeamId;
  playerId: string;
}

export type LogType =
  | 'gameStart'
  | 'goal'
  | 'undo'
  | 'latePull'
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
  | 'waterBreakStart'
  | 'waterBreakEnd'
  | 'timeCap'
  | 'halfTimeCap'
  /** The capped target named by hand from the cap chip (see SET_CAP_TARGET). */
  | 'capTargetSet'
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
  /**
   * Goal entries only: the goal had no assist by definition — a Callahan, caught
   * in the endzone off the opposition's throw. It is what tells an unrecorded
   * assist apart from one that never existed, so the report's "unassigned" line
   * doesn't count it (see `playerStatLines`). Mutually exclusive with `assistId`.
   */
  callahan?: boolean;
  /** Turnover entries only: the attacker who lost the disc (team = attacking team). */
  turnoverId?: string;
  /** Turnover entries only: the defender who forced it, from the other team. */
  defenseId?: string;
  /** `call` and `callResolved` entries: which infraction was called (team = caller). */
  callKind?: CallKind;
  /** `callResolved` entries only. */
  resolution?: CallResolution;
  /**
   * How long the thing that stopped play took, in seconds: `callResolved` and
   * `stoppageResolved` carry the discussion/stoppage timer, `sotgEnd`/`pauseEnd`
   * carry how long the clock was stopped (`pauseElapsedSeconds`), and `latePull`
   * carries how long the pull clock ran before the disc was actually thrown.
   */
  resolutionSeconds?: number;
  /** `stoppage` and `stoppageResolved` entries only. */
  stoppageKind?: StoppageKind;
  /**
   * `stoppage` entries for an injury: the players named, kept structured next to
   * the `detail` label they render as — `detail` is what the log and the report
   * print, this is what the log editor prefills from and re-derives it from.
   */
  stoppagePlayers?: StoppagePlayer[];
}

/**
 * One change the log editor can make to an entry (EDIT_LOG_ENTRY) — the same
 * questions the app asked when it recorded the event, asked again. Every one of
 * them is attribution: an edit never touches the score, the clock or possession,
 * which is what keeps the log editable without re-opening every game rule.
 *
 * `undefined` clears an answer, exactly as it does in the recording actions.
 */
export type LogEdit =
  | { kind: 'goalPlayers'; scorerId?: string; assistId?: string; callahan?: boolean }
  | { kind: 'turnoverPlayers'; turnoverId?: string; defenseId?: string }
  /** The team of a travel, a call, a technical stoppage or an SOTG/manual pause. */
  | { kind: 'team'; team?: TeamId }
  /** A resolved call: who called it and how it ended, the two questions that row answers. */
  | { kind: 'callResolution'; team?: TeamId; resolution: CallResolution }
  | { kind: 'injury'; team?: TeamId; players?: StoppagePlayer[] }
  | { kind: 'note'; text: string };

/**
 * A call that has been made but not yet resolved. While one is open the game
 * screen shows the three resolution buttons above the clocks, and no second call
 * can be started — the volunteer has one thing to answer.
 */
export interface PendingCall {
  kind: CallKind;
  /** Undefined when the call was logged in `statsMode: 'none'` — see StatsMode. */
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
  /**
   * Set for `technical` (the team responsible). For `injury` it is derived: the
   * sole team across every name in `players` plus the generic, no-player team
   * `STOPPAGE.team` can also carry for injury (the `game`-mode team-only picker,
   * or the untracked side of `team` mode's hybrid picker) — undefined once more
   * than one of those is involved at once.
   */
  team?: TeamId;
  /** `injury` only — every named player, each with their own team since an injury can involve people from both sides at once. A technical stoppage is never attributed to a player. */
  players?: StoppagePlayer[];
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
  /** No assist by definition — see `LogEntry.callahan`, which this mirrors. */
  callahan?: boolean;
  /** Turnovers by either team during this point — 0 makes a hold "clean", 1 makes a break "clean" (see teamStats in stats.ts). */
  turnovers: number;
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
  waterBreaksTaken: number[];
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
  /**
   * How long the clock has been stopped, ticked every TICK while `status` is
   * 'paused' and reset each time a pause begins. Same shape and purpose as
   * `pendingCall.elapsedSeconds` and `pendingStoppage.elapsedSeconds`: it is what
   * `sotgEnd`/`pauseEnd` log as `resolutionSeconds`, so the log says how long play
   * was actually halted. A counter rather than a wall-clock difference so it stays
   * deterministic in tests, like the other two.
   */
  pauseElapsedSeconds: number;
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
  /**
   * Turnovers committed by each team over the whole game, net of any undo — a
   * long-press on Turn decrements whichever team gets the disc back, exactly
   * mirroring `pointTurnovers`. Unlike that counter this never resets per point:
   * it's what the report's lifetime Turnovers stat reads. Break chances are a
   * separate computation (see `teamStats` in stats.ts) — it needs no entry in
   * GoalSnapshot — UNDO_GOAL only rewinds the goal itself, not the turnovers
   * already played out earlier in the same, still-in-progress point.
   */
  turnoversCommitted: Record<TeamId, number>;
  gameSeconds: number; // elapsed game clock
  /** Epoch ms of the scheduled kickoff, while status is 'awaitingStart'; null otherwise. */
  startingAtMs: number | null;
  pointStartSeconds: number | null; // gameSeconds when the current pull was thrown
  secondary: {
    /**
     * 'pull' and 'waterBreak' count UP (0 → total), 'timeout' and 'halftime' count
     * DOWN to 0. The two that count down auto-resume when they hit 0 (GameContext);
     * a water break never does — reaching `total` only turns the clock amber and
     * says so, and the volunteer ends it when the teams are actually back.
     */
    kind: 'pull' | 'timeout' | 'halftime' | 'waterBreak';
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
  /**
   * Configured water-break scores (see WaterBreakConfig.atScores) that have already
   * been used up, so each fires at most once. A manual break consumes every score
   * the game has already reached too — otherwise the automatic one would fire again
   * on the very next goal, right after the teams came back from drinking.
   *
   * Restored by UNDO_GOAL from the GoalSnapshot, like every other goal-driven field.
   */
  waterBreaksTaken: number[];
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
  /**
   * The `assist` a just-scored goal would show, held back while `config.trackPlayers`
   * is on so the scorer/assist picker isn't fighting the goal (and gender-ratio, which
   * only auto-reveals off `assist === 'goalScored'`) sign for the volunteer's attention.
   * Released into `assist` by REVEAL_GOAL_ASSIST once the dialog closes (save or cancel).
   */
  pendingGoalAssist: string | null;
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
  /** Dispatched when the post-goal assist/scorer dialog closes (save or cancel): releases `pendingGoalAssist` into `assist`. */
  | { type: 'REVEAL_GOAL_ASSIST' }
  | { type: 'TIMEOUT_START'; team: TeamId }
  | { type: 'TIMEOUT_END' }
  | {
      type: 'STOPPAGE';
      kind: StoppageKind;
      /**
       * `technical`: the team responsible. `injury`: a generic, no-player
       * attribution — the `game`-mode team-only picker, or the untracked
       * side of `team` mode's hybrid picker (see PendingStoppage.team).
       */
      team?: TeamId;
      /** `injury` only — every named player hurt, each with their own team. */
      players?: StoppagePlayer[];
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
  /** Manual hydration break, from the stoppage dialog — only between points (see canWaterBreak). */
  | { type: 'WATER_BREAK_START' }
  | { type: 'WATER_BREAK_END' }
  /**
   * Name the capped target by hand, from the cap chip — the volunteer answering the
   * one thing the app cannot see for itself, which side of the horn a goal fell on
   * (see capTargetOptions). Refused for anything that isn't currently on offer.
   */
  | { type: 'SET_CAP_TARGET'; which: 'game' | 'half'; target: number }
  | { type: 'TICK' } // 1 s of real time while clocks run
  | { type: 'END_GAME' }
  /** "Open report" tap once the game has finished: the only way from 'finished' to phase 'report'. */
  | { type: 'OPEN_REPORT' }
  | { type: 'BACK_TO_CONFIG' }
  | { type: 'ADD_PLAYER'; team: TeamId; number: string; name: string }
  | { type: 'REMOVE_PLAYER'; team: TeamId; id: string }
  | {
      type: 'SET_GOAL_PLAYERS';
      team: TeamId;
      scorerId: string | null;
      assistId: string | null;
      /** A Callahan has no assist, so this clears `assistId` rather than sitting beside it. */
      callahan?: boolean;
    }
  /**
   * Fix an attribution already in the log, from the log dialog's pencil — any
   * entry, however old (see LogEdit and `logEditKind`). Silent and in place: the
   * row changes, nothing is appended, and no call-out or signal fires, because a
   * correction to the bookkeeping is not an event on the field.
   */
  | { type: 'EDIT_LOG_ENTRY'; id: number; edit: LogEdit }
  /**
   * Remove the newest log entry, from the log dialog's bin — only for the handful
   * of types whose state can be rewound completely (see `canDeleteLogEntry`).
   */
  | { type: 'DELETE_LOG_ENTRY'; id: number };
