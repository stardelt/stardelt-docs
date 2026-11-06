---
title: "Quickstart"
sidebar_label: "Quickstart"
slug: /getting-started/quickstart
---

# Quickstart

Install the core of stardelt on a cluster, load a small file, and query it. It takes about 15 minutes,
most of it waiting for images.

**You need:** a Kubernetes cluster with a node of at least 4 vCPU and 8 GB and a default StorageClass,
plus `kubectl`, `helm` 3.18 or newer, and `git`. No cluster? Create one with the
[Hetzner guide](./hetzner-k3s), step 1.

:::caution No sign-in in this install
This install has no sign-in and no permissions, which keeps it simple. Reach it only through the
port-forward below, and do not load real data.
:::

## 1. Install the core

Check that `kubectl` points at the right cluster, then install:

```bash
kubectl config current-context

git clone https://github.com/stardelt/stardelt-platform
cd stardelt-platform
helm dependency build chart

helm upgrade --install stardelt chart \
  --namespace stardelt --create-namespace \
  -f chart/values-slim.yaml --wait --timeout 15m
```

This installs object storage, the catalog, the SQL engine and Nova, the interface. When it returns,
every pod should be `Running` or `Completed`:

```bash
kubectl -n stardelt get pods
```

## 2. Open Nova

```bash
kubectl -n stardelt port-forward svc/nova 8080:8080
```

Leave that running and open http://localhost:8080.

## 3. Load a file

Save this as `cities.csv`:

```text
city,country,population
Berlin,DE,3700000
Paris,FR,2100000
Madrid,ES,3300000
```

In Nova, open **Load & transfer**. Choose the file, enter the schema `demo` and the table `cities`, and
load it.

## 4. Query it

Open **SQL editor** and run:

```sql
SELECT country, sum(population) AS people
FROM warehouse.demo.cities
GROUP BY country
ORDER BY people DESC;
```

You have just written an Iceberg table to object storage and read it back through Trino. Open
**Catalog** to see the table and its columns, and **Query log** to see the query you ran.

## 5. Clean up

```bash
helm uninstall stardelt -n stardelt
kubectl delete namespace stardelt     # also deletes the data
```

## Next steps

- Something went wrong? See [Troubleshooting](../operations/troubleshooting).
- Want sign-in, schedules, notebooks and dashboards? Choose an install in
  [Prerequisites](./prerequisites).
- Ready to work with real sources? Follow [From source to dashboard](../guides/source-to-dashboard).
