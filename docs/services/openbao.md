---
title: "OpenBao"
sidebar_label: "OpenBao"
slug: /services/openbao
---

# OpenBao

**What it is.** OpenBao is the secret store the platform runs in *platform* mode (`spec.secrets.mode: platform` in the operator, `make openbao` in the make path): a single-node store with KV v2 at `secret/`, reached in-cluster at `http://openbao.<namespace>.svc.cluster.local:8200`. It is the one component under a non-permissive licence (MPL-2.0; see [Licenses](../architecture/licenses)). Production installs use the enterprise's own store (`secrets.mode: external`) and never run this.

**What it stores.** Connections of the three scopes and their paths (`connections/group/<group>/…`, `connections/managed/…`, personal paths that never reach a Kubernetes Secret), and the per-group policies that decide who may read which prefix. It stores no platform-generated secret: those stay Kubernetes Secrets in v1.

**How it fits.** External Secrets Operator is the only component that reads the store; a `Connection` becomes an `ExternalSecret` that syncs into Secret `conn-<name>`, and a notebook or pipeline reads the value through that path. The store never appears in a pipeline file or a notebook cell.

**What happens when it is down.** A connection that is not yet synced cannot be created; an already synced Secret keeps its last value until the next refresh. Nova answers 503 on the Connections page when it cannot reach the store.

**What you can tune.**

| Setting | Values file | Key | Default | What it changes |
|---|---|---|---|---|
| Data storage size | `helm-values/openbao.yaml` | `server.dataStorage.size` | `10Gi` | Persistent volume size for the store. |
| Resources | `helm-values/openbao.yaml` | `server.resources` | `requests: {cpu: 50m, memory: 64Mi}, limits: {memory: 256Mi}` | CPU/memory requests and limits. |
| Storage backend | `helm-values/openbao.yaml` | `server.standalone.config` (`storage "pebbledb"` path) | pebbledb | Storage backend and path configuration. |
| Seal | `helm-values/openbao.yaml` | `seal "static"` block | static seal | Static seal configuration. |
| Audit device | `helm-values/openbao.yaml` | `audit "file" "to-stdout"` device | enabled to stdout | Audit logging device writing one JSON line per request to stdout. |
| Injector | `helm-values/openbao.yaml` | `injector.enabled` | `false` | Vault Agent injector (off). |
| CSI driver | `helm-values/openbao.yaml` | `csi.enabled` | `false` | CSI provider (off). |

**Operating it.**

- **Install:** `make openbao` is opt-in and never part of `make install`. 
- **Seal key:** The static seal key is in Secret `openbao-seal-key` — **never delete it while the volume exists**, it is the only thing that makes the store unseal itself after a restart.
- **Init data:** Secret `openbao-init` contains the recovery key and root token (sandbox only).
- **Audit:** The audit device writes one JSON line per request to the pod's stdout.
- **Backups:** Backups are **not** implemented yet — say so plainly rather than implying they are.
