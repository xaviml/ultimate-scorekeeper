import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGameDispatch } from '../state/gameHooks';
import type { LogEntry } from '../state/types';
import { Modal } from './Modal';
import { inputClass, primaryButton, secondaryButton } from './ui';

/**
 * Free-text note: anything worth remembering that no other button covers — a huge
 * layout, a dragon on the field. It lands in the log and nowhere else; unlike every
 * other recorded event it produces no call-out and no hand signal.
 *
 * `entry` reopens a note already written, from the log's pencil — the same box with
 * the same words in it, since rewording a note is the whole of "editing" one.
 */
export function NoteDialog({ onClose, entry }: { onClose: () => void; entry?: LogEntry }) {
  const dispatch = useGameDispatch();
  const { t } = useT();
  const [text, setText] = useState(entry?.detail ?? '');

  const save = () => {
    dispatch(
      entry
        ? { type: 'EDIT_LOG_ENTRY', id: entry.id, edit: { kind: 'note', text } }
        : { type: 'NOTE', text },
    );
    onClose();
  };

  return (
    <Modal title={t('noteTitle')} onClose={onClose} size="sm">
      <p className="text-xs text-chalk/50">{t('noteHint')}</p>

      <input
        className={inputClass}
        value={text}
        autoFocus
        placeholder={t('notePlaceholder')}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && text.trim()) save();
        }}
      />

      <div className="grid grid-cols-2 gap-3">
        <button className={secondaryButton} onClick={onClose}>
          {t('btnCancel')}
        </button>
        <button className={primaryButton} disabled={!text.trim()} onClick={save}>
          {t('btnSave')}
        </button>
      </div>
    </Modal>
  );
}
