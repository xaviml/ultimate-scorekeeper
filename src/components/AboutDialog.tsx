import { useT } from '../i18n/useT';
import { Modal } from './Modal';
import { secondaryButton } from './ui';

const GITHUB_URL = 'https://github.com/xaviml/ultimate-scorekeeper';
const EGARA_INSTAGRAM_URL = 'https://www.instagram.com/egara_ultimate/';
const EUC_INSTAGRAM_URL = 'https://www.instagram.com/esperitultimate/';
const ANDROID_APP_URL =
  'https://drive.google.com/drive/folders/1Lv4nCXj7OqDujP_-CTq2KtC1_JTNzCcN?usp=drive_link';

export function AboutDialog({ onClose }: { onClose: () => void }) {
  const { t } = useT();

  return (
    <Modal title={t('aboutTitle')} onClose={onClose} size="sm">
      <div>
        <p className="text-sm text-chalk/80 text-justify">
          <strong>{t('aboutStoryBold')}</strong>
          {t('aboutStory')}
          {t('aboutStory2')}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-chalk/60">{t('aboutCreditsLabel')}</p>
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
        <p className="text-sm text-chalk/80 mt-2">
          {t('aboutBasedOnPrefix')}
          <a
            className="text-signal underline"
            href={ANDROID_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ultimate Score&amp;timekeeper assistant
          </a>
          {t('aboutBasedOnMiddle')}
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
      </div>
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
