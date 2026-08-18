import { useT } from '../i18n/useT';
import type { GenderSplit, LineComposition as Composition, LineIssue } from '../state/lines';

/**
 * The counters over a line being picked: how many are on, and how the markings sit
 * against the split this point asks for.
 *
 * Props-driven and stateless, so the dialog owns the selection and this only reports
 * on it. It goes amber rather than red, and it never disables anything: the whole
 * point of the warning is that the volunteer can still record the line that actually
 * took the field (see `lineIssues`). Amber is the app's "read this" colour — the same
 * one the ambient status line and the play-advance buttons use.
 *
 * **A null `size` is the target-less form**, used by the predefined-line editor: a
 * template is a pool to draw a line from, not a line, so it is counted rather than
 * measured — no "of 7", no issues, and the markings shown as plain totals via
 * `showGender` instead of as `have/want`. Counting is still worth doing there, which
 * is the whole reason the mode exists: a squad's split is what a coach is balancing
 * while they build the pool.
 */
export function LineComposition({
  size,
  composition,
  expected,
  showGender,
  issues,
}: {
  /** The size the line is checked against, or null for a template with no target. */
  size: number | null;
  composition: Composition;
  expected: GenderSplit | null;
  /** Show bare MMP/FMP totals when there is no split to measure them against. */
  showGender?: boolean;
  issues: LineIssue[];
}) {
  const { t } = useT();
  const off = issues.length > 0;
  const sizeOff = issues.includes('size');
  const ratioOff = issues.includes('ratio');

  return (
    <div
      // The dialog's tests read the state off here rather than off the wording, the
      // same way the possession rule exposes data-possession.
      data-line-issues={issues.join(' ')}
      className={`rounded-lg border px-3 py-2 ${
        off ? 'border-signal bg-signal/10' : 'border-line bg-pitch'
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-board text-sm">
        <span className={sizeOff ? 'text-signal' : undefined}>
          {size === null
            ? t('lineCountPlain', { count: composition.size })
            : t('lineCountOf', { count: composition.size, size })}
        </span>
        {expected ? (
          <>
            <Counter
              label={t('genderFmp')}
              have={composition.female}
              want={expected.female}
              off={ratioOff && composition.female > expected.female}
            />
            <Counter
              label={t('genderMmp')}
              have={composition.male}
              want={expected.male}
              off={ratioOff && composition.male > expected.male}
            />
          </>
        ) : (
          showGender && (
            <>
              <Counter label={t('genderFmp')} have={composition.female} />
              <Counter label={t('genderMmp')} have={composition.male} />
            </>
          )
        )}
        {/* Unmarked players are counted but never faulted — the split is unknown,
            not wrong. Saying so is what stops the count looking like it lost people. */}
        {composition.unknown > 0 && (
          <span className="text-xs text-chalk/50">
            {t('lineUnmarked', { count: composition.unknown })}
          </span>
        )}
      </div>
      {off && (
        <p className="pt-1 text-xs leading-snug text-signal">
          {sizeOff && size !== null && t('lineIssueSize', { count: composition.size, size })}
          {sizeOff && ratioOff && ' '}
          {ratioOff &&
            expected &&
            t('lineIssueRatio', { female: expected.female, male: expected.male })}
        </p>
      )}
    </div>
  );
}

/** `FMP 4/3` against a target, or a bare `FMP 4` when there is nothing to hit. */
function Counter({
  label,
  have,
  want,
  off,
}: {
  label: string;
  have: number;
  want?: number;
  off?: boolean;
}) {
  return (
    <span className={off ? 'text-signal' : undefined}>
      <span className="text-xs text-chalk/60">{label} </span>
      {have}
      {want !== undefined && <span className="text-chalk/40">/{want}</span>}
    </span>
  );
}
