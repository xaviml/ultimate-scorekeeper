import type { Dict } from '../i18n/useT';
import type { PlayerStatLine, PlayerStatView } from '../state/stats';

/**
 * The column sets behind the report's three player-stat views, and the formatting
 * rules for their cells.
 *
 * A module of its own rather than part of `PlayerStatsTable`: it is data, shared by
 * the table, the copied plain text and the shared image, none of which should have to
 * import a component to find out what a column is.
 */

/**
 * One numeric column. `full` is the unabbreviated wording, carried on `title` so a
 * header like "No D" can stay four characters wide on a phone without becoming a
 * riddle.
 */
export interface PlayerStatColumn {
  key: keyof Dict;
  full?: keyof Dict;
  value: (line: PlayerStatLine) => number;
  /** Signed columns read as a change, not a count: +4 says more than 4 does. */
  signed?: boolean;
  /** True for the columns the aggregate row can legitimately carry — see `statCellText`. */
  aggregate?: boolean;
  /**
   * Whether this row's figure is unknown rather than zero, for a column whose data
   * the game may simply never have been asked for. A dash says "not recorded"; a
   * zero says "it did not happen", and only one of those is true.
   */
  unknown?: (line: PlayerStatLine) => boolean;
}

const COLUMNS: Record<PlayerStatView, PlayerStatColumn[]> = {
  // Unchanged from the table this replaced, so a game with no line tracking sees
  // exactly the report it always has.
  scoring: [
    { key: 'colAssists', value: (l) => l.assists, aggregate: true },
    { key: 'colGoals', value: (l) => l.goals, aggregate: true },
    { key: 'colTotal', value: (l) => l.total, aggregate: true },
  ],
  // Everything here comes off `PointRecord.line`, which is the one thing this view
  // is about — who was on the field, and how those points went for them.
  playing: [
    {
      key: 'colPointsPlayed',
      full: 'colPointsPlayedFull',
      value: (l) => l.pointsPlayed,
      // The one line-tracking figure the aggregate does carry: the points nobody
      // registered, which is what keeps the column adding up to the game.
      aggregate: true,
    },
    { key: 'colOPoints', full: 'colOPointsFull', value: (l) => l.oPoints },
    { key: 'colDPoints', full: 'colDPointsFull', value: (l) => l.dPoints },
    // Won/Lost replace the older single +/- column: the same two numbers a net
    // figure was already collapsing, spelled out rather than subtracted for you.
    { key: 'colWon', full: 'colWonFull', value: (l) => l.holds + l.breaks },
    {
      key: 'colLost',
      full: 'colLostFull',
      value: (l) => l.pointsPlayed - l.holds - l.breaks,
    },
  ],
  // What the log attributes to this player individually, regardless of any line —
  // a turnover names a thrower and, on the other roster, a defender. Unlike Playing
  // this needs no line tracking, only "Ask who turned it over".
  possession: [
    {
      key: 'colTurns',
      full: 'colTurnsFull',
      value: (l) => l.turns,
      // The turnovers nobody was named on, which is what keeps the column adding up
      // to the team's total — and, when that is all of them, the only honest figure
      // in it (the players above go to dashes, see `turnsRecorded`).
      aggregate: true,
      unknown: (l) => !l.turnsRecorded,
    },
    {
      key: 'colDefenses',
      full: 'colDefensesFull',
      value: (l) => l.defenses,
      aggregate: true,
      unknown: (l) => !l.defensesRecorded,
    },
  ],
};

export function playerStatColumns(view: PlayerStatView): PlayerStatColumn[] {
  return COLUMNS[view];
}

/** `+4` / `-1` / `0` — a plus-minus of zero is not "+0". */
export function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/**
 * A cell's text. The aggregate stands for nobody, so a per-player figure it cannot
 * have is a dash rather than a zero — a zero there would read as a fact about
 * someone, and the row is precisely the one that knows nothing about anyone. The
 * same dash covers a figure the game was never asked for (`unknown`), which is the
 * other way a zero would claim something nobody recorded.
 */
export function statCellText(column: PlayerStatColumn, line: PlayerStatLine): string {
  if (line.unassigned && !column.aggregate) return '—';
  if (column.unknown?.(line)) return '—';
  const value = column.value(line);
  return column.signed ? formatSigned(value) : String(value);
}
