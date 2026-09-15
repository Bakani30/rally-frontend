# @rally/contracts

Shared API contract helpers for Rally surfaces.

This package is the typed companion to `docs/architecture/api-contracts.md`.
Use it for request and response schemas, stable error code names, and endpoint
registry metadata that mobile, admin, and backend contributors can review
without coupling app runtimes together.

Current scope is intentionally partial. If an endpoint is not represented here
yet, `docs/architecture/api-contracts.md` remains the source of truth and the
nearest mobile/admin/backend repository types remain the implementation check.

Rules:

- Keep contracts platform-neutral.
- Do not import React, Expo, Next.js, or Supabase clients.
- Update `docs/architecture/api-contracts.md` when public API behavior changes.
- Add package exports incrementally only when a caller or generator actually
  needs the shared typed contract.
