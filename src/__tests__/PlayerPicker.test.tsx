import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { PlayerMultiPicker, PlayerPicker, PlayerSortToggle } from '../components/PlayerPicker';
import { gridColumns } from '../state/lines';
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
    tap(screen.getByRole('button', { name: '#7 Alex' }));
    expect(onSelect).toHaveBeenCalledWith('p1');
  });

  it('clears the selection when the active chip is tapped again', () => {
    const onSelect = renderPicker('p1');
    tap(screen.getByRole('button', { name: '#7 Alex' }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  // Regression: a hesitant press used to delete the player from the roster mid-game.
  it('treats a slow press as a tap, not as a removal', () => {
    const onSelect = renderPicker();
    hold(screen.getByRole('button', { name: '#7 Alex' }), 1000);
    expect(onSelect).toHaveBeenCalledWith('p1');
    // And the chip is announced as the player, not as a "Remove" action.
    expect(screen.getByRole('button', { name: '#7 Alex' })).toBeTruthy();
  });
});

describe('PlayerMultiPicker', () => {
  it('toggles a chip by id regardless of which others are already selected', () => {
    const { onToggle } = renderMultiPicker(['p2']);

    tap(screen.getByRole('button', { name: '#7 Alex' }));
    expect(onToggle).toHaveBeenCalledWith('p1');

    // Tapping an already-selected chip still reports just that one id, so the
    // caller (not the chip) decides it means "remove", leaving the other intact.
    tap(screen.getByRole('button', { name: '#9 Sam' }));
    expect(onToggle).toHaveBeenCalledWith('p2');
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('toggles on a slow press rather than removing anyone', () => {
    const { onToggle } = renderMultiPicker(['p1']);
    hold(screen.getByRole('button', { name: '#7 Alex' }), 1000);
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

describe('the order the pickers lay a roster out in', () => {
  const roster: PlayerInfo[] = [
    { id: 'a', number: '12', name: 'Marc' },
    { id: 'b', number: '', name: 'Zoe' },
    { id: 'c', number: '3', name: 'Laia' },
    { id: 'd', number: '21', name: '' },
    { id: 'e', number: '7', name: 'Anna' },
  ];
  const order = () =>
    screen.getAllByRole('button', { pressed: false }).map((b) => b.getAttribute('aria-label'));

  beforeEach(() => localStorage.clear());

  function renderWithToggle() {
    render(
      <I18nProvider>
        <PlayerSortToggle />
        <PlayerPicker players={roster} selected={null} onSelect={() => {}} />
      </I18nProvider>,
    );
  }

  // Numerically, not as text (3 before 12), and the unnumbered after the numbered.
  it('defaults to shirt number, like a team sheet', () => {
    renderWithToggle();
    expect(order()).toEqual(['#3 Laia', '#7 Anna', '#12 Marc', '#21', 'Zoe']);
  });

  it('switches every picker to names from the header toggle, and remembers it on this device', () => {
    renderWithToggle();
    fireEvent.click(screen.getByRole('button', { name: 'Sort players by name' }));

    // The unnamed go last, by number.
    expect(order()).toEqual(['#7 Anna', '#3 Laia', '#12 Marc', 'Zoe', '#21']);
    expect(localStorage.getItem('ultimate-scorekeeper:player-sort')).toBe('name');
  });
});

/**
 * As many columns as the list needs: a line of seven reads as one column of whole
 * names, and only a full squad is split three ways.
 */
describe('grid columns', () => {
  it('uses 1 column below 8 players, 2 up to 15, 3 from 16', () => {
    expect([1, 7, 8, 15, 16, 25].map(gridColumns)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  const team = (n: number): PlayerInfo[] =>
    Array.from({ length: n }, (_, i) => ({ id: `p${i}`, number: String(i + 1), name: `P${i}` }));
  const gridOf = (container: HTMLElement) => container.querySelector('.grid') as HTMLElement;

  it('lays a picker out by its own count', () => {
    const { container, unmount } = render(
      <I18nProvider>
        <PlayerPicker players={team(7)} selected={null} onSelect={() => {}} />
      </I18nProvider>,
    );
    expect(gridOf(container).className).toContain('grid-cols-1');
    unmount();
    const big = render(
      <I18nProvider>
        <PlayerPicker players={team(16)} selected={null} onSelect={() => {}} />
      </I18nProvider>,
    );
    expect(gridOf(big.container).className).toContain('grid-cols-3');
  });

  // The goal dialog's scorer step drops the assist: 8 offered as 7 must keep 2 columns.
  it('sizes on layoutCount when one is given', () => {
    const { container } = render(
      <I18nProvider>
        <PlayerPicker players={team(7)} layoutCount={8} selected={null} onSelect={() => {}} />
      </I18nProvider>,
    );
    expect(gridOf(container).className).toContain('grid-cols-2');
  });

  it('counts every group together in a grouped multi-picker', () => {
    const players = team(9).map(
      (p, i) => ({ ...p, gender: i < 4 ? 'female' : 'male' }) as PlayerInfo,
    );
    const { container } = render(
      <I18nProvider>
        <PlayerMultiPicker players={players} selected={[]} groupByGender onToggle={() => {}} />
      </I18nProvider>,
    );
    const grids = [...container.querySelectorAll('.grid')];
    expect(grids).toHaveLength(2);
    grids.forEach((g) => expect(g.className).toContain('grid-cols-2'));
  });
});
