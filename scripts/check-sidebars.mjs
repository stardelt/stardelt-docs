// Every doc is in exactly one sidebar of its instance; docs/index.md (the hub) is in none.
import fs from 'node:fs';
import path from 'node:path';

const instances = [['docs', 'sidebars.ts'], ['project', 'sidebars-project.ts']];
let failed = false;
for (const [dir, file] of instances) {
  const { default: sidebars } = await import(path.resolve(file));
  const ids = [];
  const walk = (items) => items.forEach((i) => typeof i === 'string' ? ids.push(i) : i.items && walk(i.items));
  Object.values(sidebars).forEach(walk);
  const docs = [];
  const scan = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) scan(p); else if (/\.mdx?$/.test(e.name)) docs.push(p.slice(dir.length + 1).replace(/\.mdx?$/, ''));
  });
  scan(dir);
  const hub = dir === 'docs' ? ['index'] : [];
  const missing = docs.filter((d) => !hub.includes(d) && !ids.includes(d));
  const twice = ids.filter((d, i) => ids.indexOf(d) !== i);
  if (missing.length || twice.length) { console.error(dir, { missing, twice }); failed = true; continue; }
  console.log(`ok: ${dir}: ${docs.length - hub.length} pages, each in one sidebar`);
}
process.exit(failed ? 1 : 0);
