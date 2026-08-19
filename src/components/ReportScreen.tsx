import { Fragment, useMemo, useState } from 'react';
import { handOverBackGuard, useBackGuard } from '../hooks/useBackGuard';
import { useReportImage } from '../hooks/useReportImage';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { turnoverPlayersTracked, turnoversTracked } from '../state/gameReducer';
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

  const fmt = (s: number | null) => (s === null ? '—' : formatClock(s));

  // The extended team-stat rows are all turnover-derived (see teamStatRows), which
  // is a narrower question than whether this game tracks anything.
  const trackingOn = turnoversTracked(state.config);
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
  // What the history panel lists and what the copy button writes are the same
  // entries on purpose: what you read is what you take away.
  const visibleLog = reportLogEntries(state.log);
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
  // once at least one point actually tracked possession — a game that never
  // recorded turnovers (or one restored from before this was tracked) has nothing
  // but flat columns to show. The board's fixed left team stays on top, the same
  // orientation the volunteer watched all game.
  const ledgerTop: TeamId = state.config.startingSide;
  const ledgerBottom: TeamId = ledgerTop === 'A' ? 'B' : 'A';
  // Any point recorded with tracking on carries possessionSeconds — a
  // zero-second point included, which the ledger gives a possession-counted
  // bar rather than a flat column (see possessionTopShare).
  const showLedger = trackingOn && state.points.some((p) => p.possessionSeconds !== undefined);

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
