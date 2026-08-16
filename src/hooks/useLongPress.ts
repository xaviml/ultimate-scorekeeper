import { useCallback, useRef } from 'react';

/**
 * Tap = onTap, press-and-hold >= 600 ms = onLongPress.
 * Works for touch and mouse; movement cancels the press.
 *
 * The hold is armed on `pointerdown` and the tap fires on the real `click`, not on
 * `pointerup` — the two are not interchangeable on a touch screen. A browser
 * dispatches the compatibility `click` after `pointerup` and hit-tests it against
 * the DOM *as it is then*, so a tap that opens a dialog on `pointerup` gets its own
 * click delivered to whatever the dialog just put under the finger. That is not
 * hypothetical: Turn opened TurnoverDialog as a bottom sheet whose Save button
 * overlapped the bottom edge of Turn, so a low thumb recorded the turnover and
 * dismissed the dialog in one tap (Modal.tsx guards the same ghost click for the
 * backdrop). Firing on `click` puts the handler after the event instead of before
 * it, which is why every button on the row without a hold was already immune.
 *
 * Two things fall out of it. A press that ends off the element never produces a
 * click there, so "movement cancels the press" now holds for touch as well, where
 * implicit pointer capture had been delivering `pointerup` to the original target
 * regardless. And a keyboard Enter/Space is a click with no pointer events at all,
 * so these buttons stop being pointer-only.
 */
export function useLongPress(onTap: () => void, onLongPress: () => void, ms = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);

  const start = useCallback(() => {
    longFired.current = false;
    timer.current = setTimeout(() => {
      longFired.current = true;
      onLongPress();
    }, ms);
  }, [onLongPress, ms]);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    // The hold has already acted by the time its click arrives, so it swallows it.
    // Reset here as well as on the next press: a hold released off the element
    // produces no click, and the flag must not outlive it.
    onClick: () => {
      if (!longFired.current) onTap();
      longFired.current = false;
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
