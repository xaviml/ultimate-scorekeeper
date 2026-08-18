import { useState } from 'react';
import { useT } from '../i18n/useT';
import { rosterTeams } from '../state/gameReducer';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { playersOnField } from '../state/lines';
import type { StoppagePlayer, TeamId } from '../state/types';
import { CheckField } from './CheckField';
import { Modal } from './Modal';
import { PlayerMultiPicker } from './PlayerPicker';
import { PlayerRosterEditor } from './PlayerRosterEditor';
import { PlayerSelectDialog } from './PlayerSelectDialog';
import { contrastText, primaryButton, secondaryButton, teamChoiceButton } from './ui';

/**
 * "Who got injured?" — the one place that question is asked, whether the stoppage
 * is being recorded (StoppageDialog) or an already recorded one is being corrected
 * from the log (LogEditDialog). Attribution is always optional: submitting with
 * nobody picked logs the injury with no one attached.
 *
 * Which picker appears depends on how many rosters this game keeps (`rosterTeams`),
 * because that is what decides who can be named at all:
 *
 * - none — no roster on either side, so the only question is which team, and
 *   picking one submits on the spot (there is nothing else to answer). "No team"
 *   is a real answer here, not a cancel.
 * - one — the usual named-player picker for the followed team, plus one checkbox
 *   naming the other team with no player, since that side never gets a player
 *   question.
 * - both — one picker per roster: a collision can hurt opponents at once, so
 *   any number of players from either team can be named.
 */
export function InjuryAttributionDialog({
  initialTeam,
  initialPlayers,
  onField,
  onCancel,
  onSubmit,
}: {
  /** The generic, no-player team attribution (see PendingStoppage.team). */
  initialTeam?: TeamId;
  initialPlayers?: StoppagePlayer[];
  /**
   * The line-team players who were on the field, to narrow the picker to — only
   * somebody who was on can have been hurt in the point.
   *
   * Passed by `StoppageDialog`, which is recording an injury as it happens, and
   * deliberately **not** by `LogEditDialog`: a correction is made later and may well
   * be about a point several ago, whose line was a different seven from whoever is on
   * now. Narrowing there would hide the very player the volunteer is trying to name.
   */
  onField?: string[];
  onCancel: () => void;
  onSubmit: (attribution: { team?: TeamId; players?: StoppagePlayer[] }) => void;
}) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const rosters = rosterTeams(state.config);
  // The one followed team, when this game follows exactly one — null when it keeps
  // both rosters or neither, which are the other two branches below.
  const tracked = rosters.length === 1 ? rosters[0] : null;
  // Any number of players can be hurt in the same stoppage, from either team — e.g.
  // a collision between opponents — so this is a list, not a single pick. With one
  // roster it only ever holds that team's entries; the other side's involvement (if
  // any) is the checkbox below instead.
  const [selected, setSelected] = useState<StoppagePlayer[]>(
    tracked ? (initialPlayers ?? []).filter((p) => p.team === tracked) : (initialPlayers ?? []),
  );
  // The single-roster hybrid step only: the untracked team, named with no player.
  const [otherTeamInjured, setOtherTeamInjured] = useState(
    initialTeam !== undefined && initialTeam !== tracked,
  );

  // Toggling a chip adds/removes just that one player, so picks in one team's
  // section don't touch the other's.
  const toggle = (team: TeamId, playerId: string) => {
    setSelected((prev) =>
      prev.some((p) => p.team === team && p.playerId === playerId)
        ? prev.filter((p) => !(p.team === team && p.playerId === playerId))
        : [...prev, { team, playerId }],
    );
  };

  if (tracked) {
    const other: TeamId = tracked === 'A' ? 'B' : 'A';
    // Only somebody actually on the field can have been hurt in the play — when the
    // caller says who that is (see `onField` above).
    const eligible = playersOnField(
      state.config,
      tracked,
      state.config.players[tracked],
      onField ?? [],
    );
    const narrowed = eligible.length < state.config.players[tracked].length;
    return (
      <Modal title={t('injuryDialogTitle')} onClose={onCancel}>
        <p className="text-xs text-chalk/50">{t('injuryDialogHint')}</p>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-signal">
            {state.config.teams[tracked].name}
          </p>
          <PlayerMultiPicker
            players={eligible}
            selected={selected.map((p) => p.playerId)}
            onToggle={(playerId) => toggle(tracked, playerId)}
            onRemove={(id) => {
              dispatch({ type: 'REMOVE_PLAYER', team: tracked, id });
              if (selected.some((p) => p.playerId === id)) toggle(tracked, id);
            }}
          />
          {narrowed ? (
            <p className="text-xs text-chalk/50">{t('lineOnlyOnField')}</p>
          ) : (
            <PlayerRosterEditor
              label={t('addPlayer')}
              players={[]}
              onAdd={(number, name) =>
                dispatch({ type: 'ADD_PLAYER', team: tracked, number, name })
              }
            />
          )}
        </div>
        <CheckField
          label={t('injuryOtherTeamToggle', { team: state.config.teams[other].name })}
          checked={otherTeamInjured}
          onChange={setOtherTeamInjured}
        />
        <div className="grid grid-cols-2 gap-3">
          <button className={secondaryButton} onClick={onCancel}>
            {t('btnCancel')}
          </button>
          <button
            className={primaryButton}
            onClick={() =>
              onSubmit({
                team: otherTeamInjured ? other : undefined,
                players: selected.length ? selected : undefined,
              })
            }
          >
            {t('btnSave')}
          </button>
        </div>
      </Modal>
    );
  }

  if (rosters.length > 1) {
    return (
      <PlayerSelectDialog
        title={t('injuryDialogTitle')}
        hint={t('injuryDialogHint')}
        sections={rosters.map((id) => ({
          team: id,
          label: (
            <strong className="font-semibold text-signal">{state.config.teams[id].name}</strong>
          ),
          multi: true as const,
          selected: selected.filter((p) => p.team === id).map((p) => p.playerId),
          onToggle: (playerId: string) => toggle(id, playerId),
        }))}
        onCancel={onCancel}
        onSave={() => onSubmit({ players: selected.length ? selected : undefined })}
      />
    );
  }

  return (
    <Modal title={t('injuryTeamStoppageTitle')} onClose={onCancel} size="sm">
      <p className="text-xs text-chalk/50">{t('injuryTeamStoppageHint')}</p>
      <div className="grid grid-cols-2 gap-3">
        {(['A', 'B'] as TeamId[]).map((id) => (
          <button
            key={id}
            className={teamChoiceButton()}
            style={{
              backgroundColor: state.config.teams[id].color,
              color: contrastText(state.config.teams[id].color),
            }}
            onClick={() => onSubmit({ team: id })}
          >
            {state.config.teams[id].name}
          </button>
        ))}
      </div>
      <button className={`${secondaryButton} w-full`} onClick={() => onSubmit({})}>
        {t('btnNoTeam')}
      </button>
      <button className={`${secondaryButton} w-full`} onClick={onCancel}>
        {t('btnCancel')}
      </button>
    </Modal>
  );
}
