import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame } from '../state/gameHooks';
import { statsTrackingEnabled } from '../state/gameReducer';
import { formatClock, teamStats } from '../state/stats';
import type { GameState, TeamId } from '../state/types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { PossessionLedger } from './PossessionLedger';
import { PointPace } from './PointPace';
import { StatFiguresGrid } from './StatFiguresGrid';

/**
 * Which page the volunteer was on, persisted alongside the game state (same
 * sessionStorage lifetime, same reload behaviour) rather than a bare
 * localStorage key: the pager unmounts every time the slot is needed for a
 * button, and again on a reload, and both must come back to the same page —
 * the amber button borrowing the slot for a moment is not a reason to lose the
 * stat that was up. The key carries the game's identity (the gameStart entry's
 * timestamp) so a new game always starts back at page 1.
 */
const STATS_PAGE_KEY = 'ultimate-scorekeeper:stats-slot-page';

function gameKey(state: GameState): number {
  return state.log.find((e) => e.type === 'gameStart')?.atMs ?? 0;
}

function loadPage(key: number): number {
  try {
    const raw = sessionStorage.getItem(STATS_PAGE_KEY);
    if (!raw) return 0;
    const stored = JSON.parse(raw) as { game: number; page: number };
    return stored.game === key ? stored.page : 0;
  } catch {
    return 0;
  }
}

function savePage(key: number, page: number): void {
  try {
    sessionStorage.setItem(STATS_PAGE_KEY, JSON.stringify({ game: key, page }));
  } catch {
    /* storage unavailable — the page just won't survive a reload */
  }
}

/** Average duration of the finished points, or null with fewer than two — no meaningful average yet. */
function avgPointSeconds(state: GameState): number | null {
  if (state.points.length < 2) return null;
  const total = state.points.reduce((sum, p) => sum + p.durationSeconds, 0);
  return Math.round(total / state.points.length);
}

const arrowButton =
  'shrink-0 w-5 self-stretch flex items-center justify-center rounded-md border border-line text-chalk/50 active:scale-95';

/**
 * Live statistics in the reserved action-row slot, shown only while the disc is
 * live — the amber advance button, the break-end buttons and the call answers
 * all outrank it, and the slot's fixed height means it appearing or paging can
 * never move the score panels above.
 *
 * With stats tracking on it is three pages — possession ledger, pace of this
 * point, team figures — cycled by the two thin chevron buttons flanking the
 * panel (looping). In statsMode 'none' there is no Turn button and so no
 * possession to draw, and it collapses to a single holds/breaks page with no
 * arrows. Portrait only: landscape has no height to give it, and it hides
 * rather than compressing into illegibility.
 */
export function StatsSlot() {
  const state = useGame();
  const { t } = useT();
  const key = gameKey(state);
  const [page, setPage] = useState(() => loadPage(key));

  if (state.phase !== 'game' || state.status !== 'live') return null;
  // An open call owns the slot (the three resolution buttons render there).
  if (state.pendingCall !== null) return null;
  // An empty chart is worse than nothing — though while the disc is live a
  // point is by definition in progress, so this mostly guards odd states.
  if (state.points.length === 0 && state.pointStartSeconds === null) return null;

  const top: TeamId = state.config.startingSide;
  const bottom: TeamId = top === 'A' ? 'B' : 'A';
  const colors: Record<TeamId, string> = {
    A: state.config.teams.A.color,
    B: state.config.teams.B.color,
  };
  const nameOf = (id: TeamId) => state.config.teams[id].name;
  const statsFor = { [top]: teamStats(state, top), [bottom]: teamStats(state, bottom) };

  // statsMode 'none': one page, no arrows — only what points[] records without
  // turnover tracking.
  if (!statsTrackingEnabled(state.config)) {
    const summary = ([top, bottom] as TeamId[])
      .map(
        (id) =>
          `${nameOf(id)}: ${statsFor[id].oLineHolds} ${t('slotHolds')}, ${statsFor[id].breaks} ${t('slotBreaks')}`,
      )
      .join(' — ');
    return (
      <div role="group" aria-label={t('slotStatsLabel')} className="w-full lscape:hidden">
        <p className="sr-only">{summary}</p>
        <StatFiguresGrid
          headers={[t('slotHolds'), t('slotBreaks')]}
          rows={[top, bottom].map((id) => ({
            color: colors[id],
            values: [statsFor[id].oLineHolds, statsFor[id].breaks],
          }))}
        />
      </div>
    );
  }

  // Page 2 data. The bar's scale is 1.5× the average point so the fill can
  // visibly cross the average marker; without one it falls back to two minutes.
  const pointStart = state.pointStartSeconds;
  const elapsed = pointStart !== null ? Math.max(0, state.gameSeconds - pointStart) : 0;
  const avg = avgPointSeconds(state);
  const scale = avg !== null ? avg * 1.5 : 120;
  const notches =
    pointStart === null || state.pointTurnovers === 0
      ? []
      : state.log
          .filter((e) => e.type === 'turnover' && e.gameSeconds >= pointStart && e.team)
          .slice(-state.pointTurnovers)
          .map((e) => ({
            pct: Math.min(100, ((e.gameSeconds - pointStart) / scale) * 100),
            color: colors[e.team as TeamId],
          }));
  const paceClock = formatClock(elapsed);
  const avgLabel = avg !== null ? t('slotAvgHold', { time: formatClock(avg) }) : null;

  const figureHeaders = [t('slotHolds'), t('slotBreaks'), t('slotBreakCh'), t('slotTurns')];
  const figureRows = ([top, bottom] as TeamId[]).map((id) => ({
    color: colors[id],
    values: [
      statsFor[id].oLineHolds,
      statsFor[id].breaks,
      statsFor[id].breakChances,
      statsFor[id].turnovers,
    ],
  }));

  const pages = [
    {
      label: t('slotPagePossession'),
      summary: `${t('slotPagePossession')} — ${nameOf(top)}: ${formatClock(
        state.possessionSeconds[top],
      )}, ${nameOf(bottom)}: ${formatClock(state.possessionSeconds[bottom])}`,
      node: (
        <PossessionLedger
          points={state.points}
          current={state.possessionSeconds}
          currentOffense={state.offenseTeam}
          topTeam={top}
          colors={colors}
          scrollToEnd
        />
      ),
    },
    {
      label: t('slotPagePace'),
      summary: `${t('slotThisPoint', { n: state.pointTurnovers })} — ${paceClock}${
        avgLabel ? ` (${avgLabel})` : ''
      }`,
      node: (
        <PointPace
          caption={t('slotThisPoint', { n: state.pointTurnovers })}
          clock={paceClock}
          avgLabel={avgLabel}
          fillPct={Math.min(100, (elapsed / scale) * 100)}
          fillColor={state.possessionTeam ? colors[state.possessionTeam] : null}
          avgPct={avg !== null ? Math.min(100, (avg / scale) * 100) : null}
          notches={notches}
        />
      ),
    },
    {
      label: t('slotPageTeam'),
      summary: ([top, bottom] as TeamId[])
        .map((id, i) =>
          `${nameOf(id)}: ${figureRows[i].values
            .map((v, j) => `${v} ${figureHeaders[j]}`)
            .join(', ')}`.toLowerCase(),
        )
        .join(' — '),
      node: <StatFiguresGrid headers={figureHeaders} rows={figureRows} />,
    },
  ];

  const active = ((page % pages.length) + pages.length) % pages.length;
  const step = (delta: number) => {
    const next = (active + delta + pages.length) % pages.length;
    setPage(next);
    savePage(key, next);
  };

  return (
    <div role="group" aria-label={t('slotStatsLabel')} className="w-full lscape:hidden">
      <p className="sr-only">{pages[active].summary}</p>
      <div className="flex items-stretch gap-1.5 h-14">
        <button
          type="button"
          aria-label={t('slotPrev')}
          className={arrowButton}
          onClick={() => step(-1)}
        >
          <ChevronLeftIcon size="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0 flex items-center">{pages[active].node}</div>
        <button
          type="button"
          aria-label={t('slotNext')}
          className={arrowButton}
          onClick={() => step(1)}
        >
          <ChevronRightIcon size="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
