---
title: "Troubleshooting connections"
sidebar_label: "Troubleshooting connections"
slug: /guides/connections-troubleshooting
---

# Troubleshooting connections

What a failed connection looks like and what to check first. The guide itself is
[Connections and secrets](./connections).

## Troubleshooting

| Message | Where | What it means | What to do |
|---|---|---|---|
| `the secret store is not configured` | Nova, Connections page and API (503) | This installation has no secret store. | Ask an administrator to set it up. |
| `the secret store is unavailable: …` | Nova (502) | Nova could not reach the store. | Retry. If it persists, ask an administrator to check the store. |
| `the secret store refused the request: …` | Nova (502) | The store refused the operation, usually a policy or permission. | Check that you are in the owning group and that the connection still exists; ask an administrator if it persists. |
| ``you are not a member of the group `…` `` | Nova (403) | You tried to create, rotate or delete a connection of a group you are not in. | Use a connection of your own group, or ask a member of that group. |
| `a connection with this name already exists` | Nova (409) | The name is taken in that scope. | Choose another name, or rotate or delete the existing connection. |
| `no such connection` | Nova (404) | The connection was deleted, or the scope/group in the request is wrong. | Refresh the page. |
| `could not record the notice; nothing was returned` | Nova, break-glass (502) | Nova could not write the notice that tells the group, so it returned no value. | Retry. If it persists, ask an administrator to check the cluster. |
| `the secret store is not reachable (ConnectionError)` | Notebook | The notebook cannot reach the store. | Restart the server from the hub. If it persists, ask an administrator. |
| `the secret store refused your sign-in (…) — restart this server from the hub to get a fresh token.` | Notebook | The notebook's platform token is no longer accepted. | Restart the server from the hub. |
| `no connection '…' that you may read.` | Notebook | The name is wrong, the connection is not yours, or it is managed. | Check the name on the Connections page. |
| `'…' exists in more than one place (…); pass group=... or scope=... to choose.` | Notebook | The same name exists in your personal connections and in a group. | Pass `scope="personal"` or `group="<group>"`. |
| `scope must be 'personal' or 'group' (managed connections are not revealed).` | Notebook | You asked for a managed connection; notebooks cannot read one. | Use a personal or group connection. |
