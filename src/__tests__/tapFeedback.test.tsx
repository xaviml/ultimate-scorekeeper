import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';
import { hold, tap } from './gestures';

const { haptic, whistle } = vi.hoisted(() => ({ haptic: vi.fn(), whistle: vi.fn() }));
vi.mock('../audio/haptics', () => ({ haptic }));
vi.mock('../audio/whistle', () => ({ whistle }));

const KEY = 'ultimate-scorekeeper:game-state';

/** B has the disc, turnovers and passes are counted, and Turn asks nobody anything. */
function liveGame(overrides: Partial<GameState> = {}): GameState {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'live';
  state.possessionTeam = 'B';
  state.offenseTeam = 'B';
  state.pullingTeam = 'A';
  state.passRuns = [{ team: 'B', passes: 0 }];
  state.config = {
    ...state.config,
    statsMode: 'teams',
    trackTurnovers: true,
    trackPasses: true,
  };
  return { ...state, ...overrides };
}

function mount(state: GameState) {
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
const turn = () => screen.getByLabelText('Turnover — hold to undo');
const pass = () => screen.getByLabelText('Completed pass — hold to undo');
const flashOf = (el: HTMLElement) => el.querySelector('[data-flash]')?.getAttribute('data-flash');

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  haptic.mockClear();
  whistle.mockClear();
});

/**
 * Turn and Pass are pressed with the eyes on the disc, so each press answers in
 * the hand — one pulse recorded, two undone, three refused — and a recorded one
 * also lights the button.
 */
describe('Turn and Pass feedback', () => {
  it('pulses once and flashes on every recorded tap', () => {
    mount(liveGame());
    expect(flashOf(pass())).toBeUndefined();

    tap(pass());
    expect(haptic).toHaveBeenLastCalledWith('tap');
    expect(flashOf(pass())).toBe('1');
    // A second tap restarts the flash rather than extending the first one.
    tap(pass());
    expect(flashOf(pass())).toBe('2');

    tap(turn());
    expect(haptic).toHaveBeenLastCalledWith('tap');
    expect(flashOf(turn())).toBe('1');
    expect(stored().pointTurnovers).toBe(1);
  });

  it('pulses twice for a hold that takes the last one back', () => {
    vi.useFakeTimers();
    try {
      mount(liveGame({ passRuns: [{ team: 'B', passes: 3 }] }));
      hold(pass());
      expect(haptic).toHaveBeenLastCalledWith('undo');
      expect(stored().passRuns).toEqual([{ team: 'B', passes: 2 }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('pulses three times and explains itself when the tap is refused', () => {
    mount(liveGame({ status: 'awaitingPull', possessionTeam: null, passRuns: [] }));
    tap(turn());
    expect(haptic).toHaveBeenLastCalledWith('refused');
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    // A refusal is not a recording, so nothing lights up.
    expect(flashOf(turn())).toBeUndefined();
  });

  // Dimmed rather than disabled, so a press that would otherwise do nothing at all
  // — indistinguishable from a tap that missed — still answers.
  it('buzzes the refusal on a dimmed button, and does nothing else', () => {
    mount(liveGame({ pendingCall: { kind: 'foul', team: 'A', elapsedSeconds: 0 } }));
    expect(turn()).toHaveAttribute('aria-disabled', 'true');

    tap(turn());
    expect(haptic).toHaveBeenLastCalledWith('refused');
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(stored().pointTurnovers).toBe(0);
  });

  // The other team having the disc is true for half of every game, so it buzzes
  // without the hint that would otherwise fire on every one of their passes.
  it('buzzes a greyed Pass while the other team has the disc, without a hint', () => {
    const state = liveGame();
    state.config = { ...state.config, trackedTeam: 'A' };
    mount(state);
    expect(pass()).toHaveAttribute('aria-disabled', 'true');

    tap(pass());
    expect(haptic).toHaveBeenLastCalledWith('refused');
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(stored().passRuns).toEqual([{ team: 'B', passes: 0 }]);
  });
});

describe('the settings dialog', () => {
  const openSettings = () => {
    fireEvent.click(screen.getByLabelText('Menu'));
    fireEvent.click(screen.getByText('Settings'));
  };

  it('opens from the game menu with both switches on by default', () => {
    mount(liveGame());
    openSettings();
    expect(screen.getByRole('checkbox', { name: 'Vibration' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Sound' })).toBeChecked();
  });

  it('remembers the switches on the device', () => {
    mount(liveGame());
    openSettings();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Vibration' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sound' }));
    expect(localStorage.getItem('ultimate-scorekeeper:vibration-enabled')).toBe('false');
    expect(localStorage.getItem('ultimate-scorekeeper:sound-enabled')).toBe('false');
  });

  it('answers switching vibration on with a pulse, so the phone can be checked', () => {
    localStorage.setItem('ultimate-scorekeeper:vibration-enabled', 'false');
    mount(liveGame());
    openSettings();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Vibration' }));
    expect(haptic).toHaveBeenCalledWith('tap');
  });
});

describe('sound off', () => {
  const T = new Date('2024-06-01T10:00:00').getTime();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T);
  });
  afterEach(() => vi.useRealTimers());

  /** Waiting for the pull, one second short of the 45 s whistle. */
  const nearlyLate = (): GameState => ({
    ...liveGame(),
    status: 'awaitingPull',
    possessionTeam: null,
    passRuns: [],
    secondary: { kind: 'pull', seconds: 44, total: null },
  });

  it('blows the pull whistle with sound on', () => {
    mount(nearlyLate());
    act(() => vi.advanceTimersByTime(2_000));
    expect(whistle).toHaveBeenCalledWith(1);
  });

  it('keeps the whistle quiet but still shows its hand signal', () => {
    localStorage.setItem('ultimate-scorekeeper:sound-enabled', 'false');
    mount(nearlyLate());
    act(() => vi.advanceTimersByTime(2_000));
    expect(whistle).not.toHaveBeenCalled();
    expect(screen.getByRole('img', { name: /whistle/i })).toBeInTheDocument();
  });
});
