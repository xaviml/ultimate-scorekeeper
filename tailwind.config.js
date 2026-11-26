/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      // Short landscape viewports (small phones held sideways) need a
      // compacted GameScreen layout instead of the normal stacked one.
      lscape: { raw: '(orientation: landscape) and (max-height: 500px)' },
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        // Chakra Petch for words, Rajdhani for every number that ticks or counts.
        sans: ['"Chakra Petch"', 'system-ui', 'sans-serif'],
        board: ['"Chakra Petch"', 'system-ui', 'sans-serif'],
        clock: ['"Rajdhani"', 'ui-monospace', 'monospace'],
      },
      // Role-named in spirit, historically named in fact: `pitch` is the page
      // ground, `panel` a raised surface, `line` a hairline, `chalk` the ink.
      // Values live in index.css as RGB channels so `/60`-style opacity works and
      // a dark scheme can redefine them in one place.
      colors: {
        pitch: 'rgb(var(--c-ground) / <alpha-value>)',
        panel: 'rgb(var(--c-surface) / <alpha-value>)',
        line: 'rgb(var(--c-hairline) / <alpha-value>)',
        chalk: 'rgb(var(--c-ink) / <alpha-value>)',
        // Selection, focus, possession and brand emphasis.
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        // "Act now": the ambient guidance, the pull button, warnings, blocked hints.
        signal: 'rgb(var(--c-signal) / <alpha-value>)',
        // Call-outs: the words the volunteer should shout.
        call: 'rgb(var(--c-call) / <alpha-value>)',
        // Destructive: the confirm button of a step that throws something away for good.
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        // The wash behind a dialog: navy in the light theme, black in the dark one.
        scrim: 'rgb(var(--c-scrim) / <alpha-value>)',
      },
      keyframes: {
        signalIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Turn and Pass light up amber under the finger and fade, so a tap reads
        // in the corner of the eye of someone watching the disc (see ActionButton).
        pressFlash: {
          '0%': { opacity: '0.9' },
          '100%': { opacity: '0' },
        },
        badgePop: {
          '0%': { transform: 'scale(1.5)' },
          '100%': { transform: 'scale(1)' },
        },
        // The "act now" cue for the amber play button and the chips that need
        // attention. A ring breathes out from the edge while the thing itself stays
        // solid: Tailwind's `pulse` fades the whole element, which at its low point
        // looked exactly like a disabled button and let team colours show through
        // a chip sitting on the score panels.
        glow: {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--c-signal) / 0.55)' },
          '70%': { boxShadow: '0 0 0 8px rgb(var(--c-signal) / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--c-signal) / 0)' },
        },
      },
      animation: {
        signalIn: 'signalIn 0.25s ease-out',
        pressFlash: 'pressFlash 0.3s ease-out forwards',
        badgePop: 'badgePop 0.2s ease-out',
        glow: 'glow 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
