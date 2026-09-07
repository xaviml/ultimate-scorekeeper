import { useT } from '../i18n/useT';
import { rosterTeams } from '../state/gameReducer';
import { useGame, useGameDispatch } from '../state/gameHooks';
import type { TeamId } from '../state/types';
import { Modal } from './Modal';
import { PlayerRosterEditor } from './PlayerRosterEditor';

/**
 * The roster editor, opened from the game menu's Roster row.
 *
 * It used to open a two-entry chooser first, with the line dialog as the second
 * entry — the only way to fit two doors behind one action-row button. Both are now
 * rows of their own in the header menu (see GameMenuDialog), so what is left is
 * just the editor, which is what this dialog was before line tracking existed.
 */
export function PlayersDialog({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();

  // A game following one team only ever attributes that team's players, so the
  // other roster has nothing to be edited for — same scope as the config screen's
  // Roster section (see ConfigScreen).
  const teams: TeamId[] = rosterTeams(state.config);

  return (
    <Modal title={t('playersTitle')} onClose={onClose} showClose>
      {teams.map((id) => (
        <PlayerRosterEditor
          key={id}
          label={state.config.teams[id].name}
          players={state.config.players[id]}
          onAdd={(number, name) => dispatch({ type: 'ADD_PLAYER', team: id, number, name })}
          onRemove={(playerId) => dispatch({ type: 'REMOVE_PLAYER', team: id, id: playerId })}
          onSetGender={(playerId, gender) =>
            dispatch({ type: 'SET_PLAYER_GENDER', team: id, id: playerId, gender })
          }
        />
      ))}
    </Modal>
  );
}
