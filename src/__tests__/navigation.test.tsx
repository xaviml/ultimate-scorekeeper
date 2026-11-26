import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { saveGameToHistory } from '../state/gameHistory';
import { createInitialState, defaultConfig } from '../state/gameReducer';
import type { GameState } from '../state/types';

/**
 * Every page has an address (`#/`, `#/game`, `#/report`, `#/history`, `#/history/<id>`,
 * `#/guide`, `#/guide/advanced`), and the browser's back moves between them the way
 * it does on any website. The one exception is a game in progress, which asks before
 * the back gesture discards it.
 */

const GAME_KEY = 'ultimate-scorekeeper:game-state';

function game(patch: Partial<GameState> = {}): GameState {
  const state = createInitialState(structuredClone(defaultConfig));
  state.phase = 'game';
  state.status = 'live';
  state.config.teams.A.name = 'FOXES';
  state.config.teams.B.name = 'RAVENS';
  state.scores = { A: 3, B: 1 };
  state.log = [{ id: 1, wallClock: '10:00:00', atMs: 1, gameSeconds: 0, type: 'gameStart' }];
  return { ...state, ...patch };
}

function renderApp(state?: GameState, address?: string) {
  if (state) sessionStorage.setItem(GAME_KEY, JSON.stringify(state));
  if (address) history.replaceState(null, '', address);
  return render(
    <I18nProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </I18nProvider>,
  );
}

/** The browser's back button: one step back through the history, as the browser takes it. */
async function pressBack() {
  await act(async () => {
    const popped = new Promise((resolve) =>
      window.addEventListener('popstate', resolve, { once: true }),
    );
    history.back();
    await popped;
  });
}

const depth = () => (history.state as { idx?: number } | null)?.idx;
const setupShown = () => screen.queryByRole('heading', { name: 'Game setup' });
const menu = () => screen.getByRole('button', { name: 'Menu' });

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('addresses', () => {
  it('opens on setup', () => {
    renderApp();
    expect(location.hash).toBe('#/');
    expect(setupShown()).toBeInTheDocument();
  });

  it('sends the game page back to setup when there is no game', async () => {
    renderApp(undefined, '#/game');
    await waitFor(() => expect(location.hash).toBe('#/'));
    expect(setupShown()).toBeInTheDocument();
  });

  it('opens a game in progress on its page, whatever the address says', () => {
    renderApp(game(), '#/');
    expect(location.hash).toBe('#/game');
    expect(menu()).toBeInTheDocument();
  });

  it('puts setup under a page opened directly, so back stays in the app', async () => {
    renderApp(game(), '#/game');
    expect(depth()).toBe(1);
  });
});

describe('back on a game in progress', () => {
  it('asks before leaving, and keeps the game on screen', async () => {
    renderApp(game());
    await pressBack();
    await waitFor(() => expect(location.hash).toBe('#/game'));
    expect(screen.getByRole('heading', { name: 'Leave the game?' })).toBeInTheDocument();
    expect(menu()).toBeInTheDocument();
  });

  it('closes an open menu first, without asking', async () => {
    renderApp(game());
    fireEvent.click(menu());
    expect(screen.getByRole('heading', { name: 'Menu' })).toBeInTheDocument();

    await pressBack();
    await waitFor(() => expect(location.hash).toBe('#/game'));
    expect(screen.queryByRole('heading', { name: 'Menu' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Leave the game?' })).toBeNull();
  });

  it('leaves a game not started yet without asking, since nothing is lost', async () => {
    renderApp(game({ status: 'notStarted', log: [] }));
    await pressBack();
    await waitFor(() => expect(setupShown()).toBeInTheDocument());
    expect(location.hash).toBe('#/');
  });

  it('keeps asking on every press while the answer is no', async () => {
    renderApp(game());
    await pressBack();
    await waitFor(() => expect(location.hash).toBe('#/game'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Leave the game?' })).toBeNull();

    await pressBack();
    await waitFor(() => expect(location.hash).toBe('#/game'));
    expect(screen.getByRole('heading', { name: 'Leave the game?' })).toBeInTheDocument();
  });

  it('on leaving, lands on setup at the bottom of the history', async () => {
    renderApp(game());
    await pressBack();
    await waitFor(() => expect(location.hash).toBe('#/game'));
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));

    await waitFor(() => expect(location.hash).toBe('#/'));
    expect(setupShown()).toBeInTheDocument();
    expect(depth()).toBe(0);
  });
});

it('does not carry a leave question over into the next game', async () => {
  renderApp(game());
  await pressBack();
  await waitFor(() => expect(location.hash).toBe('#/game'));
  fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
  await waitFor(() => expect(location.hash).toBe('#/'));

  fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'OWLS' } });
  fireEvent.change(screen.getByLabelText('Team 2'), { target: { value: 'KITES' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  expect(location.hash).toBe('#/game');
  expect(screen.queryByRole('heading', { name: 'Leave the game?' })).toBeNull();
});

describe('the report', () => {
  const endGame = () => {
    fireEvent.click(menu());
    fireEvent.click(screen.getByText('End game'));
    fireEvent.click(screen.getByRole('button', { name: 'End game' }));
  };

  it('is its own page, and back from it is back to the game', async () => {
    renderApp(game());
    endGame();
    expect(location.hash).toBe('#/report');

    await pressBack();
    await waitFor(() => expect(location.hash).toBe('#/game'));
    // Left from the menu, so the game was paused on the way out and resumes from here.
    expect((await screen.findAllByRole('button', { name: 'Resume game' })).length).toBeGreaterThan(
      0,
    );
  });

  it('"Back to the game" is the same step back, not a new page on top', async () => {
    renderApp(game());
    endGame();
    fireEvent.click(screen.getByRole('button', { name: /Back to the game/ }));
    await waitFor(() => expect(location.hash).toBe('#/game'));
    expect(depth()).toBe(1);
  });

  it('"New game" goes home to setup, clearing the finished game off the history', async () => {
    renderApp(game());
    endGame();
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    await waitFor(() => expect(location.hash).toBe('#/'));
    expect(setupShown()).toBeInTheDocument();
    expect(depth()).toBe(0);
  });

  it('opened directly, goes back to its game', async () => {
    renderApp(game({ phase: 'report', status: 'finished' }), '#/report');
    expect(depth()).toBe(2);
    await pressBack();
    await waitFor(() => expect(location.hash).toBe('#/game'));
    expect(menu()).toBeInTheDocument();
  });

  it('the report so far is a page over the game, which is waiting underneath', async () => {
    renderApp(game());
    fireEvent.click(menu());
    fireEvent.click(screen.getByText('Report so far'));
    expect(location.hash).toBe('#/report');
    await pressBack();
    await waitFor(() => expect(location.hash).toBe('#/game'));
    expect(screen.queryByRole('heading', { name: 'Leave the game?' })).toBeNull();
  });
});

describe('match history and the guides', () => {
  const openFromMenu = (label: string) => {
    fireEvent.click(menu());
    fireEvent.click(screen.getByText(label));
  };

  // The walk that used to end in "do you want to leave?": every step back is one page.
  it('walks back from a game in the history to the list, then to setup', async () => {
    const played = { ...game({ phase: 'report', status: 'finished' }), id: 'g1' };
    saveGameToHistory(played);
    renderApp();

    openFromMenu('Match history');
    expect(location.hash).toBe('#/history');
    fireEvent.click(document.querySelector('[data-past-game]') as HTMLElement);
    expect(location.hash).toBe('#/history/g1');

    await pressBack();
    expect(await screen.findByRole('heading', { name: 'Match history' })).toBeInTheDocument();
    expect(location.hash).toBe('#/history');

    await pressBack();
    await waitFor(() => expect(setupShown()).toBeInTheDocument());
    expect(location.hash).toBe('#/');
    expect(depth()).toBe(0);
  });

  it('keeps what was typed on setup across a guide', async () => {
    renderApp();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES' } });
    openFromMenu("Beginner's guide");
    expect(location.hash).toBe('#/guide');

    await pressBack();
    await waitFor(() => expect(setupShown()).toBeInTheDocument());
    expect(screen.getByLabelText('Team 1')).toHaveValue('FOXES');
  });

  it('opens the advanced guide at its own address', () => {
    renderApp(undefined, '#/guide/advanced');
    expect(screen.getByRole('heading', { name: 'Advanced guide' })).toBeInTheDocument();
  });

  it('falls back to the list for a game the history does not have', async () => {
    renderApp(undefined, '#/history/nowhere');
    await waitFor(() => expect(location.hash).toBe('#/history'));
    expect(screen.getByRole('heading', { name: 'Match history' })).toBeInTheDocument();
  });
});

describe('page headers', () => {
  // Every page reached from somewhere else: a bare back arrow, the title, the menu.
  const header = () => document.querySelector('[data-page-header]') as HTMLElement;
  const headerOf = (address: string, state?: GameState) => {
    renderApp(state, address);
    const el = header();
    return {
      title: el.querySelector('h1')?.textContent,
      buttons: Array.from(el.querySelectorAll('button')).map((b) => b.getAttribute('aria-label')),
    };
  };

  it.each([
    ['#/history', undefined, 'Match history', 'Back'],
    ['#/guide', undefined, "Beginner's guide", 'Back'],
    ['#/guide/advanced', undefined, 'Advanced guide', 'Back'],
  ])('%s carries back, title and menu', (address, state, title, back) => {
    expect(headerOf(address, state)).toEqual({ title, buttons: [back, 'Menu'] });
  });

  it('the report carries them too, its way back named for where it goes', () => {
    expect(headerOf('#/report', game({ phase: 'report', status: 'finished' }))).toEqual({
      title: 'Report',
      buttons: ['Back to the game', 'Menu'],
    });
  });

  it('opens the app menu from a page', () => {
    renderApp(undefined, '#/history');
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByText("Beginner's guide")).toBeInTheDocument();
  });

  it('leaves the language to Settings: setup has no dropdown of its own', () => {
    renderApp();
    expect(screen.queryByRole('combobox', { name: 'Language' })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Language' })).toBeNull();
  });

  it('writes match history times on a 24-hour clock', () => {
    const played = {
      ...game({ phase: 'report', status: 'finished' }),
      id: 'g1',
      log: [
        {
          id: 1,
          wallClock: '18:30:00',
          atMs: new Date(2026, 7, 18, 18, 30).getTime(),
          gameSeconds: 0,
          type: 'gameStart' as const,
        },
      ],
    };
    saveGameToHistory(played);
    renderApp(undefined, '#/history');
    const row = document.querySelector('[data-past-game]') as HTMLElement;
    expect(row.textContent).toMatch(/18:30/);
    expect(row.textContent).not.toMatch(/AM|PM/i);
  });
});

describe('"Start new game" on a page', () => {
  const pageMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Menu' }));

  it('asks first on a page over a game being played', async () => {
    renderApp(game());
    fireEvent.click(menu());
    fireEvent.click(screen.getByText('Report so far'));
    pageMenu();
    fireEvent.click(screen.getByText('Start new game'));
    expect(screen.getByRole('heading', { name: 'Leave the game?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    await waitFor(() => expect(location.hash).toBe('#/'));
    expect(setupShown()).toBeInTheDocument();
  });

  it('goes home from an archived report, acting on the game in hand rather than the one shown', async () => {
    saveGameToHistory({ ...game({ phase: 'report', status: 'finished' }), id: 'g1' });
    renderApp();
    fireEvent.click(menu());
    fireEvent.click(screen.getByText('Match history'));
    fireEvent.click(document.querySelector('[data-past-game]') as HTMLElement);
    pageMenu();
    fireEvent.click(screen.getByText('Start new game'));
    expect(screen.queryByRole('heading', { name: 'Leave the game?' })).toBeNull();
    await waitFor(() => expect(location.hash).toBe('#/'));
    expect(setupShown()).toBeInTheDocument();
  });

  it('is, with the game setup and Settings, all a page over a game being played offers', () => {
    renderApp(game());
    fireEvent.click(menu());
    fireEvent.click(screen.getByText('Report so far'));
    pageMenu();
    const rows = Array.from(document.querySelectorAll('[data-menu-row]')).map((r) => r.textContent);
    expect(rows).toEqual(['Start new game', 'Game setup', 'Settings']);

    fireEvent.click(screen.getByText('Game setup'));
    expect(screen.getByRole('heading', { name: 'Game setup' })).toBeInTheDocument();
    expect(screen.getByText('Coin toss results')).toBeInTheDocument();
  });

  it('is not offered on setup, where it would lead', () => {
    renderApp();
    fireEvent.click(menu());
    expect(screen.queryByText('Start new game')).toBeNull();
  });
});
