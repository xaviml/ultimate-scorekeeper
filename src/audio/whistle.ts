// One pre-rendered file per blast count, rather than one file re-triggered on a
// timer. The timer version was fine on Chrome but lost blasts on Safari: each
// blast restarted the *same* element with `currentTime = 0` while the previous
// play() promise was still pending, and Safari resolves that race by aborting —
// so a double or triple whistle came out as a single one. A sequence is now a
// single uninterrupted play() of a single file, which no browser can drop
// halfway. The gap between blasts (700 ms onset to onset) is baked into the
// audio — all three files are rendered from one blast by scripts/whistle-audio.mjs.
//
// public/ assets: the URL goes through BASE_URL so it survives the GitHub Pages
// base path (a plain "/whistle2.mp3" would not).
const SRC: Record<1 | 2 | 3, string> = {
  1: `${import.meta.env.BASE_URL}whistle1.mp3`,
  2: `${import.meta.env.BASE_URL}whistle2.mp3`,
  3: `${import.meta.env.BASE_URL}whistle3.mp3`,
};

// Built eagerly, all three, with preload="auto". The service worker only
// pre-caches the app shell and picks up everything else on first fetch, so an
// element created lazily would mean the first triple whistle of an offline game
// is the one that has to go to the network. Fetching all three at startup puts
// them in the cache before they are ever needed.
const els = new Map<1 | 2 | 3, HTMLAudioElement>();
for (const times of [1, 2, 3] as const) {
  const el = new Audio(SRC[times]);
  el.preload = 'auto';
  els.set(times, el);
}

/** The sequence currently sounding, if any. */
let playing: HTMLAudioElement | null = null;

/** Play n short whistle blasts in a row (1 = single, 2 = double, 3 = triple). */
export function whistle(times: 1 | 2 | 3): void {
  const el = els.get(times)!;
  // A new sequence supersedes one still sounding — otherwise two runs overlap
  // into one ragged mess of whistles. This happens for real: a cap can fire on
  // the same second a pull timer crosses 45/60/75.
  if (playing && playing !== el) playing.pause();
  playing = el;
  el.currentTime = 0;
  // Older browsers (and jsdom in tests) return undefined instead of a Promise, so
  // guard before calling .catch. Autoplay policy, or an abort from the restart
  // above: fail silently.
  const p = el.play() as Promise<void> | undefined;
  if (p && typeof p.catch === 'function') p.catch(() => {});
}
