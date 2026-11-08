---
title: "The Streams page"
sidebar_label: "Streams"
slug: /guides/streams
---

# The Streams page

Nova's **Streams** page shows the `StreamApp` resources that run on the [streaming bus](../services/kafka). A stream reads one Kafka topic and writes one Iceberg table.

## What you see

Each row is one `StreamApp`:

| Column | Meaning |
|---|---|
| Name | The `StreamApp` name, with its owner group beneath it. |
| Phase | The phase the operator reports: `Running`, `Stopped`, `Failed` or `Pending`. A second badge carries the operator's `Ready` reason when it differs from the phase. |
| Source | The `Connection` (or the platform bus) and the Kafka topic the stream reads. |
| Sink | The catalog, table and mode (`merge` or `append`) the stream writes. |
| Checkpoint | `—` until the operator can read the stream's checkpoint; the checkpoint itself is written to the object store and survives a stop. |
| Last error | The most recent error, if any. |
| Job | One **Stop** or **Resume** button. |

The page shows the `StreamApp`s of the groups you belong to; an administrator sees all of them. It polls every 15 seconds.

Beside the phase, a stream that Spark has submitted more than once shows its
submission count: `3× restarted` in blue while the last submission is inside the
operator's ten-minute window, and `3× submissions` in grey once that window has
passed. The number is historical; only the blue form says the stream is recovering
now, which is the same window that produces the `Restarting` reason below.

If nothing runs on the bus yet, the page is empty and says: "No streams yet. A stream is
created as a `StreamApp` resource; ask an administrator to add one."

## When the phase and the reason disagree

The phase is what Spark reports about the application; the reason is what the operator observes
about the pods. Two reasons are worth knowing:

- `Restarting` — Spark resubmitted the application in the last ten minutes. The stream is
  recovering on its own; check again that the table grows.
- `ExecutorsUnschedulable` — the driver is running, but Spark has no node with room for an
  executor, so the stream processes nothing. The waiting executor pod's `PodScheduled`
  condition carries the scheduler's own sentence, for example:

  ```text
  0/1 nodes are available: 1 Insufficient cpu. preemption: 0/1 nodes are available: 1 No preemption victims found for incoming pod.
  ```

  The row's **Last error** column shows that sentence as well when the operator reports it.

  Free CPU on the node (stop a stream you no longer need) and the executor schedules; the
  checkpoint is kept, so the stream continues where it stopped.

## Stop and resume a stream

**Stop** sets `spec.stopped: true`; the operator deletes the Spark application and keeps the
checkpoint. **Resume** sets it back to `false` and the job continues from that checkpoint, so
no rows are lost or re-read from the start.

The button acts on one row and is disabled while that row's request is in flight. If the
request fails, the API's sentence appears above the table and the button is enabled again;
the page shows what the operator reports, so the phase does not change until the operator
has reconciled. An administrator can do the same from the command line:

```bash
kubectl -n <namespace> patch streamapp <name> --type merge -p '{"spec":{"stopped":true}}'
```

## See streams from the command line

```bash
kubectl get streamapps -n <namespace>
```

## A StreamApp example

This example reads a topic and merges rows into an Iceberg table by key. It passes `kubectl apply --dry-run=server` on a cluster where the `StreamApp` resource is installed:

```yaml
apiVersion: stardelt.io/v1alpha1
kind: StreamApp
metadata:
  name: pegelonline
  namespace: stardelt
spec:
  source:
    topic: pegelonline.measurements
  sink:
    catalog: shared
    table: bronze.pegelonline_measurements
    mode: merge
    mergeKeys:
      - station_uuid
      - measured_at
```

Without `source.connectionRef` the stream reads the platform's own Kafka bus, which is what a
platform-managed install uses. For an external Kafka, create a `Connection` whose
`config.bootstrapServers` names the broker and set `source.connectionRef` to its name.

`spec.stopped: true` stops the job and keeps the checkpoint, so setting it back to `false` resumes from where it left off. Keyed `merge` sinks are effectively-once; append-only sinks (`mode: append`, no `mergeKeys`) are at-least-once. Credentials live in a `Connection`, never in the manifest.
If one micro-batch carries two rows for the same key — a producer retry, or two
messages for one measurement time — the row with the newest Kafka offset wins
before the `MERGE`, so a replayed or superseded message cannot overwrite a newer
value.
