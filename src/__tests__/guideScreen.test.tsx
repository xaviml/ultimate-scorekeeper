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
    // A page, not a dialog: the form underneath is gone, not merely covered.
    expect(screen.queryByText('Game setup')).toBeNull();
  });

  it('comes back to the config screen with what was typed still there', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Foxes' } });

    openGuide();
    // The header's back button is the only way out — worded neutrally, since the
    // guide is now reached from the game screen too.
    fireEvent.click(screen.getByRole('button', { name: '← Back' }));

    expect(screen.getByText('Game setup')).toBeInTheDocument();
    expect(screen.getByLabelText('Team 1')).toHaveValue('Foxes');
  });

  it('translates on the fly from its own language picker', () => {
    renderConfigScreen();
    openGuide();

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'ca' } });

    expect(screen.getByRole('heading', { name: 'Guia per a principiants' })).toBeInTheDocument();
    // And the choice sticks once the volunteer is back on the setup screen.
    fireEvent.click(screen.getByRole('button', { name: '← Enrere' }));
    expect(screen.getByText('Configuració del partit')).toBeInTheDocument();
  });
});
