---
title: Glossary
description: The words Nova uses, and the API terms behind them.
---

The words a member sees in Nova, and the API term behind each one:

| You see | It means | In the API and CLI |
|---|---|---|
| Notebook | a notebook your team published | `notebooks`, `GET /api/notebooks` |
| Version | one saved state of a notebook; a schedule follows the latest or is pinned to one | object version (by digest) |
| Schedule | runs one notebook on a timetable, with parameters | a one-task `Pipeline` |
| Pipeline | several SQL and notebook steps in order | `Pipeline` with more than one task |
| Run | one execution of a schedule or pipeline | `runs`, `GET /api/runs` |
| Source | where a notebook or pipeline came from: Git (repo @ commit) or published by hand | bundle deployment, target |
