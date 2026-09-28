import type { SavedLine, SavedTeam } from './types';

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
 *
 * `lines` is the one exception, and it has to be: it is only ever written from the
 * line dialog, while the roster sync in GameContext writes this record on every
 * roster change with no `lines` field at all. Replacing wholesale there would
 * delete every predefined line the moment a game started. So an **absent** `lines`
 * means "not mine to touch" and keeps what is stored, while an explicit one
 * (including `[]`, which is how the last line is deleted) replaces it.
 */
export function saveTeam(team: SavedTeam): void {
  const name = team.name.trim();
  if (!name) return;
  try {
    const all = loadSavedTeams();
    const idx = all.findIndex((t) => normalize(t.name) === normalize(name));
    const entry: SavedTeam = { ...team, name };
    if (idx >= 0) {
      if (entry.lines === undefined && all[idx].lines !== undefined) entry.lines = all[idx].lines;
      all[idx] = entry;
    } else all.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable (private mode, quota, ...) — game still works without it */
  }
}

/** Replaces one team's predefined lines, leaving its roster and colour alone. */
export function saveTeamLines(name: string, lines: SavedLine[]): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    const all = loadSavedTeams();
    const idx = all.findIndex((t) => normalize(t.name) === normalize(trimmed));
    if (idx < 0) return;
    all[idx] = { ...all[idx], lines };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable (private mode, quota, ...) — game still works without it */
  }
}

/**
 * Moves a saved team to a new name, keeping its roster, colour and lines — a team
 * renamed mid-game is the same squad, and the roster sync would otherwise file it
 * under the new name while leaving the old one behind as a near-duplicate. A team
 * already stored under `to` is replaced, which is what the kickoff sync does to a
 * name typed on the setup screen. Nothing happens when `from` isn't stored.
 */
export function renameTeam(from: string, to: string): void {
  const target = to.trim();
  if (!target || normalize(from) === normalize(target)) return;
  try {
    const all = loadSavedTeams();
    const entry = all.find((t) => normalize(t.name) === normalize(from));
    if (!entry) return;
    const rest = all.filter(
      (t) => normalize(t.name) !== normalize(from) && normalize(t.name) !== normalize(target),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...rest, { ...entry, name: target }]));
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
