import { beforeEach, describe, expect, it } from 'vitest';
import { deleteTeam, loadSavedTeams, saveTeam, saveTeamLines } from '../state/rosterStorage';
import type { SavedLine } from '../state/types';

const line = (name: string, keys: string[]): SavedLine => ({
  id: name,
  name,
  playerKeys: keys,
});

const team = (patch: Partial<Parameters<typeof saveTeam>[0]> = {}) => ({
  name: 'Ravens',
  color: '#111111',
  players: [{ id: 'p1', number: '7', name: 'Alex' }],
  ...patch,
});

beforeEach(() => localStorage.clear());

describe('saveTeam', () => {
  it('upserts by trimmed, case-insensitive name', () => {
    saveTeam(team());
    saveTeam(team({ name: '  ravens  ', color: '#222222' }));
    const all = loadSavedTeams();
    expect(all).toHaveLength(1);
    expect(all[0].color).toBe('#222222');
  });

  /**
   * Regression: GameContext syncs both rosters into this store the moment a game
   * starts, and it has no lines to pass. Replacing wholesale there deleted every
   * predefined line the user had named, silently, at kickoff.
   */
  it('keeps the stored lines when the incoming team carries none', () => {
    saveTeam(team({ lines: [line('O1', ['7|alex'])] }));
    saveTeam(team({ color: '#333333' })); // the roster sync, with no lines field
    const stored = loadSavedTeams()[0];
    expect(stored.color).toBe('#333333');
    expect(stored.lines).toEqual([line('O1', ['7|alex'])]);
  });

  // An explicit list still replaces, including the empty one — that is how the
  // last remaining line gets deleted.
  it('replaces the lines when an explicit list is given', () => {
    saveTeam(team({ lines: [line('O1', ['7|alex'])] }));
    saveTeam(team({ lines: [line('D1', [])] }));
    expect(loadSavedTeams()[0].lines).toEqual([line('D1', [])]);
    saveTeam(team({ lines: [] }));
    expect(loadSavedTeams()[0].lines).toEqual([]);
  });

  it('ignores a team with no name', () => {
    saveTeam(team({ name: '   ' }));
    expect(loadSavedTeams()).toEqual([]);
  });
});

describe('saveTeamLines', () => {
  it("replaces one team's lines and leaves the roster alone", () => {
    saveTeam(team());
    saveTeamLines('ravens', [line('O1', ['7|alex'])]);
    const stored = loadSavedTeams()[0];
    expect(stored.lines).toEqual([line('O1', ['7|alex'])]);
    expect(stored.players).toHaveLength(1);
  });

  // Lines belong to a saved team; a name that was never saved has nothing to
  // attach them to, and inventing the team would resurrect a deleted one.
  it('does nothing for a team that is not in the store', () => {
    saveTeamLines('Nobody', [line('O1', [])]);
    expect(loadSavedTeams()).toEqual([]);
  });

  it('goes away with the team', () => {
    saveTeam(team({ lines: [line('O1', [])] }));
    deleteTeam('Ravens');
    expect(loadSavedTeams()).toEqual([]);
  });
});
