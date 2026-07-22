import { useEffect, useState } from 'react';

const INSTALLED_KEY = 'ultimate-scorekeeper:pwa-installed';

/** Chrome/Edge/Android fire this instead of letting the browser show its own UI,
 * so we can render our own banner and trigger the native prompt on tap. Not part
 * of the DOM lib types, so the shape is declared locally. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari has no display-mode media query; it exposes this instead.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export type PwaInstallStatus =
  | { kind: 'none' }
  | { kind: 'installable'; install: () => void }
  | { kind: 'ios-instructions' }
  | { kind: 'already-installed' };

/**
 * Surfaces what the install banner should offer: a one-tap install where the
 * browser supports `beforeinstallprompt`, manual "Add to Home Screen" steps on
 * iOS (which never fires that event), or a nudge to open the installed app —
 * inferred from a flag this hook sets the first time `appinstalled` fires,
 * since there is no cross-browser way to ask "is this already installed?".
 * There's also no `appuninstalled` event, so a fresh `beforeinstallprompt`
 * firing (the browser no longer considers the app installed) clears the flag.
 */
export function usePwaInstall(): PwaInstallStatus {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installedFlag, setInstalledFlag] = useState(
    () => localStorage.getItem(INSTALLED_KEY) === '1',
  );

  useEffect(() => {
    const onBeforePrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // The browser only offers this prompt when it doesn't consider the app
      // installed, which contradicts a stale flag from a since-uninstalled PWA.
      localStorage.removeItem(INSTALLED_KEY);
      setInstalledFlag(false);
    };
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, '1');
      setInstalledFlag(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforePrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforePrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (isStandalone()) return { kind: 'none' };
  if (installedFlag) return { kind: 'already-installed' };
  if (deferred) {
    return {
      kind: 'installable',
      install: () => {
        void deferred.prompt();
        void deferred.userChoice.then(() => setDeferred(null));
      },
    };
  }
  if (isIos()) return { kind: 'ios-instructions' };
  return { kind: 'none' };
}
