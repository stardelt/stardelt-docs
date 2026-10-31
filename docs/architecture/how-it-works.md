---
title: "How stardelt works"
sidebar_label: "How it works"
slug: /architecture/how-it-works
---

# How stardelt works

One picture of the whole platform: who talks to what, and why. Open it [on its own page](/img/how-stardelt-works.svg) to zoom.

[![How stardelt works: people, scripts, notebooks and AI assistants sign in once with Keycloak and talk to one front door, stardelt Nova. Nova asks the Trino SQL engine, the Lakekeeper catalog and Airflow for them. Table files live in SeaweedFS. The stardelt Operator, CloudNativePG, ingress and cert-manager run on Kubernetes underneath.](/img/how-stardelt-works.svg)](/img/how-stardelt-works.svg)

*Dashed boxes are optional or switch on per install. [Services](./services.md) lists exactly what an install contains today.*

## Read the picture from the top

1. **You and your tools.** A person works in the browser (the Nova interface), a script or a CI job uses the `stardelt` command line or the Python package, an AI assistant uses the local MCP server, a notebook runs in JupyterHub. All of them sign in once.
2. **One front door: Nova.** The interface and the public API are the same thing: the command line, the Python package and the MCP tools are generated from the one OpenAPI contract Nova publishes (`/api/openapi.json`, described in the [API reference](../reference/api.md)). A feature that exists in the interface exists in the API.
3. **Engines and apps.** Trino answers SQL. Airflow runs scheduled pipelines and sends their SQL to Trino. Superset draws dashboards from Trino. Spark Connect takes the heavy jobs. Nova asks them for you; notebooks talk to the engines directly with your token.
4. **Catalog and access.** Lakekeeper is the Iceberg catalog: it knows which tables exist and which files belong to them, and every engine asks it first. OpenFGA, when it is on, decides who may see which table.
5. **Storage.** Tables are open Iceberg files (Parquet) in SeaweedFS, or in your own S3. Nothing is locked into a stardelt format.
6. **Control plane.** The stardelt Operator reads small resources (`PlatformInstance`, `Lakehouse`, `Catalog`, `Pipeline`, ...) and installs and wires the services above. CloudNativePG keeps the Postgres databases; ingress-nginx and cert-manager give every service its HTTPS name. All of it runs on a Kubernetes cluster you bring.

## Five things to remember

- **One sign-in.** Keycloak (or your own OIDC provider) holds users and groups. The browser uses the sign-in page, the command line uses the device code flow (`stardelt login`), and the same token reaches Nova, Trino and the catalog. See [Identity](./identity.md).
- **One API.** Whatever you can click, you can call. See [Python, command line and agents](../guides/sdk-cli-mcp.md).
- **Nova acts as you.** With sign-in on, your token goes on to the engines, so what you may read is decided by the engine and the catalog for you, not by Nova's own power.
- **Plugs, not a monolith.** The engine, the catalog, the identity provider and the object store are replaceable behind open contracts (SQL, the Iceberg REST catalog, OIDC, S3).
- **Honest limits.** Results Nova keeps in memory are capped (100 000 rows or about 64 MiB per statement); storage credentials are one platform key today, not yet one short-lived key per person.

## Where to go next

| I want to ... | Read |
|---|---|
| Install it on a cluster | [Hetzner k3s](../getting-started/hetzner-k3s.md) |
| Go from a source to a dashboard | [Source to dashboard](../guides/source-to-dashboard.md) |
| Run SQL on a schedule | [Schedule SQL](../guides/schedule-sql.md) |
| See what was run and why it failed | [Query log](../guides/query-log.md) |
| Use it from a script, CI or an AI assistant | [Python, command line and agents](../guides/sdk-cli-mcp.md) |
| Keep source credentials out of pipelines | [Connections](../guides/connections.md) |
| Know what is installed and what is only planned | [Services](./services.md) |
| Understand who may do what | [Security model](./security-model.md) |
