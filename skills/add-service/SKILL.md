---
name: add-service
description: Add or upgrade a service in the stardelt platform across every install path, with license, secrets, backups and docs.
when_to_use: Adding a new upstream component, moving a chart version, or changing how a service is configured.
---

# Add or upgrade a service

Full recipe: `docs/developer/recipes.md`, "Add or upgrade a service".

## First

Stop and open an issue if either answer is missing:

- Which published interface does it sit behind (SQL, Iceberg REST, S3, OIDC, a resource)?
- Is its license accepted by `docs/architecture/licenses.md`? Read the `LICENSE` file for the exact version.

## Every path has its own copy

1. `stardelt-platform`:
   - pin `<COMPONENT>_VERSION` in `Makefile`;
   - add `helm-values/<component>.yaml` and a `step-<component>` target;
   - add it to `scripts/platform.sh` if it belongs in the default install;
   - add it to `chart/Chart.yaml` and `chart/values.yaml`, off unless it belongs in the core;
   - add a `helm template` step to `.github/workflows/ci.yml`.
2. `stardelt-operator`: add the pin to `chart_version` in `planner.rs` and the values to
   `crates/stardelt-operator/values/`.
3. `stardelt-nova`, if people should see it: `backend/src/apps.rs`.
4. `stardelt-docs`: add `docs/services/<component>.md` and a row in `docs/architecture/services.md`. If it signs
   users in, update `docs/architecture/identity-integrations.md`.

## Do not forget

- Secrets are generated once at install, never committed (`scripts/check-no-default-secrets.sh`).
- A new volume needs a backup or an accepted exception (`make verify-backups-all`).
- A published service must sign users in through the platform's identity provider.

## Check

```bash
make lint && bash scripts/check-version-parity.sh && make chart-template    # stardelt-platform
bash scripts/check-platform-pins.sh && cargo test                           # stardelt-operator
npm run build                                                               # stardelt-docs
```

Upgrading only? Read the upstream release notes and license, change the pins everywhere the checks name, and
test on a real cluster. CI compares versions, not behaviour.
