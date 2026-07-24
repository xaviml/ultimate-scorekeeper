import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

/** A live game with a foul open for `elapsed` seconds and no transient call-out. */
function withOpenCall(elapsed: number): GameState {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'live';
  state.possessionTeam = 'B';
  state.gameSeconds = 100;
  state.pendingCall = { kind: 'foul', team: 'A', elapsedSeconds: elapsed };
  return state;
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.useRealTimers());

describe('the ambient assistance line while a call is open', () => {
  it('says the score is locked until the call is resolved, not "disc in play"', () => {
    mountWith(withOpenCall(5));

    expect(screen.getByText(/Foul called by Team A/)).toBeInTheDocument();
    expect(screen.getByText(/score is locked/)).toBeInTheDocument();
    expect(screen.queryByText(/Disc in play/)).not.toBeInTheDocument();
  });

  it('switches to the dragged-on line once the whistles have gone at 45 s', () => {
    mountWith(withOpenCall(45));

    expect(screen.getByText(/Still unresolved after 45 seconds/)).toBeInTheDocument();
  });

  it('drops the attribution entirely for a call logged without tracking activity', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'live';
    state.possessionTeam = 'B';
    state.gameSeconds = 100;
    // No team: config.trackPlayers is off, so CALL_MADE logged it unattributed.
    state.pendingCall = { kind: 'foul', elapsedSeconds: 5 };
    mountWith(state);

    // Both the resolution-row heading and the ambient line — "Foul", not "Foul — No team".
    // (getAllByText: the secondary clock is labelled with the same bare kind.)
    expect(screen.getAllByText('Foul').length).toBeGreaterThan(0);
    expect(screen.getByText(/^Foul called\./)).toBeInTheDocument();
    expect(screen.queryByText(/No team/)).not.toBeInTheDocument();
  });

  it('says what an open stoppage is holding up, since everything else waits on it', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'live';
    state.possessionTeam = 'A';
    state.pendingStoppage = { kind: 'injury', team: 'A', elapsedSeconds: 10, clockStopped: false };
    mountWith(state);

    expect(screen.getByText(/Injury stoppage/)).toBeInTheDocument();
    expect(screen.queryByText(/Disc in play/)).toBeNull();
  });

  it('lets an open stoppage outrank an open call: it is the one that froze the other', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'live';
    state.possessionTeam = 'A';
    state.pendingCall = { kind: 'foul', team: 'A', elapsedSeconds: 12 };
    state.pendingStoppage = { kind: 'injury', team: 'B', elapsedSeconds: 3, clockStopped: false };
    mountWith(state);

    expect(screen.getByText(/Injury stoppage/)).toBeInTheDocument();
    expect(screen.queryByText(/^Foul called\./)).toBeNull();
  });
});
