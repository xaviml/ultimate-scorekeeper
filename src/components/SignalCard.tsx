import { useT } from '../i18n/useT';
import { useTransientKey } from '../hooks/useTransientKey';
import { useGame } from '../state/gameHooks';
import { currentWhistle } from '../state/whistleSignal';
import type { GameState } from '../state/types';

type SignalArt = { file: string; caption: string };
/** `key` identifies the *occurrence*, so a repeat of the same art re-shows the dialog. */
type Signal = SignalArt & { key: string };

const WHISTLE: SignalArt = { file: 'whistle', caption: 'signal_whistle' };

/** How long the dialog stays up before it disappears on its own. */
const VISIBLE_MS = 7000;

/**
 * The official WFDF hand signal the volunteer should make for the current assist
 * message — or `null` when that message has no signal to make.
 *
 * Only messages that map to a real WFDF pictogram return one. Plenty don't: a
 * turnover, a score correction, a cap etc. are recorded or announced but never
 * hand-signalled by a scorekeeper, so they show no picture. Every *whistle* comes
 * from `currentWhistle` (see SignalCard below), so this handles only the non-whistle
 * signals. `file` is a basename under `public/signals/`; `caption` is an i18n key.
 */
function currentSignal(state: GameState): Signal | null {
  // Mixed gender ratio: WFDF has a distinct signal per composition — hands behind
  // head for the 4-men point, arms out to the sides for the 4-women point.
  if (state.assist === 'nextRatio') {
    const g = state.nextRatio ?? state.ratio;
    // ratioSignalId in the key so re-tapping the ratio chip re-arms the card even
    // though assist is already 'nextRatio' and the gender hasn't changed.
    if (g === 'male')
      return {
        key: `ratioMale:${state.ratioSignalId}`,
        file: 'ratio-4men',
        caption: 'signal_ratioMale',
      };
    if (g === 'female')
      return {
        key: `ratioFemale:${state.ratioSignalId}`,
        file: 'ratio-4women',
        caption: 'signal_ratioFemale',
      };
    return null;
  }

  const map: Record<string, SignalArt> = {
    goalScored: { file: 'goal', caption: 'signal_goal' },
    timeoutRunning: { file: 'timeout', caption: 'signal_timeout' },
    stoppageInjury: { file: 'stoppage', caption: 'signal_stoppage' },
    stoppageTechnical: { file: 'stoppage', caption: 'signal_stoppage' },
    sotg: { file: 'sotg', caption: 'signal_sotg' },
    universePoint: { file: 'match-point', caption: 'signal_universePoint' },
    // Recorded events. Each call shows the infraction when it is made, and one of
    // the three outcome signals when it is resolved. There is no WFDF pictogram for
    // a stall-out, so it borrows the timing signal — the stall count is what is at
    // issue. A free-text note (`note`) is deliberately absent: nothing to signal.
    travel: { file: 'travel', caption: 'signal_travel' },
    call_foul: { file: 'foul', caption: 'signal_foul' },
    call_stallOut: { file: 'timing', caption: 'signal_stallOut' },
    call_pick: { file: 'pick', caption: 'signal_pick' },
    call_offside: { file: 'offside', caption: 'signal_offside' },
    call_discDown: { file: 'disc-down', caption: 'signal_discDown' },
    call_generic: { file: 'play-stopped', caption: 'signal_call' },
    resolution_accepted: { file: 'uncontested', caption: 'signal_accepted' },
    resolution_contested: { file: 'contest', caption: 'signal_contested' },
    resolution_retracted: { file: 'retracted', caption: 'signal_retracted' },
    // No entries for caps or half-time: a cap is announced in the bar but is not a
    // whistle scenario (no sound, no sign), and half-time has no WFDF hand signal.
    // Every whistle-and-sign moment (pull, starts, timeout ends, unresolved calls)
    // is handled by currentWhistle in SignalCard, not from this map.
  };
  const art = map[state.assist];
  // Log counter in the key so a repeat of the same event (two stoppages in a row)
  // re-shows the dialog instead of being mistaken for the one already dismissed.
  return art ? { key: `${state.assist}:${state.nextLogId}`, ...art } : null;
}

/**
 * Hand-signal dialog: floats over the bottom-left of the score panels for
 * VISIBLE_MS, then disappears. It is `pointer-events-none` on purpose — the score
 * panels underneath stay tappable, so it can never swallow a goal tap.
 */
export function SignalCard() {
  const state = useGame();
  const { t } = useT();
  // A due whistle always shows its whistle picture (that is the whole point of
  // sharing currentWhistle with the audio); otherwise fall back to the non-whistle
  // hand signals. Whichever it is carries an occurrence key for the transient.
  const whistleNow = currentWhistle(state);
  const signal: Signal | null = whistleNow
    ? { key: whistleNow.key, ...WHISTLE }
    : currentSignal(state);
  // Same lifetime, and the same kind of key, as the call-out in AssistanceBar,
  // so a signal and the words that go with it come and go together.
  const fresh = useTransientKey(signal?.key ?? null, VISIBLE_MS);

  if (!signal || !fresh) return null;

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
