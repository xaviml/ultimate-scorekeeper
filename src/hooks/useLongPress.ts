import { useCallback, useRef } from 'react';

/**
 * Tap = onTap, press-and-hold >= 600 ms = onLongPress.
 * Works for touch and mouse; movement cancels the press.
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

  const clear = useCallback(
    (fireTap: boolean) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (fireTap && !longFired.current) onTap();
    },
    [onTap],
  );

  return {
    onPointerDown: start,
    onPointerUp: () => clear(true),
    onPointerLeave: () => clear(false),
    onPointerCancel: () => clear(false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
