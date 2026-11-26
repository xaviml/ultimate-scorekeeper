import { describe, expect, it } from 'vitest';
import { playerKey } from '../state/rosterImport';
import { draftFromParsed, draftFromStore, removedTeams, teamsSignature } from '../state/teamsDraft';
import { parseTeamsYaml, teamsToYaml } from '../state/teamsYaml';
import type { SavedTeam } from '../state/types';

const ravens: SavedTeam = {
  name: 'RAVENS',
  color: '#1f6feb',
  players: [
    { id: 'a', number: '7', name: 'Ada', gender: 'female' },
    { id: 'b', number: '12', name: 'Marc', gender: 'male' },
    { id: 'c', number: '23', name: 'Eli' },
  ],
  lines: [{ id: 'l1', name: 'O1', playerKeys: ['7|ada', '12|marc'] }],
};
const foxes: SavedTeam = { name: 'FOXES', color: '#e5534b', players: [] };

function parsed(text: string): SavedTeam[] {
  const result = parseTeamsYaml(text);
  if (!result.ok) throw new Error(`unexpected error ${result.error.key}`);
  return result.teams;
}

function failure(text: string) {
  const result = parseTeamsYaml(text);
  if (result.ok) throw new Error('expected an error');
  return result.error;
}

describe('teams as YAML', () => {
  it('writes one team per key, a player per line and each line on one line', () => {
    expect(teamsToYaml([ravens, foxes])).toBe(
      [
        'FOXES:',
        '  color: "#e5534b"',
        'RAVENS:',
        '  color: "#1f6feb"',
        '  players:',
        '    - 7 Ada FMP',
        '    - 12 Marc MMP',
        '    - 23 Eli',
        '  lines:',
        '    O1: [7 Ada, 12 Marc]',
        '',
      ].join('\n'),
    );
  });

  it('reads back what it writes', () => {
    const teams = parsed(teamsToYaml([ravens, foxes]));
    expect(teamsSignature(teams)).toBe(teamsSignature([ravens, foxes]));
  });

  it('is an empty text for no teams, and an empty text is no teams', () => {
    expect(teamsToYaml([])).toBe('');
    expect(parsed('')).toEqual([]);
    expect(parsed('# nothing here\n')).toEqual([]);
  });

  it('needs only a name and a colour, and capitalises the name', () => {
    const [team] = parsed('bears:\n  color: "#123"\n');
    expect(team).toMatchObject({ name: 'BEARS', color: '#123', players: [], lines: [] });
  });

  it('reads players in every shape the roster paste box does', () => {
    const [team] = parsed(
      [
        'RAVENS:',
        '  color: "#1f6feb"',
        '  players:',
        '    - 7 Ada FMP',
        '    - Marc 12',
        '    - Noa',
        '    - 44',
        '    - { number: "", name: John 12 }',
      ].join('\n'),
    );
    expect(team.players.map((p) => [p.number, p.name, p.gender])).toEqual([
      ['7', 'Ada', 'female'],
      ['12', 'Marc', undefined],
      ['', 'Noa', undefined],
      ['44', '', undefined],
      ['', 'John 12', undefined],
    ]);
  });

  it('writes a player whose line would read as someone else as a mapping', () => {
    const odd: SavedTeam = {
      name: 'ODD',
      color: '#000000',
      players: [{ id: 'x', number: '', name: 'John 12' }],
    };
    const text = teamsToYaml([odd]);
    expect(text).toContain('{number: "", name: John 12}');
    expect(teamsSignature(parsed(text))).toBe(teamsSignature([odd]));
  });

  it('lets a line name a player by number or by name alone when that is unambiguous', () => {
    const [team] = parsed(
      [
        'RAVENS:',
        '  color: "#1f6feb"',
        '  players: [7 Ada, 12 Marc, 23 Eli]',
        '  lines:',
        '    D1: [7, Marc, 23 eli]',
      ].join('\n'),
    );
    expect(team.lines?.[0].playerKeys).toEqual(['7|ada', '12|marc', '23|eli']);
  });

  it('leaves out of a line a member no longer on the roster', () => {
    const stale: SavedTeam = {
      ...ravens,
      lines: [{ id: 'l1', name: 'O1', playerKeys: ['7|ada', '99|gone'] }],
    };
    expect(teamsToYaml([stale])).toContain('O1: [7 Ada]');
    // ...and that does not count as a change.
    expect(teamsSignature(parsed(teamsToYaml([stale])))).toBe(teamsSignature([stale]));
  });

  describe('refuses, naming the problem and its line', () => {
    it('YAML that cannot be read', () => {
      const error = failure('RAVENS:\n  color: "#1f6feb"\n   players: [\n');
      expect(error.key).toBe('teamsYamlErrSyntax');
      expect(error.line).not.toBeNull();
      expect(error.excerpt).toBeDefined();
    });

    it('a team without a colour, including one whose colour was left unquoted', () => {
      expect(failure('RAVENS:\n  players: [7 Ada]\n')).toMatchObject({
        key: 'teamsYamlErrColorMissing',
        vars: { team: 'RAVENS' },
        line: 1,
      });
      // `#` starts a comment, so an unquoted colour reads as nothing at all.
      expect(failure('FOXES:\n  color: "#e5534b"\nRAVENS:\n  color: #1f6feb\n')).toMatchObject({
        key: 'teamsYamlErrColorMissing',
        line: 4,
      });
    });

    it('a colour that is not one', () => {
      expect(failure('RAVENS:\n  color: red\n')).toMatchObject({
        key: 'teamsYamlErrColor',
        vars: { team: 'RAVENS', value: 'red' },
        line: 2,
      });
    });

    it('a key it does not know', () => {
      expect(failure('RAVENS:\n  colour: "#1f6feb"\n')).toMatchObject({
        key: 'teamsYamlErrUnknownKey',
        vars: { key: 'colour' },
        line: 2,
      });
    });

    it('the same team twice, however it is cased', () => {
      expect(failure('Ravens:\n  color: "#111"\nRAVENS:\n  color: "#222"\n')).toMatchObject({
        key: 'teamsYamlErrDuplicateTeam',
        line: 3,
      });
    });

    it('the same player twice in one team', () => {
      const error = failure('RAVENS:\n  color: "#111"\n  players:\n    - 7 Ada\n    - 7 ada FMP\n');
      expect(error).toMatchObject({ key: 'teamsYamlErrDuplicatePlayer', line: 5 });
    });

    it('an empty player, which is what a number written after # becomes', () => {
      expect(
        failure('RAVENS:\n  color: "#111"\n  players:\n    - 7 Ada\n    - #12 Marc\n'),
      ).toMatchObject({ key: 'teamsYamlErrPlayerEmpty', vars: { team: 'RAVENS' }, line: 5 });
    });

    it('a line naming someone who is not on the roster, or more than one player', () => {
      expect(
        failure(
          'RAVENS:\n  color: "#111"\n  players: [7 Ada]\n  lines:\n    O1: [7 Ada, 99 Zed]\n',
        ),
      ).toMatchObject({
        key: 'teamsYamlErrLinePlayer',
        vars: { team: 'RAVENS', line: 'O1', player: '99 Zed' },
        line: 5,
      });
      expect(
        failure('RAVENS:\n  color: "#111"\n  players: [7 Ada, 8 Ada]\n  lines:\n    O1: [Ada]\n'),
      ).toMatchObject({ key: 'teamsYamlErrLineAmbiguous' });
    });

    it('anything that is not teams by name', () => {
      expect(failure('- RAVENS\n- FOXES\n').key).toBe('teamsYamlErrRoot');
    });
  });
});

describe('the teams draft', () => {
  it('tells a rename apart from a removal, including after a trip through the YAML', () => {
    const stored = [ravens, foxes];
    const draft = draftFromStore(stored).map((d) =>
      d.name === 'RAVENS' ? { ...d, name: 'RAVENS A' } : d,
    );
    expect(removedTeams(stored, draft)).toEqual([]);
    const back = draftFromParsed(parsed(teamsToYaml(draft)), draft, stored);
    expect(removedTeams(stored, back)).toEqual([]);
    expect(
      removedTeams(
        stored,
        back.filter((d) => d.name !== 'FOXES'),
      ),
    ).toEqual(['FOXES']);
  });

  it('ignores ids, team order and colour case when deciding whether anything changed', () => {
    const shuffled = [
      { ...foxes, color: '#E5534B' },
      { ...ravens, players: ravens.players.map((p) => ({ ...p, id: p.id + 'x' })) },
    ];
    expect(teamsSignature(shuffled)).toBe(teamsSignature([ravens, foxes]));
    expect(playerKey(ravens.players[0])).toBe('7|ada');
  });
});
