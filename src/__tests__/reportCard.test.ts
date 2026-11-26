import { beforeEach, describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import type { TFunc } from '../i18n/useT';
import { createInitialState, defaultConfig } from '../state/gameReducer';
import { APP_URL, reportCardModel, teamStatRows, type StatRow } from '../state/reportCard';
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
  const layout = (rows: { label: string; sub?: boolean }[]) =>
    rows.map((r) => (r.sub ? `  ${r.label}` : r.label));
  const find = (label: string) => (rows: StatRow[]) => rows.find((r) => r.label === label)!;

  it('puts each qualifying row under the figure it qualifies', () => {
    const state = baseState();
    state.config.statsMode = 'teams';
    state.config.trackTurnovers = true;
    state.config.trackPasses = true;

    expect(layout(teamStatRows(state, t))).toEqual([
      'Holds',
      '  Clean',
      'Breaks',
      '  Clean',
      'Turnovers',
      'Possessions scored',
      'Passes',
      '  Per possession',
      'Timeouts',
    ]);
  });

  // Every possession a team had, over every point the game recorded turnovers for: a
  // clean hold is one possession and one goal, and a point turned over twice gives
  // the receiving team two possessions and the other team one.
  it('counts possessions scored out of every possession the team had', () => {
    const state = baseState();
    state.config.statsMode = 'teams';
    state.config.trackTurnovers = true;
    state.points = [
      point({ scoredBy: 'A', offense: 'A', turnovers: 0 }),
      point({ scoredBy: 'A', offense: 'B', isBreak: true, turnovers: 1 }),
      point({ scoredBy: 'B', offense: 'B', turnovers: 2 }),
    ];
    const row = find('Possessions scored')(teamStatRows(state, t));
    // A: 1 (point 1) + 1 (point 2, after B lost it) + 1 (point 3, between B's two) = 3, scored 2.
    // B: 0 + 1 + 2 = 3, scored 1.
    expect([row.a, row.aPct, row.b, row.bPct]).toEqual(['2/3', '67%', '1/3', '33%']);
  });

  it('drops the turnover-derived rows when turnovers are not recorded', () => {
    const state = baseState();
    state.config.statsMode = 'none';

    expect(layout(teamStatRows(state, t))).toEqual(['Holds', 'Breaks', 'Timeouts']);
  });

  it('counts holds out of the points received, with the percentage', () => {
    const state = baseState();
    state.points = [
      point({ scoredBy: 'A', offense: 'A' }),
      point({ scoredBy: 'B', offense: 'A', isBreak: true, turnovers: 1 }),
      point({ scoredBy: 'B', offense: 'B' }),
      point({ scoredBy: 'A', offense: 'A' }),
    ];

    expect(find('Holds')(teamStatRows(state, t))).toEqual({
      label: 'Holds',
      a: '2/3',
      b: '1/1',
      aPct: '67%',
      bPct: '100%',
    });
  });

  it('dashes the percentage of a team that has received no point yet', () => {
    const state = baseState();
    state.points = [point({ scoredBy: 'A', offense: 'A' })];
    const holds = find('Holds')(teamStatRows(state, t));

    expect(holds.b).toBe('0/0');
    expect(holds.bPct).toBe('—');
  });

  it('counts breaks out of break chances, with the clean ones under them', () => {
    const state = baseState();
    state.config.statsMode = 'teams';
    state.config.trackTurnovers = true;
    state.points = [
      // B pulls; A turns it over, B scores at once: one chance, converted cleanly.
      point({ scoredBy: 'B', offense: 'A', isBreak: true, turnovers: 1 }),
      // B pulls; A turns it over, B turns it back, A turns it over again, B scores:
      // two chances, one converted, not clean.
      point({ scoredBy: 'B', offense: 'A', isBreak: true, turnovers: 3 }),
      // B pulls; A turns it over once, B gives it back, A scores: one chance missed.
      point({ scoredBy: 'A', offense: 'A', turnovers: 2 }),
    ];
    const rows = teamStatRows(state, t);
    const at = rows.findIndex((r) => r.label === 'Breaks');

    expect(rows[at]).toEqual({ label: 'Breaks', a: '0/0', b: '2/4', aPct: '—', bPct: '50%' });
    expect(rows[at + 1]).toEqual({ label: 'Clean', a: '0', b: '1', sub: true });
  });

  it('counts a break with no turnover recorded as a chance taken', () => {
    // A Callahan, or a Turn tap that never happened: the break is real, so the
    // row must not read more breaks than chances.
    const state = baseState();
    state.config.statsMode = 'teams';
    state.config.trackTurnovers = true;
    state.points = [point({ scoredBy: 'B', offense: 'A', isBreak: true, turnovers: 0 })];
    const breaks = find('Breaks')(teamStatRows(state, t));

    expect(breaks.b).toBe('1/1');
    expect(breaks.bPct).toBe('100%');
  });

  it('shows breaks as a plain count, with no percentage, when turnovers are not recorded', () => {
    const state = baseState();
    state.config.statsMode = 'none';
    state.points = [point({ scoredBy: 'B', offense: 'A', isBreak: true })];

    expect(find('Breaks')(teamStatRows(state, t))).toEqual({ label: 'Breaks', a: '0', b: '1' });
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
    expect(model.teams.map(({ name, color, score }) => ({ name, color, score }))).toEqual([
      { name: 'Foxes', color: '#ff0000', score: '15' },
      { name: 'Wolves', color: '#0000ff', score: '12' },
    ]);
  });

  it('marks the winner and loser only once the scoreline finished the game', () => {
    const state = baseState();
    state.scores = { A: 15, B: 12 };
    state.status = 'finished';
    expect(reportCardModel(state, t, 'en').teams.map((x) => x.result)).toEqual(['win', 'loss']);
    state.status = 'paused';
    expect(reportCardModel(state, t, 'en').teams.map((x) => x.result)).toEqual([null, null]);
  });

  it('has no heading over the meta line — the score speaks for itself in a chat', () => {
    const state = baseState();
    state.config.fieldNumber = '3';
    // "Final score" is still a string in the dictionary (the copied text uses it);
    // it is the picture that labels nothing, the meta line being the whole header.
    expect(JSON.stringify(reportCardModel(state, t, 'en'))).not.toContain('Final score');
  });

  // Same two lines the copied text ends on, so a shared image points back at the app.
  it('ends on the credit line and the app link', () => {
    const { footer } = reportCardModel(baseState(), t, 'en');
    expect(footer).toEqual({ credit: en.reportFooterCredit, url: APP_URL });
    expect(footer.url).toBe('https://xaviml.github.io/ultimate-scorekeeper/');
  });

  it('puts the field, the date and start time, and the duration in the meta line', () => {
    const state = baseState();
    state.config.fieldNumber = '3';
    const start = Date.UTC(2026, 6, 30, 9, 0, 0);
    state.log = [
      entry({ type: 'gameStart', wallClock: '11:00:00', atMs: start }),
      entry({ type: 'gameEnd', wallClock: '12:07:30', atMs: start + 4050_000 }),
    ];

    const meta = reportCardModel(state, t, 'en').meta;
    expect(meta).toHaveLength(3);
    expect(meta[0]).toBe('Field 3');
    // The year stays: an image opened weeks later still says when it was played.
    expect(meta[1]).toMatch(/^30 Jul 2026, \d{2}:\d{2}$/);
    expect(meta[2]).toBe('68 min');
  });

  it('leaves the field out when none was entered, rather than printing an empty one', () => {
    const state = baseState();
    state.config.fieldNumber = '  ';
    expect(reportCardModel(state, t, 'en').meta).not.toContain('Field   ');
    expect(reportCardModel(state, t, 'en').meta.some((m) => m.startsWith('Field'))).toBe(false);
  });

  it('gives every player row a team colour in Player mode, and none in Team mode', () => {
    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
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
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
    state.config.trackedTeam = 'A';
    const tracked = reportCardModel(state, t, 'en').playerRows;
    expect(tracked.map((p) => p.label)).toEqual(['#7 Alex', 'Not recorded']);
    expect(tracked.every((p) => p.color === null)).toBe(true);
  });

  it('counts assists and goals separately and totals them', () => {
    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
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
        // Assists, Goals, Total — the column set for a game with no line tracking.
        values: ['1', '3', '4'],
      },
    ]);
    // Three columns are one group, and a row of labels over them would only be
    // repeating the section title.
    expect(reportCardModel(state, t, 'en').playerGroups).toBeNull();
    expect(reportCardModel(state, t, 'en').playerAccent).toBe(2);
  });

  // The columns have to add up to the score, so what nobody was named on is
  // carried by one dimmed row per team rather than silently dropped.
  it('adds a per-team row for the goals nobody was named on', () => {
    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
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
      values: ['1', '1', '2'],
    });
  });

  it('has no player section at all when nobody was attributed', () => {
    const state = baseState();
    state.config.statsMode = 'teams';
    state.config.trackTurnovers = true;
    state.points = [point()];
    state.log = [entry({ team: 'A' })];

    expect(reportCardModel(state, t, 'en').playerRows).toEqual([]);
  });

  it('carries point by point with every point opened, and the markers between them', () => {
    const state = baseState();
    state.config.statsMode = 'teams';
    state.config.trackTurnovers = true;
    state.config.teams = {
      A: { name: 'FOXES', color: '#ff0000' },
      B: { name: 'WOLVES', color: '#0000ff' },
    };
    state.points = [
      point({ scoredBy: 'A', offense: 'B', isBreak: true, turnovers: 1, durationSeconds: 50 }),
    ];
    state.log = [
      entry({ type: 'gameStart' }),
      entry({ type: 'turnover', team: 'B', gameSeconds: 30 }),
      entry({
        type: 'goal',
        team: 'A',
        gameSeconds: 60,
        pointSeconds: 50,
        score: { A: 1, B: 0 },
        isBreak: true,
      }),
      entry({ type: 'gameEnd', gameSeconds: 61 }),
    ];

    const points = reportCardModel(state, t, 'en').points;
    expect(points?.title).toBe('Point by point');
    expect(points?.colors).toEqual({ A: '#ff0000', B: '#0000ff' });
    expect(points?.rows.map((r) => r.kind)).toEqual(['marker', 'point', 'marker']);
    const row = points?.rows[1];
    expect(row?.kind === 'point' && row.timeline.map((l) => l.text)).toEqual([
      'Pull to WOLVES',
      'WOLVES · 20s — Turnover',
      'FOXES · 30s — Goal (break)',
    ]);
  });

  it('has no point-by-point section before anything was logged', () => {
    expect(reportCardModel(baseState(), t, 'en').points).toBeNull();
  });
});

describe('the card with line tracking on', () => {
  function lineTrackedState() {
    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
    state.config.trackedTeam = 'A';
    state.config.trackTurnoverPlayers = true;
    state.config.lineSize = 2;
    state.config.lines = { ...state.config.lines, enabled: true };
    state.config.players = {
      A: [
        { id: 'a1', number: '', name: 'Alex' },
        { id: 'a2', number: '', name: 'Sam' },
      ],
      B: [],
    };
    state.log = [entry({ team: 'A', scorerId: 'a1', assistId: 'a2' })];
    state.points = [
      {
        scoredBy: 'A',
        offense: 'A',
        isBreak: false,
        durationSeconds: 30,
        half: 1,
        turnovers: 0,
        line: [{ playerId: 'a1' }, { playerId: 'a2' }],
      },
    ];
    return state;
  }

  // Once lines and turnover players are tracked the card carries every column the
  // report screen hides behind its pills: an image in a chat cannot be tapped through.
  it('carries every player column, grouped by the report screen’s views', () => {
    const model = reportCardModel(lineTrackedState(), t, 'en');
    expect(model.playerHeader).toEqual([
      'Player',
      'Pts',
      'O',
      'D',
      'Won',
      'Lost',
      'Assists',
      'Goals',
      'Turns',
      'D',
    ]);
    expect(model.playerGroups).toEqual([
      { label: 'Playing', span: 5 },
      { label: 'Scoring', span: 2 },
      { label: 'Possession', span: 2 },
    ]);
    expect(model.playerRows[0]).toMatchObject({
      label: 'Alex',
      values: ['1', '1', '0', '1', '0', '0', '1', '0', '0'],
    });
  });

  // Total is the one column dropped: Goals and Assists are right next to it.
  it('leaves Total off the grouped card', () => {
    expect(reportCardModel(lineTrackedState(), t, 'en').playerHeader).not.toContain('Total');
  });

  // The spans place the group labels, so between them they have to cover the
  // numeric columns exactly — one short and every label after it sits wrong.
  it('gives the groups spans that add up to the numeric columns', () => {
    const model = reportCardModel(lineTrackedState(), t, 'en');
    const spans = (model.playerGroups ?? []).reduce((total, g) => total + g.span, 0);
    expect(spans).toBe(model.playerHeader.length - 1);
  });

  // Amber marks the headline figure, and with the columns grouped the rightmost one
  // is No D — where it would celebrate the worst number on the card.
  it('accents points played rather than the last column', () => {
    expect(reportCardModel(lineTrackedState(), t, 'en').playerAccent).toBe(0);
  });

  // The drawer measures columns off the header length, so the table has to stay the
  // same width all the way through the model.
  it('gives every row exactly one value per numeric heading', () => {
    const model = reportCardModel(lineTrackedState(), t, 'en');
    const numeric = model.playerHeader.length - 1;
    expect(model.playerRows.every((r) => r.values.length === numeric)).toBe(true);
  });
});

// Possession is read off the log, not off a line, so it groups onto the card on its
// own — the same split as the report screen's pills.
describe('the card with turnover players tracked but no line tracking', () => {
  function turnoverTrackedState() {
    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
    state.config.trackTurnoverPlayers = true;
    state.config.players = { A: [{ id: 'a1', number: '', name: 'Alex' }], B: [] };
    state.log = [
      entry({ team: 'A', scorerId: 'a1' }),
      entry({ type: 'turnover', team: 'B', defenseId: 'a1' }),
    ];
    return state;
  }

  it('groups Possession in with Scoring, and leaves Playing out', () => {
    const model = reportCardModel(turnoverTrackedState(), t, 'en');
    expect(model.playerHeader).toEqual(['Player', 'Assists', 'Goals', 'Turns', 'D']);
    expect(model.playerGroups).toEqual([
      { label: 'Scoring', span: 2 },
      { label: 'Possession', span: 2 },
    ]);
    expect(model.playerRows[0]).toMatchObject({ label: 'Alex', values: ['0', '1', '0', '1'] });
  });

  // A correction made from LogEditDialog attributes a turnover regardless of the
  // flag, so the card has to notice the data itself rather than trust the setting.
  it('groups Possession in even with the flag off, once a turnover is attributed', () => {
    const state = turnoverTrackedState();
    state.config.trackTurnoverPlayers = false;
    const model = reportCardModel(state, t, 'en');
    expect(model.playerGroups).toEqual([
      { label: 'Scoring', span: 2 },
      { label: 'Possession', span: 2 },
    ]);
  });
});
