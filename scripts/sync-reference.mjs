#!/usr/bin/env node
// Refresh reference-src/ from the public repositories.
//
// This is the only script that talks to the network. It copies the operator's
// JSON Schemas (and examples, when it publishes them) and Nova's OpenAPI
// document, then records the source commits in reference-src/README.md.
// It never runs in CI; generated pages are checked against the committed
// snapshots by scripts/gen-reference.mjs.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'reference-src');

const operatorRepo = 'stardelt/stardelt-operator';
const novaRepo = 'stardelt/stardelt-nova';

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'stardelt-docs-reference-sync',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function request(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status} ${response.statusText}`);
  }
  return response;
}

async function json(url) {
  return (await request(url)).json();
}

async function text(url) {
  return (await request(url)).text();
}

async function commitSha(repo) {
  const commit = await json(`https://api.github.com/repos/${repo}/commits/main`);
  if (typeof commit.sha !== 'string' || commit.sha.length < 7) {
    throw new Error(`no commit SHA for ${repo}`);
  }
  return commit.sha;
}

/** Contents of a directory at a commit, or null when the repo has no such directory. */
async function directory(repo, path, ref) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`;
  const response = await fetch(url, { headers });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status} ${response.statusText}`);
  }
  const entries = await response.json();
  if (!Array.isArray(entries)) {
    throw new Error(`${url} did not answer a directory listing`);
  }
  return entries;
}

async function writeDownload(file, url) {
  const body = await text(url);
  await writeFile(file, body);
  console.log(`  ${file.slice(root.length + 1)}`);
}

async function main() {
  const [operatorSha, novaSha] = await Promise.all([
    commitSha(operatorRepo),
    commitSha(novaRepo),
  ]);

  const schemas = await directory(operatorRepo, 'schemas', operatorSha);
  if (!schemas) throw new Error(`${operatorRepo} has no schemas/ directory`);

  await rm(join(srcDir, 'schemas'), { recursive: true, force: true });
  await mkdir(join(srcDir, 'schemas'), { recursive: true });

  const schemaFiles = schemas
    .filter((entry) => entry.type === 'file' && entry.name.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (schemaFiles.length === 0) throw new Error(`${operatorRepo}/schemas has no *.json files`);

  console.log(`schemas from ${operatorRepo}@${operatorSha.slice(0, 8)}:`);
  for (const entry of schemaFiles) {
    if (!entry.download_url) throw new Error(`${entry.name} has no download_url`);
    await writeDownload(join(srcDir, 'schemas', entry.name), entry.download_url);
  }

  const examples = await directory(operatorRepo, 'examples', operatorSha);
  const exampleFiles = (examples || [])
    .filter((entry) => entry.type === 'file' && entry.name.endsWith('.yaml'))
    .sort((a, b) => a.name.localeCompare(b.name));

  await rm(join(srcDir, 'examples'), { recursive: true, force: true });
  if (exampleFiles.length > 0) {
    await mkdir(join(srcDir, 'examples'), { recursive: true });
    console.log(`examples from ${operatorRepo}@${operatorSha.slice(0, 8)}:`);
    for (const entry of exampleFiles) {
      if (!entry.download_url) throw new Error(`${entry.name} has no download_url`);
      await writeDownload(join(srcDir, 'examples', entry.name), entry.download_url);
    }
  }

  console.log(`OpenAPI document from ${novaRepo}@${novaSha.slice(0, 8)}:`);
  await writeDownload(
    join(srcDir, 'nova-openapi.json'),
    `https://raw.githubusercontent.com/${novaRepo}/${novaSha}/openapi/nova.json`,
  );

  const synced = new Date().toISOString().slice(0, 10);
  const readme = `# Reference snapshots

Do not edit these files by hand. \`npm run sync:reference\` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
| \`schemas/*.json\`${exampleFiles.length > 0 ? ', `examples/*.yaml`' : ''} | [\`${operatorRepo}\`](https://github.com/${operatorRepo}) | \`${operatorSha}\` | ${synced} |
| \`openapi/nova.json\` | [\`${novaRepo}\`](https://github.com/${novaRepo}) | \`${novaSha}\` | ${synced} |

\`npm run gen:reference\` turns these snapshots into \`docs/reference/\`; CI fails when the committed pages and
the snapshots disagree. The snapshots are byte copies, but the generator drops references to internal design
notes and decision records from prose descriptions, because those do not belong on the public site.
`;

  await writeFile(join(srcDir, 'README.md'), readme);
  console.log(`  reference-src/README.md (${synced})`);
}

main().catch((error) => {
  console.error(`sync-reference: ${error.message}`);
  process.exitCode = 1;
});
