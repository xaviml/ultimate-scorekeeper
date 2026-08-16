import { useEffect, useRef } from 'react';
import { possessionTopShare } from '../state/stats';
import type { PointRecord, TeamId } from '../state/types';

/** Column geometry — shared with the score-label maths below. */
const COL_W = 16;
/** The aligned score bands near the top and bottom edges of the strip. */
const LABEL_H = 10;
/**
 * The thin outermost row on each side, holding the subtle amber offence dot:
 * a point whose score and dot sit on opposite sides was a break, readable
 * without decoding bar heights.
 */
const DOT_ZONE = 4;

/**
 * The possession ledger: one column per point on a centre line, the top team's
 * share of tracked possession above it and the other team's below, the scorer
 * filled and the loser hollow. A full half means 100% of the point's possession,
 * so the two halves of a column always total the same height and a column reads
 * as a ratio, never a duration.
 *
 * Each finished column carries the scoring team's running score, outside the
 * bars in a fixed band — along the top edge when the top team scored, along the
 * bottom edge otherwise — so the numbers line up as two readable scorelines and
 * never fight a bar for contrast (they are all the same neutral ink). Outside
 * even that, a very small amber dot marks the side that started the point on
 * offence: score and dot on opposite sides is a break, at a glance.
 *
 * The strip scrolls horizontally on its own (scrollbar hidden): columns keep
 * their full width however long the game runs, and the slot simply starts
 * scrolled to the point in progress (`scrollToEnd`).
 *
 * Purely decorative to a screen reader (the caller provides the text summary),
 * hence aria-hidden here rather than at every call site.
 */
export function PossessionLedger({
  points,
  current = null,
  currentOffense = null,
  topTeam,
  colors,
  chartHeight = 56,
  scrollToEnd = false,
}: {
  points: PointRecord[];
  /** Live counters of the point in progress (the dashed column), or null once the game is over. */
  current?: Record<TeamId, number> | null;
  /** Who received the pull of the point in progress, so its column carries the offence dot too. */
  currentOffense?: TeamId | null;
  /** Team drawn above the line — the same team the left score panel shows. */
  topTeam: TeamId;
  colors: Record<TeamId, string>;
  /** Total strip height in px: dot row, score band, bars, centre line, bars, score band, dot row. */
  chartHeight?: number;
  /** Keep the newest column in view — the slot passes true, the report reads left to right. */
  scrollToEnd?: boolean;
}) {
  const bottomTeam: TeamId = topTeam === 'A' ? 'B' : 'A';
  const lineY = Math.floor(chartHeight / 2);
  /** Bars stop short of the score bands and dot rows, so no row ever collides with a bar. */
  const half = lineY - LABEL_H - DOT_ZONE - 1;
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (scrollToEnd && el) el.scrollLeft = el.scrollWidth;
  }, [scrollToEnd, points.length]);

  const scores: Record<TeamId, number> = { A: 0, B: 0 };
  const columns: {
    topShare: number | null;
    scoredBy?: TeamId;
    offense?: TeamId;
    score: string;
  }[] = points.map((p) => {
    scores[p.scoredBy] += 1;
    return {
      // Never null for a tracked point — a goal tapped in before a second
      // accrued falls back to possession counting (see possessionTopShare),
      // so the column still gets its bar instead of reading as a bug.
      topShare: possessionTopShare(p, topTeam),
      scoredBy: p.scoredBy,
      offense: p.offense,
      score: String(scores[p.scoredBy]),
    };
  });
  if (current) {
    const total = current.A + current.B;
    columns.push({
      topShare: total > 0 ? current[topTeam] / total : null,
      offense: currentOffense ?? undefined,
      score: '',
    });
  }

  return (
    <div
      ref={scroller}
      data-ledger=""
      aria-hidden="true"
      className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div
        className="relative flex items-stretch gap-[5px] w-max min-w-full"
        style={{ height: chartHeight }}
      >
        <div className="absolute inset-x-0 bg-line" style={{ top: lineY, height: 1 }} />
        {columns.map((c, i) => {
          const inProgress = c.scoredBy === undefined;
          // A legacy point renders flat (only its score); the point in progress
          // shows two small dashed stubs until anything has accrued, so the
          // column exists from the pull rather than appearing mid-point.
          const flat = !inProgress && c.topShare === null;
          const stub = inProgress && c.topShare === null;
          const topShare = stub ? 0.35 : (c.topShare ?? 0);
          const bottomShare = stub ? 0.35 : c.topShare !== null ? 1 - c.topShare : 0;
          const heightFor = (share: number) =>
            share <= 0 ? 0 : Math.max(4, Math.round(share * half)); // nothing, not a 1px sliver
          const topH = flat ? 0 : heightFor(topShare);
          const bottomH = flat ? 0 : heightFor(bottomShare);
          const barStyle = (team: TeamId, h: number, top: boolean): React.CSSProperties => {
            const style: React.CSSProperties = { height: h };
            if (top) style.bottom = chartHeight - lineY;
            else style.top = lineY + 1;
            // Hairline outlines: a 2px border on a short hollow bar left no
            // interior at all, so a brief possession read as a filled box.
            if (inProgress) style.border = `1.5px dashed ${colors[team]}`;
            else if (c.scoredBy === team) style.backgroundColor = colors[team];
            else style.border = `1px solid ${colors[team]}`;
            return style;
          };

          return (
            <span key={i} className="relative shrink-0" style={{ width: COL_W }}>
              {topH > 0 && (
                <span
                  data-bar=""
                  className="absolute left-0 right-0 box-border rounded-t-[3px]"
                  style={barStyle(topTeam, topH, true)}
                />
              )}
              {bottomH > 0 && (
                <span
                  data-bar=""
                  className="absolute left-0 right-0 box-border rounded-b-[3px]"
                  style={barStyle(bottomTeam, bottomH, false)}
                />
              )}
              {c.scoredBy !== undefined && (
                <span
                  className="absolute left-0 right-0 text-center font-clock font-semibold text-[9px] leading-[10px] text-chalk/70"
                  style={c.scoredBy === topTeam ? { top: DOT_ZONE } : { bottom: DOT_ZONE }}
                >
                  {c.score}
                </span>
              )}
              {c.offense !== undefined && (
                <span
                  data-offense-dot=""
                  className="absolute left-0 right-0 flex justify-center"
                  style={c.offense === topTeam ? { top: 0 } : { bottom: 0 }}
                >
                  <span className="w-[3px] h-[3px] rounded-full bg-signal/60" />
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
