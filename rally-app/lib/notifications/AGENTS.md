---
tags: [agents, mobile, notifications]
---

# AGENTS.md - Notifications

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/notifications/**` และอ่าน `../../../skills/notifications/SKILL.md`

## Scope

Client notification code owns:
- permission request
- Expo push token registration
- foreground behavior
- notification tap routing

Server trigger/outbox/delivery logic lives under `../../../supabase/**`.

## Rules

- Screen/component ห้าม call Expo Notifications API ตรงๆ
- Registration must be user-aware and re-run safely when auth user changes
- Token registration goes through `register-push-token` edge function
- Tap routing should validate payload shape before navigating
- Do not add local notifications unless requested; if added, create separate service

## Verification

Push requires real device + dev build. For code changes, run lint and verify registration/tap paths by reading payload contracts.
