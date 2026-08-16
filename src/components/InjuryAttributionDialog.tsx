import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import type { StoppagePlayer, TeamId } from '../state/types';
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
 * Which picker appears depends on `statsMode`, because it decides which rosters
 * exist at all:
 *
 * - `game` — no roster on either side, so the only question is which team, and
 *   picking one submits on the spot (there is nothing else to answer). "No team"
 *   is a real answer here, not a cancel.
 * - `team` — the usual named-player picker for `trackedTeam`, plus one checkbox
 *   naming the other team with no player, since that side never gets a player
 *   question.
 * - `player` — one picker per roster: a collision can hurt opponents at once, so
 *   any number of players from either team can be named.
 */
export function InjuryAttributionDialog({
  initialTeam,
  initialPlayers,
  onCancel,
  onSubmit,
}: {
  /** The generic, no-player team attribution (see PendingStoppage.team). */
  initialTeam?: TeamId;
  initialPlayers?: StoppagePlayer[];
  onCancel: () => void;
  onSubmit: (attribution: { team?: TeamId; players?: StoppagePlayer[] }) => void;
}) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const tracked = state.config.trackedTeam;
  // Any number of players can be hurt in the same stoppage, from either team — e.g.
  // a collision between opponents — so this is a list, not a single pick. In `team`
  // mode it only ever holds `trackedTeam` entries; the other side's involvement (if
  // any) is the checkbox below instead.
  const [selected, setSelected] = useState<StoppagePlayer[]>(
    state.config.statsMode === 'team' && tracked
      ? (initialPlayers ?? []).filter((p) => p.team === tracked)
      : (initialPlayers ?? []),
  );
  // `team` mode's hybrid step only: the untracked team, named with no player.
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

  if (state.config.statsMode === 'team' && tracked) {
    const other: TeamId = tracked === 'A' ? 'B' : 'A';
    return (
      <Modal title={t('injuryDialogTitle')} onClose={onCancel}>
        <p className="text-xs text-chalk/50">{t('injuryDialogHint')}</p>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-signal">
            {state.config.teams[tracked].name}
          </p>
          <PlayerMultiPicker
            players={state.config.players[tracked]}
            selected={selected.map((p) => p.playerId)}
            onToggle={(playerId) => toggle(tracked, playerId)}
            onRemove={(id) => {
              dispatch({ type: 'REMOVE_PLAYER', team: tracked, id });
              if (selected.some((p) => p.playerId === id)) toggle(tracked, id);
            }}
          />
          <PlayerRosterEditor
            label={t('addPlayer')}
            players={[]}
            onAdd={(number, name) => dispatch({ type: 'ADD_PLAYER', team: tracked, number, name })}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={otherTeamInjured}
            onChange={(e) => setOtherTeamInjured(e.target.checked)}
          />
          <span className="text-sm">
            {t('injuryOtherTeamToggle', { team: state.config.teams[other].name })}
          </span>
        </label>
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

  if (state.config.statsMode === 'player') {
    return (
      <PlayerSelectDialog
        title={t('injuryDialogTitle')}
        hint={t('injuryDialogHint')}
        sections={(['A', 'B'] as TeamId[]).map((id) => ({
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
