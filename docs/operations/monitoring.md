---
title: "Monitor with your own Prometheus"
sidebar_label: "Monitoring"
slug: /operations/monitoring
---

# Monitor with your own Prometheus

The components that serve Prometheus text on a Service port answer in the platform namespace
(`stardelt` in the quickstart). The four CloudNative-PG databases are the exception: their
instance manager answers on a **pod** port, described under "Database pods" below. stardelt ships
no monitoring stack of its own: your Prometheus, or any compatible system, scrapes these
endpoints, stores the samples and alerts on them.

## What answers today

| Component | Address | First series | Notes |
|---|---|---|---|
| SeaweedFS master | `seaweedfs-master:9327/metrics` | `SeaweedFS_build_info` | |
| SeaweedFS filer | `seaweedfs-filer:9327/metrics` | `SeaweedFS_build_info` | |
| SeaweedFS volume | `seaweedfs-volume:9327/metrics` | `SeaweedFS_build_info` | several disks appear as labels |
| SeaweedFS S3 gateway | `seaweedfs-s3:9327/metrics` | `SeaweedFS_build_info` | bucket object counts and sizes |
| Keycloak | `keycloak:9000/metrics` | `http_server_bytes_written_max` | the management port, not `8080`; only a scraper-labelled pod may read it (`8080` is open for sign-in) |
| Lakekeeper | `lakekeeper:9000/metrics` | `lakekeeper_cache_invalidation_changes_total` | task queue and HTTP counters |
| OpenFGA | `openfga:2112/metrics` | `go_gc_duration_seconds` | needs `telemetry.metrics.enabled` (shipped on) |
| Reloader | `reloader-reloader:9090/metrics` | `reloader_events_processed_total` | |
| Spark operator | `spark-operator-metrics:8080/metrics` | `spark_application_running_count` | |
| The operator | `stardelt-operator-metrics:8082/metrics` | `stardelt_operator_build_info` | also `stardelt_operator_leader`, `stardelt_operator_reconcile_errors_total` |
| Airflow's statsd exporter | `airflow-statsd:9102/metrics` | `airflow_asset_orphaned` | Airflow sends statsd here; `statsd_exporter_lines_total` counts what arrived |
| Nova | `nova:8081/metrics` | `nova_build_info` | the internal listener; `8080` is the SPA and answers HTML |
| JupyterHub's hub | `hub:8081/hub/metrics` | `python_gc_objects_collected_total` | the only unauthenticated path on 8081; the hub API still needs a token |
| Spark Connect driver | `spark-connect:4040/metrics/executors/prometheus` | `spark_info` | the driver's UI port; the body has no `# TYPE` lines |
| OpenBao | `openbao:8200/v1/sys/metrics?format=prometheus` | `vault_core_active` | opt-in (`make openbao`); the path is not `/metrics` |

Every address in the table is a Service port in the platform namespace (`stardelt` in the
quickstart). A Prometheus that runs in another namespace needs the fully-qualified name,
`<service>.<namespace>.svc.cluster.local:<port>`, for example
`lakekeeper.stardelt.svc.cluster.local:9000`. All of them are HTTP `GET <address>/metrics`.

### Database pods

CloudNative-PG's instance manager answers on a **pod** port, not on a Service. Each of the four
platform databases — `lakekeeper-pg`, `openfga-pg`, `keycloak-pg`, `nova-pg` — serves Prometheus
text on `9187/metrics`; the first series are `cnpg_collector_up` and `cnpg_backends_waiting_total`.
The pods carry `cnpg.io/cluster: <name>` and the container port is named `metrics`.

A plain Prometheus has to scrape the pod IP. A Prometheus Operator selects the pods with a
`PodMonitor`; this one covers the catalog database:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: cnpg-lakekeeper-pg
  namespace: stardelt
spec:
  selector:
    matchLabels:
      cnpg.io/cluster: lakekeeper-pg
  podMetricsEndpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

Repeat it with the other three cluster names.

## Who may read them

Two groups. Most endpoints accept a request from any pod in the namespace; six are closed to
everything but a pod that carries the label `app.kubernetes.io/name: prometheus`, in any namespace —
the label the Prometheus Operator puts on its own pods:

- **Open to any pod in the namespace:** Reloader `9090`, the Spark operator `8080`, the operator
  `8082`, Airflow's statsd exporter `9102`, Nova `8081`, OpenBao `8200`.
- **Only a pod labelled `app.kubernetes.io/name: prometheus`:** Keycloak `9000`, SeaweedFS `9327`,
  Lakekeeper `9000`, OpenFGA `2112`, JupyterHub's hub `8081` (`/hub/metrics`), the Spark Connect
  driver `4040` at `spark-connect:4040/metrics/executors/prometheus`.

A plain pod gets `connection refused` on those six:

```text
$ curl -s -o /dev/null -w '%{http_code}\n' http://lakekeeper:9000/metrics      # plain pod
000   (connection refused)
$ curl -s -o /dev/null -w '%{http_code}\n' http://keycloak:9000/metrics       # plain pod
000   (connection refused)
```

Run the scraper with that label (`metadata.labels: {app.kubernetes.io/name: prometheus}` on the Pod
template) or the six endpoints stay dark.

Spark Connect is the one gated endpoint whose port is also a user interface: `4040` is the driver's
Spark UI as well as its metrics path, so a scraper-labelled pod can read its jobs, stages and
environment page. The page carries no credential values (they are redacted) and no SQL tab; the
Spark Connect gRPC port `15002` stays limited to members' notebooks.

Keycloak is the one gated endpoint whose other port is deliberately open in-cluster: every platform
component and the ingress controller must reach `8080` to sign in, so the policy restricts that port
only, and `8080` answers any source.

## Turn on the scrape objects

Nothing above needs a switch: the endpoints answer, and any Prometheus can scrape them with the
job you are about to write. The objects that make a **Prometheus Operator** pick them up
automatically are opt-in, because they are custom resources: a cluster without the
`monitoring.coreos.com/v1` CRDs cannot install them.

The umbrella chart renders them with:

```yaml
monitoring:
  enabled: true
  # Added to every rendered object, so your Prometheus selects them.
  labels:
    release: kube-prometheus-stack
```

A platform managed by the operator sets the same values in the resource:

```yaml
spec:
  monitoring:
    enabled: true
    labels:
      release: kube-prometheus-stack
```

With the switch on, stardelt creates one `ServiceMonitor` for each SeaweedFS role, one
`PodMonitor` for each of the four platform databases, and one `PrometheusRule` named
`stardelt-alerts` with these starter alerts: a metrics target is down (`StardeltMetricsTargetDown`),
the operator has no leader (`StardeltOperatorNoLeader`) or is failing reconciles
(`StardeltOperatorReconcileErrors`), the object store has no master
(`StardeltSeaweedFSMasterNotLeader`), a database stopped exporting metrics
(`StardeltCnpgCollectorDown`), and a database has clients waiting
(`StardeltCnpgClientsWaiting`).

The `labels` must match your Prometheus's selector — `serviceMonitorSelector`,
`podMonitorSelector` and `ruleSelector` — or the objects are created but never read. Every rule
carries `runbook_url: https://stardelt.io/docs/operations/monitoring/`.

If `spec.monitoring.enabled` is true and the CRDs are absent, the operator renders nothing and
reports the condition `MonitoringCRDsMissing` (reason `CRDsMissing`). The umbrella chart cannot
check the CRDs: `helm install` fails when they are missing, so leave the switch off there unless
the Prometheus Operator is installed.

## Scrape with a plain Prometheus

A scraper in the platform namespace can use the short names. A `scrape_configs` for all twelve
Service endpoints:

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
  - job_name: nova
    static_configs:
      - targets: ['nova:8081']
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
the table; the Service port is named `metrics` for most of them — Reloader's is `http`, Airflow's
statsd exporter's is `statsd-scrape`, and Nova's is `internal`. The label on the scraper Pod still
decides on the six gated endpoints: a monitor for Keycloak, SeaweedFS, Lakekeeper, OpenFGA,
JupyterHub's hub or the Spark Connect driver is read only when the Prometheus Pod carries
`app.kubernetes.io/name: prometheus`.

## What has no Prometheus endpoint

Each entry is what the endpoint answered on a probe pod, and where a credential stopped the probe
the entry says so.

- **Trino** — `trino:8080/metrics` answers `403` with "Authentication over HTTP is not enabled". The
  endpoint needs a Trino user with access to system information; not measured past the refusal.
- **Superset** — no endpoint: `superset:8088/metrics` is `404`.
- **Airflow's api-server** — no Prometheus endpoint: `/metrics` returns the UI page, and Airflow's
  metrics go to the statsd exporter in the table above.
- **JupyterHub's proxy** — no endpoint: `proxy-api:8001/metrics` is `404` once a probe carries the
  label its NetworkPolicy asks for (`hub.jupyter.org/network-access-proxy-api: true`); without it the
  connection is refused.

## Check the endpoints

`NS=stardelt make verify-metrics` creates one probe pod with the scraper label, curls every
installed Service target and prints one `✓` or `✗` line per endpoint, ending with `PASS (N of N)`.
It skips a component that is not installed, and it leaves no pod behind. The four database pods are
not part of it: they are pod ports, not Service ports, which is why this page shows their
`PodMonitor` by hand.

## What stardelt does not ship

No Prometheus, Grafana, Loki, Jaeger or alertmanager, and no dashboards. The scrape objects and the
six starter alerts are configuration, not a stack: they are rendered into your cluster only when
you turn them on, and your Prometheus reads them. [The licence table](../architecture/licenses)
lists what stardelt itself ships. The endpoints above are the whole contract —
[Production](./production) lists what else an operator team owns.
