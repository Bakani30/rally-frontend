---
tags: [agents, mobile, hooks]
---

# AGENTS.md - Hooks

อ่านไฟล์นี้ก่อนแก้ `rally-app/hooks/**`

## Responsibility

Hook เป็น bridge ระหว่าง UI กับ data/service:
- wrap TanStack Query / mutation
- read auth/session/client-only state
- call service/repository
- expose ergonomic state ให้ screen/component

## Rules

- Hook ห้ามมี business rule หลัก; delegate ไป `lib/<feature>/*Service.ts`
- Query key ต้อง stable และอยู่ใกล้ feature ถ้ามีหลาย hook ใช้ร่วมกัน
- Mutation ต้อง invalidate query ที่เกี่ยวข้องแบบชัดเจน
- อย่า mirror server data ลง Zustand
- Side effect ที่เกี่ยวกับ device integration ให้เรียก service/adapter ไม่เขียนใน hook ตรงๆ
- Hook ใหม่ชื่อ `useThing.ts`; export named function `useThing`

## Query Pattern

```
hooks/useMatch.ts
  -> lib/match/matchService.ts
  -> lib/match/matchRepository.ts
```

Repository เป็นจุดเดียวที่แตะ Supabase/edge function.

## Verification

ถ้า hook เปลี่ยน query/mutation behavior ให้รัน test ของ service/repository ที่ hook เรียก และ `npm run lint`.
