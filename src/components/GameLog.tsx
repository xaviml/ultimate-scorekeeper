import { useT } from '../i18n/useT';
import { GameLogTable } from './GameLogTable';
import { Modal } from './Modal';

export function GameLog({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  return (
    <Modal title={t('historyTitle')} onClose={onClose} showClose>
      <GameLogTable order="desc" />
    </Modal>
  );
}
