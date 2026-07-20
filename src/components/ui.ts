/**
 * Shared Tailwind class strings.
 *
 * These exist so a visual tweak (a colour, a radius, a tap target) lands in one
 * place instead of being hunted across every dialog and screen.
 */

export const inputClass =
  'w-full rounded-lg bg-pitch border border-line px-3 py-2 text-chalk focus:outline-none focus:border-signal';

export const fieldLabel = 'block text-xs uppercase tracking-wide text-chalk/60 mb-1';

export const sectionTitle = 'font-board text-signal text-sm uppercase tracking-widest';

const buttonBase = 'rounded-xl font-board py-3 active:scale-[0.99] disabled:opacity-40';

export const primaryButton = `${buttonBase} bg-signal text-pitch font-bold`;

/** Secondary action inside a dialog or panel — sits on bg-panel, so it fills with bg-pitch. */
export const secondaryButton = `${buttonBase} border border-line bg-pitch`;

/** Secondary action directly on the page background — inverted so it doesn't vanish. */
export const secondaryButtonOnPitch = `${buttonBase} border border-line bg-panel`;

/** Selectable player chip, used by every roster picker. */
export const pillClass = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-sm border ${
    active ? 'bg-signal text-pitch border-signal font-board' : 'bg-pitch border-line text-chalk'
  }`;
