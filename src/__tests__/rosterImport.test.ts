import { describe, expect, it } from 'vitest';
import { applyImport, isTextRosterFile, parseRoster } from '../state/rosterImport';
import type { PlayerInfo } from '../state/types';

const pairs = (text: string) => parseRoster(text).players.map((p) => `${p.number}|${p.name}`);

describe('parseRoster — line formats', () => {
  it('reads the format the placeholder advertises', () => {
    expect(pairs('12 John Doe\n23\nJohn Doe')).toEqual(['12|John Doe', '23|', '|John Doe']);
  });

  it('reads a name followed by a number, with or without a hash', () => {
    expect(pairs('Anna Smith #12\nMarc Puig 7\nJordi Roca - 23')).toEqual([
      '12|Anna Smith',
      '7|Marc Puig',
      '23|Jordi Roca',
    ]);
  });

  it('reads separators around a leading number', () => {
    expect(pairs('12. Anna Smith\n#7 - Marc Puig\n23) Jordi Roca')).toEqual([
      '12|Anna Smith',
      '7|Marc Puig',
      '23|Jordi Roca',
    ]);
  });

  it('accepts a name on its own, and a number on its own', () => {
    expect(pairs('Anna Smith\n23\n#7\nMarc Puig')).toEqual([
      '|Anna Smith',
      '23|',
      '7|',
      '|Marc Puig',
    ]);
  });

  it('reads a tab-separated line, since a tab is just whitespace', () => {
    expect(pairs('12\tAnna Smith\nMarc Puig\t7')).toEqual(['12|Anna Smith', '7|Marc Puig']);
  });

  it('drops a header line, but keeps a player called Name further down', () => {
    expect(pairs('# Name\n12 Anna Smith\nName')).toEqual(['12|Anna Smith', '|Name']);
  });

  it('collapses whitespace and trims quotes from names', () => {
    expect(pairs('12   "Anna    Smith"  ')).toEqual(['12|Anna Smith']);
  });

  it('counts unusable lines rather than failing the whole paste', () => {
    const parse = parseRoster('12 Anna Smith\n-----\n7 Marc Puig');
    expect(parse.players).toHaveLength(2);
    expect(parse.skipped).toBe(1);
  });

  it('drops repeated lines — the same player twice is one player', () => {
    expect(pairs('12 Anna Smith\n12 anna smith\n7 Marc Puig')).toEqual([
      '12|Anna Smith',
      '7|Marc Puig',
    ]);
  });

  it('keeps two players who share a number but not a name', () => {
    expect(pairs('12 Anna Smith\n12 Marc Puig')).toHaveLength(2);
  });

  it('returns nothing for an empty paste', () => {
    expect(parseRoster('   \n  ')).toEqual({ players: [], skipped: 0 });
  });
});

describe('applyImport', () => {
  const existing: PlayerInfo[] = [{ id: 'a', number: '12', name: 'Anna Smith' }];

  it('appends, giving each imported player an id', () => {
    const result = applyImport(existing, [{ number: '7', name: 'Marc Puig' }], false);
    expect(result.added).toBe(1);
    expect(result.players).toHaveLength(2);
    expect(result.players[1].id).toBeTruthy();
    expect(result.players[1].id).not.toBe('a');
  });

  it('skips players already on the roster instead of duplicating them', () => {
    const result = applyImport(
      existing,
      [
        { number: '12', name: 'anna smith' },
        { number: '7', name: 'Marc Puig' },
      ],
      false,
    );
    expect(result.added).toBe(1);
    expect(result.duplicates).toBe(1);
    expect(result.players).toHaveLength(2);
  });

  it('replaces the whole roster when asked, keeping no old ids', () => {
    const result = applyImport(existing, [{ number: '7', name: 'Marc Puig' }], true);
    expect(result.players).toHaveLength(1);
    expect(result.added).toBe(1);
    expect(result.players[0].number).toBe('7');
  });

  it('re-adds a player under replace who would be a duplicate under append', () => {
    const result = applyImport(existing, [{ number: '12', name: 'Anna Smith' }], true);
    expect(result.added).toBe(1);
    expect(result.duplicates).toBe(0);
  });
});

describe('isTextRosterFile', () => {
  const file = (name: string, type = '') => new File(['x'], name, { type });

  it('accepts plain text, by extension or by type', () => {
    expect(isTextRosterFile(file('roster.txt'))).toBe(true);
    expect(isTextRosterFile(file('ROSTER.TXT', 'text/plain'))).toBe(true);
    expect(isTextRosterFile(file('roster', 'text/plain'))).toBe(true);
  });

  it('refuses the formats the box does not take', () => {
    expect(isTextRosterFile(file('roster.csv', 'text/csv'))).toBe(false);
    expect(isTextRosterFile(file('roster.json', 'application/json'))).toBe(false);
    expect(isTextRosterFile(file('roster.pdf', 'application/pdf'))).toBe(false);
  });
});

describe('MMP/FMP markings', () => {
  it('reads a marking after a number and a name', () => {
    expect(parseRoster('29 Xavi MMP').players[0]).toEqual({
      number: '29',
      name: 'Xavi',
      gender: 'male',
    });
  });

  it('reads one after a bare name', () => {
    expect(parseRoster('Xavi MMP').players[0]).toEqual({
      number: '',
      name: 'Xavi',
      gender: 'male',
    });
  });

  it('reads one after a bare number', () => {
    expect(parseRoster('29 MMP').players[0]).toEqual({
      number: '29',
      name: '',
      gender: 'male',
    });
  });

  it('reads FMP too', () => {
    expect(parseRoster('7 Noa FMP').players[0]).toMatchObject({ gender: 'female' });
  });

  /**
   * A marking with nobody attached is not a roster entry, and someone whose name
   * really is those three letters would otherwise vanish — so a line that is *only*
   * MMP/FMP is a player called that.
   */
  it('treats a line that is only MMP or FMP as a name', () => {
    expect(parseRoster('MMP').players).toEqual([{ number: '', name: 'MMP' }]);
    expect(parseRoster('FMP').players).toEqual([{ number: '', name: 'FMP' }]);
  });

  it('leaves a player with no marking unmarked, rather than guessing', () => {
    expect(parseRoster('29 Xavi').players[0].gender).toBeUndefined();
  });

  it('accepts any casing, and the separators a human writes', () => {
    expect(parseRoster('29 Xavi mmp').players[0]).toMatchObject({ gender: 'male' });
    expect(parseRoster('29 Xavi, FMP').players[0]).toMatchObject({
      name: 'Xavi',
      gender: 'female',
    });
    expect(parseRoster('29 Xavi (MMP)').players[0]).toMatchObject({
      name: 'Xavi',
      gender: 'male',
    });
    // A tab-separated spreadsheet column falls out for free, since a tab is whitespace.
    expect(parseRoster('29\tXavi\tFMP').players[0]).toMatchObject({
      name: 'Xavi',
      gender: 'female',
    });
  });

  // Matching the abbreviations exactly, never a leading letter: "Xavi M" is a middle
  // initial far more often than a marking.
  it('does not read a bare M or F as a marking', () => {
    expect(parseRoster('29 Xavi M').players[0]).toEqual({ number: '29', name: 'Xavi M' });
  });

  it('reads a marking after a trailing number', () => {
    expect(parseRoster('Xavi #29 MMP').players[0]).toEqual({
      number: '29',
      name: 'Xavi',
      gender: 'male',
    });
  });

  it('reads a spreadsheet gender column as a header', () => {
    const parse = parseRoster('# Name Gender\n29 Xavi MMP');
    expect(parse.players).toEqual([{ number: '29', name: 'Xavi', gender: 'male' }]);
    expect(parse.skipped).toBe(0);
  });

  // The marking is not part of the identity: the same person marked differently in
  // two rows is one duplicate, not two players.
  it('does not make a differing marking a second player', () => {
    const parse = parseRoster('29 Xavi MMP\n29 Xavi FMP');
    expect(parse.players).toHaveLength(1);
    expect(parse.players[0].gender).toBe('male');
  });

  it('carries the marking through applyImport', () => {
    const result = applyImport([], parseRoster('29 Xavi MMP\n7 Noa FMP\n3 Kim').players, false);
    expect(result.players).toEqual([
      { id: expect.any(String), number: '29', name: 'Xavi', gender: 'male' },
      { id: expect.any(String), number: '7', name: 'Noa', gender: 'female' },
      { id: expect.any(String), number: '3', name: 'Kim' },
    ]);
  });
});
