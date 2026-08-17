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
import { statsTrackingEnabled, turnoverPlayersTracked } from './gameReducer';
import { playerStatColumns, statCellText } from '../components/playerStatColumns';
import { lineTrackingEnabled } from './lines';
import {
  formatClock,
  playerStatLines,
  possessionTopShare,
  sortPlayerStatLines,
  teamStats,
} from './stats';
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
  /** The per-team aggregate of unrecorded scorers and assists — drawn dimmed, since it names nobody. */
  unassigned: boolean;
  /**
   * The numeric cells, already formatted, in the same order as `playerHeader`'s
   * numeric columns. A list rather than named fields because which columns the card
   * carries depends on the game (see `reportCardModel`), and the drawer derives its
   * column positions from how many there are.
   */
  values: string[];
}

export interface CardLedgerColumn {
  /** Top team's share of the point's tracked possession, or null when none was recorded (drawn flat). */
  topShare: number | null;
  /** Whether the top team scored the point — the filled side of the column. */
  topScored: boolean;
  /** Whether the top team started the point on offence — the side the amber dot sits on. */
  topOffense: boolean;
  /** The scoring team's running score after this point, riding its bar. */
  score: string;
}

export interface CardLedgerModel {
  title: string;
  topColor: string;
  bottomColor: string;
  columns: CardLedgerColumn[];
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
  /**
   * The possession ledger, or null when no point tracked possession. Unlike the
   * game log this earns its place on the image: it is one glance wide per point,
   * and the card grows wider rather than dropping columns — shared full, never
   * truncated (see drawReportCard).
   */
  ledger: CardLedgerModel | null;
  playerTitle: string;
  /**
   * The player column, then one heading per numeric column. Always at least two
   * entries; the drawer measures each numeric column and grows the card to fit, so
   * this is what decides the table's shape rather than any hardcoded offset.
   */
  playerHeader: string[];
  /**
   * Labels over runs of numeric columns, in column order, or null for a table that
   * is one group and would only be repeating itself. Nine columns of two-letter
   * headings is a wall of numbers; the same nine under Playing / Scoring / Possession
   * is three things a reader can take in one at a time — which is the whole
   * difference between a card that gets read in a team chat and one that doesn't.
   * `span` counts numeric columns, and the spans must cover them all exactly.
   */
  playerGroups: { label: string; span: number }[] | null;
  /**
   * Which numeric column carries the row's headline figure, drawn in `signal`, or
   * null for none. The index rather than "the last one": grouped, the rightmost is
   * whatever Possession happens to end on, which is nobody's headline.
   */
  playerAccent: number | null;
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

/**
 * The card's possession ledger, mirroring the on-screen PossessionLedger: the
 * board's fixed left team (startingSide) on top, one column per point, the
 * scorer's running score as its label. Null when no point tracked possession —
 * a strip of flat columns says nothing the score boxes don't.
 */
function ledgerModel(state: GameState, t: TFunc): CardLedgerModel | null {
  if (!statsTrackingEnabled(state.config)) return null;
  // Any point recorded with tracking on carries the pair — a zero-second point
  // included, since possessionTopShare gives that one a share too.
  if (!state.points.some((p) => p.possessionSeconds !== undefined)) return null;
  const top: TeamId = state.config.startingSide;
  const bottom: TeamId = top === 'A' ? 'B' : 'A';
  const scores: Record<TeamId, number> = { A: 0, B: 0 };
  return {
    title: t('possessionTitle'),
    topColor: state.config.teams[top].color,
    bottomColor: state.config.teams[bottom].color,
    columns: state.points.map((p) => {
      scores[p.scoredBy] += 1;
      return {
        topShare: possessionTopShare(p, top),
        topScored: p.scoredBy === top,
        topOffense: p.offense === top,
        score: String(scores[p.scoredBy]),
      };
    }),
  };
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
  // With either extra view active the card carries **every** player column the
  // report screen offers behind its pills, grouped under those same names — the
  // screen splits them because a phone is 360px wide, and an image being read in a
  // chat has no such excuse for making the reader tap through them. Playing needs
  // line tracking (its columns come off `PointRecord.line`); Possession needs only
  // "Ask who turned it over" and is otherwise independent of it — see
  // ReportScreen's identical split. With neither on, the scoring columns are all
  // there is, so the card stays exactly what it has always been: three columns and
  // no group row to explain.
  //
  // The columns are the screen's own, and the cells go through its `statCellText`, so
  // the card cannot disagree with the table about what a figure is — including which
  // ones are dashes because nobody was ever named.
  const playerLines = playerStatLines(state, playerStatsTeams(state.config), t);
  const showPlaying = lineTrackingEnabled(state.config);
  // The config flag is the normal reason Possession has anything to show, but
  // `LogEditDialog` can attribute a turnover as a correction whatever the flag
  // says (see CLAUDE.md) — so a game that turned it on only after the fact, or
  // never at all, still gets the view the moment a turn or a D is actually named.
  const showPossession =
    turnoverPlayersTracked(state.config) ||
    playerLines.some((p) => !p.unassigned && (p.turns > 0 || p.defenses > 0));
  const groups =
    showPlaying || showPossession
      ? [
          ...(showPlaying
            ? [{ label: t('viewPlaying'), columns: playerStatColumns('playing') }]
            : []),
          // Total is the one column the card drops: with Goals and Assists side by
          // side it is arithmetic, and the card is short of width, not of readers.
          {
            label: t('viewScoring'),
            columns: playerStatColumns('scoring').filter((c) => c.key !== 'colTotal'),
          },
          ...(showPossession
            ? [{ label: t('viewPossession'), columns: playerStatColumns('possession') }]
            : []),
        ]
      : null;
  const columns = groups ? groups.flatMap((g) => g.columns) : playerStatColumns('scoring');

  return {
    meta: metaSegments(state, t, lang),
    teams: (['A', 'B'] as TeamId[]).map((id) => ({
      name: teams[id].name,
      color: teams[id].color,
      score: String(state.scores[id]),
    })),
    statHeader: [teams.A.name, teams.B.name],
    statRows: teamStatRows(state, t),
    ledger: ledgerModel(state, t),
    playerTitle: t('playerStatsTitle'),
    playerHeader: [t('colPlayer'), ...columns.map((c) => t(c.key))],
    playerGroups: groups?.map((g) => ({ label: g.label, span: g.columns.length })) ?? null,
    // Points played with lines on — it is the first column, the order the rows are in
    // and the question the whole feature was added to answer. Otherwise the last
    // column, same as ever: Total when nothing else is grouped in, or Possession's
    // final column when that is the only extra view.
    playerAccent: showPlaying ? 0 : columns.length - 1,
    playerRows: sortPlayerStatLines(
      playerLines,
      showPlaying ? 'playing' : showPossession ? 'possession' : 'scoring',
    ).map((p) => ({
      label: p.label,
      color: showTeamColors ? teams[p.team].color : null,
      unassigned: p.unassigned === true,
      values: columns.map((c) => statCellText(c, p)),
    })),
  };
}
