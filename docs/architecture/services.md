---
title: "Services"
sidebar_label: "Services"
slug: /architecture/services
description: "What a stardelt install contains: each component, what it does, its chart and version, where it is configured, and its licence."
---

# Services

What a stardelt install contains. For how the services connect, see
[How it works](./how-it-works). Each component has one row; its settings are in the values file the
row names, and its install step is the `make` target next to it.

## Always installed

These form the core: `make install-core`, or the umbrella chart's default values.

| Service | What it does | Chart and version | Where it is configured | License |
|---|---|---|---|---|
| stardelt Nova | The web interface and the API: catalog, SQL editor, loads, connections, pipelines, query log, lineage, health | Deployment, image pinned by digest | `manifests/nova-deployment.yaml` · part of `make install` | Apache 2.0 |
| Apache Trino | The SQL engine for interactive queries, the SQL editor and dashboards | `trino/trino` 1.45.0, appVersion 484 | `helm-values/trino.yaml`, `helm-values/trino-identity.yaml` · `make step-trino` | Apache 2.0 |
| Lakekeeper | The Iceberg REST catalog: which tables exist and which files belong to them | `lakekeeper/lakekeeper` 0.14.0, appVersion 0.15.0 | `helm-values/lakekeeper.yaml` · `make step-lakekeeper` | Apache 2.0 |
| SeaweedFS | S3-compatible object storage, or bring your own S3-compatible store | `seaweedfs/seaweedfs` 4.25.1, appVersion 4.25 | `helm-values/seaweedfs.yaml` · `make step-storage` | Apache 2.0 |
| CloudNativePG | Runs the PostgreSQL databases of the platform's services | `cnpg/cloudnative-pg` 0.29.1, operator 1.30.1 | `helm-values/cnpg.yaml`, `manifests/cnpg-postgres.yaml` · `make step-cnpg` | Apache 2.0 |

[Apache Iceberg](https://iceberg.apache.org) (Apache 2.0) is the open table format every engine reads
and writes. It is not a service you install: it lives inside the engines and the catalog.

## Optional

Each of these is built and off by default in the core. `make platform` installs them too, except where
the table says otherwise.

| Service | What it does | Chart and version | Where it is configured | License |
|---|---|---|---|---|
| Keycloak | Sign-in. Optional: the OIDC provider stardelt can deploy | Deployment, image tag in `chart/values.yaml` | `manifests/keycloak.yaml` · `make install-identity` | Apache 2.0 |
| OpenFGA | Stores who may do what on which table | `openfga/openfga` chart 0.4.1, image v1.14.0 | `helm-values/openfga.yaml` · `make install` | Apache 2.0 |
| Open Policy Agent | Answers Trino's permission questions, next to Lakekeeper | Sidecar container in the Lakekeeper Deployment | `helm-values/lakekeeper.yaml`, `helm-values/trino-identity.yaml` · `make step-lakekeeper` | Apache 2.0 |
| Apache Airflow | Runs scheduled pipelines | Apache Airflow chart 1.22.0, appVersion 3.2.2 | `helm-values/airflow.yaml` · `make step-airflow` | Apache 2.0 |
| Apache Superset | Dashboards over Trino | Apache Superset chart 0.15.5, appVersion 5.0.0 | `helm-values/superset.yaml` · `make step-superset` | Apache 2.0 |
| JupyterHub | Notebooks for each person | JupyterHub chart 4.4.5, appVersion 5.5.5 | `helm-values/jupyterhub.yaml` · `make install-notebooks` | BSD-3-Clause |
| Apache Spark (Spark Connect + Spark Operator) | Distributed compute for jobs that outgrow Trino | Deployment, image pinned by digest | `manifests/spark.yaml` · `make install-spark` | Apache 2.0 |
| Apache Kafka | The streaming bus: a `StreamApp` reads its topics and writes Iceberg tables | Strimzi chart 1.3.1, one KRaft broker | `helm-values/strimzi.yaml`, `manifests/kafka.yaml` · `make step-kafka` and `make step-spark-operator` | Apache 2.0 |
| OpenBao | Stores connection secrets. Not installed by `make platform` | `openbao/openbao` chart, single-node store | `helm-values/openbao.yaml` · `make openbao` | MPL 2.0, the one [license exception](./licenses) |
| External Secrets Operator | Copies secret values from an external store into Kubernetes `Secret`s | `external-secrets/external-secrets` 2.13.0 | `helm-values/external-secrets.yaml` · `make external-secrets` | Apache 2.0 |
| [cert-manager](https://cert-manager.io) | Issues TLS certificates. A cluster prerequisite for sign-in, not installed by stardelt | Installed by the cluster | [Prerequisites](../getting-started/prerequisites) | Apache 2.0 |

## stardelt's own control plane

The stardelt Operator (Apache 2.0) turns small resources, such as `PlatformInstance`, `Lakehouse`,
`Catalog` and `Pipeline`, into running services. It installs separately with `make install-operator`
and `helm-values/operator.yaml`, where its image digest is pinned. Resources are described in the
[resource reference](../reference/resources).

## stardelt Nova

Nova is one pod in namespace `stardelt`, defined in `manifests/nova-deployment.yaml`; it serves the UI
and the API under `/api/`. Its state lives in the CloudNativePG cluster `nova-pg`
(`manifests/nova-pg.yaml`), which archives WAL and takes a daily base backup through Barman to
`s3://backups/`, retention `14d`. Health check: `curl -s https://<baseDomain>/api/health` answers
`{"status":"ok","db":"up"}`. Without a token, `GET /api/me` answers `401`. The image digest is pinned
in that manifest, and `scripts/check-version-parity.sh` checks the pin.

## Spark Connect

One long-running driver Deployment in `stardelt`, in `manifests/spark.yaml`, with Kubernetes as the
cluster manager: executors are created per query and released when it finishes. The endpoint is
in-cluster only. Notebooks that use it fail to open a session when it is down; Trino and the catalog
are unaffected, because the endpoint is not in their path. The runtimes catalogue is
`chart/files/spark-runtimes.json`, applied as ConfigMap `stardelt-spark-runtimes`.

## stardelt Operator

The operator is kube-rs (Rust) and reconciles `PlatformInstance`, `Lakehouse`, `Connection`,
`ServicePrincipal` and `StreamApp`. `Pipeline` is read by the Airflow loader; `Catalog` and
`SqlWarehouse` are read by the `access-sync` CronJob; `IngestionSource` and `Volume` have schemas
only. New resources default to `spec.dryRun: true`, and an `adopt` guard refuses a release it did not
create. The leader holds the `stardelt-operator-leader` Lease.

## Caveats

- **OpenBao** is the one component outside the permissive policy (MPL 2.0, see
  [Licenses](./licenses#the-exception-openbao)); the static seal key is Secret `openbao-seal-key` —
  never delete it while the data volume exists, it is the only thing that unseals the store after a
  restart.
- **SeaweedFS** keeps S3 machine-to-machine: do not enable the upstream OIDC IAM path on 4.25
  (CVE-2026-77298, fixed in 4.40) and do not expose the Filer UI, which has no user authentication.
- **Apache Kafka** is opt-in and off by default; a `StreamApp` needs `make step-kafka` and
  `make step-spark-operator`.
- **External Secrets** in `external` mode publishes exactly one cluster-scoped store, `enterprise`;
  the path prefixes are the enterprise store's policy, not a platform boundary.
- **CloudNativePG's** backups run through the Barman Cloud plugin (GPL-3.0, a documented exception in
  [Licenses](./licenses#documented-exceptions)).
- **Cert-manager** is a cluster prerequisite for sign-in, not installed by stardelt.

## How a service gets in {#service-selection-criteria}

A service joins the platform only if it meets all of these:

1. **License:** accepted by the [license policy](./licenses).
2. **Maturity:** real users, active commits, recent releases.
3. **Kubernetes:** deploys cleanly, ideally with a maintained operator or chart.
4. **Sovereignty:** no required outbound calls at runtime.
5. **Open contract:** it sits behind a published interface (SQL, Iceberg REST, S3, OIDC), so it can be
   replaced.

What may come later is on the [roadmap](../roadmap).
