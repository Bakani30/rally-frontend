---
tags: [agents, mobile, auth]
---

# AGENTS.md - Auth

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/auth/**`

## Scope

Auth owns:
- sign-in/sign-up service calls
- OAuth redirect helpers
- password reset actions
- auth session orchestration used by hooks/stores

Route UI lives in `app/(auth)/**`.

## Rules

- Screen calls auth hooks/services; no raw Supabase auth calls in screen
- OAuth redirect URLs must stay compatible with Expo/native and web callback routes
- Auth service can call Supabase auth APIs, but keep UI state and navigation outside service
- Do not store tokens manually outside Supabase/session storage unless explicitly required
- Username setup is separate; coordinate with `../username/`

## Verification

After auth changes, check sign-in, sign-up, reset, and OAuth callback assumptions by reading route/service flow.
