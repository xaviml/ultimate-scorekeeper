import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useGame, useGameDispatch } from '../state/gameHooks';
import {
  episodeIndices,
  logEditAllowsNoTeam,
  logEditKind,
  playerTrackingFor,
} from '../state/gameReducer';
import type { CallResolution, LogEdit, LogEntry, TeamId } from '../state/types';
import { InjuryAttributionDialog } from './InjuryAttributionDialog';
import { Modal } from './Modal';
import { NoteDialog } from './NoteDialog';
import { PlayerSelectDialog, type PlayerSelectSection } from './PlayerSelectDialog';
import { contrastText, primaryButton, secondaryButton, teamChoiceButton } from './ui';

const RESOLUTIONS: CallResolution[] = ['accepted', 'contested', 'retracted'];

/** What the edit will write, handed back to the log table which dispatches it. */
type Apply = (edit: LogEdit) => void;

/**
 * Fix the attribution on a row of the log — the pencil in the log dialog's actions
 * column. Which question it asks is `logEditKind`'s answer, and each branch reopens
 * the very dialog that asked it when the event was recorded, prefilled with what was
 * answered then: the same question, asked again.
 *
 * What it never asks is anything that would change what the event *was*: which team
 * scored, whether a goal happened, the kind of call. A goal is undone with a
 * long-press on the score, which is a game rule with a snapshot behind it; this is
 * bookkeeping, and the hint in each dialog says so.
 */
export function LogEditDialog({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  const state = useGame();
  const dispatch = useGameDispatch();
  const kind = logEditKind(state, entry);

  const apply: Apply = (edit) => {
    dispatch({ type: 'EDIT_LOG_ENTRY', id: entry.id, edit });
    onClose();
  };

  switch (kind) {
    case 'goalPlayers':
      return <GoalPlayersEdit entry={entry} apply={apply} onClose={onClose} />;
    case 'turnoverPlayers':
      return <TurnoverPlayersEdit entry={entry} apply={apply} onClose={onClose} />;
    case 'injury': {
      // Only the episode's opening `stoppage` row carries `stoppagePlayers` (see
      // EDIT_LOG_ENTRY) — the pencil on `stoppageResolved` has to read it from
      // there, or the picker prefills empty and Save wipes the players out.
      const index = state.log.findIndex((e) => e.id === entry.id);
      const opener = state.log[episodeIndices(state.log, index)[0]];
      return (
        <InjuryAttributionDialog
          initialTeam={entry.team}
          initialPlayers={opener.stoppagePlayers}
          onCancel={onClose}
          onSubmit={({ team, players }) => apply({ kind: 'injury', team, players })}
        />
      );
    }
    case 'callResolution':
      return <CallResolutionEdit entry={entry} apply={apply} onClose={onClose} />;
    case 'team':
      return <TeamEdit entry={entry} apply={apply} onClose={onClose} />;
    case 'note':
      return <NoteDialog entry={entry} onClose={onClose} />;
    default:
      return null;
  }
}

function GoalPlayersEdit({
  entry,
  apply,
  onClose,
}: {
  entry: LogEntry;
  apply: Apply;
  onClose: () => void;
}) {
  const state = useGame();
  const { t } = useT();
  const [scorerId, setScorerId] = useState<string | null>(entry.scorerId ?? null);
  const [assistId, setAssistId] = useState<string | null>(entry.assistId ?? null);
  // Guaranteed by logEditKind: a goal row only offers this when its team is tracked.
  const team = entry.team as TeamId;

  return (
    <PlayerSelectDialog
      title={t('assistDialogTitle', { team: state.config.teams[team].name })}
      hint={t('logEditHint')}
      sections={[
        {
          team,
          label: t('whoScored'),
          selected: scorerId,
          onSelect: setScorerId,
          exclude: assistId,
        },
        {
          team,
          label: t('whoAssisted'),
          selected: assistId,
          onSelect: setAssistId,
          exclude: scorerId,
        },
      ]}
      onCancel={onClose}
      onSave={() =>
        apply({
          kind: 'goalPlayers',
          scorerId: scorerId ?? undefined,
          assistId: assistId ?? undefined,
        })
      }
    />
  );
}

function TurnoverPlayersEdit({
  entry,
  apply,
  onClose,
}: {
  entry: LogEntry;
  apply: Apply;
  onClose: () => void;
}) {
  const state = useGame();
  const { t } = useT();
  const [turnoverId, setTurnoverId] = useState<string | null>(entry.turnoverId ?? null);
  const [defenseId, setDefenseId] = useState<string | null>(entry.defenseId ?? null);
  // The entry's team is the side that lost the disc, so the defender comes from the
  // other roster — same split as turnoverPlayersDetail reads it back with.
  const attacking = entry.team as TeamId;
  const defending: TeamId = attacking === 'A' ? 'B' : 'A';

  // Only the sides whose players this game tracks get a picker, exactly as the
  // dialog that recorded the turnover did (see TurnoverDialog).
  const sections: PlayerSelectSection[] = [
    ...(playerTrackingFor(state.config, attacking)
      ? [
          {
            team: attacking,
            label: t('whoTurnedOver', { team: state.config.teams[attacking].name }),
            selected: turnoverId,
            onSelect: setTurnoverId,
          } as const,
        ]
      : []),
    ...(playerTrackingFor(state.config, defending)
      ? [
          {
            team: defending,
            label: t('whoDefended', { team: state.config.teams[defending].name }),
            selected: defenseId,
            onSelect: setDefenseId,
          } as const,
        ]
      : []),
  ];

  return (
    <PlayerSelectDialog
      title={t('turnoverDialogTitle')}
      hint={t('logEditHint')}
      sections={sections}
      onCancel={onClose}
      onSave={() =>
        apply({
          kind: 'turnoverPlayers',
          turnoverId: turnoverId ?? undefined,
          defenseId: defenseId ?? undefined,
        })
      }
    />
  );
}

/** The team buttons, with the one already recorded ringed. */
function TeamButtons({ selected, onPick }: { selected?: TeamId; onPick: (team: TeamId) => void }) {
  const state = useGame();
  return (
    <div className="grid grid-cols-2 gap-3">
      {(['A', 'B'] as TeamId[]).map((id) => (
        <button
          key={id}
          className={teamChoiceButton(selected === id)}
          style={{
            backgroundColor: state.config.teams[id].color,
            color: contrastText(state.config.teams[id].color),
          }}
          onClick={() => onPick(id)}
        >
          {state.config.teams[id].name}
        </button>
      ))}
    </div>
  );
}

/**
 * "Who was it?" for the rows that answer nothing else — a travel, a call awaiting
 * its resolution, a technical stoppage, an SOTG stoppage. One question, so picking
 * a team applies and closes, exactly like the dialogs that recorded them.
 */
function TeamEdit({
  entry,
  apply,
  onClose,
}: {
  entry: LogEntry;
  apply: Apply;
  onClose: () => void;
}) {
  const { t } = useT();
  const title =
    entry.type === 'travel'
      ? t('travelTeamTitle')
      : entry.stoppageKind === 'technical'
        ? t('technicalStoppageTitle')
        : entry.type === 'sotgStart' || entry.type === 'sotgEnd'
          ? t('sotgStoppageTitle')
          : t('callTeamTitle', { kind: t(`callKind_${entry.callKind ?? 'generic'}` as never) });

  return (
    <Modal title={title} onClose={onClose} size="sm">
      <p className="text-xs text-chalk/50">{t('logEditHint')}</p>
      <TeamButtons selected={entry.team} onPick={(team) => apply({ kind: 'team', team })} />
      {/* Only a technical stoppage was ever recorded without a team, so it is the
          only row that can go back to having none. */}
      {logEditAllowsNoTeam(entry) && (
        <button
          className={`${secondaryButton} w-full`}
          onClick={() => apply({ kind: 'team', team: undefined })}
        >
          {t('btnNoTeam')}
        </button>
      )}
      <button className={`${secondaryButton} w-full`} onClick={onClose}>
        {t('btnCancel')}
      </button>
    </Modal>
  );
}

/**
 * A resolved call is the one row that answers two questions — who called it and how
 * it ended — so unlike the single-question dialogs this one collects both and saves.
 * Editing the team writes it to the call row above as well (see EDIT_LOG_ENTRY): one
 * call cannot have been made by one team and answered by another.
 */
function CallResolutionEdit({
  entry,
  apply,
  onClose,
}: {
  entry: LogEntry;
  apply: Apply;
  onClose: () => void;
}) {
  const { t } = useT();
  const [team, setTeam] = useState<TeamId | undefined>(entry.team);
  const [resolution, setResolution] = useState<CallResolution>(entry.resolution ?? 'accepted');

  return (
    <Modal
      title={t('logEditCallTitle', { kind: t(`callKind_${entry.callKind ?? 'generic'}` as never) })}
      onClose={onClose}
      size="sm"
    >
      <p className="text-xs text-chalk/50">{t('logEditHint')}</p>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-chalk/60">{t('whoCalled')}</p>
        <TeamButtons selected={team} onPick={setTeam} />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-chalk/60">{t('howResolved')}</p>
        <div className="grid grid-cols-3 gap-2">
          {RESOLUTIONS.map((option) => (
            <button
              key={option}
              className={`${secondaryButton} text-xs ${
                resolution === option ? 'ring-2 ring-signal text-signal' : ''
              }`}
              onClick={() => setResolution(option)}
            >
              {t(`callResolution_${option}` as never)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className={secondaryButton} onClick={onClose}>
          {t('btnCancel')}
        </button>
        <button
          className={primaryButton}
          onClick={() => apply({ kind: 'callResolution', team, resolution })}
        >
          {t('btnSave')}
        </button>
      </div>
    </Modal>
  );
}
