import { useState } from 'react';
import { useT } from '../i18n/useT';
import { AppMenu } from './AppMenu';
import { ArrowBackIcon, MenuIcon } from './icons';

/**
 * The header every page opened from somewhere else carries — the report, match
 * history and the guides: a back arrow, the page's title, and the app menu in the
 * corner the setup and game screens keep theirs in. The arrow is a bare glyph; its
 * name (`backLabel`) is what a screen reader hears and what the tests press, since
 * "back" means a different place from each page ("Back to the game", "Back").
 *
 * It sits across the top of the page and stays there while the page scrolls, so the
 * way back is never a scroll away on a long report.
 */
export function PageHeader({
  title,
  backLabel,
  onBack,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
}) {
  const { t } = useT();
  const [menu, setMenu] = useState(false);
  return (
    <>
      <header
        data-page-header
        className="sticky top-0 z-20 -mx-4 -mt-4 mb-4 flex items-center gap-2 border-b border-line bg-panel px-2 py-1.5"
      >
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          title={backLabel}
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-md text-chalk active:scale-95"
        >
          <ArrowBackIcon size="w-5 h-5" />
        </button>
        <h1 className="flex-1 min-w-0 truncate font-board font-semibold uppercase tracking-wide text-sm">
          {title}
        </h1>
        <button
          type="button"
          onClick={() => setMenu(true)}
          aria-label={t('menuTitle')}
          title={t('menuTitle')}
          className="shrink-0 mr-1 flex items-center justify-center w-8 h-8 rounded-md bg-panel border border-line text-chalk/70 active:scale-95"
        >
          <MenuIcon size="w-5 h-5" />
        </button>
      </header>
      <AppMenu open={menu} onClose={() => setMenu(false)} />
    </>
  );
}
