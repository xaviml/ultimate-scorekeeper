import { createContext, useContext, type Dispatch } from 'react';
import type { Action, GameState } from './types';

export const StateCtx = createContext<GameState | null>(null);
export const DispatchCtx = createContext<Dispatch<Action> | null>(null);

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
