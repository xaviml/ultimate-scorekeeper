import { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import { useGameDispatch } from '../state/gameHooks';
import { AssistanceBar } from '../components/AssistanceBar';
import { SignalCard } from '../components/SignalCard';
import type { Action, GameState } from '../state/types';

/**
 * A referee keeps the gender-ratio hand signal up until the lines are actually set,
 * which routinely outlasts a normal message's window on the bar (see SignalCard's
 * fallback). These cover that it survives past that window, still yields to a whistle
 * that fires while it's up, and clears the moment the pull is actually thrown.
 */

let dispatch: (a: Action) => void;

function Harness() {
  const d = useGameDispatch();
  useEffect(() => {
    dispatch = d;
  }, [d]);
  return (
    <>
      <AssistanceBar />
      <SignalCard />
    </>
  );
}

function mountWith(state: GameState) {
  sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
  return render(
    <I18nProvider>
      <GameProvider>
        <Harness />
      </GameProvider>
    </I18nProvider>,
  );
}

/** Live, mixed division under Rule A, one goal away from a ratio flip. */
function liveMixedGame(): GameState {
  const state = createInitialState();
  state.config.division = 'mixed';
  state.config.mixedRule = 'A';
  state.phase = 'game';
  state.status = 'live';
  state.possessionTeam = 'A';
  state.offenseTeam = 'A';
  state.pullingTeam = 'B';
  return state;
}

const send = (a: Action) => act(() => dispatch(a));
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const ratioImage = () => screen.queryByRole('img', { name: /ratio/i });

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('the gender-ratio signal, before the pull is thrown', () => {
  it('outlasts the normal 7s/4s window and keeps showing while the pull is still open', () => {
    mountWith(liveMixedGame());

    send({ type: 'GOAL', team: 'A' });
    // The reveal is held back 3s so it lands while the goal sign is still up.
    wait(3500);
    expect(ratioImage()).toBeInTheDocument();

    // Well past the queue's own 7s (or 4s if queued) window: a routine message would
    // be gone by now, but the pull still hasn't been thrown.
    wait(12000);
    expect(ratioImage()).toBeInTheDocument();

    // Also present on the ambient line, telling the volunteer to keep making it.
    expect(screen.getByText(/Hold the signal/i)).toBeInTheDocument();
  });

  it('gives way to the pull-clock whistle, then resumes once the whistle is done', () => {
    mountWith(liveMixedGame());

    send({ type: 'GOAL', team: 'A' });
    wait(3500);
    expect(ratioImage()).toBeInTheDocument();

    // Advance the pull clock to the 45s whistle — TICK runs every real second, so
    // this needs 45 of them, not one big jump.
    wait(45000);
    expect(screen.getByRole('img', { name: /whistle/i })).toBeInTheDocument();
    expect(ratioImage()).toBeNull();

    // The whistle's own window closes; the gap reopens onto the ratio signal again.
    wait(7000);
    expect(ratioImage()).toBeInTheDocument();
  });

  it('clears the moment the pull is actually thrown', () => {
    mountWith(liveMixedGame());

    send({ type: 'GOAL', team: 'A' });
    wait(3500);
    wait(12000);
    expect(ratioImage()).toBeInTheDocument();

    send({ type: 'PULL_THROWN' });
    expect(ratioImage()).toBeNull();
    expect(screen.queryByText(/Hold the signal/i)).toBeNull();
  });
});
