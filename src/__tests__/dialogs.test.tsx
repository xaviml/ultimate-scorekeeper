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
import { RecordEventDialog } from '../components/RecordEventDialog';
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
    renderWithProviders(<GameLog onClose={noop} />);
    expect(screen.getByText('Game history')).toBeInTheDocument();
    expect(screen.getByText('Event')).toBeInTheDocument();
  });

  it('PlayersDialog lists both team rosters', () => {
    renderWithProviders(<PlayersDialog onClose={noop} />);
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
  });

  it('StoppageDialog asks injury vs. technical first', () => {
    renderWithProviders(<StoppageDialog onClose={noop} />);
    expect(screen.getByText('Injury')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('StoppageDialog shows the player picker after choosing Injury when tracking players', () => {
    const state = createInitialState();
    state.config.trackPlayers = true;
    sessionStorage.setItem('ultimate-scorekeeper:game-state', JSON.stringify(state));

    renderWithProviders(<StoppageDialog onClose={noop} />);
    fireEvent.click(screen.getByText('Injury'));
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
  });

  it('StoppageDialog shows a team picker with a skip option after choosing Technical', () => {
    renderWithProviders(<StoppageDialog onClose={noop} />);
    fireEvent.click(screen.getByText('Technical'));
    expect(screen.getByText('No team')).toBeInTheDocument();
  });

  it('TurnoverDialog asks both sides and can be saved with no one picked', () => {
    renderWithProviders(<TurnoverDialog attacking="A" onClose={noop} />);
    expect(screen.getByText(/Team A — who lost the disc/)).toBeInTheDocument();
    expect(screen.getByText(/Team B — who forced it/)).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
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

  it('RecordEventDialog routes each choice back to its caller', () => {
    const onChoose = vi.fn();
    renderWithProviders(<RecordEventDialog onClose={noop} onChoose={onChoose} />);

    fireEvent.click(screen.getByText('Turn'));
    expect(onChoose).toHaveBeenCalledWith({ type: 'turnover' });

    fireEvent.click(screen.getByText('Foul'));
    expect(onChoose).toHaveBeenCalledWith({ type: 'call', kind: 'foul' });

    fireEvent.click(screen.getByText('Event'));
    expect(onChoose).toHaveBeenCalledWith({ type: 'note' });
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
      target: { value: 'a bird crossed the field' },
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
