---
name: change-api
description: Change a Nova API route and carry the change through the OpenAPI contract, the Python package and the docs.
when_to_use: Adding, changing or removing a route in stardelt-nova's backend, or a request or response type.
---

# Change the Nova API

Full recipe: `docs/developer/recipes.md`, "Change the API".

## Steps

1. In `stardelt-nova`, write the handler. Add the route in `api_router()` in `backend/src/main.rs`, or in
   `admin_router()` if only administrators may call it.
2. Add `#[utoipa::path]` and tag it `public` or `internal`. Derive `ToSchema` on its types. Register it in
   `backend/src/openapi.rs`. `public` is a promise to tools and scripts, so choose `internal` when in doubt.
3. If the interface uses it, serve it in demo mode too (`backend/src/demo.rs`).
4. Regenerate the contract: `UPDATE_OPENAPI=1 cargo test -p stardelt-nova-backend openapi`. Commit
   `openapi/nova.json`.
5. A breaking change to a `public` route bumps the version of Nova's backend crate. Say so in the title.
6. After it reaches `main`:
   - for `public` routes, in `stardelt-python`, run `python scripts/sync_contract.py` and commit
     `stardelt/operations.json`;
   - in `stardelt-docs`, run `npm run sync:reference && npm run gen:reference`, and update the guide.

## Check

```bash
cargo fmt --check && cargo clippy --all-targets -- -D warnings
cargo test -p stardelt-nova-backend
npm --prefix frontend run build
```

## Watch out

- `GET /api/openapi.json` is served without sign-in. Put no secrets, upstream URLs or data in descriptions.
- Never put a token in a URL, a log line or an error message.
- Issue numbers in descriptions reach the public reference. Leave them out.
