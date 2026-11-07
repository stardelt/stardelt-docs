import {chromium} from 'playwright';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = path.join(__dirname, 'og.html');
const out = path.join(__dirname, '..', '..', 'static', 'img', 'og-stardelt.png');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport: {width: 1200, height: 630}});
  await page.goto(`file://${html}`, {waitUntil: 'networkidle'});
  await page.screenshot({path: out, type: 'png'});
  console.log(out);
} finally {
  await browser.close();
}
