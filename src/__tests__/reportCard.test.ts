import { beforeEach, describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import type { TFunc } from '../i18n/useT';
import { createInitialState, defaultConfig } from '../state/gameReducer';
import { reportCardModel, teamStatRows } from '../state/reportCard';
import type { GameState, LogEntry, PointRecord } from '../state/types';

/** Same shape as the real translator, without standing up the provider. */
const t: TFunc = (key, vars) => {
  const raw = en[key] as string;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
};

function point(patch: Partial<PointRecord> = {}): PointRecord {
  return {
    scoredBy: 'A',
    offense: 'A',
    isBreak: false,
    durationSeconds: 10,
    half: 1,
    turnovers: 0,
    ...patch,
  };
}

let nextLogId = 1;
function entry(patch: Partial<LogEntry> = {}): LogEntry {
  return {
    id: nextLogId++,
    wallClock: '10:00:00',
    atMs: 0,
    gameSeconds: 0,
    type: 'goal',
    ...patch,
  };
}

/** See reportScreenStats.test.tsx — defaultConfig is a shared singleton, so it has to be cloned. */
function baseState(): GameState {
  const state = createInitialState(structuredClone(defaultConfig));
  state.phase = 'report';
  state.status = 'finished';
  return state;
}

beforeEach(() => {
  nextLogId = 1;
});

describe('teamStatRows', () => {
  it('drops the turnover-derived rows when activity tracking is off', () => {
    const state = baseState();
    state.config.statsMode = 'none';
    const labels = teamStatRows(state, t).map((r) => r.label);

    expect(labels).toContain('O-line holds');
    expect(labels).toContain('Break points');
    expect(labels).not.toContain('Clean holds');
    expect(labels).not.toContain('Break chances');
    expect(labels).not.toContain('Turnovers');
    expect(labels).not.toContain('Clean breaks');
  });

  it('formats the average times as a clock, and an absent average as a dash', () => {
    const state = baseState();
    state.config.statsMode = 'game';
    state.points = [point({ scoredBy: 'A', offense: 'A', isBreak: false, durationSeconds: 95 })];

    const rows = teamStatRows(state, t);
    expect(rows.find((r) => r.label === 'Avg. hold time')).toEqual({
      label: 'Avg. hold time',
      a: '01:35',
      b: '—',
    });
    // Neither side ever broke, so both averages are empty.
    expect(rows.find((r) => r.label === 'Avg. break time')).toEqual({
      label: 'Avg. break time',
      a: '—',
      b: '—',
    });
  });
});

describe('reportCardModel', () => {
  it('carries the score, team names and colours the card paints', () => {
    const state = baseState();
    state.config.teams = {
      A: { name: 'Foxes', color: '#ff0000' },
      B: { name: 'Wolves', color: '#0000ff' },
    };
    state.scores = { A: 15, B: 12 };

    const model = reportCardModel(state, t, 'en');
    expect(model.teams).toEqual([
      { name: 'Foxes', color: '#ff0000', score: '15' },
      { name: 'Wolves', color: '#0000ff', score: '12' },
    ]);
    expect(model.statHeader).toEqual(['Foxes', 'Wolves']);
  });

  it('has no "Final report" heading — the screen needs one to say where you are, an image does not', () => {
    const state = baseState();
    state.config.fieldNumber = '3';
    expect(JSON.stringify(reportCardModel(state, t, 'en'))).not.toContain('Final report');
  });

  it('puts the field, date and the clock times of the game in the meta line', () => {
    const state = baseState();
    state.config.fieldNumber = '3';
    const start = Date.UTC(2026, 6, 30, 9, 0, 0);
    state.log = [
      entry({ type: 'gameStart', wallClock: '11:00:00', atMs: start }),
      entry({ type: 'gameEnd', wallClock: '12:07:30', atMs: start + 4050_000 }),
    ];

    const meta = reportCardModel(state, t, 'en').meta;
    expect(meta).toContain('Field 3');
    expect(meta).toContain('Started: 11:00:00');
    expect(meta).toContain('Finished: 12:07:30');
    expect(meta).toContain('Duration: 67:30');
    expect(meta.some((m) => m.includes('2026'))).toBe(true);
  });

  it('leaves the field out when none was entered, rather than printing an empty one', () => {
    const state = baseState();
    state.config.fieldNumber = '  ';
    expect(reportCardModel(state, t, 'en').meta).not.toContain('Field   ');
    expect(reportCardModel(state, t, 'en').meta.some((m) => m.startsWith('Field'))).toBe(false);
  });

  it('gives every player row a team colour in Player mode, and none in Team mode', () => {
    const state = baseState();
    state.config.statsMode = 'player';
    state.config.teams = {
      A: { name: 'Foxes', color: '#ff0000' },
      B: { name: 'Wolves', color: '#0000ff' },
    };
    state.config.players = {
      A: [{ id: 'a1', number: '7', name: 'Alex' }],
      B: [{ id: 'b1', number: '', name: 'Jo' }],
    };
    state.log = [entry({ team: 'A', scorerId: 'a1' }), entry({ team: 'B', scorerId: 'b1' })];

    // Neither goal has an assist, so each team also gets its own aggregate row —
    // which is coloured too, since it is per team and the filter has to place it.
    const both = reportCardModel(state, t, 'en').playerRows;
    expect(both.map((p) => p.label)).toEqual(['#7 Alex', 'Jo', 'Not recorded', 'Not recorded']);
    expect(both.map((p) => p.color)).toEqual(['#ff0000', '#0000ff', '#ff0000', '#0000ff']);

    // Team mode lists one roster, so a colour dot would distinguish nothing.
    state.config.statsMode = 'team';
    state.config.trackedTeam = 'A';
    const tracked = reportCardModel(state, t, 'en').playerRows;
    expect(tracked.map((p) => p.label)).toEqual(['#7 Alex', 'Not recorded']);
    expect(tracked.every((p) => p.color === null)).toBe(true);
  });

  it('counts assists and goals separately and totals them', () => {
    const state = baseState();
    state.config.statsMode = 'team';
    state.config.trackedTeam = 'A';
    state.config.players = { A: [{ id: 'a1', number: '', name: 'Alex' }], B: [] };
    state.log = [
      entry({ team: 'A', scorerId: 'a1', callahan: true }),
      entry({ team: 'A', scorerId: 'a1', callahan: true }),
      entry({ team: 'A', assistId: 'a1', scorerId: 'a1' }),
    ];

    expect(reportCardModel(state, t, 'en').playerRows).toEqual([
      {
        label: 'Alex',
        color: null,
        unassigned: false,
        assists: '1',
        goals: '3',
        total: '4',
      },
    ]);
  });

  // The columns have to add up to the score, so what nobody was named on is
  // carried by one dimmed row per team rather than silently dropped.
  it('adds a per-team row for the goals nobody was named on', () => {
    const state = baseState();
    state.config.statsMode = 'team';
    state.config.trackedTeam = 'A';
    state.config.players = { A: [{ id: 'a1', number: '', name: 'Alex' }], B: [] };
    state.log = [
      entry({ team: 'A', scorerId: 'a1', assistId: 'a1' }),
      entry({ team: 'A' }), // nobody named
      entry({ team: 'A', scorerId: 'a1', callahan: true }), // no assist by the rules
    ];

    expect(reportCardModel(state, t, 'en').playerRows[1]).toEqual({
      label: 'Not recorded',
      color: null,
      unassigned: true,
      assists: '1',
      goals: '1',
      total: '2',
    });
  });

  it('has no player section at all when nobody was attributed', () => {
    const state = baseState();
    state.config.statsMode = 'game';
    state.points = [point()];
    state.log = [entry({ team: 'A' })];

    expect(reportCardModel(state, t, 'en').playerRows).toEqual([]);
  });

  it('builds the possession ledger with running scores, and none when nothing was tracked', () => {
    const state = baseState();
    state.config.statsMode = 'game';
    state.config.startingSide = 'A';
    state.points = [
      point({ scoredBy: 'A', possessionSeconds: { A: 30, B: 10 } }),
      point({ scoredBy: 'B', possessionSeconds: { A: 5, B: 15 } }),
      point({ scoredBy: 'A' }), // recorded before possession was timed — drawn flat
    ];

    const ledger = reportCardModel(state, t, 'en').ledger;
    expect(ledger?.title).toBe('Possession by point');
    // All three points opened with A on offence (the point() factory default),
    // so the amber offence dot sits top on every column — making the second
    // one, scored by B, read as the break it was.
    expect(ledger?.columns).toEqual([
      { topShare: 0.75, topScored: true, topOffense: true, score: '1' },
      { topShare: 0.25, topScored: false, topOffense: true, score: '1' },
      { topShare: null, topScored: true, topOffense: true, score: '2' },
    ]);

    // statsMode 'none' never tracked possession, so there is no strip to draw.
    const untracked = baseState();
    untracked.config.statsMode = 'none';
    untracked.points = [point()];
    expect(reportCardModel(untracked, t, 'en').ledger).toBeNull();
  });

  it('never carries the game log — leaving it out is the whole point of the image', () => {
    const bare = baseState();
    bare.log = [entry({ type: 'gameStart' })];

    const chatty = baseState();
    chatty.log = [
      entry({ type: 'gameStart' }),
      entry({ type: 'note', detail: 'wind picked up' }),
      entry({ type: 'note', detail: 'sideline warned' }),
    ];

    const model = reportCardModel(chatty, t, 'en');
    expect(model).toEqual(reportCardModel(bare, t, 'en'));
    expect(JSON.stringify(model)).not.toContain('wind picked up');
  });
});
