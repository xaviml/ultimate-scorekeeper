import { useT } from '../i18n/useT';
import { Modal } from './Modal';
import { secondaryButton } from './ui';

const GITHUB_URL = 'https://github.com/xaviml/ultimate-scorekeeper';
const EGARA_INSTAGRAM_URL = 'https://www.instagram.com/egara_ultimate/';
const EUC_INSTAGRAM_URL = 'https://www.instagram.com/esperitultimate/';

export function AboutDialog({ onClose }: { onClose: () => void }) {
  const { t } = useT();

  return (
    <Modal title={t('aboutTitle')} onClose={onClose} size="sm">
      <p className="text-sm text-chalk/80">
        {t('aboutDesignedByPrefix')}
        <a
          className="text-signal underline"
          href={EGARA_INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Egara
        </a>
        {t('aboutDesignedBySuffix')}
      </p>
      <p className="text-sm text-chalk/80">
        {t('aboutBasedOnPrefix')}
        <a
          className="text-signal underline"
          href={EUC_INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          EUC
        </a>
        {t('aboutBasedOnSuffix')}
      </p>
      <p className="text-sm text-chalk/80">
        {t('aboutQuestion')}{' '}
        <a
          className="text-signal underline"
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {GITHUB_URL}
        </a>
      </p>
      <button className={`w-full ${secondaryButton}`} onClick={onClose}>
        {t('close')}
      </button>
    </Modal>
  );
}
