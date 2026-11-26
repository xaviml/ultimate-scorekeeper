import { useId, useState } from 'react';
import { useT } from '../i18n/useT';
import type { DraftTeam } from '../state/teamsDraft';
import { teamNameCase } from '../state/teamName';
import type { Gender, PlayerInfo } from '../state/types';
import { uid } from '../state/uid';
import { Modal } from './Modal';
import { PlayerRosterEditor } from './PlayerRosterEditor';
import { RosterImportDialog } from './RosterImportDialog';
import { SavedLinesEditor } from './SavedLinesEditor';
import { TeamColorPicker } from './TeamColorPicker';
import { fieldLabel, hintText, inputClass, secondaryButton } from './ui';

const errorText = 'text-xs leading-snug text-signal';

/**
 * One saved team on the Teams page: name, colour, roster and predefined lines.
 *
 * Every edit lands in the page's draft straight away and is written to the phone only
 * by the page's Save, so this sheet has no Save of its own — closing it keeps what
 * was done. That is also why removing the team asks nothing here: it is a change to
 * the draft like any other, and Save is where losing a stored team is confirmed.
 *
 * The name is the one field that can be wrong (empty, or another team's), so the box
 * keeps its own text and only writes a valid name through; closing the sheet on a bad
 * one leaves the last good name in place.
 */
export function TeamEditDialog({
  team,
  nameTaken,
  onChange,
  onRemove,
  onClose,
}: {
  team: DraftTeam;
  nameTaken: (name: string) => boolean;
  onChange: (patch: Partial<DraftTeam>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const nameId = useId();
  const [name, setName] = useState(team.name);
  const [importing, setImporting] = useState(false);
  const empty = name.trim() === '';
  const taken = !empty && nameTaken(name);

  const setPlayers = (players: PlayerInfo[]) => onChange({ players });

  return (
    <Modal title={team.name} onClose={onClose} showClose>
      <div>
        <label htmlFor={nameId} className={fieldLabel}>
          {t('teamName')}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={nameId}
            className={`${inputClass} uppercase`}
            value={name}
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              if (next.trim() !== '' && !nameTaken(next)) {
                onChange({ name: teamNameCase(next.trim()) });
              }
            }}
          />
          <TeamColorPicker
            label={t('teamColor')}
            color={team.color}
            onChange={(color) => onChange({ color })}
          />
        </div>
        {empty && <p className={errorText}>{t('teamsNameRequired')}</p>}
        {taken && <p className={errorText}>{t('teamsNameTaken')}</p>}
      </div>

      <div className="border-t border-line pt-4 space-y-2">
        <PlayerRosterEditor
          label={t('playersTitle')}
          players={team.players}
          onAdd={(number, playerName) =>
            setPlayers([
              ...team.players,
              { id: uid(), number: number.trim(), name: playerName.trim() },
            ])
          }
          onRemove={(id) => setPlayers(team.players.filter((p) => p.id !== id))}
          onSetGender={(id, gender: Gender | null) =>
            setPlayers(
              team.players.map((p) => (p.id === id ? { ...p, gender: gender ?? undefined } : p)),
            )
          }
          onImport={() => setImporting(true)}
        />
        <p className={hintText}>{t('rosterHelp')}</p>
      </div>

      <div className="border-t border-line pt-4">
        <SavedLinesEditor
          players={team.players}
          lines={team.lines ?? []}
          onChange={(lines) => onChange({ lines })}
        />
      </div>

      <div className="border-t border-line pt-4">
        <button
          type="button"
          className={`${secondaryButton} w-full text-danger`}
          onClick={onRemove}
        >
          {t('teamsRemoveTeam')}
        </button>
        <p className={hintText}>{t('teamsRemoveHint')}</p>
      </div>

      {importing && (
        <RosterImportDialog
          teamLabel={team.name}
          existing={team.players}
          onApply={(players) => {
            setPlayers(players);
            setImporting(false);
          }}
          onClose={() => setImporting(false)}
        />
      )}
    </Modal>
  );
}
