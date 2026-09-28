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

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

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
    expect(within(panel).queryByText('time (seconds)')).toBeNull();
  });

  it('says a game has no half-time rather than listing settings that do nothing', () => {
    const panel = openSetup(game((s) => (s.config.halfTimeEnabled = false)));
    expect(within(panel).getByText('No half-time in this game.')).toBeInTheDocument();
    expect(within(panel).queryByText('TIME (Minutes)')).toBeNull();
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

  it('notes when timeouts are not allowed in the last 5 minutes', () => {
    const panel = openSetup(
      game((s) => (s.config.timeouts = { ...s.config.timeouts, disallowLastFiveMinutes: true })),
    );
    expect(
      within(panel).getByText('No timeouts in the last 5 minutes of the game.'),
    ).toBeInTheDocument();
  });

  it('calls a per-half allowance per game when there is no half-time', () => {
    const panel = openSetup(
      game((s) => {
        s.config.halfTimeEnabled = false;
        s.config.timeouts = { ...s.config.timeouts, enabled: true, perHalf: 2, perGame: null };
      }),
    );
    expect(valueFor(panel, 'Per team')).toBe('2');
    expect(valueFor(panel, 'Allowance')).toBe('Per game');
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

/**
 * The top block — field, team names and colours — is the one part of the dialog
 * that can be changed, as a draft that only lands on Save.
 */
describe('correcting the field and the teams from the game setup dialog', () => {
  const SAVED = 'ultimate-scorekeeper:saved-teams';
  const savedTeams = () =>
    JSON.parse(localStorage.getItem(SAVED) ?? '[]') as { name: string; players: unknown[] }[];
  const storedGame = () =>
    JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!) as GameState;
  const save = () => screen.queryByRole('button', { name: 'Save changes' });
  const nameBox = (panel: HTMLElement, team: 'Team 1' | 'Team 2') =>
    within(panel).getByLabelText(team) as HTMLInputElement;

  it('offers Save only once something has changed, and applies it to the game', () => {
    const panel = openSetup(game());
    expect(save()).toBeNull();

    fireEvent.change(within(panel).getByLabelText('Field'), { target: { value: '7' } });
    fireEvent.change(nameBox(panel, 'Team 1'), { target: { value: 'Ravens United' } });
    fireEvent.click(save()!);

    expect(storedGame().config.fieldNumber).toBe('7');
    expect(storedGame().config.teams.A.name).toBe('Ravens United');
    expect(screen.getByText('Field 7')).toBeInTheDocument();
    // Saved means nothing is pending any more.
    expect(save()).toBeNull();
  });

  it('drops the draft when the dialog is closed without saving', () => {
    let panel = openSetup(game());
    fireEvent.change(nameBox(panel, 'Team 1'), { target: { value: 'Owls' } });
    fireEvent.click(within(panel).getByLabelText('Close'));

    expect(storedGame().config.teams.A.name).toBe('Ravens');
    fireEvent.click(screen.getByLabelText('Menu'));
    fireEvent.click(screen.getByText('Game setup'));
    panel = screen.getByRole('heading', { name: 'Game setup' }).parentElement!.parentElement!;
    expect(nameBox(panel, 'Team 1').value).toBe('Ravens');
  });

  it('refuses an empty or duplicate name and says why', () => {
    const panel = openSetup(game());
    fireEvent.change(nameBox(panel, 'Team 1'), { target: { value: 'foxes' } });
    expect(save()).toBeDisabled();
    expect(screen.getByText('Team names must be different')).toBeInTheDocument();

    fireEvent.change(nameBox(panel, 'Team 1'), { target: { value: '  ' } });
    expect(screen.getByText('Both teams need a name')).toBeInTheDocument();
  });

  it('moves the saved team to its new name rather than leaving the old one behind', () => {
    const panel = openSetup(game());
    expect(savedTeams().map((t) => t.name)).toContain('Ravens');

    fireEvent.change(nameBox(panel, 'Team 1'), { target: { value: 'Ravenz' } });
    fireEvent.click(save()!);

    const names = savedTeams().map((t) => t.name);
    expect(names).toContain('Ravenz');
    expect(names).not.toContain('Ravens');
  });

  it('keeps the old saved team when the new name is added as a new team', () => {
    const panel = openSetup(game());
    fireEvent.change(nameBox(panel, 'Team 1'), { target: { value: 'Ravens B' } });
    fireEvent.click(within(panel).getByText('Add "Ravens B" as a new team'));
    expect(within(panel).getByText('"Ravens B" will be saved as a new team.')).toBeInTheDocument();
    fireEvent.click(save()!);

    const names = savedTeams().map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['Ravens', 'Ravens B']));
  });

  it("loads a picked saved team's roster, and offers no way to delete saved teams", () => {
    localStorage.setItem(
      SAVED,
      JSON.stringify([
        { name: 'Owls', color: '#123456', players: [{ id: 'o1', number: '5', name: 'Hoot' }] },
      ]),
    );
    const panel = openSetup(
      game((s) => {
        s.config.players.A = [{ id: 'a1', number: '7', name: 'Alex' }];
      }),
    );

    fireEvent.focus(nameBox(panel, 'Team 1'));
    fireEvent.change(nameBox(panel, 'Team 1'), { target: { value: 'Ow' } });
    expect(within(panel).queryByLabelText(/Delete/i)).toBeNull();
    fireEvent.click(within(panel).getByText('Owls'));
    expect(panel.querySelector('[data-team-load="A"]')).not.toBeNull();
    fireEvent.click(save()!);

    const s = storedGame();
    expect(s.config.teams.A).toEqual({ name: 'Owls', color: '#123456' });
    expect(s.config.players.A).toMatchObject([{ number: '5', name: 'Hoot' }]);
    expect(s.removedPlayers.A).toEqual([{ id: 'a1', number: '7', name: 'Alex' }]);
    // The team it replaced stays stored as it was.
    expect(savedTeams().map((t) => t.name)).toEqual(expect.arrayContaining(['Ravens', 'Owls']));
  });
});
