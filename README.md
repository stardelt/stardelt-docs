# stardelt-docs

The stardelt documentation site, published to **https://stardelt.io**.

Built with [Docusaurus 3](https://docusaurus.io). Theme matches the Nova UI and the marketing site at stardelt.io — same palette (`#0b0e1f` background, `#5b6cff` accent), same system font stack, dark mode only.

## Local development

### With Docker (recommended)

```bash
docker compose up
```

Open <http://localhost:3000>. First run installs dependencies into a named volume and may take a minute or two; subsequent starts reuse the cached `node_modules` and reach "compiled successfully" in seconds. Hot reload works through the bind mount (file watching uses polling so it's reliable on WSL2 and macOS Docker Desktop).

### With host Node

Requires Node ≥ 18.

```bash
npm install
npm start
```

## Build & preview

```bash
npm run build
npm run serve
```

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages. The custom domain `stardelt.io` is pinned via `static/CNAME` — make sure your DNS has `stardelt.io CNAME stardelt.github.io.`

## Layout

```
docs/                  # markdown content (architecture, roadmap, design spec, MVP notes, diagrams)
src/css/custom.css     # stardelt theme overrides
src/pages/index.tsx    # homepage hero
static/img/            # logo + wordmark
static/CNAME           # GitHub Pages custom domain
docusaurus.config.ts   # site config
sidebars.ts            # sidebar structure
```

## Editing content

All markdown lives under `docs/`. Add a new page by dropping a `.md` file in the right folder and listing it in `sidebars.ts`.
