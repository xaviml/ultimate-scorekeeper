import { useEffect, useReducer, useRef, type ReactNode } from 'react';
import { createInitialState, gameReducer } from './gameReducer';
import { AssistCtx, DispatchCtx, StateCtx } from './gameHooks';
import { useAssistQueue } from '../hooks/useAssistQueue';
import { whistle } from '../audio/whistle';
import { currentWhistle } from './whistleSignal';
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

  // Every whistle the app blows comes from one place — currentWhistle — so the audio
  // here and the hand-signal in SignalCard can never drift apart (each whistle is
  // guaranteed to show its sign). It returns an occurrence key that is stable while a
  // blast is current and changes when a new one falls due; the ref plays each once.
  // The baseline is seeded from the mounted state's key, not null, so a reload from
  // sessionStorage mid-occurrence (e.g. mid-pull-window) doesn't replay a stale blast.
  const lastWhistleKey = useRef(currentWhistle(state)?.key ?? null);
  useEffect(() => {
    const w = currentWhistle(state);
    if (w && w.key !== lastWhistleKey.current) whistle(w.blasts);
    lastWhistleKey.current = w?.key ?? null;
  }, [state]);

  // Auto-resume when a break timer hits 0. Re-running on every status change is
  // deliberate: it retries ending the break if it ran out while the game was paused.
  // The whistle for the restart is handled by currentWhistle above, not here.
  const breakDone =
    (state.secondary?.kind === 'timeout' || state.secondary?.kind === 'halftime') &&
    state.secondary.seconds === 0;
  useEffect(() => {
    if (!breakDone) return;
    if (state.status === 'timeout') dispatch({ type: 'TIMEOUT_END' });
    if (state.status === 'halftime') dispatch({ type: 'HALFTIME_END' });
  }, [breakDone, state.status]);

  // Keep the screen awake during a game: locking the phone suspends timers and
  // audio, silently breaking the pull/timeout/cap whistles. The lock is released
  // by the browser whenever the tab is hidden, so it must be re-requested on
  // visibilitychange, not just once on mount. Unsupported browsers no-op.
  useEffect(() => {
    if (state.phase !== 'game' || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // Denied (low battery, backgrounded tab, etc.) — fail silently.
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !cancelled) void acquire();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    void acquire();
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void lock?.release();
    };
  }, [state.phase]);

  // Delayed gender-ratio reveal: a few seconds after a goal, surface the next ratio.
  const pendingRatio = state.nextRatio !== null && state.assist === 'goalScored';
  useEffect(() => {
    if (!pendingRatio) return;
    const id = setTimeout(() => dispatch({ type: 'REVEAL_NEXT_RATIO' }), 3000);
    return () => clearTimeout(id);
  }, [pendingRatio]);

  // What the assistance bar and the signal card are showing. It lives here, with the
  // other timer-driven behaviour, because it *is* a timer: messages take the screen in
  // turn rather than overwriting each other. See useAssistQueue.
  const assist = useAssistQueue(state);

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        <AssistCtx.Provider value={assist}>{children}</AssistCtx.Provider>
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}
