import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { GameProvider } from '../state/GameContext';
import ConfigScreen from '../components/ConfigScreen';
import { openRoster, rosterSheet } from './configFields';

function renderConfigScreen() {
  return render(
    <I18nProvider>
      <GameProvider>
        <ConfigScreen />
      </GameProvider>
    </I18nProvider>,
  );
}

/** The importer opens from a team's roster sheet, which every team has whatever is tracked. */
function openImporter(team: 'A' | 'B' = 'A') {
  renderConfigScreen();
  // A roster only shows once its team is named.
  fireEvent.change(screen.getByLabelText('Team 1'), { target: { value: 'FOXES' } });
  fireEvent.change(screen.getByLabelText('Team 2'), { target: { value: 'WOLVES' } });
  openRoster(team);
  fireEvent.click(within(rosterSheet()).getByRole('button', { name: 'Import' }));
}

const paste = (text: string) =>
  fireEvent.change(screen.getByLabelText('Players to import'), { target: { value: text } });

const importButton = () => screen.getByRole('button', { name: /^Import \d+$/ });

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('roster import dialog', () => {
  it('previews what was pasted before anything is applied', () => {
    openImporter();
    paste('12 Anna Smith\n7 Marc Puig');

    const preview = screen.getByTestId('roster-import-preview');
    expect(within(preview).getByText('Anna Smith')).toBeInTheDocument();
    expect(within(preview).getByText('Marc Puig')).toBeInTheDocument();
    expect(screen.getByText('2 players found')).toBeInTheDocument();
    // Still only a preview — the roster underneath is untouched.
    expect(within(rosterSheet()).getByText('No players added yet.')).toBeInTheDocument();
  });

  it('adds the parsed players to the roster on import', () => {
    openImporter();
    paste('12 Anna Smith\n7 Marc Puig');
    fireEvent.click(importButton());

    expect(screen.queryByTestId('roster-import-preview')).toBeNull();
    expect(screen.getByText('#12 Anna Smith')).toBeInTheDocument();
    expect(screen.getByText('#7 Marc Puig')).toBeInTheDocument();
  });

  it('imports into the team whose button was pressed', () => {
    openImporter('B');
    paste('12 Anna Smith');
    fireEvent.click(importButton());

    // That team's roster has the player; the other's row still reads empty.
    expect(within(rosterSheet()).getByText('#12 Anna Smith')).toBeInTheDocument();
    expect(document.querySelector('[data-roster-team="B"]')!.textContent).toContain('1 player');
    expect(document.querySelector('[data-roster-team="A"]')!.textContent).toContain(
      'No players yet',
    );
  });

  it('skips players already on the roster, and says so', () => {
    openImporter();
    paste('12 Anna Smith');
    fireEvent.click(importButton());

    fireEvent.click(screen.getAllByRole('button', { name: 'Import' })[0]);
    paste('12 Anna Smith\n7 Marc Puig');
    expect(screen.getByText('1 already on the roster')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import 1' }));

    expect(screen.getAllByText('#12 Anna Smith')).toHaveLength(1);
    expect(screen.getByText('#7 Marc Puig')).toBeInTheDocument();
  });

  it('replaces the roster when the replace box is ticked', () => {
    openImporter();
    paste('12 Anna Smith');
    fireEvent.click(importButton());

    fireEvent.click(screen.getAllByRole('button', { name: 'Import' })[0]);
    paste('7 Marc Puig');
    fireEvent.click(screen.getByLabelText('Replace the current roster (1)'));
    fireEvent.click(importButton());

    expect(screen.queryByText('#12 Anna Smith')).toBeNull();
    expect(screen.getByText('#7 Marc Puig')).toBeInTheDocument();
  });

  it('cannot import nothing', () => {
    openImporter();
    expect(importButton()).toBeDisabled();
    paste('-----');
    expect(screen.getByText('Nothing recognised yet.')).toBeInTheDocument();
    expect(importButton()).toBeDisabled();
  });

  it('reads a chosen text file into the same box, so the preview is what gets imported', async () => {
    openImporter();
    const file = new File(['12 Anna Smith\n7 Marc Puig'], 'roster.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    // The file lands in the box, so the preview below it is the file's contents.
    const preview = await screen.findByTestId('roster-import-preview');
    expect(within(preview).getByText('Anna Smith')).toBeInTheDocument();
    expect(within(preview).getByText('Marc Puig')).toBeInTheDocument();
    expect((screen.getByLabelText('Players to import') as HTMLTextAreaElement).value).toBe(
      '12 Anna Smith\n7 Marc Puig',
    );

    fireEvent.click(importButton());
    expect(screen.getByText('#12 Anna Smith')).toBeInTheDocument();
  });

  it('refuses a file that is not plain text, rather than parsing it into nonsense', async () => {
    openImporter();
    const file = new File(['[{"name":"Anna Smith"}]'], 'roster.json', {
      type: 'application/json',
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(
      await screen.findByText('Only plain text (.txt) files can be imported, in the format above.'),
    ).toBeInTheDocument();
    expect((screen.getByLabelText('Players to import') as HTMLTextAreaElement).value).toBe('');
    expect(importButton()).toBeDisabled();
  });
});
