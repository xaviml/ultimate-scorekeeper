/**
 * Copying text to the clipboard, with the fallback a pitch-side phone needs.
 *
 * The async Clipboard API is unavailable outside a secure context — a phone
 * pointed at `yarn dev` on a LAN address is exactly that case, and so are older
 * mobile browsers — so a failure there falls through to the deprecated but still
 * widely supported `execCommand` path rather than reporting that copying failed.
 */
function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

/** Resolves to whether the text actually made it onto the clipboard. */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to the legacy path */
    }
  }
  return legacyCopy(text);
}
