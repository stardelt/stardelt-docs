---
title: "Prerequisites"
sidebar_label: "Prerequisites"
slug: /getting-started/prerequisites
---

# Prerequisites

To run the stardelt MVP locally you need WSL2 or Linux with the following tools
on `$PATH`. `make deps` (in `stardelt-demos`) verifies these for you.

| Tool    | Tested version |
|---------|----------------|
| docker  | 26.x (Docker Desktop on WSL2 OK) |
| kind    | 0.31.0 |
| kubectl | 1.36.x |
| helm    | 4.x |

Hardware: roughly 8 GiB RAM and 4 CPUs free for the kind cluster; cold bring-up
takes about 12 minutes.

Next: [Run stardelt locally on kind](./local-kind).
