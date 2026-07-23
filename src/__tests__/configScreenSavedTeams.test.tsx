import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { loadSavedTeams } from '../state/rosterStorage';
import type { SavedTeam } from '../state/types';
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

const RAVENS: SavedTeam = {
  name: 'Ravens',
  color: '#ff0000',
  players: [{ id: 'p1', number: '7', name: 'Ana' }],
};

function seedSavedTeams(teams: SavedTeam[]) {
  localStorage.setItem('ultimate-scorekeeper:saved-teams', JSON.stringify(teams));
}

/**
 * Picks the saved team out of the combobox dropdown for team 1. The typed text
 * filters the list, so it is cleared first — as a user switching teams would.
 */
function loadRavensIntoTeamA() {
  fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: '' } });
  fireEvent.focus(screen.getByLabelText('Team 1'));
  fireEvent.click(screen.getByRole('button', { name: 'Ravens' }));
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('config screen saved teams', () => {
  it('keeps the roster when a loaded saved team is renamed', () => {
    seedSavedTeams([RAVENS]);
    renderConfigScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Players' }));
    loadRavensIntoTeamA();
    expect(screen.getByText('#7 Ana')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Ravens B' } });

    expect(screen.getByLabelText('Team 1')).toHaveValue('Ravens B');
    expect(screen.getByText('#7 Ana')).toBeInTheDocument();
  });

  it('saves the team as soon as "add as a new team" is clicked, without starting a game', () => {
    renderConfigScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Players' }));
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Foxes' } });
    fireEvent.change(screen.getAllByPlaceholderText('#')[0], { target: { value: '9' } });
    fireEvent.change(screen.getAllByPlaceholderText('Name')[0], { target: { value: 'Sam' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);

    fireEvent.focus(screen.getByLabelText('Team 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Add "Foxes" as a new team' }));

    const saved = loadSavedTeams();
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('Foxes');
    expect(saved[0].players.map((p) => p.name)).toEqual(['Sam']);
    // Saved, so the combobox now offers it as an existing team instead.
    fireEvent.focus(screen.getByLabelText('Team 1'));
    expect(screen.queryByRole('button', { name: 'Add "Foxes" as a new team' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Foxes' })).toBeInTheDocument();
  });

  it('keeps roster edits to a saved team when the field is switched away and back', () => {
    seedSavedTeams([RAVENS]);
    renderConfigScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Players' }));
    // A brand new team, saved from the combobox with an empty roster...
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Foxes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add "Foxes" as a new team' }));
    // ...then filled in.
    fireEvent.change(screen.getAllByPlaceholderText('#')[0], { target: { value: '9' } });
    fireEvent.change(screen.getAllByPlaceholderText('Name')[0], { target: { value: 'Sam' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);
    expect(loadSavedTeams().find((t) => t.name === 'Foxes')?.players).toHaveLength(1);

    // Switch the same field to another saved team and back again.
    loadRavensIntoTeamA();
    expect(screen.getByText('#7 Ana')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: '' } });
    fireEvent.focus(screen.getByLabelText('Team 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Foxes' }));

    expect(screen.getByText('#9 Sam')).toBeInTheDocument();
  });

  it('does not write a roster edit into a team that was never saved', () => {
    renderConfigScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Players' }));
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Foxes' } });
    fireEvent.change(screen.getAllByPlaceholderText('#')[0], { target: { value: '9' } });
    fireEvent.change(screen.getAllByPlaceholderText('Name')[0], { target: { value: 'Sam' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);

    expect(screen.getByText('#9 Sam')).toBeInTheDocument();
    expect(loadSavedTeams()).toEqual([]);
  });

  it('saves a renamed team as a new entry, leaving the original saved roster alone', () => {
    seedSavedTeams([RAVENS]);
    renderConfigScreen();
    loadRavensIntoTeamA();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Ravens B' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add "Ravens B" as a new team' }));

    const saved = loadSavedTeams();
    expect(saved.map((t) => t.name)).toEqual(['Ravens', 'Ravens B']);
    expect(saved[0].players).toEqual(RAVENS.players);
    expect(saved[1].players.map((p) => p.name)).toEqual(['Ana']);
  });
});
