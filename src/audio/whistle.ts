// A public/ asset: build the URL via BASE_URL so it keeps working under the
// GitHub Pages base path (a plain "/whistle.mp3" would not).
const WHISTLE_URL = `${import.meta.env.BASE_URL}whistle.mp3`;

let el: HTMLAudioElement | null = null;
function audio(): HTMLAudioElement {
  if (!el) el = new Audio(WHISTLE_URL);
  return el;
}

/** Timer for the next blast of the sequence currently playing, if any. */
let pending: ReturnType<typeof setTimeout> | null = null;

/** Play n short whistle blasts in a row (1 = single, 2 = double, 3 = triple). */
export function whistle(times: 1 | 2 | 3): void {
  // A new sequence supersedes one still in flight. Every blast restarts the same
  // single audio element, so two overlapping chains would cut each other off mid-
  // blast and keep re-triggering — two short bursts turning into one long ragged
  // run of whistles. This can happen for real: a cap fires on the same second a
  // pull timer crosses 45/60/75.
  if (pending !== null) {
    clearTimeout(pending);
    pending = null;
  }
  let played = 0;
  const blast = () => {
    const a = audio();
    a.currentTime = 0;
    a.play().catch(() => {
      /* placeholder URL / autoplay policy: fail silently */
    });
    played += 1;
    pending = played < times ? setTimeout(blast, 700) : null;
  };
  blast();
}
