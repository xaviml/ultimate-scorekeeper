import { useState } from 'react';
import { useT, type TFunc } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { playerTrackingFor } from '../state/gameReducer';
import { playersOnField } from '../state/lines';
import type { TeamId } from '../state/types';
import { PlayerSelectDialog, type PlayerSelectSection } from './PlayerSelectDialog';

/**
 * `whoTurnedOver`/`whoDefended` always open with the {team} placeholder (true in
 * every dictionary), so the translated team name sits verbatim at the front of the
 * string — sliced off here to render bold rather than the whole sentence.
 */
function teamLedLabel(t: TFunc, key: 'whoTurnedOver' | 'whoDefended', team: string) {
  const full = t(key, { team });
  return (
    <>
      <strong className="font-semibold text-signal">{team}</strong>
      {full.slice(team.length)}
    </>
  );
}

/**
 * Asks who was involved in a turnover: an attacker who lost the disc (drop, bad
 * pass, stall) and a defender who forced it (block, good mark). The two are
 * independent — a clean D and an unforced drop are both single-sided answers.
 *
 * In Team stats mode only one of the two is ever relevant — whichever role the
 * tracked team is playing this point — so only that section renders; the other
 * team's role stays at Game-stats detail (no player question at all). This dialog
 * never opens in Game stats mode in the first place (see GameScreen.tryTurnover),
 * so both sections showing is Player stats only.
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

  // Only whoever is on the field right now can lose the disc or force a turnover, so
  // this is `line` and not `pointLine`: a player a substitution has already taken off
  // is out of the point and out of the picker.
  const onField = state.line;
  const eligible = (team: TeamId) =>
    playersOnField(state.config, team, state.config.players[team], onField);

  const sections: PlayerSelectSection[] = [
    ...(playerTrackingFor(state.config, attacking)
      ? [
          {
            team: attacking,
            label: teamLedLabel(t, 'whoTurnedOver', state.config.teams[attacking].name),
            players: eligible(attacking),
            selected: turnoverId,
            onSelect: setTurnoverId,
          } as const,
        ]
      : []),
    ...(playerTrackingFor(state.config, defending)
      ? [
          {
            team: defending,
            label: teamLedLabel(t, 'whoDefended', state.config.teams[defending].name),
            players: eligible(defending),
            selected: defenseId,
            onSelect: setDefenseId,
          } as const,
        ]
      : []),
  ];

  return (
    <PlayerSelectDialog
      title={t('turnoverDialogTitle')}
      hint={t('turnoverDialogHint')}
      sections={sections}
      onCancel={onClose}
      onSave={save}
    />
  );
}
