import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';

function mountWith(state: GameState) {
  sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
  return render(
    <I18nProvider>
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

/** A game waiting for the pull, `seconds` into the countdown. */
function awaitingPull(seconds: number): GameState {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'awaitingPull';
  state.possessionTeam = 'A';
  state.secondary = { kind: 'pull', seconds, total: null };
  return state;
}

function signalImage(): HTMLImageElement {
  return screen.getByRole('img', { name: /whistle/i }) as HTMLImageElement;
}

beforeEach(() => sessionStorage.clear());

describe('the whistle signal card', () => {
  // The count is the whole meaning of the sign — a triple whistle showing the same
  // picture as a single one tells the volunteer nothing about what to blow.
  it.each([
    [45, 1, 'Single whistle'],
    [60, 2, 'Double whistle'],
    [75, 3, 'Triple whistle'],
  ])('shows the x%2$d art at %1$d s into the pull', (seconds, blasts, caption) => {
    mountWith(awaitingPull(seconds as number));

    expect(signalImage().getAttribute('src')).toContain(`signals/whistle${blasts}.png`);
    expect(screen.getByText(caption as string)).toBeInTheDocument();
  });

  it('shows the triple-whistle art for a timeout restart, not the pull countdown one', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'live';
    state.possessionTeam = 'A';
    state.assist = 'timeoutRestart';
    mountWith(state);

    expect(signalImage().getAttribute('src')).toContain('signals/whistle3.png');
  });
});
