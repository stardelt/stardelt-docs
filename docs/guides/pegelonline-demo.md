---
title: "A demo that updates itself: PEGELONLINE"
sidebar_label: "Live demo: PEGELONLINE"
slug: /guides/pegelonline-demo
---

# A demo that updates itself: PEGELONLINE

## What runs

The hourly Airflow DAG `pegelonline_hourly` in `stardelt-demos/dags/pegelonline_hourly.py` fetches the German waterway gauge API (PEGELONLINE, public JSON, no key). Rows are appended with pyiceberg to the Iceberg table `shared.bronze.pegelonline_measurements`, partitioned by day on `measured_at`.

The platform's own warehouse is not used: the DAG overrides the pyiceberg `warehouse` property to the `shared` catalog.

Schema (15 columns, in order):

- `station_uuid`
- `station_number`
- `station_name`
- `water`
- `agency`
- `km`
- `latitude`
- `longitude`
- `timeseries`
- `unit`
- `measured_at`
- `measurement_value`
- `state_mnw_mhw`
- `state_nsw_hsw`
- `ingested_at`

## Enable it

The DAG ships paused (Airflow's default for a new DAG), so nothing is written until it is turned on.

For a platform installed from this repository, unpause it in the scheduler:

```bash
kubectl -n stardelt exec deploy/airflow-scheduler -c scheduler -- \
  airflow dags unpause pegelonline_hourly
```

You can do the same in the Airflow UI at the platform's Airflow host.

## Check it

List the DAG runs in the scheduler:

```bash
kubectl -n stardelt exec deploy/airflow-scheduler -c scheduler -- \
  airflow dags list-runs pegelonline_hourly -o plain
```

Each run appears as a row; `state` reaches `success` when the data has landed.

In Nova's SQL editor, check the table:

```sql
SELECT count(*) AS rows, max(measured_at) AS newest, max(ingested_at) AS landed
FROM shared.bronze.pegelonline_measurements;
```

## See it change

The schedule is `7 * * * *` (seven minutes past every hour), so `newest` advances once an hour and `landed` is the run's own time.

For the modelling steps onward, see [From source to dashboard](source-to-dashboard).

## The same rows on the bus

The DAG also publishes each fetched row to the [bus](../services/kafka) on the topic
`pegelonline.measurements`. A `StreamApp` reads that topic and writes
`mobility.bronze.pegelonline_stream`, merging on `(station_uuid, timeseries, measured_at)`.

The example lives in `stardelt-demos/examples/pegelonline/`:

- `streamapp.yaml` — the `StreamApp` (topic in, Iceberg table out, `ownerGroup:
  mobility-analytics`);
- `sink.sql` — the target table, with the same 15 columns and both timestamps;
- `README.md` — the two apply commands.

Apply the table first, then the stream:

```bash
kubectl -n stardelt apply -f examples/pegelonline/sink.sql   # or run it in Nova's SQL editor
kubectl -n stardelt apply -f examples/pegelonline/streamapp.yaml
```

Check that rows arrive in Nova's SQL editor:

```sql
SELECT count(*) AS rows, max(measured_at) AS newest
FROM mobility.bronze.pegelonline_stream;
```

The stream starts from the topic's earliest offset (`startingOffsets: earliest`), so the first
run reads the whole retained topic. Follow it on the [Streams page](streams); stopping it
keeps the checkpoint.

## Why bronze only

The demo stops at bronze so the streaming path and the hourly path can be compared row for
row. Modelling onward is the [source-to-dashboard](source-to-dashboard) guide's job.
