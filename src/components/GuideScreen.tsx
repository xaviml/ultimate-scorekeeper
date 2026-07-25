import { useEffect } from 'react';
import { useT, type Dict, type Lang } from '../i18n/useT';
import { primaryButton, sectionTitle } from './ui';

type Key = keyof Dict;

/**
 * A point on a screenshot, in percentages of the image box, so a marker keeps
 * sitting on the right button whatever width the figure is rendered at.
 *
 * The numbers come from the capture script (scripts/guide-screenshots.mjs),
 * which reads the real bounding boxes out of the running app — re-run it after
 * any layout change to these screens and paste the values it prints back here.
 */
type Marker = readonly [x: number, y: number];

const FIG_SETUP: readonly Marker[] = [
  [5.1, 30],
  [6.9, 48.9],
  [5.8, 59.1],
  [10.1, 84.9],
  [28.1, 94.6],
];
const FIG_TOSS: readonly Marker[] = [
  [5.1, 41.8],
  [5.1, 63.5],
  [5.1, 85.3],
];
const FIG_DASHBOARD: readonly Marker[] = [
  [28, 2.8],
  [89, 54.9],
  [32.1, 11.7],
  [10.6, 72.6],
  [46.7, 79],
  [63.4, 89.5],
  [92, 96.7],
  [49.5, 82.5],
];
const FIG_PLAY: readonly Marker[] = [
  [10.6, 72.6],
  [15, 23.3],
  [42.5, 56.1],
];

/** Public/ assets: built via BASE_URL so they survive the GitHub Pages base path. */
const asset = (file: string) => `${import.meta.env.BASE_URL}guide/${file}`;

const markerClass =
  'absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-signal text-pitch font-clock text-sm font-bold ring-2 ring-pitch shadow-lg';

const badgeClass =
  'shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-signal text-pitch font-clock text-sm font-bold';

/**
 * A screenshot with numbered pointers on it. The captions are NOT baked into the
 * image — they are the numbered list rendered next to it, so the picture can stay
 * English-only (and shared across languages) while the explanations translate.
 */
function Figure({
  file,
  alt,
  markers = [],
}: {
  file: string;
  alt: string;
  markers?: readonly Marker[];
}) {
  return (
    <figure className="relative mx-auto w-full max-w-[20rem] rounded-xl overflow-hidden border border-line">
      <img src={asset(file)} alt={alt} className="block w-full" loading="lazy" />
      {markers.map(([x, y], i) => (
        <span
          key={i}
          aria-hidden="true"
          className={markerClass}
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          {i + 1}
        </span>
      ))}
    </figure>
  );
}

/** An item of the list a Figure's markers point at — numbered to match them. */
function Numbered({ n, label, body }: { n: number; label?: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className={badgeClass}>{n}</span>
      <p className="text-sm text-chalk/80 leading-snug">
        {label && <span className="font-board text-chalk">{label} — </span>}
        {body}
      </p>
    </li>
  );
}

/** A plain point, for lists that nothing on a screenshot points at. */
function Bullet({ label, body }: { label?: string; body: string }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden="true" className="text-signal leading-snug">
        ▸
      </span>
      <p className="text-sm text-chalk/80 leading-snug">
        {label && <span className="font-board text-chalk">{label} — </span>}
        {body}
      </p>
    </li>
  );
}

function Card({
  step,
  title,
  children,
}: {
  step?: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-panel border border-line p-4 space-y-3">
      <h2 className="flex items-center gap-2">
        {step !== undefined && <span className={badgeClass}>{step}</span>}
        <span className={sectionTitle}>{title}</span>
      </h2>
      {children}
    </section>
  );
}

function Para({ k }: { k: Key }) {
  const { t } = useT();
  return <p className="text-sm text-chalk/80 leading-snug">{t(k)}</p>;
}

export default function GuideScreen({ onBack }: { onBack: () => void }) {
  const { t, lang, setLang } = useT();

  // Opened from a link partway down a long config screen, so without this the
  // guide would open already scrolled into the middle of itself.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-dvh bg-pitch text-chalk p-4 pb-10 max-w-2xl mx-auto space-y-4">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="font-board text-2xl font-bold">{t('guideTitle')}</h1>
          <p className="text-chalk/50 text-sm">{t('guideSubtitle')}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <select
            aria-label={t('language')}
            className="rounded-lg bg-panel border border-line px-2 py-1"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="ca">CA</option>
          </select>
          <button
            type="button"
            className="rounded-lg bg-panel border border-line px-3 py-1 text-sm text-chalk/70 whitespace-nowrap"
            onClick={onBack}
          >
            ← {t('guideBackShort')}
          </button>
        </div>
      </header>

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
          <Numbered n={5} label={t('guideStep1Players')} body={t('guideStep1PlayersBody')} />
        </ol>
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
          <Bullet label={t('guideStep8Cap')} body={t('guideStep8CapBody')} />
          <Bullet label={t('guideStep8Universe')} body={t('guideStep8UniverseBody')} />
        </ul>
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
        <dl className="divide-y divide-line/50 text-sm">
          {(
            [
              ['guideCheatTap', 'guideCheatTapDo'],
              ['guideCheatHold', 'guideCheatHoldDo'],
              ['guideCheatGreen', 'guideCheatGreenDo'],
              ['guideCheatAmber', 'guideCheatAmberDo'],
              ['guideCheatWhistle', 'guideCheatWhistleDo'],
              ['guideCheatChip', 'guideCheatChipDo'],
              ['guideCheatLocked', 'guideCheatLockedDo'],
            ] as const
          ).map(([term, def]) => (
            <div key={term} className="grid grid-cols-2 gap-3 py-2">
              <dt className="font-board text-chalk">{t(term)}</dt>
              <dd className="text-chalk/80">{t(def)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="text-xs text-chalk/50 text-center">{t('guideScreenshotNote')}</p>

      <button type="button" className={`${primaryButton} w-full`} onClick={onBack}>
        {t('guideBack')}
      </button>
    </div>
  );
}
