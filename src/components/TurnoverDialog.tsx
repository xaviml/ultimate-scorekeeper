import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import type { TeamId } from '../state/types';
import { PlayerSelectDialog } from './PlayerSelectDialog';

/**
 * Asks who was involved in a turnover: an attacker who lost the disc (drop, bad
 * pass, stall) and a defender who forced it (block, good mark). The two are
 * independent — a clean D and an unforced drop are both single-sided answers.
 */
export function TurnoverDialog({ attacking, onClose }: { attacking: TeamId; onClose: () => void }) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const defending: TeamId = attacking === 'A' ? 'B' : 'A';
  const [turnoverId, setTurnoverId] = useState<string | null>(null);
  const [defenseId, setDefenseId] = useState<string | null>(null);

  // Save with no one picked still records the turnover — just with no one attached.
  const save = () => {
    dispatch({
      type: 'TURNOVER',
      turnoverId: turnoverId ?? undefined,
      defenseId: defenseId ?? undefined,
    });
    onClose();
  };

  return (
    <PlayerSelectDialog
      title={t('turnoverDialogTitle')}
      hint={t('turnoverDialogHint')}
      sections={[
        {
          team: attacking,
          label: t('whoTurnedOver', { team: state.config.teams[attacking].name }),
          selected: turnoverId,
          onSelect: setTurnoverId,
        },
        {
          team: defending,
          label: t('whoDefended', { team: state.config.teams[defending].name }),
          selected: defenseId,
          onSelect: setDefenseId,
        },
      ]}
      onCancel={onClose}
      onSave={save}
    />
  );
}
