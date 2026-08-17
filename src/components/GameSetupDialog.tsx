import type { ReactNode } from 'react';
import type { TFunc } from '../i18n/useT';
import { useT } from '../i18n/useT';
import { useGame } from '../state/gameHooks';
import { timeoutsConfigured } from '../state/gameReducer';
import { expectedSplit, lineTrackingEnabled } from '../state/lines';
import type { Division, EndCapRule, GameConfig, Gender, LogEntry, TeamId } from '../state/types';
import { Modal } from './Modal';
import { sectionTitle } from './ui';

const DIVISION_KEY: Record<Division, 'divisionOpen' | 'divisionWomen' | 'divisionMixed'> = {
  open: 'divisionOpen',
  women: 'divisionWomen',
  mixed: 'divisionMixed',
};

/**
 * The setup this game is being played under, read-only.
 *
 * It exists for the moment a captain asks the scorekeeper something the dashboard
 * doesn't answer — who received the first pull, which ratio the game started on,
 * how long a timeout is. The coin toss is the sharp end of that: it is entered
 * once, consumed by createInitialState, and until now was never shown again
 * anywhere in the app.
 *
 * A pure read of state.config, so unlike every other dialog on this screen it
 * needs no guard — there is no status in which looking at the rules is wrong.
 * Field number and team names are deliberately absent: they are already in the
 * header and on the score panels.
 */
export function GameSetupDialog({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const { t } = useT();
  const cfg = state.config;
  const teamName = (id: TeamId) => cfg.teams[id].name;
  const kickoff = startedAt(state.log);
  const timeouts = timeoutsConfigured(cfg.timeouts);

  return (
    <Modal title={t('menuGameSetup')} onClose={onClose} showClose>
      <div className="flex flex-col gap-4">
        <Group title={t('division')}>
          <Row label={t('division')} value={t(DIVISION_KEY[cfg.division])} />
        </Group>

        {cfg.division === 'mixed' && (
          <Group
            title={t('mixedRatioRule')}
            // Rule B has no starting ratio to show — state.ratio is null all game
            // and the dashboard chip never appears — so the rule itself is the
            // answer to "what ratio are we on?", and the note is what carries it.
            note={t(cfg.mixedRule === 'A' ? 'ruleA' : 'ruleB')}
          >
            {cfg.mixedRule === 'A' && (
              <Row
                label={t('startingRatio')}
                value={t(cfg.startingRatio === 'male' ? 'ratioMale' : 'ratioFemale')}
              />
            )}
          </Group>
        )}

        {cfg.startingTime.enabled && (
          <Group title={t('startingTimeLabel')}>
            <Row label={t('setupScheduled')} value={cfg.startingTime.time} />
            {/* What a tournament desk actually asks about once the game is under
                way: a 17:00 slot that kicked off at 17:06 is the interesting fact. */}
            {kickoff && <Row label={t('setupStarted')} value={kickoff} />}
          </Group>
        )}

        {/* Both rows describe the opening pull only. The ends swap every point, so
            the team named here is somewhere else by now — hence the note. */}
        <Group title={t('coinToss')} note={t('setupSidesNote')}>
          <Row label={t('startingOffense')} value={teamName(cfg.startingOffense)} />
          <Row label={t('startingSide')} value={teamName(cfg.startingSide)} />
        </Group>

        <Group
          title={t('winConditions')}
          // The header chip shows the target actually in force; once a cap has
          // fixed a new one, this dialog would otherwise quietly contradict it.
          note={
            state.cappedTarget !== null
              ? t('setupCapInForce', { n: state.cappedTarget })
              : undefined
          }
        >
          <Row label={t('targetScore')} value={cfg.targetScore} />
          <Row label={t('timeLimit')} value={cfg.timeLimitMinutes} />
          <Row label={t('endCapLabel')} value={endCapText(cfg.endCap, t)} />
        </Group>

        <Group title={t('halfTimeTitle')}>
          <Row label={t('halfScore')} value={cfg.halfScore} />
          <Row label={t('halfTimeLimit')} value={cfg.halfTimeLimitMinutes} />
          <Row label={t('setupBreak')} value={formatDuration(cfg.halfTimeBreakSeconds)} />
          <Row
            label={t('endCapLabel')}
            value={t(cfg.halfCap.kind === 'cap' ? 'halfCapPlus' : 'setupNoCap')}
          />
        </Group>

        <Group
          title={t('timeoutsTitle')}
          note={
            !timeouts
              ? t('setupNoTimeouts')
              : cfg.timeouts.disallowLastFiveMinutes
                ? t('timeoutLastFive')
                : undefined
          }
        >
          {timeouts && (
            <>
              <Row
                label={t('timeoutsCount')}
                value={cfg.timeouts.perHalf ?? cfg.timeouts.perGame ?? 0}
              />
              <Row
                label={t('timeoutsScope')}
                value={t(cfg.timeouts.perGame === null ? 'timeoutsScopeHalf' : 'timeoutsScopeGame')}
              />
              <Row
                label={t('setupDuration')}
                value={formatDuration(cfg.timeouts.durationSeconds)}
              />
            </>
          )}
        </Group>

        {/* Omitted entirely when line tracking is off, the same way the water-break
            block follows waterBreaks.enabled: a captain asking what is being recorded
            is better served by the section not being there than by a row of zeroes. */}
        {lineTrackingEnabled(cfg) && (
          <Group
            title={t('linesTitle')}
            note={t('lineSavedForTeam', { team: teamName(cfg.trackedTeam!) })}
          >
            <Row label={t('lineSizeLabel')} value={cfg.lineSize} />
            <Row label={t('lineGenderCheckLabel')} value={genderCheckText(cfg, state.ratio, t)} />
          </Group>
        )}

        {/* Only the automatic breaks are configuration. One can always be called by
            hand from the raised-hand button, whatever this says — see canWaterBreak. */}
        {cfg.waterBreaks.enabled && (
          <Group title={t('waterBreakTitle')}>
            <Row label={t('waterBreakScores')} value={cfg.waterBreaks.atScores.join(', ')} />
            <Row
              label={t('setupDuration')}
              value={formatDuration(cfg.waterBreaks.durationSeconds)}
            />
          </Group>
        )}
      </div>
    </Modal>
  );
}

/**
 * A titled block of label/value rows, with an optional sentence underneath for
 * whatever doesn't fit in a value — a rule, a caveat, or the reason a block has
 * no rows at all (a game played with no timeouts).
 */
function Group({ title, note, children }: { title: string; note?: string; children?: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className={sectionTitle}>{title}</h3>
      {/* A block whose rows are all conditional renders `false`, not undefined —
          so the empty bordered box has to be checked for rather than assumed away. */}
      {Boolean(children) && (
        <dl className="rounded-lg border border-line bg-pitch px-3">{children}</dl>
      )}
      {note && <p className="text-xs text-chalk/50 leading-snug">{note}</p>}
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-4 py-2 border-b border-line last:border-0">
      {/* Uppercased like every label on the setup form — which is also what keeps
          the dictionary's inconsistent casing ("TIME (Minutes)") from showing. */}
      <dt className="text-[11px] uppercase tracking-wide text-chalk/60">{label}</dt>
      <dd className="font-board text-sm text-right">{value}</dd>
    </div>
  );
}

/**
 * A configured break as a duration rather than a raw count of seconds: 45'', 1' 15'',
 * 3'. Every break in the config is stored in seconds because that is what the timers
 * count, but past a minute "75" is a number the reader has to convert themselves.
 *
 * Not formatClock: that is the running mm:ss of a clock ticking, and a setting is
 * neither ticking nor zero-padded. The unit marks are always shown, which is why the
 * labels beside these values drop the "(seconds)" the setup form's inputs need.
 */
function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}''`;
  return seconds === 0 ? `${minutes}'` : `${minutes}' ${seconds}''`;
}

/** The wall-clock time play actually began, from the log's own gameStart entry. */
function startedAt(log: LogEntry[]): string | undefined {
  return log.find((e) => e.type === 'gameStart')?.wallClock;
}

/**
 * The split each line is checked against, as a value rather than a setting name.
 * "Follow the game's ratio" is the name of the rule; what a captain is asking is
 * which numbers it comes to right now, so a followed ratio resolves to them and
 * only falls back to the rule's name when there is no ratio to resolve against.
 */
function genderCheckText(cfg: GameConfig, ratio: Gender | null, t: TFunc): string {
  if (cfg.lines.genderCheck === 'none') return t('lineGenderCheckNone');
  const split = expectedSplit(cfg, ratio);
  if (!split) return t('lineGenderCheckRatio');
  return t('lineFixedSplit', { female: split.female, male: split.male });
}

function endCapText(endCap: EndCapRule, t: TFunc): string {
  if (endCap.kind === 'none') return t('endCapNone');
  if (endCap.kind === 'cap') return t('endCapPlus', { n: endCap.plus });
  return t('endCapCond', { n: endCap.plus, x: endCap.minDiff });
}
