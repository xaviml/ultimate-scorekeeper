import { useT } from '../i18n/useT';
import { usePlayerSort } from '../hooks/usePlayerSort';
import { genderGroups, sortPlayers } from '../state/lines';
import { playerLabel } from '../state/stats';
import type { PlayerInfo } from '../state/types';
import { savePlayerSort } from '../state/uiPreferences';

function PlayerChip({
  player,
  active,
  showGender,
  onSelect,
}: {
  player: PlayerInfo;
  active: boolean;
  showGender?: boolean;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useT();
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={playerLabel(player)}
      className={`inline-flex items-center gap-1.5 max-w-full rounded-full border px-3 py-1.5 text-sm leading-tight active:scale-95 ${
        active ? 'bg-signal text-pitch border-signal' : 'bg-pitch border-line text-chalk'
      }`}
      onClick={() => onSelect(active ? null : player.id)}
    >
      {/* One line, number first in yellow: the number is what a volunteer reads off a
          back across the field, so it leads and never truncates; the name takes what
          is left of the cell and ellipsises rather than wrapping it taller than its
          neighbours. Centred rather than baseline-aligned, so a name sits at the same
          height in a cell with no number as in one with. */}
      {player.number && (
        <span
          className={`relative top-px font-clock font-semibold shrink-0 ${active ? '' : 'text-signal'}`}
        >
          #{player.number}
        </span>
      )}
      {player.name && <span className="truncate min-w-0">{player.name}</span>}
      {/* The marking rides on the chip rather than in a legend, because the one place
          it matters is while a line is being picked against a split — reading it off
          somewhere else would mean counting twice. */}
      {showGender && player.gender && (
        <span
          className={`ml-auto shrink-0 text-[10px] font-board ${active ? 'opacity-70' : 'text-chalk/50'}`}
        >
          {t(player.gender === 'male' ? 'genderMmp' : 'genderFmp')}
        </span>
      )}
    </button>
  );
}

/**
 * The cells every picker lays out: a grid of equal columns — two on a phone —
 * rather than a wrapping row of chips, so a player sits in the same place every time
 * the dialog opens instead of moving with the length of the names before them.
 */
const GRID = 'flex flex-wrap gap-2';

/**
 * The device's player order, as a two-way switch for a dialog's header. One switch
 * per dialog rather than per picker: it changes every picker on screen at once (see
 * `usePlayerSort`), so two sections asking about two rosters share it.
 */
export function PlayerSortToggle() {
  const { t } = useT();
  const sort = usePlayerSort();
  const next = sort === 'number' ? 'name' : 'number';
  return (
    <button
      type="button"
      className="rounded-md border border-line px-2 py-1 text-[11px] font-board text-chalk/70"
      aria-label={t('playerSortAria', {
        order: t(next === 'name' ? 'playerSortName' : 'playerSortNumber'),
      })}
      onClick={() => savePlayerSort(next)}
    >
      {sort === 'number' ? '# 1–9' : 'A–Z'}
    </button>
  );
}

/**
 * A grid of selectable player cells, in the device's order (by number or by name,
 * see `PlayerSortToggle`). Tapping the active cell clears the selection, so a
 * mis-tap is undone with a second tap rather than needing a separate "none"
 * affordance.
 *
 * A cell only ever selects. Removing a player is a roster edit, and it lives in
 * the roster editor behind a confirmation: a cell is pressed dozens of times a
 * game, often hesitantly, and a hold that deleted someone mid-game was far too
 * easy to trigger by accident.
 */
export function PlayerPicker({
  players,
  selected,
  onSelect,
}: {
  players: PlayerInfo[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const sort = usePlayerSort();
  if (players.length === 0) return null;
  return (
    <div className={GRID}>
      {sortPlayers(players, sort).map((p) => (
        <PlayerChip key={p.id} player={p} active={selected === p.id} onSelect={onSelect} />
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
}) {
  const { t } = useT();
  const sort = usePlayerSort();
  if (players.length === 0) return null;

  const chip = (p: PlayerInfo, marking?: boolean) => (
    <PlayerChip
      key={p.id}
      player={p}
      active={selected.includes(p.id)}
      showGender={marking}
      onSelect={() => onToggle(p.id)}
    />
  );

  const groups = groupByGender ? genderGroups(players, sort) : null;
  // One group is no grouping at all — an unmarked roster, or a picker already narrowed
  // to a single marking — so it renders as the plain row it always was (in number
  // order still), and the chip keeps carrying the marking since no label is there to
  // say it.
  if (!groups || groups.length < 2) {
    const row = groups?.[0].players ?? sortPlayers(players, sort);
    return <div className={GRID}>{row.map((p) => chip(p, showGender))}</div>;
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
          <div className={GRID}>{group.players.map((p) => chip(p))}</div>
        </div>
      ))}
    </div>
  );
}
