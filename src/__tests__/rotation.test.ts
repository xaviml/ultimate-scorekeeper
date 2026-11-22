import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import type { TFunc } from '../i18n/useT';
import { createInitialState } from '../state/gameReducer';
import { lineRotation, sortByRest, STRIP_POINTS } from '../state/rotation';
import type { GameState, PlayerInfo, PointRecord, TeamId } from '../state/types';

const t = ((key: keyof typeof en) => en[key]) as TFunc;

const roster: PlayerInfo[] = [
  { id: 'a', number: '1', name: 'Ann' },
  { id: 'b', number: '2', name: 'Bea' },
  { id: 'c', number: '3', name: 'Cal' },
  { id: 'd', number: '4', name: 'Dan' },
];

/** One finished point for team A: who played it, who scored, who received. */
function point(
  line: string[] | null,
  scoredBy: TeamId,
  offense: TeamId,
  durationSeconds = 60,
  lineName?: string,
): PointRecord {
  return {
    scoredBy,
    offense,
    isBreak: scoredBy !== offense,
    durationSeconds,
    half: 1,
    turnovers: 0,
    ...(line ? { line: line.map((playerId) => ({ playerId })) } : {}),
    ...(lineName ? { lineName } : {}),
  };
}

function game(points: PointRecord[], extra: Partial<GameState> = {}): GameState {
  const s = createInitialState();
  s.phase = 'game';
  s.status = 'awaitingPull';
  s.config = {
    ...s.config,
    statsMode: 'players',
    trackedTeam: 'A',
    lines: { ...s.config.lines, enabled: true },
    players: { A: roster, B: [] },
  };
  s.points = points;
  return { ...s, ...extra };
}

describe('lineRotation', () => {
  it('counts points played, holds out of O points and breaks out of D points', () => {
    const r = lineRotation(
      game([
        point(['a', 'b'], 'A', 'A'), // hold
        point(['a', 'c'], 'B', 'A'), // broken
        point(['a', 'b'], 'A', 'B'), // break
        point(['a', 'c'], 'B', 'B'), // D point lost
      ]),
      'A',
      t,
    );
    expect(r.players.get('a')).toMatchObject({
      played: 4,
      oPlayed: 2,
      holds: 1,
      dPlayed: 2,
      breaks: 1,
    });
    expect(r.players.get('b')).toMatchObject({
      played: 2,
      oPlayed: 1,
      holds: 1,
      dPlayed: 1,
      breaks: 1,
    });
    expect(r.players.get('d')).toMatchObject({ played: 0, oPlayed: 0, dPlayed: 0 });
  });

  it('builds a fixed-width strip, oldest first, padded before the first point', () => {
    const r = lineRotation(
      game([point(['a'], 'A', 'A'), point(['b'], 'B', 'A'), point(null, 'A', 'B')]),
      'A',
      t,
    );
    const strip = r.players.get('a')!.strip;
    expect(strip).toHaveLength(STRIP_POINTS);
    expect(strip.slice(0, 3)).toEqual([null, null, null]);
    expect(strip.slice(3).map((m) => m!.kind)).toEqual(['played', 'out', 'unknown']);
    expect(strip[3]).toEqual({ kind: 'played', seconds: 60 });
  });

  it('keeps only the last points in the strip, scaled to the longest of them', () => {
    const points = Array.from({ length: 8 }, (_, i) => point(['a'], 'A', 'A', 30 + i * 10));
    const r = lineRotation(game(points), 'A', t);
    expect(r.players.get('a')!.strip.every((m) => m?.kind === 'played')).toBe(true);
    expect(r.maxSeconds).toBe(100);
  });

  it('counts rest back to the last point played, skipping points with no line', () => {
    const r = lineRotation(
      game([
        point(['a', 'b'], 'A', 'A'),
        point(['b'], 'A', 'B'),
        point(null, 'A', 'B'),
        point(['c'], 'A', 'B'),
      ]),
      'A',
      t,
    );
    expect(r.players.get('a')!.rest).toBe(2);
    expect(r.players.get('b')!.rest).toBe(1);
    expect(r.players.get('c')!.rest).toBe(0);
    expect(r.players.get('d')!.rest).toBeNull();
  });

  // Picking the next line while this one is played: whoever is out there now is
  // not rested for the next point.
  it('adds the point in progress as a pending slot when asked', () => {
    const state = game([point(['a'], 'A', 'A')], {
      status: 'live',
      pointLine: [{ playerId: 'b' }],
    });
    const r = lineRotation(state, 'A', t, { inProgress: true });
    expect(r.players.get('b')!.strip[STRIP_POINTS - 1]).toEqual({ kind: 'pending' });
    expect(r.players.get('b')!.rest).toBe(0);
    expect(r.players.get('a')!.strip[STRIP_POINTS - 1]).toEqual({ kind: 'out' });
    expect(r.players.get('a')!.rest).toBe(1);
    // Not finished, so not a point played.
    expect(r.players.get('b')!.played).toBe(0);
    expect(lineRotation(state, 'A', t).players.get('b')!.rest).toBeNull();
  });

  it('keeps each predefined line’s record', () => {
    const r = lineRotation(
      game([
        point(['a'], 'A', 'A', 60, 'O1'),
        point(['a'], 'B', 'A', 60, 'O1'),
        point(['b'], 'A', 'B', 60, 'D1'),
      ]),
      'A',
      t,
    );
    expect(r.savedLines.get('O1')).toEqual({ won: 1, played: 2 });
    expect(r.savedLines.get('D1')).toEqual({ won: 1, played: 1 });
  });

  it('reads turns and Ds off the log, and shows them only when someone is named', () => {
    const quiet = lineRotation(game([]), 'A', t);
    expect(quiet.possession).toBe(false);

    const state = game([]);
    state.log = [
      {
        id: 1,
        wallClock: '',
        atMs: 0,
        gameSeconds: 0,
        type: 'turnover',
        team: 'A',
        turnoverId: 'a',
      },
      {
        id: 2,
        wallClock: '',
        atMs: 0,
        gameSeconds: 0,
        type: 'turnover',
        team: 'B',
        defenseId: 'b',
      },
    ];
    const r = lineRotation(state, 'A', t);
    expect(r.possession).toBe(true);
    expect(r.players.get('a')).toMatchObject({ turns: 1, defenses: 0 });
    expect(r.players.get('b')).toMatchObject({ turns: 0, defenses: 1 });
  });
});

describe('sortByRest', () => {
  it('puts those yet to play first, then the longest rested, then fewer points', () => {
    const state = game([
      point(['a', 'b'], 'A', 'A'),
      point(['a', 'b'], 'A', 'B'),
      point(['c'], 'A', 'B'),
      point(['a'], 'A', 'B'),
    ]);
    const r = lineRotation(state, 'A', t);
    // d never played; b rested 2; c rested 1; a just played.
    expect(sortByRest(roster, r).map((p) => p.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('reads as the team sheet when nobody has rest to compare', () => {
    const r = lineRotation(game([]), 'A', t);
    expect(sortByRest([...roster].reverse(), r).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
