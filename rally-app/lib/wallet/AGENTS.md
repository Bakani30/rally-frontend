---
tags: [agents, mobile, economy]
---

# AGENTS.md - Wallet and Economy

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/wallet/**` และอ่าน `../../../skills/points-economy/SKILL.md`

🔀 **Flow map:** [economy-flow](../../../docs/architecture/flows/economy-flow.md) — 3 balances, earn/spend, daily cap, score-split guardrail

## Scope

Wallet owns app-side presentation and fetching for:
- leaderboard points balance
- locked points
- credit wallet summary
- transaction-style display data

Actual mutation of points/credits is server-side only.

## Rules

- Client ห้ามคำนวณ balance ใหม่จาก delta แล้วถือเป็น truth
- `walletRepository.ts` เป็น read/invoke layer เท่านั้น
- `walletService.ts` map/format business-facing summary ได้ แต่ห้าม bypass server authority
- Credits and leaderboard points stay separate in names, types, and UI copy
- Any earn/spend/lock/unlock flow must use edge function/RPC and create audit rows server-side

## Verification

แตะ wallet/economy behavior ต้องตรวจว่าข้อมูลที่แสดงไม่เปิดเผย credit state ผิดที่ และไม่สร้าง mutation client-side.
