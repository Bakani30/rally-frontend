---
tags: [agents, mobile, cosmetics]
---

# AGENTS.md - Cosmetics

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/cosmetics/**` และอ่าน `../../../skills/cosmetics-profile/SKILL.md`

## Scope

Cosmetics owns:
- cosmetic catalog reads
- owned cosmetic list
- equip/unequip client orchestration
- slot/type mapping for profile decoration

Profile rendering lives in `../profile/` and `components/profile/`.

## Rules

- Ownership and equip authority stays server-side/RPC
- Client may resolve display state but must not grant ownership locally
- Slot names must match backend JSON shape: `frame`, `title`, `badge`, `emote`, `victory_animation`
- New cosmetic type requires backend catalog migration plus UI renderer support
- Gift shop cosmetic unlocks must stay coordinated with `../gifts/`

## Verification

Check profile rendering and gift redemption state when changing ownership/equip behavior.
