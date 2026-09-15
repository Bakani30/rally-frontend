---
tags: [agents, mobile, run-tracking]
---

# AGENTS.md - Run Tracking

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/run-tracking/**` และอ่าน `../../../skills/run-tracking/SKILL.md`

🔀 **Flow map:** [run-flow](../../../docs/architecture/flows/run-flow.md) — GPS pipeline → buffer → submit → server verify/reward (solo/match/coop)

## Scope

โฟลเดอร์นี้ owns live running session:
- GPS collection and hygiene
- distance/pace derivation
- route encoding/matching
- session store/orchestration
- source adapters
- offline buffer/retry

## Rules

- GPS math, downsampling, route matching, pace derivation ต้องเป็น pure functions และมี tests
- Service orchestrates source/store/repository; source adapter ไม่ควรรู้เรื่อง UI
- Repository เป็นที่เดียวที่ invoke `submit-run-session`
- Store เก็บ session runtime state เท่านั้น ไม่เก็บ server truth ถาวร
- Background/location permissions ต้องแยกใน adapter/service ไม่เขียนใน screen
- Offline retry ต้อง idempotent ผ่าน session id/external workout id

## Folder Intent

- `gps/`: point quality, distance, smoothing, downsampling
- `routes/`: planned route encoding/matching
- `session/`: session lifecycle, store, repository, source interface
- `sources/`: concrete data producers
- `offline/`: local buffer and retry queue

## Verification

แก้ GPS/route/session derive ต้องรัน related tests:
- `npm test -- --run lib/run-tracking`

ถ้าแตะ live tracking UI ให้ตรวจ `app/run/**` ด้วย.
