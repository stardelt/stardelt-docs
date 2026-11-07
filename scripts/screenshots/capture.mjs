import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const NOVA_URL = process.env.NOVA_URL || 'https://alpha.dev.stardelt.io';
const NOVA_USER = process.env.NOVA_USER;
const NOVA_SECRET = process.env.NOVA_PASSWORD;

if (!NOVA_USER || !NOVA_SECRET) {
  console.error('NOVA_USER and NOVA secret must be set');
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
  { file: 'dashboards.png', route: '/dashboards', must: 'dashboards', optional: true },
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
  for (const shot of shots) {
    await page.goto(new URL(shot.route, NOVA_URL).toString(), { waitUntil: 'domcontentloaded' });
    if (shot.runSql) {
      await settle(page);
      await captureSql(page);
    }
    await settle(page);
    if (shot.optional) {
      const text = await page.locator('body').innerText().catch(() => '');
      if (/no dashboard/i.test(text) && !/mobility/i.test(text)) {
        console.log(`skip ${shot.file} (no dashboards listed)`);
        continue;
      }
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
