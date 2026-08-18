import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportScreen from '../components/ReportScreen';
import { I18nProvider } from '../i18n';
import { createInitialState, defaultConfig } from '../state/gameReducer';
import { GameProvider } from '../state/GameContext';
import type { GameState, LogEntry, LogType } from '../state/types';

const STORAGE_KEY = 'ultimate-scorekeeper:game-state';

let nextLogId = 1;
function entry(type: LogType, patch: Partial<LogEntry> = {}): LogEntry {
  return {
    id: nextLogId++,
    wallClock: '10:00:00',
    atMs: 0,
    gameSeconds: 0,
    type,
    ...patch,
  };
}

/** See reportScreenStats.test.tsx: defaultConfig is a shared singleton, so it is cloned. */
function reportState(log: LogEntry[]): GameState {
  const state = createInitialState(structuredClone(defaultConfig));
  state.phase = 'report';
  state.status = 'finished';
  state.config.statsMode = 'player';
  state.log = log;
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

/** Everything a tracked game can put in the log, one of each of the kinds at issue. */
function fullLog(): LogEntry[] {
  return [
    entry('gameStart'),
    entry('turnover', { team: 'A', gameSeconds: 30 }),
    entry('undoTurnover', { team: 'A', gameSeconds: 35 }),
    entry('call', { team: 'B', callKind: 'foul', gameSeconds: 40 }),
    entry('callResolved', {
      team: 'B',
      callKind: 'foul',
      resolution: 'accepted',
      resolutionSeconds: 12,
      gameSeconds: 52,
    }),
    entry('travel', { team: 'A', gameSeconds: 60 }),
    entry('goal', { team: 'A', gameSeconds: 70 }),
    entry('stoppage', { stoppageKind: 'injury', gameSeconds: 80 }),
    entry('sotgStart', { team: 'B', gameSeconds: 90 }),
    entry('note', { detail: 'Ball on the pitch', gameSeconds: 100 }),
    entry('gameEnd', { gameSeconds: 110 }),
  ];
}

function historySection(): HTMLElement {
  return screen.getByText('Game summary').closest('section') as HTMLElement;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  nextLogId = 1;
});

describe('report screen — game history', () => {
  it('leaves out the turnovers and the calls, and keeps the shape of the game', () => {
    renderReport(reportState(fullLog()));
    const history = within(historySection());

    expect(history.queryByText('Turnover')).toBeNull();
    expect(history.queryByText('Possession correction (undo)')).toBeNull();
    expect(history.queryByText('Call made')).toBeNull();
    expect(history.queryByText('Call resolved')).toBeNull();
    expect(history.queryByText('Travel')).toBeNull();

    expect(history.getByText('Game start')).toBeInTheDocument();
    expect(history.getByText('Goal — Team A')).toBeInTheDocument();
    expect(history.getByText('Stoppage')).toBeInTheDocument();
    expect(history.getByText('SOTG stoppage (clock paused) — Team B')).toBeInTheDocument();
    expect(history.getByText('Ball on the pitch')).toBeInTheDocument();
    expect(history.getByText('Game end')).toBeInTheDocument();
  });

  it('shows every entry in the full-log dialog, read-only', () => {
    renderReport(reportState(fullLog()));

    fireEvent.click(within(historySection()).getByRole('button', { name: 'Full log' }));
    const dialog = within(document.querySelector('.fixed') as HTMLElement);

    expect(dialog.getByText('Turnover — Team A')).toBeInTheDocument();
    expect(dialog.getByText('Call made — Team B')).toBeInTheDocument();
    expect(dialog.getByText('Travel — Team A')).toBeInTheDocument();
    // A record, not a game in progress: no fixing or deleting entries here.
    expect(screen.queryByRole('button', { name: 'Fix this entry' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete this entry' })).toBeNull();
  });

  it("copies only what the history shows, and the dialog's button copies all of it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    renderReport(reportState(fullLog()));

    fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    await screen.findByText('Copied!');
    const report = writeText.mock.calls[0][0] as string;
    expect(report).toContain('Game summary');
    expect(report).toContain('] Goal — Team A');
    expect(report).not.toContain('] Turnover');
    expect(report).not.toContain('] Call made');
    expect(report).not.toContain('] Travel');

    fireEvent.click(within(historySection()).getByRole('button', { name: 'Full log' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy log' }));
    await screen.findByText('Copied!');
    const log = writeText.mock.calls[1][0] as string;
    expect(log).toContain('Full game log');
    expect(log).toContain('] Turnover — Team A');
    expect(log).toContain('] Call made — Team B');
    expect(log).toContain('] Goal — Team A');
    // The log and nothing else — the stat tables are the report's copy button.
    expect(log).not.toContain('O-line holds');
  });
});
