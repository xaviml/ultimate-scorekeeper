import type { ReactNode } from 'react';
import { useT } from '../i18n/useT';
import { ArrowBackIcon, CrossIcon, GuideIcon, ReportIcon, SetupIcon } from './icons';
import { Modal } from './Modal';

/** Which door off the game screen this game's status offers — see GameScreen's header. */
export type LeaveKind = 'backToSetup' | 'endGame' | 'openReport';

// Menu rows are a comfortable dialog control, not a dashboard glyph, so they skip
// the action row's `lscape:` shrink.
const ICON = 'w-5 h-5';

const LEAVE = {
  backToSetup: { Icon: ArrowBackIcon, labelKey: 'btnBackToSetup' },
  endGame: { Icon: CrossIcon, labelKey: 'btnEndGame' },
  openReport: { Icon: ReportIcon, labelKey: 'openReport' },
} as const;

function MenuRow({
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

/**
 * The header menu, and the only way off the game screen.
 *
 * It replaced a single header button that changed both its glyph and its
 * destination with the game's status, so what it did was legible only after
 * pressing it. The leave row still varies — that part is genuinely per-status —
 * but it now says where it goes in words, and the two read-only surfaces sit
 * above it. The guide in particular had no door at all once a game was under
 * way, which is exactly when a volunteer discovers they need it.
 */
export function GameMenuDialog({
  leave,
  onClose,
  onSetup,
  onGuide,
  onLeave,
}: {
  leave: LeaveKind;
  onClose: () => void;
  onSetup: () => void;
  onGuide: () => void;
  onLeave: () => void;
}) {
  const { t } = useT();
  const { Icon, labelKey } = LEAVE[leave];

  return (
    <Modal title={t('menuTitle')} onClose={onClose} size="sm" showClose>
      <div className="flex flex-col gap-2">
        <MenuRow icon={<SetupIcon size={ICON} />} label={t('menuGameSetup')} onClick={onSetup} />
        <MenuRow icon={<GuideIcon size={ICON} />} label={t('menuGuide')} onClick={onGuide} />
        <MenuRow icon={<Icon size={ICON} />} label={t(labelKey)} onClick={onLeave} />
      </div>
    </Modal>
  );
}
