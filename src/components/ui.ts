import type { CSSProperties } from 'react';

/**
 * Shared Tailwind class strings.
 *
 * These exist so a visual tweak (a colour, a radius, a tap target) lands in one
 * place instead of being hunted across every dialog and screen.
 */

// h-[42px] pins <input> and <select> to the same rendered height — a native
// <select> doesn't obey line-height the way <input> does, so identical padding
// alone leaves it ~8px shorter, which shows up wherever the two sit side by
// side (e.g. division/field, or a timeout count next to its scope dropdown).
export const inputClass =
  'w-full h-[42px] rounded-md bg-panel border border-line px-3 py-2 text-chalk focus:outline-none focus:border-accent';

export const fieldLabel = 'block text-xs uppercase tracking-wide text-chalk/60 mb-1';

/** The small print under a field or a switch: what the setting will do. */
export const hintText = 'text-xs leading-snug text-chalk/50 pt-1';

export const sectionTitle =
  'font-board text-accent text-sm font-semibold uppercase tracking-widest';

/**
 * A titled block on a full screen (setup, report, guide): a softly rounded box on
 * the page ground, with space between it and the next.
 */
export const specSection = 'rounded-lg bg-panel border border-line p-4 space-y-3';
export const specTitle = sectionTitle;

const buttonBase =
  'rounded-lg font-board font-semibold py-3 active:scale-[0.99] disabled:opacity-40';

/** The one main action of a dialog or screen, filled in the accent. */
export const primaryButton = `${buttonBase} bg-accent text-panel`;

/**
 * The confirm button of a step that throws something away for good (remove a
 * player, delete a game, leave a game in progress). Outlined in `danger` rather
 * than filled, so it never reads as the obvious tap.
 */
export const dangerButton = `${buttonBase} border border-danger text-danger bg-panel`;

/** Secondary action inside a dialog or panel — sits on bg-panel, so it fills with bg-pitch. */
export const secondaryButton = `${buttonBase} border border-line bg-pitch`;

/** Secondary action directly on the page background — inverted so it doesn't vanish. */
export const secondaryButtonOnPitch = `${buttonBase} border border-line bg-panel`;

/**
 * The big team-coloured button every "which team?" dialog is built from — the team
 * name on its own colour, sized for a thumb. `selected` rings it, for the pickers
 * that show which answer is already recorded (the log editor) rather than asking
 * from scratch.
 */
export const teamChoiceButton = (selected = false) =>
  `rounded-lg font-board font-bold py-6 active:scale-[0.99] truncate px-2${
    selected ? ' ring-2 ring-offset-2 ring-offset-panel ring-accent' : ''
  }`;

/** Selectable player chip, used by every roster picker. */
export const pillClass = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm border ${
    active ? 'bg-accent text-panel border-accent font-board' : 'bg-panel border-line text-chalk'
  }`;

/**
 * Picks black or white so text stays legible on an arbitrary user-chosen team
 * colour (score panels, report, call dialogs all paint that colour as a
 * background). Measured on WCAG relative luminance, not a flat midpoint split.
 *
 * The cut-off sits above the 0.179 crossover where black and white tie on contrast
 * ratio: the app is read outdoors, where white on a saturated mid-tone (a red, a
 * teal, a grass green) holds up better than black does, so those get white. Light
 * colours — sky blue, orange, yellow, pastels — still get black.
 */
const INK_LUMINANCE_CUTOFF = 0.3;

/** WCAG relative luminance of a `#rgb`/`#rrggbb` colour, 0 (black) to 1 (white). */
function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean;
  const channel = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255 || 0;
  const [r, g, b] = [0, 2, 4]
    .map(channel)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastText(hex: string): '#000000' | '#ffffff' {
  return relativeLuminance(hex) > INK_LUMINANCE_CUTOFF ? '#000000' : '#ffffff';
}

/**
 * A team colour pale enough to disappear against the light theme's white boxes and
 * grey ground — white itself, cream, pale yellow, light grey. Above this luminance
 * the colour sits within ~1.5:1 of white, which is where a swatch, a dot or a badge
 * stops being visible at all.
 */
const PALE_LUMINANCE_CUTOFF = 0.65;

export function isPaleColor(hex: string): boolean {
  return relativeLuminance(hex) > PALE_LUMINANCE_CUTOFF;
}

/**
 * The dark theme's mirror of `isPaleColor`: black, navy, very dark greens — the
 * colours that sit within ~1.5:1 of its dark boxes.
 */
const DARK_LUMINANCE_CUTOFF = 0.06;

export function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < DARK_LUMINANCE_CUTOFF;
}

/**
 * The colour to draw a team's *edge* in — its dashed outlines, the goal ring, the
 * hairline round a swatch. Usually the team colour itself; a colour that would vanish
 * into the current theme's background gets the theme's soft outline instead.
 *
 * Which theme is current is CSS's business, not this function's: a pale colour comes
 * back as `var(--edge-pale, <colour>)`, and index.css defines `--edge-pale` only in
 * the light theme (the dark one resets it to `initial`, which makes `var()` take its
 * fallback). `--edge-dark` is the reverse. So the result follows a theme switch
 * without any component re-rendering, and outside the browser it is a plain string.
 */
export function teamEdge(hex: string): string {
  if (isPaleColor(hex)) return `var(--edge-pale, ${hex})`;
  if (isDarkColor(hex)) return `var(--edge-dark, ${hex})`;
  return hex;
}

/**
 * Spread into the style of anything painted in a team's colour (dots, swatches,
 * badges, score tiles, the "which team?" buttons): a hairline outline in the theme's
 * soft edge colour, only when the colour would otherwise melt into the background
 * (see `teamEdge`). Half a CSS pixel, which a phone draws as one device pixel. Inset,
 * so it never changes the element's size or nudges its neighbours. The score panels
 * don't take it — half a screen of white, or of black, is visible on its own.
 */
export function teamOutline(hex: string): CSSProperties | undefined {
  const edge = teamEdge(hex);
  return edge === hex ? undefined : { boxShadow: `inset 0 0 0 0.5px ${edge}` };
}
