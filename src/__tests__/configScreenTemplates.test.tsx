import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import ConfigScreen from '../components/ConfigScreen';
import { loadSavedTemplates } from '../state/templates';

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
    expect(fieldSelect('Allowance').value).toBe('game');
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

  it('applies the Grass preset: 7-minute half-time break, 2 timeouts per game', () => {
    renderConfigScreen();

    fireEvent.change(screen.getByLabelText('Template'), {
      target: { value: 'predefined:grass' },
    });

    expect(fieldInput('break (seconds)').value).toBe('420');
    expect(fieldInput('Per team').value).toBe('2');
    expect(fieldSelect('Allowance').value).toBe('game');
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
    expect(fieldSelect('Allowance').value).toBe('game');
  });
});

describe('updating a saved template', () => {
  /** Saves the current settings as a new template under `name`, through the dialog. */
  function saveNew(name: string) {
    fireEvent.click(screen.getByRole('button', { name: 'Save as template' }));
    const newTab = screen.queryByRole('tab', { name: 'New template' });
    if (newTab) fireEvent.click(newTab);
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  }

  function setBreak(seconds: string) {
    const input = fieldInput('break (seconds)');
    fireEvent.change(input, { target: { value: seconds } });
    fireEvent.blur(input);
  }

  it('opens on the template in use and overwrites it, rather than adding a second one', () => {
    renderConfigScreen();
    saveNew('League');
    setBreak('300');

    fireEvent.click(screen.getByRole('button', { name: 'Save as template' }));
    expect(screen.getByRole('tab', { name: 'Update existing' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'League' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    const saved = loadSavedTemplates();
    expect(saved.map((t) => t.name)).toEqual(['League']);
    expect(saved[0].settings.halfTimeBreakSeconds).toBe(300);
  });

  it('can update a template other than the one in use', () => {
    renderConfigScreen();
    saveNew('League');
    saveNew('Cup');
    setBreak('120');

    fireEvent.click(screen.getByRole('button', { name: 'Save as template' }));
    fireEvent.click(screen.getByRole('radio', { name: 'League' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    const byName = Object.fromEntries(loadSavedTemplates().map((t) => [t.name, t.settings]));
    expect(byName.League.halfTimeBreakSeconds).toBe(120);
    expect(byName.Cup.halfTimeBreakSeconds).toBe(420);
    expect((screen.getByLabelText('Template') as HTMLSelectElement).value).toBe('custom:League');
  });

  it('warns before a new name overwrites a saved one, and keeps the saved spelling', () => {
    renderConfigScreen();
    saveNew('League');

    fireEvent.click(screen.getByRole('button', { name: 'Save as template' }));
    fireEvent.click(screen.getByRole('tab', { name: 'New template' }));
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: 'league ' } });

    expect(screen.getByText(/already exists/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(loadSavedTemplates().map((t) => t.name)).toEqual(['League']);
  });

  it('still creates a new template when others exist', () => {
    renderConfigScreen();
    saveNew('League');
    saveNew('Cup');

    expect(loadSavedTemplates().map((t) => t.name)).toEqual(['League', 'Cup']);
  });
});
