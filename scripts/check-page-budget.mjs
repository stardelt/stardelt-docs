// Every hand-written page has a description and a word budget.
//   node scripts/check-page-budget.mjs          → exit 0 when all fit, 1 with the offenders
//   node scripts/check-page-budget.mjs --write  → rewrite scripts/page-budgets.json from the tree
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BUDGETS = 'scripts/page-budgets.json';
const REFERENCE = path.join('docs', 'reference') + path.sep;
const HUB = path.join('docs', 'index.md');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full + path.sep !== REFERENCE) out.push(...walk(full));
    } else if (entry.name.endsWith('.md') && full !== HUB) {
      out.push(full);
    }
  }
  return out;
}

function pageId(file) {
  return file.split(path.sep).slice(1).join('/').replace(/\.md$/, '');
}

function hasDescription(text) {
  const lines = text.split('\n').map((line) => line.replace(/\r$/, ''));
  const start = lines.indexOf('---');
  if (start === -1) return false;
  const end = lines.indexOf('---', start + 1);
  if (end === -1) return false;
  return lines.slice(start + 1, end).some((line) => {
    if (!line.startsWith('description:')) return false;
    return line.slice('description:'.length).trim().length > 0;
  });
}

const pages = [...walk('docs'), ...walk('project')].sort().map((file) => {
  const text = readFileSync(file, 'utf8');
  return {
    id: pageId(file),
    words: text.split(/\s+/).filter((word) => word !== '').length,
    description: hasDescription(text),
  };
});

if (process.argv.includes('--write')) {
  const budgets = {};
  for (const page of pages) budgets[page.id] = page.words;
  const sorted = {};
  for (const id of Object.keys(budgets).sort()) sorted[id] = budgets[id];
  writeFileSync(BUDGETS, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`wrote ${pages.length} budgets to ${BUDGETS}`);
  process.exit(0);
}

const budgets = existsSync(BUDGETS) ? JSON.parse(readFileSync(BUDGETS, 'utf8')) : {};
const offenders = [];
const needing = new Set();
for (const page of pages) {
  if (!page.description) {
    offenders.push(`${page.id}: no description`);
    needing.add(page.id);
  }
  if (!(page.id in budgets)) {
    offenders.push(`${page.id}: no budget — run node scripts/check-page-budget.mjs --write`);
    needing.add(page.id);
  } else if (page.words > budgets[page.id]) {
    offenders.push(`${page.id}: ${page.words} words, budget ${budgets[page.id]}`);
    needing.add(page.id);
  }
}

if (offenders.length) {
  for (const line of offenders) console.error(`✗ ${line}`);
  console.error(`✗ ${needing.size} of ${pages.length} pages need attention`);
  process.exit(1);
}
console.log(`ok: ${pages.length} pages within budget`);
