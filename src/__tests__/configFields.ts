import { fireEvent, screen } from '@testing-library/react';

/*
 * The setup screen asks most of its questions with segmented buttons (`Segmented`)
 * and a few with a native `<select>`. These helpers find a field by its visible label
 * and drive whichever it is, so a test reads the same either way — and does not have
 * to change if a field moves from one control to the other.
 */

function fieldOf(labelText: string): HTMLElement {
  return screen.getByText(labelText).parentElement!;
}

/** Picks `value` (an option's value, or a segment's `data-value`) in the labelled field. */
export function choose(labelText: string, value: string): void {
  const field = fieldOf(labelText);
  const select = field.querySelector('select');
  if (select) {
    fireEvent.change(select, { target: { value } });
    return;
  }
  const segment = field.querySelector<HTMLElement>(`[data-value="${value}"]`);
  if (!segment) throw new Error(`No "${value}" in the "${labelText}" field`);
  fireEvent.click(segment);
}

/** The value currently picked in the labelled field. */
export function chosen(labelText: string): string | null {
  const field = fieldOf(labelText);
  const select = field.querySelector('select');
  if (select) return select.value;
  return field.querySelector('[aria-checked="true"]')?.getAttribute('data-value') ?? null;
}

/** Every value the labelled field offers. */
export function choices(labelText: string): string[] {
  const field = fieldOf(labelText);
  const select = field.querySelector('select');
  if (select) return Array.from(select.options).map((o) => o.value);
  return Array.from(field.querySelectorAll('[data-value]')).map((el) =>
    el.getAttribute('data-value')!,
  );
}

/** Opens a team's roster sheet from its row in the Teams card. */
export function openRoster(team: 'A' | 'B' = 'A'): void {
  const row = document.querySelector(`[data-roster-team="${team}"]`);
  if (!row)
    throw new Error(`No roster row for team ${team} — it only shows once the team is named`);
  fireEvent.click(row);
}

/** The open roster sheet. */
export function rosterSheet(): HTMLElement {
  return screen.getByRole('heading', { name: 'Roster' }).closest('.fixed') as HTMLElement;
}

/** Unfolds the rule sections, which start folded to their one-line summaries. */
export function openRules(): void {
  for (const button of screen.queryAllByRole('button', {
    name: /^Expand (Win conditions|Half-time|Timeouts|Water breaks)$/,
  }))
    fireEvent.click(button);
}

/** The Statistics switch in the section heading — off is the score-only game. */
export function statsSwitch(): HTMLInputElement {
  return screen.getByLabelText('Record statistics') as HTMLInputElement;
}

/**
 * Sets how much the game records, the way a volunteer does: the Statistics switch
 * for on/off, then Team or Player for the detail. `'none'` is the switch off.
 */
export function track(mode: 'none' | 'teams' | 'players'): void {
  const on = statsSwitch().checked;
  if ((mode === 'none') === on) fireEvent.click(statsSwitch());
  if (mode !== 'none') choose('Track', mode);
}

/** How much the game records: `'none'` while the switch is off, else Team or Player. */
export function tracked(): 'none' | 'teams' | 'players' {
  if (!statsSwitch().checked) return 'none';
  return chosen('Track') as 'teams' | 'players';
}
