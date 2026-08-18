import { reviveGameState } from './persistence';
import type { GameState } from './types';

const STORAGE_KEY = 'ultimate-scorekeeper:game-history';

/**
 * How many games the archive keeps. A stored game is the whole `GameState` — log,
 * points, roster, config — which is tens of KB for a heavily tracked game, and
 * localStorage is ~5 MB for the whole origin (the saved teams and the UI
 * preferences live there too). Fifty games is more than a season of tournaments
 * and leaves the quota a wide margin; past that the oldest game drops out.
 */
export const HISTORY_LIMIT = 50;

/**
 * Every finished game this device recorded, newest first.
 *
 * The archive stores whole states rather than a summary, because the report is a
 * pure read of one: everything it draws — the stat tables, the possession ledger,
 * the full log, the shareable image — comes out of `GameState` and nothing else, so
 * storing the state is what makes a game from last month open exactly as it did on
 * the day. It is `localStorage`, unlike the game in progress (`persistence.ts`,
 * sessionStorage, per-tab): the whole point is that it survives the app closing.
 *
 * Nothing here throws. Storage is unavailable in private mode and on a full quota,
 * and an archive that fails to save must never take the game down with it.
 */
export function loadGameHistory(): GameState[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as GameState[];
    if (!Array.isArray(stored)) return [];
    // Revived one by one for the same reason the in-progress game is: a game filed
    // by an older build predates whatever fields have been added since, and the
    // report reads straight through them.
    return sortNewestFirst(stored.map(reviveGameState));
  } catch {
    return [];
  }
}

function write(games: GameState[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  } catch {
    /* storage unavailable (private mode, quota, ...) — the game itself is unaffected */
  }
}

/**
 * Files a finished game, or overwrites the record of one already filed.
 *
 * Identity is `state.id`, which the game carries from the moment it was set up, so
 * a game corrected after the final whistle — a mis-tapped goal undone from the
 * dashboard, an attribution fixed in the log — replaces its own record rather than
 * filing a second copy of the same afternoon.
 *
 * The caller decides when a game qualifies (see GameProvider: only while its status
 * is 'finished'). This function is deliberately not that judgement — it is the
 * writer, and the archive should be able to hold whatever a caller hands it.
 */
export function saveGameToHistory(state: GameState): void {
  const all = loadGameHistory();
  const idx = all.findIndex((g) => g.id === state.id);
  if (idx >= 0) all[idx] = state;
  else all.push(state);
  // Newest first, then the tail past the limit falls off — so the game just saved
  // can never be the one dropped, whatever order the archive was written in.
  write(sortNewestFirst(all).slice(0, HISTORY_LIMIT));
}

export function deleteGameFromHistory(id: string): void {
  write(loadGameHistory().filter((g) => g.id !== id));
}

/**
 * When the game kicked off, in epoch ms — the 'gameStart' log entry, which every
 * game that reached 'finished' has. Games are filed and grouped by this rather than
 * by when they ended: a tournament game that runs past midnight belongs to the day
 * it was played. Falls back to the last entry's timestamp so a state that somehow
 * lost its start still sorts sanely instead of landing in 1970.
 */
export function gameStartedAtMs(state: GameState): number {
  const start = state.log.find((e) => e.type === 'gameStart');
  if (start) return start.atMs;
  return state.log[state.log.length - 1]?.atMs ?? 0;
}

function sortNewestFirst(games: GameState[]): GameState[] {
  return [...games].sort((a, b) => gameStartedAtMs(b) - gameStartedAtMs(a));
}

/** Local calendar day of a timestamp, as the key the list groups on. */
export function dateKey(atMs: number): string {
  const d = new Date(atMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface GameHistoryGroup {
  /** Local calendar day, `YYYY-MM-DD` — the subtitle's key, not what is displayed. */
  key: string;
  /** The first game of that day, so the heading can be formatted in the user's locale. */
  atMs: number;
  games: GameState[];
}

/**
 * The archive as the list draws it: one group per calendar day, days newest first
 * and games newest first inside each. Grouping is done here rather than in the
 * component so the "which day is this game on" rule lives next to the sort that
 * assumes it.
 */
export function groupGamesByDate(games: GameState[]): GameHistoryGroup[] {
  const groups: GameHistoryGroup[] = [];
  for (const game of games) {
    const atMs = gameStartedAtMs(game);
    const key = dateKey(atMs);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.games.push(game);
    else groups.push({ key, atMs, games: [game] });
  }
  return groups;
}
