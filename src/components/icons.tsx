/**
 * The glyphs for the dashboard action row and the log dialog.
 *
 * All of them share one drawing spec so the row reads as a set: a 24 viewBox,
 * no fill, 1.5 stroke in currentColor, round caps and joins. A new icon that
 * departs from that will look pasted in next to the others.
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
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Shared by the Log button and the log dialog's "add event" control, which is the
// same list with a "+" badge — recording an event adds a row to this very list.
const LIST_GLYPH_PATH =
  'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z';

export function LogIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d={LIST_GLYPH_PATH} />
    </Glyph>
  );
}

export function PlayersIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0z" />
    </Glyph>
  );
}

/**
 * Turn: two arrows running opposite ways. Deliberately not the cycle/refresh
 * loop, which reads as "again" and would compete with the long-press undo on the
 * score panels; a turnover is a reversal of direction, and the two arrows mirror
 * the two score panels sitting left and right above the row.
 */
export function TurnIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M3.5 8.5h13m0 0L13 5m3.5 3.5L13 12" />
      <path d="M20.5 15.5h-13m0 0L11 12m-3.5 3.5L11 19" />
    </Glyph>
  );
}

/**
 * Call: a shout, with the same speech metaphor the assistance bar already uses
 * for the green `say_*` call-outs. Explicitly not a whistle — Ultimate is
 * self-refereed, nobody blows one to make a call, and in this app a whistle
 * already means the clock talking (the 45/60/75s pull, timeout end, cap).
 */
export function CallIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M12 19.5c4.556 0 8.25-3.19 8.25-7.125S16.556 5.25 12 5.25 3.75 8.44 3.75 12.375c0 1.77.748 3.39 1.987 4.634.14.53-.15 1.4-.737 2.116a7 7 0 0 0 2.9-.72A9.7 9.7 0 0 0 12 19.5Z" />
      <path d="M12 9.4v3.1M12 15.2h.01" />
    </Glyph>
  );
}

/**
 * Stoppage / SOTG: a raised hand, the gesture that actually halts a point.
 * Deliberately not a pause bar — the clock tile's manual-pause control already
 * owns that shape, and two pause glyphs on one screen read as the same button.
 * This is the one action-row button with no micro-label, since no single short
 * word covers injury, technical and SOTG without misleading.
 */
export function StoppageIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12" />
    </Glyph>
  );
}

/**
 * Add event: the log glyph with a "+" badge on its corner — the icon the old
 * "Record event" dashboard button used, now sitting in the log dialog's header
 * where the thing it adds actually lands.
 */
export function AddEventIcon({ size = ACTION_SIZE }: { size?: string }) {
  return (
    <span className={`relative inline-flex ${size}`}>
      <svg
        viewBox="0 0 24 24"
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={LIST_GLYPH_PATH} />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-panel"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </span>
  );
}

/**
 * Fix a log row: a pencil, which is the only glyph a volunteer reads as "change
 * what this says" without a caption — and the log's actions column has no room for
 * one.
 */
export function PencilIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </Glyph>
  );
}

/** Delete a log row — offered on the newest entry only (see canDeleteLogEntry). */
export function BinIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </Glyph>
  );
}

/** Back to setup: nothing has been played yet, so leaving is a plain retreat. */
export function ArrowBackIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </Glyph>
  );
}

/** End game: a game is under way, so leaving closes it rather than backing out. */
export function CrossIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M6 18 18 6M6 6l12 12" />
    </Glyph>
  );
}

/**
 * The header menu. Deliberately the plain three-bar glyph rather than something
 * Ultimate-flavoured: it is the one control on the dashboard whose meaning has to
 * be obvious to someone who has never opened the app, and it replaces a slot that
 * used to change its icon (and its destination) with the game's status.
 */
export function ChevronLeftIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M14.25 5.25 7.5 12l6.75 6.75" />
    </Glyph>
  );
}

export function ChevronRightIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="m9.75 5.25 6.75 6.75-6.75 6.75" />
    </Glyph>
  );
}

export function MenuIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </Glyph>
  );
}

/** Game setup: the clipboard the rules were written down on before kickoff. */
export function SetupIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M9 12h6m-6 3.75h6M9 8.25h6m3.75-1.5v12.75a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5V6.75a1.5 1.5 0 0 1 1.5-1.5h1.5m7.5 0h1.5a1.5 1.5 0 0 1 1.5 1.5m-10.5-1.5a2.25 2.25 0 0 1 2.25-2.25h1.5a2.25 2.25 0 0 1 2.25 2.25m-6 0a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5" />
    </Glyph>
  );
}

/** The walkthrough, which until now had no door once a game was under way. */
export function GuideIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
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
      <path d="M3.75 3.75v15a1.5 1.5 0 0 0 1.5 1.5h15M7.5 15.75l3.75-4.5 3 3 5.25-6.75" />
    </Glyph>
  );
}

/** The finished game's report. */
export function ReportIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M3.75 13.5h3.75v6.75H3.75V13.5zm6.375-6h3.75v12.75h-3.75V7.5zm6.375-3.75h3.75v16.5h-3.75V3.75z" />
    </Glyph>
  );
}

/** Match history: a clock wound backwards, the archive of games already played. */
export function HistoryIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M12 7.5V12l2.625 1.5M3.75 8.25V4.5m0 3.75h3.75M4.02 8.25A8.25 8.25 0 1 1 3.75 12" />
    </Glyph>
  );
}

/** About the app — the same ⓘ the config header used to carry on its own. */
export function InfoIcon({ size }: { size?: string }) {
  return (
    <Glyph size={size}>
      <path d="M11.25 11.25h.75v4.5h.75M12 8.25h.008v.008H12V8.25zM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </Glyph>
  );
}
