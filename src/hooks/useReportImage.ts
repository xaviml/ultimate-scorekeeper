/**
 * Turns the report card into something the volunteer can actually send.
 *
 * The goal is the phone's own share sheet — one tap, then WhatsApp, Telegram,
 * email, whatever is installed. Downloading the PNG is only the fallback for
 * browsers that have no Web Share at all (most desktops).
 *
 * Two things have to hold for the sheet to appear, and both are easy to break:
 *
 * 1. `navigator.share` must be reached from inside the click, with **no `await`
 *    in front of it**. Browsers only honour it while the tap's user activation is
 *    alive, and on Safari even awaiting an already-resolved promise can be enough
 *    to lose it. So the image is rendered ahead of time, on mount, and `share()`
 *    is deliberately NOT an async function — the fast path calls `navigator.share`
 *    synchronously and handles the returned promise afterwards. Making this async
 *    again would silently demote every phone to the download fallback.
 * 2. The page must be a secure context. Web Share does not exist over plain
 *    `http://` on a LAN address, only over https:// or on localhost — so a phone
 *    pointed at the dev server will always download, while the deployed site
 *    shares. There is nothing to fix in here for that case.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { renderReportCard } from '../components/reportCardImage';
import type { ReportCardModel } from '../state/reportCard';

export type ShareImageStatus = 'idle' | 'working' | 'saved' | 'failed';

const FEEDBACK_MS = 2500;

/**
 * Some browsers ship `share()` without `canShare()`. Treat that as "worth
 * trying" rather than "unsupported" — refusing there would send a phone that can
 * share straight to the download fallback.
 */
function canShareFile(file: File): boolean {
  if (typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return true;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked later so the download has taken hold of the URL first.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useReportImage(model: ReportCardModel, filename: string, shareTitle: string) {
  const [status, setStatus] = useState<ShareImageStatus>('idle');
  const fileRef = useRef<File | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fileRef.current = null;
    void renderReportCard(model)
      .then((blob) => {
        if (alive && blob) fileRef.current = new File([blob], filename, { type: 'image/png' });
      })
      .catch(() => {
        /* Reported when the button is actually pressed, not before. */
      });
    return () => {
      alive = false;
    };
  }, [model, filename]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = useCallback((next: ShareImageStatus) => {
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), FEEDBACK_MS);
  }, []);

  const fallbackDownload = useCallback(
    (file: File) => {
      try {
        downloadFile(file);
        flash('saved');
      } catch {
        flash('failed');
      }
    },
    [flash],
  );

  const onShareRejected = useCallback(
    (file: File, err: unknown) => {
      // Dismissing the sheet is a decision, not a failure — downloading anyway
      // would force through exactly what was just declined.
      if ((err as DOMException | undefined)?.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      fallbackDownload(file);
    },
    [fallbackDownload],
  );

  /** Only reached when the tap beat the render, or the first render failed. */
  const slowShare = useCallback(async () => {
    setStatus('working');
    let file = fileRef.current;
    if (!file) {
      const blob = await renderReportCard(model).catch(() => null);
      if (!blob) {
        flash('failed');
        return;
      }
      file = new File([blob], filename, { type: 'image/png' });
      fileRef.current = file;
    }
    if (canShareFile(file)) {
      try {
        await navigator.share({ files: [file], title: shareTitle });
        setStatus('idle');
      } catch (err) {
        onShareRejected(file, err);
      }
      return;
    }
    fallbackDownload(file);
  }, [fallbackDownload, filename, flash, model, onShareRejected, shareTitle]);

  // Not async, and must stay that way — see the note at the top of the file.
  const share = useCallback(() => {
    const file = fileRef.current;
    if (file && canShareFile(file)) {
      navigator.share({ files: [file], title: shareTitle }).then(
        () => setStatus('idle'),
        (err: unknown) => onShareRejected(file, err),
      );
      return;
    }
    void slowShare();
  }, [onShareRejected, shareTitle, slowShare]);

  return { status, share };
}
