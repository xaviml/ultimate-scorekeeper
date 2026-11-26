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
import { useT } from '../i18n/useT';

/**
 * The first-timer's walkthrough: keeping the score and the clocks with no prior
 * knowledge of Ultimate. The companion page (StatsGuideScreen) picks up where this
 * one stops, for a reader who already knows the game.
 *
 * Its figures' marker arrays come from scripts/guide-screenshots.mjs — see Marker.
 */

const FIG_SETUP: readonly Marker[] = [
  [46.7, 18.1],
  [89, 23.6],
  [89.6, 50.5],
  [89, 94.9],
];
const FIG_TOSS: readonly Marker[] = [
  [89, 31],
  [89, 54.1],
  [89, 77.2],
];
const FIG_DASHBOARD: readonly Marker[] = [
  [62, 2.7],
  [89, 52.3],
  [29.3, 13.3],
  [10.6, 69.8],
  [31.2, 76.5],
  [71.2, 86.4],
  [92, 95.1],
  [33.8, 79.7],
];
const FIG_PLAY: readonly Marker[] = [
  [10.6, 69.8],
  [15, 22.2],
  [42.5, 45.1],
];

export default function GuideScreen({ onBack }: { onBack: () => void }) {
  const { t } = useT();

  return (
    <GuidePage title={t('guideTitle')} subtitle={t('guideSubtitle')} onBack={onBack}>
      <Para k="guideIntro" />

      <Card title={t('guideSportTitle')}>
        <Para k="guideSportBody" />
        <Para k="guideSportPull" />
        <Para k="guideSportRole" />
      </Card>

      <Card step={1} title={t('guideStep1Title')}>
        <Para k="guideStep1Body" />
        <Figure file="setup.png" alt={t('guideFigSetupAlt')} markers={FIG_SETUP} />
        <ol className="space-y-2">
          <Numbered n={1} label={t('guideStep1Template')} body={t('guideStep1TemplateBody')} />
          <Numbered n={2} label={t('guideStep1Division')} body={t('guideStep1DivisionBody')} />
          <Numbered n={3} label={t('guideStep1Teams')} body={t('guideStep1TeamsBody')} />
          <Numbered n={4} label={t('guideStep1Time')} body={t('guideStep1TimeBody')} />
        </ol>
        {/* Not numbered: Statistics is the last section of the setup screen, well
            below what the figure can show. */}
        <ul className="space-y-2">
          <Bullet label={t('guideStep1Players')} body={t('guideStep1PlayersBody')} />
        </ul>
      </Card>

      <Card step={2} title={t('guideStep2Title')}>
        <Para k="guideStep2Body" />
        <Figure file="toss.png" alt={t('guideFigTossAlt')} markers={FIG_TOSS} />
        <ol className="space-y-2">
          <Numbered n={1} label={t('guideStep2Offense')} body={t('guideStep2OffenseBody')} />
          <Numbered n={2} label={t('guideStep2Side')} body={t('guideStep2SideBody')} />
          <Numbered n={3} label={t('guideStep2Ratio')} body={t('guideStep2RatioBody')} />
        </ol>
      </Card>

      <Card step={3} title={t('guideStep3Title')}>
        <Para k="guideStep3Body" />
        <Figure file="rules.png" alt={t('guideFigRulesAlt')} />
        <ul className="space-y-2">
          <Bullet label={t('guideStep3Score')} body={t('guideStep3ScoreBody')} />
          <Bullet label={t('guideStep3Cap')} body={t('guideStep3CapBody')} />
          <Bullet label={t('guideStep3Half')} body={t('guideStep3HalfBody')} />
          <Bullet label={t('guideStep3Timeouts')} body={t('guideStep3TimeoutsBody')} />
          <Bullet label={t('guideStep3Water')} body={t('guideStep3WaterBody')} />
        </ul>
        <Para k="guideStep3Start" />
      </Card>

      <Card step={4} title={t('guideStep4Title')}>
        <Para k="guideStep4Body" />
        <Figure file="dashboard.png" alt={t('guideFigGameAlt')} markers={FIG_DASHBOARD} />
        <ol className="space-y-2">
          <Numbered n={1} body={t('guideTour1')} />
          <Numbered n={2} body={t('guideTour2')} />
          <Numbered n={3} body={t('guideTour3')} />
          <Numbered n={4} body={t('guideTour4')} />
          <Numbered n={5} body={t('guideTour5')} />
          <Numbered n={6} body={t('guideTour6')} />
          <Numbered n={7} body={t('guideTour7')} />
          <Numbered n={8} body={t('guideTour8')} />
        </ol>
      </Card>

      <Card step={5} title={t('guideStep5Title')}>
        <Para k="guideStep5Body" />
        <ul className="space-y-1">
          <Bullet body={t('guideWhistle45')} />
          <Bullet body={t('guideWhistle60')} />
          <Bullet body={t('guideWhistle75')} />
        </ul>
        <Figure file="play.png" alt={t('guideFigScoreAlt')} markers={FIG_PLAY} />
        <ol className="space-y-2">
          <Numbered n={1} label={t('guideStep5Pull')} body={t('guideStep5PullBody')} />
          <Numbered n={2} label={t('guideStep5Score')} body={t('guideStep5ScoreBody')} />
          <Numbered n={3} label={t('guideStep5Undo')} body={t('guideStep5UndoBody')} />
        </ol>
        <ul className="space-y-1">
          <Bullet label={t('guideStep5Clock')} body={t('guideStep5ClockBody')} />
        </ul>
      </Card>

      <Card step={6} title={t('guideStep6Title')}>
        <ul className="space-y-2">
          <Bullet label={t('guideStep6Green')} body={t('guideStep6GreenBody')} />
          <Bullet label={t('guideStep6Amber')} body={t('guideStep6AmberBody')} />
          <Bullet label={t('guideStep6Signal')} body={t('guideStep6SignalBody')} />
        </ul>
      </Card>

      <Card title={t('guideSignalsTitle')}>
        <Para k="guideSignalsIntro" />
        <ul className="space-y-2">
          <Bullet label={t('guideSignalHalf')} body={t('guideSignalHalfBody')} />
          <Bullet label={t('guideSignalPoint')} body={t('guideSignalPointBody')} />
          <Bullet label={t('guideSignalTimeout')} body={t('guideSignalTimeoutBody')} />
          <Bullet label={t('guideSignalWater')} body={t('guideSignalWaterBody')} />
          <Bullet label={t('guideSignalCall')} body={t('guideSignalCallBody')} />
          <Bullet label={t('guideSignalCap')} body={t('guideSignalCapBody')} />
        </ul>
      </Card>

      <Card step={7} title={t('guideStep7Title')}>
        <Para k="guideStep7Body" />
        <Para k="guideStep7Chip" />
        <Para k="guideStep7Rules" />
      </Card>

      <Card step={8} title={t('guideStep8Title')}>
        <ul className="space-y-2">
          <Bullet label={t('guideStep8Timeout')} body={t('guideStep8TimeoutBody')} />
          <Bullet label={t('guideStep8Half')} body={t('guideStep8HalfBody')} />
          <Bullet label={t('guideStep8Water')} body={t('guideStep8WaterBody')} />
          <Bullet label={t('guideStep8Cap')} body={t('guideStep8CapBody')} />
          <Bullet label={t('guideStep8Universe')} body={t('guideStep8UniverseBody')} />
        </ul>
      </Card>

      {/* Where the hydration-break rule actually comes from. Its own card rather
          than a longer step-8 bullet: the volunteer is the person the captains will
          ask "why are we stopping?", and the answer is a rule most players have
          never read (it lives in the WFDF Appendix, not the rules themselves). */}
      <Card title={t('guideWaterTitle')}>
        <Para k="guideWaterIntro" />
        <ul className="space-y-2">
          <Bullet label={t('guideWaterWho')} body={t('guideWaterWhoBody')} />
          <Bullet label={t('guideWaterAdjust')} body={t('guideWaterAdjustBody')} />
          <Bullet label={t('guideWaterPractice')} body={t('guideWaterPracticeBody')} />
          <Bullet label={t('guideWaterTimeouts')} body={t('guideWaterTimeoutsBody')} />
        </ul>
        <Para k="guideWaterYou" />
      </Card>

      <Card step={9} title={t('guideStep9Title')}>
        <Para k="guideStep9Body" />
        <Figure file="record.png" alt={t('guideFigRecordAlt')} />
        <ul className="space-y-2">
          <Bullet body={t('guideStep9Calls')} />
          <Bullet body={t('guideStep9Travel')} />
          <Bullet body={t('guideStep9Turn')} />
          <Bullet body={t('guideStep9Stoppage')} />
          <Bullet body={t('guideStep9Sotg')} />
          <Bullet body={t('guideStep9StoppageAnytime')} />
        </ul>
        {/* Log before Event: the event control lives inside the log dialog, so the
            list has to be introduced before the thing that sits in its header. */}
        <Para k="guideStep9Log" />
        <Para k="guideStep9Note" />
      </Card>

      <Card step={10} title={t('guideStep10Title')}>
        <Para k="guideStep10Body" />
        <Figure file="report.png" alt={t('guideFigReportAlt')} />
        <Para k="guideStep10Report" />
      </Card>

      <Card title={t('guideCheatTitle')}>
        <Definitions
          rows={[
            ['guideCheatTap', 'guideCheatTapDo'],
            ['guideCheatHold', 'guideCheatHoldDo'],
            ['guideCheatGreen', 'guideCheatGreenDo'],
            ['guideCheatAmber', 'guideCheatAmberDo'],
            ['guideCheatWhistle', 'guideCheatWhistleDo'],
            ['guideCheatChip', 'guideCheatChipDo'],
            ['guideCheatLocked', 'guideCheatLockedDo'],
          ]}
        />
      </Card>
    </GuidePage>
  );
}
