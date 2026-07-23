import { useT } from '../i18n/useT';
import { Modal } from './Modal';
import { primaryButton, secondaryButton } from './ui';

export function ConfirmLeaveGameDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  return (
    <Modal title={t('confirmLeaveGameTitle')} onClose={onCancel} size="sm">
      <p className="text-sm text-chalk/80">{t('confirmLeaveGame')}</p>
      <div className="grid grid-cols-2 gap-3">
        <button className={secondaryButton} onClick={onCancel}>
          {t('btnCancel')}
        </button>
        <button className={primaryButton} onClick={onConfirm}>
          {t('btnLeaveGameConfirm')}
        </button>
      </div>
    </Modal>
  );
}
