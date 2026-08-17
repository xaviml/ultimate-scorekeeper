import type { TFunc } from '../i18n/useT';
import type { PlayerStatLine } from '../state/stats';
import { type PlayerStatColumn, statCellText } from './playerStatColumns';

/**
 * The player table, driven entirely by props: which lines, which columns, and whether
 * to mark each row with its team's colour.
 *
 * It owns no state and reads no context, so the report can hand it a different column
 * set per view and the dashboard can reuse it later without inheriting the report's
 * filters. The order of `lines` is the caller's decision too (see
 * `sortPlayerStatLines`), which is what keeps the screen, the copied text and the
 * shared image from disagreeing about who is at the top.
 */
export function PlayerStatsTable({
  lines,
  columns,
  teamColor,
  t,
}: {
  lines: PlayerStatLine[];
  columns: PlayerStatColumn[];
  /** Renders a colour dot before each name. Omitted when only one team is listed. */
  teamColor?: (line: PlayerStatLine) => string;
  t: TFunc;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-chalk/50 text-left">
          <th className="py-1">{t('colPlayer')}</th>
          {columns.map((c) => (
            <th
              key={String(c.key)}
              className="py-1 text-right"
              title={c.full ? t(c.full) : undefined}
            >
              {t(c.key)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lines.map((p) => (
          <tr
            key={`${p.team}:${p.playerId}`}
            // The aggregate names nobody, so it is dimmed rather than reading as
            // a player who happened to be called "Not recorded".
            className={`border-t border-line/50 ${p.unassigned ? 'text-chalk/50 italic' : ''}`}
          >
            <td className="py-1.5">
              {teamColor && (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                  style={{ backgroundColor: teamColor(p) }}
                />
              )}
              {p.label}
            </td>
            {columns.map((c) => (
              <td key={String(c.key)} className="py-1.5 text-right font-clock">
                {statCellText(c, p)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
