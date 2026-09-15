---
tags: [agents, mobile, lib]
---

# AGENTS.md - Lib, Services, Repositories

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/**`

## Responsibility

`lib/**` เป็นหัวใจของ business logic และ data access:
- `*Service.ts` = business rule/orchestration
- `*Repository.ts` = Supabase/edge function/data access เท่านั้น
- `*Types.ts` = type
- `*Rules.ts`, `*Config.ts` = constants/rule tables
- pure utility = no React, no UI, unit-testable

## Layer Rules

- Service ห้าม import React, React Native, Expo Router, UI component
- Repository ห้ามตัดสิน business rule; ทำ request/query และ map error/data เท่านั้น
- Supabase client อยู่ใน repository หรือ shared integration wrapper เท่านั้น
- ทุก mutation ที่มี trust boundary ต้องไป server-side edge function/RPC
- Pure calculations ต้องมี test ถ้าแตะเงินแต้ม, ranking, GPS, settlement, verification

## Error Handling

- Repository map low-level Supabase/edge errors ให้ service ใช้อ่านได้
- Service return/throw domain error ที่ hook แปลงเป็น UI message ได้
- อย่าซ่อน error ด้วย fallback เงียบๆ ใน logic ที่เกี่ยวกับแต้ม, match, proof, หรือ auth

## Verification

- Logic pure: เพิ่ม/แก้ unit test
- Repository contract: mock Supabase หรือ edge response เท่าที่มี pattern เดิม
- รัน `npm test -- --run <related-test>` และ `npm run lint`
