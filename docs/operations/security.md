---
title: "Security"
sidebar_label: "Security"
slug: /operations/security
description: "What stardelt trusts, what its pods may do, and how to rotate every credential it holds."
---

# Security

What stardelt exposes, what it trusts, and where credentials come from. [Known limits](#known-limits)
says what is not protected yet, so read it before you put real data on the platform.

To report a vulnerability, follow [the security policy](https://github.com/stardelt/.github/blob/main/SECURITY.md).

## Trust boundaries

| Zone | Contains | Rule |
|---|---|---|
| **Edge** | Ingress controller, TLS | Publishes only components that sign users in |
| **Identity** | Your OIDC provider (Keycloak, deployed by stardelt, or your own) | Every component validates tokens from one issuer ([Identity](../architecture/identity)) |
| **Applications** | Nova, Superset, Airflow, JupyterHub | Sign in through the identity provider; never published without it |
| **Data** | Trino, Lakekeeper, SeaweedFS, PostgreSQL | Inside the cluster. Trino can be published because it requires a token; the others are reached through Nova or a port-forward |
| **Control** | Operator, Helm releases | Holds cluster-wide rights, because installing charts requires them |

## Publishing rules

1. **A component is published only if it authenticates users against the platform's identity
   provider.** That covers Nova, Superset, Airflow, JupyterHub and Trino. Lakekeeper is not published.
   The umbrella chart renders an Ingress for a component without sign-in only if you ask for it with
   `ingress.exposeUnauthenticated`.
2. **Keycloak publishes an allow-list, not the whole host.** `/realms/stardelt`, `/resources`,
   `/robots.txt` and the `stardelt` realm's console are reachable. The master realm, `/health` and
   `/metrics` answer 404. For master-realm work, use
   `kubectl -n stardelt exec -it deploy/keycloak -- /opt/keycloak/bin/kcadm.sh`.
3. **With sign-in on, Trino accepts authenticated HTTPS only, inside the cluster too.** A pod cannot
   claim another user's name. Clients trust the platform's CA bundle.

## Who may read what

Groups in the identity provider are the only source of roles. What enforces them depends on how you
installed:

| | `make platform` with `IDENTITY=1` | Umbrella chart or `make install-core`, defaults |
|---|---|---|
| Sign-in | Keycloak | none (development mode) |
| SQL as the signed-in person | yes | no |
| Table permissions | OpenFGA, through Lakekeeper and its OPA bridge | none (`allowall`): everyone can do everything |

:::danger Without sign-in there is no access control
The default chart and core installs have no sign-in and no permissions. Use them only behind a
port-forward, with data you do not mind everyone on the cluster reading.
:::

Administrators grant catalog access, catalog-wide, on the **Catalogs** page
([Access to catalogs and the network](./access.md)).

## Credentials

**No credential is committed, and none is a fixed default.** Every secret is generated once at install
and kept. It is never rotated implicitly. CI fails when a known default string is committed
(`scripts/check-no-default-secrets.sh`). Rotating one is a deliberate act; the inventory of every
secret, who reads it and how to rotate it is under [Rotating secrets](#rotating-secrets).

## What the pods may do

A cluster that enforces the `restricted` [Pod Security Standard](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
admits a pod only when its spec declares the fields the standard asks for. stardelt's workloads
declare them, so a namespace labelled
`pod-security.kubernetes.io/enforce=restricted` admits the platform's pods. `make verify-pod-security`
in the platform repository re-admits every running pod and tells you whether your own cluster does.

The install's own namespace enforces `restricted`, not `baseline`:
`manifests/namespace.yaml` labels it `pod-security.kubernetes.io/enforce=restricted` (with
`warn` and `audit` also at `restricted`), `make install` applies it first through
`step-namespace`, and the operator labels a namespace it creates the same way
(`platform_namespace` in `operator/crates/stardelt-operator/src/prerequisites.rs`). A fresh
install therefore admits its own pods at the strictest level the standard has, and
`make verify-pod-security` re-admits every running pod to prove it.

### What stardelt runs as

Every pod the platform installs declares the fields a `restricted` namespace checks:
`runAsNonRoot: true` on the pod, a `seccompProfile` of `RuntimeDefault` on the pod or the container,
and — on each container — `allowPrivilegeEscalation: false` with `capabilities.drop: ["ALL"]`. Most also pin the
user by number: Spark and the StreamApp driver 185, Trino and Superset 1000, Airflow 50000, Nova,
the operator and OpenFGA 65532, OpenBao 100, Reloader 65534.

Measured on 2026-11-23 with `NS=stardelt make verify-pod-security` against a full lab install:
`PASS (74 admitted by restricted: 49 of 49 pod(s) and 25 of 25 CronJob template(s), 0 known
exceptions)`.

| Component | Pods | Declared by | `restricted` |
|---|---|---|---|
| Nova | `nova-…` (1) | both | yes |
| JupyterHub hub | `hub-…` (1) | chart default | yes |
| JupyterHub proxy | `proxy-…` (1) | chart default | yes |
| JupyterHub image puller, user scheduler | `continuous-image-puller-…`, `user-scheduler-…` (3) | chart default | yes |
| JupyterHub single user | `jupyter-<user>` (0) | — | — |
| Spark Connect driver | `spark-connect-…` (1) | `make platform` | yes |
| Spark Connect executors | `stardelt-spark-exec-…` (0) | `make platform` | yes (template) |
| StreamApp driver | `pegelonline-driver` (1) | the operator | yes |
| StreamApp executors | `…-exec-…` (0) | the operator | — |
| Trino coordinator | `trino-coordinator-…` (1) | `make platform` | yes |
| Trino worker | `trino-worker-…` (1) | `make platform` | yes |
| Superset web, worker, redis | `superset-…`, `superset-worker-…`, `superset-redis-master-0` (3) | `make platform` | yes |
| Superset init | `superset-init-db-…` (0) | `make platform` | — |
| Airflow api-server, scheduler, dag-processor, triggerer, statsd | one pod each (5) | `make platform` | yes |
| Airflow worker | `airflow-worker-…` (0) | `make platform` | — |
| Keycloak | `keycloak-…` (1) | both | yes |
| Lakekeeper catalog | `lakekeeper-…` (1) | `make platform` | yes (the sidecar is patched) |
| Lakekeeper init containers, migration Job | `lakekeeper-db-migration-…` (0) | `make platform` | — |
| OpenFGA | `openfga-…` (1) | `make platform` | yes |
| OpenBao | `openbao-0` (1) | `make platform` | yes |
| SeaweedFS master, volume, filer, s3, admin | `seaweedfs-master-0`, `-volume-0`, `-filer-0`, `seaweedfs-s3-…`, `seaweedfs-admin-0` (5) | `make platform` | yes |
| Reloader | `reloader-reloader-…` (1) | `make platform` | yes |
| Kafka broker | `kafka-kafka-0` (1) | `make platform` | yes |
| Kafka entity operator | `kafka-entity-operator-…` (1) | `make platform` | yes |
| The operator | `stardelt-operator-…` (1) | the operator chart | yes |
| Postgres `nova-pg` | `nova-pg-1` (1) | chart default | yes |
| Postgres `keycloak-pg` | `keycloak-pg-1` (1) | chart default | yes |
| Postgres `lakekeeper-pg` | `lakekeeper-pg-1` (1) | chart default | yes |
| Postgres `openfga-pg` | `openfga-pg-1` (1) | chart default | yes |
| Postgres `airflow-postgresql` | `airflow-postgresql-0` (1) | chart default | yes |
| Postgres `superset-postgresql` | `superset-postgresql-0` (1) | chart default | yes |
| CloudNative-PG, Strimzi, Spark operator (controller and webhook), External Secrets | seven pods (7) | chart default | yes |
| Jobs: group-roles, backups, maintenance | `airflow-group-roles-…`, `lakehouse-backup-…`, `maint-…` (0) | `make platform`, the operator | yes |

`Declared by`: `make platform` is the platform repository's `helm-values/` and `manifests/`,
`umbrella chart` its templates, `both` the two, `chart default` a pinned upstream chart or operator
that declares the fields itself, and `the operator` a pod template built by the stardelt Operator.
The counts are the pods running at that moment: a notebook, a Spark query and a Job come and go.
A `—` in `restricted` marks a pod the sweep did not see; where the template is in the repository it
was admitted with the same server-side dry run instead (the Spark Connect executor template above,
and all 25 CronJob templates). A single-user notebook pod declares no security context of stardelt's
own, so check that row after a notebook has run.

### The chart exception

The Lakekeeper chart hardcodes the `opa` sidecar's `securityContext` and exposes no value key for
`allowPrivilegeEscalation` or `capabilities`, so the sidecar cannot declare the two fields from
values alone. Every install path runs `platform/scripts/lakekeeper-opa-security.sh` after the Helm
release — `step-lakekeeper`, `install-core`, and since `stardelt/stardelt#1365` also `catalogs` and
`catalog-enforce` — which sets the fields on the deployment and waits for the rollout. The
operator's `authz.backend: allowall` path has no `opa` container, so there is nothing to patch there.

The five SeaweedFS pods are admitted. `helm-values/seaweedfs.yaml` sets each component's
`podSecurityContext` and `containerSecurityContext` (uid/gid 65534, `RuntimeDefault` seccomp, all
capabilities dropped) and its log volume to `emptyDir`, so no `hostPath` remains; measured on the lab
2026-11-18 with the same server-side dry run (platform#1758). The operator path renders the same
blocks from `crates/stardelt-operator/values/seaweedfs.yaml` for `master`, `volume`, `filer` and
`s3`; its `admin` stays at the chart default (`enabled: false`).

The StreamApp driver is admitted on the pinned operator build; a cluster still on an older operator
shows a refusal until the driver pod is replaced.

### Check your own cluster

From the platform repository, with the namespace the platform runs in:

```console
$ NS=<your-namespace> make verify-pod-security
…
PASS (75 admitted by restricted: 50 of 50 pod(s) and 25 of 25 CronJob template(s), 0 known exceptions)
```

The count follows the pods your install runs.

The target runs `scripts/verify-pod-security.sh`. For every running pod it takes the spec as the
API server sees it, strips only what a scratch namespace cannot carry (its name, its node, its
priority class), and creates it with `--dry-run=server` in a namespace labelled
`pod-security.kubernetes.io/enforce=restricted`, which is deleted afterwards. Nothing in the
platform's namespace is changed. It re-admits the namespace's CronJob pod templates the same way,
because a pod that runs for seconds is invisible to a scan of running pods. A refusal that no
`--allow` pattern matches fails the run; a `--allow` pattern that matches no refusal is reported so
it can be dropped.

`--allow <regex>` names a known exception. Today the target passes no `--allow` pattern. The
StreamApp driver's was dropped when the pinned operator declared the fields
(`stardelt/stardelt#1211`), and the Lakekeeper sidecar's with the patch above
(`stardelt/stardelt#1361`).

### If a pod is refused

- Read the reason in the output: it names the container and the field (`container "sidecar" must set
  securityContext.capabilities.drop=["ALL"]`), so there is nothing to guess.
- The sweep admits the spec the API server holds. A pod that has just been replaced still shows the
  old spec until the new one is up; compare the pod's `metadata.creationTimestamp` with the change
  before you look for a cause.
- A refusal in a rollout usually means the workload's values did not reach the pod template. Init
  containers inherit nothing from the chart's pod or container keys, so they need their own block.
- The operator path builds its pod templates itself, so its defaults live in the operator's own
  `crates/stardelt-operator/values/*.yaml` and code, not in the platform's `helm-values/`. A fix
  that only lands in one of the two install paths leaves the other one refused.

## Rotating secrets

Secrets are generated once at install and kept. Rotating one is a deliberate act: **delete the
Secret, run the install again, restart what read the old value.** Namespace `stardelt` is assumed.
Never paste a Secret value into an issue, a log or a chat.

### Inventory

| Secret | Keys | Created by | Read by | After a rotation |
|---|---|---|---|---|
| `stardelt-s3-creds` | `access-key`, `secret-key`, `endpoint`, `bucket`, `region` | `scripts/s3-secrets.sh` / chart | Trino, Lakekeeper bootstrap, Airflow, CNPG backups | restart Trino; refresh Lakekeeper's warehouse credential; restart the CNPG pod |
| `seaweedfs-s3-config` | `seaweedfs_s3_config` (JSON, same key pair) | same, derived from the above | SeaweedFS S3 gateway | rolls with the Helm upgrade |
| `keycloak-admin` | `username`, `password` | `identity-bootstrap.sh` / chart | Keycloak (bootstrap admin) | the bootstrap admin is only created on first start: change the password in the console too |
| `stardelt-realm-admin` | `username`, `password` | same | realm import and `scripts/sync-realm-admin.sh` | re-run `make install-identity`, it re-applies and verifies it |
| `stardelt-oidc-clients` | `nova`, `superset`, `airflow`, `jupyterhub` | same | Keycloak clients, each app | `make install-identity` re-applies the client secrets (`scripts/sync-oidc-clients.sh`), then restart the app |
| `stardelt-nova-session` | `session` | same | Nova | restart Nova; everyone is signed out |
| `superset-secret-key` | `secret-key` | `scripts/app-secrets.sh` / chart | Superset pods | invalidates sessions and stored database passwords |
| `superset-admin` | `username`, `password`, `firstname`, `lastname`, `email` | same | Superset init job | the init job only creates the user once: reset the password inside Superset |
| `airflow-fernet-key` | `fernet-key` | same | Airflow pods | a new Fernet key makes stored connection passwords unreadable: re-enter them |
| `airflow-webserver-key`, `airflow-jwt-secret` | `webserver-secret-key`, `api-secret-key`; `jwt-secret` | same | Airflow pods | invalidates sessions and API tokens |
| `airflow-admin` | `username`, `password` | same | Airflow create-user job | the job only creates the user once: reset it in the Airflow UI |
| `*-pg-app` (CNPG) | `username`, `password` | CloudNative-PG | Lakekeeper, Keycloak | managed by the operator; rotate with its documentation |

Keycloak imports its realm only on first start; the identity scripts re-apply the client secrets and
the realm admin password on every `make install-identity` and verify them. The master-realm console
is not published; use `kcadm.sh` inside the pod (see [Known limits](#known-limits)).

### Rotating the S3 key pair

```bash
kubectl -n stardelt delete secret stardelt-s3-creds seaweedfs-s3-config
kubectl -n stardelt delete job lakekeeper-bootstrap --ignore-not-found
make install-core            # generates new Secrets, upgrades SeaweedFS, re-runs the bootstrap Job
kubectl -n stardelt rollout restart deploy/seaweedfs-s3 deploy/trino-coordinator deploy/trino-worker deploy/lakekeeper
kubectl -n stardelt delete pod lakekeeper-pg-1     # CNPG reads backup credentials at pod start
```

Why each step: the Lakekeeper warehouse stores the key (encrypted) and only the bootstrap Job's
credential refresh updates it (`POST /management/v1/warehouse/{id}/storage-credential`);
Trino and CNPG read the Secret when their pods start. Prove it with a write and a read: sign in to
Nova as an admin and run these statements in the SQL editor, one after the other (Trino accepts
authenticated HTTPS only, so there is no unauthenticated command-line check):

```sql
CREATE SCHEMA IF NOT EXISTS warehouse.rotation_check;
CREATE TABLE warehouse.rotation_check.t AS SELECT 1 AS x;
SELECT x FROM warehouse.rotation_check.t;      -- expect 1
DROP TABLE warehouse.rotation_check.t;
DROP SCHEMA warehouse.rotation_check;
```

## AI assistants

Nova can serve a hosted endpoint for AI assistants at `POST /mcp` ([AI assistants](../guides/mcp)).
It is **off by default**, and an administrator turns it on per install with `spec.mcp.enabled`,
`nova.mcp.enabled` or `NOVA_MCP_ENABLED`.

An assistant is treated as untrusted code acting for a trusted person:

- **It acts as the person.** Every call carries that person's token; the engine and the catalog
  authorize the person, with their groups and grants. There is no service account behind the
  endpoint. Its tools are read-only, and `sql_read` accepts one reading statement and nothing else.
- **The token is bound to the endpoint.** It must carry the endpoint's audience and the
  `stardelt:read` scope, and the browser's session cookie is never accepted. A token without the
  scope is refused before any tool runs.
- **Answers are limited and audited.** A row cap, a 60-second limit with cancel in the engine, a
  per-person limit of 60 calls a minute, and 20 000 characters per answer. Every call writes one
  audit line (person, client, tool, status, duration and a hash of the arguments) and, with a state
  store, one database row an administrator can read.
- **Answers are data, never instructions.** The endpoint says so in its `initialize` answer and in
  every tool description, and no tool returns a secret value.
- **An administrator can switch it off** and can limit it to named client ids
  (`spec.mcp.allowedClients`).

## Your own model endpoint

stardelt ships no model and runs no inference. A model is an external, OpenAI-compatible endpoint
that an administrator connects with a [`ModelEndpoint`](../reference/resources/modelendpoint); Nova
is the only component that calls it, and today the probe is the only caller.

- **A prompt goes to the endpoint an administrator named, and nowhere else.** The resource carries
  the base URL and the model id. When a feature sends a prompt to an endpoint with
  `location: cloud`, that prompt leaves your cluster. `sendRows` is `false` by default, so query
  results are not sent to a model unless an administrator turns it on for that endpoint.
- **The key does not pass through an API.** `spec.keyRef` names a key of a `Connection` in the
  platform namespace. The operator projects that connection's synced secret into Nova's pod as one
  file per endpoint — `/var/run/stardelt/models/<endpoint>/key`, mode `0440`, read-only — and Nova
  never reads the Secret or the key reference through the Kubernetes API. The key is not in a Nova
  log line, an API answer or the browser.
- **The read path hides the address.** `GET /api/model-endpoints` answers an endpoint's name, its
  model, its location, its purposes and the probe's result — never its URL and never its key
  reference.
- **The probe sends four fixed requests, never your data.** Best-effort `/models` (for the context
  window), one chat with the fixed sentence *"Reply with one short sentence about lakes."*, the same
  with one tool definition, and the same asking for a JSON object. Its result is the endpoint's
  `status`: an endpoint that does not answer, cannot call a tool or cannot return JSON is marked
  unusable before a feature relies on it.

## Known limits

- **A standing key remains on the query engine.** Trino reads object storage with the platform's S3
  key, so anything that holds that key can read every file, whatever the table permissions say.
  Spark's shared Connect server uses a credential the catalog vends per table for a short time, and
  neither its driver nor its executors carry a platform key (`make verify-spark-no-platform-key`);
  the batch and stream paths still do (stardelt/stardelt#494).
- **Row filters and column masks are not available in this release.** No install path lets you
  define one yet: the engine's policy plane needs a rule source and the two policy URIs
  (stardelt/stardelt#50), and the operator path renders no policy bridge. When they arrive, they
  will apply in Trino only — a `%sql` query gets the filter or mask, a `spark` read does not, so
  a masked column stays readable there by anyone with the grant (stardelt/stardelt#84).
- **Network isolation is partial.** NetworkPolicies protect Lakekeeper, OpenFGA, JupyterHub and
  Superset's database on a `make` install. The rest of the namespace is flat, and the umbrella chart's
  core renders none.
- **The operator has broad rights.** Treat access to its namespace like cluster administrator access.
- **SeaweedFS sign-in stays off.** The pinned version must not use its own OIDC path (CVE-2026-77298,
  fixed in 4.40). stardelt uses static keys there. See
  [per-component sign-in](../operations/sign-in).
- **An AI assistant's token reaches the engine directly.** The endpoint forwards the caller's token
  to Trino rather than exchanging it, and the engine checks no engine-specific audience today, so the
  same token authenticates against Trino's published endpoint. What bounds it is the person's own
  grants, not the read-only tool surface. A token exchange that mints an engine-bound token is
  planned.
- **The endpoint cannot see an assistant's own tools.** It bounds what an assistant reads through
  the platform; it cannot stop the assistant's client from sending that data elsewhere, and it cannot
  stop an assistant from following instructions hidden in a table. Read the tool descriptions and the
  [guide](../guides/mcp) as the contract, and treat every answer as untrusted text.
- **A model endpoint is software outside the platform's control.** stardelt decides what it sends —
  the prompt, and query results only with `sendRows: true` on a `cloud`-marked endpoint — and the
  endpoint's operator decides what it keeps. Treat a model's answer as untrusted text, like an
  assistant's, and prefer an endpoint in your own network when the prompt carries sensitive data.
