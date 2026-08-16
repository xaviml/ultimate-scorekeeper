/**
 * The pace of the point in progress: a bar filling from the pull in the current
 * holder's colour, a 3px notch at each turnover in the colour of the team that
 * gave the disc away, and a dashed marker at the finished points' average
 * duration — the bar crossing it is what says "this point is dragging".
 *
 * Portrait-only by design — the stats slot hides itself entirely in landscape.
 *
 * Decorative to a screen reader — the caller provides the text summary.
 */
export function PointPace({
  caption,
  clock,
  avgLabel,
  fillPct,
  fillColor,
  avgPct,
  notches,
}: {
  caption: string;
  clock: string;
  /** "avg M:SS", or null with fewer than two finished points — no stub is shown. */
  avgLabel: string | null;
  fillPct: number;
  /** Current holder's colour, or null while nobody has the disc. */
  fillColor: string | null;
  /** Position of the average marker on the same scale, or null when hidden. */
  avgPct: number | null;
  notches: { pct: number; color: string }[];
}) {
  return (
    <div aria-hidden="true" className="w-full flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9px] uppercase tracking-[0.12em] text-chalk/45 truncate">
          {caption}
        </span>
        <span className="flex items-baseline gap-1.5 shrink-0">
          <span className="font-clock font-semibold text-lg leading-none">{clock}</span>
          {avgLabel && (
            <span className="text-[9px] uppercase tracking-[0.1em] text-chalk/40">{avgLabel}</span>
          )}
        </span>
      </div>
      <div className="relative h-3 rounded-md bg-pitch border border-line overflow-hidden">
        {fillColor && (
          <div
            className="absolute inset-y-0 left-0 opacity-90"
            style={{ width: `${fillPct}%`, backgroundColor: fillColor }}
          />
        )}
        {notches.map((n, i) => (
          <div
            key={i}
            className="absolute inset-y-0 w-[3px]"
            style={{
              left: `${n.pct}%`,
              backgroundColor: n.color,
              boxShadow: '0 0 0 1px rgba(16,20,24,.6)',
            }}
          />
        ))}
        {avgPct !== null && (
          <div
            className="absolute inset-y-0 w-0 border-l border-dashed border-chalk/50"
            style={{ left: `${avgPct}%` }}
          />
        )}
      </div>
    </div>
  );
}
