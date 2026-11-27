---
title: "What stardelt ships and what you bring"
sidebar_label: "What ships"
slug: /architecture/what-ships
description: "The lakehouse and its control plane are ours; your identity provider, secret store, object storage, BI tool and monitoring plug in. Here is the line, and what a starter is for."
---

# What stardelt ships and what you bring

stardelt is the lakehouse and its control plane. An enterprise already runs an identity
provider, a secret store, object storage and a BI tool, so the platform connects to those
instead of shipping a second copy. When there is nothing to connect to, a small **starter**
fills the gap for development and small installs.

| Layer | stardelt ships | You bring | Starter |
|---|---|---|---|
| Tables and catalog | Iceberg, Lakekeeper | another Iceberg REST catalog | — |
| SQL | Trino | — | — |
| Heavy compute | Spark Connect | — | — |
| Control plane | Nova, the operator, OpenFGA | — | — |
| Identity | — | any OIDC provider | Keycloak |
| Secrets | External Secrets | your secret store through an External Secrets provider | OpenBao |
| Object storage | — | any S3-compatible store | SeaweedFS |
| Metadata databases | — | your PostgreSQL | CloudNativePG |
| BI | the Trino endpoint | your BI tool, through Trino | Superset |
| Notebooks | the Python SDK | your Jupyter or IDE | JupyterHub |
| Monitoring | Prometheus metrics and alert rules | your Prometheus or Grafana | — |

An install chooses a **profile**. `starter` turns every starter on — the picture in the last
column, which is the lab. `enterprise` expects the plugs, so the install needs an OIDC
issuer, an S3 endpoint and a secret-store reference. An older `demo`, `full` or `airgap`
value keeps working for one release, and the operator reports it as deprecated instead of
failing the install.

Starters get no high availability, no backups and no tuning. Use your own store for
production: the starter is there so a person can try the platform without one. What a backup
has to include is in [Backups](/docs/operations/backups).

## Where to go next

- [Identity](/docs/architecture/identity) — sign-in with your own provider, groups and admin roles.
- [Secret stores](/docs/operations/secret-stores) — External Secrets and the store behind it.
- [Components](/docs/architecture/services) — every application the platform runs.
- [Your own cluster](/docs/getting-started/your-cluster) — the install that puts this together.
