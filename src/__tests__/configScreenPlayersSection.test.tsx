import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import ConfigScreen from '../components/ConfigScreen';
import { openRoster, rosterSheet, track } from './configFields';

function renderConfigScreen() {
  return render(
    <I18nProvider>
      <GameProvider>
        <ConfigScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

const ROSTER_HELP_TEXT =
  "You can add players once the game is underway — there's no need to fill in the full roster before kickoff.";

const rosterRow = (team: 'A' | 'B') =>
  document.querySelector(`[data-roster-team="${team}"]`) as HTMLElement | null;

function addPlayer(number: string, name: string) {
  const sheet = rosterSheet();
  fireEvent.change(within(sheet).getByPlaceholderText('#'), { target: { value: number } });
  fireEvent.change(within(sheet).getByPlaceholderText('Name'), { target: { value: name } });
  fireEvent.click(within(sheet).getByRole('button', { name: 'Add' }));
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('team rosters in the Teams card', () => {
  // A roster belongs to a team: no team, no roster.
  it('shows a team’s roster only once the team is named', () => {
    renderConfigScreen();
    expect(rosterRow('A')).toBeNull();
    expect(rosterRow('B')).toBeNull();

    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES' } });
    expect(rosterRow('A')).not.toBeNull();
    expect(rosterRow('B')).toBeNull();
  });

  // ...and once named, it can be filled in whatever the game tracks.
  it('offers a named team’s roster in every statistics setting', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES' } });
    for (const mode of ['none', 'teams', 'players'] as const) {
      track(mode);
      expect(rosterRow('A')).not.toBeNull();
    }
    expect(screen.queryByText(ROSTER_HELP_TEXT)).toBeNull();
  });

  // Removing the team removes its players: the next name typed into the box is a
  // different team, and must not inherit them.
  it('empties the roster when the team is removed, so a new team starts empty', () => {
    localStorage.setItem(
      'ultimate-scorekeeper:saved-teams',
      JSON.stringify([
        { name: 'RAVENS', color: '#111111', players: [{ id: 'p1', number: '7', name: 'Ana' }] },
      ]),
    );
    renderConfigScreen();
    fireEvent.focus(screen.getByLabelText('Team 1'));
    fireEvent.click(screen.getByRole('button', { name: 'RAVENS' }));
    expect(rosterRow('A')!.textContent).toContain('1 player');

    fireEvent.click(screen.getByRole('button', { name: 'Clear Team 1' }));
    expect(rosterRow('A')).toBeNull();

    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES' } });
    expect(rosterRow('A')!.textContent).toContain('No players yet');
    // The saved RAVENS keeps its players.
    const stored = JSON.parse(localStorage.getItem('ultimate-scorekeeper:saved-teams')!);
    expect(stored[0].players).toHaveLength(1);
  });

  // Editing the name in place keeps the players — the way to build a second squad.
  it('keeps the roster when the name is edited rather than removed', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES' } });
    openRoster('A');
    addPlayer('7', 'Ana');
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES B' } });
    expect(rosterRow('A')!.textContent).toContain('1 player');
  });

  it('opens the team’s roster in a sheet', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES' } });
    openRoster('A');

    expect(within(rosterSheet()).getByText(ROSTER_HELP_TEXT)).toBeInTheDocument();
    expect(within(rosterSheet()).getByText('FOXES')).toBeInTheDocument();
  });

  it('summarises the roster on its row, with the split once anyone is marked', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES' } });
    expect(rosterRow('A')!.textContent).toContain('No players yet');

    openRoster('A');
    addPlayer('7', 'Ana');
    expect(rosterRow('A')!.textContent).toContain('1 player');
    addPlayer('9', 'Jo');
    expect(rosterRow('A')!.textContent).toContain('2 players');
    expect(rosterRow('A')!.textContent).not.toContain('FMP');

    fireEvent.click(screen.getByRole('button', { name: '#7 Ana — gender: Not set' }));
    expect(rosterRow('A')!.textContent).toContain('2 players · 0 FMP / 1 MMP');
  });

  // The kickoff sync stores both teams anyway; saving from the sheet is for a roster
  // typed for a game that may never be played.
  it('saves a team that is not saved yet, roster included', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES' } });
    openRoster('A');
    addPlayer('7', 'Ana');

    fireEvent.click(within(rosterSheet()).getByRole('button', { name: 'Save FOXES' }));

    const stored = JSON.parse(localStorage.getItem('ultimate-scorekeeper:saved-teams')!);
    expect(stored).toEqual([
      expect.objectContaining({
        name: 'FOXES',
        players: [expect.objectContaining({ number: '7', name: 'Ana' })],
      }),
    ]);
    expect(within(rosterSheet()).queryByRole('button', { name: 'Save FOXES' })).toBeNull();
  });
});
