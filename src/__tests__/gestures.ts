import { act, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * The tap and the hold that `useLongPress` listens for, as a browser delivers them.
 *
 * jsdom fires exactly the events it is told to, so a test that only sends
 * pointerdown/pointerup is not a tap — a real pointer release is followed by a
 * `click`, and that click is what the hook now acts on (see useLongPress for why
 * it cannot be `pointerup`). Sending all three here keeps the sequence in one
 * place, so a test reads as the gesture it is describing.
 *
 * `hold` sends the click too: the browser emits one after a long press as well,
 * and the hook swallowing it is exactly the behaviour worth exercising.
 */
export function tap(el: Element) {
  fireEvent.pointerDown(el);
  fireEvent.pointerUp(el);
  fireEvent.click(el);
}

/** A press held past the long-press threshold. Requires fake timers. */
export function hold(el: Element, ms = 700) {
  fireEvent.pointerDown(el);
  act(() => void vi.advanceTimersByTime(ms));
  fireEvent.pointerUp(el);
  fireEvent.click(el);
}
