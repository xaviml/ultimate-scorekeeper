export const en = {
  appTitle: 'Ultimate Scorekeeper',

  // Config screen
  templateSelectLabel: 'Template',
  templatePredefinedGroup: 'Predefined',
  templateCustomGroup: 'Your templates',
  templateGrassName: 'Grass',
  templateBeachName: 'Beach',
  saveAsTemplateBtn: 'Save as template',
  saveTemplateTitle: 'Save as template',
  saveTemplateHint:
    'Saves these rule settings for reuse — not the teams, coin toss results or players.',
  saveTemplateNamePlaceholder: 'e.g. Summer League',
  btnDeleteTemplate: 'Delete template',
  confirmDeleteTemplateTitle: 'Delete saved template?',
  confirmDeleteTemplate: 'Delete "{name}"? This cannot be undone.',
  setupTitle: 'Game setup',
  division: 'Division',
  divisionOpen: 'Open',
  divisionWomen: "Women's",
  divisionMixed: 'Mixed',
  fieldNumber: 'Field',
  teamA: 'Team 1',
  teamB: 'Team 2',
  teamName: 'Team name',
  teamColor: 'Color',
  addAsNewTeam: 'Add "{name}" as a new team',
  deleteTeamAria: 'Delete saved team {name}',
  clearTeamNameAria: 'Clear {name}',
  confirmDeleteTeamTitle: 'Delete saved team?',
  confirmDeleteTeam:
    'Delete "{name}" and its saved roster from this device? This cannot be undone.',
  btnDeleteTeam: 'Delete team',
  mixedRatioRule: 'Mixed gender-ratio rule',
  ruleA: 'Rule A — prescribed (alternates every 2 points)',
  ruleB: 'Rule B — end zone decides each point',
  coinToss: 'Coin toss results',
  coinTossHelp: 'Ask the captains to flip a disc before the game, then record the results here.',
  startingOffense: 'Team receiving the first pull (offense)',
  startingSide: 'Team starting on the left side',
  startingRatio: 'Starting gender ratio',
  ratioMale: 'Men',
  ratioFemale: 'Women',
  startingTimeEnabled: 'Game has a scheduled starting time',
  startingTimeLabel: 'Starting time',
  startingTimeInPast: 'Starting time must be later than the current time',
  winConditions: 'Win conditions',
  targetScore: 'Score',
  halfScore: 'Score',
  timeLimit: 'Time (minutes)',
  halfTimeLimit: 'TIME (Minutes)',
  halfTimeBreak: 'break (seconds)',
  endCapLabel: 'CAP',
  endCapNone: 'No CAP — finish the current point',
  endCapPlus: 'CAP +{n}',
  endCapCond:
    'Conditional CAP +{n} (only if the score difference after the current point is > {x})',
  capDiff: 'Required difference',
  halfTimeTitle: 'Half-time',
  halfCapPlus: 'CAP +1',
  timeoutsTitle: 'Timeouts',
  timeoutsEnabled: 'Allow timeouts',
  timeoutsCount: 'Per team',
  timeoutsScope: 'Allowance',
  timeoutsScopeHalf: 'Per half',
  timeoutsScopeGame: 'Per game',
  timeoutDuration: 'Timeout duration (seconds)',
  timeoutLastFive: 'Disallow timeouts in the last 5 minutes of the game',
  waterBreakTitle: 'Water breaks',
  waterBreakHelp:
    "Hot-weather hydration breaks (WFDF Appendix B4.3): extra stops between points, decided by the tournament officials. They never come out of either team's timeouts. You can also call one by hand during the game, from the raised-hand button.",
  waterBreakEnabled: 'Call water breaks automatically',
  waterBreakScores: 'When the first team reaches',
  waterBreakDuration: 'Water break duration (seconds)',
  startGame: 'Start game',
  teamsRequired: 'Enter or select both team names to start',
  duplicateTeamNames: 'Team names must be different',
  halfScoreInvalid: 'Half-time score must be lower than the target score',
  language: 'Language',
  aboutBtn: 'About the app',
  aboutTitle: 'About',
  aboutStoryBold: 'Ultimate Scorekeeper',
  aboutStory: " is designed for scorekeepers who don't necessarily know the sport.",
  aboutStory2:
    ' A persistent assistance bar tells the scorekeeper exactly what to say and which hand signal to use at every stage of the game, so no prior Ultimate experience is needed to run a match.',
  aboutCreditsLabel: 'Credits',
  aboutDesignedByPrefix: 'Designed, developed and maintained by Xavi #29 from ',
  aboutDesignedBySuffix: '.',
  aboutBasedOnPrefix: 'Based on an Android application, ',
  aboutBasedOnMiddle: ', by Kýkhë #00 ',
  aboutBasedOnSuffix: '.',
  aboutQuestion: 'Questions or suggestions? Open an issue on GitHub:',

  // Install banner — shown above the config/report screens only, never during
  // an in-progress game (that screen has no vertical room to spare).
  installBannerTitle: 'Install Scorekeeper',
  installBannerBody: 'Add it to your home screen for one-tap access and a full-screen view.',
  installBannerIosBody: 'Tap the Share icon, then "Add to Home Screen".',
  installBannerOpenTitle: 'Scorekeeper is installed',
  installBannerOpenBody: 'Open it from your home screen for the best experience.',
  btnInstall: 'Install',
  dismissBanner: 'Dismiss',

  // Statistics
  statsTitle: 'Statistics',
  statsModeLabel: 'What to track',
  statsModeNone: 'No statistics',
  statsModeNoneHint: 'Just the score, clock and gender ratio — nothing else is logged.',
  statsModeGame: 'Game stats',
  statsModeGameHint:
    'Turnovers and calls are logged by team, with no player detail — no roster needed.',
  statsModeTeam: 'Team stats',
  statsModeTeamHint:
    'Goals, assists, turnovers and injuries are attributed by player for the team you pick below. The other team stays at game-stats detail — team only, never a player.',
  statsModePlayer: 'Player stats',
  statsModePlayerHint:
    'Goals, assists, turnovers and injuries are attributed by player, for both teams.',
  trackedTeamLabel: 'Team to track',

  // Players / rosters
  playersTitle: 'Roster',
  collapseSection: 'Collapse {title}',
  expandSection: 'Expand {title}',
  rosterHelp:
    "You can add players once the game is underway — there's no need to fill in the full roster before kickoff.",
  playerNumber: '#',
  playerName: 'Name',
  addPlayer: 'Add',
  removePlayer: 'Remove',
  duplicatePlayer: 'This player is already on the roster',
  close: 'Close',
  noPlayersYet: 'No players added yet.',
  btnPlayers: 'Roster',
  assistDialogTitle: 'Who scored for {team}?',
  whoScored: 'Scorer',
  whoAssisted: 'Assist',
  callahan: 'Callahan',
  callahanToggle: 'Callahan — no assist',
  stoppageDialogTitle: 'What stopped play?',
  stoppageDialogHint:
    'Injury and technical stoppages keep the game clock running at first. SOTG stops it. Either way, the pull, timeout and call clocks wait until play resumes.',
  stoppageKind_injury: 'Injury',
  stoppageKind_technical: 'Technical',
  injuryDialogTitle: 'Who got injured?',
  injuryDialogHint:
    'Optional — pick everyone hurt, from either team, or skip and just log the injury.',
  injuryOtherTeamToggle: 'Also mark {team} as injured (no player)',
  injuryTeamStoppageTitle: 'Injury — which team?',
  injuryTeamStoppageHint: 'Optional — you can skip the team too.',
  technicalStoppageTitle: 'Technical stoppage — who called it?',
  technicalStoppageHint:
    'Equipment, outside interference, and the like. Optional — you can skip the team too.',
  btnNoTeam: 'No team',
  sotgStoppageTitle: 'SOTG stoppage — who called it?',
  sotgStoppageHint: 'Required to apply the stoppage — cancel to not stop the clock after all.',
  turnoverDialogTitle: 'Turnover',
  turnoverDialogHint: 'Optional — you can skip and just log the turnover.',
  whoTurnedOver: '{team} — who lost the disc? (drop, bad pass, stall)',
  whoDefended: '{team} — who forced it? (block, good defense)',
  btnSave: 'Save',
  assistedBy: 'assist: {name}',
  turnoverBy: 'turn: {name}',
  defenseBy: 'D: {name}',

  // Dashboard
  field: 'Field {n}',
  half1: '1st half',
  half2: '2nd half',
  gameClock: 'Game clock',
  timeBeforeGame: 'Time before game',
  pullTimer: 'Pull timer',
  timeoutTimer: 'Timeout',
  halftimeTimer: 'Half-time',
  waterBreakTimer: 'Water break',
  pauseLabel: 'Paused',
  pullThrown: 'Pull thrown',
  openReport: 'Open report',
  btnPauseGame: 'Pause game',
  btnResumeGame: 'Resume game',
  confirmPauseGame:
    'Only stop the game for a SOTG stoppage, a tournament technical stoppage, a prolonged stoppage, or inclement weather. The clock will stop until you resume.',
  confirmPauseGameTitle: 'Pause game?',
  btnPauseGameConfirm: 'Pause game',
  btnStoppage: 'Stoppage',
  btnTurnover: 'Turn',
  // Accessible name/tooltip for the Turn button, which does two things: tap to
  // record a turnover, hold to take the last one back — the same tap/hold pair the
  // score panels use.
  btnTurnoverHold: 'Turnover — hold to undo',
  // Accessible name for the raised-hand button, which is the one action-row
  // control with no visible micro-label: "Stop" read as a command rather than a
  // question, and neither "Stoppage" nor "SOTG" covers what the other opens.
  btnStoppageSotg: 'Stoppage or SOTG',
  btnSotg: 'SOTG',
  btnEndHalftime: 'End half-time',
  btnEndWaterBreak: 'End water break',
  btnWaterBreak: 'Water break',
  waterBreakHint:
    'A hydration break between points. It costs neither team a timeout, and it lasts until you end it.',
  btnSettings: 'Settings',
  btnLog: 'Log',

  // Action-row micro-labels: rendered uppercase under the glyph in portrait and
  // beside it in landscape, so they have to stay short enough for a 60px button
  // (~7 characters at 9px). Deliberately English in every dictionary — Ultimate
  // vocabulary is English on Spanish and Catalan fields too, and it keeps the
  // widths identical across languages.
  lblTurn: 'Turn',
  lblCall: 'Call',
  lblLog: 'Log',
  lblRoster: 'Roster',
  btnEndGame: 'End game',
  btnBackToSetup: 'Back to setup',
  btnEndTimeout: 'End timeout',

  // The header menu. It holds the one way off this screen (which of the three it
  // is depends on the game's status) plus the two things that are only readable
  // from here: the setup the game is being played under, and the walkthrough,
  // which until now was reachable only before kickoff.
  menuTitle: 'Menu',
  menuGameSetup: 'Game setup',
  menuGuide: 'How to use this app',

  // Read-only view of state.config. Most labels are shared with the setup form —
  // only the values it has to write out as sentences live here.
  setupScheduled: 'Scheduled',
  setupStarted: 'Started',
  // The setup form's own labels carry "(seconds)" because its inputs are typed in
  // seconds. Here the value writes its own unit (1' 15''), so the label doesn't.
  setupBreak: 'Break',
  setupDuration: 'Duration',
  setupNoCap: 'No CAP',
  setupNoTimeouts: 'No timeouts in this game.',
  setupSidesNote: 'The teams swap ends after every point, and again at half-time.',
  setupCapInForce: 'A cap has already been applied — the game is now to {n}.',
  confirmEndGame: 'End the game now and open the report?',
  confirmEndGameTitle: 'End game?',
  confirmLeaveGame: 'You will go back to game setup. The current score and clock will be lost.',
  confirmLeaveGameTitle: 'Leave the game?',
  btnLeaveGameConfirm: 'Leave',
  btnCancel: 'Cancel',
  btnConfirm: 'End game',
  btnDone: 'Done',
  timeoutsLeft: '{n} timeouts left',
  currentRatio: 'Ratio: {gender}',
  pullChip: 'Pull: {team} ({side})',
  // Short, glanceable cap indicators. The `Range` wording is the horn's own moment:
  // the point in progress will settle the target on one of two numbers, and naming
  // both beats telling the volunteer to wait for one the game may already have
  // decided (see capTargetOptions).
  halfCapChip: 'Half at {n}',
  gameCapChip: 'Game at {n}',
  halfCapChipRange: 'Half at {a} or {b}',
  gameCapChipRange: 'Game at {a} or {b}',
  // The game chip's own wording once isUniversePoint is true — it replaces "Game at
  // {n}" outright rather than stacking a second badge with the same number. No Range
  // counterpart: universe point can't coincide with an unresolved cap range (see the
  // comment on CapChip in GameScreen.tsx).
  universePointChip: 'Universe point at {n}',
  capTargetTitleHalf: 'Where does the half end?',
  capTargetTitleGame: 'Where does the game end?',
  capTargetHint:
    'The point being played when the horn sounded decides this. Set it yourself if the goal was scored before the horn.',
  capTargetOption: 'At {n}',
  sideLeft: 'Left',
  sideRight: 'Right',
  target: 'Target: {n}',

  // Calls — the dialog behind the shout-bubble button. Everything in it is one
  // answer to one question ("what was called?"), which is why travel belongs here
  // and turnovers, stoppages and notes do not.
  callDialogTitle: 'What was called?',
  callDialogHint: 'Recording a call does not change the score or the clock.',
  btnTravel: 'Travel',
  btnNote: 'Event',
  callKind_foul: 'Foul',
  callKind_stallOut: 'Stall out',
  callKind_pick: 'Pick',
  callKind_discDown: 'Disc down',
  callKind_out: 'Out',
  callKind_offside: 'Off-side',
  callKind_generic: 'Call',
  callTeamTitle: '{kind} — who called it?',
  callTeamHint: 'Then answer how it ended with the buttons that appear above the clocks.',
  travelTeamTitle: 'Travel — who called it?',
  travelTeamHint: 'Recorded as soon as you pick a team — no follow-up needed.',
  callResolution_accepted: 'Accepted',
  callResolution_contested: 'Contested',
  callResolution_retracted: 'Retracted',
  callResolvedIn: 'resolved in {n}s',
  callBlockedPending: 'Resolve the call in progress first.',
  callBlockedPull: 'Calls need the pull thrown first.',
  stoppagePending: '{kind} — play has not resumed yet.',
  btnStoppageResolved: 'Play can resume',
  noteTitle: 'Event',
  noteHint: 'Anything worth remembering — a huge layout, a dragon flying over the field...',
  notePlaceholder: 'What happened?',

  // Hand-signal dialog (floats over the score panels) — the official WFDF signal to make
  handSignal: 'Hand signal',
  signal_goal: 'Goal',
  signal_timeout: 'Time-out',
  signal_stoppageInjury: 'Injury stoppage',
  signal_stoppageTechnical: 'Technical stoppage',
  signal_sotg: 'Spirit stoppage',
  signal_ratioMale: 'Ratio: Men',
  signal_ratioFemale: 'Ratio: Women',
  // One caption per blast count — the badge on the picture says how many, and the
  // caption doubles as the image's alt text, so it has to say it too.
  signal_whistle1: 'Single whistle',
  signal_whistle2: 'Double whistle',
  signal_whistle3: 'Triple whistle',
  signal_universePoint: 'Universe point',
  signal_travel: 'Travel',
  signal_foul: 'Foul',
  // WFDF has no dedicated stall-out pictogram; the timing signal is the closest fit.
  signal_stallOut: 'Stall out',
  signal_pick: 'Pick',
  signal_discDown: 'Disc down',
  signal_out: 'Out',
  signal_offside: 'Off-side',
  signal_call: 'Play stopped',
  signal_accepted: 'Uncontested',
  signal_contested: 'Contested',
  signal_retracted: 'Retracted',

  // Call-outs (green) — the exact words to shout, shown briefly with the signal
  say_startSoon: '"One minute to start!"',
  say_gameOn: '"Game on!"',
  say_secondHalf: '"Second half — game on!"',
  say_score: '"{a} {as}, {b} {bs}!"',
  say_halfAt: '"{a} {as}, {b} {bs} — half at {halfN}!"',
  say_gameAt: '"{a} {as}, {b} {bs} — game at {n}!"',
  say_ratio: '"{gender}"',
  say_scoreCorrection: '"Score correction — {a} {as}, {b} {bs}!"',
  say_discIn: '"Disc in!"',
  say_timeout: '"Timeout, {team}!"',
  say_timeIn: '"Time in — pull clock restarts!"',
  say_playRestart: '"Play on — disc live!"',
  say_injury: '"Injury — stop play!"',
  say_technicalStoppage: '"Technical stoppage!"',
  say_spirit: '"Spirit stoppage!"',
  say_halftime: '"Half-time! {halfTeam} pulls from the {halfSide}!"',
  say_waterBreak: '"{a} {as}, {b} {bs} — water break!"',
  say_waterBreakDue: '"Water break over — both teams back to the line!"',
  say_waterBreakOver: '"Time in — pull clock restarts!"',
  say_timeCap: '"Time cap — game to {n}!"',
  say_timeCapFinish: '"Time! Finish this point — the game ends after it!"',
  say_timeCapPending: '"Time cap — finish this point!"',
  say_halfCap: '"Half cap — half at {halfN}!"',
  say_halfCapNone: '"Half-time after this point!"',
  say_halfCapPending: '"Half cap — finish this point!"',
  say_gameOver: '"Game over — {a} {as}, {b} {bs}!"',
  say_universePoint: '"{a} {as}, {b} {bs} — Universe point!"',
  say_travel: '"Travel!"',
  say_callFoul: '"Foul — {team}!"',
  say_callStallOut: '"Stall out — {team}!"',
  say_callPick: '"Pick — {team}!"',
  say_callDiscDown: '"Disc down — {team}!"',
  say_callOut: '"Out — {team}!"',
  say_callOffside: '"Off-side — {team}!"',
  say_callGeneric: '"Call by {team} — play stopped!"',
  // Same call-outs, minus the attribution, for a call logged without a team
  // (Track game activity off) — "Foul!" reads far better than "Foul — No team!".
  say_callFoulNoTeam: '"Foul!"',
  say_callStallOutNoTeam: '"Stall out!"',
  say_callPickNoTeam: '"Pick!"',
  say_callDiscDownNoTeam: '"Disc down!"',
  say_callOutNoTeam: '"Out!"',
  say_callOffsideNoTeam: '"Off-side!"',
  say_callGenericNoTeam: '"Call — play stopped!"',
  say_resolutionAccepted: '"Uncontested — play on!"',
  say_resolutionContested: '"Contested — disc back to the thrower!"',
  say_resolutionRetracted: '"Retracted — play on!"',

  // Status line (amber) — what is happening now and what to do about it
  now_setup: 'Press "Start game" when the teams are ready to open the pull.',
  now_awaitingStart:
    'Waiting for the scheduled kickoff. Play unlocks automatically once it arrives, or press "Start game" to begin early.',
  now_awaitingPull: 'Teams are lining up. Press "Pull thrown" the moment the disc is thrown.',
  now_discInPlay: "Disc in play. Tap a team's panel when they score in the opposite end zone.",
  // Same two lines with the tail that says the target is editable — shown for as long
  // as a capped target is still in doubt, which is the only window the tap does
  // anything in (see capTargetOptions).
  now_awaitingPullCap:
    'Teams are lining up. Press "Pull thrown" the moment the disc is thrown. Tap the target above if the goal beat the horn.',
  now_discInPlayCap:
    "Disc in play. Tap a team's panel when they score in the opposite end zone. Tap the target above if the goal beat the horn.",
  // Same again, with the reminder to keep making the gender-ratio signal while a
  // mixed ratio is in play — the picture stays on screen for this (see SignalCard),
  // but the volunteer is the one who has to keep making it with their hands.
  now_awaitingPullRatio:
    'Teams are lining up. Press "Pull thrown" the moment the disc is thrown. Hold the signal until you\'re sure the lines are set correctly.',
  now_awaitingPullCapRatio:
    'Teams are lining up. Press "Pull thrown" the moment the disc is thrown. Tap the target above if the goal beat the horn. Hold the signal until you\'re sure the lines are set correctly.',
  now_timeout: 'Timeout running. It ends on its own, or press "End timeout".',
  now_toReady30: 'Timeout ending — 30 seconds until the offence must be set. One whistle at 30.',
  now_toReady15: '15 seconds until the offence must be set. Two whistles when the time is up.',
  now_toReady0: 'Offence should be set — three whistles and the disc goes live.',
  now_halftime:
    'Half-time break — {halfTeam} pulls from the {halfSide} to start the second half. Resumes automatically when the clock runs out, or press "End half-time" if both teams are ready sooner.',
  now_halftimeWarn:
    'One minute until the second half — {halfTeam} pulls from the {halfSide}. One whistle — teams should be getting ready.',
  now_waterBreak:
    'Water break — the players are drinking and the game clock keeps running. Press "End water break" once both teams are back at the line; the app tells you when the time is up.',
  now_waterBreakDue:
    'The water break time is up — send both teams back to the line and press "End water break".',
  now_stoppagePending:
    '{kind} stoppage. The pull, timeout and call clocks are on hold — press "Play can resume" above the clock the moment play can go on.',
  now_callPending:
    '{kind} called by {team}. Play is stopped and the score is locked — tap "Accepted", "Contested" or "Retracted" above the clock once the players have decided.',
  now_callPendingNoTeam:
    '{kind} called. Play is stopped and the score is locked — tap "Accepted", "Contested" or "Retracted" above the clock once the players have decided.',
  now_callWaitCaptains:
    '{kind} called by {team} — 15 seconds in. Captains should step in to help resolve it.',
  now_callWaitCaptainsNoTeam:
    '{kind} called — 15 seconds in. Captains should step in to help resolve it.',
  now_callWait:
    'Still unresolved after 45 seconds — three whistles now, and three more at 60. Play should be treated as contested. Resolve it above the clock as soon as the players have decided.',
  now_callWaitLong:
    'Still unresolved after 60 seconds — six whistles so far. Repeat the call if play has not restarted. Resolve it above the clock as soon as the players have decided.',
  now_paused: 'Spirit stoppage. Clock paused — press "Resume game" to continue.',
  now_pauseManual: 'Game paused. Clock stopped — press "Resume game" to continue.',
  now_stoppageClockStopped:
    'Game stopped: the stoppage has lasted more than 2 minutes. Press "Resume game" once play can resume.',
  now_finished: 'Game finished.',
  now_pull45: 'Single whistle — 45 seconds. Teams should be getting ready.',
  now_pull60: 'Double whistle — 60 seconds. Teams must signal readiness.',
  now_pull75: 'Triple whistle — 75 seconds. The pull MUST be thrown now.',
  now_universePoint: 'Universe point — {a} {as}, {b} {bs}. The next goal wins the game!',

  assist_blocked_gameNotStarted: 'The game has not started yet.',
  assist_blocked_pullNotThrown: 'Press "Pull thrown" first — the disc is not in play.',
  assist_blocked_gamePaused: 'Score locked while the game is paused.',
  assist_blocked_timeoutActive: 'Not available during a timeout.',
  assist_blocked_halftimeActive: 'Not available during half-time.',
  assist_blocked_waterBreakActive: 'Not available during a water break.',
  assist_blocked_waterBreakNotNow:
    'A water break can only be called between points — after a goal, before the pull is thrown.',
  assist_blocked_minScoreZero: 'The score cannot go below 0.',
  assist_blocked_notLastScorer: 'Only the most recent goal can be undone (long-press that team).',
  assist_blocked_gameFinished: 'The game is finished.',
  assist_blocked_nothingToUndo: 'There is no goal to undo yet.',
  assist_blocked_callPending: 'Resolve the pending call first.',
  assist_blocked_stoppageInProgress:
    'A stoppage is already in progress — resolve that one before calling another.',
  assist_blocked_timeoutLastFive: 'Timeouts are not allowed in the last 5 minutes.',
  assist_blocked_timeoutNoneLeft: 'No timeouts left for this team.',
  assist_blocked_timeoutNotNow: 'Timeouts can only be called during play.',
  assist_blocked_noTurnoverToUndo: 'No turnover to undo in this point.',

  // Report
  reportTitle: 'Final report',
  reportStarted: 'Started: {time}',
  reportFinished: 'Finished: {time}',
  reportDuration: 'Duration: {duration}',
  finalScore: 'Final score',
  statOLineHolds: 'O-line holds',
  statCleanHold: 'Clean holds',
  statBreakChances: 'Break chances',
  statTurnovers: 'Turnovers',
  statBreaks: 'Break points',
  statCleanBreaks: 'Clean breaks',
  statAvgHold: 'Avg. hold time',
  statAvgBreak: 'Avg. break time',
  statTimeouts: 'Timeouts used',
  playerStatsTitle: 'Player stats',
  filterAllTeams: 'All',
  colPlayer: 'Player',
  colGoals: 'Goals',
  colAssists: 'Assists',
  colTotal: 'Total',
  unassignedPlayers: 'Not recorded',
  reportFooterCredit: 'This game was tracked with:',
  historyTitle: 'Game history',
  colClock: 'Clock',
  colEvent: 'Event',
  colTeam: 'Team',
  colDetail: 'Detail',
  // The log's actions column: a pencil on every row whose attribution can still be
  // fixed, a bin on the newest row when it is one that can be taken back.
  colActions: 'Actions',
  btnEditEntry: 'Fix this entry',
  btnDeleteEntry: 'Delete this entry',
  logEditHint: 'This only corrects the log — the score, the clock and possession stay as they are.',
  logEditCallTitle: '{kind} — fix the call',
  whoCalled: 'Who called it',
  howResolved: 'How it ended',
  // Duration of a stopped clock, on the row that says play resumed.
  logLasted: 'lasted {n}s',
  // Duration of a pull that ran past the 75s limit — see latePull.
  logPullTook: 'Thrown after {n}s',
  // How long the point took, on the goal that ended it. {d} is already formatted
  // ("25s", "1m 30s") — see formatSeconds.
  logPointLasted: 'in {d}',
  shareImage: 'Share',
  shareImagePreparing: 'Preparing…',
  shareImageSaved: 'Image saved',
  shareImageFailed: "Couldn't create the image",
  copyReport: 'Copy to clipboard',
  copied: 'Copied!',
  copyFailed: 'Copy failed — try again',
  newGame: 'New game',
  event_gameStart: 'Game start',
  event_goal: 'Goal',
  event_undo: 'Score correction (undo)',
  event_latePull: 'Late pull (over 75s)',
  event_timeout: 'Timeout',
  event_timeoutEnd: 'Timeout ended',
  event_stoppage: 'Stoppage',
  event_stoppageResolved: 'Stoppage resolved',
  event_stoppageClockStopped: 'Game clock stopped (stoppage over 2 min)',
  event_turnover: 'Turnover',
  event_undoTurnover: 'Possession correction (undo)',
  event_travel: 'Travel',
  event_call: 'Call made',
  event_callResolved: 'Call resolved',
  event_note: 'Event',
  event_sotgStart: 'SOTG stoppage (clock paused)',
  event_sotgEnd: 'SOTG stoppage ended',
  event_pauseStart: 'Game paused (clock stopped)',
  event_pauseEnd: 'Game resumed',
  event_halftimeStart: 'Half-time',
  event_halftimeEnd: 'Second half started',
  event_waterBreakStart: 'Water break',
  event_waterBreakEnd: 'Water break ended',
  event_timeCap: 'Time cap reached',
  event_halfTimeCap: 'Half-time cap reached',
  event_capTargetSet: 'Target set by hand',
  event_gameEnd: 'Game end',

  // Guide — a full page (not a dialog), reached from the config screen. Written
  // for a volunteer who has never seen an Ultimate game, in the order they will
  // actually use the app.
  guideLink: 'How does this app work?',
  guideTitle: 'How this app works',
  guideSubtitle: 'A walkthrough for first-time scorekeepers',
  guideBackShort: 'Back',
  guideIntro:
    'You do not need to know Ultimate Frisbee to keep score with this app. Work through these steps in order — during the game the app tells you what is happening, what to do next and the exact words to shout.',
  guideScreenshotNote:
    'The screenshots are in English. The app itself uses the language you pick above.',

  guideSportTitle: 'The sport in one minute',
  guideSportBody:
    'Two teams of seven pass a disc to each other. A team scores one point when one of its players catches the disc inside the end zone it is attacking. Nobody may run while holding the disc, and if it hits the ground or is intercepted the other team takes over on the spot.',
  guideSportPull:
    'Every point starts with a pull: the defending team throws the disc down the field, like a kick-off. After each goal the teams swap ends and the team that just scored pulls to the other one.',
  guideSportRole:
    'There are no referees — the players call their own fouls and sort them out between themselves. You are not refereeing either. You keep the score and the clocks, and you announce the handful of things both teams need to hear: the pull countdown, the score, the gender ratio, half-time, the caps and the end of the game.',

  guideStep1Title: 'Set up the game',
  guideStep1Body:
    'The first screen describes the game you are about to keep. Most of it is filled in for you — usually you only have to type the two team names.',
  guideStep1Template: 'Template',
  guideStep1TemplateBody:
    'Grass and Beach preset every rule below with the usual values for that surface. If your tournament plays something else, change the fields and press "Save as template" at the bottom to reuse them next time.',
  guideStep1Division: 'Division',
  guideStep1DivisionBody:
    "Open, Women's or Mixed. Mixed adds the gender ratio, which you will have to announce every point (step 7).",
  guideStep1Teams: 'Team names and colours',
  guideStep1TeamsBody:
    'Type each name, or pick a team you saved earlier. Choose a colour close to the shirts each team is wearing: the score panels are painted in those colours all game, so you never have to remember which side is which.',
  guideStep1Players: 'Statistics',
  guideStep1PlayersBody:
    'Choose what this game tracks. "No statistics" is the default — score, clocks and ratio only, with calls, travels and technical stoppages logged with no team. "Game stats" adds turnovers and calls by team, no roster needed. "Team stats" and "Player stats" attribute goals, assists, turnovers and injuries to a player, once you add the roster below — Team stats for the side you pick, Player stats for both. Anything above "No statistics" also adds two more buttons on the game screen, Roster and Turn.',
  guideStep1Time: 'Scheduled starting time',
  guideStep1TimeBody:
    'Optional. Tick it and the app counts down to the kickoff and unlocks play on its own when it arrives.',

  guideStep2Title: 'Record the coin toss',
  guideStep2Body:
    'Before the game the two captains flip a disc. The winner picks either to receive the pull or which end to defend, and the loser gets the other choice. Ask them what they decided and record it here — the app needs it to know who pulls, which way each team attacks and how the scoreboard is laid out.',
  guideStep2Offense: 'Team receiving the first pull',
  guideStep2OffenseBody:
    'The team that catches or picks up the pull. They attack first; the other team pulls.',
  guideStep2Side: 'Team starting on the left',
  guideStep2SideBody:
    'Left as you see the field from where you are sitting. That team stays on the left of the scoreboard for the whole game, even though the teams themselves swap ends every point.',
  guideStep2Ratio: 'Starting gender ratio',
  guideStep2RatioBody:
    'Mixed games only: whether the first point is played with more women or more men on the field.',

  guideStep3Title: 'Check how the game ends',
  guideStep3Body:
    'A game ends when a team reaches the target score, or when the time runs out — whichever comes first. Read these fields back to the captains if you are not sure; they will know.',
  guideStep3Score: 'Score and time',
  guideStep3ScoreBody:
    'The target score, and how many minutes the game lasts. The clock runs from the first pull to the end of the game and does not stop for timeouts or half-time.',
  guideStep3Cap: 'CAP',
  guideStep3CapBody:
    'What happens when time runs out — and it never happens mid-point. Say the score is 9–7 when the time limit is reached: the point already in progress is played to its finish first, exactly as if there were no cap. Only once that point ends does the cap apply, to whatever the score is by then. If it finishes 10–7, "CAP +1" sets the target to the leader\'s new score plus one — a game to 11, not 10. "No CAP" just ends the game there, at 10–7. The conditional CAP only adds that extra point if the two scores are still close enough once the point is over. You never have to work this out yourself — the app whistles when time is up, waits for the point to finish, then shows the new target and gives you the words to shout.',
  guideStep3Half: 'Half-time',
  guideStep3HalfBody:
    'The same three things again for the first half: the score that triggers half-time, its own time limit and its own cap, plus how long the break lasts.',
  guideStep3Water: 'Water breaks',
  guideStep3WaterBody:
    'Only for hot weather, and off unless the tournament says otherwise. When the officials declare the heat protocol they usually announce breaks at fixed scores — "one when the first team reaches 4, and again at 12". Tick the box, type those scores and the app stops the game for you at each of them. They cost neither team a timeout.',
  guideStep3Timeouts: 'Timeouts',
  guideStep3TimeoutsBody:
    'How many each team may call and how long one lasts. Untick "Allow timeouts" if this tournament has none, and the buttons disappear from the dashboard.',
  guideStep3Start: 'Once both team names are filled in, press "Start game".',

  guideStep4Title: 'Get to know the dashboard',
  guideStep4Body:
    'This is the only screen you will use during the game. Nothing here can be pressed by mistake in a way you cannot take back.',
  guideTour1:
    'Field number, the time of day, which half it is and the score the game is played to. The menu on the left holds this guide, the setup the game is being played under, and the way out of the game.',
  guideTour2:
    'One panel per team, painted in the team colour. This is where you add goals (step 5), and each team\u2019s timeout button sits in the top outer corner of its own panel.',
  guideTour3:
    'Reminders for the point about to be played: who pulls and from which end, the gender ratio, and the target once it has been announced.',
  guideTour4:
    'The one button that matters right now — "Pull thrown" here. It becomes "End timeout", "End half-time" or "Resume game" when one of those is running, and is empty while the disc is in play.',
  guideTour5:
    'The game clock, and next to it the second clock: the seconds since the last goal between points, or the timeout or half-time countdown.',
  guideTour6:
    'The buttons that write to the log: the roster (when player tracking is on), the log itself, a stoppage, a call and a turnover.',
  guideTour7: 'The assistance bar — what to shout and what to do. See step 6.',
  guideTour8:
    'The small pause button next to the game clock. Everything else — a timeout, half-time, a call — already runs without stopping it; only tap this for the extraordinary cases the confirmation asks about: an SOTG stoppage, a tournament technical stoppage, a prolonged stoppage, or bad weather. The clock stops the moment you confirm, and stays stopped until you resume.',

  guideStep5Title: 'Playing a point',
  guideStep5Body:
    'After each goal the teams walk to their ends and line up. The second clock counts the seconds since the goal was scored, and the app whistles for you:',
  guideWhistle45: '45 s — one whistle. Both teams should be nearly ready.',
  guideWhistle60: '60 s — two whistles. Both teams must signal that they are ready.',
  guideWhistle75: '75 s — three whistles. The pull has to be thrown now.',
  guideStep5Pull: 'Press "Pull thrown"',
  guideStep5PullBody:
    "The moment the disc leaves the puller's hand. That is what starts the point — until you press it the score is locked, because a goal cannot happen before the pull.",
  guideStep5Score: 'Tap a panel to score',
  guideStep5ScoreBody:
    "When a team catches the disc in the end zone it is attacking, tap that team's panel once. The score goes up by one and the bar at the bottom hands you the words to shout.",
  guideStep5Undo: 'Long-press a panel to take a goal back',
  guideStep5UndoBody:
    "Tapped the wrong team, or the goal turned out not to count? Press and hold that team's panel for about a second and the goal is removed. A tap adds one, a long press removes one — nothing lowers a score by accident this way. Only the most recent goal can be undone, and the app announces the correction so both teams hear it.",

  guideStep6Title: 'The bar at the bottom is your script',
  guideStep6Green: 'Green, with a speech bubble',
  guideStep6GreenBody:
    'The exact words to shout, out loud, right now. They are already written the way you should say them — just read them. It shows for a few seconds and then steps aside.',
  guideStep6Amber: 'Amber',
  guideStep6AmberBody:
    'What is going on and what you should do about it. This is always there when there is nothing to shout, so when in doubt, read this line.',
  guideStep6Signal: 'The picture that pops up',
  guideStep6SignalBody:
    'A small card over the score panels shows the official hand signal to make while you announce. It disappears on its own, and it can never swallow a tap meant for the panel underneath.',

  guideSignalsTitle: 'When the app whistles',
  guideSignalsIntro:
    'The whistle is how you keep the players aware of time. The app blows it for you — and shows the whistle card at the same moment — in exactly these situations, and nowhere else. Blow your own whistle to match, the number of blasts it tells you.',
  guideSignalHalf: 'The start of a half',
  guideSignalHalfBody:
    'One whistle the instant a half begins — the first pull of the game, and the start of the second half. As a heads-up you also get one whistle a minute before, but only when there is a wait to warn about: a scheduled kickoff, or a half-time break of two minutes or more.',
  guideSignalPoint: 'Before each pull',
  guideSignalPointBody:
    'After a goal, while the teams line up: one whistle at 45 seconds, two at 60, and three at 75 — the pull must be thrown now.',
  guideSignalTimeout: 'The end of a timeout',
  guideSignalTimeoutBody:
    "Only if timeouts were switched on at setup — that is also where each team's allowance and the length of a timeout are set, so a break may run longer or shorter than the app's default. A timeout called before the pull: one whistle the moment the break ends, then the normal 45/60/75 pull count starts fresh. A timeout called after the pull, with the disc already live, winds back into play with a countdown near the end: one whistle 30 seconds before the offence must be set, two at 15, and three when the disc goes live.",
  guideSignalWater: 'The end of a water break',
  guideSignalWaterBody:
    'One whistle the moment you end a water break, to call both teams back to the line — then the normal 45/60/75 pull count starts fresh. The break running out of time is not whistled: that is your cue, not theirs.',
  guideSignalCall: 'A call that drags on',
  guideSignalCallBody:
    'When a foul, pick, travel, stall-out, off-side, disc-down or generic call — or an injury or technical stoppage — is still being sorted out after 45 seconds: three whistles, and three more at 60 seconds. Nothing after that — the app keeps counting the wait, but stops whistling.',
  guideSignalCap: 'A cap, by time',
  guideSignalCapBody:
    'One whistle the instant the time limit lands, and one more once the point in progress ends and the new target is fixed — for the game and, separately, for the half. A target you already knew in advance (say, half at 8) is still announced a goal ahead, but never whistled — only a target the clock decided gets a whistle.',

  guideStep7Title: 'Gender ratio (mixed games only)',
  guideStep7Body:
    'In mixed divisions the number of women and men on the field is fixed for each point and changes as the game goes on. Teams lose track of it constantly, so announcing it is one of the most useful things you do.',
  guideStep7Chip:
    'The ratio for the coming point is shown as a chip above the score panels. It flashes when it changes — shout it so both teams line up correctly. Tap the chip to show the hand signal again.',
  guideStep7Rules:
    'Which ratio rule applies is set at setup: Rule A follows a fixed sequence that alternates every two points, and the app tracks it for you. Rule B lets the end zone decide it each point, so there is nothing to announce. If you do not know which one is being used, ask the captains.',

  guideStep8Title: 'Timeouts, half-time and caps',
  guideStep8Timeout: 'Timeout',
  guideStep8TimeoutBody:
    "When a team calls one, press the small button in the top corner of that team's own score panel; the number beside it is how many they have left. A countdown starts and the app whistles when time is up. The game clock keeps running throughout — that is normal.",
  guideStep8Half: 'Half-time',
  guideStep8HalfBody:
    'The app calls half-time by itself as soon as a team reaches the half score, and never in the middle of a point. The break is a countdown; press "End half-time" if both teams are ready sooner. Afterwards the teams swap ends and the app tells you so.',
  guideStep8Water: 'Water break',
  guideStep8WaterBody:
    'In hot weather the officials add breaks so the players can drink. If they were set up at step 1 the app calls them by itself, at the scores agreed, right after a goal. You can also call one at any point between points: press the raised hand and choose "Water break". This one does not end on its own — the clock counts up, turns amber when the agreed time is up, and the bar tells you to send both teams back. Press "End water break" when they are at the line.',
  guideStep8Cap: 'Caps',
  guideStep8CapBody:
    'When the time limit is reached the app whistles, but the target is not fixed yet — the point already being played finishes first, exactly as if there were no cap. Only then does the app work out the new target from that finished score, show it as a chip and give you the sentence to shout. There is nothing to calculate.',
  guideStep8Universe: 'Universe point',
  guideStep8UniverseBody:
    'When the next goal wins the game, a badge says so and the bar gives you the call. Announce it — both teams want to know.',

  guideWaterTitle: 'Water breaks in hot weather',
  guideWaterIntro:
    'This one is worth knowing, because you are the person the captains will ask why the game is stopping. Hydration breaks are not in the rules of play themselves — they are in the Appendix to the WFDF Rules of Ultimate (2025-2028), section B4.3, "Hot Weather".',
  guideWaterWho: 'Who decides',
  guideWaterWhoBody:
    'The tournament officials, day by day. There is no temperature written into the rule: the officials judge the real risk, usually with a heat index that combines temperature, humidity and wind (WBGT and the like). If they decide the heat is a health risk, they must tell every team captain and say which protocol applies (B4.3.1, B4.3.2).',
  guideWaterAdjust: 'What they may change',
  guideWaterAdjustBody:
    'Three things, once conditions count as extreme (B4.3.3): add hydration breaks between points so players can rest and drink (B4.3.3.1), move the schedule away from the hottest part of the day, or suspend the game — for a while or for good.',
  guideWaterPractice: 'How it usually looks',
  guideWaterPracticeBody:
    'WFDF puts these breaks in the transitions rather than forcing them mid-half the way some other bodies do. In practice, when the heat protocol is declared before the game, the officials announce mandatory 3-minute hydration breaks that trigger when the first team reaches a set score — most often 4 and 12.',
  guideWaterTimeouts: 'They are free',
  guideWaterTimeoutsBody:
    "A break the organisers decree does not come out of either team's timeouts. Both teams still have every timeout they started with, whatever the app just stopped the game for.",
  guideWaterYou:
    'So: ask the officials at the start of the day whether the heat protocol is on and at which scores. Put those scores into the water breaks section at setup, and the app calls each break for you, right after the goal that reaches it. If one is called that you had not set up, press the raised hand between points and choose "Water break".',
  guideStep9Title: 'Writing down what happens',
  guideStep9Body:
    'The row under the clocks logs anything worth remembering: the speech bubble for a call, the raised hand for a stoppage, the two arrows for a turnover. None of them change the score or the target — they write to the log, and tell you what to announce.',
  guideStep9Calls:
    'Foul, Stall out, Pick, Off-side, Disc down, Call — something a player called. Three buttons then appear above the clocks: Accepted, Contested, Retracted. Ask the players how it ended and press the matching one; the app records how long the discussion took.',
  guideStep9Travel:
    'Travel — called on a thrower who moves illegally. Recorded in one step, with no follow-up.',
  guideStep9Turn:
    'Turn — only on screen once this game is tracking anything besides the score (step 1): logs a turnover, so the disc changes hands without a goal. From the first one on, a "Possession" chip on the scoreboard says who has the disc during every point. Press and hold Turn to take back the last turnover of the point if you tapped it by mistake.',
  guideStep9Stoppage:
    'Raised hand — injury or technical (equipment, outside interference, ...). The game clock keeps running. Once play can resume, press "Play can resume" to log how long the stoppage took.',
  guideStep9Sotg:
    'SOTG — a spirit stoppage, behind the same raised hand. This is the only one of the three that pauses the game clock; press "Resume game" when play restarts.',
  guideStep9StoppageAnytime:
    'The raised hand works at any moment of the game — between points, during a timeout or half-time, even in the middle of a call. Whatever was counting down (the pull, the timeout, the discussion) freezes and picks up exactly where it was once play resumes. Only one stoppage at a time: resolve the open one before calling the next.',
  guideStep9Log:
    'The list button opens everything recorded so far, in order, so you can check what you logged.',
  guideStep9Note:
    'Inside that list, "Event" adds free text for anything else you want in the report.',

  guideStep10Title: 'End of the game',
  guideStep10Body:
    'The app ends the game on its own when a team reaches the target. If you have to stop earlier, press the ✕ in the top-left corner, next to the field number, and confirm.',
  guideStep10Report:
    'You then get the report: the final score, a few statistics for each team and the full history of the game. "Share" sends a picture of the score and the stats straight to a chat — the log is left out, so it stays readable. "Copy to clipboard" turns everything, log included, into plain text you can paste into a message or a spreadsheet — do that before you leave the screen. "New game" takes you back to setup for the next match.',

  guideCheatTitle: 'Quick reference',
  guideCheatTap: 'Tap a team panel',
  guideCheatTapDo: 'Add a goal for that team',
  guideCheatHold: 'Long-press a team panel',
  guideCheatHoldDo: "Take back that team's last goal",
  guideCheatGreen: 'Green bar',
  guideCheatGreenDo: 'Shout exactly what it says',
  guideCheatAmber: 'Amber bar',
  guideCheatAmberDo: 'What is happening and what to do',
  guideCheatWhistle: 'One / two / three whistles',
  guideCheatWhistleDo: '45 / 60 / 75 seconds since the goal',
  guideCheatChip: 'Tap the ratio chip',
  guideCheatChipDo: 'Show its hand signal again',
  guideCheatLocked: 'Score will not go up',
  guideCheatLockedDo: 'The pull has not been thrown, or play is stopped',

  guideFigSetupAlt: 'The top of the setup screen: template, division and team names',
  guideFigTossAlt: 'The coin toss and win conditions sections of the setup screen',
  guideFigGameAlt: 'The dashboard between points, waiting for the pull',
  guideFigScoreAlt: 'The dashboard with the disc in play',
  guideFigRecordAlt: 'The call dialog',
  guideFigRulesAlt: 'The win conditions, half-time and timeout sections of the setup screen',
  guideFigReportAlt: 'The final report screen',
};
