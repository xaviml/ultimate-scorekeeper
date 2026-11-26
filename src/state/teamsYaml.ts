import { CORE_SCHEMA, YAMLException, dump, load } from 'js-yaml';
import type { Dict } from '../i18n/useT';
import { normalizeTeamName } from './rosterStorage';
import { parsePlayerLine, playerKey } from './rosterImport';
import { sortTeams } from './teamsDraft';
import { teamNameCase } from './teamName';
import type { Gender, PlayerInfo, SavedLine, SavedTeam } from './types';
import { uid } from './uid';

/**
 * Every saved team as YAML, and back — the Teams page's text view.
 *
 * The YAML is the whole store, so it is also how a set of teams travels between
 * phones: copied out of one, pasted into another. Its shape is chosen to be typed on
 * a phone by someone who has never seen YAML before, one team per top-level key:
 *
 *     RAVENS:
 *       color: "#1f6feb"
 *       players:
 *         - 7 Ada FMP
 *         - 12 Marc MMP
 *       lines:
 *         O1: [7 Ada, 12 Marc]
 *
 * Only the name and `color` are required. A player is one line in the roster paste
 * box's own grammar (`parsePlayerLine`), so there is one way of writing a player in
 * the whole app; a mapping (`{number, name, gender}`) is accepted too, and written
 * out only for the rare player whose line would read back as someone else (a name
 * with no number that ends in digits, say). A line lists its players the same way,
 * and may name them by number or by name alone when that is unambiguous.
 *
 * Unlike the roster importer, reading is all-or-nothing: this is an editor whose Save
 * replaces the store, so a line that cannot be read must stop the Save rather than
 * quietly lose a player. The error names the first problem and, where it can be
 * found, the line it is on.
 *
 * This module imports js-yaml, and is loaded only when the YAML view is (see
 * `loadTeamsYaml`), so the library is never in the main bundle.
 */

type ErrorKey = Extract<keyof Dict, `teamsYamlErr${string}`>;

export interface TeamsYamlError {
  key: ErrorKey;
  vars: Record<string, string>;
  /** 1-based line number in the text, when it can be found. */
  line: number | null;
  /** The text of that line, for a syntax error — shown as it was typed. */
  excerpt?: string;
}

export type TeamsYamlParse =
  { ok: true; teams: SavedTeam[] } | { ok: false; error: TeamsYamlError };

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const TEAM_KEYS = new Set(['color', 'players', 'lines']);

const GENDER_TAG: Record<Gender, string> = { male: 'MMP', female: 'FMP' };

/** A player as one line: `7 Ada FMP`, `Ada`, `23`. */
export function formatPlayer(p: { number: string; name: string; gender?: Gender }): string {
  return [p.number.trim(), p.name.trim(), p.gender ? GENDER_TAG[p.gender] : '']
    .filter(Boolean)
    .join(' ');
}

/** How a line refers to a player: the number and name, without the marking. */
const formatRef = (p: { number: string; name: string }) =>
  [p.number.trim(), p.name.trim()].filter(Boolean).join(' ');

/**
 * The one-line form when it reads back as the same player, the mapping otherwise —
 * so what is written out always round-trips.
 */
function playerItem(p: PlayerInfo): string | Record<string, string> {
  const line = formatPlayer(p);
  const back = parsePlayerLine(line);
  if (
    back &&
    back.number === p.number.trim() &&
    back.name === p.name.trim() &&
    back.gender === p.gender
  ) {
    return line;
  }
  return {
    number: p.number,
    name: p.name,
    ...(p.gender ? { gender: GENDER_TAG[p.gender] } : {}),
  };
}

export function teamsToYaml(teams: SavedTeam[]): string {
  if (teams.length === 0) return '';
  const doc: Record<string, unknown> = {};
  for (const team of sortTeams(teams)) {
    const entry: Record<string, unknown> = { color: team.color };
    if (team.players.length > 0) entry.players = team.players.map(playerItem);
    const lines = team.lines ?? [];
    if (lines.length > 0) {
      const byKey = new Map(team.players.map((p) => [playerKey(p), p]));
      entry.lines = Object.fromEntries(
        lines.map((l) => [
          l.name,
          // A member since removed from the roster has nothing to be called by, and
          // naming them would make the text unsaveable — they are left out.
          l.playerKeys.flatMap((k) => {
            const p = byKey.get(k);
            return p ? [formatRef(p)] : [];
          }),
        ]),
      );
    }
    doc[team.name] = entry;
  }
  // flowLevel 3 writes each line's members on one line (`O1: [7 Ada, 12 Marc]`) and
  // leaves everything above it in block style.
  return dump(doc, { flowLevel: 3, lineWidth: -1, noRefs: true, quotingType: '"' });
}

// ---------------------------------------------------------------------------
// Reading

class Problem extends Error {
  constructor(
    readonly key: ErrorKey,
    readonly vars: Record<string, string>,
    /** Where to look for the line: the team's raw key and, optionally, text inside its block. */
    readonly where: { needle?: string | RegExp } = {},
  ) {
    super(key);
  }
}

const isMap = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const scalarText = (v: unknown): string | null =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null;

const show = (v: unknown): string => {
  const s = scalarText(v);
  return s ?? JSON.stringify(v) ?? String(v);
};

/**
 * Finds the line a problem is on. js-yaml gives positions only for syntax errors, so
 * this looks for the team's own top-level key and then, inside that team's block,
 * for the first line containing `needle`. Good enough to point at the right place in
 * the block style the page writes; when it can't find it, the error has no line.
 */
function locate(text: string, team?: string, needle?: string | RegExp): number | null {
  const lines = text.split(/\r?\n/);
  let start = 0;
  let end = lines.length;
  if (team !== undefined) {
    const top = (l: string) => /^[^\s#]/.test(l);
    const keyOf = (l: string) =>
      l
        .slice(0, l.indexOf(':'))
        .trim()
        .replace(/^(["'])(.*)\1$/, '$2');
    const idx = lines.findIndex((l) => top(l) && l.includes(':') && keyOf(l) === team);
    if (idx < 0) return null;
    start = idx;
    const next = lines.findIndex((l, i) => i > idx && top(l));
    end = next < 0 ? lines.length : next;
    if (needle === undefined) return idx + 1;
  }
  if (needle) {
    for (let i = start; i < end; i++) {
      if (typeof needle === 'string' ? lines[i].includes(needle) : needle.test(lines[i])) {
        return i + 1;
      }
    }
  }
  return team !== undefined ? start + 1 : null;
}

function readGender(raw: unknown, team: string, item: unknown): Gender | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const tag = scalarText(raw)?.trim().toUpperCase();
  if (tag === 'MMP') return 'male';
  if (tag === 'FMP') return 'female';
  throw new Problem('teamsYamlErrPlayer', { team, value: show(item) }, { needle: show(raw) });
}

/** A list item with nothing in it — `- ` alone, or `- #12 Marc`, where `#` starts a comment. */
const EMPTY_ITEM = /^\s*-\s*(#.*)?$/;

function readPlayer(item: unknown, team: string): PlayerInfo {
  if (item === null || item === undefined) {
    throw new Problem('teamsYamlErrPlayerEmpty', { team }, { needle: EMPTY_ITEM });
  }
  const text = scalarText(item);
  if (text !== null) {
    const parsed = parsePlayerLine(text);
    if (!parsed) {
      throw new Problem('teamsYamlErrPlayer', { team, value: text }, { needle: text });
    }
    return { id: uid(), ...parsed };
  }
  if (isMap(item)) {
    const number = scalarText(item.number ?? '')?.trim() ?? null;
    const name = scalarText(item.name ?? '')?.trim() ?? null;
    const unknown = Object.keys(item).find((k) => !['number', 'name', 'gender'].includes(k));
    if (number === null || name === null || unknown || (!number && !name)) {
      throw new Problem('teamsYamlErrPlayer', { team, value: show(item) }, { needle: 'name' });
    }
    const gender = readGender(item.gender, team, item);
    return { id: uid(), number, name, ...(gender ? { gender } : {}) };
  }
  throw new Problem('teamsYamlErrPlayer', { team, value: show(item) });
}

/**
 * Which roster player a line member means: the exact way this module writes them
 * first, then the paste-box reading of it, then a number or a name on its own when
 * exactly one player has it.
 */
function resolveRef(ref: string, players: PlayerInfo[], team: string, line: string): PlayerInfo {
  const wanted = ref.trim().toLowerCase();
  const exact = players.find((p) => formatRef(p).toLowerCase() === wanted);
  if (exact) return exact;
  const parsed = parsePlayerLine(ref);
  if (parsed) {
    const key = playerKey(parsed);
    const byKey = players.find((p) => playerKey(p) === key);
    if (byKey) return byKey;
    const matches =
      parsed.number && !parsed.name
        ? players.filter((p) => p.number.trim() === parsed.number)
        : parsed.name && !parsed.number
          ? players.filter((p) => p.name.trim().toLowerCase() === parsed.name.toLowerCase())
          : [];
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      throw new Problem('teamsYamlErrLineAmbiguous', { team, line, player: ref }, { needle: ref });
    }
  }
  throw new Problem('teamsYamlErrLinePlayer', { team, line, player: ref }, { needle: ref });
}

function readLines(raw: unknown, players: PlayerInfo[], team: string): SavedLine[] {
  if (raw === undefined || raw === null) return [];
  if (!isMap(raw)) throw new Problem('teamsYamlErrLines', { team }, { needle: 'lines' });
  const seen = new Set<string>();
  return Object.entries(raw).map(([rawName, members]) => {
    const name = rawName.trim();
    if (!name) throw new Problem('teamsYamlErrLineName', { team }, { needle: 'lines' });
    if (seen.has(name.toLowerCase())) {
      throw new Problem('teamsYamlErrDuplicateLine', { team, line: name }, { needle: rawName });
    }
    seen.add(name.toLowerCase());
    if (members !== null && !Array.isArray(members)) {
      throw new Problem('teamsYamlErrLine', { team, line: name }, { needle: rawName });
    }
    const keys: string[] = [];
    for (const member of members ?? []) {
      const ref = scalarText(member);
      if (ref === null) {
        throw new Problem(
          'teamsYamlErrLinePlayer',
          { team, line: name, player: show(member) },
          { needle: rawName },
        );
      }
      const key = playerKey(resolveRef(ref, players, team, name));
      if (!keys.includes(key)) keys.push(key);
    }
    return { id: uid(), name, playerKeys: keys };
  });
}

function readTeam(rawName: string, value: unknown): SavedTeam {
  const name = teamNameCase(rawName.trim());
  if (value === null || value === undefined) {
    throw new Problem('teamsYamlErrColorMissing', { team: name });
  }
  if (!isMap(value)) throw new Problem('teamsYamlErrTeamShape', { team: name });
  const unknown = Object.keys(value).find((k) => !TEAM_KEYS.has(k));
  if (unknown !== undefined) {
    throw new Problem('teamsYamlErrUnknownKey', { team: name, key: unknown }, { needle: unknown });
  }
  const color = value.color;
  if (color === undefined || color === null || color === '') {
    throw new Problem('teamsYamlErrColorMissing', { team: name }, { needle: 'color' });
  }
  if (typeof color !== 'string' || !HEX_COLOR.test(color.trim())) {
    throw new Problem('teamsYamlErrColor', { team: name, value: show(color) }, { needle: 'color' });
  }
  const rawPlayers = value.players;
  if (rawPlayers !== undefined && rawPlayers !== null && !Array.isArray(rawPlayers)) {
    throw new Problem('teamsYamlErrPlayers', { team: name }, { needle: 'players' });
  }
  const players: PlayerInfo[] = [];
  const keys = new Set<string>();
  for (const item of rawPlayers ?? []) {
    const player = readPlayer(item, name);
    const key = playerKey(player);
    if (keys.has(key)) {
      throw new Problem(
        'teamsYamlErrDuplicatePlayer',
        { team: name, player: formatRef(player) },
        { needle: show(item) },
      );
    }
    keys.add(key);
    players.push(player);
  }
  const lines = readLines(value.lines, players, name);
  return { name, color: color.trim(), players, lines };
}

export function parseTeamsYaml(text: string): TeamsYamlParse {
  let doc: unknown;
  try {
    doc = load(text, { schema: CORE_SCHEMA });
  } catch (e) {
    const mark = e instanceof YAMLException ? e.mark : undefined;
    const line = mark ? mark.line + 1 : null;
    return {
      ok: false,
      error: {
        key: 'teamsYamlErrSyntax',
        vars: {},
        line,
        excerpt: line ? text.split(/\r?\n/)[line - 1] : undefined,
      },
    };
  }
  if (doc === null || doc === undefined) return { ok: true, teams: [] };
  if (!isMap(doc)) {
    return { ok: false, error: { key: 'teamsYamlErrRoot', vars: {}, line: null } };
  }
  const teams: SavedTeam[] = [];
  const names = new Set<string>();
  for (const [rawName, value] of Object.entries(doc)) {
    try {
      if (!rawName.trim()) throw new Problem('teamsYamlErrTeamName', {});
      const n = normalizeTeamName(rawName);
      if (names.has(n)) {
        throw new Problem('teamsYamlErrDuplicateTeam', { team: teamNameCase(rawName.trim()) });
      }
      names.add(n);
      teams.push(readTeam(rawName, value));
    } catch (e) {
      if (!(e instanceof Problem)) throw e;
      return {
        ok: false,
        error: { key: e.key, vars: e.vars, line: locate(text, rawName, e.where.needle) },
      };
    }
  }
  return { ok: true, teams };
}
