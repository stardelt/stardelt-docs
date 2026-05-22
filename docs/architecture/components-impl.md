---
title: "Components — implementation detail"
sidebar_label: "Components — impl"
slug: /architecture/components-impl
---

# Components — implementation detail

Sidecar of [Components](./components). This page captures the engineering
detail that doesn't belong on the human-facing components page — what's
actually pinned in MVP charts, and what's only a "verified live in Phase 0
research" mark vs. running in the current MVP.

## What's actually pinned in MVP

The components table on the human page is the **target** inventory. The MVP
running on a kind cluster pins a much smaller subset:

| Slot | Component | Chart / image version | Notes |
|---|---|---|---|
| Object storage | SeaweedFS | `seaweedfs/seaweedfs` 4.25.1 | Primary S3-compatible store for the MVP |
| Catalog | Lakekeeper | `lakekeeper/lakekeeper` 0.11.0 | Bundled OpenFGA disabled (`authz.backend: allowall`) |
| Lakekeeper DB | CNPG | `cnpg/cloudnative-pg` 0.28.2 | Single-instance Postgres for Lakekeeper metadata |
| MPP SQL | Trino | `trino/trino` 1.42.2 (appVersion 480) | Coordinator + 1 worker, 2 GiB heap each |
| Orchestration | Airflow | `stardelt/airflow:dev` from `slim-3.2.0-python3.12` | KubernetesExecutor; providers baked in |
| BI | Superset | `stardelt/superset:dev` from `apachesuperset:5.0.0` | Trino + psycopg2 baked in |

Chart versions are pinned in two places (`stardelt-platform/Makefile` and
`stardelt-demos/kind/up.sh`) and must be kept in sync.

## Verification status

The `✓` (verified live during Phase 0 research) vs. `◯` (from research; re-verify
before release) symbols on the human page describe **license**-verification
status, not "currently running" status. The two are independent:

- Lakekeeper, RisingWave, OpenBao, SeaweedFS, Trino-via-chart are live in MVP.
- Most other entries are inventory we plan to compose; license re-verification
  happens at release time per the matrix on the human page.
