import { useMemo, useState } from 'react';
import { useBackGuard } from '../hooks/useBackGuard';
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
import { CrossIcon } from './icons';
import ReportScreen from './ReportScreen';
import { contrastText, sectionTitle } from './ui';

/**
 * The archive of finished games, reached from the setup screen's menu.
 *
 * A screen rendered by its caller (an early return in ConfigScreen), exactly like
 * the guide and for the same reason: the setup form stays mounted underneath and
 * survives the round trip, and the reducer stays free of a UI-only phase. The
 * games themselves come from localStorage rather than from the reducer — they are
 * other games, and the one in the reducer is the one being set up.
 *
 * The list is read once, on mount, into local state: nothing else on the device
 * writes to the archive while this screen is open (the only writer is the game in
 * progress, and there isn't one), so re-reading storage on every render would be
 * work with no answer to give. Deleting updates both at once.
 */
export default function PastGamesScreen({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT();
  const [games, setGames] = useState<GameState[]>(() => loadGameHistory());
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GameState | null>(null);

  const groups = useMemo(() => groupGamesByDate(games), [games]);
  const open = games.find((g) => g.id === openId) ?? null;

  // One guard for the whole screen, peeling the report layer off first — the same
  // shape (and the same reason) as the game screen's: two useBackGuard hooks would
  // each attach a window listener and answer the other's press. ConfigScreen's own
  // guard is inactive while this screen is up, since the guide it watches is closed.
  const resolveBack = useBackGuard(true, ({ stay }) => {
    if (open) {
      stay();
      setOpenId(null);
      return;
    }
    onClose();
  });

  const dayFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [lang],
  );
  const stampFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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
  if (open) {
    return (
      <StateCtx.Provider value={open}>
        <DispatchCtx.Provider value={noopDispatch}>
          <ReportScreen mode="archived" onBack={() => setOpenId(null)} />
        </DispatchCtx.Provider>
      </StateCtx.Provider>
    );
  }

  return (
    <div className="min-h-dvh bg-pitch text-chalk p-4 pb-10 max-w-2xl mx-auto space-y-4">
      <button
        type="button"
        className="rounded-lg bg-panel border border-line px-3 py-1 text-sm text-chalk/70 whitespace-nowrap mt-2"
        onClick={() => {
          resolveBack();
          onClose();
        }}
      >
        ← {t('btnBack')}
      </button>

      <h1 className="font-board text-2xl font-bold">{t('pastGamesTitle')}</h1>

      {games.length === 0 && (
        <p className="text-sm text-chalk/60 rounded-xl bg-panel border border-line p-4">
          {t('pastGamesEmpty')}
        </p>
      )}

      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <h2 className={sectionTitle}>{dayFormat.format(new Date(group.atMs))}</h2>
          {group.games.map((game) => (
            <div
              key={game.id}
              className="flex items-stretch gap-2 rounded-xl bg-panel border border-line"
            >
              {/* The row and its cross are siblings rather than nested buttons: a
                  button inside a button is invalid, and the cross must not be a
                  way of opening the game it deletes. */}
              <button
                type="button"
                data-past-game={game.id}
                className="flex-1 min-w-0 text-left px-3 py-3 active:scale-[0.99]"
                onClick={() => setOpenId(game.id)}
              >
                <div className="text-xs text-chalk/50">
                  {stampFormat.format(new Date(gameStartedAtMs(game)))}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  {(['A', 'B'] as TeamId[]).map((id, i) => (
                    <div
                      key={id}
                      className={`flex-1 min-w-0 flex items-center gap-2 ${
                        i === 1 ? 'flex-row-reverse text-right' : ''
                      }`}
                    >
                      {/* The score in the team's own colour, as the report paints
                          it — the two teams are told apart by colour on the
                          dashboard all game, and this is the same scoreline. */}
                      <span
                        className="w-10 shrink-0 text-center font-clock text-2xl font-semibold rounded-lg py-0.5"
                        style={{
                          backgroundColor: game.config.teams[id].color,
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
                className="shrink-0 px-3 text-chalk/40 active:scale-95"
                aria-label={t('deleteGameAria', { match: matchLabel(game) })}
                onClick={() => setPendingDelete(game)}
              >
                <CrossIcon size="w-4 h-4" />
              </button>
            </div>
          ))}
        </section>
      ))}

      {pendingDelete && (
        <ConfirmDeleteGameDialog
          match={matchLabel(pendingDelete)}
          onConfirm={() => remove(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/** See the archived report above: nothing here may change a game that is over. */
const noopDispatch = () => {};
