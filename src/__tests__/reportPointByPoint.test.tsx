import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportScreen from '../components/ReportScreen';
import { I18nProvider } from '../i18n';
import { createInitialState, defaultConfig } from '../state/gameReducer';
import { GameProvider } from '../state/GameContext';
import type { GameState, LogEntry, LogType, PointRecord } from '../state/types';

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

/**
 * Two points and the markers around them. Point 1: TEAM A receives, a timeout before
 * the pull, A turns it over (Alex), B turns it back and that is undone, a foul is
 * called and accepted, B travels, B scores the break. Then half-time. Point 2: B
 * receives and holds, with a note in the middle.
 */
function twoPointGame(): GameState {
  const state = createInitialState(structuredClone(defaultConfig));
  state.phase = 'report';
  state.status = 'finished';
  state.config.statsMode = 'players';
  state.config.trackTurnovers = true;
  state.config.players = { A: [{ id: 'a1', number: '7', name: 'Alex' }], B: [] };
  const points: PointRecord[] = [
    {
      scoredBy: 'B',
      offense: 'A',
      isBreak: true,
      durationSeconds: 60,
      aliveSeconds: 48,
      half: 1,
      turnovers: 1,
      possessionSeconds: { A: 20, B: 28 },
    },
    {
      scoredBy: 'B',
      offense: 'B',
      isBreak: false,
      durationSeconds: 20,
      aliveSeconds: 20,
      half: 2,
      turnovers: 0,
      possessionSeconds: { A: 0, B: 20 },
    },
  ];
  state.points = points;
  state.scores = { A: 0, B: 2 };
  state.log = [
    entry('gameStart'),
    entry('timeout', { team: 'B', gameSeconds: 5 }),
    entry('turnover', { team: 'A', turnoverId: 'a1', gameSeconds: 30 }),
    entry('turnover', { team: 'B', gameSeconds: 40 }),
    entry('call', { team: 'B', callKind: 'foul', gameSeconds: 44 }),
    entry('undoTurnover', { team: 'A', gameSeconds: 45 }),
    entry('callResolved', {
      team: 'B',
      callKind: 'foul',
      resolution: 'accepted',
      resolutionSeconds: 12,
      gameSeconds: 57,
    }),
    entry('travel', { team: 'B', gameSeconds: 60 }),
    entry('goal', {
      team: 'B',
      gameSeconds: 70,
      pointSeconds: 60,
      score: { A: 0, B: 1 },
      isBreak: true,
    }),
    entry('halftimeStart', { gameSeconds: 71 }),
    entry('halftimeEnd', { gameSeconds: 75 }),
    entry('note', { detail: 'Ball on the pitch', gameSeconds: 90 }),
    entry('goal', { team: 'B', gameSeconds: 100, pointSeconds: 20, score: { A: 0, B: 2 } }),
    entry('gameEnd', { gameSeconds: 101 }),
  ];
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

function section(): HTMLElement {
  return screen.getByText('Point by point').closest('section') as HTMLElement;
}

const pointRow = (n: number) => section().querySelector(`[data-point-row="${n}"]`) as HTMLElement;
const rowKinds = () =>
  [...section().querySelectorAll('[data-points] > li')].map((li) =>
    li.hasAttribute('data-marker')
      ? `marker:${li.textContent}`
      : `point:${li.getAttribute('data-point-row')}`,
  );
const timeline = (n: number) =>
  [...pointRow(n).querySelectorAll('[data-timeline] li')].map((li) => li.textContent);

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  nextLogId = 1;
});

describe('report screen — point by point', () => {
  it('lists every point between the markers that frame the game', () => {
    renderReport(twoPointGame());
    expect(rowKinds()).toEqual([
      'marker:00:00Game start',
      'point:1',
      'marker:01:11Half-time',
      'point:2',
      'marker:01:41Game end',
    ]);
  });

  it('folds each point to its heading, its strip and a summary', () => {
    renderReport(twoPointGame());
    const row = within(pointRow(1));
    expect(pointRow(1).getAttribute('data-outcome')).toBe('break');
    expect(row.getByText('0-1')).toBeInTheDocument();
    expect(row.getByText('Break')).toBeInTheDocument();
    expect(row.getByText('1m 0s')).toBeInTheDocument();
    // The timeout and the call held play up, so the time in play is shown beside it.
    expect(row.getByText('48s in play')).toBeInTheDocument();
    // A turned it over once (B's turnover was undone), and B scored from there.
    // A held it 20s (pull to turnover); B 27s — 40s to the goal, less the 13s the
    // foul was being talked through.
    const humps = [...pointRow(1).querySelectorAll('[data-segment]')].map(
      (h) =>
        `${h.getAttribute('data-team')}:${h.getAttribute('data-segment')}:${h.getAttribute('data-seconds')}`,
    );
    expect(humps).toEqual(['A:done:20', 'B:goal:27']);
    expect(pointRow(1).querySelector('[data-disc]')).not.toBeNull();
    expect(pointRow(1).querySelector('[data-summary]')?.textContent).toBe(
      '1 turn · Timeout · Foul · Travel',
    );
    // Folded: the timeline only appears on a tap.
    expect(pointRow(1).querySelector('[data-timeline]')).toBeNull();

    expect(pointRow(2).querySelector('[data-summary]')?.textContent).toBe('No turns');
    expect(within(pointRow(2)).queryByText(/in play/)).toBeNull();
  });

  it('opens a point into its timeline, in order, corrections applied', () => {
    renderReport(twoPointGame());
    fireEvent.click(within(pointRow(1)).getByRole('button'));
    expect(within(pointRow(1)).getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(timeline(1)).toEqual([
      '00:05Timeout — TEAM B',
      '00:10Pull to TEAM A',
      '00:30TEAM A · 20s — Turnover — turn: #7 Alex',
      // The call is told once, by its resolution; the undone turnover not at all.
      '00:57Call resolved — TEAM B — Foul — Accepted (resolved in 12s)',
      '01:00Travel — TEAM B',
      '01:10TEAM B · 27s — Goal (break)',
    ]);

    fireEvent.click(within(pointRow(1)).getByRole('button'));
    expect(pointRow(1).querySelector('[data-timeline]')).toBeNull();
  });

  it('shows every entry in the full-log dialog, read-only', () => {
    renderReport(twoPointGame());

    fireEvent.click(within(section()).getByRole('button', { name: 'Full log' }));
    const dialog = within(document.querySelector('.fixed') as HTMLElement);

    expect(dialog.getByText('Possession correction (undo) — TEAM A')).toBeInTheDocument();
    expect(dialog.getByText('Call made — TEAM B')).toBeInTheDocument();
    expect(dialog.getByText('Travel — TEAM B')).toBeInTheDocument();
    // A record, not a game in progress: no fixing or deleting entries here.
    expect(screen.queryByRole('button', { name: 'Fix this entry' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete this entry' })).toBeNull();
  });

  it('copies every point opened up, and the dialog copies the log itself', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    renderReport(twoPointGame());

    fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    await screen.findByText('Copied!');
    const report = writeText.mock.calls[0][0] as string;
    expect(report).toContain('Point by point');
    expect(report).toContain('  0-1 · Break TEAM B · 1m 0s (48s in play)');
    expect(report).not.toMatch(/#\d+ · /);
    expect(report).toContain('      1 turn · Timeout · Foul · Travel');
    expect(report).toContain('      [00:30] TEAM A · 20s — Turnover — turn: #7 Alex');
    expect(report).toContain('  [01:11] Half-time');
    expect(report).not.toContain('Possession correction');
    // Every block — a marker or a point — is set apart from the one before by a blank line.
    expect(report).toMatch(/\] Game start\n\n {2}0-1 · Break/);
    expect(report).toMatch(/\n\n {2}\[01:11\] Half-time\n\n {2}0-2 · Hold/);

    fireEvent.click(within(section()).getByRole('button', { name: 'Full log' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy log' }));
    await screen.findByText('Copied!');
    const log = writeText.mock.calls[1][0] as string;
    expect(log).toContain('Full game log');
    expect(log).toContain('] Possession correction (undo) — TEAM A');
    expect(log).toContain('] Call made — TEAM B');
    // The log and nothing else — the stat tables are the report's copy button.
    expect(log).not.toContain('Holds');
  });
});
