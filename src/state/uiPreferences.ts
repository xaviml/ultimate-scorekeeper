/*
 * The Settings dialog's switches. Both are about this device rather than about a
 * game — a phone that should stay quiet stays quiet for every game played on it —
 * so they live here beside the other per-device preferences rather than in
 * `GameConfig`, and a new game or a template never touches them. Both default on,
 * and anything but an explicit 'false' reads as on, so a device with no storage
 * behaves exactly as the app did before the switches existed.
 */
const SOUND_KEY = 'ultimate-scorekeeper:sound-enabled';
const VIBRATION_KEY = 'ultimate-scorekeeper:vibration-enabled';

function loadFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'false';
  } catch {
    return true;
  }
}

function saveFlag(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, String(on));
  } catch {
    /* storage unavailable — the switch just won't survive a reload */
  }
}

/** Whether the whistles sound. */
export const loadSoundEnabled = () => loadFlag(SOUND_KEY);
export const saveSoundEnabled = (on: boolean) => saveFlag(SOUND_KEY, on);

/** Whether Turn and Pass vibrate on a tap. */
export const loadVibrationEnabled = () => loadFlag(VIBRATION_KEY);
export const saveVibrationEnabled = (on: boolean) => saveFlag(VIBRATION_KEY, on);

/*
 * How the player pickers order a roster: by shirt number (a team sheet) or by name.
 * A habit of whoever holds the phone rather than a rule of the game, so it lives
 * here with the other per-device preferences. Every picker on screen follows a
 * change at once, which is why it carries a subscription (see `usePlayerSort`).
 */
export type PlayerSort = 'number' | 'name';
const PLAYER_SORT_KEY = 'ultimate-scorekeeper:player-sort';
const playerSortListeners = new Set<() => void>();

export function loadPlayerSort(): PlayerSort {
  try {
    return localStorage.getItem(PLAYER_SORT_KEY) === 'name' ? 'name' : 'number';
  } catch {
    return 'number';
  }
}

export function savePlayerSort(sort: PlayerSort): void {
  try {
    localStorage.setItem(PLAYER_SORT_KEY, sort);
  } catch {
    /* storage unavailable — the order just won't survive a reload */
  }
  playerSortListeners.forEach((listener) => listener());
}

export function subscribePlayerSort(listener: () => void): () => void {
  playerSortListeners.add(listener);
  return () => playerSortListeners.delete(listener);
}

/*
 * Whether the line dialog lists the roster most rested first rather than in the
 * device's player order. Only the line sheet has rest to sort by, so it is its own
 * flag rather than a third `PlayerSort` every other picker would have to ignore.
 * Off by default; only that dialog reads it, so it needs no subscription.
 */
const LINE_REST_SORT_KEY = 'ultimate-scorekeeper:line-rest-sort';

export function loadLineRestSort(): boolean {
  try {
    return localStorage.getItem(LINE_REST_SORT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveLineRestSort(on: boolean): void {
  try {
    localStorage.setItem(LINE_REST_SORT_KEY, String(on));
  } catch {
    /* storage unavailable — the order just won't survive a reload */
  }
}

/**
 * The language the volunteer picked, per device. Null means "never chose" — the
 * app then follows the device language (`detectLang`) as it always did, so a
 * phone that changes its own language keeps being followed until someone picks.
 */
const LANG_KEY = 'ultimate-scorekeeper:lang';

export function loadLang(): 'en' | 'es' | 'ca' | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'en' || v === 'es' || v === 'ca' ? v : null;
  } catch {
    return null;
  }
}

export function saveLang(lang: 'en' | 'es' | 'ca'): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage unavailable — the choice just won't outlive the tab */
  }
}

/*
 * Light, dark, or whatever the phone is set to. Per device like the rest of this
 * file. The stored value is applied to <html data-theme> — and before first paint by
 * the inline script in index.html, which reads the same key, so a dark phone never
 * flashes white on launch. "system" is the absence of the attribute: index.css then
 * follows `prefers-color-scheme` by itself, live, with no listener needed here except
 * for the browser bar colour.
 */
export type ThemePref = 'system' | 'light' | 'dark';
const THEME_KEY = 'ultimate-scorekeeper:theme';

export function loadTheme(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function saveTheme(theme: ThemePref): void {
  try {
    if (theme === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable — the theme just won't survive a reload */
  }
  applyTheme(theme);
}

/** The browser bar takes the surface colour of whichever theme is showing. */
const THEME_BAR = { light: '#FFFFFF', dark: '#141D2E' } as const;
const darkQuery = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

export function applyTheme(theme: ThemePref = loadTheme()): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  const resolved = theme === 'system' ? (darkQuery()?.matches ? 'dark' : 'light') : theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BAR[resolved]);
}

/** Keeps the browser bar in step when the phone itself switches while on "system". */
export function watchSystemTheme(): void {
  darkQuery()?.addEventListener?.('change', () => {
    if (loadTheme() === 'system') applyTheme('system');
  });
}
