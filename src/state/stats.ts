import type { TFunc } from '../i18n/useT';
import { lineTeam } from './lines';
import type { GameState, LogEntry, PlayerInfo, PointRecord, TeamId } from './types';

export interface TeamStats {
  score: number;
  oLineHolds: number; // points won while on offense
  oPoints: number; // finished points this team started on offense — what holds are out of
  cleanHolds: number; // oLineHolds with zero turnovers all point
  breakChances: number; // times this team (as D-line) gained the disc — see teamStats
  turnovers: number; // this team's own turnovers, lifetime, net of undo
  breaks: number; // points won while on defense
  cleanBreaks: number; // breaks forced and converted with no turnover of their own
  timeoutsUsed: number;
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
    oPoints: state.points.filter((p) => p.offense === team).length,
    cleanHolds: holds.filter((p) => p.turnovers === 0).length,
    breakChances: breakChances(state, team),
    turnovers: state.turnoversCommitted[team],
    breaks: breaks.length,
    cleanBreaks: breaks.filter((p) => p.turnovers === 1).length,
    timeoutsUsed: t.half1 + t.half2,
  };
}

/**
 * A point starts with the offense holding the disc, so turnovers within it
 * strictly alternate committer: the 1st is always the offense giving it away,
 * the 2nd is the defense giving it right back, the 3rd is the offense again,
 * and so on — regardless of who eventually scores. Each odd-numbered one hands
 * the disc to the defense (the team that pulled), i.e. a break chance. That
 * count is ceil(turnovers / 2), independent of the point's outcome — except
 * that a break scored on a point with no turnover recorded still counts one.
 *
 * Includes the point still in progress (via `pointTurnovers`/`pullingTeam`)
 * so a break chance earned right before a mid-point END_GAME isn't lost —
 * `pointTurnovers` is 0 whenever there's no such point (e.g. right after a
 * goal), so the term is a no-op then. The one exception is the goal that
 * *wins* the game: `finishGame` returns before that reset runs, so
 * `pointTurnovers`/`pullingTeam` are left holding the just-finished point's
 * values — which `fromFinishedPoints` has already counted via `state.points`.
 * Adding the current-point term on top of that would double it, so it is
 * skipped once the game is `finished`.
 */
function breakChances(state: GameState, team: TeamId): number {
  const other: TeamId = team === 'A' ? 'B' : 'A';
  // A break the team scored was a chance taken, even with no turnover recorded on
  // that point — a Callahan, or a Turn tap that never happened — so it counts at
  // least one; otherwise the report would show more breaks than chances.
  const fromFinishedPoints = state.points
    .filter((p) => p.offense === other) // team was pulling (defense) that point
    .reduce((sum, p) => sum + Math.max(Math.ceil(p.turnovers / 2), p.scoredBy === team ? 1 : 0), 0);
  const fromCurrentPoint =
    state.status !== 'finished' && state.pullingTeam === team
      ? Math.ceil(state.pointTurnovers / 2)
      : 0;
  return fromFinishedPoints + fromCurrentPoint;
}

/**
 * The `topTeam` share of a point's tracked possession, for the possession
 * ledger. A point tapped in a breath after the pull finishes with zero seconds
 * accrued, and a flat column there reads as a bug — so it falls back to
 * counting possessions instead: the offense held the disc first and every
 * turnover flipped it, so with n turnovers the offense had ceil((n+1)/2) of
 * the n+1 possessions. Null only when the point predates possession tracking
 * entirely (a legacy save), where inventing a share would state something false.
 */
export function possessionTopShare(point: PointRecord, topTeam: TeamId): number | null {
  const seconds = point.possessionSeconds;
  if (!seconds) return null;
  const total = seconds.A + seconds.B;
  if (total > 0) return seconds[topTeam] / total;
  const possessions = point.turnovers + 1;
  const offenseShare = Math.ceil(possessions / 2) / possessions;
  return point.offense === topTeam ? offenseShare : 1 - offenseShare;
}

export interface PlayerStatLine {
  team: TeamId;
  /** Empty on the aggregate line, which stands for no one in particular. */
  playerId: string;
  label: string;
  goals: number;
  assists: number;
  total: number; // goals + assists
  /**
   * Points this player took the field for, from `PointRecord.line`. Zero for every
   * line when line tracking is off, which is what collapses the table back to the
   * scoring columns it has always had.
   */
  pointsPlayed: number;
  /** Of `pointsPlayed`, the ones their team received the pull for (O) and pulled (D). */
  oPoints: number;
  dPoints: number;
  /** Points played that their team won, and won from defence. */
  holds: number;
  breaks: number;
  /** Points played won minus points played lost. */
  plusMinus: number;
  /**
   * Turnovers attributed to this player, from the log's `turnoverId`. Zero means
   * zero, whether or not anybody was ever named: an unattributed turnover is not
   * this player's, so the honest figure for them is none.
   */
  turns: number;
  /**
   * Turnovers this player forced, from the log's `defenseId` — the blocks and the
   * marks that ran the stall out. The entry belongs to the team that *lost* the
   * disc, so a defence is counted against the other roster (see `turnoverPlayersDetail`).
   */
  defenses: number;
  /** Break chances while on the field — the same ceil(turnovers / 2) as `teamStats`. */
  breakChances: number;
  /** Predefined lines this player appeared in, by name, with how many points each. */
  lines: { name: string; points: number }[];
  /** The per-team aggregate of everything nobody was named on — see `playerStatLines`. */
  unassigned?: boolean;
}

/** The three column groups the report offers behind pills — see `sortPlayerStatLines`. */
export type PlayerStatView = 'scoring' | 'playing' | 'possession';

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
 * pinned below the named players, counting the goals with no scorer and the goals
 * with no assist — the report says how much went unrecorded rather than dropping it.
 * It stops there: an unattributed *turnover* is nobody's, since the disc going back
 * the other way says nothing about who lost it or whether anyone won it, so the
 * possession columns carry no aggregate figure at all. Three things about it are
 * deliberate:
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
 *
 * With line tracking on (see lines.ts) the same table also carries who was on the
 * field, read off `PointRecord.line`. That widens two things. A player who took ten
 * points without scoring now gets a row — the inclusion test is "did anything happen
 * involving this player", not "did they score" — and the aggregate additionally
 * counts the **points with no line recorded**, so the points column adds up to the
 * game instead of quietly under-reporting the ones nobody registered. With line
 * tracking off no point carries a `line`, so every one of those fields is zero, the
 * inclusion test collapses back to goals-or-assists, and the table is exactly what
 * it has always been.
 */
export function playerStatLines(state: GameState, teams: TeamId[], t: TFunc): PlayerStatLine[] {
  type Acc = {
    team: TeamId;
    playerId: string;
    goals: number;
    assists: number;
    pointsPlayed: number;
    oPoints: number;
    dPoints: number;
    holds: number;
    breaks: number;
    plusMinus: number;
    turns: number;
    defenses: number;
    breakChances: number;
    lines: Map<string, number>;
  };
  const counts = new Map<string, Acc>();
  const unnamed = new Map<TeamId, { goals: number; assists: number; pointsPlayed: number }>();
  const acc = (team: TeamId, playerId: string): Acc => {
    const key = `${team}:${playerId}`;
    const cur: Acc = counts.get(key) ?? {
      team,
      playerId,
      goals: 0,
      assists: 0,
      pointsPlayed: 0,
      oPoints: 0,
      dPoints: 0,
      holds: 0,
      breaks: 0,
      plusMinus: 0,
      turns: 0,
      defenses: 0,
      breakChances: 0,
      lines: new Map(),
    };
    counts.set(key, cur);
    return cur;
  };
  const bumpUnnamed = (team: TeamId, field: 'goals' | 'assists' | 'pointsPlayed') => {
    const cur = unnamed.get(team) ?? { goals: 0, assists: 0, pointsPlayed: 0 };
    cur[field] += 1;
    unnamed.set(team, cur);
  };
  for (const e of state.log) {
    if (e.type === 'goal' && e.team && teams.includes(e.team)) {
      if (e.scorerId) acc(e.team, e.scorerId).goals += 1;
      else bumpUnnamed(e.team, 'goals');
      if (e.assistId) acc(e.team, e.assistId).assists += 1;
      else if (!e.callahan) bumpUnnamed(e.team, 'assists');
    }
    // A turnover's team is the side that lost the disc, which is who `turnoverId`
    // belongs to; `defenseId` is the player who forced it and therefore belongs to
    // the *other* roster — one entry feeds a turn on one side and a D on the other.
    // An unattributed half is counted for nobody, unlike an unattributed goal: a
    // turnover the other team gave away is not a D for anyone here (their throw may
    // simply have missed), so there is no figure the aggregate could honestly claim.
    if (e.type === 'turnover' && e.team) {
      const defending: TeamId = e.team === 'A' ? 'B' : 'A';
      if (e.turnoverId && teams.includes(e.team)) acc(e.team, e.turnoverId).turns += 1;
      if (e.defenseId && teams.includes(defending)) acc(defending, e.defenseId).defenses += 1;
    }
  }

  // Line tracking follows one team, so a point's `line` belongs to `trackedTeam`.
  // Points recorded before it was switched on carry no `line` at all and fall to the
  // aggregate, which is exactly how an unregistered point should read.
  const tracked = lineTeam(state.config);
  if (tracked && teams.includes(tracked)) {
    for (const p of state.points) {
      if (!p.line || p.line.length === 0) {
        bumpUnnamed(tracked, 'pointsPlayed');
        continue;
      }
      const onOffense = p.offense === tracked;
      const won = p.scoredBy === tracked;
      const chances = onOffense ? 0 : Math.ceil(p.turnovers / 2);
      for (const { playerId } of p.line) {
        const a = acc(tracked, playerId);
        a.pointsPlayed += 1;
        if (onOffense) a.oPoints += 1;
        else a.dPoints += 1;
        if (won) {
          if (onOffense) a.holds += 1;
          else a.breaks += 1;
        }
        a.plusMinus += won ? 1 : -1;
        a.breakChances += chances;
        if (p.lineName) a.lines.set(p.lineName, (a.lines.get(p.lineName) ?? 0) + 1);
      }
    }
  }

  const lines: PlayerStatLine[] = [...counts.values()].map(({ lines: named, ...rest }) => ({
    ...rest,
    label: playerLabel(findGamePlayer(state, rest.team, rest.playerId)),
    total: rest.goals + rest.assists,
    lines: [...named.entries()]
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)),
  }));
  if (lines.length === 0) return [];
  const sorted = sortPlayerStatLines(lines, 'scoring');

  const aggregates: PlayerStatLine[] = teams.flatMap((team) => {
    const u = unnamed.get(team);
    if (!u || u.goals + u.assists + u.pointsPlayed === 0) return [];
    return [
      {
        team,
        playerId: '',
        label: t('unassignedPlayers'),
        goals: u.goals,
        assists: u.assists,
        total: u.goals + u.assists,
        pointsPlayed: u.pointsPlayed,
        oPoints: 0,
        dPoints: 0,
        holds: 0,
        breaks: 0,
        plusMinus: 0,
        turns: 0,
        defenses: 0,
        breakChances: 0,
        lines: [],
        unassigned: true,
      },
    ];
  });
  return [...sorted, ...aggregates];
}

/**
 * Orders the table for one view, so the screen, the copied text and the shared card
 * can never disagree about who is at the top. Each view sorts by the column it is
 * about — a Defence view ranked by goals would be answering a different question —
 * and every one falls back to the label, so the order is stable and readable.
 *
 * The aggregate always ends up last, whatever the view. It stands for nobody, so
 * ranked among the players it would read as a very good one; pinning it here rather
 * than in the caller means re-sorting a list that already contains it (which the
 * report does on every view switch) can't shuffle it back into the middle.
 */
export function sortPlayerStatLines(
  lines: PlayerStatLine[],
  view: PlayerStatView,
): PlayerStatLine[] {
  const byLabel = (a: PlayerStatLine, b: PlayerStatLine) => a.label.localeCompare(b.label);
  const rank: Record<PlayerStatView, (a: PlayerStatLine, b: PlayerStatLine) => number> = {
    playing: (a, b) =>
      b.pointsPlayed - a.pointsPlayed || b.plusMinus - a.plusMinus || byLabel(a, b),
    // Ranked by the defences made, not by the first column: Turns leads the view
    // because it is the disc's story in order, but a table sorted by it would be a
    // leaderboard of the sloppiest player on the team.
    possession: (a, b) =>
      b.defenses - a.defenses || b.breakChances - a.breakChances || byLabel(a, b),
    scoring: (a, b) => b.total - a.total || b.goals - a.goals || byLabel(a, b),
  };
  return [...lines].sort(
    (a, b) => Number(a.unassigned ?? false) - Number(b.unassigned ?? false) || rank[view](a, b),
  );
}

export function findPlayer(players: PlayerInfo[], id?: string): PlayerInfo | undefined {
  if (!id) return undefined;
  return players.find((p) => p.id === id);
}

/**
 * A player of this game by id: the roster first, then whoever was removed from it
 * mid-game. Everything that names a player for something already recorded — the log,
 * the report — goes through this, so taking someone off the roster stops the pickers
 * offering them without blanking out the goals they already scored.
 */
export function findGamePlayer(
  state: GameState,
  team: TeamId,
  id?: string,
): PlayerInfo | undefined {
  return findPlayer(state.config.players[team], id) ?? findPlayer(state.removedPlayers[team], id);
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
  const scorer = playerLabel(findGamePlayer(state, e.team, e.scorerId));
  const assist = playerLabel(findGamePlayer(state, e.team, e.assistId));
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
  const lost = playerLabel(findGamePlayer(state, e.team, e.turnoverId));
  const forced = playerLabel(findGamePlayer(state, e.team === 'A' ? 'B' : 'A', e.defenseId));
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

/**
 * How long the point took, on the goal that ended it: "in 1m 30s". Reads
 * `pointSeconds` off the entry — the same duration the point's `PointRecord`
 * carries — and says nothing when the point had no recorded start.
 */
export function pointDurationDetail(e: LogEntry, t: TFunc): string {
  if (e.type !== 'goal' || e.pointSeconds === undefined) return '';
  return ` — ${t('logPointLasted', { d: formatSeconds(e.pointSeconds) })}`;
}

/**
 * A duration as "25s" / "1m 30s" — minutes only once there are any. This is a
 * length of time that has finished, not a clock that is running, which is why
 * it isn't `formatClock`'s zero-padded mm:ss: "01:30" reads as a moment in the
 * game, "1m 30s" reads as how long something took.
 */
export function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
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

/** One log entry split into the three columns every surface renders it in. */
export interface LogRow {
  /** The game clock, `mm:ss`. */
  clock: string;
  /** The score once a goal counted ("2-1", team A first); empty for anything else. */
  score: string;
  /** The event, with "(break)" for a break and its team appended where it has one. */
  event: string;
  /** Everything else the entry carries, already concatenated in render order. */
  detail: string;
}

/** A goal written before `LogEntry.score` existed carried the score as its detail. */
const LEGACY_GOAL_DETAIL = /^(\d+)-(\d+)( \(break\))?$/;

/**
 * A goal entry's score and whether it was a break, or null for any other entry.
 *
 * TECH DEBT: the `detail` branch reads goals logged before the score was a field
 * of its own — the session save of a game in progress across the deploy, and
 * every game already in the match-history archive. Safe to drop once the archive
 * has turned over (those goals would then show no score and no "(break)").
 */
export function goalScore(e: LogEntry): { score: string; isBreak: boolean } | null {
  if (e.type !== 'goal') return null;
  if (e.score) return { score: `${e.score.A}-${e.score.B}`, isBreak: e.isBreak === true };
  const legacy = e.detail ? LEGACY_GOAL_DETAIL.exec(e.detail) : null;
  if (legacy) return { score: `${legacy[1]}-${legacy[2]}`, isBreak: legacy[3] !== undefined };
  return null;
}

/** The event label: the entry's name, "(break)" for a break, then its team. */
function eventLabel(state: GameState, e: LogEntry, t: TFunc): string {
  const goal = goalScore(e);
  const name = `${t(`event_${e.type}` as never)}${goal?.isBreak ? ` ${t('logBreak')}` : ''}`;
  return `${name}${e.team ? ` — ${state.config.teams[e.team].name}` : ''}`;
}

/**
 * Everything after the event, in render order, with no leading separator. A
 * goal's own `detail` is skipped when it is the legacy score string, which now
 * has a column of its own; a stoppage's is skipped because `stoppageDetail`
 * renders it (the injured player, if any).
 */
function detailParts(state: GameState, e: LogEntry, t: TFunc): string {
  const own = e.stoppageKind || (e.type === 'goal' && goalScore(e)) ? '' : (e.detail ?? '');
  const joined =
    own +
    goalPlayersDetail(state, e, t) +
    pointDurationDetail(e, t) +
    turnoverPlayersDetail(state, e, t) +
    callDetail(e, t) +
    stoppageDetail(e, t) +
    pauseDetail(e, t) +
    latePullDetail(e, t);
  return joined.replace(/^ — /, '');
}

/**
 * A log entry as the four columns of a row. Shared by the table (GameLogTable),
 * which renders the pieces as siblings, and by "Point by point" (pointStory.ts),
 * which tells an event as its event and detail — so an entry can never say one
 * thing in the log and another in a point's story. The plain-text log builds its
 * own single line out of the same pieces (`logTextLines` below), the difference
 * being punctuation rather than content.
 */
export function logRow(state: GameState, e: LogEntry, t: TFunc): LogRow {
  return {
    clock: formatClock(e.gameSeconds),
    score: goalScore(e)?.score ?? '',
    event: eventLabel(state, e, t),
    detail: detailParts(state, e, t),
  };
}

/**
 * The log as plain text, one indented `[mm:ss] Event — Team (2-1) — detail` line
 * per entry, for the full-log dialog's copy button — built from `logRow`, so it
 * cannot drift from the table.
 */
export function logTextLines(state: GameState, entries: LogEntry[], t: TFunc): string[] {
  return entries.map((e) => {
    const row = logRow(state, e, t);
    const score = row.score ? ` (${row.score})` : '';
    const detail = row.detail ? ` — ${row.detail}` : '';
    return `  [${row.clock}] ${row.event}${score}${detail}`;
  });
}
