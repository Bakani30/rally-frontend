---
tags: [agents, mobile, supabase]
---

# AGENTS.md - Mobile API Boundary

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/supabase/**` หรือ shared API/error helpers ฝั่ง mobile

## Scope

โฟลเดอร์นี้เป็น boundary ระหว่าง mobile app กับ Supabase/Edge Function API:
- shared edge error parsing
- common API response handling
- Supabase-specific adapter helpers

Feature repositories อยู่ใน `lib/<feature>/*Repository.ts` และควรใช้ helper จากที่นี่เมื่อเหมาะสม

## Rules

- Screen/component/hook ห้าม parse raw edge error เอง ถ้ามี helper กลางแล้วให้ใช้ helper กลาง
- Repository ต้อง return domain-friendly data/error ให้ service ไม่ใช่ leak raw Supabase response ทุกที่
- อย่าเปลี่ยน shared parser โดยไม่เช็คทุก repository ที่ใช้
- Error handling ต้อง branch ด้วย `error.code` ไม่ใช่ `message`
- API response shape ต้องตรงกับ `../../../docs/architecture/api-contracts.md`
- ห้ามเก็บ service role key หรือ server secret ใน mobile code

## Repository Pattern

```
lib/<feature>/<feature>Repository.ts
  -> supabase.functions.invoke('<endpoint>', { body })
  -> parse edge error via shared helper
  -> return typed payload
```

Service/hook เป็นคนตัดสิน UX ต่อจาก typed result.

## Verification

ถ้าแก้ shared error/API helper ให้ search callers:

```bash
rg "edgeError|functions\\.invoke|supabase\\.functions" rally-app/lib rally-app/hooks rally-app/app
```

แล้วรัน tests หรือตรวจ repository ที่เกี่ยวข้อง.
