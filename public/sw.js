// Minimal app-shell service worker. Static assets are cached on first load;
// game state is intentionally NEVER persisted (in-memory only, per spec).
//
// The version placeholder below is stamped in by scripts/stamp-sw-version.mjs
// after every build, so this file's bytes differ per deploy — that's what makes
// browsers notice there's a new service worker to install, and what makes
// `activate` drop the previous deploy's cache instead of keeping it forever.
//
// The placeholder token is deliberately written nowhere else in this file: the
// stamper replaces the first occurrence, so a second mention (in a comment,
// say) would silently eat the stamp and leave the cache name constant.
const CACHE = 'scorekeeper-__CACHE_VERSION__';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Navigation requests (the app shell) go network-first: the HTML references
  // hashed asset filenames that change every build, so a stale cached shell
  // would point at assets that no longer exist. Hashed assets themselves are
  // safe to serve cache-first below, since a new build never reuses a name.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request)),
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        }),
    ),
  );
});
