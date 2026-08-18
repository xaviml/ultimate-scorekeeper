/**
 * Regenerates the screenshots used by the in-app guide (src/components/GuideScreen.tsx)
 * and prints the marker coordinates that go with them.
 *
 * Playwright is not a dependency of this project — it is only needed to run this
 * script, so install it temporarily:
 *
 *   yarn add -D playwright && npx playwright install chromium
 *   yarn dev                                    # in another terminal
 *   node scripts/guide-screenshots.mjs
 *   yarn remove playwright
 *
 * It drives a real game through the real UI, writes public/guide/*.png, and dumps
 * the FIG_* arrays to paste back into GuideScreen.tsx. The markers are measured
 * from the live bounding boxes rather than eyeballed, so they keep pointing at the
 * right control after a layout change.
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

const TEAM_A = 'Reds';
const TEAM_B = 'Blues';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Percentage position of a point inside `element`, relative to the clip rect. */
async function marker(element, clip, ax = 0.5, ay = 0.5) {
  const box = await element.boundingBox();
  const x = ((box.x + box.width * ax - clip.x) / clip.width) * 100;
  const y = ((box.y + box.height * ay - clip.y) / clip.height) * 100;
  return [Number(x.toFixed(1)), Number(y.toFixed(1))];
}

/** A clip rect spanning the page width, from the top of `from` to the bottom of `to`. */
async function span(page, from, to, padTop = 0) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  const top = Math.max(0, a.y - padTop);
  return { x: 0, y: top, width: VIEWPORT.width, height: b.y + b.height - top + 12 };
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

  await page.goto(BASE);
  await page.waitForSelector('text=Game setup');

  // --- Setup screen -------------------------------------------------------
  await page.getByLabel('Team 1', { exact: true }).fill(TEAM_A);
  await page.getByLabel('Team 2', { exact: true }).fill(TEAM_B);
  await page.keyboard.press('Escape');
  await page.locator('h1').click(); // close the combobox suggestion panel
  await sleep(200);

  // Template and division/teams/starting-time now live in one merged "Setup"
  // section; Stats (the statsMode picker) is its own section right after it.
  // The Roster section itself only renders once statsMode is 'team'/'player', so
  // this default (stats-off) walkthrough never reaches it — the setup figure
  // points at the Stats section instead, which is where that choice is made.
  const sections = page.locator('section');
  const [setup, stats, toss, win, timeouts] = [0, 1, 2, 3, 5].map((i) => sections.nth(i));

  const setupClip = await span(page, page.locator('header'), stats);
  await shot('setup.png', { clip: setupClip, fullPage: true });
  // Anchors are nudged off centre on purpose: a marker should sit beside the
  // control it points at, not on top of the value the reader is trying to read.
  out.FIG_SETUP = [
    await marker(setup.locator('select').first(), setupClip, -0.04),
    await marker(setup.locator('select').nth(1), setupClip, -0.04),
    await marker(page.getByLabel('Team 1', { exact: true }), setupClip, -0.04),
    await marker(setup.locator('input[type=checkbox]'), setupClip),
    await marker(stats.locator('h2'), setupClip, 1.05),
  ];

  const tossClip = await span(page, toss, toss);
  await shot('toss.png', { clip: tossClip, fullPage: true });
  out.FIG_TOSS = [
    await marker(toss.locator('select').nth(0), tossClip, -0.04),
    await marker(toss.locator('select').nth(1), tossClip, -0.04),
    await marker(toss.locator('select').nth(2), tossClip, -0.04),
  ];

  const rulesClip = await span(page, win, timeouts);
  await shot('rules.png', { clip: rulesClip, fullPage: true });

  // --- Dashboard ----------------------------------------------------------
  await page.getByRole('button', { name: 'Start game' }).click();
  // The dashboard opens on 'notStarted' and offers its own Start game button
  // (BEGIN_PLAY) — leaving the config screen no longer starts the clock, so this
  // is two taps, not one. Wait for the score panels before the second, or it can
  // land on the config screen's button again before React has swapped screens.
  await page.waitForSelector(`button[aria-label^="${TEAM_A}:"]`);
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForSelector('text=Pull thrown');
  await sleep(1200); // let the pull clock move off 00:00, keep the call-out on screen

  const dash = { x: 0, y: 0, ...VIEWPORT };
  await shot('dashboard.png', { clip: dash });
  const panelA = page.locator(`button[aria-label^="${TEAM_A}:"]`);
  const panelB = page.locator(`button[aria-label^="${TEAM_B}:"]`);
  const gameClockBox = page.locator('text=Game clock').locator('xpath=..');
  out.FIG_DASHBOARD = [
    await marker(page.locator('header'), dash, 0.28),
    await marker(panelB, dash, 0.78, 0.78),
    await marker(page.locator('text=/^Pull: /'), dash, -0.06),
    await marker(page.getByRole('button', { name: 'Pull thrown' }), dash, 0.08),
    // The clock row and the button row are wall-to-wall, so these two sit in the
    // only free space each has: the end of the clock's label line, and the gutter
    // between two buttons. The action row is pointed at through Call, which sits
    // in it rather than at either end — the caption names the whole row. Call is
    // the last of the three buttons in this default (stats-off) demo, so the
    // gutter used is the one to its left, not its right (there's nothing there).
    await marker(gameClockBox, dash, 0.95, 0.18),
    await marker(page.getByRole('button', { name: 'What was called?' }), dash, -0.12),
    await marker(page.locator('div[aria-live=assertive]'), dash, 0.92),
    await marker(page.getByRole('button', { name: 'Pause game' }), dash, 1.4, 0.5),
  ];

  // Play a point so the "score / undo" figure shows a real scoreline.
  await page.getByRole('button', { name: 'Pull thrown' }).click();
  await sleep(800);
  await panelA.click();
  await page.waitForSelector('text=Pull thrown');
  // Messages queue rather than overwrite (see useAssistQueue), so the goal waits out
  // the seven seconds of "Game on!" before it reaches the bar. A fixed beat here
  // photographs the pull message instead of the score the figure is about — wait for
  // the call-out itself, then let the goal signal settle beside it.
  await page
    .locator('div[aria-live=assertive]')
    .filter({ hasText: `${TEAM_A} 1, ${TEAM_B} 0` })
    .waitFor();
  await sleep(400);

  await shot('play.png', { clip: dash });
  out.FIG_PLAY = [
    await marker(page.getByRole('button', { name: 'Pull thrown' }), dash, 0.08),
    // Both on the same panel — the two gestures act on the same target — and clear
    // of the hand-signal card that sits in the bottom-left corner of the panels.
    await marker(panelA, dash, 0.3, 0.28),
    await marker(panelA, dash, 0.85, 0.8),
  ];

  // --- Call dialog --------------------------------------------------------
  // Calls are blocked until the pull is thrown, so this has to come after it.
  await page.getByRole('button', { name: 'Pull thrown' }).click();
  await sleep(400);
  await page.getByRole('button', { name: 'What was called?' }).click();
  await page.waitForSelector('text=Stall out');
  await sleep(300);
  await shot('record.png', { clip: dash });

  // Log the travel for real, so the dialog is left the way a real tap leaves it.
  // It no longer reaches the report's history — that panel leaves the calls and
  // the turnovers out (see reportLogEntries), and this one is only readable
  // behind its "Full log" button. Points below are played out slowly on purpose:
  // the report shows hold times, and a game where every point lasted a second
  // looks like a bug.
  // Recorded straight away with no team, same as every attribution in this demo —
  // "Track game activity" is off, the default this walkthrough demonstrates.
  await page.getByRole('button', { name: 'Travel', exact: true }).click();
  await sleep(500);

  // --- A few more points, then the report ---------------------------------
  const point = async (panel, seconds) => {
    const pull = page.getByRole('button', { name: 'Pull thrown' });
    if (await pull.count()) await pull.click();
    await sleep(seconds * 1000);
    await panel.click();
    await sleep(1500);
  };
  await point(panelB, 14);
  await point(panelA, 9);

  // One timeout, mid-point, so the report's "timeouts used" is not all zeros.
  await page.getByRole('button', { name: 'Pull thrown' }).click();
  await sleep(4000);
  await page.locator(`button[aria-label^="${TEAM_B} — "]`).click();
  await page.getByRole('button', { name: 'End timeout' }).click();
  await sleep(6000);
  await panelB.click();
  await sleep(1500);

  await point(panelA, 11);
  await point(panelA, 8);

  // The leave button now lives behind the header's menu (GameMenuDialog), which
  // also gates the setup/guide doors — open it, pick the "End game" row, then
  // confirm in ConfirmEndGameDialog, which reuses the same label.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'End game' }).click();
  await page.getByRole('button', { name: 'End game' }).click();
  await page.waitForSelector('text=Game history');
  await sleep(300);

  // The report's top element is the back-to-the-game button rather than a heading:
  // it is a layer over the game now, not the end of the line, so nothing up there
  // says "Final report" any more.
  const report = page.getByRole('button', { name: /Back to the game/ });
  const history = page.locator('section').nth(2);
  const reportClip = await span(page, report, history);
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
