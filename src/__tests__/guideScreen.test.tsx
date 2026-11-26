import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import App from '../App';

function renderConfigScreen() {
  return render(
    <I18nProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </I18nProvider>,
  );
}

/** The guide has one door now that the chip under the title is gone: the menu. */
const openGuide = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  fireEvent.click(screen.getByRole('button', { name: "Beginner's guide" }));
};

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('guide', () => {
  it('replaces the config screen instead of opening over it', () => {
    renderConfigScreen();

    openGuide();

    expect(screen.getByRole('heading', { name: "Beginner's guide" })).toBeInTheDocument();
    // A page, not a dialog: the form underneath is out of sight (kept mounted, hidden,
    // so what was typed survives the round trip).
    expect(screen.queryByRole('heading', { name: 'Game setup' })).toBeNull();
  });

  it('comes back to the config screen with what was typed still there', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES' } });

    openGuide();
    // The header's back button is the only way out — worded neutrally, since the
    // guide is now reached from the game screen too.
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByText('Game setup')).toBeInTheDocument();
    expect(screen.getByLabelText('Team 1')).toHaveValue('FOXES');
  });

  it('translates on the fly when the language is changed from its menu', () => {
    renderConfigScreen();
    openGuide();

    // The page header's menu reaches Settings, where the language is chosen.
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByText('Settings'));
    fireEvent.click(screen.getByRole('radio', { name: 'Català' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tancar' }));

    expect(screen.getByRole('heading', { name: 'Guia per a principiants' })).toBeInTheDocument();
    // And the choice sticks once the volunteer is back on the setup screen.
    fireEvent.click(screen.getByRole('button', { name: 'Enrere' }));
    expect(screen.getByText('Configuració del partit')).toBeInTheDocument();
  });
});
