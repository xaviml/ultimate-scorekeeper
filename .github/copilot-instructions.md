# Copilot instructions — Ultimate Frisbee Scorekeeper

## Project

PWA scorekeeper for Ultimate Frisbee aimed at volunteers with zero knowledge of the sport. The Assistance Bar must always tell the user what to say and which hand signal to use.

## Stack

- React 18 + TypeScript via Vite; Tailwind CSS; Yarn.
- Tests: Vitest + React Testing Library. Lint: ESLint + Prettier, enforced by Husky + lint-staged.
- Deploy: static build to GitHub Pages via `.github/workflows/deploy.yml`.

## Architecture rules

- State: pure reducer in `src/state/gameReducer.ts` + React Context (`GameContext.tsx`). **Never use localStorage or any persistence** — refresh clears the game, tabs are independent.
- All game rules (score validation, caps, timeouts, ratio) belong in the reducer and must be covered by unit tests in `src/__tests__/`.
- All user-facing strings go through `src/i18n` (English + Spanish; device auto-detect, English fallback).
- Mobile-first, portrait and landscape.

## Domain invariants (enforce in code and tests)

- Scores can only change when status is `live`: not before the game starts, not while paused (manual or SOTG), not during timeouts or half-time, not before the pull is thrown.
- Score never below 0. Undo (long-press) reverts the last goal only, restoring gender ratio, pulling team, and cap targets.
- Injury stoppage: logged, game clock unaffected. SOTG stoppage: logged, game clock paused.
- Pull whistles: single @45 s, double @60 s, triple @75 s; whistles also on timeout end and cap reached.
- End-game CAP options: A = none (finish point), B = +1/+2 (default +1), C = +1/+2 only if post-point difference > configurable 1/2/3. Half-time CAP: +1 or none.
- Optional rule: no timeouts within the last 5 minutes of the game (button disabled with tooltip).
