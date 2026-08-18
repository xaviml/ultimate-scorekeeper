import { useT } from '../i18n/useT';
import { ArrowBackIcon, CrossIcon, GuideIcon, ReportIcon, SetupIcon } from './icons';
import { MENU_ICON, MenuRow } from './MenuRow';
import { Modal } from './Modal';

/** Which door off the game screen this game's status offers — see GameScreen's header. */
export type LeaveKind = 'backToSetup' | 'endGame' | 'openReport';

const LEAVE = {
  backToSetup: { Icon: ArrowBackIcon, labelKey: 'btnBackToSetup' },
  endGame: { Icon: CrossIcon, labelKey: 'btnEndGame' },
  openReport: { Icon: ReportIcon, labelKey: 'openReport' },
} as const;

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
  onReport,
  onLeave,
}: {
  leave: LeaveKind;
  onClose: () => void;
  onSetup: () => void;
  onGuide: () => void;
  /**
   * The report on the game so far, readable mid-game (half-time is exactly when
   * a captain asks). Absent once the game is finished — the leave row is
   * already "Open report" there, and two doors to the same place would only ask
   * which one is different.
   */
  onReport?: () => void;
  onLeave: () => void;
}) {
  const { t } = useT();
  const { Icon, labelKey } = LEAVE[leave];

  return (
    <Modal title={t('menuTitle')} onClose={onClose} size="sm" showClose>
      <div className="flex flex-col gap-2">
        <MenuRow
          icon={<SetupIcon size={MENU_ICON} />}
          label={t('menuGameSetup')}
          onClick={onSetup}
        />
        {onReport && (
          <MenuRow
            icon={<ReportIcon size={MENU_ICON} />}
            label={t('menuReport')}
            onClick={onReport}
          />
        )}
        <MenuRow icon={<GuideIcon size={MENU_ICON} />} label={t('menuGuide')} onClick={onGuide} />
        <MenuRow icon={<Icon size={MENU_ICON} />} label={t(labelKey)} onClick={onLeave} />
      </div>
    </Modal>
  );
}
