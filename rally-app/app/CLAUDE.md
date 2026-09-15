# AGENTS.md - Screens and Routes

อ่านไฟล์นี้ก่อนแก้ `rally-app/app/**`

## Responsibility

`app/**` เป็น Expo Router adapter layer:
- render screen
- parse route params
- hold transient UI form state เท่าที่จำเป็น
- call hooks/actions
- navigate

## ห้าม

- ห้าม business rule ใน screen เช่น stake cap, winner calculation, wallet mutation, GPS hygiene
- ห้ามเรียก Supabase/fetch/storage/edge function ตรงๆ
- ห้ามสร้าง helper ยาวๆ ใน screen ถ้า logic ใช้ test ได้ ให้ย้ายไป `lib/**`
- ห้ามทำ component ย่อยหลายตัวใน screen ถ้า reuse ได้หรือเริ่มยาว ให้ย้ายไป `components/<feature>/`

## Pattern

```
app/match/new.tsx
  -> hooks/useCreateMatch.ts
  -> lib/match/matchService.ts
  -> lib/match/matchRepository.ts
```

Screen ควรอ่านเหมือน orchestration:
1. read auth/session
2. call hook
3. render loading/error/empty/content
4. handle button press โดยเรียก mutation จาก hook

## Feature Reading Map

- `app/match/**`: อ่าน `../../skills/match-lifecycle/SKILL.md`
- `app/run/**`: อ่าน `../../skills/run-tracking/SKILL.md` และ `../../skills/activities/running/SKILL.md`
- `app/challenges/**`: อ่าน `../../skills/community-challenges/SKILL.md`
- `app/(tabs)/leaderboard.tsx`: อ่าน `../../skills/leaderboard/SKILL.md`
- `app/wallet.tsx`, `app/gifts/**`, `app/pro.tsx`: อ่าน `../../skills/points-economy/SKILL.md`
- `app/user/**`, `app/(tabs)/profile.tsx`, `app/cosmetics/**`: อ่าน `../../skills/cosmetics-profile/SKILL.md`

## Verification

อย่างน้อยรัน `npm run lint` หลังแก้ screen. ถ้า screen ผูก mutation/query ให้รัน test ของ service/repository ที่เกี่ยวข้องด้วย.
