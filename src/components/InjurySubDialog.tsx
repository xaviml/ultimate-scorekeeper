import { useState } from 'react';
import { useT } from '../i18n/useT';
import { benchPlayers, lineComposition, replacementsFor, subIssues } from '../state/lines';
import { playerLabel } from '../state/stats';
import type { GameConfig, PlayerInfo } from '../state/types';
import { Modal } from './Modal';
import { PlayerMultiPicker } from './PlayerPicker';
import { primaryButton, secondaryButton } from './ui';

/**
 * The line change an injury buys, both halves of it.
 *
 * An injury is the one stoppage that routinely changes the line mid-point, which is
 * the case `LinePlayer.sub`/`off` exist for — but the app only knows it if it asks,
 * and this is the moment the volunteer has the answer in front of them. Skipping is a
 * real answer (a player who walks it off), so the injury is dispatched before this
 * opens and only the line is left alone.
 *
 * **Our own injured come off; an opponent's injury lets us change someone of our
 * choosing.** WFDF gives the other team a substitution when a player is hurt, so the
 * dialog opens for an injury on either side — with nobody of ours hurt, `going` is
 * empty and the whole question is which of our seven goes off and who comes on for
 * them. `allowance` is how many such free changes the injury permits (one; the
 * "other team was injured too" checkbox carries no count).
 *
 * The check warns and never refuses, exactly as `LineDialog`'s does: an off-spec swap
 * takes a second, confirming tap. What it cannot catch is already narrowed away —
 * `replacementsFor` offers only markings that could legally replace whoever is coming
 * off — and the two work together, since a mixed set going off admits both markings
 * and an unmarked player is always offered.
 *
 * With nobody eligible at all the question is **stated and closed** rather than
 * dropped, and which of the two reasons it is matters: "everyone is already on" and
 * "nobody with that marking is left" are different facts about the squad.
 */
export function InjurySubDialog({
  config,
  players,
  onField,
  going,
  allowance,
  onSkip,
  onConfirm,
}: {
  config: GameConfig;
  /** The line team's roster. */
  players: PlayerInfo[];
  /** Who is on the field right now. */
  onField: string[];
  /** The injured players of ours who were on the field, and are therefore coming off. */
  going: PlayerInfo[];
  /** Free changes the injury permits beyond `going` — one when the other team was hurt. */
  allowance: number;
  onSkip: () => void;
  onConfirm: (off: string[], on: string[]) => void;
}) {
  const { t } = useT();
  const forced = going.map((p) => p.id);
  const [extraOff, setExtraOff] = useState<string[]>([]);
  const [coming, setComing] = useState<string[]>([]);
  const [armed, setArmed] = useState(false);

  const off = [...forced, ...extraOff];
  const offPlayers = off
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is PlayerInfo => p !== undefined);

  // Recomputed as the volunteer picks, not passed in: who may come on depends on the
  // markings of whoever is going off, which is a live choice whenever `allowance` is
  // what opened this dialog.
  const bench = replacementsFor(config, players, onField, offPlayers);
  const noneOffField = benchPlayers(players, onField).length === 0;
  // Nobody to bring on at all, whichever way the swap is picked — the question has no
  // answer, so it is closed rather than left open over an empty picker.
  const none = bench.length === 0 && replacementsFor(config, players, onField, going).length === 0;

  const issues = subIssues(config, players, off, coming, forced.length + allowance);
  const offSplit = lineComposition(players, off);
  const onSplit = lineComposition(players, coming);
  const names = going.map(playerLabel).join(', ');
  // With a free change to spend, who goes off is a question too — a heading that
  // only asks the second half would be hiding the first.
  const title = t(allowance > 0 ? 'injurySubChangeTitle' : 'injurySubTitle');

  const toggle = (list: string[], set: (v: string[]) => void) => (id: string) => {
    setArmed(false);
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const save = () => {
    if (issues.length > 0 && !armed) {
      setArmed(true);
      return;
    }
    onConfirm(off, coming);
  };

  if (none) {
    return (
      <Modal title={title} onClose={onSkip} size="sm">
        <p className="text-xs text-chalk/50">
          {going.length > 0 ? t('injurySubStaysOn', { players: names }) : t('injurySubNoChange')}
        </p>
        <p className="text-sm text-chalk/50">
          {noneOffField ? t('injurySubNoBench') : t('injurySubNoMatch')}
        </p>
        <button className={`${primaryButton} w-full`} onClick={onSkip}>
          {t('btnOk')}
        </button>
      </Modal>
    );
  }

  return (
    <Modal title={title} onClose={onSkip}>
      <p className="text-xs text-chalk/50">
        {going.length > 0
          ? t('injurySubHint', { players: names })
          : t('injurySubOtherHint', { count: allowance })}
      </p>

      {/* Only when the injury buys a free change: with our own player hurt, who is
          coming off was answered by naming them. */}
      {allowance > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-chalk/60">{t('injurySubOffLabel')}</p>
          <PlayerMultiPicker
            players={players.filter((p) => onField.includes(p.id) && !forced.includes(p.id))}
            selected={extraOff}
            showGender
            onToggle={toggle(extraOff, setExtraOff)}
          />
        </div>
      )}

      <div
        // Read by the tests rather than the wording, the same way the line dialog's
        // composition exposes data-line-issues.
        data-sub-issues={issues.join(' ')}
        className={`rounded-lg border px-3 py-2 ${
          issues.length > 0 ? 'border-signal bg-signal/10' : 'border-line bg-pitch'
        }`}
      >
        <p className="font-board text-sm">
          {t('injurySubCount', { off: off.length, on: coming.length })}
          {config.division === 'mixed' && (
            <span className="text-xs text-chalk/60">
              {' '}
              {t('injurySubSplit', {
                offFmp: offSplit.female,
                offMmp: offSplit.male,
                onFmp: onSplit.female,
                onMmp: onSplit.male,
              })}
            </span>
          )}
        </p>
        {issues.length > 0 && (
          <p className="pt-1 text-xs leading-snug text-signal">
            {issues.includes('count') && t('injurySubIssueCount')}
            {issues.includes('allowance') &&
              ` ${t('injurySubIssueAllowance', { count: forced.length + allowance })}`}
            {issues.includes('ratio') && ` ${t('injurySubIssueRatio')}`}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-chalk/60">{t('injurySubOnLabel')}</p>
        <PlayerMultiPicker
          players={bench}
          selected={coming}
          showGender
          onToggle={toggle(coming, setComing)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Not "Cancel": the injury has already been recorded, and this only decides
            whether the line changes with it. */}
        <button className={secondaryButton} onClick={onSkip}>
          {t('injurySubSkip')}
        </button>
        <button
          className={armed ? `${primaryButton} animate-pulse` : primaryButton}
          data-sub-save={armed ? 'armed' : issues.length > 0 ? 'warned' : 'ready'}
          disabled={off.length === 0 && coming.length === 0}
          onClick={save}
        >
          {issues.length === 0
            ? t('btnSave')
            : armed
              ? t('btnLineConfirmAnyway')
              : t('btnLineSaveAnyway')}
        </button>
      </div>
    </Modal>
  );
}
