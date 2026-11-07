---
title: "Current generation only"
sidebar_label: "Current generation only"
slug: /architecture/current-generation
---

## The rule

Every component is current-generation, cloud-native open source, so nothing is carried along for compatibility with a 2010s stack. The platform is built from parts that are actively developed and fit a Kubernetes cluster. New components must meet the same bar.

## What that means today

| Area | stardelt uses | What it leaves behind |
|---|---|---|
| Storage | S3 object storage (SeaweedFS, or your own S3) | HDFS |
| Tables | Apache Iceberg | Hive-style directories of files |
| Catalog | Iceberg REST catalog (Lakekeeper, written in Rust) | the Hive Metastore |
| Compute | Spark Connect (client and server) | spark-submit on YARN |
| SQL | Trino | SQL on MapReduce |
| Streaming | Kafka in KRaft mode, installed by an operator | ZooKeeper |
| Orchestration | Airflow 3 | cron files and XML workflows |
| Identity | OIDC (Keycloak or your own provider), OpenFGA relationships, OPA policies | Kerberos, per-service user lists |
| Secrets | OpenBao and External Secrets | passwords in config files |
| Databases | PostgreSQL run by CloudNativePG | hand-managed database VMs |
| Control plane | Nova (Rust/axum API, React UI) and an operator in Rust (kube-rs) | install scripts on VMs |

## The test for a new component

All of these must hold, alongside the [license policy](licenses):

1. a permissive license (see the license policy);
2. actively developed: a release in the last 6 months, and contributions from outside one person or company;
3. Kubernetes-native: runs as containers, is configured declaratively, keeps its state in a database or object storage we already run;
4. open standards at the edges: Iceberg / Iceberg REST, S3, OIDC, OpenLineage, Arrow where it applies;
5. no dependency on HDFS, YARN, ZooKeeper, the Hive Metastore or Kerberos, and no Java runtime older than 21 in images we build.

## What we do when something ages

We replace it in a later milestone, through an issue labelled `architecture`.
