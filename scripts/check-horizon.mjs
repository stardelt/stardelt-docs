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

// Goals live in `goal: '...'` (one per milestone). Kept compatible with the
// older `goals: [...]` shape.
const goals = [
  ...[...block[0].matchAll(/\bgoal:\s*'([^'\n]+)'/g)].map((m) => m[1]),
  ...[...block[0].matchAll(/goals:\s*\[([\s\S]*?)\]/g)].flatMap((m) =>
    [...m[1].matchAll(/'([^'\n]+)'/g)].map((s) => s[1]),
  ),
];

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
