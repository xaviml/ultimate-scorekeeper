import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import type { CallKind, TeamId } from '../state/types';
import { Modal } from './Modal';
import { contrastText, secondaryButton } from './ui';

/**
 * "Who called it?" — the one question every call has to answer before it can be
 * logged, so picking a team is what records the call and closes the dialog. There
 * is no Save: the two team buttons are the answer.
 *
 * Cancel takes no action at all, which is why the caller must not have dispatched
 * anything before opening this (same contract as PlayerSelectDialog).
 */
export function CallTeamDialog({ kind, onClose }: { kind: CallKind; onClose: () => void }) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const kindLabel = t(`callKind_${kind}` as never);

  const choose = (team: TeamId) => {
    dispatch({ type: 'CALL_MADE', kind, team });
    onClose();
  };

  return (
    <Modal title={t('callTeamTitle', { kind: kindLabel })} onClose={onClose} size="sm">
      <p className="text-xs text-chalk/50">{t('callTeamHint')}</p>

      <div className="grid grid-cols-2 gap-3">
        {(['A', 'B'] as TeamId[]).map((id) => (
          <button
            key={id}
            className="rounded-xl font-board font-bold py-6 active:scale-[0.99] truncate px-2"
            style={{
              backgroundColor: state.config.teams[id].color,
              color: contrastText(state.config.teams[id].color),
            }}
            onClick={() => choose(id)}
          >
            {state.config.teams[id].name}
          </button>
        ))}
      </div>

      <button className={`${secondaryButton} w-full`} onClick={onClose}>
        {t('btnCancel')}
      </button>
    </Modal>
  );
}
