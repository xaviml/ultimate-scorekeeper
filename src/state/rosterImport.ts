import type { Gender, PlayerInfo } from './types';
import { uid } from './uid';

/**
 * Reading a roster somebody else already wrote down.
 *
 * At a tournament every scorekeeper types the same two rosters into their own
 * phone, from a list that already exists somewhere — a spreadsheet, a WhatsApp
 * message, a text file the organiser sent. This module is the "already exists"
 * half: one player per line, and nothing else. A chosen file is plain text in
 * exactly the format the paste box takes, so there is a single format to
 * explain, a single one to keep working, and the preview shows the same thing
 * either way.
 *
 * It is pure and returns counts rather than throwing, because the dialog shows
 * a preview before anything is applied — the volunteer's eyes are the last
 * validation step, so the parser's job is to make a best effort and be honest
 * about what it dropped.
 */

/** A player as read from text: no id yet, because nothing has been imported. */
export interface ParsedPlayer {
  number: string;
  name: string;
  /** MMP/FMP, when the line carried a marking — see `splitGender`. */
  gender?: Gender;
}

export interface RosterParse {
  players: ParsedPlayer[];
  /**
   * Non-blank lines that produced nothing usable, as a count rather than a
   * list — the volunteer needs to know the paste was lossy (a footer, a stray
   * column), not to debug line 14.
   */
  skipped: number;
}

/** Matches the roster editor's own limits, so an imported player is one that could have been typed. */
const MAX_NAME = 40;
const MAX_NUMBER_DIGITS = 3;

const HEADER_WORDS = new Set([
  '#',
  'no',
  'no.',
  'num',
  'num.',
  'number',
  'numero',
  'número',
  'nº',
  'dorsal',
  'name',
  'nombre',
  'nom',
  'player',
  'jugador',
  'jugadora',
  'jugador/a',
  'apellido',
  'apellidos',
  'cognoms',
  'surname',
  // A spreadsheet's gender column, so "# Name Gender" is read as a header. MMP and
  // FMP are deliberately NOT header words: a line that is only "MMP" is a player
  // called MMP (see splitGender), and header words are dropped rather than kept.
  'gender',
  'genero',
  'género',
  'gènere',
  'sex',
  'sexo',
  'sexe',
]);

const cleanName = (raw: string) =>
  raw
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_NAME);

const cleanNumber = (raw: string) => raw.replace(/\D/g, '').slice(0, MAX_NUMBER_DIGITS);

const hasLetter = (s: string) => /\p{L}/u.test(s);

/** A trailing MMP/FMP marking: `29 Xavi MMP`, `Xavi FMP`, `29 MMP`, `Xavi, MMP`. */
const TRAILING_GENDER = /^(.*?)[\s,\-–:([]+(mmp|fmp)\s*[)\]]?$/i;

/**
 * Peels a trailing MMP/FMP off a line, returning what is left to parse as a player.
 *
 * It only counts as a marking when something else is on the line: a line that is
 * *only* `MMP` is a player called MMP, because a marking with nobody attached is not
 * a roster entry, and someone whose name really is those three letters would
 * otherwise vanish. That is also why the abbreviations are matched exactly rather
 * than a leading `M`/`F` — "Xavi M" is a middle initial far more often than a
 * marking.
 */
function splitGender(line: string): { rest: string; gender?: Gender } {
  const match = TRAILING_GENDER.exec(line);
  if (!match) return { rest: line };
  const rest = match[1].trim();
  if (!rest) return { rest: line };
  return { rest, gender: match[2].toLowerCase() === 'mmp' ? 'male' : 'female' };
}

/** A line that is nothing but a shirt number: `23`, `#23`, `23.`. */
const NUMBER_ONLY = /^#?\s*\d{1,3}\s*\.?$/;
/** Leading number: `12 John Doe`, `#12 - John Doe`, `12. John Doe`. */
const LEADING_NUMBER = /^#?\s*(\d{1,3})\s*[.)\-–:]?\s+(.+)$/;
/** Trailing number: `John Doe 12`, `John Doe #12`, `John Doe - 12`. */
const TRAILING_NUMBER = /^(.+?)[\s,\-–:]+#?\s*(\d{1,3})$/;

function parseLine(raw: string): ParsedPlayer | null {
  const { rest: line, gender } = splitGender(raw);
  const marking = gender ? { gender } : {};
  const leading = LEADING_NUMBER.exec(line);
  if (leading && hasLetter(leading[2])) {
    return { number: cleanNumber(leading[1]), name: cleanName(leading[2]), ...marking };
  }
  const trailing = TRAILING_NUMBER.exec(line);
  if (trailing && hasLetter(trailing[1])) {
    return { number: cleanNumber(trailing[2]), name: cleanName(trailing[1]), ...marking };
  }
  // Either half on its own is a valid player, matching what the roster editor
  // accepts by hand: a name with no number (nobody knows the numbers yet), or a
  // bare number (a shirt with no name attached to it, which is most of what a
  // scorekeeper can actually see from the sideline).
  if (NUMBER_ONLY.test(line)) return { number: cleanNumber(line), name: '', ...marking };
  if (hasLetter(line)) return { number: '', name: cleanName(line), ...marking };
  return null;
}

function isHeaderLine(line: string): boolean {
  const fields = line
    .split(/\s+/)
    .map((f) => f.trim().toLowerCase())
    .filter((f) => f.length > 0);
  if (fields.length === 0) return false;
  return fields.every((f) => HEADER_WORDS.has(f));
}

/**
 * The identity of a player as a human typed them: trimmed, case-folded number and
 * name. It is the import's duplicate rule (and the roster editor's), and it is also
 * how a saved line refers to its players — ids are re-minted per game, these are
 * not. Shared so the two can never disagree about whether two rows are the same
 * person.
 */
export const playerKey = (p: { number: string; name: string }) =>
  `${p.number.trim().toLowerCase()}|${p.name.trim().toLowerCase()}`;

const dedupeKey = playerKey;

/**
 * Reads a pasted or uploaded roster: one player per line, as a number and a
 * name, a name on its own, or a number on its own — each optionally followed by an
 * MMP/FMP marking.
 */
export function parseRoster(text: string): RosterParse {
  const trimmed = text.trim();
  if (!trimmed) return { players: [], skipped: 0 };

  const players: ParsedPlayer[] = [];
  let skipped = 0;
  let seenPlayer = false;
  for (const raw of trimmed.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // Only the first meaningful line can be a header: "Name" further down is a
    // player called Name, and dropping it would be worse than keeping a header.
    if (!seenPlayer && isHeaderLine(line)) {
      seenPlayer = true;
      continue;
    }
    const parsed = parseLine(line);
    if (parsed && (parsed.name || parsed.number)) {
      players.push(parsed);
      seenPlayer = true;
    } else skipped++;
  }
  return dedupe({ players, skipped });
}

/** Two identical lines in the source are one player, not two — same rule the roster editor enforces by hand. */
function dedupe(parse: RosterParse): RosterParse {
  const seen = new Set<string>();
  const players = parse.players.filter((p) => {
    const key = dedupeKey(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ...parse, players };
}

/**
 * A file has to be plain text in the paste box's own format. `accept` on the
 * input is only a hint — most Android pickers hand back whatever was tapped —
 * so the extension and type are checked here, where a wrong file can be
 * refused with an explanation instead of parsing into nonsense.
 */
export function isTextRosterFile(file: File): boolean {
  return /\.txt$/i.test(file.name) || file.type === 'text/plain';
}

export interface ImportResult {
  players: PlayerInfo[];
  /** Players actually added — what the confirmation should count. */
  added: number;
  /** Parsed players already on the roster, skipped rather than duplicated. */
  duplicates: number;
}

/**
 * Folds a parse into a roster. `replace` starts from empty; otherwise imported
 * players are appended and anything already there (same number and name, the
 * roster editor's own duplicate rule) is skipped, so importing the same list
 * twice is harmless.
 */
export function applyImport(
  existing: PlayerInfo[],
  parsed: ParsedPlayer[],
  replace: boolean,
): ImportResult {
  const base = replace ? [] : existing;
  const seen = new Set(base.map(dedupeKey));
  const added: PlayerInfo[] = [];
  for (const p of parsed) {
    const key = dedupeKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    // The marking rides along, but it is not part of the identity: the same person
    // marked differently in two rows is one duplicate, not two players.
    added.push({
      id: uid(),
      number: p.number,
      name: p.name,
      ...(p.gender ? { gender: p.gender } : {}),
    });
  }
  return {
    players: [...base, ...added],
    added: added.length,
    duplicates: parsed.length - added.length,
  };
}
