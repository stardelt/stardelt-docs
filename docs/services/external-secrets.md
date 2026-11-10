---
title: "External Secrets Operator"
sidebar_label: "External Secrets"
slug: /services/external-secrets
---

# External Secrets Operator

**What it is.** External Secrets Operator (Apache-2.0) is the Kubernetes operator that copies secret values from an external store into Kubernetes `Secret`s through `ExternalSecret` resources. It is the only component in the platform that reads a secret store. The chart is `external-secrets/external-secrets` **2.13.0** from `https://charts.external-secrets.io` and installs three small workloads, one replica each: the controller, the admission webhook and the cert-controller.

**How it fits.** `spec.secrets.mode` selects whether the platform installs it. The `Connection` resource is the only thing that creates `ExternalSecret`s.

| `spec.secrets.mode` | What is installed | Where values come from |
|---|---|---|
| `none` (default) | Nothing | The store the Connections API writes. A scheduled notebook needs Secret `conn-<name>` to exist and hold every key from `spec.secret.keys`; a hand-written Secret is enough, and the connection is then `Ready=True` with reason `SecretFound`. |
| `platform` | External Secrets Operator **and** the built-in store ([OpenBao](openbao)) | The operator writes one `ExternalSecret` per `Connection` and syncs the store path into Secret `conn-<name>`. The per-group `SecretStore` is `openbao-<group>`; managed connections use `openbao-managed`. |
| `external` | External Secrets Operator only | A `ClusterSecretStore` named `enterprise` is published from `spec.secrets.external.provider` verbatim; the enterprise's store supplies the values. A `Connection` names its path in that store with `spec.secret.remoteRef`: see the [connections guide](../guides/connections#8-an-enterprise-secret-store-external-mode). |

The `provider` block is the enterprise's own and is passed to the `ClusterSecretStore` verbatim;
stardelt adds nothing to it. The connections guide shows three shapes: HashiCorp Vault with AppRole
(the one the dev cluster exercises), a cloud key vault that signs in with a Kubernetes
ServiceAccount, and an external OpenBao with Kubernetes authentication — see
[connections](../guides/connections#8-an-enterprise-secret-store-external-mode). One store named
`enterprise` serves every namespace of an instance.

Creating a `Connection` does not need the operator: the API writes to the store. The synced Secret `conn-<name>` does, and so does everything that reads it.

**What happens when it is down.** An `ExternalSecret` stops refreshing, and the Kubernetes `Secret` keeps its last value — already-running pods are unaffected until they restart. A `Connection` created while the operator is down has no `conn-<name>` Secret, so its consumer fails: it reports `Ready=False` with reason `ExternalSecretsNotInstalled`, and the message names `make external-secrets` — unless a hand-written `conn-<name>` Secret holds every key from `spec.secret.keys`, in which case it is `Ready=True` with reason `SecretFound`. The Connections page in Nova shows the sync state it reads from the `Connection`'s status.

**What you can tune.**

| Setting | Values file | Key | Default | What it changes |
|---|---|---|---|---|
| CRDs | `helm-values/external-secrets.yaml`, `crates/stardelt-operator/values/external-secrets.yaml` | `installCRDs` | `true` | Installs the `ExternalSecret`, `SecretStore` and `ClusterSecretStore` CRDs with the chart. |
| Replicas | `helm-values/external-secrets.yaml` | `replicaCount` | `1` | Replicas of each of the three workloads. |
| Controller resources | `helm-values/external-secrets.yaml` | `resources` | `requests: {cpu: 20m, memory: 48Mi}, limits: {memory: 192Mi}` | CPU/memory envelope of the controller. |
| Webhook resources | `helm-values/external-secrets.yaml` | `webhook.resources` | `requests: {cpu: 10m, memory: 32Mi}, limits: {memory: 128Mi}` | CPU/memory envelope of the admission webhook. |
| Cert-controller resources | `helm-values/external-secrets.yaml` | `certController.resources` | `requests: {cpu: 10m, memory: 32Mi}, limits: {memory: 128Mi}` | CPU/memory envelope of the cert-controller that renews the webhook certificate. |

The operator path reads the same numbers from `crates/stardelt-operator/values/external-secrets.yaml`.

**Operating it.**

- **Enable (make path):** `make external-secrets` is opt-in and never part of `make install`. In `platform` mode also run `make openbao` and `scripts/eso-openbao-store.sh`, which create the store and the `SecretStore` objects.
- **Enable (operator path):** set `spec.secrets.mode` to `platform` or `external` on the `PlatformInstance`. The operator plans the component whenever the mode is not `none`.
- **Checks:**
  ```console
  kubectl -n <namespace> get deploy external-secrets external-secrets-webhook external-secrets-cert-controller
  kubectl -n <namespace> get externalsecrets
  kubectl -n <namespace> get connection <name> -o jsonpath='{.status.ready} {.status.conditions[?(@.type=="Ready")].reason}{"\n"}'
  # true SecretFound         (hand-written Secret, no External Secrets)
  # false ExternalSecretsNotInstalled
  ```
  An `ExternalSecret` whose `STATUS` is not `SecretSynced` carries the reason in `status.conditions`.
- **Logs:** `kubectl -n <namespace> logs deploy/external-secrets`.
- **Status today:** the component is opt-in and the current dev cluster runs with `spec.secrets.mode: none` — it does not run the operator, and the commands above describe the shape once the mode is set, not that cluster.

**Related pages.** [OpenBao](openbao) · [Connections and secrets](../guides/connections) · [Connection reference](../reference/resources/connection) · [PlatformInstance reference](../reference/resources/platforminstance) · [Licenses](../architecture/licenses).
