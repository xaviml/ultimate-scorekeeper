import { useState } from 'react';
import { useT } from '../i18n/useT';
import { playerLabel } from '../state/stats';
import type { Gender, PlayerInfo } from '../state/types';
import { inputClass } from './ui';

/** unset → MMP → FMP → unset. Unset is a real answer: most rosters arrive unmarked. */
const NEXT_GENDER: Record<'unset' | Gender, Gender | null> = {
  unset: 'male',
  male: 'female',
  female: null,
};

/**
 * The MMP/FMP marking, as one small button that cycles rather than a pair of radios.
 *
 * It lives on the player's row and not in the add form, so there is a single place a
 * marking is set and the add form stays the three columns that already fit a 360px
 * phone. A player is added unmarked and marked afterwards, which is also the order a
 * volunteer works in: get the names down first, sort the markings out later.
 */
function GenderToggle({
  player,
  onSetGender,
}: {
  player: PlayerInfo;
  onSetGender: (gender: Gender | null) => void;
}) {
  const { t } = useT();
  const key = player.gender ?? 'unset';
  const label = player.gender
    ? t(player.gender === 'male' ? 'genderMmp' : 'genderFmp')
    : t('genderUnset');
  return (
    <button
      type="button"
      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-board tabular-nums ${
        player.gender ? 'border-signal text-signal' : 'border-line text-chalk/40'
      }`}
      aria-label={t('genderToggle', { name: playerLabel(player), value: label })}
      onClick={() => onSetGender(NEXT_GENDER[key])}
    >
      {player.gender ? label : '—'}
    </button>
  );
}

export function PlayerRosterEditor({
  players,
  onAdd,
  onRemove,
  onSetGender,
  onImport,
  label,
}: {
  players: PlayerInfo[];
  onAdd: (number: string, name: string) => void;
  onRemove?: (id: string) => void;
  /**
   * Shows the MMP/FMP toggle on each row. Every roster editor passes it: a marking is
   * a fact about the player, recorded whether or not anything in this game reads it,
   * and it rides the saved team into the next game where something might. Optional
   * only because the add-only variant of this editor (PlayerSelectDialog, LineDialog)
   * lists no players to mark.
   */
  onSetGender?: (id: string, gender: Gender | null) => void;
  /**
   * Opens the paste/file importer. Optional because only the setup screen offers
   * it: mid-game the roster is already referenced by log entries, and a bulk
   * replace there would orphan them.
   */
  onImport?: () => void;
  label: string;
}) {
  const { t } = useT();
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(false);

  const add = () => {
    if (!number.trim() && !name.trim()) return;
    const normalize = (s: string) => s.trim().toLowerCase();
    const isDuplicate = players.some(
      (p) => normalize(p.number) === normalize(number) && normalize(p.name) === normalize(name),
    );
    if (isDuplicate) {
      setError(true);
      return;
    }
    onAdd(number, name);
    setNumber('');
    setName('');
    setError(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-chalk/60">{label}</p>
        {onImport && (
          <button type="button" className="text-xs text-chalk/60 underline" onClick={onImport}>
            {t('rosterImportBtn')}
          </button>
        )}
      </div>
      {players.length > 0 && (
        <ul className="space-y-1">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg bg-pitch border border-line px-3 py-1.5 text-sm"
            >
              <span className="truncate">{playerLabel(p)}</span>
              <span className="flex items-center gap-1 shrink-0">
                {onSetGender && (
                  <GenderToggle player={p} onSetGender={(g) => onSetGender(p.id, g)} />
                )}
                {onRemove && (
                  <button
                    type="button"
                    className="text-chalk/50 px-2"
                    aria-label={`${t('removePlayer')} ${playerLabel(p)}`}
                    onClick={() => onRemove(p.id)}
                  >
                    ✕
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {players.length === 0 && <p className="text-sm text-chalk/40">{t('noPlayersYet')}</p>}
      <div className="grid grid-cols-[5rem_1fr_auto] gap-2">
        <input
          className={inputClass}
          inputMode="numeric"
          maxLength={3}
          placeholder={t('playerNumber')}
          value={number}
          onChange={(e) => {
            setNumber(e.target.value.replace(/\D/g, '').slice(0, 3));
            setError(false);
          }}
        />
        <input
          className={inputClass}
          maxLength={40}
          placeholder={t('playerName')}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button
          type="button"
          className="rounded-lg bg-signal text-pitch font-board px-3 active:scale-[0.99]"
          onClick={add}
        >
          {t('addPlayer')}
        </button>
      </div>
      {error && <p className="text-sm text-chalk/60">{t('duplicatePlayer')}</p>}
    </div>
  );
}
