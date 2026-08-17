import { useState } from 'react';
import { useT } from '../i18n/useT';
import {
  expectedSplit,
  lineComposition,
  lineIssues,
  resolveSavedLine,
  savedLineFrom,
} from '../state/lines';
import { uid } from '../state/uid';
import type { GameConfig, PlayerInfo, SavedLine } from '../state/types';
import { LineComposition } from './LineComposition';
import { Modal } from './Modal';
import { PlayerMultiPicker } from './PlayerPicker';
import { inputClass, fieldLabel, primaryButton, secondaryButton } from './ui';

/**
 * Name a line and pick who is in it, before the game.
 *
 * Deliberately not `LineDialog`: that one is about a point being played — it reads
 * the live line, dispatches into the reducer and has two modes. This is a plain
 * editor over a `SavedLine` and a roster, with no game to speak of, which is why it
 * takes everything as props and reaches for no context.
 *
 * The composition is checked against **no ratio**, on purpose. A predefined line is
 * not tied to a point, so there is no ratio it must match — `expectedSplit` yields
 * nothing for `gameRatio` with a null ratio, and the counters fall back to the size.
 * A *fixed* split is point-independent, so that one is still checked and warned about.
 */
export function SavedLineDialog({
  config,
  players,
  line,
  existing,
  onSave,
  onCancel,
}: {
  config: GameConfig;
  players: PlayerInfo[];
  /** The line being edited, or null to create one. */
  line: SavedLine | null;
  /** Every line already named, so a name can't be used twice. */
  existing: SavedLine[];
  onSave: (line: SavedLine) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [name, setName] = useState(line?.name ?? '');
  const [selected, setSelected] = useState<string[]>(() =>
    line ? resolveSavedLine(line, players) : [],
  );

  const trimmed = name.trim();
  const duplicate = existing.some(
    (l) => l.id !== line?.id && l.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  const composition = lineComposition(players, selected);
  const expected = expectedSplit(config, null);
  const issues = lineIssues(config, null, players, selected);

  const save = () => {
    if (!trimmed || duplicate) return;
    onSave(savedLineFrom(line?.id ?? uid(), trimmed, selected, players));
  };

  return (
    <Modal title={t(line ? 'lineEditTitle' : 'lineAddTitle')} onClose={onCancel}>
      <div>
        <label className={fieldLabel} htmlFor="saved-line-name">
          {t('lineSaveNamePrompt')}
        </label>
        <input
          id="saved-line-name"
          className={inputClass}
          maxLength={20}
          autoFocus
          placeholder={t('lineSaveNamePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        {duplicate && <p className="pt-1 text-xs text-signal">{t('lineNameTaken')}</p>}
      </div>

      <LineComposition
        size={config.lineSize}
        composition={composition}
        expected={expected}
        issues={issues}
      />

      {players.length === 0 ? (
        <p className="text-sm text-chalk/50">{t('lineNoRoster')}</p>
      ) : (
        <PlayerMultiPicker
          players={players}
          selected={selected}
          showGender={config.lines.genderCheck !== 'none'}
          onToggle={(id) =>
            setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
          }
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <button className={secondaryButton} onClick={onCancel}>
          {t('btnCancel')}
        </button>
        {/* A line with no name could never be picked again, so that one is a real
            block — unlike the composition, which only ever warns. */}
        <button className={primaryButton} disabled={!trimmed || duplicate} onClick={save}>
          {t('btnSave')}
        </button>
      </div>
    </Modal>
  );
}
