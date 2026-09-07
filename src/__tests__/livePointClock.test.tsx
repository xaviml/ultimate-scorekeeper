import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';

/**
 * The secondary clock box while the disc is live — the stretch it used to read
 * '--:--' for (see livePointClock in GameScreen). What is pinned here: which of the
 * two readings a game gets, that a turnover hands the possession clock over rather
 * than restarting it, that the toggle survives a remount, and above all that none of
 * this ever takes the box off a pull, a break or an open call.
 */
function liveGame(overrides: Partial<GameState> = {}): GameState {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'live';
  state.offenseTeam = 'B';
  state.pullingTeam = 'A';
  state.possessionTeam = 'B';
  state.pointStartSeconds = 60;
  state.gameSeconds = 160; // 100 s into the point
  // Copied rather than mutated: createInitialState()'s default config object is
  // shared, and flipping statsMode on it would leak into other test files.
  state.config = { ...state.config, statsMode: 'teams', trackTurnovers: true };
  return { ...state, ...overrides };
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

const toggle = () => screen.queryByRole('button', { name: /Switch between the point clock/ });
/** The clock box itself — the team name it carries is also 52 px tall on the score panel behind it. */
const clockBox = () => document.querySelector('[data-live-clock]') as HTMLElement;

beforeEach(() => sessionStorage.clear());

describe('the secondary clock while the disc is live', () => {
  it('counts the point itself when the game records no turnovers, and offers no toggle', () => {
    const state = liveGame();
    state.config = { ...state.config, trackTurnovers: false };
    mount(state);

    expect(screen.getByText('Point clock')).toBeInTheDocument();
    expect(screen.getByText('01:40')).toBeInTheDocument();
    // Without turnovers the disc never changes hands, so there is no second reading.
    expect(toggle()).toBeNull();
  });

  it('counts the holder’s possession, named after them, when turnovers are recorded', () => {
    mount(liveGame({ possessionSeconds: { A: 25, B: 70 } }));

    const box = clockBox();
    expect(box).toHaveAttribute('data-live-clock', 'possession');
    expect(within(box).getByText('Team B')).toBeInTheDocument();
    expect(within(box).getByText('01:10')).toBeInTheDocument();
    // The point's own clock is the other reading, not this one.
    expect(screen.queryByText('01:40')).toBeNull();
  });

  it('hands the clock to the other team where it left off, rather than restarting it', () => {
    // Same point after a turnover: A has the disc back and picks up from its 25 s.
    mount(liveGame({ possessionTeam: 'A', possessionSeconds: { A: 25, B: 70 } }));

    const box = clockBox();
    expect(within(box).getByText('Team A')).toBeInTheDocument();
    expect(within(box).getByText('00:25')).toBeInTheDocument();
  });

  it('swaps to the point clock on a tap, and back again', () => {
    mount(liveGame({ possessionSeconds: { A: 25, B: 70 } }));

    fireEvent.click(toggle() as HTMLElement);
    expect(screen.getByText('Point clock')).toBeInTheDocument();
    expect(screen.getByText('01:40')).toBeInTheDocument();

    fireEvent.click(toggle() as HTMLElement);
    expect(clockBox()).toHaveAttribute('data-live-clock', 'possession');
    expect(within(clockBox()).getByText('Team B')).toBeInTheDocument();
    expect(within(clockBox()).getByText('01:10')).toBeInTheDocument();
  });

  it('comes back on the reading it was left on', () => {
    const state = liveGame({ possessionSeconds: { A: 25, B: 70 } });
    state.log = [{ id: 1, wallClock: '10:00:00', atMs: 1_000, gameSeconds: 0, type: 'gameStart' }];
    const view = mount(state);
    fireEvent.click(toggle() as HTMLElement);
    expect(screen.getByText('Point clock')).toBeInTheDocument();

    view.unmount();
    mount(state);
    expect(screen.getByText('Point clock')).toBeInTheDocument();
  });

  it('leaves the pull clock alone between points', () => {
    mount(
      liveGame({
        status: 'awaitingPull',
        possessionTeam: null,
        secondary: { kind: 'pull', seconds: 12, total: 75 },
      }),
    );

    expect(screen.getByText('Pull timer')).toBeInTheDocument();
    expect(screen.getByText('00:12')).toBeInTheDocument();
    expect(toggle()).toBeNull();
  });

  it('leaves a running timeout alone', () => {
    mount(
      liveGame({
        status: 'timeout',
        secondary: { kind: 'timeout', seconds: 45, total: 75, afterPull: true },
        possessionSeconds: { A: 25, B: 70 },
      }),
    );

    expect(screen.getByText('Timeout')).toBeInTheDocument();
    expect(screen.getByText('00:45')).toBeInTheDocument();
    expect(toggle()).toBeNull();
  });

  it('gives the box up to an open call, which is what the volunteer has to clear', () => {
    mount(
      liveGame({
        pendingCall: { kind: 'foul', team: 'A', elapsedSeconds: 27 },
        possessionSeconds: { A: 25, B: 70 },
      }),
    );

    expect(screen.getByText('Foul')).toBeInTheDocument();
    expect(screen.getByText('00:27')).toBeInTheDocument();
    expect(screen.queryByText('01:10')).toBeNull();
    expect(toggle()).toBeNull();
  });

  it('says nothing before the first pull of the game', () => {
    mount(liveGame({ status: 'notStarted', possessionTeam: null, pointStartSeconds: null }));

    expect(screen.getByText('Pull timer')).toBeInTheDocument();
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });
});
