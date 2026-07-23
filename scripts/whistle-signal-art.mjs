/**
 * Regenerates public/signals/whistle{1,2,3}.png — the whistle pictogram badged
 * with the number of blasts, shown by SignalCard.
 *
 * One picture per blast count rather than a badge composed in the DOM: the card
 * shrinks to 44 px in the landscape layout, where an overlaid HTML badge would
 * have to be positioned and scaled twice over. Baking it into the art means the
 * card stays a plain <img> and the badge can never drift off the corner.
 *
 * The badge is a solid black chip with the count reversed out of it — at 44 px a
 * stroked glyph in the same weight as the whistle outline is unreadable, a filled
 * block is not.
 *
 * ImageMagick is not a dependency of this project — it is only needed to run this
 * script:
 *
 *   node scripts/whistle-signal-art.mjs
 *
 * The unbadged public/signals/whistle.png is the input, and is still shipped: it
 * is the generic whistle art. Bottom-right is empty in it, which is why the badge
 * goes there.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Matches the source pictogram; every offset below is in these pixels. */
const SIZE = 512;
/** The badge chip, inset from the bottom-right corner. */
const CHIP = { x0: 296, y0: 296, x1: 496, y1: 496, radius: 32 };
/** A white margin drawn under the chip so it never merges with the whistle outline. */
const HALO = 14;
/** Point size of the "xN" label, centred in the chip. */
const FONT_SIZE = 132;
const FONT = 'DejaVu-Sans-Bold';

const signals = fileURLToPath(new URL('../public/signals/', import.meta.url));
const src = `${signals}whistle.png`;

const { x0, y0, x1, y1, radius } = CHIP;

for (const times of [1, 2, 3]) {
  execFileSync('magick', [
    src,
    '-resize',
    `${SIZE}x${SIZE}`,
    '-fill',
    'white',
    '-draw',
    `roundrectangle ${x0 - HALO},${y0 - HALO} ${x1 + HALO},${y1 + HALO} ${radius + HALO},${radius + HALO}`,
    '-fill',
    'black',
    '-draw',
    `roundrectangle ${x0},${y0} ${x1},${y1} ${radius},${radius}`,
    // The label is drawn on its own chip-sized layer and composited, so it is
    // centred by the layer's own gravity rather than by hand-measured offsets —
    // "x1" and "x3" are not the same width.
    '(',
    '-size',
    `${x1 - x0}x${y1 - y0}`,
    'xc:none',
    '-font',
    FONT,
    '-pointsize',
    String(FONT_SIZE),
    '-fill',
    'white',
    '-gravity',
    'center',
    '-annotate',
    '+0+0',
    `x${times}`,
    ')',
    // `(` restores the settings it saved, but *not* gravity — left at `center` it
    // would offset the composite from the middle and push the label off-canvas.
    '-gravity',
    'None',
    '-geometry',
    `+${x0}+${y0}`,
    '-composite',
    // Back to the 8-bit grayscale the other pictograms in public/signals/ are.
    '-alpha',
    'off',
    '-colorspace',
    'Gray',
    '-depth',
    '8',
    `${signals}whistle${times}.png`,
  ]);
  console.log(`wrote public/signals/whistle${times}.png`);
}
