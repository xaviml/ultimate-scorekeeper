import type { ReactNode } from 'react';
import { useT } from '../i18n/useT';
import type { Gender, PlayerInfo } from '../state/types';
import { Modal } from './Modal';
import { PlayerRosterEditor } from './PlayerRosterEditor';
import { hintText } from './ui';

/**
 * One team's roster, opened from its row in the setup screen's Teams card. A roster
 * belongs to a team — it is stored with the saved team and comes back with it — so it
 * is edited from the team, in every statistics setting, rather than from a section
 * that only existed while statistics named players.
 *
 * Props-driven: every edit goes back through ConfigScreen's `setPlayers` (and its
 * write-through to a saved team), exactly as the old section's editors did.
 */
export function TeamRosterDialog({
  team,
  players,
  onAdd,
  onRemove,
  onSetGender,
  onImport,
  usedByGame,
  onSaveTeam,
  lines,
  onClose,
}: {
  /** The team's name as shown ("RAVENS", or "Team 1" before it has one). */
  team: string;
  players: PlayerInfo[];
  onAdd: (number: string, name: string) => void;
  onRemove: (id: string) => void;
  onSetGender: (id: string, gender: Gender | null) => void;
  onImport: () => void;
  /** Whether this game will ask about these players (statistics by player, for this team). */
  usedByGame: boolean;
  /**
   * Present while the team has a name but is not in the saved-teams store yet: the
   * roster is still kept once the game starts (the kickoff sync stores both teams),
   * but saving now is what keeps it if this game is never played.
   */
  onSaveTeam?: () => void;
  /** The predefined lines editor, for the team whose lines this game tracks. */
  lines?: ReactNode;
  onClose: () => void;
}) {
  const { t } = useT();
  return (
    <Modal title={t('playersTitle')} onClose={onClose} showClose>
      {!usedByGame && <p className={hintText}>{t('rosterUnusedHint', { team })}</p>}
      {onSaveTeam && (
        <div className="rounded-md border border-line bg-pitch p-3 space-y-2">
          <p className="text-xs leading-snug text-chalk/70">{t('rosterUnsavedHint', { team })}</p>
          <button
            type="button"
            className="h-8 rounded-md px-3 text-xs border border-line bg-panel text-accent font-board font-semibold active:scale-[0.99]"
            onClick={onSaveTeam}
          >
            {t('rosterSaveTeam', { team })}
          </button>
        </div>
      )}
      <PlayerRosterEditor
        label={team}
        players={players}
        onAdd={onAdd}
        onRemove={onRemove}
        onSetGender={onSetGender}
        onImport={onImport}
      />
      <p className={hintText}>{t('rosterHelp')}</p>
      {lines}
    </Modal>
  );
}
