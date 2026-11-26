import { useT } from '../i18n/useT';
import { genderGroups, sortPlayers } from '../state/lines';
import { sortByRest, type LineRotation, type StripMark } from '../state/rotation';
import { playerLabel } from '../state/stats';
import type { PlayerInfo } from '../state/types';

export type LineSheetOrder = 'number' | 'name' | 'rest';

/** Name, Pts, strip, Hold, Brk — plus Turns and Ds when the game names them. */
const COLUMNS = 'grid-cols-[minmax(0,1fr)_1.5rem_34px_2rem_2rem]';
const COLUMNS_POSSESSION = 'grid-cols-[minmax(0,1fr)_1.5rem_34px_2rem_2rem_1.25rem_1.25rem]';

/**
 * The line dialog's roster: one row per player with what a coach weighs while picking
 * the next seven — points played, the last few points as a strip (who is fresh, who
 * has been on for a run, and how those points went), holds on offence, breaks on
 * defence, and the turns and Ds when the game names them.
 *
 * Rows rather than the chips every other picker uses, because these figures need
 * columns to be compared down; the cost is a taller list, which this dialog — the one
 * place the roster is read rather than searched — can afford. The whole row is the
 * tap target and toggles the player, exactly as a chip did, and it keeps the chip's
 * `aria-label` (`playerLabel`).
 *
 * `side` highlights the column that matters for the point being picked: Hold for an
 * offence point, Brk for a defence one. Null when that is not known yet — the next
 * point's side depends on who scores this one — and both then read the same.
 */
export function LineSheet({
  players,
  selected,
  rotation,
  order,
  side,
  showGender,
  onToggle,
}: {
  players: PlayerInfo[];
  selected: string[];
  rotation: LineRotation;
  order: LineSheetOrder;
  side: 'O' | 'D' | null;
  showGender?: boolean;
  onToggle: (id: string) => void;
}) {
  const { t } = useT();
  if (players.length === 0) return null;

  const cols = rotation.possession ? COLUMNS_POSSESSION : COLUMNS;
  const arrange = (list: PlayerInfo[]) =>
    order === 'rest' ? sortByRest(list, rotation) : sortPlayers(list, order);
  const groups = genderGroups(players).map((g) => ({ ...g, players: arrange(g.players) }));

  const row = (p: PlayerInfo, marking?: boolean) => (
    <SheetRow
      key={p.id}
      player={p}
      cols={cols}
      active={selected.includes(p.id)}
      rotation={rotation}
      side={side}
      marking={marking}
      onToggle={onToggle}
    />
  );

  const header = (
    <div
      className={`grid ${cols} gap-x-1.5 px-2 text-[10px] uppercase tracking-wide text-chalk/50`}
      aria-hidden
    >
      <span />
      <span className="text-right" title={t('lineColPointsFull')}>
        {t('lineColPoints')}
      </span>
      <span className="text-center" title={t('lineColLastFull')}>
        {t('lineColLast')}
      </span>
      <span
        className={`text-right ${side === 'O' ? 'text-accent' : ''}`}
        title={t('lineColHoldFull')}
      >
        {t('lineColHold')}
      </span>
      <span
        className={`text-right ${side === 'D' ? 'text-accent' : ''}`}
        title={t('lineColBreakFull')}
      >
        {t('lineColBreak')}
      </span>
      {rotation.possession && (
        <>
          <span className="text-right" title={t('lineColTurnsFull')}>
            {t('lineColTurns')}
          </span>
          <span className="text-right" title={t('lineColDefensesFull')}>
            {t('lineColDefenses')}
          </span>
        </>
      )}
    </div>
  );

  // One group is no grouping at all, as in `PlayerMultiPicker`: the rows carry their
  // own marking since no label is there to say it.
  if (groups.length < 2) {
    return (
      <div className="space-y-1" data-line-sheet>
        {header}
        {(groups[0]?.players ?? arrange(players)).map((p) => row(p, showGender))}
      </div>
    );
  }

  return (
    <div className="space-y-1" data-line-sheet>
      {header}
      {groups.map((group) => (
        <div key={group.gender ?? 'none'} className="space-y-1">
          <p className="pt-1 text-[10px] uppercase tracking-wide text-chalk/40">
            {group.gender === null
              ? t('genderUnmarked')
              : t(group.gender === 'male' ? 'genderMmp' : 'genderFmp')}
          </p>
          {group.players.map((p) => row(p))}
        </div>
      ))}
    </div>
  );
}

function SheetRow({
  player,
  cols,
  active,
  rotation,
  side,
  marking,
  onToggle,
}: {
  player: PlayerInfo;
  cols: string;
  active: boolean;
  rotation: LineRotation;
  side: 'O' | 'D' | null;
  marking?: boolean;
  onToggle: (id: string) => void;
}) {
  const { t } = useT();
  const r = rotation.players.get(player.id);
  // A selected row is filled in the accent, like a picked chip in every other
  // player picker, so its figures switch to the surface colour.
  const dim = (col: 'O' | 'D') =>
    side && side !== col ? (active ? 'text-panel/50' : 'text-chalk/40') : '';
  const ratio = (made: number, of: number) => (of > 0 ? `${made}/${of}` : '—');

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={playerLabel(player)}
      data-line-row={player.id}
      data-rest={r?.rest ?? 'none'}
      className={`grid ${cols} w-full items-center gap-x-1.5 rounded border px-2 py-1.5 text-left text-sm leading-tight active:scale-[0.99] ${
        active ? 'bg-accent border-accent text-panel' : 'bg-pitch border-line'
      }`}
      onClick={() => onToggle(player.id)}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {player.number && (
          <span
            className={`relative top-px shrink-0 font-clock font-semibold ${active ? 'text-panel' : 'text-accent'}`}
          >
            #{player.number}
          </span>
        )}
        {player.name && (
          <span className={`truncate min-w-0 ${active ? 'font-semibold' : ''}`}>{player.name}</span>
        )}
        {marking && player.gender && (
          <span
            className={`shrink-0 text-[10px] font-board ${active ? 'text-panel/70' : 'text-chalk/50'}`}
          >
            {t(player.gender === 'male' ? 'genderMmp' : 'genderFmp')}
          </span>
        )}
      </span>
      <span className="text-right font-clock text-xs" data-points>
        {r?.played ?? 0}
      </span>
      <Strip marks={r?.strip ?? []} maxSeconds={rotation.maxSeconds} onFill={active} />
      <span className={`text-right font-clock text-xs ${dim('O')}`} data-holds>
        {ratio(r?.holds ?? 0, r?.oPlayed ?? 0)}
      </span>
      <span className={`text-right font-clock text-xs ${dim('D')}`} data-breaks>
        {ratio(r?.breaks ?? 0, r?.dPlayed ?? 0)}
      </span>
      {rotation.possession && (
        <>
          <span className="text-right font-clock text-xs" data-turns>
            {r?.turns ?? 0}
          </span>
          <span className="text-right font-clock text-xs" data-defenses>
            {r?.defenses ?? 0}
          </span>
        </>
      )}
    </button>
  );
}

/** A mark's one-letter code, for tests: P played, - sat out, ? unknown, * in progress. */
const CODE: Record<StripMark['kind'], (m: StripMark) => string> = {
  played: () => 'P',
  out: () => '-',
  unknown: () => '?',
  pending: () => '*',
};

/**
 * The last few points, oldest on the left. A bar is a point played — its height the
 * point's length against the longest in view, amber when the team scored it — and a
 * dot at the foot a point sat out. A point with no line registered leaves its slot
 * empty: nobody knows, and a dot would claim a rest that may not have happened. The
 * point being played, while the next line is picked, is an outline at full height.
 */
function Strip({
  marks,
  maxSeconds,
  onFill,
}: {
  marks: (StripMark | null)[];
  maxSeconds: number;
  /** Drawn on a selected (accent-filled) row, so in the surface colour. */
  onFill: boolean;
}) {
  return (
    <span
      className="flex h-4 items-end justify-center gap-[2px]"
      aria-hidden
      data-strip={marks.map((m) => (m ? CODE[m.kind](m) : '.')).join('')}
    >
      {marks.map((m, i) => {
        if (!m || m.kind === 'unknown') return <span key={i} className="w-1" />;
        if (m.kind === 'out')
          return (
            <span
              key={i}
              className={`h-1 w-1 rounded-full ${onFill ? 'bg-panel/40' : 'bg-chalk/25'}`}
            />
          );
        if (m.kind === 'pending')
          return (
            <span
              key={i}
              className={`h-full w-1 rounded-sm border ${onFill ? 'border-panel/70' : 'border-chalk/60'}`}
            />
          );
        const pct = maxSeconds > 0 ? Math.max(30, (m.seconds / maxSeconds) * 100) : 100;
        return (
          <span
            key={i}
            className={`w-1 rounded-sm ${onFill ? 'bg-panel' : 'bg-accent'}`}
            style={{ height: `${pct}%` }}
          />
        );
      })}
    </span>
  );
}
