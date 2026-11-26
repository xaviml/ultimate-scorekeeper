import { normalizeTeamName } from './rosterStorage';
import { playerKey } from './rosterImport';
import type { GameConfig, PlayerInfo, SavedLine, SavedTeam, TeamId } from './types';
import { uid } from './uid';

const sameRoster = (a: PlayerInfo[], b: PlayerInfo[]) =>
  a.length === b.length &&
  a.every(
    (p, i) => playerKey(p) === playerKey(b[i]) && (p.gender ?? null) === (b[i].gender ?? null),
  );

const sameLines = (a: SavedLine[], b: SavedLine[]) =>
  a.length === b.length &&
  a.every((l, i) => l.name === b[i].name && l.playerKeys.join('\n') === b[i].playerKeys.join('\n'));

/**
 * Brings the setup form's two teams up to date with the saved-teams store after the
 * Teams page replaced it (or when the form mounts, which may be after the page was
 * used from a report).
 *
 * A team on the form that is a saved team takes the store's colour, roster and — for
 * the followed team — predefined lines, because the store is where a saved team lives
 * and the form is only holding a copy: left stale, the copy would be written back over
 * the edit by the next roster change on the form or by the kickoff sync. A team the
 * page renamed follows the new name for the same reason. A team the page deleted, or
 * one never saved, is left exactly as typed.
 *
 * Returns the same object when nothing differs, so a no-op is not a re-render.
 */
export function syncFormTeams(
  cfg: GameConfig,
  stored: SavedTeam[],
  renames: Record<string, string> = {},
): GameConfig {
  let next = cfg;
  for (const id of ['A', 'B'] as TeamId[]) {
    const current = next.teams[id];
    const name = renames[normalizeTeamName(current.name)] ?? current.name;
    if (!name.trim()) continue;
    const saved = stored.find((s) => normalizeTeamName(s.name) === normalizeTeamName(name));
    if (name !== current.name) {
      next = { ...next, teams: { ...next.teams, [id]: { ...next.teams[id], name } } };
    }
    if (!saved) continue;
    if (saved.color !== next.teams[id].color) {
      next = {
        ...next,
        teams: { ...next.teams, [id]: { ...next.teams[id], color: saved.color } },
      };
    }
    if (!sameRoster(next.players[id], saved.players)) {
      next = {
        ...next,
        players: { ...next.players, [id]: saved.players.map((p) => ({ ...p, id: uid() })) },
      };
    }
    const lines = saved.lines ?? [];
    if (next.trackedTeam === id && !sameLines(next.lines.saved, lines)) {
      next = { ...next, lines: { ...next.lines, saved: lines } };
    }
  }
  return next;
}
