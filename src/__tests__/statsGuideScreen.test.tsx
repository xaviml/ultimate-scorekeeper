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
const openStatsGuide = () => {
  openMenu();
  fireEvent.click(screen.getByRole('button', { name: 'Advanced guide' }));
};

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('the statistics guide', () => {
  it('is a second row in the setup menu, under the walkthrough', () => {
    renderConfigScreen();
    openMenu();

    const rows = screen.getAllByRole('button').map((b) => b.textContent);
    expect(rows).toContain('Advanced guide');
    expect(rows.indexOf("Beginner's guide")).toBeLessThan(rows.indexOf('Advanced guide'));
  });

  it('replaces the config screen instead of opening over it', () => {
    renderConfigScreen();

    openStatsGuide();

    expect(screen.getByRole('heading', { name: 'Advanced guide' })).toBeInTheDocument();
    // A page, not a dialog: the form underneath is gone, not merely covered.
    expect(screen.queryByText('Game setup')).toBeNull();
  });

  it('comes back to the config screen with what was typed still there', () => {
    renderConfigScreen();
    fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'Ravens' } });

    openStatsGuide();
    fireEvent.click(screen.getByRole('button', { name: '← Back' }));

    expect(screen.getByText('Game setup')).toBeInTheDocument();
    expect(screen.getByLabelText('Team 1')).toHaveValue('Ravens');
  });

  it('translates on the fly from its own language picker, like the walkthrough', () => {
    renderConfigScreen();
    openStatsGuide();

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'es' } });

    expect(screen.getByRole('heading', { name: 'Guía avanzada' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '← Volver' }));
    expect(screen.getByText('Configuración del partido')).toBeInTheDocument();
  });

  it('explains every figure the report can show, so no column is left undefined', () => {
    renderConfigScreen();
    openStatsGuide();

    // The team table's rows, in the words the report itself uses — a figure the
    // guide names differently is a figure it does not explain. `getAllByText`
    // because several of them are named twice on purpose: once where the row is
    // explained, once in the closing "what each figure counts" list.
    for (const label of [
      'O-line holds',
      'Clean holds',
      'Break chances',
      'Turnovers',
      'Break points',
      'Clean breaks',
      'Timeouts used',
    ]) {
      expect(screen.getAllByText(new RegExp(label)).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/Playing — needs line tracking/)).toBeInTheDocument();
    expect(screen.getByText(/Possession — needs turnover attribution/)).toBeInTheDocument();
  });
});
