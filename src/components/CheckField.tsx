import type { ReactNode } from 'react';

/**
 * Every on/off control in the app, in the two shapes the app actually asks in.
 *
 * The native checkbox is still the control — `sr-only` rather than replaced — so a
 * screen reader, the keyboard (tab, then space) and `getByRole('checkbox')` all keep
 * working exactly as they did; the `<span>` beside it is decoration driven off
 * `peer-checked:`. A `role="checkbox"` div would have looked the same and broken all
 * three.
 *
 * Note the arbitrary child selectors (`peer-checked:[&>svg]`): `peer-*` compiles to a
 * sibling selector, so it can only reach the box itself — the tick and the knob live
 * inside it and have to be addressed through it.
 *
 * The whole row is the label, so the tap target is the width of the panel rather than
 * a 16px box — the same "one-handed on a phone in sunlight" rule the action row is
 * built to.
 *
 * - `switch` — a setting: "this game records X". Reads as a state you leave set,
 *   which is what the statistics section is a list of.
 * - `check` (default) — an answer to the question in front of you: was this a
 *   Callahan, replace the roster, was the other team hurt too.
 */
export function CheckField({
  label,
  checked,
  onChange,
  hint,
  variant = 'check',
  disabled = false,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Small print under the row, for a setting whose consequence isn't obvious from its name. */
  hint?: ReactNode;
  variant?: 'check' | 'switch';
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        className={`flex items-center gap-3 py-1 ${disabled ? 'opacity-40' : 'active:opacity-80'}`}
      >
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {variant === 'switch' ? <SwitchTrack /> : <CheckBox />}
        <span className="text-sm">{label}</span>
      </label>
      {hint && (
        <p className={`text-xs text-chalk/50 ${variant === 'switch' ? 'pl-14' : 'pl-9'}`}>{hint}</p>
      )}
    </div>
  );
}

const focusRing =
  'peer-focus-visible:ring-2 peer-focus-visible:ring-signal/70 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-pitch';

/**
 * The tick is always in the DOM and revealed by scale rather than mounted: a path
 * that is already there can transition, and the box filling while the tick springs
 * is what makes the toggle read as deliberate instead of instant-and-unnoticed.
 */
function CheckBox() {
  return (
    <span
      aria-hidden
      className={`shrink-0 w-6 h-6 rounded-md border-2 border-line bg-pitch flex items-center justify-center transition-colors peer-checked:bg-signal peer-checked:border-signal peer-checked:[&>svg]:scale-100 ${focusRing}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 text-pitch scale-0 transition-transform duration-150"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

/** Track and knob. The knob travels on `translate-x`, so only the transform animates. */
function SwitchTrack() {
  return (
    <span
      aria-hidden
      className={`shrink-0 w-11 h-6 rounded-full border-2 border-line bg-pitch px-[2px] flex items-center transition-colors peer-checked:bg-signal peer-checked:border-signal peer-checked:[&>span]:translate-x-[18px] peer-checked:[&>span]:bg-pitch ${focusRing}`}
    >
      <span className="w-4 h-4 rounded-full bg-chalk/50 transition-transform duration-150" />
    </span>
  );
}
