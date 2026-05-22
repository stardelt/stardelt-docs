---
title: "Verify the stack with a smoke test"
sidebar_label: "Smoke test"
slug: /getting-started/smoke-test
---

# Verify the stack with a smoke test

Once `make up` is done and pods are `Running`, this page gives you the queries
to confirm the lakehouse slice is wired up correctly.

## Stage 1 — basic SQL works

The `make smoke` target runs Stage 1 acceptance: `CREATE`, `INSERT`, and
`SELECT` through Trino on an Iceberg table backed by SeaweedFS.

Run it from `stardelt-demos`:

```bash
make smoke
```

Or do it manually inside the Trino coordinator:

```bash
kubectl -n stardelt exec -it deploy/trino-coordinator -- trino
```

In the Trino shell:

```sql
SHOW CATALOGS;                                  -- warehouse + system/tpch/tpcds
SHOW SCHEMAS FROM warehouse;
SELECT * FROM warehouse.smoke.t;                -- Stage 1 smoke row
```

## Stage 2 — NYC taxi data

After `make airflow-trigger` has finished, you should see ~38 M rows for one
year of yellow-taxi data:

```sql
SELECT COUNT(*) FROM warehouse.nyc_taxi.yellow_trips;
SELECT pickup_year_month, COUNT(*), ROUND(AVG(fare_amount), 2)
  FROM warehouse.nyc_taxi.yellow_trips
  GROUP BY 1 ORDER BY 1;
```

## Lakekeeper management API

After `make pf` you can hit the Lakekeeper management API directly:

```bash
curl http://localhost:8181/management/v1/info        # bootstrapped: true
curl http://localhost:8181/management/v1/warehouse   # one warehouse, on s3://lakehouse/warehouse
```

If any of these queries fail or return unexpected results, check the engineer
notes in the [implementation log](../developer/implementation-log) — it
captures the gotchas we hit while wiring this up.
