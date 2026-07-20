import type { SavedTeam } from './types';

const STORAGE_KEY = 'ultimate-scorekeeper:saved-teams';

export function loadSavedTeams(): SavedTeam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedTeam[]) : [];
  } catch {
    return [];
  }
}

const normalize = (name: string) => name.trim().toLowerCase();

/**
 * Upserts by case-insensitive, trimmed name match. Players and color are
 * replaced wholesale rather than merged — the live team at sync time is
 * always the source of truth, so mid-game roster removals are correctly
 * reflected too.
 */
export function saveTeam(team: SavedTeam): void {
  const name = team.name.trim();
  if (!name) return;
  try {
    const all = loadSavedTeams();
    const idx = all.findIndex((t) => normalize(t.name) === normalize(name));
    const entry: SavedTeam = { ...team, name };
    if (idx >= 0) all[idx] = entry;
    else all.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable (private mode, quota, ...) — game still works without it */
  }
}

/** Removes a saved team by case-insensitive, trimmed name match. */
export function deleteTeam(name: string): void {
  try {
    const all = loadSavedTeams().filter((t) => normalize(t.name) !== normalize(name));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable (private mode, quota, ...) — game still works without it */
  }
}
