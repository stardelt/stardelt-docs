---
title: "Airflow for group members"
sidebar_label: "Airflow for group members"
---

# Airflow for group members

## Signing in

The Airflow UI is at `https://airflow.<base domain>`. Sign in with the same Keycloak account you use for Nova — no separate Airflow password. `stardelt-admins` is synced to Airflow's `Admin` at every sign-in; everyone else is `stardelt-member`.

## What you see

The DAGs you see are those of your groups. A member of `mobility-analytics` sees `stardelt__mobility-medallion` (and the group's other pipelines). A person in no use-case group sees an empty list; administrators see everything. The DAG id is `stardelt__<pipeline name>`.

## Why a DAG is missing

A DAG may be missing for one of these reasons:

- The pipeline has no `ownerGroup` (administrators only).
- You are not in the owning group.
- The DAG was published less than about 25 seconds ago.
- The group role does not exist yet (the sync Job runs every five minutes).

If it is still missing, ask an administrator to check `stardelt-group-<group>` in `airflow roles list`.

## Nova or Airflow

Nova is where people run pipelines: **Run now**, **Pause**, **Resume** and **Stop run** act through Nova's service identity, so a group member needs no separate Airflow password, and every action is checked against the group that owns the pipeline first. **Graph in Airflow ↗** opens the Airflow graph, Gantt view and task logs; the Airflow UI is an optional advanced view for the same runs.

## What you may do

Read and edit (pause, trigger) your group's DAGs and read/create their runs. No delete — deleting a pipeline is a Nova action on the `Pipeline` resource. Leaving the group takes effect at your next sign-in.

## Notebooks and Spark

A notebook that calls `stardelt.spark()` needs the pipeline principal's token to carry the `lakekeeper` audience (the `ServicePrincipal` default is `[trino, lakekeeper]`; see the [reference](../reference/resources/serviceprincipal) and [Service principals](./service-principals)).
