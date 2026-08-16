import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { PlayerMultiPicker, PlayerPicker } from '../components/PlayerPicker';
import type { PlayerInfo } from '../state/types';
import { hold, tap } from './gestures';

const players: PlayerInfo[] = [{ id: 'p1', number: '7', name: 'Alex' }];
const twoPlayers: PlayerInfo[] = [
  { id: 'p1', number: '7', name: 'Alex' },
  { id: 'p2', number: '9', name: 'Sam' },
];

function renderPicker(onRemove?: (id: string) => void) {
  const onSelect = vi.fn();
  render(
    <I18nProvider>
      <PlayerPicker players={players} selected={null} onSelect={onSelect} onRemove={onRemove} />
    </I18nProvider>,
  );
  return onSelect;
}

function renderMultiPicker(selected: string[] = []) {
  const onToggle = vi.fn();
  const onRemove = vi.fn();
  render(
    <I18nProvider>
      <PlayerMultiPicker
        players={twoPlayers}
        selected={selected}
        onToggle={onToggle}
        onRemove={onRemove}
      />
    </I18nProvider>,
  );
  return { onToggle, onRemove };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('PlayerPicker long-press removal', () => {
  it('removes the player on a long press and does not select it', () => {
    const onRemove = vi.fn();
    const onSelect = renderPicker(onRemove);

    hold(screen.getByText('#7 Alex'), 600);

    expect(onRemove).toHaveBeenCalledWith('p1');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects the player on a quick tap instead of removing it', () => {
    const onRemove = vi.fn();
    const onSelect = renderPicker(onRemove);

    tap(screen.getByText('#7 Alex'));

    expect(onSelect).toHaveBeenCalledWith('p1');
    expect(onRemove).not.toHaveBeenCalled();
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

  it('long-presses a chip to remove it without toggling', () => {
    const { onToggle, onRemove } = renderMultiPicker(['p1']);

    hold(screen.getByText('#7 Alex'), 600);

    expect(onRemove).toHaveBeenCalledWith('p1');
    expect(onToggle).not.toHaveBeenCalled();
  });
});
