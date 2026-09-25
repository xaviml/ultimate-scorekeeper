import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { PlayerMultiPicker, PlayerPicker } from '../components/PlayerPicker';
import { PlayerRosterEditor } from '../components/PlayerRosterEditor';
import type { PlayerInfo } from '../state/types';
import { hold, tap } from './gestures';

const players: PlayerInfo[] = [{ id: 'p1', number: '7', name: 'Alex' }];
const twoPlayers: PlayerInfo[] = [
  { id: 'p1', number: '7', name: 'Alex' },
  { id: 'p2', number: '9', name: 'Sam' },
];

function renderPicker(selected: string | null = null) {
  const onSelect = vi.fn();
  render(
    <I18nProvider>
      <PlayerPicker players={players} selected={selected} onSelect={onSelect} />
    </I18nProvider>,
  );
  return onSelect;
}

function renderMultiPicker(selected: string[] = []) {
  const onToggle = vi.fn();
  render(
    <I18nProvider>
      <PlayerMultiPicker players={twoPlayers} selected={selected} onToggle={onToggle} />
    </I18nProvider>,
  );
  return { onToggle };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('PlayerPicker', () => {
  it('selects the player on a tap', () => {
    const onSelect = renderPicker();
    tap(screen.getByText('#7 Alex'));
    expect(onSelect).toHaveBeenCalledWith('p1');
  });

  it('clears the selection when the active chip is tapped again', () => {
    const onSelect = renderPicker('p1');
    tap(screen.getByText('#7 Alex'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  // Regression: a hesitant press used to delete the player from the roster mid-game.
  it('treats a slow press as a tap, not as a removal', () => {
    const onSelect = renderPicker();
    hold(screen.getByText('#7 Alex'), 1000);
    expect(onSelect).toHaveBeenCalledWith('p1');
    // And the chip is announced as the player, not as a "Remove" action.
    expect(screen.getByRole('button', { name: '#7 Alex' })).toBeTruthy();
  });
});

describe('PlayerMultiPicker', () => {
  it('toggles a chip by id regardless of which others are already selected', () => {
    const { onToggle } = renderMultiPicker(['p2']);

    tap(screen.getByText('#7 Alex'));
    expect(onToggle).toHaveBeenCalledWith('p1');

    // Tapping an already-selected chip still reports just that one id, so the
    // caller (not the chip) decides it means "remove", leaving the other intact.
    tap(screen.getByText('#9 Sam'));
    expect(onToggle).toHaveBeenCalledWith('p2');
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('toggles on a slow press rather than removing anyone', () => {
    const { onToggle } = renderMultiPicker(['p1']);
    hold(screen.getByText('#7 Alex'), 1000);
    expect(onToggle).toHaveBeenCalledWith('p1');
  });
});

describe('PlayerRosterEditor removal', () => {
  function renderEditor(removeNote?: string) {
    const onRemove = vi.fn();
    render(
      <I18nProvider>
        <PlayerRosterEditor
          label="Ravens"
          players={twoPlayers}
          onAdd={vi.fn()}
          onRemove={onRemove}
          removeNote={removeNote}
        />
      </I18nProvider>,
    );
    return onRemove;
  }

  it('asks before removing, and cancelling keeps the player', () => {
    const onRemove = renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Remove #7 Alex' }));

    expect(screen.getByText('Remove #7 Alex from Ravens?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByText('Remove #7 Alex from Ravens?')).toBeNull();
  });

  it('removes the player once confirmed', () => {
    const onRemove = renderEditor('Kept in the log.');
    fireEvent.click(screen.getByRole('button', { name: 'Remove #9 Sam' }));
    expect(screen.getByText('Kept in the log.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onRemove).toHaveBeenCalledWith('p2');
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
