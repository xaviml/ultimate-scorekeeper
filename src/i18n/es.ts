import type { en } from './en';

export const es: typeof en = {
  appTitle: 'Ultimate Scorekeeper',

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
  fieldNumber: 'Campo',
  teamA: 'Equipo 1',
  teamB: 'Equipo 2',
  teamName: 'Nombre del equipo',
  teamColor: 'Color',
  addAsNewTeam: 'Añadir "{name}" como nuevo equipo',
  deleteTeamAria: 'Eliminar el equipo guardado {name}',
  clearTeamNameAria: 'Borrar {name}',
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
  timeoutsCount: 'Por equipo',
  timeoutsScope: 'Asignación',
  timeoutsScopeHalf: 'Por half',
  timeoutsScopeGame: 'Por partido',
  timeoutDuration: 'Duración del tiempo muerto (segundos)',
  timeoutLastFive: 'Prohibir tiempos muertos en los últimos 5 minutos del partido',
  waterBreakTitle: 'Pausas de hidratación',
  waterBreakHelp:
    'Pausas de hidratación por calor (Apéndice B4.3 de la WFDF): paradas adicionales entre puntos que deciden los oficiales del torneo. Nunca consumen los tiempos muertos de ningún equipo. También puedes pedir una a mano durante el partido, con el botón de la mano levantada.',
  waterBreakEnabled: 'Pedir las pausas automáticamente',
  waterBreakScores: 'Cuando el primer equipo llegue a',
  waterBreakDuration: 'Duración de la pausa (segundos)',
  startGame: 'Empezar partido',
  teamsRequired: 'Introduce o selecciona ambos equipos para empezar',
  duplicateTeamNames: 'Los nombres de los equipos deben ser diferentes',
  halfScoreInvalid: 'El marcador de descanso debe ser menor que el marcador objetivo',
  language: 'Idioma',
  pastGamesTitle: 'Historial de partidos',
  pastGamesEmpty:
    'Todavía no hay partidos guardados. Un partido se guarda aquí automáticamente en cuanto se anota su último punto.',
  deleteGameAria: 'Eliminar {match} de los partidos anteriores',
  confirmDeleteGameTitle: '¿Eliminar este partido?',
  confirmDeleteGame: '¿Eliminar "{match}" de este dispositivo? Esta acción no se puede deshacer.',
  btnDeleteGame: 'Eliminar partido',
  btnBack: 'Volver',
  aboutBtn: 'Acerca de la app',
  aboutTitle: 'Acerca de',
  aboutStoryBold: 'Ultimate Scorekeeper',
  aboutStory: ' está diseñada para anotadores que no necesariamente conocen el deporte.',
  aboutStory2:
    ' Una barra de asistencia permanente indica al anotador exactamente qué decir y qué señal de mano usar en cada momento del partido, para que no haga falta experiencia previa en Ultimate para llevar un partido.',
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

  statsTitle: 'Estadísticas',
  statsModeLabel: 'Registrar',
  statsModeNone: 'Solo el marcador',
  statsModeNoneHint:
    'Marcador, relojes y ratio. Las faltas y las paradas siguen quedando en el registro, pero sin decir de quién fueron.',
  statsModeTeams: 'Por equipo',
  statsModeTeamsHint:
    'Añade la pregunta "¿qué equipo?" a cada falta, travelling y parada. No hace falta roster, y nunca se nombra a nadie.',
  statsModePlayers: 'Por jugador',
  statsModePlayersHint:
    'Añade un roster, para que los goles, asistencias, pérdidas y lesiones puedan nombrar a un jugador. Escríbela debajo.',
  trackedTeamLabel: 'Jugadores de',
  trackedTeamBoth: 'Ambos equipos',
  trackTurnoversLabel: 'Pérdidas',
  trackTurnoversHint:
    'Añade el botón Turn a la pantalla de juego, y con él la barra de posesión, las estadísticas en vivo y las cifras de pérdidas del informe.',
  trackGoalPlayersLabel: 'Preguntar quién marcó',
  trackGoalPlayersHint:
    'Desactivado, un gol es solo un gol. Activado, pregunta por el anotador y la asistencia — siempre puedes rellenarlos después desde el registro.',
  trackTurnoverPlayersLabel: 'Preguntar quién perdió el disco',
  trackTurnoverPlayersHint:
    'Desactivado, Turn solo registra la pérdida. Activado, pregunta quién perdió el disco y quién lo forzó — más detalle, pero muchos toques en un punto rápido.',

  // Seguimiento de líneas. Solo en modo Estadísticas de equipo, donde se sigue un
  // único roster (ver lineTrackingEnabled). MMP/FMP son los términos de la WFDF y
  // se quedan en inglés en todos los diccionarios, como las etiquetas lbl*.
  linesTitle: 'Líneas',
  linesEnabledLabel: 'Registrar quién juega cada punto',
  linesEnabledHint:
    'Registra la línea que salta al campo en cada punto, para que el informe pueda decir quién ha jugado más y cómo han ido sus puntos. Desactivado, nada cambia.',
  lineSizeLabel: 'Jugadores en campo',
  lineGenderCheckLabel: 'Comprobar la proporción de género',
  lineGenderCheckNone: 'No comprobar',
  lineGenderCheckNoneHint:
    'Las líneas se registran sin mirar la proporción. Elige esto cuando el partido lleva una proporción que no siempre puedes cumplir.',
  lineGenderCheckRatio: 'Seguir la proporción del partido',
  lineGenderCheckRatioHint:
    'La proporción esperada de cada línea sigue la del partido — {female} FMP y {male} MMP con {size}, alternando con la proporción.',
  lineGenderCheckFixed: 'Proporción fija',
  lineGenderCheckFixedHint: 'La misma proporción cada punto, diga lo que diga la del partido.',
  lineFixedFemaleLabel: 'FMP en campo',
  lineFixedSplit: '{female} FMP / {male} MMP',
  lineSavedTitle: 'Líneas predefinidas',
  lineOnlyOnField: 'Solo se listan los jugadores registrados en este punto.',
  lineOnlyOnFieldGoal: 'Solo se listan los jugadores registrados en ese punto.',
  injurySubTitle: '¿Quién entra?',
  injurySubChangeTitle: '¿Quién cambia?',
  injurySubHint: 'Sale {players}. Elige quién le sustituye, o sáltalo si no entra nadie.',
  injurySubNoBench: 'Todo el roster está ya en campo.',
  injurySubNoMatch:
    'No hay nadie fuera de campo con la misma marca MMP/FMP, y un cambio tiene que mantener la proporción de la línea.',
  injurySubStaysOn: 'No hay a quién meter por {players}, así que sigue jugando.',
  btnOk: 'De acuerdo',
  injurySubOtherHint:
    'El otro equipo tiene una lesión, así que puedes cambiar a {count} jugador. Elige quién sale y quién entra, u omite.',
  injurySubNoChange: 'Ahora mismo no se puede hacer ningún cambio.',
  injurySubOffLabel: 'Salen',
  injurySubOnLabel: 'Entran',
  injurySubCount: '{off} salen · {on} entran',
  injurySubSplit: '(salen {offFmp} FMP / {offMmp} MMP · entran {onFmp} FMP / {onMmp} MMP)',
  injurySubIssueCount: 'Un cambio es uno por uno: así la línea queda con otro número.',
  injurySubIssueAllowance: 'Esta lesión permite {count} cambio.',
  injurySubIssueRatio: 'Las marcas que entran no coinciden con las que salen.',
  injurySubSkip: 'Sin cambio',
  lineAddTitle: 'Nueva línea',
  lineEditTitle: 'Editar línea',
  lineAddBtn: 'Añadir una línea',
  lineEditSaved: 'Editar {name}',
  lineNameTaken: 'Ya hay una línea con ese nombre.',
  lineMissingPlayers: '{count} ya no están en el roster',
  lineSavedEmptySetup:
    'Ninguna todavía. Da nombre a las líneas que juega este equipo y estarán a un toque durante el partido, y aquí otra vez la próxima vez.',
  lineSavedForTeam: 'Guardadas con {team}',
  genderMmp: 'MMP',
  genderUnmarked: 'Sin marca',
  genderFmp: 'FMP',
  genderUnset: 'Sin definir',
  genderToggle: '{name} — género: {value}',

  lineDialogTitle: 'Línea — {team}',
  lineModeCurrent: 'Este punto',
  lineModeNext: 'Punto siguiente',
  lineCountOf: '{count} de {size}',
  lineCountPlain: '{count} en la línea',
  lineUnmarked: '{count} sin definir',
  lineIssueSize: 'Son {count} en campo, no {size}.',
  lineIssueRatio: 'Eso rompe la proporción que pide este punto ({female} FMP / {male} MMP).',
  lineNoRoster: 'Añade jugadores al roster primero — la línea se elige de ahí.',
  linePromptTitle: '¿Quién juega este punto?',
  linePromptBtn: 'Registrar línea',
  lineNextPending: 'Punto siguiente: {count} registrados',
  btnLine: 'Línea',
  btnLineSaveAnyway: 'Guardar igualmente',
  btnLineConfirmAnyway: 'Toca otra vez para guardar',
  btnSaveLine: 'Guardar esta línea',
  lineSaveNamePrompt: 'Nombre de la línea',
  lineSaveNamePlaceholder: 'O1, D1, Zona…',
  lineSavedConfirm: 'Guardada como {name}',
  lineDeleteSaved: 'Eliminar {name}',
  lineLoadSaved: 'Cargar {name}',

  playersTitle: 'Roster',
  collapseSection: 'Contraer {title}',
  expandSection: 'Expandir {title}',
  rosterHelp:
    'Puedes añadir jugadores con el partido ya en marcha — no hace falta rellenar todo el roster antes de empezar.',
  playerNumber: '#',
  playerName: 'Nombre',
  addPlayer: 'Añadir',
  removePlayer: 'Quitar',
  duplicatePlayer: 'Este jugador ya está en el roster',
  close: 'Cerrar',
  noPlayersYet: 'Todavía no se han añadido jugadores.',
  rosterImportBtn: 'Importar',
  rosterImportTitle: 'Importar roster — {team}',
  rosterImportHint:
    'Pega la lista de jugadores abajo, o elige un archivo de texto con el mismo formato. Un jugador por línea: número y nombre, solo el nombre, o solo el número. Añade MMP o FMP al final de una línea para marcar a ese jugador.',
  rosterImportTextareaLabel: 'Jugadores a importar',
  rosterImportPlaceholder: '12 John Doe MMP\n23 FMP\nJohn Doe',
  rosterImportFileBtn: 'Elegir archivo',
  rosterImportFileHint: 'Solo texto plano (.txt)',
  rosterImportFileError: 'No se ha podido leer el archivo.',
  rosterImportFileType:
    'Solo se pueden importar archivos de texto (.txt), con el formato de arriba.',
  rosterImportFound: '{count} jugadores encontrados',
  rosterImportNone: 'Todavía no se reconoce nada.',
  rosterImportNoName: 'Sin nombre',
  rosterImportSkipped: '{count} líneas no se han podido leer y se han descartado',
  rosterImportDuplicates: '{count} ya están en el roster',
  rosterImportReplace: 'Sustituir el roster actual ({count})',
  rosterImportApply: 'Importar {count}',
  btnPlayers: 'Roster',
  assistDialogTitle: '¿Quién anotó por {team}?',
  whoScored: 'Anotador',
  whoAssisted: 'Asistencia',
  callahan: 'Callahan',
  callahanToggle: 'Callahan — sin asistencia',
  stoppageDialogTitle: '¿Qué ha parado el juego?',
  stoppageDialogHint:
    'Las paradas por lesión o técnicas no detienen el reloj de partido de entrada. El SOTG sí. En ambos casos, el reloj del pull, del tiempo muerto y de la llamada esperan a que el juego se reanude.',
  stoppageKind_injury: 'Lesión',
  stoppageKind_technical: 'Técnica',
  injuryDialogTitle: '¿Quién se lesionó?',
  injuryDialogHint:
    'Opcional — selecciona a todos los lesionados, de cualquier equipo, u omite y solo registra la lesión.',
  injuryOtherTeamToggle: 'Marcar también a {team} como lesionado (sin jugador)',
  injuryTeamStoppageTitle: 'Lesión — ¿de qué equipo?',
  injuryTeamStoppageHint: 'Opcional — también puedes omitir el equipo.',
  technicalStoppageTitle: 'Parada técnica — ¿quién la llamó?',
  technicalStoppageHint:
    'Material, interferencia externa y similares. Opcional — también puedes omitir el equipo.',
  btnNoTeam: 'Sin equipo',
  sotgStoppageTitle: 'Parada de SOTG — ¿quién la llamó?',
  sotgStoppageHint: 'Obligatorio para aplicar la parada — cancela para no detener el reloj.',
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
  pullTimer: 'Tiempo de pull',
  timeoutTimer: 'Tiempo muerto',
  halftimeTimer: 'Half',
  waterBreakTimer: 'Hidratación',
  pauseLabel: 'Pausado',
  pullThrown: 'Pull lanzado',
  openReport: 'Abrir informe',
  btnPauseGame: 'Pausar partido',
  btnResumeGame: 'Reanudar partido',
  confirmPauseGame:
    'Solo detén el partido por una parada de espíritu (SOTG), una parada técnica de torneo, una parada prolongada o mal tiempo. El reloj se detendrá hasta que reanudes.',
  confirmPauseGameTitle: '¿Pausar el partido?',
  btnPauseGameConfirm: 'Pausar partido',
  btnStoppage: 'Parada',
  btnTurnover: 'Pérdida',
  btnTurnoverHold: 'Pérdida — mantén pulsado para deshacer',
  btnStoppageSotg: 'Parada o SOTG',
  btnSotg: 'SOTG',
  btnEndHalftime: 'Fin del descanso',
  btnEndWaterBreak: 'Fin de la pausa',
  btnWaterBreak: 'Pausa de hidratación',
  waterBreakHint:
    'Una pausa para beber entre puntos. No gasta el tiempo muerto de ningún equipo y dura hasta que tú la termines.',
  btnSettings: 'Ajustes',
  btnLog: 'Registro',

  // Micro-etiquetas de la fila de acciones: en inglés en todos los idiomas a
  // propósito — el vocabulario de Ultimate ya es inglés en los campos españoles y
  // catalanas, y así el ancho de los botones es idéntico en los tres.
  lblTurn: 'Turn',
  lblCall: 'Call',
  lblLog: 'Log',
  lblRoster: 'Roster',

  // El paginador de estadísticas en directo del hueco reservado (StatsSlot).
  // Etiquetas de 9px: mejor acortar el término que dejar que se parta — los
  // términos hold/break/turn son los que se usan en los campos españoles.
  slotStatsLabel: 'Estadísticas en directo',
  slotHolds: 'Holds',
  slotBreaks: 'Breaks',
  slotBreakCh: 'Op. break',
  slotTurns: 'Pérdidas',
  slotThisPoint: 'Este punto · {n} pérdidas',
  slotAvgHold: 'media {time}',
  slotPagePossession: 'Posesión por punto',
  slotPageTeam: 'Cifras de equipo',
  slotPagePace: 'Ritmo de este punto',
  slotPrev: 'Estadística anterior',
  slotNext: 'Estadística siguiente',

  btnEndGame: 'Fin del partido',
  btnBackToSetup: 'Volver a la configuración',
  btnEndTimeout: 'Fin del tiempo muerto',

  menuTitle: 'Menú',
  menuGameSetup: 'Configuración del partido',
  menuGuide: 'Guía para principiantes',
  menuReport: 'Informe hasta ahora',
  btnBackToGame: 'Volver al partido',
  btnExitReport: 'Salir del informe',

  setupScheduled: 'Previsto',
  setupStarted: 'Empezado',
  setupBreak: 'Descanso',
  setupDuration: 'Duración',
  setupNoCap: 'Sin CAP',
  setupNoTimeouts: 'No hay tiempos muertos en este partido.',
  setupSidesNote: 'Los equipos cambian de lado después de cada punto, y otra vez en el descanso.',
  setupCapInForce: 'Ya se ha aplicado un CAP: el partido es ahora a {n}.',
  confirmEndGame: '¿Terminar el partido ahora y abrir el informe?',
  confirmEndGameTitle: '¿Terminar el partido?',
  confirmLeaveGame:
    'Volverás a la configuración del partido. Se perderán el marcador y el tiempo actuales.',
  confirmLeaveGameTitle: '¿Salir del partido?',
  btnLeaveGameConfirm: 'Salir',
  btnCancel: 'Cancelar',
  btnConfirm: 'Terminar partido',
  btnDone: 'Listo',
  timeoutsLeft: '{n} tiempos muertos restantes',
  currentRatio: 'Ratio: {gender}',
  pullChip: 'Pull: {team} ({side})',
  halfCapChip: 'Half a {n}',
  gameCapChip: 'Partido a {n}',
  halfCapChipRange: 'Half a {a} o {b}',
  gameCapChipRange: 'Partido a {a} o {b}',
  universePointChip: 'Universal a {n}',
  capTargetTitleHalf: '¿Dónde acaba el half?',
  capTargetTitleGame: '¿Dónde acaba el partido?',
  capTargetHint:
    'Lo decide el punto que se estaba jugando cuando sonó la bocina. Ajústalo tú si el gol se anotó antes de la bocina.',
  capTargetOption: 'A {n}',
  sideLeft: 'Izquierda',
  sideRight: 'Derecha',
  target: 'Objetivo: {n}',

  // Llamadas — el diálogo tras el botón del bocadillo. Todo lo que hay dentro
  // responde a una sola pregunta («¿qué se ha llamado?»), y por eso el travel va
  // aquí y las pérdidas, las paradas y los eventos no.
  callDialogTitle: '¿Qué se ha llamado?',
  callDialogHint: 'Registrar una llamada no cambia el marcador ni el reloj.',
  btnTravel: 'Travel',
  btnNote: 'Evento',
  callKind_foul: 'Falta',
  callKind_stallOut: 'Stall out',
  callKind_pick: 'Pick',
  callKind_discDown: 'Disco al suelo',
  callKind_out: 'Fuera',
  callKind_offside: 'Off-side',
  callKind_generic: 'Llamado',
  callTeamTitle: '{kind} — ¿quién lo llamó?',
  callTeamHint: 'Después indica cómo acabó con los botones que aparecen sobre los relojes.',
  travelTeamTitle: 'Travel — ¿quién lo llamó?',
  travelTeamHint: 'Se registra en cuanto eliges un equipo — no hace falta nada más.',
  callResolution_accepted: 'Aceptada',
  callResolution_contested: 'Discutida',
  callResolution_retracted: 'Retirada',
  callResolvedIn: 'resuelta en {n}s',
  callBlockedPending: 'Resuelve primero la llamado en curso.',
  callBlockedPull: 'Las llamadas necesitan que se lance el pull primero.',
  stoppagePending: '{kind} — el juego aún no se ha reanudado.',
  btnStoppageResolved: 'El juego puede continuar',
  noteTitle: 'Evento',
  noteHint:
    'Cualquier cosa digna de recordar — un layout increíble, un dragón sobrevolando el campo...',
  notePlaceholder: '¿Qué ha pasado?',

  // Tarjeta de señal (bajo el reloj de partido) — la señal oficial WFDF a hacer
  handSignal: 'Señal de mano',
  signal_goal: 'Gol',
  signal_timeout: 'Tiempo muerto',
  signal_stoppageInjury: 'Parada por lesión',
  signal_stoppageTechnical: 'Parada técnica',
  signal_sotg: 'Parada de espíritu',
  signal_ratioMale: 'Ratio: Chicos',
  signal_ratioFemale: 'Ratio: Chicas',
  signal_whistle1: 'Un pitido',
  signal_whistle2: 'Dos pitidos',
  signal_whistle3: 'Tres pitidos',
  signal_universePoint: 'Universal',
  signal_travel: 'Travel',
  signal_foul: 'Falta',
  // WFDF no tiene pictograma propio de stall out; la señal de tiempo es la más cercana.
  signal_stallOut: 'Stall out',
  signal_pick: 'Pick',
  signal_discDown: 'Disco al suelo',
  signal_out: 'Fuera',
  signal_offside: 'Off-side',
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
  say_technicalStoppage: '«¡Parada técnica!»',
  say_spirit: '«¡Parada de espíritu!»',
  say_halftime: '«¡Half! Pull de {halfTeam} desde la {halfSide}!»',
  say_waterBreak: '«{a} {as}, {b} {bs} — ¡pausa de hidratación!»',
  say_waterBreakDue: '«¡Se acabó la pausa — los dos equipos a la línea!»',
  say_waterBreakOver: '«¡Tiempo dentro — el reloj del pull vuelve a empezar!»',
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
  say_callDiscDown: '«¡Disco al suelo — {team}!»',
  say_callOut: '«¡Fuera — {team}!»',
  say_callOffside: '«¡Off-side — {team}!»',
  say_callGeneric: '«¡Llamado de {team} — juego detenido!»',
  say_callFoulNoTeam: '«¡Falta!»',
  say_callStallOutNoTeam: '«¡Stall out!»',
  say_callPickNoTeam: '«¡Pick!»',
  say_callDiscDownNoTeam: '«¡Disco al suelo!»',
  say_callOutNoTeam: '«¡Fuera!»',
  say_callOffsideNoTeam: '«¡Off-side!»',
  say_callGenericNoTeam: '«¡Llamado — juego detenido!»',
  say_resolutionAccepted: '«¡No discutida — seguid jugando!»',
  say_resolutionContested: '«¡Discutida — el disco vuelve al lanzador!»',
  say_resolutionRetracted: '«¡Retirada — seguid jugando!»',

  // Línea de estado (ámbar) — qué pasa ahora y qué hacer
  now_setup: 'Pulsa «Empezar partido» cuando los equipos estén listos para el pull.',
  now_awaitingStart:
    'Esperando la hora de inicio programada. El juego se desbloqueará automáticamente, o pulsa «Empezar partido» para empezar antes.',
  now_awaitingPull:
    'Los equipos se están alineando. Pulsa «Pull lanzado» en el momento del lanzamiento.',
  now_discInPlay: 'Disco en juego. Toca el panel del equipo cuando anote en la zona contraria.',
  now_awaitingPullCap:
    'Los equipos se están alineando. Pulsa «Pull lanzado» en el momento del lanzamiento. Toca el objetivo de arriba si el gol fue antes de la bocina.',
  now_discInPlayCap:
    'Disco en juego. Toca el panel del equipo cuando anote en la zona contraria. Toca el objetivo de arriba si el gol fue antes de la bocina.',
  now_awaitingPullRatio:
    'Los equipos se están alineando. Pulsa «Pull lanzado» en el momento del lanzamiento. Mantén la señal hasta asegurarte que las líneas están bien montadas.',
  now_awaitingPullCapRatio:
    'Los equipos se están alineando. Pulsa «Pull lanzado» en el momento del lanzamiento. Toca el objetivo de arriba si el gol fue antes de la bocina. Mantén la señal hasta asegurarte que las líneas están bien montadas.',
  now_timeout: 'Tiempo muerto en curso. Termina solo, o pulsa «Fin del tiempo muerto».',
  now_toReady30:
    'El tiempo muerto acaba — 30 segundos para que el ataque esté listo. Un silbato a los 30.',
  now_toReady15: '15 segundos para que el ataque esté listo. Dos silbatos al agotarse el tiempo.',
  now_toReady0: 'El ataque debería estar listo — tres silbatos y el disco entra en juego.',
  now_halftime:
    'Descanso — pull de {halfTeam} desde la {halfSide} para empezar la segunda parte. Se reanuda solo cuando termine el tiempo, o pulsa «Fin del descanso» si ambos equipos están listos antes.',
  now_halftimeWarn:
    'Un minuto para la segunda parte — pull de {halfTeam} desde la {halfSide}. Un silbato — los equipos deberían ir preparándose.',
  now_waterBreak:
    'Pausa de hidratación — los jugadores están bebiendo y el reloj del partido sigue corriendo. Pulsa «Fin de la pausa» cuando los dos equipos estén en la línea; la app te avisa cuando se cumple el tiempo.',
  now_waterBreakDue:
    'Se ha cumplido el tiempo de la pausa — manda a los dos equipos a la línea y pulsa «Fin de la pausa».',
  now_stoppagePending:
    'Parada por {kind}. El reloj del pull, del tiempo muerto y de la llamada están en espera — pulsa «El juego puede continuar» encima del reloj en cuanto el juego pueda seguir.',
  now_callPending:
    '{kind} — la ha pedido {team}. El juego está parado y el marcador bloqueado: pulsa «Aceptada», «Discutida» o «Retirada» encima del reloj cuando los jugadores lo decidan.',
  now_callPendingNoTeam:
    '{kind}. El juego está parado y el marcador bloqueado: pulsa «Aceptada», «Discutida» o «Retirada» encima del reloj cuando los jugadores lo decidan.',
  now_callWaitCaptains:
    '{kind} — la ha pedido {team}, 15 segundos después. Los capitanes deberían intervenir para ayudar a resolverla.',
  now_callWaitCaptainsNoTeam:
    '{kind}, 15 segundos después. Los capitanes deberían intervenir para ayudar a resolverla.',
  now_callWait:
    'Sigue sin resolverse a los 45 segundos — tres silbatos ahora, y tres más a los 60. La jugada debe tratarse como discutida. Resuélvela encima del reloj en cuanto los jugadores lo decidan.',
  now_callWaitLong:
    'Sigue sin resolverse a los 60 segundos — seis silbatos hasta ahora. Repite la llamada si el juego no se ha reanudado. Resuélvela encima del reloj en cuanto los jugadores lo decidan.',
  now_paused: 'Parada de espíritu. Reloj pausado — pulsa «Reanudar partido» para continuar.',
  now_pauseManual: 'Partido pausado. Reloj detenido — pulsa «Reanudar partido» para continuar.',
  now_stoppageClockStopped:
    'Partido detenido: la parada lleva más de 2 minutos. Pulsa «Reanudar partido» en cuanto el juego pueda continuar.',
  now_finished: 'Partido terminado.',
  now_pull45: 'Un pitido — 45 segundos. Los equipos deben prepararse.',
  now_pull60: 'Dos pitidos — 60 segundos. Los equipos deben señalar que están listos.',
  now_pull75: 'Tres pitidos — 75 segundos. El pull DEBE lanzarse ya.',
  now_universePoint: 'Universal — {a} {as}, {b} {bs}. ¡El próximo gol termina el partido!',

  assist_blocked_gameNotStarted: 'El partido aún no ha empezado.',
  assist_blocked_pullNotThrown: 'Pulsa «Pull lanzado» primero — el disco no está en juego.',
  assist_blocked_gamePaused: 'Marcador bloqueado mientras el juego está pausado.',
  assist_blocked_timeoutActive: 'No disponible durante un tiempo muerto.',
  assist_blocked_halftimeActive: 'No disponible durante el half.',
  assist_blocked_waterBreakActive: 'No disponible durante una pausa de hidratación.',
  assist_blocked_waterBreakNotNow:
    'Una pausa de hidratación solo se puede pedir entre puntos: después de un gol y antes de que se lance el pull.',
  assist_blocked_minScoreZero: 'El marcador no puede bajar de 0.',
  assist_blocked_notLastScorer: 'Solo se puede deshacer el último gol (mantén pulsado ese equipo).',
  assist_blocked_gameFinished: 'El partido ha terminado.',
  assist_blocked_nothingToUndo: 'Todavía no hay ningún gol que deshacer.',
  assist_blocked_callPending: 'Resuelve primero la falta pendiente.',
  assist_blocked_stoppageInProgress:
    'Ya hay una parada en curso — resuélvela antes de llamar otra.',
  assist_blocked_timeoutLastFive: 'No se permiten tiempos muertos en los últimos 5 minutos.',
  assist_blocked_timeoutNoneLeft: 'Este equipo no tiene tiempos muertos restantes.',
  assist_blocked_timeoutNotNow: 'Los tiempos muertos solo pueden pedirse durante el juego.',
  assist_blocked_noTurnoverToUndo: 'No hay ninguna pérdida que deshacer en este punto.',
  assist_blocked_lineNotTracked: 'El seguimiento de líneas está desactivado en este partido.',
  assist_blocked_lineNextNotNow:
    'La línea siguiente solo se puede registrar mientras se juega un punto.',

  reportStarted: 'Inicio: {time}',
  reportFinished: 'Fin: {time}',
  reportDuration: 'Duración: {duration}',
  finalScore: 'Marcador final',
  statOLineHolds: 'Holds de ataque',
  statCleanHold: 'Holds limpios',
  statBreakChances: 'Oportunidades de break',
  statTurnovers: 'Pérdidas',
  statBreaks: 'Breaks',
  statCleanBreaks: 'Breaks limpios',
  statAvgHold: 'Duración media de hold',
  statAvgBreak: 'Duración media de break',
  statTimeouts: 'Tiempos muertos usados',
  // El gráfico de posesión, reutilizado del hueco de estadísticas en directo.
  possessionTitle: 'Posesión por punto',
  possessionLegend:
    '{top} sobre la línea, {bottom} debajo. La altura de la barra es la parte de posesión de cada equipo; el lado relleno marcó el punto, y el puntito ámbar señala quién lo empezó en ataque — punto y marcador en lados opuestos es un break.',
  playerStatsTitle: 'Estadísticas de jugadores',
  filterAllTeams: 'Todos',
  colPlayer: 'Jugador',
  colGoals: 'Goles',
  colAssists: 'Asistencias',
  colTotal: 'Total',
  unassignedPlayers: 'Sin registrar',
  // Las tres vistas de la tabla de jugadores, en pastillas solo cuando el
  // seguimiento de líneas está activo. Las cabeceras han de caber en una tabla del
  // ancho de un móvil, así que son abreviaturas con el texto completo en `title`.
  viewScoring: 'Anotación',
  viewPlaying: 'Juego',
  viewPossession: 'Posesión',
  colPointsPlayed: 'Pts',
  colPointsPlayedFull: 'Puntos jugados',
  colOPoints: 'O',
  colOPointsFull: 'Puntos en ataque',
  colDPoints: 'D',
  colDPointsFull: 'Puntos en defensa',
  colWon: 'Ganados',
  colWonFull: 'Puntos ganados estando en campo',
  colLost: 'Perdidos',
  colLostFull: 'Puntos perdidos estando en campo',
  colHolds: 'Holds',
  colBreaks: 'Breaks',
  colTurns: 'Turns',
  colTurnsFull: 'Pérdidas en las que este jugador perdió el disco',
  colDefenses: 'D',
  colDefensesFull: 'Pérdidas forzadas por este jugador: bloqueos y marcas que agotaron el stall',
  reportFooterCredit: 'Este partido se registró con:',
  historyTitle: 'Resumen del partido',
  btnFullLog: 'Registro completo',
  fullLogTitle: 'Registro completo del partido',
  copyLog: 'Copiar registro',
  colClock: 'Reloj',
  colEvent: 'Evento',
  colTeam: 'Equipo',
  colDetail: 'Detalle',
  colActions: 'Acciones',
  btnEditEntry: 'Corregir esta entrada',
  btnDeleteEntry: 'Borrar esta entrada',
  logEditHint: 'Esto solo corrige el historial: el marcador, el reloj y la posesión no cambian.',
  logEditCallTitle: '{kind} — corregir la señalización',
  whoCalled: 'Quién la señaló',
  howResolved: 'Cómo acabó',
  logLasted: 'ha durado {n}s',
  logPullTook: 'Tirado después de {n}s',
  logPointLasted: 'en {d}',
  shareImage: 'Compartir',
  shareImagePreparing: 'Preparando…',
  shareImageSaved: 'Imagen guardada',
  shareImageFailed: 'No se pudo crear la imagen',
  copyReport: 'Copiar al portapapeles',
  copied: '¡Copiado!',
  copyFailed: 'No se pudo copiar — inténtalo de nuevo',
  newGame: 'Nuevo partido',
  event_gameStart: 'Inicio del partido',
  event_goal: 'Gol',
  event_undo: 'Corrección del marcador (deshacer)',
  event_latePull: 'Pull tardío (más de 75s)',
  event_timeout: 'Tiempo muerto',
  event_timeoutEnd: 'Fin del tiempo muerto',
  event_stoppage: 'Parada',
  event_stoppageResolved: 'Parada resuelta',
  event_stoppageClockStopped: 'Reloj del partido detenido (parada de más de 2 min)',
  event_turnover: 'Pérdida',
  event_undoTurnover: 'Corrección de posesión (deshacer)',
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
  event_waterBreakStart: 'Pausa de hidratación',
  event_waterBreakEnd: 'Fin de la pausa de hidratación',
  event_timeCap: 'CAP de tiempo alcanzado',
  event_halfTimeCap: 'CAP de half alcanzado',
  event_capTargetSet: 'Objetivo ajustado a mano',
  event_gameEnd: 'Fin del partido',

  // Guía
  guideTitle: 'Guía para principiantes',
  guideSubtitle: 'Una guía para quien anota por primera vez',
  guideBackShort: 'Volver',
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
  guideStep1Players: 'Estadísticas',
  guideStep1PlayersBody:
    'Dos preguntas. Primero, cuánto detalle: "Solo el marcador" es lo predeterminado — marcador, relojes y ratio, con faltas, travelling y paradas técnicas registradas sin equipo. "Por equipo" lo atribuye todo a un equipo, sin necesidad de roster. "Por jugador" atribuye goles, asistencias, pérdidas y lesiones a un jugador concreto, una vez añadas el roster de abajo, para un equipo o para ambos. Segundo, los interruptores de debajo: qué registra realmente este partido. Pérdidas añade el botón Turn a la pantalla de juego; los demás preguntan quién marcó, quién perdió el disco y quién jugó cada punto. Activa los que puedas seguir y deja el resto apagados.',
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
  guideStep3Water: 'Pausas de hidratación',
  guideStep3WaterBody:
    'Solo para días de calor, y desactivadas salvo que el torneo diga lo contrario. Cuando los oficiales activan el protocolo de calor suelen anunciar pausas a marcadores fijos: «una cuando el primer equipo llegue a 4, y otra a 12». Marca la casilla, escribe esos marcadores y la app parará el partido por ti en cada uno. No gastan el tiempo muerto de ningún equipo.',
  guideStep3Timeouts: 'Tiempos muertos',
  guideStep3TimeoutsBody:
    'Cuántos puede pedir cada equipo y cuánto duran. Desmarca "Permitir tiempos muertos" si en este torneo no hay, y los botones desaparecen del panel.',
  guideStep3Start: 'Cuando los dos nombres estén puestos, pulsa "Empezar partido".',

  guideStep4Title: 'Conoce el panel',
  guideStep4Body:
    'Es la única pantalla que usarás durante el partido. Nada de lo que hay aquí se puede pulsar sin querer de forma irreversible.',
  guideTour1:
    'Número de campo, la hora, en qué parte vamos y el marcador al que se juega el partido. El menú de la izquierda contiene esta guía, la configuración con la que se juega el partido y la salida del partido.',
  guideTour2:
    'Un panel por equipo, pintado con el color del equipo. Aquí es donde sumas goles (paso 5), y el botón de tiempo muerto de cada equipo está en la esquina superior exterior de su propio panel.',
  guideTour3:
    'Recordatorios del punto que va a empezar: quién hace el pull y desde qué lado, la ratio de género y el objetivo una vez anunciado.',
  guideTour4:
    'El único botón que importa en ese momento: aquí, "Pull lanzado". Cambia a "Fin del tiempo muerto", "Fin del descanso" o "Reanudar partido" cuando toca, y está vacío mientras el disco está en juego.',
  guideTour5:
    'El reloj del partido y, al lado, el segundo reloj: los segundos desde el último gol entre punto y punto, o la cuenta atrás del tiempo muerto o del half.',
  guideTour6:
    'Los botones que escriben en el historial: el roster (si el registro de jugadores está activado), el historial, una parada, un llamado y una pérdida.',
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
    'El silbato es como mantienes a los jugadores al tanto del tiempo. La app pita por ti — y muestra la tarjeta de silbato en ese mismo momento — exactamente en estas situaciones, y en ninguna más. Pita tú también para acompañar, con el número de pitidos que te indica.',
  guideSignalHalf: 'El inicio de una parte',
  guideSignalHalfBody:
    'Un pitido en el instante en que empieza una parte — el primer pull del partido y el inicio de la segunda parte. Como aviso, también pitas una vez un minuto antes, pero solo cuando hay una espera de la que avisar: una hora de inicio programada o un descanso de dos minutos o más.',
  guideSignalPoint: 'Antes de cada pull',
  guideSignalPointBody:
    'Tras un gol, mientras los equipos se colocan: un pitido a los 45 segundos, dos a los 60 y tres a los 75 — el pull debe lanzarse ya.',
  guideSignalTimeout: 'El final de un tiempo muerto',
  guideSignalTimeoutBody:
    'Solo si los tiempos muertos se activaron en la configuración — ahí también se fija cuántos tiene cada equipo y lo que dura uno, así que un tiempo muerto puede ser más largo o más corto que el valor por defecto de la app. Un tiempo muerto pedido antes del pull: un pitido en el momento en que termina, y luego arranca de cero la cuenta normal de 45/60/75. Un tiempo muerto pedido después del pull, con el disco ya en juego, vuelve al juego con una cuenta atrás al final: un pitido 30 segundos antes de que el ataque deba estar listo, dos a los 15 y tres cuando el disco entra en juego.',
  guideSignalWater: 'El final de una pausa de hidratación',
  guideSignalWaterBody:
    'Un silbato en cuanto terminas una pausa de hidratación, para llamar a los dos equipos a la línea; después empieza de cero la cuenta normal del pull de 45/60/75. Que se cumpla el tiempo de la pausa no se pita: eso es un aviso para ti, no para ellos.',
  guideSignalCall: 'Una jugada que se alarga',
  guideSignalCallBody:
    'Cuando una falta, un pick, un travel, un stall, un fuera de juego, un disco caído o una jugada genérica — o una lesión o parada técnica — sigue sin resolverse a los 45 segundos: tres pitidos, y tres más a los 60 segundos. Después nada — la app sigue contando la espera, pero deja de pitar.',
  guideSignalCap: 'Un cap, por tiempo',
  guideSignalCapBody:
    'Un pitido en el instante en que se cumple el límite de tiempo, y otro más cuando el punto en curso termina y queda fijado el nuevo objetivo — para el partido y, por separado, para la parte. Un objetivo que ya conocías de antemano (por ejemplo, la parte en 8) se sigue anunciando un gol antes, pero nunca se pita — solo pita un objetivo que ha decidido el reloj.',

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
    'Cuando un equipo pide uno, pulsa el botón pequeño de la esquina superior del panel de ese equipo; el número que hay al lado son los que le quedan. Empieza una cuenta atrás y la aplicación pita cuando se acaba. El reloj del partido sigue corriendo todo el rato: es normal.',
  guideStep8Half: 'Half',
  guideStep8HalfBody:
    'La aplicación canta el half sola en cuanto un equipo llega al marcador del half, y nunca en mitad de un punto. El descanso es una cuenta atrás; pulsa "Fin del descanso" si los dos equipos están listos antes. Después los equipos cambian de lado y la aplicación te lo dice.',
  guideStep8Water: 'Pausa de hidratación',
  guideStep8WaterBody:
    'Cuando hace calor, los oficiales añaden pausas para que los jugadores beban. Si se configuraron en el paso 1, la app las pide sola, en los marcadores acordados, justo después de un gol. También puedes pedir una en cualquier momento entre puntos: pulsa la mano levantada y elige «Pausa de hidratación». Esta no termina sola: el reloj cuenta hacia arriba, se pone ámbar cuando se cumple el tiempo acordado y la barra te dice que mandes a los dos equipos a la línea. Pulsa «Fin de la pausa» cuando estén.',
  guideStep8Cap: 'CAP',
  guideStep8CapBody:
    'Cuando se llega al límite de tiempo la aplicación pita, pero el objetivo aún no se fija: el punto que se está jugando termina primero, exactamente como si no hubiera CAP. Solo entonces calcula el objetivo nuevo a partir de ese marcador ya terminado, lo muestra en una etiqueta y te da la frase que cantar. No hay nada que calcular.',
  guideStep8Universe: 'Punto universal',
  guideStep8UniverseBody:
    'Cuando el siguiente gol gana el partido, aparece un aviso y la barra te da el cántico. Anúncialo: los dos equipos quieren saberlo.',

  guideWaterTitle: 'Las pausas de hidratación por calor',
  guideWaterIntro:
    'Esta conviene conocerla, porque eres la persona a quien los capitanes preguntarán por qué se para el partido. Las pausas de hidratación no están en las reglas de juego, sino en el Apéndice de las Reglas del Ultimate de la WFDF (2025-2028), en la sección B4.3, «Clima caliente».',
  guideWaterWho: 'Quién lo decide',
  guideWaterWhoBody:
    'Los oficiales del torneo, jornada a jornada. La norma no fija ninguna temperatura: son ellos quienes valoran el riesgo real, normalmente con un índice térmico que combina temperatura, humedad y viento (como el WBGT). Si deciden que el calor es un riesgo para la salud, están obligados a informar a todos los capitanes y comunicar el protocolo que se aplica (B4.3.1 y B4.3.2).',
  guideWaterAdjust: 'Qué pueden cambiar',
  guideWaterAdjustBody:
    'Tres cosas, cuando las condiciones se consideran extremas (B4.3.3): añadir pausas de hidratación entre puntos para que los jugadores descansen y se rehidraten (B4.3.3.1), mover los horarios para evitar la franja más calurosa del día, o suspender el partido, temporal o definitivamente.',
  guideWaterPractice: 'Cómo suele aplicarse',
  guideWaterPracticeBody:
    'La WFDF prefiere colocar estas pausas en las transiciones, en lugar de forzar tiempos muertos a mitad de las partes como hacen otras normativas. En la práctica, cuando el protocolo de calor se activa antes de empezar, los oficiales introducen pausas de hidratación obligatorias de 3 minutos que saltan cuando el primer equipo alcanza una puntuación determinada, frecuentemente a los 4 y a los 12 puntos.',
  guideWaterTimeouts: 'Son gratis',
  guideWaterTimeoutsBody:
    'Una pausa decretada por la organización no consume los tiempos muertos reglamentarios de ninguno de los dos equipos. Los dos siguen teniendo todos los que tenían, sea cual sea el motivo por el que la app acaba de parar el partido.',
  guideWaterYou:
    'Así que: pregunta a los oficiales al empezar la jornada si el protocolo de calor está activo y a qué marcadores. Escribe esos marcadores en la sección de pausas de hidratación durante la configuración y la app pedirá cada pausa por ti, justo después del gol que llega a ese marcador. Si se decreta una que no habías configurado, pulsa la mano levantada entre puntos y elige «Pausa de hidratación».',
  guideStep9Title: 'Apuntar lo que pasa',
  guideStep9Body:
    'La fila que hay bajo los relojes apunta cualquier cosa que merezca la pena recordar: el bocadillo para un llamado, la mano levantada para una parada, las dos flechas para una pérdida. Ninguno cambia el marcador ni el objetivo: escriben en el historial y te dicen qué anunciar.',
  guideStep9Calls:
    'Falta, Stall out, Pick, Off-side, Disco al suelo, Llamado: algo que ha cantado un jugador. Aparecen tres botones sobre los relojes: Aceptada, Discutida, Retirada. Pregunta a los jugadores cómo ha acabado y pulsa el que corresponda; la aplicación registra cuánto ha durado la discusión.',
  guideStep9Travel:
    'Travel: se canta a quien lanza y se mueve de forma ilegal. Se registra en un solo paso, sin seguimiento.',
  guideStep9Turn:
    'Turn: solo aparece cuando el partido registra algo más que el marcador (paso 1): registra una pérdida, para que el disco cambie de equipo sin un gol. Desde la primera, una etiqueta «Posesión» en el marcador indica quién tiene el disco durante cada punto. Mantén pulsado Turn para deshacer la última pérdida del punto si la registraste por error.',
  guideStep9Stoppage:
    'Mano levantada: lesión o técnica (material, interferencia externa...). El reloj del partido sigue corriendo. Cuando el juego pueda continuar, pulsa «El juego puede continuar» para registrar cuánto duró la parada.',
  guideStep9Sotg:
    'SOTG: una parada de espíritu, detrás de esa misma mano levantada. Es la única de las tres que pausa el reloj del partido; pulsa "Reanudar partido" cuando se reanude el juego.',
  guideStep9StoppageAnytime:
    'La mano levantada funciona en cualquier momento del partido: entre puntos, durante un tiempo muerto o el descanso, incluso en mitad de una llamada. Lo que estuviera contando (el pull, el tiempo muerto, la discusión) se congela y sigue exactamente donde estaba cuando el juego se reanuda. Solo una parada a la vez: resuelve la que esté abierta antes de llamar la siguiente.',
  guideStep9Log:
    'El botón de lista abre todo lo registrado hasta ahora, en orden, para que puedas comprobar lo que has apuntado.',
  guideStep9Note:
    'Dentro de esa lista, "Evento" añade texto libre para cualquier otra cosa que quieras en el informe.',

  guideStep10Title: 'Final del partido',
  guideStep10Body:
    'La aplicación termina el partido sola cuando un equipo llega al objetivo. Si tienes que pararlo antes, pulsa la ✕ de la esquina superior izquierda, al lado del número de campo, y confirma.',
  guideStep10Report:
    'Entonces aparece el informe: el marcador final, unas cuantas estadísticas de cada equipo y el historial completo del partido. "Compartir" manda una foto del marcador, las estadísticas y el resumen del partido directamente a un chat. "Copiar al portapapeles" lo convierte todo, historial incluido, en texto plano que puedes pegar en un mensaje o en una hoja de cálculo; hazlo antes de salir de la pantalla. "Nuevo partido" te devuelve a la configuración para el siguiente.',

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

  // Guía de estadísticas — la segunda página, desde el menú de la pantalla inicial.
  menuStatsGuide: 'Guía avanzada',
  statsGuideTitle: 'Guía avanzada',
  statsGuideSubtitle: 'Qué registrar, cómo registrarlo y qué sale al final',
  statsGuideIntro:
    'Esta página da por sabido el juego. La guía para principiantes explica cómo llevar el marcador y los relojes; esta explica todo lo que va por encima: qué puede registrar la aplicación, qué cuesta cada opción durante un punto y cómo leer los números del final.',
  statsGuideNothingOn:
    'Todo es opcional y casi todo viene desactivado. La aplicación lleva un marcador perfectamente válido con todos los interruptores de abajo apagados. Lo que actives decide qué botones aparecen en la pantalla de juego y qué columnas existen en el informe — nada más cambia.',

  statsGuideModelTitle: 'Dos preguntas, no una',
  statsGuideModelBody:
    'La pantalla de configuración pregunta primero con cuánto detalle atribuir las cosas y, por separado, qué cosas registrar. Que sean dos preguntas es lo que te permite anotar goles y asistencias de todo un torneo sin poner nunca el botón de pérdida en pantalla, o seguir las líneas de un equipo sin que te pregunte quién marcó.',
  statsGuideModelDetail: 'Detalle — a quién se nombra',
  statsGuideModelDetailBody:
    '«Solo marcador» no nombra a nadie: una decisión o una parada se registran sin decir de quién eran. «Por equipo» añade la pregunta «¿qué equipo?» a cada decisión, pasos y parada — sin necesidad de roster. «Por jugador» añade el roster, así que goles, asistencias, pérdidas y lesiones pueden nombrar a una persona, de un equipo o de los dos.',
  statsGuideModelFeatures: 'Funciones — qué se registra',
  statsGuideModelFeaturesBody:
    'Pérdidas, quién marcó, quién perdió el disco y quién juega cada punto son cuatro interruptores independientes, ofrecidos solo donde el detalle de arriba puede responderlos. Apaga uno y desaparece todo lo derivado de él, también en el informe, que nunca muestra una columna de la que no tiene datos.',
  statsGuideModelCost: 'Elige según lo que puedas seguir',
  statsGuideModelCostBody:
    'Cada interruptor cuesta toques con el disco en juego. Pérdidas es un toque por pérdida. «Preguntar quién perdió el disco» añade un diálogo a cada una, que es mucho en un punto rápido. «Preguntar quién marcó» es un diálogo por gol, en el hueco en el que de todos modos tienes tiempo. Las líneas son un registro por punto, entre puntos. Lo que te saltes sobre la marcha siempre se puede completar después desde el registro.',

  statsGuideStep1Title: 'Elige qué registra este partido',
  statsGuideStep1Body:
    'Todo está en la sección Estadísticas de la pantalla de configuración. Bajar el detalle retira lo que ya no puede responder y lo devuelve si vuelves a subirlo, así que no se pierde nada por probar.',
  statsGuideStep1Detail: 'Registrar',
  statsGuideStep1DetailBody:
    'Solo marcador, Por equipo o Por jugador — el detalle de arriba. Todo lo demás de esta lista depende de él.',
  statsGuideStep1Team: 'Jugadores de',
  statsGuideStep1TeamBody:
    'Qué roster se nombra: un equipo o los dos. Seguir a un solo equipo es lo que hace casi todo el mundo en un torneo, y es el único ajuste que permite seguir las líneas — dos líneas por punto es más de lo que nadie sigue desde la banda.',
  statsGuideStep1Turnovers: 'Pérdidas',
  statsGuideStep1TurnoversBody:
    'Pone el botón Turn en la pantalla de juego. Con él llegan la barra de posesión bajo el marcador, las estadísticas en vivo entre los relojes y los botones, y todas las cifras del informe derivadas de las pérdidas: holds limpios, oportunidades de break, breaks limpios y el gráfico de posesión.',
  statsGuideStep1TurnPlayers: 'Preguntar quién perdió el disco',
  statsGuideStep1TurnPlayersBody:
    'Anidado bajo Pérdidas, y desactivado por defecto. Activado, cada toque en Turn abre un diálogo que pregunta quién perdió el disco y quién lo forzó. Desactivado, el toque registra la pérdida y te devuelve la pantalla — el contador, la barra de posesión y todas las cifras de equipo siguen funcionando igual.',
  statsGuideStep1Goals: 'Preguntar quién marcó',
  statsGuideStep1GoalsBody:
    'Activado, cada gol abre un selector para el anotador y la asistencia. La señal de gol se retiene hasta que terminas, así que el diálogo nunca tapa justo lo que tienes que anunciar.',
  statsGuideStep1Lines: 'Registrar quién juega cada punto',
  statsGuideStep1LinesBody:
    'Registra la línea que salta al campo en cada punto. También pregunta de cuántos jugadores es una línea — eso lo marca el formato, siete en hierba y cinco en playa — y si comprobar el reparto de género: contra el ratio del partido, contra un reparto fijo, o no comprobarlo.',

  statsGuideStep2Title: 'Escribe el roster una vez',
  statsGuideStep2Body:
    'Nombrar jugadores necesita un roster, y vale la pena escribirlo una vez por torneo: se guarda con el equipo, así que el siguiente partido empieza con ella puesta. También puedes añadir jugadores con el partido en marcha — un dorsal desconocido nunca es un callejón sin salida.',
  statsGuideStep2Add: 'Dorsal y nombre',
  statsGuideStep2AddBody:
    'Cualquiera de los dos por separado es una entrada válida, que es lo que hace falta cuando desde la banda solo ves un dorsal.',
  statsGuideStep2Mark: 'MMP / FMP',
  statsGuideStep2MarkBody:
    'El botón pequeño de cada fila alterna sin marcar → MMP → FMP. La marca es un dato del jugador, así que se guarda lea o no lea este partido, y viaja con el equipo guardado al siguiente. Los diálogos de línea agrupan el roster por ella, y la comprobación del reparto la cuenta.',
  statsGuideStep2Import: 'Importar',
  statsGuideStep2ImportBody:
    'Pega la lista que ya envió la organización, o elige un archivo de texto plano. Un jugador por línea, en cualquier forma en que lo escriba una persona — «12 John Doe», «John Doe #12», solo el nombre o solo el dorsal — con MMP o FMP al final para marcarlo. Las líneas que no entiende las cuenta y las omite en vez de rechazar el pegado, y no se aplica nada hasta que has leído la vista previa.',
  statsGuideStep2Lines: 'Líneas predefinidas',
  statsGuideStep2LinesBody:
    'Da nombre a las líneas que juega este equipo — O1, D1, Zona — y estarán a un toque durante el partido, y aquí de nuevo la próxima vez. Una línea predefinida es un grupo, no un siete, así que no se comprueba contra nada: diez jugadores es una respuesta perfectamente válida. La comprobación es cosa de la línea que de verdad salta al campo.',

  statsGuideStep3Title: 'Registrar con el disco en juego',
  statsGuideStep3Body:
    'Lo que activaste decide qué hay en esta pantalla. Nada de esto toca el marcador, el reloj ni el objetivo: escribe en el registro y, desde ahí, en el informe.',
  statsGuideTour1:
    'La barra de posesión: una franja fina entre los paneles y los botones, rellena del lado de quien tiene el disco. Solo se dibuja si se registran pérdidas, y solo se enciende con el disco en juego.',
  statsGuideTour2:
    'Las estadísticas en vivo, en el hueco que usa el botón ámbar cuando lo hay. Tres páginas, que se pasan con las flechas de los lados — ver más abajo.',
  statsGuideTour3:
    'Roster. Con el seguimiento de líneas activado, primero pregunta si quieres la línea o el roster en sí.',
  statsGuideTour4:
    'Decisión. Desde «Por equipo» en adelante, cada decisión, pasos y parada técnica pregunta de qué equipo era; una lesión pregunta quién se ha hecho daño.',
  statsGuideTour5:
    'Turn: un toque por pérdida, con la insignia contándolas dentro del punto. Mantén pulsado para deshacer la última. Fíjate en la insignia para saber que el toque ha entrado: cuando el disco vuelve a un equipo que ya lo ha tenido en ese punto, la barra de posesión regresa a un lado en el que ya ha estado y nada más se mueve en pantalla.',

  statsGuideGoalTitle: 'Quién marcó',
  statsGuideGoalBody:
    'Toca el panel como siempre y el selector se abre justo después, con solo los jugadores registrados en el punto que acaba de terminar — quien salió por un cambio queda fuera, porque no pudo marcarlo. Guarda sin elegir a nadie y el gol cuenta igual; simplemente queda sin atribuir.',
  statsGuideGoalCallahan:
    'El interruptor de Callahan sustituye al selector de asistencia en vez de desactivarlo: la pregunta ya está respondida, y por reglamento la respuesta es «nadie». Es también como el informe distingue «nadie la lanzó» de «nadie lo apuntó».',

  statsGuideTurnTitle: 'Quién perdió el disco',
  statsGuideTurnBody:
    'Con «Preguntar quién perdió el disco» activado, cada toque en Turn hace dos preguntas independientes: quién perdió el disco — caída, mal pase, stall — y quién lo forzó, con un bloqueo o una marca que agotó el conteo. Cualquiera puede quedar en blanco; una D limpia y una caída sin presión son respuestas de un solo lado. Guardar sin elegir a nadie registra la pérdida igualmente.',
  statsGuideTurnWho:
    'La defensa se cuenta en el otro roster, y por eso una sola entrada de pérdida alimenta las dos mitades de la vista Posesión del informe.',

  statsGuideLineTitle: 'Quién está en el campo',
  statsGuideLineBody:
    'Entre puntos aparece un aviso encima de los relojes, y el mismo diálogo está detrás del botón Roster. Elige la línea, o carga una predefinida, y guarda. Nada se arrastra de un gol al siguiente: la línea cambia casi cada punto, así que dejar la anterior en vigor acabaría atribuyendo el punto al siete equivocado.',
  statsGuideLineCheck:
    'El tamaño y el reparto se comprueban, y la comprobación nunca rechaza: una línea fuera de norma avisa en ámbar y se guarda al segundo toque. Fuera del juego profesional un equipo no siempre puede sacar el ratio, así que el aviso es una nota, no un veto. Los jugadores sin marca se cuentan pero nunca son un fallo: tres sin marcar de siete hacen el reparto desconocido, no incorrecto.',
  statsGuideLineModes:
    'El diálogo guarda dos borradores a la vez, este punto y el siguiente, y aplica el que hayas tocado. Registrar la siguiente línea mientras el punto en curso sigue vivo es la forma de no quedarte atrás cuando los puntos se alargan.',
  statsGuideLineSub:
    'Una lesión pregunta quién cambia, porque es la única parada que cambia una línea a mitad de punto de forma habitual — también para el otro equipo, al que WFDF concede un cambio propio. Las dos mitades de un cambio se quedan en el punto: quien fue sustituido jugó ese punto y sigue contando en todas las cifras.',
  statsGuideLineName:
    'Guarda una selección con un nombre y se convierte en línea predefinida. Recortar una línea cargada mantiene su nombre; meter a alguien que nunca estuvo en ella lo quita, porque ese siete no salió de esa línea.',
  statsGuideLineNarrow:
    'Una línea registrada es además lo que ofrecen los selectores: anotador, asistencia, pérdida y lesión se limitan a quien estaba en el campo. Sin línea registrada vuelven al roster entero, así que saltarse una línea nunca te deja sin poder atribuir nada.',

  statsGuideFixTitle: 'Nada tiene que salir bien a la primera',
  statsGuideFixBody:
    'El registro lista todas las entradas en orden, y el lápiz de una fila reabre su atribución: quién marcó, quién asistió, quién perdió el disco, qué equipo pidió la decisión. Las correcciones no dependen de lo que el partido se configuró para preguntar: atribuye una pérdida en un partido que nunca lo preguntó y el informe se da cuenta y añade la columna. Solo corrige el registro: el marcador, el reloj y la posesión se quedan exactamente como están.',

  statsGuideStep4Title: 'Las estadísticas durante el partido',
  statsGuideStep4Body:
    'Están entre los relojes y los botones mientras el disco está en juego, y ceden el hueco en cuanto algo más urgente lo necesita — el botón ámbar de avance, o una decisión pendiente de resolver — así que nunca pueden mover los paneles del marcador. Solo en vertical: en horizontal no hay altura que gastar. Sin pérdidas hay una sola página de holds y breaks; con ellas, tres.',
  statsGuidePage1: 'Cifras de equipo',
  statsGuidePage1Body:
    'Una fila por equipo, en su color, en el mismo orden que los paneles. Holds, Breaks, Oportunidades de break y Pérdidas — las mismas cuatro con las que abre el informe, definidas más abajo.',
  statsGuidePage2: 'Posesión por punto',
  statsGuidePage2Body:
    'Una columna por punto, con la parte de posesión del equipo de arriba por encima de la línea y la del otro por debajo. Se desplaza, y es el mismo gráfico que dibuja el informe.',
  statsGuidePage3: 'Ritmo de este punto',
  statsGuidePage3Body:
    'Cuánto lleva el punto actual, comparado con la media de los ya jugados. La barra se rellena del color de quien tiene el disco, la marca es esa media, y aparece una muesca por cada pérdida en el momento del punto en que ocurrió.',

  statsGuideStep5Title: 'El informe — cifras de equipo',
  statsGuideStep5Body:
    'La tabla bajo el marcador final: una fila por cifra, una columna por equipo. Casi todas las filas necesitan que se hayan registrado pérdidas; sin ellas la tabla se queda en holds, breaks, las dos medias y los tiempos muertos.',
  statsGuideStatHold: 'Holds de línea O',
  statsGuideStatHoldBody:
    'Puntos ganados recibiendo el saque — los puntos que se espera que un equipo gane.',
  statsGuideStatCleanHold: 'Holds limpios',
  statsGuideStatCleanHoldBody:
    'De esos, aquellos en los que el disco no cambió de manos ni una vez: cero pérdidas de nadie, del saque a la zona de gol.',
  statsGuideStatBreakCh: 'Oportunidades de break',
  statsGuideStatBreakChBody:
    'Cuántas veces este equipo recuperó el disco en defensa — cada pérdida impar de un punto en el que sacó, ya que un punto empieza en manos del ataque y cada pérdida posterior alterna. Léelo junto a los Breaks para sacar el porcentaje de conversión.',
  statsGuideStatTurnovers: 'Pérdidas',
  statsGuideStatTurnoversBody:
    'Las propias de este equipo, en todo el partido, descontando lo deshecho.',
  statsGuideStatBreaks: 'Puntos de break',
  statsGuideStatBreaksBody: 'Puntos ganados sacando.',
  statsGuideStatCleanBreaks: 'Breaks limpios',
  statsGuideStatCleanBreaksBody:
    'De esos, los convertidos a la primera pérdida y sin devolver nada — exactamente una pérdida en todo el punto.',
  statsGuideStatAvg: 'Tiempo medio de hold / break',
  statsGuideStatAvgBody:
    'Cuánto duraron los puntos que ganó este equipo, separando los que recibía de los que sacaba.',
  statsGuideStatTimeouts: 'Tiempos muertos usados',
  statsGuideStatTimeoutsBody:
    'Las dos partes sumadas. Una pausa de hidratación no cuesta ninguno, así que nunca aparece aquí.',

  statsGuideLedgerTitle: 'Posesión por punto',
  statsGuideLedgerBody:
    'Todo el partido en una franja: una columna por punto, la altura de la barra es la parte de posesión de cada equipo, el lado relleno es quien anotó, y el punto ámbar quien empezó atacando. Punto y relleno en lados opuestos es un break.',

  statsGuideStep6Title: 'El informe — estadísticas de jugador',
  statsGuideStep6Body:
    'Una fila por jugador que haya hecho algo: marcar, asistir, saltar al campo o perder el disco. Las columnas son tres vistas detrás de pastillas en vez de una tabla demasiado ancha para un móvil, y una vista solo se ofrece cuando este partido tiene datos para ella — si solo hay Anotación, las pastillas ni aparecen.',
  statsGuideViewScoring: 'Anotación',
  statsGuideViewScoringBody:
    'Asistencias, Goles, Total. Disponible en cualquier partido con roster, esté lo demás activado o no.',
  statsGuideViewPlaying: 'Juego — necesita seguimiento de líneas',
  statsGuideViewPlayingBody:
    'Puntos jugados, cuántos de ellos en ataque (O) y en defensa (D), y cuántos de esos puntos ganó y perdió su equipo. Esta es la tabla de «quién estaba en los puntos buenos», y para lo que sirve el seguimiento de líneas.',
  statsGuideViewPossession: 'Posesión — necesita atribuir pérdidas',
  statsGuideViewPossessionBody:
    'Turns — pérdidas en las que este jugador perdió el disco — y D, las pérdidas que forzó. No pregunta nada sobre líneas, así que un partido que nunca las siguió tiene igualmente esta vista; y como una misma entrada cuenta un turn en un roster y una D en el otro, las dos columnas son los mismos sucesos leídos en direcciones opuestas.',
  statsGuideUnassigned: '«Sin registrar»',
  statsGuideUnassignedBody:
    'La fila atenuada bajo cada equipo: los goles sin anotador, los goles sin asistencia y los puntos sin línea registrada. Nombrar jugadores siempre es opcional, así que sin esta fila las columnas dejarían de sumar el marcador sin decirlo. Sus celdas son rayas allí donde la cifra sería de un jugador, porque la fila no representa a nadie en concreto, y no aparece en la vista Posesión: una pérdida sin nadie atribuido no es el turn de nadie ni la D de nadie.',
  statsGuideFilter: 'El filtro de equipo',
  statsGuideFilterBody:
    'Aparece solo cuando se siguen los dos rosters. Como el seguimiento de líneas sigue a un solo equipo, la vista Juego y el filtro nunca coinciden en pantalla.',

  statsGuideStep7Title: 'Llevarte los números',
  statsGuideShare: 'Compartir',
  statsGuideShareBody:
    'El marcador, las cifras de equipo, la tabla de jugadores y el resumen del partido, dibujados como imagen para un chat de equipo. La imagen lleva las columnas de todas las vistas a la vez, agrupadas bajo Juego, Anotación y Posesión — una imagen no se puede tocar para cambiar de vista, que es por lo que la pantalla las separa en vistas.',
  statsGuideCopy: 'Copiar al portapapeles',
  statsGuideCopyBody:
    'El archivo: todo en texto plano para una hoja de cálculo o un correo, con las columnas de todas las vistas disponibles en una línea por jugador y las líneas predefinidas en las que apareció cada uno. Hazlo antes de salir de la pantalla.',
  statsGuideFullLog: 'Registro completo',
  statsGuideFullLogBody:
    'El resumen del partido deja fuera las pérdidas y las decisiones — en un partido con seguimiento llegan por docenas y entierran la forma del partido. Todo está a un toque detrás de «Registro completo», con su propio botón de copiar.',
  statsGuideHistory: 'Historial de partidos',
  statsGuideHistoryBody:
    'Un partido que terminó por marcador se archiva solo, y abrirlo desde el Historial te da este mismo informe, exactamente como estaba ese día — se guarda el partido entero, no un resumen. Se conservan los últimos 50, en este dispositivo.',

  statsGuideCheatTitle: 'Qué cuenta cada cifra',
  statsGuideDefHold: 'Hold',
  statsGuideDefHoldDo: 'Punto ganado por el equipo que recibía el saque',
  statsGuideDefBreak: 'Break',
  statsGuideDefBreakDo: 'Punto ganado por el equipo que sacaba',
  statsGuideDefCleanHold: 'Hold limpio',
  statsGuideDefCleanHoldDo: 'Hold sin ninguna pérdida de nadie',
  statsGuideDefCleanBreak: 'Break limpio',
  statsGuideDefCleanBreakDo: 'Break convertido a la primera pérdida, sin devolverla',
  statsGuideDefBreakCh: 'Oportunidad de break',
  statsGuideDefBreakChDo: 'Cada pérdida impar de un punto en el que este equipo sacaba',
  statsGuideDefTurn: 'Turns',
  statsGuideDefTurnDo: 'Pérdidas atribuidas al jugador que perdió el disco',
  statsGuideDefD: 'D (Posesión)',
  statsGuideDefDDo: 'Pérdidas que forzó este jugador — bloqueos, y marcas que agotaron el conteo',
  statsGuideDefOD: 'O / D (Juego)',
  statsGuideDefODDo: 'Puntos jugados recibiendo el saque / sacando',

  statsGuideFigSetupAlt:
    'La sección Estadísticas de la pantalla de configuración, con todo activado',
  statsGuideFigRosterAlt:
    'La sección Roster de la pantalla de configuración, con jugadores y líneas predefinidas',
  statsGuideFigDashboardAlt:
    'La pantalla de juego a mitad de punto, con la barra de posesión y las estadísticas en vivo',
  statsGuideFigGoalAlt: 'El diálogo que pregunta quién marcó y quién asistió',
  statsGuideFigTurnoverAlt:
    'El diálogo que pregunta quién perdió el disco y quién forzó la pérdida',
  statsGuideFigLineAlt: 'El diálogo de línea, con el roster agrupado por marca',
  statsGuideFigLiveTeamAlt: 'Las estadísticas en vivo mostrando las cifras de equipo',
  statsGuideFigLivePossessionAlt: 'Las estadísticas en vivo mostrando la posesión por punto',
  statsGuideFigLivePaceAlt: 'Las estadísticas en vivo mostrando el ritmo del punto actual',
  statsGuideFigReportTeamAlt: 'La tabla de cifras de equipo del informe',
  statsGuideFigReportLedgerAlt: 'El gráfico de posesión por punto del informe',
  statsGuideFigReportPlayersAlt:
    'La tabla de estadísticas de jugador del informe, en la vista Juego',

  guideFigSetupAlt:
    'La parte de arriba de la pantalla de configuración: plantilla, división y nombres de los equipos',
  guideFigTossAlt: 'La sección del sorteo de la pantalla de configuración',
  guideFigGameAlt: 'El panel entre punto y punto, esperando el pull',
  guideFigScoreAlt: 'El panel con el disco en juego',
  guideFigRecordAlt: 'El diálogo de llamadas',
  guideFigRulesAlt:
    'Las secciones de condiciones de victoria, half y tiempos muertos de la pantalla de configuración',
  guideFigReportAlt: 'La pantalla del informe final',
};
