import { useT } from '../i18n/useT';
import { capTargetOptions } from '../state/gameReducer';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { Modal } from './Modal';
import { primaryButton, secondaryButton } from './ui';

/**
 * "Where does it end?" behind the cap chip — the one question the app cannot answer
 * for itself, because the horn is on the clock but the goal is on the volunteer's
 * thumb (see capTargetOptions for which numbers are on offer and why).
 *
 * Only ever opened with something to choose: the chip renders as a plain label when
 * the options collapse to a single number, so this dialog never asks a question with
 * one answer.
 */
export function CapTargetDialog({
  which,
  onClose,
}: {
  which: 'game' | 'half';
  onClose: () => void;
}) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();

  const options = capTargetOptions(state, which);
  const current = which === 'half' ? state.halfCappedTarget : state.cappedTarget;

  const choose = (target: number) => {
    dispatch({ type: 'SET_CAP_TARGET', which, target });
    onClose();
  };

  return (
    <Modal
      title={t(which === 'half' ? 'capTargetTitleHalf' : 'capTargetTitleGame')}
      onClose={onClose}
      size="sm"
    >
      <p className="text-xs text-chalk/50">{t('capTargetHint')}</p>

      <div className="grid grid-cols-2 gap-3">
        {options.map((n) => (
          <button
            key={n}
            className={`${n === current ? primaryButton : secondaryButton} py-6 text-lg`}
            onClick={() => choose(n)}
          >
            {t('capTargetOption', { n })}
          </button>
        ))}
      </div>

      <button className={`${secondaryButton} w-full`} onClick={onClose}>
        {t('btnCancel')}
      </button>
    </Modal>
  );
}
