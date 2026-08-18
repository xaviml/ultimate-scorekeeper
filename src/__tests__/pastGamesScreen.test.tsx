import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import PastGamesScreen from '../components/PastGamesScreen';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { saveGameToHistory, loadGameHistory } from '../state/gameHistory';
import { createInitialState, defaultConfig } from '../state/gameReducer';
import type { GameState, LogEntry } from '../state/types';

const GAME_KEY = 'ultimate-scorekeeper:game-state';

function entry(type: LogEntry['type'], atMs: number, id: number): LogEntry {
  return { id, wallClock: '18:30:00', atMs, gameSeconds: 0, type };
}

/** See reportScreenStats.test.tsx: defaultConfig is a shared singleton, so it is cloned. */
function finishedGame(names: [string, string], scores: [number, number], atMs: number): GameState {
  const state = createInitialState(structuredClone(defaultConfig));
  state.status = 'finished';
  state.phase = 'report';
  state.config.teams.A = { ...state.config.teams.A, name: names[0] };
  state.config.teams.B = { ...state.config.teams.B, name: names[1] };
  state.scores = { A: scores[0], B: scores[1] };
  state.log = [entry('gameStart', atMs, 1), entry('gameEnd', atMs + 3_600_000, 2)];
  return state;
}

const AUG_18 = new Date(2026, 7, 18, 18, 30).getTime();
const AUG_18_LATER = new Date(2026, 7, 18, 20, 15).getTime();
const AUG_17 = new Date(2026, 7, 17, 9, 0).getTime();

function renderScreen(onClose = () => {}) {
  return render(
    <I18nProvider>
      <PastGamesScreen onClose={onClose} />
    </I18nProvider>,
  );
}

describe('the past-games screen', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('says so when nothing has been played yet', () => {
    renderScreen();
    expect(screen.getByText(/No games saved yet/)).toBeInTheDocument();
  });

  it('lists games newest first, under one subtitle per day', () => {
    saveGameToHistory(finishedGame(['Ravens', 'Foxes'], [15, 12], AUG_18));
    saveGameToHistory(finishedGame(['Kites', 'Gulls'], [11, 13], AUG_17));
    saveGameToHistory(finishedGame(['Owls', 'Hawks'], [9, 15], AUG_18_LATER));
    const { container } = renderScreen();

    // The heading is formatted in the user's locale, so it is matched on the parts
    // every locale carries rather than on one language's word order.
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '');
    expect(headings).toHaveLength(2);
    expect(headings[0]).toMatch(/August/);
    expect(headings[0]).toMatch(/\b18\b/);
    expect(headings[1]).toMatch(/\b17\b/);

    // Games inside the newest day are themselves newest first.
    const rows = [...container.querySelectorAll('[data-past-game]')];
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Owls'),
      expect.stringContaining('Ravens'),
      expect.stringContaining('Kites'),
    ]);
  });

  it('shows only the teams, the score and when the game started', () => {
    saveGameToHistory(finishedGame(['Ravens', 'Foxes'], [15, 12], AUG_18));
    const { container } = renderScreen();
    const row = container.querySelector('[data-past-game]') as HTMLElement;
    expect(within(row).getByText('15')).toBeInTheDocument();
    expect(within(row).getByText('12')).toBeInTheDocument();
    expect(row.textContent).toMatch(/Aug/);
    expect(row.textContent).toMatch(/2026/);
  });

  it('deletes a game only once the confirmation is answered', () => {
    saveGameToHistory(finishedGame(['Ravens', 'Foxes'], [15, 12], AUG_18));
    saveGameToHistory(finishedGame(['Kites', 'Gulls'], [11, 13], AUG_17));
    renderScreen();

    fireEvent.click(screen.getByLabelText(/Delete Ravens 15 — 12 Foxes/));
    expect(loadGameHistory()).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(loadGameHistory()).toHaveLength(2);

    fireEvent.click(screen.getByLabelText(/Delete Ravens 15 — 12 Foxes/));
    fireEvent.click(screen.getByRole('button', { name: 'Delete game' }));

    expect(loadGameHistory().map((g) => g.config.teams.A.name)).toEqual(['Kites']);
    expect(screen.queryByRole('button', { name: /Ravens/ })).not.toBeInTheDocument();
  });

  it('opens the game as a report, with a way back to the list and no way to start a new game', () => {
    saveGameToHistory(finishedGame(['Ravens', 'Foxes'], [15, 12], AUG_18));
    const { container } = renderScreen();

    fireEvent.click(container.querySelector('[data-past-game]') as HTMLElement);
    // The report, with the archive's way out rather than the game's — and without
    // the one button that discards a game.
    expect(screen.getByText('Copy to clipboard')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New game' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Back to the game/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(screen.getByRole('heading', { name: 'Match History' })).toBeInTheDocument();
  });
});

describe('filing a game into the archive', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const mount = (state: GameState) => {
    sessionStorage.setItem(GAME_KEY, JSON.stringify(state));
    return render(
      <I18nProvider>
        <GameProvider>
          <div />
        </GameProvider>
      </I18nProvider>,
    );
  };

  it('files a game whose scoreline finished it', () => {
    const game = finishedGame(['Ravens', 'Foxes'], [15, 12], AUG_18);
    mount(game);
    expect(loadGameHistory().map((g) => g.id)).toEqual([game.id]);
  });

  it('does not file a game that is merely paused on the way out (END_GAME)', () => {
    // What "End game" leaves behind: the clock stopped and the report open, but
    // the game itself not finished — see GameProvider's archive effect.
    const game = finishedGame(['Ravens', 'Foxes'], [8, 6], AUG_18);
    game.status = 'paused';
    mount(game);
    expect(loadGameHistory()).toEqual([]);
  });

  it('leaves the stored record alone when a finished game is edited back into play', () => {
    const game = finishedGame(['Ravens', 'Foxes'], [15, 12], AUG_18);
    mount(game).unmount();
    // The final goal undone from the dashboard: the game is live again, so the
    // archive keeps the last state in which it was actually over.
    mount({ ...game, status: 'live', scores: { A: 14, B: 12 } });
    expect(loadGameHistory()[0].scores).toEqual({ A: 15, B: 12 });
  });
});
