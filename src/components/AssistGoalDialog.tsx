import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
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

  const players = state.config.players[team];

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
          <p className="text-xs uppercase tracking-wide text-chalk/60">{t('whoScored')}</p>
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
          <p className="text-xs uppercase tracking-wide text-chalk/60">{t('whoAssisted')}</p>
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

      <PlayerRosterEditor
        label={t('addPlayer')}
        players={[]}
        onAdd={(number, name) => dispatch({ type: 'ADD_PLAYER', team, number, name })}
      />

      <button className={`w-full ${primaryButton}`} onClick={save}>
        {t('btnSave')}
      </button>
    </Modal>
  );
}
