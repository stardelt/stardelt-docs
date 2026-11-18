// Every doc is in exactly one sidebar; docs/index.md (the hub) is in none.
import fs from 'node:fs';
import path from 'node:path';
const { default: sidebars } = await import(path.resolve('sidebars.ts'));
const ids = [];
const walk = (items) => items.forEach((i) => typeof i === 'string' ? ids.push(i) : i.items && walk(i.items));
Object.values(sidebars).forEach(walk);
const docs = [];
const scan = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) scan(p); else if (/\.mdx?$/.test(e.name)) docs.push(p.slice(5).replace(/\.mdx?$/, ''));
});
scan('docs');
const missing = docs.filter((d) => d !== 'index' && !ids.includes(d));
const twice = ids.filter((d, i) => ids.indexOf(d) !== i);
if (missing.length || twice.length) { console.error({ missing, twice }); process.exit(1); }
console.log(`ok: ${docs.length - 1} pages, each in one sidebar`);
