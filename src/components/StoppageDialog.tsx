import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import type { StoppageKind, TeamId } from '../state/types';
import { Modal } from './Modal';
import { PlayerSelectDialog } from './PlayerSelectDialog';
import { contrastText, secondaryButton } from './ui';

type Step = 'kind' | 'injuryPlayers' | 'technicalTeam';

/**
 * "Stoppage" groups the two things that halt play without a call to dispute: an
 * injury (optionally attributed to a player) and a technical stoppage — equipment,
 * outside interference and the like (optionally attributed to a team, but never a
 * player: nobody caused it). This dialog asks which kind first, then only shows
 * the attribution step that kind actually needs.
 */
export function StoppageDialog({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const [step, setStep] = useState<Step>('kind');
  // Exactly one player is injured, so a pick in one team's section clears the other's.
  const [selected, setSelected] = useState<{ team: TeamId; playerId: string } | null>(null);

  const chooseKind = (kind: StoppageKind) => {
    if (kind === 'technical') {
      setStep('technicalTeam');
      return;
    }
    // Only injury ever attributes a player, and only when rosters are in use —
    // otherwise there is nothing to pick, so it records straight away.
    if (state.config.trackPlayers) {
      setStep('injuryPlayers');
      return;
    }
    dispatch({ type: 'STOPPAGE', kind: 'injury' });
    onClose();
  };

  // Save with no player picked still records the injury — just with no one attached.
  const saveInjury = () => {
    dispatch({
      type: 'STOPPAGE',
      kind: 'injury',
      team: selected?.team,
      playerId: selected?.playerId,
    });
    onClose();
  };

  const chooseTechnicalTeam = (team?: TeamId) => {
    dispatch({ type: 'STOPPAGE', kind: 'technical', team });
    onClose();
  };

  if (step === 'injuryPlayers') {
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
        onSave={saveInjury}
      />
    );
  }

  if (step === 'technicalTeam') {
    return (
      <Modal title={t('technicalStoppageTitle')} onClose={onClose} size="sm">
        <p className="text-xs text-chalk/50">{t('technicalStoppageHint')}</p>
        <div className="grid grid-cols-2 gap-3">
          {(['A', 'B'] as TeamId[]).map((id) => (
            <button
              key={id}
              className="rounded-xl font-board font-bold py-6 active:scale-[0.99] truncate px-2"
              style={{
                backgroundColor: state.config.teams[id].color,
                color: contrastText(state.config.teams[id].color),
              }}
              onClick={() => chooseTechnicalTeam(id)}
            >
              {state.config.teams[id].name}
            </button>
          ))}
        </div>
        <button
          className={`${secondaryButton} w-full`}
          onClick={() => chooseTechnicalTeam(undefined)}
        >
          {t('btnNoTeam')}
        </button>
        <button className={`${secondaryButton} w-full`} onClick={onClose}>
          {t('btnCancel')}
        </button>
      </Modal>
    );
  }

  return (
    <Modal title={t('stoppageDialogTitle')} onClose={onClose} size="sm">
      <p className="text-xs text-chalk/50">{t('stoppageDialogHint')}</p>
      <div className="grid grid-cols-2 gap-3">
        <button className={secondaryButton} onClick={() => chooseKind('injury')}>
          {t('stoppageKind_injury')}
        </button>
        <button className={secondaryButton} onClick={() => chooseKind('technical')}>
          {t('stoppageKind_technical')}
        </button>
      </div>
      <button className={`${secondaryButton} w-full`} onClick={onClose}>
        {t('btnCancel')}
      </button>
    </Modal>
  );
}
