import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import type { StoppageKind, TeamId } from '../state/types';
import { Modal } from './Modal';
import { PlayerSelectDialog } from './PlayerSelectDialog';
import { contrastText, secondaryButton } from './ui';

type Step = 'kind' | 'injuryPlayers' | 'technicalTeam' | 'sotgTeam';

/**
 * The three answers to "play is halting, why?": an injury (optionally attributed
 * to any number of players, even across both teams — a collision can hurt two
 * opponents at once), a technical stoppage — equipment, outside interference and
 * the like (optionally attributed to a team, but never a player: nobody caused it) —
 * and an SOTG stoppage. This dialog asks which kind first, then only shows the
 * attribution step that kind actually needs; SOTG dispatches on the spot unless
 * activity tracking is on, in which case it asks which team called it — and unlike
 * every other attribution step, there is no "no team" skip: cancelling that step
 * cancels the SOTG stoppage entirely rather than applying it untracked.
 *
 * SOTG is the odd one of the three in that it stops the game clock immediately,
 * while an injury or technical stoppage leaves it running until the reducer's
 * two-minute rule auto-pauses it. They are grouped anyway because from the
 * volunteer's side the question is the same one, and the hint says which is which.
 *
 * All three are available for the whole game — between points, during a timeout or
 * half-time, and over an open call — because on the field play has already stopped
 * by the time this dialog is open. Whatever was running (the pull clock, the
 * timeout, the break, the call's discussion timer) freezes and resumes from where
 * it was; the reducer's canStoppage is the guard, and the action row refuses to
 * open this at all while another stoppage is still unresolved.
 */
export function StoppageDialog({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const [step, setStep] = useState<Step>('kind');
  // Any number of players can be hurt in the same stoppage, from either team —
  // e.g. a collision between opponents — so this is a list, not a single pick.
  const [selected, setSelected] = useState<{ team: TeamId; playerId: string }[]>([]);

  const chooseKind = (kind: StoppageKind) => {
    // Both attribution steps are gated the same way: only asked while the game is
    // tracking activity, otherwise each records straight away with nothing attached.
    if (kind === 'technical') {
      if (state.config.trackPlayers) {
        setStep('technicalTeam');
        return;
      }
      dispatch({ type: 'STOPPAGE', kind: 'technical' });
      onClose();
      return;
    }
    if (state.config.trackPlayers) {
      setStep('injuryPlayers');
      return;
    }
    dispatch({ type: 'STOPPAGE', kind: 'injury' });
    onClose();
  };

  // Toggling a chip adds/removes just that one player, so picks in one team's
  // section don't touch the other's.
  const toggleInjured = (team: TeamId, playerId: string) => {
    setSelected((prev) =>
      prev.some((p) => p.team === team && p.playerId === playerId)
        ? prev.filter((p) => !(p.team === team && p.playerId === playerId))
        : [...prev, { team, playerId }],
    );
  };

  // Save with no player picked still records the injury — just with no one attached.
  const saveInjury = () => {
    dispatch({
      type: 'STOPPAGE',
      kind: 'injury',
      players: selected.length ? selected : undefined,
    });
    onClose();
  };

  // SOTG is a stoppage the two teams call on themselves, so while tracking is off
  // there is no second step to show. While it's on, which team called it is the
  // one thing worth attributing — asked next rather than applied on the spot.
  const chooseSotg = () => {
    if (state.config.trackPlayers) {
      setStep('sotgTeam');
      return;
    }
    dispatch({ type: 'SOTG_TOGGLE' });
    onClose();
  };

  const chooseTechnicalTeam = (team?: TeamId) => {
    dispatch({ type: 'STOPPAGE', kind: 'technical', team });
    onClose();
  };

  // Unlike the technical step, there's no "no team" button here: cancelling this
  // step cancels the SOTG stoppage — see the doc comment above.
  const chooseSotgTeam = (team: TeamId) => {
    dispatch({ type: 'SOTG_TOGGLE', team });
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
          multi: true as const,
          selected: selected.filter((p) => p.team === id).map((p) => p.playerId),
          onToggle: (playerId: string) => toggleInjured(id, playerId),
        }))}
        onCancel={onClose}
        onSave={saveInjury}
      />
    );
  }

  if (step === 'sotgTeam') {
    return (
      <Modal title={t('sotgStoppageTitle')} onClose={onClose} size="sm">
        <p className="text-xs text-chalk/50">{t('sotgStoppageHint')}</p>
        <div className="grid grid-cols-2 gap-3">
          {(['A', 'B'] as TeamId[]).map((id) => (
            <button
              key={id}
              className="rounded-xl font-board font-bold py-6 active:scale-[0.99] truncate px-2"
              style={{
                backgroundColor: state.config.teams[id].color,
                color: contrastText(state.config.teams[id].color),
              }}
              onClick={() => chooseSotgTeam(id)}
            >
              {state.config.teams[id].name}
            </button>
          ))}
        </div>
        <button className={`${secondaryButton} w-full`} onClick={onClose}>
          {t('btnCancel')}
        </button>
      </Modal>
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
      <div className="grid grid-cols-3 gap-3">
        <button className={secondaryButton} onClick={() => chooseKind('injury')}>
          {t('stoppageKind_injury')}
        </button>
        <button className={secondaryButton} onClick={() => chooseKind('technical')}>
          {t('stoppageKind_technical')}
        </button>
        <button className={secondaryButton} onClick={chooseSotg}>
          {t('btnSotg')}
        </button>
      </div>
      <button className={`${secondaryButton} w-full`} onClick={onClose}>
        {t('btnCancel')}
      </button>
    </Modal>
  );
}
