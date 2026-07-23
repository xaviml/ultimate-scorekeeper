import { useT } from '../i18n/useT';
import { useGame } from '../state/gameHooks';
import type { CallKind } from '../state/types';
import { Modal } from './Modal';
import { secondaryButton } from './ui';

/** Every call kind, in the order they appear in the dialog. */
const CALL_KINDS: CallKind[] = ['foul', 'stallOut', 'pick', 'offside', 'discDown', 'generic'];

export type CallChoice = { type: 'call'; kind: CallKind } | { type: 'travel' };

/**
 * The seven answers to one question: what was called? Six disputable player calls
 * plus travel, which is a call too — the marker calls it on the thrower — and
 * differs only in registering in one step, with no team to argue it out. That
 * difference is not worth setting it apart in the layout: all seven are one grid.
 *
 * Everything that is *not* a call moved out when this replaced the old Record
 * event menu: turnovers have their own action-row button, injury/technical/SOTG
 * live behind the raised hand, and free-text events are in the log. What is left
 * is homogeneous, which is the point — every button here needs a call-out and a
 * hand signal, and none of them touch the score or the clock.
 *
 * Purely a menu — it routes the choice back to GameScreen, which owns the
 * follow-up "who called it?" dialogs.
 */
export function CallDialog({
  onClose,
  onChoose,
}: {
  onClose: () => void;
  onChoose: (choice: CallChoice) => void;
}) {
  const state = useGame();
  const { t } = useT();
  // A second call cannot be opened while one is unresolved: the resolution buttons
  // answer one question, so the reducer refuses and the buttons say why. Travel is
  // exempt — it opens no pendingCall, so there is nothing for it to collide with.
  const callsBlocked = state.pendingCall !== null;
  // Nothing here has happened yet while the teams are still lining up for the pull.
  const pullBlocked = state.status === 'awaitingPull';

  return (
    <Modal title={t('callDialogTitle')} onClose={onClose} showClose>
      <p className="text-xs text-chalk/50">{t('callDialogHint')}</p>

      {/* Travel is the seventh cell of the same grid, not a full-width button
          below it: stretched across the bottom it read as a cancel/confirm bar
          rather than as one more thing you could have been called for. */}
      <div className="grid grid-cols-3 gap-2">
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
        <button
          className={secondaryButton}
          disabled={pullBlocked}
          onClick={() => onChoose({ type: 'travel' })}
        >
          {t('btnTravel')}
        </button>
      </div>

      {callsBlocked && <p className="text-xs text-signal">{t('callBlockedPending')}</p>}
      {pullBlocked && <p className="text-xs text-signal">{t('callBlockedPull')}</p>}
    </Modal>
  );
}
