---
title: "Develop on stardelt"
sidebar_label: "Develop on stardelt"
slug: /developer/vscode
---

# Develop on stardelt

Your code runs next to the data, as you: the kernel and every query use your platform identity. You choose the
editor — JupyterLab in the browser, or VS Code on your workspace or on your laptop.

## Choose how you work

| You want | Use | Where it runs |
|---|---|---|
| Quick exploration, a chart, a first look at a table | JupyterLab from Nova (**Notebooks** → **My workspace**) | platform |
| Your own editor, Spark, big data | VS Code connected to your workspace | platform |
| Light SQL, tests, editing offline | VS Code with a local kernel and `stardelt login` | laptop, with queries on the platform |
| Delivery | Git and `stardelt bundle deploy` | CI |

## In the browser: JupyterLab

1. Open Nova → **Notebooks**, and use **Start** / **Open JupyterLab** on the **My workspace** card. The
   server signs you in with the same account as Nova.
2. Clone your repository with JupyterLab's **Git panel** on the left, or in a terminal; see
   [Notebooks and pipelines in git](../guides/notebooks-in-git).
3. Query with `%%sql` or `stardelt.sql()` — both run as you: `SELECT current_user` prints your username.
   To publish and schedule a notebook, see [Published notebooks](../guides/published-notebooks).

## VS Code on your workspace

This is the full platform, including Spark and table writes. You need VS Code, the **Python** and **Jupyter**
extensions (`ms-python.python`, `ms-toolsai.jupyter`), and a platform where JupyterHub is installed.
Optionally install the **JupyterHub** extension (`ms-toolsai.jupyter-hub`); it lets you pick the hub instead of
pasting a URL.

1. **Start your server.** Nova → **Notebooks** → **Start** / **Open JupyterLab** on the **My workspace** card,
   and let the server start. (The kernel only runs while your server runs.)
2. **Create an API token.** Nova → **Profile** → **Notebooks: your server, tokens and VS Code** → **API tokens**.
   Create a token with a note such as "vscode", leave the permissions empty, and copy it. It is shown once.
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

The notebook is written for whoever signs in, not only for administrators: it picks the first
of the `shared` and `playground` catalogs your account can see, creates a schema named after
your user in it, and round-trips three rows through `stardelt.write_df`. It never drops a
table — dropping is an administrator action in this release. The `warehouse` catalog is
reserved for administrators, so the notebook does not use it.

The copy in your home is written once, on the first start (`cp -n`): a home that already has the
notebook keeps the version of the image that created it, so an older home can still hold the earlier
cells that query the administrator-only `warehouse` catalog. To take the current one, delete the
copy in your home and restart your server — or copy
`/opt/stardelt/notebooks/warehouse-quickstart.ipynb` over it, saving your edits first.

The token belongs to your session. When it expires, restart your server from Nova to get a fresh one.

## VS Code on your laptop

A local kernel reaches the warehouse through Nova's statement API with a sign-in you store once — no workspace:

```console
$ pip install "stardelt @ git+https://github.com/stardelt/stardelt-python@v0.3.0"
$ stardelt login --host https://<your-nova>
```

```python
import stardelt
stardelt.sql("SELECT current_user")   # up to 100 000 rows
```

Results come back as a DataFrame, up to 100 000 rows. **Spark and table writes run only on the platform**, in
a workspace kernel — the Spark endpoint is not exposed outside the cluster. Switch to
[VS Code on your workspace](#vs-code-on-your-workspace) for those.

:::note Coming with stardelt-python 0.3.0
`stardelt.sql()` from a local kernel needs `stardelt-python` 0.3.0 or newer. Until that release is tagged, use
a workspace kernel for every query.
:::

## Keep notebooks thin

Logic belongs in `.py` modules with `pytest` tests, where it is reviewable and testable without a kernel. The
notebook only calls the module and shows the result, so a rerun is cheap and a failure names a line of code.

```python
# transforms.py
def daily_totals(df):
    return df.groupby("day", as_index=False)["amount"].sum()
```

```python
# test_transforms.py
import pandas as pd
from transforms import daily_totals

def test_daily_totals_sums_per_day():
    df = pd.DataFrame({"day": ["2026-01-01", "2026-01-01"], "amount": [2.0, 3.0]})
    assert daily_totals(df)["amount"].tolist() == [5.0]
```

```python
# in the notebook
import stardelt
from transforms import daily_totals

daily_totals(stardelt.sql("select day, amount from mobility.gold.trips")).head()
```

## Ship it

Publish a notebook from JupyterLab with `stardelt.publish("my.ipynb")` in a cell (a one-click button in a
stardelt panel is coming); see [Published notebooks](../guides/published-notebooks). Keep pipelines as files in
Git and let CI run `stardelt bundle deploy -t dev`: see [Publish pipelines from Git](../guides/publish-pipelines)
and the [bundle reference](../guides/bundle-reference).

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| "Failed to connect" or timeout | Your server is not running: start it on Nova → **Notebooks** → **My workspace**, then retry |
| 403 or "invalid token" | The token was copied with a trailing space, or has been deleted: create a new one in Nova → **Profile** → **API tokens** |
| The kernel list is empty | The URL must end in `/user/<username>/` (with the token query) and not point at the hub root |
| `KeyError: 'TRINO_TOKEN'` | You started the kernel outside the platform's server (a local kernel). Select the remote kernel again |
| Queries fail with 401 after hours | Your sign-in token expired: restart your server from Nova |
| `stardelt.spark: Spark and table writes run on the platform` | A local kernel cannot reach Spark or write tables: connect VS Code to your workspace |

## What is planned

- A stardelt panel inside JupyterLab: catalog and publish.
- JSON schemas for the platform's resources, so pipeline files get completion and validation in the YAML editor.
- VS Code in the browser as a workspace option next to JupyterLab.
