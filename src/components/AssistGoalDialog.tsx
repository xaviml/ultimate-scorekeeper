import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { onFieldIds, playersOnField } from '../state/lines';
import type { TeamId } from '../state/types';
import { CallahanToggle } from './CallahanToggle';
import { Modal } from './Modal';
import { PlayerPicker } from './PlayerPicker';
import { PlayerRosterEditor } from './PlayerRosterEditor';
import { primaryButton } from './ui';

export function AssistGoalDialog({
  team,
  onCancel,
  onSave,
}: {
  team: TeamId;
  onCancel: () => void;
  onSave: () => void;
}) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const [scorerId, setScorerId] = useState<string | null>(null);
  const [assistId, setAssistId] = useState<string | null>(null);
  const [callahan, setCallahan] = useState(false);

  /**
   * With a line registered, only the seven who played the point can have scored it.
   *
   * Read off the point that has just finished, **not** `state.line`: GOAL appends the
   * PointRecord and immediately moves the live line on to the next point, so by the
   * time this dialog opens `state.line` is the wrong seven entirely. Anyone a
   * substitution took off is left out too — an injured player who was replaced cannot
   * have gone on to score. Falls back to the full roster when no line was registered
   * (see `playersOnField`).
   */
  const lastPoint = state.points[state.points.length - 1];
  const players = playersOnField(
    state.config,
    team,
    state.config.players[team],
    onFieldIds(lastPoint?.line),
  );

  const narrowed = players.length < state.config.players[team].length;

  const save = () => {
    dispatch({ type: 'SET_GOAL_PLAYERS', team, scorerId, assistId, callahan });
    onSave();
  };

  const removePlayer = (id: string) => {
    dispatch({ type: 'REMOVE_PLAYER', team, id });
    if (scorerId === id) setScorerId(null);
    if (assistId === id) setAssistId(null);
  };

  return (
    <Modal
      title={t('assistDialogTitle', { team: state.config.teams[team].name })}
      onClose={onCancel}
    >
      {players.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-signal">
            {t('whoScored')}
          </p>
          <PlayerPicker
            players={players.filter((p) => p.id !== assistId)}
            selected={scorerId}
            onSelect={setScorerId}
            onRemove={removePlayer}
          />
        </div>
      )}

      {players.length > 0 && !callahan && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-signal">
            {t('whoAssisted')}
          </p>
          <PlayerPicker
            players={players.filter((p) => p.id !== scorerId)}
            selected={assistId}
            onSelect={setAssistId}
            onRemove={removePlayer}
          />
        </div>
      )}

      <CallahanToggle
        checked={callahan}
        onChange={(on) => {
          setCallahan(on);
          if (on) setAssistId(null);
        }}
      />

      {/* Someone added here is not on the point's recorded line, so the pickers above
          would not offer them — which reads as the name being swallowed. The line is
          the thing to fix in that case, from the Roster button. */}
      {narrowed ? (
        <p className="text-xs text-chalk/50">{t('lineOnlyOnFieldGoal')}</p>
      ) : (
        <PlayerRosterEditor
          label={t('addPlayer')}
          players={[]}
          onAdd={(number, name) => dispatch({ type: 'ADD_PLAYER', team, number, name })}
        />
      )}

      <button className={`w-full ${primaryButton}`} onClick={save}>
        {t('btnSave')}
      </button>
    </Modal>
  );
}
