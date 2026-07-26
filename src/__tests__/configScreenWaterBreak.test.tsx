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

const SCORES_LABEL = 'When the first team reaches';

function expand() {
  fireEvent.click(screen.getByRole('button', { name: 'Expand Water breaks' }));
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('config screen water break section', () => {
  it('is collapsed by default, and folds back open on toggle', () => {
    renderConfigScreen();

    expect(screen.queryByLabelText(SCORES_LABEL)).toBeNull();

    expand();

    expect(screen.getByLabelText(SCORES_LABEL)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse Water breaks' })).toBeInTheDocument();
  });

  it('ships the WFDF hot-weather defaults, switched off', () => {
    renderConfigScreen();
    expand();

    const enabled = screen.getByLabelText('Call water breaks automatically');
    expect(enabled).not.toBeChecked();
    // Off only silences the automatic breaks — a manual one still uses this duration,
    // so the field stays editable while the scores don't.
    expect(screen.getByLabelText(SCORES_LABEL)).toBeDisabled();
    expect(screen.getByLabelText(SCORES_LABEL)).toHaveValue('4, 12');
    expect(screen.getByLabelText('Water break duration (seconds)')).toHaveValue('180');

    fireEvent.click(enabled);
    expect(screen.getByLabelText(SCORES_LABEL)).toBeEnabled();
  });

  it('normalises the trigger scores on blur, not on every keystroke', () => {
    renderConfigScreen();
    expand();
    fireEvent.click(screen.getByLabelText('Call water breaks automatically'));

    const scores = screen.getByLabelText(SCORES_LABEL);
    // Halfway through typing "10, 4" the field must not reorder itself.
    fireEvent.change(scores, { target: { value: '10, ' } });
    expect(scores).toHaveValue('10, ');

    fireEvent.change(scores, { target: { value: '10, 4, 4, abc, 0' } });
    fireEvent.blur(scores);

    // Sorted, de-duplicated, and anything that isn't a real score dropped.
    expect(scores).toHaveValue('4, 10');
  });
});
