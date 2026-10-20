---
title: "Notebooks and pipelines in git"
sidebar_label: "Notebooks in git"
slug: /guides/notebooks-in-git
---

# Notebooks and pipelines in git

Your analysis and your pipelines live in version control, not in a pod's home directory. The
notebook image ships the `git` binary, a Git panel in JupyterLab (`jupyterlab-git`) and a
one-click cloner (`nbgitpuller`). Two flows are supported.

## 1. Your notebooks in a repository

Clone once, then work from the Git panel. Open a terminal in JupyterLab and clone with your own
access token:

```bash
git clone https://github.com/your-org/your-analysis.git ~/your-analysis
```

The token is yours and stays in your notebook environment — typed at the prompt, stored in the
`git` credential helper, or exported as `GITHUB_TOKEN` for the session. It never enters the
image and is never committed. A private repository stays private the same way: the token that
clones it is the token that pushes to it.

A database or API credential does not belong in the repository either. Create a connection on
**Connections** in Nova, then read it by name in the notebook with `stardelt.connection()` — see
[Connections and secrets](connections). The notebook file holds the name, not the value.

Day to day you never touch the terminal again: the **Git panel** on JupyterLab's left shows
changed files, diffs, branches and history. Stage, commit, pull and push from there. Pull before
you start, commit when a result is worth keeping, push when you want review.

### Training sessions: share a link, not a clone command

`nbgitpuller` turns a repository into a link that clones (or fast-forwards) into whoever clicks
it, straight into their own home directory. Build the link with the
[nbgitpuller link generator](https://nbgitpuller.readthedocs.io/en/latest/link.html); it looks
like this:

```text
https://<your-hub>/hub/user-redirect/git-pull?repo=https://github.com/your-org/training-day
    &urlpath=lab/tree/training-day/exercise-01.ipynb
    &branch=main
```

Hand that link to the room. Everyone lands in JupyterLab with the same starting notebooks, and
their edits stay theirs. Re-clicking pulls the latest `main` without touching their work.

### Reaching your git server

Public hosts (github.com and friends) work out of the box. A self-hosted server inside your
company network needs its address ranges listed by whoever runs the platform — single-user pods
may egress to the public internet, but private addresses stay denied except for an explicit,
HTTPS-only grant (`notebooks.gitHosts`). If `git clone` hangs against your internal server, that
grant is the thing to ask for, not a token problem.

## 2. Your pipelines in a repository

Pipeline definitions are Kubernetes resources — `Pipeline` (and `IngestionSource`) manifests in
`stardelt-operator`'s chart — so they belong in git like any other manifest. A minimal example:

```yaml
apiVersion: stardelt.io/v1alpha1
kind: Pipeline
metadata:
  name: crm-nightly
  namespace: analytics
spec:
  engine: airflow
  schedule: "0 2 * * *"
  steps:
    - name: load-accounts
      kind: sql
      config: { model: "models/bronze/accounts.sql" }
    - name: check-accounts
      kind: quality
      config: { suite: "checks/accounts.yml" }
```

The repository holds the manifests **and** the models, SQL files and check suites the steps point
at, reviewed like any other change.

Validate every change in CI before it lands. At minimum, a dry run against a cluster that has
the operator's CRDs installed:

```bash
kubectl apply --dry-run=server -f pipelines/
```

That rejects unknown fields and bad enums with the server as the judge. A stricter CI also runs
a schema check (for example `kubeconform` with the CRD schemas from the operator chart) so a
typo fails the pull request, not the nightly run.

Merging to `main` is what deploys: CI applies the manifests, or a GitOps controller syncs the
directory, and `kubectl get pipelines` shows what the cluster has. Scheduled execution arrives
with the engine adapters — today the operator plans from these resources and reports status;
Airflow running the steps on the schedule is the next milestone. The git discipline does not
wait for it: review, history and rollback work from the first manifest.
