# Ultimate Frisbee Scorekeeper

A Progressive Web App for keeping score at Ultimate Frisbee games — designed for **volunteers with zero knowledge of the sport**. A persistent Assistance Bar tells the scorekeeper exactly **what to say and which hand signal to use** at every stage of the game.

## Features

- **Guided scorekeeping**: dynamic assistance messages with hand-signal pictograms ("Raise one hand: 'Time cap reached!'").
- **Configuration screen**: division (Open / Women's / Mixed), team names & colors, field number, mixed gender-ratio rule (A/B), coin-toss results, target scores, time limits, end-game CAP rules (none / +1 / +2 / conditional), half-time CAP, timeout allowances and break durations, optional "no timeouts in the last 5 minutes" rule.
- **Scoreboard dashboard**: two massive tap zones (tap = +1, long-press = undo), dual clocks (game clock + pull/timeout/half-time timer), real-world time, field number, persistent gender ratio, utility row (timeouts, injury, SOTG, half-time, log).
- **Strict validation**: no scoring before the game starts, while paused, during timeouts/half-time, or before the pull is thrown; scores never go below 0; undo restores everything, gender ratio included.
- **Audio alerts**: whistle sequence at 45 s (single), 60 s (double), 75 s (triple) of pull time, plus timeout-end and cap whistles (placeholder mp3 URLs — see `src/audio/whistle.ts`).
- **Post-game report**: final score, O-line holds, breaks, average hold/break time, full chronological event history, one-tap plain-text copy to clipboard.
- **i18n**: English and Spanish, auto-detected from the device, English fallback.
- **No persistence by design**: state is in memory only. Refreshing clears the game; multiple tabs are independent.

## Getting started

```bash
yarn install
yarn dev        # local dev server
yarn test       # unit tests (Vitest)
yarn lint       # ESLint
yarn build      # production build in dist/
```

## Deployment

Pushing to `main` runs tests and deploys `dist/` to GitHub Pages via `.github/workflows/deploy.yml`. In the repository settings, set **Pages → Source → GitHub Actions**. If your repo name differs from `ultimate-scorekeeper`, update `base` in `vite.config.ts`.

## PWA

The app ships a `manifest.webmanifest` and a minimal service worker so it can be installed to the home screen and load offline. Game state is intentionally never persisted.

## Tech stack

React 18 + TypeScript (Vite), Tailwind CSS, Vitest + React Testing Library, ESLint + Prettier + Husky/lint-staged, Yarn.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under [MIT](LICENSE).
