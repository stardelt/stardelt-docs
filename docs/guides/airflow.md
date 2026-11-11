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

Nova is where people run pipelines: **Run now**, **Pause**, **Resume** and **Stop run** act through Nova's service identity, so a group member needs no separate Airflow password, and every action is checked against the group that owns the pipeline first. The Airflow UI is a read-only view of the same runs: **Graph in Airflow ↗** opens the graph, the Gantt view and the task logs. Nothing can be started or paused there.

## What you may do

Read your group's DAGs and their runs, graphs and task logs. Run, pause, resume and stop a pipeline in Nova, or with `stardelt run` and the API. Deleting a pipeline is a Nova action on the `Pipeline` resource. Leaving the group takes effect at your next sign-in.

## What a pipeline is, and is not

A pipeline is a `Pipeline` resource: tasks, their order, a schedule, parameters, retries and a time limit. The platform checks it before it runs and runs it as your group's service identity.

It is not a program. It has no branching, no loops over data, no values passed between tasks and no sensors. Logic of that kind belongs inside a task: a SQL statement or a notebook.

You cannot add DAG files of your own to the platform's Airflow. If your team already runs an orchestrator, let it start a pipeline and wait for it: `stardelt run <namespace> <name> --wait` exits 0 only when the run succeeded. See [SDK, CLI and MCP](sdk-cli-mcp.md).

## Notebooks and Spark

A notebook that calls `stardelt.spark()` needs the pipeline principal's token to carry the `lakekeeper` audience (the `ServicePrincipal` default is `[trino, lakekeeper]`; see the [reference](../reference/resources/serviceprincipal) and [Service principals](./service-principals)).
