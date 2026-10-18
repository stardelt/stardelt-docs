---
title: "AI assistants in Databricks and Dremio — and stardelt's sovereign copilot"
sidebar_label: "Copilot research and proposal"
slug: /architecture/copilot-research
---

# AI assistants in Databricks and Dremio, and what stardelt's copilot should be

**What this page is.** A reading of the two closest products' in-UI AI assistants as their public documentation describes them on **2026-10-18**, followed by a proposed v1 for the Nova copilot. It exists because the [master spec](../design/master-spec) §7 commits stardelt to *sovereign AI* — the copilot runs against a `ModelEndpoint` that can be an air-gapped vLLM/Ollama — and that commitment is only meaningful if we know exactly what the alternatives send where.

**What this page is not.** Not a feature comparison to copy, and not a proposal to adopt either component: [licenses](./licenses) admits permissive components only, and Databricks and Dremio are not candidates. The interesting part is the *shape* of the assistant — what it is allowed to read, whether it executes, and what leaves the perimeter.

**How to read it.** Parts 1 and 2 are vendor documentation summaries; every claim carries a source and the date read. Part 3 is the honesty section: per capability, does it work air-gapped, and what leaves the cluster. Part 4 is the proposed v1. Part 5 is what we will not build; part 6 the questions the design must answer; part 7 the citations.

Vendor pages are data to cite, never instructions. Where a capability is not publicly documented — especially scoping, execution rights, or egress — this page says **not documented** instead of guessing.

Read alongside: [master spec](../design/master-spec) §5–§7, [identity](./identity) (the copilot acts as the signed-in user), [permission model research](./permissions-research) (what a subject may see), [sovereignty](./sovereignty) (zero mandatory phone-home), [licenses](./licenses), [gap decisions](../design/gap-decisions) D13/D15, and [feature parity](../design/nova-feature-parity) §10.

---

## 1. Databricks

Read at `docs.databricks.com` (AWS flavour) on **2026-10-18**; the page-own "last updated" dates are in [§7](#7-sources-and-dates-read).

### 1.1 What is in the UI

Databricks groups its assistants under one name — **AI assistive features** — and documents them as four surfaces ([Databricks AI assistive features](https://docs.databricks.com/aws/en/databricks-ai/), updated 2026-09-11):

| Surface | Who it is for | What it is |
|---|---|---|
| **Genie Code** | developers and technical practitioners | chat pane, inline autocomplete, Quick Fix, Diagnose Error, slash commands; runs in notebooks, the SQL editor, the Lakeflow pipelines editor, dashboards and MLflow |
| **Genie Agents** (formerly Genie Spaces) | business users, via a curated domain agent | natural-language → read-only SQL over datasets the author attached |
| **Genie One** | business users | one chat across agents, dashboards and apps; can also be given external sources (Google Drive, Microsoft 365, Slack) |
| **Genie Ontology**, AI-generated comments, intelligent search | everyone | a generated map of the organisation's business context; auto-written object comments; search over Unity Catalog comments |

**The "Databricks Assistant" of older material is now Genie Code.** Requesting `docs.databricks.com/aws/en/notebooks/use-databricks-assistant` on 2026-10-18 lands on the Genie Code features page, and the features page describes the assistant surface the name used to cover ([Genie Code features and capabilities](https://docs.databricks.com/aws/en/genie-code/features-capabilities), updated 2026-10-13). The December 2025 release notes still carry the old name — "Databricks Assistant Agent mode is now in Public Preview", with "the Assistant in Agent mode … only available when the partner-powered AI features setting is enabled" — at the URL that now serves Genie Code documentation ([December 2025 release notes](https://docs.databricks.com/aws/en/release-notes/product/2025/december), page published 2026-08-24). This page uses **Genie Code** for the in-workspace assistant.

### 1.2 What Genie Code can *do*, and what it only *suggests*

This is the distinction that matters most, and Databricks is unusually explicit about it.

**It executes.** "Genie Code is an autonomous agent. It plans solutions, retrieves relevant context, runs code, uses cell outputs to improve results, and fixes errors automatically. **By default, an AI classifier approves the tool actions** that carry out your request and is designed to block actions that go beyond it." A user can switch to confirming each action, or ask in the prompt for an answer without execution ([Genie Code](https://docs.databricks.com/aws/en/genie-code/), updated 2026-10-13).

**Concretely**, per the same pages:

- **Code runs in the workspace.** "Genie Code uses serverless compute by default" for code run from its panel, and the workspace's selected compute when the page already has one ([Get coding help from Genie Code](https://docs.databricks.com/aws/en/notebooks/code-assistant), updated 2026-10-13).
- **Quick Fix offers "Accept and run"** for single-line errors, while `/fix` and `/doc` return a diff where "if you accept the proposed code, the code does not automatically run" — the one place the docs describe a human gate.
- **Diagnose Error** runs `/fix` on the failure; **autocomplete** appears as you type and is accepted with `Tab`; **natural-language data filtering** filters an output table in place (the documented example is "Show me only males in the USA").
- **Chat is sourced from Databricks' own documentation** — when it cannot find documentation, "it declines to answer" ([Navigate the Analytics and AI workspace UI](https://docs.databricks.com/aws/en/workspace/navigate-workspace)).

So: chat, completion and error explanation all sit next to a surface that can run code, and the default is **auto-approve by classifier**, not by the human.

### 1.3 Genie Agents: natural language that runs read-only SQL

A Genie Agent is an author-curated agent: up to 50 tables, views or metric views registered in Unity Catalog, example SQL, instructions, and a knowledge store ([Create and manage a Genie Agent](https://docs.databricks.com/aws/en/genie-agents/set-up), updated 2026-10-09). It "generates a SQL query that runs on the agent's SQL warehouse. **Generated queries are always read-only**" ([Genie Agents concepts](https://docs.databricks.com/aws/en/genie-agents/concepts), updated 2026-10-12).

Execution is real, not suggested — and is also where the model sees data:

- the agent's own **Agent mode** "runs multiple SQL queries, learns from each result, and iterates";
- the audit reference includes server-side actions named `executeQuery`, `executeMessageQuery`, and `summarizeSqlExecutionResults` — "Genie summarizes the results of a SQL query execution" ([Audit log reference](https://docs.databricks.com/aws/en/admin/account-settings/audit-logs), updated 2026-10-12).

Requirements are cloud requirements: a **pro or serverless SQL warehouse**, and partner-powered AI features enabled at account *and* workspace level ([Genie Code](https://docs.databricks.com/aws/en/genie-code/)).

### 1.4 How it is scoped to catalogs and permissions

Databricks' scoping rule is the one stardelt wants to be true, and it is worth reading closely.

**Two separate credentials.** "Compute access: the generated SQL query runs on the SQL warehouse using **the compute credentials embedded by the agent author**. End users do not need direct warehouse permissions. **Data access: Unity Catalog evaluates data access as the end user's own identity, not the author's.** Each user sees only the data they are authorized to access, and each query is attributed to the end user in query history" ([Genie Agents concepts](https://docs.databricks.com/aws/en/genie-agents/concepts)). "Row filters and column masks defined in Unity Catalog are automatically enforced per user … regardless of how the Genie Agent is shared." A question about data the user cannot access returns an empty response.

**The same rule for the model prompt.** "All data sent to AI assistive feature models respect Unity Catalog permissions, so no data users do not have access to is sent to such models" ([Databricks AI assistive features trust and safety](https://docs.databricks.com/aws/en/databricks-ai/databricks-ai-trust), updated 2026-10-12).

:::info Unsettled in Databricks' own docs
The audit reference describes a Genie Agent setting `run_as_type` — "the **Run as** setting, which determines if a shared space **embeds the publisher's credentials** or authenticates with the viewer's credentials" ([Audit log reference](https://docs.databricks.com/aws/en/admin/account-settings/audit-logs)). The concepts and set-up pages state unconditionally that data access is evaluated as the end user. The two statements are reconcilable only if "Run as" governs compute and not data, which the pages read do not say. Treat the per-user guarantee as documented for *data*, and the "Run as" reach as **not settled from documentation**.
:::

### 1.5 How a customer restricts or disables it

The documented control is **one setting**, and it is being taken away:

- `partner-powered AI features` is **enabled by default** for workspaces without a compliance security profile, and **disabled by default** for workspaces with one ([Partner-powered AI features](https://docs.databricks.com/aws/en/databricks-ai/partner-powered), updated 2026-10-12).
- **On November 1, 2026 Databricks removes the account and workspace toggles from the settings page and the API.** Each workspace keeps its current value. "After November 1, 2026, to change this setting, contact your Databricks account team."
- With it **enabled**, the models are Azure OpenAI, OpenAI on Databricks, or Anthropic on Databricks. With it **disabled**, features fall back to "Databricks-hosted models where available", and several features disappear outright:

| Feature | When partner-powered AI features is **disabled** |
|---|---|
| Genie Code agentic capabilities | not available |
| Genie Agents Chat mode, Genie Agents Agent mode | not available |
| Genie One chat | not available |
| Genie App Builder | not available |
| AI/BI dashboard AI-assisted visualisations and companion Genie Agents | not available |
| Synthetic data generation | not available |
| Genie Code autocomplete, AI-generated comments | continue on a Databricks-hosted model |

"If you disable Partner-powered AI features, users with the Databricks SQL entitlement can still click the **Genie Agents** icon in the sidebar, but they cannot access any Genie Agents" ([Create and manage a Genie Agent](https://docs.databricks.com/aws/en/genie-agents/set-up)).

A per-user switch to turn the assistant off entirely is **not documented on the pages read**; the documented granularity is account → workspace, plus a previews page for preview features.

Data residency is handled by Databricks itself, not by the customer's cluster: the features are **Designated Services** that "comply with data residency boundaries" and route through Databricks **Geos**; a workspace outside the supported regions needs **cross-Geo processing** enabled ([Genie Code](https://docs.databricks.com/aws/en/genie-code/), [trust and safety](https://docs.databricks.com/aws/en/databricks-ai/databricks-ai-trust)).

### 1.6 Audit

Databricks does record assistant activity, under two workspace-level audit services — `aibiGenie` (Genie Agents) and `genieChat` (Genie One) — with per-action events including `createConversationMessage` ("a user submits a new message … in Chat mode"), `executeMessageQuery`, `updateConversationMessageFeedback`, and the agent-settings events ([Audit log reference](https://docs.databricks.com/aws/en/admin/account-settings/audit-logs)). Admins query them in SQL over `system.access.audit` ([Monitor Genie Agent usage with audit logs and alerts](https://docs.databricks.com/aws/en/genie-agents/audits-alerts), updated 2026-09-11). Chat content itself lives elsewhere: "Genie Agent responses and AI-generated comments are stored in the Databricks **control plane** database"; "Genie Code chat history is stored in the same place as other notebook content"; "**Admins can view the chat if they have a direct link**", and Genie Agent managers can see other users' messages ([trust and safety](https://docs.databricks.com/aws/en/databricks-ai/databricks-ai-trust)).

---

## 2. Dremio

Read at `docs.dremio.com` on **2026-10-18**. Dremio ships in three editions; the AI rows differ per edition, which turns out to be the most useful table on their site ([Dremio Editions](https://docs.dremio.com/editions)):

| | Community (26.0+) | Enterprise (26.1) | Cloud |
|---|---|---|---|
| Deployment | self-managed (Docker/K8s) | self-managed **on Kubernetes** — on-premises allowed | fully managed |
| Dremio's AI agent | **No** | **Yes (limited set of tools)** | **Yes (full-featured UX and set of tools)** |
| Bring your own model | No | **Yes** | Yes |
| Dremio-provided LLM | No | No | Yes |
| AI functions | No | Yes | Yes |
| AI-enabled semantic search | No | Yes | Yes |
| Schema-based wiki/label generation (AI) | No | Yes | Yes |
| Query-history-based metric/relationship generation (AI) | No | **No** | **Yes** |
| AI interface (Agent, MCP) integration | No | **No** | **Yes** |
| Role-based access control | No | Yes | Yes |

### 2.1 The assistant surface

- **The AI agent** — "a natural language interface where you can explore datasets, analyze data, ask for an explanation of SQL structure or job performance, and visualize outputs. As you interact with the AI Agent, you will see reasoning and actions taken in response so you can review and audit the agent. **All existing data permissions and functionality privileges will apply.**" It reads: "The AI agent accesses data and entities that the logged in user has privileges on to address the prompt." ([Explore Using Dremio's AI Agent](https://docs.dremio.com/current/data-products/ai-agent), Enterprise docs, version *current [26.x]*.)
- **It executes.** "Dremio's AI agent will write and execute SQL on your behalf"; results come back as tables, charts, and a written analysis ([same page](https://docs.dremio.com/current/data-products/ai-agent); [Get Started with Dremio Cloud](https://docs.dremio.com/dremio-cloud/get-started/): "The AI agent generates and runs SQL using Dremio's query engine").
- **Text-to-SQL in the SQL Runner** — "convert natural language queries into SQL directly within the SQL Runner … The SQL is generated for you. **To get the results, click Run**", i.e. this surface proposes and the user runs ([Text-to-SQL Experience (Sonar, Preview)](https://docs.dremio.com/cloud/sonar/query-manage/querying-data/generative-ai/)). It supports tables and views; sources and folders are not supported.
- **AI functions** in SQL — `AI_GENERATE`, `AI_CLASSIFY`, `AI_COMPLETE` — send "a prompt along with structured or unstructured data to the LLM", so the *data* row by row goes to the model ([AI](https://docs.dremio.com/cloud/sonar/ai/)).
- **AI-generated wikis and labels** populate the semantic layer; semantic search finds objects ([Discover Data](https://docs.dremio.com/current/data-products/discover/): "performs keyword and semantic search … **Search only returns results that you have privileges to see**").

### 2.2 The model path: Dremio lets the customer choose, including self-hosted

This is the finding that most changes the comparison. In **Dremio Enterprise** an administrator configures a **model provider** ([Configure Model Providers](https://docs.dremio.com/current/admin/model-providers/), Enterprise, *current [26.x]*):

- supported services: OpenAI, Anthropic, Google Gemini, Amazon Bedrock, Azure OpenAI, and **OpenAI-Compatible API**;
- the OpenAI-compatible option "lets you connect Dremio to any service that implements the OpenAI API specification, **including self-hosted models** and third-party providers not listed above";
- one default provider (with `MODIFY` privilege needed on both old and new to change it) plus an optional allowlist for AI-function models;
- `CALL MODEL` on the default model provider is what a user needs to use the agent, and "by default, **CALL MODEL is granted to all users** for all new model providers".

In **Dremio Cloud** there is instead a **Dremio-provided LLM** "which requires no configuration. LLM calls route to US or EU endpoints based on your organization's control plane" ([Configure Model Providers](https://docs.dremio.com/dremio-cloud/admin/model-providers)).

### 2.3 Governance and what leaves

- **Privileges apply.** "All existing data permissions and functionality privileges will apply"; the agent "accesses data and entities that the logged in user has privileges on". `CALL MODEL` and `CREATE MODEL PROVIDER` are system-level privileges in Dremio's list (see [permission model research](./permissions-research), read 2026-10-18), so the agent is itself grantable and revocable.
- **The prompt contains schema text and sample data.** "Dremio uses **schema information and dataset labels/wikis** as model context. This means that any sensitive information in your table or column names, or in the dataset labels/wikis, could be passed to a model." "Dremio **sends sample data to the model**, and this data is secured with the user's credentials." "Neither Dremio nor our trained model partner (OpenAI) trains models using customer data" ([Data Privacy](https://docs.dremio.com/data-privacy/)).
- **A user identifier is sent by default.** `send_user_identifier` "Whether Dremio sends a user identifier to the provider with each request. Defaults to `true`" ([Configure Model Providers](https://docs.dremio.com/current/admin/model-providers/)).
- **Audit** is the job log: "All MCP server operations appear as regular jobs executed via REST in the Dremio console", attributed to the username on the personal access token, with generated SQL visible ([Dremio MCP Server](https://docs.dremio.com/current/developer/mcp-server)). Audit History is an Enterprise/Cloud feature; Community has none ([Editions](https://docs.dremio.com/editions)).
- **MCP.** An open-source MCP server (`github.com/dremio/dremio-mcp`) runs in all editions against a Dremio deployment using a PAT, and "data is shared with the AI service, and responses may be affected by LLM hallucination" — the AI client is the customer's choice, so the egress is to *that* vendor. A Dremio-hosted MCP server exists in Cloud only ([AI Integration](https://docs.dremio.com/dremio-cloud/ai-integration/), [Dremio MCP Server](https://docs.dremio.com/current/developer/mcp-server)).

---

## 3. The honesty section: what is reachable on-premises

Two questions per capability: **does it work air-gapped?** and **what leaves the customer's perimeter?** "Not documented" means the pages read do not say.

### 3.1 Databricks

| Capability | Air-gapped? | Model | What leaves the perimeter |
|---|---|---|---|
| Genie Code — chat, autocomplete, `/explain`, Quick Fix, Diagnose Error | **No.** A feature of a Databricks cloud workspace; no self-hosted or air-gapped deployment of it is documented | partner (Azure OpenAI / OpenAI on Databricks / Anthropic on Databricks) or a Databricks-hosted model; **bring-your-own-endpoint for the assistive features is not documented** | "your prompt … and relevant metadata such as table and column names and descriptions, **sample values**, errors, and previous questions", plus the code or query in the current cell |
| Genie Code **agent mode** | **No.** Additionally requires partner-powered AI features → a third-party endpoint | Azure OpenAI / OpenAI on Databricks / Anthropic on Databricks | as above **plus "cell outputs" and "data samples read from tables"** |
| Genie Code autocomplete | **No** | Databricks-hosted model, even when partner-powered features are on | code context in the editor |
| Genie Agents (chat + agent mode) | **No.** "Feature is not available" when partner-powered features are disabled; needs a pro or serverless SQL warehouse | Azure OpenAI / OpenAI on Databricks / Anthropic on Databricks | natural-language prompt, table names and descriptions, "relevant values", instructions, example SQL, SQL functions — **and the query results it reads to answer** |
| Genie One | **No.** Chat unavailable when partner-powered features are disabled | OpenAI on Databricks / Anthropic on Databricks | question and metadata; **content from connected external sources** (Google Drive, Microsoft 365, Slack) when those are attached |
| AI-generated comments, intelligent search | **Partly**: fall back to a Databricks-hosted model when partner-powered features are disabled | Databricks-hosted or Azure OpenAI | object metadata: names, current comments, column details |
| Chat history and agent responses | — | — | stored in the **Databricks control-plane database**; admins can open a chat with a direct link |

**The sentence that matters for a sovereign platform:** Databricks lets the customer change *which* model answers, and by 2026-11-01 not even that without contacting their account team; it does not let the customer change *where the assistant runs*, and no page read documents an air-gapped deployment. Everything above is a Databricks-cloud capability, including the fallback models.

### 3.2 Dremio

| Capability | Air-gapped? | Model | What leaves the perimeter |
|---|---|---|---|
| AI agent, **Enterprise** (self-managed, on-prem allowed) | **Yes, if the operator configures an in-perimeter endpoint.** The agent runs in the Dremio deployment; the model provider is a URL | any configured provider, **including an OpenAI-compatible endpoint serving a self-hosted model** | with an in-cluster endpoint: nothing from the model path. The prompt still carries schema, labels/wikis and **sample data**, so it travels to whatever URL is configured and no further. "Limited set of tools" versus Cloud — *which* tools, not documented |
| AI agent, **Cloud** | **No** | Dremio-provided LLM (US/EU routing) or the customer's provider | to Dremio Cloud and, if a third-party provider is configured, to that provider |
| Text-to-SQL in the SQL Runner (Preview) | **No** on the pages read — documented in Dremio Cloud's Sonar docs; Enterprise's path to the same outcome is the AI agent | configured provider | schema, labels/wikis, sample data |
| AI functions (`AI_GENERATE`, `AI_CLASSIFY`, `AI_COMPLETE`) | **Yes in Enterprise** with a self-hosted provider | configured provider | the prompt **and the column data passed to the function** |
| Schema-based wiki/label generation | Enterprise and Cloud | configured provider | schema metadata and sample data |
| Query-history-based metric/relationship generation | **Cloud only** | Dremio-provided or BYO | query history **and the queries' contents** |
| Dremio-hosted MCP server | **Cloud only** | — | to Dremio Cloud |
| Open-source MCP server (`dremio-mcp`) | **Yes** — runs anywhere against any edition | the AI client's model (Claude, ChatGPT, …) | "data is shared with the AI service": schemas, query results, and whatever the client asks for go to that vendor |
| Dremio-provided LLM | **Cloud only** | — | to Dremio Cloud (US or EU endpoints) |

**The sentence that matters:** Dremio is the honest one of the two — a self-managed Enterprise deployment can run its agent against a self-hosted OpenAI-compatible model, so the *model path* can stay inside the perimeter. What does **not** move on-premises is the full-fidelity product: the agentic MCP integration, the query-history-derived semantics, and the Dremio-provided LLM are cloud-only by construction, and every configuration still puts schema text and sample data in the prompt.

### 3.3 What this means for stardelt

Neither vendor's assistant is something a bank's air-gapped network can adopt as-is, and the gap is not the model — it is the **prompt payload**. Both ship sample values and, on the agent surfaces, query results to the model. §7's sovereign-AI claim is therefore not "we use a smaller model": it is that the payload can be made *narrower* (schemas, not rows) and the endpoint *ours*. That is the design in part 4.

---

## 4. Proposed stardelt copilot v1

The master spec fixes the pieces already: the copilot is Nova, it runs against a `ModelEndpoint` ([master spec](../design/master-spec) §5 row 18, §7 moat 2), the model default is vLLM/Ollama on-prem with an external API only as operator-configured opt-in (D7), and the surface is NL→SQL in the Query editor where "generated SQL always lands in the editor for human review — never auto-executed" ([execution plan](../design/execution-plan) WP-41). This section does not re-decide any of that; it fills in the five things a v1 needs to be buildable and reviewable: **surface, context boundary, model path, permission rule, audit record.**

### 4.1 Surface — a proposal, not an actor

The copilot lives in **two places in Nova, both read-only**:

| Where | What it does | What it cannot do |
|---|---|---|
| **Query editor** (`/query`, the existing SQL surface) | a prompt box that turns a question plus selected schema context into SQL text **in the editor buffer**; the human reviews and presses Run | execute; replace the editor contents without confirmation; create, drop, or alter anything |
| **Catalog browser** (`/catalog`) | "describe/join/select from this table" actions that open the Query editor with the SQL prefilled | anything beyond producing SQL — no data preview, no export, no chart |

Two rules make this the honest version of the vendors' surfaces:

1. **No execution path exists from the copilot.** Nova already runs SQL as the signed-in user ([identity](./identity)), and that endpoint stays the *only* way a query reaches Trino. The copilot is a text producer; the run is a human action with the human's token. This is the opposite of Genie Code's classifier-approved auto-run and of Dremio's "write and execute SQL on your behalf".
2. **No write SQL.** v1 proposes `SELECT`/`WITH` only and refuses to emit DDL/DML; the generated text never becomes a `Pipeline`, a job, or a saved query without the human saving it.

The copilot has **no chat memory across requests** in v1: each request is stateless. Databricks and Dremio both persist chat in a vendor-side store; stardelt's transcript is the audit record (§4.5) and nothing else.

### 4.2 Context boundary — schemas, not rows

**The copilot may read, per request:**

| Source | What exactly | Where it comes from |
|---|---|---|
| Catalog metadata | the catalogs, schemas, tables, views and **column names and types** in scope for the request | Nova's catalog endpoints over Lakekeeper (`/catalog/*` today) |
| Object comments / descriptions | only if the catalog carries them | same |
| Lineage | the immediate upstream/downstream neighbourhood of the tables in scope | OpenMetadata, **when it exists** (P1); absent today, and the copilot must degrade to catalog metadata rather than invent relationships |

**It may not read customer data.** No `SELECT`, no `LIMIT 5`, no sample values, no `information_schema` statistics about value distributions, no query history — unless an operator explicitly opts in (§4.3 mode B′) and the egress is documented. The vendors both ship sample values in the prompt; that single line is where stardelt's sovereignty claim is earned or lost.

**Scope selection** is the interesting sub-problem: a prompt cannot carry a whole catalog. v1 selects context deterministically, not by embedding search:

1. the objects the user has open (the table in the catalog browser, the tables already referenced in the editor buffer);
2. plus, if the request names an object, a catalog lookup resolved **under the user's own authority**;
3. capped by an explicit budget (N tables, M columns), with the truncation shown to the user — "context: 6 tables, 41 columns" — so a bad answer can be diagnosed as a context problem.

The selection algorithm is [open question 1](#6-open-questions-for-the-design).

### 4.3 Model path — `ModelEndpoint`, three honest modes

The copilot never talks to a model that is not a `ModelEndpoint` in the platform CRD. Three modes, and Nova must display which one is active:

| Mode | What Nova talks to | What leaves the cluster |
|---|---|---|
| **A — in-cluster (default)** | a `ModelEndpoint` reconciling vLLM or Ollama in the platform's own namespaces (WP-40) | **Nothing.** The prompt travels Nova → the endpoint's Service, inside the cluster. No DNS beyond the cluster, no vendor account, no licence server ([sovereignty](./sovereignty) commitments 1 and 3) |
| **B — external API (opt-in, operator-configured)** | an `ModelEndpoint` with an external URL and credentials | the **prompt only**: the user's question, object names, column names/types, comments, the active SQL buffer. Never rows, never results, never file contents. The endpoint appears in the release's `NETWORK-EGRESS.md` (sovereignty commitment 2), and Nova's copilot pane names the destination before the first request |
| **C — no endpoint reachable** | nothing | nothing. The pane says the copilot is unavailable; **no fallback to an external endpoint and no fallback to a service account**, ever. A model the operator did not configure is a model that does not exist |

Two properties the design must keep: **the copilot is off until a `ModelEndpoint` exists** (there is no built-in default that phones home), and **mode B is a CRD field, not a UI toggle** — the decision to let prompts leave the cluster is an operator decision with a Git-visible diff.

### 4.4 Permission rule — the same token, the same enforcement point

**The copilot acts as the signed-in user.** Concretely, in the order the request happens:

1. the user is authenticated by Nova (session cookie or bearer token, [identity](./identity));
2. Nova reads the catalog metadata for the prompt **with that user's token**, not a service credential, once token forwarding is on ([execution plan](../design/execution-plan) WP-12);
3. therefore the prompt can only contain objects the user may `browse` ([permission model research](./permissions-research) §4.2) — a subject cannot make the copilot reveal a table it cannot list;
4. the SQL that comes back is run by the human through the ordinary query path, under the same token, so the enforcement point is unchanged: the **catalog** decides audience and the **engine** evaluates row filters and column masks for that identity.

**The honest caveat, and it is a v1 blocker for the claim.** While `NOVA_FORWARD_IDENTITY=0` (the default today), Nova reads the warehouse with its own service connection and every signed-in user sees the same catalog listing ([permission model research](./permissions-research) §3.1; [identity](./identity) "Forwarding (phase 2)"). In that mode the copilot cannot honestly promise "nothing the user may not see" — the *listing* is already wrong before the copilot runs. v1 must therefore **report the same flag** the rest of Nova reports (`identity_forwarding`), and either:

- keep the copilot unavailable while forwarding is off, or
- offer it and label the response "context was read with the platform credential" — an explicit, visible downgrade.

The recommendation is the first: a copilot that cannot state its permission rule should not answer. That is a behaviour the vendors cannot offer at all, and it costs one boolean.

### 4.5 Audit record — one record per request, joinable to the run

Nova already has an `audit` tracing target that writes "one line per mutating request with the caller — and one per refusal" and never a query string or a body (`backend/src/audit.rs` at `origin/main` 2026-10-18; [production](../operations/production)). The copilot **necessarily breaks the "never a body" rule for the prompt**, because the prompt is the artefact being audited. v1 therefore defines one explicit record and states its contents:

| Field | Why |
|---|---|
| `actor` (`sub`, plus the group claims used for the decision) | who asked — the same subject the catalog grant names |
| `endpoint`, `model`, `mode` (A/B/B′/C) | which model answered, and whether anything left the cluster |
| `context` | the object identifiers and column counts placed in the prompt — **not the rows**, because there are none by construction |
| `prompt` | the question. Contains object and column names; contains no values. Whether to store it verbatim or a digest is [open question 3](#6-open-questions-for-the-design) |
| `suggestion` | the SQL text the copilot produced, or a refusal |
| `outcome` | accepted / edited / discarded, and **the query id if the human ran it**, so the suggestion and the executed statement join |

The record goes to the same `audit` target as everything else and follows the platform's audit path — structured JSON, Kafka topic `stardelt.audit.v1`, archived to Iceberg ([sovereignty](./sovereignty) commitment 5), queryable through Trino once D15 lands ([gap decisions](../design/gap-decisions) D15). Databricks keeps assistant transcripts in its control plane; stardelt's stay in the customer's Kafka and Iceberg, which is the difference the audit story is about.

---

## 5. What we will not build

| Not building | Why |
|---|---|
| An assistant that executes its own suggestions | Both vendors' agent surfaces do this (Genie Code's classifier-approved auto-run; Dremio's "write and execute SQL on your behalf"). The execution path in stardelt is a human action under the human's token ([master spec](../design/master-spec) §7 as implemented by [execution plan](../design/execution-plan) WP-41) |
| A model of our own — training, fine-tuning, a weights release | §5: stardelt integrates model serving, never builds a model server. A fine-tune is a model |
| Any prompt containing customer rows by default | The exact thing both vendors document doing. If an operator wants a sample-values mode, it is a separate, explicitly egress-documented feature, not a default (and not v1) |
| Web search from the assistant | Genie Code documents public-web search; sovereignty commitment 1 is zero mandatory phone-home. A search tool is an outbound call with arbitrary content |
| An agentic tool-calling loop (MCP connectors, external sources: Drive, Slack, SharePoint) | Genie Agents and Genie One attach external sources; Dremio attaches MCP. Each is a new egress with its own permissions story. The governed alternative is already decided separately as the stardelt MCP server ([gap decisions](../design/gap-decisions) D13) — agents get Nova's REST surface, not a prompt-side connector |
| A vector store / embedding index of the catalog in v1 | The parity matrix puts the vector store at P4 ([feature parity](../design/nova-feature-parity) §10). Deterministic context selection first; retrieval is a later, separable decision |
| Persisted chat threads, memory across sessions, shared conversations | Databricks stores chats in its control plane and lets managers read them; Dremio keeps conversations in its console. v1's transcript is the audit record. Chat history is a product surface with a retention policy, and it is not v1's |
| AI-generated wikis, labels, metric definitions, "ontology" | OpenMetadata is the metadata spine (§6/D4) and classification is P4 ([gap decisions](../design/gap-decisions) D10). Nova does not become a semantics generator |
| AI-assisted dashboards, "ask the dashboard", BI companions | [Feature parity](../design/nova-feature-parity) §10 sequences the dashboard companion at P3 |
| Row-level suggestions based on what the user previously queried | Query history is customer data and is not in the prompt. Personalisation needs its own decision |
| A vendor component — Unity Catalog, Dremio, or their assistant frameworks | [licenses](./licenses): permissive components only; and the deliverable is a design, not software |
| A model or agent framework under a non-permissive licence, however good | Same page, same rule: the model weights and the runtime shipped in the air-gap bundle must clear the licence bar, which for weights is a question the policy does not yet answer ([open question 5](#6-open-questions-for-the-design)) |
| Vendor parity as the goal | §3: the product is the curation, not the surface area |

---

## 6. Open questions for the design

1. **How is schema context selected without shipping the whole catalog into a prompt?** The vendors sidestep this with a curated agent (Genie Agents: ≤50 objects attached by hand) or with proprietary semantic layers. Nova has neither in v1. Does the copilot require the user to *select* tables (honest, small, no retrieval), or does it need a lookup pass that resolves names to objects under the user's authority (better UX, one more read, still no customer data)? The budget and the truncation display follow from that choice.
2. **What happens when the model is unreachable?** Mode C says the copilot is unavailable and nothing else happens — but the *user* experience (grey the box, an error on submit, a retry) is undecided, as is whether a request is ever retried against a different endpoint (it must not be).
3. **Is the prompt the audit record, or its digest?** Nova's audit rule today is "never a body"; the copilot's prompt contains object and column names and no rows. Storing it makes the record genuinely useful ("what did the assistant see?"); hashing it makes the record useless for review. Recommendation: store it, and make that an explicit exception in `audit.rs` rather than an accident.
4. **Which permission rule applies before WP-12 lands?** (§4.4) Keep the copilot off while `NOVA_FORWARD_IDENTITY=0`, or run it and label the downgrade? This is one line of behaviour and a paragraph of documentation — and it decides whether the copilot may claim the moat at all.
5. **Do model weights fall under the licence policy at all?** [licenses](./licenses) is written about components and their repositories. Model weights ship under their own licences, some of which are not OSI-approved. Before WP-40 picks the default model, the policy needs a clause for weights — otherwise the air-gap bundle can be "permissive-only" in its container images and not in the bytes that do the thinking.
6. **How is the ModelEndpoint authenticated, and by whom?** In-cluster endpoints need no credential; an external one needs a secret, a rotation story, and a decision about whether the *user's* identity is ever sent (Dremio sends a user identifier by default — we should decide deliberately, not by accident).
7. **Does the copilot need lineage in v1?** §7 mentions the governed catalog; lineage arrives with OpenMetadata at P1. Without it the copilot can still answer "top 5 pickup boroughs by tip" (WP-41's acceptance case) but cannot answer join questions across tables it was not handed. Decide whether v1 promises lineage or explicitly does not.
8. **What does the copilot do in `NOVA_AUTH_MODE=dev`?** The demo and CI path has no user. A copilot that works there is a copilot with a service identity — the thing §4.4 forbids. Either dev mode has no copilot, or it runs with a fixed documentation-only context.

---

## 7. Sources and dates read

All pages read **2026-10-18**. "Updated" is the date the page itself displays; Dremio's pages show a documentation version instead.

**Databricks** (`docs.databricks.com`, AWS flavour)
- [Databricks AI assistive features](https://docs.databricks.com/aws/en/databricks-ai/) — updated 2026-09-11
- [Genie Code](https://docs.databricks.com/aws/en/genie-code/) — updated 2026-10-13
- [Genie Code features and capabilities](https://docs.databricks.com/aws/en/genie-code/features-capabilities) — updated 2026-10-13 (also the redirect target of `/aws/en/notebooks/use-databricks-assistant`, the former Databricks Assistant page)
- [Get coding help from Genie Code](https://docs.databricks.com/aws/en/notebooks/code-assistant) — updated 2026-10-13
- [Genie](https://docs.databricks.com/aws/en/genie/) — updated 2026-09-18
- [Genie Agents](https://docs.databricks.com/aws/en/genie-agents/) — updated 2026-10-07
- [Genie Agents concepts](https://docs.databricks.com/aws/en/genie-agents/concepts) — updated 2026-10-12
- [Create and manage a Genie Agent](https://docs.databricks.com/aws/en/genie-agents/set-up) — updated 2026-10-09
- [Databricks AI assistive features trust and safety](https://docs.databricks.com/aws/en/databricks-ai/databricks-ai-trust) — updated 2026-10-12
- [Partner-powered AI features](https://docs.databricks.com/aws/en/databricks-ai/partner-powered) — updated 2026-10-12
- [Audit log reference](https://docs.databricks.com/aws/en/admin/account-settings/audit-logs) — updated 2026-10-12
- [Monitor Genie Agent usage with audit logs and alerts](https://docs.databricks.com/aws/en/genie-agents/audits-alerts) — updated 2026-09-11
- [Navigate the Analytics and AI workspace UI](https://docs.databricks.com/aws/en/workspace/navigate-workspace) — no page date displayed
- [December 2025 release notes](https://docs.databricks.com/aws/en/release-notes/product/2025/december) — page published 2026-08-24

**Dremio** (`docs.dremio.com`)
- [Dremio Editions](https://docs.dremio.com/editions) — feature matrix across Community 26.0+, Enterprise 26.1, Cloud
- [Explore Using Dremio's AI Agent](https://docs.dremio.com/current/data-products/ai-agent) — Enterprise, *current [26.x]*
- [Configure Model Providers](https://docs.dremio.com/current/admin/model-providers/) — Enterprise, *current [26.x]*
- [Configure Model Providers](https://docs.dremio.com/dremio-cloud/admin/model-providers) — Dremio Cloud
- [Discover Data](https://docs.dremio.com/current/data-products/discover/) — Enterprise, *current [26.x]*
- [Dremio MCP Server](https://docs.dremio.com/current/developer/mcp-server) — Enterprise, *current [26.x]*
- [AI Integration](https://docs.dremio.com/dremio-cloud/ai-integration/) — Dremio Cloud
- [AI](https://docs.dremio.com/cloud/sonar/ai/) and [Text-to-SQL Experience (Preview)](https://docs.dremio.com/cloud/sonar/query-manage/querying-data/generative-ai/) — Dremio Cloud / Sonar
- [Data Privacy](https://docs.dremio.com/data-privacy/)

**stardelt, in this repo and beside it**
- [master spec](../design/master-spec) §5 row 18, §6, §7 (moat 2), §11 (D7); [execution plan](../design/execution-plan) WP-12, WP-40, WP-41; [gap decisions](../design/gap-decisions) D10, D13, D15; [feature parity](../design/nova-feature-parity) §10
- [identity](./identity), [identity integrations](./identity-integrations), [permission model research](./permissions-research), [sovereignty](./sovereignty), [licenses](./licenses), [production](../operations/production)
- `stardelt-nova` at `origin/main` (2026-10-18): `backend/src/audit.rs` (the `audit` target's fields and its "never a query string or a body" rule), `backend/src/main.rs` (`NOVA_FORWARD_IDENTITY`, the `/query` and `/catalog/*` routes), `frontend/src/routes/` (`Query.tsx`, `Catalog.tsx`, `Lineage.tsx`)
