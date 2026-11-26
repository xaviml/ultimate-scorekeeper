/**
 * The YAML half of the Teams page, loaded on demand.
 *
 * js-yaml is only needed by the Teams page's YAML view, so it lives in a chunk of
 * its own rather than in the bundle every game loads. The catch is offline use: the
 * service worker caches a file the first time it is fetched, so a chunk fetched only
 * when the YAML view opens would be missing the first time that happens without
 * signal. `prefetchTeamsYaml` (called from main.tsx once the app is idle) fetches it
 * in the background on every start, so it is already cached by then.
 */
type TeamsYamlModule = typeof import('./teamsYaml');

let loading: Promise<TeamsYamlModule> | null = null;
let loaded: TeamsYamlModule | null = null;

export function loadTeamsYaml(): Promise<TeamsYamlModule> {
  loading ??= import('./teamsYaml').then((mod) => (loaded = mod));
  // A failed fetch (offline before it was ever cached) must not stick for the session.
  loading.catch(() => (loading = null));
  return loading;
}

/** The module, if it has already arrived — lets the page skip a render without it. */
export function teamsYamlLoaded(): TeamsYamlModule | null {
  return loaded;
}

export function prefetchTeamsYaml(): void {
  const start = () => void loadTeamsYaml().catch(() => {});
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(start);
  else window.setTimeout(start, 2000);
}
