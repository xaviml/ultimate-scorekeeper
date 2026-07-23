# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Yarn is the package manager (CI runs `yarn install --frozen-lockfile`; a stale `package-lock.json` is also present — prefer `yarn.lock`).

```bash
yarn dev                              # Vite dev server on :5173
yarn build                            # tsc -b && vite build → dist/
yarn test                             # vitest run
yarn test:watch
yarn lint                             # eslint src --ext .ts,.tsx
yarn format                           # prettier --write src/**

yarn vitest run src/__tests__/gameReducer.test.ts       # single file
yarn vitest run -t "blocks scoring before the pull"     # single test by name
```

CI (`.github/workflows/deploy.yml`) runs lint → test → build on PRs and on `main`, then deploys `dist/` to GitHub Pages. The Pages build sets `GITHUB_PAGES=true`, which switches Vite `base` to `/ultimate-scorekeeper/`; rename the repo and you must update `vite.config.ts`.

## Architecture

A single-page PWA with **no router and no server**. `src/App.tsx` switches screens purely off `state.phase` (`config` → `game` → `report`).

### The reducer is the whole domain model

`src/state/gameReducer.ts` (~580 lines) holds every Ultimate rule: score validation, gender ratio, caps, half-time, timeouts, undo. It is pure and synchronously testable — `src/__tests__/gameReducer.test.ts` drives it by folding action arrays over `createInitialState()`. **New game rules go in the reducer with tests, never in components.** Components only read state and dispatch.

Guard functions are exported alongside the reducer and reused by the UI to decide what to disable or explain: `canScore`, `canUndo`, `timeoutAvailability`, `pullFromSide`, `leftEndzoneTeam`. Each returns `{ ok, reason? }`, and `reason` is an i18n key suffix (see below) — so a new rejection path needs a matching translation in both dictionaries.

Things that are easy to get wrong and are already decided in the reducer:

- **Undo** pushes a `GoalSnapshot` per goal. `points` is deliberately _not_ in the snapshot: a goal appends exactly one `PointRecord`, so undo slices the last one off. Don't "fix" this by storing the array — it makes the payload grow quadratically.
- **Scoreboard side ≠ physical side.** The scoreboard keeps each team on a fixed side all game; `leftEndzoneTeam`/`pullFromSide` track the real ends, which swap every point and mirror at half-time.
- **The game clock keeps running during timeouts and half-time.** Only `paused` (manual pause, SOTG stoppage, or a `STOPPAGE` left unresolved for `PROLONGED_STOPPAGE_SECONDS`) stops it. An injury/technical stoppage is logged without touching the clock at first — `pendingStoppage.elapsedSeconds` ticks forward every `TICK` regardless, and once it hits two minutes unresolved the reducer auto-pauses (`statusBeforePause` set, same shape as SOTG) so a lingering stoppage doesn't quietly eat into game time. From there "Resume game" (`STOPPAGE_RESOLVED`, not `SOTG_TOGGLE`) both un-pauses and resolves the stoppage in one action — the small "Play can resume" button (`StoppageResolutionRow`) hides itself once `clockStopped` is true, in favour of the same action-row button SOTG uses.
- **Half-time can only trigger on a goal**, never mid-point — the in-progress point always plays out.
- Conditional end cap (Option C) is resolved inside `GOAL`, not when the time cap fires, because it depends on the score difference _after_ the point finishes.
- **Recorded events are bookkeeping only** — they never touch the score, clock or possession, only the log and the assist hint. They share one guard, `canRecordEvent`, with two opt-in modifiers. Base: looser than `canScore` in one respect (an SOTG pause doesn't block it — a foul called as the teams line up is still a foul), but a timeout or half-time is a break in play, so recording waits for the game to resume, same as scoring does; it also blocks before the game starts and after it finishes. `requiresPull` narrows it to things that need a live disc (travel, stoppages, the six calls). `allowDuringBreaks` widens it past the timeout/half-time block, and **only `NOTE` passes it** — a note isn't about the play, and a break is precisely when a volunteer has a free hand to write one. Since a note is written from the log dialog, which stays open through a timeout, refusing it there silently swallowed what had just been typed.

One consequence worth knowing: a note recorded between a goal and an undo of that goal pushes `UNDO_GOAL` off its clean-removal path onto the visible-correction path (see the `goalLog.type === 'goal'` check). That's the designed fallback for "something was logged in between", and a timeout called after a goal already triggered it — the note just makes it reachable during half-time too. They are reached from **four different places**, split by what the volunteer is doing rather than by the fact that they all end up in the log — the grouping the old single "Record event" dialog used, which put a turnover and an SOTG stoppage side by side. Now: the six calls and travel sit behind the **Call** button (`CallDialog`, a shout bubble — deliberately not a whistle, since Ultimate is self-refereed and a whistle already means the clock talking); injury, technical and SOTG sit behind the **raised hand** (`StoppageDialog`); a turnover has its own **Turn** button; and a free-text note is written from the header of the log dialog itself, which is where what it writes ends up. The kinds: `TRAVEL` (team attributed via `TravelTeamDialog`, but never a player — a travel is called on the thrower by the marker, and chasing down which player it was is more than a volunteer can follow; it registers in one step, with no `pendingCall` and no resolution), `NOTE` (free text — the only recorded event with no call-out and no signal), and the six player calls via `CALL_MADE`/`CALL_RESOLVED`. A call opens `state.pendingCall` (one at a time — the resolution buttons answer exactly one question) and `CALL_RESOLVED` logs how long it took **on the game clock** (`gameSeconds`, so an SOTG pause mid-dispute isn't counted). The three resolution buttons render above the clocks in `GameScreen` while `pendingCall` is set.

### GameContext owns all side effects

`src/state/GameContext.tsx` is where impurity lives: the 1 s `TICK` heartbeat, the whistle sequences (45/60/75 s pull, timeout end, cap), the delayed next-ratio reveal, the `beforeunload` guard, and localStorage persistence. If you're adding time- or audio-driven behaviour, it belongs here, driven by derived values from state — not inside the reducer.

### The guide is a screen, not a dialog

`GuideScreen.tsx` is the walkthrough reached from the link under the tagline on the config screen. It is rendered _by_ `ConfigScreen` (early return, not a `phase`), so the setup form stays mounted underneath and everything already typed survives the round trip — and the reducer stays free of a UI-only state. Its text is ordinary `guide*` dictionary keys, so it translates like everything else.

The figures are real screenshots (`public/guide/*.png`), captured English-only by `scripts/guide-screenshots.mjs`, which drives an actual game through Playwright. The numbered pointers are **not** drawn into the images: the script measures the live bounding boxes and prints the `FIG_*` percentage arrays that `GuideScreen` positions markers with, and the captions are the translated list beside the picture. So after a layout change to the config screen, the dashboard or the report, re-run the script and paste the arrays back — otherwise the markers drift off their controls.

### i18n key conventions

`src/i18n/{en,es}.ts` are plain objects; `es` is typed as `typeof en`, so **a key missing from Spanish is a type error**. Three conventions are load-bearing:

- `state.assist` is a bare key string set by the reducer. It is **not** rendered directly — `AssistanceBar` looks it up in its `SAY` map to decide whether there is anything to shout.
- `canScore`/`canUndo` reasons render as `assist_blocked_<reason>` (the only surviving `assist_*` keys; they are flashed on the score panels, not in the bar).
- The bar shows one of two things, and the distinction is the whole point of the copy:
  - **`say_*` (green)** — the verbatim words to shout, quoted, with a speech icon. Transient: 7 s, then it gives way. An assist key absent from `SAY` has nothing to announce (turnover, disc-in-play, a logged injury are bookkeeping) and never takes over the bar.
  - **`now_*` (amber)** — the standing "what's happening and what do I do", derived from `state.status` rather than from `assist`, which is why it is always available as the fallback.
- The hand signal to _make_ is a third concern: `SignalCard` maps a subset of assist keys → official WFDF pictograms in `public/signals/*.png`. A key with no mapping renders no picture — many messages are announced but never hand-signalled. So a new assist key means deciding, separately, whether it needs a call-out and whether it needs a signal.
- Player calls set `assist` to `call_<kind>` when made and `resolution_<outcome>` when resolved; these appear in **both** the `SAY` map (green call-out) and the `SignalCard` map (a signal per infraction and per outcome). Stall-out has no dedicated WFDF pictogram, so it borrows `timing.png`. Log-only detail for the two call entry types is built by `callDetail` in `stats.ts` (alongside `goalPlayersDetail`/`turnoverPlayersDetail`), used by both the log table and the plain-text report.
- `SignalCard` is a dialog floating over the bottom-left of the score panels that dismisses itself after 7 s. It is `pointer-events-none` so it can never swallow a goal tap on the panel underneath, and it keys off the _occurrence_ rather than the image, so each pull whistle (45/60/75 s) re-shows it even though all three use the same picture.

Interpolation is `{name}` placeholders via `t(key, vars)`. Add a language by copying `es.ts`, registering it in `dicts`, and extending `detectLang` in `src/i18n/index.tsx`.

The action row's `lbl*` keys are the exception to translating everything: they are English in all three dictionaries on purpose. They have to fit ~7 characters at 9 px, Ultimate vocabulary is English on Spanish and Catalan fields anyway, and identical strings keep the button widths identical across languages. The full wording still translates — it is the `aria-label`/`title`, which is what a screen reader and a long-press tooltip read.

### The dashboard action row

`ActionButton` in `GameScreen` is a glyph plus a **micro-label**: a 9 px uppercase word small enough to read as part of the icon rather than as a caption. It stacks the two differently per orientation, and the reason is easy to get backwards: `lscape:` is capped on **height**, not width, so landscape has _more_ horizontal room per button (~160 px vs ~60 px at 360 px portrait) and less vertical. Portrait puts the label under the glyph; landscape puts it beside, spending the free axis and costing the row no height. Icon-only is not the landscape answer.

The stoppage button is the one with no visible label — no single short word covers injury, technical and SOTG without misleading — so it carries its meaning in `aria-label` alone. Glyphs live in `src/components/icons.tsx` and share one drawing spec (24 viewBox, no fill, 1.5 stroke, round caps); an icon that departs from it looks pasted in.

Timeouts are absolutely positioned over the score panels rather than nested inside them: `ScorePanel` is itself a `<button>`. Unlike `SignalCard` they are _not_ `pointer-events-none` — they are real controls, which is why they stay small and hug the outer top corner, away from where a thumb goes for the score.

### Styling

Tailwind with a custom dark palette (`pitch`, `panel`, `line`, `chalk`, `signal`) and a custom `lscape:` screen — `(orientation: landscape) and (max-height: 500px)` — for phones held sideways, which needs its own compacted `GameScreen` layout. Shared class strings live in `src/components/ui.ts`; reuse them rather than re-deriving button/input classes.

The UI target is a volunteer who has never seen Ultimate, one-handed on a phone in sunlight: huge tap targets, tap = +1, long-press = undo (`src/hooks/useLongPress.ts`).

## Other notes

- `src/audio/whistle.ts` loads `/whistle.mp3` as a root-absolute URL, which does not respect Vite's `base` — worth checking against the deployed Pages build before trusting audio there.
- `README.md` line 1 starts with a stray `^` before the heading.
