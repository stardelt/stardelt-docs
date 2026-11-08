---
title: "Kafka (streaming bus)"
sidebar_label: "Kafka"
slug: /services/kafka
---

# Kafka (streaming bus)

**What it is.** A single Apache Kafka broker in KRaft mode, installed by the Strimzi operator. The streaming bus is opt-in and off by default.

**How to enable it.**

- **Dev install:** `make step-kafka` installs the Strimzi operator and the broker; `make step-spark-operator` installs the Kubeflow Spark Operator that runs a `StreamApp`. Both are needed — without the Spark Operator a `StreamApp` stays `Pending` and no driver pod appears.
- **Operator path:** set `spec.pillars.streaming: true` on a `PlatformInstance`; it installs the same two pieces for you.

**How apps reach it.** The client bootstrap address is `kafka-kafka-bootstrap.<namespace>.svc.cluster.local:9092`, **in-cluster only**. In this version there is no TLS and no Ingress (the same ClusterIP stance as [Spark Connect](spark)).

**What owns what.** A `StreamApp` reads one Kafka topic and writes one Iceberg table. `spec.stopped: true` stops the job and deletes its Spark application; the checkpoint is kept, so setting `spec.stopped: false` resumes from it.

A `StreamApp` also declares a Strimzi `KafkaTopic` for its source topic: the object
is named after the topic when Kubernetes allows it (otherwise `stream-<name>`),
with one partition, one replica and seven-day retention. The operator never
changes an existing topic: if a `KafkaTopic` already manages the same topic with
the same spec, it writes nothing; with a different spec, it leaves that topic in
place and logs a warning. Create the `KafkaTopic` yourself before the stream when
you need more partitions or another retention. A stream that reads an external
Kafka through `source.connectionRef` declares no topic at all.

**Delivery.** Keyed `merge` sinks are effectively-once. Append-only sinks are at-least-once. Credentials live in a `Connection`, never in a manifest.

**Not in this version.** Flink, CDC/Debezium, a schema registry and streaming SQL in Trino are not part of this version.

**Operating it.**

- **Install:** Opt-in. Enable it with `make step-kafka && make step-spark-operator`, or with `spec.pillars.streaming: true`; nothing is installed by default.
- **Health check:** two checks, because the broker can be Ready while its controller is restarting.
  `kubectl -n <namespace> get kafka kafka` must print `READY=True`, and
  `kubectl -n <namespace> get pods -l name=strimzi-cluster-operator` must show `1/1` with **0
  restarts**. A non-zero restart count means topic and broker changes are not being reconciled,
  even though `get kafka` stays green (stardelt/stardelt-platform#665).
- **Spark runtime:** `kubectl -n <namespace> get deploy spark-operator-controller spark-operator-webhook` must print `1/1` for both. The controller must watch the namespace a `StreamApp` lives in: `kubectl -n <namespace> get deploy spark-operator-controller -o jsonpath='{.spec.template.spec.containers[0].args}'` carries `--namespaces=""` (all namespaces) or the namespace in the list. A stream in a namespace the controller does not watch never runs; `make verify-streaming` checks this and names it `spark-operator`.
- **Backup:** No backup of its own; durable state lives in the Iceberg tables that streams write.
- **Logs:** `kubectl -n <namespace> logs deploy/strimzi-cluster-operator` for the controller;
  broker logs come from the `kafka-kafka-0` pod (`-c kafka`) in the same namespace.
