import type { ReactNode } from 'react';
import type { TFunc } from '../i18n/useT';
import { useT } from '../i18n/useT';
import { useGame } from '../state/gameHooks';
import { ratioForPoint, timeoutsConfigured } from '../state/gameReducer';
import { expectedSplit, lineTrackingEnabled } from '../state/lines';
import type { Division, EndCapRule, GameConfig, Gender, LogEntry, TeamId } from '../state/types';
import { useGameInfoDraft } from '../hooks/useGameInfoDraft';
import { GameInfoFields, GameInfoSaveBar } from './GameInfoEditor';
import { Modal } from './Modal';
import {
  CoinIcon,
  DropIcon,
  FlagIcon,
  HalfIcon,
  LineIcon,
  SetupIcon,
  ShirtIcon,
  TimeoutIcon,
} from './icons';
import { hintText, sectionTitle } from './ui';

const DIVISION_KEY: Record<Division, 'divisionOpen' | 'divisionWomen' | 'divisionMixed'> = {
  open: 'divisionOpen',
  women: 'divisionWomen',
  mixed: 'divisionMixed',
};

/**
 * The setup this game is being played under.
 *
 * It exists for the moment a captain asks the scorekeeper something the dashboard
 * doesn't answer — who received the first pull, which ratio the game started on,
 * how long a timeout is. The coin toss is the sharp end of that: it is entered
 * once, consumed by createInitialState, and until now was never shown again
 * anywhere in the app.
 *
 * A read of state.config, so unlike every other dialog on this screen it needs no
 * guard — there is no status in which looking at the rules is wrong. The one
 * exception to read-only is the top block: the field and the teams' names and
 * colours (GameInfoEditor), which are bookkeeping rather than rules and so stay
 * correctable all game, the report included. Everything below it is the game's
 * rules and stays as it was set up.
 */
export function GameSetupDialog({ onClose }: { onClose: () => void }) {
  const state = useGame();
  const { t } = useT();
  const cfg = state.config;
  const teamName = (id: TeamId) => cfg.teams[id].name;
  const kickoff = startedAt(state.log);
  const timeouts = timeoutsConfigured(cfg.timeouts);
  const info = useGameInfoDraft();
  // Units on the value, the way the setup screen's folded summaries write them
  // ("100 min", "1m 15s"), so the labels can be the setup screen's short ones.
  const minutes = (n: number) => `${n} ${t('unitMin')}`;
  const duration = (seconds: number) => breakDuration(seconds, t('unitSec'));

  return (
    <Modal title={t('menuGameSetup')} onClose={onClose} showClose>
      <div className="flex flex-col">
        {/* The one block that can be changed — so it leads, under the setup screen's
            own heading for it. When the game was scheduled, the slot and the actual
            kickoff sit with it, as the starting time does on the setup screen. */}
        <Block title={t('matchTitle')} icon={<ShirtIcon size="w-4 h-4" />} first>
          <GameInfoFields draft={info}>
            {cfg.startingTime.enabled && (
              <Rows>
                <Row label={t('setupScheduled')} value={cfg.startingTime.time} />
                {/* What a tournament desk actually asks about once the game is under
                    way: a 17:00 slot that kicked off at 17:06 is the interesting fact. */}
                {kickoff && <Row label={t('setupStarted')} value={kickoff} />}
              </Rows>
            )}
          </GameInfoFields>
        </Block>

        {/* The division in the heading's corner rather than a row repeating the
            heading ("Division — Division: Mixed"); mixed adds the ratio below it. */}
        <Block
          title={t('division')}
          icon={<SetupIcon size="w-4 h-4" />}
          value={t(DIVISION_KEY[cfg.division])}
          note={
            cfg.division === 'mixed'
              ? t(cfg.mixedRule === 'A' ? 'ratioAbbaOnHint' : 'ratioAbbaOffHint')
              : undefined
          }
        >
          {cfg.division === 'mixed' && cfg.mixedRule === 'A' && (
            <Rows>
              <Row
                label={t('startingRatio')}
                value={t(cfg.startingRatio === 'male' ? 'ratioMale' : 'ratioFemale')}
              />
            </Rows>
          )}
        </Block>

        {/* Both rows describe the opening pull only. The ends swap every point, so
            the team named here is somewhere else by now — hence the note. */}
        <Block title={t('coinToss')} icon={<CoinIcon size="w-4 h-4" />} note={t('setupSidesNote')}>
          <Rows>
            <Row label={t('startingOffense')} value={teamName(cfg.startingOffense)} />
            <Row label={t('startingSide')} value={teamName(cfg.startingSide)} />
          </Rows>
        </Block>

        <Block
          title={t('winConditions')}
          icon={<FlagIcon size="w-4 h-4" />}
          note={
            state.cappedTarget !== null
              ? t('setupCapInForce', { n: state.cappedTarget })
              : undefined
          }
        >
          <Rows>
            <Row label={t('targetScore')} value={cfg.targetScore} />
            <Row label={t('fieldTime')} value={minutes(cfg.timeLimitMinutes)} />
            <Row label={t('endCapLabel')} value={endCapText(cfg.endCap, t)} />
          </Rows>
        </Block>

        <Block
          title={t('halfTimeTitle')}
          icon={<HalfIcon size="w-4 h-4" />}
          note={cfg.halfTimeEnabled ? undefined : t('setupNoHalf')}
        >
          {cfg.halfTimeEnabled && (
            <Rows>
              <Row label={t('halfScore')} value={cfg.halfScore} />
              <Row label={t('fieldTime')} value={minutes(cfg.halfTimeLimitMinutes)} />
              <Row label={t('fieldBreak')} value={duration(cfg.halfTimeBreakSeconds)} />
              <Row
                label={t('endCapLabel')}
                value={t(cfg.halfCap.kind === 'cap' ? 'halfCapPlus' : 'setupNoCap')}
              />
            </Rows>
          )}
        </Block>

        <Block
          title={t('timeoutsTitle')}
          icon={<TimeoutIcon size="w-4 h-4" />}
          note={
            !timeouts
              ? t('setupNoTimeouts')
              : cfg.timeouts.disallowLastFiveMinutes
                ? t('setupNoTimeoutsLastFive')
                : undefined
          }
        >
          {timeouts && (
            <Rows>
              <Row
                label={t('timeoutsCount')}
                value={cfg.timeouts.perHalf ?? cfg.timeouts.perGame ?? 0}
              />
              <Row
                label={t('timeoutsScope')}
                value={t(
                  cfg.halfTimeEnabled && cfg.timeouts.perGame === null
                    ? 'timeoutsScopeHalf'
                    : 'timeoutsScopeGame',
                )}
              />
              <Row label={t('fieldDuration')} value={duration(cfg.timeouts.durationSeconds)} />
            </Rows>
          )}
        </Block>

        {/* Only the automatic breaks are configuration. One can always be called by
            hand from the raised-hand button, whatever this says — see canWaterBreak. */}
        {cfg.waterBreaks.enabled && (
          <Block title={t('waterBreakTitle')} icon={<DropIcon size="w-4 h-4" />}>
            <Rows>
              <Row label={t('waterBreakScores')} value={cfg.waterBreaks.atScores.join(', ')} />
              <Row label={t('fieldDuration')} value={duration(cfg.waterBreaks.durationSeconds)} />
            </Rows>
          </Block>
        )}

        {/* Omitted entirely when line tracking is off, the same way the water-break
            block follows waterBreaks.enabled: a captain asking what is being recorded
            is better served by the section not being there than by a row of zeroes. */}
        {lineTrackingEnabled(cfg) && (
          <Block
            title={t('linesTitle')}
            icon={<LineIcon size="w-4 h-4" />}
            note={t('lineSavedForTeam', { team: teamName(cfg.trackedTeam!) })}
          >
            <Rows>
              <Row label={t('lineSizeLabel')} value={cfg.lineSize} />
              {/* The split of the point being played or lined up — not `state.ratio`,
                  which is still the finished point's until the pull is thrown. */}
              <Row
                label={t('lineGenderCheckLabel')}
                value={genderCheckText(cfg, ratioForPoint(cfg, state.points.length), t)}
              />
            </Rows>
          </Block>
        )}
      </div>
      <GameInfoSaveBar draft={info} />
    </Modal>
  );
}

/**
 * One section of the dialog, headed the way the setup screen heads its cards — the
 * glyph in the accent, the title in tracked capitals — but without the card: the
 * dialog is already a panel, so sections are split by a hairline instead of boxed
 * inside it. `value` puts a one-word answer in the heading's corner, for a section
 * that is a single fact. `note` is the sentence underneath for whatever doesn't fit
 * a value: a rule, a caveat, or why a section has no rows at all.
 */
function Block({
  title,
  icon,
  value,
  note,
  first = false,
  children,
}: {
  title: string;
  icon: ReactNode;
  value?: string;
  note?: string;
  first?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={`space-y-2 ${first ? '' : 'mt-4 pt-4 border-t border-line'}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={`${sectionTitle} flex items-center gap-2`}>
          <span aria-hidden="true" className="shrink-0">
            {icon}
          </span>
          {title}
        </h3>
        {value && <span className="font-board font-semibold text-sm">{value}</span>}
      </div>
      {children}
      {note && <p className={hintText}>{note}</p>}
    </section>
  );
}

/** Label/value rows on hairlines — no box of their own, as on the report's team table. */
function Rows({ children }: { children: ReactNode }) {
  return <dl>{children}</dl>;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-4 py-2 border-t border-line first:border-t-0">
      {/* Uppercased like every label on the setup form — which is also what keeps
          the dictionary's inconsistent casing from showing. */}
      <dt className="text-xs uppercase tracking-wide text-chalk/60">{label}</dt>
      <dd className="font-board font-semibold text-sm text-right">{value}</dd>
    </div>
  );
}

/**
 * A configured break as the setup screen's summaries write it: "45 s", "1m 15s", "7m".
 * Every break in the config is stored in seconds because that is what the timers
 * count, but past a minute "75" is a number the reader has to convert themselves.
 * Not formatClock: that is the running mm:ss of a clock ticking.
 */
function breakDuration(totalSeconds: number, unitSec: string): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} ${unitSec}`;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
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
