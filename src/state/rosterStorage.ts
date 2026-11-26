import { teamNameCase } from './teamName';
import type { SavedLine, SavedTeam } from './types';

const STORAGE_KEY = 'ultimate-scorekeeper:saved-teams';

/**
 * What a write to the store tells whoever is listening. `renames` maps a team's old
 * name (normalized) to its new one, so the setup form can follow a team renamed on
 * the Teams page instead of keeping a name the store no longer has — which the
 * kickoff sync would then quietly bring back.
 */
export interface SavedTeamsChange {
  renames: Record<string, string>;
  /**
   * The whole store was replaced from the Teams page. Only then does the setup form
   * take a saved team's colour and roster from the store: the form's own writes go
   * through one team at a time and can leave the form ahead of the store (a colour
   * picked on the form is only stored at kickoff), so taking the store's word on every
   * write would undo the volunteer's own edit.
   */
  replaced?: boolean;
}

const listeners = new Set<(change: SavedTeamsChange) => void>();

/**
 * Every writer here notifies, so a screen holding its own copy of the store (the
 * setup form, mounted underneath the Teams page) can catch up when another screen
 * writes. Returns the unsubscribe.
 */
export function subscribeSavedTeams(listener: (change: SavedTeamsChange) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function write(all: SavedTeam[], change: SavedTeamsChange = { renames: {} }): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  listeners.forEach((l) => l(change));
}

export function loadSavedTeams(): SavedTeam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Teams stored before names were cased come back cased; the store already
    // matches names case-insensitively, so this cannot split one team into two.
    return raw
      ? (JSON.parse(raw) as SavedTeam[]).map((team) => ({ ...team, name: teamNameCase(team.name) }))
      : [];
  } catch {
    return [];
  }
}

export const normalizeTeamName = (name: string) => name.trim().toLowerCase();
const normalize = normalizeTeamName;

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
  const name = teamNameCase(team.name.trim());
  if (!name) return;
  try {
    const all = loadSavedTeams();
    const idx = all.findIndex((t) => normalize(t.name) === normalize(name));
    const entry: SavedTeam = { ...team, name };
    if (idx >= 0) {
      if (entry.lines === undefined && all[idx].lines !== undefined) entry.lines = all[idx].lines;
      all[idx] = entry;
    } else all.push(entry);
    write(all);
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
    write(all);
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
  const target = teamNameCase(to.trim());
  if (!target || normalize(from) === normalize(target)) return;
  try {
    const all = loadSavedTeams();
    const entry = all.find((t) => normalize(t.name) === normalize(from));
    if (!entry) return;
    const rest = all.filter(
      (t) => normalize(t.name) !== normalize(from) && normalize(t.name) !== normalize(target),
    );
    write([...rest, { ...entry, name: target }], { renames: { [normalize(from)]: target } });
  } catch {
    /* storage unavailable (private mode, quota, ...) — game still works without it */
  }
}

/** Removes a saved team by case-insensitive, trimmed name match. */
export function deleteTeam(name: string): void {
  try {
    const all = loadSavedTeams().filter((t) => normalize(t.name) !== normalize(name));
    write(all);
  } catch {
    /* storage unavailable (private mode, quota, ...) — game still works without it */
  }
}

/**
 * Replaces the whole store — the Teams page's Save, from its visual list or its YAML
 * alike. Names are cased and players keep whatever ids they carry (they are re-minted
 * whenever a team is loaded into a game anyway). `renames` is passed on to listeners
 * (see `SavedTeamsChange`). Returns whether the write went through.
 */
export function replaceSavedTeams(
  teams: SavedTeam[],
  renames: Record<string, string> = {},
): boolean {
  try {
    write(
      teams.map((team) => ({ ...team, name: teamNameCase(team.name.trim()) })),
      { renames, replaced: true },
    );
    return true;
  } catch {
    return false;
  }
}
