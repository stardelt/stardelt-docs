---
title: "Lakekeeper"
sidebar_label: "Lakekeeper"
slug: /services/lakekeeper
---

# Lakekeeper

**What it is.** Lakekeeper is an Iceberg REST catalog (chart `lakekeeper/lakekeeper` 0.11.0, appVersion 0.12.2).

**Why stardelt uses it.** Lakekeeper vends table metadata and coordinates access to Iceberg tables. It is the catalog layer that attaches policy and provides a single point for catalog operations; engines like Trino use it to discover and manage Iceberg tables.

**How it fits.** Lakekeeper runs in the data plane alongside Postgres (CloudNativePG) for its metadata. It connects to SeaweedFS as the object store backend for table data. Trino reads/writes through the Iceberg REST catalog; Nova and other components interact with the catalog via Lakekeeper. See [Services](../architecture/services) and [How it works](../architecture/how-it-works).

**What you can tune.** Key settings from `stardelt-platform/helm-values/lakekeeper.yaml`:

| Setting | Values file | Key | Default | What it changes |
|---|---|---|---|---|
| Authorization backend | `helm-values/lakekeeper.yaml` | `authz.backend` | `openfga` | Authorization backend used by Lakekeeper. |
| OpenFGA endpoint | `helm-values/lakekeeper.yaml` | `authz.openfga.endpoint` | `http://openfga.stardelt.svc.cluster.local:8081` | Endpoint for OpenFGA authorization checks. |
| OPA bridge enabled | `helm-values/lakekeeper.yaml` | `OPABridge.enabled` | `true` | Enables the OPA bridge sidecar for policy decisions. |
| OPA bridge catalogs | `helm-values/lakekeeper.yaml` | `OPABridge.catalogs` | `[{"trinoCatalog": "warehouse", "lakekeeperWarehouse": "warehouse"}]` | Maps Trino catalogs to Lakekeeper warehouses. |
| Database (external) | `helm-values/lakekeeper.yaml` | `externalDatabase` | CNPG `lakekeeper-pg` (`lakekeeper-pg-rw.stardelt.svc.cluster.local:5432`) | External Postgres cluster for Lakekeeper metadata. |
| Catalog resources | `helm-values/lakekeeper.yaml` | `catalog.resources` | `requests: {cpu: "50m", memory: "256Mi"}, limits: {cpu: "1", memory: "512Mi"}` | Resources for the Lakekeeper catalog pod. |

**What it replaces.** Lakekeeper replaces a traditional Hive Metastore for Iceberg table metadata in this platform.

**Operating it.**

- **Health check:** Check Lakekeeper pods in the cluster (e.g. `kubectl -n stardelt get pods -l app.kubernetes.io/name=lakekeeper`).
- **Logs:** View logs with `kubectl -n stardelt logs -l app.kubernetes.io/name=lakekeeper -c lakekeeper`.
- **Install step:** `make step-lakekeeper` (see `stardelt-platform/Makefile`). Also applies bootstrap and network policy.
- **Bootstrap:** The warehouse is bootstrapped by `manifests/lakekeeper-bootstrap.yaml` (creates/updates the `warehouse` pointing to SeaweedFS).
- **Network policy:** `manifests/lakekeeper-network-policy.yaml` restricts ingress to authorized callers.
- **Backup:** Lakekeeper metadata is stored in Postgres (CNPG); backups follow Postgres backup configuration. See [Backups](../operations/backups).
