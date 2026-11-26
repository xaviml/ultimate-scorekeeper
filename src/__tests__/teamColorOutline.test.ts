import { describe, expect, it } from 'vitest';
import { contrastText, isDarkColor, isPaleColor, teamEdge, teamOutline } from '../components/ui';

describe('team colours that melt into the theme', () => {
  it('outlines colours that would vanish on the light theme, through its edge variable', () => {
    for (const pale of ['#ffffff', '#FFF', '#fdf6e3', '#fff59d', '#e5e7eb', '#ECEFF4']) {
      expect(isPaleColor(pale), pale).toBe(true);
      expect(teamEdge(pale)).toBe(`var(--edge-pale, ${pale})`);
      expect(teamOutline(pale)).toEqual({
        boxShadow: `inset 0 0 0 0.5px var(--edge-pale, ${pale})`,
      });
    }
  });

  it('outlines colours that would vanish on the dark theme, through the other variable', () => {
    for (const dark of ['#000000', '#0A101C', '#1D3557', '#14213d']) {
      expect(isDarkColor(dark), dark).toBe(true);
      expect(teamEdge(dark)).toBe(`var(--edge-dark, ${dark})`);
      expect(teamOutline(dark)).toEqual({
        boxShadow: `inset 0 0 0 0.5px var(--edge-dark, ${dark})`,
      });
    }
  });

  it('leaves every colour that stands out in both themes alone', () => {
    for (const strong of ['#D94040', '#2E6FD8', '#F4C430', '#22c55e', '#7c3aed']) {
      expect(isPaleColor(strong), strong).toBe(false);
      expect(isDarkColor(strong), strong).toBe(false);
      expect(teamEdge(strong)).toBe(strong);
      expect(teamOutline(strong)).toBeUndefined();
    }
  });

  it('keeps picking the same text colour as before the refactor', () => {
    expect(contrastText('#ffffff')).toBe('#000000');
    expect(contrastText('#F4C430')).toBe('#000000');
    expect(contrastText('#1D3557')).toBe('#ffffff');
    expect(contrastText('#D94040')).toBe('#ffffff');
  });
});
