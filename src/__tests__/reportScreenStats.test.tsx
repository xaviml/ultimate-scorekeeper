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

  it('adds clean hold/break, break chances and turnovers, correctly valued, once tracking is on', () => {
    const state = baseState();
    state.config.statsMode = 'game';
    state.points = [
      point({ scoredBy: 'A', offense: 'A', isBreak: false, turnovers: 0 }), // clean hold, A
      point({ scoredBy: 'A', offense: 'B', isBreak: true, turnovers: 1 }), // clean break, A
    ];
    state.turnoversCommitted = { A: 1, B: 2 };
    renderReport(state);

    expect(rowCells('Clean holds')).toEqual(['1', '0']);
    expect(rowCells('Clean breaks')).toEqual(['1', '0']);
    expect(rowCells('Break chances')).toEqual(['2', '1']);
    expect(rowCells('Turnovers')).toEqual(['1', '2']);
  });
});

describe('report screen — player stats table', () => {
  it('has no player stats table in Game stats mode — there is no player detail to show', () => {
    const state = baseState();
    state.config.statsMode = 'game';
    state.points = [point()];
    renderReport(state);

    expect(screen.queryByText('Player stats')).toBeNull();
  });

  it("shows only the tracked team's players in Team stats mode, with no filter and no team circle", () => {
    const state = baseState();
    state.config.statsMode = 'team';
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
    state.config.statsMode = 'player';
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
    state.config.statsMode = 'team';
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
    state.config.statsMode = 'player';
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
