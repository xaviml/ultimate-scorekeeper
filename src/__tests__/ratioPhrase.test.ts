import { describe, expect, it } from 'vitest';
import { ca } from '../i18n/ca';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { ratioPhrase } from '../state/assistOccurrence';

/** A bare `t` over one dictionary, enough for the strings this reads. */
const tFor =
  (dict: Record<string, string>) =>
  (key: never, vars: Record<string, string | number> = {}) =>
    String(dict[key as string]).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k]));

// The ratios come in pairs from point two on, and the call-out says which of the
// pair this is in words — "(1)" is not something anyone can read out.
describe('ratioPhrase', () => {
  it('says which of the pair a point is, in every language', () => {
    expect(ratioPhrase('male', 1, tFor(es))).toBe('Primero de chicos');
    expect(ratioPhrase('female', 2, tFor(es))).toBe('Segundo de chicas');
    expect(ratioPhrase('male', 1, tFor(ca))).toBe('Primer de nois');
    expect(ratioPhrase('female', 2, tFor(ca))).toBe('Segon de noies');
    expect(ratioPhrase('male', 1, tFor(en))).toBe('Men, first of two');
    expect(ratioPhrase('female', 2, tFor(en))).toBe('Women, second of two');
  });

  it('is just the gender on the first point, which stands alone', () => {
    expect(ratioPhrase('female', null, tFor(es))).toBe('Chicas');
  });
});
