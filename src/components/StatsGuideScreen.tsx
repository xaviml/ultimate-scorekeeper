import { useT } from '../i18n/useT';
import {
  Bullet,
  Card,
  Definitions,
  Figure,
  GuidePage,
  Numbered,
  Para,
  type Marker,
} from './guideParts';

/**
 * The second walkthrough: what the app can be asked to record, what recording it
 * costs during a point, and what every figure in the report actually counts.
 *
 * It exists because `GuideScreen` is deliberately written for someone who has
 * never seen Ultimate — it explains the pull and the end zone, and it stops at
 * "there are some statistics". Everything past that point needs the game to be
 * assumed rather than taught: a reader who already knows a break from a hold is
 * asking a different question (which switch do I need, and what does "Break ch."
 * count), and answering both in one page would have made the first one longer for
 * the reader least able to afford it.
 *
 * Reached from the setup screen's header menu, alongside the walkthrough. Same
 * shell, same figure/marker treatment (see guideParts) — two chapters of one book.
 *
 * Its marker arrays come from scripts/stats-guide-screenshots.mjs, which measures
 * the live bounding boxes: re-run it after a layout change to the Statistics or
 * Roster sections, the dashboard, or the report, and paste the output back here.
 */

const FIG_SETUP: readonly Marker[] = [
  [89, 6.3],
  [89, 16.7],
  [89.5, 28],
  [89.5, 36.8],
  [89.5, 45.5],
  [89.5, 63.5],
  [89.5, 72.3],
];
/** What the Teams page's YAML looks like — the same text the page writes, so it can be copied as it is. */
const TEAMS_YAML_EXAMPLE = `RAVENS:
  color: "#1f6feb"
  players:
    - 7 Ada FMP
    - 12 Marc MMP
    - 23 Eli
  lines:
    O1: [7 Ada, 12 Marc, 23 Eli]
FOXES:
  color: "#e5534b"`;

const FIG_ROSTER: readonly Marker[] = [
  [24.9, 65.6],
  [67.7, 25.3],
  [77.5, 21.2],
  [12.5, 94.8],
];
const FIG_DASHBOARD: readonly Marker[] = [
  [25, 49.5],
  [94.4, 56.6],
  [85.4, 2.6],
  [43.5, 86.5],
  [90.5, 85.9],
  [90.5, 76],
];

export default function StatsGuideScreen({ onBack }: { onBack: () => void }) {
  const { t } = useT();

  return (
    <GuidePage title={t('statsGuideTitle')} subtitle={t('statsGuideSubtitle')} onBack={onBack}>
      <Para k="statsGuideIntro" />
      <Para k="statsGuideNothingOn" />

      {/* The model before the screen that configures it: every later section is
          "which of these two questions does this belong to", and the setup screen
          is only legible once that split is in the reader's head. */}
      <Card title={t('statsGuideModelTitle')}>
        <Para k="statsGuideModelBody" />
        <ul className="space-y-2">
          <Bullet label={t('statsGuideModelDetail')} body={t('statsGuideModelDetailBody')} />
          <Bullet label={t('statsGuideModelFeatures')} body={t('statsGuideModelFeaturesBody')} />
          <Bullet label={t('statsGuideModelCost')} body={t('statsGuideModelCostBody')} />
        </ul>
      </Card>

      <Card step={1} title={t('statsGuideStep1Title')}>
        <Para k="statsGuideStep1Body" />
        <Figure file="stats-setup.png" alt={t('statsGuideFigSetupAlt')} markers={FIG_SETUP} />
        <ol className="space-y-2">
          <Numbered
            n={1}
            label={t('statsGuideStep1Detail')}
            body={t('statsGuideStep1DetailBody')}
          />
          <Numbered n={2} label={t('statsGuideStep1Team')} body={t('statsGuideStep1TeamBody')} />
          <Numbered
            n={3}
            label={t('statsGuideStep1Turnovers')}
            body={t('statsGuideStep1TurnoversBody')}
          />
          <Numbered
            n={4}
            label={t('statsGuideStep1TurnPlayers')}
            body={t('statsGuideStep1TurnPlayersBody')}
          />
          <Numbered
            n={5}
            label={t('statsGuideStep1Passes')}
            body={t('statsGuideStep1PassesBody')}
          />
          <Numbered n={6} label={t('statsGuideStep1Goals')} body={t('statsGuideStep1GoalsBody')} />
          <Numbered n={7} label={t('statsGuideStep1Lines')} body={t('statsGuideStep1LinesBody')} />
        </ol>
      </Card>

      <Card step={2} title={t('statsGuideStep2Title')}>
        <Para k="statsGuideStep2Body" />
        <Figure file="stats-roster.png" alt={t('statsGuideFigRosterAlt')} markers={FIG_ROSTER} />
        <ol className="space-y-2">
          <Numbered n={1} label={t('statsGuideStep2Add')} body={t('statsGuideStep2AddBody')} />
          <Numbered n={2} label={t('statsGuideStep2Mark')} body={t('statsGuideStep2MarkBody')} />
          <Numbered
            n={3}
            label={t('statsGuideStep2Import')}
            body={t('statsGuideStep2ImportBody')}
          />
          <Numbered n={4} label={t('statsGuideStep2Lines')} body={t('statsGuideStep2LinesBody')} />
        </ol>
      </Card>

      <Card title={t('statsGuideTeamsTitle')}>
        <Para k="statsGuideTeamsBody" />
        <pre className="overflow-x-auto rounded bg-pitch border border-line px-3 py-2 font-mono text-[12px] leading-relaxed text-chalk/80">
          {TEAMS_YAML_EXAMPLE}
        </pre>
        <ul className="space-y-2">
          <Bullet label={t('statsGuideTeamsRequired')} body={t('statsGuideTeamsRequiredBody')} />
          <Bullet label={t('statsGuideTeamsPlayers')} body={t('statsGuideTeamsPlayersBody')} />
          <Bullet label={t('statsGuideTeamsLines')} body={t('statsGuideTeamsLinesBody')} />
          <Bullet label={t('statsGuideTeamsShare')} body={t('statsGuideTeamsShareBody')} />
        </ul>
      </Card>

      <Card step={3} title={t('statsGuideStep3Title')}>
        <Para k="statsGuideStep3Body" />
        <Figure
          file="stats-dashboard.png"
          alt={t('statsGuideFigDashboardAlt')}
          markers={FIG_DASHBOARD}
        />
        <ol className="space-y-2">
          <Numbered n={1} body={t('statsGuideTour1')} />
          <Numbered n={2} body={t('statsGuideTour2')} />
          <Numbered n={3} body={t('statsGuideTour3')} />
          <Numbered n={4} body={t('statsGuideTour4')} />
          <Numbered n={5} body={t('statsGuideTour5')} />
          <Numbered n={6} body={t('statsGuideTour6')} />
        </ol>
      </Card>

      {/* One card per dialog, in the order they interrupt a point: the goal is the
          only one every tracked game sees, the turnover is the frequent one, and the
          line is the one that happens in the gap between points. */}
      <Card title={t('statsGuideGoalTitle')}>
        <Para k="statsGuideGoalBody" />
        <Figure file="stats-goal.png" alt={t('statsGuideFigGoalAlt')} />
        <Para k="statsGuideGoalCallahan" />
      </Card>

      <Card title={t('statsGuideTurnTitle')}>
        <Para k="statsGuideTurnBody" />
        <Figure file="stats-turnover.png" alt={t('statsGuideFigTurnoverAlt')} />
        <Para k="statsGuideTurnWho" />
      </Card>

      <Card title={t('statsGuideLineTitle')}>
        <Para k="statsGuideLineBody" />
        <Figure file="stats-line.png" alt={t('statsGuideFigLineAlt')} />
        <ul className="space-y-2">
          <Bullet body={t('statsGuideLineCheck')} />
          <Bullet body={t('statsGuideLineModes')} />
          <Bullet body={t('statsGuideLineSheet')} />
          <Bullet body={t('statsGuideLineSub')} />
          <Bullet body={t('statsGuideLineName')} />
          <Bullet body={t('statsGuideLineNarrow')} />
        </ul>
      </Card>

      {/* Last of the recording cards on purpose: everything above is easier to
          commit to once it is clear that none of it is final. */}
      <Card title={t('statsGuideFixTitle')}>
        <Para k="statsGuideFixBody" />
      </Card>

      <Card step={4} title={t('statsGuideStep4Title')}>
        <Para k="statsGuideStep4Body" />
        <div className="space-y-3">
          <Figure file="stats-live-team.png" alt={t('statsGuideFigLiveTeamAlt')} wide />
          <ul className="space-y-2">
            <Bullet label={t('statsGuidePage1')} body={t('statsGuidePage1Body')} />
          </ul>
          <Figure file="stats-live-possession.png" alt={t('statsGuideFigLivePossessionAlt')} wide />
          <ul className="space-y-2">
            <Bullet label={t('statsGuidePage2')} body={t('statsGuidePage2Body')} />
          </ul>
          <Figure file="stats-live-pace.png" alt={t('statsGuideFigLivePaceAlt')} wide />
          <ul className="space-y-2">
            <Bullet label={t('statsGuidePage3')} body={t('statsGuidePage3Body')} />
          </ul>
          <ul className="space-y-2">
            <Bullet
              label={t('statsGuidePossessionClock')}
              body={t('statsGuidePossessionClockBody')}
            />
          </ul>
        </div>
      </Card>

      <Card step={5} title={t('statsGuideStep5Title')}>
        <Para k="statsGuideStep5Body" />
        <Figure file="stats-report-team.png" alt={t('statsGuideFigReportTeamAlt')} />
        <ul className="space-y-2">
          <Bullet label={t('statsGuideStatHold')} body={t('statsGuideStatHoldBody')} />
          <Bullet label={t('statsGuideStatCleanHold')} body={t('statsGuideStatCleanHoldBody')} />
          <Bullet label={t('statsGuideStatBreaks')} body={t('statsGuideStatBreaksBody')} />
          <Bullet
            label={t('statsGuideStatCleanBreaks')}
            body={t('statsGuideStatCleanBreaksBody')}
          />
          <Bullet label={t('statsGuideStatTurnovers')} body={t('statsGuideStatTurnoversBody')} />
          <Bullet
            label={t('statsGuideStatPossessionsScored')}
            body={t('statsGuideStatPossessionsScoredBody')}
          />
          <Bullet label={t('statsGuideStatPasses')} body={t('statsGuideStatPassesBody')} />
          <Bullet label={t('statsGuideStatPassesAvg')} body={t('statsGuideStatPassesAvgBody')} />
          <Bullet label={t('statsGuideStatTimeouts')} body={t('statsGuideStatTimeoutsBody')} />
        </ul>
      </Card>

      <Card title={t('statsGuidePointsTitle')}>
        <Figure file="stats-report-points.png" alt={t('statsGuideFigReportPointsAlt')} />
        <Para k="statsGuidePointsBody" />
      </Card>

      <Card step={6} title={t('statsGuideStep6Title')}>
        <Para k="statsGuideStep6Body" />
        <Figure file="stats-report-players.png" alt={t('statsGuideFigReportPlayersAlt')} wide />
        <ul className="space-y-2">
          <Bullet label={t('statsGuideViewScoring')} body={t('statsGuideViewScoringBody')} />
          <Bullet label={t('statsGuideViewPlaying')} body={t('statsGuideViewPlayingBody')} />
          <Bullet label={t('statsGuideViewPossession')} body={t('statsGuideViewPossessionBody')} />
          <Bullet label={t('statsGuideUnassigned')} body={t('statsGuideUnassignedBody')} />
          <Bullet label={t('statsGuideFilter')} body={t('statsGuideFilterBody')} />
        </ul>
      </Card>

      <Card step={7} title={t('statsGuideStep7Title')}>
        <ul className="space-y-2">
          <Bullet label={t('statsGuideShare')} body={t('statsGuideShareBody')} />
          <Bullet label={t('statsGuideCopy')} body={t('statsGuideCopyBody')} />
          <Bullet label={t('statsGuideFullLog')} body={t('statsGuideFullLogBody')} />
          <Bullet label={t('statsGuideHistory')} body={t('statsGuideHistoryBody')} />
        </ul>
      </Card>

      <Card title={t('statsGuideCheatTitle')}>
        <Definitions
          rows={[
            ['statsGuideDefHold', 'statsGuideDefHoldDo'],
            ['statsGuideDefBreak', 'statsGuideDefBreakDo'],
            ['statsGuideDefCleanHold', 'statsGuideDefCleanHoldDo'],
            ['statsGuideDefCleanBreak', 'statsGuideDefCleanBreakDo'],
            ['statsGuideDefBreakCh', 'statsGuideDefBreakChDo'],
            ['statsGuideDefPasses', 'statsGuideDefPassesDo'],
            ['statsGuideDefPassesAvg', 'statsGuideDefPassesAvgDo'],
            ['statsGuideDefPossessionsScored', 'statsGuideDefPossessionsScoredDo'],
            ['statsGuideDefTurn', 'statsGuideDefTurnDo'],
            ['statsGuideDefD', 'statsGuideDefDDo'],
            ['statsGuideDefOD', 'statsGuideDefODDo'],
          ]}
        />
      </Card>
    </GuidePage>
  );
}
