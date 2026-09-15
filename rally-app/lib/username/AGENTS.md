---
tags: [agents, mobile, auth]
---

# AGENTS.md - Username

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/username/**`

## Scope

Username owns:
- username change pricing/client rules
- username service orchestration
- username-related domain errors

User search/public display lives in `../users/` and `../profile/`.

## Rules

- Availability, quota, and paid change authority must remain server-side
- Client pricing helpers may explain expected cost but must not be trusted for billing
- Keep display name and handle semantics explicit
- Do not update profile/user search assumptions without checking dependent screens

## Verification

Check set-username, edit-username, profile, and search flows when changing username shape or pricing.
