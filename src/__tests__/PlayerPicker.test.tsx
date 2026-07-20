import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { PlayerPicker } from '../components/PlayerPicker';
import type { PlayerInfo } from '../state/types';

const players: PlayerInfo[] = [{ id: 'p1', number: '7', name: 'Alex' }];

function renderPicker(onRemove?: (id: string) => void) {
  const onSelect = vi.fn();
  render(
    <I18nProvider>
      <PlayerPicker players={players} selected={null} onSelect={onSelect} onRemove={onRemove} />
    </I18nProvider>,
  );
  return onSelect;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('PlayerPicker long-press removal', () => {
  it('removes the player on a long press and does not select it', () => {
    const onRemove = vi.fn();
    const onSelect = renderPicker(onRemove);

    const chip = screen.getByText('#7 Alex');
    fireEvent.pointerDown(chip);
    vi.advanceTimersByTime(600);
    fireEvent.pointerUp(chip);

    expect(onRemove).toHaveBeenCalledWith('p1');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects the player on a quick tap instead of removing it', () => {
    const onRemove = vi.fn();
    const onSelect = renderPicker(onRemove);

    const chip = screen.getByText('#7 Alex');
    fireEvent.pointerDown(chip);
    fireEvent.pointerUp(chip);

    expect(onSelect).toHaveBeenCalledWith('p1');
    expect(onRemove).not.toHaveBeenCalled();
  });
});
