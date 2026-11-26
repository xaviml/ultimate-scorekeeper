import type { ChangeEvent } from 'react';
import { useT } from '../i18n/useT';
import { MinusIcon, PlusIcon } from './icons';

/**
 * A number with − and + either side and its unit beside it: "−  100 min  +". The
 * middle is still a real text input, so a big jump (15 → 100) is typed rather than
 * tapped out, and everything about typing — the draft held while half-typed, the
 * clamp on blur — stays with the caller (`numberFieldProps` in ConfigScreen). The
 * buttons commit straight away, clamped to the bounds, and fade at either end.
 */
export function Stepper({
  label,
  input,
  value,
  min,
  max,
  step = 1,
  unit,
  onStep,
}: {
  /** The field's name, for the two buttons' accessible names. */
  label: string;
  input: {
    value: string;
    inputMode: 'numeric';
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    id?: string;
  };
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onStep: (next: number) => void;
}) {
  const { t } = useT();
  const nudge = (dir: 1 | -1) => {
    // Off-step values (a template's 75 s with a 15 s step is fine, but a typed 80
    // is not) land on the next multiple in that direction, so the steps stay round.
    const snapped = dir > 0 ? Math.floor(value / step) * step : Math.ceil(value / step) * step;
    onStep(Math.min(max, Math.max(min, snapped + dir * step)));
  };
  const button =
    'w-10 shrink-0 flex items-center justify-center text-accent active:bg-pitch disabled:opacity-40 disabled:active:bg-transparent';
  return (
    <div className="flex h-[42px] rounded-md border border-line bg-panel overflow-hidden focus-within:border-accent">
      <button
        type="button"
        className={button}
        aria-label={t('stepDown', { label })}
        disabled={value <= min}
        onClick={() => nudge(-1)}
      >
        <MinusIcon size="w-4 h-4" />
      </button>
      <label className="flex-1 min-w-0 self-center flex items-baseline justify-center gap-1 cursor-text">
        <input
          {...input}
          aria-label={label}
          className="min-w-0 bg-transparent text-center font-clock text-xl font-semibold text-chalk focus:outline-none"
          // As wide as what is in it, so the unit sits right after the number
          // rather than at the far edge of an input stretched to the whole box.
          style={{ width: `${Math.max(2, input.value.length) + 0.5}ch` }}
        />
        {unit && <span className="text-xs text-chalk/50">{unit}</span>}
      </label>
      <button
        type="button"
        className={button}
        aria-label={t('stepUp', { label })}
        disabled={value >= max}
        onClick={() => nudge(1)}
      >
        <PlusIcon size="w-4 h-4" />
      </button>
    </div>
  );
}
