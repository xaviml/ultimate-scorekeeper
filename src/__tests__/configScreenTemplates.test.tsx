import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
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

/** Labels sit above their input as plain sibling text, not an associated <label for>. */
function fieldInput(labelText: string): HTMLInputElement {
  const label = screen.getByText(labelText);
  return label.parentElement!.querySelector('input') as HTMLInputElement;
}

function fieldSelect(labelText: string): HTMLSelectElement {
  const label = screen.getByText(labelText);
  return label.parentElement!.querySelector('select') as HTMLSelectElement;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('config screen template picker', () => {
  it('defaults to the Grass template on a fresh config screen', () => {
    renderConfigScreen();

    expect((screen.getByLabelText('Template') as HTMLSelectElement).value).toBe('predefined:grass');
    expect(fieldInput('break (seconds)').value).toBe('420');
    expect(fieldInput('Per team').value).toBe('2');
    expect(fieldSelect('Allowance').value).toBe('half');
  });

  it('applies the Beach preset: no half-time break, 1 timeout per game', () => {
    renderConfigScreen();

    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'predefined:beach' },
    });

    expect(fieldInput('break (seconds)').value).toBe('0');
    expect(fieldInput('Per team').value).toBe('1');
    expect(fieldSelect('Allowance').value).toBe('game');
  });

  it('applies the Grass preset: 7-minute half-time break, 2 timeouts per half', () => {
    renderConfigScreen();

    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'predefined:grass' },
    });

    expect(fieldInput('break (seconds)').value).toBe('420');
    expect(fieldInput('Per team').value).toBe('2');
    expect(fieldSelect('Allowance').value).toBe('half');
  });

  it('does not touch team names when a preset is applied', () => {
    renderConfigScreen();
    const teamAInput = screen.getByLabelText('Team 1') as HTMLInputElement;
    fireEvent.change(teamAInput, { target: { value: 'Foxes' } });

    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'predefined:beach' },
    });

    expect((screen.getByLabelText('Team 1') as HTMLInputElement).value).toBe('Foxes');
  });
});

describe('save / delete a custom template', () => {
  it('saves the current settings under a name and offers it back for selection', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'predefined:beach' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save as template' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Summer League'), {
      target: { value: 'My Tourney' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Dialog closed.
    expect(screen.queryByPlaceholderText('e.g. Summer League')).toBeNull();

    const select = screen.getByLabelText('Template') as HTMLSelectElement;
    expect(within(select).getByRole('option', { name: 'My Tourney' })).toBeInTheDocument();
    expect(select.value).toBe('custom:My Tourney');
  });

  it('deletes the selected custom template and resets the fields back to Grass, not just the label', () => {
    renderConfigScreen();
    // Base it on Beach so its saved values actually differ from Grass.
    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'predefined:beach' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save as template' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Summer League'), {
      target: { value: 'Temp' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const select = screen.getByLabelText('Template') as HTMLSelectElement;
    expect(within(select).getByRole('option', { name: 'Temp' })).toBeInTheDocument();
    expect(fieldInput('break (seconds)').value).toBe('0');

    fireEvent.click(screen.getByText('Delete template'));
    const dialogTitle = screen.getByText('Delete saved template?');
    const dialog = dialogTitle.closest('.fixed') as HTMLElement;
    fireEvent.click(within(dialog).getByText('Delete template'));

    expect(within(select).queryByRole('option', { name: 'Temp' })).toBeNull();
    expect(select.value).toBe('predefined:grass');
    // The dropdown falling back to Grass must actually re-apply Grass's values —
    // showing "Grass" selected while Beach's numbers linger would be worse than
    // showing nothing at all.
    expect(fieldInput('break (seconds)').value).toBe('420');
    expect(fieldInput('Per team').value).toBe('2');
    expect(fieldSelect('Allowance').value).toBe('half');
  });
});
