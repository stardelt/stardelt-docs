---
title: "Kafka (streaming bus)"
sidebar_label: "Kafka"
slug: /services/kafka
---

# Kafka (streaming bus)

**What it is.** A single Apache Kafka broker in KRaft mode, installed by the Strimzi operator. The streaming bus is opt-in and off by default.

**How to enable it.**

- **Dev install:** `make step-kafka` (installs the Strimzi operator and the broker).
- **Operator path:** set `spec.pillars.streaming: true` on a `PlatformInstance`.

**How apps reach it.** The client bootstrap address is `kafka-kafka-bootstrap.<namespace>.svc.cluster.local:9092`, **in-cluster only**. In this version there is no TLS and no Ingress (the same ClusterIP stance as [Spark Connect](spark)).

**What owns what.** A `StreamApp` reads one Kafka topic and writes one Iceberg table. `spec.stopped: true` stops the job and deletes its Spark application; the checkpoint is kept, so setting `spec.stopped: false` resumes from it.

**Delivery.** Keyed `merge` sinks are effectively-once. Append-only sinks are at-least-once. Credentials live in a `Connection`, never in a manifest.

**Not in this version.** Flink, CDC/Debezium, a schema registry and streaming SQL in Trino are not part of this version.

**Operating it.**

- **Install:** Opt-in. Enable it with `make step-kafka` or `spec.pillars.streaming: true`; nothing is installed by default.
- **Health check:** The broker reports `READY=True` (`kubectl -n <namespace> get kafka kafka`).
- **Backup:** No backup of its own; durable state lives in the Iceberg tables that streams write.
- **Logs:** Broker and operator logs come from the pods in the same namespace (Strimzi-managed).
