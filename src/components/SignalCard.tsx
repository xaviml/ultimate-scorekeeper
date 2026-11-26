import { useT } from '../i18n/useT';
import { useAssist, useGame } from '../state/gameHooks';
import { ratioSignalArt } from '../state/assistOccurrence';

/**
 * Hand-signal dialog: floats over the bottom-left of the score panels for as long as
 * its message holds the bar, then disappears. It is `pointer-events-none` on purpose
 * — the score panels underneath stay tappable, so it can never swallow a goal tap.
 *
 * Which signal, and for how long, is the assist queue's call (see useAssistQueue): the
 * picture and the words to shout are two halves of one announcement, so they take the
 * screen and leave it together. Plenty of messages have no picture — a turnover, a
 * score correction, a cap are announced or recorded but never hand-signalled — and
 * those render nothing here while the bar still speaks.
 *
 * The gender-ratio signal is the one exception to "leaves with its message": in real
 * refereeing that hand stays up until the lines are actually set, which routinely
 * outlasts any message's normal window and can span several pull whistles. So once the
 * queue has nothing left to show and the pull still hasn't been thrown, this falls back
 * to the ratio signal instead of going blank — filling the *gap*, not competing for the
 * slot, so a whistle (or anything else with its own picture) still takes over exactly
 * as before, and the ratio signal is simply what the gap reopens onto afterwards.
 */
export function SignalCard() {
  const occurrence = useAssist();
  const state = useGame();
  const { t } = useT();

  const fallback =
    !occurrence?.signal && state.status === 'awaitingPull'
      ? ratioSignalArt(state.nextRatio ?? state.ratio)
      : null;
  const signal = occurrence?.signal ?? fallback;
  if (!signal) return null;

  const caption = t(signal.caption as never);
  // A whistle needs no words: the picture already carries its blast count ("x3"),
  // and "Triple whistle" beside it only made the card wider over the score. The
  // caption stays as the image's name for a screen reader.
  const showCaption = !signal.file.startsWith('whistle');
  // A public/ asset: build the URL via BASE_URL so it keeps working under the
  // GitHub Pages base path (a plain "/signals/..." would not).
  const src = `${import.meta.env.BASE_URL}signals/${signal.file}.png`;

  // The card is white in both themes because the WFDF pictograms are drawn on white,
  // so its caption keeps the light theme's navy ink rather than following `chalk`.
  //
  // In portrait it must not cover the score: it lands right after a goal, which is
  // exactly when the volunteer checks the number. So it lies flat — picture and
  // caption side by side, which is the shape that fits under the digits — and the
  // picture takes only the height left there (`.signal-art`, index.css). Landscape
  // panels are wide and the number sits in their middle, so the corner is clear
  // and the card keeps its upright shape.
  return (
    <figure
      aria-label={t('handSignal')}
      className="pointer-events-none absolute bottom-2 left-2 lscape:bottom-1.5 lscape:left-1.5 z-10 flex flex-row lscape:flex-col items-center gap-2 lscape:gap-1 rounded-lg border border-line bg-white p-1.5 lscape:p-1 shadow-lg animate-signalIn"
    >
      <img src={src} alt={caption} className="signal-art lscape:w-11 lscape:h-11 object-contain" />
      {showCaption && (
        <figcaption className="max-w-[4.5rem] lscape:max-w-none font-board uppercase tracking-wide text-[10px] lscape:text-[8px] leading-tight text-left lscape:text-center text-[#101C30]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
