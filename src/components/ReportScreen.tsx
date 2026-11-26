import { Fragment, useMemo, useState } from 'react';
import { useReportImage } from '../hooks/useReportImage';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { turnoverPlayersTracked } from '../state/gameReducer';
import { lineTrackingEnabled } from '../state/lines';
import { copyText } from '../state/clipboard';
import {
  APP_URL,
  gameLoser,
  playerStatsTeams,
  reportCardModel,
  reportMeta,
  teamStatRows,
} from '../state/reportCard';
import { pointsModel, pointsTextLines } from '../state/pointStory';
import { formatClock, playerStatLines, sortPlayerStatLines, teamStats } from '../state/stats';
import type { PlayerStatView } from '../state/stats';
import type { TeamId } from '../state/types';
import { FullLogDialog } from './FullLogDialog';
import { CopyIcon, FoldIcon, LogIcon, PlayersIcon, StatsIcon, UnfoldIcon } from './icons';
import { PageHeader } from './PageHeader';
import { SectionCard } from './SectionCard';
import { Segmented } from './Segmented';
import { PlayerStatsTable } from './PlayerStatsTable';
import { PointByPoint } from './PointByPoint';
import { playerStatColumns, statCellText } from './playerStatColumns';
import { contrastText, teamOutline, primaryButton, secondaryButtonOnPitch } from './ui';

/** A control in a section heading's corner — the same 32px height as the nav buttons. */
const smallControl =
  'inline-flex items-center justify-center h-8 min-w-8 rounded-md bg-pitch border border-line px-2 font-board text-xs font-semibold uppercase tracking-wide text-chalk/80 whitespace-nowrap active:scale-95';

const VIEW_KEY = {
  scoring: 'viewScoring',
  playing: 'viewPlaying',
  possession: 'viewPossession',
} as const;

/** Team names go into a filename, so anything a filesystem might object to comes out. */
function slug(name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return ascii.slice(0, 24);
}

/**
 * The report on a game, in three modes.
 *
 * - `phase` (the default): the report the reducer switched to — reached from the
 *   game screen once the scoreline finished it, or from the header menu on the way
 *   out of one still in progress. It guards the back gesture itself and offers
 *   "New game", the one tap that actually discards the game.
 * - `live`: read over the top of the dashboard mid-game, so a captain can lean over
 *   the stats at half-time. The way back is the caller's callback (GameScreen is
 *   still mounted underneath, and peels this layer off with the guard it already
 *   has), and there is no "New game" — this game has not been left.
 * - `archived`: a finished game opened out of the past-games list. Behaves exactly
 *   like `live` — a layer over a screen that owns the back guard, with a callback
 *   out and nothing that discards anything — because it is read-only in a stronger
 *   sense still: the state it draws comes from storage through a context whose
 *   dispatch does nothing (see PastGamesScreen).
 *
 * All three are the same screen with a way back, which is why there is no "Final
 * report" heading and no "Final score" label over the score boxes: nothing here
 * claims the game is over, because coming back is a door in every one of them.
 */
export default function ReportScreen({
  mode = 'phase',
  onBack,
}: {
  mode?: 'phase' | 'live' | 'archived';
  onBack?: () => void;
} = {}) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t, lang } = useT();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [teamFilter, setTeamFilter] = useState<TeamId | 'all'>('all');
  const [view, setView] = useState<PlayerStatView>('scoring');
  const [showFullLog, setShowFullLog] = useState(false);
  // Which points of "Point by point" are open — held here rather than in the list,
  // so the section heading can open or fold them all at once.
  const [openPoints, setOpenPoints] = useState<ReadonlySet<string>>(() => new Set());

  // Live (over the game) and archived (over match history) are pages opened over
  // another screen, and their way back is the caller's. The report of a game that has
  // been left goes back by dispatching, like every other move of the game itself —
  // App turns "back to the game" and "new game" into the matching navigation.
  const layered = mode !== 'phase';
  const backToGame = () => dispatch({ type: 'BACK_TO_GAME' });

  const A = teamStats(state, 'A');
  const B = teamStats(state, 'B');
  const nameOf = (id: TeamId) => state.config.teams[id].name;

  // Shared with the image so the two can never drift — see state/reportCard.ts.
  const statRows = teamStatRows(state, t);

  const playerStatTeams = playerStatsTeams(state.config);
  // A game following one team has player detail for that side only; following both
  // gets a filter to page through them on a small screen.
  const showTeamFilter = playerStatTeams.length > 1;
  const playerLines = playerStatLines(state, playerStatTeams, t);
  // Playing is read off `PointRecord.line`, so it needs line tracking. Possession
  // is read off the log's turnoverId/defenseId, so it needs only "Ask who turned
  // it over" — line tracking is not a gate for it at all. The config flag is the
  // normal reason it has anything to show, but `LogEditDialog` can attribute a
  // turnover as a correction whatever the flag says, so a game that turned the
  // flag on late — or never — still gets the view once a turn or a D is named.
  const showPlayingView = lineTrackingEnabled(state.config);
  const showPossessionView =
    turnoverPlayersTracked(state.config) || playerLines.some((p) => p.turns > 0 || p.defenses > 0);
  const availableViews = (['scoring', 'playing', 'possession'] as const).filter((v) =>
    v === 'playing' ? showPlayingView : v === 'possession' ? showPossessionView : true,
  );
  // Point by point, as the screen, the copied text and the image all tell it — one
  // model, so what you read is what you take away (see state/pointStory.ts).
  const points = useMemo(() => pointsModel(state, t), [state, t]);
  // Possession drops the aggregate row: it has no figure to state there (see
  // `playerStatLines`), and a "not recorded" line of zeroes would read as a claim.
  const visiblePlayerLines = sortPlayerStatLines(
    playerLines.filter(
      (p) =>
        (teamFilter === 'all' || p.team === teamFilter) && !(view === 'possession' && p.unassigned),
    ),
    view,
  );

  const pointNumbers = points.rows.flatMap((r) => (r.kind === 'point' ? [r.number] : []));
  const allPointsOpen = pointNumbers.length > 0 && pointNumbers.every((n) => openPoints.has(n));

  // The line over the score and who lost, shared with the image (state/reportCard.ts)
  // so the two can never tell the game differently.
  const meta = reportMeta(state, t, lang);
  const loser = gameLoser(state);

  // Memoised because the hook renders the image off it the moment it changes,
  // and a fresh object every render would redraw the canvas every render.
  const cardModel = useMemo(() => reportCardModel(state, t, lang), [state, t, lang]);
  const shareTitle = `${nameOf('A')} ${A.score} — ${B.score} ${nameOf('B')}`;
  const imageName = `${slug(nameOf('A')) || 'a'}-${A.score}-${B.score}-${slug(nameOf('B')) || 'b'}.png`;
  const { status: shareStatus, share } = useReportImage(cardModel, imageName, shareTitle);

  const buildPlainText = () => {
    const lines: string[] = [];
    lines.push(`${t('appTitle')} — ${t('field', { n: state.config.fieldNumber })}`);

    const startEntry = state.log.find((e) => e.type === 'gameStart');
    const endEntry = [...state.log].reverse().find((e) => e.type === 'gameEnd');
    if (startEntry) lines.push(t('reportStarted', { time: startEntry.wallClock }));
    if (endEntry) lines.push(t('reportFinished', { time: endEntry.wallClock }));
    if (startEntry && endEntry) {
      const durationSeconds = Math.round((endEntry.atMs - startEntry.atMs) / 1000);
      lines.push(t('reportDuration', { duration: formatClock(durationSeconds) }));
    }
    lines.push('');

    lines.push(`${t('finalScore')}: ${nameOf('A')} ${A.score} — ${B.score} ${nameOf('B')}`);
    lines.push('');
    for (const id of ['A', 'B'] as const) {
      lines.push(`${nameOf(id)}:`);
      // The same rows the table shows, in the same order — a fraction carries its
      // percentage in brackets, and a small row is indented under its parent.
      for (const row of statRows) {
        const value = id === 'A' ? row.a : row.b;
        const pct = id === 'A' ? row.aPct : row.bPct;
        lines.push(`${row.sub ? '    ' : '  '}${row.label}: ${value}${pct ? ` (${pct})` : ''}`);
      }
      lines.push('');
    }

    if (playerLines.length > 0) {
      lines.push(t('playerStatsTitle'));
      // The archive's job is the spreadsheet, not the phone, so it carries every
      // available view's columns on one line per player rather than paging through them.
      const columns = availableViews.flatMap(playerStatColumns);
      for (const p of sortPlayerStatLines(playerLines, view)) {
        const teamPrefix = showTeamFilter ? `${nameOf(p.team)} — ` : '';
        const cells = columns.map((c) => `${t(c.key)} ${statCellText(c, p)}`).join(', ');
        lines.push(`  ${teamPrefix}${p.label}: ${cells}`);
      }
      lines.push('');
    }

    // Every point, opened up the way the image paints it. The full log, corrections
    // and all, has its own copy button inside the dialog that shows it (FullLogDialog).
    lines.push(points.title);
    lines.push(...pointsTextLines(state, points));

    lines.push('');
    lines.push(t('reportFooterCredit'));
    lines.push('');
    lines.push(APP_URL);
    return lines.join('\n');
  };

  const copy = async () => {
    const ok = await copyText(buildPlainText());
    setCopyState(ok ? 'copied' : 'failed');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  return (
    <div className="min-h-dvh bg-pitch text-chalk px-4 pt-4 max-w-2xl mx-auto space-y-4">
      {/* The way back, in every mode: the game for a report reached from it (live
          mode hands its own callback in, the dashboard being mounted underneath; the
          report of a left game goes back by dispatching), the list for an archived
          one — named per mode, since "Back to the game" is a lie from the archive.
          Neutral title: nothing on this page claims the game is over. */}
      <PageHeader
        title={t('reportPageTitle')}
        backLabel={mode === 'archived' ? t('btnBack') : t('btnBackToGame')}
        onBack={layered ? onBack! : backToGame}
      />

      <SectionCard data-score-card>
        <p
          data-report-meta
          className="text-center font-board text-xs uppercase tracking-wide text-chalk/60"
        >
          {meta.join(' · ')}
        </p>
        {/* Two rows, not one: a name that wraps to a second line must never nudge its
            own score box out of alignment with the other team's. The name row mirrors
            the dash with an invisible twin so both name columns still land under their
            score boxes. */}
        <div className="flex items-center justify-center gap-4">
          {(['A', 'B'] as TeamId[]).map((id, i) => (
            <Fragment key={id}>
              {i === 1 && <span className="font-clock text-3xl text-chalk/40">—</span>}
              <div
                data-result={loser === null ? undefined : loser === id ? 'loss' : 'win'}
                className={`w-28 text-center font-clock text-6xl font-semibold rounded-md px-4 py-2 ${
                  loser === id ? 'opacity-40' : ''
                }`}
                style={{
                  backgroundColor: state.config.teams[id].color,
                  ...teamOutline(state.config.teams[id].color),
                  color: contrastText(state.config.teams[id].color),
                }}
              >
                {state.scores[id]}
              </div>
            </Fragment>
          ))}
        </div>
        <div className="flex items-start justify-center gap-4 mt-1">
          {(['A', 'B'] as TeamId[]).map((id, i) => (
            <Fragment key={id}>
              {i === 1 && <span className="font-clock text-3xl invisible">—</span>}
              <div
                className={`w-28 text-center font-board break-words ${
                  loser === id ? 'text-chalk/50' : loser !== null ? 'font-semibold' : ''
                }`}
              >
                {nameOf(id)}
              </div>
            </Fragment>
          ))}
        </div>
      </SectionCard>

      {/* Modelled on a broadcast game summary: large figures, each followed by the
          small rows that qualify it (the clean count under Holds, the average under
          Passes) with no rule in between. The percentage shares the figure's cell
          rather than taking a column of its own: at 360px a fifth column would leave
          the labels between them a few words wide. */}
      <SectionCard title={t('reportTeamsTitle')} icon={<StatsIcon size="w-4 h-4" />}>
        {/* Named and dotted at the head of each column: the score card above uses the
            same left/right order, but a column of figures should say whose it is
            without sending the eye back up the page. */}
        <table className="w-full table-fixed text-sm" data-team-stats>
          <colgroup>
            <col className="w-[30%]" />
            <col />
            <col className="w-[30%]" />
          </colgroup>
          <thead>
            <tr className="font-board text-xs font-semibold uppercase tracking-wide">
              {(['A', null, 'B'] as const).map((id, i) =>
                id === null ? (
                  <th key={i} />
                ) : (
                  <th key={id} scope="col" data-team-column={id} className="pb-2 font-semibold">
                    <span
                      className={`flex items-center gap-1.5 ${id === 'A' ? 'flex-row-reverse' : ''}`}
                    >
                      <span
                        aria-hidden="true"
                        className="shrink-0 w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: state.config.teams[id].color,
                          ...teamOutline(state.config.teams[id].color),
                        }}
                      />
                      <span className="truncate">{nameOf(id)}</span>
                    </span>
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {statRows.map((row, i) =>
              row.sub ? (
                <tr key={`${i}-${row.label}`} data-stat-tier="sub" className="text-chalk/60">
                  <td className="pb-1.5 text-right font-clock text-sm">{row.a}</td>
                  <td className="pb-1.5 text-center font-board text-[10px] uppercase tracking-wide">
                    {row.label}
                  </td>
                  <td className="pb-1.5 text-left font-clock text-sm">{row.b}</td>
                </tr>
              ) : (
                <tr
                  key={`${i}-${row.label}`}
                  className="border-t border-line"
                  data-stat-tier="main"
                >
                  <td className="pt-1.5 pb-1 text-right whitespace-nowrap">
                    {row.aPct && (
                      <span className="font-clock text-xs text-chalk/50 mr-1.5" data-pct>
                        {row.aPct}
                      </span>
                    )}
                    <span className="font-clock text-xl font-semibold" data-value>
                      {row.a}
                    </span>
                  </td>
                  <td className="pt-1.5 pb-1 text-center font-board text-xs uppercase tracking-wide">
                    {row.label}
                  </td>
                  <td className="pt-1.5 pb-1 text-left whitespace-nowrap">
                    <span className="font-clock text-xl font-semibold" data-value>
                      {row.b}
                    </span>
                    {row.bPct && (
                      <span className="font-clock text-xs text-chalk/50 ml-1.5" data-pct>
                        {row.bPct}
                      </span>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </SectionCard>

      {playerLines.length > 0 && (
        <SectionCard
          title={t('playerStatsTitle')}
          icon={<PlayersIcon size="w-4 h-4" />}
          className="overflow-x-auto"
        >
          {showTeamFilter && (
            <Segmented
              labelHidden
              label={t('playerStatsTeamLabel')}
              value={teamFilter}
              onChange={setTeamFilter}
              options={(['all', 'A', 'B'] as const).map((f) => ({
                value: f,
                label: f === 'all' ? t('filterAllTeams') : nameOf(f),
              }))}
            />
          )}
          {/* Three views over one roster, rather than one table too wide for a phone.
              Offered only for the views that have real data: Playing needs line
              tracking, Possession needs "Ask who turned it over" — the two are
              independent, so a game can offer either, both or neither. With only
              Scoring available the switch would be one choice onto the columns
              already on screen, so it stays hidden. */}
          {availableViews.length > 1 && (
            <Segmented
              labelHidden
              label={t('playerStatsViewLabel')}
              value={view}
              onChange={setView}
              options={availableViews.map((v) => ({ value: v, label: t(VIEW_KEY[v]) }))}
            />
          )}
          <PlayerStatsTable
            lines={visiblePlayerLines}
            columns={playerStatColumns(view)}
            teamColor={showTeamFilter ? (p) => state.config.teams[p.team].color : undefined}
            t={t}
          />
        </SectionCard>
      )}

      {/* Point by point — the game told one point at a time, folded here and painted
          opened up on the image. The log itself, entry for entry, is behind the
          button, which is what keeps the corrections out of the story. */}
      <SectionCard
        data-points-section
        title={points.title}
        icon={<LogIcon size="w-4 h-4" />}
        action={
          <>
            {/* Opens every point at once, or folds them all back — reading a whole
                game is otherwise a tap per point. An icon with a name rather than
                words: the heading has the room for one short label, and Full log
                is it. */}
            {pointNumbers.length > 0 && (
              <button
                type="button"
                data-points-fold={allPointsOpen ? 'open' : 'folded'}
                className={smallControl}
                aria-label={t(allPointsOpen ? 'pointsFoldAll' : 'pointsOpenAll')}
                title={t(allPointsOpen ? 'pointsFoldAll' : 'pointsOpenAll')}
                onClick={() => setOpenPoints(allPointsOpen ? new Set() : new Set(pointNumbers))}
              >
                {allPointsOpen ? <FoldIcon size="w-4 h-4" /> : <UnfoldIcon size="w-4 h-4" />}
              </button>
            )}
            <button type="button" className={smallControl} onClick={() => setShowFullLog(true)}>
              {t('btnFullLog')}
            </button>
          </>
        }
      >
        <PointByPoint
          model={points}
          teams={state.config.teams}
          open={openPoints}
          onOpenChange={setOpenPoints}
        />
      </SectionCard>

      {showFullLog && <FullLogDialog onClose={() => setShowFullLog(false)} />}

      {/* Starting a new game is what actually discards this one, the game screen
          having been left behind — so it is offered here and not in live mode.
          Setup guards nothing, so the trapped entry is spent rather than passed on. */}
      {!layered && (
        <button
          className={`${secondaryButtonOnPitch} w-full`}
          onClick={() => {
            dispatch({ type: 'BACK_TO_CONFIG' });
          }}
        >
          {t('newGame')}
        </button>
      )}
      {/* Share and Copy, always within reach: sending the report to the team chat is
          what this screen is mostly for, and with a whole game of points above them
          they used to be a long scroll away. The setup screen's Start bar, the same
          ground, hairline and safe-area padding, so the two read as one pattern. */}
      <div
        data-report-actions
        className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-pitch/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
      >
        <div className="grid grid-cols-2 gap-3">
          <button className={primaryButton} onClick={share}>
            {shareStatus === 'working'
              ? t('shareImagePreparing')
              : shareStatus === 'saved'
                ? t('shareImageSaved')
                : shareStatus === 'failed'
                  ? t('shareImageFailed')
                  : t('shareImage')}
          </button>
          <button
            className={`${secondaryButtonOnPitch} inline-flex items-center justify-center gap-2`}
            onClick={copy}
          >
            <CopyIcon size="w-5 h-5" />
            {copyState === 'copied'
              ? t('copied')
              : copyState === 'failed'
                ? t('copyFailed')
                : t('copyReport')}
          </button>
        </div>
      </div>
    </div>
  );
}
