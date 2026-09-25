import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';

const KEY = 'ultimate-scorekeeper:game-state';
const T = new Date('2024-06-01T10:00:00').getTime();

function liveGame(patch: Partial<GameState> = {}): GameState {
  const state = createInitialState();
  return { ...state, phase: 'game', status: 'live', pointStartSeconds: 0, ...patch };
}

function mountWith(state: GameState) {
  sessionStorage.setItem(KEY, JSON.stringify(state));
  return render(
    <I18nProvider>
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

const stored = (): GameState => JSON.parse(sessionStorage.getItem(KEY) ?? 'null');

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(T);
});
afterEach(() => vi.useRealTimers());

describe('the game clock follows real time, not the heartbeat', () => {
  it('advances one second per second while the heartbeat runs normally', () => {
    mountWith(liveGame());
    act(() => vi.advanceTimersByTime(5_000));
    expect(stored().gameSeconds).toBe(5);
  });

  it('catches up the seconds a hidden tab never ticked, the moment it is visible again', () => {
    mountWith(liveGame());
    // The browser suspended the interval: 40 s pass and not one callback fires.
    vi.setSystemTime(T + 40_000);
    expect(stored().gameSeconds).toBe(0);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(stored().gameSeconds).toBe(40);
  });

  it('counts the time a reload took, on mount', () => {
    // Saved 45 s ago, mid-point, by a page that was then reloaded.
    mountWith(liveGame({ gameSeconds: 300, clockAnchorMs: T - 45_000 }));
    expect(stored().gameSeconds).toBe(345);
  });
});
