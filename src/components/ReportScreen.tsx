import { Fragment, useMemo, useState } from 'react';
import { useReportImage } from '../hooks/useReportImage';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { statsTrackingEnabled } from '../state/gameReducer';
import { copyText } from '../state/clipboard';
import { playerStatsTeams, reportCardModel, teamStatRows } from '../state/reportCard';
import {
  formatClock,
  logTextLines,
  playerStatLines,
  reportLogEntries,
  teamStats,
} from '../state/stats';
import type { TeamId } from '../state/types';
import { FullLogDialog } from './FullLogDialog';
import { GameLogTable } from './GameLogTable';
import { PossessionLedger } from './PossessionLedger';
import { contrastText, pillClass, primaryButton, secondaryButtonOnPitch, sectionTitle } from './ui';

/** Plugged into the report footer so a shared copy points back at the app. */
const APP_URL = 'https://xaviml.github.io/ultimate-scorekeeper/';

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
  // What the history panel lists and what the copy button writes are the same
  // entries on purpose: what you read is what you take away.
  const visibleLog = reportLogEntries(state.log);
  const visiblePlayerLines =
    teamFilter === 'all' ? playerLines : playerLines.filter((p) => p.team === teamFilter);

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
      for (const p of playerLines) {
        const teamPrefix = showTeamFilter ? `${nameOf(p.team)} — ` : '';
        lines.push(
          `  ${teamPrefix}${p.label}: ${t('colAssists')} ${p.assists}, ${t('colGoals')} ${p.goals}, ${t('colTotal')} ${p.total}`,
        );
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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-chalk/50 text-left">
                <th className="py-1">{t('colPlayer')}</th>
                <th className="py-1 text-right">{t('colAssists')}</th>
                <th className="py-1 text-right">{t('colGoals')}</th>
                <th className="py-1 text-right">{t('colTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {visiblePlayerLines.map((p) => (
                <tr
                  key={`${p.team}:${p.playerId}`}
                  // The aggregate names nobody, so it is dimmed rather than reading as
                  // a player who happened to be called "Not recorded".
                  className={`border-t border-line/50 ${p.unassigned ? 'text-chalk/50 italic' : ''}`}
                >
                  <td className="py-1.5">
                    {showTeamFilter && (
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                        style={{ backgroundColor: state.config.teams[p.team].color }}
                      />
                    )}
                    {p.label}
                  </td>
                  <td className="py-1.5 text-right font-clock">{p.assists}</td>
                  <td className="py-1.5 text-right font-clock">{p.goals}</td>
                  <td className="py-1.5 text-right font-clock">{p.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
