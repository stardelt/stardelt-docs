---
title: "An enterprise secret store"
sidebar_label: "An enterprise secret store"
slug: /guides/connections-secret-stores
---

# An enterprise secret store

The `external` secrets mode: how a `Connection` names a path in the enterprise's store, the worked
example, and the providers stardelt documents today. The connection itself, its scopes and how a
notebook reads it are on [Connections and secrets](./connections).

## An enterprise secret store (external mode)

An installation with `spec.secrets.mode: external` installs no secret store of its own: the
External Secrets Operator syncs the values of each connection from the enterprise's store into the
Kubernetes Secret `conn-<name>`. Because only the enterprise knows its layout, it also publishes no
store paths — the author of a `Connection` names the path.

| Store | `provider` key | `remoteRef` names | Signs in with | Shown below |
|---|---|---|---|---|
| HashiCorp Vault (KV v2) | `vault` | a path, `apps/crm/db` | AppRole or Kubernetes | yes, tested on the dev cluster |
| OpenBao | `vault` | a path | Kubernetes | yes |
| AWS Secrets Manager | `aws` | a secret name, `/` allowed | IAM role for the ServiceAccount | yes |
| Azure Key Vault | `azurekv` | a secret name, letters, digits and `-` | workload identity | yes |
| Google Secret Manager | `gcpsm` | a secret name, letters, digits, `-` and `_` | workload identity | yes |
| Infisical | `infisical` | a secret name | Universal Auth machine identity | yes |
| any other External Secrets provider | its key | its rules | its rules | no: the block is passed through unchanged |

In every store, the secret at `remoteRef` holds a JSON object with one field per entry in
`spec.secret.keys`.

Two field rules follow:

- **`spec.secret.remoteRef` is required.** Absent, the connection stays `Ready=False` with reason
  `RemoteRefRequired` and the message `secrets.mode external: set secret.remoteRef to the path in
  the enterprise store (for example `apps/crm/db`)`.
- **In any other mode it is refused**, with reason `RemoteRefNotAllowed`: there the platform derives
  the path itself, `connections/group/<ownerGroup>/<name>` or `connections/managed/<name>`.

The path is 1 to 512 characters matching `^[A-Za-z0-9][A-Za-z0-9_./-]*$`, and may not contain `..`
or `//`.

### The worked example

The platform expects one store, a `ClusterSecretStore` named `enterprise`, with a HashiCorp Vault
KV-v2 provider and **AppRole** authentication:

```yaml
apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: enterprise
spec:
  provider:
    vault:
      server: https://vault.example.com
      path: secret
      version: v2
      auth:
        appRole:
          path: approle
          roleId: stardelt-platform
          secretRef:
            name: vault-approle
            key: secret-id
            namespace: stardelt
```

The operator copies `spec.secrets.external.provider` from the `PlatformInstance` verbatim into this
object, so this is the same document an operator install publishes. The credentials are only ever
referenced by Secret name: `vault-approle` is created by an administrator in the platform namespace
before the install, and the platform never carries a credential in a resource. Take the `namespace`
from the instance's own namespace, not the literal `stardelt` shown here.

A `Connection` in external mode then names its path in the store:

```yaml
apiVersion: stardelt.io/v1alpha1
kind: Connection
metadata:
  name: crm-db
  namespace: analytics
spec:
  type: postgresql
  scope: group
  ownerGroup: analytics
  config:
    host: postgres.example.com
    database: crm
  secret:
    keys: [user, password]
    remoteRef: apps/crm/db
```

`spec.secret.keys` names the fields in the enterprise store. Each becomes a key of the Secret
`conn-<name>` and an environment variable `CONN_<NAME>_<KEY>` in a scheduled notebook; the sync
refreshes every 15 minutes unless `spec.refreshInterval` says otherwise.

Check the result:

```console
$ kubectl -n analytics get connection crm-db -o jsonpath='{.status.ready} {.status.conditions[?(@.type=="Ready")].reason}{"\n"}'
true SecretSynced
$ kubectl -n analytics get secret conn-crm-db -o jsonpath='{.data.keys}'
```

Run `kubectl -n analytics get externalsecret conn-crm-db` for the sync state.

**Registering the connection.** In external mode a `Connection` is created with `kubectl apply`, as
above. The **Connections** page in Nova writes to the platform's own store and never sets
`remoteRef`, so it cannot create an external-mode connection.

The platform recommends one prefix per team in the store (`platform/<ownerGroup>/…`) but does not
enforce it: the enterprise store's own policy decides who reads which path.

### A cloud key vault

A cloud key vault signs the cluster in with its own workload identity, so no credential is stored in the platform.

### AWS Secrets Manager

A cloud key vault authenticates the cluster to the cloud, so no credential is stored anywhere in
the platform. The store signs in with a Kubernetes ServiceAccount whose cloud identity (an IAM role
bound to the cluster's OIDC provider) may read the secret. Create that ServiceAccount and its role
binding **before** the install, then give the instance the provider block:

```yaml
# PlatformInstance.spec.secrets
secrets:
  mode: external
  external:
    provider:
      aws:
        service: SecretsManager
        region: eu-central-1
        auth:
          jwt:
            serviceAccountRef:
              name: eso-aws
              namespace: analytics
```

`namespace` is the instance's own namespace. The operator publishes this block as the
`ClusterSecretStore` named `enterprise`; the process that signs in is the External Secrets
controller, so the role's trust policy names the ServiceAccount above.

**Not tested here.** stardelt has no cloud account, so the AWS, Azure, Google and Infisical
examples are each provider's documented shape, checked only by a server dry-run (below). The Vault
example above is the one exercised on the dev cluster (`make verify-external-secrets`).

### Azure Key Vault

Azure Key Vault hands the store a managed identity through workload identity, so no credential is
stored in the platform. The ServiceAccount `eso-azure` carries the annotation
`azure.workload.identity/client-id`, and its managed identity has the role *Key Vault Secrets User*:

```yaml
# PlatformInstance.spec.secrets
secrets:
  mode: external
  external:
    provider:
      azurekv:
        vaultUrl: https://<your-vault>.vault.azure.net
        authType: WorkloadIdentity
        serviceAccountRef:
          name: eso-azure
          namespace: analytics
```

A Key Vault secret name allows letters, digits and `-` only. So `remoteRef` is a name like `crm-db`,
not a path, and the secret's value is the JSON object.

### Google Secret Manager

Google Secret Manager uses workload identity federation: the ServiceAccount `eso-gcp` is bound to a
Google service account that has *Secret Manager Secret Accessor*:

```yaml
# PlatformInstance.spec.secrets
secrets:
  mode: external
  external:
    provider:
      gcpsm:
        projectID: <your-project>
        auth:
          workloadIdentity:
            clusterLocation: europe-west3
            clusterName: <your-cluster>
            serviceAccountRef:
              name: eso-gcp
              namespace: analytics
```

The secret name allows letters, digits, `-` and `_`. The latest version is read.

### Infisical

Infisical authenticates as a machine identity with Universal Auth. Its client ID and secret sit in a
Kubernetes Secret `infisical-ua` that an administrator creates before the install:

```yaml
# PlatformInstance.spec.secrets
secrets:
  mode: external
  external:
    provider:
      infisical:
        hostAPI: https://app.infisical.com
        auth:
          universalAuthCredentials:
            clientId: { name: infisical-ua, key: clientId, namespace: analytics }
            clientSecret: { name: infisical-ua, key: clientSecret, namespace: analytics }
        secretsScope:
          projectSlug: <your-project>
          environmentSlug: prod
          secretsPath: /
```

Store the connection as **one** Infisical secret whose value is the JSON object, and name it in
`remoteRef`. A self-hosted Infisical sets `hostAPI` to its own URL.

### An external OpenBao

OpenBao serves the Vault API, so it uses the `vault` provider with Kubernetes authentication instead
of AppRole:

```yaml
# PlatformInstance.spec.secrets
secrets:
  mode: external
  external:
    provider:
      vault:
        server: https://openbao.example.com:8200
        path: secret
        version: v2
        auth:
          kubernetes:
            mountPath: kubernetes
            role: stardelt-platform
            serviceAccountRef:
              name: eso-openbao
              namespace: analytics
```

The store's role and policy decide which paths the sync may read; the platform never holds a token.

### One store, and what that means for namespaces

`spec.secrets.mode: external` publishes exactly **one** cluster-scoped store, `enterprise`, and
every `ExternalSecret` the operator writes references it
(`crates/stardelt-operator/src/connection.rs`, `spec.secretStoreRef.name`). There is no
per-namespace store on this path: the platform cannot give each team its own credential.

Separation between groups is therefore the enterprise store's job: one policy path per group, or
one store and credential per `PlatformInstance` (one install per stage or tenant). The recommended
prefix `platform/<ownerGroup>/…` is a convention, not a boundary — in external mode the platform
does not enforce the three path prefixes, the store's own policy does.
