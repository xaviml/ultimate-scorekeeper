import type { ReactNode } from 'react';

/**
 * One destination in a header menu, shared by the game screen's menu and the
 * config screen's. The two hold different doors but are the same control, and a
 * volunteer who has learnt one should recognise the other.
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
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 rounded-xl border border-line bg-pitch px-4 py-3 text-left font-board active:scale-[0.99]"
      onClick={onClick}
    >
      <span className="shrink-0 text-chalk/70">{icon}</span>
      <span className="min-w-0">{label}</span>
    </button>
  );
}
