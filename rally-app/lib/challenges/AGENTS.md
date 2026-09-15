---
tags: [agents, mobile, challenges]
---

# AGENTS.md - Community Challenges

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/challenges/**` และอ่าน `../../../skills/community-challenges/SKILL.md`

🔀 **Flow map:** [challenge-flow](../../../docs/architecture/flows/challenge-flow.md) — join → server progress recompute → claim reward + lifecycle

## Scope

Challenges owns:
- challenge discovery/detail
- join/claim actions
- route attempt/progress surface
- challenge reward claim client orchestration

Creator/moderation rules in the skill are product direction; implement only the slice requested.

## Rules

- Challenge lifecycle mutation must go through service -> repository -> edge function/RPC
- Client must not decide reward eligibility for trusted outcomes; it may show optimistic/derived hints only
- Rule DSL or route matching validation must be pure and testable when added
- Query keys live in `challengeQueryKeys.ts`
- Reward claim must invalidate challenge detail, list, wallet, and profile stats when relevant

## Verification

Run related challenge tests if present, plus `npm run lint`. For reward/progress changes, verify matching backend function/migration contract.
