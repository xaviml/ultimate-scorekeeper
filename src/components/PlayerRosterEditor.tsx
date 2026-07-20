import { useState } from 'react';
import { useT } from '../i18n/useT';
import { playerLabel } from '../state/stats';
import type { PlayerInfo } from '../state/types';
import { inputClass } from './ui';

export function PlayerRosterEditor({
  players,
  onAdd,
  onRemove,
  label,
}: {
  players: PlayerInfo[];
  onAdd: (number: string, name: string) => void;
  onRemove?: (id: string) => void;
  label: string;
}) {
  const { t } = useT();
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');

  const add = () => {
    if (!number.trim() && !name.trim()) return;
    onAdd(number, name);
    setNumber('');
    setName('');
  };

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-chalk/60">{label}</p>
      {players.length > 0 && (
        <ul className="space-y-1">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg bg-pitch border border-line px-3 py-1.5 text-sm"
            >
              <span>{playerLabel(p)}</span>
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
            </li>
          ))}
        </ul>
      )}
      {players.length === 0 && <p className="text-sm text-chalk/40">{t('noPlayersYet')}</p>}
      <div className="grid grid-cols-[5rem_1fr_auto] gap-2">
        <input
          className={inputClass}
          inputMode="numeric"
          placeholder={t('playerNumber')}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder={t('playerName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
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
    </div>
  );
}
