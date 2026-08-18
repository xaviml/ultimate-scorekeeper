import { useT } from '../i18n/useT';
import { rosterTeams } from '../state/gameReducer';
import { useGame, useGameDispatch } from '../state/gameHooks';
import type { TeamId } from '../state/types';
import { Modal } from './Modal';
import { PlayerRosterEditor } from './PlayerRosterEditor';
import { secondaryButton } from './ui';

/**
 * The Roster button's destination.
 *
 * With line tracking on it is a two-entry chooser first — the line is the thing a
 * coach reaches for mid-game far more often than the roster, but the roster is where
 * the players it picks from come from, so neither can be the button's only meaning.
 * With line tracking off there is nothing to choose and the editor opens directly,
 * exactly as it always has.
 */
export function PlayersDialog({
  onClose,
  onOpenLine,
}: {
  onClose: () => void;
  /** Opens the line dialog. Absent when line tracking is off — then there is no chooser. */
  onOpenLine?: () => void;
}) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();

  // A game following one team only ever attributes that team's players, so the
  // other roster has nothing to be edited for — same scope as the config screen's
  // Roster section (see ConfigScreen).
  const teams: TeamId[] = rosterTeams(state.config);

  return (
    <Modal title={t('playersTitle')} onClose={onClose} showClose>
      {onOpenLine && (
        <button className={secondaryButton + ' w-full'} onClick={onOpenLine}>
          {t('btnLine')}
        </button>
      )}
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
