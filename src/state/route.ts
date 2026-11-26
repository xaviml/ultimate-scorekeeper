/**
 * The app's pages and their addresses.
 *
 * Hash addresses (`#/history`) rather than paths (`/history`): the app is static
 * files on GitHub Pages behind a service worker, and a path would 404 on a reload
 * there (Pages has no fallback to index.html) and need the worker to answer every
 * navigation offline. A hash never leaves the page, so every address works on a
 * reload, offline and under the Pages base path with nothing else to configure.
 */
export type Route =
  | { name: 'setup' }
  | { name: 'game' }
  | { name: 'report' }
  | { name: 'history' }
  | { name: 'historyGame'; id: string }
  | { name: 'teams' }
  | { name: 'guide' }
  | { name: 'statsGuide' };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  if (path === '/game') return { name: 'game' };
  if (path === '/report') return { name: 'report' };
  if (path === '/history') return { name: 'history' };
  if (path.startsWith('/history/')) {
    const id = decodeURIComponent(path.slice('/history/'.length));
    if (id) return { name: 'historyGame', id };
  }
  if (path === '/teams') return { name: 'teams' };
  if (path === '/guide') return { name: 'guide' };
  if (path === '/guide/advanced') return { name: 'statsGuide' };
  return { name: 'setup' };
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case 'setup':
      return '#/';
    case 'game':
      return '#/game';
    case 'report':
      return '#/report';
    case 'history':
      return '#/history';
    case 'historyGame':
      return `#/history/${encodeURIComponent(route.id)}`;
    case 'teams':
      return '#/teams';
    case 'guide':
      return '#/guide';
    case 'statsGuide':
      return '#/guide/advanced';
  }
}

/** The page a game in this phase lives on. */
export function phaseRoute(phase: 'config' | 'game' | 'report'): Route {
  return phase === 'game'
    ? { name: 'game' }
    : phase === 'report'
      ? { name: 'report' }
      : { name: 'setup' };
}
