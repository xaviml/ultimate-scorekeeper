// A public/ asset: build the URL via BASE_URL so it keeps working under the
// GitHub Pages base path (a plain "/whistle.mp3" would not).
const WHISTLE_URL = `${import.meta.env.BASE_URL}whistle.mp3`;

let el: HTMLAudioElement | null = null;
function audio(): HTMLAudioElement {
  if (!el) el = new Audio(WHISTLE_URL);
  return el;
}

/** Play n short whistle blasts in a row (1 = single, 2 = double, 3 = triple). */
export function whistle(times: 1 | 2 | 3): void {
  let played = 0;
  const blast = () => {
    const a = audio();
    a.currentTime = 0;
    a.play().catch(() => {
      /* placeholder URL / autoplay policy: fail silently */
    });
    played += 1;
    if (played < times) setTimeout(blast, 700);
  };
  blast();
}
