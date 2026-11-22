import type { GameConfig, SavedTemplate, TemplateSettings } from './types';

const STORAGE_KEY = 'ultimate-scorekeeper:saved-templates';

/**
 * Mixed, CAP +1 (half and game), Rule A (ABBA), and the field format's line size —
 * sevens on grass, fives on beach. Neither preset sets `fieldNumber` — it's a per-game
 * detail, not a tournament rule, so applying one never clobbers whatever the
 * volunteer already typed there.
 */
export const GRASS_TEMPLATE: Omit<TemplateSettings, 'fieldNumber'> = {
  division: 'mixed',
  mixedRule: 'A',
  lineSize: 7,
  targetScore: 15,
  halfTimeEnabled: true,
  halfScore: 8,
  timeLimitMinutes: 100,
  halfTimeLimitMinutes: 55,
  halfTimeBreakSeconds: 420,
  endCap: { kind: 'cap', plus: 1 },
  halfCap: { kind: 'cap', plus: 1 },
  timeouts: {
    enabled: true,
    perHalf: null,
    perGame: 2,
    durationSeconds: 75,
    disallowLastFiveMinutes: false,
  },
  waterBreaks: { enabled: false, atScores: [4, 12], durationSeconds: 180 },
};

export const BEACH_TEMPLATE: Omit<TemplateSettings, 'fieldNumber'> = {
  division: 'mixed',
  mixedRule: 'A',
  lineSize: 5,
  targetScore: 13,
  halfTimeEnabled: true,
  halfScore: 7,
  timeLimitMinutes: 45,
  halfTimeLimitMinutes: 25,
  halfTimeBreakSeconds: 0,
  endCap: { kind: 'cap', plus: 1 },
  halfCap: { kind: 'cap', plus: 1 },
  timeouts: {
    enabled: true,
    perHalf: null,
    perGame: 1,
    durationSeconds: 75,
    disallowLastFiveMinutes: false,
  },
  waterBreaks: { enabled: false, atScores: [4, 12], durationSeconds: 180 },
};

/**
 * Picks the fields a custom template saves — the config screen's current rules plus
 * what it records (see `TemplateStats`), minus the teams, coin toss, players, the
 * followed team and the predefined lines.
 */
export function extractTemplateSettings(cfg: GameConfig): TemplateSettings {
  return {
    division: cfg.division,
    fieldNumber: cfg.fieldNumber,
    mixedRule: cfg.mixedRule,
    lineSize: cfg.lineSize,
    targetScore: cfg.targetScore,
    halfTimeEnabled: cfg.halfTimeEnabled,
    halfScore: cfg.halfScore,
    timeLimitMinutes: cfg.timeLimitMinutes,
    halfTimeLimitMinutes: cfg.halfTimeLimitMinutes,
    halfTimeBreakSeconds: cfg.halfTimeBreakSeconds,
    endCap: cfg.endCap,
    halfCap: cfg.halfCap,
    timeouts: cfg.timeouts,
    waterBreaks: cfg.waterBreaks,
    stats: {
      statsMode: cfg.statsMode,
      trackTurnovers: cfg.trackTurnovers,
      trackGoalPlayers: cfg.trackGoalPlayers,
      trackTurnoverPlayers: cfg.trackTurnoverPlayers,
      trackPasses: cfg.trackPasses,
      linesEnabled: cfg.lines.enabled,
    },
  };
}

/**
 * The config with a template applied. Every rule is replaced; the statistics only
 * when the template carries them (`stats` — a custom template saved since they
 * were remembered), so Grass, Beach and older custom templates leave that section
 * as the volunteer set it. The followed team and the predefined lines are never
 * touched: a template knows nothing about who is playing.
 */
export function applyTemplate(
  cfg: GameConfig,
  settings: Omit<TemplateSettings, 'fieldNumber'> & { fieldNumber?: string },
): GameConfig {
  const { stats, ...rules } = settings;
  const next: GameConfig = {
    ...cfg,
    ...rules,
    // A template saved before half-time could be switched off never carries the
    // field, and every one of those games had a half.
    halfTimeEnabled: rules.halfTimeEnabled ?? true,
  };
  if (!stats) return next;
  return {
    ...next,
    statsMode: stats.statsMode,
    trackTurnovers: stats.trackTurnovers,
    trackGoalPlayers: stats.trackGoalPlayers,
    trackTurnoverPlayers: stats.trackTurnoverPlayers,
    trackPasses: stats.trackPasses,
    lines: { ...cfg.lines, enabled: stats.linesEnabled },
  };
}

export function loadSavedTemplates(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedTemplate[]) : [];
  } catch {
    return [];
  }
}

const normalize = (name: string) => name.trim().toLowerCase();

/** Upserts by case-insensitive, trimmed name match, same convention as saveTeam. */
export function saveTemplate(template: SavedTemplate): void {
  const name = template.name.trim();
  if (!name) return;
  try {
    const all = loadSavedTemplates();
    const idx = all.findIndex((t) => normalize(t.name) === normalize(name));
    const entry: SavedTemplate = { ...template, name };
    if (idx >= 0) all[idx] = entry;
    else all.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable (private mode, quota, ...) — game still works without it */
  }
}

/** Removes a saved template by case-insensitive, trimmed name match. */
export function deleteTemplate(name: string): void {
  try {
    const all = loadSavedTemplates().filter((t) => normalize(t.name) !== normalize(name));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable (private mode, quota, ...) — game still works without it */
  }
}
