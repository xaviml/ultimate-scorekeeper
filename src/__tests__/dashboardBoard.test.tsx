import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';

/**
 * The score board itself: the header, the chips on the seam and the two panels.
 */
function game(overrides: Partial<GameState> = {}, trackTurnovers = true): GameState {
  const state = createInitialState();
  state.phase = 'game';
  state.status = 'live';
  state.possessionTeam = 'B';
  state.offenseTeam = 'B';
  state.pullingTeam = 'A';
  state.config = { ...state.config, statsMode: 'teams', trackTurnovers };
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

const holders = () =>
  Array.from(document.querySelectorAll('[data-holding]')).map(
    (dot) => dot.closest('button')?.getAttribute('aria-label') ?? '',
  );

beforeEach(() => sessionStorage.clear());

describe('the score board', () => {
  it('shows no target in the header', () => {
    mount(game());
    expect(document.querySelector('header')).not.toHaveTextContent(/target|game at/i);
  });

  it('puts the menu at the right-hand end of the header', () => {
    mount(game());
    const header = document.querySelector('header') as HTMLElement;
    expect(header.lastElementChild).toHaveAttribute('aria-label', 'Menu');
  });

  it('marks the team holding the disc beside its name', () => {
    const state = game();
    mount(state);
    expect(holders()).toEqual([`${state.config.teams.B.name}: 0`]);
  });

  it('marks nobody between points', () => {
    mount(game({ status: 'awaitingPull', possessionTeam: null }));
    expect(holders()).toEqual([]);
  });

  it('marks nobody when the game records no turnovers', () => {
    mount(game({}, false));
    expect(holders()).toEqual([]);
  });

  it('keeps the team colour at full strength between points and dims only the number', () => {
    const state = game({ status: 'awaitingPull', possessionTeam: null });
    mount(state);
    const panel = screen.getByLabelText(`${state.config.teams.A.name}: 0`);
    expect(panel.className.split(/\s+/)).not.toContain('opacity-70');
    expect(panel.lastElementChild?.className).toContain('opacity-75');
  });

  // Messages run from one line to five depending on the moment and the language, and
  // the bar sits under the score panels: a bar that grew with them pushed the whole
  // board up mid-game. It is one height, and long messages shrink to fit instead.
  it('keeps the message bar at one fixed height, whatever it says', () => {
    mount(game());
    const bar = document.querySelector('[data-assistance-bar]') as HTMLElement;
    expect(bar.className.split(/\s+/)).toContain('h-[82px]');
    expect(bar.className).not.toMatch(/min-h-/);
  });
});
