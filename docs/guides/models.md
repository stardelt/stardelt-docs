---
title: "Connect a model endpoint"
sidebar_label: "Connect a model endpoint"
slug: /guides/models
---

# Connect a model endpoint

## What a model endpoint is

A **model endpoint** is a language model you already run, or that a provider runs for you, behind an
OpenAI-compatible HTTP API: a base URL, a model id and — when the server wants one — an API key. You
describe it once as a `ModelEndpoint` resource, and Nova calls that server. The platform ships no
model and runs no inference: your prompts go to the endpoint you named, under the key you gave it.

That resource is also the switch. With no `ModelEndpoint` in the platform namespace, no AI feature
of Nova is on; a person sees no assistant and nothing is sent anywhere.

## Apply it

An endpoint that takes a key:

```yaml
apiVersion: stardelt.io/v1alpha1
kind: ModelEndpoint
metadata:
  name: default
  namespace: stardelt
spec:
  url: https://llm.internal.example/v1
  model: qwen3-4b
  keyRef:
    name: llm-key
    key: api-key
  location: on-premise
  quota:
    perGroupMonthlyTokens: 2000000
    perPersonDailyTokens: 50000
```

A keyless server inside the cluster:

```yaml
apiVersion: stardelt.io/v1alpha1
kind: ModelEndpoint
metadata:
  name: default
  namespace: stardelt
spec:
  url: https://llm.internal.example/v1
  model: qwen3-4b
  location: on-premise
  quota:
    perGroupMonthlyTokens: 2000000
    perPersonDailyTokens: 50000
```

Save one as a file and apply it:

```bash
kubectl apply -f model-endpoint.yaml
```

`spec.url` is the OpenAI-compatible **base**: the calls go to `<url>/chat/completions` and
`<url>/models`, so a server that answers on `https://llm.internal.example/v1` is named with that
`/v1` and nothing after it. `spec.keyRef.name` is a `Connection` in the platform namespace whose
synced Secret holds the key, and `spec.keyRef.key` names the field inside it — see
[Connections and secrets](./connections.md). Leave `keyRef` out for a server that needs no key.

## Where the key goes

The key never reaches Nova's API. The kubelet projects it into Nova's pod as a file, and Nova reads
that file:

- **Operator:** nothing to do. Every `ModelEndpoint` that names a `keyRef` is put on the Nova
  Deployment's one projected volume, so the key file appears when you apply the resource.
- **Chart:** list the same mapping in `nova.modelKeys`, one entry per endpoint:
  `{endpoint: default, connection: llm-key, key: api-key}` (the commented example sits at
  `nova.modelKeys` in the chart's `values.yaml`). The chart mounts the same volume at the same path.

**Manifest install:** the Deployment in `manifests/nova-deployment.yaml` carries no model-key
volume, so a keyed endpoint cannot be used there — Nova starts without the file and the endpoint's
probe reports the refusal. Connect a keyless endpoint on that install, or install Nova with the
chart (`nova.modelKeys`) or the operator.

The file is `/var/run/stardelt/models/<endpoint>/key`, and it is readable only by Nova's process. A
rotated key arrives by itself, within about a minute of the Secret changing — there is no restart.
A `Connection` whose Secret is not synced yet only leaves the file absent; Nova still starts and the
probe says what is missing.

## Where prompts go

`spec.location` is what a person is told about their prompts:

- `on-premise` (the default) — the endpoint runs in your own network. Prompts do not leave it.
- `cloud` — the endpoint runs at a provider, so your prompts leave the cluster.

A `cloud` endpoint must use an `https://` URL; the resource is refused at apply time otherwise (the
CRD's validation rule). Say `on-premise` only when it is true: this field is shown to the people
whose prompts are sent.

`spec.sendRows` is `false` unless you set it. While it is off, query results are never sent to the
model: a question may carry the plan and the column names, not the rows.

## The probe

Nova checks each endpoint itself and writes the answer into its `status`, so you can see whether a
model is usable before anyone depends on it. One round sends three calls:

| Call | What it proves |
|---|---|
| A plain chat: `Reply with one short sentence about lakes.` | The endpoint answers at all. |
| The same chat with one tool, `sql_explain` | The endpoint returns a tool call — without it the model cannot ask for a query's plan. |
| The same chat asking for a JSON object with `sql` and `explanation` | The endpoint honours `response_format` — without it the model cannot answer in the shape the interface reads. |

A fourth request, `GET <url>/models`, is best effort: it only fills `status.contextTokens` from the
context window a server names there. The endpoint is usable only when both the tool call and the
JSON answer came back; `status.message` names the first that did not.

A new endpoint is probed within a minute. After that each one is probed once a day
(`NOVA_MODEL_PROBE_SECONDS`, clamped to 300–604800). To check now, an administrator can ask Nova:

```console
$ curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer <token>" \
    https://<nova host>/api/model-endpoints/default/probe
202
```

The answer is the endpoint as it is now, not the probe's result: a probe makes up to three calls of
up to two minutes each, so the route starts it and answers `202`. Read the row again in a moment, or
read the resource. The CRD defines no printer columns, so `get` shows the name and the age; the
status is read with `jsonpath` (the short name of the resource is `me`):

```console
$ kubectl -n stardelt get modelendpoints
NAME      AGE
default   3d
$ kubectl -n stardelt get modelendpoint default -o jsonpath='{.status}'
{"reachable":true,"toolCalling":true,"jsonOutput":true,"contextTokens":32768,"checkedAt":"2026-11-15T05:12:00Z"}
```

`checkedAt` is when the last probe finished; `reachable`, `toolCalling` and `jsonOutput` are what it
found; `message` says why an endpoint is not usable.

## How much a group may use

`spec.quota` sets the token budget:

- `perGroupMonthlyTokens` — the tokens one group may use in one calendar month.
- `perPersonDailyTokens` — the tokens one person may use in one day.
- Leave one out and that limit does not apply; leave both out and there is no limit.

Every call is recorded with the person, the group, the endpoint, the model, the token counts, how
long it took, how it ended, and the byte count and SHA-256 of the prompt and the answer — never the
text of either.

The limit is checked before each call. A call that would cross one is refused with `429` and a
sentence a person can read — for example "Your group used 2,015,000 of its 2,000,000 tokens this
month. Ask an administrator to raise the quota." Until the assistant asks, an administrator sets the
quota and reads the recorded numbers on the page below.

## Where to read the calls

**Admin → Models** (`/admin/models`) is the administrator's view of every endpoint and every call.
It has three parts:

- **The endpoints** — name, model, where prompts go (`on-premise`, or `cloud` with the warning that
  prompts leave the cluster), the purposes, what the probe last found (`Ready` or `Not ready`, with
  when it was checked and the status message that says what is missing) and **Probe now**, the same
  check as `POST /api/model-endpoints/{name}/probe`.
- **This month — `YYYY-MM`** — tokens in, tokens out and the number of calls, per group and
  endpoint, largest first. `(none)` is the probe's own rows and callers without a group. A count
  with "about" after it was estimated from the bytes sent (`ceil(bytes / 4)`) because the endpoint
  answered without a `usage` object.
- **Last calls** — newest first: when, the person (`sub`), the group, the feature (`ask`, `agent`,
  `probe`), the endpoint, the model, tokens in and out, the duration and the outcome (`ok`,
  `refused` or `error`). Choose 50, 100, 200 or 500 rows.

The page is administrator-only, and the same numbers are one API call away:
`GET /api/admin/model-usage` answers `{month, groups, calls}`; a non-administrator gets `403`. No
prompt and no answer text is in either view — the table stores sizes and hashes only.

Rows are pruned once an hour. `NOVA_MODEL_CALL_RETENTION_DAYS` keeps 30 days by default; `0` keeps
the rows and switches the purge off.

## When it does not work

Read `status.message` (or `message` in `GET /api/model-endpoints`) and match it here:

| `status.message` | What to do |
|---|---|
| `the endpoint answers but returned no tool call` | The model or the server in front of it does not call tools. Use another model. |
| `the endpoint answers but returned no JSON` | The server does not support `response_format`, or the model does not answer in that shape. Use another model or server; this one cannot drive the interface. |
| `503: …`, `502: …`, `404: …` | A non-2xx answer; the text after the code is the beginning of the server's own answer. Check the URL and its path, the model id the server knows, and whether the server is up. |
| `error sending request` or another transport error | Nova's pod could not open the connection. Check the DNS name, the port and whether the pod may reach it; the message carries no URL on purpose. |
| `checkedAt` is empty | The probe has not run yet — wait a minute. If it stays empty, Nova has no cluster connection (a local run or demo mode), so nothing probes the endpoint. |
| the key file is missing (`/var/run/stardelt/models/<endpoint>/key`) | The endpoint names a `keyRef` but no file was projected: check that the `Connection` exists in the platform namespace, that its Secret `conn-<connection>` holds the key named in `keyRef.key`, and — on the chart path — that `nova.modelKeys` has this endpoint. On a manifest install that volume does not exist at all: `kubectl -n stardelt get deploy nova -o jsonpath='{.spec.template.spec.volumes}'` answers an empty list, which is this limit, not a broken Connection. |

A keyless endpoint is probed too; an absent key file is only an error when the endpoint names one.

## What is not here yet

The resource, the key projection, the probe and the **Admin → Models** page are what exists today.
The page lists and probes endpoints and shows the calls; it does not create endpoints. The
assistant's panel in Nova and the agent proxy are later slices of the same design. Meanwhile the
resource is the interface: see the
[`ModelEndpoint` reference](../reference/resources/modelendpoint.md) for every field, and
[AI assistants (MCP)](./mcp.md) for the assistants that bring their own model.
