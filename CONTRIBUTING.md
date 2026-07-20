# Contributing

Thanks for helping make scorekeeping easier for volunteers!

## Workflow

1. Fork and clone the repo, then `yarn install`.
2. Create a branch: `git checkout -b feat/my-change`.
3. Make your change. Husky runs ESLint + Prettier on staged files at commit time.
4. Add or update unit tests (`yarn test`). The reducer in `src/state/gameReducer.ts` is pure — new game rules must come with tests.
5. Open a pull request against `main`. CI must pass (lint, tests, build).

## Ground rules

- **No persistence**: never introduce `localStorage`/`sessionStorage`/IndexedDB for game state. Refresh clears the game by design.
- **All user-facing text goes through i18n** (`src/i18n/en.ts` + `src/i18n/es.ts`). Add both languages.
- **Game rules live in the reducer**, not in components. Components read state and dispatch actions.
- Keep the UI usable one-handed on a phone, in sunlight, by someone who has never seen Ultimate.

## Adding a language

Copy `src/i18n/es.ts` to a new file typed as `typeof en` and add it `src/i18n/useT.ts`.
