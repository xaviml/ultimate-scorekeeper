import type { GameState } from './types';

/**
 * Whether "Start new game" has to ask first: only while a game is being played. One
 * not yet started loses nothing, one the scoreline finished or the volunteer left is
 * already filed in match history, and on setup there is no game to lose — so those go
 * straight to a new one. Starting a new game is `BACK_TO_CONFIG`, which discards the
 * game in hand; App turns it into the way home to setup.
 */
export function newGameAsksFirst(state: GameState): boolean {
  return (
    state.phase === 'game' &&
    state.status !== 'notStarted' &&
    state.status !== 'awaitingStart' &&
    state.status !== 'finished'
  );
}
