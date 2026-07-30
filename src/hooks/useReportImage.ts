/**
 * Turns the report card into something the volunteer can actually send.
 *
 * Web Share with a file is the goal — one tap into WhatsApp, Telegram or the
 * team's group chat. Where that doesn't exist (most desktop browsers) the PNG is
 * downloaded instead, which is the same outcome one step later.
 *
 * The image is rendered as soon as the report is on screen rather than on the
 * tap. Safari only honours `navigator.share` while the user activation from the
 * tap is still alive, and awaiting a fresh canvas render inside the handler is
 * enough to lose it — with the blob already waiting, the share call happens in
 * the same task as the click.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { renderReportCard } from '../components/reportCardImage';
import type { ReportCardModel } from '../state/reportCard';

export type ShareImageStatus = 'idle' | 'working' | 'saved' | 'failed';

const FEEDBACK_MS = 2500;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick so the download has taken hold of the URL first.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useReportImage(model: ReportCardModel, filename: string, shareTitle: string) {
  const [status, setStatus] = useState<ShareImageStatus>('idle');
  const pending = useRef<Promise<Blob | null> | null>(null);
  const settled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    settled.current = false;
    pending.current = renderReportCard(model)
      .catch(() => null)
      .then((blob) => {
        settled.current = true;
        return blob;
      });
  }, [model]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = useCallback((next: ShareImageStatus) => {
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), FEEDBACK_MS);
  }, []);

  const share = useCallback(async () => {
    // Only announce work when there is any left to wait for, so the usual case
    // doesn't flash "Preparing…" for a single frame.
    if (!settled.current) setStatus('working');
    const blob = await (pending.current ?? renderReportCard(model).catch(() => null));
    if (!blob) {
      flash('failed');
      return;
    }

    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: shareTitle });
        setStatus('idle');
        return;
      } catch (err) {
        // Dismissing the share sheet is a decision, not a failure — downloading
        // the file anyway would force through exactly what was just declined.
        if ((err as DOMException | undefined)?.name === 'AbortError') {
          setStatus('idle');
          return;
        }
      }
    }

    try {
      downloadBlob(blob, filename);
      flash('saved');
    } catch {
      flash('failed');
    }
  }, [filename, flash, model, shareTitle]);

  return { status, share };
}
