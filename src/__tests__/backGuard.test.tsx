import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
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
    // The pre-game screen is up: the header's leave control is the back arrow
    // ("Back to setup"), not the cross it becomes once the game is real.
    expect(screen.getByLabelText('Back to setup')).toBeInTheDocument();
    expect(screen.queryByLabelText('End game')).toBeNull();

    pressPhoneBack();

    // No confirmation — nothing to lose before the game starts — just setup, with names kept.
    expect(screen.queryByText('Leave the game?')).toBeNull();
    expect(screen.getByText('Game setup')).toBeInTheDocument();
    expect(screen.getByLabelText('Team 1')).toHaveValue('Foxes');
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

  it('the back gesture lands straight on setup without re-pushing a dead entry', () => {
    mountConfig();
    const pushSpy = vi.spyOn(history, 'pushState');

    fireEvent.click(screen.getByText('How does this app work?'));
    expect(screen.getByText('How this app works')).toBeInTheDocument();
    // Opening the guide pushes exactly one entry.
    expect(pushSpy).toHaveBeenCalledTimes(1);

    pressPhoneBack();

    expect(screen.getByText('Game setup')).toBeInTheDocument();
    expect(screen.queryByText('How this app works')).toBeNull();
    // The gesture "lands" — it must NOT re-push, or the next back would be a dead press.
    expect(pushSpy).toHaveBeenCalledTimes(1);

    pushSpy.mockRestore();
  });

  it('closing via the guide button consumes the pending entry too', () => {
    mountConfig();
    fireEvent.click(screen.getByText('How does this app work?'));
    const backSpy = vi.spyOn(history, 'back');

    fireEvent.click(screen.getByRole('button', { name: 'Back to setup' }));

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
