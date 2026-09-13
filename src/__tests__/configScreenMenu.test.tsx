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
  it('replaces the old ⓘ with the four doors the setup screen has', () => {
    renderConfigScreen();
    openMenu();

    expect(screen.getByRole('button', { name: /Match History/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Beginner's guide/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Advanced guide/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /About/ })).toBeInTheDocument();
  });

  it('still opens the About dialog the ⓘ used to open', () => {
    renderConfigScreen();
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /About/ }));

    expect(screen.getByText(/designed for scorekeepers/)).toBeInTheDocument();
  });

  it('shows the build version, stamped in rather than fetched', () => {
    renderConfigScreen();
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: /About/ }));

    // The whole point is that the string is compiled into the bundle: a stale
    // PWA has to report the build it is actually running. So the assertion is
    // that `define` reached the code at all — an unwired one renders
    // "undefined" here, and the value itself is whatever git said at build.
    const line = screen.getByText(/^Version /);
    expect(line).toHaveTextContent(`Version ${__APP_VERSION__}`);
    expect(__APP_VERSION__).not.toMatch(/undefined/);
    expect(__APP_VERSION__.length).toBeGreaterThan(0);
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

  it('is the only door to either guide — the chip under the title is gone', () => {
    renderConfigScreen();
    // Both guides are named for their reader and live together in the menu, so a
    // second entrance to one of them would be the odd one out rather than a
    // shortcut. Nothing outside the menu opens either.
    expect(screen.queryByRole('button', { name: /guide/i })).toBeNull();

    openMenu();
    expect(screen.getByRole('button', { name: /Beginner's guide/ })).toBeInTheDocument();
  });
});
