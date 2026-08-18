import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { canDeleteLogEntry, logEditKind } from '../state/gameReducer';
import { logRow } from '../state/stats';
import type { LogEntry } from '../state/types';
import { BinIcon, PencilIcon } from './icons';
import { LogEditDialog } from './LogEditDialog';

/**
 * The event history table, shared by the in-game log dialog and the end-of-game
 * report. The dialog shows newest-first (the volunteer wants the last event); the
 * report reads chronologically.
 *
 * Only the game clock is shown, not the time of day: a volunteer looking for an
 * event thinks in "twelve minutes in", and the report still prints the real start
 * and finish times at the top (the entries keep their `wallClock` for it).
 *
 * `editable` adds the actions column, and belongs to the in-game dialog only — the
 * report is a record of a finished game, and "delete the newest entry" has nothing
 * left to mean once the final whistle has gone.
 *
 * `entries` narrows what is listed to a subset of the log — the report's history
 * leaves the turnovers and the calls out (see `reportLogEntries`). It is still
 * `state.log` that the rows are rendered from, so an entry looks the same
 * wherever it appears.
 */
export function GameLogTable({
  order = 'asc',
  editable = false,
  entries: source,
}: {
  order?: 'asc' | 'desc';
  editable?: boolean;
  entries?: LogEntry[];
}) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const [editing, setEditing] = useState<number | null>(null);
  const listed = source ?? state.log;
  const entries = order === 'desc' ? [...listed].reverse() : listed;
  const editingEntry = state.log.find((e) => e.id === editing);

  return (
    <>
      <table className="w-full text-xs sm:text-sm">
        <thead className="text-chalk/50 text-left">
          <tr>
            <th className="py-1 pr-2">{t('colClock')}</th>
            <th className="py-1 pr-2">{t('colEvent')}</th>
            <th className="py-1">{t('colDetail')}</th>
            {/* The column has no visible heading — two icons need no caption, and the
                log is tight enough on a phone — but it still needs a name read aloud. */}
            {editable && (
              <th className="py-1">
                <span className="sr-only">{t('colActions')}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            // The same three columns the shared image paints — see `logRow`.
            const row = logRow(state, e, t);
            return (
              <tr key={e.id} className="border-t border-line/50">
                <td className="py-1 pr-2 font-clock whitespace-nowrap">{row.clock}</td>
                <td className="py-1 pr-2">{row.event}</td>
                <td className="py-1 text-chalk/60">{row.detail}</td>
                {editable && (
                  <td className="py-1 pl-1">
                    <div className="flex items-center justify-end gap-0.5">
                      {logEditKind(state, e) !== null && (
                        <RowButton label={t('btnEditEntry')} onClick={() => setEditing(e.id)}>
                          <PencilIcon size="w-4 h-4" />
                        </RowButton>
                      )}
                      {canDeleteLogEntry(state, e) && (
                        <RowButton
                          label={t('btnDeleteEntry')}
                          onClick={() => dispatch({ type: 'DELETE_LOG_ENTRY', id: e.id })}
                        >
                          <BinIcon size="w-4 h-4" />
                        </RowButton>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {editingEntry && <LogEditDialog entry={editingEntry} onClose={() => setEditing(null)} />}
    </>
  );
}

/**
 * One action on a log row: a 16px glyph in a 32px tap target, so the row stays as
 * dense as it was while the button is still a thumb-sized thing to hit.
 */
function RowButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="p-2 -my-1 text-chalk/60 active:scale-90"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
