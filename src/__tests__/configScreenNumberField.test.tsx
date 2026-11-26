import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import ConfigScreen from '../components/ConfigScreen';
import { choose, openRules } from './configFields';

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
function fieldInput(labelText: string, index = 0): HTMLInputElement {
  // "Score" and "Time" each label two fields (the game's and the half's), in that order.
  const label = screen.getAllByText(labelText)[index];
  return label.parentElement!.querySelector('input') as HTMLInputElement;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('config screen numeric fields', () => {
  it('lets a value be cleared and retyped, clamping only on blur', () => {
    renderConfigScreen();

    const input = fieldInput('Break');
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');

    // 9999 is over the 1800 maximum — it stays typed until the field loses focus.
    fireEvent.change(input, { target: { value: '9999' } });
    expect(input.value).toBe('9999');
    fireEvent.blur(input);
    expect(fieldInput('Break').value).toBe('1800');
  });

  it('keeps a blurred empty field on its last committed value', () => {
    renderConfigScreen();

    const input = fieldInput('Break');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(fieldInput('Break').value).toBe('420');
  });

  it('commits an in-range value as it is typed', () => {
    renderConfigScreen();

    // "4" is under the 15-minute half-time limit on the way to "40", so it is not
    // rewritten mid-edit; the committed 40 then caps the half-time limit below it.
    const input = fieldInput('Time');
    fireEvent.change(input, { target: { value: '4' } });
    expect(input.value).toBe('4');
    fireEvent.change(input, { target: { value: '40' } });
    fireEvent.blur(input);

    expect(fieldInput('Time').value).toBe('40');
    expect(fieldInput('Time', 1).value).toBe('40');
  });

  it('drops a half-typed value when a template is applied over it', () => {
    renderConfigScreen();

    fireEvent.change(fieldInput('Break'), { target: { value: '12' } });
    choose('Template', 'predefined:beach');

    expect(fieldInput('Break').value).toBe('0');
  });
});
