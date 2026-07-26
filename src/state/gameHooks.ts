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
