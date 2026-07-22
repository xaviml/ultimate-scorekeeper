export const en = {
  appTitle: 'Ultimate Scorekeeper',
  tagline: 'A guided assistant for Ultimate Frisbee scorekeepers',

  // Config screen
  templateTitle: 'Template',
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
  fieldNumber: 'Field number',
  teamA: 'Team 1',
  teamB: 'Team 2',
  teamName: 'Team name',
  teamColor: 'Color',
  addAsNewTeam: 'Add "{name}" as a new team',
  deleteTeamAria: 'Delete saved team {name}',
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
  timeoutsPerHalf: 'Per team, per half',
  timeoutsPerGame: 'Per team, per game',
  timeoutDuration: 'Timeout duration (seconds)',
  timeoutLastFive: 'Disallow timeouts in the last 5 minutes of the game',
  startGame: 'Start game',
  teamsRequired: 'Enter or select both team names to start',
  language: 'Language',
  aboutBtn: 'About',
  aboutTitle: 'About',
  aboutBackgroundLabel: 'Background',
  aboutStory:
    'This app is designed for those scorekeepers at Ultimate Frisbee tournaments in our area — often with little or no knowledge of the sport itself. Kýkhë from EUC built an Android app to help these scorekeepers keep up with pull time, gender ratio, half-time and time-outs, but it was never published to the Play Store, so it only reached players with an Android phone and a direct install link.',
  aboutStory2:
    "This project carries that same mission forward: rebuilt to run on any device, with usability and experience improved along the way. The goal hasn't changed — make those scorekeepers' jobs easier, and spare both teams the frustration of losing track of the pull count or the gender ratio mid-game.",
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

  // Players / rosters
  playersTitle: 'Players',
  collapseSection: 'Collapse {title}',
  expandSection: 'Expand {title}',
  trackPlayers: 'Track player activity (goals, assists, turnovers, defense, injuries)',
  playerNumber: '#',
  playerName: 'Name',
  addPlayer: 'Add',
  removePlayer: 'Remove',
  close: 'Close',
  noPlayersYet: 'No players added yet.',
  btnPlayers: 'Players',
  assistDialogTitle: 'Who scored for {team}?',
  whoScored: 'Scorer',
  whoAssisted: 'Assist',
  stoppageDialogTitle: 'What stopped play?',
  stoppageDialogHint: 'Pick which kind of stoppage this is.',
  stoppageKind_injury: 'Injury',
  stoppageKind_technical: 'Technical',
  injuryDialogTitle: 'Who got injured?',
  injuryDialogHint: 'Optional — you can skip and just log the injury.',
  technicalStoppageTitle: 'Technical stoppage — who called it?',
  technicalStoppageHint:
    'Equipment, outside interference, and the like. Optional — you can skip the team too.',
  btnNoTeam: 'No team',
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
  awaitingStartDotLabel: 'Waiting for the scheduled kickoff',
  pullTimer: 'Pull timer',
  timeoutTimer: 'Timeout',
  halftimeTimer: 'Half-time',
  pauseLabel: 'Paused',
  pullThrown: 'Pull thrown',
  btnPauseGame: 'Pause game',
  btnResumeGame: 'Resume game',
  confirmPauseGame:
    'Only stop the game for a SOTG stoppage, a tournament technical stoppage, a prolonged stoppage, or inclement weather. The clock will stop until you resume.',
  confirmPauseGameTitle: 'Pause game?',
  btnPauseGameConfirm: 'Pause game',
  btnStoppage: 'Stoppage',
  btnTurnover: 'Turn',
  btnRecordEvent: 'Record event',
  btnSotg: 'SOTG',
  btnEndHalftime: 'End half-time',
  btnSettings: 'Settings',
  btnLog: 'Log',
  btnEndGame: 'End game',
  btnEndTimeout: 'End timeout',
  confirmEndGame: 'End the game now and open the report?',
  confirmEndGameTitle: 'End game?',
  btnCancel: 'Cancel',
  btnConfirm: 'End game',
  btnDone: 'Done',
  timeoutsLeft: '{n} timeouts left',
  timeoutBlockedLastFive: 'Timeouts are not allowed in the last 5 minutes',
  timeoutBlockedNone: 'No timeouts left for this team',
  timeoutBlockedNotNow: 'Timeouts can only be called during play',
  currentRatio: 'Ratio: {gender}',
  pullChip: 'Pull: {team} ({side})',
  // Short, glanceable cap indicators — only shown once a cap has fixed a new target.
  halfCapChip: 'Half at {n}',
  gameCapChip: 'Game at {n}',
  sideLeft: 'Left',
  sideRight: 'Right',
  target: 'Target: {n}',
  universePointBadge: 'Universe point',

  // Record event — the dialog behind the "Record event" button, and everything
  // reachable from it. None of these change the score, the clock or possession.
  recordEventTitle: 'Record event',
  recordEventHint: 'Log what just happened. Nothing here changes the score or the clock.',
  btnTravel: 'Travel',
  btnNote: 'Event',
  callKind_foul: 'Foul',
  callKind_stallOut: 'Stall out',
  callKind_pick: 'Pick',
  callKind_offside: 'Off-side',
  callKind_discDown: 'Disc down',
  callKind_generic: 'Call',
  callTeamTitle: '{kind} — who called it?',
  callTeamHint: 'Then answer how it ended with the buttons that appear above the clocks.',
  travelTeamTitle: 'Travel — who called it?',
  travelTeamHint: 'Recorded as soon as you pick a team — no follow-up needed.',
  callPending: '{kind} — {team}',
  callResolution_accepted: 'Accepted',
  callResolution_contested: 'Contested',
  callResolution_retracted: 'Retracted',
  callResolvedIn: 'resolved in {n}s',
  callBlockedPending: 'Resolve the call in progress first.',
  recordEventBlockedPull: 'Turn, stoppage, travel and calls need the pull thrown first.',
  stoppagePending: '{kind} — play has not resumed yet.',
  btnStoppageResolved: 'Play can resume',
  noteTitle: 'Event',
  noteHint: 'Anything worth remembering — a huge layout, a bird crossing the field...',
  notePlaceholder: 'What happened?',

  // Hand-signal dialog (floats over the score panels) — the official WFDF signal to make
  handSignal: 'Hand signal',
  signal_goal: 'Goal',
  signal_timeout: 'Time-out',
  signal_stoppage: 'Stoppage of play',
  signal_sotg: 'Spirit stoppage',
  signal_ratioMale: 'Ratio: Men',
  signal_ratioFemale: 'Ratio: Women',
  signal_whistle: 'Whistle',
  signal_universePoint: 'Universe point',
  signal_travel: 'Travel',
  signal_foul: 'Foul',
  // WFDF has no dedicated stall-out pictogram; the timing signal is the closest fit.
  signal_stallOut: 'Stall out',
  signal_pick: 'Pick',
  signal_offside: 'Off-side',
  signal_discDown: 'Disc down',
  signal_call: 'Play stopped',
  signal_accepted: 'Uncontested',
  signal_contested: 'Contested',
  signal_retracted: 'Retracted',

  // Call-outs (green) — the exact words to shout, shown briefly with the signal
  say_gameOn: '"Game on!"',
  say_secondHalf: '"Second half — game on!"',
  say_score: '"{a} {as}, {b} {bs}!"',
  say_halfAt: '"{a} {as}, {b} {bs} — half at {halfN}!"',
  say_gameAt: '"{a} {as}, {b} {bs} — game at {n}!"',
  say_ratio: '"{gender}"',
  say_scoreCorrection: '"Score correction — {a} {as}, {b} {bs}!"',
  say_discIn: '"Disc in!"',
  say_timeout: '"Timeout, {team}!"',
  say_timeIn: '"Time in — 20 seconds!"',
  say_injury: '"Injury — stop play!"',
  say_technicalStoppage: '"Stoppage of play!"',
  say_spirit: '"Spirit stoppage!"',
  say_halftime: '"Half-time!"',
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
  say_callOffside: '"Off-side — {team}!"',
  say_callDiscDown: '"Disc down — {team}!"',
  say_callGeneric: '"Call by {team} — play stopped!"',
  say_resolutionAccepted: '"Uncontested — play on!"',
  say_resolutionContested: '"Contested — disc back to the thrower!"',
  say_resolutionRetracted: '"Retracted — play on!"',

  // Status line (amber) — what is happening now and what to do about it
  now_setup: 'Fill in the game setup, then press "Start game".',
  now_awaitingStart:
    'Waiting for the scheduled kickoff. Play will unlock automatically once it arrives.',
  now_awaitingPull: 'Teams are lining up. Press "Pull thrown" the moment the disc is thrown.',
  now_discInPlay: "Disc in play. Tap a team's panel when they score in the opposite end zone.",
  now_timeout: 'Timeout running. It ends on its own, or press "End timeout".',
  now_halftime:
    'Half-time break. Resumes automatically when the clock runs out, or press "End half-time" if both teams are ready sooner.',
  now_paused: 'Spirit stoppage. Clock paused — press "Resume game" to continue.',
  now_finished: 'Game finished.',
  now_pull45: 'Single whistle — 45 seconds. Teams should be getting ready.',
  now_pull60: 'Double whistle — 60 seconds. Teams must signal readiness.',
  now_pull75: 'Triple whistle — 75 seconds. The pull MUST be thrown now.',
  now_universePoint: 'Universe point — {a} {as}, {b} {bs}. The next goal wins the game!',

  assist_blocked_gameNotStarted: 'Score locked: the game has not started yet.',
  assist_blocked_pullNotThrown:
    'Score locked: press "Pull thrown" first — the disc is not in play.',
  assist_blocked_gamePaused: 'Score locked while the game is paused.',
  assist_blocked_timeoutActive: 'Score locked during a timeout.',
  assist_blocked_halftimeActive: 'Score locked during half-time.',
  assist_blocked_minScoreZero: 'The score cannot go below 0.',
  assist_blocked_notLastScorer: 'Only the most recent goal can be undone (long-press that team).',
  assist_blocked_gameFinished: 'The game is finished.',
  assist_blocked_nothingToUndo: 'There is no goal to undo yet.',

  // Report
  reportTitle: 'Final report',
  reportStarted: 'Started: {time}',
  reportFinished: 'Finished: {time}',
  reportDuration: 'Duration: {duration}',
  finalScore: 'Final score',
  statOLineHolds: 'O-line holds',
  statBreaks: 'Break points',
  statAvgHold: 'Avg. hold time',
  statAvgBreak: 'Avg. break time',
  statTimeouts: 'Timeouts used',
  historyTitle: 'Game history',
  colTime: 'Time',
  colClock: 'Clock',
  colEvent: 'Event',
  colTeam: 'Team',
  colDetail: 'Detail',
  copyReport: 'Copy to clipboard',
  copied: 'Copied!',
  copyFailed: 'Copy failed — try again',
  newGame: 'New game',
  event_gameStart: 'Game start',
  event_goal: 'Goal',
  event_undo: 'Score correction (undo)',
  event_timeout: 'Timeout',
  event_timeoutEnd: 'Timeout ended',
  event_stoppage: 'Stoppage',
  event_stoppageResolved: 'Stoppage resolved',
  event_turnover: 'Turnover',
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
  event_timeCap: 'Time cap reached',
  event_halfTimeCap: 'Half-time cap reached',
  event_gameEnd: 'Game end',

  // Guide — a full page (not a dialog), reached from the config screen. Written
  // for a volunteer who has never seen an Ultimate game, in the order they will
  // actually use the app.
  guideLink: 'How does this app work?',
  guideTitle: 'How this app works',
  guideSubtitle: 'A walkthrough for first-time scorekeepers',
  guideBack: 'Back to setup',
  guideBackShort: 'Setup',
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
  guideStep1Players: 'Players',
  guideStep1PlayersBody:
    'Optional. If you add the rosters and tick "Track player activity", the app asks who scored and who assisted after each goal. Leave it off if you are on your own — the score, the clocks and the report all work without it.',
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
  guideStep3Timeouts: 'Timeouts',
  guideStep3TimeoutsBody:
    'How many each team may call and how long one lasts. Untick "Allow timeouts" if this tournament has none, and the buttons disappear from the dashboard.',
  guideStep3Start: 'Once both team names are filled in, press "Start game".',

  guideStep4Title: 'Get to know the dashboard',
  guideStep4Body:
    'This is the only screen you will use during the game. Nothing here can be pressed by mistake in a way you cannot take back.',
  guideTour1:
    'Field number, the time of day, which half it is and the score the game is played to.',
  guideTour2:
    'One panel per team, painted in the team colour. This is where you add goals (step 5).',
  guideTour3:
    'Reminders for the point about to be played: who pulls and from which end, the gender ratio, and the target once it has been announced.',
  guideTour4:
    'The one button that matters right now — "Pull thrown" here. It becomes "End timeout", "End half-time" or "Resume game" when one of those is running, and is empty while the disc is in play.',
  guideTour5:
    'The game clock, and next to it the second clock: the seconds since the last goal between points, or the timeout or half-time countdown.',
  guideTour6:
    'Timeouts for each team, with the number they have left. In the middle: record an event, open the log, and the player list when player tracking is on.',
  guideTour7: 'The assistance bar — what to shout and what to do. See step 6.',

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
    "When a team calls one, press the button in that team's colour under the clocks; the number beside it is how many they have left. A countdown starts and the app whistles when time is up. The game clock keeps running throughout — that is normal.",
  guideStep8Half: 'Half-time',
  guideStep8HalfBody:
    'The app calls half-time by itself as soon as a team reaches the half score, and never in the middle of a point. The break is a countdown; press "End half-time" if both teams are ready sooner. Afterwards the teams swap ends and the app tells you so.',
  guideStep8Cap: 'Caps',
  guideStep8CapBody:
    'When the time limit is reached the app whistles, but the target is not fixed yet — the point already being played finishes first, exactly as if there were no cap. Only then does the app work out the new target from that finished score, show it as a chip and give you the sentence to shout. There is nothing to calculate.',
  guideStep8Universe: 'Universe point',
  guideStep8UniverseBody:
    'When the next goal wins the game, a badge says so and the bar gives you the call. Announce it — both teams want to know.',

  guideStep9Title: 'Writing down what happens',
  guideStep9Body:
    'The "Record event" button (the list with a +) logs anything worth remembering. Nothing behind that button changes the score, the possession or the clock — it only writes to the log, and tells you what to announce.',
  guideStep9Calls:
    'Foul, Stall out, Pick, Off-side, Disc down, Call — something a player called. Pick who called it, and three buttons appear above the clocks: Accepted, Contested, Retracted. Ask the players how it ended and press the matching one; the app records how long the discussion took.',
  guideStep9Travel:
    'Travel — called on a thrower who moves illegally. Recorded in one step, with no follow-up.',
  guideStep9Turn:
    'Turn — a turnover: the disc was dropped, thrown away or intercepted, and the other team now has it.',
  guideStep9Stoppage:
    'Stoppage — injury or technical (equipment, outside interference, ...). The game clock keeps running. Once play can resume, press "Play can resume" to log how long the stoppage took.',
  guideStep9Sotg:
    'SOTG — a spirit stoppage. This is the only thing that pauses the game clock; press "Resume game" when play restarts.',
  guideStep9Note: 'Event — free text for anything else you want in the report.',
  guideStep9Log:
    'The plain list button next to it opens everything recorded so far, in order, so you can check what you logged.',

  guideStep10Title: 'End of the game',
  guideStep10Body:
    'The app ends the game on its own when a team reaches the target. If you have to stop earlier, press "End game" at the very bottom of the dashboard and confirm.',
  guideStep10Report:
    'You then get the report: the final score, a few statistics for each team and the full history of the game. "Copy to clipboard" turns it into plain text you can paste into a message or a spreadsheet — do that before you leave the screen. "New game" takes you back to setup for the next match.',

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
  guideFigRecordAlt: 'The record event dialog',
  guideFigRulesAlt: 'The win conditions, half-time and timeout sections of the setup screen',
  guideFigReportAlt: 'The final report screen',
};
