import type { TFunc } from '../i18n/useT';
import { turnoverPlayersTracked } from './gameReducer';
import { sortPlayers } from './lines';
import { playerStatLines } from './stats';
import type { GameState, PlayerInfo, TeamId } from './types';

/** How many of the most recent points the line sheet's strip shows. */
export const STRIP_POINTS = 6;

/**
 * One point in a player's strip, from the followed team's side.
 *
 * - `played` — on the field for it (a substitution either way included: they took
 *   part). `seconds` is how long it ran. Who scored it is deliberately not here:
 *   the strip answers "did they play, and how long"; Hold and Brk say how it went.
 * - `out` — a line was registered and they were not in it.
 * - `unknown` — no line was registered for that point, so nobody can say.
 * - `pending` — the point being played right now, with them on the field; shown only
 *   while the next line is being picked, since its result is not in yet.
 */
export type StripMark =
  { kind: 'played'; seconds: number } | { kind: 'out' } | { kind: 'unknown' } | { kind: 'pending' };

export interface PlayerRotation {
  /** Finished points played. */
  played: number;
  /** Offence points played, and how many of them were held. */
  oPlayed: number;
  holds: number;
  /** Defence points played, and how many of them were broken. */
  dPlayed: number;
  breaks: number;
  /** Turnovers this player lost the disc on, and turnovers they forced. */
  turns: number;
  defenses: number;
  /**
   * Points sat out since they were last on the field, newest first. Points with no
   * line registered are skipped — they neither add rest nor end it. Null when they
   * have not played a known point yet this game, which ranks as the most rested.
   */
  rest: number | null;
  /** The last `STRIP_POINTS` points, oldest first; null pads a game younger than that. */
  strip: (StripMark | null)[];
}

export interface LineRotation {
  players: Map<string, PlayerRotation>;
  /** Longest point in the strip window, which bar heights are scaled against. */
  maxSeconds: number;
  /**
   * Whether the Turns and Ds columns mean anything: the game asks who turned it over,
   * or somebody was named anyway from the log editor — the report's Possession gate.
   */
  possession: boolean;
  /** Each predefined line's record by name: points won out of points it played. */
  savedLines: Map<string, { won: number; played: number }>;
}

/**
 * What the line dialog shows beside each player, so whoever picks the line can see
 * who is fresh, who has been on for a run of points, and how each player's points
 * have gone — read from the finished points' recorded lines and the log.
 *
 * `inProgress` adds the point being played as the strip's last slot. It is set while
 * the *next* line is being picked: that point is not over, but whether someone is on
 * the field for it is exactly what decides whether they are rested for the next one.
 * When the line being picked is the point in progress itself, it is left out.
 */
export function lineRotation(
  state: GameState,
  team: TeamId,
  t: TFunc,
  { inProgress = false }: { inProgress?: boolean } = {},
): LineRotation {
  const totals = new Map(
    playerStatLines(state, [team], t)
      .filter((l) => l.playerId)
      .map((l) => [l.playerId, l]),
  );

  type Slot = { line: string[] | null; seconds: number; pending: boolean };
  const timeline: Slot[] = state.points.map((p) => ({
    line: p.line && p.line.length > 0 ? p.line.map((lp) => lp.playerId) : null,
    seconds: p.durationSeconds,
    pending: false,
  }));
  if (inProgress) {
    timeline.push({
      line: state.pointLine.length > 0 ? state.pointLine.map((lp) => lp.playerId) : null,
      seconds: 0,
      pending: true,
    });
  }
  const window = timeline.slice(-STRIP_POINTS);
  const maxSeconds = Math.max(0, ...window.filter((s) => !s.pending).map((s) => s.seconds));

  const markFor = (slot: Slot, id: string): StripMark => {
    if (!slot.line) return { kind: 'unknown' };
    if (!slot.line.includes(id)) return { kind: 'out' };
    return slot.pending ? { kind: 'pending' } : { kind: 'played', seconds: slot.seconds };
  };

  const restFor = (id: string): number | null => {
    let rest = 0;
    for (let i = timeline.length - 1; i >= 0; i--) {
      const line = timeline[i].line;
      if (!line) continue;
      if (line.includes(id)) return rest;
      rest += 1;
    }
    return null;
  };

  const players = new Map<string, PlayerRotation>();
  let named = false;
  for (const player of state.config.players[team]) {
    const total = totals.get(player.id);
    if (total && (total.turns > 0 || total.defenses > 0)) named = true;
    const marks = window.map((slot) => markFor(slot, player.id));
    players.set(player.id, {
      played: total?.pointsPlayed ?? 0,
      oPlayed: total?.oPoints ?? 0,
      holds: total?.holds ?? 0,
      dPlayed: total?.dPoints ?? 0,
      breaks: total?.breaks ?? 0,
      turns: total?.turns ?? 0,
      defenses: total?.defenses ?? 0,
      rest: restFor(player.id),
      strip: [...Array<null>(STRIP_POINTS - marks.length).fill(null), ...marks],
    });
  }

  const savedLines = new Map<string, { won: number; played: number }>();
  for (const p of state.points) {
    if (!p.lineName || !p.line || p.line.length === 0) continue;
    const rec = savedLines.get(p.lineName) ?? { won: 0, played: 0 };
    rec.played += 1;
    if (p.scoredBy === team) rec.won += 1;
    savedLines.set(p.lineName, rec);
  }

  return {
    players,
    maxSeconds,
    possession: turnoverPlayersTracked(state.config) || named,
    savedLines,
  };
}

/**
 * Most rested first: the longest off the field leads, anyone yet to play ahead of
 * everyone. Ties go to whoever has played fewer points, then to shirt number — so a
 * fresh game, where nobody has rest to compare, reads as the plain team sheet.
 */
export function sortByRest(players: PlayerInfo[], rotation: LineRotation): PlayerInfo[] {
  const restOf = (p: PlayerInfo) => rotation.players.get(p.id)?.rest ?? null;
  const rank = (p: PlayerInfo) => restOf(p) ?? Number.POSITIVE_INFINITY;
  const played = (p: PlayerInfo) => rotation.players.get(p.id)?.played ?? 0;
  return sortPlayers(players, 'number').sort((a, b) => rank(b) - rank(a) || played(a) - played(b));
}
