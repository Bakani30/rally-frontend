---
tags: [agents, mobile, vouchers]
---

# AGENTS.md - Vouchers

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/vouchers/**` และอ่าน `../../../skills/points-economy/SKILL.md`

## Scope

Voucher wallet client:
- shop catalog filtered to voucher items (`list-vouchers`)
- redeem flow that issues a `user_vouchers` row with a short_code (`redeem-voucher`)
- user inventory of issued vouchers (`list-my-vouchers`)

`mark-voucher-used` is partner-facing only (server-side shared secret) — not callable from mobile.

## Rules

- Catalog and inventory both go through edge functions; do not query `gift_items` or `user_vouchers` from the client
- Redeem mutation must invalidate catalog + own vouchers + wallet summary + gift-items + gift-redemptions
- `short_code` is the secret a partner verifies in person; treat it as sensitive in UI (avoid logging)
- Never auto-mark voucher as used from mobile — that endpoint is partner-only

## Verification

Type/lint after changes; for redeem flow integration, also exercise wallet hooks since balance changes.
