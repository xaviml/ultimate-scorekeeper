import { useT } from '../i18n/useT';
import { useGame } from '../state/gameHooks';
import { canRecordEvent } from '../state/gameReducer';
import { GameLogTable } from './GameLogTable';
import { AddEventIcon } from './icons';
import { Modal } from './Modal';

/**
 * The game log, plus the one control that writes to it by hand: a free-text
 * event. It sits in the header next to the ✕ rather than on the dashboard,
 * because it is the only recorded thing that is never urgent and never about the
 * play — and this is where what it writes ends up.
 *
 * `onAddEvent` closes this dialog before opening the note one, so the two never
 * stack: the log is what you were reading, not something to come back to.
 */
export function GameLog({ onClose, onAddEvent }: { onClose: () => void; onAddEvent: () => void }) {
  const state = useGame();
  const { t } = useT();
  // The log is readable at every moment of a game, but a note can only be written
  // during one — before the first pull and after the final goal there is nothing
  // for it to belong to. Disabled rather than left to fail in the reducer, so the
  // volunteer never types a note into a dialog that then throws it away.
  const canAdd = canRecordEvent(state, { allowDuringBreaks: true }).ok;
  return (
    <Modal
      title={t('historyTitle')}
      onClose={onClose}
      showClose
      headerAction={
        <button
          className="flex items-center gap-1.5 rounded-lg bg-pitch border border-line px-2 py-1.5 text-[11px] font-board uppercase tracking-wide text-chalk active:scale-95 disabled:opacity-40"
          onClick={onAddEvent}
          disabled={!canAdd}
          aria-label={t('btnNote')}
        >
          <AddEventIcon size="w-4 h-4" />
          {t('btnNote')}
        </button>
      }
    >
      <GameLogTable order="desc" />
    </Modal>
  );
}
