---
title: "Measure your own node"
sidebar_label: "Performance baseline"
slug: /operations/performance
---

# Measure your own node

The sizing numbers on [Running stardelt in production](./production) come from this harness, and
they are node-specific: CPU, memory, disks and the network between them decide what a query costs.
Run the baseline on the node you plan to use before you choose its size, and again after you change
it.

## What it measures

Engine wall time for three fixed TPC-H queries — `q1_aggregate`, `q6_filter` and `q3_join` — on the
`tpch` connector: planning, scheduling, execution and result paging, timed on the client from the
`POST /v1/statement` to the last `nextUri` page.

It measures the engine and nothing else. It does not measure permission overhead, Iceberg or
Lakekeeper, or Spark. The `tpch` and `tpcds` catalogs are administrator-only by design
(`helm-values/trino-identity.yaml`), so a run uses an administrator token and its numbers are the
engine's alone.

## Run it

Mint an administrator token with the existing script, then run the baseline:

```bash
MINT_ONLY=1 TOKEN_FILE=/tmp/perf.token \
  ISSUER=https://id.alpha.dev.stardelt.io/realms/stardelt \
  USER=<admin user> PASSWORD=<its password> \
  CLIENT_SECRET_FILE=<(kubectl -n stardelt get secret stardelt-oidc-clients -o jsonpath='{.data.trino}' | base64 -d) \
  python3 scripts/verify-trino-auth.py
TRINO_URL=https://trino.alpha.dev.stardelt.io TRINO_TOKEN="$(cat /tmp/perf.token)" \
  python3 perf/baseline.py
```

`make perf-baseline` runs `perf/baseline.py` with `TRINO_URL` and `TRINO_TOKEN` read from the
environment (`Makefile:131-132`). Credentials are never committed: the token file is temporary and
the secret is read from the cluster at mint time.

## Settings

| Variable | Default | Effect |
|---|---|---|
| `PERF_CATALOG` | `tpch` | the catalog the three queries run in |
| `PERF_SCHEMA` | `sf1` | the schema; `sf10` needs only `PERF_SCHEMA=sf10`, no code change |
| `PERF_RUNS` | `3` | runs per query; the first run of each is discarded (cold JVM, cache, S3 listing), and `PERF_RUNS=1` reports the single run as-is |
| `PERF_CONCURRENCY` | `1,2,4,8` | one table of N people running `q6_filter` at the same moment, with p50/p95/max and errors per level; `0` skips it |
| `PERF_PER_WORKER` | `5` | statements per person at each concurrency level |

## How to read it

The single-query table reports rows, median, p95 and min in milliseconds. The concurrency table
reports p50, p95, max, errors and wall time for each level. Read the level where p95 bends upwards:
that is the concurrency this node holds before people wait, and the number to size against.

Results are written to `perf/results/<UTC timestamp>.json` and are git-ignored. Tables for a release
belong in the internal repository, not in a pull request.

## What it does not replace

This is a baseline for one node, not a benchmark suite: it runs three fixed queries, with one
administrator identity, against a synthetic catalog. Re-run it after a resize, a node change or a
Trino upgrade. A broader benchmark suite is not available yet.
