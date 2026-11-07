// Every literal /img/... path in the site source must exist under static/.
//   node scripts/check-images.mjs        → exit 0 when all resolve, 1 with the broken ones
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOTS = ['docs', 'src', 'static'];   // static itself is copied; references live in docs/ and src/
const PATTERN = /\/img\/[A-Za-z0-9._/-]+\.(?:png|svg|jpe?g|webp)/g;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(md|mdx|ts|tsx|js|mjs|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const broken = [];
let seen = 0;
for (const file of (await Promise.all(ROOTS.map(walk))).flat()) {
  const text = await readFile(file, 'utf8');
  for (const [ref] of text.matchAll(PATTERN)) {
    seen += 1;
    const asset = path.join('static', ref);
    try { await stat(asset); } catch { broken.push(`${file}: ${ref}`); }
  }
}

if (broken.length) {
  console.error(`broken image reference(s):\n${broken.join('\n')}`);
  process.exit(1);
}
console.log(`ok: ${seen} image reference(s) resolve`);
