import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  state.config.statsMode = 'players';
  state.config.trackTurnovers = true;
  state.config.players.A = [{ id: 'p1', number: '7', name: 'Alex' }];
  state.points = [
    { scoredBy: 'A', offense: 'A', isBreak: false, durationSeconds: 30, half: 1, turnovers: 0 },
  ];
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

/** The dashboard's "Scorer 1-0" prompt, or null once it has been answered or skipped. */
const prompt = () => screen.queryByText(/^Scorer \d+-\d+$/);

/** Answers the prompt with "Don't know" on both steps — resolved, nobody named. */
function skipPrompt() {
  fireEvent.click(prompt()!);
  fireEvent.click(screen.getByRole('button', { name: "Don't know" }));
  fireEvent.click(screen.getByRole('button', { name: "Don't know" }));
}

beforeEach(() => sessionStorage.clear());

describe('the who-scored prompt survives a mid-game reload', () => {
  it('has no way to dismiss it unanswered', () => {
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(midGameState()));
    mountApp();
    expect(screen.queryByRole('button', { name: /skip/i })).toBeNull();
  });

  it('does not ask again about a point that was already resolved', () => {
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(midGameState()));

    mountApp();
    // A prompt beside the pull controls, not a dialog over them.
    expect(prompt()).toBeInTheDocument();
    expect(screen.getByText('Pull thrown')).toBeInTheDocument();
    skipPrompt();
    expect(prompt()).toBeNull();
    cleanup();

    // Reload: same game state, fresh components.
    mountApp();
    expect(prompt()).toBeNull();
  });

  it('keeps asking when the dialog is closed without an answer', () => {
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(midGameState()));
    const { container } = mountApp();

    fireEvent.click(prompt()!);
    expect(screen.getByText('Who threw it?')).toBeInTheDocument();
    const backdrop = container.querySelector('.fixed') as HTMLElement;
    fireEvent.pointerDown(backdrop);
    fireEvent.click(backdrop);

    expect(screen.queryByText('Who threw it?')).toBeNull();
    expect(prompt()).toBeInTheDocument();
  });

  it('still asks for a point scored after the reload', () => {
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(midGameState()));
    mountApp();
    skipPrompt();
    cleanup();

    const next = midGameState();
    next.scores = { A: 1, B: 1 };
    next.points = [
      ...next.points,
      { scoredBy: 'B', offense: 'B', isBreak: false, durationSeconds: 20, half: 1, turnovers: 0 },
    ];
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(next));

    mountApp();
    expect(prompt()).toBeInTheDocument();
  });

  it('forgets the counter when a new game starts', () => {
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(midGameState()));
    mountApp();
    skipPrompt();
    cleanup();

    // A fresh game: no points yet, so a stale counter must not suppress the next prompt.
    const fresh = midGameState();
    fresh.scores = { A: 0, B: 0 };
    fresh.points = [];
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(fresh));

    mountApp();
    expect(Number(sessionStorage.getItem('ultimate-scorekeeper:assist-dismissed-up-to'))).toBe(0);
  });
});
