import { PageHeader } from './PageHeader';
import { useEffect } from 'react';
import { useT, type Dict } from '../i18n/useT';
import { specSection, specTitle } from './ui';

/**
 * The pieces both walkthroughs are built from — the numbered screenshot, the
 * numbered and bulleted lists, the card, and the page shell around them.
 *
 * They were `GuideScreen`'s own until there were two guides (the first-timer's
 * walkthrough and the statistics one), which have to look like two chapters of
 * the same book rather than two pages that happen to be in the same app: same
 * marker badges, same figure frame, same header with the language picker in it.
 * Shared here rather than by one screen importing the other, since neither is
 * the parent of the other.
 */

type Key = keyof Dict;

/**
 * A point on a screenshot, in percentages of the image box, so a marker keeps
 * sitting on the right button whatever width the figure is rendered at.
 *
 * The numbers come from the capture scripts (scripts/guide-screenshots.mjs and
 * scripts/stats-guide-screenshots.mjs), which read the real bounding boxes out
 * of the running app — re-run the matching one after any layout change to these
 * screens and paste the values it prints back into the screen that uses them.
 */
export type Marker = readonly [x: number, y: number];

/** Public/ assets: built via BASE_URL so they survive the GitHub Pages base path. */
const asset = (file: string) => `${import.meta.env.BASE_URL}guide/${file}`;

const markerClass =
  'absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-accent text-pitch font-clock text-sm font-bold ring-2 ring-pitch shadow-lg';

const badgeClass =
  'shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-accent text-pitch font-clock text-sm font-bold';

/**
 * A screenshot with numbered pointers on it. The captions are NOT baked into the
 * image — they are the numbered list rendered next to it, so the picture can stay
 * English-only (and shared across languages) while the explanations translate.
 */
export function Figure({
  file,
  alt,
  markers = [],
  /**
   * Widens the frame past the phone-screenshot default. A crop of one strip of the
   * UI (the live-stats slot, say) is a wide, short picture: at 20rem it is a band
   * of illegible 9px labels, which is exactly the thing being explained.
   */
  wide,
}: {
  file: string;
  alt: string;
  markers?: readonly Marker[];
  wide?: boolean;
}) {
  return (
    <figure
      className={`relative mx-auto w-full ${
        wide ? 'max-w-[28rem]' : 'max-w-[20rem]'
      } rounded overflow-hidden border border-line`}
    >
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
export function Numbered({ n, label, body }: { n: number; label?: string; body: string }) {
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
export function Bullet({ label, body }: { label?: string; body: string }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden="true" className="text-accent leading-snug">
        ▸
      </span>
      <p className="text-sm text-chalk/80 leading-snug">
        {label && <span className="font-board text-chalk">{label} — </span>}
        {body}
      </p>
    </li>
  );
}

export function Card({
  step,
  title,
  children,
}: {
  step?: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={specSection}>
      <h2 className="flex items-center gap-2">
        {step !== undefined && <span className={badgeClass}>{step}</span>}
        <span className={specTitle}>{title}</span>
      </h2>
      {children}
    </section>
  );
}

export function Para({ k }: { k: Key }) {
  const { t } = useT();
  return <p className="text-sm text-chalk/80 leading-snug">{t(k)}</p>;
}

/** A two-column definition list — the "quick reference" both guides close on. */
export function Definitions({ rows }: { rows: readonly (readonly [Key, Key])[] }) {
  const { t } = useT();
  return (
    <dl className="divide-y divide-line/50 text-sm">
      {rows.map(([term, def]) => (
        <div key={term} className="grid grid-cols-2 gap-3 py-2">
          <dt className="font-board text-chalk">{t(term)}</dt>
          <dd className="text-chalk/80">{t(def)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The shell every guide page shares: the page header (the way back, the title, the
 * menu — where Settings changes the language), the subtitle under it, and the note
 * that the pictures are English whatever language the text is in.
 *
 * The back arrow is named neutrally on purpose — these pages are reached from more
 * than one place, so naming a destination would be a lie from one of them. There is
 * no second button at the bottom for the same reason.
 */
export function GuidePage({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const { t } = useT();

  // Opened from a link partway down a long screen, so without this the guide
  // would open already scrolled into the middle of itself.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-dvh bg-pitch text-chalk p-4 pb-10 max-w-2xl mx-auto space-y-4">
      <PageHeader title={title} backLabel={t('guideBackShort')} onBack={onBack} />
      <p className="text-chalk/60 text-sm">{subtitle}</p>

      {children}

      <p className="text-xs text-chalk/50 text-center">{t('guideScreenshotNote')}</p>
    </div>
  );
}
