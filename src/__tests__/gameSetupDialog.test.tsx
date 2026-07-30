import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import GameScreen from '../components/GameScreen';
import type { GameState } from '../state/types';

/**
 * The read-only setup dialog behind the header menu. It exists for the moment a
 * captain asks the scorekeeper something the dashboard doesn't answer, so what
 * matters here is that each section says the right thing for the game actually
 * configured — including the sections with no value to show.
 */
function game(mutate: (s: GameState) => void = () => {}): GameState {
  // Cloned because createInitialState hands back the module-level defaultConfig by
  // reference — mutating it here would carry into the next test, and this suite is
  // entirely about which config was in force.
  const state = structuredClone(createInitialState());
  state.phase = 'game';
  state.status = 'live';
  state.config.teams.A.name = 'Ravens';
  state.config.teams.B.name = 'Foxes';
  mutate(state);
  return state;
}

/** Opens the dialog and returns its Modal panel, so queries can't hit the dashboard behind it. */
function openSetup(state: GameState) {
  sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));
  render(
    <I18nProvider>
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </I18nProvider>,
  );
  fireEvent.click(screen.getByLabelText('Menu'));
  fireEvent.click(screen.getByText('Game setup'));
  return screen.getByRole('heading', { name: 'Game setup' }).parentElement!
    .parentElement as HTMLElement;
}

/** The value rendered beside a label, which is how every row in the dialog reads. */
function valueFor(panel: HTMLElement, label: string) {
  return within(panel).getByText(label).nextElementSibling?.textContent;
}

beforeEach(() => sessionStorage.clear());

describe('the game setup dialog', () => {
  it('names the teams from the coin toss, which nothing else in the app shows', () => {
    const panel = openSetup(
      game((s) => {
        s.config.startingOffense = 'B';
        s.config.startingSide = 'A';
      }),
    );

    expect(valueFor(panel, 'Team receiving the first pull (offense)')).toBe('Foxes');
    expect(valueFor(panel, 'Team starting on the left side')).toBe('Ravens');
    // The ends swap every point, so the rows above are about the opening pull only.
    expect(within(panel).getByText(/swap ends after every point/i)).toBeInTheDocument();
  });

  it('shows the starting ratio under Rule A', () => {
    const panel = openSetup(
      game((s) => {
        s.config.division = 'mixed';
        s.config.mixedRule = 'A';
        s.config.startingRatio = 'female';
      }),
    );

    expect(valueFor(panel, 'Starting gender ratio')).toBe('Women');
    expect(within(panel).getByText(/Rule A/)).toBeInTheDocument();
  });

  // Rule B has no starting ratio at all — state.ratio stays null all game and the
  // dashboard chip never appears — so the rule itself has to be the answer.
  it('explains the rule instead of a ratio under Rule B', () => {
    const panel = openSetup(
      game((s) => {
        s.config.division = 'mixed';
        s.config.mixedRule = 'B';
      }),
    );

    expect(within(panel).queryByText('Starting gender ratio')).toBeNull();
    expect(within(panel).getByText(/Rule B/)).toBeInTheDocument();
  });

  it('leaves out the ratio section entirely when the game is not mixed', () => {
    const panel = openSetup(game((s) => (s.config.division = 'open')));
    expect(within(panel).queryByText('Mixed gender-ratio rule')).toBeNull();
    expect(within(panel).getByText('Open')).toBeInTheDocument();
  });

  it('says a game has no timeouts rather than showing an empty budget', () => {
    const panel = openSetup(
      game((s) => (s.config.timeouts = { ...s.config.timeouts, enabled: false })),
    );
    expect(within(panel).getByText('No timeouts in this game.')).toBeInTheDocument();
    expect(within(panel).queryByText('Timeout duration (seconds)')).toBeNull();
  });

  it('spells out the timeout budget when there is one', () => {
    const panel = openSetup(
      game(
        (s) =>
          (s.config.timeouts = {
            ...s.config.timeouts,
            enabled: true,
            perHalf: null,
            perGame: 3,
            durationSeconds: 70,
          }),
      ),
    );

    expect(valueFor(panel, 'Per team')).toBe('3');
    expect(valueFor(panel, 'Allowance')).toBe('Per game');
    expect(valueFor(panel, 'Duration')).toBe("1' 10''");
  });

  // Every break is stored in seconds because that is what the timers count, but
  // past a minute the reader would otherwise have to do the conversion themselves.
  it('writes breaks as durations, not as a count of seconds', () => {
    const panel = openSetup(
      game((s) => {
        s.config.halfTimeBreakSeconds = 45;
        s.config.waterBreaks = { enabled: true, atScores: [4], durationSeconds: 180 };
      }),
    );

    expect(valueFor(panel, 'Break')).toBe("45''");
    // Exactly three minutes: no dangling zero seconds.
    expect(within(panel).getAllByText('Duration')[1].nextElementSibling?.textContent).toBe("3'");
  });

  it('shows the water break scores when automatic breaks are configured', () => {
    const panel = openSetup(
      game(
        (s) => (s.config.waterBreaks = { enabled: true, atScores: [4, 12], durationSeconds: 180 }),
      ),
    );
    expect(valueFor(panel, 'When the first team reaches')).toBe('4, 12');
  });

  it('leaves the water break section out when there are no automatic breaks', () => {
    const panel = openSetup(game());
    expect(within(panel).queryByText('When the first team reaches')).toBeNull();
  });

  // The header chip already shows the target in force; without this the dialog
  // would quietly contradict it for the rest of the game.
  it('flags a cap that has already moved the target', () => {
    const panel = openSetup(
      game((s) => {
        s.config.targetScore = 15;
        s.cappedTarget = 11;
      }),
    );

    // "Score" labels both the game target and the half target — the section
    // headings are what tell them apart, here as on the setup form.
    expect(within(panel).getAllByText('Score')[0].nextElementSibling?.textContent).toBe('15');
    expect(within(panel).getByText(/the game is now to 11/)).toBeInTheDocument();
  });

  it('says nothing about caps when none has fired', () => {
    const panel = openSetup(game());
    expect(within(panel).queryByText(/the game is now to/)).toBeNull();
  });

  it('shows a scheduled kickoff alongside when play actually began', () => {
    const panel = openSetup(
      game((s) => {
        s.config.startingTime = { enabled: true, time: '17:00' };
        s.log = [{ id: 1, wallClock: '17:06:12', atMs: 0, gameSeconds: 0, type: 'gameStart' }];
      }),
    );

    expect(valueFor(panel, 'Scheduled')).toBe('17:00');
    expect(valueFor(panel, 'Started')).toBe('17:06:12');
  });
});
