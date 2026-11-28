---
title: "The Streams page"
sidebar_label: "Streams"
slug: /guides/streams
description: "What the Streams page shows for each stream that reads a Kafka topic and writes an Iceberg table."
---

# The Streams page

Nova's **Streams** page shows the `StreamApp` resources that run on the [streaming bus](../architecture/services). A stream reads one Kafka topic and writes one Iceberg table.

## What you see

Each row is one `StreamApp`:

| Column | Meaning |
|---|---|
| Name | The `StreamApp` name, with its owner group beneath it. |
| Phase | The phase the operator reports: `Running`, `Stopped`, `Failed` or `Pending`. A second badge carries the operator's `Ready` reason when it differs from the phase. |
| Source | The `Connection` (or the platform bus) and the Kafka topic the stream reads. |
| Sink | The catalog, table and mode (`merge` or `append`) the stream writes. |
| Last error | The most recent error, if any. |
| Job | One **Stop** or **Resume** button. |

The page shows the `StreamApp`s of the groups you belong to; an administrator sees all of them. It polls every 15 seconds.

Beside the phase, a stream that Spark has submitted more than once shows its
submission count: `3× restarted` in blue while the last submission is inside the
operator's ten-minute window, and `3× submissions` in grey once that window has
passed. The number is historical; only the blue form says the stream is recovering
now, which is the same window that produces the `Restarting` reason below.

If you can see no stream yet, the page says `No streams yet` and "Create one to read a topic into a table."
A stream can also come from a bundle in Git — see [Deploy a stream from Git](#deploy-a-stream-from-git).

Click a stream's name to open its own page. It shows the source and the sink, the identity the stream runs
as, its viewers, how often Spark submitted it, when it was last submitted, and the last error. It also has
the same **Stop** or **Resume** button. **Sink rows** and **Last commit** come from the sink table's history.
A stream that is `Running` but whose last commit does not move writes nothing; if the table is missing, the
page says `The sink table does not exist.`

## Create a stream

**New stream** opens a form:
- **Name**: 1 to 40 lower-case letters, digits and dashes, starting with a letter.
- **Owner group**: one of your groups.
- **Topic**: the Kafka topic to read.
- **Source connection**: blank reads the platform's own bus.
- **Catalog** and **Table** (`schema.table`): where it writes.
- **Write mode**: `merge`, with **Merge keys**, or `append`.
- **Restart policy**: `always` or `on-failure`.
- **Viewers**: optional groups that may see the stream.
- **Checkpoint prefix**: optional; blank uses the platform's default.

The sink table must exist: create it with SQL first, or the form says
`the sink table … does not exist — create it with SQL before the stream can write to it`.
**Create stream** checks the whole form with Nova before it writes anything. A refusal shows Nova's own
sentences, and nothing is created. The stream runs as its owner group's pipeline identity, never as you,
so the group needs `write` on the sink catalog for the rows to land.

A created stream starts at once: it submits a Spark application when the create lands, and it holds an
executor while it reads. On a shared node, stop a stream you are not using with **Stop**, so another one
gets the CPU — see `ExecutorsUnschedulable` under
[When the phase and the reason disagree](#when-the-phase-and-the-reason-disagree).

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

## After an operator upgrade

An upgrade that changes the job script the operator runs restarts every running stream once.
The operator compares the script it carries with the one the running application was
submitted with, and resubmits when they differ. Expect the `Restarting` reason for up to ten
minutes and the submission count to go up by one; the stream continues from its checkpoint,
so no already-written rows are processed twice with `merge` sinks. `make verify-streaming`
prints `stream-scripts` as a pass once every running stream carries the current script.

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

## Deleting a stream

**Delete** on a stream's own page removes it, after one confirmation. Only its owner group may
delete it. The dialog says what happens to the topic, from the stream's own
`spec.deletionPolicy`.

By default (`deletionPolicy: Retain`) the stream's source topic is **kept**: the operator
created its `KafkaTopic` without an owner, so the `KafkaTopic` stays, keeps managing the topic
and every message stays — including messages a producer wrote before the stream existed. A
topic read through a `Connection` is never touched; the operator creates no `KafkaTopic` for it.

To delete the topic with the stream, create it with `deletionPolicy: Delete` (in its manifest
or bundle) or change it first:

```bash
kubectl -n <namespace> patch streamapp <name> --type merge -p '{"spec":{"deletionPolicy":"Delete"}}'
```

Then deleting the `StreamApp` deletes the `KafkaTopic` too, and Strimzi deletes the topic and
every message in it. A stream without the field is `Retain`, so an existing stream keeps its
messages after the upgrade.

The checkpoint in the object store stays; delete it in the bucket if the stream will never run
again.

## See streams from the command line

```bash
kubectl get streamapps -n <namespace>
```

## Deploy a stream from Git

A stream app can live in a bundle next to the pipelines, so the same pull request that changes a
pipeline can change its stream, and a reviewer sees both. Put the file anywhere the bundle's
`include` matches; `resources/measurements.yaml` is the usual place:

```yaml
kind: StreamApp
name: measurements
ownerGroup: sales
source: {topic: pegelonline.measurements}
sink: {catalog: "${var.catalog}", table: bronze.measurements, mode: merge, mergeKeys: [station]}
```

The file is not a pipeline: `sql`, `sqlFile`, `notebook`, `schedule` and `params` are refused.
`name`, `source.topic`, `sink.catalog` and `sink.table` are required; `sink.table` is
`schema.table` inside the sink catalog, not `catalog.schema.table`. Optional are `ownerGroup` (the
bundle's group is used when it says nothing), `source.connectionRef` (the name of a `Connection`
for an external Kafka — the topic is still required), `sink.mode` (`merge` or `append`),
`sink.mergeKeys` and `restartPolicy` (`always` or `on-failure`).

The commands are the ones that deploy pipelines; the stream's row appears among the pipeline rows
with its action, its kind and its name:

```bash
stardelt bundle plan shop -t prod
stardelt bundle deploy shop -t prod
```

```text
{"action": "would-create", "name": "measurements", "kind": "StreamApp"}
{"action": "created", "name": "measurements", "kind": "StreamApp"}
```

A `development` target deploys the stream under `dev-<your sign-in name>-<name>`
(`dev-alice-measurements`), so two people can try the same stream side by side; a `production`
target uses the name in the file. A deploy stamps the stream with the bundle, the target and the
revision (the commit, when the directory is a Git checkout). `stardelt bundle summary shop -t prod`
lists it with `"kind": "StreamApp"`. `--prune` removes a stream app of this bundle and target that
the bundle no longer names, and `destroy` removes every one the target deployed: a stream created by
hand or by another bundle is never touched.

The stream itself runs on the cluster as the `StreamApp` resource this page shows; the bundle is
how it gets there and how it changes. Every key of the file is in the
[Bundle reference](bundle-reference.md).

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
