import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/useT';
import type { SavedTeam } from '../state/types';
import { ConfirmDeleteTeamDialog } from './ConfirmDeleteTeamDialog';
import { inputClass } from './ui';

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
  maxLength,
}: {
  label: string;
  value: string;
  savedTeams: SavedTeam[];
  otherTeamName: string;
  onChangeText: (name: string) => void;
  onSelectTeam: (team: SavedTeam) => void;
  /** Saves the typed name as a saved team immediately — no need to start the game. */
  onAddAsNewTeam: (name: string) => void;
  onDeleteTeam: (name: string) => void;
  maxLength?: number;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
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
  const showAddAsNew = value.trim() !== '' && !hasExactMatch;
  const showPanel = open && (matches.length > 0 || showAddAsNew);

  return (
    <>
      <div className="relative" ref={containerRef}>
        <input
          aria-label={label}
          className={`${inputClass} ${value ? 'pr-9' : ''}`}
          value={value}
          maxLength={maxLength}
          onChange={(e) => {
            onChangeText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        />
        {value && (
          <button
            type="button"
            aria-label={t('clearTeamNameAria', { name: label })}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-1 text-chalk/60 hover:text-chalk"
            onClick={() => {
              onChangeText('');
              setOpen(true);
            }}
          >
            ✕
          </button>
        )}
        {showPanel && (
          <div className="absolute z-10 mt-1 w-full rounded-lg bg-panel border border-line max-h-56 overflow-y-auto">
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
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="truncate">{team.name}</span>
                </button>
                <button
                  type="button"
                  aria-label={t('deleteTeamAria', { name: team.name })}
                  className="px-3 py-2 text-chalk/60 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(team);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            {showAddAsNew && (
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-signal hover:bg-pitch"
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
      {pendingDelete && (
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
