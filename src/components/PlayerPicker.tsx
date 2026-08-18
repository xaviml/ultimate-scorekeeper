import { useLongPress } from '../hooks/useLongPress';
import { useT } from '../i18n/useT';
import { genderGroups } from '../state/lines';
import { playerLabel } from '../state/stats';
import type { PlayerInfo } from '../state/types';
import { pillClass } from './ui';

function PlayerChip({
  player,
  active,
  showGender,
  onSelect,
  onRemove,
}: {
  player: PlayerInfo;
  active: boolean;
  showGender?: boolean;
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
      {/* The marking rides on the chip rather than in a second row, because the one
          place it matters is while a line is being picked against a split — reading
          it off a legend somewhere else would mean counting twice. */}
      {showGender && player.gender && (
        <span className={`ml-1 text-[10px] font-board ${active ? 'opacity-70' : 'text-chalk/50'}`}>
          {t(player.gender === 'male' ? 'genderMmp' : 'genderFmp')}
        </span>
      )}
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

/**
 * Same chip row, but any number of players can be active at once — each tap
 * toggles just that one chip in or out of `selected`, rather than replacing a
 * single answer. Used where more than one person can be attributed to the
 * same event (e.g. an injury involving several players).
 */
export function PlayerMultiPicker({
  players,
  selected,
  showGender,
  groupByGender,
  onToggle,
  onRemove,
}: {
  players: PlayerInfo[];
  selected: string[];
  /** Shows each player's MMP/FMP marking on their chip — see `PlayerChip`. */
  showGender?: boolean;
  /**
   * Splits the chips into FMP / MMP / unmarked rows, each in shirt-number order.
   *
   * Opt-in, and only the two line dialogs ask for it: picking a line means picking
   * against a split, so the markings are what is being counted. Everywhere else the
   * question is "which player", and a grouped row would be sorting the roster by
   * something the volunteer is not thinking about.
   */
  groupByGender?: boolean;
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const { t } = useT();
  if (players.length === 0) return null;

  const chip = (p: PlayerInfo, marking?: boolean) => (
    <PlayerChip
      key={p.id}
      player={p}
      active={selected.includes(p.id)}
      showGender={marking}
      onSelect={() => onToggle(p.id)}
      onRemove={onRemove}
    />
  );

  const groups = groupByGender ? genderGroups(players) : null;
  // One group is no grouping at all — an unmarked roster, or a picker already narrowed
  // to a single marking — so it renders as the plain row it always was (in number
  // order still), and the chip keeps carrying the marking since no label is there to
  // say it.
  if (!groups || groups.length < 2) {
    const row = groups?.[0].players ?? players;
    return <div className="flex flex-wrap gap-2">{row.map((p) => chip(p, showGender))}</div>;
  }

  return (
    <div className="space-y-1.5">
      {groups.map((group) => (
        <div key={group.gender ?? 'none'} className="space-y-1">
          {/* A hairline label rather than a gap: the sections have to read as separate
              without pushing the roster off a phone screen. It also makes the chips'
              own marking suffix redundant, so it is dropped inside a group. */}
          <p className="text-[10px] uppercase tracking-wide text-chalk/40">
            {group.gender === null
              ? t('genderUnmarked')
              : t(group.gender === 'male' ? 'genderMmp' : 'genderFmp')}
          </p>
          <div className="flex flex-wrap gap-2">{group.players.map((p) => chip(p))}</div>
        </div>
      ))}
    </div>
  );
}
