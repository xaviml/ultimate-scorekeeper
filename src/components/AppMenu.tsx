import { useState } from 'react';
import { home, navigate } from '../hooks/useRoute';
import { useCurrentGame } from '../state/gameHooks';
import { newGameAsksFirst } from '../state/newGame';
import { AboutDialog } from './AboutDialog';
import { ConfigMenuDialog } from './ConfigMenuDialog';
import { ConfirmLeaveGameDialog } from './ConfirmLeaveGameDialog';
import { GameSetupDialog } from './GameSetupDialog';
import { SettingsDialog } from './SettingsDialog';

/**
 * The app's menu — start a new game, match history, saved teams, both guides,
 * settings, about —
 * as the setup screen and every page header open it. The dialogs behind it live here
 * too, so whoever shows the menu only says when it is open. The game screen has its
 * own menu (GameMenuDialog), about the game in hand, which leads with the same row.
 *
 * "Start new game" acts on the game actually in hand (`useCurrentGame`), not on
 * whatever the page is reading — an archived report in match history reads a game
 * from the archive. It asks first only while a game is being played (a page opened
 * over it: the guide, the report so far); otherwise it is the way home to setup.
 * `newGame: false` leaves the row out — on the setup screen, which is where it leads.
 *
 * Over a game in hand (a page opened from the game, such as the report so far) the
 * menu is only "Start new game", the game's setup and Settings: like the game's own menu, it stays
 * about that game, rather than leading on to history and the guides mid-game.
 */
export function AppMenu({
  open,
  onClose,
  newGame = true,
}: {
  open: boolean;
  onClose: () => void;
  newGame?: boolean;
}) {
  const { state, dispatch } = useCurrentGame();
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showGameSetup, setShowGameSetup] = useState(false);
  const go = (to: Parameters<typeof navigate>[0]) => {
    onClose();
    navigate(to);
  };
  const overGame = state.phase === 'game';
  const startNewGame = () => {
    onClose();
    if (newGameAsksFirst(state)) setConfirmLeave(true);
    else if (state.phase === 'config') home();
    else dispatch({ type: 'BACK_TO_CONFIG' });
  };
  return (
    <>
      {open && (
        <ConfigMenuDialog
          onClose={onClose}
          onNewGame={newGame ? startNewGame : undefined}
          onGameSetup={
            overGame
              ? () => {
                  onClose();
                  setShowGameSetup(true);
                }
              : undefined
          }
          onPastGames={overGame ? undefined : () => go({ name: 'history' })}
          onTeams={overGame ? undefined : () => go({ name: 'teams' })}
          onGuide={overGame ? undefined : () => go({ name: 'guide' })}
          onStatsGuide={overGame ? undefined : () => go({ name: 'statsGuide' })}
          onSettings={() => {
            onClose();
            setShowSettings(true);
          }}
          onAbout={
            overGame
              ? undefined
              : () => {
                  onClose();
                  setShowAbout(true);
                }
          }
        />
      )}
      {showGameSetup && <GameSetupDialog onClose={() => setShowGameSetup(false)} />}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
      {confirmLeave && (
        <ConfirmLeaveGameDialog
          onCancel={() => setConfirmLeave(false)}
          onConfirm={() => {
            setConfirmLeave(false);
            dispatch({ type: 'BACK_TO_CONFIG' });
          }}
        />
      )}
    </>
  );
}
