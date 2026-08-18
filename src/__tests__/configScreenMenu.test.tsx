import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import ConfigScreen from '../components/ConfigScreen';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';

function renderConfigScreen() {
  return render(
    <I18nProvider>
      <GameProvider>
        <ConfigScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Menu' }));

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('the setup screen header menu', () => {
  it('replaces the old ⓘ with the three doors the setup screen has', () => {
    renderConfigScreen();
    openMenu();

    expect(screen.getByRole('button', { name: /Match History/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /How to use this app/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /About/ })).toBeInTheDocument();
  });

  it('still opens the About dialog the ⓘ used to open', () => {
    renderConfigScreen();
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /About/ }));

    expect(screen.getByText(/designed for scorekeepers/)).toBeInTheDocument();
  });

  it('opens the past-games screen over the form, and leaves it as it was', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Ravens' } });

    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /Match History/ }));
    expect(screen.getByRole('heading', { name: 'Match History' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    // The form was mounted underneath the whole time, so what was typed survives.
    expect(screen.getByLabelText('Team 1')).toHaveValue('Ravens');
  });

  it('keeps the walkthrough link under the tagline, where a first-timer finds it', () => {
    renderConfigScreen();
    expect(screen.getByRole('button', { name: 'How does this app work?' })).toBeInTheDocument();
  });
});
