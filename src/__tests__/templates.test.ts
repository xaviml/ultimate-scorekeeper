import { beforeEach, describe, expect, it } from 'vitest';
import { defaultConfig } from '../state/gameReducer';
import {
  BEACH_TEMPLATE,
  GRASS_TEMPLATE,
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
  it('carries only the rule fields, never teams, coin toss, players or trackPlayers', () => {
    const cfg = {
      ...defaultConfig,
      teams: { A: { name: 'Foxes', color: '#fff' }, B: { name: 'Wolves', color: '#000' } },
      startingOffense: 'B' as const,
      startingSide: 'B' as const,
      startingRatio: 'male' as const,
      trackPlayers: true,
      players: { A: [{ id: '1', number: '7', name: 'Alex' }], B: [] },
      fieldNumber: '3',
    };

    const settings = extractTemplateSettings(cfg);

    expect(settings).toEqual({
      division: cfg.division,
      fieldNumber: '3',
      mixedRule: cfg.mixedRule,
      targetScore: cfg.targetScore,
      halfScore: cfg.halfScore,
      timeLimitMinutes: cfg.timeLimitMinutes,
      halfTimeLimitMinutes: cfg.halfTimeLimitMinutes,
      halfTimeBreakSeconds: cfg.halfTimeBreakSeconds,
      endCap: cfg.endCap,
      halfCap: cfg.halfCap,
      timeouts: cfg.timeouts,
    });
    expect(settings).not.toHaveProperty('teams');
    expect(settings).not.toHaveProperty('startingOffense');
    expect(settings).not.toHaveProperty('startingSide');
    expect(settings).not.toHaveProperty('startingRatio');
    expect(settings).not.toHaveProperty('trackPlayers');
    expect(settings).not.toHaveProperty('players');
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
