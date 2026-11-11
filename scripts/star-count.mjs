// Reads the star count of the star repository once, at build time, and writes it into
// src/data/stars.json. The site never calls GitHub from the visitor's browser: the number in
// the page is the one this script fetched. A failed fetch is not a failed build.
import fs from 'node:fs/promises';
import path from 'node:path';

const REPO = process.env.STAR_REPO || 'stardelt/stardelt';
const OUT = path.resolve('src/data/stars.json');

async function write(value) {
  await fs.mkdir(path.dirname(OUT), {recursive: true});
  await fs.writeFile(OUT, JSON.stringify(value, null, 2) + '\n');
}

async function main() {
  try {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'stardelt-docs-build',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const response = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`GitHub answered ${response.status}`);
    }
    const body = await response.json();
    if (typeof body.stargazers_count !== 'number') {
      throw new Error('no stargazers_count in the answer');
    }
    await write({
      repo: REPO,
      stars: body.stargazers_count,
      fetchedAt: new Date().toISOString(),
    });
    console.log(`stars: ${body.stargazers_count} for ${REPO}`);
  } catch (error) {
    await write({repo: REPO, stars: null, fetchedAt: null});
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`star-count: could not read the count for ${REPO} (${reason}); the page shows no number`);
  }
}

await main().catch((error) => {
  // The write itself failed; never fail the build over a decorative number.
  console.warn(`star-count: ${error instanceof Error ? error.message : String(error)}`);
});
