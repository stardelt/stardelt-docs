---
title: "Permission models: Unity Catalog and Dremio"
sidebar_label: "Permission model research"
slug: /architecture/permissions-research
---

# Permission models: Unity Catalog and Dremio, mapped onto stardelt

**What this page is.** A reading of two shipped privilege systems — Databricks Unity Catalog and Dremio — as their public documentation describes them, plus a mapping of their vocabulary onto the enforcement points stardelt actually has. It is the input to the multitenancy design ([stardelt-docs#64](https://github.com/stardelt/stardelt-docs/issues/64)), which decides how many catalogs and warehouses exist and where grants attach. This page does not decide that; it makes sure the design chooses verbs and inheritance deliberately instead of inventing them.

**What this page is not.** Not a feature comparison, and not a proposal to adopt either component: [licenses](./licenses) admit permissive components only, and Unity Catalog and Dremio are not candidates. Their *vocabulary* is the interesting part, because it is what a migrating user already knows. Nothing here changes the [master spec](../design/master-spec), which stays the authority where this page and the spec disagree.

**How to read it.** Parts 1 and 2 are vendor documentation summaries, every claim linked with the date read. Part 3 is the mapping, and names **one authoritative layer per check**. Part 4 is a proposed minimal v1 grant model and its gaps. Part 5 is the list of things stardelt will not build. Part 6 is the citations; part 7 is what documentation could not settle.

Read alongside: [identity](./identity) (subjects are Keycloak groups), [identity integrations](./identity-integrations) (per-block mechanics, pinned versions, what is *unverified*), [master spec](../design/master-spec) §5–§7, [gap decisions](../design/gap-decisions) (D8–D16), and [roadmap](../roadmap).

---

## 1. Databricks Unity Catalog

Read at `docs.databricks.com` (AWS flavour) on **2026-10-18**. The page-own "last updated" dates are listed in [§6](#6-sources-and-dates-read).

### 1.1 Object hierarchy

A **metastore** is the top-level securable object, in one cloud region. Inside it, data and AI assets live in a three-level namespace, `catalog.schema.object`, and every object on which a privilege can be granted to a principal (user, service principal, or group) is a **securable object**
([What is Unity Catalog?](https://docs.databricks.com/aws/en/data-governance/unity-catalog/), [Securable objects reference](https://docs.databricks.com/aws/en/data-governance/unity-catalog/securable-objects)).

| Layer | Objects |
|---|---|
| Metastore | storage credentials, external locations, external metadata, service credentials, connections, shares, providers, recipients, clean rooms |
| Catalog (container) | schemas; catalogs are also the unit of **workspace binding** |
| Schema (container) | tables, views (incl. materialized and metric views), volumes, functions (incl. registered models), services, secrets, features |
| Object | the three-level namespace ends here; tables can be **managed** (catalog owns the storage lifecycle) or **external** (catalog governs metadata only) |

Two properties of the hierarchy matter downstream: catalogs and schemas are *container objects* that carry creation privileges (`CREATE SCHEMA`, `CREATE TABLE`, …), and a **workspace binding** on a catalog "supersedes individual privilege grants" — an explicit `SELECT` does not help if the catalog is not bound to your workspace.

### 1.2 Privileges

The [privileges reference](https://docs.databricks.com/aws/en/data-governance/unity-catalog/access-control/privileges-reference) is the full list; the ones that shape our vocabulary:

| Group | Privileges |
|---|---|
| Usage | `USE CATALOG`, `USE SCHEMA` — prerequisites for interacting with anything below them |
| Discovery | `BROWSE` — "see that an object exists", plus name, description, tags, and *request access*; granted at catalog level for data objects, and it does not require `USE CATALOG`/`USE SCHEMA` |
| Read | `SELECT`, `READ VOLUME`, `READ FILES`, `READ FEATURE`, `READ METADATA`, `EXECUTE` (functions and models) |
| Write | `MODIFY` (composite; children `INSERT`, `UPDATE`, `DELETE`, all Beta), `WRITE VOLUME`, `WRITE FILES`, `REFRESH` (materialized views), `CREATE MODEL VERSION` |
| Create | `CREATE CATALOG`, `CREATE SCHEMA`, `CREATE TABLE`, `CREATE VIEW` (via `CREATE TABLE`), `CREATE FUNCTION`, `CREATE MODEL`, `CREATE VOLUME`, `CREATE MATERIALIZED VIEW`, `CREATE SECRET`, `CREATE SERVICE`, `CREATE FEATURE`, plus the metastore-scoped `CREATE STORAGE CREDENTIAL`, `CREATE EXTERNAL LOCATION`, `CREATE CONNECTION`, `CREATE SHARE`, `CREATE PROVIDER`, `CREATE RECIPIENT`, `CREATE CLEAN ROOM` |
| Manage | `MANAGE`, `MANAGE ACCESS CONTROL`, `APPLY TAG`, `ASSIGN` (on governed tags), `MODIFY` on external metadata, `MODIFY CLEAN ROOM`, `EXECUTE CLEAN ROOM TASK`, `ACCESS`, `USE CONNECTION`, `USE PROVIDER`, `EXTERNAL USE LOCATION`, `EXTERNAL USE SCHEMA` |
| Aggregate | `ALL PRIVILEGES` |

Consequences the docs state explicitly, and that are worth stealing or rejecting on purpose:

- **`ALL PRIVILEGES` is evaluated at check time.** "As Databricks releases new privileges and securable objects, an existing `ALL PRIVILEGES` grant automatically includes any new privileges applicable to the securable object, and all new and existing child objects." It excludes `EXTERNAL USE SCHEMA`, `EXTERNAL USE LOCATION`, `MANAGE`, and `READ METADATA` on purpose — "to prevent accidental data exfiltration or privilege escalation".
- **Usage privileges are a boundary control.** Having `SELECT` is not enough; you also need `USE CATALOG` and `USE SCHEMA`, and only catalog/schema owners or `MANAGE` holders can grant those. In the docs' words: "this prevents table owners from granting access outside approved boundaries."
- **`MANAGE` is not ownership and not access.** It grants privilege management, ownership transfer and drop; it does *not* imply `SELECT`. To exercise it you need usage privileges only on the containers *above* the object.
- **`BROWSE` decouples discovery from access.** Databricks recommends granting it on catalogs to the `All account users` group so that data is findable and access can be requested.

### 1.3 Inheritance, ownership, subjects

- **Privileges inherit downward**: a grant on a catalog applies to all current and future schemas and their contents; a grant on a schema applies to all its current and future objects. Metastore-level grants do **not** inherit, except `READ METADATA`. ([Permissions concepts](https://docs.databricks.com/aws/en/data-governance/unity-catalog/access-control/permissions-concepts))
- **Ownership does not inherit, but reaches down for management.** "if you own a catalog, you don't automatically own the child schemas within the catalog, but you can manage all child schemas" — i.e. the owner is implicitly granted `MANAGE` on children, without `ALL PRIVILEGES` being materialised in `SHOW GRANTS`. One owner per object; the creator becomes the initial owner; ownership can be transferred; owners still need explicit grants on child objects to read them.
- **Subjects** are users, service principals, and groups. Admins sit outside the model in part: a **metastore admin** can take ownership of any object, "which gives indirect access to all data in the metastore", and those capabilities "cannot be granted through standard privilege grants".

### 1.4 Deny

The often-repeated "Unity Catalog has no deny" is, as of the pages read, **true for data privileges and false for the access-management privilege**. [ABAC DENY policies](https://docs.databricks.com/aws/en/data-governance/unity-catalog/abac/deny-policies) (Beta, page updated 2026-09-17) deny exactly one privilege, `MANAGE ACCESS CONTROL`, on tag-matched objects at metastore, catalog or schema scope:

- DENY "always takes precedence … over any grant of the same privilege and cannot be overridden by an individual grant", including grants held through inheritance, group membership or ownership;
- DENY inherits downward the same way grants do; overlapping DENY policies are unioned, most restrictive wins;
- a DENY is independent of grants — it survives revocation and must be dropped explicitly;
- **metastore admins are always implicitly exempt**, so there is always a path to remove a policy;
- `SHOW GRANTS`, `GetPermissions` and `GetEffectivePermissions` do **not** reflect DENY policies — the effective view requires `SHOW EFFECTIVE POLICIES`;
- the limitation is explicit: "Only the `MANAGE ACCESS CONTROL` privilege can be denied. Other privileges, such as `SELECT` and `MODIFY`, are not supported."

So: Unity Catalog's grant model for data is additive, and the one explicit denial it has was added to bound *who may administer access*, not to narrow reads.

### 1.5 Row filters and column masks

Two mechanisms, deliberately overlapping ([row filters and column masks](https://docs.databricks.com/aws/en/data-governance/unity-catalog/filters-and-masks/), [ABAC](https://docs.databricks.com/aws/en/data-governance/unity-catalog/abac/)):

- **Table-level**: a SQL UDF attached to one table (`ALTER TABLE … SET ROW FILTER`) or one column (`ALTER TABLE … ALTER COLUMN … SET MASK`), managed by the table owner. One mask per column.
- **ABAC policies**: attach at catalog or schema level, match on **governed tags**, apply automatically to existing and future tagged tables, "so table owners can't override or remove them", and are evaluated more efficiently. ABAC is the recommended form; row filters/masks remain for per-table logic.

The restrictions are the interesting part for us:

- "You cannot apply row-level security or column masks to a view."
- "You cannot use Iceberg REST catalog or Unity REST APIs to access tables with row filters or column masks." The same page lists Delta Lake APIs, time travel, clones, and OpenSharing exclusions.
- Filtering/masking wins over optimisation: "When the query engine must choose between optimization and protecting against information leakage …, it always makes the secure choice", which is why the docs carry a performance section.
- A type mismatch between the UDF parameter and the column can silently return `NULL` (and thus all rows) unless ANSI mode is on — an error mode to remember when a policy is "always allow" by accident.

### 1.6 Storage and external access

Storage is itself governed by catalog objects: a **storage credential** (the authentication material), an **external location** (a credential plus a path), then `READ FILES`/`WRITE FILES` on the location, or `READ VOLUME`/`WRITE VOLUME` on a volume — Databricks "recommends managing cloud storage access through volumes … rather than granting `READ FILES` and `WRITE FILES` directly". The exfiltration-sensitive privileges are the ones deliberately outside `ALL PRIVILEGES`: `EXTERNAL USE LOCATION` (temporary credentials for external engines) and `EXTERNAL USE SCHEMA` (temporary credentials via the Unity or Iceberg REST APIs), with owners and schema owners denied them by default.

---

## 2. Dremio

Read at `docs.dremio.com` on **2026-10-18**. The pages cited are the current `26.x` documentation and are labelled **Enterprise** on the page itself — an edition note, not a judgement about the model.

### 2.1 Object hierarchy

"The upper-most container exists as the system user, or administrator account. All other objects are contained within **sources** or **spaces**, organized into **folders**" ([Access control](https://docs.dremio.com/current/security/rbac)):

```text
system
├── sources            (external systems: S3, Hive, databases, Open Catalog, Nessie — one of them may be a catalog)
│   └── folders → folders → tables | views
├── spaces             (Dremio-native storage; personal or shared)
│   └── folders → folders → tables | views
└── global objects: scripts, UDFs, users, roles, model providers, engines
```

An **Open Catalog** is a distinct object type with its own privilege set — it is the closest analogue to "a catalog" in a lakehouse sense, and its privileges include `USAGE`, which is the well-known gotcha: "Even if a user only requires privileges on a single table, they must also have the `USAGE` privilege on the Open Catalog that contains the table."

### 2.2 Privileges

Grant syntax is `GRANT { <objectPrivilege>[, …] | ALL } ON <object> TO <grantee>` — there is no `DENY` form ([GRANT/REVOKE](https://docs.dremio.com/current/reference/sql/commands/rbac)). Privileges are defined **per object type**, so the same word can mean different things at different levels ([Privileges](https://docs.dremio.com/current/security/rbac/privileges)):

| Object | Privileges (documented set) |
|---|---|
| System | `ALTER`, `ALTER REFLECTION`, `CALL MODEL`, `CONFIGURE SECURITY`, `CREATE MODEL PROVIDER`, `CREATE ROLE`, `CREATE SPACE`, `CREATE SOURCE`, `CREATE TABLE`, `CREATE USER`, `DELETE`, `DROP`, `EXECUTE`, `EXPORT DIAGNOSTICS`, `EXTERNAL QUERY`, `INSERT`, `MANAGE GRANTS`, `MODIFY`, `SELECT`, `TRUNCATE`, `UPDATE`, `UPLOAD FILE`, `VIEW JOB HISTORY`, `VIEW REFLECTION` |
| Source | `ALTER`, `ALTER REFLECTION`, `CREATE TABLE`, `DELETE`, `DROP`, `EXTERNAL QUERY`, `INSERT`, `MANAGE GRANTS`, `MODIFY`, `OWNERSHIP`, `READ METADATA`, `SELECT`, `TRUNCATE`, `UPDATE`, `VIEW REFLECTION` |
| Space | `ALTER`, `ALTER REFLECTION`, `DELETE`, `INSERT`, `MANAGE GRANTS`, `MODIFY`, `OWNERSHIP`, `READ METADATA`, `SELECT`, `TRUNCATE`, `UPDATE`, `VIEW REFLECTION` |
| Folder | adds `CREATE TABLE`, `DROP` |
| Table | `ALTER`, `DELETE`, `INSERT`, `MANAGE GRANTS`, `OWNERSHIP`, `READ METADATA`, `SELECT`, `TRUNCATE`, `UPDATE` |
| View | `ALTER`, `DELETE`, `INSERT`, `MANAGE GRANTS`, `OWNERSHIP`, `READ METADATA`, `SELECT`, `TRUNCATE`, `UPDATE` |
| Open Catalog | `ALTER`, `ALTER REFLECTION`, `CREATE TABLE`, `MANAGE GRANTS`, `MODIFY`, `SELECT`, `USAGE`, `WRITE`, `VIEW REFLECTION` |
| UDF | `ALTER`, `EXECUTE`, `MANAGE GRANTS`, `OWNERSHIP` |
| User / Role | `ALTER` / `OWNERSHIP` |

The two Dremio pages disagree slightly on two object types: the SQL-command reference lists a smaller set for tables (no `DELETE`/`INSERT`/`UPDATE` on tables, no `READ METADATA`/`VIEW REFLECTION` on folders) than the privileges page. I have used the fuller privileges page and flag the difference rather than resolve it.

Notes that transfer to our design discussion:

- **`EXECUTE` is a policy privilege as well as a function privilege**: it also gates querying tables that carry row-access or column-masking policies.
- **`READ METADATA`** is the Dremio equivalent of Databricks' `BROWSE`: you can see the node, name, path, column count/names/types and job counts without reading rows.
- **`ALL` is a snapshot, and the opposite of Databricks' `ALL PRIVILEGES`.** "The `ALL` privilege grants a static set of privileges that includes only the privileges that exist when you run the grant command", it excludes `OWNERSHIP`, and revoking it does not remove privileges granted directly on children.
- **Revoking is scoped to the object you name.** "If you revoke privileges for a user at a low-level object, but they hold the privilege with a higher-level object, then they still retain the privilege" — the docs tell admins to revoke at the level the grant actually lives.

### 2.3 Inheritance, scope, and the one snapshot form

"Inheritance: the objects to which privileges are granted depend on the inheritance model. … granting access to a parent object, such as a folder, also gives that user access to any existing and **future** datasets contained in that folder." Three ways to grant, with different reach:

| Form | Reach |
|---|---|
| `ON <object_type> <name>` | that object; a container grant reaches all existing and future children |
| `ON ALL DATASETS IN {SPACE\|SOURCE\|FOLDER\|SCHEMA} <name>` | all **existing** datasets only; future ones are excluded |
| `ON {SYSTEM \| <project>}` | the whole system or project scope |

`ALL DATASETS` is the trap: it is the one grant that deliberately does not cover the future, and `OWNERSHIP` is not valid for it.

### 2.4 Subjects: users, roles, external groups

([Role management](https://docs.dremio.com/current/security/rbac/roles))

- Roles are the grant principal; "Any users who are members of a role gain all of the privileges granted to the role." Roles can be nested ("the parent role … grants all its privileges to the nested role").
- Roles are **internal** (created in Dremio) or **external** — groups from an OIDC provider or LDAP, either pushed by SCIM or fetched lazily when privileges are granted to a group name. External role membership is managed in the identity provider, not in Dremio; the Members tab for a fetched external role is empty even when it has members.
- None of this implies federation: the identity provider supplies groups, Dremio supplies grants.
- `PUBLIC` is a built-in role containing all users, so `GRANT … TO ROLE PUBLIC` means "everyone".

### 2.5 Ownership

- "each object must have an owner, and may have only one owner", and "Only one user or role (not both) can hold this privilege" on a given object. Ownership is auto-granted to the creator, transferable with `GRANT OWNERSHIP`, and an object can be `$unowned` if the owner is deleted.
- By default ownership includes all privileges and the ability to grant/revoke on the object and its children — **except** under *managed access spaces*, where "Owners of folders, views, and functions in a locked space cannot grant or revoke privileges on those objects". Grant authority then belongs to the space owner, the admin, or holders of `MANAGE GRANTS`.
- **View delegation** is the widest-reaching behaviour: "The privileges of a view's owner determine whether the view can use dependent tables and views", so a granted user reads through the owner's privileges without holding any grant on the base table. Revoking the owner's access to the base table breaks the chain. This is a deliberate semantic-layer capability and a privilege-escalation surface at the same time.

### 2.6 Row-access and column-masking

([Row-access and column-masking policies](https://docs.dremio.com/current/data-products/govern/row-column-policies-udf/), [SQL reference](https://docs.dremio.com/current/reference/sql/commands/row-column-policies))

- A policy **is a UDF**: a boolean UDF for row access ("treated logically in a query as an AND operator included in a WHERE clause"), a scalar UDF of the column's type for masking; "only one column-masking policy may be applied to each column".
- Attach with `ADD ROW ACCESS POLICY fn(cols)` on `ALTER TABLE`/`ALTER VIEW` (or in `CREATE`), and `MODIFY COLUMN … SET MASKING POLICY fn(cols)`; detach with the corresponding `DROP ROW ACCESS POLICY` / `UNSET MASKING POLICY`.
- Enforcement is in the engine, at planning time: "Policies are applied prior to execution during the query planning phase", as an "implicit view" replacing the table reference.
- The docs are not internally consistent about *who* may attach one: the governance page requires the ADMIN role to create UDFs and says you "must be the owner of a UDF … in order to apply it", while also describing "the owner of a table or view may apply a policy to a column"; the SQL reference says policies "may be applied … by a user with the ADMIN role". I could not settle which is authoritative from the docs, so treat this as a gap ([§7](#7-open-questions-for-the-design)).
- Dremio supports one policy manager at a time — Dremio or Apache Ranger, not both.
- Datasets with policies have documented acceleration limits (some Reflections cannot be created or used).

---

## 3. Mapping onto stardelt

### 3.1 What exists today

Stated plainly, because the mapping has to be honest about it. Sources: `stardelt-platform` `helm-values/trino.yaml`, `helm-values/trino-identity.yaml`, `helm-values/lakekeeper.yaml`, `manifests/s3-credentials.example.yaml`, `stardelt-nova` `backend/src/auth.rs`, `backend/src/trino.rs`, `README.md`, at `origin/main` on 2026-10-18.

| Layer | Today | Authority it holds |
|---|---|---|
| Keycloak (IdP) | realm `stardelt`; groups `stardelt-admins` and `stardelt-users` (the realm default group, currently granting notebook access); group claim `groups` | **who the subject is** — the token, its audience and its groups |
| Trino 480 | `PASSWORD,OAUTH2` when `helm-values/trino-identity.yaml` is applied; bearer tokens validated locally against the realm JWKS, audience `trino`, principal `preferred_username`; Nova forwards the caller's own token when `NOVA_FORWARD_IDENTITY=1` | **nothing yet beyond authentication**: no `access-control.properties`, so Trino's `default` access control applies — "All operations are permitted, except for user impersonation and triggering Graceful shutdown" |
| Lakekeeper (Iceberg REST) | `authz.backend: allowall` | Grants can be recorded, and **nothing is enforced**: AllowAll "is meant for development and testing only — it records grants faithfully but enforces nothing" |
| SeaweedFS S3 | one static credential in Secret `stardelt-s3-creds`, used by Trino and Airflow tasks | **bytes**, but only for machine clients — users never get S3 keys |
| Nova | maps the admin group to an admin flag (`NOVA_OIDC_ADMIN_GROUP`), gates platform pages, runs SQL as the signed-in user when forwarding is on | **presentation only** — no decision is Nova's to make |

Not built, and not assumed anywhere below: table-level grants, row/column policy, OPA, per-catalog credentials, more than one catalog or warehouse. Those are the design ticket's subject ([stardelt-docs#64](https://github.com/stardelt/stardelt-docs/issues/64)).

### 3.2 The layers, and what each can and cannot see

| Layer | Can see | Cannot see |
|---|---|---|
| **IdP (Keycloak)** | the subject, its group memberships, token lifetime and audience | objects, tables, columns, rows |
| **Catalog (Lakekeeper)** | warehouses, namespaces, tables/views, the principals and roles it knows, the grants recorded on each object, commit and metadata operations | the shape of the query, which columns are projected, predicates, row counts — and it has no vocabulary for a row predicate or a mask at all |
| **Engine (Trino)** | the query: catalogs, schemas, tables, references, the column set, the operation, session properties, and the authenticated principal | the *source* of truth for grants (it must ask the catalog, not keep a copy), and nothing about objects no query touched |
| **Storage (SeaweedFS/S3)** | a principal and a bucket/prefix | tables, columns, SQL, users |
| **UI (Nova)** | what it chooses to display and what it can ask the authorities | everything the platform has not exposed to it |

### 3.3 One authoritative layer per check

| Check | Authoritative layer | Where the policy lives | Notes |
|---|---|---|---|
| Is there a valid identity for this request? | IdP (token), verified by the receiving service | Keycloak realm, client scopes, audiences | Engine and catalog both do their own token validation; neither is the authority on who the user *is* |
| May this subject address this catalog at all? | **Catalog** | catalog grant (`use`) | Nova may refuse earlier, but the catalog decides |
| May this subject see that an object exists (metadata, no rows)? | **Catalog** | catalog grant (`browse`) | Databricks `BROWSE`, Dremio `READ METADATA` |
| May this subject read this table's rows? | **Catalog** | catalog grant (`select`) | The engine evaluates the check; the grant lives in the catalog. One decision point, one store |
| May this subject write/delete rows, or change the table? | **Catalog** | catalog grant (`write`) | same split: engine enforces, catalog decides |
| May this subject create objects in this schema/catalog? | **Catalog** | container grant (`create`) | |
| May this subject grant, revoke, or transfer this object? | **Catalog** | object grant (`manage`) / CRD-declared owner | Trino's OPA plugin denies SQL `GRANT`/`REVOKE` by default — the engine must not become a second grant authority |
| Which rows and which columns may this subject see in a table it may read? | **Engine** | OPA row-filter and column-mask policies, keyed on the same identity | v1 deviation from §7; see [§3.4](#34-where-a-vendor-model-conflicts-with-the-master-spec) |
| May this subject run a query at all, set session properties, kill queries? | **Engine** | static platform policy (not an object grant) | has no catalog counterpart |
| Which bytes may be fetched? | **Storage** | S3 identities, one per machine client; users hold none | never a user-facing check |
| Which pages render, and what does Nova say *before* a failure? | **UI**, explicitly non-authoritative | Nova asks the catalog's effective-permission/action endpoints rather than re-implementing the rules | two implementations of the same rule is the bug we are avoiding |

Rule of thumb for reviews: if a check has two authorities, it has none. Where the engine must evaluate a catalog decision (it has the query, the catalog does not), the engine has an *enforcement point* and the catalog has the *authority*. That is the only sanctioned duplication, and it is a call, not a copy.

:::info Unsettled
How the engine obtains that call at our pinned versions is not documented end to end — see [open question 1](#7-open-questions-for-the-design). If it cannot be obtained, the `select`/`write` rows above collapse into "the engine keeps its own copy of the grants", which is the two-authority model this page exists to prevent.
:::

### 3.4 Where a vendor model conflicts with the master spec

**Conflict 1 — row/column policy cannot live in the catalog.** §7 says policy is "enforced at the catalog", and §6 that "every policy attaches to it". Lakekeeper's authorizers document the opposite for predicates: "Neither engine expresses row filters or column masks. Both decide whether a principal may perform an action on an object; filtering rows or columns *within* an object is not something Lakekeeper enforces." Trino's OPA access control *does* support both (`opa.policy.row-filters-uri`, `opa.policy.column-masking-uri`).
**Direction:** keep the catalog as the single authority for *grants*, and let v1 row/column predicates live in the engine's policy plane, evaluated for the same identity. The consequence must be stated out loud rather than hidden: a read that does not pass through the engine is outside row/column policy. Databricks documents the analogous limit for its own REST surfaces ("You cannot use Iceberg REST catalog or Unity REST APIs to access tables with row filters or column masks"), so this is a property of the protocol class, not a defect we invented. Whether §7's wording needs an amendment is [stardelt-docs#64](https://github.com/stardelt/stardelt-docs/issues/64)'s call.

**Conflict 2 — no vendor metastore, and no second catalog authority.** Unity Catalog has an open-source implementation, but §6 and D6 fix Iceberg REST as the only table protocol, and a second catalog that also decides access is exactly the two-authority bug. **Direction:** take the vocabulary; do not take the component.

**Conflict 3 — `BROWSE`/`READ METADATA` have no stardelt verb today.** Both vendors ship a "discover without reading" privilege; stardelt has none. While `NOVA_FORWARD_IDENTITY` is off (the default), Nova reads the warehouse with its own service connection, so every signed-in user sees the same catalog listing — and the only alternatives are "show nothing" or "show everything". Following §5 (a service is only added behind a contract) the answer is a verb on the catalog contract plus a grant the catalog can express — the mapping from our verb to Lakekeeper's privilege vocabulary is a design task, not an assumption.

---

## 4. A proposed minimal v1 grant model

Small enough to implement, and small enough to explain in one breath: **six verbs, one inheritance rule, one owner, no deny.**

### 4.1 Objects

`catalog` (a Lakekeeper warehouse) → `schema` (namespace) → `table` | `view`. Nothing else in v1: columns are not grantable objects; volumes are D9 and P3; models, services, secrets and shares are not in the plug matrix at v1 ([gap decisions](../design/gap-decisions), [master spec](../design/master-spec) §5).

### 4.2 Verbs

| Verb | Applies to | Means | Vendor ancestry |
|---|---|---|---|
| `use` | catalog | you may address objects in this catalog; prerequisite for every other verb | `USE CATALOG` / `USE SCHEMA`; Open Catalog `USAGE` |
| `browse` | catalog, schema, table, view | metadata and existence only; no rows | `BROWSE`; `READ METADATA` |
| `select` | table, view (grantable at schema or catalog) | read data | `SELECT` |
| `write` | table, view (grantable at schema or catalog) | insert, update, delete, merge, alter table properties | `MODIFY`; `INSERT`/`UPDATE`/`DELETE`; `ALTER` |
| `create` | schema, catalog | create schemas/tables/views inside it | `CREATE TABLE` / `CREATE SCHEMA`; folder `CREATE TABLE` |
| `manage` | any object | grant, revoke, transfer ownership of *this* object | `MANAGE`; `MANAGE GRANTS` |

Six verbs, one per question a user actually asks. What is deliberately absent is as important: no `ALL`, no `DENY`, no per-column verb, no separate `drop` (it is `manage`), no `execute` until functions and models ship, and no `refresh`-style engine verbs.

### 4.3 Subjects and inheritance

- **Subjects are Keycloak groups**, never users. This follows [identity](./identity): "Group membership is the role. No per-user special cases in the platform" — a rule both vendors' group/role machinery can express, and one Dremio's external roles rely on outright.
- **One inheritance direction, downward, including future objects.** A grant on a catalog reaches every schema and table in it, existing and future; a grant on a schema reaches its tables. No `ALL DATASETS`-style snapshot form, ever: one rule that is true is worth more than two that need a table to disambiguate.
- **No deny.** A grant cannot be narrowed. The only blast-radius control is where you grant, which is why granting at catalog level is a platform-admin action and granting at schema level is the normal case.

### 4.4 Ownership

- Every object has **exactly one owner, and the owner is a group** — Dremio's "one owner, a user or a role" with stardelt's group-only subject rule; Databricks' single-owner rule without its user-or-group ambiguity.
- The owner is declared on the contract (`spec.owner` on the catalog/schema CRD), not inferred from whoever clicked first. Objects created by a pipeline carry the owning group of the schema they are written into.
- The owner may always `manage` the object, and may manage child objects of a container it owns — but ownership does **not** imply `select`. This is Databricks' model and it is a security property, not a nuisance: owning a domain must not silently make you a reader of every table in it.
- Transfer of ownership is `manage` on the object plus a new owner in the CRD. No implicit transfer on user deletion (Dremio documents `$unowned` as a failure mode; with group owners that failure disappears).

### 4.5 Row and column policy

In v1 it lives in the **engine's policy plane**, evaluated per query:
- row access = a boolean expression injected into the query (Trino's row-filters endpoint, evaluated with the caller's identity);
- column masking = a single expression per column (Trino's column-masking endpoint, batch-capable);
- keyed on the same subject as the grants — the same group claim that decided the catalog grant.

Explicitly out of scope in v1: policy on a *view* (Databricks forbids it), policy that depends on governed tags (D10, P4), and any guarantee for reads that bypass the engine.

### 4.6 Admin

`stardelt-admins` may manage grants and platform configuration. Following Lakekeeper's instance-admin design rather than Databricks' metastore admin, the admin bypass **covers control-plane operations only**:

- admins can administer grants because the catalog records that capability **for them** — the admin group is seeded as the catalog's grant-holder at bootstrap — not because a flag bypasses the check; Lakekeeper's instance admins are deliberately *not* bypassed for grant writes either;
- admins do **not** get data-plane reads from the flag (Lakekeeper: instance admins "do not bypass authorization for … `ReadData`, `WriteData`, and `Select` still route through the configured Authorizer");
- an admin reads a table by holding `select` like anyone else, so "who read the customer table" has one answer in the log.

Databricks' metastore admin can take ownership of any object and thereby read it; that is a documented, deliberate trade-off in a product whose admin role is also the escape hatch. Lakekeeper's split — bypass the *controls* when the authorizer itself is broken, never the *data*, and never a grant write — is the better default for a platform whose pitch is the audit trail.

### 4.7 The gaps this model knowingly has

1. **No deny** means a wide grant cannot be narrowed, and re-organising a catalog is the only fix. Accepted for v1: both vendors deny nothing at the data level either.
2. **Row/column policy only holds on the engine path.** A principal talking Iceberg REST directly (a notebook, a Spark job) is outside it. The design must decide whether such readers are forbidden on policy-bearing tables or simply out of v1 scope ([§7](#7-open-questions-for-the-design)).
3. **Column-level grants are absent.** Masking is the only column mechanism, so "you may read these columns but not those" is expressed as a mask, not a grant.
4. **No compute grants.** "May this group use the big warehouse?" has no home in this model yet — it is [stardelt-docs#64](https://github.com/stardelt/stardelt-docs/issues/64)'s warehouse decision.
5. **No machine-subject story.** Pipelines run on client-credentials clients, which are not Keycloak groups; who owns a table a DAG creates is an open question ([§7](#7-open-questions-for-the-design)).

---

## 5. What we will not build

| Not building | Why |
|---|---|
| A metastore or catalog service of our own | §6/D6: one REST catalog, Iceberg REST the only table protocol. A second access-deciding catalog is a two-authority bug by construction |
| Adopting a vendor component (Unity Catalog OSS, Dremio) | [license policy](./licenses) admits permissive components, and this ticket's deliverable is semantics, not software |
| A `DENY` verb | Neither vendor denies a data privilege. Deny needs conflict-resolution rules (precedence, inheritance of denials, admin exemption, visibility in `SHOW GRANTS` — the exact surface Databricks documents as *not* reflecting it) that v1 will not get right |
| `ALL PRIVILEGES`-style aggregate grants | Databricks' own page shows why: the aggregate silently absorbs every privilege added later. A platform that expects to grow verbs must not ship a self-expanding grant |
| Per-user grants | [identity](./identity): group membership is the role |
| Column-level grants (`select(col)`, `update(col)`) | One question, one mechanism: columns are handled by masks, not by grants |
| ABAC / tag-driven policies in v1 | Needs a governed-tag store and a classifier; D10 puts classification at P4 on OpenMetadata. Tags without a classifier are just strings |
| Storage-level grants to users | Storage stays machine-to-machine: Lakekeeper vends or signs credentials, `stardelt-s3-creds` stays a machine secret, and SeaweedFS's OIDC/STS path must not be enabled on the pinned version ([identity integrations](./identity-integrations)) |
| A workspace-binding dimension (Databricks) | stardelt has no workspace object; whether a catalog is bound to a warehouse is #64's decision |
| Source/connector grant vocabulary (Dremio) | Ingestion is `IngestionSource` with a machine identity, not a per-user grant |
| Row/column policy in the catalog, or on the REST data path, in v1 | The catalog has no vocabulary for it (Lakekeeper docs) and the protocol cannot carry it (Databricks' own stated limitation). v1 attaches predicates in the engine and says so |
| Volumes, models, services, secrets, shares, clean rooms as securable objects | Not in the plug matrix at v1; volumes are D9 (P3) |
| Vendor parity as a goal | §3: the product is the curation, not the surface area |

---

## 6. Sources and dates read

All pages read **2026-10-18**; "updated" is the date the page itself displays.

**Databricks Unity Catalog**
- [What is Unity Catalog?](https://docs.databricks.com/aws/en/data-governance/unity-catalog/) — updated 2026-09-11
- [Securable objects reference](https://docs.databricks.com/aws/en/data-governance/unity-catalog/securable-objects) — updated 2026-10-12
- [Permissions model concepts](https://docs.databricks.com/aws/en/data-governance/unity-catalog/access-control/permissions-concepts) — updated 2026-09-11
- [Privileges reference](https://docs.databricks.com/aws/en/data-governance/unity-catalog/access-control/privileges-reference) — updated 2026-10-12
- [Access control in Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/access-control/) — updated 2026-10-15
- [Manage privileges](https://docs.databricks.com/aws/en/data-governance/unity-catalog/manage-privileges/) — updated 2026-10-15
- [Attribute-based access control](https://docs.databricks.com/aws/en/data-governance/unity-catalog/abac/) — updated 2026-09-29
- [ABAC DENY policies (Beta)](https://docs.databricks.com/aws/en/data-governance/unity-catalog/abac/deny-policies) — updated 2026-09-17
- [Row filters and column masks](https://docs.databricks.com/aws/en/data-governance/unity-catalog/filters-and-masks/) — updated 2026-10-09

**Dremio** (docs labelled *Enterprise*, version *current [26.x]*)
- [Access control](https://docs.dremio.com/current/security/rbac)
- [Privileges](https://docs.dremio.com/current/security/rbac/privileges)
- [Role management](https://docs.dremio.com/current/security/rbac/roles)
- [Row-access and column-masking policies](https://docs.dremio.com/current/data-products/govern/row-column-policies-udf/)
- [GRANT/REVOKE](https://docs.dremio.com/current/reference/sql/commands/rbac)
- [Row-access & column-masking (SQL)](https://docs.dremio.com/current/reference/sql/commands/row-column-policies)

**The stack this maps onto**
- [Trino 480 — system access control](https://trino.io/docs/480/security/built-in-system-access-control.html) (default access control; `allow-all`)
- [Trino 480 — OPA access control](https://trino.io/docs/480/security/opa-access-control.html) (properties, row filters, column masks, permission-management operations denied by default)
- [Lakekeeper — authorization](https://docs.lakekeeper.io/docs/latest/authorization) (authorizer choice; AllowAll records grants and enforces nothing; no row filters or column masks)
- [Lakekeeper — OpenFGA](https://docs.lakekeeper.io/docs/latest/authorization-openfga), [OPA bridge](https://docs.lakekeeper.io/docs/latest/opa), [query engines](https://docs.lakekeeper.io/docs/latest/engines), [instance admins](https://docs.lakekeeper.io/docs/latest/instance-admins)

**stardelt, in this repo and beside it**
- [identity](./identity), [identity integrations](./identity-integrations), [licenses](./licenses)
- [master spec](../design/master-spec) §3, §5, §6, §7, §9; [gap decisions](../design/gap-decisions) D8–D16; [execution plan](../design/execution-plan) WP-12
- `stardelt-platform` at `origin/main`: `helm-values/trino.yaml`, `helm-values/trino-identity.yaml`, `helm-values/lakekeeper.yaml`, `manifests/s3-credentials.example.yaml`
- `stardelt-nova` at `origin/main`: `backend/src/auth.rs`, `backend/src/trino.rs`, `backend/src/main.rs` (`NOVA_FORWARD_IDENTITY`), `README.md`

---

## 7. Open questions for the design

1. **How does the engine learn a subject's groups?** Grants name Keycloak groups; Trino's OPA plugin receives `groups` only from Trino's own identity, and Trino 480 documents no way to take groups from a token claim ([identity integrations](./identity-integrations)). The three documented-shaped options are the Lakekeeper OPA bridge (keeps the catalog authoritative, needs a technical user — and the docs do not say how it resolves a Trino principal to a Lakekeeper user), a file-based group mapping kept in sync from Keycloak, or Lakekeeper's "catalog enforces permissions" mode with token exchange/downscoping. **Nothing in the public docs settles which works at our pinned versions.** This is the single biggest unknown in the model and it decides whether the catalog can stay the authority at all.
2. **Does Lakekeeper's grant vocabulary have a "browse/describe" privilege distinct from `select`?** Its docs say the authorizer's model decides "whether `select` implies `describe`" — so the `browse` verb's meaning depends on a per-version model detail I did not verify.
3. **Row/column policy versus direct REST readers.** Is a table with a row filter readable through Iceberg REST by a notebook or Spark job in v1, forbidden, or simply unsupported until a later phase? Databricks resolved the same question by *refusing* REST access to such tables; that is a decision we can copy or reject, not dodge.
4. **Compute grants.** Does "may use the big warehouse" resolve to a catalog grant, a Trino resource group, or a Nova/ingress check? Ticket [#64](https://github.com/stardelt/stardelt-docs/issues/64) asks this in its own open questions; the grant model here deliberately leaves the verb set unable to express it.
5. **Ownership of pipeline-created objects.** Owners are groups, but Airflow tasks run as client-credentials clients. Either the pipeline writes into a schema and the *schema's* owner owns the table, or machine subjects need an owner concept — the latter has no vendor precedent in the pages read.
6. **What happens to `stardelt-users`?** It is the realm default group and currently grants notebook access. If it also gets a catalog grant, "everyone" becomes a grant principal by default; if it does not, the migration for existing users must be spelled out.
