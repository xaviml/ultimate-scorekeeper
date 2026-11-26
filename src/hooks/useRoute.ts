import { useMemo, useSyncExternalStore } from 'react';
import { parseRoute, routeHash, type Route } from '../state/route';

/**
 * The browser's history is the app's history: every page is an entry, so the phone's
 * back gesture and the browser's back button move between pages the way they do on
 * any website. Each entry the app writes carries `idx`, its depth from the first
 * entry the app owns — which is always the setup page (see `seedHistory`). That is
 * what lets an in-app "back" button behave exactly like the browser's when there is
 * somewhere to go back to, and fall back to a sensible page when the address was
 * opened directly.
 *
 * `pushState` and `replaceState` fire no event of their own, so writes notify the
 * subscribers here by hand; the browser's own moves arrive as `popstate`.
 */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Set by `home()`: the traversal it started should land on the setup page. */
let homing = false;

function onPop() {
  if (homing) {
    homing = false;
    if (location.hash !== routeHash({ name: 'setup' })) {
      history.replaceState({ idx: 0 }, '', routeHash({ name: 'setup' }));
    }
  }
  notify();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', notify);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', notify);
    }
  };
}

const getHash = () => location.hash;

/** How deep the current entry is in the app's own history (0 = the setup page under everything). */
function depth(): number {
  const idx = (history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' ? idx : 0;
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, getHash);
  return useMemo(() => parseRoute(hash), [hash]);
}

/** Goes to a page, as a new history entry unless `replace`. Going where you already are does nothing. */
export function navigate(route: Route, { replace = false }: { replace?: boolean } = {}): void {
  const hash = routeHash(route);
  if (replace) {
    history.replaceState({ idx: depth() }, '', hash);
  } else {
    if (location.hash === hash) return;
    history.pushState({ idx: depth() + 1 }, '', hash);
  }
  notify();
}

/**
 * An in-app back button: the browser's back when the app has an entry to go back to,
 * otherwise (an address opened directly, a fresh tab) a replace to `fallback`, so the
 * button never leaves the app.
 */
export function back(fallback: Route): void {
  if (depth() > 0) history.back();
  else navigate(fallback, { replace: true });
}

/**
 * Back to the setup page and to the bottom of the app's history, as if every page
 * since had been backed out of — so after leaving a game, the back gesture leaves
 * the app rather than walking back through a game that no longer exists.
 */
export function home(): void {
  const d = depth();
  if (d > 0) {
    homing = true;
    history.go(-d);
  } else {
    navigate({ name: 'setup' }, { replace: true });
  }
}

/** Puts back the entry the browser just left — used when a back gesture has to be asked about first. */
export function undoBack(): void {
  history.forward();
}

/**
 * Makes sure the app's own pages sit under whatever page it opened on. A fresh entry
 * (a new tab, an address typed or shared) has no `idx`: it is rewritten as the setup
 * page and `stack` — the pages that lead to the one opened, ending with it — is pushed
 * on top, so the back gesture from a page opened directly walks back through the app
 * instead of leaving it. A reload keeps its `idx` (history state survives a reload)
 * and is left as it was, unless it names a page the game is not on, in which case
 * the right one is pushed over it.
 */
export function seedHistory(stack: Route[]): void {
  const start = stack[stack.length - 1] ?? { name: 'setup' };
  if (typeof (history.state as { idx?: unknown } | null)?.idx === 'number') {
    if (routeHash(parseRoute(location.hash)) !== routeHash(start)) navigate(start);
    return;
  }
  history.replaceState({ idx: 0 }, '', routeHash({ name: 'setup' }));
  stack.forEach((route, i) => history.pushState({ idx: i + 1 }, '', routeHash(route)));
  notify();
}
