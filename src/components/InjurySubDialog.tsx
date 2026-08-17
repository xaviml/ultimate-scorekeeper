import { useState } from 'react';
import { useT } from '../i18n/useT';
import { playerLabel } from '../state/stats';
import type { PlayerInfo } from '../state/types';
import { Modal } from './Modal';
import { PlayerMultiPicker } from './PlayerPicker';
import { primaryButton, secondaryButton } from './ui';

/**
 * Who is coming on for the injured player.
 *
 * An injury is the one stoppage that routinely changes the line mid-point, which is
 * the case `LinePlayer.sub`/`off` exist for — but the app only knows it if it asks,
 * and this is the moment the volunteer has the answer in front of them. Asked right
 * after the injury is recorded, and only for a player who was actually on the field.
 *
 * The picker offers only players who could legally come on — the bench, and in mixed
 * only the matching markings, since an MMP cannot be swapped for an FMP (see
 * `replacementsFor`). Skipping is a real answer: a player who walks it off and stays
 * on, or a stoppage where the sub is not clear yet, so the injury is logged either way
 * and only the line is left alone.
 *
 * With nobody eligible the question is **stated and closed** rather than dropped — the
 * volunteer is told why there is no substitution to make, and the injured player plays
 * on. Which of the two reasons it is matters: "everyone is already on" and "nobody with
 * that marking is left" are different facts about the squad.
 */
export function InjurySubDialog({
  going,
  bench,
  benchEmpty,
  onSkip,
  onConfirm,
}: {
  /** The injured players who were on the field, and are therefore coming off. */
  going: PlayerInfo[];
  /** Who may legally replace them — already narrowed (see `replacementsFor`). */
  bench: PlayerInfo[];
  /** True when nobody is off the field at all, as opposed to nobody eligible. */
  benchEmpty: boolean;
  onSkip: () => void;
  onConfirm: (playerIds: string[]) => void;
}) {
  const { t } = useT();
  const [selected, setSelected] = useState<string[]>([]);
  const none = bench.length === 0;
  const players = going.map(playerLabel).join(', ');

  return (
    <Modal title={t('injurySubTitle')} onClose={onSkip} size={none ? 'sm' : 'lg'}>
      <p className="text-xs text-chalk/50">
        {t(none ? 'injurySubStaysOn' : 'injurySubHint', { players })}
      </p>
      {none ? (
        <p className="text-sm text-chalk/50">
          {t(benchEmpty ? 'injurySubNoBench' : 'injurySubNoMatch')}
        </p>
      ) : (
        <PlayerMultiPicker
          players={bench}
          selected={selected}
          showGender
          onToggle={(id) =>
            setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
          }
        />
      )}
      {none ? (
        <button className={`${primaryButton} w-full`} onClick={onSkip}>
          {t('btnOk')}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Not "Cancel": the injury has already been recorded, and this only decides
              whether the line changes with it. */}
          <button className={secondaryButton} onClick={onSkip}>
            {t('injurySubSkip')}
          </button>
          <button
            className={primaryButton}
            disabled={selected.length === 0}
            onClick={() => onConfirm(selected)}
          >
            {t('btnSave')}
          </button>
        </div>
      )}
    </Modal>
  );
}
