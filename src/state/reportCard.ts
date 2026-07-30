/**
 * The data half of the shareable report image.
 *
 * `reportCardModel` freezes everything the card shows into plain strings —
 * already translated, already formatted — so the drawing code in
 * `components/reportCardImage.ts` only ever measures and paints text and never
 * has to reach back into game state or the dictionary. That split is what keeps
 * the layout testable without a canvas: this file is pure and covered by unit
 * tests, the canvas file is mechanical.
 *
 * The card is deliberately *not* the whole report — it leaves out the game log,
 * which is what makes it shareable at all (a full log is pages long and unreadable
 * as an image). The log stays in the copied plain text.
 */
import type { Lang, TFunc } from '../i18n/useT';
import { statsTrackingEnabled } from './gameReducer';
import { formatClock, playerStatLines, teamStats } from './stats';
import type { GameConfig, GameState, TeamId } from './types';

export interface StatRow {
  label: string;
  a: string;
  b: string;
}

export interface CardPlayerRow {
  label: string;
  /** Team colour for the leading dot, or null when only one team is listed and the dot would say nothing. */
  color: string | null;
  assists: string;
  goals: string;
  total: string;
}

export interface ReportCardModel {
  /**
   * Field, date and clock times as separate segments; the drawer packs them onto
   * as many lines as fit. There is deliberately no "Final report" heading above
   * them — the screen needs one to say where you are, an image landing in a chat
   * does not, and the score speaks for itself.
   */
  meta: string[];
  teams: { name: string; color: string; score: string }[];
  statHeader: [string, string];
  statRows: StatRow[];
  playerTitle: string;
  playerHeader: [string, string, string, string];
  playerRows: CardPlayerRow[];
}

/** Dates are the one thing on the card that isn't a dictionary string, so the language has to be resolved to a locale. */
const LOCALES: Record<Lang, string> = { en: 'en-GB', es: 'es-ES', ca: 'ca-ES' };

/**
 * Which rosters the player table draws from — Team mode has detail for the
 * tracked side only, Player mode for both, Game mode for neither. Shared with
 * ReportScreen so the table and the image can never disagree about it.
 */
export function playerStatsTeams(config: GameConfig): TeamId[] {
  if (config.statsMode === 'team') return config.trackedTeam ? [config.trackedTeam] : [];
  if (config.statsMode === 'player') return ['A', 'B'];
  return [];
}

/**
 * The paired team-stat rows, in report order. The extended rows only exist once
 * activity tracking is on — with it off there are no turnovers to count, so
 * "clean" holds and breaks would be indistinguishable from plain ones.
 */
export function teamStatRows(state: GameState, t: TFunc): StatRow[] {
  const A = teamStats(state, 'A');
  const B = teamStats(state, 'B');
  const tracking = statsTrackingEnabled(state.config);
  const clock = (s: number | null) => (s === null ? '—' : formatClock(s));
  const row = (label: string, a: string | number, b: string | number): StatRow => ({
    label,
    a: String(a),
    b: String(b),
  });
  return [
    row(t('statOLineHolds'), A.oLineHolds, B.oLineHolds),
    ...(tracking ? [row(t('statCleanHold'), A.cleanHolds, B.cleanHolds)] : []),
    ...(tracking ? [row(t('statBreakChances'), A.breakChances, B.breakChances)] : []),
    ...(tracking ? [row(t('statTurnovers'), A.turnovers, B.turnovers)] : []),
    row(t('statBreaks'), A.breaks, B.breaks),
    ...(tracking ? [row(t('statCleanBreaks'), A.cleanBreaks, B.cleanBreaks)] : []),
    row(t('statAvgHold'), clock(A.avgHoldSeconds), clock(B.avgHoldSeconds)),
    row(t('statAvgBreak'), clock(A.avgBreakSeconds), clock(B.avgBreakSeconds)),
    row(t('statTimeouts'), A.timeoutsUsed, B.timeoutsUsed),
  ];
}

function formatDate(atMs: number, lang: Lang): string {
  try {
    return new Date(atMs).toLocaleDateString(LOCALES[lang], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return new Date(atMs).toDateString();
  }
}

/**
 * Field, date and the wall-clock span of the game. These live in the copied text
 * but never on the report screen, and they are exactly what a shared image needs
 * to still make sense a week later — so the card is where they come back.
 */
function metaSegments(state: GameState, t: TFunc, lang: Lang): string[] {
  const segments: string[] = [];
  const field = state.config.fieldNumber.trim();
  if (field) segments.push(t('field', { n: field }));

  const start = state.log.find((e) => e.type === 'gameStart');
  const end = [...state.log].reverse().find((e) => e.type === 'gameEnd');
  if (start) {
    segments.push(formatDate(start.atMs, lang));
    segments.push(t('reportStarted', { time: start.wallClock }));
  }
  if (end) segments.push(t('reportFinished', { time: end.wallClock }));
  if (start && end) {
    segments.push(
      t('reportDuration', { duration: formatClock(Math.round((end.atMs - start.atMs) / 1000)) }),
    );
  }
  return segments;
}

export function reportCardModel(state: GameState, t: TFunc, lang: Lang): ReportCardModel {
  const teams = state.config.teams;
  const showTeamColors = state.config.statsMode === 'player';

  return {
    meta: metaSegments(state, t, lang),
    teams: (['A', 'B'] as TeamId[]).map((id) => ({
      name: teams[id].name,
      color: teams[id].color,
      score: String(state.scores[id]),
    })),
    statHeader: [teams.A.name, teams.B.name],
    statRows: teamStatRows(state, t),
    playerTitle: t('playerStatsTitle'),
    playerHeader: [t('colPlayer'), t('colAssists'), t('colGoals'), t('colTotal')],
    playerRows: playerStatLines(state, playerStatsTeams(state.config)).map((p) => ({
      label: p.label,
      color: showTeamColors ? teams[p.team].color : null,
      assists: String(p.assists),
      goals: String(p.goals),
      total: String(p.total),
    })),
  };
}
