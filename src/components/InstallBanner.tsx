import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame } from '../state/gameHooks';
import { usePwaInstall } from '../hooks/usePwaInstall';

const DISMISSED_KEY_PREFIX = 'ultimate-scorekeeper:install-banner-dismissed:';

export function InstallBanner() {
  const { t } = useT();
  const state = useGame();
  const status = usePwaInstall();
  // Keyed by kind so dismissing the "install" banner doesn't also hide a later,
  // different "open the app" banner (or vice versa) for the rest of the tab session.
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISSED_KEY_PREFIX + status.kind) === '1',
  );

  // The game screen has no vertical room to spare (see the lscape landscape layout) —
  // the banner only ever shows on the config/report screens either side of play.
  if (state.phase === 'game') return null;
  if (status.kind === 'none' || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY_PREFIX + status.kind, '1');
    setDismissed(true);
  };

  const title =
    status.kind === 'already-installed' ? t('installBannerOpenTitle') : t('installBannerTitle');
  const body =
    status.kind === 'already-installed'
      ? t('installBannerOpenBody')
      : status.kind === 'ios-instructions'
        ? t('installBannerIosBody')
        : t('installBannerBody');

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-panel border-b border-line text-sm">
      <span className="text-xl shrink-0" aria-hidden="true">
        📲
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-board text-signal leading-tight">{title}</p>
        <p className="text-chalk/70 text-xs leading-tight truncate">{body}</p>
      </div>
      {status.kind === 'installable' && (
        <button
          className="rounded-lg bg-signal text-pitch font-board font-bold px-3 py-1.5 shrink-0 active:scale-95"
          onClick={status.install}
        >
          {t('btnInstall')}
        </button>
      )}
      <button
        className="text-chalk/60 px-1 shrink-0"
        onClick={dismiss}
        aria-label={t('dismissBanner')}
      >
        ✕
      </button>
    </div>
  );
}
