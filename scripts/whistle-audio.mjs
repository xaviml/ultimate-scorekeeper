/**
 * Regenerates public/whistle{1,2,3}.mp3 — the single, double and triple whistle
 * used by src/audio/whistle.ts.
 *
 * The three files are rendered from one recording of a single blast so the blasts
 * are identical and evenly spaced. Playing a pre-rendered sequence is deliberate:
 * re-triggering one element on a timer drops blasts on Safari (see whistle.ts).
 *
 * ffmpeg is not a dependency of this project — it is only needed to run this
 * script:
 *
 *   node scripts/whistle-audio.mjs scripts/whistle-source.mp3
 *
 * whistle-source.mp3 is the single blast the current files were rendered from. It
 * lives here rather than in public/ because it is a build input, not a shipped
 * asset. Any recording works in its place, as long as the sound is over within
 * BLAST seconds.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Seconds of audio kept per blast: the sound plus its decay, nothing after. */
const BLAST = 0.62;
/** Seconds from one blast's onset to the next. Sets the rhythm of a sequence. */
const SPACING = 0.7;
/** Matches the source recording; the app never resamples, so this is cosmetic. */
const ENCODE = ['-c:a', 'libmp3lame', '-b:a', '160k', '-ar', '48000', '-ac', '2'];

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/whistle-audio.mjs <single-blast-audio-file>');
  process.exit(1);
}

const out = fileURLToPath(new URL('../public/', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'whistle-'));
const ffmpeg = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);

try {
  // One blast, faded out at the very end so a concat never clicks, and the same
  // blast padded with silence out to the full onset-to-onset spacing.
  const blast = join(tmp, 'blast.wav');
  const gapped = join(tmp, 'blast-gap.wav');
  const fade = `afade=t=out:st=${BLAST - 0.04}:d=0.04`;
  ffmpeg(['-i', src, '-t', String(BLAST), '-af', fade, '-c:a', 'pcm_s16le', blast]);
  ffmpeg(['-i', blast, '-af', `apad=pad_dur=${SPACING - BLAST}`, '-c:a', 'pcm_s16le', gapped]);

  // n blasts = (n-1) padded copies then one unpadded, so no file ends in silence.
  for (const times of [1, 2, 3]) {
    const list = join(tmp, `concat-${times}.txt`);
    const parts = [...Array(times - 1).fill(gapped), blast];
    writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, ...ENCODE, join(out, `whistle${times}.mp3`)]);
    console.log(`wrote public/whistle${times}.mp3`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
