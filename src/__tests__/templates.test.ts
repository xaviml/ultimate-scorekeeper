import { beforeEach, describe, expect, it } from 'vitest';
import { defaultConfig } from '../state/gameReducer';
import {
  BEACH_TEMPLATE,
  GRASS_TEMPLATE,
  applyTemplate,
  deleteTemplate,
  extractTemplateSettings,
  loadSavedTemplates,
  saveTemplate,
} from '../state/templates';

beforeEach(() => localStorage.clear());

describe('predefined templates', () => {
  it('Grass is mixed, CAP +1 half and game, Rule A, with a 7-minute half-time break', () => {
    expect(GRASS_TEMPLATE.division).toBe('mixed');
    expect(GRASS_TEMPLATE.mixedRule).toBe('A');
    expect(GRASS_TEMPLATE.endCap).toEqual({ kind: 'cap', plus: 1 });
    expect(GRASS_TEMPLATE.halfCap).toEqual({ kind: 'cap', plus: 1 });
    expect(GRASS_TEMPLATE.targetScore).toBe(15);
    expect(GRASS_TEMPLATE.halfScore).toBe(8);
    expect(GRASS_TEMPLATE.timeLimitMinutes).toBe(100);
    expect(GRASS_TEMPLATE.halfTimeLimitMinutes).toBe(55);
    expect(GRASS_TEMPLATE.halfTimeBreakSeconds).toBe(420);
    expect(GRASS_TEMPLATE.timeouts).toEqual({
      enabled: true,
      perHalf: null,
      perGame: 2,
      durationSeconds: 75,
      disallowLastFiveMinutes: false,
    });
  });

  it('Beach has no half-time break and one timeout per game', () => {
    expect(BEACH_TEMPLATE.targetScore).toBe(13);
    expect(BEACH_TEMPLATE.halfScore).toBe(7);
    expect(BEACH_TEMPLATE.timeLimitMinutes).toBe(45);
    expect(BEACH_TEMPLATE.halfTimeLimitMinutes).toBe(25);
    expect(BEACH_TEMPLATE.halfTimeBreakSeconds).toBe(0);
    expect(BEACH_TEMPLATE.timeouts).toEqual({
      enabled: true,
      perHalf: null,
      perGame: 1,
      durationSeconds: 75,
      disallowLastFiveMinutes: false,
    });
  });
});

describe('extractTemplateSettings', () => {
  it('carries the rules and what the game records, never teams, coin toss, players or the followed team', () => {
    const cfg = {
      ...defaultConfig,
      teams: { A: { name: 'Foxes', color: '#fff' }, B: { name: 'Wolves', color: '#000' } },
      startingOffense: 'B' as const,
      startingSide: 'B' as const,
      startingRatio: 'male' as const,
      statsMode: 'players' as const,
      trackTurnovers: true,
      trackedTeam: 'A' as const,
      trackTurnoverPlayers: true,
      // Whether lines are tracked travels; a team's predefined lines never do.
      lines: {
        ...defaultConfig.lines,
        enabled: true,
        genderCheck: 'fixed' as const,
        saved: [{ id: 'l1', name: 'O1', playerKeys: ['7 alex'] }],
      },
      lineSize: 5,
      players: { A: [{ id: '1', number: '7', name: 'Alex' }], B: [] },
      fieldNumber: '3',
    };

    const settings = extractTemplateSettings(cfg);

    expect(settings).toEqual({
      division: cfg.division,
      fieldNumber: '3',
      mixedRule: cfg.mixedRule,
      lineSize: 5,
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
        statsMode: 'players',
        trackTurnovers: true,
        trackGoalPlayers: cfg.trackGoalPlayers,
        trackTurnoverPlayers: true,
        trackPasses: cfg.trackPasses,
        linesEnabled: true,
      },
    });
    expect(settings).not.toHaveProperty('teams');
    expect(settings).not.toHaveProperty('startingOffense');
    expect(settings).not.toHaveProperty('startingSide');
    expect(settings).not.toHaveProperty('startingRatio');
    expect(settings).not.toHaveProperty('trackedTeam');
    expect(settings).not.toHaveProperty('lines');
    expect(settings).not.toHaveProperty('players');
  });
});

describe('applyTemplate', () => {
  const tracking = {
    ...defaultConfig,
    statsMode: 'players' as const,
    trackedTeam: 'B' as const,
    trackTurnovers: true,
    trackPasses: true,
    lines: { ...defaultConfig.lines, enabled: true },
  };

  it('leaves the statistics alone for a built-in template, which has none', () => {
    const next = applyTemplate(tracking, BEACH_TEMPLATE);

    expect(next.targetScore).toBe(BEACH_TEMPLATE.targetScore);
    expect(next).toMatchObject({
      statsMode: 'players',
      trackedTeam: 'B',
      trackTurnovers: true,
      trackPasses: true,
      lines: { enabled: true },
    });
  });

  it('applies the statistics a saved template carries, but keeps the followed team and lines', () => {
    const saved = extractTemplateSettings({
      ...defaultConfig,
      statsMode: 'teams',
      trackTurnovers: true,
      trackPasses: false,
      lines: { ...defaultConfig.lines, enabled: false },
    });
    const withLines = {
      ...tracking,
      lines: { ...tracking.lines, saved: [{ id: 'l1', name: 'O1', playerKeys: ['7 alex'] }] },
    };
    const next = applyTemplate(withLines, saved);

    expect(next).toMatchObject({
      statsMode: 'teams',
      trackTurnovers: true,
      trackPasses: false,
      trackedTeam: 'B',
      lines: { enabled: false, saved: [{ id: 'l1', name: 'O1', playerKeys: ['7 alex'] }] },
    });
  });

  it('gives a template saved before half-time could be switched off its half', () => {
    const { halfTimeEnabled: _omitted, ...old } = extractTemplateSettings(defaultConfig);
    void _omitted;
    const next = applyTemplate(
      { ...defaultConfig, halfTimeEnabled: false },
      old as Parameters<typeof applyTemplate>[1],
    );

    expect(next.halfTimeEnabled).toBe(true);
  });
});

describe('saved template storage', () => {
  it('round-trips through localStorage', () => {
    expect(loadSavedTemplates()).toEqual([]);
    saveTemplate({ name: 'Summer League', settings: extractTemplateSettings(defaultConfig) });
    expect(loadSavedTemplates()).toEqual([
      { name: 'Summer League', settings: extractTemplateSettings(defaultConfig) },
    ]);
  });

  it('upserts by case-insensitive, trimmed name match', () => {
    saveTemplate({ name: 'Summer League', settings: extractTemplateSettings(defaultConfig) });
    saveTemplate({
      name: '  summer league  ',
      settings: { ...extractTemplateSettings(defaultConfig), targetScore: 21 },
    });

    const all = loadSavedTemplates();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('summer league');
    expect(all[0].settings.targetScore).toBe(21);
  });

  it('deletes by case-insensitive, trimmed name match', () => {
    saveTemplate({ name: 'Summer League', settings: extractTemplateSettings(defaultConfig) });
    deleteTemplate('  SUMMER LEAGUE ');
    expect(loadSavedTemplates()).toEqual([]);
  });
});

describe('the line size in the predefined templates', () => {
  // How many players take the field is a property of the field format, so it comes
  // with the format rather than being typed in every game.
  it('is sevens on grass and fives on beach', () => {
    expect(GRASS_TEMPLATE.lineSize).toBe(7);
    expect(BEACH_TEMPLATE.lineSize).toBe(5);
  });

  // The tracking settings are excluded, so applying a template can never switch line
  // tracking on or off, or wipe a team's predefined lines.
  it('carries no line-tracking settings alongside it', () => {
    for (const template of [GRASS_TEMPLATE, BEACH_TEMPLATE]) {
      expect(template).not.toHaveProperty('lines');
      expect(template).not.toHaveProperty('statsMode');
    }
  });
});
