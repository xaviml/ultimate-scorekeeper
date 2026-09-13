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

function section(title: string): HTMLElement {
  return screen.getByRole('heading', { name: title }).closest('section') as HTMLElement;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

/**
 * Half-time and timeouts each carry their on/off as an unlabelled switch in the
 * section heading. Off folds the section down to that heading.
 */
describe.each([
  ['Half-time', 'Play a half-time', 'break (seconds)'],
  ['Timeouts', 'Allow timeouts', 'Per team'],
])('the %s section toggle', (title, toggleName, fieldText) => {
  it('is on by default, with its settings shown', () => {
    renderConfigScreen();
    const box = within(section(title)).getByRole('checkbox', { name: toggleName });
    expect(box).toBeChecked();
    expect(within(section(title)).getByText(fieldText)).toBeInTheDocument();
  });

  it('folds the section down to its heading when switched off, and back', () => {
    renderConfigScreen();
    const box = within(section(title)).getByRole('checkbox', { name: toggleName });

    fireEvent.click(box);
    expect(box).not.toBeChecked();
    expect(within(section(title)).queryByText(fieldText)).toBeNull();
    expect(within(section(title)).getAllByRole('checkbox')).toHaveLength(1);

    fireEvent.click(box);
    expect(within(section(title)).getByText(fieldText)).toBeInTheDocument();
  });
});

describe('timeouts in the last 5 minutes', () => {
  it('are allowed by default, and switching that off records the restriction', () => {
    renderConfigScreen();
    const allow = within(section('Timeouts')).getByRole('checkbox', {
      name: 'Allow timeouts in the last 5 minutes of the game',
    });
    expect(allow).toBeChecked();

    fireEvent.click(allow);
    expect(allow).not.toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Save as template' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Summer League'), {
      target: { value: 'Strict' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(loadSavedTemplates()[0].settings.timeouts.disallowLastFiveMinutes).toBe(true);
  });
});

describe('half-time switched off', () => {
  it('no longer blocks the start on a half score above the target', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Ravens' } });
    fireEvent.change(screen.getByLabelText('Team 2'), { target: { value: 'Foxes' } });
    const half = within(section('Half-time'))
      .getByText('Score')
      .parentElement!.querySelector('input') as HTMLInputElement;
    fireEvent.change(half, { target: { value: '20' } });
    fireEvent.blur(half);
    expect(screen.getByText('Half-time score must be lower than the target score')).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Play a half-time' }));
    expect(screen.queryByText('Half-time score must be lower than the target score')).toBeNull();
  });

  it('hides the timeout allowance, and brings back per half with half-time', () => {
    renderConfigScreen();
    const timeouts = section('Timeouts');
    const allowance = () =>
      within(timeouts).queryByText('Allowance')?.parentElement!.querySelector('select') ?? null;
    fireEvent.change(allowance()!, { target: { value: 'half' } });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Play a half-time' }));
    expect(allowance()).toBeNull();
    expect(within(timeouts).getByText('Per team')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Play a half-time' }));
    expect(allowance()!.value).toBe('half');
  });

  it('is saved with a template and restored when it is applied', () => {
    renderConfigScreen();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Play a half-time' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save as template' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Summer League'), {
      target: { value: 'Pickup' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(loadSavedTemplates()[0].settings.halfTimeEnabled).toBe(false);

    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'predefined:grass' } });
    expect(screen.getByRole('checkbox', { name: 'Play a half-time' })).toBeChecked();

    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'custom:Pickup' } });
    expect(screen.getByRole('checkbox', { name: 'Play a half-time' })).not.toBeChecked();
  });
});
