import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import { onFieldIds, playersOnField } from '../state/lines';
import { findGamePlayer, playerLabel } from '../state/stats';
import type { PlayerInfo, TeamId } from '../state/types';
import { Modal } from './Modal';
import { PlayerPicker, PlayerSortToggle } from './PlayerPicker';
import { PlayerRosterEditor } from './PlayerRosterEditor';
import { secondaryButton } from './ui';

/** Who threw and who caught a goal, as the dialog hands it back. */
export interface GoalAttribution {
  scorerId: string | null;
  assistId: string | null;
  callahan: boolean;
}

/**
 * Who threw and who caught a goal, asked in that order and one question at a time —
 * the one dialog for it, whether the goal has just been scored (`AssistGoalDialog`,
 * from the dashboard's prompt) or is being corrected from the log (`LogEditDialog`).
 *
 * Assist first because that is how the sideline answers: "from Anna to Marc". Each
 * step is one tap that moves on by itself — a player, Callahan or Don't know on the
 * first; a player or Don't know on the second, which submits — so the usual case is
 * two taps and there is no Save button to find. A summary line above the second
 * step says what the first one recorded and takes you back to change it.
 *
 * `initial` is what is already recorded, highlighted on each step so a correction
 * can see it; tapping a highlighted player confirms it rather than clearing it, since
 * every tap here means "this one".
 */
export function GoalPlayersDialog({
  team,
  players,
  initial,
  hint,
  narrowed,
  onClose,
  onSubmit,
}: {
  team: TeamId;
  /** Who can be named — narrowed to the point's line by the dashboard, the whole roster from the log. */
  players: PlayerInfo[];
  initial?: GoalAttribution;
  /** A line under the title — the log editor's "this is a correction" note. */
  hint?: string;
  /**
   * The players offered are fewer than the roster, so a player added inline could not
   * be offered — show why instead of the add form.
   */
  narrowed?: boolean;
  onClose: () => void;
  onSubmit: (attribution: GoalAttribution) => void;
}) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const { t } = useT();
  const [step, setStep] = useState<'assist' | 'scorer'>('assist');
  const [assistId, setAssistId] = useState<string | null>(initial?.assistId ?? null);
  const [callahan, setCallahan] = useState(initial?.callahan ?? false);
  const initialScorer = initial?.scorerId ?? null;

  const toScorer = (assist: string | null, isCallahan: boolean) => {
    setAssistId(assist);
    setCallahan(isCallahan);
    setStep('scorer');
  };
  const submit = (scorerId: string | null) => onSubmit({ scorerId, assistId, callahan });

  const assistSummary = callahan
    ? t('callahan')
    : assistId
      ? t('goalSummaryAssist', { name: playerLabel(findGamePlayer(state, team, assistId)) })
      : t('goalSummaryNoAssist');

  return (
    <Modal
      title={t('assistDialogTitle', { team: state.config.teams[team].name })}
      onClose={onClose}
      headerAction={<PlayerSortToggle />}
    >
      {hint && <p className="text-xs text-chalk/50">{hint}</p>}

      {step === 'assist' ? (
        <div className="space-y-2" data-goal-step="assist">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {t('goalStepAssist')}
          </p>
          <PlayerPicker
            players={players}
            selected={callahan ? null : assistId}
            // A null here is a tap on the highlighted player: confirm it, don't clear it.
            onSelect={(id) => toScorer(id ?? assistId, false)}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={callahan}
              className={`${secondaryButton} ${callahan ? 'ring-2 ring-accent' : ''}`}
              onClick={() => toScorer(null, true)}
            >
              {t('callahan')}
            </button>
            <button type="button" className={secondaryButton} onClick={() => toScorer(null, false)}>
              {t('goalDontKnow')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2" data-goal-step="scorer">
          <div className="flex items-center justify-between gap-2 rounded bg-pitch border border-line px-3 py-2">
            <span className="text-sm truncate" data-goal-assist-summary>
              {assistSummary} →
            </span>
            <button
              type="button"
              className="text-xs text-accent font-board uppercase tracking-wide shrink-0"
              onClick={() => setStep('assist')}
            >
              {t('goalChangeAssist')}
            </button>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {t('goalStepScorer')}
          </p>
          <PlayerPicker
            players={players.filter((p) => p.id !== assistId)}
            layoutCount={players.length}
            selected={initialScorer}
            onSelect={(id) => submit(id ?? initialScorer)}
          />
          <button
            type="button"
            className={`w-full ${secondaryButton}`}
            onClick={() => submit(null)}
          >
            {t('goalDontKnow')}
          </button>
        </div>
      )}

      {/* Someone added here is not on the point's recorded line, so the pickers above
          would not offer them — which reads as the name being swallowed. The line is
          the thing to fix in that case, from the Line row in the menu. */}
      {narrowed ? (
        <p className="text-xs text-chalk/50">{t('lineOnlyOnFieldGoal')}</p>
      ) : (
        <PlayerRosterEditor
          label={t('addPlayer')}
          players={[]}
          onAdd={(number, name) => dispatch({ type: 'ADD_PLAYER', team, number, name })}
        />
      )}
    </Modal>
  );
}

/**
 * The goal that has just ended a point, asked about from the dashboard's "Scorer"
 * prompt (see `PromptRow` in GameScreen) — never on its own: the goal call-out, the
 * next ratio and the pull clock all carry on underneath while the volunteer finds
 * out who it was. Dismissing it without an answer leaves the prompt in place.
 */
export function AssistGoalDialog({
  team,
  onClose,
  onSaved,
}: {
  team: TeamId;
  /** Closed without an answer — the prompt stays up. */
  onClose: () => void;
  /** Answered (even with "Don't know" on both) — the prompt is resolved. */
  onSaved: () => void;
}) {
  const state = useGame();
  const dispatch = useGameDispatch();

  /**
   * With a line registered, only the seven who played the point can have scored it.
   *
   * Read off the point that has just finished, **not** `state.line`: GOAL appends the
   * PointRecord and immediately moves the live line on to the next point, so by the
   * time this dialog opens `state.line` is the wrong seven entirely. Anyone a
   * substitution took off is left out too — an injured player who was replaced cannot
   * have gone on to score. Falls back to the full roster when no line was registered
   * (see `playersOnField`).
   */
  const lastPoint = state.points[state.points.length - 1];
  const players = playersOnField(
    state.config,
    team,
    state.config.players[team],
    onFieldIds(lastPoint?.line),
  );

  return (
    <GoalPlayersDialog
      team={team}
      players={players}
      narrowed={players.length < state.config.players[team].length}
      onClose={onClose}
      onSubmit={(attribution) => {
        dispatch({ type: 'SET_GOAL_PLAYERS', team, ...attribution });
        onSaved();
      }}
    />
  );
}
