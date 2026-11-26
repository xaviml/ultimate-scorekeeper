import type { ReactNode } from 'react';
import { ChevronRightIcon } from './icons';

/**
 * One destination in a header menu, shared by the game screen's menu and the
 * config screen's. The two hold different doors but are the same control, and a
 * volunteer who has learnt one should recognise the other.
 *
 * A row of a ruled list — icon, label, chevron — rather than a boxed button.
 *
 * Menu rows are a comfortable dialog control, not a dashboard glyph, so they skip
 * the action row's `lscape:` shrink — which is why the icon size lives here rather
 * than at each call site.
 */
export const MENU_ICON = 'w-5 h-5';

export function MenuRow({
  icon,
  label,
  onClick,
  primary = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  /** Filled in the accent: the one row a menu leads with ("Start new game"). */
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      data-menu-row
      data-menu-primary={primary || undefined}
      className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left font-board active:scale-[0.99] ${
        primary ? 'border-accent bg-accent text-panel font-semibold' : 'border-line bg-pitch'
      }`}
      onClick={onClick}
    >
      <span className={`shrink-0 ${primary ? 'text-panel' : 'text-accent'}`}>{icon}</span>
      <span className="min-w-0 flex-1">{label}</span>
      <ChevronRightIcon size={`shrink-0 w-4 h-4 ${primary ? 'text-panel/70' : 'text-chalk/40'}`} />
    </button>
  );
}
