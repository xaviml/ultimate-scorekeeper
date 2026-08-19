import { useT } from '../i18n/useT';
import { GuideIcon, HistoryIcon, InfoIcon, StatsIcon } from './icons';
import { MENU_ICON, MenuRow } from './MenuRow';
import { Modal } from './Modal';

/**
 * The setup screen's header menu, behind the button that used to be the ⓘ on its
 * own — the same control the game screen carries, in the same corner, holding the
 * things that are about the app rather than about the game being set up.
 *
 * There is no leave row here, unlike the game's menu: the setup screen is where
 * the app starts, and every row is a place to look at rather than a way out.
 */
export function ConfigMenuDialog({
  onClose,
  onPastGames,
  onGuide,
  onStatsGuide,
  onAbout,
}: {
  onClose: () => void;
  onPastGames: () => void;
  onGuide: () => void;
  /**
   * The statistics walkthrough. Only here and not in the game's menu: it is read
   * while deciding what to switch on and while reading the report afterwards, and
   * the game menu's own guide row already answers the mid-game question.
   */
  onStatsGuide: () => void;
  onAbout: () => void;
}) {
  const { t } = useT();

  return (
    <Modal title={t('menuTitle')} onClose={onClose} size="sm" showClose>
      <div className="flex flex-col gap-2">
        <MenuRow
          icon={<HistoryIcon size={MENU_ICON} />}
          label={t('pastGamesTitle')}
          onClick={onPastGames}
        />
        <MenuRow icon={<GuideIcon size={MENU_ICON} />} label={t('menuGuide')} onClick={onGuide} />
        {/* Under the walkthrough, because it picks up where that one stops. */}
        <MenuRow
          icon={<StatsIcon size={MENU_ICON} />}
          label={t('menuStatsGuide')}
          onClick={onStatsGuide}
        />
        <MenuRow icon={<InfoIcon size={MENU_ICON} />} label={t('aboutTitle')} onClick={onAbout} />
      </div>
    </Modal>
  );
}
