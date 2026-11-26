/**
 * Regenerates the screenshots used by the in-app guide (src/components/GuideScreen.tsx)
 * and prints the marker coordinates that go with them.
 *
 * Playwright is not a dependency of this project — it is only needed to run this
 * script, so install it temporarily:
 *
 *   yarn add -D playwright && npx playwright install chromium
 *   yarn dev                                    # in another terminal
 *   node scripts/guide-screenshots.mjs          # GUIDE_BASE_URL to point elsewhere
 *   yarn remove playwright
 *
 * It drives a real game through the real UI, writes public/guide/*.png, and dumps
 * the FIG_* arrays to paste back into GuideScreen.tsx. The markers are measured
 * from the live bounding boxes rather than eyeballed, so they keep pointing at the
 * right control after a layout change.
 *
 * Always in the light theme, whatever the guide is read in: one set of pictures,
 * and the light one is what a phone outdoors shows. The screenshots are
 * English-only too: the numbered captions next to them live in the dictionaries
 * and translate on their own.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.GUIDE_BASE_URL ?? 'http://localhost:5173';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'guide');
const VIEWPORT = { width: 390, height: 844 };

// In capitals because that is how a team name is stored, and so how every label the
// script finds a control by spells it.
const TEAM_A = 'REDS';
const TEAM_B = 'BLUES';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * An element's box in *page* coordinates. `boundingBox()` is viewport-relative while
 * a `fullPage` clip is page-relative, so the two disagree once anything has scrolled.
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
async function span(page, from, to, padTop = 0, padBottom = 12) {
  const a = await pageBox(page, from);
  const b = await pageBox(page, to);
  const top = Math.max(0, a.y - padTop);
  return { x: 0, y: top, width: VIEWPORT.width, height: b.y + b.height - top + padBottom };
}

const out = {};

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'en-GB',
    colorScheme: 'light',
  });
  const shot = (name, options) => page.screenshot({ path: join(OUT, name), ...options });
  const section = (title) =>
    page.locator('section').filter({ has: page.getByRole('heading', { name: title }) });

  await page.goto(BASE);
  await page.waitForSelector('text=Game setup');
  // The sticky Start bar floats over whatever is under the bottom of the window,
  // which in a full-page capture is the middle of a section.
  const hideStartBar = await page.addStyleTag({
    content: 'div.sticky.bottom-0 { display: none !important; }',
  });

  // --- Setup screen -------------------------------------------------------
  await page.getByLabel('Team 1', { exact: true }).fill(TEAM_A);
  await page.getByLabel('Team 2', { exact: true }).fill(TEAM_B);
  await page.keyboard.press('Escape');
  await page.locator('h1').click(); // close the combobox suggestion panel
  await sleep(200);

  const setup = section('Game setup');
  const match = section('Match');
  const toss = section('Coin toss results');

  const setupClip = await span(page, page.locator('header'), match);
  await shot('setup.png', { clip: setupClip, fullPage: true });
  // Anchors are nudged off centre on purpose: a marker should sit beside the
  // control it points at, not on top of the value the reader is trying to read.
  out.FIG_SETUP = [
    await marker(page, setup.getByRole('radio', { name: 'Beach' }), setupClip, 1.12),
    await marker(page, setup.getByRole('radiogroup').nth(1), setupClip, 0.97, -0.05),
    await marker(page, page.getByLabel('Team 1', { exact: true }), setupClip, 0.97, -0.05),
    // The empty right end of the switch's row, clear of its label.
    await marker(page, match.locator('label:has(input[type=checkbox])').first(), setupClip, 0.97),
  ];

  const tossClip = await span(page, toss, toss);
  await shot('toss.png', { clip: tossClip, fullPage: true });
  const groups = toss.getByRole('radiogroup');
  out.FIG_TOSS = [
    await marker(page, groups.nth(0), tossClip, 0.97, -0.05),
    await marker(page, groups.nth(1), tossClip, 0.97, -0.05),
    await marker(page, groups.nth(2), tossClip, 0.97, -0.05),
  ];

  // The rules, with the first section opened to show what a folded summary stands
  // for and the rest folded to the one line they normally are.
  await section('Win conditions').locator('button').first().click();
  await sleep(300);
  const rulesClip = await span(page, section('Win conditions'), section('Statistics'));
  await shot('rules.png', { clip: rulesClip, fullPage: true });
  await hideStartBar.evaluate((el) => el.remove());

  // --- Dashboard ----------------------------------------------------------
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: 'Start game' }).click();
  // The dashboard opens on 'notStarted' and offers its own Start game button
  // (BEGIN_PLAY) — leaving the config screen does not start the clock, so this is
  // two taps, not one. Wait for the score panels before the second, or it can land
  // on the config screen's button again before React has swapped screens.
  await page.waitForSelector(`button[aria-label^="${TEAM_A}:"]`);
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForSelector('text=Pull thrown');
  await sleep(1200); // let the pull clock move off 00:00, keep the call-out on screen

  const dash = { x: 0, y: 0, ...VIEWPORT };
  await shot('dashboard.png', { clip: dash });
  const panelA = page.locator(`button[aria-label^="${TEAM_A}:"]`);
  const panelB = page.locator(`button[aria-label^="${TEAM_B}:"]`);
  const gameClockBox = page.getByText('Game clock', { exact: true }).locator('xpath=..');
  out.FIG_DASHBOARD = [
    await marker(page, page.locator('header'), dash, 0.62),
    await marker(page, panelB, dash, 0.78, 0.78),
    await marker(page, page.getByText(/^Pull: /), dash, -0.14),
    await marker(page, page.getByRole('button', { name: 'Pull thrown' }), dash, 0.08),
    await marker(page, gameClockBox, dash, 0.6, 0.18), // after the "Game clock" label
    // Inside Call, left of its glyph: the gutters between the buttons are too
    // narrow for a marker. The caption names the whole row.
    await marker(page, page.getByRole('button', { name: 'What was called?' }), dash, 0.14),
    await marker(page, page.locator('div[aria-live=assertive]'), dash, 0.92),
    // In the gap between the game clock's digits and the button.
    await marker(page, page.getByRole('button', { name: 'Pause game' }), dash, -0.6, 0.5),
  ];

  // Play a point so the "score / undo" figure shows a real scoreline.
  await page.getByRole('button', { name: 'Pull thrown' }).click();
  await sleep(6000);
  await panelA.click();
  await page.waitForSelector('text=Pull thrown');
  // Messages queue rather than overwrite (see useAssistQueue), so the goal waits out
  // "Game on!" before it reaches the bar. Wait for the call-out itself, then let the
  // goal signal settle beside it.
  await page
    .locator('div[aria-live=assertive]')
    .filter({ hasText: `${TEAM_A} 1, ${TEAM_B} 0` })
    .waitFor({ timeout: 20000 });
  await sleep(400);

  await shot('play.png', { clip: dash });
  out.FIG_PLAY = [
    await marker(page, page.getByRole('button', { name: 'Pull thrown' }), dash, 0.08),
    // Both on the same panel — the two gestures act on the same target — and clear
    // of the hand-signal card that sits in the bottom-left corner of the panels.
    await marker(page, panelA, dash, 0.3, 0.28),
    await marker(page, panelA, dash, 0.85, 0.66),
  ];

  // --- Call dialog --------------------------------------------------------
  // Calls are blocked until the pull is thrown, so this has to come after it.
  await page.getByRole('button', { name: 'Pull thrown' }).click();
  await sleep(400);
  await page.getByRole('button', { name: 'What was called?' }).click();
  await page.waitForSelector('text=Stall out');
  await sleep(300);
  await shot('record.png', { clip: dash });

  // Log the travel for real, so the dialog is left the way a real tap leaves it —
  // recorded straight away with no team, Statistics being off in this walkthrough.
  await page.getByRole('button', { name: 'Travel', exact: true }).click();
  await sleep(500);

  // --- A few more points, then the report ---------------------------------
  // Played out slowly on purpose: the report shows point times, and a game where
  // every point lasted a second looks like a bug.
  const point = async (panel, seconds) => {
    const pull = page.getByRole('button', { name: 'Pull thrown' });
    if (await pull.count()) await pull.click();
    await sleep(seconds * 1000);
    await panel.click();
    await sleep(1500);
  };
  await point(panelB, 14);
  await point(panelA, 9);

  // One timeout, mid-point, so the report's timeouts are not all zeros.
  await page.getByRole('button', { name: 'Pull thrown' }).click();
  await sleep(4000);
  await page.locator(`button[aria-label^="${TEAM_B} — "]`).click();
  await page.getByRole('button', { name: 'End timeout' }).click();
  await sleep(6000);
  await panelB.click();
  await sleep(1500);

  await point(panelA, 11);
  await point(panelA, 8);

  // "End game" is a row of the header menu, confirmed in a dialog that reuses
  // the same label.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'End game' }).click();
  await page.getByRole('button', { name: 'End game' }).click();
  await page.waitForSelector('text=Point by point');
  await sleep(300);

  // From the page header down to the start of "Point by point", without the
  // sticky Share bar, which would otherwise cover the bottom of the capture.
  await page.addStyleTag({ content: '[data-report-actions] { display: none !important; }' });
  const points = section('Point by point');
  const reportClip = await span(page, page.locator('header').first(), points);
  await shot('report.png', {
    fullPage: true,
    clip: { ...reportClip, height: Math.min(reportClip.height, 1100) },
  });

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
