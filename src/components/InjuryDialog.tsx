import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import type { TeamId } from '../state/types';
import { PlayerSelectDialog } from './PlayerSelectDialog';

export function InjuryDialog({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  // Exactly one player is injured, so a pick in one team's section clears the other's.
  const [selected, setSelected] = useState<{ team: TeamId; playerId: string } | null>(null);

  // Save with no player picked still records the injury — just with no one attached.
  const save = () => {
    dispatch({ type: 'INJURY', team: selected?.team, playerId: selected?.playerId });
    onClose();
  };

  return (
    <PlayerSelectDialog
      title={t('injuryDialogTitle')}
      hint={t('injuryDialogHint')}
      sections={(['A', 'B'] as TeamId[]).map((id) => ({
        team: id,
        label: state.config.teams[id].name,
        selected: selected?.team === id ? selected.playerId : null,
        onSelect: (playerId) => setSelected(playerId ? { team: id, playerId } : null),
      }))}
      onCancel={onClose}
      onSave={save}
    />
  );
}
