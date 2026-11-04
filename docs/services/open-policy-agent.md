---
title: "Open Policy Agent"
sidebar_label: "Open Policy Agent"
slug: /services/open-policy-agent
---

# Open Policy Agent

**What it is.** Open Policy Agent (OPA) is the policy engine embedded as the `opa` container of the Lakekeeper Deployment.

**What it decides.** OPA answers Trino's authorization questions through the Lakekeeper OPA bridge. It evaluates policies for operations like session properties, function visibility, impersonation, and catalog access. Trino points to it via `opa.policy.uri` and `opa.policy.batched-uri` on the `lakekeeper-opa` service. A catalog decision table published by the `access-sync` CronJob every two minutes accelerates hot paths, but policies still fall back to the bridge's rules when needed.

**How it fits.** OPA runs alongside Lakekeeper as the authorization bridge (`OPABridge`) exposed by Service `lakekeeper-opa` on port 8282. Trino uses OPA as its access control (OPA access control) with the stardelt front entry points so that policy decisions are enforced at the query engine. See [Security model](../architecture/security-model) and [The query log](../guides/query-log) for context on how decisions surface.

**What happens when it is down.** The bridge is part of the authorization path; failures in policy evaluation affect whether Trino can perform operations. Because catalog authorization is enforced through this path, policy questions that cannot be answered will be refused according to the fail-closed behavior of the bridge. Specific symptoms depend on the operation being attempted.

**What you can tune.**

| Setting | Values file | Key | Default | What it changes |
|---|---|---|---|---|
| Bridge enabled | `helm-values/lakekeeper.yaml` | `OPABridge.enabled` | `true` | Enables the OPA bridge sidecar in the Lakekeeper pod. |
| Bridge catalogs | `helm-values/lakekeeper.yaml` | `OPABridge.catalogs` | see values | Maps Trino catalogs to Lakekeeper warehouses. |
| Allow unmanaged catalogs | `helm-values/lakekeeper.yaml` | `OPABridge.allowUnmanagedCatalogs` | `true` | Whether unmanaged catalogs are allowed through. |
| Custom policies | `helm-values/lakekeeper.yaml` | `OPABridge.customPolicies` | see values | Stellt's additional Rego rules loaded by the bridge. |
| Trino OPA URI | `helm-values/trino-identity.yaml` | `access-control-opa.properties` (`opa.policy.uri`) | `http://lakekeeper-opa.stardelt.svc.cluster.local:8282/v1/data/stardelt/allow` | Endpoint Trino uses for policy decisions. |
| Trino OPA batched URI | `helm-values/trino-identity.yaml` | `access-control-opa.properties` (`opa.policy.batched-uri`) | `http://lakekeeper-opa.stardelt.svc.cluster.local:8282/v1/data/stardelt/batch` | Batched endpoint for policy decisions. |

**Operating it.**

- **Install:** OPA is not installed separately; it runs as the `opa` container of the `lakekeeper` Deployment with the OPA bridge enabled via `helm-values/lakekeeper.yaml`. Service `lakekeeper-opa` exposes it on port 8282.
- **Health check:** The bridge serves policy decisions at the endpoints configured in Trino. Trino's access control points to the stardelt front entry points under `data.stardelt`.
- **Policy table updates:** The `access-sync` CronJob publishes a catalog decision table every two minutes that the bridge can use to accelerate decisions.
- **Logs:** Bridge logs come from the `opa` container in the `lakekeeper` pod. Policy evaluation behavior is defined by the bridge's rules and the published decision table.
