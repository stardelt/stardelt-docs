---
title: "Python in notebooks and scripts"
sidebar_label: "Python"
slug: /guides/python
---

# Python in notebooks and scripts

You need the stardelt package, signed in: see [Python, command line and agents](sdk-cli-mcp.md).

## Python

```python
import stardelt

nova = stardelt.api.Client()
nova.call("table_history", path={"ns": "demo", "tbl": "trips"})
nova.call("pipelines_run_trigger", path={"namespace": "etl", "name": "nyc_taxi"})
```

`call` takes the operation id, the values of the path, the query parameters and the JSON body, and returns the parsed answer.
A missing or unexpected path value is an error before any request is sent.

Every operation is also a method, grouped by resource, so a notebook can complete the names with the Tab key:

```python
nova.ops.pipelines.list()
nova.ops.pipelines.get(namespace="etl", name="nyc_taxi")
nova.ops.query.log_list(scope="mine", state="FAILED", limit=20)
dir(nova.ops)                    # the resources; dir(nova.ops.pipelines) lists the verbs
```

The keyword arguments are the path and query parameters of the operation, `body=` is the JSON body, and a wrong name is an
error that lists the accepted ones before any request is sent.
