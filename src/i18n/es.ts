import type { en } from './en';

export const es: typeof en = {
  appTitle: 'Marcador de Ultimate',
  tagline: 'Un asistente guiado para anotadores de Ultimate Frisbee',

  templateTitle: 'Plantilla',
  templateSelectLabel: 'Plantilla',
  templatePredefinedGroup: 'Predefinidas',
  templateCustomGroup: 'Tus plantillas',
  templateGrassName: 'Hierba',
  templateBeachName: 'Playa',
  saveAsTemplateBtn: 'Guardar como plantilla',
  saveTemplateTitle: 'Guardar como plantilla',
  saveTemplateHint:
    'Guarda estos ajustes de reglas para reutilizarlos — no los equipos, el resultado del lanzamiento de moneda ni los jugadores.',
  saveTemplateNamePlaceholder: 'p. ej. Liga de verano',
  btnDeleteTemplate: 'Eliminar plantilla',
  confirmDeleteTemplateTitle: '¿Eliminar plantilla guardada?',
  confirmDeleteTemplate: '¿Eliminar "{name}"? Esta acción no se puede deshacer.',
  setupTitle: 'Configuración del partido',
  division: 'División',
  divisionOpen: 'Open',
  divisionWomen: 'Femenino',
  divisionMixed: 'Mixto',
  fieldNumber: 'Número de campo',
  teamA: 'Equipo 1',
  teamB: 'Equipo 2',
  teamName: 'Nombre del equipo',
  teamColor: 'Color',
  addAsNewTeam: 'Añadir "{name}" como nuevo equipo',
  deleteTeamAria: 'Eliminar el equipo guardado {name}',
  confirmDeleteTeamTitle: '¿Eliminar equipo guardado?',
  confirmDeleteTeam:
    '¿Eliminar "{name}" y su plantilla guardada de este dispositivo? Esta acción no se puede deshacer.',
  btnDeleteTeam: 'Eliminar equipo',
  mixedRatioRule: 'Regla de ratio de género (mixto)',
  ruleA: 'Regla A — prescrita (alterna cada 2 puntos)',
  ruleB: 'Regla B — la zona de anotación decide cada punto',
  coinToss: 'Resultado del sorteo',
  coinTossHelp:
    'Pide a los capitanes que lancen un disco antes del partido y registra aquí el resultado.',
  startingOffense: 'Equipo que recibe el primer pull (ataque)',
  startingSide: 'Equipo que empieza a la izquierda',
  startingRatio: 'Ratio de género inicial',
  ratioMale: 'Chicos',
  ratioFemale: 'Chicas',
  startingTimeEnabled: 'El partido tiene una hora de inicio programada',
  startingTimeLabel: 'Hora de inicio',
  startingTimeInPast: 'La hora de inicio debe ser posterior a la hora actual',
  winConditions: 'Condiciones de victoria',
  targetScore: 'Puntuación',
  halfScore: 'Puntuación',
  timeLimit: 'Tiempo (minutos)',
  halfTimeLimit: 'TIEMPO (Minutos)',
  halfTimeBreak: 'descanso (segundos)',
  endCapLabel: 'CAP',
  endCapNone: 'Sin CAP — terminar el punto actual',
  endCapPlus: 'CAP +{n}',
  endCapCond: 'CAP +{n} condicional (solo si la diferencia tras el punto actual es > {x})',
  capDiff: 'Diferencia requerida',
  halfTimeTitle: 'Half',
  halfCapPlus: 'CAP +1',
  timeoutsTitle: 'Tiempos muertos',
  timeoutsEnabled: 'Permitir tiempos muertos',
  timeoutsPerHalf: 'Por equipo, por half',
  timeoutsPerGame: 'Por equipo, por partido',
  timeoutDuration: 'Duración del tiempo muerto (segundos)',
  timeoutLastFive: 'Prohibir tiempos muertos en los últimos 5 minutos del partido',
  startGame: 'Empezar partido',
  teamsRequired: 'Introduce o selecciona ambos equipos para empezar',
  language: 'Idioma',
  aboutBtn: 'Acerca de',
  aboutTitle: 'Acerca de',
  aboutBackgroundLabel: 'Contexto',
  aboutStory:
    'Esta app está pensada para esos anotadores de torneos de Ultimate Frisbee de nuestra zona — a menudo con poco o ningún conocimiento del deporte. Kýkhë, de EUC, creó una aplicación Android para ayudar a estos anotadores a seguir el tiempo de saque, la ratio de género, el descanso y los tiempos muertos, pero nunca se publicó en la Play Store, por lo que solo llegaba a quienes tenían un móvil Android y un enlace de instalación directo.',
  aboutStory2:
    'Este proyecto continúa esa misma misión: reconstruida para funcionar en cualquier dispositivo, mejorando la usabilidad y la experiencia por el camino. El objetivo no ha cambiado: facilitar el trabajo de esos anotadores y evitar a ambos equipos la frustración de perder la cuenta del saque o de la ratio de género durante el partido.',
  aboutCreditsLabel: 'Créditos',
  aboutDesignedByPrefix: 'Diseñada, desarrollada y mantenida por Xavi #29 de ',
  aboutDesignedBySuffix: '.',
  aboutBasedOnPrefix: 'Basada en una aplicación Android, ',
  aboutBasedOnMiddle: ', de Kýkhë #00 ',
  aboutBasedOnSuffix: '.',
  aboutQuestion: '¿Alguna duda o sugerencia? Abre un issue en GitHub:',

  installBannerTitle: 'Instala Scorekeeper',
  installBannerBody:
    'Añádela a tu pantalla de inicio para acceder en un toque y verla a pantalla completa.',
  installBannerIosBody: 'Toca el icono de compartir y luego "Añadir a pantalla de inicio".',
  installBannerOpenTitle: 'Scorekeeper ya está instalada',
  installBannerOpenBody: 'Ábrela desde tu pantalla de inicio para la mejor experiencia.',
  btnInstall: 'Instalar',
  dismissBanner: 'Descartar',

  playersTitle: 'Jugadores',
  collapseSection: 'Contraer {title}',
  expandSection: 'Expandir {title}',
  trackPlayers:
    'Registrar actividad de jugadores (goles, asistencias, pérdidas, defensas, lesiones)',
  playerNumber: '#',
  playerName: 'Nombre',
  addPlayer: 'Añadir',
  removePlayer: 'Quitar',
  close: 'Cerrar',
  noPlayersYet: 'Todavía no se han añadido jugadores.',
  btnPlayers: 'Jugadores',
  assistDialogTitle: '¿Quién anotó por {team}?',
  whoScored: 'Anotador',
  whoAssisted: 'Asistencia',
  stoppageDialogTitle: '¿Qué ha parado el juego?',
  stoppageDialogHint: 'Elige de qué tipo de parada se trata.',
  stoppageKind_injury: 'Lesión',
  stoppageKind_technical: 'Técnica',
  injuryDialogTitle: '¿Quién se lesionó?',
  injuryDialogHint: 'Opcional — puedes omitir y solo registrar la lesión.',
  technicalStoppageTitle: 'Parada técnica — ¿quién la llamó?',
  technicalStoppageHint:
    'Material, interferencia externa y similares. Opcional — también puedes omitir el equipo.',
  btnNoTeam: 'Sin equipo',
  turnoverDialogTitle: 'Pérdida',
  turnoverDialogHint: 'Opcional — puedes omitir y solo registrar la pérdida.',
  whoTurnedOver: '{team} — ¿quién perdió el disco? (drop, mal pase, stall)',
  whoDefended: '{team} — ¿quién la forzó? (bloqueo, buena defensa)',
  btnSave: 'Guardar',
  assistedBy: 'asistencia: {name}',
  turnoverBy: 'pérdida: {name}',
  defenseBy: 'D: {name}',

  field: 'Campo {n}',
  half1: '1ª parte',
  half2: '2ª parte',
  gameClock: 'Reloj de partido',
  timeBeforeGame: 'Tiempo hasta el inicio',
  awaitingStartDotLabel: 'Esperando la hora de inicio programada',
  pullTimer: 'Tiempo de pull',
  timeoutTimer: 'Tiempo muerto',
  halftimeTimer: 'Half',
  pauseLabel: 'Pausado',
  pullThrown: 'Pull lanzado',
  btnPauseGame: 'Pausar partido',
  btnResumeGame: 'Reanudar partido',
  confirmPauseGame:
    'Solo detén el partido por una parada de espíritu (SOTG), una parada técnica de torneo, una parada prolongada o mal tiempo. El reloj se detendrá hasta que reanudes.',
  confirmPauseGameTitle: '¿Pausar el partido?',
  btnPauseGameConfirm: 'Pausar partido',
  btnStoppage: 'Parada',
  btnTurnover: 'Pérdida',
  btnRecordEvent: 'Registrar',
  btnSotg: 'SOTG',
  btnEndHalftime: 'Fin del descanso',
  btnSettings: 'Ajustes',
  btnLog: 'Registro',
  btnEndGame: 'Fin del partido',
  btnEndTimeout: 'Fin del tiempo muerto',
  confirmEndGame: '¿Terminar el partido ahora y abrir el informe?',
  confirmEndGameTitle: '¿Terminar el partido?',
  btnCancel: 'Cancelar',
  btnConfirm: 'Terminar partido',
  btnDone: 'Listo',
  timeoutsLeft: '{n} tiempos muertos restantes',
  timeoutBlockedLastFive: 'No se permiten tiempos muertos en los últimos 5 minutos',
  timeoutBlockedNone: 'Este equipo no tiene tiempos muertos restantes',
  timeoutBlockedNotNow: 'Los tiempos muertos solo pueden pedirse durante el juego',
  timeoutBlockedCallPending:
    'Los tiempos muertos están bloqueados hasta resolver la falta pendiente',
  currentRatio: 'Ratio: {gender}',
  pullChip: 'Pull: {team} ({side})',
  halfCapChip: 'Half a {n}',
  gameCapChip: 'Partido a {n}',
  sideLeft: 'Izquierda',
  sideRight: 'Derecha',
  target: 'Objetivo: {n}',
  universePointBadge: 'Universal',

  // Registrar evento — el diálogo tras el botón «Registrar» y todo lo que se abre
  // desde él. Nada de esto cambia el marcador, el reloj ni la posesión.
  recordEventTitle: 'Registrar evento',
  recordEventHint: 'Registra lo que acaba de pasar. Nada de esto cambia el marcador ni el reloj.',
  btnTravel: 'Travel',
  btnNote: 'Evento',
  callKind_foul: 'Falta',
  callKind_stallOut: 'Stall out',
  callKind_pick: 'Pick',
  callKind_offside: 'Off-side',
  callKind_discDown: 'Disco al suelo',
  callKind_generic: 'Llamado',
  callTeamTitle: '{kind} — ¿quién lo llamó?',
  callTeamHint: 'Después indica cómo acabó con los botones que aparecen sobre los relojes.',
  travelTeamTitle: 'Travel — ¿quién lo llamó?',
  travelTeamHint: 'Se registra en cuanto eliges un equipo — no hace falta nada más.',
  callPending: '{kind} — {team}',
  callResolution_accepted: 'Aceptada',
  callResolution_contested: 'Discutida',
  callResolution_retracted: 'Retirada',
  callResolvedIn: 'resuelta en {n}s',
  callBlockedPending: 'Resuelve primero la llamado en curso.',
  recordEventBlockedPull:
    'Pérdida, parada, travel y las llamadas necesitan que se lance el pull primero.',
  stoppagePending: '{kind} — el juego aún no se ha reanudado.',
  btnStoppageResolved: 'El juego puede continuar',
  noteTitle: 'Evento',
  noteHint:
    'Cualquier cosa digna de recordar — un layout increíble, un pájaro cruzando el campo...',
  notePlaceholder: '¿Qué ha pasado?',

  // Tarjeta de señal (bajo el reloj de partido) — la señal oficial WFDF a hacer
  handSignal: 'Señal de mano',
  signal_goal: 'Gol',
  signal_timeout: 'Tiempo muerto',
  signal_stoppage: 'Parada de juego',
  signal_sotg: 'Parada de espíritu',
  signal_ratioMale: 'Ratio: Chicos',
  signal_ratioFemale: 'Ratio: Chicas',
  signal_whistle: 'Silbato',
  signal_universePoint: 'Universal',
  signal_travel: 'Travel',
  signal_foul: 'Falta',
  // WFDF no tiene pictograma propio de stall out; la señal de tiempo es la más cercana.
  signal_stallOut: 'Stall out',
  signal_pick: 'Pick',
  signal_offside: 'Off-side',
  signal_discDown: 'Disco al suelo',
  signal_call: 'Juego detenido',
  signal_accepted: 'No discutida',
  signal_contested: 'Discutida',
  signal_retracted: 'Retirada',

  // Mensajes a gritar (verde) — las palabras exactas, junto a la señal
  say_startSoon: '«¡Un minuto para empezar!»',
  say_gameOn: '«¡Game on!»',
  say_secondHalf: '«¡Segunda parte — game on!»',
  say_score: '«¡{a} {as}, {b} {bs}!»',
  say_halfAt: '«¡{a} {as}, {b} {bs} — half a {halfN}!»',
  say_gameAt: '«¡{a} {as}, {b} {bs} — partido a {n}!»',
  say_ratio: '«¡Siguiente punto: {gender}!»',
  say_scoreCorrection: '«¡Corrección — {a} {as}, {b} {bs}!»',
  say_discIn: '«¡Disco dentro!»',
  say_timeout: '«¡Tiempo muerto, {team}!»',
  say_timeIn: '«¡Tiempo — se reinicia la cuenta del saque!»',
  say_playRestart: '«¡Juego — disco en juego!»',
  say_injury: '«¡Lesión — paren el juego!»',
  say_technicalStoppage: '«¡Parada de juego!»',
  say_spirit: '«¡Parada de espíritu!»',
  say_halftime: '«¡Half!»',
  say_timeCap: '«¡Time cap — partido a {n}!»',
  say_timeCapFinish: '«¡Tiempo! Terminen este punto — el partido acaba después.»',
  say_timeCapPending: '«¡Time cap — terminen este punto!»',
  say_halfCap: '«¡Half cap — half a {halfN}!»',
  say_halfCapNone: '«¡Half tras este punto!»',
  say_halfCapPending: '«¡Half cap — terminad este punto!»',
  say_gameOver: '«¡Fin del partido — {a} {as}, {b} {bs}!»',
  say_universePoint: '«¡{a} {as}, {b} {bs} — universal!»',
  say_travel: '«¡Travel!»',
  say_callFoul: '«¡Falta — {team}!»',
  say_callStallOut: '«¡Stall out — {team}!»',
  say_callPick: '«¡Pick — {team}!»',
  say_callOffside: '«¡Off-side — {team}!»',
  say_callDiscDown: '«¡Disco al suelo — {team}!»',
  say_callGeneric: '«¡Llamado de {team} — juego detenido!»',
  say_resolutionAccepted: '«¡No discutida — seguid jugando!»',
  say_resolutionContested: '«¡Discutida — el disco vuelve al lanzador!»',
  say_resolutionRetracted: '«¡Retirada — seguid jugando!»',

  // Línea de estado (ámbar) — qué pasa ahora y qué hacer
  now_setup: 'Rellena la configuración y pulsa «Empezar partido».',
  now_awaitingStart:
    'Esperando la hora de inicio programada. El juego se desbloqueará automáticamente.',
  now_awaitingPull:
    'Los equipos se están alineando. Pulsa «Pull lanzado» en el momento del lanzamiento.',
  now_discInPlay: 'Disco en juego. Toca el panel del equipo cuando anote en la zona contraria.',
  now_timeout: 'Tiempo muerto en curso. Termina solo, o pulsa «Fin del tiempo muerto».',
  now_toReady30:
    'El tiempo muerto acaba — 30 segundos para que el ataque esté listo. Un silbato a los 30.',
  now_toReady15: '15 segundos para que el ataque esté listo. Dos silbatos al agotarse el tiempo.',
  now_toReady0: 'El ataque debería estar listo — tres silbatos y el disco entra en juego.',
  now_halftime:
    'Descanso. Se reanuda solo cuando termine el tiempo, o pulsa «Fin del descanso» si ambos equipos están listos antes.',
  now_halftimeWarn:
    'Un minuto para la segunda parte. Un silbato — los equipos deberían ir preparándose.',
  now_callWait:
    'Jugada sin resolver — tres silbatos ahora, y otra vez cada 15 segundos hasta que se resuelva.',
  now_paused: 'Parada de espíritu. Reloj pausado — pulsa «Reanudar partido» para continuar.',
  now_pauseManual: 'Partido pausado. Reloj detenido — pulsa «Reanudar partido» para continuar.',
  now_stoppageClockStopped:
    'Partido detenido: la parada lleva más de 2 minutos. Pulsa «Reanudar partido» en cuanto el juego pueda continuar.',
  now_finished: 'Partido terminado.',
  now_pull45: 'Un pitido — 45 segundos. Los equipos deben prepararse.',
  now_pull60: 'Dos pitidos — 60 segundos. Los equipos deben señalar que están listos.',
  now_pull75: 'Tres pitidos — 75 segundos. El pull DEBE lanzarse ya.',
  now_universePoint: 'Universal — {a} {as}, {b} {bs}. ¡El próximo gol termina el partido!',

  assist_blocked_gameNotStarted: 'Marcador bloqueado: el partido aún no ha empezado.',
  assist_blocked_pullNotThrown:
    'Marcador bloqueado: pulsa «Pull lanzado» primero — el disco no está en juego.',
  assist_blocked_gamePaused: 'Marcador bloqueado mientras el juego está pausado.',
  assist_blocked_timeoutActive: 'Marcador bloqueado durante un tiempo muerto.',
  assist_blocked_halftimeActive: 'Marcador bloqueado durante el half.',
  assist_blocked_minScoreZero: 'El marcador no puede bajar de 0.',
  assist_blocked_notLastScorer: 'Solo se puede deshacer el último gol (mantén pulsado ese equipo).',
  assist_blocked_gameFinished: 'El partido ha terminado.',
  assist_blocked_nothingToUndo: 'Todavía no hay ningún gol que deshacer.',
  assist_blocked_callPending: 'Marcador bloqueado: resuelve primero la falta pendiente.',

  reportTitle: 'Informe final',
  reportStarted: 'Inicio: {time}',
  reportFinished: 'Fin: {time}',
  reportDuration: 'Duración: {duration}',
  finalScore: 'Marcador final',
  statOLineHolds: 'Holds de ataque',
  statBreaks: 'Breaks',
  statAvgHold: 'Duración media de hold',
  statAvgBreak: 'Duración media de break',
  statTimeouts: 'Tiempos muertos usados',
  historyTitle: 'Historial del partido',
  colTime: 'Hora',
  colClock: 'Reloj',
  colEvent: 'Evento',
  colTeam: 'Equipo',
  colDetail: 'Detalle',
  copyReport: 'Copiar al portapapeles',
  copied: '¡Copiado!',
  copyFailed: 'No se pudo copiar — inténtalo de nuevo',
  newGame: 'Nuevo partido',
  event_gameStart: 'Inicio del partido',
  event_goal: 'Gol',
  event_undo: 'Corrección del marcador (deshacer)',
  event_timeout: 'Tiempo muerto',
  event_timeoutEnd: 'Fin del tiempo muerto',
  event_stoppage: 'Parada',
  event_stoppageResolved: 'Parada resuelta',
  event_stoppageClockStopped: 'Reloj del partido detenido (parada de más de 2 min)',
  event_turnover: 'Pérdida',
  event_travel: 'Travel',
  event_call: 'Llamado',
  event_callResolved: 'Llamado resuelto',
  event_note: 'Evento',
  event_sotgStart: 'Parada SOTG (reloj pausado)',
  event_sotgEnd: 'Fin de la parada SOTG',
  event_pauseStart: 'Partido pausado (reloj detenido)',
  event_pauseEnd: 'Partido reanudado',
  event_halftimeStart: 'Half',
  event_halftimeEnd: 'Inicio de la segunda parte',
  event_timeCap: 'CAP de tiempo alcanzado',
  event_halfTimeCap: 'CAP de half alcanzado',
  event_gameEnd: 'Fin del partido',

  // Guía
  guideLink: '¿Cómo funciona esta aplicación?',
  guideTitle: 'Cómo funciona la aplicación',
  guideSubtitle: 'Una guía para quien anota por primera vez',
  guideBack: 'Volver a la configuración',
  guideBackShort: 'Configuración',
  guideIntro:
    'No hace falta saber de Ultimate Frisbee para llevar el marcador con esta aplicación. Sigue estos pasos en orden: durante el partido la aplicación te dice qué está pasando, qué hacer y las palabras exactas que tienes que cantar.',
  guideScreenshotNote:
    'Las capturas de pantalla están en inglés. La aplicación usa el idioma que elijas arriba.',

  guideSportTitle: 'El deporte en un minuto',
  guideSportBody:
    'Dos equipos de siete se pasan un disco. Un equipo anota un punto cuando uno de sus jugadores atrapa el disco dentro de la zona de anotación que ataca. Nadie puede correr con el disco en la mano, y si el disco cae al suelo o lo intercepta el otro equipo, la posesión cambia ahí mismo.',
  guideSportPull:
    'Cada punto empieza con un pull: el equipo que defiende lanza el disco hacia el otro lado del campo, como un saque inicial. Después de cada gol los equipos cambian de lado y el equipo que acaba de anotar hace el pull al otro.',
  guideSportRole:
    'No hay árbitros: los propios jugadores cantan sus faltas y las resuelven entre ellos. Tú tampoco arbitras. Llevas el marcador y los relojes, y anuncias las pocas cosas que los dos equipos necesitan oír: la cuenta del pull, el marcador, la ratio de género, el half, los CAP y el final del partido.',

  guideStep1Title: 'Configura el partido',
  guideStep1Body:
    'La primera pantalla describe el partido que vas a anotar. Casi todo viene ya relleno: normalmente solo tienes que escribir los nombres de los dos equipos.',
  guideStep1Template: 'Plantilla',
  guideStep1TemplateBody:
    'Hierba y Playa rellenan todas las reglas de abajo con los valores habituales de esa superficie. Si tu torneo juega con otras, cambia los campos y pulsa "Guardar como plantilla" al final para reutilizarlas la próxima vez.',
  guideStep1Division: 'División',
  guideStep1DivisionBody:
    'Open, Femenino o Mixto. La mixta añade la ratio de género, que tendrás que anunciar cada punto (paso 7).',
  guideStep1Teams: 'Nombres y colores de los equipos',
  guideStep1TeamsBody:
    'Escribe cada nombre, o elige un equipo que guardaste antes. Elige un color parecido al de las camisetas de cada equipo: los paneles del marcador van pintados con esos colores todo el partido, así nunca tienes que recordar qué lado es cuál.',
  guideStep1Players: 'Jugadores',
  guideStep1PlayersBody:
    'Opcional. Si añades las plantillas y marcas "Registrar actividad de jugadores", la aplicación te pregunta quién anotó y quién asistió después de cada gol. Déjalo sin marcar si estás solo: el marcador, los relojes y el informe funcionan igual sin ello.',
  guideStep1Time: 'Hora de inicio prevista',
  guideStep1TimeBody:
    'Opcional. Márcalo y la aplicación hace la cuenta atrás hasta la hora de inicio y desbloquea el juego sola cuando llega.',

  guideStep2Title: 'Anota el sorteo',
  guideStep2Body:
    'Antes del partido los dos capitanes lanzan un disco al aire. Quien gana elige recibir el pull o el lado que quiere defender, y el otro se queda con la opción restante. Pregúntales qué han decidido y anótalo aquí: la aplicación lo necesita para saber quién hace el pull, hacia dónde ataca cada equipo y cómo se coloca el marcador.',
  guideStep2Offense: 'Equipo que recibe el primer pull',
  guideStep2OffenseBody:
    'El equipo que atrapa o recoge el pull. Ataca primero; el otro equipo hace el pull.',
  guideStep2Side: 'Equipo que empieza a la izquierda',
  guideStep2SideBody:
    'La izquierda tal y como ves el campo desde donde estás. Ese equipo se queda a la izquierda del marcador todo el partido, aunque los equipos cambien de lado en cada punto.',
  guideStep2Ratio: 'Ratio de género inicial',
  guideStep2RatioBody:
    'Solo en mixto: si el primer punto se juega con mayoría de mujeres o de hombres en el campo.',

  guideStep3Title: 'Comprueba cómo acaba el partido',
  guideStep3Body:
    'Un partido acaba cuando un equipo llega al marcador objetivo o cuando se acaba el tiempo, lo que pase antes. Si no lo tienes claro, léeles estos campos a los capitanes: ellos lo sabrán.',
  guideStep3Score: 'Puntos y tiempo',
  guideStep3ScoreBody:
    'El marcador objetivo y cuántos minutos dura el partido. El reloj corre desde el primer pull hasta el final y no se para ni en los tiempos muertos ni en el half.',
  guideStep3Cap: 'CAP',
  guideStep3CapBody:
    'Qué pasa cuando se acaba el tiempo, y nunca pasa a mitad de un punto. Supón que el marcador va 9–7 cuando se llega al límite de tiempo: el punto que se está jugando se termina primero, exactamente como si no hubiera CAP. Solo cuando ese punto acaba se aplica el CAP, sobre el marcador que haya en ese momento. Si acaba 10–7, "CAP +1" fija el objetivo en el marcador nuevo del que va ganando más uno: un partido a 11, no a 10. "Sin CAP" simplemente termina el partido ahí, en 10–7. El CAP condicional solo añade ese punto extra si los dos marcadores siguen lo bastante cerca una vez terminado el punto. Nunca tienes que calcularlo tú: la aplicación pita cuando se acaba el tiempo, espera a que termine el punto y entonces te muestra el objetivo nuevo y te da las palabras que cantar.',
  guideStep3Half: 'Half',
  guideStep3HalfBody:
    'Las mismas tres cosas para la primera parte: el marcador que activa el half, su propio límite de tiempo y su propio CAP, además de cuánto dura el descanso.',
  guideStep3Timeouts: 'Tiempos muertos',
  guideStep3TimeoutsBody:
    'Cuántos puede pedir cada equipo y cuánto duran. Desmarca "Permitir tiempos muertos" si en este torneo no hay, y los botones desaparecen del panel.',
  guideStep3Start: 'Cuando los dos nombres estén puestos, pulsa "Empezar partido".',

  guideStep4Title: 'Conoce el panel',
  guideStep4Body:
    'Es la única pantalla que usarás durante el partido. Nada de lo que hay aquí se puede pulsar sin querer de forma irreversible.',
  guideTour1:
    'Número de campo, la hora, en qué parte vamos y el marcador al que se juega el partido.',
  guideTour2:
    'Un panel por equipo, pintado con el color del equipo. Aquí es donde sumas goles (paso 5).',
  guideTour3:
    'Recordatorios del punto que va a empezar: quién hace el pull y desde qué lado, la ratio de género y el objetivo una vez anunciado.',
  guideTour4:
    'El único botón que importa en ese momento: aquí, "Pull lanzado". Cambia a "Fin del tiempo muerto", "Fin del descanso" o "Reanudar partido" cuando toca, y está vacío mientras el disco está en juego.',
  guideTour5:
    'El reloj del partido y, al lado, el segundo reloj: los segundos desde el último gol entre punto y punto, o la cuenta atrás del tiempo muerto o del half.',
  guideTour6:
    'Los tiempos muertos de cada equipo, con los que les quedan. En el centro: registrar un evento, abrir el historial y la lista de jugadores si el registro de jugadores está activado.',
  guideTour7: 'La barra de ayuda: qué cantar y qué hacer. Ver el paso 6.',
  guideTour8:
    'El pequeño botón de pausa junto al reloj del partido. Todo lo demás —un tiempo muerto, el half, una falta— ya funciona sin pararlo; pulsa esto solo para los casos extraordinarios que pregunta la confirmación: una parada de SOTG, una parada técnica del torneo, una parada prolongada o mal tiempo. El reloj se para en cuanto confirmas, y sigue parado hasta que reanudas.',

  guideStep5Title: 'Jugar un punto',
  guideStep5Body:
    'Después de cada gol los equipos van a sus zonas y se colocan. El segundo reloj cuenta los segundos desde que se anotó el gol, y la aplicación pita por ti:',
  guideWhistle45: '45 s — un pitido. Los dos equipos deberían estar casi listos.',
  guideWhistle60: '60 s — dos pitidos. Los dos equipos deben indicar que están listos.',
  guideWhistle75: '75 s — tres pitidos. El pull tiene que lanzarse ya.',
  guideStep5Pull: 'Pulsa "Pull lanzado"',
  guideStep5PullBody:
    'En el momento en que el disco sale de la mano de quien hace el pull. Eso es lo que arranca el punto: hasta que lo pulsas el marcador está bloqueado, porque no puede haber gol antes del pull.',
  guideStep5Score: 'Toca un panel para anotar',
  guideStep5ScoreBody:
    'Cuando un equipo atrapa el disco en la zona que ataca, toca una vez el panel de ese equipo. El marcador sube uno y la barra de abajo te da las palabras que cantar.',
  guideStep5Undo: 'Mantén pulsado un panel para quitar un gol',
  guideStep5UndoBody:
    '¿Has tocado el equipo equivocado, o el gol al final no valía? Mantén pulsado el panel de ese equipo aproximadamente un segundo y el gol desaparece. Un toque suma uno, una pulsación larga quita uno: así nada baja el marcador por accidente. Solo se puede deshacer el último gol, y la aplicación anuncia la corrección para que los dos equipos la oigan.',

  guideStep6Title: 'La barra de abajo es tu guion',
  guideStep6Green: 'Verde, con un bocadillo',
  guideStep6GreenBody:
    'Las palabras exactas que tienes que cantar, en voz alta, ahora mismo. Están escritas tal cual hay que decirlas: solo tienes que leerlas. Aparece unos segundos y luego se aparta.',
  guideStep6Amber: 'Ámbar',
  guideStep6AmberBody:
    'Qué está pasando y qué deberías hacer. Está siempre ahí cuando no hay nada que cantar, así que ante la duda, lee esta línea.',
  guideStep6Signal: 'El dibujo que aparece',
  guideStep6SignalBody:
    'Una tarjeta pequeña sobre los paneles del marcador muestra la señal oficial que hay que hacer con las manos mientras anuncias. Desaparece sola y nunca se traga un toque destinado al panel de debajo.',

  guideSignalsTitle: 'Cuándo pita la app',
  guideSignalsIntro:
    'El silbato es como mantienes a los jugadores al tanto del tiempo. La app pita por ti — y muestra la tarjeta de silbato en ese mismo momento — exactamente en estas cuatro situaciones, y en ninguna más. Pita tú también para acompañar, con el número de pitidos que te indica.',
  guideSignalHalf: 'El inicio de una parte',
  guideSignalHalfBody:
    'Un pitido en el instante en que empieza una parte — el primer pull del partido y el inicio de la segunda parte. Como aviso, también pitas una vez un minuto antes, pero solo cuando hay una espera de la que avisar: una hora de inicio programada o un descanso de dos minutos o más.',
  guideSignalPoint: 'Antes de cada pull',
  guideSignalPointBody:
    'Tras un gol, mientras los equipos se colocan: un pitido a los 45 segundos, dos a los 60 y tres a los 75 — el pull debe lanzarse ya.',
  guideSignalTimeout: 'El final de un tiempo muerto',
  guideSignalTimeoutBody:
    'Un tiempo muerto pedido antes del pull: un pitido cuando termina, y luego arranca de cero la cuenta normal de 45/60/75. Un tiempo muerto pedido después del pull: una cuenta atrás hasta volver al juego — un aviso 30 segundos antes, un pitido a los 15, dos cuando el ataque debería estar listo y tres cuando el disco entra en juego.',
  guideSignalCall: 'Una jugada que se alarga',
  guideSignalCallBody:
    'Cuando una falta, un pick, un travel, un stall, un fuera de juego, un disco caído o una jugada genérica — o una lesión o parada técnica — sigue sin resolverse a los 45 segundos: tres pitidos, y tres más cada 15 segundos hasta que se resuelva.',

  guideStep7Title: 'Ratio de género (solo en mixto)',
  guideStep7Body:
    'En las divisiones mixtas, cuántas mujeres y cuántos hombres hay en el campo está fijado para cada punto y va cambiando a lo largo del partido. Los equipos lo pierden constantemente, así que anunciarlo es de las cosas más útiles que haces.',
  guideStep7Chip:
    'La ratio del punto que viene se muestra en una etiqueta sobre los paneles del marcador. Parpadea cuando cambia: cántala para que los dos equipos se coloquen bien. Toca la etiqueta para volver a mostrar la señal de manos.',
  guideStep7Rules:
    'Qué regla de ratio se aplica se decide en la configuración: la Regla A sigue una secuencia fija que alterna cada dos puntos, y la aplicación la sigue por ti. La Regla B deja que lo decida la zona de anotación en cada punto, así que no hay nada que anunciar. Si no sabes cuál se usa, pregunta a los capitanes.',

  guideStep8Title: 'Tiempos muertos, half y CAP',
  guideStep8Timeout: 'Tiempo muerto',
  guideStep8TimeoutBody:
    'Cuando un equipo pide uno, pulsa el botón del color de ese equipo debajo de los relojes; el número que hay al lado son los que le quedan. Empieza una cuenta atrás y la aplicación pita cuando se acaba. El reloj del partido sigue corriendo todo el rato: es normal.',
  guideStep8Half: 'Half',
  guideStep8HalfBody:
    'La aplicación canta el half sola en cuanto un equipo llega al marcador del half, y nunca en mitad de un punto. El descanso es una cuenta atrás; pulsa "Fin del descanso" si los dos equipos están listos antes. Después los equipos cambian de lado y la aplicación te lo dice.',
  guideStep8Cap: 'CAP',
  guideStep8CapBody:
    'Cuando se llega al límite de tiempo la aplicación pita, pero el objetivo aún no se fija: el punto que se está jugando termina primero, exactamente como si no hubiera CAP. Solo entonces calcula el objetivo nuevo a partir de ese marcador ya terminado, lo muestra en una etiqueta y te da la frase que cantar. No hay nada que calcular.',
  guideStep8Universe: 'Punto universal',
  guideStep8UniverseBody:
    'Cuando el siguiente gol gana el partido, aparece un aviso y la barra te da el cántico. Anúncialo: los dos equipos quieren saberlo.',

  guideStep9Title: 'Apuntar lo que pasa',
  guideStep9Body:
    'El botón "Registrar" (la lista con un +) apunta cualquier cosa que merezca la pena recordar. Nada de lo que hay detrás de ese botón cambia el marcador, la posesión ni el reloj: solo escribe en el historial y te dice qué anunciar.',
  guideStep9Calls:
    'Falta, Stall out, Pick, Off-side, Disco al suelo, Llamado: algo que ha cantado un jugador. Elige quién lo ha cantado y aparecen tres botones sobre los relojes: Aceptada, Discutida, Retirada. Pregunta a los jugadores cómo ha acabado y pulsa el que corresponda; la aplicación registra cuánto ha durado la discusión.',
  guideStep9Travel:
    'Travel: se canta a quien lanza y se mueve de forma ilegal. Se registra en un solo paso, sin seguimiento.',
  guideStep9Turn:
    'Turn: una pérdida. El disco se ha caído, se ha lanzado fuera o lo han interceptado, y ahora lo tiene el otro equipo.',
  guideStep9Stoppage:
    'Parada: lesión o técnica (material, interferencia externa...). El reloj del partido sigue corriendo. Cuando el juego pueda continuar, pulsa «El juego puede continuar» para registrar cuánto duró la parada.',
  guideStep9Sotg:
    'SOTG: una parada de espíritu. Es lo único que pausa el reloj del partido; pulsa "Reanudar partido" cuando se reanude el juego.',
  guideStep9Note: 'Evento: texto libre para cualquier otra cosa que quieras en el informe.',
  guideStep9Log:
    'El botón de lista sencilla que hay al lado abre todo lo registrado hasta ahora, en orden, para que puedas comprobar lo que has apuntado.',

  guideStep10Title: 'Final del partido',
  guideStep10Body:
    'La aplicación termina el partido sola cuando un equipo llega al objetivo. Si tienes que pararlo antes, pulsa "Fin del partido" al final del panel y confirma.',
  guideStep10Report:
    'Entonces aparece el informe: el marcador final, unas cuantas estadísticas de cada equipo y el historial completo del partido. "Copiar al portapapeles" lo convierte en texto plano que puedes pegar en un mensaje o en una hoja de cálculo; hazlo antes de salir de la pantalla. "Nuevo partido" te devuelve a la configuración para el siguiente.',

  guideCheatTitle: 'Resumen rápido',
  guideCheatTap: 'Tocar el panel de un equipo',
  guideCheatTapDo: 'Sumar un gol a ese equipo',
  guideCheatHold: 'Mantener pulsado el panel',
  guideCheatHoldDo: 'Quitar el último gol de ese equipo',
  guideCheatGreen: 'Barra verde',
  guideCheatGreenDo: 'Canta exactamente lo que pone',
  guideCheatAmber: 'Barra ámbar',
  guideCheatAmberDo: 'Qué está pasando y qué hacer',
  guideCheatWhistle: 'Uno / dos / tres pitidos',
  guideCheatWhistleDo: '45 / 60 / 75 segundos desde el gol',
  guideCheatChip: 'Tocar la etiqueta de la ratio',
  guideCheatChipDo: 'Volver a mostrar su señal de manos',
  guideCheatLocked: 'El marcador no sube',
  guideCheatLockedDo: 'No se ha lanzado el pull, o el juego está parado',

  guideFigSetupAlt:
    'La parte de arriba de la pantalla de configuración: plantilla, división y nombres de los equipos',
  guideFigTossAlt: 'La sección del sorteo de la pantalla de configuración',
  guideFigGameAlt: 'El panel entre punto y punto, esperando el pull',
  guideFigScoreAlt: 'El panel con el disco en juego',
  guideFigRecordAlt: 'El diálogo de registrar evento',
  guideFigRulesAlt:
    'Las secciones de condiciones de victoria, half y tiempos muertos de la pantalla de configuración',
  guideFigReportAlt: 'La pantalla del informe final',
};
