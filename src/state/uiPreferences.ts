const PLAYERS_SECTION_COLLAPSED_KEY = 'ultimate-scorekeeper:players-section-collapsed';

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
