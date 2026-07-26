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
