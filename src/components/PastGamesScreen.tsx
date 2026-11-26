import { useEffect, useMemo, useState } from 'react';
import { back, navigate } from '../hooks/useRoute';
import { usePreservedScroll } from '../hooks/usePreservedScroll';
import { PageHeader } from './PageHeader';
import { useT } from '../i18n/useT';
import { DispatchCtx, StateCtx } from '../state/gameHooks';
import {
  deleteGameFromHistory,
  gameStartedAtMs,
  groupGamesByDate,
  loadGameHistory,
} from '../state/gameHistory';
import type { GameState, TeamId } from '../state/types';
import { ConfirmDeleteGameDialog } from './ConfirmDeleteGameDialog';
import { CrossIcon, HistoryIcon } from './icons';
import { SectionCard } from './SectionCard';
import ReportScreen from './ReportScreen';
import { LOCALES } from '../state/reportCard';
import { contrastText, teamOutline } from './ui';

/**
 * The archive of finished games, reached from the setup screen's menu.
 *
 * A page of its own (#/history, and #/history/<id> for one game's report), opened
 * over the setup screen, which App keeps mounted underneath so the form survives
 * the round trip. The games themselves come from localStorage rather than from the
 * reducer — they are other games, and the one in the reducer is the one being set up.
 *
 * The list stays mounted under an open game too, so backing out of a report comes
 * back to the list where it was scrolled to.
 *
 * The list is read once, on mount, into local state: nothing else on the device
 * writes to the archive while this screen is open (the only writer is the game in
 * progress, and there isn't one), so re-reading storage on every render would be
 * work with no answer to give. Deleting updates both at once.
 */
export default function PastGamesScreen({ openId }: { openId: string | null }) {
  const { t, lang } = useT();
  const [games, setGames] = useState<GameState[]>(() => loadGameHistory());
  const [pendingDelete, setPendingDelete] = useState<GameState | null>(null);

  const groups = useMemo(() => groupGamesByDate(games), [games]);
  const open = games.find((g) => g.id === openId) ?? null;

  // An address naming a game that is not here (deleted, or from another device)
  // falls back to the list rather than showing nothing.
  useEffect(() => {
    if (openId !== null && !open) navigate({ name: 'history' }, { replace: true });
  }, [openId, open]);
  usePreservedScroll(open !== null);

  const dayFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(LOCALES[lang], {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [lang],
  );
  // The day is the card's heading, so a row only needs the time it started.
  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(LOCALES[lang], {
        hour: '2-digit',
        minute: '2-digit',
        // 24-hour in every language: a tournament schedule is written that way.
        hourCycle: 'h23',
      }),
    [lang],
  );

  const matchLabel = (g: GameState) =>
    `${g.config.teams.A.name} ${g.scores.A} — ${g.scores.B} ${g.config.teams.B.name}`;

  const remove = (g: GameState) => {
    deleteGameFromHistory(g.id);
    setGames((all) => all.filter((x) => x.id !== g.id));
    setPendingDelete(null);
  };

  // A game from the archive is read, never played: the report is handed the stored
  // state through the same context the live one reads, with a dispatch that does
  // nothing. That is the whole of "read-only" — every control that could change a
  // game (the log editor, "back to the game", "new game") is either absent in this
  // mode or dispatches into a void, and the game currently set up underneath is
  // untouched whatever happens here.
  return (
    <>
      {open && (
        <StateCtx.Provider value={open}>
          <DispatchCtx.Provider value={noopDispatch}>
            <ReportScreen mode="archived" onBack={() => back({ name: 'history' })} />
          </DispatchCtx.Provider>
        </StateCtx.Provider>
      )}
      <div
        hidden={open !== null}
        className="min-h-dvh bg-pitch text-chalk p-4 pb-10 max-w-2xl mx-auto space-y-4"
      >
        <PageHeader
          title={t('pastGamesTitle')}
          backLabel={t('btnBack')}
          onBack={() => back({ name: 'setup' })}
        />

        {games.length === 0 && (
          <SectionCard>
            <p className="text-sm text-chalk/60">{t('pastGamesEmpty')}</p>
          </SectionCard>
        )}

        {/* One card per day, the date as its heading and the games split by
            hairlines inside it — the report's and the setup screen's card, rather
            than loose rows under a bare title. */}
        {groups.map((group) => (
          <SectionCard
            key={group.key}
            title={dayFormat.format(new Date(group.atMs))}
            icon={<HistoryIcon size="w-4 h-4" />}
            className="!space-y-0"
          >
            <ul className="mt-1">
              {group.games.map((game) => {
                // A game the volunteer left from the menu rather than one the
                // scoreline (or a cap) ended: said with a small tag beside the time,
                // in grey rather than amber, since an archived game has nothing left
                // for anyone to act on.
                const unfinished = game.status !== 'finished';
                return (
                  <li
                    key={game.id}
                    className="flex items-stretch gap-2 border-t border-line first:border-t-0"
                  >
                    {/* The row and its cross are siblings rather than nested buttons:
                      a button inside a button is invalid, and the cross must not be
                      a way of opening the game it deletes. */}
                    <button
                      type="button"
                      data-past-game={game.id}
                      className="flex-1 min-w-0 text-left py-3 active:scale-[0.99]"
                      onClick={() => navigate({ name: 'historyGame', id: game.id })}
                    >
                      <div className="flex items-center gap-2 text-xs text-chalk/50">
                        <span className="font-clock text-sm">
                          {timeFormat.format(new Date(gameStartedAtMs(game)))}
                        </span>
                        {unfinished && (
                          <span
                            data-unfinished
                            className="font-board uppercase tracking-wide text-[10px] text-chalk/60 border border-dashed border-chalk/40 rounded-sm px-1.5 py-px"
                          >
                            {t('pastGameUnfinished')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {(['A', 'B'] as TeamId[]).map((id, i) => (
                          <div
                            key={id}
                            className={`flex-1 min-w-0 flex items-center gap-2 ${
                              i === 1 ? 'flex-row-reverse text-right' : ''
                            }`}
                          >
                            {/* The score in the team's own colour, as the report
                              paints it — the two teams are told apart by colour on
                              the dashboard all game, and this is the same scoreline. */}
                            <span
                              className="w-10 shrink-0 text-center font-clock text-2xl font-semibold rounded py-0.5"
                              style={{
                                backgroundColor: game.config.teams[id].color,
                                ...teamOutline(game.config.teams[id].color),
                                color: contrastText(game.config.teams[id].color),
                              }}
                            >
                              {game.scores[id]}
                            </span>
                            {/* Wrapped rather than truncated: a club name is how a
                              volunteer recognises the game in this list, and half of
                              one identifies nothing. The row grows a line instead. */}
                            <span className="min-w-0 font-board leading-tight break-words">
                              {game.config.teams[id].name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 pl-3 text-chalk/40 active:scale-95"
                      aria-label={t('deleteGameAria', { match: matchLabel(game) })}
                      onClick={() => setPendingDelete(game)}
                    >
                      <CrossIcon size="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        ))}

        {pendingDelete && (
          <ConfirmDeleteGameDialog
            match={matchLabel(pendingDelete)}
            onConfirm={() => remove(pendingDelete)}
            onCancel={() => setPendingDelete(null)}
          />
        )}
      </div>
    </>
  );
}

/** See the archived report above: nothing here may change a game that is over. */
const noopDispatch = () => {};
