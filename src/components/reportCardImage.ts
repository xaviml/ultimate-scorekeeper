/**
 * Paints the shareable report card onto a canvas and hands back a PNG blob.
 *
 * This is drawn by hand rather than rasterised from the DOM on purpose. The app
 * ships no runtime dependencies and works offline off a service worker, and every
 * DOM-to-image library has to re-fetch the cross-origin Google Fonts stylesheet
 * and inline it as data URIs — the exact thing that fails on a pitch with no
 * signal, silently, in the fallback font. Canvas `fillText` uses the faces the
 * page already loaded, so the card looks the same online and off.
 *
 * Everything here is presentation. What the card *says* is decided by
 * `reportCardModel` in `state/reportCard.ts`, which is where changes to the
 * content belong.
 */
import type { PointRowModel, TimelineLine, TrackSegment } from '../state/pointStory';
import type { CardPointsModel, ReportCardModel } from '../state/reportCard';
import { TRACK_HEIGHT, TRACK_STROKE, layoutTrack } from './possessionTrack';
import { contrastText } from './ui';

/** Bitmap scale — the card is laid out in these logical units and rendered at 2x for a crisp share. */
const SCALE = 2;
const WIDTH = 560;
const PAD = 28;
const GAP = 14;
const PANEL_PAD = 20;
const RADIUS = 16;

const META_LINE_H = 21;
const SCORE_BOX_W = 130;
const SCORE_BOX_H = 78;
const TEAM_NAME_H = 26;
const TABLE_HEAD_H = 26;
const ROW_H = 30;
/** A team-stat figure row: holds, breaks, turnovers, passes, timeouts. */
const STAT_ROW_H = 36;
/** The small row qualifying the figure above it — "Clean", "Per possession". */
const STAT_SUB_H = 20;
/** Space between a figure and the percentage on its outer side. */
const PCT_GAP = 8;
const SECTION_TITLE_H = 20;

// The player table. Numeric columns are measured rather than evenly spaced — the
// headings run from "O" to "Break ch." and an even split would either ellipsise the
// long ones or spend the card's width on the short ones — and the card grows *wider*
// rather than dropping one.
const PLAYER_GROUP_H = 19;
/** Breathing room to the left of a right-aligned numeric column: its whole gutter. */
const NUM_GUTTER = 15;
/**
 * The name column's bounds. It asks for whatever the longest name needs and the card
 * widens to give it — up to a point, past which one three-barrelled name would drag
 * the whole card out of shape and an ellipsis is the lesser evil.
 */
const NAME_MIN = 150;
const NAME_MAX = 280;

// Point by point. Nothing here widens the card: the heading and the strip are laid
// out to fit, and every other line wraps rather than ellipsising — the image is the
// one place a point is read in full, so no part of its story may be cut off.
/** The column the point number sits in; everything else in a row starts after it. */
const POINT_INDENT = 40;
const POINT_PAD = 9;
const POINT_HEAD_H = 26;
const SUMMARY_LINE_H = 18;
const TIMELINE_LINE_H = 18;
/** The timeline's clock column, between the indent and the colour dot. */
const TIMELINE_CLOCK_W = 42;
const MARKER_H = 26;
const LINES_HEAD_H = 20;
const LINES_ROW_H = 26;

/** The Tailwind palette, duplicated because a canvas can't read a utility class. Keep in step with tailwind.config.js. */
const C = {
  pitch: '#101418',
  panel: '#1a2129',
  line: '#2c3641',
  lineSoft: 'rgba(44, 54, 65, 0.75)',
  chalk: '#e8edf2',
  chalkMid: 'rgba(232, 237, 242, 0.75)',
  chalkDim: 'rgba(232, 237, 242, 0.5)',
  signal: '#ffd447',
};

const board = (size: number, weight = 600) =>
  `${weight} ${size}px "Chakra Petch", system-ui, sans-serif`;
const clock = (size: number, weight = 600) =>
  `${weight} ${size}px "Rajdhani", ui-monospace, monospace`;

type Ctx = CanvasRenderingContext2D;

/** `ctx.roundRect` is recent enough that older mobile Safari misses it; arcTo is everywhere. */
function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Team names and player labels are free text — an over-long one is ellipsised rather than allowed to collide. */
function fitText(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/** Greedy packing so a longer language just takes another line instead of overflowing the card. */
function packSegments(ctx: Ctx, segments: string[], maxWidth: number): string[] {
  const SEP = '  ·  ';
  const lines: string[] = [];
  let current = '';
  for (const segment of segments) {
    const candidate = current ? `${current}${SEP}${segment}` : segment;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = segment;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Word-wraps one string into lines no wider than `maxWidth`. A single word too long
 * for a line on its own (a very long name) is ellipsised rather than overflowing.
 */
function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.map((line) => fitText(ctx, line, maxWidth));
}

/** `letterSpacing` is only in newer browsers, and the title reads fine without it. */
function withTracking(ctx: Ctx, value: string) {
  (ctx as unknown as { letterSpacing?: string }).letterSpacing = value;
}

function panelBox(ctx: Ctx, x: number, y: number, w: number, h: number) {
  roundRect(ctx, x, y, w, h, RADIUS);
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function separator(ctx: Ctx, left: number, right: number, y: number) {
  ctx.strokeStyle = C.lineSoft;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, y + 0.5);
  ctx.lineTo(right, y + 0.5);
  ctx.stroke();
}

interface PointLayout {
  row: PointRowModel;
  summary: string[];
  timeline: { line: TimelineLine; texts: string[] }[];
  height: number;
}

interface PointsLayout {
  rows: ({ kind: 'marker'; height: number } | PointLayout)[];
  linesH: number;
  height: number;
}

const summaryFont = () => board(12, 500);
const timelineFont = (goal?: boolean) => board(12, goal ? 600 : 500);

/**
 * Wraps every line of "Point by point" against the panel's width and adds up the
 * height, so the canvas can be sized once before anything is painted. `drawPoints`
 * paints from the same layout, which is what keeps the two passes from disagreeing.
 */
function layoutPoints(ctx: Ctx, model: CardPointsModel, innerWidth: number): PointsLayout {
  const textLeft = POINT_INDENT + TIMELINE_CLOCK_W + 14;
  const rows: PointsLayout['rows'] = model.rows.map((row) => {
    if (row.kind === 'marker') return { kind: 'marker' as const, height: MARKER_H };
    ctx.font = summaryFont();
    const summary = row.summary.length
      ? packSegments(ctx, row.summary, innerWidth - POINT_INDENT)
      : [];
    const timeline = row.timeline.map((line) => {
      ctx.font = timelineFont(line.goal);
      return { line, texts: wrapText(ctx, line.text, innerWidth - textLeft) };
    });
    const height =
      POINT_PAD * 2 +
      POINT_HEAD_H +
      (row.track ? TRACK_HEIGHT + 6 : 0) +
      summary.length * SUMMARY_LINE_H +
      (timeline.length ? 6 : 0) +
      timeline.reduce((h, t) => h + t.texts.length * TIMELINE_LINE_H, 0);
    return { row, summary, timeline, height };
  });
  const linesH = model.lines ? LINES_HEAD_H + model.lines.rows.length * LINES_ROW_H + 12 : 0;
  const height = linesH + rows.reduce((h, r) => h + r.height, 0);
  return { rows, linesH, height };
}

/** A small capitalised tag in a rounded box — Hold, Break, Not finished. Returns its width. */
function drawTag(ctx: Ctx, text: string, x: number, midY: number, ink: string, dashed: boolean) {
  ctx.font = board(10, 700);
  withTracking(ctx, '1px');
  const label = text.toUpperCase();
  const w = ctx.measureText(label).width + 12;
  roundRect(ctx, x + 0.5, midY - 8.5, w, 17, 4);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  if (dashed) ctx.setLineDash([3, 2]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 6.5, midY + 0.5);
  withTracking(ctx, '0px');
  return w;
}

/** One point's possession track, painted from `layoutTrack` exactly as the screen's SVG draws it. */
function drawTrack(
  ctx: Ctx,
  segments: TrackSegment[],
  model: CardPointsModel,
  left: number,
  top: number,
  width: number,
) {
  const { mid, pieces } = layoutTrack(segments, width, model.trackScaleSeconds);
  const y = (v: number) => top + v;
  const x = (v: number) => left + v;
  for (const p of pieces) {
    const color = model.colors[p.team];
    if (p.dashed) {
      roundRect(
        ctx,
        x(p.x0) + 0.75,
        y(mid - TRACK_STROKE / 2) + 0.75,
        Math.max(0, p.x1 - p.x0 - 1.5),
        TRACK_STROKE - 1.5,
        1.5,
      );
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      roundRect(ctx, x(p.x0), y(mid - TRACK_STROKE / 2), p.x1 - p.x0, TRACK_STROKE, 1.5);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.font = clock(11, 600);
    ctx.fillStyle = C.chalkDim;
    ctx.textAlign = 'center';
    if (p.time) ctx.fillText(p.time.text, x(p.time.x), y(p.time.y) + 0.5);
    if (p.passLabel) ctx.fillText(p.passLabel.text, x(p.passLabel.x), y(p.passLabel.y) + 0.5);
  }
  const last = pieces[pieces.length - 1];
  if (last?.state === 'goal') {
    ctx.beginPath();
    ctx.arc(x(last.x1), y(mid), 4.5, 0, Math.PI * 2);
    ctx.fillStyle = C.chalk;
    ctx.fill();
    ctx.strokeStyle = model.colors[last.team];
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawPoints(
  ctx: Ctx,
  model: CardPointsModel,
  layout: PointsLayout,
  left: number,
  right: number,
  top: number,
) {
  let y = top;
  const colorOf = (team: 'A' | 'B') => model.colors[team];

  // Results by line: name on the left, the two fractions right-aligned.
  if (model.lines) {
    const oX = right - 110;
    ctx.font = board(11, 600);
    ctx.fillStyle = C.chalkDim;
    withTracking(ctx, '1px');
    ctx.textAlign = 'left';
    ctx.fillText(model.lines.header[0].toUpperCase(), left, y + LINES_HEAD_H / 2);
    ctx.textAlign = 'right';
    ctx.fillText(model.lines.header[1].toUpperCase(), oX, y + LINES_HEAD_H / 2);
    ctx.fillText(model.lines.header[2].toUpperCase(), right, y + LINES_HEAD_H / 2);
    withTracking(ctx, '0px');
    let rY = y + LINES_HEAD_H;
    for (const r of model.lines.rows) {
      separator(ctx, left, right, rY);
      const midY = rY + LINES_ROW_H / 2;
      ctx.textAlign = 'left';
      ctx.font = board(14, 500);
      ctx.fillStyle = C.chalk;
      ctx.fillText(fitText(ctx, r.name, oX - left - 90), left, midY);
      ctx.textAlign = 'right';
      ctx.font = clock(16, 600);
      ctx.fillText(r.o, oX, midY);
      ctx.fillText(r.d, right, midY);
      rY += LINES_ROW_H;
    }
    y += layout.linesH;
  }

  layout.rows.forEach((item, i) => {
    const row = model.rows[i];
    if (i > 0 || model.lines) separator(ctx, left, right, y);
    if (row.kind === 'marker') {
      const midY = y + MARKER_H / 2;
      ctx.font = clock(13, 600);
      ctx.fillStyle = C.chalkDim;
      ctx.textAlign = 'right';
      ctx.fillText(row.clock, left + POINT_INDENT - 8, midY);
      ctx.font = board(12, 600);
      ctx.fillStyle = C.chalkMid;
      ctx.textAlign = 'left';
      withTracking(ctx, '1px');
      ctx.fillText(
        fitText(ctx, row.text.toUpperCase(), right - left - POINT_INDENT),
        left + POINT_INDENT,
        midY,
      );
      withTracking(ctx, '0px');
      y += MARKER_H;
      return;
    }
    const point = item as PointLayout;
    const x0 = left + POINT_INDENT;
    let pY = y + POINT_PAD;

    // Heading: number, scorer's dot and the score, the outcome tag, the time on the right.
    const headY = pY + POINT_HEAD_H / 2;
    ctx.font = clock(14, 600);
    ctx.fillStyle = C.chalkDim;
    ctx.textAlign = 'right';
    ctx.fillText(row.number, x0 - 10, headY);
    let hx = x0;
    if (row.scoredBy) {
      ctx.beginPath();
      ctx.arc(hx + 5, headY, 5, 0, Math.PI * 2);
      ctx.fillStyle = colorOf(row.scoredBy);
      ctx.fill();
      hx += 16;
    }
    if (row.score) {
      ctx.font = clock(20, 600);
      ctx.fillStyle = C.chalk;
      ctx.textAlign = 'left';
      ctx.fillText(row.score, hx, headY + 1);
      hx += ctx.measureText(row.score).width + 10;
    }
    const unfinished = row.scoredBy === null;
    drawTag(
      ctx,
      row.outcome,
      hx,
      headY,
      unfinished ? C.chalkDim : row.isBreak ? C.signal : C.chalkMid,
      unfinished,
    );
    ctx.textAlign = 'right';
    ctx.font = clock(16, 600);
    ctx.fillStyle = C.chalk;
    ctx.fillText(row.duration, right, headY + 1);
    if (row.inPlay) {
      const durW = ctx.measureText(row.duration).width;
      ctx.font = board(11, 500);
      ctx.fillStyle = C.chalkDim;
      ctx.fillText(row.inPlay, right - durW - 10, headY + 1);
    }
    pY += POINT_HEAD_H;

    // The possession track — the same layout the screen draws (possessionTrack.ts), on the same scale.
    if (row.track) {
      drawTrack(ctx, row.track, model, x0, pY, right - x0);
      pY += TRACK_HEIGHT + 6;
    }

    ctx.textAlign = 'left';
    ctx.font = summaryFont();
    ctx.fillStyle = C.chalkDim;
    for (const line of point.summary) {
      ctx.fillText(line, x0, pY + SUMMARY_LINE_H / 2);
      pY += SUMMARY_LINE_H;
    }

    // The timeline, every line of it: clock, the team's dot, the text wrapped beneath itself.
    if (point.timeline.length) pY += 6;
    const dotX = x0 + TIMELINE_CLOCK_W + 4;
    const textX = x0 + TIMELINE_CLOCK_W + 14;
    for (const { line, texts } of point.timeline) {
      const firstMid = pY + TIMELINE_LINE_H / 2;
      if (line.clock) {
        ctx.font = clock(13, 600);
        ctx.fillStyle = C.chalkDim;
        ctx.textAlign = 'left';
        ctx.fillText(line.clock, x0, firstMid);
      }
      if (line.team) {
        ctx.beginPath();
        ctx.arc(dotX, firstMid, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = colorOf(line.team);
        ctx.fill();
      }
      ctx.font = timelineFont(line.goal);
      ctx.fillStyle = line.goal ? C.chalk : C.chalkMid;
      ctx.textAlign = 'left';
      for (const text of texts) {
        ctx.fillText(text, textX, pY + TIMELINE_LINE_H / 2);
        pY += TIMELINE_LINE_H;
      }
    }
    y += point.height;
  });
}

/**
 * Renders the card and returns the canvas, or null when there is no 2D context
 * to draw on (jsdom under test, and any browser that refuses one).
 *
 * Height is not known until the meta line has been packed and the tables counted,
 * so the canvas is measured with a throwaway context first and sized once — a
 * resize would wipe everything already drawn.
 */
export function drawReportCard(model: ReportCardModel): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  const measuring = canvas.getContext('2d');
  if (!measuring) return null;

  // Each numeric column is as wide as the widest thing in it — its heading or one of
  // its cells — plus a gutter, so a nine-column card and a three-column one are both
  // laid out by the same rule and neither has to guess at an offset.
  const hasPlayers = model.playerRows.length > 0;
  const numericCount = model.playerHeader.length - 1;
  const colWidths = model.playerHeader.slice(1).map((head, i) => {
    measuring.font = board(12, 600);
    let w = measuring.measureText(head).width;
    measuring.font = clock(17, 600);
    for (const row of model.playerRows) {
      w = Math.max(w, measuring.measureText(row.values[i] ?? '').width);
    }
    return Math.ceil(w) + NUM_GUTTER;
  });
  const numericSpan = colWidths.reduce((total, w) => total + w, 0);
  measuring.font = board(15, 500);
  const nameNeed = model.playerRows.reduce(
    (w, row) => Math.max(w, measuring.measureText(row.label).width + (row.color ? 18 : 0)),
    0,
  );
  const nameW = Math.min(NAME_MAX, Math.max(NAME_MIN, Math.ceil(nameNeed) + 8));
  const playersNeedW = hasPlayers ? nameW + numericSpan + (PAD + PANEL_PAD) * 2 : 0;

  const width = Math.max(WIDTH, playersNeedW);

  const contentWidth = width - PAD * 2;
  const panelWidth = contentWidth;
  const innerWidth = panelWidth - PANEL_PAD * 2;

  measuring.font = board(14, 500);
  const metaLines = packSegments(measuring, model.meta, contentWidth);

  const headerH = metaLines.length * META_LINE_H;
  const scoreH = PANEL_PAD * 2 + SCORE_BOX_H + TEAM_NAME_H;
  // No header row: the team names are on the score boxes directly above.
  const statsH =
    PANEL_PAD * 2 + model.statRows.reduce((h, r) => h + (r.sub ? STAT_SUB_H : STAT_ROW_H), 0);
  const groupH = model.playerGroups ? PLAYER_GROUP_H : 0;
  const playersH = hasPlayers
    ? PANEL_PAD * 2 + SECTION_TITLE_H + 10 + groupH + TABLE_HEAD_H + model.playerRows.length * ROW_H
    : 0;

  const points = model.points ? layoutPoints(measuring, model.points, innerWidth) : null;
  const pointsH = points ? PANEL_PAD * 2 + SECTION_TITLE_H + 10 + points.height : 0;

  const height =
    PAD +
    headerH +
    GAP +
    scoreH +
    GAP +
    statsH +
    (hasPlayers ? GAP + playersH : 0) +
    (points ? GAP + pointsH : 0) +
    PAD;

  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = C.pitch;
  ctx.fillRect(0, 0, width, height);

  let y = PAD;

  // Header — the meta line only. See ReportCardModel.meta for why there is no
  // heading over it.
  ctx.textAlign = 'left';
  ctx.font = board(14, 500);
  ctx.fillStyle = C.chalkDim;
  for (const line of metaLines) {
    ctx.fillText(line, PAD, y + META_LINE_H / 2);
    y += META_LINE_H;
  }
  y += GAP;

  // Final score. Each team owns half the panel — the boxes could sit closer
  // together, but the names underneath are what needs the room, and a club name
  // ellipsised down to two words is the one thing on the card nobody can infer.
  panelBox(ctx, PAD, y, panelWidth, scoreH);
  const scoreLeft = PAD + PANEL_PAD;
  const boxTop = y + PANEL_PAD;
  ctx.textAlign = 'center';
  model.teams.forEach((team, i) => {
    const column = scoreLeft + innerWidth * (i === 0 ? 0.25 : 0.75);
    const boxLeft = column - SCORE_BOX_W / 2;
    roundRect(ctx, boxLeft, boxTop, SCORE_BOX_W, SCORE_BOX_H, 10);
    ctx.fillStyle = team.color;
    ctx.fill();

    ctx.fillStyle = contrastText(team.color);
    ctx.font = clock(56, 600);
    ctx.fillText(team.score, column, boxTop + SCORE_BOX_H / 2 + 2);

    ctx.fillStyle = C.chalk;
    ctx.font = board(17, 600);
    ctx.fillText(
      fitText(ctx, team.name, innerWidth / 2 - 16),
      column,
      boxTop + SCORE_BOX_H + TEAM_NAME_H / 2 + 1,
    );
  });
  ctx.fillStyle = C.chalkDim;
  ctx.font = clock(30, 500);
  ctx.fillText('—', PAD + panelWidth / 2, boxTop + SCORE_BOX_H / 2);
  y += scoreH + GAP;

  // Team stats
  panelBox(ctx, PAD, y, panelWidth, statsH);
  const left = PAD + PANEL_PAD;
  const right = left + innerWidth;
  const centre = left + innerWidth / 2;
  const colA = left + 112;
  const colB = right - 112;

  let rowY = y + PANEL_PAD;

  // Each figure big against the inner column edge, its percentage small on the
  // outer side and the label in capitals between them; a small row qualifying it
  // follows with no rule in between, so the two read as one entry.
  for (const row of model.statRows) {
    if (row.sub) {
      const midY = rowY + STAT_SUB_H / 2 - 3;
      ctx.font = clock(14, 500);
      ctx.fillStyle = C.chalkMid;
      ctx.textAlign = 'right';
      ctx.fillText(row.a, colA, midY);
      ctx.textAlign = 'left';
      ctx.fillText(row.b, colB, midY);
      ctx.font = board(10, 600);
      ctx.fillStyle = C.chalkDim;
      ctx.textAlign = 'center';
      withTracking(ctx, '1px');
      ctx.fillText(fitText(ctx, row.label.toUpperCase(), colB - colA - 16), centre, midY);
      withTracking(ctx, '0px');
      rowY += STAT_SUB_H;
      continue;
    }
    if (row !== model.statRows[0]) separator(ctx, left, right, rowY);
    const midY = rowY + STAT_ROW_H / 2;
    ctx.font = clock(21, 600);
    ctx.fillStyle = C.chalk;
    ctx.textAlign = 'right';
    ctx.fillText(row.a, colA, midY);
    const aW = ctx.measureText(row.a).width;
    ctx.textAlign = 'left';
    ctx.fillText(row.b, colB, midY);
    const bW = ctx.measureText(row.b).width;
    ctx.font = clock(14, 500);
    ctx.fillStyle = C.chalkDim;
    if (row.aPct) {
      ctx.textAlign = 'right';
      ctx.fillText(row.aPct, colA - aW - PCT_GAP, midY + 1);
    }
    if (row.bPct) {
      ctx.textAlign = 'left';
      ctx.fillText(row.bPct, colB + bW + PCT_GAP, midY + 1);
    }
    ctx.font = board(13, 600);
    ctx.fillStyle = C.chalk;
    ctx.textAlign = 'center';
    withTracking(ctx, '1px');
    ctx.fillText(fitText(ctx, row.label.toUpperCase(), colB - colA - 16), centre, midY);
    withTracking(ctx, '0px');
    rowY += STAT_ROW_H;
  }
  y += statsH + GAP;

  // Player stats
  if (hasPlayers) {
    panelBox(ctx, PAD, y, panelWidth, playersH);
    let pY = y + PANEL_PAD;

    ctx.textAlign = 'left';
    ctx.fillStyle = C.signal;
    ctx.font = board(13, 700);
    withTracking(ctx, '1.5px');
    ctx.fillText(model.playerTitle.toUpperCase(), left, pY + SECTION_TITLE_H / 2);
    withTracking(ctx, '0px');
    pY += SECTION_TITLE_H + 10;

    // Each column's text sits on its own right edge, walked in from the panel's, so
    // the widths measured above are what places them and the name column takes
    // whatever is left over (never less than NAME_MIN — the card was widened for it).
    const columnR: number[] = [];
    let edge = right;
    for (let i = numericCount - 1; i >= 0; i--) {
      columnR[i] = edge;
      edge -= colWidths[i];
    }
    const numericLeft = right - numericSpan;
    const nameMax = numericLeft - left - 8;

    // Group rules run the full height of the table, the first of them separating the
    // names from the numbers. Drawn before the text so the row separators cross them
    // like a grid rather than sitting on top.
    if (model.playerGroups) {
      const tableBottom = pY + groupH + TABLE_HEAD_H + model.playerRows.length * ROW_H;
      ctx.strokeStyle = C.lineSoft;
      ctx.lineWidth = 1;
      let column = 0;
      for (const group of model.playerGroups) {
        const x = Math.round(columnR[column] - colWidths[column]) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, pY);
        ctx.lineTo(x, tableBottom);
        ctx.stroke();
        column += group.span;
      }

      // The group name is centred over its own columns, in the dim small-caps the
      // section titles use one size up — a label, not a heading competing with
      // "PLAYER STATS" above it.
      ctx.font = board(11, 700);
      ctx.fillStyle = C.chalkDim;
      ctx.textAlign = 'center';
      withTracking(ctx, '1px');
      column = 0;
      for (const group of model.playerGroups) {
        const from = columnR[column] - colWidths[column];
        const to = columnR[column + group.span - 1];
        ctx.fillText(
          fitText(ctx, group.label.toUpperCase(), to - from - 8),
          (from + to) / 2,
          pY + PLAYER_GROUP_H / 2,
        );
        column += group.span;
      }
      withTracking(ctx, '0px');
      pY += PLAYER_GROUP_H;
    }

    ctx.textAlign = 'left';
    ctx.font = board(12, 600);
    ctx.fillStyle = C.chalkDim;
    ctx.fillText(fitText(ctx, model.playerHeader[0], nameMax), left, pY + TABLE_HEAD_H / 2);
    ctx.textAlign = 'right';
    model.playerHeader.slice(1).forEach((head, i) => {
      ctx.fillText(fitText(ctx, head, colWidths[i] - 4), columnR[i], pY + TABLE_HEAD_H / 2);
    });
    pY += TABLE_HEAD_H;

    for (const player of model.playerRows) {
      separator(ctx, left, right, pY);
      const midY = pY + ROW_H / 2;
      let nameX = left;
      if (player.color) {
        ctx.beginPath();
        ctx.arc(left + 5, midY, 5, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
        nameX = left + 18;
      }
      ctx.textAlign = 'left';
      ctx.font = board(15, 500);
      // The aggregate row names nobody, so it is dimmed throughout — including its
      // headline figure, which otherwise reads in `signal` like a player's tally.
      const ink = player.unassigned ? C.chalkDim : C.chalk;
      ctx.fillStyle = ink;
      ctx.fillText(fitText(ctx, player.label, nameMax - (nameX - left)), nameX, midY);

      ctx.textAlign = 'right';
      ctx.font = clock(17, 600);
      player.values.forEach((value, i) => {
        ctx.fillStyle = i === model.playerAccent && !player.unassigned ? C.signal : ink;
        ctx.fillText(value, columnR[i], midY);
      });
      pY += ROW_H;
    }
    y += playersH + GAP;
  }

  // Point by point, every point opened — the screen folds them, a picture cannot.
  if (points && model.points) {
    panelBox(ctx, PAD, y, panelWidth, pointsH);
    let pY = y + PANEL_PAD;
    ctx.textAlign = 'left';
    ctx.fillStyle = C.signal;
    ctx.font = board(13, 700);
    withTracking(ctx, '1.5px');
    ctx.fillText(model.points.title.toUpperCase(), left, pY + SECTION_TITLE_H / 2);
    withTracking(ctx, '0px');
    pY += SECTION_TITLE_H + 10;
    drawPoints(ctx, model.points, points, left, right, pY);
  }

  return canvas;
}

/**
 * Waits for the two web fonts before drawing — canvas silently falls back to a
 * system font if it paints before they land, and unlike the DOM it never
 * re-renders once they arrive.
 */
async function fontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  try {
    await Promise.all([fonts.load(board(17, 600), 'A'), fonts.load(clock(56, 600), '0')]);
    await fonts.ready;
  } catch {
    // A missing face is a cosmetic problem, not a reason to withhold the card.
  }
}

export async function renderReportCard(model: ReportCardModel): Promise<Blob | null> {
  await fontsReady();
  const canvas = drawReportCard(model);
  if (!canvas || typeof canvas.toBlob !== 'function') return null;
  return new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } catch {
      resolve(null);
    }
  });
}
