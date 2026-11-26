import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function nameTeams(a: string, b: string) {
  fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: a } });
  fireEvent.change(screen.getByLabelText('Team 2'), { target: { value: b } });
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('the rule sections', () => {
  it('start folded to a one-line summary of what they set', () => {
    renderConfigScreen();
    expect(screen.getByRole('button', { name: 'Expand Win conditions' })).toBeInTheDocument();
    expect(screen.queryByText('Required difference')).toBeNull();
    expect(screen.getByText('15 pts · 100 min · CAP +1')).toBeInTheDocument();
    expect(screen.getByText('at 8 · 55 min · 7m break · CAP +1')).toBeInTheDocument();
    expect(screen.getByText('2 per game · 1m 15s')).toBeInTheDocument();
    expect(screen.getByText('Automatic off · 3m')).toBeInTheDocument();
  });

  it('say Off when switched off, and cannot be unfolded then', () => {
    renderConfigScreen();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow timeouts' }));
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Expand Timeouts' })).toBeNull();
  });

  it('unfold and fold again from the heading', () => {
    renderConfigScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Timeouts' }));
    expect(screen.getByText('Per team')).toBeInTheDocument();
    expect(screen.queryByText('2 per game · 1m 15s')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Timeouts' }));
    expect(screen.queryByText('Per team')).toBeNull();
  });
});

describe('the Start bar', () => {
  it('names the matchup and the headline rules once both teams are named', () => {
    renderConfigScreen();
    expect(screen.getByText('Name both teams to start')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();

    nameTeams('RAVENS', 'FOXES');
    expect(screen.getByText('Mixed · 15 pts · 100 min')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start game' })).toBeEnabled();
  });

  // The full wording sits at the field; the bar says where to look, and goes there.
  it('points at the section holding the start up, and opens it', () => {
    renderConfigScreen();
    nameTeams('RAVENS', 'FOXES');
    fireEvent.click(screen.getByRole('button', { name: 'Expand Half-time' }));
    const half = screen.getAllByText('Score')[0].parentElement!.querySelector('input')!;
    // The game's own score field is folded, so the one on screen is the half's.
    fireEvent.change(half, { target: { value: '20' } });
    fireEvent.blur(half);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Half-time' }));

    // Folded, the summary carries the problem in place of the rules.
    expect(screen.getByText('Half-time score must be lower than the target score')).toBeTruthy();
    fireEvent.click(screen.getByText('Check Half-time to start'));
    expect(screen.getByRole('button', { name: 'Collapse Half-time' })).toBeInTheDocument();
  });

  it('flags two teams with the same name at the teams, and in the bar', () => {
    renderConfigScreen();
    nameTeams('RAVENS', 'RAVENS');
    expect(screen.getByText('Team names must be different')).toBeInTheDocument();
    expect(screen.getByText('Check Match to start')).toBeInTheDocument();
  });
});

describe('the template chips', () => {
  // The chip is the template's name and nothing else — changing a rule it sets does
  // not mark it, since the mark read as a second, unexplained state.
  it('keep their plain name after a rule they set has changed', () => {
    renderConfigScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Expand Win conditions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Score' }));
    expect(screen.getByRole('radio', { name: 'Grass' })).toHaveTextContent(/^Grass$/);
  });
});

describe('the scheduled start', () => {
  afterEach(() => vi.useRealTimers());

  // A wrong hour typed in is caught here, not when the countdown looks odd.
  it('says how far away it is', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 26, 10, 0, 30));
    renderConfigScreen();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Game has a scheduled starting time' }));
    const time = screen.getByText('Starting time').parentElement!.querySelector('input')!;

    fireEvent.change(time, { target: { value: '10:25' } });
    expect(screen.getByText('Starts in 25 min')).toBeInTheDocument();

    fireEvent.change(time, { target: { value: '12:00' } });
    expect(screen.getByText('Starts in 2 h')).toBeInTheDocument();

    fireEvent.change(time, { target: { value: '11:15' } });
    expect(screen.getByText('Starts in 1 h 15 min')).toBeInTheDocument();

    fireEvent.change(time, { target: { value: '09:00' } });
    expect(screen.queryByText(/^Starts in/)).toBeNull();
    expect(
      screen.getByText('Starting time must be later than the current time'),
    ).toBeInTheDocument();
  });
});
