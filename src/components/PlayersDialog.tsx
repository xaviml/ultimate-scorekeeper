import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import type { TeamId } from '../state/types';
import { Modal } from './Modal';
import { PlayerRosterEditor } from './PlayerRosterEditor';

export function PlayersDialog({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();

  // Team stats mode only ever attributes the tracked team's players, so the
  // other roster has nothing to be edited for — same scope as the config
  // screen's Roster section (see ConfigScreen).
  const teams: TeamId[] =
    state.config.statsMode === 'team' && state.config.trackedTeam
      ? [state.config.trackedTeam]
      : (['A', 'B'] as TeamId[]);

  return (
    <Modal title={t('playersTitle')} onClose={onClose} showClose>
      {teams.map((id) => (
        <PlayerRosterEditor
          key={id}
          label={state.config.teams[id].name}
          players={state.config.players[id]}
          onAdd={(number, name) => dispatch({ type: 'ADD_PLAYER', team: id, number, name })}
          onRemove={(playerId) => dispatch({ type: 'REMOVE_PLAYER', team: id, id: playerId })}
        />
      ))}
    </Modal>
  );
}
