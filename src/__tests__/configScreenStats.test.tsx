import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import ConfigScreen from '../components/ConfigScreen';

/** The Roster section, scoped so a team name doesn't collide with the same text in the combobox above it. */
function rosterSection(): HTMLElement {
  return screen.getByText('Roster').closest('section') as HTMLElement;
}

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

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('config screen statistics section', () => {
  it('defaults to Score only, with no scope picker and no Roster section', () => {
    renderConfigScreen();

    expect(fieldSelect('Track').value).toBe('none');
    expect(screen.queryByText('Players of')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Expand Roster' })).toBeNull();
  });

  // The detail axis answers "who gets named", and only naming players needs a scope.
  it('offers three levels, and only player detail shows the scope picker', () => {
    renderConfigScreen();
    const select = fieldSelect('Track');

    fireEvent.change(select, { target: { value: 'teams' } });
    expect(screen.queryByText('Players of')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Expand Roster' })).toBeNull();

    fireEvent.change(select, { target: { value: 'players' } });
    expect(screen.getByText('Players of')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand Roster' })).toBeInTheDocument();
  });

  // Both teams is the wider landing place, and is what `trackedTeam: null` carries
  // at player detail.
  it('starts at both teams and narrows to either one', () => {
    renderConfigScreen();
    fireEvent.change(fieldSelect('Track'), { target: { value: 'players' } });

    expect(fieldSelect('Players of').value).toBe('both');

    fireEvent.change(fieldSelect('Players of'), { target: { value: 'B' } });
    expect(fieldSelect('Players of').value).toBe('B');
  });

  it('lists both rosters for both teams, and only the followed one when narrowed', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Foxes' } });
    fireEvent.change(screen.getByLabelText('Team 2'), { target: { value: 'Wolves' } });
    fireEvent.change(fieldSelect('Track'), { target: { value: 'players' } });
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));

    expect(within(rosterSection()).getByText('Foxes')).toBeInTheDocument();
    expect(within(rosterSection()).getByText('Wolves')).toBeInTheDocument();

    fireEvent.change(fieldSelect('Players of'), { target: { value: 'A' } });
    expect(within(rosterSection()).getByText('Foxes')).toBeInTheDocument();
    expect(within(rosterSection()).queryByText('Wolves')).toBeNull();

    fireEvent.change(fieldSelect('Players of'), { target: { value: 'B' } });
    expect(within(rosterSection()).queryByText('Foxes')).toBeNull();
    expect(within(rosterSection()).getByText('Wolves')).toBeInTheDocument();
  });

  // The Turn button is opt-in: the tournament scorekeeper tracking goals and assists
  // has no use for the most frequent button on the action row.
  it('offers turnovers wherever anything is tracked, off by default', () => {
    renderConfigScreen();
    const select = fieldSelect('Track');
    const turnovers = () => screen.queryByLabelText('Turnovers');

    expect(turnovers()).toBeNull();

    fireEvent.change(select, { target: { value: 'teams' } });
    expect(turnovers()).not.toBeChecked();

    fireEvent.click(turnovers()!);
    expect(turnovers()).toBeChecked();

    // The flag survives a change of detail — it is visible on the same screen, so
    // rewriting it underneath the user would be the surprising behaviour.
    fireEvent.change(select, { target: { value: 'players' } });
    expect(turnovers()).toBeChecked();
  });

  // Nested under Turnovers: without the tap there is nothing to ask about, and
  // without a roster there is nobody to name.
  it('asks who turned it over only with turnovers on and a roster to ask against', () => {
    renderConfigScreen();
    const select = fieldSelect('Track');
    const askWho = () => screen.queryByLabelText('Ask who turned it over');

    fireEvent.change(select, { target: { value: 'teams' } });
    fireEvent.click(screen.getByLabelText('Turnovers'));
    expect(askWho()).toBeNull();

    fireEvent.change(select, { target: { value: 'players' } });
    expect(askWho()).not.toBeChecked();

    fireEvent.click(askWho()!);
    expect(askWho()).toBeChecked();

    // Turning turnovers back off takes the question with it.
    fireEvent.click(screen.getByLabelText('Turnovers'));
    expect(askWho()).toBeNull();
  });

  // The reason to have typed a roster, so it is on wherever there is one.
  it('asks who scored wherever there is a roster, on by default', () => {
    renderConfigScreen();
    const select = fieldSelect('Track');
    const askScorer = () => screen.queryByLabelText('Ask who scored');

    expect(askScorer()).toBeNull();

    fireEvent.change(select, { target: { value: 'teams' } });
    expect(askScorer()).toBeNull();

    fireEvent.change(select, { target: { value: 'players' } });
    expect(askScorer()).toBeChecked();

    fireEvent.click(askScorer()!);
    expect(askScorer()).not.toBeChecked();
  });

  it('picking a template never touches the stats settings', () => {
    renderConfigScreen();
    fireEvent.change(fieldSelect('Track'), { target: { value: 'players' } });
    fireEvent.change(fieldSelect('Players of'), { target: { value: 'B' } });
    fireEvent.click(screen.getByLabelText('Turnovers'));

    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'predefined:beach' } });

    expect(fieldSelect('Track').value).toBe('players');
    expect(fieldSelect('Players of').value).toBe('B');
    expect(screen.getByLabelText('Turnovers')).toBeChecked();
  });
});
