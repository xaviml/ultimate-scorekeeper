import { useT } from '../i18n/useT';
import { Modal } from './Modal';
import { primaryButton, secondaryButton } from './ui';

/**
 * Deleting a game out of the archive — the same shape as deleting a saved team,
 * because it is the same kind of act: a small cross next to a row, and one
 * question before something on this device is gone for good.
 */
export function ConfirmDeleteGameDialog({
  match,
  onConfirm,
  onCancel,
}: {
  /** "Ravens 15 — 12 Foxes", so the dialog names the game rather than "this game". */
  match: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  return (
    <Modal title={t('confirmDeleteGameTitle')} onClose={onCancel} size="sm">
      <p className="text-sm text-chalk/80">{t('confirmDeleteGame', { match })}</p>
      <div className="grid grid-cols-2 gap-3">
        <button className={secondaryButton} onClick={onCancel}>
          {t('btnCancel')}
        </button>
        <button className={primaryButton} onClick={onConfirm}>
          {t('btnDeleteGame')}
        </button>
      </div>
    </Modal>
  );
}
