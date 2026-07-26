import { useEffect, useRef, useState } from 'react';
import {
  ACTIVE_MS,
  MAX_QUEUED,
  QUEUED_MS,
  nextOccurrence,
  supersedes,
  type Occurrence,
  type OccurrenceKeys,
} from '../state/assistOccurrence';
import type { GameState } from '../state/types';

/**
 * The one message on screen right now, and the short queue behind it.
 *
 * Before this, the call-out and the hand signal were two independent transients that
 * each keyed off the current state: a newer event simply overwrote whatever was up,
 * so a message three seconds into its seven was gone unheard. Now events wait their
 * turn — with two escapes, because "never lose a message" and "say the urgent thing
 * now" are both real:
 *
 * - a higher tier preempts, and what it interrupted goes back to the *front* of the
 *   queue rather than being dropped (see AssistTier);
 * - a designed follow-up replaces outright (see SUPERSEDES) — it was already timed
 *   to land where it lands, so queueing it would undo the stagger.
 *
 * Nothing here touches the game clocks. A call's discussion timer, the pull count and
 * the whistle audio all run off TICK in the reducer regardless of what is displayed —
 * so a queued message can briefly describe a moment the game has already left, which
 * is what `stillRelevant` is for.
 */
export function useAssistQueue(state: GameState): Occurrence | null {
  const [active, setActive] = useState<Occurrence | null>(null);
  // Everything the timers touch lives in refs: the setTimeout callbacks outlive the
  // render that created them, and only ever read the latest values through these.
  const activeRef = useRef<Occurrence | null>(null);
  const queue = useRef<Occurrence[]>([]);
  const keys = useRef<OccurrenceKeys>({ assistKey: null, whistleKey: null });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    // Function declarations, so `show` can call `advance` and vice versa. Re-created
    // on every state change, which is harmless — they read refs only.
    function show(item: Occurrence | null, ms: number) {
      activeRef.current = item;
      setActive(item);
      if (timer.current) clearTimeout(timer.current);
      timer.current = item ? setTimeout(advance, ms) : null;
    }

    /** Hand the screen to the next message still worth showing, or clear it. */
    function advance() {
      const s = stateRef.current;
      let next = queue.current.shift();
      while (next && !next.stillRelevant(s)) next = queue.current.shift();
      show(next ?? null, QUEUED_MS);
    }

    /**
     * Keep the backlog short enough that the bar is still talking about this point.
     * The oldest of the lowest tier present goes first — routine news gives way to a
     * call, and a call to an injury.
     */
    function trim() {
      while (queue.current.length > MAX_QUEUED) {
        const lowest = Math.min(...queue.current.map((q) => q.tier));
        queue.current.splice(
          queue.current.findIndex((q) => q.tier === lowest),
          1,
        );
      }
    }

    const { keys: seen, occurrence } = nextOccurrence(state, keys.current);
    keys.current = seen;
    if (!occurrence) return;

    const current = activeRef.current;
    if (!current) {
      show(occurrence, ACTIVE_MS);
      return;
    }
    if (supersedes(occurrence, current)) {
      show(occurrence, ACTIVE_MS);
      return;
    }
    if (occurrence.tier > current.tier) {
      queue.current.unshift(current);
      trim();
      show(occurrence, ACTIVE_MS);
      return;
    }
    queue.current.push(occurrence);
    trim();
  }, [state]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return active;
}
