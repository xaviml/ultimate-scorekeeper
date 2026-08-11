import { Fragment, useMemo, useState } from 'react';
import { useReportImage } from '../hooks/useReportImage';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { statsTrackingEnabled } from '../state/gameReducer';
import { playerStatsTeams, reportCardModel, teamStatRows } from '../state/reportCard';
import {
  callDetail,
  formatClock,
  goalPlayersDetail,
  latePullDetail,
  pauseDetail,
  playerStatLines,
  stoppageDetail,
  teamStats,
  turnoverPlayersDetail,
} from '../state/stats';
import type { TeamId } from '../state/types';
import { GameLogTable } from './GameLogTable';
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
 * Fallback for browsers/contexts where the async Clipboard API is unavailable
 * (non-HTTPS dev/LAN testing, older mobile browsers) — the deprecated but
 * still widely supported execCommand path.
 */
function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

export default function ReportScreen() {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t, lang } = useT();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [teamFilter, setTeamFilter] = useState<TeamId | 'all'>('all');

  const A = teamStats(state, 'A');
  const B = teamStats(state, 'B');
  const nameOf = (id: TeamId) => state.config.teams[id].name;

  const fmt = (s: number | null) => (s === null ? '—' : formatClock(s));

  const trackingOn = statsTrackingEnabled(state.config);
  // Team mode only ever has player detail for the tracked side; Player mode has
  // both, with a filter to page through them on a small screen.
  const showTeamFilter = state.config.statsMode === 'player';
  const playerLines = playerStatLines(state, playerStatsTeams(state.config), t);
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

    lines.push(t('historyTitle'));
    for (const e of state.log) {
      const team = e.team ? ` — ${nameOf(e.team)}` : '';
      // stoppageDetail renders e.detail itself (the injured player, if any), so
      // it's left out here to avoid printing it twice.
      const detail = e.detail && !e.stoppageKind ? ` (${e.detail})` : '';
      const players = goalPlayersDetail(state, e, t) + turnoverPlayersDetail(state, e, t);
      const call =
        callDetail(e, t) || stoppageDetail(e, t) || pauseDetail(e, t) || latePullDetail(e, t);
      lines.push(
        `  [${formatClock(e.gameSeconds)}] ${t(`event_${e.type}` as never)}${team}${detail}${players}${call ? ` — ${call}` : ''}`,
      );
    }

    lines.push('');
    lines.push(t('reportFooterCredit'));
    lines.push('');
    lines.push(APP_URL);
    return lines.join('\n');
  };

  const copy = async () => {
    const text = buildPlainText();
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (!ok) ok = legacyCopy(text);
    setCopyState(ok ? 'copied' : 'failed');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  // Shared with the image so the two can never drift — see state/reportCard.ts.
  const statRows = teamStatRows(state, t);

  return (
    <div className="min-h-dvh bg-pitch text-chalk p-4 pb-10 max-w-2xl mx-auto space-y-4">
      <h1 className="font-board text-2xl font-bold pt-2">{t('reportTitle')}</h1>

      <section className="rounded-xl bg-panel border border-line p-4">
        <h2 className={`${sectionTitle} mb-3`}>{t('finalScore')}</h2>
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

      <section className="rounded-xl bg-panel border border-line p-4 overflow-x-auto">
        <h2 className={`${sectionTitle} mb-2`}>{t('historyTitle')}</h2>
        <GameLogTable />
      </section>

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

      <button
        className={`${secondaryButtonOnPitch} w-full`}
        onClick={() => dispatch({ type: 'BACK_TO_CONFIG' })}
      >
        {t('newGame')}
      </button>
    </div>
  );
}
