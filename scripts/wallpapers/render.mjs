import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { designs } from './designs.mjs';

const sizes = [
  { name: '16x10', w: 3456, h: 2234 },
  { name: '16x9', w: 3840, h: 2160 },
];

const outDir = resolve(process.cwd(), 'static/img/wallpapers');
mkdirSync(outDir, { recursive: true });

const cached = resolve(
  process.env.HOME || '',
  '.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell',
);
const launch = existsSync(cached) ? { executablePath: cached } : {};
const browser = await chromium.launch(launch);
try {
  for (const [name, design] of Object.entries(designs)) {
    for (const size of sizes) {
      const svg = design(size.w, size.h);
      const svgPath = resolve(outDir, `${name}-${size.name}.svg`);
      writeFileSync(svgPath, svg, 'utf8');

      const page = await browser.newPage({ viewport: { width: size.w, height: size.h } });
      await page.setContent(`<body style="margin:0">${svg}</body>`, { waitUntil: 'load' });
      await page.screenshot({
        path: resolve(outDir, `${name}-${size.name}.jpg`),
        type: 'jpeg',
        quality: 92,
      });
      await page.close();
      console.log(`wrote ${name}-${size.name}`);
    }

    // Thumbnail at 640px wide (16x10 only), viewport 640 × 414, SVG scaled with width:100%.
    const thumbSize = sizes[0];
    const svg = design(thumbSize.w, thumbSize.h).replace(
      /width="\d+" height="\d+"/,
      'width="100%" height="100%"',
    );
    const page = await browser.newPage({ viewport: { width: 640, height: 414 } });
    await page.setContent(`<body style="margin:0">${svg}</body>`, { waitUntil: 'load' });
    await page.screenshot({
      path: resolve(outDir, `thumb-${name}.jpg`),
      type: 'jpeg',
      quality: 92,
    });
    await page.close();
    console.log(`wrote thumb-${name}`);
  }
} finally {
  await browser.close();
}
