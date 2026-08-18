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
import type { ReportCardModel } from '../state/reportCard';
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
const SECTION_TITLE_H = 20;

// The player table. Numeric columns are measured rather than evenly spaced — the
// headings run from "O" to "Break ch." and an even split would either ellipsise the
// long ones or spend the card's width on the short ones — and, exactly like the
// ledger below, the card grows *wider* rather than dropping one.
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

// The game summary — the report's history panel, painted as three columns. It is
// denser than the stat tables (a full game is thirty-odd rows) and, like them,
// measured rather than evenly split: the clock and the event ask for what they
// need, capped, and the detail takes whatever is left and ellipsises into it.
const HISTORY_ROW_H = 23;
const HISTORY_CLOCK_GUTTER = 12;
const HISTORY_EVENT_GUTTER = 14;
const HISTORY_EVENT_MAX = 220;
/** What the detail column asks the card to widen *for*; past this it ellipsises instead. */
const HISTORY_DETAIL_MAX = 330;

// The possession ledger strip: column and gap match the on-screen chart, the
// score bands sit clear of the bars, and the whole card grows *wider* rather
// than dropping columns — a shared image is seen full or not at all.
const LEDGER_COL_W = 16;
const LEDGER_GAP = 5;
const LEDGER_LABEL_H = 14;
/** The outermost row on each side: the subtle amber dot marking the side that started on offence. */
const LEDGER_DOT_H = 6;
const LEDGER_HALF = 34;
const LEDGER_CHART_H = (LEDGER_DOT_H + LEDGER_LABEL_H + LEDGER_HALF) * 2 + 1;

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

/**
 * A rect rounded on one end only — the ledger's bars are square against the
 * centre line, exactly like the on-screen chart's rounded-t/rounded-b pair.
 */
function halfRoundRect(ctx: Ctx, x: number, y: number, w: number, h: number, roundTop: boolean) {
  const r = Math.min(3, h / 2);
  ctx.beginPath();
  if (roundTop) {
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h);
  } else {
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}

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

  // The ledger never drops a point: a long game widens the whole card instead.
  const ledgerCount = model.ledger?.columns.length ?? 0;
  const ledgerNeedW = ledgerCount
    ? ledgerCount * LEDGER_COL_W + (ledgerCount - 1) * LEDGER_GAP + (PAD + PANEL_PAD) * 2
    : 0;

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

  // The summary's three columns. The clock is uniform, the event is bounded by
  // the longest event name a language has, and the detail is what would otherwise
  // run away — so only the first two are allowed to widen the card without limit.
  const history = model.history;
  const measureMax = (values: string[]) =>
    values.reduce((w, v) => Math.max(w, measuring.measureText(v).width), 0);
  let historyClockW = 0;
  let historyEventW = 0;
  let historyNeedW = 0;
  if (history) {
    measuring.font = clock(14, 600);
    historyClockW = Math.ceil(measureMax(history.rows.map((r) => r.clock))) + HISTORY_CLOCK_GUTTER;
    measuring.font = board(14, 500);
    historyEventW = Math.min(
      HISTORY_EVENT_MAX,
      Math.ceil(measureMax(history.rows.map((r) => r.event))) + HISTORY_EVENT_GUTTER,
    );
    measuring.font = board(13, 500);
    const detailW = Math.min(
      HISTORY_DETAIL_MAX,
      Math.ceil(measureMax(history.rows.map((r) => r.detail))),
    );
    historyNeedW = historyClockW + historyEventW + detailW + (PAD + PANEL_PAD) * 2;
  }

  const width = Math.max(WIDTH, ledgerNeedW, playersNeedW, historyNeedW);

  const contentWidth = width - PAD * 2;
  const panelWidth = contentWidth;
  const innerWidth = panelWidth - PANEL_PAD * 2;

  measuring.font = board(14, 500);
  const metaLines = packSegments(measuring, model.meta, contentWidth);

  const headerH = metaLines.length * META_LINE_H;
  const scoreH = PANEL_PAD * 2 + SCORE_BOX_H + TEAM_NAME_H;
  const statsH = PANEL_PAD * 2 + TABLE_HEAD_H + model.statRows.length * ROW_H;
  const ledgerH = model.ledger ? PANEL_PAD * 2 + SECTION_TITLE_H + 10 + LEDGER_CHART_H : 0;
  const groupH = model.playerGroups ? PLAYER_GROUP_H : 0;
  const playersH = hasPlayers
    ? PANEL_PAD * 2 + SECTION_TITLE_H + 10 + groupH + TABLE_HEAD_H + model.playerRows.length * ROW_H
    : 0;

  const historyH = history
    ? PANEL_PAD * 2 + SECTION_TITLE_H + 10 + history.rows.length * HISTORY_ROW_H
    : 0;

  const height =
    PAD +
    headerH +
    GAP +
    scoreH +
    GAP +
    statsH +
    (model.ledger ? GAP + ledgerH : 0) +
    (hasPlayers ? GAP + playersH : 0) +
    (history ? GAP + historyH : 0) +
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
  ctx.font = board(12, 600);
  ctx.fillStyle = C.chalkDim;
  ctx.textAlign = 'right';
  ctx.fillText(fitText(ctx, model.statHeader[0], 132), colA, rowY + TABLE_HEAD_H / 2);
  ctx.textAlign = 'left';
  ctx.fillText(fitText(ctx, model.statHeader[1], 132), colB, rowY + TABLE_HEAD_H / 2);
  rowY += TABLE_HEAD_H;

  for (const row of model.statRows) {
    separator(ctx, left, right, rowY);
    const midY = rowY + ROW_H / 2;
    ctx.font = clock(18, 600);
    ctx.fillStyle = C.chalk;
    ctx.textAlign = 'right';
    ctx.fillText(row.a, colA, midY);
    ctx.textAlign = 'left';
    ctx.fillText(row.b, colB, midY);
    ctx.font = board(14, 500);
    ctx.fillStyle = C.chalkMid;
    ctx.textAlign = 'center';
    ctx.fillText(fitText(ctx, row.label, colB - colA - 16), centre, midY);
    rowY += ROW_H;
  }
  y += statsH + GAP;

  // Possession ledger — the same chart the dashboard and the report screen
  // draw, in full: every column, the scorer's running score in the aligned
  // bands above and below the bars, all in one neutral ink.
  if (model.ledger) {
    panelBox(ctx, PAD, y, panelWidth, ledgerH);
    let lY = y + PANEL_PAD;

    ctx.textAlign = 'left';
    ctx.fillStyle = C.signal;
    ctx.font = board(13, 700);
    withTracking(ctx, '1.5px');
    ctx.fillText(model.ledger.title.toUpperCase(), left, lY + SECTION_TITLE_H / 2);
    withTracking(ctx, '0px');
    lY += SECTION_TITLE_H + 10;

    const lineY = lY + LEDGER_DOT_H + LEDGER_LABEL_H + LEDGER_HALF;
    ctx.strokeStyle = C.lineSoft;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, lineY + 0.5);
    ctx.lineTo(right, lineY + 0.5);
    ctx.stroke();

    const heightFor = (share: number) =>
      share <= 0 ? 0 : Math.max(4, Math.round(share * LEDGER_HALF));
    model.ledger.columns.forEach((column, i) => {
      const x = left + i * (LEDGER_COL_W + LEDGER_GAP);
      const { topColor, bottomColor } = model.ledger as NonNullable<typeof model.ledger>;
      if (column.topShare !== null) {
        const topH = heightFor(column.topShare);
        const bottomH = heightFor(1 - column.topShare);
        const bar = (h: number, color: string, filled: boolean, top: boolean) => {
          if (h <= 0) return;
          const barY = top ? lineY - h : lineY + 1;
          if (filled) {
            halfRoundRect(ctx, x, barY, LEDGER_COL_W, h, top);
            ctx.fillStyle = color;
            ctx.fill();
          } else {
            // Hairline, like the on-screen chart: a heavier stroke on a short
            // hollow bar read as a filled box.
            halfRoundRect(ctx, x + 0.5, barY + 0.5, LEDGER_COL_W - 1, h - 1, top);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        };
        bar(topH, topColor, column.topScored, true);
        bar(bottomH, bottomColor, !column.topScored, false);
      }
      ctx.font = clock(12, 600);
      ctx.fillStyle = C.chalkMid;
      ctx.textAlign = 'center';
      const labelY = column.topScored
        ? lY + LEDGER_DOT_H + LEDGER_LABEL_H / 2
        : lineY + 1 + LEDGER_HALF + LEDGER_LABEL_H / 2;
      ctx.fillText(column.score, x + LEDGER_COL_W / 2, labelY);

      // The offence dot, outermost of all: score and dot on opposite sides of
      // a column is a break, readable without decoding bar heights.
      const dotY = column.topOffense
        ? lY + LEDGER_DOT_H / 2
        : lineY + 1 + LEDGER_HALF + LEDGER_LABEL_H + LEDGER_DOT_H / 2;
      ctx.beginPath();
      ctx.arc(x + LEDGER_COL_W / 2, dotY, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 212, 71, 0.6)';
      ctx.fill();
    });
    y += ledgerH + GAP;
  }

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

  // The game summary. No column headings: the on-screen table needs them because
  // it is one panel among many on a scrolling page, whereas here a clock, an event
  // and its detail read as a story the moment the eye lands on them — and the card
  // has thirty rows to spend its height on already.
  if (history) {
    panelBox(ctx, PAD, y, panelWidth, historyH);
    let hY = y + PANEL_PAD;

    ctx.textAlign = 'left';
    ctx.fillStyle = C.signal;
    ctx.font = board(13, 700);
    withTracking(ctx, '1.5px');
    ctx.fillText(history.title.toUpperCase(), left, hY + SECTION_TITLE_H / 2);
    withTracking(ctx, '0px');
    hY += SECTION_TITLE_H + 10;

    const eventX = left + historyClockW;
    const detailX = eventX + historyEventW;
    history.rows.forEach((row, i) => {
      // No rule above the first row: with no heading over it there is nothing to
      // separate it from, and a line straight under the title reads as a box.
      if (i > 0) separator(ctx, left, right, hY);
      const midY = hY + HISTORY_ROW_H / 2;
      ctx.textAlign = 'left';
      ctx.font = clock(14, 600);
      ctx.fillStyle = C.chalkMid;
      ctx.fillText(row.clock, left, midY);
      ctx.font = board(14, 500);
      ctx.fillStyle = C.chalk;
      ctx.fillText(fitText(ctx, row.event, historyEventW - 6), eventX, midY);
      if (row.detail) {
        ctx.font = board(13, 500);
        ctx.fillStyle = C.chalkDim;
        ctx.fillText(fitText(ctx, row.detail, right - detailX), detailX, midY);
      }
      hY += HISTORY_ROW_H;
    });
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
