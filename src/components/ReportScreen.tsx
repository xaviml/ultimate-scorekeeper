import { Fragment, useMemo, useState } from 'react';
import { useReportImage } from '../hooks/useReportImage';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { statsTrackingEnabled, turnoverPlayersTracked } from '../state/gameReducer';
import { lineTrackingEnabled } from '../state/lines';
import { copyText } from '../state/clipboard';
import { playerStatsTeams, reportCardModel, teamStatRows } from '../state/reportCard';
import {
  formatClock,
  logTextLines,
  playerStatLines,
  sortPlayerStatLines,
  reportLogEntries,
  teamStats,
} from '../state/stats';
import type { PlayerStatView } from '../state/stats';
import type { TeamId } from '../state/types';
import { FullLogDialog } from './FullLogDialog';
import { GameLogTable } from './GameLogTable';
import { PlayerStatsTable } from './PlayerStatsTable';
import { playerStatColumns, statCellText } from './playerStatColumns';
import { PossessionLedger } from './PossessionLedger';
import { contrastText, pillClass, primaryButton, secondaryButtonOnPitch, sectionTitle } from './ui';

/** Plugged into the report footer so a shared copy points back at the app. */
const APP_URL = 'https://xaviml.github.io/ultimate-scorekeeper/';

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
 * The finished-game report, and — with `live` — the same view opened from the
 * game menu mid-game, so a captain can lean over the stats at half-time. Live
 * mode drops only the finished-game furniture: the "Final report" heading (a
 * back-to-the-game button takes its place), the "Final score" label over the
 * score boxes, and the "New game" button. Everything else, sharing and copying
 * included, works on the game as it stands.
 */
export default function ReportScreen({
  live = false,
  onBack,
}: {
  live?: boolean;
  onBack?: () => void;
} = {}) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t, lang } = useT();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [teamFilter, setTeamFilter] = useState<TeamId | 'all'>('all');
  const [view, setView] = useState<PlayerStatView>('scoring');
  const [showFullLog, setShowFullLog] = useState(false);

  const A = teamStats(state, 'A');
  const B = teamStats(state, 'B');
  const nameOf = (id: TeamId) => state.config.teams[id].name;

  const fmt = (s: number | null) => (s === null ? '—' : formatClock(s));

  const trackingOn = statsTrackingEnabled(state.config);
  // Team mode only ever has player detail for the tracked side; Player mode has
  // both, with a filter to page through them on a small screen.
  const showTeamFilter = state.config.statsMode === 'player';
  const playerLines = playerStatLines(state, playerStatsTeams(state.config), t);
  // Playing is read off `PointRecord.line`, so it needs line tracking. Possession
  // is read off the log's turnoverId/defenseId, so it needs only "Ask who turned
  // it over" — line tracking is not a gate for it at all. The config flag is the
  // normal reason it has anything to show, but `LogEditDialog` can attribute a
  // turnover as a correction whatever the flag says, so a game that turned the
  // flag on late — or never — still gets the view once a turn or a D is named.
  const showPlayingView = lineTrackingEnabled(state.config);
  const showPossessionView =
    turnoverPlayersTracked(state.config) ||
    playerLines.some((p) => !p.unassigned && (p.turns > 0 || p.defenses > 0));
  const availableViews = (['scoring', 'playing', 'possession'] as const).filter((v) =>
    v === 'playing' ? showPlayingView : v === 'possession' ? showPossessionView : true,
  );
  // What the history panel lists and what the copy button writes are the same
  // entries on purpose: what you read is what you take away.
  const visibleLog = reportLogEntries(state.log);
  const visiblePlayerLines = sortPlayerStatLines(
    teamFilter === 'all' ? playerLines : playerLines.filter((p) => p.team === teamFilter),
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
    for (const [id, s] of [
      ['A', A],
      ['B', B],
    ] as const) {
      lines.push(`${nameOf(id)}:`);
      lines.push(`  ${t('statOLineHolds')}: ${s.oLineHolds}`);
      if (trackingOn) lines.push(`  ${t('statCleanHold')}: ${s.cleanHolds}`);
      if (trackingOn) lines.push(`  ${t('statBreakChances')}: ${s.breakChances}`);
      if (trackingOn) lines.push(`  ${t('statTurnovers')}: ${s.turnovers}`);
      lines.push(`  ${t('statBreaks')}: ${s.breaks}`);
      if (trackingOn) lines.push(`  ${t('statCleanBreaks')}: ${s.cleanBreaks}`);
      lines.push(`  ${t('statAvgHold')}: ${fmt(s.avgHoldSeconds)}`);
      lines.push(`  ${t('statAvgBreak')}: ${fmt(s.avgBreakSeconds)}`);
      lines.push(`  ${t('statTimeouts')}: ${s.timeoutsUsed}`);
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

    // The history as the report shows it, turnovers and calls left out. The full
    // log has its own copy button inside the dialog that shows it (FullLogDialog)
    // — this text is the game's story, not its every event.
    lines.push(t('historyTitle'));
    lines.push(...logTextLines(state, visibleLog, t));

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

  // Shared with the image so the two can never drift — see state/reportCard.ts.
  const statRows = teamStatRows(state, t);

  // The possession ledger, reused from the live-stats slot. Only worth drawing
  // once at least one point actually tracked possession — a game recorded in
  // statsMode 'none' (or restored from before this was tracked) has nothing but
  // flat columns to show. The board's fixed left team stays on top, the same
  // orientation the volunteer watched all game.
  const ledgerTop: TeamId = state.config.startingSide;
  const ledgerBottom: TeamId = ledgerTop === 'A' ? 'B' : 'A';
  // Any point recorded with tracking on carries possessionSeconds — a
  // zero-second point included, which the ledger gives a possession-counted
  // bar rather than a flat column (see possessionTopShare).
  const showLedger = trackingOn && state.points.some((p) => p.possessionSeconds !== undefined);

  return (
    <div className="min-h-dvh bg-pitch text-chalk p-4 pb-10 max-w-2xl mx-auto space-y-4">
      {live ? (
        <button
          type="button"
          className="rounded-lg bg-panel border border-line px-3 py-1 text-sm text-chalk/70 whitespace-nowrap mt-2"
          onClick={onBack}
        >
          ← {t('btnBackToGame')}
        </button>
      ) : (
        <h1 className="font-board text-2xl font-bold pt-2">{t('reportTitle')}</h1>
      )}

      <section className="rounded-xl bg-panel border border-line p-4">
        {!live && <h2 className={`${sectionTitle} mb-3`}>{t('finalScore')}</h2>}
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

      <section className="rounded-xl bg-panel border border-line p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-chalk/50">
              <th className="text-right py-1 w-1/4">{nameOf('A')}</th>
              <th className="py-1"></th>
              <th className="text-left py-1 w-1/4">{nameOf('B')}</th>
            </tr>
          </thead>
          <tbody>
            {statRows.map((row) => (
              <tr key={row.label} className="border-t border-line/50">
                <td className="py-1.5 text-right font-clock">{row.a}</td>
                <td className="py-1.5 text-center text-chalk/70">{row.label}</td>
                <td className="py-1.5 text-left font-clock">{row.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {showLedger && (
        <section className="rounded-xl bg-panel border border-line p-4">
          <h2 className={`${sectionTitle} mb-3`}>{t('possessionTitle')}</h2>
          {/* The ledger scrolls horizontally on its own past the panel's width. */}
          <PossessionLedger
            points={state.points}
            topTeam={ledgerTop}
            colors={{ A: state.config.teams.A.color, B: state.config.teams.B.color }}
            chartHeight={72}
          />
          <p className="text-xs text-chalk/50 mt-2">
            {t('possessionLegend', { top: nameOf(ledgerTop), bottom: nameOf(ledgerBottom) })}
          </p>
        </section>
      )}

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

      {/* The history, minus the turnovers and the calls — see reportLogEntries.
          Everything is still one tap away, which is what the button is for. */}
      <section className="rounded-xl bg-panel border border-line p-4 overflow-x-auto">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className={sectionTitle}>{t('historyTitle')}</h2>
          <button
            className="rounded-lg bg-pitch border border-line px-2 py-1.5 text-[11px] font-board uppercase tracking-wide text-chalk active:scale-95 shrink-0"
            onClick={() => setShowFullLog(true)}
          >
            {t('btnFullLog')}
          </button>
        </div>
        <GameLogTable entries={visibleLog} />
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

      {!live && (
        <button
          className={`${secondaryButtonOnPitch} w-full`}
          onClick={() => dispatch({ type: 'BACK_TO_CONFIG' })}
        >
          {t('newGame')}
        </button>
      )}
    </div>
  );
}
