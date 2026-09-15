---
tags: [agents, mobile, gifts]
---

# AGENTS.md - Gifts and Redemption

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/gifts/**` และอ่าน `../../../skills/points-economy/SKILL.md`

## Scope

Gifts owns:
- gift catalog reads
- redemption orchestration
- gift item mapping/types
- purchased/owned display hints

Actual point/credit debit and reward fulfillment are server-side.

## Rules

- Redeem through edge function/RPC only; client never subtracts points/credits directly
- Cosmetic rewards must sync with `../cosmetics/`
- Credits and points must remain separate in type names and UI-facing data
- Per-user limits and ownership checks are server authority; app may pre-disable as a hint only
- Repository owns Supabase/edge calls; service maps domain result

## Verification

After redemption changes, invalidate/check wallet, gifts, cosmetics/profile data paths.
