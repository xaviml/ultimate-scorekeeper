import { normalizeTeamName } from './rosterStorage';
import { playerKey } from './rosterImport';
import { teamNameCase } from './teamName';
import type { SavedTeam } from './types';
import { uid } from './uid';

/**
 * The Teams page's unsaved copy of the saved-teams store.
 *
 * Both of the page's views — the visual list and the YAML editor — edit this one
 * draft, and a single Save writes it back over the whole store (the Home Assistant
 * model: switching views carries unsaved work across, and nothing reaches storage
 * until Save). This module is the half of that which needs no YAML library, so the
 * visual view never loads one.
 */

/** A team in the draft. `key` is a stable identity for the list; `origin` is the stored name it came from, if any. */
export interface DraftTeam extends SavedTeam {
  key: string;
  /**
   * The name this team has in the store, so a rename is told apart from a delete
   * plus an add — Save would otherwise announce it is removing the team being
   * renamed, and the setup form could not follow the new name.
   */
  origin: string | null;
}

export type TeamsView = 'visual' | 'yaml';

export interface TeamsDraft {
  teams: DraftTeam[];
  view: TeamsView;
  /** The YAML being edited, while `view === 'yaml'`. */
  text: string;
  /** Whether Save has anything to write — computed by the page, read by App's back guard. */
  dirty: boolean;
  /**
   * Set by App when it put back a back gesture that would have lost unsaved work:
   * the page asks "Leave without saving?" when it mounts again, and clears it.
   */
  askLeave?: boolean;
}

/**
 * The draft outlives the page's component on purpose. A page opened over the Teams
 * page from its menu (a guide, match history) unmounts it, and the back gesture App
 * puts back after asking unmounts it too; holding the draft here is what brings the
 * unsaved work back when the page comes back. Cleared on Save and on Discard.
 */
let held: TeamsDraft | null = null;

export function holdTeamsDraft(draft: TeamsDraft | null): void {
  held = draft;
}

export function heldTeamsDraft(): TeamsDraft | null {
  return held;
}

/** App's back guard: the page is to ask before leaving the next time it mounts. */
export function requestTeamsLeave(): void {
  if (held) held = { ...held, askLeave: true };
}

/** Whether leaving the Teams page now would lose unsaved work. */
export function teamsDraftDirty(): boolean {
  return held?.dirty ?? false;
}

export const sortTeams = <T extends { name: string }>(teams: T[]): T[] =>
  [...teams].sort((a, b) => a.name.localeCompare(b.name));

export function draftFromStore(stored: SavedTeam[]): DraftTeam[] {
  return sortTeams(stored).map((team) => ({
    ...team,
    players: team.players.map((p) => ({ ...p })),
    lines: team.lines ?? [],
    key: uid(),
    origin: team.name,
  }));
}

/**
 * Turns teams read from YAML into draft teams, carrying each one's `origin` over
 * from the draft it replaces (so a rename made in the list survives a trip through
 * the YAML), or from the store when the name is a stored one.
 */
export function draftFromParsed(
  parsed: SavedTeam[],
  previous: DraftTeam[],
  stored: SavedTeam[],
): DraftTeam[] {
  return sortTeams(parsed).map((team) => {
    const n = normalizeTeamName(team.name);
    const before = previous.find((d) => normalizeTeamName(d.name) === n);
    const inStore = stored.find((s) => normalizeTeamName(s.name) === n);
    return {
      ...team,
      key: before?.key ?? uid(),
      origin: before ? before.origin : (inStore?.name ?? null),
    };
  });
}

/**
 * What a list of teams *says*, ignoring what it does not: player and line ids
 * (re-minted on every load), the order of the teams (the page sorts them), the case
 * of a colour, and line members no longer on the roster (a saved line keeps the key
 * of a player since removed, and the YAML cannot name a player who isn't there — so
 * without this, opening the YAML of an untouched store would already count as a
 * change). Two lists with the same signature need no Save.
 */
export function teamsSignature(teams: SavedTeam[]): string {
  return JSON.stringify(
    sortTeams(teams.map((t) => ({ ...t, name: teamNameCase(t.name.trim()) }))).map((t) => {
      const keys = new Set(t.players.map(playerKey));
      return [
        t.name,
        t.color.trim().toLowerCase(),
        t.players.map((p) => [p.number.trim(), p.name.trim(), p.gender ?? '']),
        (t.lines ?? []).map((l) => [l.name.trim(), l.playerKeys.filter((k) => keys.has(k))]),
      ];
    }),
  );
}

/** Stored teams the draft no longer has, under their own name or as a rename's origin. */
export function removedTeams(stored: SavedTeam[], draft: DraftTeam[]): string[] {
  const kept = new Set<string>();
  for (const d of draft) {
    kept.add(normalizeTeamName(d.name));
    if (d.origin) kept.add(normalizeTeamName(d.origin));
  }
  return sortTeams(stored)
    .filter((s) => !kept.has(normalizeTeamName(s.name)))
    .map((s) => s.name);
}

/** Old name (normalized) → new name, for every draft team renamed from a stored one. */
export function draftRenames(draft: DraftTeam[]): Record<string, string> {
  const renames: Record<string, string> = {};
  for (const d of draft) {
    if (d.origin && normalizeTeamName(d.origin) !== normalizeTeamName(d.name)) {
      renames[normalizeTeamName(d.origin)] = teamNameCase(d.name.trim());
    }
  }
  return renames;
}

/** The draft as plain saved teams, ready for the store. */
export function draftToSaved(draft: DraftTeam[]): SavedTeam[] {
  return draft.map((d) => ({
    name: d.name,
    color: d.color,
    players: d.players,
    lines: d.lines ?? [],
  }));
}
