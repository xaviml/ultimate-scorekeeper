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
 * The card carries the game summary — the report's own filtered history, goals
 * and caps and stoppages, minus the turnovers and the calls (see
 * `reportLogEntries`). What it still leaves out is the *full* log: that arrives by
 * the dozen in a tracked game and is pages long as a picture, and it stays where
 * it always was, in the copied plain text and the full-log dialog.
 */
import type { Lang, TFunc } from '../i18n/useT';
import { rosterTeams, turnoverPlayersTracked, turnoversTracked } from './gameReducer';
import { playerStatColumns, statCellText } from '../components/playerStatColumns';
import { lineTrackingEnabled } from './lines';
import {
  formatClock,
  logRow,
  playerStatLines,
  possessionTopShare,
  reportLogEntries,
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

/** One row of the game summary, in the three columns the on-screen table uses. */
export interface CardHistoryRow {
  clock: string;
  event: string;
  detail: string;
}

export interface CardHistoryModel {
  title: string;
  rows: CardHistoryRow[];
}

export interface ReportCardModel {
  /**
   * Field, date and clock times as separate segments; the drawer packs them onto
   * as many lines as fit. There is deliberately no heading of any kind above them
   * — an image landing in a chat needs no label saying where you are, and the
   * score speaks for itself. (The screen has none either any more: it is a layer
   * over a game that may still be resumed, so nothing on it calls the score final.)
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
  /**
   * The game summary — the report's history panel, entry for entry, or null when
   * nothing survived the filter (a game with no goals recorded at all). It is the
   * report's own `reportLogEntries`, not the whole log, so what the picture says
   * happened is exactly what the screen said happened; the drawer paints every
   * row rather than truncating, and the card simply grows taller, the same
   * bargain the ledger strikes with width.
   */
  history: CardHistoryModel | null;
}

/** Dates are the one thing on the card that isn't a dictionary string, so the language has to be resolved to a locale. */
const LOCALES: Record<Lang, string> = { en: 'en-GB', es: 'es-ES', ca: 'ca-ES' };

/**
 * Which rosters the player table draws from — the followed team, both, or neither
 * where nothing is attributed to players. Shared with ReportScreen so the table and
 * the image can never disagree about it.
 */
export function playerStatsTeams(config: GameConfig): TeamId[] {
  return rosterTeams(config);
}

/**
 * The paired team-stat rows, in report order. The extended rows are all derived
 * from turnovers, so they only exist once turnovers are recorded — without them
 * "clean" holds and breaks would be indistinguishable from plain ones.
 */
export function teamStatRows(state: GameState, t: TFunc): StatRow[] {
  const A = teamStats(state, 'A');
  const B = teamStats(state, 'B');
  const tracking = turnoversTracked(state.config);
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
  if (!turnoversTracked(state.config)) return null;
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

/**
 * The report's history as card rows. Built through `logRow`, the same splitter the
 * on-screen table renders, so a row cannot read one way in the panel and another
 * in the picture.
 */
function historyModel(state: GameState, t: TFunc): CardHistoryModel | null {
  const entries = reportLogEntries(state.log);
  if (entries.length === 0) return null;
  return { title: t('historyTitle'), rows: entries.map((e) => logRow(state, e, t)) };
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
  // A dot per row only when both rosters are listed and a name alone wouldn't say
  // which side it is.
  const showTeamColors = playerStatsTeams(state.config).length > 1;
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
  // the card cannot disagree with the table about what a figure is — the aggregate
  // row's dashes included.
  const playerLines = playerStatLines(state, playerStatsTeams(state.config), t);
  const showPlaying = lineTrackingEnabled(state.config);
  // The config flag is the normal reason Possession has anything to show, but
  // `LogEditDialog` can attribute a turnover as a correction whatever the flag
  // says (see CLAUDE.md) — so a game that turned it on only after the fact, or
  // never at all, still gets the view the moment a turn or a D is actually named.
  const showPossession =
    turnoverPlayersTracked(state.config) || playerLines.some((p) => p.turns > 0 || p.defenses > 0);
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
    history: historyModel(state, t),
  };
}
