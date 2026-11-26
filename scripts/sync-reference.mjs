#!/usr/bin/env node
// Refresh reference-src/ from the public repositories.
//
// This is the only script that talks to the network. It copies the operator's
// JSON Schemas (and examples, when it publishes them) and Nova's OpenAPI
// document, then records the source commits in reference-src/README.md.
// It never runs in CI; generated pages are checked against the committed
// snapshots by scripts/gen-reference.mjs.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'reference-src');

// One product repository since the merge (D49): the operator and Nova are folders of it.
const repo = 'stardelt/stardelt';
const operatorDir = 'operator';
const novaDir = 'nova';
const pythonDir = 'python';
const operatorLink = `https://github.com/${repo}/tree/main/${operatorDir}`;
const novaLink = `https://github.com/${repo}/tree/main/${novaDir}`;
const pythonLink = `https://github.com/${repo}/tree/main/${pythonDir}`;

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

/**
 * The newest commit that touched any of `paths` — the revision the snapshot really came from.
 * The branch head is the wrong answer for the README's `Commit` column: it moves on every merge,
 * including the many that never touch the artifact, so the row is stale the same day it is synced
 * (docs#847, #850). `GET /repos/{repo}/commits?path=` answers with the commits that changed a path.
 */
async function artifactSha(repo, paths) {
  const commits = await Promise.all(
    paths.map(async (path) => {
      const list = await json(
        `https://api.github.com/repos/${repo}/commits?path=${path}&per_page=1`,
      );
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error(`no commit touches ${repo}/${path}`);
      }
      return list[0];
    }),
  );
  commits.sort((a, b) => (a.commit.committer.date < b.commit.committer.date ? 1 : -1));
  const sha = commits[0].sha;
  if (typeof sha !== 'string' || sha.length < 7) {
    throw new Error(`no commit SHA for ${repo}/${paths.join(',')}`);
  }
  return sha;
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
  const [operatorSha, novaSha, cliSha] = await Promise.all([
    artifactSha(repo, [`${operatorDir}/schemas`, `${operatorDir}/examples`]),
    artifactSha(repo, [`${novaDir}/openapi/nova.json`]),
    artifactSha(repo, [`${pythonDir}/stardelt/cli.json`]),
  ]);

  const schemas = await directory(repo, `${operatorDir}/schemas`, operatorSha);
  if (!schemas) throw new Error(`${repo} has no ${operatorDir}/schemas/ directory`);

  await rm(join(srcDir, 'schemas'), { recursive: true, force: true });
  await mkdir(join(srcDir, 'schemas'), { recursive: true });

  const schemaFiles = schemas
    .filter((entry) => entry.type === 'file' && entry.name.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (schemaFiles.length === 0) throw new Error(`${repo}/${operatorDir}/schemas has no *.json files`);

  console.log(`schemas from ${repo}/${operatorDir}@${operatorSha.slice(0, 8)}:`);
  for (const entry of schemaFiles) {
    if (!entry.download_url) throw new Error(`${entry.name} has no download_url`);
    await writeDownload(join(srcDir, 'schemas', entry.name), entry.download_url);
  }

  const examples = await directory(repo, `${operatorDir}/examples`, operatorSha);
  const exampleFiles = (examples || [])
    .filter((entry) => entry.type === 'file' && entry.name.endsWith('.yaml'))
    .sort((a, b) => a.name.localeCompare(b.name));

  await rm(join(srcDir, 'examples'), { recursive: true, force: true });
  if (exampleFiles.length > 0) {
    await mkdir(join(srcDir, 'examples'), { recursive: true });
    console.log(`examples from ${repo}/${operatorDir}@${operatorSha.slice(0, 8)}:`);
    for (const entry of exampleFiles) {
      if (!entry.download_url) throw new Error(`${entry.name} has no download_url`);
      await writeDownload(join(srcDir, 'examples', entry.name), entry.download_url);
    }
  }

  console.log(`OpenAPI document from ${repo}/${novaDir}@${novaSha.slice(0, 8)}:`);
  await writeDownload(
    join(srcDir, 'nova-openapi.json'),
    `https://raw.githubusercontent.com/${repo}/${novaSha}/${novaDir}/openapi/nova.json`,
  );

  console.log(`CLI description from ${repo}/${pythonDir}@${cliSha.slice(0, 8)}:`);
  await writeDownload(
    join(srcDir, 'cli.json'),
    `https://raw.githubusercontent.com/${repo}/${cliSha}/${pythonDir}/stardelt/cli.json`,
  );

  const synced = new Date().toISOString().slice(0, 10);
  const previous = await readFile(join(srcDir, 'README.md'), 'utf8').catch(() => '');
  // A row keeps its date while its source commit is unchanged. Both rows name the same repository,
  // so the folder link tells them apart.
  const keepDate = (link, sha, row) =>
    previous
      .split('\n')
      .find((line) => line.includes(`(${link})`) && line.includes(`\`${sha}\``)) ??
    row;
  const operatorRow = keepDate(
    operatorLink,
    operatorSha,
    `| \`schemas/*.json\`${exampleFiles.length > 0 ? ', `examples/*.yaml`' : ''} | [\`${repo}\` \`${operatorDir}/\`](${operatorLink}) | \`${operatorSha}\` | ${synced} |`,
  );
  const novaRow = keepDate(
    novaLink,
    novaSha,
    `| \`nova-openapi.json\` | [\`${repo}\` \`${novaDir}/\`](${novaLink}) | \`${novaSha}\` | ${synced} |`,
  );
  const cliRow = keepDate(
    pythonLink,
    cliSha,
    `| \`cli.json\` | [\`${repo}\` \`${pythonDir}/\`](${pythonLink}) | \`${cliSha}\` | ${synced} |`,
  );
  const readme = `# Reference snapshots

Do not edit these files by hand. \`npm run sync:reference\` rewrites them from the public repositories.

| Source | Repository | Commit | Synced |
|---|---|---|---|
${operatorRow}
${novaRow}
${cliRow}

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
