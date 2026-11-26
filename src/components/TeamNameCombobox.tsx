import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/useT';
import { teamNameCase } from '../state/teamName';
import type { SavedTeam } from '../state/types';
import { ConfirmDeleteTeamDialog } from './ConfirmDeleteTeamDialog';
import { CrossIcon } from './icons';
import { inputClass, teamOutline } from './ui';

const normalize = (name: string) => name.trim().toLowerCase();

export function TeamNameCombobox({
  label,
  value,
  savedTeams,
  otherTeamName,
  onChangeText,
  onSelectTeam,
  onAddAsNewTeam,
  onDeleteTeam,
  addedAsNew = false,
  maxLength,
  inputClassName = inputClass,
}: {
  label: string;
  value: string;
  savedTeams: SavedTeam[];
  otherTeamName: string;
  onChangeText: (name: string) => void;
  onSelectTeam: (team: SavedTeam) => void;
  /** Saves the typed name as a saved team immediately — no need to start the game. */
  onAddAsNewTeam: (name: string) => void;
  /** Omitted where saved teams can't be deleted (the game setup dialog): no ✕ is drawn. */
  onDeleteTeam?: (name: string) => void;
  /**
   * The typed name has already been marked to become a new team when the form is
   * saved, rather than there and then — so the offer is answered and is not repeated.
   */
  addedAsNew?: boolean;
  maxLength?: number;
  /** The box's look; the setup screen's Teams card sets the name larger. */
  inputClassName?: string;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  // The keystrokes as typed, shown in capitals by CSS while the parent stores the
  // cased name (see `teamNameCase`). Feeding the cased value straight back into the
  // input would move the caret on every key and fight a phone keyboard mid-word.
  // Whenever the value changes for any other reason — a saved team picked, the box
  // cleared — the two no longer match ignoring case, and the value wins.
  const [typed, setTyped] = useState(value);
  const shown = teamNameCase(typed) === value ? typed : value;
  const [pendingDelete, setPendingDelete] = useState<SavedTeam | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const matches = savedTeams.filter(
    (team) =>
      normalize(team.name).includes(normalize(value)) &&
      normalize(team.name) !== normalize(otherTeamName),
  );
  const hasExactMatch = savedTeams.some((team) => normalize(team.name) === normalize(value));
  const showAddAsNew = value.trim() !== '' && !hasExactMatch && !addedAsNew;
  const showPanel = open && (matches.length > 0 || showAddAsNew);

  return (
    <>
      <div className="relative" ref={containerRef}>
        <input
          aria-label={label}
          className={`${inputClassName} uppercase ${value ? 'pr-9' : ''}`}
          value={shown}
          maxLength={maxLength}
          autoCapitalize="characters"
          onChange={(e) => {
            setTyped(e.target.value);
            onChangeText(teamNameCase(e.target.value));
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        />
        {value && (
          <button
            type="button"
            aria-label={t('clearTeamNameAria', { name: label })}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-chalk/50 hover:text-chalk"
            onClick={() => {
              onChangeText('');
              setOpen(true);
            }}
          >
            <CrossIcon size="w-4 h-4" />
          </button>
        )}
        {showPanel && (
          <div className="absolute z-10 mt-1 w-full rounded-md bg-panel border border-line shadow-lg max-h-56 overflow-y-auto">
            {matches.map((team) => (
              <div key={team.name} className="flex items-center hover:bg-pitch">
                <button
                  type="button"
                  className="flex-1 flex items-center gap-2 px-3 py-2 text-left text-sm min-w-0"
                  onClick={() => {
                    onSelectTeam(team);
                    setOpen(false);
                  }}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: team.color, ...teamOutline(team.color) }}
                  />
                  <span className="truncate">{team.name}</span>
                </button>
                {onDeleteTeam && (
                  <button
                    type="button"
                    aria-label={t('deleteTeamAria', { name: team.name })}
                    className="px-3 py-2 text-chalk/50 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(team);
                    }}
                  >
                    <CrossIcon size="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {showAddAsNew && (
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-accent hover:bg-pitch"
                onClick={() => {
                  onAddAsNewTeam(value.trim());
                  setOpen(false);
                }}
              >
                {t('addAsNewTeam', { name: value.trim() })}
              </button>
            )}
          </div>
        )}
      </div>
      {pendingDelete && onDeleteTeam && (
        <ConfirmDeleteTeamDialog
          name={pendingDelete.name}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDeleteTeam(pendingDelete.name);
            setPendingDelete(null);
          }}
        />
      )}
    </>
  );
}
