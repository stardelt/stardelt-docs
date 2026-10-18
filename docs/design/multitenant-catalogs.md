---
title: "Many catalogs and many SQL warehouses"
sidebar_label: "Multi-tenant catalogs"
slug: /design/multitenant-catalogs
---

# Many catalogs and many SQL warehouses

**What this page is.** The design for the two axes stardelt lacks today: **many catalogs** (separate data domains — finance, product, sandbox — each with its own storage, owner and permissions) and **many SQL warehouses** (named compute size classes, granted per group, picked per session). It decides the six questions in [stardelt-docs#64](https://github.com/stardelt/stardelt-docs/issues/64): how many catalogs and at which layer, how compute is split, the CRD shapes, the permission model and its enforcement points, tenancy and blast radius, and the migration of what exists.

**What this page is not.** Not an implementation ticket, and not a change to the [master spec](./master-spec). The spec wins where this page and the spec disagree; §[10](#10-proposed-spec-amendments) proposes the amendments this design needs, in the spec's own decision-record style, for a separate pull request and discussion. Nothing here forks Trino or Lakekeeper, and nothing here needs a licence server: the whole design runs on features of the pinned upstream versions, which §[10](#10-proposed-spec-amendments) and §[11](#11-sources-and-what-was-read-when) name one by one.

**How it was produced.** From the [permission model research](../architecture/permissions-research) (the vocabulary, the one-authority-per-check rule, and its six open questions), from [identity integrations](../architecture/identity-integrations) (what each pinned version can and cannot do), from [gap decisions](./gap-decisions) D8 and the register's rows 1 and 24, and from the source of the pinned versions themselves where their documentation was silent. §[9](#9-answers-to-the-researchs-open-questions) answers the research's open questions; §[7.3](#73-spikes-to-file-before-the-p2bp3-tickets) lists the three spikes three of its claims still need; §[12](#12-what-remains-undecided) lists what this page deliberately leaves open.

Status: **proposed**, pre-alpha. Phase letters (P2a, P2b, P3) are *slices of roadmap phases*, not new phases. Three claims still need a spike before the tickets that depend on them are written — §[7.3](#73-spikes-to-file-before-the-p2bp3-tickets).

---

## 1. Decisions at a glance

| # | Question | Decision |
|---|---|---|
| 1 | How many catalogs, at which layer | **Many Lakekeeper *warehouses* behind the one REST service.** One `Lakekeeper` per catalog is rejected. §[2](#2-data-many-catalogs) |
| 2 | Does "one REST catalog" (§6) survive | **Yes, with a wording fix**: one REST catalog *service* and one place where policy attaches — not one data domain. Amendment [A1](#10-proposed-spec-amendments) |
| 3 | Compute: N Trino clusters or one | **One Trino cluster, many named size classes implemented as resource groups** (D8's mechanism). N clusters stay D8's P4 alternate. §[3](#3-compute-many-sql-warehouses) |
| 4 | The contracts | **New `Catalog` and `SqlWarehouse` CRDs, referencing `Lakehouse`.** `Lakehouse` keeps its role as the plug for *which software* provides catalog, storage and query. §[4](#4-the-contracts) |
| 5 | The permission model | The research's **six verbs, one inheritance rule, one owner, no deny**, with `use` narrowed to compute; authority for data objects is the **catalog**, for compute it is the **`SqlWarehouse` CRD**, for row/column predicates the **engine's policy plane**. §[5](#5-the-permission-model) |
| 6 | Tenancy and blast radius | **Logical tenancy per catalog, one namespace per `Tenant`,** per-catalog S3 identities; SeaweedFS STS is **not** available at the pinned version. §[6](#6-tenancy-and-blast-radius) |
| 7 | Migration | **Nothing is renamed and nothing moves.** `warehouse.demo.trips` keeps its name because the Trino catalog name and the Lakekeeper warehouse name both stay `warehouse`; new catalogs are additive; `make install` keeps working unchanged. §[7](#7-migration) |

### 1.1 Vocabulary, because three systems use three words

| stardelt (user-facing, Nova, CRDs) | Iceberg REST / Lakekeeper | Trino | Databricks analogue |
|---|---|---|---|
| **catalog** — a data domain: `finance.orders` | warehouse | catalog | catalog |
| **schema** | namespace | schema | schema |
| **table** / **view** | table / view | table / view | table / view |
| **SQL warehouse** — named compute, sized and granted | — (no counterpart) | resource group | SQL warehouse |

Read the rest of this page with that table open. "Catalog" below always means the user-facing data domain; the word "warehouse" is used only when quoting Lakekeeper.

---

## 2. Data: many catalogs

### 2.1 What a catalog is to a user

A catalog is **a name you type before `schema.table`, backed by its own storage and its own owner, with its own usage permissions.** Concretely, in the shipped system it is four facts that must agree:

1. a **Lakekeeper warehouse** (name, storage profile, storage credential) — what the Iceberg REST service serves;
2. a **Trino catalog** entry whose `iceberg.rest-catalog.warehouse` names that warehouse — what a user's SQL addresses;
3. a **storage location** (bucket and/or key prefix) that only that catalog's writer identity may touch;
4. a **grant set** on the catalog object, plus an **owner group**.

A user never holds storage credentials ([identity integrations](../architecture/identity-integrations): users reach data through the catalog, never through S3), so facts 3 and 4 are invisible to them: to a user a catalog is "my domain, and either I can see it or I cannot".

### 2.2 Option A — many warehouses behind one REST service *(chosen)*

Lakekeeper serves **N warehouses from one deployment**, each with its own storage profile, storage credential and grant set. The Iceberg REST protocol is prefixed by warehouse, the warehouse is named in Trino's catalog properties, and the endpoint is one URL.

This is not a workaround; it is the shape the components are built for:

- the pinned Lakekeeper chart generates the Trino-catalog ↔ warehouse mapping as first-class configuration (`OPABridge.catalogs: [{trinoCatalog, lakekeeperWarehouse}]`, chart 0.11.0), and the OPA bridge ships four catalog slots by default with "more can easily be added";
- the bootstrap Job already creates a warehouse with `POST /management/v1/warehouse`, carrying `storage-profile` **and** `storage-credential` — both per warehouse (`stardelt-platform/manifests/lakekeeper-bootstrap.yaml`), so per-catalog storage isolation needs no new component;
- our chart already runs one Lakekeeper with one warehouse, i.e. N=1 of the same object.

**Cost.** Independent of N: one catalog adds a warehouse row, one Trino catalog entry, a Secret, and a bucket or prefix. No pod, no database, no operator, no upgrade path. N is bounded only by the storage layer (§[2.4](#24-storage-isolation-is-the-real-limit)).

**Consequence for §6 of the spec.** "Iceberg tables on object storage behind **one** REST catalog … every policy attaches to it" survives intact if "one REST catalog" means *one REST service and one place where policy attaches*. What it must not be read as is "one catalog per platform": that reading is what this ticket removes, because one catalog per platform means one owner, one grant set and one answer to "who may read what" for the whole organisation. Amendment [A1](#10-proposed-spec-amendments).

### 2.3 Option B — one Lakekeeper per catalog *(rejected)*

Rejected on four counts, all of which are consequences of the [one-authority rule](../architecture/permissions-research) rather than taste:

1. **Two authorities.** Each instance would decide access independently, so "may this user read this table?" gets N answers, and Nova, notebooks and Trino could each consult a different one. The research's rule — *if a check has two authorities, it has none* — is violated by construction.
2. **N trust anchors.** Every instance validates the user's token itself; each one is a place to get audience, issuer or role mapping wrong. One Lakekeeper is one configuration to verify.
3. **N upgrade paths and N failure modes.** N × (pod, database, schema migrations, soft-delete queues, migration time). Lakekeeper's own production checklist is per instance.
4. **It buys nothing.** Per-domain storage and per-domain grants are already per-warehouse. The only thing N instances add is *hard metadata isolation* — and if that is the requirement, it is a `Lakehouse` per domain (a whole second lakehouse with its own SeaweedFS and Trino), which is option D8/P4 and a different conversation: it is the same thing the spec's plug matrix already permits via a second `Lakehouse` object, and the operator has already proved it can install a second lakehouse into a fresh namespace.

The day a customer needs a second *trust domain* (different IdP, different storage system, a regulated subsidiary), the answer is a second `Lakehouse`, not a second warehouse behind the same one.

### 2.4 Storage isolation is the real limit

Three gradations, all available today:

| Isolation | Mechanism | Strength | Cost |
|---|---|---|---|
| **Prefix** | one bucket, `key-prefix: <catalog>` per warehouse (what the bootstrap Job does today: bucket `lakehouse`, prefix `warehouse`) | **Metadata only.** Any identity that can read the bucket can read every prefix, so prefix isolation is not storage isolation | none |
| **Bucket** | one bucket per catalog, one S3 identity per catalog scoped to that bucket | **Real**: the credential a catalog's Trino uses cannot read another catalog's bytes | one SeaweedFS bucket (see below) |
| **Credential + bucket** | as above, plus a distinct identity per catalog so a rotation is per-catalog | **Real, and blast-radius limited**: a leaked credential exposes one domain | one entry per catalog in the S3 config |

**Recommendation:** production default is **bucket + credential per catalog**; the `demo` profile may collapse catalogs into prefixes of the one bucket, and that is the profile where storage-layer isolation is knowingly absent (state it in the profile's documentation, not only here).

Per-catalog credentials at the pinned SeaweedFS (4.25, chart 4.25.1) are **static identities in one JSON config file** — the chart exposes it as `s3.existingConfigSecret` with the key `seaweedfs_s3_config`, and the file's `identities` array supports several identities, each with several credentials and per-bucket actions (`AllowedActions` are read/write/list/tagging/admin, and the separator is `:`, i.e. `Read:finance` scopes an action to one bucket). **STS-style short-lived credentials are not available to us**: SeaweedFS's OIDC/STS path needs ≥ 4.40 because of CVE-2026-77298, which the identity page already rules out on the pinned version — so "per-catalog credentials" means *one S3 user per catalog*, and Lakekeeper's `vended-credentials-enabled` stays off (`helm-values/trino.yaml` sets it false) because there is no STS endpoint to vend from. Revisit after a SeaweedFS upgrade to ≥ 4.40, as a P4 item.

**The dev node's ceiling, in numbers.** SeaweedFS gives every bucket its own *collection*, and upstream's own documentation says a collection usually consumes seven volumes; the dev values set `maxVolumes: 100` and carry the shipped warning that once the slots are used up "the master cannot create a volume for a new collection, and writes to a new bucket block forever". So a single-node dev cluster tops out at roughly **14 buckets** (100 ÷ 7) — that, not memory, is what limits the number of catalogs there, and it is why the `demo` profile uses prefixes instead. Raising `maxVolumes` is a one-line change; the point of writing the number down is that the limit becomes a decision rather than a surprise.

Two smaller facts worth writing down because they are easy to get wrong:

- Changing the S3 identity file: SeaweedFS 4.25 reloads IAM configuration when it changes **in the filer's `/etc/iam` directory** (`onIamConfigChange` in `weed/s3api/auth_credentials_subscribe.go`). Whether the chart's `existingConfigSecret` (a plain file in each component) gets the same live reload is **unverified** — until it is verified, treat adding a catalog's credentials as needing an S3 gateway restart, and do it in the same window as the Trino catalog addition.
- Deleting a catalog must not delete a bucket by accident. The operator's delete path for a `Catalog` will refuse while the warehouse holds tables, and never deletes storage; "destroy this domain" is an explicit, separate action. (The same rule the operator already applies to Helm releases with `adopt`.)

### 2.5 Ownership and lifecycle

- `Catalog.spec.owner` is a **Keycloak group** (never a user), declared in the CRD, and reconciled into the catalog as warehouse ownership. Ownership means `manage`, not `select` (research §4.4) — owning the finance domain must not silently make you a reader of every table in it.
- **Managed access** (Lakekeeper's `managed_access`, OpenFGA authorizer) removes the owner's power to grant on that object and centralises grants in the platform. Per-catalog switch, default **off** (self-service is the point of a domain), **recommended on** for regulated domains where a domain owner must not be able to widen their own audience.
- Catalog deletion is soft by default in Lakekeeper; stardelt's rule is stricter: the operator sets a `Catalog` to `Degraded` with a "contains N tables" condition rather than deleting.

---

## 3. Compute: many SQL warehouses

### 3.1 What "many SQL warehouses" means when there is one Trino

Databricks sells a warehouse picker because each pick is a separate cluster. Trino has no such object — what it has is **resource groups**: named queues with a concurrency limit, a queue limit, a memory share and a scheduling policy, declared in one file. D8 already decided this ("Adopt Trino resource groups as the isolation mechanism … Do **not** run one Trino cluster per tenant in v1") and this design keeps it.

So a **SQL warehouse** in stardelt is a *named, granted compute class* that happens to be implemented as a resource group. The name and the grants are the product surface; the resource group is today's implementation. That is the contract in §[4.3](#43-sqlwarehouse--the-query-serving-plug).

### 3.2 Option A — resource groups in the one Trino *(chosen)*

| | What it gives | What it does not |
|---|---|---|
| Resource groups | Named classes, per-class concurrency and queue caps, per-class memory share, weighted or fair scheduling, per-class CPU quota period | Hard memory or CPU isolation: `softMemoryLimit` **queues** queries, it does not kill a running one, and a runaway query in one class can still exhaust cluster memory. It is a scheduling and fairness tool, not a safety wall |
| One Trino cluster | One set of catalogs, one access-control configuration, one upgrade to schedule, one query history, shared idle capacity | A coordinator restart takes every class down; one cluster's JVM settings are global (`query.max-memory`, `query.max-memory-per-node`) |

Numbers, because the difference is stark. The dev cluster is one `cx33` node (4 vCPU, ~7.8 GiB) that is already at roughly 80 % memory with the core profile — so "which phase costs what there" is answered against ~1.5 GiB of headroom, not against a comfortable 16 GB machine:

| | Dev cluster (single node, ~1.5 GiB spare) | Real cluster |
|---|---|---|
| Cost of adding a size class | **zero pods, ~2 KiB of JSON.** The classes partition the existing coordinator/worker (2 Gi heap each with the shipped values; 1500m on the `SLIM=1` shape — coordinator + worker together measure ≈1.9 GB resident) | zero pods; the classes partition whatever the cluster has — e.g. a 4 Gi coordinator + 4 × 16 Gi workers |
| Realistic classes | `default` (2 running / 20 queued / 40 % memory), `big` (1 running / 1 queued / 50 %) — the dev node cannot run two real queries at once anyway | `interactive` (20 / 200 / 30 %), `batch` (4 / 50 / 50 %), `admin` (2 / 10 / 10 %), each matched to a workload shape |
| Isolation | queueing and fairness only | same |

Trino's own default example uses a global group at 80 % memory, 100 concurrent, 1000 queued — that is the shape to scale from, not to copy on a dev node.

### 3.3 Option B — N Trino clusters *(deferred, P4 — and D8 already names it as the alternate)*

A Trino cluster per warehouse is the only way to get **hard** isolation: its own JVM, its own `query.max-memory`, its own failure domain, an idle class that cannot be starved by a busy one. It is also the only way a compute grant becomes an **admission** decision rather than a placement one: on a dedicated cluster the engine's own access control can refuse the query outright (an OPA rule on `ExecuteQuery` for the allowed groups), which is a check a *shared* cluster cannot express at all — Trino's OPA context carries identity and groups and nothing about which class the scheduler will pick (§[3.4](#34-how-a-user-picks-one-and-why-the-pick-cannot-be-spoofed)). That is the real thing a dedicated cluster buys, and it is worth naming precisely, because isolation is the reason usually given and the worse reason.

It is also, on the evidence available today, arithmetic:

- each cluster needs a coordinator (~4 Gi heap) and at least one worker (~16 Gi heap in production) — **one additional cluster is larger than the whole dev node**, and it cannot borrow another cluster's idle capacity;
- four warehouses at that size is 80+ Gi of compute against roughly 64 Gi for one cluster partitioned into four classes that share it;
- N access-control configurations, N sets of catalogs to keep in sync, N things to upgrade.

Decision: **N clusters stay D8's P4 alternate, scoped by `Lakehouse`/`Tenant`, reached when a size class needs isolation *or* admission-level granting as a stated requirement** (a regulated workload, a customer-facing SLA, a class whose users must not merely be scheduled elsewhere but be refused). The `SqlWarehouse` contract does not change when that day comes — `spec.engineRef` points at a different engine, and its `grants` gain an admission check instead of a selector — which is the point of putting it in a contract now (D8: "The `Lakehouse` contract already permits this without an architecture change").

Option C — Nova-only, no engine-side mechanism — is rejected: a display that hides a button is not a grant.

### 3.4 How a user picks one, and why the pick cannot be spoofed

Two mechanisms, in this order:

1. **The grant is a resource-group selector on identity.** Trino's selector rules match on `user` (regex against the principal), `userGroup` (regex against the user's groups) and `authenticatedUser` ("the user that authenticated with the system, regardless of any changes made to the session user"), and "the first selector that matches is used". A user in `stardelt-analytics` matches the `big` selector; nobody else can, because the selector reads the authenticated identity, not the request.
2. **The choice within the granted set is a client tag.** A selector may also require `clientTags` ("to match, every tag in this list must be in the list of client-provided tags"), and Nova sets `X-Trino-Client-Tags`, the JDBC driver has a client-tags property, and the Trino CLI has `--client-tags` ("the tags can be used as input for Resource groups"). So `warehouse=big` selects *within* the set your identity already allows and can never select outside it: a user who is not in the analytics group sends the tag and lands in their own class, whatever they claim.

Precedence therefore reads, in one `resource-groups.json`:

```json
{"selectors":[{"userGroup":"stardelt-analytics|stardelt-admins","group":"big","clientTags":["warehouse=big"]},
              {"userGroup":"stardelt-analytics|stardelt-admins","group":"big"},
              {"group":"default"}]}
```

**Nova's job** is to show the classes your groups hold `use` on (read from the `SqlWarehouse` objects, non-authoritative), remember the choice per session, send the tag, and print the class that ran the query in the query header. Nova does not decide anything: bypassing Nova and calling Trino directly gains a user nothing, because selection is by identity.

**The hard rule this depends on.** A resource-group selector that matches on `clientTags` **alone is spoofable** — any client can set source and tags, which is exactly why the tag cannot be the grant. So: **every non-default selector must carry an identity constraint (`userGroup` or `user` or `authenticatedUser`), and the operator must refuse to render a `SqlWarehouse` whose grants would produce a tag-only selector.** An implementation that gets this wrong looks like it works (the picker works, the queues fill correctly) and grants the big class to anyone who sends a header. This rule is a review checklist item, a validation in the CRD's webhook-or-plan path, and a unit test in the renderer.

### 3.5 Trino has no groups from the token — the honest cost

Resource-group selectors keyed on `userGroup` need *groups at Trino*, and Trino 480 "documents no way to take groups from a token claim. Group providers are `file` and `ldap` only." So the design needs one piece of glue:

**The operator maintains a file `GroupProvider` mapping from Keycloak group membership into a ConfigMap**, mounted into the Trino coordinator (`group-provider.name=file`, `file.group-file=…`, `file.refresh-period`), and read by the file access control's `group` rules as well. Trino reloads the mapping on that period, so a group change lands without a restart. Two implementation notes that will otherwise cost a day each: mount the ConfigMap as a **directory**, not a `subPath` file (kubelet does not update `subPath` mounts), and expect kubelet's own ConfigMap propagation delay on top of the refresh period.

What this is not: it is not a second source of truth for permissions. It carries *group membership only* — the graph the IdP owns — never a grant.

---

## 4. The contracts

### 4.1 The §5 rule, applied

Master spec §5: "the CRD schemas are the plug specification. The operator adapters are the plugs." So each new object must name the plug it abstracts, and must remain meaningful if the default behind it is swapped. Three objects, three plugs:

| Object | The plug it specifies | Default today | Alternate |
|---|---|---|---|
| `Lakehouse` *(exists)* | **which software** provides catalog + storage + query for a lakehouse (plug matrix rows 1, 2 and query serving) | Lakekeeper + SeaweedFS + Trino | Polaris / BYO-S3 / Spark SQL |
| **`Catalog`** *(new)* | **one data domain inside that software**: its storage location and credential, its owner, its grants | a warehouse in the `Lakehouse`'s Lakekeeper | a warehouse in a Polaris instance, or an external Iceberg REST catalog reached by URI |
| **`SqlWarehouse`** *(new)* | **the query-serving plug**: one named compute class — its size, its caps, who may use it | a resource group in the `Lakehouse`'s Trino | a dedicated Trino deployment; later Spark SQL or DuckDB |

`Lakehouse` keeps its role: it decides *which software*, unchanged from [WP-21](./execution-plan). `Catalog` and `SqlWarehouse` decide *which instances*, and reference the `Lakehouse` that hosts them. That is the same split the operator already uses between `PlatformInstance` (cluster-scoped root, selects implementations) and its feature objects.

**Rejected: extending `Lakehouse` with `spec.catalogs[]` / `spec.warehouses[]`.** Two reasons, both practical rather than aesthetic. (1) Kubernetes RBAC and `kubectl apply` operate on whole objects: a team cannot own *one element of an array*, so a domain-per-team model would force every catalog change through the platform admin. (2) A git diff on an array is a diff on the platform's lakehouse object — review granularity and revert granularity are both wrong, and D12's access-request workflow ("Nova's request form produces a pull request against the CRDs") becomes a pull request against the entire lakehouse.

### 4.2 `Catalog`

```yaml
apiVersion: stardelt.io/v1alpha1
kind: Catalog
metadata:
  name: finance                 # the name users type: finance.orders
  namespace: stardelt
spec:
  lakehouseRef:
    name: default               # which Lakehouse hosts this catalog
  displayName: "Finance"
  description: "Contracted revenue, orders and billing."
  owner: stardelt-finops         # exactly one Keycloak group; ownership ⇒ manage, not select
  storage:                       # omitted ⇒ the Lakehouse's storage defaults
    bucket: finance              # isolated bucket per catalog (see §2.4)
    keyPrefix: ""                # required in the demo profile, where all catalogs share one bucket
    credentialSecretRef:          # the per-catalog S3 identity (see §2.4)
      name: finance-s3-creds
      key: identity-entry
  grants:
    - group: stardelt-finops
      verb: browse
    - group: stardelt-analytics
      verb: browse
    - group: stardelt-analytics
      verb: select
    - group: stardelt-analytics
      verb: create              # create schemas/tables inside, on the whole catalog
  managedAccess: false           # true ⇒ owners cannot grant on this catalog (§2.5)
status:
  phase: Ready
  warehouseId: 9f1c…             # the Lakekeeper warehouse id, so Nova and the bridge never guess
  catalogName: finance           # the Trino catalog name actually rendered
  conditions:
    - type: CatalogReady
      status: "True"
    - type: StorageAccessible
      status: "True"
    - type: Drift                 # a grant exists in the catalog that this CRD does not declare
      status: "False"
```

Notes that matter:

- `metadata.name` **is** the user-facing catalog name and the Lakekeeper warehouse name; no aliasing, so there is exactly one name per domain in every log and every error message.
- `spec.grants[]` is reconciled **into** the catalog (the catalog is authoritative at query time, §[5.5](#55-where-each-kind-of-policy-lives)); the operator prunes grants *it created* that are no longer declared, and reports `Drift` for grants it did not create. A grant made in the Lakekeeper UI therefore does not silently survive.
- `status.warehouseId` is what Nova and the OPA bridge mapping need; neither may re-derive it by name lookup.

### 4.3 `SqlWarehouse` — the query-serving plug

```yaml
apiVersion: stardelt.io/v1alpha1
kind: SqlWarehouse
metadata:
  name: big
spec:
  lakehouseRef:
    name: default
  displayName: "Large (analytics)"
  size: large                    # xs | small | medium | large — the platform's class, not a raw number
  concurrency:
    running: 4                   # resource-group hardConcurrencyLimit
    queued: 20                   # resource-group maxQueued
    memoryShare: 40%             # resource-group softMemoryLimit
    scheduling: weighted_fair    # fifo | fair | weighted | weighted_fair
  grants:
    - group: stardelt-analytics
    - group: stardelt-admins
  default: false                 # exactly one per Lakehouse is the default class
status:
  phase: Ready
  renderedGroup: big             # the resource group actually written
  engine: trino@default          # which engine implements it (§3.3 — the alternate lives here)
```

`size` is a platform-defined class, not a client-chosen number: it expands to the `concurrency` defaults for that class unless overridden. What a class *means* is exactly the four numbers above — running, queued, memory share, scheduling — because those are the only levers Trino gives us. Advertising "2X-Small / Large / 2X-Large" as if they were Databricks' DBU-rated sizes would be a lie about a JVM heap.

### 4.4 `Tenant` and `Lakehouse`: unchanged in role, extended where needed

- `Lakehouse` gains only optional references (`spec.catalogSelector`, `spec.defaultSqlWarehouse`) and the values the operator must render for the new objects' implementations — the `catalogs` map, the OPA-bridge catalog mapping, `resource-groups.json`, the group file and the access-control rules. Its spec remains `{catalog, storage, query, profile}`.
- `Tenant` keeps the ceiling role D8 gave it (namespace, NetworkPolicy, aggregate quota) and gains a resource-group *ceiling* that a `SqlWarehouse` in that tenant may not exceed — see amendment [A3](#10-proposed-spec-amendments).

### 4.5 Migration of the existing objects

Nothing in the existing install is renamed, and the two existing objects are adopted rather than recreated:

| Existing | Becomes | How |
|---|---|---|
| Lakekeeper warehouse `warehouse` (bucket `lakehouse`, prefix `warehouse`) | `Catalog/warehouse` | The operator **adopts** the warehouse it finds (the same `adopt` discipline as Helm releases), writes a CRD-shaped status, and adds no grant it does not declare |
| Trino catalog `warehouse` | `Catalog/warehouse`'s `status.catalogName` | The rendered catalog properties stay byte-identical; `warehouse.demo.trips` is untouched |
| the one Trino cluster | `SqlWarehouse/default` (`size: small`, granted to `stardelt-admins` and `stardelt-users`) | Rendered as the resource-groups root + default group; existing sessions match no selector and land in the default class, exactly as they do today |
| `stardelt-s3-creds` | the `Lakehouse`'s storage credential | Unchanged; a `Catalog` without `spec.storage` uses it |

`make install` behaves as it does today on both a fresh and an existing cluster: one Lakekeeper with one warehouse, one Trino, no `Catalog` or `SqlWarehouse` required. Applying the two CRDs above is what turns the single-catalog install into a multi-catalog one, and it is idempotent. **A cluster that applies no CRDs sees no behavioural change at all** — that is the compatibility promise, and it is also the rollback: delete the `SqlWarehouse`/`Catalog` objects and the rendered configuration returns to the pre-change state (with the caveat that a *deleted catalog's data is not deleted*, §[2.5](#25-ownership-and-lifecycle)).

---

## 5. The permission model

This section consumes [permission model research](../architecture/permissions-research) §3–§5 and adds only what the catalog and compute objects force.

### 5.1 Objects and subjects

- **Data objects:** `catalog` → `schema` → `table` | `view`. Nothing below a table: columns are not grantable (masks are the column mechanism).
- **Compute objects:** `sqlwarehouse` (flat, no children).
- **Subjects are Keycloak groups, never users** ([identity](../architecture/identity) — "Group membership is the role. No per-user special cases"), which is also what makes an ownership model with no `$unowned` failure mode possible: a group is not a user who can be deleted.
- **Admins** are the platform group, seeded as a grant-holder at bootstrap; the flag does not bypass data-plane checks (research §4.6), so "who read the customer table" keeps one answer.

### 5.2 Verbs

Six verbs, unchanged from the research's §4.2 proposal, with **one refinement**: `use` is narrowed to the compute object.

| Verb | Applies to | Means | Catalog mapping | Compute mapping |
|---|---|---|---|---|
| `use` | **sqlwarehouse** | your queries may be scheduled into this class | — | resource-group selector match |
| `browse` | catalog, schema, table, view | metadata and existence only; no rows | Lakekeeper `describe` (→ bridge `get_metadata` / `get_config`) | — |
| `select` | table, view (grantable at schema or catalog) | read data | Lakekeeper `select` (→ bridge `read_data`) | — |
| `write` | table, view (grantable at schema or catalog) | insert, update, delete, merge, alter | Lakekeeper `modify` (→ bridge `write_data`, `commit`) | — |
| `create` | schema, catalog | create schemas/tables/views inside it | Lakekeeper `create` (→ bridge `create_table`, `create_namespace`) | — |
| `manage` | any object | grant, revoke, transfer ownership of *this* object; drop/rename | Lakekeeper `ownership` / `manage_grants` (→ bridge `drop`, `rename`) | — |

**Why `use` moved.** The research proposed `use` on catalogs as a prerequisite for everything below. At the pinned Lakekeeper there is no privilege that separates the two: the bridge resolves Trino's `AccessCatalog` and `FilterCatalogs` to a *config-read* check on the warehouse (`get_config`), while `browse` is a *metadata* check on the same object — and the 0.12.2 OpenFGA model is not documented precisely enough to claim those are separable in practice. Two verbs that cannot be separated are one verb with extra paperwork. So on a catalog, **`browse` is also the ability to address it**, and `use` exists where nothing else does: on a `SqlWarehouse`, where there is no browse-able content and no other verb. This is a deliberate deviation from the research's proposal; it becomes possible to split them the day Lakekeeper documents the separation, and nothing else in this design depends on which way that goes.

**Deliberately absent** (unchanged from the research): no `ALL PRIVILEGES`, no `DENY`, no per-column verb, no separate `drop`, no `execute` until functions and models ship, no per-user grants, no aggregate grants.

### 5.3 Inheritance, ownership, no deny

- **One inheritance direction, downward, including future objects.** A grant on a catalog reaches every schema and table in it, existing and future; a grant on a schema reaches its tables. No `ALL DATASETS`-style snapshot form.
- **One owner per object, and the owner is a group**, declared in the CRD (`Catalog.spec.owner`), not inferred from whoever created something first. Ownership implies `manage` and does **not** imply `select`.
- **No deny.** The blast-radius control is *where* you grant: catalog-level grants are a platform-admin action, schema-level grants are the normal case, and `managedAccess` exists for domains that need the owner to be unable to widen the audience (§[2.5](#25-ownership-and-lifecycle)).
- **Column grants are absent** on purpose: a column you may not read is a mask (a policy), not a missing grant.

### 5.4 Browse, and what "SELECT on a table you cannot see" does

Two behaviours compose here, and both are already documented upstream, so the design only has to pick which to surface:

- **Trino's visibility rule** ("for a catalog, schema, or table to be visible in a `SHOW` command, the user must have at least one permission on the item or any nested item") means a catalog with no permission at all does not appear in `SHOW CATALOGS`, while a catalog where you hold `browse` on one schema does — with only that schema listed.
- **Lakekeeper's bottom-up inheritance** does the same inside the catalog: "if a user is granted the `select` privilege on table `ns1.ns2.table_1`, that user is implicitly granted limited list privileges on `ns1` and `ns2`… If `ns1.ns3` would exist as well, a list on `ns1` would only show `ns1.ns2`."

Consequences to state plainly:

- `SELECT` on a table you may not see **fails at the engine with the engine's own error** (a permission error, not `Table not found`) — that is deliberate: reporting "not found" for a table you may `browse` would be a lie, and reporting "denied" for a table you may not `browse` would leak existence. So: deny, and make Nova the place that never offers the query in the first place.
- **Nova must ask the catalog, not re-implement the rule** (research §3.3, last row). Concretely: Nova reads effective permissions from Lakekeeper's permission-check API for the signed-in subject, and shows `browse`-able objects and the `SqlWarehouse` classes the subject may use. Nova is explicitly non-authoritative; its only job is to fail *before* the user tries.
- **A catalog you may not browse is absent from Nova's catalog list, and that is a feature**: it is the "discover-without-reading" behaviour both vendors ship and we lack today (research §3.4, conflict 3).

### 5.5 Where each kind of policy lives

| Kind | Authority (the store) | Enforcement points | Why there |
|---|---|---|---|
| Which catalog/schema/table verbs a group holds | **the catalog** (Lakekeeper grants; declared via `Catalog.spec.grants`) | Trino (IPA bridge), Nova (display), later Spark/notebooks | One answer for every reader; the research's §3.3 verdict |
| Which compute class a group may use | **the `SqlWarehouse` CRD** | Trino's resource-group scheduler | The catalog has no vocabulary for compute; the CRD is the only declarative home |
| Row filters and column masks | **the engine's policy plane** (OPA rego, keyed on the same identity) | Trino only in v1 | Lakekeeper "has no vocabulary" for predicates; this is the research's Conflict 1 and its consequence stands: **a read that does not pass through a policy-aware engine is outside row/column policy** |
| Which bytes are readable | storage (SeaweedFS identities, one per catalog) | SeaweedFS | Machine-to-machine; users never hold keys |

### 5.6 Enforcement matrix

Authoritative layer is named once per check; where an engine evaluates a catalog decision, the engine is the *enforcement point* and the catalog is the *authority* (research §3.3).

| Check | Object × verb | Authority (policy lives here) | Enforced by | Phase |
|---|---|---|---|---|
| Is there a valid identity? | — | IdP (Keycloak realm, audience, group claim) | every component validates its own token | P0 ✅ |
| May this subject use this SQL warehouse? | `sqlwarehouse` × `use` | `SqlWarehouse.spec.grants` | Trino resource-group selector (`userGroup`/`user`) | P2b |
| May this subject address this catalog? | `catalog` × `browse` | the catalog (warehouse `describe`) | Trino: file rules (P2a) → OPA bridge (P3) | P2a → P3 |
| May this subject see that this object exists? | `catalog`/`schema`/`table` × `browse` | the catalog (table/namespace `describe`) | Trino (via the bridge's `get_metadata`); Nova for display | P3 |
| May this subject read rows? | `table`/`view` × `select` | the catalog (`select`) | Trino (bridge `read_data`) | P3 |
| May this subject write rows or alter the table? | `table`/`view` × `write` | the catalog (`modify`) | Trino (bridge `write_data`/`commit`) | P3 |
| May this subject create inside this container? | `catalog`/`schema` × `create` | the catalog (`create`) | Trino (bridge `create_table`/`create_namespace`) | P3 |
| May this subject drop, rename, grant? | any × `manage` | the catalog (`ownership`/`manage_grants`), else the CRD's declared owner | the catalog; Trino denies SQL `GRANT`/`REVOKE` by default | P3 |
| Which rows and columns may be seen? | `table` — no verb | the engine's policy plane (rego) | Trino OPA (row filters, column masks) | P3 |
| May this subject fetch the bytes? | storage | SeaweedFS identities, one per catalog | SeaweedFS (never a user-facing check) | P2a |
| What does Nova show? | — | **non-authoritative** — Nova asks the catalog | Nova | P2a → P3 |

### 5.7 How the engine learns a subject's groups — answered: it does not

This was the research's single biggest unknown ("the three documented-shaped options… nothing in the public docs settles which works at our pinned versions"). The pinned source settles it, and it is none of the three:

**The OPA bridge maps the Trino principal straight onto a Lakekeeper user, and the catalog resolves the rest.**

```rego
# lakekeeper v0.12.2, authz/opa-bridge/policies/trino/user.rego
trino_user_id := input.context.identity.user
lakekeeper_user_id := concat("", ["oidc~", trino_user_id])
```

Trino passes `context.identity.user` (its principal) to OPA; the bridge prefixes `oidc~` — exactly the form Lakekeeper uses for OIDC users (`oidc~<oid|sub>`) — and asks Lakekeeper's permission-check API for that user. **Groups never reach Trino**: role membership lives in the catalog, where the grants are. This is the clean version of the research's §3.3 rule, and it makes the catalog authoritative without the engine keeping a copy.

Three consequences, all of which are work:

1. **`principal-field` must become the OIDC subject.** `helm-values/trino-identity.yaml` currently sets `http-server.authentication.oauth2.principal-field=preferred_username`. The bridge would then look up `oidc~alice@example.com`, which is not a Lakekeeper user, and deny everything. Set `principal-field=sub` for Keycloak (`oid` for Entra, whose `sub` is pairwise per application — identity-integrations already documents that trap), and accept that query history shows an opaque id: that trade is made deliberately, and Nova renders the display name from its own session.
2. **Group membership must still be materialised into the catalog**, because with the OpenFGA authorizer "roles are stored directly in OpenFGA" — Lakekeeper's token/LDAP role providers serve the Cedar authorizer, which the [license policy](../architecture/licenses) excludes ("Lakekeeper Plus"). So the operator maintains, per declared group, a Lakekeeper **role** of the same name plus its membership, read from Keycloak's admin API. The CRD's group names remain the only thing an author writes; the role plumbing is the operator's job, once, in the P3 slice. (If a later Lakekeeper version brings provider-managed roles to OpenFGA, this sync becomes unnecessary — a named follow-up, not an assumption.)
3. **The bridge runs as a privileged reader.** It authenticates to Lakekeeper with a client-credentials technical user that has to hold `project_admin`, because it checks *other* principals' permissions. The bridge's own documentation states the consequence: this is the "compute enforces permissions" model, which "requires the engine to run in a trusted environment, as whoever has root access to the engine also has access to the god-like credential". Trino already has that trust property — it reads the data — so the honest statement is: **Trino is inside the data trust boundary; controlling Trino's pod is equivalent to controlling every catalog grant.** Give the bridge its own client separate from Trino's catalog client (the bridge's own recommendation) so the two credentials can be rotated and revoked apart.

### 5.8 Known gaps in the model

1. **Row/column policy binds only at Trino.** Any path that does not pass through Trino — a notebook talking Iceberg REST directly, a Spark job — is outside it. v1 position: a table carrying a filter or a mask is **Trino-only for reads**, documented where the mask is declared, and Nova warns when the two facts coexist. Databricks resolves the same problem by refusing REST access to such tables; copying that needs a policy-aware catalog, which we do not have.
2. **No deny**, so a wide grant is narrowed by reorganising the catalog (catalogs are cheap now, which is the point of §[2](#2-data-many-catalogs)).
3. **No column grants**, only masks.
4. **Tables are not CRD-managed** — users create them through engines, so a policy that targets a table names it (`finance.orders`) rather than referencing it, and a rename breaks the link. Any such declaration must report a `TargetNotFound` condition rather than silently doing nothing.
5. **Compute grants are scheduler placement, not admission.** §[3.4](#34-how-a-user-picks-one-and-why-the-pick-cannot-be-spoofed) shows the pick cannot be spoofed, but a `SqlWarehouse` does not refuse a query — it queues it in the right class.

---

## 6. Tenancy and blast radius

| Boundary | Mechanism | Phase | What it does not do |
|---|---|---|---|
| **Data domain** | `Catalog` = a warehouse with its own storage, owner and grants | P2a | Does not isolate metadata *services*; all catalogs share one Lakekeeper |
| **Storage** | one bucket + one S3 identity per catalog (§[2.4](#24-storage-isolation-is-the-real-limit)) | P2a | Prefix isolation alone isolates nothing |
| **Compute class** | `SqlWarehouse` → resource group | P2b | Fairness, not a memory wall (§[3.2](#32-option-a--resource-groups-in-the-one-trino-chosen)) |
| **Tenant** (D8, register row 24) | `Tenant` → namespace + NetworkPolicy + quota ceilings, "primitives only" (P2) | P2 | The *data plane* stays shared: one Trino, one Lakekeeper, one SeaweedFS |
| **Trust domain** (P4) | a second `Lakehouse` in its own namespace | P4 | Not scoped by this design |

Decisions inside that table:

- **Per-warehouse namespace, or logical only?** Logical for catalogs and compute classes in P2/P3; the namespace boundary belongs to `Tenant` (register row 24, P2) and the operator already creates namespaces for it. Running one Trino per namespace is option B, deferred to P4 with the arithmetic in §[3.3](#33-option-b--n-trino-clusters-deferred-p4--and-d8-already-names-it-as-the-alternate).
- **Quotas:** aggregate CPU/memory ceilings on the `Tenant` namespace, and resource-group ceilings inside Trino. Two different tools for two different escapes (a runaway pod vs a runaway query).
- **NetworkPolicy:** the `Tenant` namespace is the enforcement surface; the shared data-plane services (Trino, Lakekeeper, SeaweedFS) stay reachable from the namespaces that are allowed to use them, which is the only meaningful policy available while the data plane is shared. Say so in the `Tenant` documentation instead of implying per-tenant network isolation that does not exist.
- **Per-catalog credentials:** yes (§[2.4](#24-storage-isolation-is-the-real-limit)) — one SeaweedFS identity per catalog, `Admin:<bucket>`-style scoped actions, delivered as a Secret per catalog; **not** STS (§[2.4](#24-storage-isolation-is-the-real-limit)).

**The blast radius in one sentence**, because it is what a security reviewer will ask: *catalog grants are enforced at Trino and stored in the catalog; the shared data plane means a compromised Trino pod or the bridge's technical credential is a whole-platform event; per-catalog storage credentials mean a compromised storage credential is a one-domain event.*

---

## 7. Migration

### 7.1 What happens to what exists

| Object | Fate |
|---|---|
| `warehouse.demo.trips` | **untouched.** Trino catalog name `warehouse` and Lakekeeper warehouse name `warehouse` both stay, so the SQL name does not change and no data moves |
| `warehouse.analytics.*` | **untouched**, same reason |
| Nova's `NOVA_WAREHOUSE_NAME` | stays, becomes the default catalog of a multi-catalog list |
| The one SeaweedFS bucket `lakehouse` | stays; a new catalog defaults to its own bucket in production (`full`) and to a prefix in `demo` |
| `stardelt-s3-creds` | stays; becomes the `Lakehouse` storage credential and the `Catalog/warehouse` credential |
| `make install` | unchanged in behaviour. No new required argument, no new mandatory CRD; on an existing cluster it still converges (§[4.5](#45-migration-of-the-existing-objects)) |

### 7.2 Phases

Each phase is independently demoable, and each is a slice of a roadmap phase, not a new one.

**P2a — Catalog domains** *(Nova + operator + values; no new pods)*

*Demo:* two users sign in; the finance user sees `finance.orders` and cannot see `product.*` at all; the product user sees the reverse; `warehouse.demo.trips` still opens for both.

- Ships: `Catalog` CRD, warehouse creation (bucket or prefix + credential), the Trino `catalogs` map, the file access control's catalog rules generated from `Catalog.spec.grants`, the group file (§[3.5](#35-trino-has-no-groups-from-the-token--the-honest-cost)), Nova's catalog switcher and per-catalog listing, adoption of the existing `warehouse`.
- **Catalogs are rendered statically, not dynamically.** Trino's dynamic catalog management (`catalog.management=dynamic`, which persists catalogs into a writable catalog directory) cannot be used on our chart: that directory is a read-only ConfigMap mount, so dynamic catalogs would have to be re-created on every coordinator start anyway. Render the catalog properties as static `catalogs:` entries, and accept the consequence: **adding or removing a catalog rolls the Trino coordinator** — a few seconds of query downtime, in the same window as the S3 gateway restart that new storage credentials may need. Say that in the operator's `Catalog` documentation instead of discovering it in production.
- **Enforcement is Trino-only, and that is sufficient *at this phase*** for one reason: Trino (directly, or through Nova, which proxies it) is the only path a user has to the data today. The moment a second user-facing path exists — Spark Connect with per-user identity, PyIceberg in a notebook — the authority must be the catalog, which is P3. That trigger, not a date, is what promotes P3.
- Cost on the dev node: **zero new pods.** One ConfigMap and one Secret per catalog; ~7 SeaweedFS volume slots per new bucket (the ~14-bucket ceiling in §[2.4](#24-storage-isolation-is-the-real-limit)); Trino and Lakekeeper memory unchanged. The limiter is bucket slots, not RAM — and the node has very little RAM to spare, so "no new pods" is the whole reason this phase is P2 and not P4.

**P2b — SQL warehouse size classes** *(operator + values; no new pods)*

*Demo:* the analytics user's query runs in `big` (query header says so, and `system.runtime.queries` shows it), the demo user's goes to `default`; three concurrent `big` queries with `running: 2` queue rather than run.

- Ships: `SqlWarehouse` CRD, `resource-groups.json` rendering into the Trino coordinator, Nova's class picker (which sends `X-Trino-Client-Tags`), the group file already built in P2a, and `SqlWarehouse/default` for the existing cluster.
- Cost on the dev node: **zero new pods**, ~2 KiB of JSON. The classes partition the existing two 2 Gi heaps — they do not add memory, so a `big` class on a dev node means "1 running query", which is the truth and should be documented as such.
- This is where D8's chosen mechanism ships. Its *remaining* scope (per-`Tenant` ceilings, namespace quotas) stays P3.

**P3 — The catalog as the authority** *(Lakekeeper OpenFGA + OPA bridge + Trino OPA)*

*Demo:* `SHOW TABLES` in `finance` lists exactly the tables a user may browse; a table the user may not select fails with a permission error; a masked column returns the mask; the Lakekeeper UI shows the same grant the CRD declares; querying through a second path (Spark) is shown to be **outside** the mask, on purpose.

- Ships: `authz.backend: openfga` + `internalOpenFGA` (the bridge requires **OpenFGA ≥ 1.11**; we would pin 1.14, its tested version), the chart's `OPABridge`, `OPABridge.catalogs` generated from the `Catalog` objects, `access-control.name=opa` at Trino, `principal-field` → `sub`, the group→role sync (§[5.7](#57-how-the-engine-learns-a-subjects-groups--answered-it-does-not)), `browse`/`select`/`write`/`create`/`manage` as real per-object checks, and row/column policy as rego in the engine's policy plane — shipped through the chart's `OPABridge.customPolicies` map rather than a hand-patched deployment, so it survives an upgrade.
- **Migration step to plan for:** the pinned chart warns "authorization must not change after bootstrapping", so enabling OpenFGA on an existing Lakekeeper is a re-bootstrap (`lakekeeper reopen-bootstrap`), not a values flip. Catalog data is untouched; grants and role assignments are seeded by the operator from the CRDs, which is exactly what makes the re-bootstrap cheap.
- **The switch seeds today's behaviour, then narrows deliberately.** The first authorized state must reproduce what the platform does now, or the switch is an outage: `stardelt-users` gets `browse` + `select` on the legacy `warehouse` catalog at the moment of the switch, so `warehouse.demo.trips` keeps working for the same people who can read it today. Narrowing that grant is a **separate, announced change** with a written reason — never a side effect of turning authorization on. (New catalogs get no default grant at all, §[9](#9-answers-to-the-researchs-open-questions).)
- Cost on the dev node: **+1 OPA pod** and **+OpenFGA**. The Lakekeeper chart's `internalOpenFGA: true` brings its own Postgres subchart, which is the wrong shape for a single-node cluster that already runs CloudNative-PG: point OpenFGA at the existing cluster (a second database) instead. **Budget 150–250 MiB for OpenFGA + the bridge combined — an estimate from the components' defaults, not a measurement**; it comes out of the ~1.5 GiB the node has spare, so it fits, but it leaves nothing comfortable. On a 16 GB node the same phase is unremarkable; on the `SLIM=1` shape it does not fit next to Trino's two heaps at all.
- Trino's own memory does not change: OPA is consulted per check, not per row.

**P4 — Hard isolation and hardening** *(roadmap; out of scope here)*

- N Trino clusters per `Tenant`/`Lakehouse` (D8's alternate) for workloads that must not share a JVM.
- SeaweedFS ≥ 4.40 → STS/`AssumeRoleWithWebIdentity` → Lakekeeper vended credentials → per-query, short-lived storage credentials replacing one static identity per catalog.
- Policy-aware non-Trino engines, or a documented refusal for policy-bearing tables on those paths.
- Tag-driven ABAC (D10), which is where mask authoring becomes a self-service feature rather than a shipped policy library.

### 7.3 Spikes to file before the P2b/P3 tickets

Three things this design depends on were not verifiable from documentation, and each belongs in its own small ticket rather than inside a feature ticket. Each is written so that a negative result changes one decision, not the design.

| Spike | Question it answers | If the answer is no |
|---|---|---|
| **Principal and role mapping** | Does the pinned bridge resolve a Trino principal to the intended Lakekeeper user (`oidc~<sub>`), and can Lakekeeper's management API assign a role to a user by subject so the operator's Keycloak→role sync is possible at all? | P3's per-object grants are blocked; the fallback is to keep the P2 file rules as the enforcement point and revisit at the next Lakekeeper release |
| **SeaweedFS bucket-scoped identities** | Does a static identity with actions scoped to one bucket (`Read:finance`) actually restrict that credential to that bucket on 4.25 — and does adding an identity take effect without a gateway restart? | Per-catalog credentials become one identity per catalog with full actions, i.e. isolation moves entirely into the catalog layer and §[2.4](#24-storage-isolation-is-the-real-limit)'s credential column is struck |
| **Resource-group selectors** | Do `userGroup` and `authenticatedUser` selectors match as documented on Trino 480 **with an OAuth2 principal and a file group provider**, and does `clientTags` select within an identity-constrained set (not instead of it)? | Compute grants fall back to per-user `user` selectors, or to D8's dedicated-cluster alternate, and §[3.4](#34-how-a-user-picks-one-and-why-the-pick-cannot-be-spoofed)'s tag mechanism is dropped |

The first two are prerequisites for P3, the third for P2b. Filing them separately is what lets the P2a/P2b/P3 tickets be written with real file and symbol names instead of "spike first".

---

## 8. Consequences

**Gained.** Data domains with their own storage, owner and permissions. Compute classes with grants and honest queueing. A permission vocabulary a Unity/Dremio user recognises, enforced at the catalog so every reader gets the same answer. Per-catalog storage credentials, so a leak is bounded. Nova able to show what you may do without re-implementing the rule. No new service in P2, and no fork anywhere.

**Paid.** One piece of glue the architecture would rather not need: the operator's Keycloak→Trino group file (§[3.5](#35-trino-has-no-groups-from-the-token--the-honest-cost)), because Trino cannot read groups from a token. A second piece in P3: the Keycloak→Lakekeeper role sync (§[5.7](#57-how-the-engine-learns-a-subjects-groups--answered-it-does-not)), because the authorizer that consumes token roles is the proprietary one. A deliberate swap of enforcement points between P2a and P3 (file rules in, OPA in), which must not overlap: two authorities for the same check is the bug this design exists to avoid. The bridge's `project_admin` credential makes Trino a high-value target — already true, now documented. And row/column policy is a Trino property, not a platform property, until a second engine is policy-aware.

**Unchanged.** One REST catalog service, one Iceberg protocol, one identity, one audit trail, one Trino on a dev node. `make install` on a fresh cluster and on an existing one.

---

## 9. Answers to the research's open questions

| # | Question ([permissions-research §7](../architecture/permissions-research)) | Answer |
|---|---|---|
| 1 | How does the engine learn a subject's groups? | **It does not.** The bridge maps `input.context.identity.user` → `oidc~<user>` and the catalog resolves roles. Requirement: Trino's `principal-field` becomes `sub`/`oid`. §[5.7](#57-how-the-engine-learns-a-subjects-groups--answered-it-does-not) |
| 2 | Does Lakekeeper have a browse privilege distinct from `select`? | **Yes** — `describe`, at warehouse/namespace/table/view, implicitly included with `select`/`create`/`modify` but grantable alone (0.12.x OpenFGA model). It is *not* distinct from addressing the catalog, which is why `use` moved to compute. §[5.2](#52-verbs) |
| 3 | Row/column policy versus direct REST readers | **Deferred as a v1 limitation, with the trigger named.** Direct readers are outside policy; a policy-bearing table is Trino-only for reads in v1, stated where the policy is declared. Revisit at P4. §[5.8](#58-known-gaps-in-the-model) |
| 4 | Compute grants: catalog grant, resource group, or Nova? | **Trino resource group**, selected on identity (`userGroup`/`user`); Nova and ingress are presentation only. §[3.4](#34-how-a-user-picks-one-and-why-the-pick-cannot-be-spoofed) |
| 5 | Ownership of pipeline-created objects | **The schema's owner owns what a pipeline writes into it.** Machine subjects get no owner concept: an Airflow task writing into a schema produces tables that carry the schema's owning group. §[5.3](#53-inheritance-ownership-no-deny) |
| 6 | What happens to `stardelt-users`? | **No grant on any new catalog, and the legacy catalog keeps its current audience until that is changed on purpose.** It is the realm default group, so granting it would make "everyone" a principal of every catalog — the opposite of a domain. At the P3 switch the legacy `warehouse` catalog is seeded `browse`+`select` for `stardelt-users` to reproduce today's behaviour exactly (§[7.2](#72-phases)); narrowing that afterwards is its own announced change, not a side effect of enabling authorization |

### 9.1 The ticket's own open questions

| Question ([#64](https://github.com/stardelt/stardelt-docs/issues/64)) | Answer |
|---|---|
| Per-team compute isolation at P2 or P3? | **Split.** The *names and grants* (D8's mechanism, resource groups) ship in P2b because they cost zero pods and the demo needs them; hard isolation stays P4. D8's remaining scope (per-`Tenant` ceilings) stays P3. §[7.2](#72-phases) |
| SeaweedFS STS, or one S3 user per catalog? | **One S3 user per catalog** at 4.25 (CVE-2026-77298 is fixed only in ≥ 4.40); STS revisited after that upgrade. §[2.4](#24-storage-isolation-is-the-real-limit) |
| Does a warehouse grant need Trino support beyond `system` access control? | **Yes: resource-group selectors.** Trino's OPA context carries identity and groups only (`user`, `groups`, `queryId`, `softwareStack`) and no client tags, so the grant cannot be an OPA check; the scheduler is where it belongs. §[3.4](#34-how-a-user-picks-one-and-why-the-pick-cannot-be-spoofed) |
| Should a sandbox catalog be built in? | **Not as a per-user object — the grant model has no per-user subjects.** The cheap expressible answer is the platform-provided `sandbox` catalog with one schema per group, owned by the group, with `create`; no new mechanism. §[12](#12-what-remains-undecided) |

---

## 10. Proposed spec amendments

The [master spec](./master-spec) changes only through a pull request and a discussion period; these are proposals in its decision-record style. They would be recorded as D17–D20 alongside D1–D16.

**A1 — §6, "one REST catalog" (wording).** *Current:* "Iceberg tables on object storage behind one REST catalog. Every engine above speaks to it; every policy attaches to it." *Proposed:* "…behind **one REST catalog service**, which serves many **catalogs** (Iceberg REST warehouses: finance, product, sandbox) — one per data domain, each with its own storage, owner and grants. Every engine above speaks to that service; every policy attaches to it." *Rationale:* the sentence's intent — one protocol, one place where policy attaches, no side-channels — is preserved exactly; its literal reading (one catalog for the whole platform) is what the ticket removes. This design is impossible under the literal reading.

**A2 — §5 plug matrix, query serving (row 4).** *Current:* contract "—", default "**Trino** (+ DuckDB embedded)", alternate "Spark SQL". *Proposed:* contract becomes `Lakehouse` **+ `SqlWarehouse`** (the plug point for the query-serving domain: one named compute class, its size, its grants), default unchanged. *Rationale:* "no new domain without a contract" cuts the other way too — a product feature that grants and sizes compute ("may this group use the big one?") needs a CRD to live in, or it lives in Nova, and Nova must not be state. A2 also gives D8's resource groups a declarative home.

**A3 — D8 refinement (per-tenant compute isolation).** *Current:* "Adopt Trino resource groups … Do not run one Trino cluster per tenant in v1. … Contract touched: `Tenant` (resource-group policy), `Lakehouse` (engine)." *Proposed addition:* "`Tenant` carries the **ceiling** (namespace, NetworkPolicy, aggregate quota, the resource-group ceiling a child may not exceed); **`SqlWarehouse` carries the class** (name, size, concurrency, scheduling, grants). One resource group per (tenant, class); the tenant caps the class, the class is what a user picks and holds `use` on. Status moves P2b for the class mechanism, P3 for ceilings." *Rationale:* a quota and an offering are different objects with different owners — a platform admin sets a ceiling, a domain team is granted a class — and one field cannot be both. The `Tenant` CRD keeps the boundary role row 24 already gives it at P2.

**A4 — §7, the moat (wording).** *Current:* "Row/column-level security applies at Lakekeeper/OPA — the same rules for the dashboard, the pipeline, and the data scientist's notebook." *Proposed:* "**Object grants** are enforced at the catalog and evaluated by every engine; **row/column predicates** are evaluated by policy-aware engines (Trino in v1) against the same identity. One identity everywhere; one grant store; predicates where the engine can see the query." *Rationale:* [permission model research](../architecture/permissions-research) §3.4 established that the catalog has no vocabulary for predicates, and no Iceberg REST catalog can carry them (Databricks documents the same limit for its own REST surfaces). Leaving the sentence unqualified would claim a property the architecture does not have, in the section that is the product's pitch.

---

## 11. Sources and what was read when

Upstream pages and source read **2026-10-18**, at the versions stardelt pins.

- **Trino 480** (chart 1.42.2): [OPA access control](https://trino.io/docs/480/security/opa-access-control.html) (context carries `identity.user`, `identity.groups`, `queryId`, `softwareStack`; row filters, column masks, batched checks); [file-based access control](https://trino.io/docs/480/security/file-system-access-control.html) (`security.config-file`, `security.refresh-period`, catalog rules with `user`/`role`/`group`/`catalog` and `allow: all|read-only|none`, table `privileges`, column `mask`, `filter`); [group mapping](https://trino.io/docs/480/security/group-mapping.html) (`group-provider.name=file`, `file.group-file`, `file.refresh-period`); [resource groups](https://trino.io/docs/480/admin/resource-groups.html) (`maxQueued`, `hardConcurrencyLimit`, `softMemoryLimit`, `schedulingPolicy`, selectors incl. `user`, `userGroup`, `authenticatedUser`, `clientTags`, "first one that matches"); [CLI](https://trino.io/docs/480/client/cli.html) (`--client-tags`).
- **Lakekeeper 0.12.2** (chart 0.11.0): [authorization](https://docs.lakekeeper.io/docs/0.12.x/authorization/) and [OpenFGA](https://docs.lakekeeper.io/docs/0.12.x/authorization-openfga/) (grant vocabulary per entity — `ownership`, `pass_grants`, `manage_grants`, `describe`, `select`, `create`, `modify`; top-down and bottom-up inheritance; managed access; "roles are stored directly in OpenFGA"; **minimum OpenFGA v1.11**, tested against 1.14); [OPA bridge](https://docs.lakekeeper.io/docs/0.12.x/opa/) (catalog↔warehouse mapping, batching, admin users, trusted engines, the two enforcement models); [authorization with Cedar](https://docs.lakekeeper.io/docs/0.12.x/authorization-cedar/) (token roles — *Lakekeeper Plus*, excluded by the [license policy](../architecture/licenses)); source: `authz/opa-bridge/policies/trino/user.rego`, `policies/trino/{allow_catalog,allow_schema,allow_table,allow_view,main,check}.rego`, `policies/lakekeeper/identifiers.rego` at tag `v0.12.2`.
- **Lakekeeper chart 0.11.0** (`helm show values`): `authz.backend` (allowall | openfga | cedar, "must not change after bootstrapping"), `internalOpenFGA` + its bundled Postgres subchart, `OPABridge.*` (OPA sidecar/deployment, `catalogs: [{trinoCatalog, lakekeeperWarehouse}]`, `adminUsers`, `allowUnmanagedCatalogs`, `maxBatchCheckSize`, `customPolicies`).
- **SeaweedFS 4.25** (chart 4.25.1): `weed/s3api/auth_credentials.go` (static `identities`, `Actions`), `weed/s3api/s3_constants/s3_config.go` (`Separator = ":"`, i.e. per-bucket actions), `weed/s3api/auth_credentials_subscribe.go` (live IAM reload from the filer's `/etc/iam`), `docker/compose/s3.json` (the config shape), chart `s3.existingConfigSecret` / `seaweedfs_s3_config`. STS/OIDC status and CVE-2026-77298: [identity integrations](../architecture/identity-integrations).
- **Trino chart 1.42.2** (`helm show values`): `accessControl` (configmap with `refreshPeriod`, or `properties`), `catalogs`, `coordinator.additionalConfigFiles` / `configMounts`.
- **stardelt**: [master spec](./master-spec) §5–§9; [gap decisions](./gap-decisions) D8 and register rows 1 (P3) and 24 (P2); [execution plan](./execution-plan) WP-12/18/21/23/30+; [permission model research](../architecture/permissions-research) §3–§7; [identity](../architecture/identity) and [identity integrations](../architecture/identity-integrations); `stardelt-platform` at `origin/main`: `Makefile` (pins), `helm-values/trino.yaml`, `helm-values/trino-identity.yaml`, `helm-values/slim/trino.yaml`, `helm-values/lakekeeper.yaml`, `helm-values/seaweedfs.yaml`, `manifests/lakekeeper-bootstrap.yaml`, `manifests/s3-credentials.example.yaml`; `stardelt-nova` `backend/src/catalog.rs` (`NOVA_WAREHOUSE_NAME`, warehouse-id resolution); `stardelt-operator` `crates/stardelt-operator/src/crd.rs` (`LakehouseSpec`). Memory figures for the dev node are measurements taken on the live cluster on 2026-10-18, not estimates; the OpenFGA/OPA figure in §[7.2](#72-phases) is marked as an estimate because it is one.

---

## 12. What remains undecided

Deferred deliberately, each with the reason and the trigger:

1. **Whether the sandbox catalog is a platform default.** The grant model has no per-user subject, and adding one to hand every user a namespace would break the group-only rule that makes ownership and audit simple. Interim answer in §[9.1](#91-the-tickets-own-open-questions) (one `sandbox` catalog, a schema per group). A maintainer decision, not a design gap.
2. **Where the resource-group *#ceiling* lives** (on `Tenant` as [A3](#10-proposed-spec-amendments) proposes, or on the `Lakehouse` as D8 currently words it). The design works either way; the amendment needs a yes or no.
3. **Whether the file access control survives into P3** as a boundary control alongside OPA, or is retired. Both work; keeping it means two layers to reason about, retiring it means OPA answers catalog-level access too (which the bridge already does).
4. **The exact shape of the row/column-policy CRD** (research §3.4 requires the *location* to be decided, which §[5.5](#55-where-each-kind-of-policy-lives) does; the object that declares a mask is an implementation-ticket question).
5. **How existing users are onboarded to a domain group** after the P2a migration. The *mechanics* are decided (no default grant for `stardelt-users`; the legacy catalog is seeded to today's behaviour at the P3 switch), the *flow* is not — requesting access to `finance` belongs to D12 (access requests), and until it exists the answer is "a platform admin adds you to the group".
6. **Whether a `Catalog` may point at an external Iceberg REST catalog** (a BYO-catalog path). The contract has room (`spec.endpoint`); nothing in P2/P3 needs it and it widens the trust boundary, so it is not designed here.
7. **`SqlWarehouse` classes on a second engine** (Spark SQL): the contract is deliberately engine-neutral (`spec.engineRef`); the adapter is P4 work following D8's alternate.
