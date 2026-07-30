import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { createInitialState } from '../state/gameReducer';
import { AssistGoalDialog } from '../components/AssistGoalDialog';
import { ConfirmEndGameDialog } from '../components/ConfirmEndGameDialog';
import { GameLog } from '../components/GameLog';
import { CallTeamDialog } from '../components/CallTeamDialog';
import { Modal } from '../components/Modal';
import { NoteDialog } from '../components/NoteDialog';
import { PlayersDialog } from '../components/PlayersDialog';
import { CallDialog } from '../components/CallDialog';
import { StoppageDialog } from '../components/StoppageDialog';
import { TravelTeamDialog } from '../components/TravelTeamDialog';
import { TurnoverDialog } from '../components/TurnoverDialog';

function renderWithProviders(ui: ReactNode) {
  return render(
    <I18nProvider>
      <GameProvider>{ui}</GameProvider>
    </I18nProvider>,
  );
}

beforeEach(() => sessionStorage.clear());

describe('Modal backdrop dismissal', () => {
  it('ignores a ghost click that has no matching pointerdown', () => {
    const onClose = vi.fn();
    const { container } = renderWithProviders(<Modal onClose={onClose}>body</Modal>);
    const backdrop = container.querySelector('.fixed') as HTMLElement;

    // The delayed compatibility click from the tap that opened the dialog.
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on a real press that begins and ends on the backdrop', () => {
    const onClose = vi.fn();
    const { container } = renderWithProviders(<Modal onClose={onClose}>body</Modal>);
    const backdrop = container.querySelector('.fixed') as HTMLElement;

    fireEvent.pointerDown(backdrop);
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the press starts inside the panel', () => {
    const onClose = vi.fn();
    renderWithProviders(<Modal onClose={onClose}>body</Modal>);
    const body = screen.getByText('body');

    fireEvent.pointerDown(body);
    fireEvent.click(body);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders a close button only when asked, and it closes', () => {
    const onClose = vi.fn();
    const { rerender } = renderWithProviders(
      <Modal title="Title" onClose={onClose}>
        body
      </Modal>,
    );
    expect(screen.queryByLabelText('Close')).toBeNull();

    rerender(
      <I18nProvider>
        <GameProvider>
          <Modal title="Title" onClose={onClose} showClose>
            body
          </Modal>
        </GameProvider>
      </I18nProvider>,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// Every dialog now shares one backdrop, so the guard above protects all of them.
describe('dialogs render through the shared Modal', () => {
  const noop = () => {};

  it('GameLog shows the history heading and column headers', () => {
    renderWithProviders(<GameLog onClose={noop} onAddEvent={noop} />);
    expect(screen.getByText('Game history')).toBeInTheDocument();
    // Twice over: the table's own column header, and the header button that adds one.
    expect(screen.getAllByText('Event')).toHaveLength(2);
  });

  it('GameLog routes its header button to the add-event flow', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'live';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    const onAddEvent = vi.fn();
    renderWithProviders(<GameLog onClose={noop} onAddEvent={onAddEvent} />);
    fireEvent.click(screen.getByLabelText('Event'));
    expect(onAddEvent).toHaveBeenCalledTimes(1);
  });

  it('GameLog still offers the add-event button during a timeout', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'timeout';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    renderWithProviders(<GameLog onClose={noop} onAddEvent={noop} />);
    expect(screen.getByLabelText('Event')).not.toBeDisabled();
  });

  it('GameLog keeps the add-event button tappable before the game has started, but explains why on tap', () => {
    const onAddEvent = vi.fn();
    renderWithProviders(<GameLog onClose={noop} onAddEvent={onAddEvent} />);
    const button = screen.getByLabelText('Event');
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onAddEvent).not.toHaveBeenCalled();
    expect(screen.getByText(/has not started yet/)).toBeInTheDocument();
  });

  it('PlayersDialog lists both team rosters', () => {
    renderWithProviders(<PlayersDialog onClose={noop} />);
    expect(screen.getByText('Roster')).toBeInTheDocument();
    expect(screen.getByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
  });

  it('StoppageDialog asks injury vs. technical vs. SOTG first', () => {
    renderWithProviders(<StoppageDialog onClose={noop} />);
    expect(screen.getByText('Injury')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('SOTG')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('StoppageDialog records SOTG in one step, with no attribution to ask for', () => {
    const onClose = vi.fn();
    renderWithProviders(<StoppageDialog onClose={onClose} />);
    fireEvent.click(screen.getByText('SOTG'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('StoppageDialog offers a water break between points', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'awaitingPull';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    const onClose = vi.fn();
    renderWithProviders(<StoppageDialog onClose={onClose} />);
    const button = screen.getByRole('button', { name: 'Water break' });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    expect(onClose).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
    expect(stored.status).toBe('waterBreak');
  });

  it('StoppageDialog greys the water break out mid-point, and says why', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'live';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    renderWithProviders(<StoppageDialog onClose={noop} />);

    expect(screen.getByRole('button', { name: 'Water break' })).toBeDisabled();
    expect(screen.getByText(/only be called between points/i)).toBeInTheDocument();
    // The three stoppages themselves stay available — they interrupt anything.
    expect(screen.getByText('Injury')).toBeInTheDocument();
  });

  it('StoppageDialog shows the player picker after choosing Injury when tracking players', () => {
    const state = createInitialState();
    state.config.statsMode = 'player';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    renderWithProviders(<StoppageDialog onClose={noop} />);
    fireEvent.click(screen.getByText('Injury'));
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
  });

  it('StoppageDialog attributes an injury to players on both teams at once', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'awaitingPull';
    // Cloned before mutating: createInitialState()'s config defaults to the
    // module-level defaultConfig singleton by reference (see ConfigScreen's
    // `state.config === defaultConfig` fresh-start check), so assigning into
    // state.config.players directly would otherwise leak these rosters into
    // every other test in this file that creates a "fresh" state afterward.
    state.config = { ...state.config, players: { A: [], B: [] } };
    state.config.statsMode = 'player';
    state.config.players.A = [{ id: 'a1', number: '7', name: 'Alex' }];
    state.config.players.B = [{ id: 'b1', number: '3', name: 'Sam' }];
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    const onClose = vi.fn();
    renderWithProviders(<StoppageDialog onClose={onClose} />);
    fireEvent.click(screen.getByText('Injury'));

    const alex = screen.getByText('#7 Alex');
    fireEvent.pointerDown(alex);
    fireEvent.pointerUp(alex);
    const sam = screen.getByText('#3 Sam');
    fireEvent.pointerDown(sam);
    fireEvent.pointerUp(sam);
    fireEvent.click(screen.getByText('Save'));

    expect(onClose).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
    expect(stored.pendingStoppage.players).toEqual(
      expect.arrayContaining([
        { team: 'A', playerId: 'a1' },
        { team: 'B', playerId: 'b1' },
      ]),
    );
    // Injured players span both teams, so no single team badge applies.
    expect(stored.pendingStoppage.team).toBeUndefined();
  });

  it('StoppageDialog shows a team picker with a skip option after choosing Technical when tracking activity', () => {
    const state = createInitialState();
    state.config.statsMode = 'game';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    renderWithProviders(<StoppageDialog onClose={noop} />);
    fireEvent.click(screen.getByText('Technical'));
    expect(screen.getByText('No team')).toBeInTheDocument();
  });

  it('StoppageDialog records Technical straight away, with no team picker, when not tracking activity', () => {
    const state = createInitialState();
    state.config.statsMode = 'none';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    const onClose = vi.fn();
    renderWithProviders(<StoppageDialog onClose={onClose} />);
    fireEvent.click(screen.getByText('Technical'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No team')).toBeNull();
  });

  it('StoppageDialog asks which team called the SOTG, with no skip option, when tracking activity', () => {
    const state = createInitialState();
    state.config.statsMode = 'game';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    const onClose = vi.fn();
    renderWithProviders(<StoppageDialog onClose={onClose} />);
    fireEvent.click(screen.getByText('SOTG'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
    expect(screen.queryByText('No team')).toBeNull();
  });

  it('StoppageDialog applies the SOTG stoppage once a team is picked', () => {
    const state = createInitialState();
    state.config.statsMode = 'game';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    const onClose = vi.fn();
    renderWithProviders(<StoppageDialog onClose={onClose} />);
    fireEvent.click(screen.getByText('SOTG'));
    fireEvent.click(screen.getByText('Team A'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('StoppageDialog leaves the SOTG stoppage unapplied when the team step is cancelled', () => {
    const state = createInitialState();
    state.config.statsMode = 'game';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    const onClose = vi.fn();
    renderWithProviders(<StoppageDialog onClose={onClose} />);
    fireEvent.click(screen.getByText('SOTG'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);

    const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
    expect(stored.status).not.toBe('paused');
  });

  it('StoppageDialog asks a team-only question for Injury in Game stats mode, with no roster', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'awaitingPull';
    state.config = { ...state.config, statsMode: 'game' };
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    const onClose = vi.fn();
    renderWithProviders(<StoppageDialog onClose={onClose} />);
    fireEvent.click(screen.getByText('Injury'));
    expect(screen.getByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
    expect(screen.getByText('No team')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Team A'));
    expect(onClose).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
    expect(stored.pendingStoppage.team).toBe('A');
    expect(stored.pendingStoppage.players).toBeUndefined();
  });

  it('StoppageDialog picks a named player for the tracked team and a plain team badge for the other, in Team stats mode', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.status = 'awaitingPull';
    state.config = {
      ...state.config,
      statsMode: 'team',
      trackedTeam: 'A',
      players: { A: [{ id: 'a1', number: '7', name: 'Alex' }], B: [] },
    };
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    const onClose = vi.fn();
    renderWithProviders(<StoppageDialog onClose={onClose} />);
    fireEvent.click(screen.getByText('Injury'));

    // Only the tracked team's roster is offered as named players.
    const alex = screen.getByText('#7 Alex');
    fireEvent.pointerDown(alex);
    fireEvent.pointerUp(alex);

    // The other team is a plain checkbox, no roster.
    fireEvent.click(screen.getByLabelText(/Also mark Team B as injured/));
    fireEvent.click(screen.getByText('Save'));

    expect(onClose).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(sessionStorage.getItem('ultimate-scorekeeper:game-state')!);
    expect(stored.pendingStoppage.players).toEqual([{ team: 'A', playerId: 'a1' }]);
    // Both teams involved at once (one named, one generic) — no single-team badge.
    expect(stored.pendingStoppage.team).toBeUndefined();
  });

  it('TurnoverDialog asks both sides and can be saved with no one picked', () => {
    const state = createInitialState();
    state.config.statsMode = 'player';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    renderWithProviders(<TurnoverDialog attacking="A" onClose={noop} />);
    expect(screen.getByText(/Team A — who lost the disc/)).toBeInTheDocument();
    expect(screen.getByText(/Team B — who forced it/)).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it("TurnoverDialog asks only the tracked team's role in Team stats mode", () => {
    const state = createInitialState();
    state.config.statsMode = 'team';
    state.config.trackedTeam = 'B';
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    renderWithProviders(<TurnoverDialog attacking="A" onClose={noop} />);
    expect(screen.queryByText(/Team A — who lost the disc/)).toBeNull();
    expect(screen.getByText(/Team B — who forced it/)).toBeInTheDocument();
  });

  it('AssistGoalDialog hides scorer/assist titles when the roster is empty', () => {
    renderWithProviders(<AssistGoalDialog team="A" onCancel={noop} onSave={noop} />);
    expect(screen.queryByText('Scorer')).toBeNull();
    expect(screen.queryByText('Assist')).toBeNull();
  });

  it('AssistGoalDialog shows scorer/assist pickers once a player exists, with no separate "no assist" option', () => {
    const state = createInitialState();
    state.phase = 'game';
    state.config.players.A = [{ id: 'p1', number: '7', name: 'Alex' }];
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    renderWithProviders(<AssistGoalDialog team="A" onCancel={noop} onSave={noop} />);

    expect(screen.getByText('Scorer')).toBeInTheDocument();
    expect(screen.getByText('Assist')).toBeInTheDocument();
    expect(screen.queryByText('No assist')).toBeNull();
    expect(screen.getAllByText('#7 Alex')).toHaveLength(2);
  });

  it('CallDialog routes the six calls and travel back to its caller', () => {
    const onChoose = vi.fn();
    renderWithProviders(<CallDialog onClose={noop} onChoose={onChoose} />);

    fireEvent.click(screen.getByText('Foul'));
    expect(onChoose).toHaveBeenCalledWith({ type: 'call', kind: 'foul' });

    fireEvent.click(screen.getByText('Stall out'));
    expect(onChoose).toHaveBeenCalledWith({ type: 'call', kind: 'stallOut' });

    fireEvent.click(screen.getByText('Travel'));
    expect(onChoose).toHaveBeenCalledWith({ type: 'travel' });
  });

  it('CallDialog holds nothing that is not a call', () => {
    renderWithProviders(<CallDialog onClose={noop} onChoose={noop} />);
    // Turnovers, stoppages, SOTG and free-text events all moved elsewhere.
    expect(screen.queryByText('Turn')).toBeNull();
    expect(screen.queryByText('Stoppage')).toBeNull();
    expect(screen.queryByText('SOTG')).toBeNull();
    expect(screen.queryByText('Event')).toBeNull();
  });

  it('CallTeamDialog offers both teams as the way to record who called it', () => {
    renderWithProviders(<CallTeamDialog kind="pick" onClose={noop} />);
    expect(screen.getByText(/Pick — who called it/)).toBeInTheDocument();
    expect(screen.getByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
  });

  it('TravelTeamDialog picks a team and closes immediately, with no resolution step', () => {
    const onClose = vi.fn();
    renderWithProviders(<TravelTeamDialog onClose={onClose} />);
    expect(screen.getByText(/Travel — who called it/)).toBeInTheDocument();
    expect(screen.queryByText('Accepted')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Team A'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('NoteDialog keeps Save disabled until there is text', () => {
    renderWithProviders(<NoteDialog onClose={noop} />);
    const save = screen.getByText('Save') as HTMLButtonElement;
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('What happened?'), {
      target: { value: 'a dragon flew across the field' },
    });
    expect(save).not.toBeDisabled();
  });

  it('ConfirmEndGameDialog wires cancel and confirm separately', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    renderWithProviders(<ConfirmEndGameDialog onCancel={onCancel} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
