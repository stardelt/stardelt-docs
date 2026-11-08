#!/usr/bin/env node
// Fails when a goal in the home page's horizon is not word for word in docs/roadmap.md.
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const roadmap = read('docs/roadmap.md');
const page = read('src/pages/index.tsx');

const block = page.match(/const horizon: HorizonStop\[\] = \[[\s\S]*?\n\];/);
if (!block) {
  console.error('check-horizon: `const horizon: HorizonStop[] = [...]` not found in src/pages/index.tsx');
  process.exit(1);
}

// Goals live inside `goals: [...]` (single- or multi-line). The ticket's original
// regex only matched bare quoted lines, which missed inline arrays like
// `goals: ['...']`; fixed here so the check covers all 7 goals as the ticket intends.
const goalArrays = [...block[0].matchAll(/goals:\s*\[([\s\S]*?)\]/g)].map((m) => m[1]);
const goals = goalArrays.flatMap((a) => [...a.matchAll(/'([^'\n]+)'/g)].map((m) => m[1]));

if (goals.length < 7) {
  console.error(`check-horizon: found ${goals.length} goals, expected at least 7`);
  process.exit(1);
}

const missing = goals.filter((goal) => !roadmap.includes(goal));
if (missing.length > 0) {
  for (const goal of missing) {
    console.error(`check-horizon: not in docs/roadmap.md: ${goal}`);
  }
  process.exit(1);
}

console.log(`horizon ok (${goals.length} goals match docs/roadmap.md)`);
