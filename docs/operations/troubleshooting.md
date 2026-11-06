---
title: "Troubleshooting"
sidebar_label: "Troubleshooting"
slug: /operations/troubleshooting
---

# Troubleshooting

Start with the blunt checks. They catch most problems:

```bash
kubectl -n stardelt get pods                    # anything not Running or Completed?
kubectl -n stardelt get events --sort-by=.lastTimestamp | tail -20
helm list -A                                    # any release stuck in pending-upgrade?
```

Nova's **Health** page lists every workload and the image it runs.

## PostgreSQL never becomes ready

**Symptoms.** The CloudNativePG pods never report ready (`Instance is still down`,
`could not establish connection`). ingress-nginx restarts in a loop with
`nginx: [alert] kill(22, 1) failed (13: Permission denied)`. The kernel log repeats:

```text
apparmor="DENIED" operation="signal" class="signal" profile="cri-containerd.apparmor.d" comm="postgres" signal=urg
```

**Cause.** PostgreSQL wakes its workers with a signal, and the node's AppArmor container profile
refuses it. It looks like a database fault but is a host problem, and no chart value can fix it.

| Node | Result |
|---|---|
| Ubuntu 26.04, kernel 7.0.0-38-generic, default container profile | works |
| Ubuntu 26.04, kernel 7.0.0-42-generic, default container profile | **broken** |
| Ubuntu 26.04, kernel 7.0.0-42-generic, `disable_apparmor = true` for containerd | works; containers run unconfined |

**Fix.** Try these in order:

1. **Boot the previous kernel** and hold the new one until a fixed kernel or profile ships. This
   keeps container confinement.
2. **Turn AppArmor off for containers.** In a checkout of `stardelt-platform`, run
   `sudo scripts/enable-apparmor.sh --apply --restart`. This weakens confinement for every container
   on the node. The host's AppArmor service stays on.
3. **Set `securityContext.appArmorProfile: Unconfined`** on each pod that signals itself
   (PostgreSQL, ingress-nginx). It is easy to miss one, so this is not recommended.

## Trino refuses to start

**Symptom.** `Error invoking configuration method … setMaxQueryMemoryPerNode`.

**Cause.** `query.maxMemoryPerNode` does not fit inside the JVM heap. Lower or raise both together:
see [Sizing](../getting-started/your-cluster#sizing).

## Writes to a new bucket hang

**Symptom.** The client blocks, and the SeaweedFS master log says
`failed to find writable volumes … Not enough data nodes found`.

**Cause.** The volume server is out of volume slots. The chart sets `maxVolumes: 100`, while the
upstream default can be as low as 7. Raise the value and restart the volume server.

## A volume comes up without a claim

**Cause.** You overrode an element of a list with `--set`, for example
`seaweedfs.volume.dataDirs[0].storageClass=fast`. Helm replaces the whole element and drops its
`name`, `type` and `size`. Put the whole entry in a values file.

## A pod still runs the old image after an upgrade

**Cause.** A moving tag such as `:dev` can be served from layers the node already has. Pin the digest
with `make pin APP=nova`, or put a digest in your values.

## A new CRD field is ignored

**Cause.** Helm installs CRDs on `install`, never on `upgrade`. In a checkout of `stardelt-operator`,
run `kubectl apply --server-side -f chart/crds/`.

## Sign-in fails after hours in a notebook

**Cause.** The token your notebook server received has expired. Restart your server from the hub.

## Asking for help

Open an [issue](https://github.com/stardelt/stardelt-platform/issues) with what you ran, what you
expected, and the output of `kubectl -n stardelt get pods` and `kubectl -n stardelt get events`.
Remove domains and secrets first. To report a security problem privately, use
[the security policy](https://github.com/stardelt/.github/blob/main/SECURITY.md).
