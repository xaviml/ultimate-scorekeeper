import { StrictMode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import App from '../App';
import ConfigScreen from '../components/ConfigScreen';
import GameScreen from '../components/GameScreen';

/** Simulate the phone/browser back gesture: the browser pops our pushed entry, then fires popstate. */
function pressPhoneBack() {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

function seedMidGame() {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'live';
  state.config.teams.A.name = 'Foxes';
  state.scores = { A: 3, B: 1 };
  sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
}

/** A game screen that is mounted but hasn't been started yet (no "Start game" tapped). */
function seedNotStartedGame() {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'notStarted';
  state.config.teams.A.name = 'Foxes';
  sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
}

function renderApp() {
  return render(
    <I18nProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </I18nProvider>,
  );
}

beforeEach(() => sessionStorage.clear());

describe('phone back button in a game', () => {
  function mountGame() {
    seedMidGame();
    return render(
      <I18nProvider>
        <GameProvider>
          <GameScreen />
        </GameProvider>
      </I18nProvider>,
    );
  }

  it('asks to leave instead of exiting outright', () => {
    mountGame();
    expect(screen.queryByText('Leave the game?')).toBeNull();

    pressPhoneBack();
    expect(screen.getByText('Leave the game?')).toBeInTheDocument();
  });

  it('goes straight back to setup with no prompt when the game has not started yet', () => {
    seedNotStartedGame();
    renderApp();
    // The pre-game dashboard is up, with the menu in the header.
    expect(screen.getByLabelText('Menu')).toBeInTheDocument();

    pressPhoneBack();

    // No confirmation — nothing to lose before the game starts — just setup, with names kept.
    expect(screen.queryByText('Leave the game?')).toBeNull();
    expect(screen.getByText('Game setup')).toBeInTheDocument();
    expect(screen.getByLabelText('Team 1')).toHaveValue('Foxes');
  });

  // The menu and what it opens are layers over the dashboard, so a back press has
  // to peel one off at a time rather than jump straight to abandoning the game.
  // They share the game's single back guard: a second useBackGuard would attach a
  // second popstate listener and each would answer the other's press.
  it('closes the menu instead of offering to leave', () => {
    mountGame();
    fireEvent.click(screen.getByLabelText('Menu'));

    pressPhoneBack();
    expect(screen.queryByText('Menu')).toBeNull();
    expect(screen.queryByText('Leave the game?')).toBeNull();

    // Still guarded — the press was absorbed, not spent.
    pressPhoneBack();
    expect(screen.getByText('Leave the game?')).toBeInTheDocument();
  });

  it('returns from the guide to the game, not out of it', () => {
    mountGame();
    fireEvent.click(screen.getByLabelText('Menu'));
    fireEvent.click(screen.getByText("Beginner's guide"));
    expect(screen.getByRole('heading', { name: "Beginner's guide" })).toBeInTheDocument();

    pressPhoneBack();
    expect(screen.queryByRole('heading', { name: "Beginner's guide" })).toBeNull();
    expect(screen.queryByText('Leave the game?')).toBeNull();
    expect(screen.getByLabelText('Menu')).toBeInTheDocument();
  });

  it('cancelling stays on the game and keeps guarding the next press', () => {
    mountGame();
    pressPhoneBack();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Leave the game?')).toBeNull();

    // Still guarded: a second press re-opens the prompt rather than leaving.
    pressPhoneBack();
    expect(screen.getByText('Leave the game?')).toBeInTheDocument();
  });

  it('confirming lands on game setup and consumes the trapped entry so nothing dead is left behind', () => {
    const backSpy = vi.spyOn(history, 'back');
    seedMidGame();
    renderApp();
    expect(screen.getByText('Foxes')).toBeInTheDocument();

    pressPhoneBack();
    fireEvent.click(screen.getByText('Leave'));

    expect(screen.getByText('Game setup')).toBeInTheDocument();
    expect(screen.queryByText('Leave the game?')).toBeNull();
    // BACK_TO_CONFIG carries the team names forward, same as the report screen's flow.
    expect(screen.getByLabelText('Team 1')).toHaveValue('Foxes');
    // The guard entry pushed for this game was popped, not abandoned on the stack.
    expect(backSpy).toHaveBeenCalledTimes(1);

    backSpy.mockRestore();
  });
});

describe('phone back button on the how-it-works guide', () => {
  function mountConfig() {
    return render(
      <I18nProvider>
        <GameProvider>
          <ConfigScreen />
        </GameProvider>
      </I18nProvider>,
    );
  }

  /**
   * The menu is the guide's only door now. It pushes nothing itself — it is a plain
   * dialog with no back guard of its own — so the pushState counts below still
   * measure the guide alone.
   */
  const openGuide = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: "Beginner's guide" }));
  };

  it('the back gesture lands straight on setup without re-pushing a dead entry', () => {
    mountConfig();
    const pushSpy = vi.spyOn(history, 'pushState');

    openGuide();
    expect(screen.getByRole('heading', { name: "Beginner's guide" })).toBeInTheDocument();
    // Opening the guide pushes exactly one entry.
    expect(pushSpy).toHaveBeenCalledTimes(1);

    pressPhoneBack();

    expect(screen.getByText('Game setup')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: "Beginner's guide" })).toBeNull();
    // The gesture "lands" — it must NOT re-push, or the next back would be a dead press.
    expect(pushSpy).toHaveBeenCalledTimes(1);

    pushSpy.mockRestore();
  });

  it('closing via the guide header button consumes the pending entry too', () => {
    mountConfig();
    openGuide();
    const backSpy = vi.spyOn(history, 'back');

    fireEvent.click(screen.getByRole('button', { name: '← Back' }));

    expect(screen.getByText('Game setup')).toBeInTheDocument();
    expect(backSpy).toHaveBeenCalledTimes(1);

    backSpy.mockRestore();
  });
});

describe('phone back button on the report', () => {
  /** A game whose scoreline finished it, sitting on the dashboard's "Open report". */
  function seedFinishedGame() {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'finished';
    state.config.teams.A.name = 'Foxes';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
  }

  it('goes back to the game rather than out of the app', () => {
    seedFinishedGame();
    renderApp();
    fireEvent.click(screen.getByLabelText('Menu'));
    const menu = screen.getByRole('heading', { name: 'Menu' }).parentElement!
      .parentElement as HTMLElement;
    fireEvent.click(within(menu).getByText('Open report'));
    expect(screen.getByText('Game summary')).toBeInTheDocument();

    pressPhoneBack();

    expect(screen.getByLabelText('Menu')).toBeInTheDocument();
    expect(screen.queryByText('Game summary')).toBeNull();
  });

  // The two screens swap places, so the entry is passed between them rather than
  // spent and re-pushed: resolve()'s history.back() is a queued traversal and
  // would land after the arriving screen's pushState, eating the wrong entry.
  it('passes the one trapped entry between the game and the report, both ways', () => {
    seedFinishedGame();
    renderApp();
    const pushSpy = vi.spyOn(history, 'pushState');
    const backSpy = vi.spyOn(history, 'back');

    fireEvent.click(screen.getByLabelText('Menu'));
    const menu = screen.getByRole('heading', { name: 'Menu' }).parentElement!
      .parentElement as HTMLElement;
    fireEvent.click(within(menu).getByText('Open report'));
    fireEvent.click(screen.getByText(/Back to the game/));
    expect(screen.getByLabelText('Menu')).toBeInTheDocument();

    // Neither leg pushed a second entry, and neither spent the one already there.
    expect(pushSpy).not.toHaveBeenCalled();
    expect(backSpy).not.toHaveBeenCalled();

    pushSpy.mockRestore();
    backSpy.mockRestore();
  });

  it('guards the report the same way after a reload lands straight on it', () => {
    // Nothing handed anything over here — the app started on the report — so the
    // screen arms an entry of its own.
    const state = createInitialState();
    state.phase = 'report';
    state.status = 'finished';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
    const pushSpy = vi.spyOn(history, 'pushState');
    renderApp();
    expect(pushSpy).toHaveBeenCalledTimes(1);

    pressPhoneBack();
    expect(screen.getByLabelText('Menu')).toBeInTheDocument();

    pushSpy.mockRestore();
  });

  it('spends the entry on "New game", which lands on setup with nothing to guard', () => {
    const state = createInitialState();
    state.phase = 'report';
    state.status = 'finished';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
    renderApp();
    const backSpy = vi.spyOn(history, 'back');

    fireEvent.click(screen.getByText('New game'));

    expect(screen.getByText('Game setup')).toBeInTheDocument();
    expect(backSpy).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
  });
});

describe('StrictMode dev-mode double-invoke', () => {
  // React 18 StrictMode mounts every effect, cleans it up, then mounts it again
  // (dev only) to flush out non-idempotent effects. history.back() is exactly
  // that kind of call — async, observable after the fact — so the hook must never
  // reach for it from an effect, and its single pushed entry must survive the
  // replay rather than being duplicated. The spies make this deterministic
  // instead of racing a real popstate's timing.
  it('never calls history.back() from the effect, pushes exactly once, shows no dialog on mount', () => {
    const backSpy = vi.spyOn(history, 'back');
    const pushSpy = vi.spyOn(history, 'pushState');
    seedMidGame();

    render(
      <StrictMode>
        <I18nProvider>
          <GameProvider>
            <GameScreen />
          </GameProvider>
        </I18nProvider>
      </StrictMode>,
    );

    expect(backSpy).not.toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Leave the game?')).toBeNull();

    backSpy.mockRestore();
    pushSpy.mockRestore();
  });
});
