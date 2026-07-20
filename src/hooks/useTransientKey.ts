import { useEffect, useState } from 'react';

/**
 * True while `key` is still "fresh".
 *
 * Every distinct key restarts the clock; after `ms` the result goes false and
 * stays false until a new key arrives. Pass `null` for "nothing to show".
 *
 * The key must identify the *occurrence*, not the content — two goals in a row
 * produce the same assist message, and only a key that changes between them will
 * re-show it. Shared by the hand signal and its call-out so the two appear and
 * disappear together.
 */
export function useTransientKey(key: string | null, ms: number): boolean {
  const [fresh, setFresh] = useState<string | null>(null);

  useEffect(() => {
    if (key === null) return;
    setFresh(key);
    const id = setTimeout(() => setFresh(null), ms);
    return () => clearTimeout(id);
  }, [key, ms]);

  return key !== null && fresh === key;
}
