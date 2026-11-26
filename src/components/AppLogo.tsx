/**
 * The app's logo, as the icon draws it: two half-discs, one per team. The left is
 * solid navy with the ratio pips punched through; the right is its negative, the
 * ground framed by a thin navy line, with solid pips. The same geometry as
 * `public/icon.svg` and `public/favicon.svg`, but painted from the palette's
 * accent variable rather than hex, so it follows the theme the page is drawn in.
 * It sits on the page ground with no tile behind it — the icon's tile *is* that
 * ground.
 */
export function AppLogo({ size = 'w-11 h-11' }: { size?: string }) {
  return (
    <svg viewBox="16 16 68 68" className={`shrink-0 ${size}`} aria-hidden="true">
      <path
        className="fill-accent"
        fillRule="evenodd"
        d="M48.4,20.04 A30,30 0 0,0 48.4,79.96 Z M33.6,40 a3.4,3.4 0 1,0 6.8,0 a3.4,3.4 0 1,0 -6.8,0 Z M33.6,50 a3.4,3.4 0 1,0 6.8,0 a3.4,3.4 0 1,0 -6.8,0 Z M33.6,60 a3.4,3.4 0 1,0 6.8,0 a3.4,3.4 0 1,0 -6.8,0 Z"
      />
      {/* One stroke-half inside the radius, so its outer edge meets the left half's. */}
      <path
        className="stroke-accent"
        fill="none"
        strokeWidth={2}
        strokeLinejoin="miter"
        d="M52.6,21.12 A29,29 0 0,1 52.6,78.88 Z"
      />
      <circle cx="63" cy="45" r="3.4" className="fill-accent" />
      <circle cx="63" cy="55" r="3.4" className="fill-accent" />
    </svg>
  );
}
