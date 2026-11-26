# UX/UI guidelines

The rules this app's screens are built to. Read this before adding a page, a dialog or a control, and before restyling one. CLAUDE.md explains how the code works. This file explains how a screen should look and behave, and what has already been tried and turned down.

## 1. Who it is for

- **The reader:** a volunteer who may never have seen Ultimate.
- **The setting:** one hand on a phone, outdoors in sunlight, eyes mostly on the field.
- **The smallest screen:** 360 × 640 px. Every layout must work there, and in portrait and landscape (`lscape:`).
- **Languages:** English, Spanish and Catalan. Spanish and Catalan run about 20–30 % longer than English, so a label that fits in English is not yet known to fit.
- **The test for any choice:** can it be done without reading a sentence, and without looking away from the game for long?

## 2. Brand and tokens

- **Palette:** navy and gold. The look is light, minimal and instrument-like. Avoid decoration for its own sake.
- **Typefaces:** Chakra Petch (`font-board`) for words and Rajdhani (`font-clock`) for numbers. Never set a score, clock or figure in the word face.
- **Colours only through role tokens:** `pitch` (ground), `panel` (surface), `line` (hairline), `chalk` (ink), `accent` (selection and primary), `signal` (act now, amber), `call` (say it aloud, green), `danger` (discards something for good, red) and `scrim` (dialog backdrop).
  - Never use a raw hex in a component.
  - The exceptions are fixed by design: the white `SignalCard`, and the shared report image, which has its own palette in `reportCardImage.ts`.
- **Two themes, and only `index.css` knows which is showing.**
  - A component never reads the theme.
  - A team colour that could melt into the ground goes through `teamEdge`/`teamOutline` (`ui.ts`).
  - Check every new screen in light and dark.
- **Colour meanings are fixed:**

  | Colour           | Means                                    |
  | ---------------- | ---------------------------------------- |
  | `accent`         | selected, or the primary action          |
  | `signal` (amber) | the volunteer has to act now             |
  | `call` (green)   | words to shout                           |
  | `danger` (red)   | this step throws something away for good |
  | team colours     | belong to the teams only                 |
  - Don't paint a control in a team colour to label it. Earlier versions put team colours on the segment choices; they were removed.
  - Use team colours only on score panels, dots, badges and tracks.

## 3. Icons

- **Use the app's own glyph set** (`components/icons.tsx`), for every mark — a close button is `CrossIcon`, never a typed `✕`: a 24 viewBox, a 1.75 stroke, square caps and mitred joins. A solid mark is a small square, never a round blob.
- **No emoji and no third-party icon fonts.** A new icon is drawn in the same spec and added to `icons.tsx`.
- **The share image draws on a canvas**, so any glyph it uses also needs its path data copied into `GLYPHS` in `reportCardImage.ts`.
- **An icon-only button always has an `aria-label`/`title`**, and that name is what tests press.

## 4. Pages

### Every page has an address

- Pages are hash routes (`#/…`), defined in `state/route.ts`. A new page gets:
  - a `Route` case;
  - `parseRoute`/`routeHash` entries;
  - a `case` in `App`.
- **The browser's back button is the page's back.** Moving between pages pushes a history entry, and in-app back buttons call `back(fallback)`.
- **Leaving the app's flow goes `home()`**, back to the bottom of the history, rather than pushing setup on top.
- **Only ask before leaving when leaving discards work.** Today that is only a game being played.
- **A page opened over another keeps the one underneath mounted and hidden.** That way a half-filled form, an open game and scroll positions survive the round trip (`usePreservedScroll`).

### Page anatomy

- **Home (setup) and the game screen** have headers of their own:
  - setup: the wordmark and the menu;
  - game: the field, the half, the time of day and the menu.
- **Every other page uses `PageHeader`.** It sticks to the top while the page scrolls and has three parts:
  - **a bare back arrow**: no outline and no word, but an accessible name that says where it goes ("Back to the game", "Back");
  - **the title**, in the header's tracked capitals;
  - **the app menu** (`AppMenu`), on the right.
- **The menu is always on the right**, in every header.
- **Body:** on the `pitch` ground, `max-w-2xl`, `p-4`, with `space-y-4` between sections.
- **Sections are `SectionCard`s** (on setup, `Section`):
  - a `panel` card;
  - a heading with an accent glyph and an uppercase tracked title (`specTitle`);
  - an optional small control in the heading's right corner, such as "Save template", "Logs" or open/fold all.
- **Inside a dialog, don't nest cards.** Dialogs are already a panel. Split sections with a hairline (`border-t border-line`) and use the same glyph and title heading.
- **A page's main action sits in a sticky bottom bar** when the page is long: the setup Start bar, and the report's Share and Copy. Use the same style everywhere: `bg-pitch/95`, a top hairline, backdrop blur and safe-area padding.
- **Destructive or rarely used actions** stay in the page flow (for example "New game" at the foot of the report), not in the sticky bar.

### Menus

- **Each menu row is a `MenuRow`:** an icon, a label and a chevron.
- **"Start new game" is the first row in every menu**, as `primary` (filled in the accent). The one exception is the setup screen, which is where it leads.
- **Only ask before discarding** when something would be lost (`newGameAsksFirst`). Anything not started, finished or already filed goes straight on.
- **The game menu stays about the game in hand:** game setup, report so far, roster and line, settings, end game. It has no guides and no history. A page opened from it (the report so far) shows only "Start new game", Game setup and Settings in its own menu (`AppMenu` while `phase === 'game'`), so nothing leads to the rest of the app mid-game.
- **Don't offer two doors to the same place in one menu.** "Back to setup" went once "Start new game" existed; "Report so far" hides once "Open report" is the leave row.

## 5. Controls

| Need                                   | Use                                                                                            | Not                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| choose one of a few short options      | `Segmented` (radio semantics, `data-value`; `labelHidden` when the options explain themselves) | a `<select>` of 2–3 entries, or loose pill buttons |
| a number                               | `Stepper` (− / + around a typable input)                                                       | a bare number input                                |
| a long list (gender check, players of) | a native `<select>` (styled globally with the glyph chevron)                                   | segments that cut long names off                   |
| on/off for one feature                 | `CheckField` `switch`                                                                          | a checkbox (nothing in the app is drawn as one)    |
| on/off for a whole section             | `Section`'s `enabled`: a switch in the heading corner that folds the section when off          | an "Off" segment inside it                         |

- **A choice that includes "none" becomes a switch plus the real options.** For example, Statistics is now a switch plus Team / Player, where it used to be "Score only / By team / By player".
- **Labels:** `fieldLabel`, small, uppercase and tracked, above the control.
- **Hints:** `hintText`, grey, below the control.
- **Errors:** said at the field (`errorText`, in `signal`) _and_ named in the sticky bar, which scrolls to the field when tapped.
- **Nudges are grey, not amber**, when the thing is optional ("Recommended: add the roster…"), and so are the game's to-do prompts ("Scorer 1-0", "Register line"): they wait for a free moment, and amber is reserved for what can't wait.
- **Button weights**, from loudest to quietest:
  1. primary filled in the accent (`primaryButton`) — the one main action, in every dialog and screen. Never ink-black: that was a second "primary" next to the accent's;
  2. secondary outlined;
  3. quiet `bg-pitch` tiles with no border.

  A selected option is filled in the accent too, wherever it is chosen: segments, player chips and the line sheet's rows alike.

  On a busy screen, show hierarchy by fill, not by outlining everything.
  - On the game screen, Log, Stoppage and Call are quiet tiles, and Turn and Pass are filled (`ACTION_TONE`).
  - The two clocks are one strip split by a hairline, not two boxes.

- **Badges on filled buttons** carry a `panel` ring so they read against the fill.

### Destructive actions

- **A step that throws something away for good asks first, and its confirm button is `dangerButton`**: outlined and lettered in `danger`, beside a secondary Cancel. Today: remove a player, delete a team, a template or an archived game, and leave a game in progress.
- **Reversible is not destructive.** "End game" pauses (it can be resumed) and pausing stops a clock; both keep the primary button.
- **Never fill the danger button.** Filled, it reads as the obvious tap, which is the one thing it must not be.

## 6. Layout stability: nothing moves under the thumb

The game screen is tapped without looking. Anything that resizes or shifts the layout during play is a bug.

- **Reserve heights**:
  - the action slot under the panels is a fixed height;
  - the message bar is a fixed `82px` (`lscape:h-11`), and long messages step their font down to fit (no smaller than 11 px);
  - the five-button block is a fixed `160px`.
- **Refusal hints and toasts float** over the board with `pointer-events-none`. They never insert a row.
- **The chip stack over the seam (ratio, caps, pull) reserves its own room.** The panels pad their top by its measured height (`--chip-room`) so the names and numbers centre beneath it; a new chip in the stack gets that for free.
- **Overlays on the score panels must not hide the score.** The hand-signal card sizes itself to the room under the numbers (`.signal-art`). Anything decorative over a tappable area is `pointer-events-none`.
- **Touch targets:** at least 44 px. The 48 px left column is the floor.
- **When adding a message or a label, measure it** at 360 px in all three languages, the way the bar was measured. Shorten the copy before growing the box.

## 7. State and attention

- **Disabled is 40 % opacity.** So nothing that is _active_ may ever fade toward that. To draw attention:
  - use a **glow** (`animate-glow`), a ring that breathes outward while the element stays solid;
  - never use Tailwind's `pulse`.
- **Don't wash out what is merely blocked.**
  - Keep team colours at full strength between points.
  - Step back only the element that can't be used (the score digit, to 75 %).
- **Show state with the smallest mark, where the eye already is.** For example, a disc dot beside the name of the team holding it, rather than a second label.
- **Every press during play answers in the hand and on screen:** haptics, the amber flash and the badge pop. A dimmed button still takes the tap and buzzes the refusal (`dimmed`, not `disabled`).

## 8. Information design

- **Order a form by dependency:** whatever other fields read comes first (Game setup → Match → Coin toss → rules → Statistics).
- **Fold what is set once and only glanced at.** The rule sections start folded to a one-line summary ("15 pts · 100 min · CAP +1") and open only to change.
- **Show a field only when it applies** (the starting ratio only for mixed with ABBA, "Players of" only at player detail). Keep the value when it is hidden.
- **Don't repeat a heading as a row** ("Division — Division: Mixed"). Put a single fact in the heading's corner.
- **Every column of figures names its team** (a dot and the name) rather than relying on the order of something further up the page.
- **Units go on values, and labels stay short:** "100 min", "1m 15s", "45 s" (never `45''` or a raw seconds count).
- **Times use the 24-hour clock** (`hourCycle: 'h23'`) — every one, including the time of day in the game header and the log, which must not follow the phone's locale into AM/PM.
- **Dates:** always through `LOCALES` (en-GB style, "26 Nov 2026, 10:30"), never the bare language code, which turns English into US order. Include the year on anything that may be read later, such as the shared image or history.
- **Say things the way the sideline says them:**
  - "#3 Dani → #9 Eli", thrower first; with only one player named, fall back to "Goal: …" / "Assist: …";
  - the ratio in words: "Primero de chicos", "Men, first of two", never "(1)".
- **Titles stay neutral** where the state may change: the report is "Report", never "Final report", because a game can be resumed.
- **Nothing on the screen is missing from the shared image.** The image grows instead of cutting. It follows the screen's layout (meta line in the score card, team headers, section glyphs) and is always drawn light.

## 9. Words

- **Every string goes in all three dictionaries.** When a label changes, search the guide prose (`guide*`, `statsGuide*`) for the old label and update it too.
- **Short labels win.**
  - Prefer a short word to a sentence: "Copy", not "Copy to clipboard"; "Save template", not "Save as template"; "Team" / "Player", not "By team" / "By player".
  - Ultimate vocabulary stays English in every language where that is what the field says: `Logs`, `Roster`, the action-row labels.
- **One name per thing, everywhere it appears.** The button that opens something and the title of what opens share a word, and an action keeps its word and glyph wherever it is offered:
  - the log is **Logs** (the report's button, the dialog's title, the game's dialog);
  - copying is **Copy** with `CopyIcon`, the report's bar and the log dialog alike;
  - the archive is **Match history**.
- **Sentence case** for menu rows, titles and buttons ("Match history", "Beginner's guide"); headings get their capitals from CSS.
- **English is en-GB**: "colour", "favourite".
- **No internals or history in user text.** Guides and hints describe what the app does now, in the present tense.
- **Don't use rule names users don't know:** "Announce the gender ratio (ABBA)", not "Rule A / Rule B".

## 10. Process for a UI change

1. **Look first.** Take Playwright screenshots of the current screen at 360 × 740 and 360 × 640, in light and dark, landscape where it applies, and in Spanish or Catalan for anything with text.
2. **Propose, then build.** For a redesign, list numbered suggestions with the reason for each, and let the user pick. Build only what was picked.
3. **Screenshot again after the change** and look at the screenshots before reporting. Measure text that has to fit.
4. **Tests find things by role and visible label**, through the helpers in `src/__tests__/configFields.ts` (`choose`, `chosen`, `track`, `openRules`). Expose state as `data-*` attributes rather than asserting class names, except where the class _is_ the contract (for example the bar's fixed height).
5. **Update CLAUDE.md and this file** when a rule is added or overturned.

## 11. Tried and turned down

Don't bring these back without a new reason:

- **A coin-toss "field preview" diagram** under the coin toss, in two designs. The user found it unhelpful and it was removed.
- **Team colours on segmented choices**, and a team initial on the colour swatch.
- **Segments for "Players of".** Long team names were cut off, so it went back to a select.
- **A swap-teams button** on the Match card.
- **A gold warning for an empty roster.** It became a grey "Recommended …" nudge.
- **A "•" edited mark on a template chip.** It read as an unexplained second state.
- **The target ("Game at 15") shown in the header or as a pill on the board.** The cap chip says it when it matters.
- **Pulsing (fading) animations.** They look disabled; use the glow.
- **A row inserted for refusal hints.** It moved the board.
- **A bar that grows with its message.** It moved the board.
- **Separate language pickers on setup and the guides.** The language lives in Settings.
- **Outlined text back buttons** ("← Back to the game") and an "Exit report" button that duplicated "New game".
- **Ink-black primary buttons.** The accent is the one primary colour.
- **Amber to-do prompts** ("Scorer 1-0", "Register line"). They sat under the amber "Pull thrown" and competed with it for something that can wait.
- **Loose pill buttons or a short `<select>` in Settings.** Language and theme are `Segmented`, like the rest of the app.
