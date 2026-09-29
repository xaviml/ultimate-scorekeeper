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
        board: ['"Chakra Petch"', 'system-ui', 'sans-serif'],
        clock: ['"Rajdhani"', 'ui-monospace', 'monospace'],
      },
      colors: {
        pitch: '#101418',
        panel: '#1a2129',
        line: '#2c3641',
        chalk: '#e8edf2',
        signal: '#ffd447',
        // Call-outs: the words the volunteer should shout, as opposed to the
        // amber `signal` used for ambient "here's what's happening" guidance.
        call: '#4ade80',
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
      },
      animation: {
        signalIn: 'signalIn 0.25s ease-out',
        pressFlash: 'pressFlash 0.3s ease-out forwards',
        badgePop: 'badgePop 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
