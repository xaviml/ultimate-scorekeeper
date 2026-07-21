import type { TFunc } from '../i18n/useT';
import type { GameState, LogEntry, PlayerInfo, PointRecord, TeamId } from './types';

export interface TeamStats {
  score: number;
  oLineHolds: number; // points won while on offense
  breaks: number; // points won while on defense
  avgHoldSeconds: number | null;
  avgBreakSeconds: number | null;
  timeoutsUsed: number;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function teamStats(state: GameState, team: TeamId): TeamStats {
  const won = state.points.filter((p: PointRecord) => p.scoredBy === team);
  const holds = won.filter((p) => !p.isBreak);
  const breaks = won.filter((p) => p.isBreak);
  const t = state.timeoutsUsed[team];
  return {
    score: state.scores[team],
    oLineHolds: holds.length,
    breaks: breaks.length,
    avgHoldSeconds: avg(holds.map((p) => p.durationSeconds)),
    avgBreakSeconds: avg(breaks.map((p) => p.durationSeconds)),
    timeoutsUsed: t.half1 + t.half2,
  };
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
 */
export function goalPlayersDetail(state: GameState, e: LogEntry, t: TFunc): string {
  if (e.type !== 'goal' || !e.team || (!e.scorerId && !e.assistId)) return '';
  const roster = state.config.players[e.team];
  const scorer = playerLabel(findPlayer(roster, e.scorerId));
  const assist = playerLabel(findPlayer(roster, e.assistId));
  const parts: string[] = [];
  if (scorer) parts.push(scorer);
  if (assist) parts.push(t('assistedBy', { name: assist }));
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

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
