import { useState } from 'react';
import { useT } from '../i18n/useT';
import { resolveSavedLine } from '../state/lines';
import { playerLabel } from '../state/stats';
import type { GameConfig, PlayerInfo, SavedLine } from '../state/types';
import { SavedLineDialog } from './SavedLineDialog';
import { fieldLabel, secondaryButton } from './ui';

/**
 * The tracked team's predefined lines, listed and edited before the game.
 *
 * It lives in the Roster section because that is what a line is made of, and because
 * the two are filled in together: a tournament's lines are settled at the same moment
 * as the squad. The same lines can still be named mid-game from the Roster button —
 * this is the door for the ones already known.
 *
 * Props-driven and storage-free: the caller owns the list and decides where it is
 * written (ConfigScreen mirrors it into the saved team, LineDialog into the running
 * game), so this never has to know which of those it is serving.
 */
export function SavedLinesEditor({
  config,
  players,
  lines,
  onChange,
}: {
  config: GameConfig;
  players: PlayerInfo[];
  lines: SavedLine[];
  onChange: (lines: SavedLine[]) => void;
}) {
  const { t } = useT();
  // The line being edited, `null` for a new one, `undefined` when the dialog is shut —
  // "no line" and "not editing" are different states, so one nullable is not enough.
  const [editing, setEditing] = useState<SavedLine | null | undefined>(undefined);

  const save = (line: SavedLine) => {
    const index = lines.findIndex((l) => l.id === line.id);
    onChange(index >= 0 ? lines.map((l) => (l.id === line.id ? line : l)) : [...lines, line]);
    setEditing(undefined);
  };

  return (
    <div className="space-y-2">
      <label className={fieldLabel}>{t('lineSavedTitle')}</label>
      {lines.length === 0 ? (
        <p className="text-xs text-chalk/50">{t('lineSavedEmptySetup')}</p>
      ) : (
        <ul className="space-y-1">
          {lines.map((l) => {
            // Named against a roster that has since changed: say so rather than
            // showing a line that quietly plays a player short.
            const resolved = resolveSavedLine(l, players);
            const missing = l.playerKeys.length - resolved.length;
            return (
              <li
                key={l.id}
                className="flex items-center gap-2 rounded-lg bg-pitch border border-line px-3 py-1.5 text-sm"
              >
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left"
                  aria-label={t('lineEditSaved', { name: l.name })}
                  onClick={() => setEditing(l)}
                >
                  <span className="font-board">{l.name}</span>
                  <span className="block truncate text-[11px] text-chalk/50">
                    {resolved.length}
                    {resolved.length > 0 &&
                      ` · ${resolved
                        .map((id) => playerLabel(players.find((p) => p.id === id)))
                        .join(', ')}`}
                  </span>
                  {missing > 0 && (
                    <span className="block text-[11px] text-signal">
                      {t('lineMissingPlayers', { count: missing })}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="text-chalk/50 px-2 shrink-0"
                  aria-label={t('lineDeleteSaved', { name: l.name })}
                  onClick={() => onChange(lines.filter((x) => x.id !== l.id))}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        className={`${secondaryButton} w-full`}
        onClick={() => setEditing(null)}
      >
        {t('lineAddBtn')}
      </button>

      {editing !== undefined && (
        <SavedLineDialog
          config={config}
          players={players}
          line={editing}
          existing={lines}
          onSave={save}
          onCancel={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}
