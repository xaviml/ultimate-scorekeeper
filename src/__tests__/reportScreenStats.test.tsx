import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportScreen from '../components/ReportScreen';
import { I18nProvider } from '../i18n';
import { createInitialState, defaultConfig } from '../state/gameReducer';
import { GameProvider } from '../state/GameContext';
import type { GameState, LogEntry, PointRecord } from '../state/types';

const STORAGE_KEY = 'ultimate-scorekeeper:game-state';

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
function goalEntry(patch: Partial<LogEntry> = {}): LogEntry {
  return {
    id: nextLogId++,
    wallClock: '10:00:00',
    atMs: 0,
    gameSeconds: 0,
    type: 'goal',
    ...patch,
  };
}

/**
 * createInitialState() defaults to `defaultConfig` BY REFERENCE — a shared
 * module-level singleton — so mutating `state.config` directly (as these tests
 * do) would leak into every other test in the run unless each one starts from
 * its own clone.
 */
function baseState(): GameState {
  const state = createInitialState(structuredClone(defaultConfig));
  state.phase = 'report';
  state.status = 'finished';
  return state;
}

function renderReport(state: GameState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return render(
    <I18nProvider>
      <GameProvider>
        <ReportScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

/** The two value cells of a stat row (label sits in the middle cell), in [Team A, Team B] order. */
function rowCells(label: string): string[] {
  const row = screen.getByText(label).closest('tr') as HTMLElement;
  const cells = [...row.querySelectorAll('td')];
  return [cells[0].textContent ?? '', cells[2].textContent ?? ''];
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  nextLogId = 1;
});

describe('report screen — team stats table', () => {
  it('shows only the base rows when stats tracking is off', () => {
    const state = baseState();
    state.config.statsMode = 'none';
    state.points = [point()];
    renderReport(state);

    expect(screen.getByText('O-line holds')).toBeInTheDocument();
    expect(screen.getByText('Break points')).toBeInTheDocument();
    expect(screen.queryByText('Clean holds')).toBeNull();
    expect(screen.queryByText('Break chances')).toBeNull();
    expect(screen.queryByText('Turnovers')).toBeNull();
    expect(screen.queryByText('Clean breaks')).toBeNull();
  });

  // The extended rows are all turnover-derived, so they follow the turnover flag
  // rather than the detail: a game naming players but never recording a turnover has
  // no clean holds to distinguish from plain ones.
  it('shows only the base rows when players are named but turnovers are not recorded', () => {
    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = false;
    state.points = [point()];
    renderReport(state);

    expect(screen.getByText('O-line holds')).toBeInTheDocument();
    expect(screen.queryByText('Clean holds')).toBeNull();
    expect(screen.queryByText('Turnovers')).toBeNull();
    // And no possession ledger either — it would be a strip of flat columns.
    expect(screen.queryByText('Possession')).toBeNull();
  });

  it('adds clean hold/break, break chances and turnovers, correctly valued, once turnovers are recorded', () => {
    const state = baseState();
    state.config.statsMode = 'teams';
    state.config.trackTurnovers = true;
    state.points = [
      point({ scoredBy: 'A', offense: 'A', isBreak: false, turnovers: 0 }), // clean hold, A
      point({ scoredBy: 'A', offense: 'B', isBreak: true, turnovers: 1 }), // clean break, A
    ];
    state.turnoversCommitted = { A: 1, B: 2 };
    renderReport(state);

    expect(rowCells('Clean holds')).toEqual(['1', '0']);
    expect(rowCells('Clean breaks')).toEqual(['1', '0']);
    // A pulled point1 and converted its single break chance; B never pulled a
    // point with a turnover in it, so B has none.
    expect(rowCells('Break chances')).toEqual(['1', '0']);
    expect(rowCells('Turnovers')).toEqual(['1', '2']);
  });
});

describe('report screen — player stats table', () => {
  it('has no player stats table with team-level detail — there is no player detail to show', () => {
    const state = baseState();
    state.config.statsMode = 'teams';
    state.config.trackTurnovers = true;
    state.points = [point()];
    renderReport(state);

    expect(screen.queryByText('Player stats')).toBeNull();
  });

  it("shows only the followed team's players when one team is followed, with no filter and no team circle", () => {
    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
    state.config.trackedTeam = 'A';
    state.config.players = {
      A: [
        { id: 'a1', number: '', name: 'Alex' },
        { id: 'a2', number: '', name: 'Bench' },
      ],
      B: [],
    };
    state.points = [point()];
    state.log = [goalEntry({ team: 'A', scorerId: 'a1' })];
    renderReport(state);

    expect(screen.getByText('Player stats')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    // Bench never scored or assisted, so it never shows up.
    expect(screen.queryByText('Bench')).toBeNull();
    expect(screen.queryByText('All')).toBeNull();
    const row = screen.getByText('Alex').closest('tr') as HTMLElement;
    expect(row.querySelector('span')).toBeNull();
  });

  it('shows both teams with a team filter and a colored circle per row in Player stats mode', () => {
    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
    state.config.teams = {
      A: { name: 'Foxes', color: '#ff0000' },
      B: { name: 'Wolves', color: '#0000ff' },
    };
    state.config.players = {
      A: [{ id: 'a1', number: '', name: 'Alex' }],
      B: [{ id: 'b1', number: '', name: 'Jo' }],
    };
    state.points = [
      point({ scoredBy: 'A', offense: 'A', isBreak: false, turnovers: 0 }),
      point({ scoredBy: 'B', offense: 'B', isBreak: false, turnovers: 0 }),
    ];
    state.log = [
      goalEntry({ team: 'A', scorerId: 'a1' }),
      goalEntry({ team: 'B', scorerId: 'b1' }),
    ];
    renderReport(state);

    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Jo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();

    const alexRow = screen.getByText('Alex').closest('tr') as HTMLElement;
    expect(alexRow.querySelector('span')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Wolves' }));
    expect(screen.queryByText('Alex')).toBeNull();
    expect(screen.getByText('Jo')).toBeInTheDocument();
  });

  it('lists Assists, Goals then Total, with Total as their sum', () => {
    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
    state.config.trackedTeam = 'A';
    state.config.players = { A: [{ id: 'a1', number: '', name: 'Alex' }], B: [] };
    state.points = [
      point({ scoredBy: 'A', offense: 'A', isBreak: false, turnovers: 0 }),
      point({ scoredBy: 'A', offense: 'B', isBreak: true, turnovers: 0 }),
    ];
    state.log = [
      goalEntry({ id: 1, team: 'A', scorerId: 'a1' }),
      goalEntry({ id: 2, team: 'A', assistId: 'a1' }),
    ];
    renderReport(state);

    const playerSection = screen.getByText('Player stats').closest('section') as HTMLElement;
    const headerCells = within(playerSection)
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    expect(headerCells).toEqual(['Player', 'Assists', 'Goals', 'Total']);

    const row = screen.getByText('Alex').closest('tr') as HTMLElement;
    const values = [...row.querySelectorAll('td')].slice(1).map((td) => td.textContent);
    expect(values).toEqual(['1', '1', '2']);
  });
});

describe('report screen — clipboard text', () => {
  it('includes the extended stats, player stats and a footer link back to the app', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
    state.config.players = { A: [{ id: 'a1', number: '', name: 'Alex' }], B: [] };
    state.points = [
      point({ scoredBy: 'A', offense: 'A', isBreak: false, turnovers: 0 }),
      point({ scoredBy: 'A', offense: 'B', isBreak: true, turnovers: 1 }),
    ];
    state.turnoversCommitted = { A: 0, B: 1 };
    state.log = [goalEntry({ team: 'A', scorerId: 'a1' })];
    renderReport(state);

    fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    await screen.findByText('Copied!');

    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('Clean holds: 1');
    expect(text).toContain('Break chances: 1');
    expect(text).toContain('Turnovers: 0');
    expect(text).toContain('Clean breaks: 1');
    expect(text).toContain('Player stats');
    expect(text).toContain('Team A — Alex: Assists 0, Goals 1, Total 1');
    expect(text).toContain('This game was tracked with:');
    expect(text.trim().endsWith('https://xaviml.github.io/ultimate-scorekeeper/')).toBe(true);
  });
});

describe('the player-stat views', () => {
  /**
   * A line-tracked game: two players, three points, one goal. Small enough that every
   * column's number is checkable by hand. Turnover players are also tracked, so both
   * of the extra views (Playing off the line, Possession off the log) have data and
   * are testable side by side.
   */
  function lineTrackedState(): GameState {
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
    state.scores = { A: 1, B: 1 };
    state.log = [goalEntry({ team: 'A', scorerId: 'a1', assistId: 'a2' })];
    state.points = [
      {
        scoredBy: 'A',
        offense: 'A',
        isBreak: false,
        durationSeconds: 30,
        half: 1,
        turnovers: 0,
        line: [{ playerId: 'a1' }, { playerId: 'a2' }],
        lineName: 'O1',
      },
      {
        // A on defence, B holds without ever losing it: a no-D point for this line.
        scoredBy: 'B',
        offense: 'B',
        isBreak: false,
        durationSeconds: 40,
        half: 1,
        turnovers: 0,
        line: [{ playerId: 'a1' }],
        lineName: 'D1',
      },
    ];
    return state;
  }

  /** The numeric cells of one player's row, left to right. */
  function playerRow(name: string): string[] {
    const row = screen.getByText(name).closest('tr') as HTMLElement;
    return [...row.querySelectorAll('td')].slice(1).map((c) => c.textContent ?? '');
  }
  const viewPill = (name: RegExp) => screen.getByRole('button', { name });

  // With neither line tracking nor turnover-player tracking on there is one view's
  // worth of data, so pills would be tabs onto the same columns already on screen.
  it('offers no view pills when nothing beyond scoring is tracked', () => {
    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
    state.config.players = { A: [{ id: 'a1', number: '', name: 'Alex' }], B: [] };
    state.log = [goalEntry({ team: 'A', scorerId: 'a1', assistId: 'a1' })];
    renderReport(state);
    expect(screen.queryByRole('button', { name: /^playing$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^possession$/i })).toBeNull();
    expect(screen.getByText('Assists')).toBeTruthy();
  });

  // Possession is read off the log's turnoverId/defenseId, never off a line, so it
  // does not need line tracking at all — only "Ask who turned it over".
  it('offers the possession pill without line tracking, when turnover players are tracked', () => {
    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
    state.config.trackTurnoverPlayers = true;
    state.config.players = { A: [{ id: 'a1', number: '', name: 'Alex' }], B: [] };
    state.log = [goalEntry({ team: 'A', scorerId: 'a1', assistId: 'a1' })];
    renderReport(state);
    expect(screen.queryByRole('button', { name: /^playing$/i })).toBeNull();
    expect(viewPill(/^possession$/i)).toBeTruthy();
  });

  // Attributing a turnover after the fact is a correction made from LogEditDialog,
  // and corrections stay available whatever "Ask who turned it over" was set to at
  // the time — the view has to notice the data even though the flag never turned on.
  it('offers the possession pill once a turnover is attributed, even with the flag off', () => {
    const state = baseState();
    state.config.statsMode = 'players';
    state.config.trackTurnovers = true;
    state.config.trackTurnoverPlayers = false;
    state.config.players = { A: [{ id: 'a1', number: '', name: 'Alex' }], B: [] };
    state.log = [
      goalEntry({ team: 'A', scorerId: 'a1', assistId: 'a1' }),
      goalEntry({ type: 'turnover', team: 'B', defenseId: 'a1' }),
    ];
    renderReport(state);
    expect(viewPill(/^possession$/i)).toBeTruthy();
  });

  it('starts on Scoring, with the columns it has always had', () => {
    renderReport(lineTrackedState());
    expect(screen.getByText('Assists')).toBeTruthy();
    expect(screen.getByText('Goals')).toBeTruthy();
    expect(screen.getByText('Total')).toBeTruthy();
    expect(playerRow('Alex')).toEqual(['0', '1', '1']);
  });

  it('switches to the playing columns', () => {
    renderReport(lineTrackedState());
    fireEvent.click(viewPill(/^playing$/i));
    expect(screen.getByText('Pts')).toBeTruthy();
    expect(screen.getByText('Won')).toBeTruthy();
    expect(screen.getByText('Lost')).toBeTruthy();
    // Alex played both points: one on O (won) and one on D (lost).
    expect(playerRow('Alex')).toEqual(['2', '1', '1', '1', '1']);
    // Sam played only the point A won.
    expect(playerRow('Sam')).toEqual(['1', '1', '0', '1', '0']);
  });

  it('switches to the possession columns', () => {
    renderReport(lineTrackedState());
    fireEvent.click(viewPill(/^possession$/i));
    expect(screen.getByText('Turns')).toBeTruthy();
    // Neither point had a turnover, so every zero here is the truth rather than a
    // missing answer.
    expect(playerRow('Alex')).toEqual(['0', '0']);
    expect(playerRow('Sam')).toEqual(['0', '0']);
  });

  // A turnover carries two halves: the thrower on the team that lost it, the
  // defender on the other. The D belongs to the roster that won the disc back.
  it('credits a D to the team that forced the turnover, not the one that lost it', () => {
    const state = lineTrackedState();
    state.log = [
      ...state.log,
      // B lost the disc; a1 of the tracked team A is who took it off them.
      goalEntry({ type: 'turnover', team: 'B', defenseId: 'a1' }),
    ];
    renderReport(state);
    fireEvent.click(viewPill(/^possession$/i));
    expect(playerRow('Alex')[1]).toBe('1');
    expect(playerRow('Sam')[1]).toBe('0');
  });

  // A game played with "Ask who turned it over" off has turnovers in the log and
  // nobody named on any of them. Zeroes down the column would read as a roster that
  // never lost the disc.
  it('dashes the Turns column when no turnover named a player', () => {
    const state = lineTrackedState();
    state.points[1] = { ...state.points[1], turnovers: 2 };
    state.log = [
      ...state.log,
      goalEntry({ type: 'turnover', team: 'A' }),
      goalEntry({ type: 'turnover', team: 'A' }),
    ];
    renderReport(state);
    fireEvent.click(viewPill(/^possession$/i));
    expect(playerRow('Alex')[0]).toBe('—');
    expect(playerRow('Sam')[0]).toBe('—');
    // The two turnovers are still on the card, on the row that can own them.
    expect(playerRow('Not recorded')[0]).toBe('2');
  });

  // Each view ranks by the column it is about, so the top row answers the question
  // the pill just asked.
  it('reorders the rows for the active view', () => {
    renderReport(lineTrackedState());
    const firstRow = () => {
      const table = screen.getByText('Player').closest('table') as HTMLElement;
      return table.querySelector('tbody tr td')?.textContent ?? '';
    };
    fireEvent.click(viewPill(/^playing$/i));
    expect(firstRow()).toMatch(/^Alex/); // 2 points played
    fireEvent.click(viewPill(/^scoring$/i));
    expect(firstRow()).toMatch(/^Alex/); // 1 goal beats 1 assist on the goals tie-break
  });

  // Without this the points column would quietly under-report the game.
  it('counts the unregistered points on the aggregate, and dashes the rest', () => {
    const state = lineTrackedState();
    state.points.push({
      scoredBy: 'A',
      offense: 'A',
      isBreak: false,
      durationSeconds: 20,
      half: 1,
      turnovers: 0,
    });
    renderReport(state);
    fireEvent.click(viewPill(/^playing$/i));
    // One point played by nobody the volunteer registered; the O/D/Won/Lost
    // columns are dashes, because the row stands for nobody.
    expect(playerRow('Not recorded')).toEqual(['1', '—', '—', '—', '—']);
  });
});
