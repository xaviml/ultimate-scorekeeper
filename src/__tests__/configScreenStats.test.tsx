import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import ConfigScreen from '../components/ConfigScreen';
import {
  choices,
  choose,
  chosen,
  openRoster,
  rosterSheet,
  statsSwitch,
  track,
  tracked,
} from './configFields';

function renderConfigScreen() {
  return render(
    <I18nProvider>
      <GameProvider>
        <ConfigScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('config screen statistics section', () => {
  it('starts with the Statistics switch off — the score-only game — and nothing to pick', () => {
    renderConfigScreen();

    expect(statsSwitch().checked).toBe(false);
    expect(tracked()).toBe('none');
    expect(screen.queryByText('Track')).toBeNull();
    expect(screen.queryByText('Players of')).toBeNull();
  });

  it('offers only Team and Player once switched on, starting at Team', () => {
    renderConfigScreen();
    fireEvent.click(statsSwitch());

    expect(choices('Track')).toEqual(['teams', 'players']);
    expect(tracked()).toBe('teams');
  });

  it('comes back on at the detail picked last', () => {
    renderConfigScreen();
    track('players');
    fireEvent.click(statsSwitch());
    expect(tracked()).toBe('none');

    fireEvent.click(statsSwitch());
    expect(tracked()).toBe('players');
  });

  // The detail axis answers "who gets named", and only naming players needs a scope.
  it('shows the scope picker at player detail only', () => {
    renderConfigScreen();

    track('teams');
    expect(screen.queryByText('Players of')).toBeNull();

    track('players');
    expect(screen.getByText('Players of')).toBeInTheDocument();
  });

  // Both teams is the wider landing place, and is what `trackedTeam: null` carries
  // at player detail.
  it('starts at both teams and narrows to either one', () => {
    renderConfigScreen();
    track('players');

    expect(chosen('Players of')).toBe('both');

    choose('Players of', 'B');
    expect(chosen('Players of')).toBe('B');
  });

  // Both rosters are always editable from the Teams card; the sheet only says when
  // this game will not ask about the players in it.
  it("says when a roster is one this game won't ask about", () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES' } });
    fireEvent.change(screen.getByLabelText('Team 2'), { target: { value: 'WOLVES' } });
    const unused = () => within(rosterSheet()).queryByText(/won't ask about these players/);

    openRoster('A');
    expect(unused()).not.toBeNull();

    track('players');
    expect(unused()).toBeNull();

    choose('Players of', 'B');
    expect(unused()).not.toBeNull();
  });

  it('suggests filling in a followed roster while it is empty', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES' } });
    track('players');
    choose('Players of', 'A');
    expect(screen.getByText(/Recommended: add FOXES's roster/)).toBeInTheDocument();

    openRoster('A');
    fireEvent.change(within(rosterSheet()).getByPlaceholderText('Name'), {
      target: { value: 'Ana' },
    });
    fireEvent.click(within(rosterSheet()).getByRole('button', { name: 'Add' }));
    expect(screen.queryByText(/Recommended: add FOXES's roster/)).toBeNull();
  });

  // The Turn button is opt-in: the tournament scorekeeper tracking goals and assists
  // has no use for the most frequent button on the action row.
  it('offers turnovers wherever anything is tracked, off by default', () => {
    renderConfigScreen();
    const turnovers = () => screen.queryByLabelText('Turnovers');

    expect(turnovers()).toBeNull();

    track('teams');
    expect(turnovers()).not.toBeChecked();

    fireEvent.click(turnovers()!);
    expect(turnovers()).toBeChecked();

    // The flag survives a change of detail — it is visible on the same screen, so
    // rewriting it underneath the user would be the surprising behaviour.
    track('players');
    expect(turnovers()).toBeChecked();
  });

  // Nested under Turnovers: without the tap there is nothing to ask about, and
  // without a roster there is nobody to name.
  it('asks who turned it over only with turnovers on and a roster to ask against', () => {
    renderConfigScreen();
    const askWho = () => screen.queryByLabelText('Ask who turned it over');

    track('teams');
    fireEvent.click(screen.getByLabelText('Turnovers'));
    expect(askWho()).toBeNull();

    track('players');
    expect(askWho()).not.toBeChecked();

    fireEvent.click(askWho()!);
    expect(askWho()).toBeChecked();

    // Turning turnovers back off takes the question with it.
    fireEvent.click(screen.getByLabelText('Turnovers'));
    expect(askWho()).toBeNull();
  });

  // Also nested under Turnovers, but for a different reason than its neighbour:
  // not because there is nobody to ask — passes never ask — but because a pass is
  // credited to whoever holds the disc, and possession only moves with the Turn
  // button. So it needs no roster and appears from team detail up.
  it('offers passes under turnovers, with no roster needed, off by default', () => {
    renderConfigScreen();
    const passes = () => screen.queryByLabelText('Passes');

    track('teams');
    expect(passes()).toBeNull(); // turnovers still off

    fireEvent.click(screen.getByLabelText('Turnovers'));
    expect(passes()).not.toBeChecked();

    fireEvent.click(passes()!);
    expect(passes()).toBeChecked();

    // Turning turnovers back off takes it with them.
    fireEvent.click(screen.getByLabelText('Turnovers'));
    expect(passes()).toBeNull();
  });

  // The reason to have typed a roster, so it is on wherever there is one.
  it('asks who scored wherever there is a roster, on by default', () => {
    renderConfigScreen();
    const askScorer = () => screen.queryByLabelText('Ask who scored');

    expect(askScorer()).toBeNull();

    track('teams');
    expect(askScorer()).toBeNull();

    track('players');
    expect(askScorer()).toBeChecked();

    fireEvent.click(askScorer()!);
    expect(askScorer()).not.toBeChecked();
  });

  it('picking a template never touches the stats settings', () => {
    renderConfigScreen();
    track('players');
    choose('Players of', 'B');
    fireEvent.click(screen.getByLabelText('Turnovers'));

    choose('Template', 'predefined:beach');

    expect(tracked()).toBe('players');
    expect(chosen('Players of')).toBe('B');
    expect(screen.getByLabelText('Turnovers')).toBeChecked();
  });
});
