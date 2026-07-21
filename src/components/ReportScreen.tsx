import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import {
  callDetail,
  formatClock,
  goalPlayersDetail,
  teamStats,
  turnoverPlayersDetail,
} from '../state/stats';
import type { TeamId } from '../state/types';
import { GameLogTable } from './GameLogTable';
import { contrastText, primaryButton, secondaryButtonOnPitch, sectionTitle } from './ui';

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
  const { t } = useT();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const A = teamStats(state, 'A');
  const B = teamStats(state, 'B');
  const nameOf = (id: TeamId) => state.config.teams[id].name;

  const fmt = (s: number | null) => (s === null ? '—' : formatClock(s));

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
      lines.push(`  ${t('statBreaks')}: ${s.breaks}`);
      lines.push(`  ${t('statAvgHold')}: ${fmt(s.avgHoldSeconds)}`);
      lines.push(`  ${t('statAvgBreak')}: ${fmt(s.avgBreakSeconds)}`);
      lines.push(`  ${t('statTimeouts')}: ${s.timeoutsUsed}`);
      lines.push('');
    }
    lines.push(t('historyTitle'));
    for (const e of state.log) {
      const team = e.team ? ` — ${nameOf(e.team)}` : '';
      const detail = e.detail ? ` (${e.detail})` : '';
      const players = goalPlayersDetail(state, e, t) + turnoverPlayersDetail(state, e, t);
      const call = callDetail(e, t);
      lines.push(
        `  [${formatClock(e.gameSeconds)}] ${t(`event_${e.type}` as never)}${team}${detail}${players}${call ? ` — ${call}` : ''}`,
      );
    }
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

  const statRows: Array<[string, string | number, string | number]> = [
    [t('statOLineHolds'), A.oLineHolds, B.oLineHolds],
    [t('statBreaks'), A.breaks, B.breaks],
    [t('statAvgHold'), fmt(A.avgHoldSeconds), fmt(B.avgHoldSeconds)],
    [t('statAvgBreak'), fmt(A.avgBreakSeconds), fmt(B.avgBreakSeconds)],
    [t('statTimeouts'), A.timeoutsUsed, B.timeoutsUsed],
  ];

  return (
    <div className="min-h-dvh bg-pitch text-chalk p-4 pb-10 max-w-2xl mx-auto space-y-4">
      <h1 className="font-board text-2xl font-bold pt-2">{t('reportTitle')}</h1>

      <section className="rounded-xl bg-panel border border-line p-4">
        <h2 className={`${sectionTitle} mb-3`}>{t('finalScore')}</h2>
        <div className="flex items-center justify-center gap-4">
          {(['A', 'B'] as TeamId[]).map((id, i) => (
            <div key={id} className="flex items-center gap-4">
              {i === 1 && <span className="font-clock text-3xl text-chalk/40">—</span>}
              <div className="text-center">
                <div
                  className="font-clock text-6xl font-semibold rounded-lg px-4 py-2"
                  style={{
                    backgroundColor: state.config.teams[id].color,
                    color: contrastText(state.config.teams[id].color),
                  }}
                >
                  {state.scores[id]}
                </div>
                <div className="mt-1 font-board">{nameOf(id)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-panel border border-line p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-chalk/50">
              <th className="text-left py-1"></th>
              <th className="text-right py-1">{nameOf('A')}</th>
              <th className="text-right py-1">{nameOf('B')}</th>
            </tr>
          </thead>
          <tbody>
            {statRows.map(([label, a, b]) => (
              <tr key={label} className="border-t border-line/50">
                <td className="py-1.5">{label}</td>
                <td className="py-1.5 text-right font-clock">{a}</td>
                <td className="py-1.5 text-right font-clock">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl bg-panel border border-line p-4 overflow-x-auto">
        <h2 className={`${sectionTitle} mb-2`}>{t('historyTitle')}</h2>
        <GameLogTable />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button className={primaryButton} onClick={copy}>
          {copyState === 'copied'
            ? t('copied')
            : copyState === 'failed'
              ? t('copyFailed')
              : t('copyReport')}
        </button>
        <button
          className={secondaryButtonOnPitch}
          onClick={() => dispatch({ type: 'BACK_TO_CONFIG' })}
        >
          {t('newGame')}
        </button>
      </div>
    </div>
  );
}
