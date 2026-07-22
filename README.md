# Ultimate Frisbee Scorekeeper

A Progressive Web App for keeping score at Ultimate Frisbee games — designed for **volunteers with zero knowledge of the sport**. A persistent Assistance Bar tells the scorekeeper exactly **what to say and which hand signal to use** at every stage of the game.

## Background

This app is designed for young volunteers hired to keep score at Ultimate Frisbee tournaments in my area — often with little or no knowledge of the sport itself. Kýkhë from EUC built an Android app to help these volunteers keep up with pull time, gender ratio, half-time and time-outs, but it was never published to the Play Store, so it only reached players with an Android phone and a direct install link.

This project carries that same mission forward: rebuilt to run on any device, with usability and experience improved along the way. The goal hasn't changed — make that volunteer's job easier, and spare both teams the frustration of losing track of the pull count or the gender ratio mid-game.

## Features

- **Guided scorekeeping**: dynamic assistance messages with hand-signal pictograms ("Raise one hand: 'Time cap reached!'").
- **Configuration screen**: division (Open / Women's / Mixed), team names & colors, field number, mixed gender-ratio rule (A/B), coin-toss results, target scores, time limits, end-game CAP rules (none / +1 / +2 / conditional), half-time CAP, timeout allowances and break durations, optional "no timeouts in the last 5 minutes" rule.
- **Scoreboard dashboard**: two massive tap zones (tap = +1, long-press = undo), dual clocks (game clock + pull/timeout/half-time timer), real-world time, field number, persistent gender ratio, utility row (timeouts, injury, SOTG, half-time, log).
- **Strict validation**: no scoring before the game starts, while paused, during timeouts/half-time, or before the pull is thrown; scores never go below 0; undo restores everything, gender ratio included.
- **Audio alerts**: whistle sequence at 45 s (single), 60 s (double), 75 s (triple) of pull time, plus timeout-end and cap whistles (placeholder mp3 URLs — see `src/audio/whistle.ts`).
- **Post-game report**: final score, O-line holds, breaks, average hold/break time, full chronological event history, one-tap plain-text copy to clipboard.
- **i18n**: English, Spanish and Catalan, auto-detected from the device, English fallback.

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

The app ships a `manifest.webmanifest` and a minimal service worker so it can be installed to the home screen and load offline. Game state is intentionally never persisted in Cloud only within the device.

## Tech stack

React 18 + TypeScript (Vite), Tailwind CSS, Vitest + React Testing Library, ESLint + Prettier + Husky/lint-staged, Yarn.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under [MIT](LICENSE).
