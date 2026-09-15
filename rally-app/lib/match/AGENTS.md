---
tags: [agents, mobile, match]
---

# AGENTS.md - Match Lifecycle

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/match/**` และอ่าน `../../../skills/match-lifecycle/SKILL.md`

🔀 **Flow map:** [match-flow](../../../docs/architecture/flows/match-flow.md) — ทั้ง chain screen→hook→service→repo→edge fn→table + state machine + จุด settlement

## Scope

โฟลเดอร์นี้ owns client-side match lifecycle:
- create/join/accept/unaccept/cancel/leave
- stake edit
- submit/confirm/dispute result
- next action calculation
- proof upload orchestration
- state machine helpers

## Rules

- Transition logic ต้องผ่าน `matchStateMachine.ts` หรือ service method ที่ใช้ guard เดียวกัน
- Screen/hook ห้ามคำนวณ next status เอง
- Stake/settlement mutation ต้องเรียก edge function/RPC ผ่าน repository เท่านั้น
- Proof upload แยกจาก result submission แต่ service ต้อง orchestrate ให้ user flow atomic เท่าที่ทำได้
- `matchNextAction.ts` เป็น presentation decision ได้ แต่ห้าม mutate
- อย่าเพิ่ม status ใหม่โดยไม่ sync backend enum, migration, edge function schema, UI state และ tests

## File Ownership

- `matchService.ts`: public client API + orchestration
- `matchRepository.ts`: Supabase/edge calls
- `matchStateMachine.ts`: pure transition/guard logic
- `matchRules.ts`: pure rule/stake helpers
- `matchConfig.ts`: constants
- `joinCode.ts`: join code formatting/parsing only

## Verification

แก้ lifecycle/stake/status ต้องมี test หรืออย่างน้อยรัน existing related tests และตรวจ backend function/migration ที่เกี่ยวข้อง.
