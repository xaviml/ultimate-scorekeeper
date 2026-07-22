import { useT } from '../i18n/useT';
import { useGame } from '../state/gameHooks';
import type { CallKind } from '../state/types';
import { Modal } from './Modal';
import { secondaryButton } from './ui';

/** Every call kind, in the order they appear in the dialog. */
const CALL_KINDS: CallKind[] = ['foul', 'stallOut', 'pick', 'offside', 'discDown', 'generic'];

export type RecordEventChoice =
  { type: 'turnover' | 'stoppage' | 'travel' | 'note' | 'sotg' } | { type: 'call'; kind: CallKind };

/**
 * The single entry point for everything that gets written to the log without
 * changing the game: turnovers and stoppages (which used to have their own buttons
 * on the dashboard) plus travels, the six player calls, and a free-text note.
 *
 * Purely a menu — it routes the choice back to GameScreen, which owns the
 * follow-up dialogs and the "you can't do that right now" hints. That keeps the
 * turnover/stoppage paths exactly as they were, just one tap further in.
 */
export function RecordEventDialog({
  onClose,
  onChoose,
}: {
  onClose: () => void;
  onChoose: (choice: RecordEventChoice) => void;
}) {
  const state = useGame();
  const { t } = useT();
  // A second call cannot be opened while one is unresolved: the resolution buttons
  // answer one question, so the reducer refuses and the buttons say why.
  const callsBlocked = state.pendingCall !== null;
  // Turn, stoppage, travel and the six calls only make sense once the disc is
  // live — nothing has happened yet for any of them to describe. A note and an
  // SOTG stoppage are the only things that can still be recorded while the
  // teams are lining up for the pull.
  const pullBlocked = state.status === 'awaitingPull';

  return (
    <Modal title={t('recordEventTitle')} onClose={onClose} showClose>
      <p className="text-xs text-chalk/50">{t('recordEventHint')}</p>

      <div className="grid grid-cols-3 gap-2">
        <button
          className={secondaryButton}
          disabled={pullBlocked}
          onClick={() => onChoose({ type: 'turnover' })}
        >
          {t('btnTurnover')}
        </button>
        <button
          className={secondaryButton}
          disabled={pullBlocked}
          onClick={() => onChoose({ type: 'stoppage' })}
        >
          {t('btnStoppage')}
        </button>
        <button
          className={secondaryButton}
          disabled={pullBlocked}
          onClick={() => onChoose({ type: 'travel' })}
        >
          {t('btnTravel')}
        </button>
        <button className={secondaryButton} onClick={() => onChoose({ type: 'sotg' })}>
          {t('btnSotg')}
        </button>

        {CALL_KINDS.map((kind) => (
          <button
            key={kind}
            className={secondaryButton}
            disabled={callsBlocked || pullBlocked}
            onClick={() => onChoose({ type: 'call', kind })}
          >
            {t(`callKind_${kind}` as never)}
          </button>
        ))}

        <button className={secondaryButton} onClick={() => onChoose({ type: 'note' })}>
          {t('btnNote')}
        </button>
      </div>

      {callsBlocked && <p className="text-xs text-signal">{t('callBlockedPending')}</p>}
      {pullBlocked && <p className="text-xs text-signal">{t('recordEventBlockedPull')}</p>}
    </Modal>
  );
}
