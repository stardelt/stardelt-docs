---
title: "JupyterHub"
sidebar_label: "JupyterHub"
slug: /services/jupyterhub
---

# JupyterHub

**What it is.** A multi-user notebook environment (JupyterHub chart 4.4.3, appVersion 5.5.3).

**Why stardelt uses it.** JupyterHub provides interactive notebooks for analysis and exploration, integrated with the platform's identity and data access.

**How it fits.** JupyterHub runs in the application layer. Single-user servers run the stardelt notebook image and receive the signed-in user's Keycloak token for data access; Trino serves queries as that user. See [Services](../architecture/services) and [How it works](../architecture/how-it-works).

**Who can use it.** Users sign in at `https://jupyter.<base domain>` with the same Keycloak account used for Nova via OIDC (realm `stardelt`, client `jupyterhub`). Access is controlled by the platform IdP; per-user servers are spawned on demand. See [Notebooks in Git](../guides/notebooks-in-git) and [Connections](../guides/connections).

**What you can tune.** Key settings from `helm-values/jupyterhub.yaml`:

| Setting | Values file | Key | Default | What it changes |
|---|---|---|---|---|
| Chart version | `helm-values/jupyterhub.yaml` | (chart) | `jupyterhub/jupyterhub` 4.4.3 | JupyterHub chart version. |
| Hub identity env | `helm-values/jupyterhub.yaml` | `hub.extraEnv` | (from ConfigMap/Secret) | OIDC issuer, Nova origin, client secret from identity contract. |
| OIDC endpoints/config | `helm-values/jupyterhub.yaml` | `hub.extraConfig` (`10-oidc`) | (derived from issuer) | Derives authorize/token/userinfo URLs and OAuth callback. |
| Framing/cookies | `helm-values/jupyterhub.yaml` | `hub.extraConfig` (`15-framing`) | (from Nova origin) | Allows framing by Nova, sets SameSite=None Secure cookies. |
| Notebook identity | `helm-values/jupyterhub.yaml` | `hub.extraConfig` (`20-notebook-identity`) | enabled | Passes user's access token as `TRINO_TOKEN` in single-user pod. |
| Notebook Trino config | `helm-values/jupyterhub.yaml` | `hub.extraConfig` (`25-notebook-trino`) | (from identity) | Sets in-cluster Trino endpoint and internal CA. |
| Proxy service | `helm-values/jupyterhub.yaml` | `proxy` | (see values) | Public proxy configuration. |
| Single-user | `helm-values/jupyterhub.yaml` | `singleuser` | (see values) | Single-user server image and configuration. |

**What it replaces.** JupyterHub replaces a shared notebook server setup with a platform-integrated multi-user notebook environment.

**Operating it.**

- **Health check:** `kubectl -n stardelt get pods -l app.kubernetes.io/name=jupyterhub`
- **Logs:** `kubectl -n stardelt logs -l component=hub -n stardelt`
- **Install step:** `make install-notebooks` (from `stardelt-platform`)
- **Backup:** Notebook user storage is ephemeral per configuration; backups focus on Git-backed notebooks and platform state as documented.
