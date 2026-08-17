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
  it('defaults to No statistics, with no team picker and no Roster section', () => {
    renderConfigScreen();

    expect(fieldSelect('What to track').value).toBe('none');
    expect(screen.queryByText('Team to track')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Expand Roster' })).toBeNull();
  });

  it('offers all four levels, and only Team stats shows a team picker', () => {
    renderConfigScreen();
    const select = fieldSelect('What to track');

    fireEvent.change(select, { target: { value: 'game' } });
    expect(screen.queryByText('Team to track')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Expand Roster' })).toBeNull();

    fireEvent.change(select, { target: { value: 'team' } });
    expect(screen.getByText('Team to track')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand Roster' })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'player' } });
    expect(screen.queryByText('Team to track')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand Roster' })).toBeInTheDocument();
  });

  it('defaults the tracked team to Team 1 and lets it be switched to Team 2', () => {
    renderConfigScreen();
    fireEvent.change(fieldSelect('What to track'), { target: { value: 'team' } });

    expect(fieldSelect('Team to track').value).toBe('A');

    fireEvent.change(fieldSelect('Team to track'), { target: { value: 'B' } });
    expect(fieldSelect('Team to track').value).toBe('B');
  });

  it("only shows the tracked team's roster editor in Team stats mode", () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Foxes' } });
    fireEvent.change(screen.getByLabelText('Team 2'), { target: { value: 'Wolves' } });
    fireEvent.change(fieldSelect('What to track'), { target: { value: 'team' } });
    fireEvent.click(screen.getByRole('button', { name: 'Expand Roster' }));

    expect(within(rosterSection()).getByText('Foxes')).toBeInTheDocument();
    expect(within(rosterSection()).queryByText('Wolves')).toBeNull();

    fireEvent.change(fieldSelect('Team to track'), { target: { value: 'B' } });
    expect(within(rosterSection()).queryByText('Foxes')).toBeNull();
    expect(within(rosterSection()).getByText('Wolves')).toBeInTheDocument();
  });

  it('offers the turnover-player question only where there is a roster, and off by default', () => {
    renderConfigScreen();
    const select = fieldSelect('What to track');
    const checkbox = () => screen.queryByLabelText('Ask who turned it over');

    expect(checkbox()).toBeNull();

    fireEvent.change(select, { target: { value: 'game' } });
    expect(checkbox()).toBeNull();

    fireEvent.change(select, { target: { value: 'player' } });
    expect(checkbox()).not.toBeChecked();

    fireEvent.click(checkbox()!);
    expect(checkbox()).toBeChecked();

    fireEvent.change(select, { target: { value: 'team' } });
    expect(checkbox()).toBeChecked();
  });

  it('picking a template never touches the stats mode or tracked team', () => {
    renderConfigScreen();
    fireEvent.change(fieldSelect('What to track'), { target: { value: 'team' } });
    fireEvent.change(fieldSelect('Team to track'), { target: { value: 'B' } });

    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'predefined:beach' } });

    expect(fieldSelect('What to track').value).toBe('team');
    expect(fieldSelect('Team to track').value).toBe('B');
  });
});
