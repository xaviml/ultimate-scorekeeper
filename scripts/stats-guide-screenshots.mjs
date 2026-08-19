/**
 * Regenerates the screenshots used by the statistics guide
 * (src/components/StatsGuideScreen.tsx) and prints the marker coordinates that go
 * with them.
 *
 * Playwright is not a runtime dependency of this project — it is only needed to
 * run this script:
 *
 *   yarn add -D playwright && npx playwright install chromium
 *   yarn dev                                          # in another terminal
 *   node scripts/stats-guide-screenshots.mjs
 *
 * It drives a real, fully tracked game through the real UI — By player, one team
 * followed, turnovers, turnover players, goal players and line tracking all on —
 * writes public/guide/stats-*.png, and dumps the FIG_* arrays to paste back into
 * StatsGuideScreen.tsx. The markers are measured from the live bounding boxes
 * rather than eyeballed, so they keep pointing at the right control after a
 * layout change.
 *
 * Its sibling, scripts/guide-screenshots.mjs, does the same for the first-timer's
 * walkthrough — and deliberately drives a game with everything switched *off*,
 * which is the other half of why these are two scripts and not one: the two
 * guides photograph two different apps.
 *
 * The screenshots are intentionally English-only: the numbered captions next to
 * them live in the dictionaries and translate on their own.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.GUIDE_BASE_URL ?? 'http://localhost:5173';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'guide');
const VIEWPORT = { width: 390, height: 844 };

const TEAM_A = 'Ravens';
const TEAM_B = 'Foxes';

/**
 * Eight players, four of each marking — enough for a line of seven plus a bench,
 * which is what makes the substitution rules real and the player table more than
 * one repeated row. Pasted through the importer rather than typed row by row:
 * that is both the path a real volunteer takes and eight fewer round trips.
 */
const ROSTER = [
  '1 Nia FMP',
  '3 Emma FMP',
  '5 Lia FMP',
  '7 Ada FMP',
  '2 Ben MMP',
  '4 Tom MMP',
  '6 Sam MMP',
  '8 Max MMP',
].join('\n');

/**
 * Two predefined lines, one per gender split, so alternating them keeps every
 * point on the ratio Rule A asks for — and so the report's Playing view has
 * players with genuinely different point counts rather than eight identical rows.
 */
const LINE_O = {
  name: 'O1',
  players: ['#1 Nia', '#3 Emma', '#5 Lia', '#7 Ada', '#2 Ben', '#4 Tom', '#6 Sam'],
};
const LINE_D = {
  name: 'D1',
  players: ['#1 Nia', '#3 Emma', '#5 Lia', '#2 Ben', '#4 Tom', '#6 Sam', '#8 Max'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * An element's box in *page* coordinates.
 *
 * `boundingBox()` is viewport-relative, while a `fullPage` clip is page-relative,
 * and this script scrolls a long setup form to reach the controls it toggles — so
 * the two disagree by exactly the scroll offset the moment anything has scrolled.
 * Everything below measures through here rather than through `boundingBox`.
 */
async function pageBox(page, element) {
  const box = await element.boundingBox();
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  return { ...box, x: box.x + scroll.x, y: box.y + scroll.y };
}

/** Percentage position of a point inside `element`, relative to the clip rect. */
async function marker(page, element, clip, ax = 0.5, ay = 0.5) {
  const box = await pageBox(page, element);
  const x = ((box.x + box.width * ax - clip.x) / clip.width) * 100;
  const y = ((box.y + box.height * ay - clip.y) / clip.height) * 100;
  return [Number(x.toFixed(1)), Number(y.toFixed(1))];
}

/** A clip rect spanning the page width, from the top of `from` to the bottom of `to`. */
async function span(page, from, to, padTop = 0) {
  const a = await pageBox(page, from);
  const b = await pageBox(page, to);
  const top = Math.max(0, a.y - padTop);
  return { x: 0, y: top, width: VIEWPORT.width, height: b.y + b.height - top + 12 };
}

/** A clip rect around one element, with a little air so its border isn't the edge. */
async function around(page, element, pad = 8) {
  const b = await pageBox(page, element);
  return {
    x: Math.max(0, b.x - pad),
    y: Math.max(0, b.y - pad),
    width: b.width + pad * 2,
    height: b.height + pad * 2,
  };
}

const out = {};

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'en-GB',
    colorScheme: 'dark',
  });
  const shot = (name, options) => page.screenshot({ path: join(OUT, name), ...options });
  // The dialogs have no role of their own (see Modal) — the panel is the only child
  // of the fixed backdrop, which is stable enough to scope every picker click to.
  const modal = page.locator('div.z-30 > div');
  /** Clicks a player chip inside whatever dialog is open, by its "#7 Ada" label. */
  const pick = (label) => modal.getByText(label, { exact: false }).first().click();

  await page.goto(BASE);
  await page.waitForSelector('text=Game setup');

  // --- Setup: teams -------------------------------------------------------
  await page.getByLabel('Team 1', { exact: true }).fill(TEAM_A);
  await page.getByLabel('Team 2', { exact: true }).fill(TEAM_B);
  await page.keyboard.press('Escape');
  await page.locator('h1').click(); // close the combobox suggestion panel
  await sleep(200);

  // The Grass template this screen opens on is already Mixed, sevens, to 15 — the
  // division is what puts a gender split on a line, so nothing here has to change
  // it. Sections, in render order: Setup, Statistics, then Roster (which only
  // exists from "By player"), the coin toss and the rules.
  const sections = page.locator('section');
  const setup = sections.nth(0);
  const stats = sections.nth(1);

  // --- Setup: the Statistics section --------------------------------------
  const statsSelect = stats.locator('select');
  await statsSelect.nth(0).selectOption('players');
  await sleep(150);
  // "Players of" defaults to both teams; line tracking follows a single roster, so
  // the whole line half of this guide depends on picking one here.
  await statsSelect.nth(1).selectOption('A');
  await sleep(150);

  const switchRow = (label) => stats.locator('label').filter({ hasText: label }).first();
  // `force` because the real checkbox is `sr-only` (see CheckField): the painted
  // switch beside it is what a finger hits, so Playwright's actionability check
  // sees the box as covered. The input is still the control being toggled.
  const setSwitch = async (label) => {
    await stats.getByLabel(label, { exact: true }).check({ force: true });
    await sleep(150);
  };
  await setSwitch('Turnovers');
  await setSwitch('Ask who turned it over');
  // "Ask who scored" is on by default; check() is a no-op if it already is.
  await setSwitch('Ask who scored');
  await setSwitch('Track who plays each point');

  const statsClip = await span(page, stats, stats);
  await shot('stats-setup.png', { clip: statsClip, fullPage: true });
  // The selects are pointed at from their left edge, the switches from the empty
  // right end of their row — a marker on the switch track would cover the very
  // thing the caption is telling the reader to look at.
  out.FIG_STATS_SETUP = [
    await marker(page, statsSelect.nth(0), statsClip, -0.04),
    await marker(page, statsSelect.nth(1), statsClip, -0.04),
    await marker(page, switchRow('Turnovers'), statsClip, 0.96),
    await marker(page, switchRow('Ask who turned it over'), statsClip, 0.96),
    await marker(page, switchRow('Ask who scored'), statsClip, 0.96),
    await marker(page, switchRow('Track who plays each point'), statsClip, 0.96),
  ];

  // --- Setup: the Roster section ------------------------------------------
  // Collapsed on a fresh load, so it has to be opened before anything in it can be
  // measured — and it is the third section only once "By player" has created it.
  await page.getByRole('button', { name: 'Expand Roster' }).click();
  await sleep(200);
  const roster = sections.nth(2);

  await roster.getByRole('button', { name: 'Import' }).click();
  await page.getByLabel('Players to import').fill(ROSTER);
  await sleep(200);
  await page.getByRole('button', { name: /^Import \d+$/ }).click();
  await sleep(300);

  // Both predefined lines, from the editor that sits under the roster they are
  // drawn from. A saved line is checked against nothing, so this never warns.
  for (const line of [LINE_O, LINE_D]) {
    await roster.getByRole('button', { name: 'Add a line' }).click();
    await page.getByLabel('Name this line').fill(line.name);
    for (const p of line.players) await pick(p);
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await sleep(250);
  }

  const rosterClip = await span(page, roster, roster);
  await shot('stats-roster.png', { clip: rosterClip, fullPage: true });
  out.FIG_STATS_ROSTER = [
    // In the seam between the number box and the name box — the add row is three
    // controls wide with nothing spare either side of it, and the seam is the only
    // spot in it that covers no placeholder.
    await marker(page, roster.locator('input[maxlength="40"]').first(), rosterClip, -0.06),
    // Left of the marking button, over the empty middle of the player's row — to its
    // right is the ✕ that deletes them.
    await marker(
      page,
      roster.locator('button', { hasText: /^(MMP|FMP|—)$/ }).first(),
      rosterClip,
      -0.55,
    ),
    await marker(page, roster.getByRole('button', { name: 'Import' }), rosterClip, -0.45),
    await marker(page, roster.getByRole('button', { name: 'Add a line' }), rosterClip, 0.08),
  ];

  // --- Into the game ------------------------------------------------------
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForSelector(`button[aria-label^="${TEAM_A}:"]`);

  const panelA = page.locator(`button[aria-label^="${TEAM_A}:"]`);
  const panelB = page.locator(`button[aria-label^="${TEAM_B}:"]`);
  const pullBtn = page.getByRole('button', { name: 'Pull thrown' });
  const turnBtn = page.getByRole('button', { name: 'Turnover — hold to undo' });

  /**
   * Commits the line dialog. An off-spec line warns rather than refusing and takes
   * a second, confirming tap (data-line-save: ready → warned → armed), which is
   * exactly what a line that cannot make the ratio does — so the commit is a loop
   * rather than a click.
   */
  const commitLine = async () => {
    const save = page.locator('[data-line-save]');
    for (let i = 0; i < 3 && (await save.count()); i++) {
      await save.click();
      await sleep(200);
    }
  };

  /** Registers a predefined line for the point about to be played, if asked to. */
  const registerLine = async (line) => {
    const prompt = page.getByRole('button', { name: 'Register line' });
    if (!(await prompt.count())) return;
    await prompt.click();
    await page.getByRole('button', { name: `Load ${line.name}` }).click();
    await sleep(200);
    await commitLine();
  };

  // Point one's line is registered before kickoff — the gap before the game starts
  // is the same gap every later line is decided in, which is why canSetLine is open
  // there. It is also the calmest moment to photograph the dialog.
  await page.getByRole('button', { name: 'Register line' }).click();
  await page.getByRole('button', { name: `Load ${LINE_O.name}` }).click();
  await sleep(300);
  await shot('stats-line.png', { clip: { x: 0, y: 0, ...VIEWPORT } });
  await commitLine();

  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForSelector('text=Pull thrown');
  // Nothing can be recorded until the disc is live — Turn and Call are both behind
  // canRecordEvent's `requiresPull`.
  await pullBtn.click();
  await sleep(400);

  /** Records a turnover, attributing it to one player of whichever roster is asked. */
  const turnover = async (capture) => {
    await turnBtn.click();
    await page.waitForSelector('text=Turnover');
    await sleep(300);
    if (capture) await shot(capture, { clip: { x: 0, y: 0, ...VIEWPORT } });
    // Only the followed team is ever asked about, so there is exactly one section:
    // whoever of ours is in the role this point puts them in.
    const chips = modal.locator('button').filter({ hasText: /^#\d/ });
    if (await chips.count()) await chips.first().click();
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await sleep(400);
  };

  /** Scores for `panel` and answers the scorer/assist dialog. */
  const goal = async (panel, scorer, assist, capture) => {
    await panel.click();
    await sleep(400);
    const dialog = page.getByText('Who scored for', { exact: false });
    if (await dialog.count()) {
      if (capture) await shot(capture, { clip: { x: 0, y: 0, ...VIEWPORT } });
      if (scorer) await pick(scorer);
      if (assist) await pick(assist);
      await modal.getByRole('button', { name: 'Save', exact: true }).click();
    }
    await sleep(600);
  };

  /**
   * One whole point: line, pull, a few turnovers, a goal. The waits are generous on
   * purpose — the report shows hold times, and a game where every point lasted a
   * second looks like a bug.
   */
  const point = async ({ line, seconds, turns, scorer, assist, panel }) => {
    await registerLine(line);
    if (await pullBtn.count()) await pullBtn.click();
    await sleep(Math.round((seconds * 1000) / (turns + 1)));
    for (let i = 0; i < turns; i++) {
      await turnover();
      await sleep(Math.round((seconds * 1000) / (turns + 1)));
    }
    await goal(panel, scorer, assist);
  };

  // Point 1: photographed step by step — the turnover dialog, then the goal dialog.
  await sleep(3000);
  await turnover('stats-turnover.png');
  await sleep(4000);
  await turnover();
  await sleep(3000);
  await goal(panelA, '#7 Ada', '#3 Emma', 'stats-goal.png');

  // A handful of points with different shapes, so the ledger has holds, breaks and
  // a long point in it rather than one repeated column.
  await point({ line: LINE_D, seconds: 9, turns: 0, panel: panelB });
  await point({
    line: LINE_O,
    seconds: 14,
    turns: 1,
    panel: panelA,
    scorer: '#5 Lia',
    assist: '#1 Nia',
  });
  await point({
    line: LINE_D,
    seconds: 18,
    turns: 3,
    panel: panelA,
    scorer: '#2 Ben',
    assist: '#6 Sam',
  });
  await point({ line: LINE_O, seconds: 8, turns: 0, panel: panelB });
  await point({
    line: LINE_D,
    seconds: 12,
    turns: 2,
    panel: panelA,
    scorer: '#8 Max',
    assist: '#4 Tom',
  });

  // --- The dashboard, mid-point -------------------------------------------
  // Everything below needs the disc live: the stats slot gives its place up to the
  // amber advance button between points, and the possession bar is only lit while
  // a point is running.
  await registerLine(LINE_O);
  await pullBtn.click();
  await sleep(2500);
  await turnBtn.click();
  await sleep(300);
  const chips = modal.locator('button').filter({ hasText: /^#\d/ });
  if (await chips.count()) await chips.first().click();
  await modal.getByRole('button', { name: 'Save', exact: true }).click();
  // The goal that ended the last point is still being announced — its words on the
  // bar, its sign over the panels — and this figure is about neither. Wait for the
  // queue to empty so the bar shows the standing amber line instead.
  await page.locator('figure.animate-signalIn').waitFor({ state: 'detached', timeout: 20000 });
  await sleep(800);

  const dash = { x: 0, y: 0, ...VIEWPORT };
  await shot('stats-dashboard.png', { clip: dash });
  const slot = page.locator('div[role=group][aria-label="Live statistics"]');
  out.FIG_STATS_DASHBOARD = [
    // Just above the bar, and a quarter of the way along it. Above, because a 24px
    // badge centred on a 4px strip spills into the stats labels underneath; and a
    // quarter along rather than at the halfway seam, because the seam is where the
    // fill stops, which is the one part of the strip worth seeing.
    await marker(page, page.locator('[data-possession]'), dash, 0.25, -3),
    await marker(page, page.getByRole('button', { name: 'Next statistic' }), dash, 0.5, 0.5),
    // The action row is wall-to-wall 60px buttons, so these three sit in the gutters
    // between them, as the walkthrough's own dashboard figure does — a badge on a
    // button covers either its glyph or its micro-label, and both are the caption.
    await marker(page, page.getByRole('button', { name: 'Roster', exact: true }), dash, 1.1, 0.5),
    await marker(page, page.getByRole('button', { name: 'What was called?' }), dash, -0.1, 0.5),
    await marker(page, turnBtn, dash, -0.1, 0.5),
  ];

  // The three pages of the live slot, cropped to the slot itself: at figure width a
  // full phone screenshot would render those 9px labels illegible, which is the one
  // thing the captions are explaining.
  const slotClip = await around(page, slot);
  await shot('stats-live-team.png', { clip: slotClip });
  await page.getByRole('button', { name: 'Next statistic' }).click();
  await sleep(300);
  await shot('stats-live-possession.png', { clip: slotClip });
  await page.getByRole('button', { name: 'Next statistic' }).click();
  await sleep(300);
  await shot('stats-live-pace.png', { clip: slotClip });

  // Finish the point, then the game, so the report is a real one.
  await goal(panelA, '#3 Emma', '#7 Ada');

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'End game' }).click();
  await page.getByRole('button', { name: 'End game' }).click();
  await page.waitForSelector('text=Game summary');
  await sleep(400);

  // --- The report ---------------------------------------------------------
  // Sections, in order: the score, the team figures, the possession ledger, the
  // player table, the game summary.
  const reportSections = page.locator('section');
  const scoreBox = reportSections.nth(0);
  const teamTable = reportSections.nth(1);
  const ledger = reportSections.nth(2);
  const players = reportSections.nth(3);

  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(200);
  const teamClip = await span(page, scoreBox, teamTable);
  await shot('stats-report-team.png', { fullPage: true, clip: teamClip });

  await shot('stats-report-ledger.png', { fullPage: true, clip: await around(page, ledger, 4) });

  // Playing is the view the whole line-tracking half of this guide is about, and
  // the one a reader will not have seen anywhere else.
  await players.getByRole('button', { name: 'Playing' }).click();
  await sleep(300);
  await shot('stats-report-players.png', { fullPage: true, clip: await around(page, players, 4) });

  await browser.close();

  for (const [name, markers] of Object.entries(out)) {
    console.log(
      `const ${name}: readonly Marker[] = [\n${markers
        .map(([x, y]) => `  [${x}, ${y}],`)
        .join('\n')}\n];`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
