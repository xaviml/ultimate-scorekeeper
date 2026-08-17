import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame } from '../state/gameHooks';
import { copyText } from '../state/clipboard';
import { logTextLines } from '../state/stats';
import { GameLogTable } from './GameLogTable';
import { Modal } from './Modal';

/**
 * Everything the game recorded, opened from the report's history panel — which
 * itself shows the game's shape rather than its every event (see
 * `reportLogEntries`). This is where the turnovers and the calls the report
 * leaves out are still readable, in the same table the in-game log dialog uses.
 *
 * Read-only, unlike that dialog: editing the log is fixing a mis-tap in a game
 * still being played, and this door is reached from the report.
 *
 * Its own copy button carries the log and nothing else — the stats tables are
 * what the report's copy button is for, and the two are wanted at different
 * moments (one for the team chat, this one for whoever is reconstructing an
 * incident). Just enough of a header goes with it to say which game it is.
 */
export function FullLogDialog({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const { t } = useT();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const buildText = () => {
    const name = (id: 'A' | 'B') => state.config.teams[id].name;
    return [
      `${t('appTitle')} — ${t('field', { n: state.config.fieldNumber })}`,
      `${name('A')} ${state.scores.A} — ${state.scores.B} ${name('B')}`,
      '',
      t('fullLogTitle'),
      ...logTextLines(state, state.log, t),
    ].join('\n');
  };

  const copy = async () => {
    const ok = await copyText(buildText());
    setCopyState(ok ? 'copied' : 'failed');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  return (
    <Modal
      title={t('fullLogTitle')}
      onClose={onClose}
      showClose
      headerAction={
        <button
          className="rounded-lg bg-pitch border border-line px-2 py-1.5 text-[11px] font-board uppercase tracking-wide text-chalk active:scale-95"
          onClick={copy}
        >
          {copyState === 'copied'
            ? t('copied')
            : copyState === 'failed'
              ? t('copyFailed')
              : t('copyLog')}
        </button>
      }
    >
      <GameLogTable />
    </Modal>
  );
}
