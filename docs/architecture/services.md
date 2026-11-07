---
title: "Services"
sidebar_label: "Services"
slug: /architecture/services
---

# Services

What a stardelt install contains. For how the services connect, see
[How it works](./how-it-works). Each service has its own page with settings and operating notes.

## Always installed

These form the core: `make install-core`, or the umbrella chart's default values.

| Service | What it does | License |
|---|---|---|
| [stardelt Nova](../services/nova) | The web interface and the API: catalog, SQL editor, loads, connections, pipelines, query log, lineage, health | Apache 2.0 |
| [Apache Trino](../services/trino) | The SQL engine for interactive queries, the SQL editor and dashboards | Apache 2.0 |
| [Lakekeeper](../services/lakekeeper) | The Iceberg REST catalog: which tables exist and which files belong to them | Apache 2.0 |
| [SeaweedFS](../services/seaweedfs) | S3-compatible object storage, or bring your own S3-compatible store | Apache 2.0 |
| [CloudNativePG](https://cloudnative-pg.io) | Runs the PostgreSQL databases of the platform's services | Apache 2.0 |

[Apache Iceberg](https://iceberg.apache.org) (Apache 2.0) is the open table format every engine reads
and writes. It is not a service you install: it lives inside the engines and the catalog.

## Optional

Each of these is built and off by default in the core. `make platform` installs them too, except where
the table says otherwise.

| Service | What it does | Turn it on | License |
|---|---|---|---|
| [Keycloak](../services/keycloak) | Sign-in. Optional: the OIDC provider stardelt can deploy | `IDENTITY=1`, or `identity.mode` in the chart | Apache 2.0 |
| [OpenFGA](../services/openfga) | Stores who may do what on which table | with `make platform` | Apache 2.0 |
| [Open Policy Agent](../services/open-policy-agent) | Answers Trino's permission questions, next to Lakekeeper | with `make platform` | Apache 2.0 |
| [Apache Airflow](../services/airflow) | Runs scheduled pipelines | `make install` | Apache 2.0 |
| [Apache Superset](../services/superset) | Dashboards over Trino | `make install` | Apache 2.0 |
| [JupyterHub](../services/jupyterhub) | Notebooks for each person | `make install-notebooks` | BSD-3-Clause |
| [Apache Spark (Spark Connect)](../services/spark) | Distributed compute for jobs that outgrow Trino | `make install-spark` | Apache 2.0 |
| [OpenBao](../services/openbao) | Stores connection secrets. Not installed by `make platform` | `make openbao` | MPL 2.0, the one [license exception](./licenses) |
| [cert-manager](https://cert-manager.io) | Issues TLS certificates. A cluster prerequisite for sign-in, not installed by stardelt | [Prerequisites](../getting-started/prerequisites) | Apache 2.0 |

## stardelt's own control plane

The [stardelt Operator](../services/operator) (Apache 2.0) turns small resources, such as
`PlatformInstance`, `Lakehouse`, `Catalog` and `Pipeline`, into running services. It installs
separately with `make install-operator`. Resources are described in the
[resource reference](../reference/resources).

## How a service gets in {#service-selection-criteria}

A service joins the platform only if it meets all of these:

1. **License:** accepted by the [license policy](./licenses).
2. **Maturity:** real users, active commits, recent releases.
3. **Kubernetes:** deploys cleanly, ideally with a maintained operator or chart.
4. **Sovereignty:** no required outbound calls at runtime.
5. **Open contract:** it sits behind a published interface (SQL, Iceberg REST, S3, OIDC), so it can be
   replaced.

What may come later is on the [roadmap](../roadmap).
