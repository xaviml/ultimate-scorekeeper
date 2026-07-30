import { useState } from 'react';
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
  const [flash, setFlash] = useState<string | null>(null);
  // The log is readable at every moment of a game, but a note can only be written
  // during one — before the first pull and after the final goal there is nothing
  // for it to belong to. Stays tappable rather than going quietly dead, same as
  // every other blocked action elsewhere in the app: tapping it flashes why.
  const tryAdd = () => {
    const check = canRecordEvent(state, { allowDuringBreaks: true });
    if (!check.ok) {
      setFlash(check.reason ?? null);
      setTimeout(() => setFlash(null), 1800);
      return;
    }
    onAddEvent();
  };
  return (
    <Modal
      title={t('historyTitle')}
      onClose={onClose}
      showClose
      headerAction={
        <button
          className="flex items-center gap-1.5 rounded-lg bg-pitch border border-line px-2 py-1.5 text-[11px] font-board uppercase tracking-wide text-chalk active:scale-95"
          onClick={tryAdd}
          aria-label={t('btnNote')}
        >
          <AddEventIcon size="w-4 h-4" />
          {t('btnNote')}
        </button>
      }
    >
      {flash && <p className="text-xs text-signal">{t(`assist_blocked_${flash}` as never)}</p>}
      {/* Editable here and nowhere else: this is the log of a game still being
          played, which is when a mis-tap is worth going back and fixing. */}
      <GameLogTable order="desc" editable />
    </Modal>
  );
}
