// Replaces the __CACHE_VERSION__ placeholder in dist/sw.js with the build's
// version, so the service worker's bytes change on every deploy and browsers
// pick up the update instead of serving a stale app shell forever.
//
// It is the same string the About dialog shows (scripts/version.mjs), so the
// cache name in devtools names the build a bug report quotes.
import { readFileSync, writeFileSync } from 'node:fs';
import { appVersion } from './version.mjs';

const PLACEHOLDER = '__CACHE_VERSION__';
const swPath = new URL('../dist/sw.js', import.meta.url);

const contents = readFileSync(swPath, 'utf8');

// This step used to fail silently — the placeholder was mentioned twice (once
// in a comment) and `replace` only takes the first, so the cache name shipped
// unstamped. Fail the build instead: a wrong cache name is invisible until an
// old cache is serving an old app weeks later.
const occurrences = contents.split(PLACEHOLDER).length - 1;
if (occurrences !== 1) {
  throw new Error(
    `Expected exactly one ${PLACEHOLDER} in dist/sw.js, found ${occurrences}. ` +
      'The cache name would not be stamped; check public/sw.js.',
  );
}

writeFileSync(swPath, contents.replace(PLACEHOLDER, appVersion));
