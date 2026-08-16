import type { ReactNode } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import type { TeamId } from '../state/types';
import { Modal } from './Modal';
import { PlayerMultiPicker, PlayerPicker } from './PlayerPicker';
import { PlayerRosterEditor } from './PlayerRosterEditor';
import { primaryButton, secondaryButton } from './ui';

/**
 * One team's picker within the dialog. Single-select (the default) answers
 * one role — "who scored?", "who turned it over?" — so picking a player in
 * one section doesn't touch another. `multi: true` switches that section to
 * any-number-of-players, for events more than one person can be attributed to
 * (an injury can involve several players, even from both teams).
 */
export type PlayerSelectSection =
  | {
      team: TeamId;
      /** Heading above the picker — a team name, or a role like "Who turned it over?". */
      label: ReactNode;
      multi?: false;
      selected: string | null;
      onSelect: (playerId: string | null) => void;
      /**
       * A player to leave out of this section's chips — for two sections asking
       * about the same roster, so the answer to one can't also be the answer to
       * the other (nobody assists their own goal).
       */
      exclude?: string | null;
    }
  | {
      team: TeamId;
      label: ReactNode;
      multi: true;
      selected: string[];
      onToggle: (playerId: string) => void;
    };

/**
 * The single "which player was involved?" prompt, shared by every event that can be
 * attributed to someone (injury, turnover, ...). Each section picks from one team's
 * roster and can add to it inline, because players turn up mid-game all the time.
 *
 * Attribution is always optional: Save with no one picked records the event with no
 * names attached, so the volunteer is never blocked by a roster they don't know.
 * Cancel is the odd one out — it takes no action at all, so the caller must not have
 * dispatched the event before this dialog opened (see StoppageDialog / TurnoverDialog).
 */
export function PlayerSelectDialog({
  title,
  hint,
  sections,
  extra,
  onCancel,
  onSave,
}: {
  title: string;
  hint?: string;
  sections: PlayerSelectSection[];
  /**
   * Anything the event asks that isn't a player — the Callahan toggle on a goal.
   * It sits below the pickers and above the buttons, where a section that had
   * been answered by hiding itself used to be.
   */
  extra?: ReactNode;
  onCancel: () => void;
  onSave: () => void;
}) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();

  return (
    <Modal title={title} onClose={onCancel}>
      {hint && <p className="text-xs text-chalk/50">{hint}</p>}

      {sections.map((section, i) => {
        // Two sections asking about the same roster (scorer/assist) share one
        // "add player" editor, placed after the last of them — same layout as
        // AssistGoalDialog, which this dialog's goalPlayers edit mirrors.
        const isLastForTeam = !sections.slice(i + 1).some((s) => s.team === section.team);
        return (
          <div key={`${section.team}-${i}`} className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-chalk/60">{section.label}</p>
            {section.multi ? (
              <PlayerMultiPicker
                players={state.config.players[section.team]}
                selected={section.selected}
                onToggle={section.onToggle}
                onRemove={(id) => {
                  dispatch({ type: 'REMOVE_PLAYER', team: section.team, id });
                  if (section.selected.includes(id)) section.onToggle(id);
                }}
              />
            ) : (
              <PlayerPicker
                players={state.config.players[section.team].filter((p) => p.id !== section.exclude)}
                selected={section.selected}
                onSelect={section.onSelect}
                onRemove={(id) => {
                  dispatch({ type: 'REMOVE_PLAYER', team: section.team, id });
                  if (section.selected === id) section.onSelect(null);
                }}
              />
            )}
            {isLastForTeam && (
              <PlayerRosterEditor
                label={t('addPlayer')}
                players={[]}
                onAdd={(number, name) =>
                  dispatch({ type: 'ADD_PLAYER', team: section.team, number, name })
                }
              />
            )}
          </div>
        );
      })}

      {extra}

      <div className="grid grid-cols-2 gap-3">
        <button className={secondaryButton} onClick={onCancel}>
          {t('btnCancel')}
        </button>
        <button className={primaryButton} onClick={onSave}>
          {t('btnSave')}
        </button>
      </div>
    </Modal>
  );
}
