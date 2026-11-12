---
title: "Notification destinations"
sidebar_label: "Destinations"
slug: /guides/destinations
---

# Notification destinations

A destination is a named webhook or email address that your group can be told about something at. Create it once, then
point the things that should notify the group at its name.

## What a destination is

A destination belongs to one group and holds one address: an HTTP endpoint that receives a small JSON message, or a list
of email recipients. It is the place a group writes down "tell us here", so the settings live in one spot instead of in
every pipeline that raises a notice.

One name, one address, means you change a webhook's URL in a single place: everything that sends to that name follows.
A name is unique within its group, so `on-call` in two different groups can be two different addresses.

## The page

Open **Build → Destinations** in the left navigation. The page shows one card per group you belong to, headed
`Group: <name>`. Each card holds a table with three columns:

| Column | What it shows |
|---|---|
| Name | The destination's name, as the things that send to it call it |
| Kind | `webhook` or `email` |
| Address | The webhook's URL, or the recipients separated by commas |

The rows are in name order, so a card does not reshuffle between two visits. If you are in no group, the page still
opens, the list is empty and the page says `You are not in a group, so you cannot add a destination.`

## Create a destination

Choose **New destination**. A form opens above the list, so the existing destinations stay in view, and it asks, in this
order:

1. **Owner group** — one of the groups you belong to. This decides who sees and changes the destination.
2. **Name** — 1 to 64 characters. The name must not already be used in that group.
3. **Kind** — `webhook` or `email`.
4. **URL** for a webhook, or **Recipients** for an email.

A webhook's **URL** starts with `http://` or `https://` and points at something that accepts a `POST` of JSON. For an
email destination, **Recipients** is one or more addresses separated by commas.

**Create destination** stores it and shows `Created “<name>”.` **Cancel** closes the form without saving anything.

## Test a webhook

Choose **Test** on a webhook row. It sends one fixed test message to the address and records the attempt. The row then
says what happened:

- `Delivered.` — the endpoint answered `2xx`.
- `HTTP 502 Bad Gateway` — the endpoint answered, but not with a success. The page prints the endpoint's status.
- `the webhook did not answer within 5 seconds` — the endpoint accepted the connection and stayed silent.
- `the webhook was unreachable` — the connection failed; the address is wrong, the host is down, or a firewall blocks it.

An **email** destination has no **Test** button. The page prints `Email needs the platform’s SMTP relay; it is not
configured yet.` above the rows of a group that has one.

## Delete a destination

Choose **Delete “…”** on the row; the button names the destination in the quotes, for example `Delete “on-call”`. A
dialog asks you to confirm by name and tells you that anything that sends to this destination will stop. **Delete**
removes it for the whole group; **Cancel** leaves it in place.

The name and its address stop being usable: the card no longer lists it, and anything that pointed at it has nowhere to
send. A name you delete can be used again.

## Who sees what

The owner group decides. A member of the group sees the destination and can create, test and delete it; an administrator
sees and changes every group's destinations. A destination of another group is not listed for you, and asking for its id
directly answers `404`, exactly as if it did not exist.

## What is not built yet

A pipeline's failure notice uses a destination: tick the group's destinations in the pipeline dialog under **Tell … when a
run fails**, and Nova sends one message per failed run (see [Schedule a SQL statement](schedule-sql.md)). Alert rules and
access requests still do not use a destination, so a destination today receives the one **Test** sends and a pipeline's
failure notices.

A notice is delivered to a **webhook** only: an email destination records the attempt as failed with the SMTP sentence
below until the relay exists.

An email destination cannot deliver until the platform's SMTP relay is configured; you can create one now, and it will be
usable once the relay exists.

A webhook's header secrets — a token or signature the receiving end checks — are not supported: a destination stores its
URL as you typed it and adds no authentication header.

## For developers

The API has four routes, all under `/api/destinations`:

| Route | What it does |
|---|---|
| `GET /api/destinations` | The destinations of the caller's groups |
| `POST /api/destinations` | Create one; the body holds `owner_group`, `name`, `kind` and `config` |
| `DELETE /api/destinations/{id}` | Delete one; answers `204` |
| `POST /api/destinations/{id}/test` | Send one test message to a webhook |

A destination is stored as `{id, owner_group, name, kind, config}`, where `config` is `{"url": …}` for a webhook or
`{"recipients": […]}` for an email. Names are unique per group; a duplicate answers `409`, a name outside 1
to 64 characters or an address that breaks the rule above answers `400`.
