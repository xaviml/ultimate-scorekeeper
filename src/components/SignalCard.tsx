import { useT } from '../i18n/useT';
import { useAssist } from '../state/gameHooks';

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
 */
export function SignalCard() {
  const occurrence = useAssist();
  const { t } = useT();

  if (!occurrence?.signal) return null;

  const caption = t(occurrence.signal.caption as never);
  // A public/ asset: build the URL via BASE_URL so it keeps working under the
  // GitHub Pages base path (a plain "/signals/..." would not).
  const src = `${import.meta.env.BASE_URL}signals/${occurrence.signal.file}.png`;

  return (
    <figure
      aria-label={t('handSignal')}
      className="pointer-events-none absolute bottom-3 left-3 lscape:bottom-1.5 lscape:left-1.5 z-10 flex flex-col items-center gap-1 rounded-xl border border-line bg-white/95 p-2 lscape:p-1 shadow-2xl animate-signalIn"
    >
      <img src={src} alt={caption} className="w-24 h-24 lscape:w-11 lscape:h-11 object-contain" />
      <figcaption className="font-board text-xs lscape:text-[8px] leading-tight text-center text-pitch">
        {caption}
      </figcaption>
    </figure>
  );
}
