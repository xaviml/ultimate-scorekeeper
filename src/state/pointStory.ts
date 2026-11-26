/**
 * The report's "Point by point": each point told as what happened in it — who had
 * the disc and for how many passes, where it was turned over and by whom, what
 * stopped play, who scored — rebuilt from the data every game already records.
 *
 * Nothing here is recorded for the purpose. A `PointRecord` carries the outline
 * (who received, who scored, how long, how many turns, the possessions' passes when
 * they were counted, the line), and the log carries the moments, each stamped with
 * the game second it happened at. The work is in lining the two up:
 *
 * - **A goal entry closes a point, but not always the n-th one.** An undo that had
 *   something logged after it leaves the goal row standing and appends an `undo`
 *   (see UNDO_GOAL), so the log is replayed the way that action does it — an `undo`
 *   reopens the point its goal closed, and whatever was logged in between rejoins
 *   it. `undoTurnover` likewise takes back the newest turnover still standing. When
 *   the replay and `state.points` still disagree about how many points there were
 *   (a game recorded by a much older build), the outline is drawn on its own with
 *   no moments rather than with moments attached to the wrong points.
 * - **Possession needs no record of its own.** A point opens with the receiving team
 *   holding the disc and every turnover hands it to the other, so the order of
 *   possessions falls out of `offense` and `turnovers`; the passes come from
 *   `passRuns` where they were counted, and the attribution from the turnover
 *   entries where those line up one for one.
 * - **The goal is always the scorer's possession.** A break with no Turn tapped on
 *   it (a Callahan, a missed tap) leaves the last recorded possession with the team
 *   that conceded, so the scorer's possession is added as `inferred` — drawn as
 *   unrecorded rather than credited to the wrong side.
 *
 * `pointStories` is the structure; `pointsModel` freezes it into translated,
 * formatted strings for the three surfaces that show it — the report screen, the
 * shared image and the copied text — so none of them can tell a point differently.
 */
import type { TFunc } from '../i18n/useT';
import { passesFor, passesTracked, turnoversTracked } from './gameReducer';
import { lineTeam } from './lines';
import {
  formatClock,
  formatSeconds,
  goalPassLine,
  goalPlayersLine,
  logRow,
  turnoverPlayersDetail,
} from './stats';
import type { GameState, LogEntry, LogType, PointRecord, TeamId } from './types';

const other = (t: TeamId): TeamId => (t === 'A' ? 'B' : 'A');

export interface Possession {
  team: TeamId;
  /** Passes completed in it, or null when this game was not counting them for this team. */
  passes: number | null;
  /** Ended by a turnover, by the goal, or not yet (the point in progress). */
  end: 'turn' | 'goal' | 'open';
  /** The turnover entry that ended it, when the log's turnovers line up with the point's. */
  turnover?: LogEntry;
  /** The scorer's possession on a break nobody tapped Turn on — see the file comment. */
  inferred?: boolean;
  /**
   * How long this team held the disc, play stopped taken out — see `timePossessions`.
   * Null where a boundary is not in the log (a turnover that could not be placed, the
   * possession either side of one nobody tapped, a point with no recorded start).
   */
  seconds: number | null;
}

export interface PointStory {
  /** 1-based, in the order the points were played. */
  number: number;
  /** Null for the point in progress (or the one a game was left in the middle of). */
  point: PointRecord | null;
  goal: LogEntry | null;
  offense: TeamId;
  scoredBy: TeamId | null;
  isBreak: boolean;
  /** The score once this point counted, or null for the point in progress. */
  score: Record<TeamId, number> | null;
  /** The pull's game second, or null for a point with no recorded start. */
  startSeconds: number | null;
  /** From the pull to the goal (or to now), timeouts and stoppages included; null with no recorded start. */
  durationSeconds: number | null;
  /** The same stretch with stopped play taken out; null where it was not recorded. */
  aliveSeconds: number | null;
  /** Turnovers recorded in the point, or null when the game was not recording them. */
  turnovers: number | null;
  /** In order; null when the game was not recording turnovers. */
  possessions: Possession[] | null;
  /** Everything else logged for the point, before the pull and during it, in log order. */
  events: LogEntry[];
  lineName?: string;
}

export type StoryItem =
  | { kind: 'point'; story: PointStory }
  /** Something logged outside any point: kickoff, half-time, a water break, the end. */
  | { kind: 'marker'; entry: LogEntry };

/**
 * Entries that belong to the game rather than to a point. Half-time and water breaks
 * are logged by the goal that brings them on, so they land at the head of the next
 * point's stretch of log — which is exactly where they are drawn: between the two.
 */
const MARKER_TYPES: readonly LogType[] = [
  'gameStart',
  'halftimeStart',
  'waterBreakStart',
  'gameEnd',
];

/**
 * Entries a point's story leaves out: the end of a break whose start already says it
 * (its only news would be a duration nobody chose), and the corrections, which the
 * replay has already applied.
 */
const SKIPPED_TYPES: readonly LogType[] = [
  'halftimeEnd',
  'waterBreakEnd',
  'timeoutEnd',
  'undo',
  'undoTurnover',
];

/** Entries that can only be logged with the disc live — never before a pull. */
const LIVE_ONLY_TYPES: readonly LogType[] = ['turnover', 'call', 'callResolved', 'travel'];

interface Bucket {
  entries: LogEntry[];
  goal: LogEntry | null;
}

/**
 * Replays the log into one bucket per finished point (closed by its goal) plus the
 * open stretch after the last goal. See the file comment for the two corrections.
 */
function bucketLog(log: LogEntry[]): { closed: Bucket[]; open: Bucket } {
  const closed: Bucket[] = [];
  let open: Bucket = { entries: [], goal: null };
  for (const [i, e] of log.entries()) {
    // Leaving the game from the menu stops the clock and then ends it (END_GAME), in
    // one tap: "Game end" already says so, and "Game paused" above it is the same moment.
    if (e.type === 'pauseStart' && log[i + 1]?.type === 'gameEnd') continue;
    if (e.type === 'goal') {
      closed.push({ entries: open.entries, goal: e });
      open = { entries: [], goal: null };
    } else if (e.type === 'undo') {
      const back = closed.pop();
      if (back) {
        // Play resumed inside the point the goal had closed. What that goal set off
        // (half-time, a water break, the end of the game) went with it.
        const kept = open.entries.filter(
          (x) => !MARKER_TYPES.includes(x.type) || x.type === 'gameStart',
        );
        open = { entries: [...back.entries, ...kept], goal: null };
      }
    } else if (e.type === 'undoTurnover') {
      const at = open.entries.map((x) => x.type).lastIndexOf('turnover');
      if (at !== -1) open = { ...open, entries: open.entries.filter((_, i) => i !== at) };
    } else {
      open.entries.push(e);
    }
  }
  return { closed, open };
}

/**
 * The possessions of one point, in order. `runs` are the point's pass runs (ground
 * truth for who held it, when counted); `turns` its surviving turnover entries, used
 * for attribution only when they match the recorded count one for one.
 */
function possessionsOf(
  counts: Record<TeamId, boolean>,
  offense: TeamId,
  turnovers: number,
  runs: { team: TeamId; passes: number }[] | undefined,
  turns: LogEntry[],
  scoredBy: TeamId | null,
): Possession[] {
  const counted = runs && runs.length === turnovers + 1 ? runs : null;
  const attributed = turns.length === turnovers ? turns : null;
  const list: Possession[] = [];
  let team = offense;
  for (let k = 0; k <= turnovers; k++) {
    const holder = counted ? counted[k].team : team;
    list.push({
      team: holder,
      seconds: null,
      passes: counted && counts[holder] ? counted[k].passes : null,
      end: k < turnovers ? 'turn' : scoredBy === null ? 'open' : 'goal',
      ...(attributed && k < turnovers ? { turnover: attributed[k] } : {}),
    });
    team = other(holder);
  }
  const last = list[list.length - 1];
  if (scoredBy !== null && last.team !== scoredBy) {
    last.end = 'turn';
    list.push({ team: scoredBy, seconds: null, passes: null, end: 'goal', inferred: true });
  }
  return list;
}

/** Entry pairs that open and close a stretch of stopped play inside a point. */
const HALTS: readonly [LogType, LogType][] = [
  ['timeout', 'timeoutEnd'],
  ['call', 'callResolved'],
  ['stoppage', 'stoppageResolved'],
];

/**
 * The stretches of game clock in which play was stopped: a timeout, a call being
 * talked through, an injury or technical stoppage. A pause needs no interval — the
 * game clock itself stops for it, so it never shows up in `gameSeconds` at all. One
 * still open runs to `until` on the point being played (a live report mid-discussion);
 * on a finished point an unclosed one is ignored rather than allowed to swallow
 * every possession after it.
 */
function haltedIntervals(
  entries: LogEntry[],
  until: number,
  openEnded: boolean,
): [number, number][] {
  const out: [number, number][] = [];
  for (const [openType, closeType] of HALTS) {
    let from: number | null = null;
    for (const e of entries) {
      if (e.type === openType && from === null) from = e.gameSeconds;
      else if (e.type === closeType && from !== null) {
        out.push([from, e.gameSeconds]);
        from = null;
      }
    }
    if (from !== null && openEnded) out.push([from, until]);
  }
  return out;
}

/**
 * Each possession's time in play, read off the log rather than recorded: it runs from
 * the pull (or the turnover that opened it) to the turnover that ended it (or the goal,
 * or now), less whatever stopped play overlapped it. Every boundary is a log entry with
 * its game second, so nothing extra is ever stored — and an undone turnover is already
 * gone from the replay, so it cannot split a possession in two.
 */
function timePossessions(
  list: Possession[],
  start: number | null,
  end: number | null,
  entries: LogEntry[],
  openEnded = false,
): void {
  if (start === null || end === null) return;
  const halts = haltedIntervals(entries, end, openEnded);
  const stopped = (a: number, b: number) =>
    halts.reduce((sum, [x, y]) => sum + Math.max(0, Math.min(b, y) - Math.max(a, x)), 0);
  let from: number | null = start;
  for (const p of list) {
    const to: number | null = p.inferred
      ? null
      : p.end === 'turn'
        ? (p.turnover?.gameSeconds ?? null)
        : end;
    p.seconds = from !== null && to !== null ? Math.max(0, to - from - stopped(from, to)) : null;
    from = to;
  }
}

/**
 * The game as a list of points with the markers between them. Includes the point in
 * progress (a live report, or a game left in the middle of one) as a story with no
 * goal; entries logged after the last goal with no point under way are markers.
 */
export function pointStories(state: GameState): StoryItem[] {
  const { config } = state;
  const { closed, open } = bucketLog(state.log);
  const aligned = closed.length === state.points.length;
  const tracking = turnoversTracked(config);
  // Whose passes this game counted — `passesFor`'s rule, so a followed game shows
  // the other side's passes only once one was actually recorded for them.
  const counts: Record<TeamId, boolean> = {
    A: passesFor(state, 'A') !== null,
    B: passesFor(state, 'B') !== null,
  };
  const items: StoryItem[] = [];
  const score: Record<TeamId, number> = { A: 0, B: 0 };

  const split = (entries: LogEntry[]) => ({
    markers: entries.filter((e) => MARKER_TYPES.includes(e.type)),
    turns: entries.filter((e) => e.type === 'turnover'),
    events: entries.filter(
      (e) =>
        !MARKER_TYPES.includes(e.type) && !SKIPPED_TYPES.includes(e.type) && e.type !== 'turnover',
    ),
  });

  state.points.forEach((p, i) => {
    const bucket = aligned ? closed[i] : null;
    const parts = split(bucket?.entries ?? []);
    for (const entry of parts.markers) items.push({ kind: 'marker', entry });
    score[p.scoredBy] += 1;
    const goal = bucket?.goal ?? null;
    const duration =
      goal?.pointSeconds ?? (goal === null && p.durationSeconds > 0 ? p.durationSeconds : null);
    const recorded = tracking || p.possessionSeconds !== undefined || p.turnovers > 0;
    const startSeconds =
      goal && goal.pointSeconds !== undefined ? goal.gameSeconds - goal.pointSeconds : null;
    const possessions = recorded
      ? possessionsOf(counts, p.offense, p.turnovers, p.passRuns, parts.turns, p.scoredBy)
      : null;
    if (possessions)
      timePossessions(possessions, startSeconds, goal?.gameSeconds ?? null, bucket?.entries ?? []);
    items.push({
      kind: 'point',
      story: {
        number: i + 1,
        point: p,
        goal,
        offense: p.offense,
        scoredBy: p.scoredBy,
        isBreak: p.isBreak,
        score: { ...score },
        startSeconds,
        durationSeconds: duration,
        aliveSeconds: p.aliveSeconds ?? null,
        turnovers: recorded ? p.turnovers : null,
        possessions,
        events: parts.events,
        ...(p.lineName ? { lineName: p.lineName } : {}),
      },
    });
  });

  // The open stretch: the point under way, if there is one — the pull has been thrown
  // and no goal has closed it (a game-winning goal leaves `pointStartSeconds` set, so
  // `finished` is checked too) — and otherwise loose entries between points.
  const parts = split(
    aligned ? open.entries : open.entries.filter((e) => MARKER_TYPES.includes(e.type)),
  );
  const underway = state.pointStartSeconds !== null && state.status !== 'finished';
  if (!underway) {
    const loose = [...parts.markers, ...parts.events].sort((a, b) => a.id - b.id);
    for (const entry of loose) items.push({ kind: 'marker', entry });
    return items;
  }
  const start = state.pointStartSeconds as number;
  const live = tracking
    ? possessionsOf(
        counts,
        state.offenseTeam,
        state.pointTurnovers,
        passesTracked(config) ? state.passRuns : undefined,
        parts.turns,
        null,
      )
    : null;
  if (live) timePossessions(live, start, state.gameSeconds, aligned ? open.entries : [], true);
  // Kickoff and anything else game-level logged before this pull stays a marker above
  // it; a game left mid-point logs its `gameEnd` after the pull, which goes below.
  for (const entry of parts.markers.filter((e) => e.gameSeconds <= start)) {
    items.push({ kind: 'marker', entry });
  }
  items.push({
    kind: 'point',
    story: {
      number: state.points.length + 1,
      point: null,
      goal: null,
      offense: state.offenseTeam,
      scoredBy: null,
      isBreak: false,
      score: null,
      startSeconds: start,
      durationSeconds: state.gameSeconds - start,
      aliveSeconds: state.aliveSeconds,
      turnovers: tracking ? state.pointTurnovers : null,
      possessions: live,
      events: parts.events,
      ...(state.lineName && lineTeam(config) ? { lineName: state.lineName } : {}),
    },
  });
  for (const entry of parts.markers.filter((e) => e.gameSeconds > start)) {
    items.push({ kind: 'marker', entry });
  }
  return items;
}

/** The finished points' stories, for the game-wide figures. */
function finishedStories(items: StoryItem[]): PointStory[] {
  return items.flatMap((item) =>
    item.kind === 'point' && item.story.point !== null ? [item.story] : [],
  );
}

/**
 * How many of `team`'s possessions ended in their goal, out of how many they had —
 * every possession of every finished point the game recorded turnovers for, so a
 * point nobody turned over is one possession and one score. Null when the game
 * records no turnovers, where there is no count of possessions to divide by.
 */
export function possessionsScored(
  state: GameState,
  team: TeamId,
  items: StoryItem[] = pointStories(state),
): { scored: number; possessions: number } | null {
  if (!turnoversTracked(state.config)) return null;
  let scored = 0;
  let possessions = 0;
  for (const story of finishedStories(items)) {
    if (!story.possessions) continue;
    possessions += story.possessions.filter((p) => p.team === team).length;
    if (story.scoredBy === team) scored += 1;
  }
  return { scored, possessions };
}

export interface LineResult {
  name: string;
  /** Points this line started on offence, and how many of them it held. */
  oPlayed: number;
  oHeld: number;
  /** Points it started on defence, and how many of them it broke. */
  dPlayed: number;
  dBroken: number;
}

/**
 * How each predefined line did, for the followed team — read off `PointRecord.lineName`,
 * which only a point played by a named line carries. Sorted by name with numbers
 * compared as numbers, so O1, O2 … O10 and D1, D2 sit together in order.
 */
export function lineResults(state: GameState): LineResult[] {
  const team = state.config.trackedTeam;
  if (team === null) return [];
  const byName = new Map<string, LineResult>();
  for (const p of state.points) {
    if (!p.lineName) continue;
    const r = byName.get(p.lineName) ?? {
      name: p.lineName,
      oPlayed: 0,
      oHeld: 0,
      dPlayed: 0,
      dBroken: 0,
    };
    if (p.offense === team) {
      r.oPlayed += 1;
      if (p.scoredBy === team) r.oHeld += 1;
    } else {
      r.dPlayed += 1;
      if (p.scoredBy === team) r.dBroken += 1;
    }
    byName.set(p.lineName, r);
  }
  return [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}

// ---------------------------------------------------------------------------
// The formatted model — what the screen, the image and the copied text draw.

/** One possession of the point's track — see `components/possessionTrack.ts`, which lays it out. */
export interface TrackSegment {
  team: TeamId;
  /** Time in play, which sets the segment's length; null where the log cannot time it. */
  seconds: number | null;
  /** Completed passes, printed under the segment; null when nobody was counting this team's. */
  passes: number | null;
  /** "6 passes" under the segment, or '' when none were completed or nobody counted. */
  passText: string;
  /** "18s", or '' when untimed. */
  time: string;
  /** `done` ended in a turnover; `goal` scored; `open` is still going; `inferred` was never recorded. */
  state: 'done' | 'goal' | 'open' | 'inferred';
}

export interface TimelineLine {
  /** The game clock, `mm:ss`, or '' for a moment the log cannot place. */
  clock: string;
  /** The team the line is about, for its colour dot; null for a line about nobody. */
  team: TeamId | null;
  text: string;
  /** The goal, drawn a step brighter than the rest. */
  goal?: boolean;
}

export interface PointRowModel {
  kind: 'point';
  /**
   * The point's 1-based position, as an identity only — it keys the row and remembers
   * which rows are open, and is never printed: the score already says which point it
   * is, and the point in progress is labelled by its outcome tag alone.
   */
  number: string;
  offense: TeamId;
  scoredBy: TeamId | null;
  isBreak: boolean;
  /** "4-3", team A first; '' for the point in progress. */
  score: string;
  /** "Hold", "Break", or "Not finished". */
  outcome: string;
  /** "1m 42s", or '' with no recorded start. */
  duration: string;
  /** "1m 10s in play", only when play stopped during the point. */
  inPlay: string;
  /** The point as a track, one segment per possession; null when the game did not record turnovers. */
  track: TrackSegment[] | null;
  /** Turns, passes, who scored, the line, and what stopped play — the row's at-a-glance line. */
  summary: string[];
  /** The point told in order, from anything before the pull to the goal. */
  timeline: TimelineLine[];
}

export interface MarkerRowModel {
  kind: 'marker';
  clock: string;
  text: string;
  team: TeamId | null;
}

export type PointsRow = PointRowModel | MarkerRowModel;

export interface LinesTableModel {
  header: [string, string, string];
  rows: { name: string; o: string; d: string }[];
}

export interface PointsModel {
  title: string;
  /** Results by predefined line, or null when no point was played by a named line. */
  lines: LinesTableModel | null;
  rows: PointsRow[];
  /**
   * The most time in play any one point's segments add up to. Every track is drawn
   * against it, so a segment's length means the same number of seconds in every row.
   */
  trackScaleSeconds: number;
}

const passesText = (n: number, t: TFunc) =>
  n === 1 ? t('pointPassesOne') : t('pointPasses', { n });

const turnsText = (n: number, t: TFunc) =>
  n === 0 ? t('pointNoTurns') : n === 1 ? t('pointTurnsOne') : t('pointTurns', { n });

/** An entry as one timeline line: its event and detail exactly as the log reads them. */
function eventLine(state: GameState, e: LogEntry, t: TFunc): TimelineLine {
  const row = logRow(state, e, t);
  return {
    clock: row.clock,
    team: e.team ?? null,
    text: row.detail ? `${row.event} — ${row.detail}` : row.event,
  };
}

/** "FOXES · 18s · 6 passes" — who had it, for how long, and for how many passes where known. */
function possessionHead(state: GameState, p: Possession, t: TFunc): string {
  return [
    state.config.teams[p.team].name,
    ...(p.seconds !== null ? [formatSeconds(p.seconds)] : []),
    ...(p.passes !== null ? [passesText(p.passes, t)] : []),
  ].join(' · ');
}

/**
 * The point told in order. The log is chronological, so this is: what was logged
 * before the pull, the pull, then the point's own entries with a line for each
 * possession at the turnover that ended it, and the goal. A `call` is dropped when its
 * resolution is in the same point — that line already names the call, the outcome and
 * how long it took.
 */
function timelineOf(state: GameState, story: PointStory, t: TFunc): TimelineLine[] {
  const { config } = state;
  const start = story.startSeconds;
  const resolved = story.events.filter((e) => e.type === 'callResolved');
  const events = story.events.filter(
    (e) =>
      e.type !== 'call' ||
      !resolved.some((r) => r.id > e.id && r.callKind === e.callKind && r.team === e.team),
  );
  const beforePull = (e: LogEntry) =>
    start !== null && !LIVE_ONLY_TYPES.includes(e.type) && e.gameSeconds <= start;

  const lines: TimelineLine[] = events.filter(beforePull).map((e) => eventLine(state, e, t));
  if (start !== null) {
    lines.push({
      clock: formatClock(start),
      team: story.offense,
      text: t('pointPull', { team: config.teams[story.offense].name }),
    });
  }

  const possessions = story.possessions ?? [];
  const turnLine = (p: Possession): TimelineLine => {
    const who = p.turnover ? turnoverPlayersDetail(state, p.turnover, t) : '';
    return {
      clock: p.turnover ? formatClock(p.turnover.gameSeconds) : '',
      team: p.team,
      text: `${possessionHead(state, p, t)} — ${t('event_turnover')}${who}`,
    };
  };
  // Turnover entries carry a time, so each possession lands where it ended. When they
  // could not be lined up with the point they have none, and are listed together
  // before the goal instead — in order, just not interleaved with the rest.
  const placed = possessions.filter((p) => p.end === 'turn' && p.turnover);
  const unplaced = possessions.filter((p) => p.end === 'turn' && !p.turnover);
  const during = [
    ...events
      .filter((e) => !beforePull(e))
      .map((e) => ({ id: e.id, line: eventLine(state, e, t) })),
    ...placed.map((p) => ({ id: (p.turnover as LogEntry).id, line: turnLine(p) })),
  ].sort((a, b) => a.id - b.id);
  lines.push(...during.map((d) => d.line), ...unplaced.map(turnLine));

  const goal = story.goal;
  const last = possessions[possessions.length - 1];
  if (goal && story.scoredBy) {
    const goalText = `${t('event_goal')}${story.isBreak ? ` ${t('logBreak')}` : ''}`;
    const players = goalPlayersLine(state, goal, t, goalText);
    const named = players.startsWith(`${goalText}: `);
    const head = last ? possessionHead(state, last, t) : config.teams[story.scoredBy].name;
    lines.push({
      clock: formatClock(goal.gameSeconds),
      team: story.scoredBy,
      text: `${head} — ${named ? players : players ? `${goalText} — ${players}` : goalText}`,
      goal: true,
    });
  } else if (last && last.end === 'open') {
    lines.push({
      clock: '',
      team: last.team,
      text: `${possessionHead(state, last, t)} — ${t('pointOpen')}`,
    });
  }
  return lines;
}

/** One label per kind of thing that stopped or interrupted play, in the order it first happened. */
function flagsOf(story: PointStory, t: TFunc): string[] {
  const flags: string[] = [];
  const add = (label: string) => {
    if (!flags.includes(label)) flags.push(label);
  };
  for (const e of story.events) {
    if (e.type === 'timeout') add(t('event_timeout'));
    else if (e.type === 'stoppage' && e.stoppageKind)
      add(t(`stoppageKind_${e.stoppageKind}` as never));
    else if ((e.type === 'call' || e.type === 'callResolved') && e.callKind)
      add(t(`callKind_${e.callKind}` as never));
    else if (e.type === 'travel') add(t('event_travel'));
    else if (e.type === 'sotgStart') add(t('pointFlagSotg'));
    else if (e.type === 'timeCap') add(t('event_timeCap'));
    else if (e.type === 'halfTimeCap') add(t('event_halfTimeCap'));
    else if (e.type === 'latePull') add(t('event_latePull'));
  }
  return flags;
}

function pointRow(state: GameState, story: PointStory, t: TFunc): PointRowModel {
  const { config } = state;
  const possessions = story.possessions;
  const summary: string[] = [];
  if (story.turnovers !== null) summary.push(turnsText(story.turnovers, t));
  if (possessions && possessions.some((p) => p.passes !== null)) {
    const total = possessions.reduce((n, p) => n + (p.passes ?? 0), 0);
    // Named after the followed team only while theirs are the only passes counted;
    // once the other side has any, the total is both teams' as in any other game.
    const followed = config.trackedTeam;
    const onlyFollowed = followed !== null && passesFor(state, other(followed)) === null;
    summary.push(
      followed === null || !onlyFollowed
        ? passesText(total, t)
        : t('pointTeamPasses', {
            passes: passesText(total, t),
            team: config.teams[followed].name,
          }),
    );
  }
  const scorers = story.goal ? goalPassLine(state, story.goal, t) : '';
  if (scorers) summary.push(scorers);
  if (story.lineName) summary.push(t('pointLineName', { name: story.lineName }));
  summary.push(...flagsOf(story, t));

  const alive = story.aliveSeconds;
  const duration = story.durationSeconds;
  return {
    kind: 'point',
    number: String(story.number),
    offense: story.offense,
    scoredBy: story.scoredBy,
    isBreak: story.isBreak,
    score: story.score ? `${story.score.A}-${story.score.B}` : '',
    outcome:
      story.scoredBy === null
        ? t('pointNotFinished')
        : story.isBreak
          ? t('pointBreak')
          : t('pointHold'),
    duration: duration !== null ? formatSeconds(duration) : '',
    inPlay:
      duration !== null && alive !== null && alive < duration
        ? t('pointInPlay', { d: formatSeconds(alive) })
        : '',
    track: possessions
      ? possessions.map((p) => ({
          team: p.team,
          seconds: p.seconds,
          passes: p.passes,
          passText: p.passes ? passesText(p.passes, t) : '',
          time: p.seconds !== null ? formatSeconds(p.seconds) : '',
          state: p.inferred
            ? 'inferred'
            : p.end === 'goal'
              ? 'goal'
              : p.end === 'open'
                ? 'open'
                : 'done',
        }))
      : null,
    summary,
    timeline: timelineOf(state, story, t),
  };
}

function linesTable(state: GameState, t: TFunc): LinesTableModel | null {
  const results = lineResults(state);
  if (results.length === 0) return null;
  const frac = (made: number, of: number) => (of === 0 ? '—' : `${made}/${of}`);
  return {
    header: [t('pointsColLine'), t('pointsColOHeld'), t('pointsColDBroken')],
    rows: results.map((r) => ({
      name: r.name,
      o: frac(r.oHeld, r.oPlayed),
      d: frac(r.dBroken, r.dPlayed),
    })),
  };
}

export function pointsModel(
  state: GameState,
  t: TFunc,
  items: StoryItem[] = pointStories(state),
): PointsModel {
  const rows: PointsRow[] = items.map((item) => {
    if (item.kind === 'point') return pointRow(state, item.story, t);
    const line = eventLine(state, item.entry, t);
    return { kind: 'marker', clock: line.clock, text: line.text, team: line.team };
  });
  const tracks = rows.flatMap((r) => (r.kind === 'point' && r.track ? [r.track] : []));
  return {
    title: t('pointsTitle'),
    lines: linesTable(state, t),
    rows,
    trackScaleSeconds: Math.max(
      1,
      ...tracks.map((w) => w.reduce((sum, seg) => sum + (seg.seconds ?? 0), 0)),
    ),
  };
}

/**
 * The model as plain text, for the copied report: the lines table, then one block per
 * point — its heading, its summary, its timeline — with the markers between them.
 */
export function pointsTextLines(state: GameState, model: PointsModel): string[] {
  const out: string[] = [];
  if (model.lines) {
    const [l, o, d] = model.lines.header;
    out.push(`  ${l}: ${o} / ${d}`);
    for (const r of model.lines.rows) out.push(`    ${r.name}: ${r.o} / ${r.d}`);
    out.push('');
  }
  model.rows.forEach((row, i) => {
    // A blank line between blocks, so each point reads as a paragraph of its own.
    if (i > 0) out.push('');
    if (row.kind === 'marker') {
      out.push(`  [${row.clock}] ${row.text}`);
      return;
    }
    const who = row.scoredBy ? ` ${state.config.teams[row.scoredBy].name}` : '';
    const time = [row.duration, row.inPlay ? `(${row.inPlay})` : ''].filter(Boolean).join(' ');
    const head = [row.score, `${row.outcome}${who}`, time].filter(Boolean);
    out.push(`  ${head.join(' · ')}`);
    if (row.summary.length) out.push(`      ${row.summary.join(' · ')}`);
    for (const line of row.timeline) {
      out.push(`      ${line.clock ? `[${line.clock}] ` : ''}${line.text}`);
    }
  });
  return out;
}
