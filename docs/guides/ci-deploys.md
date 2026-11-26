---
title: "Deploy from CI without a stored secret"
sidebar_label: "Deploy from CI"
slug: /guides/ci-deploys
description: "A GitHub Actions job deploys a bundle with a token its own provider mints; the platform trusts one repository, one branch or one environment."
---

# Deploy from CI without a stored secret

A GitHub Actions job deploys a bundle with the token its own provider mints for it. Nothing is
stored in the CI system, and there is no secret to rotate.

## What happens

The job presents its GitHub Actions identity token to the identity provider as a client
assertion. The provider checks the signature, the issuer, the audience and the subject the stage
pinned, and answers with an ordinary realm token whose `azp` is `stardelt-deploy-<stage>`. Nova
accepts that token for the stage it names and for the pipelines of that stage's own group, and
refuses it for every other stage and every other group. No secret is stored anywhere.

That paragraph describes `identity.mode: platform`, where the platform runs Keycloak. With
`identity.mode: external` (your own provider) no client is created: Nova verifies the GitHub token
itself against `https://token.actions.githubusercontent.com`, and the `DeployStage` you create below
is the whole setup. The checks are the same — signature against the issuer's published keys, `aud`,
the pinned `sub`, and a token that has not been used before — only the component that makes them
differs, and so does the sign-in command.

## Create the stage

A `DeployStage` pins one repository and one branch to a stage. The `metadata.name` is the stage
name the deploy targets, `-t prod` below:

```yaml
apiVersion: stardelt.io/v1alpha1
kind: DeployStage
metadata:
  name: prod
  namespace: stardelt
spec:
  subject: "repo:stardelt@285991931/stardelt@1453997446:ref:refs/heads/main"
  audience: stardelt-deploy
```

Pin an environment instead of a branch when the job runs behind one — `:environment:` replaces
the `ref` part, and `spec.environment` names the same environment:

```yaml
apiVersion: stardelt.io/v1alpha1
kind: DeployStage
metadata:
  name: prod
  namespace: stardelt
spec:
  subject: "repo:stardelt/stardelt:environment:production"
  environment: production
```

The numbers in the first subject are GitHub's immutable ids for the repository and its owner. That
is what GitHub emits, and it stays valid when the repository or the owner is renamed, where a bare
`repo:<owner>/<name>` would stop matching.

`spec.audience` is a different value: the audience the realm client's mapper puts in the **realm**
token this stage accepts, defaulting to `stardelt-deploy`. Setting it never changes the identity
provider's `clientId`, which the GitHub token's audience must name; leave it out unless your realm
expects another value. Check the object:

```bash
kubectl -n stardelt get deploystage prod -o jsonpath='{.spec.subject}'
```

With `identity.mode: platform` the operator creates the Keycloak client `stardelt-deploy-prod` for
this stage, configured for federated client authentication from GitHub Actions. With
`identity.mode: external` it creates no client — it never writes to an identity provider it does not
own — and Nova reads the `DeployStage` itself.

## The workflow step

The assertion is GitHub's short-lived **identity token**, not `GITHUB_TOKEN`. The job needs
`permissions: id-token: write`, fetches the token, asks GitHub for the identity provider's own
`clientId` — `stardelt-deploy` in the shipped realm, not the stage's client id — masks it and keeps
it in a variable for the next step:

```yaml
permissions:
  id-token: write
steps:
  - uses: actions/checkout@v4
  - name: the CI's own token
    run: |
      token=$(curl -sS \
        -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
        "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=stardelt-deploy" | jq -r .value)
      echo "::add-mask::$token"
      echo "CI_TOKEN=$token" >> "$GITHUB_ENV"
  - name: sign in and deploy
    run: |
      stardelt login --federated --client-id stardelt-deploy-prod --assertion-env CI_TOKEN
      stardelt bundle deploy examples/shop-bundle -t prod
```

`--assertion-env` names the environment variable that holds the token; the CLI never prints it, and
the sign-in it stores lasts the token's five minutes. The job also needs `STARDELT_NOVA_URL` (or
`--host`) to say which install to deploy to.

With `identity.mode: external` the provider exchange is skipped: `--direct` sends GitHub's token to
Nova as the bearer itself. There is no client to name, so `--client-id` is left out, and `--host`
must be given:

```yaml
  - name: sign in and deploy
    run: |
      stardelt login --federated --direct --assertion-env CI_TOKEN --host "$STARDELT_NOVA_URL"
      stardelt bundle deploy examples/shop-bundle -t prod
```

The CLI keeps the token in the credentials file for four minutes and, when the next request finds
less than a minute left, reads the environment variable named by `--assertion-env` again instead of
asking the provider for anything.

## What the platform refuses

| What is presented | What answers, and what it says |
|---|---|
| A token minted for another audience | the provider: `Invalid token audience` |
| A `pull_request` token | the provider: the subject is not the branch or environment the stage pinned |
| A token older than five minutes | the provider: the assertion is expired |
| A replayed assertion | the provider: `Token reuse detected` |
| A token for another branch or environment of the same repository | the provider: the subject does not match the pinned one |
| A deploy to another stage | Nova: `this token belongs to deploy stage prod; it may only record a deployment to that stage` |
| A deployment of a pipeline in another group | Nova: `a deploy principal may only record a deployment of its own group` |

With `identity.mode: external` there is no provider in the path, so Nova answers every row itself:
HTTP `401` with `{"error":"unauthenticated"}` and a `detail` that says only that the token was
refused. The checks, and the outcome, are the ones in the table.

## What it does not do

- **No secret to rotate.** The trust is the repository, the branch or the environment; delete the
  `DeployStage` and the client stops accepting the token.
- **No browser, no person.** Nobody approves the job, so it cannot do what a person's sign-in
  does: the token deploys to its own stage, and Nova refuses it for any other stage and any other
  group.
- **Five minutes.** The realm token lives that long and cannot be renewed without the CI token, so
  a job that outlives the sign-in signs in again in its next step.
- **GitHub Actions only.** Nova knows one CI issuer, a constant
  (`GITHUB_ACTIONS_ISSUER`, `https://token.actions.githubusercontent.com`). Another CI provider
  needs its own design; the token it mints would not match a stage today.
- **One Nova replica.** "Not used before" is kept in Nova's process memory for ten minutes. With
  more than one replica, a token replayed inside its five minutes could be accepted by a replica
  that did not see it; the state store is the fix when Nova runs more than one copy.

## Next

- [Publish pipelines from Git](/docs/guides/publish-pipelines): the bundle, the plan, the deploy and the
  prune this page's last step runs.
- [Service principals](/docs/guides/service-principals): the other non-human identity, with a stored
  secret, for a job that cannot mint a short-lived token.
