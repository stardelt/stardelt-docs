---
title: "Restrict who can reach the platform"
sidebar_label: "Network access"
slug: /operations/network-access
---

# Restrict who can reach the platform

An install with `ingress.enabled` publishes a host per component: Nova on the base domain itself, the
identity provider on `id.<baseDomain>` when the platform runs it, and Trino on `trino.<baseDomain>`,
Superset on `superset.`, Airflow on `airflow.` and JupyterHub on `jupyter.` when they are enabled and
published. Beyond Nova and the identity provider the chart publishes a component only when it is
listed in `ingress.exposeUnauthenticated`; the operator publishes it with the pillar or identity
setting that turns it on. Every published host is reachable at first: any address that can open a
connection may try to sign in. Setting the allow-list makes the ingress controller refuse every other
source address, with `403`, before the request reaches a service.

The list is not authentication and it is not a firewall for the cluster: it is one annotation on the
Ingress objects, and everything that carries its own Ingress is outside its reach. Keep the
platform's sign-in in place.

## Chart installs

```yaml
ingress:
  allowedCidrs:
    - 203.0.113.0/24
    - 2001:db8::/32
```

The same with `--set`:

```bash
helm upgrade --install stardelt chart --namespace stardelt -f my-values.yaml \
  --set 'ingress.allowedCidrs={203.0.113.0/24}'
```

A non-empty list renders `nginx.ingress.kubernetes.io/whitelist-source-range` on every Ingress the
chart renders; an empty list removes the annotation on the next `helm upgrade`. Entries are CIDRs, at
most 64, and anything else makes `helm template` fail. The annotation means something only on
ingress-nginx: another controller ignores it and the list has no effect.

Do not also set the same annotation under `ingress.annotations` — set the list, not both.

## Operator installs

The same list as a field of the `PlatformInstance`:

```yaml
apiVersion: stardelt.io/v1alpha1
kind: PlatformInstance
metadata:
  name: platform
spec:
  baseDomain: data.example.com
  ingress:
    enabled: true
    allowedCidrs:
      - 203.0.113.0/24
      - 2001:db8::/32
```

`spec.ingress.allowedCidrs` has the same shape and bounds: CIDRs, at most 64, empty means open. The
operator applies the annotation to every Ingress it creates for the instance. The field and its
constraints are listed in [the PlatformInstance reference](../reference/resources/platforminstance).

## What must keep working

**The cluster's own egress address.** Pods that call the platform's public names — a pipeline that
posts to Nova's API, a notebook that calls Trino at `trino.<baseDomain>` — leave the cluster through
the node's egress address and arrive at the ingress controller from there. That address has to be in
the list, or those calls get a `403`. This is the failure people hit first. Find it by running a pod
and reading the address it goes out as:

```console
$ kubectl -n stardelt run egress --rm -it --restart=Never \
    --image=curlimages/curl -- curl -s https://ifconfig.me
203.0.113.17
```

Then allow that address (or the cluster's NAT range) as well.

**Certificate renewal.** With cert-manager, an HTTP-01 challenge is served by the solver's own
Ingress, which is not one of the platform's Ingresses and does not carry the annotation, so renewal
keeps working. An install that uses DNS-01 needs no inbound path at all.

**A load balancer or proxy in front.** The controller then sees the load balancer's address, not the
client's. Turning on `use-forwarded-headers` and trusting the load balancer's ranges with
`proxy-real-ip-cidr` is what makes the list mean client addresses; without it a list allows the load
balancer and blocks everyone else.

**IPv6.** An IPv4-only list does not restrict IPv6 clients on a dual-stack install. Name both families
when both are reachable.

## Prove it

Read back the annotation on every Ingress:

```console
$ kubectl -n stardelt get ingress \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.nginx\.ingress\.kubernetes\.io/whitelist-source-range}{"\n"}{end}'
nova	203.0.113.0/24
trino	203.0.113.0/24
keycloak	203.0.113.0/24
```

Then make one request from outside the list and one from inside the cluster:

```console
$ curl -s -o /dev/null -w '%{http_code}\n' https://nova.example.com/api/health
403
```

The same request from a pod answers `200`.

[Checks to run](./checks) lists the read-only checks to run after an upgrade.

## Turning it off

Empty the list, or remove the field, and the annotation goes away on the next `helm upgrade` or the
operator's next reconcile. The endpoints are open to every address again.
