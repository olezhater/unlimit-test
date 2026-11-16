/**
 * capture-states.mjs — one screenshot per state in the spec.
 *
 * Reads spec/transaction-history.spec.json and visits every states[].route at
 * 1440x900, writing screenshots/<id>.png. Every route is loaded with
 * ?chrome=off, so the prototype scaffolding (prototypeAffordances) never
 * appears in a capture: the screenshots are product UI only. The one exception
 * is drawers/download-notice-*.png, which photographs the Download stub's
 * notice on purpose (toolbar.download.stub).
 *
 * Also writes:
 *   screenshots/widths/list-<w>.png     the list at every prototypeAffordances.widths,
 *                                       plus list-full.png (Full width, a 1920 window),
 *                                       and list-<w>-pinned.png with the heading pinned
 *   screenshots/drawers/*.png           the details drawer below the panel breakpoint
 *                                       (row click at 1280), the filters drawer, the
 *                                       Recipient or sender list (1280 and 1440), the
 *                                       account and Date dropdowns, a focused field and
 *                                       the Download statement notice
 *   screenshots/greyscale/<id>.png      the list and filtered list through the
 *                                       product's own greyscale toggle (?grey=1),
 *                                       for qaChecklist[0]
 *
 * Logos: Brandfetch redirects headless Chromium to its hotlinking guidelines,
 * so captures show the lettermark fallback for every merchant. That is the
 * fallback path working, not a defect; logos are checked in a real browser
 * (verified on the deployed build, spec logos.verification).
 *
 * The dev server must already be running (npm run dev). Playwright must be
 * installed — see README. This script installs nothing.
 *
 *   node scripts/capture-states.mjs [baseUrl]
 */

import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = resolve(REPO, 'spec/transaction-history.spec.json');
const OUT = resolve(REPO, 'screenshots');
const OUT_GREY = resolve(OUT, 'greyscale');
const OUT_WIDTHS = resolve(OUT, 'widths');
const OUT_DRAWERS = resolve(OUT, 'drawers');
/** Full width has no fixed frame; captured in a window this wide. */
const FULL_WIDTH_WINDOW = 1920;

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');

/** States that also get a desaturated capture: the list, and the list under filters. */
const GREYSCALE_STATES = ['list', 'filters_active'];

/** The skeleton holds for a minimum of 300ms (states.loading.behaviour) — catch it inside that. */
const LOADING_CAPTURE_DELAY = 150;
/** Past the 300ms skeleton, plus the default selection settling into the URL. */
const SETTLE_DELAY = 900;

const spec = JSON.parse(await readFile(SPEC, 'utf8'));
const { minWidth } = spec.meta;
const widths = spec.prototypeAffordances.widths;
const viewport = { width: 1440, height: 900 };

if (viewport.width < minWidth) {
  throw new Error(`Viewport ${viewport.width}px is below meta.minWidth ${minWidth}px.`);
}

/** Add query parameters to a spec route that may already carry some. */
function withParams(route, params) {
  const [path, search = ''] = route.split('?');
  const p = new URLSearchParams(search);
  for (const [key, value] of Object.entries(params)) p.set(key, value);
  return `${path}?${p.toString()}`;
}

await mkdir(OUT, { recursive: true });
await mkdir(OUT_GREY, { recursive: true });
await mkdir(OUT_WIDTHS, { recursive: true });
await mkdir(OUT_DRAWERS, { recursive: true });

const browser = await chromium.launch();
const results = [];
const pageErrors = [];

async function capture({ name, route, file, width = viewport.width, settle = SETTLE_DELAY, fullPage = true, before }) {
  const context = await browser.newContext({ viewport: { width, height: viewport.height }, deviceScaleFactor: 2, colorScheme: 'light' });
  const page = await context.newPage();
  page.on('pageerror', (err) => pageErrors.push(`${route} — ${err.message}`));
  try {
    const url = `${BASE}${route}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(settle);
    if (before) {
      await before(page);
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: file, fullPage });
    // Horizontal page scroll is a blocker in visual-qa; report it here so it is not missed.
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      chrome: document.querySelectorAll('.proto').length,
    }));
    results.push({ name, route, width, ...metrics });
    const warn = [
      metrics.overflow > 0 ? `⚠ horizontal overflow +${metrics.overflow}px` : '',
      metrics.chrome > 0 ? '⚠ prototype chrome visible' : '',
    ].filter(Boolean).join('  ');
    console.log(`✓ ${name.padEnd(22)} ${String(width).padEnd(5)} ${route}${warn ? '  ' + warn : ''}`);
  } catch (error) {
    results.push({ name, route, width, error: error.message });
    console.error(`✗ ${name.padEnd(22)} ${route} — ${error.message}`);
  } finally {
    await context.close();
  }
}

// 1. Every state in the spec, product UI only.
for (const state of spec.states) {
  await capture({
    name: state.id,
    route: withParams(state.route, { chrome: 'off' }),
    file: resolve(OUT, `${state.id}.png`),
    settle: state.id === 'loading' ? LOADING_CAPTURE_DELAY : SETTLE_DELAY,
    fullPage: state.id !== 'loading',
  });
}

// 2. The list at every width the prototype offers.
const list = spec.states.find((s) => s.id === 'list');
for (const width of widths) {
  await capture({
    name: `list@${width}`,
    route: withParams(list.route, { chrome: 'off' }),
    file: resolve(OUT_WIDTHS, `list-${width}.png`),
    width,
  });
}

// 2b. Full width.
await capture({
  name: 'list@full',
  route: withParams(list.route, { chrome: 'off' }),
  file: resolve(OUT_WIDTHS, 'list-full.png'),
  width: FULL_WIDTH_WINDOW,
});

// 2c. listBehaviour.headingCollapse — the pinned state at every width: the
// list scrolled, the heading collapsed above the pinned toolbar.
for (const [label, width] of [...widths.map((w) => [String(w), w]), ['full', FULL_WIDTH_WINDOW]]) {
  await capture({
    name: `pinned@${label}`,
    route: withParams(list.route, { chrome: 'off' }),
    file: resolve(OUT_WIDTHS, `list-${label}-pinned.png`),
    width,
    fullPage: false,
    before: (page) => page.evaluate(() => window.scrollTo(0, 600)),
  });
}

// 2c. The drawers. Below meta.layout.panelBreakpoint the details panel is a
// drawer opened by a row click; the filters drawer opens from its button.
const details = spec.states.find((s) => s.id === 'details');
const detailsTx = new URLSearchParams(details.route.split('?')[1]).get('tx');
await capture({
  name: 'details drawer',
  route: withParams(list.route, { chrome: 'off' }),
  file: resolve(OUT_DRAWERS, `details-${minWidth}.png`),
  width: minWidth,
  fullPage: false,
  before: (page) => page.click(`#row-${detailsTx}`),
});
await capture({
  name: 'filters drawer',
  route: withParams(list.route, { chrome: 'off' }),
  file: resolve(OUT_DRAWERS, 'filters.png'),
  fullPage: false,
  before: (page) => page.click('#filters-trigger'),
});
// filters.counterparty — the application's own listbox, opened from the
// keyboard so the highlighted option is captured with its focus treatment.
for (const w of [minWidth, viewport.width]) {
  await capture({
    name: `counterparty list ${w}`,
    route: withParams(list.route, { chrome: 'off' }),
    file: resolve(OUT_DRAWERS, `filters-counterparty-${w}.png`),
    width: w,
    fullPage: false,
    before: async (page) => {
      await page.click('#filters-trigger');
      await page.focus('.filters-drawer [role="combobox"]');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
    },
  });
}
// accountScope — the header listbox open, keyboard-highlighted on an option,
// the first of the three dropdowns (spec `dropdowns`).
await capture({
  name: 'account scope list',
  route: withParams(list.route, { chrome: 'off' }),
  file: resolve(OUT_DRAWERS, `account-scope-${minWidth}.png`),
  width: minWidth,
  fullPage: false,
  before: async (page) => {
    await page.focus('.appbar .dd-trigger');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
  },
});
// filters.date in the toolbar — the second dropdown, open, keyboard-highlighted.
await capture({
  name: 'date dropdown',
  route: withParams(list.route, { chrome: 'off' }),
  file: resolve(OUT_DRAWERS, `date-dropdown-${minWidth}.png`),
  width: minWidth,
  fullPage: false,
  before: async (page) => {
    await page.focus('.date-dropdown .dd-trigger');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
  },
});
// A focused field — the single focus ring on a filled field.
await capture({
  name: 'focused field',
  route: withParams(list.route, { chrome: 'off' }),
  file: resolve(OUT_DRAWERS, `focused-search-${minWidth}.png`),
  width: minWidth,
  fullPage: false,
  before: async (page) => {
    await page.focus('.date-dropdown .dd-trigger');
    await page.keyboard.press('Shift+Tab');
  },
});
// toolbar.download — "Download statement" pressed: the stub notice.
await capture({
  name: 'download stub notice',
  route: withParams(list.route, { chrome: 'off' }),
  file: resolve(OUT_DRAWERS, `download-notice-${minWidth}.png`),
  width: minWidth,
  fullPage: false,
  before: (page) => page.click('.text-action'),
});

// 3. Greyscale, through the product's own toggle rather than injected CSS.
for (const id of GREYSCALE_STATES) {
  const state = spec.states.find((s) => s.id === id);
  await capture({
    name: `${id} (greyscale)`,
    route: withParams(state.route, { chrome: 'off', grey: '1' }),
    file: resolve(OUT_GREY, `${id}.png`),
  });
}

await browser.close();

const failed = results.filter((r) => r.error);
const overflowing = results.filter((r) => r.overflow > 0);
const leaked = results.filter((r) => r.chrome > 0);

console.log(
  `\n${spec.states.length} states, ${widths.length + 1} widths, 8 overlays, ${widths.length + 1} pinned, ${GREYSCALE_STATES.length} greyscale — ` +
    `${results.length - failed.length}/${results.length} captured`,
);
if (overflowing.length) console.log(`Horizontal page scroll (blocker): ${overflowing.map((r) => r.name).join(', ')}`);
if (leaked.length) console.log(`Prototype chrome leaked into: ${leaked.map((r) => r.name).join(', ')}`);
if (pageErrors.length) console.log(`\nPage errors:\n${pageErrors.map((e) => `  ${e}`).join('\n')}`);
if (failed.length) {
  console.error(`\n${failed.length} capture(s) failed.`);
  process.exitCode = 1;
}
