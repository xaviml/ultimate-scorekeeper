import { fireEvent, render, screen } from '@testing-library/react';
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

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('config screen numeric fields', () => {
  it('lets a value be cleared and retyped, clamping only on blur', () => {
    renderConfigScreen();

    const input = fieldInput('break (seconds)');
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');

    // 9999 is over the 1800 maximum — it stays typed until the field loses focus.
    fireEvent.change(input, { target: { value: '9999' } });
    expect(input.value).toBe('9999');
    fireEvent.blur(input);
    expect(fieldInput('break (seconds)').value).toBe('1800');
  });

  it('keeps a blurred empty field on its last committed value', () => {
    renderConfigScreen();

    const input = fieldInput('break (seconds)');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(fieldInput('break (seconds)').value).toBe('420');
  });

  it('commits an in-range value as it is typed', () => {
    renderConfigScreen();

    // "4" is under the 15-minute half-time limit on the way to "40", so it is not
    // rewritten mid-edit; the committed 40 then caps the half-time limit below it.
    const input = fieldInput('Time (minutes)');
    fireEvent.change(input, { target: { value: '4' } });
    expect(input.value).toBe('4');
    fireEvent.change(input, { target: { value: '40' } });
    fireEvent.blur(input);

    expect(fieldInput('Time (minutes)').value).toBe('40');
    expect(fieldInput('TIME (Minutes)').value).toBe('40');
  });

  it('drops a half-typed value when a template is applied over it', () => {
    renderConfigScreen();

    fireEvent.change(fieldInput('break (seconds)'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'predefined:beach' } });

    expect(fieldInput('break (seconds)').value).toBe('0');
  });
});
