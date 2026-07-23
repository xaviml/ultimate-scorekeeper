import type { en } from './en';

export const ca: typeof en = {
  appTitle: "Marcador d'Ultimate",
  tagline: "Un assistent guiat per als anotadors d'Ultimate Frisbee",

  templateTitle: 'Plantilla',
  templateSelectLabel: 'Plantilla',
  templatePredefinedGroup: 'Predefinides',
  templateCustomGroup: 'Les teves plantilles',
  templateGrassName: 'Gespa',
  templateBeachName: 'Platja',
  saveAsTemplateBtn: 'Desar com a plantilla',
  saveTemplateTitle: 'Desar com a plantilla',
  saveTemplateHint:
    'Desa aquests ajustos de regles per reutilitzar-los — no els equips, el resultat del llançament de moneda ni els jugadors.',
  saveTemplateNamePlaceholder: "p. ex. Lliga d'estiu",
  btnDeleteTemplate: 'Eliminar plantilla',
  confirmDeleteTemplateTitle: 'Eliminar plantilla desada?',
  confirmDeleteTemplate: 'Eliminar "{name}"? Aquesta acció no es pot desfer.',
  setupTitle: 'Configuració del partit',
  division: 'Divisió',
  divisionOpen: 'Open',
  divisionWomen: 'Femení',
  divisionMixed: 'Mixta',
  fieldNumber: 'Camp',
  teamA: 'Equip 1',
  teamB: 'Equip 2',
  teamName: "Nom de l'equip",
  teamColor: 'Color',
  addAsNewTeam: 'Afegir "{name}" com a nou equip',
  deleteTeamAria: "Eliminar l'equip desat {name}",
  clearTeamNameAria: 'Esborrar {name}',
  confirmDeleteTeamTitle: 'Eliminar equip desat?',
  confirmDeleteTeam:
    'Eliminar "{name}" i la seva plantilla desada d\'aquest dispositiu? Aquesta acció no es pot desfer.',
  btnDeleteTeam: 'Eliminar equip',
  mixedRatioRule: 'Regla de ràtio de gènere (mixta)',
  ruleA: 'Regla A — prescrita (alterna cada 2 punts)',
  ruleB: "Regla B — la zona d'anotació decideix cada punt",
  coinToss: 'Resultat del sorteig',
  coinTossHelp:
    'Demana als capitans que llancin un disc abans del partit i registra aquí el resultat.',
  startingOffense: 'Equip que rep el primer pull (atac)',
  startingSide: "Equip que comença a l'esquerra",
  startingRatio: 'Ràtio de gènere inicial',
  ratioMale: 'Nois',
  ratioFemale: 'Noies',
  startingTimeEnabled: "El partit té una hora d'inici programada",
  startingTimeLabel: "Hora d'inici",
  startingTimeInPast: "L'hora d'inici ha de ser posterior a l'hora actual",
  winConditions: 'Condicions de victòria',
  targetScore: 'Puntuació',
  halfScore: 'Puntuació',
  timeLimit: 'Temps (minuts)',
  halfTimeLimit: 'TEMPS (Minuts)',
  halfTimeBreak: 'descans (segons)',
  endCapLabel: 'CAP',
  endCapNone: 'Sense CAP — acabar el punt actual',
  endCapPlus: 'CAP +{n}',
  endCapCond: 'CAP +{n} condicional (només si la diferència després del punt actual és > {x})',
  capDiff: 'Diferència requerida',
  halfTimeTitle: 'Half',
  halfCapPlus: 'CAP +1',
  timeoutsTitle: 'Temps morts',
  timeoutsEnabled: 'Permetre temps morts',
  timeoutsCount: 'Per equip',
  timeoutsScope: 'Assignació',
  timeoutsScopeHalf: 'Per part',
  timeoutsScopeGame: 'Per partit',
  timeoutDuration: 'Durada del temps mort (segons)',
  timeoutLastFive: 'Prohibir temps morts en els últims 5 minuts del partit',
  startGame: 'Començar partit',
  teamsRequired: 'Introdueix o selecciona els dos equips per començar',
  duplicateTeamNames: 'Els noms dels equips han de ser diferents',
  halfScoreInvalid: 'El marcador de descans ha de ser menor que el marcador objectiu',
  language: 'Idioma',
  aboutBtn: "Sobre l'app",
  aboutTitle: "Sobre l'app",
  aboutBackgroundLabel: 'Context',
  aboutStory:
    "Aquesta app està pensada per a aquells anotadors de torneigs d'Ultimate Frisbee de la nostra zona — sovint amb poc o cap coneixement de l'esport. En Kýkhë, d'EUC, va crear una aplicació Android per ajudar aquests anotadors a seguir el temps de sortida, la ràtio de gènere, el descans i els temps morts, però mai es va publicar a la Play Store, així que només arribava a qui tenia un mòbil Android i un enllaç d'instal·lació directe.",
  aboutStory2:
    "Aquest projecte continua aquesta mateixa missió: reconstruïda per funcionar en qualsevol dispositiu, millorant la usabilitat i l'experiència pel camí. L'objectiu no ha canviat: facilitar la feina d'aquests anotadors i estalviar a tots dos equips la frustració de perdre el compte de la sortida o de la ràtio de gènere durant el partit.",
  aboutCreditsLabel: 'Crèdits',
  aboutDesignedByPrefix: 'Dissenyada, desenvolupada i mantinguda per Xavi #29 de ',
  aboutDesignedBySuffix: '.',
  aboutBasedOnPrefix: 'Basada en una aplicació Android, ',
  aboutBasedOnMiddle: ', de Kýkhë #00 ',
  aboutBasedOnSuffix: '.',
  aboutQuestion: 'Alguna pregunta o suggeriment? Obre un issue a GitHub:',

  installBannerTitle: 'Instal·la Scorekeeper',
  installBannerBody:
    "Afegeix-la a la pantalla d'inici per accedir-hi amb un toc i veure-la a pantalla completa.",
  installBannerIosBody: 'Toca la icona de compartir i després "Afegir a pantalla d\'inici".',
  installBannerOpenTitle: 'Scorekeeper ja està instal·lada',
  installBannerOpenBody: "Obre-la des de la pantalla d'inici per a la millor experiència.",
  btnInstall: 'Instal·lar',
  dismissBanner: 'Descartar',

  playersTitle: 'Roster',
  collapseSection: 'Replegar {title}',
  expandSection: 'Desplegar {title}',
  trackPlayers:
    'Registrar activitat dels jugadors (gols, assistències, pèrdues, defenses, lesions)',
  playerNumber: '#',
  playerName: 'Nom',
  addPlayer: 'Afegir',
  removePlayer: 'Treure',
  duplicatePlayer: 'Aquest jugador ja és a la plantilla',
  close: 'Tancar',
  noPlayersYet: "Encara no s'han afegit jugadors.",
  btnPlayers: 'Roster',
  assistDialogTitle: 'Qui ha anotat per {team}?',
  whoScored: 'Anotador',
  whoAssisted: 'Assistència',
  stoppageDialogTitle: 'Què ha aturat el joc?',
  stoppageDialogHint:
    'Les aturades per lesió o tècniques no aturen el rellotge de bon principi. El SOTG sí.',
  stoppageKind_injury: 'Lesió',
  stoppageKind_technical: 'Tècnica',
  injuryDialogTitle: "Qui s'ha lesionat?",
  injuryDialogHint: 'Opcional — pots ometre-ho i només registrar la lesió.',
  technicalStoppageTitle: "Aturada tècnica — qui l'ha cantada?",
  technicalStoppageHint:
    "Material, interferència externa i similars. Opcional — també pots ometre l'equip.",
  btnNoTeam: 'Sense equip',
  turnoverDialogTitle: 'Pèrdua',
  turnoverDialogHint: 'Opcional — pots ometre-ho i només registrar la pèrdua.',
  whoTurnedOver: '{team} — qui ha perdut el disc? (drop, mal passi, stall)',
  whoDefended: "{team} — qui l'ha forçat? (bloqueig, bona defensa)",
  btnSave: 'Desar',
  assistedBy: 'assistència: {name}',
  turnoverBy: 'pèrdua: {name}',
  defenseBy: 'D: {name}',

  field: 'Camp {n}',
  half1: '1a part',
  half2: '2a part',
  gameClock: 'Rellotge del partit',
  timeBeforeGame: "Temps fins a l'inici",
  pullTimer: 'Temps de pull',
  timeoutTimer: 'Temps mort',
  halftimeTimer: 'Half',
  pauseLabel: 'En pausa',
  pullThrown: 'Pull llançat',
  openReport: "Obrir l'informe",
  btnPauseGame: 'Pausar partit',
  btnResumeGame: 'Reprendre partit',
  confirmPauseGame:
    "Només aturis el partit per una aturada d'esperit (SOTG), una aturada tècnica de torneig, una aturada prolongada o mal temps. El rellotge s'aturarà fins que el reprenguis.",
  confirmPauseGameTitle: 'Pausar el partit?',
  btnPauseGameConfirm: 'Pausar partit',
  btnStoppage: 'Aturada',
  btnTurnover: 'Pèrdua',
  btnStoppageSotg: 'Aturada o SOTG',
  btnSotg: 'SOTG',
  btnEndHalftime: 'Fi del descans',
  btnSettings: 'Ajustos',
  btnLog: 'Registre',

  // Microetiquetes de la fila d'accions: en anglès en tots els idiomes a posta —
  // el vocabulari d'Ultimate ja és anglès a les pistes catalanes i espanyoles, i
  // així l'amplada dels botons és idèntica en els tres.
  lblTurn: 'Turn',
  lblCall: 'Call',
  lblLog: 'Log',
  lblRoster: 'Roster',
  btnEndGame: 'Fi del partit',
  btnBackToSetup: 'Tornar a la configuració',
  btnEndTimeout: 'Fi del temps mort',
  confirmEndGame: "Vols acabar el partit ara i obrir l'informe?",
  confirmEndGameTitle: 'Acabar el partit?',
  confirmLeaveGame:
    'Tornaràs a la configuració del partit. Es perdran el marcador i el temps actuals.',
  confirmLeaveGameTitle: 'Sortir del partit?',
  btnLeaveGameConfirm: 'Sortir',
  btnCancel: 'Cancel·lar',
  btnConfirm: 'Acabar partit',
  btnDone: 'Fet',
  timeoutsLeft: '{n} temps morts restants',
  timeoutBlockedLastFive: 'No es permeten temps morts en els últims 5 minuts',
  timeoutBlockedNone: 'Aquest equip no té temps morts restants',
  timeoutBlockedNotNow: 'Els temps morts només es poden demanar durant el joc',
  timeoutBlockedCallPending:
    'Els temps morts estan bloquejats fins que es resolgui la falta pendent',
  currentRatio: 'Ràtio: {gender}',
  pullChip: 'Pull: {team} ({side})',
  halfCapChip: 'Half a {n}',
  gameCapChip: 'Partit a {n}',
  sideLeft: 'Esquerra',
  sideRight: 'Dreta',
  target: 'Objectiu: {n}',
  universePointBadge: 'Universal',

  // Calls — el diàleg darrere el botó del globus de diàleg. Tot el que hi ha dins
  // respon a una sola pregunta («què s'ha cantat?»), i per això el travel hi va i
  // les pèrdues, les aturades i els esdeveniments no.
  callDialogTitle: "Què s'ha cantat?",
  callDialogHint: 'Registrar un call no canvia el marcador ni el rellotge.',
  btnTravel: 'Travel',
  btnNote: 'Esdeveniment',
  callKind_foul: 'Falta',
  callKind_stallOut: 'Stall out',
  callKind_pick: 'Pick',
  callKind_offside: 'Off-side',
  callKind_discDown: 'Disc a terra',
  callKind_generic: 'Call',
  callTeamTitle: "{kind} — qui l'ha cantat?",
  callTeamHint: 'Després indica com ha acabat amb els botons que apareixen sobre els rellotges.',
  travelTeamTitle: "Travel — qui l'ha cantat?",
  travelTeamHint: 'Es registra en triar un equip — no cal res més.',
  callPending: '{kind} — {team}',
  callResolution_accepted: 'Acceptada',
  callResolution_contested: 'Discutida',
  callResolution_retracted: 'Retirada',
  callResolvedIn: 'resolta en {n}s',
  callBlockedPending: 'Resol primer el call en curs.',
  callBlockedPull: 'Els calls necessiten que es llenci el pull abans.',
  stoppageBlockedPull:
    'Les aturades per lesió o tècniques necessiten que es llenci el pull abans. El SOTG no.',
  stoppagePending: "{kind} — el joc encara no s'ha reprès.",
  btnStoppageResolved: 'El joc pot continuar',
  noteTitle: 'Esdeveniment',
  noteHint: 'Qualsevol cosa digna de recordar — un layout increïble, un ocell creuant el camp...',
  notePlaceholder: 'Què ha passat?',

  // Targeta de senyal (sobre el marcador) — el senyal oficial WFDF a fer
  handSignal: 'Senyal de mà',
  signal_goal: 'Gol',
  signal_timeout: 'Temps mort',
  signal_stoppage: 'Aturada de joc',
  signal_sotg: "Aturada d'esperit",
  signal_ratioMale: 'Ràtio: Nois',
  signal_ratioFemale: 'Ràtio: Noies',
  signal_whistle1: 'Un xiulet',
  signal_whistle2: 'Dos xiulets',
  signal_whistle3: 'Tres xiulets',
  signal_universePoint: 'Universal',
  signal_travel: 'Travel',
  signal_foul: 'Falta',
  // El WFDF no té pictograma propi de stall out; el senyal de temps és el més semblant.
  signal_stallOut: 'Stall out',
  signal_pick: 'Pick',
  signal_offside: 'Off-side',
  signal_discDown: 'Disc a terra',
  signal_call: 'Joc aturat',
  signal_accepted: 'No discutida',
  signal_contested: 'Discutida',
  signal_retracted: 'Retirada',

  // Missatges per cridar (verd) — les paraules exactes, junt amb el senyal
  say_startSoon: '«Un minut per començar!»',
  say_gameOn: '«Game on!»',
  say_secondHalf: '«Segona part — game on!»',
  say_score: '«{a} {as}, {b} {bs}!»',
  say_halfAt: '«{a} {as}, {b} {bs} — half a {halfN}!»',
  say_gameAt: '«{a} {as}, {b} {bs} — partit a {n}!»',
  say_ratio: '«Següent punt: {gender}!»',
  say_scoreCorrection: '«Correcció — {a} {as}, {b} {bs}!»',
  say_discIn: '«Disc dins!»',
  say_timeout: '«Temps mort, {team}!»',
  say_timeIn: '«Temps — es reinicia el compte del servei!»',
  say_playRestart: '«Joc — disc en joc!»',
  say_injury: '«Lesió — atureu el joc!»',
  say_technicalStoppage: '«Aturada de joc!»',
  say_spirit: "«Aturada d'esperit!»",
  say_halftime: '«Half!»',
  say_timeCap: '«Time cap — partit a {n}!»',
  say_timeCapFinish: "«Temps! Acabeu aquest punt — el partit s'acaba després.»",
  say_timeCapPending: '«Time cap — acabeu aquest punt!»',
  say_halfCap: '«Half cap — half a {halfN}!»',
  say_halfCapNone: "«Half després d'aquest punt!»",
  say_halfCapPending: '«Half cap — acabeu aquest punt!»',
  say_gameOver: '«Fi del partit — {a} {as}, {b} {bs}!»',
  say_universePoint: '«{a} {as}, {b} {bs} — universal!»',
  say_travel: '«Travel!»',
  say_callFoul: '«Falta — {team}!»',
  say_callStallOut: '«Stall out — {team}!»',
  say_callPick: '«Pick — {team}!»',
  say_callOffside: '«Off-side — {team}!»',
  say_callDiscDown: '«Disc a terra — {team}!»',
  say_callGeneric: '«Call de {team} — joc aturat!»',
  say_resolutionAccepted: '«No discutida — continueu jugant!»',
  say_resolutionContested: '«Discutida — el disc torna al llançador!»',
  say_resolutionRetracted: '«Retirada — continueu jugant!»',

  // Línia d'estat (ambre) — què passa ara i què cal fer
  now_setup: 'Prem «Començar partit» quan els equips estiguin preparats per al pull.',
  now_awaitingStart:
    "Esperant l'hora d'inici programada. El joc es desbloquejarà automàticament, o prem «Començar partit» per començar abans.",
  now_awaitingPull: "Els equips s'estan alineant. Prem «Pull llançat» en el moment del llançament.",
  now_discInPlay: "Disc en joc. Toca el panell de l'equip quan anoti a la zona contrària.",
  now_timeout: 'Temps mort en curs. Acaba sol, o prem «Fi del temps mort».',
  now_toReady30: "El temps mort s'acaba — 30 segons perquè l'atac estigui llest. Un xiulet als 30.",
  now_toReady15: "15 segons perquè l'atac estigui llest. Dos xiulets quan s'esgoti el temps.",
  now_toReady0: "L'atac hauria d'estar llest — tres xiulets i el disc entra en joc.",
  now_halftime:
    "Descans. Es reprèn sol quan s'acabi el temps, o prem «Fi del descans» si tots dos equips estan llestos abans.",
  now_halftimeWarn:
    "Un minut per a la segona part. Un xiulet — els equips haurien d'anar-se preparant.",
  now_callPending:
    "{kind} — l'ha demanada {team}. El joc està aturat i el marcador bloquejat: prem «Acceptada», «Discutida» o «Retirada» sobre el rellotge quan els jugadors ho decideixin.",
  now_callWait:
    'Segueix sense resoldre als 45 segons — tres xiulets ara, i tres més als 60. Resol-la sobre el rellotge tan bon punt els jugadors ho decideixin.',
  now_paused: "Aturada d'esperit. Rellotge en pausa — prem «Reprendre partit» per continuar.",
  now_pauseManual: 'Partit en pausa. Rellotge aturat — prem «Reprendre partit» per continuar.',
  now_stoppageClockStopped:
    'Partit aturat: la parada porta més de 2 minuts. Prem «Reprendre partit» quan el joc pugui continuar.',
  now_finished: 'Partit acabat.',
  now_pull45: "Un xiulet — 45 segons. Els equips s'han de preparar.",
  now_pull60: 'Dos xiulets — 60 segons. Els equips han de senyalar que estan llestos.',
  now_pull75: "Tres xiulets — 75 segons. El pull S'HA de llançar ja.",
  now_universePoint: 'Universal — {a} {as}, {b} {bs}. El proper gol acaba el partit!',

  assist_blocked_gameNotStarted: 'Marcador bloquejat: el partit encara no ha començat.',
  assist_blocked_pullNotThrown:
    'Marcador bloquejat: prem «Pull llançat» primer — el disc no és en joc.',
  assist_blocked_gamePaused: 'Marcador bloquejat mentre el joc està en pausa.',
  assist_blocked_timeoutActive: 'Marcador bloquejat durant un temps mort.',
  assist_blocked_halftimeActive: 'Marcador bloquejat durant el half.',
  assist_blocked_minScoreZero: 'El marcador no pot baixar de 0.',
  assist_blocked_notLastScorer: "Només es pot desfer l'últim gol (mantén premut aquell equip).",
  assist_blocked_gameFinished: 'El partit ha acabat.',
  assist_blocked_nothingToUndo: 'Encara no hi ha cap gol per desfer.',
  assist_blocked_callPending: 'Marcador bloquejat: resol primer la falta pendent.',

  reportTitle: 'Informe final',
  reportStarted: 'Inici: {time}',
  reportFinished: 'Fi: {time}',
  reportDuration: 'Durada: {duration}',
  finalScore: 'Marcador final',
  statOLineHolds: "Holds d'atac",
  statBreaks: 'Breaks',
  statAvgHold: 'Durada mitjana de hold',
  statAvgBreak: 'Durada mitjana de break',
  statTimeouts: 'Temps morts usats',
  historyTitle: 'Historial del partit',
  colTime: 'Hora',
  colClock: 'Rellotge',
  colEvent: 'Esdeveniment',
  colTeam: 'Equip',
  colDetail: 'Detall',
  copyReport: 'Copiar al porta-retalls',
  copied: 'Copiat!',
  copyFailed: "No s'ha pogut copiar — torna-ho a provar",
  newGame: 'Nou partit',
  event_gameStart: 'Inici del partit',
  event_goal: 'Gol',
  event_undo: 'Correcció del marcador (desfer)',
  event_timeout: 'Temps mort',
  event_timeoutEnd: 'Fi del temps mort',
  event_stoppage: 'Aturada',
  event_stoppageResolved: 'Aturada resolta',
  event_stoppageClockStopped: 'Rellotge del partit aturat (parada de més de 2 min)',
  event_turnover: 'Pèrdua',
  event_travel: 'Travel',
  event_call: 'Call',
  event_callResolved: 'Call resolt',
  event_note: 'Esdeveniment',
  event_sotgStart: 'Aturada SOTG (rellotge en pausa)',
  event_sotgEnd: "Fi de l'aturada SOTG",
  event_pauseStart: 'Partit en pausa (rellotge aturat)',
  event_pauseEnd: 'Partit reprès',
  event_halftimeStart: 'Half',
  event_halftimeEnd: 'Inici de la segona part',
  event_timeCap: 'CAP de temps assolit',
  event_halfTimeCap: 'CAP de half assolit',
  event_gameEnd: 'Fi del partit',

  // Guia
  guideLink: 'Com funciona aquesta aplicació?',
  guideTitle: "Com funciona l'aplicació",
  guideSubtitle: 'Una guia per a qui anota per primer cop',
  guideBack: 'Tornar a la configuració',
  guideBackShort: 'Configuració',
  guideIntro:
    "No cal saber d'Ultimate Frisbee per portar el marcador amb aquesta aplicació. Segueix aquests passos en ordre: durant el partit l'aplicació et diu què està passant, què has de fer i les paraules exactes que has de cantar.",
  guideScreenshotNote:
    "Les captures de pantalla són en anglès. L'aplicació fa servir l'idioma que triïs a dalt.",

  guideSportTitle: "L'esport en un minut",
  guideSportBody:
    "Dos equips de set es passen un disc. Un equip anota un punt quan un dels seus jugadors atrapa el disc dins de la zona d'anotació que ataca. Ningú pot córrer amb el disc a la mà, i si el disc cau a terra o l'intercepta l'altre equip, la possessió canvia allà mateix.",
  guideSportPull:
    "Cada punt comença amb un pull: l'equip que defensa llança el disc cap a l'altra banda del camp, com una treta inicial. Després de cada gol els equips canvien de banda i l'equip que acaba d'anotar fa el pull a l'altre.",
  guideSportRole:
    'No hi ha àrbitres: els mateixos jugadors canten les seves faltes i les resolen entre ells. Tu tampoc arbitres. Portes el marcador i els rellotges, i anuncies les poques coses que els dos equips necessiten sentir: el compte del pull, el marcador, la ràtio de gènere, el half, els CAP i el final del partit.',

  guideStep1Title: 'Configura el partit',
  guideStep1Body:
    "La primera pantalla descriu el partit que vas a anotar. Gairebé tot ve ja omplert: normalment només has d'escriure els noms dels dos equips.",
  guideStep1Template: 'Plantilla',
  guideStep1TemplateBody:
    'Gespa i Platja omplen totes les regles de sota amb els valors habituals d\'aquella superfície. Si el teu torneig en fa servir unes altres, canvia els camps i prem "Desar com a plantilla" al final per reutilitzar-les el proper cop.',
  guideStep1Division: 'Divisió',
  guideStep1DivisionBody:
    "Open, Femení o Mixta. La mixta afegeix la ràtio de gènere, que hauràs d'anunciar cada punt (pas 7).",
  guideStep1Teams: 'Noms i colors dels equips',
  guideStep1TeamsBody:
    'Escriu cada nom, o tria un equip que hagis desat abans. Tria un color semblant al de les samarretes de cada equip: els panells del marcador van pintats amb aquests colors tot el partit, així no has de recordar mai quina banda és quina.',
  guideStep1Players: 'Roster',
  guideStep1PlayersBody:
    'Opcional. Si afegeixes les plantilles i marques "Registrar activitat dels jugadors", l\'aplicació et pregunta qui ha anotat i qui ha assistit després de cada gol. Deixa-ho sense marcar si estàs sol: el marcador, els rellotges i l\'informe funcionen igual sense això.',
  guideStep1Time: "Hora d'inici prevista",
  guideStep1TimeBody:
    "Opcional. Marca-ho i l'aplicació fa el compte enrere fins a l'hora d'inici i desbloqueja el joc sola quan arriba.",

  guideStep2Title: 'Anota el sorteig',
  guideStep2Body:
    "Abans del partit els dos capitans llancen un disc a l'aire. Qui guanya tria rebre el pull o la banda que vol defensar, i l'altre es queda amb l'opció restant. Pregunta'ls què han decidit i anota-ho aquí: l'aplicació ho necessita per saber qui fa el pull, cap a on ataca cada equip i com es col·loca el marcador.",
  guideStep2Offense: 'Equip que rep el primer pull',
  guideStep2OffenseBody:
    "L'equip que atrapa o recull el pull. Ataca primer; l'altre equip fa el pull.",
  guideStep2Side: "Equip que comença a l'esquerra",
  guideStep2SideBody:
    "L'esquerra tal com veus el camp des d'on ets. Aquest equip es queda a l'esquerra del marcador tot el partit, encara que els equips canviïn de banda a cada punt.",
  guideStep2Ratio: 'Ràtio de gènere inicial',
  guideStep2RatioBody:
    'Només en mixt: si el primer punt es juga amb majoria de noies o de nois al camp.',

  guideStep3Title: 'Comprova com acaba el partit',
  guideStep3Body:
    "Un partit acaba quan un equip arriba al marcador objectiu o quan s'acaba el temps, el que passi abans. Si no ho tens clar, llegeix aquests camps als capitans: ells ho sabran.",
  guideStep3Score: 'Punts i temps',
  guideStep3ScoreBody:
    "El marcador objectiu i quants minuts dura el partit. El rellotge corre des del primer pull fins al final i no s'atura ni als temps morts ni al half.",
  guideStep3Cap: 'CAP',
  guideStep3CapBody:
    "Què passa quan s'acaba el temps, i mai passa a mig punt. Suposem que el marcador va 9–7 quan s'arriba al límit de temps: el punt que s'està jugant s'acaba primer, exactament com si no hi hagués CAP. Només quan aquell punt acaba s'aplica el CAP, sobre el marcador que hi hagi en aquell moment. Si acaba 10–7, \"CAP +1\" fixa l'objectiu en el marcador nou del que va guanyant més un: un partit a 11, no a 10. \"Sense CAP\" simplement acaba el partit allà, en 10–7. El CAP condicional només afegeix aquest punt extra si els dos marcadors segueixen prou a prop un cop acabat el punt. No ho has de calcular mai tu: l'aplicació xiula quan s'acaba el temps, espera que acabi el punt i llavors et mostra l'objectiu nou i et dóna les paraules que has de cantar.",
  guideStep3Half: 'Half',
  guideStep3HalfBody:
    'Les mateixes tres coses per a la primera part: el marcador que activa el half, el seu propi límit de temps i el seu propi CAP, a més de quant dura el descans.',
  guideStep3Timeouts: 'Temps morts',
  guideStep3TimeoutsBody:
    'Quants en pot demanar cada equip i quant duren. Desmarca "Permetre temps morts" si en aquest torneig no n\'hi ha, i els botons desapareixen del panell.',
  guideStep3Start: 'Quan els dos noms estiguin posats, prem "Començar partit".',

  guideStep4Title: 'Coneix el panell',
  guideStep4Body:
    "És l'única pantalla que faràs servir durant el partit. Res del que hi ha aquí es pot prémer sense voler de manera irreversible.",
  guideTour1: "Número de camp, l'hora, en quina part som i el marcador al qual es juga el partit.",
  guideTour2:
    "Un panell per equip, pintat amb el color de l'equip. Aquí és on sumes gols (pas 5), i el botó de temps mort de cada equip és al cantó superior exterior del seu propi panell.",
  guideTour3:
    "Recordatoris del punt que està a punt de començar: qui fa el pull i des de quina banda, la ràtio de gènere i l'objectiu un cop anunciat.",
  guideTour4:
    'L\'únic botó que importa en aquell moment: aquí, "Pull llançat". Canvia a "Fi del temps mort", "Fi del descans" o "Reprendre partit" quan toca, i està buit mentre el disc és en joc.',
  guideTour5:
    "El rellotge del partit i, al costat, el segon rellotge: els segons des de l'últim gol entre punt i punt, o el compte enrere del temps mort o del half.",
  guideTour6:
    'Els botons que escriuen al registre: el roster (si el registre de jugadors està activat), el registre, una aturada, un call i una pèrdua.',
  guideTour7: "La barra d'ajuda: què cantar i què fer. Mira el pas 6.",
  guideTour8:
    "El petit botó de pausa al costat del rellotge del partit. Tota la resta —un temps mort, el half, una falta— ja funciona sense aturar-lo; prem això només per als casos extraordinaris que pregunta la confirmació: una aturada de SOTG, una aturada tècnica del torneig, una aturada prolongada o mal temps. El rellotge s'atura en el moment que confirmes, i queda aturat fins que reprens.",

  guideStep5Title: 'Jugar un punt',
  guideStep5Body:
    "Després de cada gol els equips van a les seves zones i es col·loquen. El segon rellotge compta els segons des que s'ha anotat el gol, i l'aplicació xiula per tu:",
  guideWhistle45: "45 s — un xiulet. Els dos equips haurien d'estar gairebé llestos.",
  guideWhistle60: "60 s — dos xiulets. Els dos equips han d'indicar que estan llestos.",
  guideWhistle75: "75 s — tres xiulets. El pull s'ha de llançar ja.",
  guideStep5Pull: 'Prem "Pull llançat"',
  guideStep5PullBody:
    'En el moment en què el disc surt de la mà de qui fa el pull. Això és el que arrenca el punt: fins que ho prems el marcador està bloquejat, perquè no hi pot haver gol abans del pull.',
  guideStep5Score: 'Toca un panell per anotar',
  guideStep5ScoreBody:
    "Quan un equip atrapa el disc a la zona que ataca, toca un cop el panell d'aquest equip. El marcador puja un i la barra de baix et dóna les paraules que has de cantar.",
  guideStep5Undo: 'Mantén premut un panell per treure un gol',
  guideStep5UndoBody:
    "Has tocat l'equip equivocat, o el gol al final no valia? Mantén premut el panell d'aquest equip aproximadament un segon i el gol desapareix. Un toc suma un, una pulsació llarga en treu un: així res baixa el marcador per accident. Només es pot desfer l'últim gol, i l'aplicació anuncia la correcció perquè els dos equips la sentin.",

  guideStep6Title: 'La barra de baix és el teu guió',
  guideStep6Green: 'Verda, amb un globus de diàleg',
  guideStep6GreenBody:
    "Les paraules exactes que has de cantar, en veu alta, ara mateix. Estan escrites tal com s'han de dir: només les has de llegir. Apareix uns segons i després s'aparta.",
  guideStep6Amber: 'Ambre',
  guideStep6AmberBody:
    'Què està passant i què hauries de fer. Hi és sempre quan no hi ha res a cantar, així que en cas de dubte, llegeix aquesta línia.',
  guideStep6Signal: 'El dibuix que apareix',
  guideStep6SignalBody:
    "Una targeta petita sobre els panells del marcador mostra el senyal oficial que has de fer amb les mans mentre anuncies. Desapareix sola i mai no s'empassa un toc destinat al panell de sota.",

  guideSignalsTitle: "Quan xiula l'app",
  guideSignalsIntro:
    "El xiulet és com mantens els jugadors al corrent del temps. L'app xiula per tu — i mostra la targeta de xiulet en aquell mateix moment — exactament en aquestes quatre situacions, i en cap més. Xiula tu també per acompanyar, amb el nombre de xiulets que t'indica.",
  guideSignalHalf: "L'inici d'una part",
  guideSignalHalfBody:
    "Un xiulet en l'instant en què comença una part — el primer pull del partit i l'inici de la segona part. Com a avís, també xiules un cop un minut abans, però només quan hi ha una espera de la qual avisar: una hora d'inici programada o un descans de dos minuts o més.",
  guideSignalPoint: 'Abans de cada pull',
  guideSignalPointBody:
    "Després d'un gol, mentre els equips es col·loquen: un xiulet als 45 segons, dos als 60 i tres als 75 — el pull s'ha de llançar ja.",
  guideSignalTimeout: "El final d'un temps mort",
  guideSignalTimeoutBody:
    "Només si els temps morts s'han activat a la configuració — allà també es fixa quants en té cada equip i quant dura un, així que un temps mort pot ser més llarg o més curt que el valor per defecte de l'app. Un temps mort demanat abans del pull: un xiulet en el moment que acaba, i després arrenca de zero el compte normal de 45/60/75. Un temps mort demanat després del pull, amb el disc ja en joc, torna al joc amb un compte enrere al final: un xiulet 30 segons abans que l'atac hagi d'estar llest, dos als 15 i tres quan el disc entra en joc.",
  guideSignalCall: "Una jugada que s'allarga",
  guideSignalCallBody:
    "Quan una falta, un pick, un travel, un stall, un fora de joc, un disc caigut o una jugada genèrica — o una lesió o aturada tècnica — segueix sense resoldre als 45 segons: tres xiulets, i tres més als 60 segons. Després res — l'app segueix comptant l'espera, però deixa de xiular.",

  guideStep7Title: 'Ràtio de gènere (només en mixt)',
  guideStep7Body:
    'A les divisions mixtes, quantes noies i quants nois hi ha al camp està fixat per a cada punt i va canviant al llarg del partit. Els equips ho perden constantment, així que anunciar-ho és de les coses més útils que fas.',
  guideStep7Chip:
    "La ràtio del punt que ve es mostra en una etiqueta sobre els panells del marcador. Parpelleja quan canvia: canta-la perquè els dos equips es col·loquin bé. Toca l'etiqueta per tornar a mostrar el senyal de mans.",
  guideStep7Rules:
    "Quina regla de ràtio s'aplica es decideix a la configuració: la Regla A segueix una seqüència fixa que alterna cada dos punts, i l'aplicació la segueix per tu. La Regla B deixa que ho decideixi la zona d'anotació a cada punt, així que no hi ha res a anunciar. Si no saps quina es fa servir, pregunta-ho als capitans.",

  guideStep8Title: 'Temps morts, half i CAP',
  guideStep8Timeout: 'Temps mort',
  guideStep8TimeoutBody:
    "Quan un equip en demana un, prem el botó petit del cantó superior del panell d'aquell equip; el número que hi ha al costat són els que li queden. Comença un compte enrere i l'aplicació xiula quan s'acaba. El rellotge del partit segueix corrent tota l'estona: és normal.",
  guideStep8Half: 'Half',
  guideStep8HalfBody:
    "L'aplicació canta el half sola tan bon punt un equip arriba al marcador del half, i mai al mig d'un punt. El descans és un compte enrere; prem \"Fi del descans\" si els dos equips estan llestos abans. Després els equips canvien de banda i l'aplicació t'ho diu.",
  guideStep8Cap: 'CAP',
  guideStep8CapBody:
    "Quan s'arriba al límit de temps l'aplicació xiula, però l'objectiu encara no es fixa: el punt que s'està jugant s'acaba primer, exactament com si no hi hagués CAP. Només llavors calcula l'objectiu nou a partir d'aquell marcador ja acabat, el mostra en una etiqueta i et dóna la frase que has de cantar. No hi ha res a calcular.",
  guideStep8Universe: 'Punt universal',
  guideStep8UniverseBody:
    'Quan el gol següent guanya el partit, apareix un avís i la barra et dóna el cant. Anuncia-ho: els dos equips ho volen saber.',

  guideStep9Title: 'Apuntar el que passa',
  guideStep9Body:
    "La fila que hi ha sota els rellotges apunta qualsevol cosa que valgui la pena recordar: el globus de diàleg per a un call, la mà aixecada per a una aturada, les dues fletxes per a una pèrdua. Cap d'ells canvia el marcador ni l'objectiu: escriuen al registre i et diuen què anunciar.",
  guideStep9Calls:
    "Falta, Stall out, Pick, Off-side, Disc a terra, Call: alguna cosa que ha cantat un jugador. Tria qui ho ha cantat i apareixen tres botons sobre els rellotges: Acceptada, Discutida, Retirada. Pregunta als jugadors com ha acabat i prem el que correspongui; l'aplicació registra quant ha durat la discussió.",
  guideStep9Travel:
    'Travel: es canta a qui llança i es mou de manera il·legal. Es registra en un sol pas, sense seguiment.',
  guideStep9Turn:
    "Pèrdua: el disc ha caigut, s'ha llançat fora o l'han interceptat, i ara el té l'altre equip.",
  guideStep9Stoppage:
    "Mà aixecada: lesió o tècnica (material, interferència externa...). El rellotge del partit segueix corrent. Quan el joc pugui continuar, prem «El joc pot continuar» per registrar quant ha durat l'aturada.",
  guideStep9Sotg:
    "SOTG: una aturada d'esperit, darrere d'aquesta mateixa mà aixecada. És l'única de les tres que pausa el rellotge del partit; prem \"Reprendre partit\" quan es reprengui el joc.",
  guideStep9Log:
    "El botó de llista obre tot el que s'ha registrat fins ara, en ordre, perquè puguis comprovar què has apuntat.",
  guideStep9Note:
    'Dins d\'aquesta llista, "Esdeveniment" afegeix text lliure per a qualsevol altra cosa que vulguis a l\'informe.',

  guideStep10Title: 'Final del partit',
  guideStep10Body:
    "L'aplicació acaba el partit sola quan un equip arriba a l'objectiu. Si l'has d'aturar abans, prem la ✕ del cantó superior esquerre, al costat del número de camp, i confirma.",
  guideStep10Report:
    'Llavors apareix l\'informe: el marcador final, unes quantes estadístiques de cada equip i l\'historial complet del partit. "Copiar al porta-retalls" el converteix en text pla que pots enganxar en un missatge o en un full de càlcul; fes-ho abans de sortir de la pantalla. "Nou partit" et torna a la configuració per al següent.',

  guideCheatTitle: 'Resum ràpid',
  guideCheatTap: "Tocar el panell d'un equip",
  guideCheatTapDo: 'Sumar un gol a aquell equip',
  guideCheatHold: 'Mantenir premut el panell',
  guideCheatHoldDo: "Treure l'últim gol d'aquell equip",
  guideCheatGreen: 'Barra verda',
  guideCheatGreenDo: 'Canta exactament el que hi posa',
  guideCheatAmber: 'Barra ambre',
  guideCheatAmberDo: 'Què està passant i què fer',
  guideCheatWhistle: 'Un / dos / tres xiulets',
  guideCheatWhistleDo: '45 / 60 / 75 segons des del gol',
  guideCheatChip: "Tocar l'etiqueta de la ràtio",
  guideCheatChipDo: 'Tornar a mostrar el seu senyal de mans',
  guideCheatLocked: 'El marcador no puja',
  guideCheatLockedDo: "No s'ha llançat el pull, o el joc està aturat",

  guideFigSetupAlt:
    'La part de dalt de la pantalla de configuració: plantilla, divisió i noms dels equips',
  guideFigTossAlt: 'La secció del sorteig de la pantalla de configuració',
  guideFigGameAlt: 'El panell entre punt i punt, esperant el pull',
  guideFigScoreAlt: 'El panell amb el disc en joc',
  guideFigRecordAlt: 'El diàleg de calls',
  guideFigRulesAlt:
    'Les seccions de condicions de victòria, half i temps morts de la pantalla de configuració',
  guideFigReportAlt: "La pantalla de l'informe final",
};
