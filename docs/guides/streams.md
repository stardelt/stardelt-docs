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
| Phase | The stream's current state (for example `Running` or `Stopped`). |
| Source → sink | The Kafka topic the stream reads and the Iceberg table it writes. |
| Last checkpoint | When the stream last recorded its checkpoint. |
| Last error | The most recent error, if any. |
| Stopped | Whether the stream is stopped (`spec.stopped`). |

The page shows the `StreamApp`s of the groups you belong to; an administrator sees all of them. It polls every 15 seconds.

If nothing runs on the bus yet, the page is empty with the message: "nothing runs on the bus yet: a stream appears when a `StreamApp` is created".

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
