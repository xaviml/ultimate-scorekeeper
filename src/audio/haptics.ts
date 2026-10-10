import { loadVibrationEnabled } from '../state/uiPreferences';

/*
 * What a tap on Turn or Pass feels like, for the volunteer who is watching the
 * disc rather than the phone. The language is a count of pulses, the same on every
 * phone that can give one:
 *
 * - `tap` (1) — the tap landed: a turnover or a pass was recorded.
 * - `undo` (2) — the hold took the last one back.
 * - `refused` (3) — nothing happened, and the screen says why.
 *
 * A count rather than lengths because iPhones can only tick (see below), and one
 * vocabulary for both platforms is what lets a squad share a habit.
 *
 * Android gets the Vibration API. iOS has never shipped it, but Safari 18 plays a
 * system haptic when a `<input type="checkbox" switch>` is toggled — so a hidden
 * one is toggled through its label, once per pulse. That is an undocumented side
 * effect, and the day Apple removes it an iPhone simply goes back to feeling
 * nothing; nothing else depends on it.
 *
 * Android's own long-press tick still arrives on a hold, a little before `undo`:
 * the browser plays it when it recognises the gesture, and a page cannot turn it off.
 */
export type Haptic = 'tap' | 'undo' | 'refused';

const PULSES: Record<Haptic, number> = { tap: 1, undo: 2, refused: 3 };

// Long enough to be felt on most Android motors, short
// enough that three still read as three rather than one long buzz.
const PULSE_MS = 35;
const GAP_MS = 90;
// The iOS tick has a fixed length of its own; this is only the spacing between two.
const IOS_GAP_MS = 120;

export function haptic(kind: Haptic): void {
  if (!loadVibrationEnabled()) return;
  const pulses = PULSES[kind];
  try {
    if (typeof navigator.vibrate === 'function') {
      const pattern: number[] = [];
      for (let i = 0; i < pulses; i++) pattern.push(...(i ? [GAP_MS, PULSE_MS] : [PULSE_MS]));
      navigator.vibrate(pattern);
      return;
    }
    // Only a touch screen can be an iPhone, and only there is it worth putting
    // anything into the DOM (desktop Safari has no vibrate either).
    if (typeof window.matchMedia !== 'function' || !matchMedia('(pointer: coarse)').matches) return;
    for (let i = 0; i < pulses; i++) {
      if (i === 0) iosTick();
      else setTimeout(iosTick, i * IOS_GAP_MS);
    }
  } catch {
    // Feedback is a nicety: a browser that objects just stays still.
  }
}

/** One system haptic on iOS 18+, by toggling a throwaway switch. */
function iosTick(): void {
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.appendChild(input);
  // In <head>, outside the React root, so the click cannot reach a React handler.
  document.head.appendChild(label);
  label.click();
  label.remove();
}
