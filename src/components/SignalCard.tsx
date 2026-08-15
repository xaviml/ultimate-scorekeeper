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

  // Held back the same way the auto-reveal itself is (see GOAL in the reducer): while
  // the scorer/assist dialog is still up, `pendingGoalAssist` hasn't been released into
  // `assist` yet, and the fallback jumping in early would fight that dialog for
  // attention just as much as an un-deferred reveal would.
  const fallback =
    !occurrence?.signal && state.status === 'awaitingPull' && state.pendingGoalAssist === null
      ? ratioSignalArt(state.nextRatio ?? state.ratio)
      : null;
  const signal = occurrence?.signal ?? fallback;
  if (!signal) return null;

  const caption = t(signal.caption as never);
  // A public/ asset: build the URL via BASE_URL so it keeps working under the
  // GitHub Pages base path (a plain "/signals/..." would not).
  const src = `${import.meta.env.BASE_URL}signals/${signal.file}.png`;

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
