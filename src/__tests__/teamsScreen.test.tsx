import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import { loadSavedTeams, saveTeam } from '../state/rosterStorage';
import { holdTeamsDraft } from '../state/teamsDraft';

/**
 * The Teams page (#/teams): the saved teams as a list or as YAML, both views editing
 * one unsaved draft that only Save writes back.
 */

function renderApp(address = '#/teams') {
  history.replaceState(null, '', address);
  return render(
    <I18nProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </I18nProvider>,
  );
}

async function pressBack() {
  await act(async () => {
    const popped = new Promise((resolve) =>
      window.addEventListener('popstate', resolve, { once: true }),
    );
    history.back();
    await popped;
  });
}

const view = (name: 'Visual' | 'YAML') => screen.getByRole('radio', { name });
const yamlBox = () => screen.getByRole('textbox', { name: 'Teams as YAML' }) as HTMLTextAreaElement;
const saveButton = () => screen.queryByRole('button', { name: 'Save' });
const teamRows = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-team-row]')].map((r) => r.getAttribute('data-team-row'));

async function openYaml() {
  fireEvent.click(view('YAML'));
  await waitFor(() => expect(yamlBox()).not.toBeDisabled());
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  holdTeamsDraft(null);
  saveTeam({
    name: 'RAVENS',
    color: '#1f6feb',
    players: [
      { id: 'a', number: '7', name: 'Ada', gender: 'female' },
      { id: 'b', number: '12', name: 'Marc' },
    ],
    lines: [{ id: 'l', name: 'O1', playerKeys: ['7|ada'] }],
  });
  saveTeam({ name: 'FOXES', color: '#e5534b', players: [] });
});

describe('the Teams page', () => {
  it('is reached from the setup screen menu', () => {
    renderApp('#/');
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Teams' }));
    expect(location.hash).toBe('#/teams');
    expect(screen.getByRole('heading', { name: 'Teams', level: 1 })).toBeInTheDocument();
  });

  it('lists the saved teams with their roster and lines, sorted by name', () => {
    const { container } = renderApp();
    expect(teamRows(container)).toEqual(['FOXES', 'RAVENS']);
    const ravens = container.querySelector('[data-team-row="RAVENS"]') as HTMLElement;
    expect(ravens).toHaveTextContent('2 players · 1 line');
    expect(saveButton()).toBeNull();
  });

  it('keeps edits in a draft until Save, then writes them', () => {
    const { container } = renderApp();
    fireEvent.click(container.querySelector('[data-team-row="FOXES"]') as HTMLElement);
    const sheet = screen.getByRole('heading', { name: 'FOXES' }).closest('div.bg-panel')!;
    fireEvent.change(within(sheet as HTMLElement).getByLabelText('Team name'), {
      target: { value: 'Foxes B' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(teamRows(container)).toEqual(['FOXES B', 'RAVENS']);
    expect(loadSavedTeams().map((t) => t.name)).toContain('FOXES');

    // A rename is not a deletion, so Save asks nothing.
    fireEvent.click(saveButton()!);
    expect(
      loadSavedTeams()
        .map((t) => t.name)
        .sort(),
    ).toEqual(['FOXES B', 'RAVENS']);
    expect(saveButton()).toBeNull();
  });

  it('carries unsaved work from the list into the YAML and back', async () => {
    const { container } = renderApp();
    fireEvent.click(container.querySelector('[data-team-row="RAVENS"]') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Remove team' }));
    expect(teamRows(container)).toEqual(['FOXES']);

    await openYaml();
    expect(yamlBox().value).not.toContain('RAVENS');
    expect(saveButton()).toBeInTheDocument();

    fireEvent.change(yamlBox(), {
      target: { value: yamlBox().value + 'OWLS:\n  color: "#00aa00"\n  players:\n    - 3 Kim\n' },
    });
    fireEvent.click(view('Visual'));
    expect(teamRows(container)).toEqual(['FOXES', 'OWLS']);
    expect(
      loadSavedTeams()
        .map((t) => t.name)
        .sort(),
    ).toEqual(['FOXES', 'RAVENS']);
  });

  it('refuses to leave YAML that cannot be read, and Discard is the way out', async () => {
    const { container } = renderApp();
    await openYaml();
    fireEvent.change(yamlBox(), { target: { value: 'RAVENS:\n  color: red\n' } });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Line 2:');
    expect(alert.getAttribute('data-yaml-error')).toBe('teamsYamlErrColor');
    expect(saveButton()).toBeDisabled();

    fireEvent.click(view('Visual'));
    expect(view('YAML')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('discard your changes');

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(view('Visual'));
    expect(teamRows(container)).toEqual(['FOXES', 'RAVENS']);
  });

  it('replaces every team with pasted YAML, asking first about the ones it deletes', async () => {
    renderApp();
    await openYaml();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(yamlBox().value).toBe('');
    fireEvent.change(yamlBox(), {
      target: {
        value:
          'KITES:\n  color: "#ff8800"\n  players:\n    - 1 Ana FMP\n    - 2 Bo\n  lines:\n    O1: [1, 2]\n',
      },
    });
    fireEvent.click(saveButton()!);

    const confirm = screen.getByRole('heading', { name: 'Save teams?' }).parentElement!
      .parentElement!;
    expect(confirm).toHaveTextContent('FOXES, RAVENS');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Save' }));

    const stored = loadSavedTeams();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: 'KITES', color: '#ff8800' });
    expect(stored[0].players.map((p) => [p.number, p.name, p.gender])).toEqual([
      ['1', 'Ana', 'female'],
      ['2', 'Bo', undefined],
    ]);
    expect(stored[0].lines?.[0].playerKeys).toEqual(['1|ana', '2|bo']);
  });

  it('asks before the back arrow or the back gesture discards unsaved work', async () => {
    renderApp('#/');
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Teams' }));
    const row = () => document.querySelector('[data-team-row="FOXES"]') as HTMLElement;
    fireEvent.click(row());
    fireEvent.click(screen.getByRole('button', { name: 'Remove team' }));

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Leave without saving?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await pressBack();
    await waitFor(() => expect(location.hash).toBe('#/teams'));
    expect(screen.getByRole('heading', { name: 'Leave without saving?' })).toBeInTheDocument();
    // The draft survived the round trip.
    expect(row()).toBeNull();

    const confirm = screen.getByRole('heading', { name: 'Leave without saving?' }).parentElement!
      .parentElement!;
    fireEvent.click(within(confirm).getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(location.hash).toBe('#/'));
    expect(
      loadSavedTeams()
        .map((t) => t.name)
        .sort(),
    ).toEqual(['FOXES', 'RAVENS']);
  });

  it('brings the setup form up to date with a team edited here', async () => {
    renderApp('#/');
    fireEvent.focus(screen.getByLabelText('Team 1'));
    fireEvent.click(screen.getByRole('button', { name: 'RAVENS' }));

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Teams' }));
    await openYaml();
    fireEvent.change(yamlBox(), {
      target: { value: 'RAVENS:\n  color: "#1f6feb"\n  players:\n    - 7 Ada FMP\n    - 99 New\n' },
    });
    fireEvent.click(saveButton()!);
    // FOXES is deleted, so Save asks.
    const confirm = screen.getByRole('heading', { name: 'Save teams?' }).parentElement!
      .parentElement!;
    fireEvent.click(within(confirm).getByRole('button', { name: 'Save' }));

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(location.hash).toBe('#/'));
    fireEvent.click(document.querySelector('[data-roster-team="A"]') as HTMLElement);
    expect(screen.getByText('#99 New')).toBeInTheDocument();
    expect(screen.queryByText('#12 Marc')).toBeNull();
  });
});
