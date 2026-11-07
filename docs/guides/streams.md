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
| Phase | The phase the operator reports: `Running`, `Stopped`, `Failed` or `Pending`. |
| Source | The `Connection` (or the platform bus) and the Kafka topic the stream reads. |
| Sink | The catalog, table and mode (`merge` or `append`) the stream writes. |
| Checkpoint | When the stream last recorded its checkpoint. |
| Last error | The most recent error, if any. |
| Job | One **Stop** or **Resume** button. |

The page shows the `StreamApp`s of the groups you belong to; an administrator sees all of them. It polls every 15 seconds.

If nothing runs on the bus yet, the page is empty and says: "No streams yet. A stream is
created as a `StreamApp` resource; ask an administrator to add one."

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
    connectionRef: kafka-bus
    topic: pegelonline.measurements
  sink:
    catalog: shared
    table: bronze.pegelonline_measurements
    mode: merge
    mergeKeys:
      - station_uuid
      - measured_at
```

`spec.stopped: true` stops the job and keeps the checkpoint, so setting it back to `false` resumes from where it left off. Keyed `merge` sinks are effectively-once; append-only sinks (`mode: append`, no `mergeKeys`) are at-least-once. Credentials live in a `Connection`, never in the manifest.
