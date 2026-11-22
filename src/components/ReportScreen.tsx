import { Fragment, useMemo, useState } from 'react';
import { handOverBackGuard, useBackGuard } from '../hooks/useBackGuard';
import { useReportImage } from '../hooks/useReportImage';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { turnoverPlayersTracked } from '../state/gameReducer';
import { lineTrackingEnabled } from '../state/lines';
import { copyText } from '../state/clipboard';
import { APP_URL, playerStatsTeams, reportCardModel, teamStatRows } from '../state/reportCard';
import { pointsModel, pointsTextLines } from '../state/pointStory';
import { formatClock, playerStatLines, sortPlayerStatLines, teamStats } from '../state/stats';
import type { PlayerStatView } from '../state/stats';
import type { TeamId } from '../state/types';
import { FullLogDialog } from './FullLogDialog';
import { PlayerStatsTable } from './PlayerStatsTable';
import { PointByPoint } from './PointByPoint';
import { playerStatColumns, statCellText } from './playerStatColumns';
import { contrastText, pillClass, primaryButton, secondaryButtonOnPitch, sectionTitle } from './ui';

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

  // The phone back gesture reads as "back to the game", the same as the button —
  // this screen is a layer over one, not the end of the app. It is the "complete
  // and land" shape: the press has already spent the entry, so nothing re-arms it
  // and the dashboard pushes its own on the way in. Live mode takes no guard at
  // all: GameScreen is still mounted underneath and peels this layer off with its
  // own (two hooks would each answer the other's press).
  // A layer over a screen that guards for it (the dashboard in `live`, the
  // past-games list in `archived`) takes no guard of its own: two hooks would each
  // attach a window listener and answer the other's press.
  const layered = mode !== 'phase';
  const resolveBack = useBackGuard(!layered, () => dispatch({ type: 'BACK_TO_GAME' }));
  const backToGame = () => {
    // Handed over rather than resolved, for the same reason the dashboard hands it
    // here: the game screen guards from where this one leaves off.
    handOverBackGuard();
    dispatch({ type: 'BACK_TO_GAME' });
  };

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
    <div className="min-h-dvh bg-pitch text-chalk p-4 pb-10 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 mt-2">
        {/* The way back, in every mode. Live mode hands its own callback in because
            the dashboard is still mounted behind it; the report phase leaves the game
            exactly as it found it, so BACK_TO_GAME is the whole of returning. */}
        <button
          type="button"
          className="rounded-lg bg-panel border border-line px-3 py-1 text-sm text-chalk/70 whitespace-nowrap"
          onClick={layered ? onBack : backToGame}
        >
          {/* Worded per mode for the same reason the guide's is worded neutrally:
              "Back to the game" is a lie from the archive, where there is no game to
              go back to — the way out is the list this one was opened from. */}
          ← {mode === 'archived' ? t('btnBack') : t('btnBackToGame')}
        </button>
        {/* A second way out: closing the report straight to setup, without first
            stepping back through the dashboard. Offered in exactly the cases
            "New game" at the bottom already is (see below) — this is the same
            action, reachable without scrolling. */}
        {!layered && (
          <button
            type="button"
            className="rounded-lg bg-panel border border-line px-3 py-1 text-sm text-chalk/70 whitespace-nowrap"
            onClick={() => {
              resolveBack();
              dispatch({ type: 'BACK_TO_CONFIG' });
            }}
          >
            {t('btnExitReport')} →
          </button>
        )}
      </div>

      <section className="rounded-xl bg-panel border border-line p-4">
        {/* Two rows, not one: a name that wraps to a second line must never nudge its
            own score box out of alignment with the other team's. The name row mirrors
            the dash with an invisible twin so both name columns still land under their
            score boxes. */}
        <div className="flex items-center justify-center gap-4">
          {(['A', 'B'] as TeamId[]).map((id, i) => (
            <Fragment key={id}>
              {i === 1 && <span className="font-clock text-3xl text-chalk/40">—</span>}
              <div
                className="w-28 text-center font-clock text-6xl font-semibold rounded-lg px-4 py-2"
                style={{
                  backgroundColor: state.config.teams[id].color,
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
              <div className="w-28 text-center font-board break-words">{nameOf(id)}</div>
            </Fragment>
          ))}
        </div>
      </section>

      {/* Modelled on a broadcast game summary: large figures, each followed by the
          small rows that qualify it (the clean count under Holds, the average under
          Passes) with no rule in between. The percentage shares the figure's cell
          rather than taking a column of its own: at 360px a fifth column would leave
          the labels between them a few words wide. */}
      <section className="rounded-xl bg-panel border border-line p-4">
        {/* No header row: the team names are on the score boxes directly above, in
            the same left/right order. */}
        <table className="w-full text-sm" data-team-stats>
          <colgroup>
            <col className="w-[30%]" />
            <col />
            <col className="w-[30%]" />
          </colgroup>
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
                  className={i === 0 ? '' : 'border-t border-line'}
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
      </section>

      {playerLines.length > 0 && (
        <section className="rounded-xl bg-panel border border-line p-4 overflow-x-auto">
          <h2 className={`${sectionTitle} mb-2`}>{t('playerStatsTitle')}</h2>
          {showTeamFilter && (
            <div className="flex gap-2 mb-3">
              {(['all', 'A', 'B'] as const).map((f) => (
                <button
                  key={f}
                  className={pillClass(teamFilter === f)}
                  onClick={() => setTeamFilter(f)}
                >
                  {f === 'all' ? t('filterAllTeams') : nameOf(f)}
                </button>
              ))}
            </div>
          )}
          {/* Three views over one roster, rather than one table too wide for a phone.
              Pills are offered only for the views that have real data: Playing needs
              line tracking, Possession needs "Ask who turned it over" — the two are
              independent, so a game can offer either, both or neither. With only
              Scoring available the pill row would be one tab onto the columns already
              on screen, so it stays hidden. Playing and the team filter still never
              share a screen (line tracking is Team mode only), but Possession can now
              sit above the filter in Player mode, since it asks nothing of the line. */}
          {availableViews.length > 1 && (
            <div className="flex gap-2 mb-3">
              {availableViews.map((v) => (
                <button
                  key={v}
                  className={pillClass(view === v)}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                >
                  {t(VIEW_KEY[v])}
                </button>
              ))}
            </div>
          )}
          <PlayerStatsTable
            lines={visiblePlayerLines}
            columns={playerStatColumns(view)}
            teamColor={showTeamFilter ? (p) => state.config.teams[p.team].color : undefined}
            t={t}
          />
        </section>
      )}

      {/* Point by point — the game told one point at a time, folded here and painted
          opened up on the image. The log itself, entry for entry, is behind the
          button, which is what keeps the corrections out of the story. */}
      <section className="rounded-xl bg-panel border border-line p-4" data-points-section>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className={sectionTitle}>{points.title}</h2>
          <button
            className="rounded-lg bg-pitch border border-line px-2 py-1.5 text-[11px] font-board uppercase tracking-wide text-chalk active:scale-95 shrink-0"
            onClick={() => setShowFullLog(true)}
          >
            {t('btnFullLog')}
          </button>
        </div>
        <PointByPoint model={points} teams={state.config.teams} />
      </section>

      {showFullLog && <FullLogDialog onClose={() => setShowFullLog(false)} />}

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
        <button className={secondaryButtonOnPitch} onClick={copy}>
          {copyState === 'copied'
            ? t('copied')
            : copyState === 'failed'
              ? t('copyFailed')
              : t('copyReport')}
        </button>
      </div>

      {/* Starting a new game is what actually discards this one, the game screen
          having been left behind — so it is offered here and not in live mode.
          Setup guards nothing, so the trapped entry is spent rather than passed on. */}
      {!layered && (
        <button
          className={`${secondaryButtonOnPitch} w-full`}
          onClick={() => {
            resolveBack();
            dispatch({ type: 'BACK_TO_CONFIG' });
          }}
        >
          {t('newGame')}
        </button>
      )}
    </div>
  );
}
