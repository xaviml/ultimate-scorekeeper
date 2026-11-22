import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamNameCombobox } from '../components/TeamNameCombobox';
import { I18nProvider } from '../i18n';
import { createInitialState, defaultConfig, gameReducer } from '../state/gameReducer';
import { reviveGameState } from '../state/persistence';
import { loadSavedTeams, renameTeam, saveTeam } from '../state/rosterStorage';
import type { GameState } from '../state/types';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('team names are stored in capitals', () => {
  it('cases the names a game is started with', () => {
    const config = structuredClone(defaultConfig);
    config.teams.A.name = 'Foxes';
    config.teams.B.name = 'Los Búhos';
    const state = createInitialState(config);

    expect(state.config.teams.A.name).toBe('FOXES');
    expect(state.config.teams.B.name).toBe('LOS BÚHOS');
  });

  it('hands back the very same config when there is nothing to case', () => {
    // The setup screen recognises a fresh app by identity with defaultConfig.
    expect(createInitialState().config).toBe(defaultConfig);
  });

  it('cases a name corrected mid-game', () => {
    const state = gameReducer(
      { ...createInitialState(), phase: 'game' },
      {
        type: 'EDIT_GAME_INFO',
        fieldNumber: '1',
        teams: {
          A: { name: '  Foxes ', color: '#ff0000' },
          B: { name: 'Wolves', color: '#0000ff' },
        },
      },
    );

    expect(state.config.teams.A.name).toBe('FOXES');
    expect(state.config.teams.B.name).toBe('WOLVES');
  });

  it('cases a game stored before the rule existed when it is read back', () => {
    const stored = structuredClone(createInitialState()) as GameState;
    stored.config.teams.A.name = 'Foxes';

    expect(reviveGameState(stored).config.teams.A.name).toBe('FOXES');
  });

  it('cases saved teams on the way in and on the way out', () => {
    localStorage.setItem(
      'ultimate-scorekeeper:saved-teams',
      JSON.stringify([{ name: 'Ravens', color: '#000000', players: [] }]),
    );
    expect(loadSavedTeams().map((t) => t.name)).toEqual(['RAVENS']);

    saveTeam({ name: 'owls', color: '#111111', players: [] });
    renameTeam('ravens', 'Crows');
    expect(
      loadSavedTeams()
        .map((t) => t.name)
        .sort(),
    ).toEqual(['CROWS', 'OWLS']);
  });
});

describe('the team name box', () => {
  function Harness({ onChange }: { onChange: (name: string) => void }) {
    const [value, setValue] = useState('');
    return (
      <I18nProvider>
        <TeamNameCombobox
          label="Team 1"
          value={value}
          savedTeams={[]}
          otherTeamName=""
          onChangeText={(name) => {
            onChange(name);
            setValue(name);
          }}
          onSelectTeam={() => {}}
          onAddAsNewTeam={() => {}}
        />
      </I18nProvider>
    );
  }

  it('passes the name on in capitals while keeping the keystrokes in the box', () => {
    // Writing the capitals back into the box would move the caret on every key,
    // so the box keeps what was typed and only shows it in capitals.
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByLabelText('Team 1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Foxes' } });

    expect(onChange).toHaveBeenLastCalledWith('FOXES');
    expect(input.value).toBe('Foxes');
    expect(input.className).toContain('uppercase');
  });
});
