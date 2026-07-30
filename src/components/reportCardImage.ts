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

  const contentWidth = WIDTH - PAD * 2;
  const panelWidth = contentWidth;
  const innerWidth = panelWidth - PANEL_PAD * 2;

  measuring.font = board(14, 500);
  const metaLines = packSegments(measuring, model.meta, contentWidth);

  const headerH = metaLines.length * META_LINE_H;
  const scoreH = PANEL_PAD * 2 + SCORE_BOX_H + TEAM_NAME_H;
  const statsH = PANEL_PAD * 2 + TABLE_HEAD_H + model.statRows.length * ROW_H;
  const hasPlayers = model.playerRows.length > 0;
  const playersH = hasPlayers
    ? PANEL_PAD * 2 + SECTION_TITLE_H + 10 + TABLE_HEAD_H + model.playerRows.length * ROW_H
    : 0;

  const height =
    PAD + headerH + GAP + scoreH + GAP + statsH + (hasPlayers ? GAP + playersH : 0) + PAD;

  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = C.pitch;
  ctx.fillRect(0, 0, WIDTH, height);

  let y = PAD;

  // Header — the meta line only. See ReportCardModel.meta for why there is no
  // "Final report" heading on the image.
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

    const totalR = right;
    const goalsR = right - 78;
    const assistsR = right - 156;
    const nameMax = assistsR - left - 84;

    ctx.font = board(12, 600);
    ctx.fillStyle = C.chalkDim;
    ctx.fillText(fitText(ctx, model.playerHeader[0], nameMax), left, pY + TABLE_HEAD_H / 2);
    ctx.textAlign = 'right';
    ctx.fillText(fitText(ctx, model.playerHeader[1], 74), assistsR, pY + TABLE_HEAD_H / 2);
    ctx.fillText(fitText(ctx, model.playerHeader[2], 74), goalsR, pY + TABLE_HEAD_H / 2);
    ctx.fillText(fitText(ctx, model.playerHeader[3], 74), totalR, pY + TABLE_HEAD_H / 2);
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
      ctx.fillStyle = C.chalk;
      ctx.fillText(fitText(ctx, player.label, nameMax - (nameX - left)), nameX, midY);

      ctx.textAlign = 'right';
      ctx.font = clock(17, 600);
      ctx.fillText(player.assists, assistsR, midY);
      ctx.fillText(player.goals, goalsR, midY);
      ctx.fillStyle = C.signal;
      ctx.fillText(player.total, totalR, midY);
      pY += ROW_H;
    }
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
