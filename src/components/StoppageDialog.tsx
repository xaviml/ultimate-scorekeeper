import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { canWaterBreak, statsTrackingEnabled } from '../state/gameReducer';
import { benchPlayers, lineTeam, replacementsFor } from '../state/lines';
import type { PlayerInfo, StoppageKind, TeamId } from '../state/types';
import { InjuryAttributionDialog } from './InjuryAttributionDialog';
import { InjurySubDialog } from './InjurySubDialog';
import { Modal } from './Modal';
import { contrastText, secondaryButton, teamChoiceButton } from './ui';

type Step = 'kind' | 'injury' | 'injurySub' | 'technicalTeam' | 'sotgTeam';

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
 * Injury's attribution step lives in InjuryAttributionDialog, which asks whichever
 * question this game's statsMode has an answer for — and is the same step the log
 * editor reopens to correct an injury already recorded.
 *
 * SOTG is the odd one of the three in that it stops the game clock immediately,
 * while an injury or technical stoppage leaves it running until the reducer's
 * two-minute rule auto-pauses it. They are grouped anyway because from the
 * volunteer's side the question is the same one, and the hint says which is which.
 *
 * A hot-weather water break hangs off the bottom of the same dialog, set apart by a
 * rule: it answers the same question the volunteer came here with, but it is a break
 * rather than a stoppage — see startWaterBreak below.
 *
 * All three stoppages are available for the whole game — between points, during a timeout or
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
  /** The injured players who were on the field, carried from the injury step into the sub step. */
  const [comingOff, setComingOff] = useState<PlayerInfo[]>([]);

  const chooseKind = (kind: StoppageKind) => {
    // Technical is gated the same way regardless of statsMode: only asked while
    // the game is tracking activity at all, otherwise it records straight away
    // with nothing attached.
    if (kind === 'technical') {
      if (statsTrackingEnabled(state.config)) {
        setStep('technicalTeam');
        return;
      }
      dispatch({ type: 'STOPPAGE', kind: 'technical' });
      onClose();
      return;
    }
    // Which attribution the injury step asks for depends on which roster(s)
    // actually exist — InjuryAttributionDialog owns that, and is the same step the
    // log editor reopens to correct one. With no tracking at all there is nothing
    // to ask, so the stoppage is recorded on the spot.
    if (statsTrackingEnabled(state.config)) {
      setStep('injury');
      return;
    }
    dispatch({ type: 'STOPPAGE', kind: 'injury' });
    onClose();
  };

  // SOTG is a stoppage the two teams call on themselves, so while tracking is off
  // there is no second step to show. While it's on, which team called it is the
  // one thing worth attributing — asked next rather than applied on the spot.
  const chooseSotg = () => {
    if (statsTrackingEnabled(state.config)) {
      setStep('sotgTeam');
      return;
    }
    dispatch({ type: 'SOTG_TOGGLE' });
    onClose();
  };

  // The fourth thing that halts play, and the odd one out: not a stoppage at all
  // but a break the officials add in hot weather, so it has no attribution step,
  // no resolution to answer and costs neither team a timeout. It shares this dialog
  // because the volunteer's question is the same one — play is stopping, why? — but
  // it sits apart from the three above, and it is the only one that is not available
  // at any moment: WFDF puts hydration breaks in the transitions, so it is offered
  // between points only (canWaterBreak) and greys out with the reason the rest of
  // the time rather than vanishing.
  const startWaterBreak = () => {
    dispatch({ type: 'WATER_BREAK_START' });
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

  if (step === 'injury') {
    return (
      <InjuryAttributionDialog
        // Recording one as it happens, so the picker narrows to whoever is out there
        // now — somebody already substituted off cannot be hurt in the play.
        onField={state.line}
        onCancel={onClose}
        onSubmit={({ team, players }) => {
          // The injury is recorded first, whatever happens to the line: skipping the
          // substitution must not also lose the stoppage.
          dispatch({ type: 'STOPPAGE', kind: 'injury', team, players });
          // An injury is the one stoppage that routinely changes the line mid-point,
          // and the app only knows who came on if it asks. Only worth asking when
          // somebody named was actually on the field — and only for the line team,
          // which is the only roster a line exists for.
          const tracked = lineTeam(state.config);
          const off = (players ?? [])
            .filter((p) => p.team === tracked && state.line.includes(p.playerId))
            .map((p) => state.config.players[p.team].find((x) => x.id === p.playerId))
            .filter((p): p is PlayerInfo => p !== undefined);
          if (off.length > 0) {
            setComingOff(off);
            setStep('injurySub');
            return;
          }
          onClose();
        }}
      />
    );
  }

  if (step === 'injurySub') {
    const offIds = comingOff.map((p) => p.id);
    return (
      <InjurySubDialog
        going={comingOff}
        bench={replacementsFor(
          state.config,
          state.config.players[lineTeam(state.config)!],
          state.line,
          comingOff,
        )}
        // Distinguishes "the whole roster is already on" from "nobody with a matching
        // marking is left", which are different things to tell the volunteer.
        benchEmpty={
          benchPlayers(state.config.players[lineTeam(state.config)!], state.line).length === 0
        }
        onSkip={onClose}
        onConfirm={(ids) => {
          dispatch({
            type: 'SET_LINE',
            playerIds: [...state.line.filter((id) => !offIds.includes(id)), ...ids],
            // The name survives a forced substitution: D1 still played this point,
            // one injury notwithstanding. That is the opposite of LineDialog, where a
            // hand-edited selection is a deliberately different line.
            lineName: state.lineName,
          });
          onClose();
        }}
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
              className={teamChoiceButton()}
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
              className={teamChoiceButton()}
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

  // Refused for a reason the volunteer is told, in the same words the action row
  // uses for every other refusal, rather than the button quietly disappearing.
  const waterBreak = canWaterBreak(state);

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
      <div className="border-t border-line pt-3 space-y-2">
        <button
          className={`${secondaryButton} w-full`}
          disabled={!waterBreak.ok}
          onClick={startWaterBreak}
        >
          {t('btnWaterBreak')}
        </button>
        <p className="text-xs text-chalk/50">
          {waterBreak.ok ? t('waterBreakHint') : t(`assist_blocked_${waterBreak.reason}` as never)}
        </p>
      </div>
      <button className={`${secondaryButton} w-full`} onClick={onClose}>
        {t('btnCancel')}
      </button>
    </Modal>
  );
}
