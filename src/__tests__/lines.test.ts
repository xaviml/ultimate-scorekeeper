import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../state/gameReducer';
import {
  benchPlayers,
  expectedSplit,
  lineComposition,
  lineIssues,
  lineTeam,
  lineTrackedFor,
  lineTrackingEnabled,
  onFieldIds,
  playersOnField,
  replacementsFor,
  resolveSavedLine,
  savedLineFrom,
  subIssues,
} from '../state/lines';
import type { GameConfig, LineConfig, PlayerInfo } from '../state/types';

/**
 * `size` is lifted out to `lineSize` — it is a field-format rule that rides the
 * template, not one of the tracking settings (see GameConfig).
 */
const cfg = (
  lines: Partial<LineConfig> & { size?: number } = {},
  patch: Partial<GameConfig> = {},
): GameConfig => {
  const { size, ...rest } = lines;
  return {
    ...defaultConfig,
    statsMode: 'team',
    trackedTeam: 'A',
    ...(size !== undefined ? { lineSize: size } : {}),
    lines: { ...defaultConfig.lines, enabled: true, ...rest },
    ...patch,
  };
};

const player = (id: string, gender?: 'male' | 'female'): PlayerInfo => ({
  id,
  number: id.replace(/\D/g, ''),
  name: `Player ${id}`,
  ...(gender ? { gender } : {}),
});

/** Four FMP, four MMP, one unmarked. */
const roster: PlayerInfo[] = [
  player('p1', 'female'),
  player('p2', 'female'),
  player('p3', 'female'),
  player('p4', 'female'),
  player('p5', 'male'),
  player('p6', 'male'),
  player('p7', 'male'),
  player('p8', 'male'),
  player('p9'),
];

describe('lineTrackingEnabled', () => {
  // The gate, not the flag: every consumer asks this, which is what lets the stats
  // mode retire line tracking without anything having to clear the setting.
  it('needs the flag, team mode and a tracked team all at once', () => {
    expect(lineTrackingEnabled(cfg())).toBe(true);
    expect(lineTrackingEnabled(cfg({ enabled: false }))).toBe(false);
    expect(lineTrackingEnabled(cfg({}, { statsMode: 'player', trackedTeam: null }))).toBe(false);
    expect(lineTrackingEnabled(cfg({}, { statsMode: 'game', trackedTeam: null }))).toBe(false);
    expect(lineTrackingEnabled(cfg({}, { statsMode: 'none', trackedTeam: null }))).toBe(false);
    expect(lineTrackingEnabled(cfg({}, { trackedTeam: null }))).toBe(false);
  });

  it('names the tracked team, and only that team', () => {
    expect(lineTeam(cfg({}, { trackedTeam: 'B' }))).toBe('B');
    expect(lineTeam(cfg({ enabled: false }))).toBeNull();
    expect(lineTrackedFor(cfg(), 'A')).toBe(true);
    expect(lineTrackedFor(cfg(), 'B')).toBe(false);
  });
});

describe('expectedSplit', () => {
  it('has nothing to check when the check is off', () => {
    expect(expectedSplit(cfg({ genderCheck: 'none' }), 'female')).toBeNull();
  });

  it('splits sevens 4-3 and fives 3-2 to whichever marking the ratio names', () => {
    const seven = cfg({ genderCheck: 'gameRatio', size: 7 });
    expect(expectedSplit(seven, 'female')).toEqual({ female: 4, male: 3 });
    expect(expectedSplit(seven, 'male')).toEqual({ female: 3, male: 4 });
    const five = cfg({ genderCheck: 'gameRatio', size: 5 });
    expect(expectedSplit(five, 'female')).toEqual({ female: 3, male: 2 });
    expect(expectedSplit(five, 'male')).toEqual({ female: 2, male: 3 });
  });

  // Rule B leaves the ratio to the end zone and never computes one; open and
  // women's divisions have none at all. Checking against a guess would be worse.
  it('checks nothing when the game has no ratio to follow', () => {
    expect(expectedSplit(cfg({ genderCheck: 'gameRatio' }), null)).toBeNull();
  });

  it('takes a fixed split straight from the config, ignoring the ratio', () => {
    expect(expectedSplit(cfg({ genderCheck: 'fixed', fixedFemale: 1, size: 7 }), 'female')).toEqual(
      {
        female: 1,
        male: 6,
      },
    );
    expect(expectedSplit(cfg({ genderCheck: 'fixed', fixedFemale: 3, size: 7 }), null)).toEqual({
      female: 3,
      male: 4,
    });
  });

  it('clamps a fixed split that outruns the line size', () => {
    expect(expectedSplit(cfg({ genderCheck: 'fixed', fixedFemale: 9, size: 7 }), null)).toEqual({
      female: 7,
      male: 0,
    });
  });
});

describe('lineComposition', () => {
  it('counts each marking and says how many are unmarked', () => {
    expect(lineComposition(roster, ['p1', 'p2', 'p5', 'p9'])).toEqual({
      size: 4,
      female: 2,
      male: 1,
      unknown: 1,
    });
  });

  it('ignores ids that are not on the roster', () => {
    expect(lineComposition(roster, ['p1', 'gone'])).toMatchObject({ size: 1, female: 1 });
  });
});

describe('lineIssues', () => {
  const ratioCfg = cfg({ genderCheck: 'gameRatio', size: 7 });

  it('is empty for a line that matches', () => {
    // Ratio 'female' at seven wants 4 FMP and 3 MMP.
    expect(
      lineIssues(ratioCfg, 'female', roster, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']),
    ).toEqual([]);
  });

  it('reports a line that is the wrong size', () => {
    expect(lineIssues(ratioCfg, 'female', roster, ['p1', 'p2'])).toEqual(['size']);
  });

  it('reports a split that breaks the ratio', () => {
    // Five MMP where the ratio allows three.
    const issues = lineIssues(ratioCfg, 'female', roster, [
      'p1',
      'p2',
      'p5',
      'p6',
      'p7',
      'p8',
      'p9',
    ]);
    expect(issues).toContain('ratio');
  });

  it('checks no split at all when the check is off', () => {
    const off = cfg({ genderCheck: 'none', size: 7 });
    expect(lineIssues(off, 'female', roster, ['p5', 'p6', 'p7', 'p8', 'p1', 'p2', 'p3'])).toEqual(
      [],
    );
  });

  // Unmarked players make the split unknown, not wrong. Faulting it would train the
  // volunteer to tap straight through the warning.
  it('does not fault a line just because players are unmarked', () => {
    const sparse = [player('q1'), player('q2'), player('q3')];
    const small = cfg({ genderCheck: 'gameRatio', size: 3 });
    expect(lineIssues(small, 'female', sparse, ['q1', 'q2', 'q3'])).toEqual([]);
  });
});

describe('saved lines', () => {
  // Ids are re-minted every time a saved team is loaded, so a saved line stores
  // number|name keys and resolves against whichever roster is in play.
  it('round-trips through re-minted ids', () => {
    const saved = savedLineFrom('l1', 'O1', ['p1', 'p5'], roster);
    expect(saved.playerKeys).toEqual(['1|player p1', '5|player p5']);
    const reminted = roster.map((p) => ({ ...p, id: `new-${p.id}` }));
    expect(resolveSavedLine(saved, reminted)).toEqual(['new-p1', 'new-p5']);
  });

  it('drops players who are no longer on the roster', () => {
    const saved = savedLineFrom('l1', 'O1', ['p1', 'p5'], roster);
    expect(resolveSavedLine(saved, [roster[0]])).toEqual(['p1']);
  });

  it('trims the name and skips ids that are not on the roster', () => {
    const saved = savedLineFrom('l1', '  D1  ', ['p1', 'ghost'], roster);
    expect(saved.name).toBe('D1');
    expect(saved.playerKeys).toHaveLength(1);
  });
});

describe('playersOnField', () => {
  const teamCfg = cfg();

  it('narrows the roster to who was on the field', () => {
    expect(playersOnField(teamCfg, 'A', roster, ['p1', 'p5']).map((p) => p.id)).toEqual([
      'p1',
      'p5',
    ]);
  });

  /**
   * The fallback is load-bearing: a volunteer who skipped the line still has to be
   * able to attribute a goal, so "nothing registered" means "no restriction" rather
   * than "nobody is eligible".
   */
  it('offers everyone when there is nothing to narrow by', () => {
    expect(playersOnField(teamCfg, 'A', roster, [])).toEqual(roster);
    // Not the line team.
    expect(playersOnField(teamCfg, 'B', roster, ['p1'])).toEqual(roster);
    // Line tracking off entirely.
    expect(playersOnField(cfg({ enabled: false }), 'A', roster, ['p1'])).toEqual(roster);
  });

  it('offers everyone when the line has no one left on the roster', () => {
    expect(playersOnField(teamCfg, 'A', roster, ['gone', 'also-gone'])).toEqual(roster);
  });
});

describe('benchPlayers', () => {
  it('is the roster minus whoever is on', () => {
    expect(benchPlayers(roster, ['p1', 'p2']).map((p) => p.id)).toEqual([
      'p3',
      'p4',
      'p5',
      'p6',
      'p7',
      'p8',
      'p9',
    ]);
  });

  it('is empty when the whole roster is on', () => {
    expect(
      benchPlayers(
        roster,
        roster.map((p) => p.id),
      ),
    ).toEqual([]);
  });
});

describe('onFieldIds', () => {
  // The record keeps whoever came off — they played part of the point — but the
  // pickers must not offer them: a replaced player cannot go on to score it.
  it('leaves out whoever a substitution took off', () => {
    expect(
      onFieldIds([
        { playerId: 'p1', off: true },
        { playerId: 'p2' },
        { playerId: 'p3', sub: true },
      ]),
    ).toEqual(['p2', 'p3']);
  });

  it('is empty for a point with no line at all', () => {
    expect(onFieldIds(undefined)).toEqual([]);
  });
});

describe('replacementsFor', () => {
  const fmp = roster.find((p) => p.id === 'p1')!; // female
  const mmp = roster.find((p) => p.id === 'p5')!; // male
  const unmarked = roster.find((p) => p.id === 'p9')!;
  /** p1–p4 on the field, so the bench is p5–p8 (MMP) plus p9 (unmarked). */
  const onField = ['p1', 'p2', 'p3', 'p4'];

  // You cannot swap an MMP for an FMP: the line has to come back to the same split.
  it('offers only the matching marking in mixed', () => {
    const bench = replacementsFor(cfg(), roster, onField, [mmp]);
    expect(bench.map((p) => p.id)).toEqual(['p5', 'p6', 'p7', 'p8', 'p9']);
    // An FMP injury has no FMP left on this bench, only the unmarked one.
    expect(replacementsFor(cfg(), roster, onField, [fmp]).map((p) => p.id)).toEqual(['p9']);
  });

  it('offers the whole bench outside mixed, where there is no split to keep', () => {
    const open = cfg({}, { division: 'open' });
    expect(replacementsFor(open, roster, onField, [fmp]).map((p) => p.id)).toEqual([
      'p5',
      'p6',
      'p7',
      'p8',
      'p9',
    ]);
  });

  // A missing marking is unknown, not wrong (see lineIssues) — so it constrains
  // nothing on the way in, and is never excluded on the way out.
  it('puts no constraint on the bench for an unmarked injured player', () => {
    expect(replacementsFor(cfg(), roster, onField, [unmarked]).map((p) => p.id)).toEqual([
      'p5',
      'p6',
      'p7',
      'p8',
      'p9',
    ]);
  });

  it('matches either marking when two players of different markings are hurt', () => {
    expect(replacementsFor(cfg(), roster, onField, [fmp, mmp]).map((p) => p.id)).toEqual([
      'p5',
      'p6',
      'p7',
      'p8',
      'p9',
    ]);
  });

  it('is empty when nobody eligible is left', () => {
    // Everyone but the unmarked p9 is on; an FMP injury then has p9 and no one else.
    const allButNine = roster.filter((p) => p.id !== 'p9').map((p) => p.id);
    expect(replacementsFor(cfg(), roster, allButNine, [fmp]).map((p) => p.id)).toEqual(['p9']);
    // With p9 on as well there is nobody at all.
    expect(
      replacementsFor(
        cfg(),
        roster,
        roster.map((p) => p.id),
        [fmp],
      ),
    ).toEqual([]);
  });
});

/**
 * The swap an injury forces, checked the way a line is: it warns, it never refuses,
 * and a missing marking is unknown rather than wrong.
 */
describe('subIssues', () => {
  const mixed = cfg();
  // One FMP off, one FMP on, and the injury allows one change.
  const clean = () => subIssues(mixed, roster, ['p1'], ['p2'], 1);

  it('is empty for a one-for-one swap of the same marking', () => {
    expect(clean()).toEqual([]);
  });

  // p9 is the unmarked one, which is what keeps these cases to a count problem
  // alone — an unequal swap of known markings is a split problem as well.
  it('faults an unequal swap, which leaves the line a different size', () => {
    expect(subIssues(mixed, roster, ['p1'], ['p2', 'p9'], 2)).toEqual(['count']);
    expect(subIssues(mixed, roster, ['p1', 'p9'], ['p2'], 2)).toEqual(['count']);
  });

  // The other team's injury buys exactly one change, and our own injured are the
  // rest of the budget.
  it('faults changing more players than the injury allows', () => {
    expect(subIssues(mixed, roster, ['p1', 'p2'], ['p3', 'p4'], 1)).toEqual(['allowance']);
    expect(subIssues(mixed, roster, ['p1', 'p2'], ['p3', 'p4'], 2)).toEqual([]);
  });

  it('faults markings coming on that cannot account for the ones going off', () => {
    // An MMP off and an FMP on could not have happened.
    expect(subIssues(mixed, roster, ['p5'], ['p1'], 1)).toEqual(['ratio']);
    // Two off, one of each — two FMP on is still wrong even though the count matches.
    expect(subIssues(mixed, roster, ['p1', 'p5'], ['p2', 'p3'], 2)).toEqual(['ratio']);
  });

  // The same rule `lineIssues` and `replacementsFor` follow: an unmarked player on
  // either side of the swap could have been either marking.
  it('never faults the split over an unmarked player', () => {
    expect(subIssues(mixed, roster, ['p9'], ['p1'], 1)).toEqual([]);
    expect(subIssues(mixed, roster, ['p1'], ['p9'], 1)).toEqual([]);
  });

  it('checks no split at all outside mixed', () => {
    const open = cfg({}, { division: 'open' });
    expect(subIssues(open, roster, ['p5'], ['p1'], 1)).toEqual([]);
  });
});
