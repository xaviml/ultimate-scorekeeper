// Replaces the __CACHE_VERSION__ placeholder in dist/sw.js with the current
// commit sha, so the service worker's bytes change on every deploy and
// browsers pick up the update instead of serving a stale app shell forever.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const swPath = new URL('../dist/sw.js', import.meta.url);

const version = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return String(Date.now());
  }
})();

const contents = readFileSync(swPath, 'utf8');
writeFileSync(swPath, contents.replace('__CACHE_VERSION__', version));
