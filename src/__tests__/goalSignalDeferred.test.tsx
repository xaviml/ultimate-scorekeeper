import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';
import { tap } from './gestures';

/** A live game with player tracking on, ready for team A to score. */
function liveGame(): GameState {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'live';
  state.possessionTeam = 'A';
  state.offenseTeam = 'A';
  state.pullingTeam = 'B';
  state.config.statsMode = 'player';
  return state;
}

function mount(state: GameState) {
  sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
  return render(
    <I18nProvider>
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

/** AssistGoalDialog has no Cancel/close button — dismissing it is a backdrop press. */
function dismissAssistDialog(container: HTMLElement) {
  const backdrop = container.querySelector('.fixed') as HTMLElement;
  fireEvent.pointerDown(backdrop);
  fireEvent.click(backdrop);
}

beforeEach(() => sessionStorage.clear());

describe('the goal sign and gender-ratio sign, with player tracking on', () => {
  it('holds the goal sign/message back until the scorer/assist dialog closes, but scores and starts the pull clock right away', () => {
    const { container } = mount(liveGame());

    tap(screen.getByLabelText('Team A: 0'));

    // Score and pull-clock advance immediately — nothing about that is deferred.
    expect(screen.getByLabelText('Team A: 1')).toBeInTheDocument();
    expect(screen.getByText('Pull thrown')).toBeInTheDocument();

    // The scorer/assist dialog is up, and the goal sign/call-out are not shown yet.
    expect(screen.getByText(/Who scored/i)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Goal' })).toBeNull();
    expect(screen.queryByText('"Team A 1, Team B 0!"')).toBeNull();

    dismissAssistDialog(container);

    // Dialog closed: the goal sign and its call-out now show.
    expect(screen.queryByText(/Who scored/i)).toBeNull();
    expect(screen.getByRole('img', { name: 'Goal' })).toBeInTheDocument();
    expect(screen.getByText('"Team A 1, Team B 0!"')).toBeInTheDocument();
  });

  it('shows the goal sign immediately when player tracking is off', () => {
    const state = liveGame();
    state.config.statsMode = 'none';
    mount(state);

    tap(screen.getByLabelText('Team A: 0'));

    expect(screen.queryByText(/Who scored/i)).toBeNull();
    expect(screen.getByRole('img', { name: 'Goal' })).toBeInTheDocument();
  });

  it('defers the gender-ratio auto-reveal until after the dialog closes', () => {
    vi.useFakeTimers();
    try {
      const state = liveGame();
      state.config.division = 'mixed';
      state.config.mixedRule = 'A';
      const { container } = mount(state);

      tap(screen.getByLabelText('Team A: 0'));

      expect(screen.getByText(/Who scored/i)).toBeInTheDocument();

      // 3s pass with the dialog still open: the ratio must not auto-reveal yet.
      act(() => {
        vi.advanceTimersByTime(3500);
      });
      expect(screen.queryByRole('img', { name: /ratio/i })).toBeNull();

      act(() => {
        dismissAssistDialog(container);
      });

      act(() => {
        vi.advanceTimersByTime(3500);
      });
      expect(screen.getByRole('img', { name: /ratio/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
