import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import ConfigScreen from '../components/ConfigScreen';
import { loadSavedTemplates } from '../state/templates';
import { choose, chosen, openRules } from './configFields';

function renderConfigScreen() {
  const view = render(
    <I18nProvider>
      <GameProvider>
        <ConfigScreen />
      </GameProvider>
    </I18nProvider>,
  );
  // These tests are about the rules, which start folded to their summaries.
  openRules();
  return view;
}

/** Labels sit above their input as plain sibling text, not an associated <label for>. */
function fieldInput(labelText: string): HTMLInputElement {
  const label = screen.getByText(labelText);
  return label.parentElement!.querySelector('input') as HTMLInputElement;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('config screen template picker', () => {
  it('defaults to the Grass template on a fresh config screen', () => {
    renderConfigScreen();

    expect(chosen('Template')).toBe('predefined:grass');
    expect(fieldInput('Break').value).toBe('420');
    expect(fieldInput('Per team').value).toBe('2');
    expect(chosen('Allowance')).toBe('game');
  });

  it('applies the Beach preset: no half-time break, 1 timeout per game', () => {
    renderConfigScreen();

    choose('Template', 'predefined:beach');

    expect(fieldInput('Break').value).toBe('0');
    expect(fieldInput('Per team').value).toBe('1');
    expect(chosen('Allowance')).toBe('game');
  });

  it('applies the Grass preset: 7-minute half-time break, 2 timeouts per game', () => {
    renderConfigScreen();

    choose('Template', 'predefined:grass');

    expect(fieldInput('Break').value).toBe('420');
    expect(fieldInput('Per team').value).toBe('2');
    expect(chosen('Allowance')).toBe('game');
  });

  it('does not touch team names when a preset is applied', () => {
    renderConfigScreen();
    const teamAInput = screen.getByLabelText('Team 1') as HTMLInputElement;
    fireEvent.change(teamAInput, { target: { value: 'Foxes' } });

    choose('Template', 'predefined:beach');

    expect((screen.getByLabelText('Team 1') as HTMLInputElement).value).toBe('Foxes');
  });
});

describe('save / delete a custom template', () => {
  it('saves the current settings under a name and offers it back for selection', () => {
    renderConfigScreen();
    choose('Template', 'predefined:beach');

    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Summer League'), {
      target: { value: 'My Tourney' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Dialog closed.
    expect(screen.queryByPlaceholderText('e.g. Summer League')).toBeNull();

    expect(screen.getByRole('radio', { name: 'My Tourney' })).toBeInTheDocument();
    expect(chosen('Template')).toBe('custom:My Tourney');
  });

  it('deletes the selected custom template and resets the fields back to Grass, not just the label', () => {
    renderConfigScreen();
    // Base it on Beach so its saved values actually differ from Grass.
    choose('Template', 'predefined:beach');
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Summer League'), {
      target: { value: 'Temp' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('radio', { name: 'Temp' })).toBeInTheDocument();
    expect(fieldInput('Break').value).toBe('0');

    fireEvent.click(screen.getByText('Delete template'));
    const dialogTitle = screen.getByText('Delete saved template?');
    const dialog = dialogTitle.closest('.fixed') as HTMLElement;
    fireEvent.click(within(dialog).getByText('Delete template'));

    expect(screen.queryByRole('radio', { name: 'Temp' })).toBeNull();
    expect(chosen('Template')).toBe('predefined:grass');
    // The dropdown falling back to Grass must actually re-apply Grass's values —
    // showing "Grass" selected while Beach's numbers linger would be worse than
    // showing nothing at all.
    expect(fieldInput('Break').value).toBe('420');
    expect(fieldInput('Per team').value).toBe('2');
    expect(chosen('Allowance')).toBe('game');
  });
});

describe('updating a saved template', () => {
  /** Saves the current settings as a new template under `name`, through the dialog. */
  function saveNew(name: string) {
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    const newTab = screen.queryByRole('tab', { name: 'New template' });
    if (newTab) fireEvent.click(newTab);
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  }

  /** The save dialog, whose "update existing" list is radios too — like the template chips. */
  function saveDialog() {
    return screen.getByRole('tab', { name: 'Update existing' }).closest('.fixed') as HTMLElement;
  }

  function setBreak(seconds: string) {
    const input = fieldInput('Break');
    fireEvent.change(input, { target: { value: seconds } });
    fireEvent.blur(input);
  }

  it('opens on the template in use and overwrites it, rather than adding a second one', () => {
    renderConfigScreen();
    saveNew('League');
    setBreak('300');

    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    expect(screen.getByRole('tab', { name: 'Update existing' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(saveDialog()).getByRole('radio', { name: 'League' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
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

    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    fireEvent.click(within(saveDialog()).getByRole('radio', { name: 'League' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    const byName = Object.fromEntries(loadSavedTemplates().map((t) => [t.name, t.settings]));
    expect(byName.League.halfTimeBreakSeconds).toBe(120);
    expect(byName.Cup.halfTimeBreakSeconds).toBe(420);
    expect(chosen('Template')).toBe('custom:League');
  });

  it('warns before a new name overwrites a saved one, and keeps the saved spelling', () => {
    renderConfigScreen();
    saveNew('League');

    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
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
