---
tags: [agents, mobile, social]
---

# AGENTS.md - Users and Search

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/users/**`

## Scope

Users owns:
- public user lookup
- user search
- lightweight user records for friend/match invite flows

Full profile aggregation lives in `../profile/`.

## Rules

- Search results must expose public fields only
- Repository owns RPC/edge calls; service handles mapping and input normalization
- Keep search throttling/debounce in hook/UI layer, not repository
- Do not join wallet/credit/private auth data into public user records
- Username/display-name rules must stay aligned with `../username/`

## Verification

For search changes, check empty, partial, and exact-match behavior where feasible.
