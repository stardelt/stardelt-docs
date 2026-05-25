# Docker-based local dev for stardelt-docs

**Date:** 2026-05-25
**Status:** Approved, pre-implementation
**Driver:** Issue #21 reproduction blocked by missing host Node toolchain on the maintainer's machine. Generalising to "Docker is the supported way to run the dev server" so future contributors (and future Claude sessions) don't get stuck on the same thing.

## Goal

A contributor (or Claude) sitting at the `stardelt-docs/` repo with only Docker installed should be able to run `docker compose up` and have the Docusaurus dev server reachable at <http://localhost:3000> with hot reload working.

## Non-goals

- Replacing the host-Node workflow for people who already have Node installed. The npm path stays documented as a fallback.
- Building a production image. This is dev-server only; production is the existing GitHub Pages deploy workflow.
- Touching anything related to the actual issue #21 navbar fix. That's a separate flow.

## Design

### New file — `stardelt-docs/docker-compose.yml`

```yaml
services:
  docs:
    image: node:20
    working_dir: /app
    command: sh -c "npm install --no-audit --no-fund && npm run start -- --host 0.0.0.0 --port 3000"
    ports:
      - "3000:3000"
    environment:
      CHOKIDAR_USEPOLLING: "true"
      WATCHPACK_POLLING: "true"
    volumes:
      - .:/app
      - node_modules:/app/node_modules
volumes:
  node_modules:
```

Rationale for each choice:

- **`node:20`** — matches `package.json` engines `>=18`; node 20 is the active LTS.
- **Repo bind-mount at `/app`** — edits in the host repo are visible to the container instantly.
- **Named volume `node_modules` mounted over `/app/node_modules`** — the host repo has no `node_modules` (and Linux/Windows binary mismatch would break it if it did). Named volume isolates the container's installed deps and persists between `docker compose up` runs, so subsequent starts skip the heavy `npm install` work.
- **`--host 0.0.0.0`** — without this Docusaurus binds to `127.0.0.1` inside the container, which the host can't reach.
- **`CHOKIDAR_USEPOLLING` / `WATCHPACK_POLLING`** — bind-mounted host filesystems (WSL2, macOS Docker Desktop) silently drop inotify events. Polling is a tax on CPU but reliable.
- **`--no-audit --no-fund`** — quieter install output; we're not running CI here.

### Edit — `stardelt-docs/README.md`

Rewrite the "Local development" section. Lead with the Docker path because it's the supported default; keep the host-Node block as a fallback for contributors with Node installed.

Approximate target content:

```markdown
## Local development

### With Docker (recommended)

```bash
docker compose up
```

Open <http://localhost:3000>. First run installs deps into a named volume
(~30 s); subsequent runs start in seconds. Hot reload works through the bind
mount.

### With host Node

Requires Node ≥ 18.

```bash
npm install
npm start
```
```

### Edit — `/home/mstoecker/dev/900_personal/106_stardelt/CLAUDE.md`

Add a short section near the top, before "How the pieces fit together", titled "Local dev toolchain on this machine". Content:

> This machine has no host Node/npm/yarn/pnpm. For any sub-repo whose dev server needs a Node toolchain (currently just `stardelt-docs`), run `docker compose up` from inside that repo's directory and open <http://localhost:3000>. Do not try to invoke `npm` / `npx` / `node` directly — they're not on the PATH.

This is local-only (the parent dir isn't a git repo).

## Commit plan

One commit in `stardelt-docs`:

> chore(dev): add docker-compose for local dev server
>
> docker compose up brings up Docusaurus on :3000 with hot reload via polling
> (WSL2/macOS bind mounts drop inotify). node_modules lives in a named volume
> so installs are cached between starts.

`CLAUDE.md` change is uncommitted (no enclosing repo).

## Verification

After applying:

1. From `stardelt-docs/`: `docker compose up` — wait for "compiled successfully", then `curl -sfo /dev/null http://localhost:3000` returns 0.
2. Edit `src/css/custom.css`, save, see the change reflected in the browser without restarting the container (proves hot reload + polling).
3. `docker compose down`, then `docker compose up` again — second start should reach "compiled successfully" without redoing the full `npm install` (proves named volume cache).

## Risks / known quirks

- **Polling CPU cost.** Webpack polling at 1s interval on a tree this size is fine on a laptop, noticeable on a constrained machine. Acceptable for now; revisit if anyone complains.
- **Port 3000 collision.** Hardcoded. If the user has something else on 3000 they can override via `docker compose up` env or by editing the file; not worth parameterising for one-machine setup.
- **`npm install` on every start.** Idempotent against a populated `node_modules`, so usually a no-op (~2 s of lockfile checking). Trade-off vs a separate `npm ci` step is not worth the complexity at this scale.

## Out of scope

- Issue #21 mobile-navbar fix — separate brainstorming flow, blocked on this one because we need a running dev server to reproduce.
- Docker dev for `stardelt-nova` frontend — same pattern would apply but Nova has its own toolchain (Rust + Vite); deal with it when it comes up.
