import { useCallback, useEffect, useRef } from 'react';

/**
 * Intercepts the phone/browser back gesture while `active`. A routerless PWA has
 * nothing of its own on the history stack, so a back-press otherwise leaves the
 * app immediately with no chance to react (the `beforeunload` prompt does not
 * fire for it, and a script can't force a real tab/app exit on confirm either —
 * browsers reserve that for a directly user-initiated gesture). Pushing one
 * entry on activation turns the press into a `popstate` we can catch instead.
 *
 * There are two shapes of "handle back", and they differ in one decision:
 *
 * - **Stay and confirm** (an in-progress game): the press must be absorbed and
 *   the screen must stay guarded, so `onBack` calls `stay()` to re-push the
 *   entry, then opens a dialog. When the user finally commits, call the returned
 *   `resolve()` to consume the entry so the history stack is left clean.
 * - **Complete and land** (a sub-screen like the guide): `onBack` just switches
 *   screens and does NOT call `stay()`; the press already popped our entry, so
 *   we land on the previous screen with nothing left behind. If that same screen
 *   can also be closed by an in-app button (not the gesture), call `resolve()`
 *   there to drop the still-pending entry — it is a no-op when nothing is armed.
 *
 * StrictMode-safety: the armed/suppress bookkeeping lives in a ref (survives the
 * dev-only mount→cleanup→mount replay), and this hook NEVER calls `history.back()`
 * from an effect or its cleanup — only `resolve()` does, and only ever from a
 * user gesture. That is deliberate: a `history.back()` in cleanup fires its
 * `popstate` asynchronously, after the replayed mount's listener is already
 * attached, which the listener would misread as a real back-press and fire
 * `onBack` on mount. Keeping every `back()` out of the effect removes that race.
 */
export function useBackGuard(
  active: boolean,
  onBack: (api: { stay: () => void }) => void,
): () => void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  // `armed`: we currently own one pushed entry. `suppress`: the next popstate is
  // the echo of our own resolve()/back() and must not be treated as a back-press.
  const st = useRef({ armed: false, suppress: false });

  const arm = useCallback(() => {
    if (st.current.armed) return;
    st.current.armed = true;
    history.pushState({ backGuard: true }, '');
  }, []);

  const resolve = useCallback(() => {
    if (!st.current.armed) return;
    st.current.armed = false;
    st.current.suppress = true;
    history.back();
  }, []);

  useEffect(() => {
    if (!active) return;
    // Clear any suppression stranded by a resolve() whose echo popstate landed
    // with no listener around (e.g. the screen closed via its own button). A
    // fresh activation must start listening for real presses again.
    st.current.suppress = false;
    arm();
    const onPopState = () => {
      if (st.current.suppress) {
        st.current.suppress = false;
        return;
      }
      // The browser consumed our entry to fire this; we no longer own one.
      st.current.armed = false;
      onBackRef.current({ stay: arm });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [active, arm]);

  return resolve;
}
