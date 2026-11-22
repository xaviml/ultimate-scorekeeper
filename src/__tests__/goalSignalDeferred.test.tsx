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
  state.config.statsMode = 'players';
  state.config.trackTurnovers = true;
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

/** The dashboard's "Scorer 1-0" prompt — the question is asked there, not over the score. */
const prompt = () => screen.queryByText(/^Scorer \d+-\d+$/);

beforeEach(() => sessionStorage.clear());

describe('the goal sign and gender-ratio sign, with player tracking on', () => {
  // Nothing covers the dashboard after a goal any more: the volunteer has to read out
  // the score and the next ratio before they can find out who scored, so both go out
  // at once and the question waits on a prompt beside the pull controls.
  it('signs and announces the goal at once, and asks who scored from a prompt rather than a dialog', () => {
    mount(liveGame());

    tap(screen.getByLabelText('TEAM A: 0'));

    expect(screen.getByLabelText('TEAM A: 1')).toBeInTheDocument();
    expect(screen.getByText('Pull thrown')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Goal' })).toBeInTheDocument();
    expect(screen.getByText('"TEAM A 1, TEAM B 0!"')).toBeInTheDocument();

    expect(prompt()).toBeInTheDocument();
    expect(screen.queryByText('Who threw it?')).toBeNull();
  });

  it('reveals the gender ratio on its usual delay, without waiting for the scorer', () => {
    vi.useFakeTimers();
    try {
      const state = liveGame();
      state.config.division = 'mixed';
      state.config.mixedRule = 'A';
      mount(state);

      tap(screen.getByLabelText('TEAM A: 0'));
      act(() => {
        vi.advanceTimersByTime(3500);
      });

      expect(screen.getByRole('img', { name: /ratio/i })).toBeInTheDocument();
      expect(prompt()).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  // The prompt outlives the pull: finding out who scored is often slower than the
  // next point getting going.
  it('keeps the prompt up through the next point until it is answered', () => {
    mount(liveGame());

    tap(screen.getByLabelText('TEAM A: 0'));
    fireEvent.click(screen.getByText('Pull thrown'));
    expect(prompt()).toBeInTheDocument();

    fireEvent.click(prompt()!);
    fireEvent.click(screen.getByRole('button', { name: "Don't know" }));
    fireEvent.click(screen.getByRole('button', { name: "Don't know" }));
    expect(prompt()).toBeNull();
  });

  it('asks nothing when player tracking is off', () => {
    const state = liveGame();
    state.config.statsMode = 'none';
    mount(state);

    tap(screen.getByLabelText('TEAM A: 0'));

    expect(prompt()).toBeNull();
    expect(screen.getByRole('img', { name: 'Goal' })).toBeInTheDocument();
  });

  it('asks nothing when the game does not ask who scored', () => {
    const state = liveGame();
    state.config = { ...state.config, trackGoalPlayers: false };
    mount(state);

    tap(screen.getByLabelText('TEAM A: 0'));

    expect(screen.getByLabelText('TEAM A: 1')).toBeInTheDocument();
    expect(prompt()).toBeNull();
  });
});
