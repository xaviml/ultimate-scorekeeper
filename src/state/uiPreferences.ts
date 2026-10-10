const PLAYERS_SECTION_COLLAPSED_KEY = 'ultimate-scorekeeper:players-section-collapsed';
const WATER_BREAK_SECTION_COLLAPSED_KEY = 'ultimate-scorekeeper:water-break-section-collapsed';

/** Collapsed unless the user explicitly expanded it last time — that's the default too. */
export function loadPlayersSectionCollapsed(): boolean {
  try {
    return localStorage.getItem(PLAYERS_SECTION_COLLAPSED_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function savePlayersSectionCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(PLAYERS_SECTION_COLLAPSED_KEY, String(collapsed));
  } catch {
    /* storage unavailable (private mode, quota, ...) — collapse state just won't persist */
  }
}

/** Same rule as the Roster section: collapsed unless it was explicitly opened last time. */
export function loadWaterBreakSectionCollapsed(): boolean {
  try {
    return localStorage.getItem(WATER_BREAK_SECTION_COLLAPSED_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function saveWaterBreakSectionCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(WATER_BREAK_SECTION_COLLAPSED_KEY, String(collapsed));
  } catch {
    /* storage unavailable (private mode, quota, ...) — collapse state just won't persist */
  }
}

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
