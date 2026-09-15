---
tags: [agents, mobile, components]
---

# AGENTS.md - Components

อ่านไฟล์นี้ก่อนแก้ `rally-app/components/**`

## Responsibility

Component แสดงผลและรับ callback เท่านั้น:
- format UI state
- show loading/empty/error visual
- emit user intent ผ่าน props

Business decision ให้ส่งมาจาก hook/service แล้วค่อย render

## Rules

- 1 component = 1 primary export ต่อไฟล์
- Props type อยู่เหนือ component และชื่อ `ComponentNameProps`
- ใช้ function declaration: `export function MatchCard(...)`
- อย่า import Supabase, repository, service mutation, router side-effect ยกเว้น component นั้นเป็น navigation primitive จริงๆ
- Feature component อยู่ใน `components/<feature>/`; primitive UI อยู่ใน `components/ui/`
- Style object ที่ share เฉพาะ feature ให้อยู่ใน `components/<feature>/<feature>Styles.ts`
- Proof/media helpers ที่ไม่ใช่ UI ให้แยกเป็น util ไฟล์ของ feature

## UI Discipline

- Touch target อย่างน้อย 44x44
- Text ต้องไม่ล้น container บน mobile
- ใช้ existing theme/constants ก่อนเพิ่มสีใหม่
- ใช้ icon/symbol สำหรับ control ที่คุ้นเคย แทนปุ่ม text ยาว
- อย่าใส่ explanatory copy เพื่ออธิบายว่าฟีเจอร์ทำงานยังไงใน UI ถ้า workflow ควรชัดด้วย layout

## Verification

ถ้าเปลี่ยน component ที่ใช้หลาย screen ให้ตรวจ screen หลักอย่างน้อยหนึ่งจุด และรัน `npm run lint`.
