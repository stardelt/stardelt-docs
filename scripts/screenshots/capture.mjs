import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const NOVA_URL = process.env.NOVA_URL || 'https://alpha.dev.stardelt.io';
// Superset is embedded in Nova's Dashboards page. The embed has its own session: signing into
// Nova (Keycloak) is not enough, so the script signs into Superset once, through the same SSO,
// before the shots. Left signed out, that page shows the Superset sign-in form and the shot is
// worthless (that is how the old `dashboards.png` shipped a login screen).
const SUPERSET_URL = process.env.SUPERSET_URL || 'https://superset.alpha.dev.stardelt.io';
const NOVA_USER = process.env.NOVA_USER;
const NOVA_SECRET = process.env.NOVA_PASSWORD;

if (!NOVA_USER || !NOVA_SECRET) {
  console.error('NOVA_USER and NOVA password must be set');
  process.exit(1);
}

const OUT = path.resolve('static/img/nova');
const SQL =
  "SELECT pickup_dow_name, count(*) AS trips, round(avg(tip_pct), 1) AS avg_tip_pct FROM mobility.silver.yellow_trips GROUP BY 1 ORDER BY 2 DESC";

const shots = [
  { file: 'overview.png', route: '/', must: 'overview' },
  { file: 'pipeline.png', route: '/pipelines/stardelt/mobility-medallion', must: 'pipeline' },
  { file: 'lineage.png', route: '/lineage', must: 'lineage' },
  { file: 'sql.png', route: '/query', must: 'sql', runSql: SQL },
  { file: 'catalog.png', route: '/catalog', must: 'catalog' },
  { file: 'activity.png', route: '/jobs', must: 'activity' },
  // The Dashboards page opens on Superset's welcome; the entry tab lists the dashboards and
  // the first one renders in the same frame. Both clicks are what a person does.
  {
    file: 'dashboards.png',
    route: '/dashboards',
    must: 'dashboards',
    entry: 'Dashboards',
    open: /Mobility Operations/,
  },
];

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function login(page) {
  await page.goto(NOVA_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { timeout: 60000 });
  await page.fill('#username', NOVA_USER);
  await page.fill('#password', NOVA_SECRET);
  await page.click('#kc-login');
  await page.getByText('Overview', { exact: false }).first().waitFor({ timeout: 120000 });
}

/** The embedded Superset has its own session; with the Keycloak session above, one click completes it. */
async function loginSuperset(page) {
  await page.goto(SUPERSET_URL, { waitUntil: 'domcontentloaded' });
  const button = page.locator('#btn-signin-keycloak');
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  }
  const text = await page.locator('body').innerText().catch(() => '');
  if (/sign in with keycloak/i.test(text)) {
    throw new Error(`Superset at ${SUPERSET_URL} still shows its sign-in page after the SSO click`);
  }
}

/** Frames that still show a sign-in form: a screenshot of one is never a product screenshot. */
async function signedOutFrames(page) {
  const found = [];
  for (const frame of page.frames()) {
    const text = await frame.locator('body').innerText().catch(() => '');
    if (/sign in with keycloak/i.test(text)) found.push(frame.url());
  }
  return found;
}

async function captureSql(page) {
  // Nova's SQL editor: try common selectors (monaco textarea, contenteditable, textarea).
  const editor = page.locator('.monaco-editor textarea, [data-testid="sql-editor"], textarea.sql-editor, textarea').first();
  await editor.waitFor({ timeout: 30000 });
  await editor.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.type(SQL, { delay: 5 });
  // Run: try a Run button, then Ctrl+Enter.
  const run = page.getByRole('button', { name: /run|execute/i }).first();
  if (await run.isVisible().catch(() => false)) {
    await run.click();
  } else {
    await page.keyboard.press('Control+Enter');
  }
  // Wait for a result table.
  await page.locator('table, [role="table"], .results').first().waitFor({ timeout: 120000 }).catch(() => {});
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await login(page);
  await loginSuperset(page);
  for (const shot of shots) {
    await page.goto(new URL(shot.route, NOVA_URL).toString(), { waitUntil: 'domcontentloaded' });
    if (shot.runSql) {
      await settle(page);
      await captureSql(page);
    }
    if (shot.entry) {
      // The page opens on Superset's welcome; the tab switches the frame's path.
      await page.getByRole('button', { name: shot.entry, exact: true }).click();
      await page.waitForTimeout(2000);
    }
    if (shot.open) {
      // The dashboard runs inside the frame, so one more click keeps the Nova chrome visible.
      await page.frameLocator('iframe').getByRole('link', { name: shot.open }).first()
        .click({ timeout: 30000 });
      await page.waitForTimeout(6000);
    }
    await settle(page);
    const signedOut = await signedOutFrames(page);
    if (signedOut.length) {
      console.error(`skip ${shot.file}: still on a sign-in page (${signedOut.join(', ')})`);
      process.exitCode = 1;
      continue;
    }
    const out = path.join(OUT, shot.file);
    await page.screenshot({ path: out, fullPage: false });
    console.log(`wrote ${out}`);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
