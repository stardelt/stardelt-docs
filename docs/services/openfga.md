---
title: "OpenFGA"
sidebar_label: "OpenFGA"
slug: /services/openfga
---

# OpenFGA

**What it is.** OpenFGA is the relationship-based authorization store that holds permission tuples for catalog access.

**What it decides.** OpenFGA answers relationship checks about which subjects may act on warehouses, namespaces, tables, and views. Lakekeeper is configured with `authz.backend: openfga` and consults OpenFGA for catalog operations; the answer is fail-closed, so when OpenFGA cannot be reached or cannot answer, protected catalog requests are refused.

**How it fits.** OpenFGA sits in the data/control plane next to the catalog. Lakekeeper calls OpenFGA on every protected operation, and the authorization model is managed as part of the catalog authorization setup. See [Security model](../architecture/security-model) for how authorization fits the platform.

**What happens when it is down.** OpenFGA is load-bearing for authorization. Because Lakekeeper uses fail-closed authorization with OpenFGA, if the store cannot answer, a table read becomes `503 Authorization service is unavailable`. Restarting OpenFGA is a catalog outage rather than a cosmetic event, so probe settings are tuned to tolerate slow hosts without killing the process.

**What you can tune.**

| Setting | Values file | Key | Default | What it changes |
|---|---|---|---|---|
| Image repository/tag | `helm-values/openfga.yaml` | `image.repository` / `image.tag` | `openfga/openfga` / `v1.14.0` | Container image used for OpenFGA. |
| Replicas | `helm-values/openfga.yaml` | `replicaCount` | `1` | Number of OpenFGA pods. |
| Datastore engine/secret | `helm-values/openfga.yaml` | `datastore.engine` / `datastore.uriSecret` | `postgres` / `openfga-pg-app` | Postgres datastore and the Secret that provides the DSN (`uri` key). |
| Migration type | `helm-values/openfga.yaml` | `migrationType` | `initContainer` | How schema migrations run (`openfga migrate` in an init container). |
| Liveness probe | `helm-values/openfga.yaml` | `livenessProbe.*` | see values | Probe timing tuned to avoid killing the pod during slow hosts while keeping readiness strict. |

**Operating it.**

- **Install:** OpenFGA is installed as a step of `make install` (`step-openfga`) via the OpenFGA Helm chart with values from `helm-values/openfga.yaml`. Its schema is migrated by an init container.
- **Health check:** OpenFGA runs in namespace `stardelt`. Readiness is strict so that if it cannot answer, it leaves the Service and Lakekeeper fails fast; liveness is configured with a longer budget to ride out host stalls.
- **Database and backups:** OpenFGA uses the `openfga-pg` CloudNativePG cluster (`manifests/openfga-pg.yaml`, database `openfga`). Backups are handled by `openfga-pg-daily` (ScheduledBackup) to S3.
- **Logs:** OpenFGA logs come from the OpenFGA Deployment/Pods. Authorization decisions are enforced by Lakekeeper; failures due to an unavailable store surface as `503 Authorization service is unavailable`.
