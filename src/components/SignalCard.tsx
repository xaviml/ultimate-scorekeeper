import { useT } from '../i18n/useT';
import { useTransientKey } from '../hooks/useTransientKey';
import { useGame } from '../state/gameHooks';
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
 * turnover, a pull, a score correction, a game start etc. are recorded or
 * announced but never hand-signalled by a scorekeeper, so they show no picture.
 * `file` is a basename under `public/signals/`; `caption` is an i18n key.
 */
function currentSignal(state: GameState): Signal | null {
  // The app blows the whistle during the pull countdown (1/2/3 blasts at 45/60/75s);
  // cue the volunteer to whistle too. Keyed per blast so each one re-shows the dialog.
  if (state.status === 'awaitingPull' && state.secondary?.kind === 'pull') {
    const s = state.secondary.seconds;
    const blast = s >= 75 ? 75 : s >= 60 ? 60 : s >= 45 ? 45 : null;
    if (blast !== null) return { key: `pull${blast}`, ...WHISTLE };
  }

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
    injury: { file: 'stoppage', caption: 'signal_stoppage' },
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
    // Half-time has no WFDF hand signal — it's announced verbally only.
    // The app also whistles to restart after a timeout and on every cap.
    timeoutOver: WHISTLE,
    capReached: WHISTLE,
    capNoneFinishPoint: WHISTLE,
    capPending: WHISTLE,
    halfCapReached: WHISTLE,
    halfCapNone: WHISTLE,
    halfCapPending: WHISTLE,
  };
  const art = map[state.assist];
  // Log counter in the key so a repeat of the same event (two injuries in a row)
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
  const signal = currentSignal(state);
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
