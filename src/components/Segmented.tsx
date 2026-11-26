import { useId, type ReactNode } from 'react';
import { fieldLabel, hintText } from './ui';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

/**
 * A choice between a few short options, all on screen at once — what a `<select>`
 * of two or three entries was hiding behind a second tap. Built from buttons with
 * radio semantics (`radiogroup` named by the visible label), so a screen reader
 * hears "Division, radio group, Mixed, selected".
 *
 * The label sits directly in the wrapper, next to the group, so the markup reads
 * the same as the `<label>` + field pairs around it. Tests find a segment by its
 * `data-value`, which never depends on the language.
 *
 * `equal` (the default) gives every segment the same width — the tidy look for
 * options of similar length. Off, each takes the room its words need, for a row
 * like the CAP choice where "+1" sits beside "Conditional".
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  equal = true,
  labelHidden = false,
}: {
  label: ReactNode;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  hint?: ReactNode;
  equal?: boolean;
  /**
   * Keeps the label for a screen reader only, where the options already say what
   * the choice is about on sight — the report's team filter and stats views.
   */
  labelHidden?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <span id={id} className={labelHidden ? 'sr-only' : fieldLabel}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="flex gap-1 p-1 h-[42px] rounded-md bg-pitch border border-line"
      >
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              data-value={o.value}
              className={`${equal ? 'flex-1 basis-0' : 'flex-auto'} min-w-0 flex items-center justify-center gap-1.5 rounded px-2 text-sm font-board font-semibold transition-colors ${
                on ? 'bg-accent text-panel shadow-sm' : 'text-chalk/70 active:bg-panel'
              }`}
              onClick={() => onChange(o.value)}
            >
              <span className="truncate">{o.label}</span>
            </button>
          );
        })}
      </div>
      {hint && <p className={hintText}>{hint}</p>}
    </div>
  );
}
