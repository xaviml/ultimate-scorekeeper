/**
 * The app's own glyph set — the dashboard action row, the menus and the log.
 *
 * One drawing spec, so the set reads as a set and as nobody else's: a 24 viewBox,
 * no fill, a 1.75 stroke in currentColor, **square caps and mitred joins**. Built
 * from straight runs and plain geometry, the way a measuring instrument's panel is
 * labelled; where a glyph needs a solid mark (a bullet, a dot) it is a small square,
 * never a round blob. A new icon that departs from that — rounded caps above all —
 * will look pasted in next to the others.
 *
 * `size` is the Tailwind width/height pair rather than a number, because the
 * action row shrinks its icons under the custom `lscape:` breakpoint and the
 * class names have to appear literally in source for Tailwind's scanner.
 */

const ACTION_SIZE = 'w-5 h-5 lscape:w-4 lscape:h-4';

function Glyph({ size = ACTION_SIZE, children }: { size?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** A solid square mark — the set's bullet and its dot (on an "i", under a "!"). */
function Dot({ x, y, s = 2.5 }: { x: number; y: number; s?: number }) {
  return <rect x={x} y={y} width={s} height={s} fill="currentColor" stroke="none" />;
}

// Shared by the Log button and the log dialog's "add event" control, which is the
// same list with a "+" on its corner — recording an event adds a row to this list.
function ListMarks() {
  return (
    <>
      <Dot x={3.5} y={5.75} />
      <Dot x={3.5} y={10.75} />
      <Dot x={3.5} y={15.75} />
      <path d="M10 7h10.5M10 12h10.5M10 17h10.5" />
    </>
  );
}

export function LogIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <ListMarks />
    </Glyph>
  );
}

export function PlayersIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3 20v-1.5A3.5 3.5 0 0 1 6.5 15h5a3.5 3.5 0 0 1 3.5 3.5V20" />
      <path d="M15.5 4.9a3.25 3.25 0 0 1 0 6.2M18 15h.5a3.5 3.5 0 0 1 3.5 3.5V20" />
    </Glyph>
  );
}

/**
 * Turn: two arrows running opposite ways, each with a single hook — the top one
 * heading right, the bottom one coming back. Deliberately not the cycle/refresh
 * loop, which reads as "again" and would compete with the long-press undo on the
 * score panels; a turnover is a reversal of direction, and the two arrows mirror
 * the two score panels sitting left and right above the row.
 */
export function TurnIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M5 8h13l-3-3" />
      <path d="M19 16H6l3 3" />
    </Glyph>
  );
}

/**
 * Line: the handful taking this point, drawn as markers standing on one line rather
 * than the roster's pair of figures. It sits directly under Roster in the game menu,
 * so the contrast is the whole point — a squad against the few of them on now.
 */
export function LineIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <circle cx="6" cy="7.5" r="2" />
      <circle cx="12" cy="7.5" r="2" />
      <circle cx="18" cy="7.5" r="2" />
      <path d="M6 11.5v7M12 11.5v7M18 11.5v7M3 19.5h18" />
    </Glyph>
  );
}

/**
 * Pass: the disc's flight — a throw curving up and over to the receiver, ending in
 * an arrowhead. It sits beside Turn in the action row, so it is drawn to read
 * against it: Turn's two arrows oppose each other because the disc came back, this
 * one arcs one way because it arrived.
 */
export function PassIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M4 17c3-7 9-10 15-8" />
      <path d="M15 5l4 4-4 4" />
    </Glyph>
  );
}

/**
 * Call: a shout — a squared speech block with a "!" in it, the same block the
 * assistance bar uses for the words to say. Explicitly not a whistle: Ultimate is
 * self-refereed, nobody blows one to make a call, and in this app a whistle already
 * means the clock talking (the 45/60/75s pull, timeout end, cap).
 */
export function CallIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M3.5 4.5h17V16h-9L7 20v-4H3.5z" />
      <path d="M12 7.5v3.75" />
      <Dot x={10.85} y={13} s={2.3} />
    </Glyph>
  );
}

/**
 * Stoppage / SOTG: a raised hand, the gesture that actually halts a point, cut
 * from straight strokes — four flat-topped fingers over the palm. Deliberately not
 * a pause bar: the clock's manual-pause control already owns that shape, and two
 * pause glyphs on one screen read as the same button.
 */
export function StoppageIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M8 13.5V5.5M11.25 11V3.5M14.5 11V4.5M17.75 11.5V7" />
      <path d="M17.75 11.5v4A5.5 5.5 0 0 1 12.25 21h-.75a5.5 5.5 0 0 1-4.4-2.2L3.75 14.3l1.1-1.1a1.6 1.6 0 0 1 2.26 0l.89.89" />
    </Glyph>
  );
}

/** Add event: the log glyph with a "+" on its corner — what it adds lands in the log. */
export function AddEventIcon({ size = ACTION_SIZE }: { size?: string }) {
  return (
    <span className={`relative inline-flex ${size}`}>
      <Glyph size="w-full h-full">
        <ListMarks />
      </Glyph>
      <svg
        viewBox="0 0 24 24"
        className="absolute -bottom-1 -right-1 w-3 h-3 bg-panel"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="square"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </span>
  );
}

/** Fix a log row: a pencil, the one glyph read as "change what this says" uncaptioned. */
export function PencilIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M4 20l1-5L16 4l4 4L9 19z" />
      <path d="M13 7l4 4" />
    </Glyph>
  );
}

/** Delete a log row — offered on the newest entry only (see canDeleteLogEntry). */
export function BinIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M4 6.5h16M9 6.5v-3h6v3M6 6.5l1 14h10l1-14M10 10.5v6M14 10.5v6" />
    </Glyph>
  );
}

/** Back to setup: nothing has been played yet, so leaving is a plain retreat. */
export function ArrowBackIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M20 12H5M10.5 6l-6 6 6 6" />
    </Glyph>
  );
}

/** End game: a game is under way, so leaving closes it rather than backing out. */
export function CrossIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Glyph>
  );
}

/** Install the app: a phone with an arrow coming down into it. */
export function InstallIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M6.5 2.5h11v19h-11z" />
      <path d="M12 6.5v8.5M8.75 11.75 12 15l3.25-3.25" />
      <path d="M10.5 18.5h3" />
    </Glyph>
  );
}

export function ChevronLeftIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Glyph>
  );
}

export function ChevronRightIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </Glyph>
  );
}

/**
 * The two readings the secondary clock offers while the disc is live — the point's
 * own time and the holder's possession time. Two arrows passing each other: the
 * box is not advancing anything, it is showing the same window a second way.
 */
export function SwapIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M4 8h14.5M15 4.5 18.5 8 15 11.5M20 16H5.5M9 12.5 5.5 16 9 19.5" />
    </Glyph>
  );
}

/**
 * The header menu: two bars, the lower one short. Still unmistakably "menu" to
 * someone who has never opened the app, which is the one thing this control must
 * be, without being the stock three equal bars.
 */
export function MenuIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M4 8.5h16M4 15.5h10" />
    </Glyph>
  );
}

/** Game setup: two sliders, the rules as settings that were fixed before kickoff. */
export function SetupIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M4 7h8.5M17.5 7H20M4 17h2.5M11.5 17H20" />
      <path d="M12.5 4.5h5v5h-5zM6.5 14.5h5v5h-5z" />
    </Glyph>
  );
}

/** The beginner's guide: an open book. */
export function GuideIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M3.5 5h6A2.5 2.5 0 0 1 12 7.5V20a2 2 0 0 0-2-2H3.5z" />
      <path d="M20.5 5h-6A2.5 2.5 0 0 0 12 7.5V20a2 2 0 0 1 2-2h6.5z" />
    </Glyph>
  );
}

/**
 * The statistics walkthrough. A trend line over an axis rather than bars, because
 * ReportIcon (three bars) sits two rows away in the same menu and the two have to
 * be told apart at 20px.
 */
export function StatsIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M4 4v16h16M7.5 15l4-4.5 3 3 5-6" />
    </Glyph>
  );
}

/** The game's report. */
export function ReportIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M4 13.5h3.5V20H4zM10.25 8h3.5v12h-3.5zM16.5 4H20v16h-3.5z" />
    </Glyph>
  );
}

/** Match history: a clock wound backwards, the archive of games already played. */
export function HistoryIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M12 7.5V12l3 2M4 4.5v4h4M4.7 8.5A8 8 0 1 1 4 12" />
    </Glyph>
  );
}

/** About the app: an "i" in a square frame. */
export function InfoIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M4 4h16v16H4zM12 11v6" />
      <Dot x={10.85} y={6.75} s={2.3} />
    </Glyph>
  );
}

/** Settings: a dial with its ticks, for what is about this phone rather than the game. */
export function SettingsIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </Glyph>
  );
}

/** The assistance bar's call-out: the words to say — the speech block, empty. */
export function SayIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M3.5 4.5h17V16h-9L7 20v-4H3.5z" />
      <path d="M7.5 8.75h9M7.5 12h5.5" />
    </Glyph>
  );
}

/** The assistance bar's standing line: what to do now — an arrow pointing at it. */
export function NowIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </Glyph>
  );
}

/** The game clock's manual pause. Solid, square-cornered bars. */
export function PauseIcon({ size = 'w-4 h-4 lscape:w-3 lscape:h-3' }: { size?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={size} fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </svg>
  );
}

export function PlayIcon({ size = 'w-4 h-4 lscape:w-3 lscape:h-3' }: { size?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={size} fill="currentColor" aria-hidden="true">
      <path d="M7 5v14l12-7z" />
    </svg>
  );
}

/** A team's timeout, on its score panel: a stopwatch. */
export function TimeoutIcon({ size = 'w-5 h-5 lscape:w-4 lscape:h-4' }: { size?: string }) {
  return (
    <Glyph size={size}>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 10v3.5M9.5 2.5h5M12 2.5v4M18.5 6.5l1.5-1.5" />
    </Glyph>
  );
}

/* ---- Setup screen: one glyph per section, and the steppers' two signs. ---- */

/** The teams: a jersey. */
export function ShirtIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M8.5 3.5 3 6.5l2 4.5 2.5-1.25V20.5h9V9.75L19 11l2-4.5-5.5-3a3.5 3.5 0 0 1-7 0Z" />
    </Glyph>
  );
}

/** The coin toss: a disc seen edge-on mid-flip. */
export function CoinIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <ellipse cx="12" cy="10" rx="8" ry="4.5" />
      <path d="M4 10v4c0 2.5 3.6 4.5 8 4.5s8-2 8-4.5v-4" />
    </Glyph>
  );
}

/** Win conditions: a flag on a pole. */
export function FlagIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M5 21V3.5" />
      <path d="M5 4h13l-2.5 4.25L18 12.5H5" />
    </Glyph>
  );
}

/** Half-time: a disc split down the middle, one half filled. */
export function HalfIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" />
    </Glyph>
  );
}

/** Water breaks: a drop. */
export function DropIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M12 3.5s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11Z" />
    </Glyph>
  );
}

export function MinusIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M5.5 12h13" />
    </Glyph>
  );
}

export function PlusIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M5.5 12h13M12 5.5v13" />
    </Glyph>
  );
}

/** Open every point at once: two chevrons pulling apart. */
export function UnfoldIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M7.5 8.5 12 4l4.5 4.5M7.5 15.5 12 20l4.5-4.5" />
    </Glyph>
  );
}

/** Fold every point back: the same two chevrons closing in. */
export function FoldIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M7.5 4 12 8.5 16.5 4M7.5 20 12 15.5l4.5 4.5" />
    </Glyph>
  );
}

/** Copy: the sheet being copied in front, its twin offset behind it. */
export function CopyIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M8.5 8.5h11v11h-11zM15.5 8.5v-4h-11v11h4" />
    </Glyph>
  );
}
