import { beforeEach, describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  deleteGameFromHistory,
  gameStartedAtMs,
  groupGamesByDate,
  loadGameHistory,
  saveGameToHistory,
} from '../state/gameHistory';
import { createInitialState, defaultConfig, gameReducer } from '../state/gameReducer';
import type { GameState, LogEntry } from '../state/types';

const HISTORY_KEY = 'ultimate-scorekeeper:game-history';

function startEntry(atMs: number): LogEntry {
  return { id: 1, wallClock: '10:00:00', atMs, gameSeconds: 0, type: 'gameStart' };
}

/** See reportScreenStats.test.tsx: defaultConfig is a shared singleton, so it is cloned. */
function finished(atMs: number, patch: Partial<GameState> = {}): GameState {
  const state = createInitialState(structuredClone(defaultConfig));
  state.status = 'finished';
  state.phase = 'report';
  state.log = [startEntry(atMs)];
  return { ...state, ...patch };
}

const AUG_18 = new Date(2026, 7, 18, 18, 30).getTime();
const AUG_18_LATER = new Date(2026, 7, 18, 20, 0).getTime();
const AUG_17 = new Date(2026, 7, 17, 9, 0).getTime();

describe('the archive of past games', () => {
  beforeEach(() => localStorage.clear());

  it('files a game and reads it back', () => {
    const game = finished(AUG_18);
    saveGameToHistory(game);
    const [stored] = loadGameHistory();
    expect(stored.id).toBe(game.id);
    expect(stored.scores).toEqual(game.scores);
  });

  it('overwrites the record of a game it has already filed, rather than adding a second copy', () => {
    const game = finished(AUG_18);
    saveGameToHistory(game);
    // The same game corrected after the whistle — an undone mis-tap, re-finished.
    saveGameToHistory({ ...game, scores: { A: 15, B: 11 } });
    const all = loadGameHistory();
    expect(all).toHaveLength(1);
    expect(all[0].scores).toEqual({ A: 15, B: 11 });
  });

  it('lists games newest first, whatever order they were filed in', () => {
    saveGameToHistory(finished(AUG_17));
    saveGameToHistory(finished(AUG_18_LATER));
    saveGameToHistory(finished(AUG_18));
    expect(loadGameHistory().map(gameStartedAtMs)).toEqual([AUG_18_LATER, AUG_18, AUG_17]);
  });

  it('drops the oldest game past the limit, never the one just filed', () => {
    // Oldest first, so the last one written is also the newest.
    for (let i = 0; i <= HISTORY_LIMIT; i++) saveGameToHistory(finished(AUG_17 + i * 60_000));
    const all = loadGameHistory();
    expect(all).toHaveLength(HISTORY_LIMIT);
    expect(gameStartedAtMs(all[0])).toBe(AUG_17 + HISTORY_LIMIT * 60_000);
    expect(gameStartedAtMs(all[all.length - 1])).toBe(AUG_17 + 60_000);
  });

  it('deletes one game by id and leaves the rest', () => {
    const keep = finished(AUG_18);
    const drop = finished(AUG_17);
    saveGameToHistory(keep);
    saveGameToHistory(drop);
    deleteGameFromHistory(drop.id);
    expect(loadGameHistory().map((g) => g.id)).toEqual([keep.id]);
  });

  it('groups by the day the game started, days and games newest first', () => {
    saveGameToHistory(finished(AUG_17));
    saveGameToHistory(finished(AUG_18));
    saveGameToHistory(finished(AUG_18_LATER));
    const groups = groupGamesByDate(loadGameHistory());
    expect(groups).toHaveLength(2);
    expect(groups[0].games.map(gameStartedAtMs)).toEqual([AUG_18_LATER, AUG_18]);
    expect(groups[1].games.map(gameStartedAtMs)).toEqual([AUG_17]);
  });

  it('revives a game stored by an older build rather than handing back a broken state', () => {
    // A game filed before a field existed: no `id`, no `lines` config. Both come
    // back defaulted from fresh initial state (see reviveGameState) so the report
    // can read straight through them.
    const old = JSON.parse(JSON.stringify(finished(AUG_18))) as Record<string, unknown>;
    delete old.id;
    delete (old.config as Record<string, unknown>).lines;
    localStorage.setItem(HISTORY_KEY, JSON.stringify([old]));
    const [stored] = loadGameHistory();
    expect(stored.id).toEqual(expect.any(String));
    expect(stored.config.lines).toBeDefined();
  });

  it('treats the next game as a different game', () => {
    // Identity is state.id, minted by createInitialState — so "new game"
    // (BACK_TO_CONFIG, which builds one) can never overwrite the game just filed,
    // however similar its teams and score.
    const first = finished(AUG_18);
    const second = gameReducer({ ...first, phase: 'report' }, { type: 'BACK_TO_CONFIG' });
    expect(second.id).not.toBe(first.id);

    saveGameToHistory(first);
    saveGameToHistory({ ...second, status: 'finished', log: [startEntry(AUG_18_LATER)] });
    expect(loadGameHistory()).toHaveLength(2);
  });

  it('survives storage holding something that isn’t an archive at all', () => {
    localStorage.setItem(HISTORY_KEY, 'not json');
    expect(loadGameHistory()).toEqual([]);
    localStorage.setItem(HISTORY_KEY, '{"nope":true}');
    expect(loadGameHistory()).toEqual([]);
  });
});
