---
title: "Work in VS Code"
sidebar_label: "Work in VS Code"
slug: /developer/vscode
---

# Work in VS Code

Most developers write their code in VS Code. This page shows how to use it with a stardelt platform: your
notebooks and Python run **on the platform**, as **you**, next to the data, while you keep editing in VS Code
with its debugger, Git integration and extensions.

## What works today

| You want to | How |
|---|---|
| Run notebooks and Python scripts against the warehouse | Connect VS Code to your JupyterHub server (below). The kernel runs on the platform; queries go to Trino under your own identity |
| Keep notebooks and code in Git | Use VS Code's Git support on your local checkout; the kernel only needs the platform |
| Edit pipeline and platform YAML | Any YAML editor; schema validation is not available yet |

Not available yet: a SQL client with platform sign-in, VS Code in the browser, and schema-validated pipeline
files. See [What is planned](#what-is-planned).

## Connect VS Code to your notebook server

You need: VS Code, the **Python** and **Jupyter** extensions (`ms-python.python`, `ms-toolsai.jupyter`), and a
platform where JupyterHub is installed. Optionally install the **JupyterHub** extension
(`ms-toolsai.jupyter-hub`); it lets you pick the hub instead of pasting a URL.

1. **Start your server.** Open `https://jupyter.<your-domain>` in a browser, sign in, and let the hub start your
   server. (The kernel only runs while your server runs.)
2. **Create an API token.** Open `https://jupyter.<your-domain>/hub/token`, create a token with a note such as
   "vscode", leave the permissions empty, and copy it. It is shown once.
3. **Connect.** In VS Code open or create a notebook (`.ipynb`), click **Select Kernel**, choose **Select
   Another Kernel → Existing Jupyter Server → Enter the URL of the running Jupyter server**, and paste

   ```
   https://jupyter.<your-domain>/user/<your-username>/?token=<your-token>
   ```

   Pick the Python kernel. The server name appears in the top right.
4. **Check it runs on the platform.** Run `!hostname` in a cell: it prints the pod name of your server, not
   your laptop.

### Query the warehouse

Your server starts with everything needed to query as you: your sign-in token (`TRINO_TOKEN`), the Trino address
(`TRINO_URL`), the platform's certificate bundle and the Trino client. The notebook `warehouse-quickstart.ipynb`
is copied into your home directory on the first start; open it in VS Code (through the connected server's file
browser in a browser tab, or copy its first code cell), run it, and reuse its `sql()` helper in your own
notebooks. Its first query, `SELECT current_user`, prints **your** username, not a shared account.

The token belongs to your session. When it expires, restart your server from the hub to get a fresh one.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| "Failed to connect" or timeout | Your server is not running: start it from `https://jupyter.<your-domain>/hub/home`, then retry |
| 403 or "invalid token" | The token was copied with a trailing space, or has been deleted: create a new one at `/hub/token` |
| The kernel list is empty | The URL must end in `/user/<username>/` (with the token query) and not point at the hub root |
| `KeyError: 'TRINO_TOKEN'` | You started the kernel outside the platform's server (a local kernel). Select the remote kernel again |
| Queries fail with 401 after hours | Your sign-in token expired: restart your server from the hub |

## What is planned

These are tracked as tickets; this page is updated when they ship.

- A stardelt VS Code extension: sign in with your platform account, browse the catalog, run SQL and see results,
  start pipelines.
- JSON schemas for the platform's resources, so pipeline files get completion and validation in the YAML editor.
- VS Code in the browser as a workspace option next to JupyterLab.
- A developer sign-in (device flow) so scripts on your laptop can call the platform without a notebook.
