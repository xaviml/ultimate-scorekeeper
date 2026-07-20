import { useEffect, useReducer, useRef, type ReactNode } from 'react';
import { createInitialState, gameReducer } from './gameReducer';
import { DispatchCtx, StateCtx } from './gameHooks';
import { whistle } from '../audio/whistle';
import { loadPersistedState, persistState } from './persistence';
import { saveTeam } from './rosterStorage';

export function GameProvider({ children }: { children: ReactNode }) {
  // Persisted to sessionStorage (per-tab, cleared when the tab closes) so a
  // reload mid-game (or on the end-of-game report) always resumes exactly
  // where the volunteer left off. Starting a new game (BACK_TO_CONFIG, from
  // the report screen) overwrites this with fresh initial state.
  const [state, dispatch] = useReducer(gameReducer, undefined, () => {
    const persisted = loadPersistedState();
    // BACK_TO_CONFIG (see the reducer) seeds the config screen with the just-
    // finished game's config so it's quick to tweak before the next one — and
    // that gets persisted like everything else. But a config-phase state loaded
    // from storage (a reload, or the app opened fresh later) should never show
    // that stale carry-over: reloading the config screen always resets to the
    // default, so a volunteer can undo a setup mistake with a plain refresh.
    if (persisted?.phase === 'config') return createInitialState();
    return persisted ?? createInitialState();
  });

  useEffect(() => {
    persistState(state);
  }, [state]);

  // Roster sync: once a game has actually started, each team's current
  // name/color/players is upserted into the cross-game saved-teams store
  // (localStorage, independent of the sessionStorage game-state above).
  // Gating on phase === 'game' is what makes "a team is only remembered if
  // the game starts with it" true for free — a team edited on the config
  // screen lives only in ConfigScreen's local state until START_GAME, so it
  // never reaches here unless the game actually starts. Re-running whenever
  // config.teams/config.players change also covers mid-game roster edits
  // (the Players dialog dispatches ADD_PLAYER/REMOVE_PLAYER through the
  // reducer into state.config.players).
  useEffect(() => {
    if (state.phase !== 'game') return;
    saveTeam({ ...state.config.teams.A, players: state.config.players.A });
    saveTeam({ ...state.config.teams.B, players: state.config.players.B });
  }, [state.phase, state.config.teams, state.config.players]);

  // Warn before closing/refreshing while configuring or mid-game — sessionStorage
  // means a closed tab can't be recovered, so this is the only guard against
  // losing setup or an in-progress game. The report screen is exempt — leaving
  // there is fine, and the finished game is still restorable by reloading.
  useEffect(() => {
    if (state.phase !== 'config' && state.phase !== 'game') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy browsers require a returnValue to be set to trigger the prompt.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [state.phase]);

  // 1-second heartbeat while a game is running.
  useEffect(() => {
    if (state.phase !== 'game') return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  // Pull-time whistle sequence: 1x @45s, 2x @60s, 3x @75s.
  const pullSec = state.secondary?.kind === 'pull' ? state.secondary.seconds : null;
  useEffect(() => {
    if (pullSec === 45) whistle(1);
    if (pullSec === 60) whistle(2);
    if (pullSec === 75) whistle(3);
  }, [pullSec]);

  // Timeout / half-time end whistle + auto-resume when the break timer hits 0.
  const breakDone =
    (state.secondary?.kind === 'timeout' || state.secondary?.kind === 'halftime') &&
    state.secondary.seconds === 0;
  useEffect(() => {
    if (!breakDone) return;
    whistle(2);
    if (state.status === 'timeout') dispatch({ type: 'TIMEOUT_END' });
    if (state.status === 'halftime') dispatch({ type: 'HALFTIME_END' });
  }, [breakDone, state.status]);

  // Cap whistles.
  const capCount = (state.timeCapReached ? 1 : 0) + (state.halfTimeCapReached ? 1 : 0);
  const prevCaps = useRef(0);
  useEffect(() => {
    if (capCount > prevCaps.current) whistle(3);
    prevCaps.current = capCount;
  }, [capCount]);

  // Delayed gender-ratio reveal: a few seconds after a goal, surface the next ratio.
  const pendingRatio = state.nextRatio !== null && state.assist === 'goalScored';
  useEffect(() => {
    if (!pendingRatio) return;
    const id = setTimeout(() => dispatch({ type: 'REVEAL_NEXT_RATIO' }), 3000);
    return () => clearTimeout(id);
  }, [pendingRatio]);

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}
