import { useLongPress } from '../hooks/useLongPress';
import { useT } from '../i18n/useT';
import { playerLabel } from '../state/stats';
import type { PlayerInfo } from '../state/types';
import { pillClass } from './ui';

function PlayerChip({
  player,
  active,
  onSelect,
  onRemove,
}: {
  player: PlayerInfo;
  active: boolean;
  onSelect: (id: string | null) => void;
  onRemove?: (id: string) => void;
}) {
  const { t } = useT();
  const press = useLongPress(
    () => onSelect(active ? null : player.id),
    () => onRemove?.(player.id),
  );

  return (
    <button
      type="button"
      className={pillClass(active)}
      aria-label={onRemove ? `${playerLabel(player)} — ${t('removePlayer')}` : undefined}
      {...press}
    >
      {playerLabel(player)}
    </button>
  );
}

/**
 * A row of selectable player chips. Tapping the active chip clears the
 * selection, so a mis-tap is undone with a second tap rather than needing a
 * separate "none" affordance. Long-pressing a chip removes that player from
 * the roster instead, when `onRemove` is supplied.
 */
export function PlayerPicker({
  players,
  selected,
  onSelect,
  onRemove,
}: {
  players: PlayerInfo[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onRemove?: (id: string) => void;
}) {
  if (players.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {players.map((p) => (
        <PlayerChip
          key={p.id}
          player={p}
          active={selected === p.id}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
