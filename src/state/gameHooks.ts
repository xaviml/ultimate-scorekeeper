import { createContext, useContext, type Dispatch } from 'react';
import type { Occurrence } from './assistOccurrence';
import type { Action, GameState } from './types';

export const StateCtx = createContext<GameState | null>(null);
export const DispatchCtx = createContext<Dispatch<Action> | null>(null);
/**
 * The message currently holding the assistance bar and the signal card, or null.
 *
 * One context for both, rather than a transient computed inside each: they show two
 * halves of the same announcement, and only a shared queue keeps the words and the
 * hand signal on the same item. Null outside a game — nothing has happened yet.
 */
export const AssistCtx = createContext<Occurrence | null>(null);

/**
 * The game actually in hand, whatever a screen is reading. Match history shows an
 * archived game by providing it as `StateCtx` with a dispatch that does nothing, so
 * anything about the *current* game opened from inside it — the app menu's "Start
 * new game" — reads this instead. Provided once, by GameProvider, and never overridden.
 */
export const CurrentGameCtx = createContext<{
  state: GameState;
  dispatch: Dispatch<Action>;
} | null>(null);

export function useCurrentGame(): { state: GameState; dispatch: Dispatch<Action> } {
  const c = useContext(CurrentGameCtx);
  if (!c) throw new Error('useCurrentGame outside GameProvider');
  return c;
}

export function useGame(): GameState {
  const s = useContext(StateCtx);
  if (!s) throw new Error('useGame outside GameProvider');
  return s;
}
export function useGameDispatch(): Dispatch<Action> {
  const d = useContext(DispatchCtx);
  if (!d) throw new Error('useGameDispatch outside GameProvider');
  return d;
}
export function useAssist(): Occurrence | null {
  return useContext(AssistCtx);
}
