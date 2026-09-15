---
tags: [agents, mobile, profile]
---

# AGENTS.md - Profile and Cosmetics

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/profile/**` และอ่าน `../../../skills/cosmetics-profile/SKILL.md`

## Scope

Profile owns:
- public/private profile fetch and mapping
- avatar update flow
- profile query keys
- dispute/activity rating summaries displayed on profile

Cosmetic ownership/equip logic lives in `../cosmetics/`; profile may compose its resolved output.

## Rules

- Public profile data must not leak private wallet/credit fields
- Avatar update must go through service/repository; screen does not upload directly
- Query key changes must be coordinated with hooks using profile data
- Cosmetics shown on profile must come from resolved/equipped data, not hardcoded assumptions
- Username/display name behavior must stay aligned with `lib/username/**`

## Verification

Check profile screen and public user screen after behavior changes. For privacy-related changes, inspect selected columns carefully.
