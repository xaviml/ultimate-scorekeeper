import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState, defaultConfig } from '../state/gameReducer';
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

/**
 * 5-3 with the half-time horn already sounded and the point in progress not yet
 * finished — the moment the whole picker exists for.
 */
function halfHornAt5_3(patch: Partial<GameState> = {}): GameState {
  const state = createInitialState({
    ...defaultConfig,
    halfScore: 8,
    targetScore: 15,
    halfCap: { kind: 'cap', plus: 1 },
  });
  state.phase = 'game';
  state.status = 'live';
  state.scores = { A: 5, B: 3 };
  state.gameSeconds = 3300;
  state.halfTimeCapReached = true;
  return { ...state, ...patch };
}

beforeEach(() => sessionStorage.clear());

describe('the cap target chip', () => {
  it('names both numbers the point in progress could settle the half on', () => {
    mountWith(halfHornAt5_3());

    // Not "finish this point and we'll see" — the two candidates, on the chip, tappable.
    expect(screen.getByRole('button', { name: 'Half at 6 or 7' })).toBeInTheDocument();
  });

  it('sets the half by hand, for the goal that beat the horn', async () => {
    mountWith(halfHornAt5_3());

    await userEvent.click(screen.getByRole('button', { name: 'Half at 6 or 7' }));
    expect(screen.getByText('Where does the half end?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'At 6' }));
    // Settled: one number, and still tappable in case that was the wrong one.
    expect(screen.getByRole('button', { name: 'Half at 6' })).toBeInTheDocument();
    expect(screen.queryByText('Where does the half end?')).not.toBeInTheDocument();
    // And silent — no call-out to shout, since nothing happened on the field.
    expect(screen.queryByText(/Half cap/)).not.toBeInTheDocument();
  });

  it('stays a plain label when the bounds leave one possible number', () => {
    // Half score 6 is the ceiling, so the leader's 5 can only become 6.
    const state = halfHornAt5_3();
    mountWith({ ...state, config: { ...state.config, halfScore: 6 } });

    expect(screen.getByText('Half at 6')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Half at/ })).not.toBeInTheDocument();
  });

  it('shows no chip at all before a horn has put a target in doubt', () => {
    mountWith(halfHornAt5_3({ halfTimeCapReached: false }));

    expect(screen.queryByText(/Half at/)).not.toBeInTheDocument();
  });
});

describe('the ambient line while a capped target is still movable', () => {
  it('points at the chip with the disc live', () => {
    mountWith(halfHornAt5_3());

    expect(screen.getByText(/Tap the target above if the goal beat the horn/)).toBeInTheDocument();
    expect(screen.getByText(/Disc in play/)).toBeInTheDocument();
  });

  it('points at it before the pull too, without losing the pull instruction', () => {
    mountWith(halfHornAt5_3({ status: 'awaitingPull' }));

    expect(screen.getByText(/Press "Pull thrown"/)).toBeInTheDocument();
    expect(screen.getByText(/Tap the target above if the goal beat the horn/)).toBeInTheDocument();
  });

  it('says nothing extra once the number is no longer in doubt', () => {
    const state = halfHornAt5_3();
    mountWith({ ...state, config: { ...state.config, halfScore: 6 } });

    expect(screen.queryByText(/Tap the target above/)).not.toBeInTheDocument();
  });
});
