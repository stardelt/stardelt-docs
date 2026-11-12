---
title: "Monitor with your own Prometheus"
sidebar_label: "Monitoring"
slug: /operations/monitoring
---

# Monitor with your own Prometheus

Every component of an install that can expose Prometheus text does, and each does it on a Service
port in the platform namespace. stardelt ships no monitoring stack of its own: your Prometheus, or
any compatible system, scrapes these endpoints, stores the samples and alerts on them.

## What answers today

| Component | Address | First series | Notes |
|---|---|---|---|
| SeaweedFS master | `seaweedfs-master:9327/metrics` | `SeaweedFS_build_info` | |
| SeaweedFS filer | `seaweedfs-filer:9327/metrics` | `SeaweedFS_build_info` | |
| SeaweedFS volume | `seaweedfs-volume:9327/metrics` | `SeaweedFS_build_info` | several disks appear as labels |
| SeaweedFS S3 gateway | `seaweedfs-s3:9327/metrics` | `SeaweedFS_build_info` | bucket object counts and sizes |
| Keycloak | `keycloak:9000/metrics` | `http_server_bytes_written_max` | the management port, not `8080` |
| Lakekeeper | `lakekeeper:9000/metrics` | `lakekeeper_cache_invalidation_changes_total` | task queue and HTTP counters |
| OpenFGA | `openfga:2112/metrics` | `go_gc_duration_seconds` | needs `telemetry.metrics.enabled` (shipped on) |
| Reloader | `reloader-reloader:9090/metrics` | `reloader_events_processed_total` | |
| Spark operator | `spark-operator-metrics:8080/metrics` | `spark_application_running_count` | |
| The operator | `stardelt-operator-metrics:8082/metrics` | `stardelt_operator_build_info` | also `stardelt_operator_leader`, `stardelt_operator_reconcile_errors_total` |
| Airflow's statsd exporter | `airflow-statsd:9102/metrics` | `airflow_asset_orphaned` | Airflow sends statsd here; `statsd_exporter_lines_total` counts what arrived |

Every address is a Service port in the platform namespace (`stardelt` in the quickstart). A
Prometheus that runs in another namespace needs the fully-qualified name,
`<service>.<namespace>.svc.cluster.local:<port>`, for example
`lakekeeper.stardelt.svc.cluster.local:9000`. All of them are HTTP `GET <address>/metrics`.

## Who may read them

Two groups. Most endpoints accept a request from any pod in the namespace; three are closed to
everything but a pod that carries the label `app.kubernetes.io/name: prometheus`, in any namespace —
the label the Prometheus Operator puts on its own pods:

- **Open to any pod in the namespace:** Keycloak `9000`, Reloader `9090`, the Spark operator `8080`,
  the operator `8082`, Airflow's statsd exporter `9102`.
- **Only a pod labelled `app.kubernetes.io/name: prometheus`:** SeaweedFS `9327`, Lakekeeper `9000`,
  OpenFGA `2112`.

A plain pod gets `connection refused` on those three:

```text
$ curl -s -o /dev/null -w '%{http_code}\n' http://lakekeeper:9000/metrics      # plain pod
000   (connection refused)
$ curl -s -o /dev/null -w '%{http_code}\n' http://keycloak:9000/metrics       # plain pod
200
```

Run the scraper with that label (`metadata.labels: {app.kubernetes.io/name: prometheus}` on the Pod
template) or the three endpoints stay dark.

## Scrape with a plain Prometheus

A scraper in the platform namespace can use the short names. A `scrape_configs` for all eleven
endpoints:

```yaml
scrape_configs:
  - job_name: seaweedfs
    static_configs:
      - targets:
          - seaweedfs-master:9327
          - seaweedfs-filer:9327
          - seaweedfs-volume:9327
          - seaweedfs-s3:9327
  - job_name: keycloak
    static_configs:
      - targets: ['keycloak:9000']
  - job_name: lakekeeper
    static_configs:
      - targets: ['lakekeeper:9000']
  - job_name: openfga
    static_configs:
      - targets: ['openfga:2112']
  - job_name: reloader
    static_configs:
      - targets: ['reloader-reloader:9090']
  - job_name: spark-operator
    static_configs:
      - targets: ['spark-operator-metrics:8080']
  - job_name: stardelt-operator
    static_configs:
      - targets: ['stardelt-operator-metrics:8082']
  - job_name: airflow-statsd
    static_configs:
      - targets: ['airflow-statsd:9102']
```

Every address answers `/metrics`, so `metrics_path` stays at its default. The scraper's Pod needs the
label above, or SeaweedFS, Lakekeeper and OpenFGA are refused.

## Scrape with the Prometheus Operator

A `ServiceMonitor` selects the Service by its labels and by its named port. This one covers
Lakekeeper:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: lakekeeper
  namespace: stardelt
  labels:
    prometheus: main
spec:
  namespaceSelector:
    matchNames: ['stardelt']
  selector:
    matchLabels:
      app.kubernetes.io/name: lakekeeper
      app.kubernetes.io/component: catalog
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

The labels on the monitor itself (`prometheus: main` above) must match your Prometheus's
`serviceMonitorSelector`, or the monitor is never picked up. The same shape works for every row of
the table; the Service port is named `metrics` for most of them — Reloader's is `http` and Airflow's
statsd exporter's is `statsd-scrape`. The label on the scraper Pod still decides on the three gated
endpoints: a monitor for SeaweedFS, Lakekeeper or OpenFGA is read only when the Prometheus Pod
carries `app.kubernetes.io/name: prometheus`.

## What has no Prometheus endpoint

Each entry is what the endpoint answered on a probe pod, and where a credential stopped the probe
the entry says so.

- **Trino** — `trino:8080/metrics` answers `403` with "Authentication over HTTP is not enabled". The
  endpoint needs a Trino user with access to system information; not measured past the refusal.
- **JupyterHub's hub** — `hub:8081/hub/metrics` answers `403`: the chart requires a token unless
  `hub.authenticatePrometheus` names a user. The hub's NetworkPolicy admits only pods labelled
  `hub.jupyter.org/network-access-hub: true` and Nova, so a plain scraper gets `connection refused`
  instead; not measured past the refusal.
- **OpenBao** — `openbao:8200/v1/sys/metrics?format=prometheus` answers `403`
  `{"errors":["permission denied"]}`. It needs a token unless the listener enables unauthenticated
  metrics.
- **Superset** — no endpoint: `superset:8088/metrics` is `404`.
- **Airflow's api-server** — no Prometheus endpoint: `/metrics` returns the UI page, and Airflow's
  metrics go to the statsd exporter in the table above.
- **JupyterHub's proxy** — no endpoint: `proxy-api:8001/metrics` is `404` once a probe carries the
  label its NetworkPolicy asks for (`hub.jupyter.org/network-access-proxy-api: true`); without it the
  connection is refused.
- **Nova** — Nova's numbers are in its API (`GET /api/catalog/metrics`, catalog statistics for the
  UI), not in Prometheus text.

## What stardelt does not ship

No Prometheus, Grafana, Loki, Jaeger or alertmanager, and no starter dashboards or alert rules. Your
own stack scrapes, stores, alerts and draws the dashboards; [the licence table](../architecture/licenses)
lists what stardelt itself ships. The endpoints above are the whole contract —
[Production](./production) lists what else an operator team owns.
