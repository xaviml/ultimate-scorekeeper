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
 * A call-out used to be overwritten the moment anything else happened — three seconds
 * into its seven and gone unheard. These cover the queue that replaced that: what
 * waits, what interrupts, and what is dropped as no longer worth saying.
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

/**
 * A live game, disc in play, with attribution off so goals announce immediately.
 *
 * Open division on purpose: mixed would fire the gender-ratio reveal three seconds
 * after every goal, and that one *supersedes* the goal rather than queueing behind it
 * (see SUPERSEDES) — a deliberate stagger that would drown out what is under test.
 */
function liveGame(): GameState {
  const state = createInitialState();
  state.config.division = 'open';
  state.phase = 'game';
  state.status = 'live';
  state.possessionTeam = 'A';
  state.offenseTeam = 'A';
  state.pullingTeam = 'B';
  return state;
}

const send = (a: Action) => act(() => dispatch(a));
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('the assistance queue', () => {
  it('makes a second call-out wait its turn instead of cutting the first one short', () => {
    mountWith(liveGame());

    send({ type: 'GOAL', team: 'A' });
    expect(screen.getByText('"Team A 1, Team B 0!"')).toBeInTheDocument();

    send({ type: 'PULL_THROWN' });
    send({ type: 'GOAL', team: 'A' });

    // The first score is still the thing being announced — the second is behind it.
    expect(screen.getByText('"Team A 1, Team B 0!"')).toBeInTheDocument();
    expect(screen.queryByText('"Team A 2, Team B 0!"')).toBeNull();

    // Once the first has had its full window, the second gets its turn.
    wait(7000);
    expect(screen.getByText('"Team A 2, Team B 0!"')).toBeInTheDocument();
  });

  it('lets an injury interrupt a score, and gives the score back afterwards', () => {
    mountWith(liveGame());

    send({ type: 'GOAL', team: 'A' });
    expect(screen.getByText('"Team A 1, Team B 0!"')).toBeInTheDocument();

    // Tier 2 over tier 0: safety does not wait behind a scoreline.
    send({ type: 'STOPPAGE', kind: 'injury', team: 'A' });
    expect(screen.getByText('"Injury — stop play!"')).toBeInTheDocument();
    expect(screen.queryByText('"Team A 1, Team B 0!"')).toBeNull();

    // Interrupted, not lost: it went back to the front of the queue.
    wait(7000);
    expect(screen.getByText('"Team A 1, Team B 0!"')).toBeInTheDocument();
  });

  it('drops a queued call-out once the call it was about has been resolved', () => {
    mountWith(liveGame());

    // Travel holds the bar; the foul lands behind it at the same tier and waits.
    send({ type: 'TRAVEL', team: 'A' });
    expect(screen.getByText('"Travel!"')).toBeInTheDocument();

    send({ type: 'CALL_MADE', kind: 'foul', team: 'B' });
    expect(screen.queryByText('"Foul — Team B!"')).toBeNull();

    // Resolved while it was still waiting — announcing it now would read as a bug.
    send({ type: 'CALL_RESOLVED', resolution: 'accepted' });

    wait(7000);
    expect(screen.queryByText('"Foul — Team B!"')).toBeNull();
    expect(screen.getByText('"Uncontested — play on!"')).toBeInTheDocument();
  });

  it('shows a queued message for a shorter window, so the backlog drains', () => {
    mountWith(liveGame());

    send({ type: 'GOAL', team: 'A' });
    send({ type: 'PULL_THROWN' });
    send({ type: 'GOAL', team: 'A' });

    wait(7000);
    expect(screen.getByText('"Team A 2, Team B 0!"')).toBeInTheDocument();

    // 4 s, not 7 — it already missed its moment.
    wait(4000);
    expect(screen.queryByText('"Team A 2, Team B 0!"')).toBeNull();
  });

  it('keeps the hand signal on the same message as the words', () => {
    mountWith(liveGame());

    send({ type: 'GOAL', team: 'A' });
    expect(screen.getByRole('img', { name: 'Goal' })).toBeInTheDocument();

    // The injury takes both halves of the announcement, not just the bar.
    send({ type: 'STOPPAGE', kind: 'injury', team: 'A' });
    expect(screen.getByText('"Injury — stop play!"')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Goal' })).toBeNull();
    expect(screen.getByRole('img', { name: 'Stoppage of play' })).toBeInTheDocument();

    // ...and hands them both back together.
    wait(7000);
    expect(screen.getByText('"Team A 1, Team B 0!"')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Goal' })).toBeInTheDocument();
  });

  it('falls back to the ambient line once the queue is empty', () => {
    mountWith(liveGame());

    send({ type: 'GOAL', team: 'A' });
    wait(7000);

    expect(screen.queryByText('"Team A 1, Team B 0!"')).toBeNull();
    expect(screen.getByText(/pull/i)).toBeInTheDocument();
  });
});
