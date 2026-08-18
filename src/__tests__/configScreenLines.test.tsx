import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import ConfigScreen from '../components/ConfigScreen';

function renderConfigScreen() {
  return render(
    <I18nProvider>
      <GameProvider>
        <ConfigScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

/** Labels sit above their input as plain sibling text, not an associated <label for>. */
function fieldSelect(labelText: string): HTMLSelectElement {
  const label = screen.getByText(labelText);
  return label.parentElement!.querySelector('select') as HTMLSelectElement;
}
function fieldInput(labelText: string): HTMLInputElement {
  const label = screen.getByText(labelText);
  return label.parentElement!.querySelector('input') as HTMLInputElement;
}

/** Line tracking lives inside the Statistics section, below the turnover-players option. */
const statsSection = () => screen.getByText('Statistics').closest('section') as HTMLElement;
const rosterSection = () => screen.getByText('Roster').closest('section') as HTMLElement;

/** Team stats mode with a tracked team is the only mode line tracking exists in. */
function intoTeamMode() {
  renderConfigScreen();
  fireEvent.change(fieldSelect('What to track'), { target: { value: 'team' } });
}

/** Ticks the line-tracking checkbox in the Statistics section. */
function enableLines() {
  fireEvent.click(within(statsSection()).getByLabelText('Track who plays each point'));
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('the line-tracking option', () => {
  const lineToggle = () => within(statsSection()).queryByLabelText('Track who plays each point');

  // Line tracking follows the single roster Team mode watches, so Player mode —
  // which has two — never offers it. This is the config-screen half of the same
  // rule lineTrackingEnabled enforces at runtime.
  it('is offered only in Team stats mode', () => {
    renderConfigScreen();
    expect(lineToggle()).toBeNull();

    fireEvent.change(fieldSelect('What to track'), { target: { value: 'game' } });
    expect(lineToggle()).toBeNull();

    fireEvent.change(fieldSelect('What to track'), { target: { value: 'player' } });
    expect(lineToggle()).toBeNull();

    fireEvent.change(fieldSelect('What to track'), { target: { value: 'team' } });
    expect(lineToggle()).not.toBeNull();
  });

  // It is another thing this game tracks, so it belongs with the rest of them rather
  // than in a section of its own.
  it('sits in the Statistics section, under the turnover-players option', () => {
    intoTeamMode();
    expect(screen.queryByText('Lines')).toBeNull();
    const labels = [...statsSection().querySelectorAll('span.text-sm')].map((s) => s.textContent);
    expect(labels).toEqual(['Ask who turned it over', 'Track who plays each point']);
  });

  it('is off to begin with, and asks nothing else until it is on', () => {
    intoTeamMode();
    expect((lineToggle() as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByText('Players on the field')).toBeNull();
  });

  // No team choice of its own: it is about whichever team the Statistics section is
  // already tracking, so a second control could only contradict it.
  it('carries no team selector', () => {
    intoTeamMode();
    enableLines();
    const selects = [...statsSection().querySelectorAll('select')];
    // What to track, Team to track, and the gender check — nothing else.
    expect(selects).toHaveLength(3);
  });

  it('asks for the line size, defaulting to grass sevens', () => {
    intoTeamMode();
    enableLines();
    expect(fieldInput('Players on the field').value).toBe('7');
    fireEvent.change(fieldInput('Players on the field'), { target: { value: '5' } });
    expect(fieldInput('Players on the field').value).toBe('5');
  });
});

describe('the gender check', () => {
  // Grass's own template (mixed, Rule A) is the fresh-start default, so the ratio
  // is there to follow from the moment lines are turned on.
  it('defaults to following the game ratio under mixed Rule A', () => {
    intoTeamMode();
    enableLines();
    expect(fieldSelect('Check the gender split').value).toBe('gameRatio');
    // No fixed-split field until the fixed option is picked.
    expect(screen.queryByText('FMP on the field')).toBeNull();
  });

  // Outside mixed Rule A there is no ratio to default to.
  it('defaults to not checking at all outside mixed Rule A', () => {
    intoTeamMode();
    fireEvent.change(fieldSelect('Division'), { target: { value: 'open' } });
    enableLines();
    expect(fieldSelect('Check the gender split').value).toBe('none');
  });

  it('asks for a fixed split when one is chosen, and spells it out', () => {
    intoTeamMode();
    enableLines();
    fireEvent.change(fieldSelect('Check the gender split'), { target: { value: 'fixed' } });
    fireEvent.change(fieldInput('FMP on the field'), { target: { value: '1' } });
    expect(within(statsSection()).getByText('1 FMP / 6 MMP')).toBeTruthy();
  });

  // Rule B leaves the ratio to the end zone and never computes one, so there would be
  // nothing for a line to be checked against.
  it('offers to follow the game ratio only under mixed Rule A', () => {
    intoTeamMode();
    enableLines();
    const options = () =>
      Array.from(fieldSelect('Check the gender split').options).map((o) => o.value);
    expect(options()).toContain('gameRatio');

    fireEvent.change(fieldSelect('Mixed gender-ratio rule'), { target: { value: 'B' } });
    expect(options()).not.toContain('gameRatio');

    fireEvent.change(fieldSelect('Division'), { target: { value: 'open' } });
    expect(options()).not.toContain('gameRatio');
  });
});

describe('the roster markings', () => {
  function addPlayer(name: string) {
    const roster = rosterSection();
    fireEvent.change(within(roster).getByPlaceholderText('Name'), { target: { value: name } });
    fireEvent.click(within(roster).getByRole('button', { name: 'Add' }));
  }

  // A marking is a fact about the player, not a setting of this game: it is recorded
  // whether or not anything here reads it, and rides the saved team into the next game
  // where something might.
  it('offers the MMP/FMP toggle whether or not line tracking is on', () => {
    intoTeamMode();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    addPlayer('Alex');
    expect(screen.getByRole('button', { name: 'Alex — gender: Not set' })).toBeTruthy();

    enableLines();
    expect(screen.getByRole('button', { name: 'Alex — gender: Not set' })).toBeTruthy();
  });

  it('offers it for both rosters in Player mode, where lines never apply', () => {
    renderConfigScreen();
    fireEvent.change(fieldSelect('What to track'), { target: { value: 'player' } });
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    const roster = rosterSection();
    const nameFields = within(roster).getAllByPlaceholderText('Name');
    fireEvent.change(nameFields[0], { target: { value: 'Alex' } });
    fireEvent.change(nameFields[1], { target: { value: 'Jo' } });
    within(roster)
      .getAllByRole('button', { name: 'Add' })
      .forEach((b) => fireEvent.click(b));

    expect(screen.getByRole('button', { name: 'Alex — gender: Not set' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Jo — gender: Not set' })).toBeTruthy();
  });

  // unset → MMP → FMP → unset. Unset is a real answer: most rosters arrive unmarked.
  it('cycles a player through both markings and back', () => {
    intoTeamMode();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    addPlayer('Alex');

    fireEvent.click(screen.getByRole('button', { name: 'Alex — gender: Not set' }));
    expect(screen.getByRole('button', { name: 'Alex — gender: MMP' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Alex — gender: MMP' }));
    expect(screen.getByRole('button', { name: 'Alex — gender: FMP' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Alex — gender: FMP' }));
    expect(screen.getByRole('button', { name: 'Alex — gender: Not set' })).toBeTruthy();
  });

  // A marking is a roster edit like any other, so it rides setPlayers into the saved
  // team — which is the point: a squad's markings are typed once per tournament.
  it('persists a marking to the saved team', () => {
    localStorage.setItem(
      'ultimate-scorekeeper:saved-teams',
      JSON.stringify([{ name: 'Ravens', color: '#111111', players: [] }]),
    );
    intoTeamMode();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Ravens' } });
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    addPlayer('Alex');
    fireEvent.click(screen.getByRole('button', { name: 'Alex — gender: Not set' }));

    const stored = JSON.parse(localStorage.getItem('ultimate-scorekeeper:saved-teams')!);
    expect(stored[0].players[0]).toMatchObject({ name: 'Alex', gender: 'male' });
  });
});

describe('predefined lines on the config screen', () => {
  function saveTeamWithLine() {
    localStorage.setItem(
      'ultimate-scorekeeper:saved-teams',
      JSON.stringify([
        {
          name: 'Ravens',
          color: '#111111',
          players: [
            // Alex is marked and Jo is not, so the counters have both a marking to
            // count and an unmarked player to report.
            { id: 'p1', number: '7', name: 'Alex', gender: 'female' },
            { id: 'p2', number: '9', name: 'Jo' },
          ],
          lines: [{ id: 'l1', name: 'O1', playerKeys: ['7|alex'] }],
        },
      ]),
    );
  }

  /** Loads Ravens through the combobox, which is what brings its lines with it. */
  function loadRavens() {
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Rav' } });
    fireEvent.focus(screen.getByLabelText('Team 1'));
    fireEvent.click(screen.getByRole('button', { name: /^Ravens$/ }));
  }

  const storedLines = () =>
    JSON.parse(localStorage.getItem('ultimate-scorekeeper:saved-teams')!)[0].lines;

  /** The open line dialog — the roster editor behind it lists the same names. */
  const dialog = () => document.querySelector('.fixed') as HTMLElement;

  // Lines are made of the roster, and the two are filled in at the same moment.
  it('lives in the Roster section, not with the stats settings', () => {
    saveTeamWithLine();
    intoTeamMode();
    enableLines();
    loadRavens();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    expect(within(rosterSection()).getByRole('button', { name: 'Edit O1' })).toBeTruthy();
    expect(within(statsSection()).queryByRole('button', { name: 'Edit O1' })).toBeNull();
  });

  it("loads a saved team's lines along with its roster", () => {
    saveTeamWithLine();
    intoTeamMode();
    enableLines();
    loadRavens();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    // One of the two players, named and listed.
    expect(screen.getByRole('button', { name: 'Edit O1' }).textContent).toContain('#7 Alex');
  });

  it('creates a line and writes it to the saved team', () => {
    saveTeamWithLine();
    intoTeamMode();
    enableLines();
    loadRavens();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));

    fireEvent.click(screen.getByRole('button', { name: 'Add a line' }));
    fireEvent.change(screen.getByLabelText('Name this line'), { target: { value: 'D1' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: /#9 Jo/ }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save' }));

    expect(storedLines()).toEqual([
      { id: 'l1', name: 'O1', playerKeys: ['7|alex'] },
      { id: expect.any(String), name: 'D1', playerKeys: ['9|jo'] },
    ]);
  });

  it('edits an existing line in place', () => {
    saveTeamWithLine();
    intoTeamMode();
    enableLines();
    loadRavens();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));

    fireEvent.click(screen.getByRole('button', { name: 'Edit O1' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: /#9 Jo/ }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save' }));

    // Same line, same id — edited rather than added alongside.
    expect(storedLines()).toEqual([{ id: 'l1', name: 'O1', playerKeys: ['7|alex', '9|jo'] }]);
  });

  // A name is how a line is picked again, so that one is a real block — unlike the
  // composition, which only ever warns.
  it('refuses a line with no name, or a name already taken', () => {
    saveTeamWithLine();
    intoTeamMode();
    enableLines();
    loadRavens();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add a line' }));

    expect(
      (within(dialog()).getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText('Name this line'), { target: { value: 'o1' } });
    expect(
      (within(dialog()).getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByText(/already a line with that name/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Name this line'), { target: { value: 'D1' } });
    expect(
      (within(dialog()).getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('deletes one from the store, leaving the roster alone', () => {
    saveTeamWithLine();
    intoTeamMode();
    enableLines();
    loadRavens();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete O1' }));

    expect(storedLines()).toEqual([]);
    const stored = JSON.parse(localStorage.getItem('ultimate-scorekeeper:saved-teams')!);
    expect(stored[0].players).toHaveLength(2);
  });

  // A predefined line is a template — a pool a point's line is drawn out of during
  // the game — so it is measured against nothing at all, size included. A one-player
  // line under a fixed 4/3 split would fail every check there is.
  it('checks nothing at all, whatever the game asks of a line', () => {
    saveTeamWithLine();
    intoTeamMode();
    enableLines();
    fireEvent.change(fieldSelect('Check the gender split'), { target: { value: 'fixed' } });
    loadRavens();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit O1' }));

    expect(document.querySelector('[data-line-issues~="size"]')).toBeNull();
    expect(document.querySelector('[data-line-issues~="ratio"]')).toBeNull();
    // And Save is live off the name alone — nothing arms a confirmation here.
    expect(
      (within(dialog()).getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  // The predefined-line editor is the other place a line is built against a split,
  // so it lays the roster out the same way.
  it('groups the roster by marking in the predefined-line editor', () => {
    saveTeamWithLine();
    intoTeamMode();
    enableLines();
    loadRavens();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add a line' }));

    const labels = [...dialog().querySelectorAll('p')]
      .map((el) => el.textContent ?? '')
      .filter((txt) => ['FMP', 'MMP', 'No marking'].includes(txt));
    // Alex is marked FMP by the fixture and Jo is not, so there is no MMP group.
    expect(labels).toEqual(['FMP', 'No marking']);
  });

  // What the counters do instead is count: the split of the pool is what a coach is
  // balancing while they build it, whatever `genderCheck` says.
  it('counts the MMP and FMP in the line as it is picked', () => {
    saveTeamWithLine();
    intoTeamMode();
    enableLines();
    // Deliberately the setting that switches every check off — the counter is
    // arithmetic about the roster, not a rule about the line.
    fireEvent.change(fieldSelect('Check the gender split'), { target: { value: 'none' } });
    loadRavens();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit O1' }));

    const counters = () =>
      (document.querySelector('[data-line-issues]') as HTMLElement).textContent ?? '';
    // Alex is on the line and marked FMP by the fixture; Jo is unmarked.
    expect(counters()).toContain('1 in the line');
    expect(counters()).toMatch(/FMP\s*1/);
    expect(counters()).toMatch(/MMP\s*0/);

    fireEvent.click(within(dialog()).getByRole('button', { name: /#9 Jo/ }));
    expect(counters()).toContain('2 in the line');
    expect(counters()).toContain('1 unmarked');
  });

  it('says what lines are for when there are none', () => {
    intoTeamMode();
    enableLines();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    expect(within(rosterSection()).getByText(/Name the lines this team plays/i)).toBeTruthy();
  });

  // The tracked team is which roster the lines belong to, so moving it has to swap
  // them — otherwise Ravens' lines would follow the pointer onto Foxes.
  it('swaps the listed lines when the tracked team moves', () => {
    saveTeamWithLine();
    intoTeamMode();
    enableLines();
    loadRavens();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));
    expect(screen.getByRole('button', { name: 'Edit O1' })).toBeTruthy();

    fireEvent.change(fieldSelect('Team to track'), { target: { value: 'B' } });
    expect(screen.queryByRole('button', { name: 'Edit O1' })).toBeNull();
  });
});
