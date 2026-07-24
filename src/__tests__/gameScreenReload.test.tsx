import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';

/** A game with player tracking on, sitting where a goal has just been scored. */
function midGameState(): GameState {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'awaitingPull';
  state.scores = { A: 1, B: 0 };
  state.pullingTeam = 'A';
  state.offenseTeam = 'B';
  state.secondary = { kind: 'pull', seconds: 0, total: 75 };
  state.config.trackPlayers = true;
  state.config.players.A = [{ id: 'p1', number: '7', name: 'Alex' }];
  state.points = [{ scoredBy: 'A', offense: 'A', isBreak: false, durationSeconds: 30, half: 1 }];
  state.assist = 'goalScored';
  return state;
}

/** Mounting fresh is what a reload does: the game state is restored, components are not. */
function mountApp() {
  return render(
    <I18nProvider>
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

/** AssistGoalDialog has no Cancel/close button — dismissing it is a real backdrop
 * press, same as the Modal backdrop-dismissal tests in dialogs.test.tsx. */
function dismissAssistDialog(container: HTMLElement) {
  const backdrop = container.querySelector('.fixed') as HTMLElement;
  fireEvent.pointerDown(backdrop);
  fireEvent.click(backdrop);
}

beforeEach(() => sessionStorage.clear());

describe('the pull prompt survives a mid-game reload', () => {
  it('does not re-ask who scored for a point that was already resolved', () => {
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(midGameState()));

    const first = mountApp();
    // The dialog covers the pull controls until the volunteer answers it.
    expect(screen.getByText(/Who scored/i)).toBeInTheDocument();
    dismissAssistDialog(first.container);
    expect(screen.queryByText(/Who scored/i)).toBeNull();
    expect(screen.getByText('Pull thrown')).toBeInTheDocument();
    first.unmount();

    // Reload: same game state, fresh components.
    mountApp();

    expect(screen.queryByText(/Who scored/i)).toBeNull();
    expect(screen.getByText('Pull thrown')).toBeInTheDocument();
  });

  it('still asks for a point scored after the reload', () => {
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(midGameState()));
    const first = mountApp();
    dismissAssistDialog(first.container);
    first.unmount();

    const next = midGameState();
    next.scores = { A: 1, B: 1 };
    next.points = [
      ...next.points,
      { scoredBy: 'B', offense: 'B', isBreak: false, durationSeconds: 20, half: 1 },
    ];
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(next));

    mountApp();
    expect(screen.getByText(/Who scored/i)).toBeInTheDocument();
  });

  it('forgets the counter when a new game starts', () => {
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(midGameState()));
    const first = mountApp();
    dismissAssistDialog(first.container);
    first.unmount();

    // A fresh game: no points yet, so a stale counter must not suppress the next prompt.
    const fresh = midGameState();
    fresh.scores = { A: 0, B: 0 };
    fresh.points = [];
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(fresh));

    mountApp();
    expect(Number(sessionStorage.getItem('ultimate-scorekeeper:assist-dismissed-up-to'))).toBe(0);
  });
});
