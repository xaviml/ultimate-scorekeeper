import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import type { TeamId } from '../state/types';
import { Modal } from './Modal';
import { contrastText, secondaryButton, teamChoiceButton } from './ui';

/**
 * "Who called it?" for a travel — unlike CallTeamDialog, picking a team both logs
 * and settles the event in one dispatch. A travel has nobody to dispute it with, so
 * there's no pendingCall and no accepted/contested/retracted step afterward.
 */
export function TravelTeamDialog({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();

  const choose = (team: TeamId) => {
    dispatch({ type: 'TRAVEL', team });
    onClose();
  };

  return (
    <Modal title={t('travelTeamTitle')} onClose={onClose} size="sm">
      <p className="text-xs text-chalk/50">{t('travelTeamHint')}</p>

      <div className="grid grid-cols-2 gap-3">
        {(['A', 'B'] as TeamId[]).map((id) => (
          <button
            key={id}
            className={teamChoiceButton()}
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
