import { useT } from '../i18n/useT';
import { useGame } from '../state/gameHooks';
import { formatClock, goalPlayersDetail, turnoverPlayersDetail } from '../state/stats';

/**
 * The event history table, shared by the in-game log dialog and the end-of-game
 * report. The dialog shows newest-first (the volunteer wants the last event);
 * the report reads chronologically.
 */
export function GameLogTable({ order = 'asc' }: { order?: 'asc' | 'desc' }) {
  const state = useGame();
  const { t } = useT();
  const entries = order === 'desc' ? [...state.log].reverse() : state.log;

  return (
    <table className="w-full text-xs sm:text-sm">
      <thead className="text-chalk/50 text-left">
        <tr>
          <th className="py-1 pr-2">{t('colTime')}</th>
          <th className="py-1 pr-2">{t('colClock')}</th>
          <th className="py-1 pr-2">{t('colEvent')}</th>
          <th className="py-1">{t('colDetail')}</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} className="border-t border-line/50">
            <td className="py-1 pr-2 font-clock whitespace-nowrap">{e.wallClock}</td>
            <td className="py-1 pr-2 font-clock">{formatClock(e.gameSeconds)}</td>
            <td className="py-1 pr-2">
              {t(`event_${e.type}` as never)}
              {e.team ? ` — ${state.config.teams[e.team].name}` : ''}
            </td>
            <td className="py-1 text-chalk/60">
              {e.detail ?? ''}
              {goalPlayersDetail(state, e, t)}
              {turnoverPlayersDetail(state, e, t)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
