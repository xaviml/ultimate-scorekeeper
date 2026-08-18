import { Fragment } from 'react';

/**
 * The compact team-figures grid the stats slot shows: a header row of 9px
 * uppercase labels, then one row per team led by a 6px colour swatch. The
 * column count follows `headers`, so the same component draws the four-column
 * tracked page and the two-column holds/breaks page of a game recording no
 * turnovers.
 *
 * Portrait-only by design — the stats slot hides itself entirely in landscape.
 *
 * Decorative to a screen reader — the caller provides the text summary.
 */
export function StatFiguresGrid({
  headers,
  rows,
}: {
  headers: string[];
  rows: { color: string; values: (string | number)[] }[];
}) {
  return (
    <div
      aria-hidden="true"
      className="w-full grid items-center gap-x-2"
      style={{ gridTemplateColumns: `14px repeat(${headers.length}, minmax(0, 1fr))` }}
    >
      <span />
      {headers.map((h) => (
        <span
          key={h}
          className="text-[9px] uppercase tracking-[0.09em] text-chalk/45 text-center leading-[9px] truncate"
        >
          {h}
        </span>
      ))}
      {rows.map((r, i) => (
        <Fragment key={i}>
          <span
            className="w-1.5 h-4 rounded-sm justify-self-start"
            style={{ backgroundColor: r.color }}
          />
          {r.values.map((v, j) => (
            <span
              key={j}
              className="font-clock font-semibold text-[19px] leading-[1.05] text-center"
            >
              {v}
            </span>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
