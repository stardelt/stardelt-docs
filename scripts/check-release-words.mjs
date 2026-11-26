// No page in docs/ hand-types a release or links to main: it writes @tag@, @version@, @python@ or
// @ref@, and src/remark/release-words.mjs fills in the words of the release the page describes.
// docs/reference/ is generated and records its own source commit, so it is not checked.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const LITERAL = /\bv0\.\d+\.\d+\b|stardelt\/stardelt\/(tree|blob)\/main\/|githubusercontent\.com\/stardelt\/stardelt\/main\//;
const SKIP = path.join('docs', 'reference');
const files = [];
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
  const p = path.join(dir, entry.name);
  if (entry.isDirectory()) { if (p !== SKIP) walk(p); } else if (/\.mdx?$/.test(entry.name)) files.push(p);
});
walk('docs');
const hits = [];
for (const file of files) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (LITERAL.test(line)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
  });
}
if (hits.length) {
  hits.forEach((hit) => console.error(`✗ ${hit}`));
  console.error('✗ write @tag@, @version@, @python@ or @ref@ instead (src/remark/release-words.mjs)');
  process.exit(1);
}
console.log(`ok: ${files.length} pages name no release by hand`);
