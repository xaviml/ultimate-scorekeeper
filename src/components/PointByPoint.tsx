import { useLayoutEffect, useRef, useState } from 'react';
import type { PointRowModel, PointsModel, TrackSegment } from '../state/pointStory';
import type { TeamId } from '../state/types';
import { ChevronRightIcon } from './icons';
import { TRACK_HEIGHT, TRACK_STROKE, layoutTrack } from './possessionTrack';

/**
 * The report's "Point by point": the line results, and one row per point with the
 * markers (kickoff, half-time, water breaks, the end) between them.
 *
 * Props-driven and stateless about the game — everything it says comes from
 * `pointsModel`, which the shared image and the copied text are built from too, so
 * the three cannot tell a point differently. The only state here is the reader's:
 * which points are open. A row is folded to its heading, track and summary, and a
 * tap opens its timeline; the image has no taps to offer,
 * which is why it paints every point opened instead.
 */
export function PointByPoint({
  model,
  teams,
}: {
  model: PointsModel;
  teams: Record<TeamId, { name: string; color: string }>;
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = (number: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });

  return (
    <div>
      {model.lines && (
        <table className="w-full text-sm mb-3" data-lines-table>
          <thead>
            <tr className="font-board text-[10px] uppercase tracking-wide text-chalk/50">
              <th className="text-left font-normal pb-1">{model.lines.header[0]}</th>
              <th className="text-right font-normal pb-1">{model.lines.header[1]}</th>
              <th className="text-right font-normal pb-1">{model.lines.header[2]}</th>
            </tr>
          </thead>
          <tbody>
            {model.lines.rows.map((r) => (
              <tr key={r.name} className="border-t border-line" data-line-result={r.name}>
                <td className="py-1 font-board">{r.name}</td>
                <td className="py-1 text-right font-clock text-base">{r.o}</td>
                <td className="py-1 text-right font-clock text-base">{r.d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ol data-points>
        {model.rows.map((row, i) =>
          row.kind === 'marker' ? (
            <li
              key={`m-${i}`}
              data-marker
              className="flex items-center gap-2 py-2 border-t border-line first:border-t-0 text-xs text-chalk/60"
            >
              <span className="font-clock w-10 shrink-0 text-right">{row.clock}</span>
              <span className="font-board uppercase tracking-wide">{row.text}</span>
            </li>
          ) : (
            <PointRow
              key={`p-${row.number}`}
              row={row}
              teams={teams}
              trackScale={model.trackScaleSeconds}
              open={open.has(row.number)}
              onToggle={() => toggle(row.number)}
            />
          ),
        )}
      </ol>
    </div>
  );
}

function PointRow({
  row,
  teams,
  trackScale,
  open,
  onToggle,
}: {
  row: PointRowModel;
  teams: Record<TeamId, { name: string; color: string }>;
  trackScale: number;
  open: boolean;
  onToggle: () => void;
}) {
  const unfinished = row.scoredBy === null;
  return (
    <li
      className="border-t border-line first:border-t-0"
      data-point-row={row.number}
      data-outcome={unfinished ? 'open' : row.isBreak ? 'break' : 'hold'}
    >
      <button
        type="button"
        className="w-full text-left py-2.5 flex flex-col gap-1.5"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="flex items-center gap-2 w-full">
          <span className="font-clock text-xs text-chalk/50 w-6 shrink-0 text-right">
            {row.number}
          </span>
          {row.scoredBy && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: teams[row.scoredBy].color }}
            />
          )}
          {row.score && (
            <span className="font-clock text-lg font-semibold leading-none">{row.score}</span>
          )}
          <span
            className={`font-board text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 border ${
              unfinished
                ? 'border-dashed border-chalk/40 text-chalk/60'
                : row.isBreak
                  ? 'border-signal/60 text-signal'
                  : 'border-line text-chalk/60'
            }`}
          >
            {row.outcome}
          </span>
          <span className="ml-auto text-right leading-tight">
            <span className="font-clock text-sm" data-duration>
              {row.duration}
            </span>
            {row.inPlay && <span className="block text-[10px] text-chalk/50">{row.inPlay}</span>}
          </span>
          <span
            className={`text-chalk/40 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
            aria-hidden="true"
          >
            <ChevronRightIcon size="w-4 h-4" />
          </span>
        </span>
        {row.track && <Track segments={row.track} teams={teams} scale={trackScale} />}
        {row.summary.length > 0 && (
          <span className="pl-8 text-xs text-chalk/60" data-summary>
            {row.summary.join(' · ')}
          </span>
        )}
      </button>
      {open && (
        <ol className="pl-8 pb-3 space-y-1" data-timeline>
          {row.timeline.map((line, i) => (
            <li
              key={i}
              className={`flex gap-2 text-xs leading-snug ${
                line.goal ? 'text-chalk font-semibold' : 'text-chalk/75'
              }`}
            >
              <span className="font-clock text-chalk/50 w-9 shrink-0">{line.clock}</span>
              <span
                className="w-2 h-2 rounded-full mt-[3px] shrink-0"
                style={line.team ? { backgroundColor: teams[line.team].color } : undefined}
              />
              <span className="min-w-0 break-words">{line.text}</span>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

/** The rendered width of an element, kept current as the layout changes. */
function useWidth(fallback: number) {
  const ref = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

/**
 * The point as a track — see `possessionTrack.ts` for the layout. Drawn at the row's
 * real width (measured, not stretched), so a segment keeps the same length per second
 * in every row. Purely a picture to a screen reader: the summary and the timeline say
 * all of it in words.
 */
function Track({
  segments,
  teams,
  scale,
}: {
  segments: TrackSegment[];
  teams: Record<TeamId, { name: string; color: string }>;
  scale: number;
}) {
  const { ref, width } = useWidth(260);
  const { mid, pieces } = layoutTrack(segments, width, scale);
  const last = pieces[pieces.length - 1];
  const label = (l: { text: string; x: number; y: number }) => (
    <text
      x={l.x}
      y={l.y}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-chalk/60 font-clock"
      fontSize={10}
    >
      {l.text}
    </text>
  );
  return (
    // Measured inside the indent: the outer span's width would include it.
    <span className="pl-8 block w-full" aria-hidden="true">
      <span ref={ref} className="block w-full">
        <svg
          width={width}
          height={TRACK_HEIGHT}
          viewBox={`0 0 ${width} ${TRACK_HEIGHT}`}
          className="block overflow-visible"
          data-track
        >
          {pieces.map((p, i) => (
            <g
              key={i}
              data-segment={p.state}
              data-team={p.team}
              data-seconds={p.seconds ?? ''}
              data-passes={p.passes ?? ''}
            >
              {p.dashed ? (
                <rect
                  x={p.x0 + 0.75}
                  y={mid - TRACK_STROKE / 2 + 0.75}
                  width={Math.max(0, p.x1 - p.x0 - 1.5)}
                  height={TRACK_STROKE - 1.5}
                  rx={1.5}
                  fill="none"
                  stroke={teams[p.team].color}
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
              ) : (
                <rect
                  x={p.x0}
                  y={mid - TRACK_STROKE / 2}
                  width={p.x1 - p.x0}
                  height={TRACK_STROKE}
                  rx={1.5}
                  fill={teams[p.team].color}
                />
              )}
              {p.time && label(p.time)}
              {p.passLabel && label(p.passLabel)}
            </g>
          ))}
          {last?.state === 'goal' && (
            <circle
              cx={last.x1}
              cy={mid}
              r={4.5}
              className="fill-chalk"
              stroke={teams[last.team].color}
              strokeWidth={2}
              data-disc
            />
          )}
        </svg>
      </span>
    </span>
  );
}
