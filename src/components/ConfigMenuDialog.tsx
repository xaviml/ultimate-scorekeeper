import { useT } from '../i18n/useT';
import {
  GuideIcon,
  HistoryIcon,
  InfoIcon,
  PlusIcon,
  SettingsIcon,
  SetupIcon,
  ShirtIcon,
  StatsIcon,
} from './icons';
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
  onNewGame,
  onGameSetup,
  onPastGames,
  onTeams,
  onGuide,
  onStatsGuide,
  onSettings,
  onAbout,
}: {
  onClose: () => void;
  /** Leads the menu, filled in the accent. Absent on the setup screen, where it would lead back to itself. */
  onNewGame?: () => void;
  /** The game in hand's setup (GameSetupDialog) — offered only over a game being played. */
  onGameSetup?: () => void;
  onPastGames?: () => void;
  /** The teams saved on this phone (#/teams). */
  onTeams?: () => void;
  onGuide?: () => void;
  /**
   * The statistics walkthrough. Only here and not in the game's menu: it is read
   * while deciding what to switch on and while reading the report afterwards, and
   * the game menu's own guide row already answers the mid-game question.
   */
  onStatsGuide?: () => void;
  /** The same dialog the game menu opens: sound and vibration, set per phone. */
  onSettings: () => void;
  onAbout?: () => void;
}) {
  const { t } = useT();

  return (
    <Modal title={t('menuTitle')} onClose={onClose} size="sm" showClose>
      <div className="flex flex-col gap-2">
        {onNewGame && (
          <MenuRow
            primary
            icon={<PlusIcon size={MENU_ICON} />}
            label={t('menuNewGame')}
            onClick={onNewGame}
          />
        )}
        {onGameSetup && (
          <MenuRow
            icon={<SetupIcon size={MENU_ICON} />}
            label={t('menuGameSetup')}
            onClick={onGameSetup}
          />
        )}
        {/* The ways to the rest of the app — absent over a game being played (see AppMenu). */}
        {onPastGames && (
          <MenuRow
            icon={<HistoryIcon size={MENU_ICON} />}
            label={t('pastGamesTitle')}
            onClick={onPastGames}
          />
        )}
        {onTeams && (
          <MenuRow
            icon={<ShirtIcon size={MENU_ICON} />}
            label={t('teamsTitle')}
            onClick={onTeams}
          />
        )}
        {onGuide && (
          <MenuRow icon={<GuideIcon size={MENU_ICON} />} label={t('menuGuide')} onClick={onGuide} />
        )}
        {/* Under the walkthrough, because it picks up where that one stops. */}
        {onStatsGuide && (
          <MenuRow
            icon={<StatsIcon size={MENU_ICON} />}
            label={t('menuStatsGuide')}
            onClick={onStatsGuide}
          />
        )}
        <MenuRow
          icon={<SettingsIcon size={MENU_ICON} />}
          label={t('settingsTitle')}
          onClick={onSettings}
        />
        {onAbout && (
          <MenuRow icon={<InfoIcon size={MENU_ICON} />} label={t('aboutTitle')} onClick={onAbout} />
        )}
      </div>
    </Modal>
  );
}
