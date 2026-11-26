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
 * The card carries everything the report screen shows, and shows it opened up:
 * the screen folds each point of "Point by point" to its heading and lets the
 * reader tap it open, whereas an image in a chat cannot be tapped, so every point
 * is painted with its whole timeline (see `pointsModel`). What it leaves out is the
 * full log, which is the copied text's and the full-log dialog's.
 */
import type { Lang, TFunc } from '../i18n/useT';
import {
  passAverageFor,
  passesFor,
  passesTracked,
  rosterTeams,
  turnoverPlayersTracked,
  turnoversTracked,
} from './gameReducer';
import { playerStatColumns, statCellText } from '../components/playerStatColumns';
import { lineTrackingEnabled } from './lines';
import { pointStories, pointsModel, possessionsScored } from './pointStory';
import type { PointsModel } from './pointStory';
import { playerStatLines, sortPlayerStatLines, teamStats } from './stats';
import type { GameConfig, GameState, TeamId } from './types';

export interface StatRow {
  label: string;
  a: string;
  b: string;
  /**
   * The share each side's figure is of what it could have been, already formatted
   * ("75%", or "—" with nothing to divide by). Only the rows that are a fraction
   * carry one.
   */
  aPct?: string;
  bPct?: string;
  /**
   * A small row qualifying the one above it — the clean holds under Holds, the
   * per-possession average under Passes — drawn smaller, with no rule between it
   * and its parent.
   */
  sub?: boolean;
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

/** "Point by point", with the team colours its dots and blocks are painted in. */
export interface CardPointsModel extends PointsModel {
  colors: Record<TeamId, string>;
}

export interface ReportCardModel {
  /**
   * The line over the score — field, when it started, how long it ran — as
   * separate segments, the same ones the report screen shows (`reportMeta`); the
   * drawer packs them onto as many lines as fit. There is deliberately no heading
   * of any kind above it — an image landing in a chat needs no label saying where
   * you are, and the score speaks for itself. (The screen has none either: it is a
   * layer over a game that may still be resumed, so nothing on it calls the score
   * final.)
   */
  meta: string[];
  /** `result` dims the loser's box, only once the scoreline finished the game (`gameLoser`). */
  teams: { name: string; color: string; score: string; result: 'win' | 'loss' | null }[];
  /** The heading over the team figures, which also carry each team's name over its column. */
  teamsTitle: string;
  statRows: StatRow[];
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
   * "Point by point" — every point with its timeline, the markers between them and
   * the results by line — or null before anything has been logged. The drawer paints
   * every row rather than truncating, so a long game makes a tall card.
   */
  points: CardPointsModel | null;
  /** The closing credit and the app's address, the same two lines the copied text ends on. */
  footer: { credit: string; url: string };
}

/**
 * Where the app lives. Both shared copies end on it — the copied text and the image —
 * under the same `reportFooterCredit` line, so whoever receives one can find the app.
 */
export const APP_URL = 'https://xaviml.github.io/ultimate-scorekeeper/';

/**
 * Dates are the one thing on screen that isn't a dictionary string, so the language
 * has to be resolved to a locale — `en` alone means en-US ("Nov 26"), and the app
 * writes dates the en-GB way ("26 Nov"). Every date the app shows goes through this.
 */
export const LOCALES: Record<Lang, string> = { en: 'en-GB', es: 'es-ES', ca: 'ca-ES' };

/**
 * Which rosters the player table draws from — the followed team, both, or neither
 * where nothing is attributed to players. Shared with ReportScreen so the table and
 * the image can never disagree about it.
 */
export function playerStatsTeams(config: GameConfig): TeamId[] {
  return rosterTeams(config);
}

/**
 * The paired team-stat rows, in report order, modelled on a broadcast game
 * summary: a few large figures, each followed by the small rows that qualify it.
 *
 * Holds are counted out of the points the team received, which every game knows.
 * Breaks are counted out of break chances — how often the team got the disc back
 * on defence — which only exists once turnovers are recorded; without them the
 * row is the plain count, because the same "2/8" read out of D-points would look
 * identical to "2/8" out of chances while meaning something else. The clean
 * counts sit under the figure they are a part of, and need turnovers too.
 *
 * Passes can be a real number on one side and a dash on the other: a game
 * following a single team shows the other side a dash until a pass is recorded
 * for them (see `passesFor`).
 */
export function teamStatRows(state: GameState, t: TFunc): StatRow[] {
  const A = teamStats(state, 'A');
  const B = teamStats(state, 'B');
  const tracking = turnoversTracked(state.config);
  const passing = passesTracked(state.config);
  const stories = pointStories(state);
  const aScored = possessionsScored(state, 'A', stories);
  const bScored = possessionsScored(state, 'B', stories);
  const count = (n: number | null) => (n === null ? '—' : n);
  // One decimal, because the whole use of an average is the gap between 4.4 and
  // 4.6 that a rounded figure closes.
  const rate = (n: number | null) => (n === null ? '—' : n.toFixed(1));
  const pct = (made: number, of: number) => (of === 0 ? '—' : `${Math.round((made / of) * 100)}%`);
  const row = (label: string, a: string | number, b: string | number): StatRow => ({
    label,
    a: String(a),
    b: String(b),
  });
  const sub = (label: string, a: string | number, b: string | number): StatRow => ({
    ...row(label, a, b),
    sub: true,
  });
  const fraction = (label: string, a: [number, number], b: [number, number]): StatRow => ({
    label,
    a: `${a[0]}/${a[1]}`,
    b: `${b[0]}/${b[1]}`,
    aPct: pct(a[0], a[1]),
    bPct: pct(b[0], b[1]),
  });
  return [
    fraction(t('statHolds'), [A.oLineHolds, A.oPoints], [B.oLineHolds, B.oPoints]),
    ...(tracking ? [sub(t('statClean'), A.cleanHolds, B.cleanHolds)] : []),
    tracking
      ? fraction(t('statBreaks'), [A.breaks, A.breakChances], [B.breaks, B.breakChances])
      : row(t('statBreaks'), A.breaks, B.breaks),
    ...(tracking ? [sub(t('statClean'), A.cleanBreaks, B.cleanBreaks)] : []),
    ...(tracking ? [row(t('statTurnovers'), A.turnovers, B.turnovers)] : []),
    // Out of every possession the team had, so a point nobody turned over counts as
    // one possession and one score — see `possessionsScored`. Turnover-derived like
    // the rows above it: without them there is no count of possessions at all.
    ...(aScored && bScored
      ? [
          fraction(
            t('statPossessionsScored'),
            [aScored.scored, aScored.possessions],
            [bScored.scored, bScored.possessions],
          ),
        ]
      : []),
    ...(passing
      ? [
          row(t('statPasses'), count(passesFor(state, 'A')), count(passesFor(state, 'B'))),
          sub(
            t('statPassesPerPossession'),
            rate(passAverageFor(state, 'A')),
            rate(passAverageFor(state, 'B')),
          ),
        ]
      : []),
    row(t('statTimeouts'), A.timeoutsUsed, B.timeoutsUsed),
  ];
}

function cardPoints(state: GameState, t: TFunc): CardPointsModel | null {
  const model = pointsModel(state, t);
  if (model.rows.length === 0) return null;
  return { ...model, colors: { A: state.config.teams.A.color, B: state.config.teams.B.color } };
}

/**
 * Field, date and start time, and how long the game ran — the line over the score
 * on the report screen and on the shared image alike, so the two read the same and
 * an image opened weeks later still says when it was played (hence the year). The
 * duration is start to end on the wall clock, or the game clock so far for a game
 * not yet left. A field left blank is left out rather than printed empty.
 */
export function reportMeta(state: GameState, t: TFunc, lang: Lang): string[] {
  const segments: string[] = [];
  const field = state.config.fieldNumber.trim();
  if (field) segments.push(t('field', { n: field }));

  const start = state.log.find((e) => e.type === 'gameStart');
  const end = [...state.log].reverse().find((e) => e.type === 'gameEnd');
  if (!start) return segments;
  try {
    segments.push(
      new Intl.DateTimeFormat(LOCALES[lang], {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(start.atMs),
    );
  } catch {
    segments.push(new Date(start.atMs).toDateString());
  }
  const seconds = end ? Math.round((end.atMs - start.atMs) / 1000) : state.gameSeconds;
  segments.push(`${Math.max(1, Math.round(seconds / 60))} ${t('unitMin')}`);
  return segments;
}

/**
 * The team that lost, or null while there is nothing to point at: only a game the
 * scoreline finished has a winner — one left early, or read mid-game, may yet be
 * played on.
 */
export function gameLoser(state: GameState): TeamId | null {
  if (state.status !== 'finished' || state.scores.A === state.scores.B) return null;
  return state.scores.A < state.scores.B ? 'A' : 'B';
}

export function reportCardModel(state: GameState, t: TFunc, lang: Lang): ReportCardModel {
  const teams = state.config.teams;
  const loser = gameLoser(state);
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
    footer: { credit: t('reportFooterCredit'), url: APP_URL },
    meta: reportMeta(state, t, lang),
    teams: (['A', 'B'] as TeamId[]).map((id) => ({
      name: teams[id].name,
      color: teams[id].color,
      score: String(state.scores[id]),
      result: loser === null ? null : loser === id ? 'loss' : 'win',
    })),
    teamsTitle: t('reportTeamsTitle'),
    statRows: teamStatRows(state, t),
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
    points: cardPoints(state, t),
  };
}
