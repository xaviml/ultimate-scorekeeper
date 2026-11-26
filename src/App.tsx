import { useEffect, useRef, useState } from 'react';
import ConfigScreen from './components/ConfigScreen';
import GameScreen from './components/GameScreen';
import GuideScreen from './components/GuideScreen';
import { InstallBanner } from './components/InstallBanner';
import PastGamesScreen from './components/PastGamesScreen';
import ReportScreen from './components/ReportScreen';
import StatsGuideScreen from './components/StatsGuideScreen';
import { back, home, navigate, seedHistory, undoBack, useRoute } from './hooks/useRoute';
import { usePreservedScroll } from './hooks/usePreservedScroll';
import { useGame, useGameDispatch } from './state/gameHooks';
import { parseRoute, phaseRoute, type Route } from './state/route';
import type { GameState } from './state/types';

/** Whether play has begun — leaving before that loses nothing, so it needs no asking. */
const gameStarted = (state: GameState) =>
  state.status !== 'notStarted' && state.status !== 'awaitingStart';

/**
 * The page to open on: the address, unless it names a page the game is not on —
 * the game or its report with no game set up, or setup while a game is running
 * (a reload of an older session, which had no addresses).
 */
function startRoute(route: Route, phase: GameState['phase']): Route {
  if ((route.name === 'game' || route.name === 'report') && phase === 'config')
    return phaseRoute(phase);
  if (route.name === 'setup' && phase !== 'config') return phaseRoute(phase);
  return route;
}

/**
 * Every page has an address (see state/route.ts), and the address decides what is on
 * screen. The game itself is still the reducer's: `phase` says whether one is being
 * set up, played or has been left. The two are kept in step both ways here, so the
 * screens go on dispatching exactly what they always did —
 *
 * - **the game moves, the address follows**: starting a game goes to the game page,
 *   ending or leaving it to the report, "back to the game" back to it, and a new game
 *   home to setup, clearing the pages of the game that is gone off the history;
 * - **the address moves, the game follows**: the browser's back from the report to
 *   the game page is "back to the game", and back from a game in progress is the one
 *   move that asks first — the game page is put back and the screen is told, so it
 *   can close its menu or ask whether to leave (`backRequest`).
 *
 * The setup form and the game stay mounted, hidden, under the pages opened over them
 * (history and the guides over setup; the guide and the report so far over the
 * game), so a half-filled form or an open game survives the round trip untouched.
 */
export default function App() {
  const state = useGame();
  const dispatch = useGameDispatch();
  useState(() => {
    const start = startRoute(parseRoute(location.hash), state.phase);
    // The report of the game in hand is reached from the game, so the game page goes
    // under it: back from a report opened directly is back to the game.
    seedHistory(
      start.name === 'setup'
        ? []
        : start.name === 'report' && state.phase !== 'config'
          ? [{ name: 'game' }, start]
          : [start],
    );
  });
  const route = useRoute();
  const [backRequest, setBackRequest] = useState(0);

  const routeRef = useRef(route);
  routeRef.current = route;
  const prevPhase = useRef(state.phase);
  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = state.phase;
    if (prev === state.phase) return;
    const at = routeRef.current.name;
    if (state.phase === 'config') home();
    else if (state.phase === 'game') {
      if (at === 'report') back({ name: 'game' });
      else if (at !== 'game') navigate({ name: 'game' });
    } else if (at !== 'report') navigate({ name: 'report' });
  }, [state.phase]);

  const stateRef = useRef(state);
  stateRef.current = state;
  const prevRoute = useRef(route.name);
  useEffect(() => {
    const prev = prevRoute.current;
    prevRoute.current = route.name;
    const { phase } = stateRef.current;
    if (route.name === 'game') {
      if (phase === 'report') dispatch({ type: 'BACK_TO_GAME' });
      else if (phase === 'config') navigate({ name: 'setup' }, { replace: true });
    } else if (route.name === 'report') {
      if (phase === 'config') navigate({ name: 'setup' }, { replace: true });
    } else if (route.name === 'setup' && prev !== 'setup') {
      if (phase === 'game') {
        if (gameStarted(stateRef.current)) {
          undoBack();
          setBackRequest((n) => n + 1);
        } else {
          dispatch({ type: 'BACK_TO_CONFIG' });
        }
      } else if (phase === 'report') {
        navigate({ name: 'report' });
      }
    }
  }, [route, dispatch]);

  const phase = state.phase;
  const overlay = (() => {
    switch (route.name) {
      case 'report':
        if (phase === 'report') return <ReportScreen />;
        if (phase === 'game')
          return <ReportScreen mode="live" onBack={() => back({ name: 'game' })} />;
        return null;
      case 'history':
      case 'historyGame':
        return <PastGamesScreen openId={route.name === 'historyGame' ? route.id : null} />;
      case 'guide':
        return <GuideScreen onBack={() => back(phaseRoute(phase))} />;
      case 'statsGuide':
        return <StatsGuideScreen onBack={() => back(phaseRoute(phase))} />;
      default:
        return null;
    }
  })();
  usePreservedScroll(overlay !== null);

  // The game stays on screen for the moment between the back gesture from the report
  // and "back to the game" catching up, rather than flashing a blank page.
  const base =
    phase === 'config' ? (
      <ConfigScreen />
    ) : phase === 'game' || route.name === 'game' ? (
      <GameScreen backRequest={backRequest} />
    ) : null;

  return (
    <>
      {phase !== 'game' && <InstallBanner />}
      <div hidden={overlay !== null}>{base}</div>
      {overlay}
    </>
  );
}
