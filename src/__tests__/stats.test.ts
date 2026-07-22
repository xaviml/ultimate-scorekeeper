import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import type { TFunc } from '../i18n/useT';
import { stoppageDetail } from '../state/stats';
import type { LogEntry } from '../state/types';

const t: TFunc = (key, vars) => {
  let s: string = en[key] ?? String(key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
};

const entry = (patch: Partial<LogEntry>): LogEntry => ({
  id: 1,
  wallClock: '10:00:00',
  atMs: 0,
  gameSeconds: 0,
  type: 'stoppage',
  ...patch,
});

describe('stoppageDetail', () => {
  it('shows just the kind when no player is attached', () => {
    const e = entry({ stoppageKind: 'technical' });
    expect(stoppageDetail(e, t)).toBe('Technical');
  });

  // Regression: e.detail (the injured player) and the kind label used to be
  // printed side by side with no separator by the callers, reading as
  // "XaviInjury". stoppageDetail now composes the two itself.
  it('puts a separator between the kind and the injured player, not "XaviInjury"', () => {
    const e = entry({ stoppageKind: 'injury', detail: '#7 Xavi' });
    expect(stoppageDetail(e, t)).toBe('Injury — #7 Xavi');
  });

  it('shows the resolution duration once resolved, with no player repeated', () => {
    const e = entry({ type: 'stoppageResolved', stoppageKind: 'injury', resolutionSeconds: 42 });
    expect(stoppageDetail(e, t)).toBe('Injury — resolved in 42s');
  });

  it('returns nothing for entries with no stoppage kind', () => {
    expect(stoppageDetail(entry({ type: 'note', stoppageKind: undefined }), t)).toBe('');
  });
});
