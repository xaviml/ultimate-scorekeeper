// The one place the build's version string is computed. Both consumers read it
// from here so the version the About dialog shows and the service worker's
// cache name can never disagree — which is the point of showing it at all: a
// bug report carries the exact code the phone is running.
//
// CalVer plus the short sha: the date says how stale a device is, the sha says
// exactly which commit. It is the *commit* date, not the build date, so
// re-running the deploy over unchanged code produces the same version.
import { execSync } from 'node:child_process';

const git = (cmd, fallback) => {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return fallback;
  }
};

const date = git('git log -1 --format=%cd --date=format:%Y.%m.%d', 'unknown');
// Date.now() rather than a fixed string: without git the sha is the only thing
// left making the service worker's bytes differ per build.
const sha = git('git rev-parse --short HEAD', String(Date.now()));
const dirty = git('git status --porcelain', '') !== '';

// `-dev` so a screenshot off `yarn dev` is never mistaken for a deployed build.
export const appVersion = `${date}+${sha}${dirty ? '-dev' : ''}`;
