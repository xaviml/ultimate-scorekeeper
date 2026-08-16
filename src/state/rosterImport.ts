import type { PlayerInfo } from './types';
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
]);

const cleanName = (raw: string) =>
  raw
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_NAME);

const cleanNumber = (raw: string) => raw.replace(/\D/g, '').slice(0, MAX_NUMBER_DIGITS);

const hasLetter = (s: string) => /\p{L}/u.test(s);

/** A line that is nothing but a shirt number: `23`, `#23`, `23.`. */
const NUMBER_ONLY = /^#?\s*\d{1,3}\s*\.?$/;
/** Leading number: `12 John Doe`, `#12 - John Doe`, `12. John Doe`. */
const LEADING_NUMBER = /^#?\s*(\d{1,3})\s*[.)\-–:]?\s+(.+)$/;
/** Trailing number: `John Doe 12`, `John Doe #12`, `John Doe - 12`. */
const TRAILING_NUMBER = /^(.+?)[\s,\-–:]+#?\s*(\d{1,3})$/;

function parseLine(line: string): ParsedPlayer | null {
  const leading = LEADING_NUMBER.exec(line);
  if (leading && hasLetter(leading[2])) {
    return { number: cleanNumber(leading[1]), name: cleanName(leading[2]) };
  }
  const trailing = TRAILING_NUMBER.exec(line);
  if (trailing && hasLetter(trailing[1])) {
    return { number: cleanNumber(trailing[2]), name: cleanName(trailing[1]) };
  }
  // Either half on its own is a valid player, matching what the roster editor
  // accepts by hand: a name with no number (nobody knows the numbers yet), or a
  // bare number (a shirt with no name attached to it, which is most of what a
  // scorekeeper can actually see from the sideline).
  if (NUMBER_ONLY.test(line)) return { number: cleanNumber(line), name: '' };
  if (hasLetter(line)) return { number: '', name: cleanName(line) };
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

const dedupeKey = (p: { number: string; name: string }) =>
  `${p.number.trim().toLowerCase()}|${p.name.trim().toLowerCase()}`;

/**
 * Reads a pasted or uploaded roster: one player per line, as a number and a
 * name, a name on its own, or a number on its own.
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
    added.push({ id: uid(), number: p.number, name: p.name });
  }
  return {
    players: [...base, ...added],
    added: added.length,
    duplicates: parsed.length - added.length,
  };
}
