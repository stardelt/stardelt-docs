# Docker-based local dev for stardelt-docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `docker compose up` from `stardelt-docs/` the supported way to run the Docusaurus dev server, with hot reload and a cached `node_modules` volume — so UI work doesn't depend on a host Node toolchain.

**Architecture:** A single `docker-compose.yml` adds a `docs` service on `node:20` that bind-mounts the repo, keeps `node_modules` in a named volume, runs `npm install && npm start --host 0.0.0.0`, and exposes port 3000. README is rewritten to lead with Docker and keep host-Node as a fallback. Parent-dir `CLAUDE.md` records the rule for this machine.

**Tech Stack:** Docker Compose v2, Node 20 LTS, Docusaurus 3.10.1 (already in `package.json`).

**Spec:** `stardelt-docs/superpowers/specs/2026-05-25-docs-docker-dev-design.md`

**Notes for the engineer:**
- All paths under `stardelt-docs/` are relative to that repo. Run `git` commands from inside it.
- The parent `106_stardelt/` directory is **not** a git repo, so its `CLAUDE.md` change is intentionally not committed.
- This repo signs commits with GPG. If `git commit` fails with `gpg: signing failed: No passphrase given`, ask the user to unlock their key (e.g. run `echo | gpg --clearsign >/dev/null` in another terminal), then retry. Do **not** use `--no-gpg-sign` without explicit user permission.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `stardelt-docs/docker-compose.yml` | **create** | Define the `docs` dev service: image, mounts, ports, polling env vars. |
| `stardelt-docs/README.md` | **modify** | Rewrite the "Local development" section to lead with Docker, keep npm as fallback. |
| `/home/mstoecker/dev/900_personal/106_stardelt/CLAUDE.md` | **modify** | Add a "Local dev toolchain on this machine" section directing Claude to use `docker compose up` instead of `npm`. |

---

### Task 1: Add `docker-compose.yml`

**Files:**
- Create: `stardelt-docs/docker-compose.yml`

- [ ] **Step 1: Write the compose file**

Path: `stardelt-docs/docker-compose.yml`

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

- [ ] **Step 2: Validate the file is well-formed YAML and a valid compose schema**

Run (from `stardelt-docs/`):

```bash
docker compose config >/dev/null && echo OK
```

Expected: prints `OK`. If it errors, re-check indentation and the `volumes:` block (top-level `volumes:` must define the named volume `node_modules`).

---

### Task 2: Verify the dev server comes up over HTTP

**Files:** none (verification only)

- [ ] **Step 1: Start the service in the background**

Run (from `stardelt-docs/`):

```bash
docker compose up -d
```

Expected: pulls `node:20` (first time only), then creates the container. Returns control to the shell.

- [ ] **Step 2: Wait for Docusaurus to finish compiling**

Run:

```bash
until docker compose logs docs 2>&1 | grep -q "compiled successfully\|Docusaurus website is running"; do sleep 2; done; echo READY
```

Expected: prints `READY` within ~60 s on the first run (npm install + first compile). If it takes longer than 3 minutes, check `docker compose logs docs` for errors.

- [ ] **Step 3: Confirm the site is reachable on the host**

Run:

```bash
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

Expected: `200`.

---

### Task 3: Verify hot reload works through the bind mount

**Files:** none (verification only — proves `CHOKIDAR_USEPOLLING` / `WATCHPACK_POLLING` are doing their job)

- [ ] **Step 1: Capture a sentinel string before editing**

Pick a clearly unique string to inject. Run:

```bash
SENTINEL="hot-reload-probe-$(date +%s)"
echo "$SENTINEL"
```

Expected: prints something like `hot-reload-probe-1748189012`. Remember the value.

- [ ] **Step 2: Edit `src/css/custom.css` to add a harmless comment with the sentinel**

Append a comment at the end of `stardelt-docs/src/css/custom.css`:

```css
/* hot-reload-probe-1748189012 */
```

(Use the sentinel from Step 1.)

- [ ] **Step 3: Confirm Docusaurus detected the change**

Run (within ~5 s of the edit, polling interval is 1 s):

```bash
docker compose logs --tail=20 docs | grep -E "compiled|hot update|client compiled"
```

Expected: a recent log line referencing recompilation (e.g. `client compiled successfully`). If nothing appears, polling isn't working — re-check the `CHOKIDAR_USEPOLLING` / `WATCHPACK_POLLING` env vars in `docker-compose.yml`.

- [ ] **Step 4: Revert the sentinel edit**

Remove the `/* hot-reload-probe-... */` comment so it isn't committed. The repo working tree for `src/css/custom.css` should be clean:

```bash
git -C . diff --quiet src/css/custom.css && echo CLEAN
```

Expected: prints `CLEAN`.

---

### Task 4: Verify the `node_modules` named volume is caching installs

**Files:** none (verification only)

- [ ] **Step 1: Stop the service without removing the volume**

Run:

```bash
docker compose down
```

Expected: removes the `docs` container. The `node_modules` named volume persists (you'd need `down -v` to drop it).

- [ ] **Step 2: Start it again and time how long until ready**

Run:

```bash
time (docker compose up -d && until docker compose logs docs 2>&1 | grep -q "compiled successfully\|Docusaurus website is running"; do sleep 2; done)
```

Expected: real time well under the first-run baseline — typically 15–30 s versus 60+ s on a cold install. The `npm install` step should log a small number of `up to date` / `audited` lines rather than downloading packages.

- [ ] **Step 3: Final HTTP check**

Run:

```bash
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

Expected: `200`.

- [ ] **Step 4: Stop the service**

Run:

```bash
docker compose down
```

Expected: container removed. Volume retained.

---

### Task 5: Update `stardelt-docs/README.md`

**Files:**
- Modify: `stardelt-docs/README.md` (the existing "Local development" section, lines 7–14)

- [ ] **Step 1: Replace the "Local development" section**

Find this block in `stardelt-docs/README.md`:

```markdown
## Local development

```bash
npm install
npm start
```

Open http://localhost:3000.
```

Replace it with:

````markdown
## Local development

### With Docker (recommended)

```bash
docker compose up
```

Open <http://localhost:3000>. First run installs dependencies into a named
volume and may take a minute or two; subsequent starts reuse the cached
`node_modules` and reach "compiled successfully" in seconds. Hot reload
works through the bind mount (file watching uses polling so it's reliable
on WSL2 and macOS Docker Desktop).

### With host Node

Requires Node ≥ 18.

```bash
npm install
npm start
```
````

- [ ] **Step 2: Sanity-check the section renders as Markdown**

Run (from `stardelt-docs/`):

```bash
grep -n "^## Local development\|^### With Docker\|^### With host Node" README.md
```

Expected: three lines, in that order. (If any are missing, the replacement above didn't land — re-check the fenced code blocks.)

---

### Task 6: Update parent `CLAUDE.md`

**Files:**
- Modify: `/home/mstoecker/dev/900_personal/106_stardelt/CLAUDE.md`

This file lives outside any git repo (the parent dir isn't a repo), so this change is intentionally uncommitted.

- [ ] **Step 1: Insert a "Local dev toolchain on this machine" section before "How the pieces fit together"**

Find this line in `/home/mstoecker/dev/900_personal/106_stardelt/CLAUDE.md`:

```markdown
## How the pieces fit together
```

Insert the following section directly above it (a blank line between the new section and the existing one):

```markdown
## Local dev toolchain on this machine

This machine has **no host Node/npm/yarn/pnpm** on the PATH. Do not try to invoke `npm`, `npx`, or `node` directly — they aren't installed.

For any sub-repo whose dev server needs a Node toolchain (currently just `stardelt-docs`), run `docker compose up` from inside that repo's directory and open <http://localhost:3000>. See that repo's README for details.

Other sub-repos either don't need a JS toolchain (Rust, Helm, k8s manifests) or aren't yet wired for Docker-based dev — flag it if you hit one.

```

- [ ] **Step 2: Verify the file still reads top-to-bottom**

Run:

```bash
grep -n "^## " /home/mstoecker/dev/900_personal/106_stardelt/CLAUDE.md
```

Expected: the new heading `## Local dev toolchain on this machine` appears between `## What this directory is` and `## How the pieces fit together`. Exact line numbers don't matter; ordering does.

---

### Task 7: Commit the stardelt-docs changes

**Files:**
- Commit in: `stardelt-docs/`
- Includes: `docker-compose.yml`, `README.md`

- [ ] **Step 1: Stage the two files**

Run (from `stardelt-docs/`):

```bash
git add docker-compose.yml README.md
```

- [ ] **Step 2: Confirm only those two files are staged**

Run:

```bash
git status --short
```

Expected: exactly two lines, one for `A  docker-compose.yml` and one for `M  README.md`. If anything else is staged (e.g. a leftover sentinel edit from Task 3), unstage and investigate before committing.

- [ ] **Step 3: Commit**

Run:

```bash
git commit -m "$(cat <<'EOF'
chore(dev): add docker-compose for local dev server

docker compose up brings up Docusaurus on :3000 with hot reload via polling
(WSL2/macOS bind mounts drop inotify). node_modules lives in a named volume
so installs are cached between starts.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

If commit fails with `gpg: signing failed: No passphrase given`, ask the user to unlock their GPG key and retry the same command. Do not pass `--no-gpg-sign`.

- [ ] **Step 4: Confirm the commit landed**

Run:

```bash
git log -1 --format="%h %s"
```

Expected: latest commit subject is `chore(dev): add docker-compose for local dev server`.
