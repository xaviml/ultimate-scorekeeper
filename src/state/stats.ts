import type { TFunc } from '../i18n/useT';
import type { GameState, LogEntry, PlayerInfo, PointRecord, TeamId } from './types';

export interface TeamStats {
  score: number;
  oLineHolds: number; // points won while on offense
  cleanHolds: number; // oLineHolds with zero turnovers all point
  breakChances: number; // times this team (as D-line) gained the disc — see teamStats
  turnovers: number; // this team's own turnovers, lifetime, net of undo
  breaks: number; // points won while on defense
  cleanBreaks: number; // breaks forced and converted with no turnover of their own
  avgHoldSeconds: number | null;
  avgBreakSeconds: number | null;
  timeoutsUsed: number;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/**
 * A hold is "clean" with zero turnovers in the point; a break is "clean" with
 * exactly one — the single turnover that handed the disc over, immediately
 * converted with none given back. See `PointRecord.turnovers`.
 */
export function teamStats(state: GameState, team: TeamId): TeamStats {
  const won = state.points.filter((p: PointRecord) => p.scoredBy === team);
  const holds = won.filter((p) => !p.isBreak);
  const breaks = won.filter((p) => p.isBreak);
  const t = state.timeoutsUsed[team];
  return {
    score: state.scores[team],
    oLineHolds: holds.length,
    cleanHolds: holds.filter((p) => p.turnovers === 0).length,
    breakChances: breakChances(state, team),
    turnovers: state.turnoversCommitted[team],
    breaks: breaks.length,
    cleanBreaks: breaks.filter((p) => p.turnovers === 1).length,
    avgHoldSeconds: avg(holds.map((p) => p.durationSeconds)),
    avgBreakSeconds: avg(breaks.map((p) => p.durationSeconds)),
    timeoutsUsed: t.half1 + t.half2,
  };
}

/**
 * A point starts with the offense holding the disc, so turnovers within it
 * strictly alternate committer: the 1st is always the offense giving it away,
 * the 2nd is the defense giving it right back, the 3rd is the offense again,
 * and so on — regardless of who eventually scores. Each odd-numbered one hands
 * the disc to the defense (the team that pulled), i.e. a break chance. That
 * count is ceil(turnovers / 2), independent of the point's outcome.
 *
 * Includes the point still in progress (via `pointTurnovers`/`pullingTeam`)
 * so a break chance earned right before a mid-point END_GAME isn't lost —
 * `pointTurnovers` is 0 whenever there's no such point (e.g. right after a
 * goal, or once the game has finished cleanly), so the term is a no-op then.
 */
function breakChances(state: GameState, team: TeamId): number {
  const other: TeamId = team === 'A' ? 'B' : 'A';
  const fromFinishedPoints = state.points
    .filter((p) => p.offense === other) // team was pulling (defense) that point
    .reduce((sum, p) => sum + Math.ceil(p.turnovers / 2), 0);
  const fromCurrentPoint = state.pullingTeam === team ? Math.ceil(state.pointTurnovers / 2) : 0;
  return fromFinishedPoints + fromCurrentPoint;
}

export interface PlayerStatLine {
  team: TeamId;
  /** Empty on the aggregate line, which stands for no one in particular. */
  playerId: string;
  label: string;
  goals: number;
  assists: number;
  total: number; // goals + assists
  /** The per-team aggregate of everything nobody was named on — see `playerStatLines`. */
  unassigned?: boolean;
}

/**
 * One line per player who has scored or assisted at least once, across the
 * given teams, sorted by goals+assists descending (ties broken by goals, then
 * name, for a stable and readable order). Reads scorer/assist attribution off
 * the goal log entries — the same place `goalPlayersDetail` reads it from —
 * rather than `points`, since a goal's players can be filled in after the
 * point already closed (SET_GOAL_PLAYERS).
 *
 * Naming a player is always optional, so the columns would otherwise quietly
 * fail to add up to the score. Each team therefore gets one **aggregate line**
 * pinned below the named players, counting the goals with no scorer and the
 * goals with no assist — the report says how much went unrecorded rather than
 * dropping it. Three things about it are deliberate:
 *
 * - **A Callahan is not unrecorded.** `callahan` on the entry is an answer to
 *   "who assisted?" — nobody, by the rules — so it is skipped rather than
 *   inflating the assists column with an assist that never existed.
 * - **It is per team**, because Player mode lists both rosters behind a team
 *   filter, and a combined line could sit in neither half of it.
 * - **It never appears alone.** With no named player anywhere, the aggregate is
 *   the whole table and it says nothing the score doesn't already — the callers
 *   hide the section on an empty result, so the line has to not be the thing
 *   that makes it non-empty.
 */
export function playerStatLines(state: GameState, teams: TeamId[], t: TFunc): PlayerStatLine[] {
  const counts = new Map<
    string,
    { team: TeamId; playerId: string; goals: number; assists: number }
  >();
  const unnamed = new Map<TeamId, { goals: number; assists: number }>();
  const bump = (team: TeamId, playerId: string, field: 'goals' | 'assists') => {
    const key = `${team}:${playerId}`;
    const cur = counts.get(key) ?? { team, playerId, goals: 0, assists: 0 };
    cur[field] += 1;
    counts.set(key, cur);
  };
  const bumpUnnamed = (team: TeamId, field: 'goals' | 'assists') => {
    const cur = unnamed.get(team) ?? { goals: 0, assists: 0 };
    cur[field] += 1;
    unnamed.set(team, cur);
  };
  for (const e of state.log) {
    if (e.type !== 'goal' || !e.team || !teams.includes(e.team)) continue;
    if (e.scorerId) bump(e.team, e.scorerId, 'goals');
    else bumpUnnamed(e.team, 'goals');
    if (e.assistId) bump(e.team, e.assistId, 'assists');
    else if (!e.callahan) bumpUnnamed(e.team, 'assists');
  }
  const lines = [...counts.values()].map(({ team, playerId, goals, assists }) => ({
    team,
    playerId,
    label: playerLabel(findPlayer(state.config.players[team], playerId)),
    goals,
    assists,
    total: goals + assists,
  }));
  if (lines.length === 0) return [];
  lines.sort((a, b) => b.total - a.total || b.goals - a.goals || a.label.localeCompare(b.label));

  const aggregates = teams.flatMap((team) => {
    const u = unnamed.get(team);
    if (!u || u.goals + u.assists === 0) return [];
    return [
      {
        team,
        playerId: '',
        label: t('unassignedPlayers'),
        goals: u.goals,
        assists: u.assists,
        total: u.goals + u.assists,
        unassigned: true,
      },
    ];
  });
  return [...lines, ...aggregates];
}

export function findPlayer(players: PlayerInfo[], id?: string): PlayerInfo | undefined {
  if (!id) return undefined;
  return players.find((p) => p.id === id);
}

export function playerLabel(player?: PlayerInfo): string {
  if (!player) return '';
  return player.number ? `#${player.number} ${player.name}`.trim() : player.name;
}

/**
 * Scorer/assist suffix for a goal log entry, e.g. " — #7 Alex, assist: #9 Sam".
 * Returns '' for non-goals and for goals with no attribution, so it can be
 * dropped straight into JSX or concatenated into the plain-text report.
 *
 * A Callahan takes the assist's place in the list rather than being a flag
 * beside it — it is what was answered when the assist was asked for, and the
 * report's aggregate line reads it the same way (see `playerStatLines`). It also
 * stands on its own, so a Callahan with nobody named still says so.
 */
export function goalPlayersDetail(state: GameState, e: LogEntry, t: TFunc): string {
  if (e.type !== 'goal' || !e.team || (!e.scorerId && !e.assistId && !e.callahan)) return '';
  const roster = state.config.players[e.team];
  const scorer = playerLabel(findPlayer(roster, e.scorerId));
  const assist = playerLabel(findPlayer(roster, e.assistId));
  const parts: string[] = [];
  if (scorer) parts.push(scorer);
  if (e.callahan) parts.push(t('callahan'));
  else if (assist) parts.push(t('assistedBy', { name: assist }));
  return parts.length ? ` — ${parts.join(', ')}` : '';
}

/**
 * Player suffix for a turnover log entry, e.g. " — turn: #7 Alex, D: #3 Sam".
 * The entry's team is the side that lost the disc, so the defender is looked up
 * in the other roster. Either half is optional (both are skippable in the dialog).
 */
export function turnoverPlayersDetail(state: GameState, e: LogEntry, t: TFunc): string {
  if (e.type !== 'turnover' || !e.team || (!e.turnoverId && !e.defenseId)) return '';
  const lost = playerLabel(findPlayer(state.config.players[e.team], e.turnoverId));
  const forced = playerLabel(
    findPlayer(state.config.players[e.team === 'A' ? 'B' : 'A'], e.defenseId),
  );
  const parts: string[] = [];
  if (lost) parts.push(t('turnoverBy', { name: lost }));
  if (forced) parts.push(t('defenseBy', { name: forced }));
  return parts.length ? ` — ${parts.join(', ')}` : '';
}

/**
 * Detail suffix for the two call log entries, e.g. "Foul" when it is made and
 * "Foul — Contested (resolved in 14s)" when it is settled. Returns '' for every
 * other entry type so it can be dropped straight into the log table.
 */
export function callDetail(e: LogEntry, t: TFunc): string {
  if (!e.callKind) return '';
  const kind = t(`callKind_${e.callKind}` as never);
  if (e.type === 'call') return kind;
  if (e.type !== 'callResolved' || !e.resolution) return '';
  const how = t(`callResolution_${e.resolution}` as never);
  const took = t('callResolvedIn', { n: e.resolutionSeconds ?? 0 });
  return `${kind} — ${how} (${took})`;
}

/**
 * Detail suffix for the two stoppage log entries, e.g. "Injury — #7 Alex" when
 * it is logged (the player, if any, comes from `e.detail` — an injury is the
 * only stoppage kind that ever carries one) and "Technical — resolved in 42s"
 * when it is resolved. Returns '' for every other entry type so it can be
 * dropped straight into the log table.
 *
 * This is the one place `e.detail` gets rendered for a stoppage entry — see
 * GameLogTable/ReportScreen, which skip their own generic `e.detail` output for
 * these entries so the player name isn't printed twice.
 */
export function stoppageDetail(e: LogEntry, t: TFunc): string {
  if (!e.stoppageKind) return '';
  const kind = t(`stoppageKind_${e.stoppageKind}` as never);
  if (e.type === 'stoppage') return e.detail ? `${kind} — ${e.detail}` : kind;
  if (e.type !== 'stoppageResolved') return '';
  return `${kind} — ${t('callResolvedIn', { n: e.resolutionSeconds ?? 0 })}`;
}

/**
 * How long the clock was stopped, for the row that says it started running again:
 * "lasted 42s". The game clock is frozen for the whole pause, so this is the one
 * duration in the log that `gameSeconds` cannot be read off — it comes from
 * `pauseElapsedSeconds`, counted by TICK (see SOTG_TOGGLE).
 */
export function pauseDetail(e: LogEntry, t: TFunc): string {
  if (e.type !== 'sotgEnd' && e.type !== 'pauseEnd') return '';
  return t('logLasted', { n: e.resolutionSeconds ?? 0 });
}

/** How long a late pull took, e.g. "took 82s" — see `resolutionSeconds` on `latePull`. */
export function latePullDetail(e: LogEntry, t: TFunc): string {
  if (e.type !== 'latePull') return '';
  return t('logPullTook', { n: e.resolutionSeconds ?? 0 });
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
