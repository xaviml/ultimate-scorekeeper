import { playerKey } from './rosterImport';
import type { Gender, GameConfig, LinePlayer, PlayerInfo, SavedLine, TeamId } from './types';

/**
 * The pure half of line tracking: who counts as being on the field, and whether the
 * line that was registered matches what the game asked for. Nothing here reads or
 * writes state — the reducer owns the record, the dialog owns the warning.
 *
 * The one rule worth stating up front: **a check never refuses.** `lineIssues`
 * reports what is off and the caller warns about it, because a volunteer has to be
 * able to record the line that actually took the field. Outside professional play a
 * team cannot always keep the ratio, and an app that insisted would simply be
 * holding data it doesn't have.
 */

/**
 * The single gate for the whole feature. Line tracking only exists in `team` stats
 * mode, where exactly one roster is followed, so the line team is `trackedTeam` and
 * `LineConfig` carries no team of its own.
 *
 * Every consumer asks this rather than reading `config.lines.enabled`, which is why
 * moving the stats mode away from 'team' retires line tracking on its own and moving
 * back restores the settings the user had chosen — nothing has to reach in and clear
 * the flag. Mirrors the shape of `statsTrackingEnabled`/`playerTrackingFor` in
 * gameReducer.ts; it lives here because this module imports only types, so the
 * reducer can depend on it without a cycle.
 */
export function lineTrackingEnabled(config: GameConfig): boolean {
  return config.lines.enabled && config.statsMode === 'team' && config.trackedTeam !== null;
}

/** The team whose lines are recorded, or null when line tracking is not in force. */
export function lineTeam(config: GameConfig): TeamId | null {
  return lineTrackingEnabled(config) ? config.trackedTeam : null;
}

export function lineTrackedFor(config: GameConfig, team: TeamId): boolean {
  return lineTeam(config) === team;
}

/**
 * Whether `'gameRatio'` is a real choice for `config.lines.genderCheck` — mirrors the
 * condition `expectedSplit` ultimately checks `ratio` against: Rule B never computes
 * one and the open/women's divisions have none at all, so a game outside mixed
 * Rule A has nothing for a line to be checked against.
 */
export function ratioGenderCheckAvailable(
  division: GameConfig['division'],
  mixedRule: 'A' | 'B',
): boolean {
  return division === 'mixed' && mixedRule === 'A';
}

/** How many of each marking the line is supposed to carry, or null when nothing is checked. */
export interface GenderSplit {
  female: number;
  male: number;
}

/**
 * The split a line should have, or null when there is nothing to check against.
 *
 * `'gameRatio'` follows the ratio the game is being played to: the majority marking
 * takes `ceil(size / 2)`, which is 4-3 at seven and 3-2 at five, and `ratio` names
 * which marking is in the majority. It yields null when `ratio` is null — Rule B
 * leaves the ratio to the end zone and never computes one, and the open and women's
 * divisions have none at all — so a game configured to follow a ratio that isn't
 * being tracked quietly checks nothing rather than checking against a guess.
 */
export function expectedSplit(config: GameConfig, ratio: Gender | null): GenderSplit | null {
  const { genderCheck, fixedFemale } = config.lines;
  const size = config.lineSize;
  if (genderCheck === 'none') return null;
  if (genderCheck === 'fixed') {
    const female = Math.max(0, Math.min(size, fixedFemale));
    return { female, male: size - female };
  }
  if (!ratio) return null;
  const majority = Math.ceil(size / 2);
  const minority = size - majority;
  return ratio === 'female'
    ? { female: majority, male: minority }
    : { female: minority, male: majority };
}

export interface LineComposition {
  size: number;
  female: number;
  male: number;
  /** Selected players with no marking on the roster — counted, never faulted. */
  unknown: number;
}

export function lineComposition(players: PlayerInfo[], ids: string[]): LineComposition {
  const selected = ids
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is PlayerInfo => p !== undefined);
  return {
    size: selected.length,
    female: selected.filter((p) => p.gender === 'female').length,
    male: selected.filter((p) => p.gender === 'male').length,
    unknown: selected.filter((p) => p.gender === undefined).length,
  };
}

export type LineIssue = 'size' | 'ratio';

/**
 * What is off about a line, for the warning the dialog shows. Empty means it matches.
 *
 * Unmarked players never produce a `ratio` issue on their own: with three of seven
 * unmarked the split is unknown, not wrong, and faulting it would train the volunteer
 * to tap through the warning. So the ratio is only called out when the players whose
 * marking *is* known already exceed what the split allows.
 */
export function lineIssues(
  config: GameConfig,
  ratio: Gender | null,
  players: PlayerInfo[],
  ids: string[],
): LineIssue[] {
  const issues: LineIssue[] = [];
  const composition = lineComposition(players, ids);
  if (composition.size !== config.lineSize) issues.push('size');
  const expected = expectedSplit(config, ratio);
  if (expected && (composition.female > expected.female || composition.male > expected.male)) {
    issues.push('ratio');
  }
  return issues;
}

/**
 * The ids in this game's roster for a saved line. Players who are no longer on the
 * roster are dropped rather than the line being refused — a squad that lost someone
 * since the line was named still mostly holds, and the size warning says the rest.
 */
export function resolveSavedLine(saved: SavedLine, players: PlayerInfo[]): string[] {
  const byKey = new Map(players.map((p) => [playerKey(p), p.id]));
  return saved.playerKeys
    .map((key) => byKey.get(key))
    .filter((id): id is string => id !== undefined);
}

/** A saved line from a live selection, storing keys rather than this game's ids. */
export function savedLineFrom(
  id: string,
  name: string,
  ids: string[],
  players: PlayerInfo[],
): SavedLine {
  const byId = new Map(players.map((p) => [p.id, p]));
  return {
    id,
    name: name.trim(),
    playerKeys: ids
      .map((playerId) => byId.get(playerId))
      .filter((p): p is PlayerInfo => p !== undefined)
      .map(playerKey),
  };
}

/**
 * The roster narrowed to the players a picker may name — who was actually on the
 * field — or the whole roster when there is nothing to narrow by.
 *
 * That fallback is load-bearing, and it is why this takes the ids rather than reading
 * them: line tracking off, a team that isn't the line team, or a point nobody
 * registered a line for all have to keep offering everyone. Restricting to nobody
 * would make attribution impossible for exactly the volunteer who skipped the line,
 * which is the opposite of the point.
 *
 * Callers must pass the ids for the point the question is *about*: the goal dialog
 * asks about the point that has just finished (`PointRecord.line`), not `state.line`,
 * which GOAL has already moved on to the next point.
 */
export function playersOnField(
  config: GameConfig,
  team: TeamId,
  players: PlayerInfo[],
  onField: string[],
): PlayerInfo[] {
  if (!lineTrackedFor(config, team) || onField.length === 0) return players;
  const narrowed = players.filter((p) => onField.includes(p.id));
  // A line whose players have all since been removed from the roster would otherwise
  // leave nothing to pick from at all.
  return narrowed.length > 0 ? narrowed : players;
}

/** The roster minus whoever is on the field — who a substitution can bring on. */
export function benchPlayers(players: PlayerInfo[], onField: string[]): PlayerInfo[] {
  return players.filter((p) => !onField.includes(p.id));
}

/**
 * Who from a point's record was still on the field at the end of it — everyone bar
 * those a substitution took off (see `LinePlayer.off`).
 *
 * This is what the player pickers ask against, not the whole record: an injured player
 * who has been replaced cannot have gone on to score the point. The record itself keeps
 * them, because they did play part of it and every stat should say so.
 */
export function onFieldIds(line: LinePlayer[] | undefined): string[] {
  return (line ?? []).filter((p) => !p.off).map((p) => p.playerId);
}

/**
 * The bench narrowed to who may legally replace the injured players.
 *
 * In mixed you cannot swap an MMP for an FMP — the line has to come back to the same
 * split — so the picker offers only matching markings rather than letting the
 * volunteer make a line that could not have taken the field. Outside mixed there is no
 * such constraint and the whole bench is fair game.
 *
 * Two deliberate softenings, both following the rule that a missing marking is unknown
 * rather than wrong (see `lineIssues`): an **injured player with no marking** puts no
 * constraint on the bench at all, since there is nothing to match; and an **unmarked
 * bench player** is always offered, because excluding them would hide a valid
 * substitute from a roster that is only partly marked. An empty result is a real
 * answer, and the caller says so rather than dropping the question — the injured
 * player plays on.
 */
export function replacementsFor(
  config: GameConfig,
  players: PlayerInfo[],
  onField: string[],
  going: PlayerInfo[],
): PlayerInfo[] {
  const bench = benchPlayers(players, onField);
  if (config.division !== 'mixed') return bench;
  const wanted = new Set(going.map((p) => p.gender));
  if (wanted.has(undefined)) return bench;
  return bench.filter((p) => p.gender === undefined || wanted.has(p.gender));
}
