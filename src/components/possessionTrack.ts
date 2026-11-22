/**
 * The possession track's geometry — one point drawn as a straight line of segments,
 * one per possession, each in the colour of the team that had the disc and as long as
 * they held it in play, with its time above and its completed passes below. A gap
 * between two segments is a turnover; the disc at the end is the goal.
 *
 * Pure numbers, no drawing: the report screen renders it as SVG (`PointByPoint`) and
 * the shared image paints it on a canvas (`reportCardImage`), and both read their
 * coordinates from here so the two cannot draw a different track for the same point.
 */
import type { TrackSegment } from '../state/pointStory';
import type { TeamId } from '../state/types';

export const TRACK_HEIGHT = 34;
/** The line's centre, with a label row above (time) and one below (passes). */
const MID = 17;
const LABEL_OFFSET = 10;
export const TRACK_STROKE = 5;
/** A possession timed at a second or two still needs a visible segment. */
const MIN_SEGMENT = 12;
/** An untimed segment (dashed) gets a fixed length — there is nothing to size it by. */
const UNTIMED_SEGMENT = 22;
/** The space between two possessions: the turnover. */
const GAP = 4;
/** Room at the end for the disc. */
const END_PAD = 8;
/** A rough width per character of the 9px labels, for deciding whether one fits. */
const LABEL_CHAR_W = 5.2;

export interface TrackPiece {
  team: TeamId;
  x0: number;
  x1: number;
  dashed: boolean;
  state: TrackSegment['state'];
  seconds: number | null;
  passes: number | null;
  /** The time, centred above the segment, or null when it does not fit or is unknown. */
  time: { text: string; x: number; y: number } | null;
  /** The pass count, centred below, or null when none were completed or nobody counted. */
  passLabel: { text: string; x: number; y: number } | null;
}

export interface TrackLayout {
  mid: number;
  /** Where the line ends — the disc sits here for a goal. */
  end: number;
  pieces: TrackPiece[];
}

const fits = (text: string, width: number) => width >= text.length * LABEL_CHAR_W + 4;

/**
 * Lays one point out across `width`. `scaleSeconds` is the game-wide longest point, so
 * a segment's length means the same in every row; a point whose minimum and untimed
 * segments would push it past the width is squeezed to fit rather than cut off.
 */
export function layoutTrack(
  segments: TrackSegment[],
  width: number,
  scaleSeconds: number,
): TrackLayout {
  const gaps = GAP * Math.max(0, segments.length - 1);
  const usable = Math.max(1, width - END_PAD - gaps);
  const perSecond = usable / Math.max(1, scaleSeconds);
  const raw = segments.map((s) =>
    s.seconds === null ? UNTIMED_SEGMENT : Math.max(MIN_SEGMENT, s.seconds * perSecond),
  );
  const total = raw.reduce((a, b) => a + b, 0);
  const squeeze = total > usable ? usable / total : 1;

  let x = 0;
  const pieces = segments.map((s, i): TrackPiece => {
    const w = raw[i] * squeeze;
    const x0 = x;
    const x1 = x + w;
    x = x1 + (i < segments.length - 1 ? GAP : 0);
    const centre = (x0 + x1) / 2;
    return {
      team: s.team,
      x0,
      x1,
      dashed: s.state === 'open' || s.state === 'inferred' || s.seconds === null,
      state: s.state,
      seconds: s.seconds,
      passes: s.passes,
      time: s.time && fits(s.time, w) ? { text: s.time, x: centre, y: MID - LABEL_OFFSET } : null,
      passLabel:
        s.passText && fits(s.passText, w)
          ? { text: s.passText, x: centre, y: MID + LABEL_OFFSET }
          : null,
    };
  });
  const last = pieces[pieces.length - 1];
  return { mid: MID, end: last ? last.x1 : 0, pieces };
}
