import { useT } from '../i18n/useT';
import { Modal } from './Modal';
import { primaryButton, secondaryButton } from './ui';

export function ConfirmRemovePlayerDialog({
  name,
  team,
  note,
  onConfirm,
  onCancel,
}: {
  name: string;
  team: string;
  /** A second line under the question, for what removing means where this editor is. */
  note?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  return (
    <Modal title={t('confirmRemovePlayerTitle')} onClose={onCancel} size="sm">
      <p className="text-sm text-chalk/80">{t('confirmRemovePlayer', { name, team })}</p>
      {note && <p className="text-xs text-chalk/50">{note}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button className={secondaryButton} onClick={onCancel}>
          {t('btnCancel')}
        </button>
        <button className={primaryButton} onClick={onConfirm}>
          {t('btnRemovePlayer')}
        </button>
      </div>
    </Modal>
  );
}
