---
tags: [agents, mobile]
---

# AGENTS.md - Rally Mobile App

อ่านไฟล์นี้ก่อนแก้ทุกอย่างใต้ `rally-app/` และถือกฎ root `../AGENTS.md` ด้วย

## Scope

Expo + React Native + TypeScript app สำหรับ player-facing flow เท่านั้น:
- `app/**`: Expo Router screens/layouts
- `components/**`: reusable UI หรือ feature UI
- `hooks/**`: bridge ระหว่าง UI กับ service/query
- `lib/**`: business logic, repositories, integration wrappers
- `stores/**`: client-only Zustand state
- `types/**`: type/interface/schema เท่านั้น

ห้ามเพิ่ม admin/dev/ops screen ใหม่ใน mobile app เว้นแต่ user ขอชัดเจน ให้ใช้ `../admin-dashboard/`

## Read First

- Screen/navigation/UI state: `../skills/mobile-app/SKILL.md`
- Visual/UI polish: `../skills/mobile-app-ui-design/SKILL.md`
- Frontend craft layer: if installed, use `../.agents/skills/impeccable/SKILL.md` with `../.agents/context/PRODUCT.md` and `../.agents/context/DESIGN.md` for shape, critique, audit, polish, and UX copy on UI work
- API behavior: `../docs/architecture/api-contracts.md`
- Remote Supabase workflow: `../docs/architecture/remote-first-workflow.md`
- Singapore cutover state: `../docs/devops/supabase-singapore-cutover.md`
- ใกล้ไฟล์ที่สุด: `app/AGENTS.md`, `components/AGENTS.md`, `hooks/AGENTS.md`, หรือ `lib/**/AGENTS.md`

## Remote Runtime

- Mobile env should point to `https://ltrdptqotnioajnlesqy.supabase.co`
- Use `EXPO_PUBLIC_SUPABASE_FUNCTION_REGION=ap-southeast-1`
- Legacy Tokyo project `ktpuwnzhinwilrdkbrfx` was deleted; it is historical context, not a rollback target.

## Alpha Android Release

- Android builds are team-owned or remote EAS-owned. This workspace intentionally does
  not build Android locally; when credit is unavailable, wait for credit or hand the
  build to the team.
- For Play Store Alpha, use the committed release candidate, profile `alpha`,
  `channel=alpha`, `environment=production`, and a store AAB. Use the handoff template
  in `../docs/devops/release-packets/android-build-handoff-template.md`.
- For development/test builds, use the `preview` lane by default. Record any exception
  (such as production-like backend or native-module constraints) in the handoff and do
  not send that artifact to Play Store.
- Do not use profile `alpha-android` for Play Store; it is an internal APK profile.
- Do not use `--latest`; hand off the exact verified artifact and its SHA-256.
- The `submit.alpha.android.track` must remain `alpha`; the handoff must reject an
  implicit/default track before the owner uploads the artifact.
- EAS Submit also needs a Google Play Service Account already configured for the
  project. Configure that credential once through the EAS credential flow; never
  commit the JSON key or try to create it from a non-interactive submit.

## Visual Theme Palette

ธีม Rally ต่อจากนี้ใช้ **Colosseum Identity** เป็น core brand universe: โคลอสเซียม, สนามแข่งขัน, podium/ranking moment, สีส้ม, และ mascot นักสู้แบบ playful. **Arcade Arena** ยังเป็น UI vocabulary ภายในทิศทางนี้: blocky HUD, pill status, CTA เด่น, sport skins, score economy ชัด, และ fighting-game hierarchy. Reference ที่ล็อกคือ **2 + 1 + moodboard ใหม่**: ใช้สองทิศทาง UI ที่เลือกไว้ + moodboard โรม/โคลอสเซียม/มาสคอต เพื่อเสริม identity เดียวกัน ไม่ใช่เปิด direction ใหม่. ให้ถือหน้า **Ranking** เป็น master player-facing UX/UI grammar ของแอพ: screen อื่นต้องยืม hierarchy, category/status chips, score vault, avatar initials, current-user treatment, score delta, bottom-nav weight, และ scan row rhythm จาก Ranking แล้วปรับให้เข้ากับงานของหน้านั้น. Home/Ranking ใช้ภาพสว่างแบบ sporty podium ได้เมื่อช่วยให้อ่านง่าย; Fight/match/stake surface ใช้ vault/panel เข้มเพื่อให้การแข่งขันดูมีน้ำหนัก.

- Arena floor / action: `#eb773c`
- Readable HUD panel: `#ffffff`
- Arena ink / score vault: `#161616`
- Fight panel: `#202020`
- Score / reward / economy: `#eac31a`
- Trust / live / verified / positive values: `#2fe39a` (dark) / `#0fa968` (light) = the unified `theme.green` / `theme.greenVivid`
- Risk / stake / loss: `#c73f41`
- Secondary contrast: `#808bc3`
- Deep accent / shadow: `#4d2323`

กฎการใช้สี: orange เป็น colosseum field/action energy และ primary CTA; white ใช้เป็น readable HUD surface และ logo mark contrast; yellow ใช้เฉพาะแต้ม คะแนน reward wallet event code crown/star และ podium อันดับ 1 เท่านั้น ห้ามใช้เป็น active tab/filter/card ทั่วไป; เขียวใช้ token เดียวกันทั้งระบบสำหรับ **badge/bar/ไอคอน** live/trust/verified และ **ตัวเลข+ข้อความสีเขียวเชิงบวก** (wins, +RP, +rating, progress, ราคาฟรี): `theme.green` / `theme.greenVivid` (#2fe39a dark / #0fa968 light); red ใช้กับ stake/loss/destructive/error; basketball/secondary ใช้ `#808bc3` ไม่ใช่ yellow; Fight mode และ high-stakes match surface ต้องใช้ dark vault/panel เพื่อให้คะแนนและการแข่งขันดูมีน้ำหนัก.

## Visual Shape & Product Feel

Rally UI ต้องมีรูปทรงและอารมณ์แบบ Colosseum Identity + playful arcade / modern fighting-game interface:

- รูปร่างหลักผสมระหว่าง blocky cards กับ pill capsules: การ์ดใหญ่ควรเป็นเหลี่ยมมนแบบชัดเจน, action chips/labels/progress ใช้ทรง pill ยาว ๆ
- ใช้ corner radius ที่ตั้งใจ ไม่ใช่ทุกอย่างมนเท่ากัน: hero/card ประมาณ 20-32, list rows/pills ประมาณ 999, small controls ประมาณ 12-18
- Layout/composition ให้ยึด colosseum/podium + sport HUD เป็น reference หลัก: หน้าเลือกโหมด/แมตช์ควรมี panel ใหญ่ชัด, visual hierarchy แบบเกม fighting, CTA เด่นเหมือนพร้อมกดเข้า fight, และองค์ประกอบซ้อนเป็นชั้นแบบ arcade HUD
- Logo anchor: ยึด simplified white colosseum ruin + star บน orange เป็น primary Rally Logo Mark direction; ห้ามตีความเป็น stadium, trophy, shield, badge, หรือ abstract letterform ทั่วไป
- Ranking anchor: หน้า Ranking ต้องยึด sporty dynamic podium/list reference เป็นหลัก และเป็นแม่แบบ UX/UI ของ player-facing app: bright HUD panel, angled podium cards, black score vault, yellow เฉพาะ rank-one/crown/score, avatar initials, current-user highlight, score delta, bottom-nav active weight, และ list scan เร็ว
- App-wide Ranking grammar: Home, Start Match, Guild, Rewards, Profile และ flow player-facing อื่นควรรู้สึกว่าอยู่ระบบเดียวกับ Ranking ผ่าน title hierarchy, category/status chips, rank/state badge, avatar/initial, score vault, scan row, current-user emphasis, และ compact delta โดยไม่จำเป็นต้อง copy layout Ranking ตรง ๆ
- Category selection anchor: หน้าเลือกหมวด/กีฬา/Start Match ต้องรู้สึกเหมือนเลือก arena mode ไม่ใช่ settings picker: มี icon chips, locked/available states, selected sport ใหญ่สุด, left/right navigation, panel ใหญ่, CTA ชัด, stat vault สั้น ๆ, และ rhythm แบบ Ranking row/chip
- ใช้ palette ที่ล็อกไว้ด้านบนเท่านั้นเป็นฐานสี แม้ layout จะอิงเกมหรือ sport reference: ห้ามเปลี่ยนไปใช้ palette น้ำเงิน/ม่วงของ reference ถ้าไม่ได้ถูกขอชัดเจน
- Layout ควรให้ความรู้สึกเหมือนตู้เกม/เกม competitive: สีเป็นแถบใหญ่, stack เป็นชั้น ๆ, label ใหญ่ชัด, CTA อ่านง่ายและกดสนุก
- แรงบันดาลใจภาพรวม: colosseum architecture, podium/ranking board, arcade cabinet UI, และ fighting-game energy โดยไม่คัดลอก asset, character, logo, หรือหน้าจอตรง ๆ; Arcade Arena reference ใช้เสริม layering/CTA/score pressure เท่านั้น ไม่ใช่ตัวแทน identity ทั้งหมด
- Logo direction: ใช้ simplified colosseum silhouette + star เป็น primary Rally Logo Mark สำหรับ app identity/splash/high-level brand surface เมื่อมี production-ready asset
- Mascot direction: ใช้ gladiator-inspired Rally character เป็น arena host/celebration/empty-state/recap personality; ห้ามให้ mascot ไปทับ score, consent, verification, wallet, destructive action, หรือ task-critical UI
- ห้ามใช้คอนเซปต์จากรูป habit/to-do/productivity app ที่เคยแนบ (`IMG_3020.JPG`, `IMG_3021.JPG`): ไม่เอา habit tracker, workspace/to-do board, mascot 3D productivity, หรือ pill-list แบบแอพงานบ้านเป็น reference หลักของ Rally
- หลีกเลี่ยง dashboard SaaS ที่เรียบจืดหรือ card เทาเยอะเกินไป; Rally ต้องดู “น่าเล่น” เหมือนกำลังเลือกโหมด/เข้าห้อง/รับรางวัลในเกม
- ใช้สีสดเป็น surface สำคัญได้ แต่ต้องรักษา hierarchy และ contrast: text สำคัญต้องอ่านง่าย, action หลักต้องเด่น, destructive/competitive ใช้ `#c73f41`
- Motion ควรรู้สึก responsive แบบเกม: snap, bounce, slide สั้น ๆ 150-300ms; ห้าม animation ย้วยหรือช้าเกินไป

### Impeccable Frontend Craft Layer

สำหรับงาน mobile/frontend UI ให้ใช้ Impeccable เป็น craft lens หลักหลังจากอ่าน Rally rules แล้ว โดยถือ priority นี้เสมอ:

1. `../AGENTS.md`, ไฟล์ AGENTS ใกล้งาน, และ Rally domain skills
2. `../skills/mobile-app-ui-design/SKILL.md`
3. `../.agents/skills/impeccable/SKILL.md` และ references ที่ตรงกับคำสั่ง เช่น `shape`, `critique`, `audit`, `polish`, `harden`
4. implementation pattern ในไฟล์จริง

ถ้า Impeccable ขัดกับ Rally palette, Colosseum Identity, Arcade Arena vocabulary, consent/economy/verification rules, หรือ mobile architecture boundaries ให้ตาม Rally ก่อนเสมอ. ใช้ Impeccable เพื่อยกระดับ hierarchy, rhythm, typography, motion, copy, responsive/detail polish, และ anti-pattern checks ไม่ใช่เพื่อเปลี่ยน product direction หรือเพิ่ม runtime dependency ใหม่.

## Guild + Smartwatch Product Direction

Rally mobile ต้องออกแบบโดยคิดว่าอนาคตมี 2 social/activity loops ใหญ่: กิลด์ และสมาร์ทวอช

### Guilds

- กิลด์คือ team identity + cooperative goals + rivalry ไม่ใช่แค่รายชื่อสมาชิกหรือห้องแชท
- ทุก guild flow ต้องรักษา consent-first rule: invite, join, role change, contribution visibility และ notification ต้องชัดเจน
- Guild contribution ควรผูกกับ `activity_sessions` หรือ verified activity source เสมอเพื่อกัน double count และทำให้ประวัติย้อนดูได้
- UI ของกิลด์ควรรู้สึกเหมือน “ทีมพร้อมลงสนาม”: banner, goal progress, member contribution, recent wins, rival callout, CTA เข้า activity/match ต้องเด่น
- อย่าเพิ่ม admin/ops guild screen ใน mobile app; moderation, abuse review, economy health และ official event setup อยู่ใน `../admin-dashboard/`

### Smartwatch / Wearable Experience

- สมาร์ทวอชคือ experience accelerator: ลดการกรอกเอง, เพิ่มความน่าเชื่อถือ, ทำให้ run/session recap สนุกขึ้น และส่ง contribution เข้ากิลด์ได้เร็ว
- คนมี Apple Watch / Galaxy Watch / Xiaomi / Fitbit ผ่าน HealthKit/Health Connect ควรรู้สึกว่า Rally ใช้อุปกรณ์ของเขาได้คุ้มกว่าแอพ activity ทั่วไป: auto-detect workout, verified badge, live progress, HR/effort signal, streak/mission recap และ guild goal progress
- คนไม่มี watch ยังต้องเล่นได้ด้วย honor/GPS/community verification; ห้ามทำ UX ให้เหมือนถูกลงโทษเพราะไม่มีอุปกรณ์
- ห้ามให้ smartwatch เป็น pay-to-win ใน economy: sensor data เพิ่ม trust และลด friction ได้ แต่ไม่ควรให้แต้มพิเศษที่ทำให้ stake/match ไม่ยุติธรรม เว้นแต่ product/economy doc ระบุชัด
- Permission copy ต้องสั้น ตรง และบอกประโยชน์ทันที: “verify result”, “sync run”, “count toward guild goal” ไม่ใช่ขอ health data แบบกว้าง ๆ
- Health data เป็น sensitive data: แสดงเฉพาะข้อมูลที่มีประโยชน์ต่อผู้เล่น, อย่าเปิด raw HR/GPS ให้คนอื่นเห็นโดยไม่จำเป็น, และต้องมี fallback/empty/error state ที่ไม่กล่าวโทษผู้ใช้
- Native watch companion app, complication, haptic prompt หรือ live watch UI เป็น future path; current default ให้เริ่มจาก phone app + HealthKit/Health Connect ก่อน เว้นแต่ user ขอ native watch ชัดเจน
- ก่อนอ้างว่า watch integration ทำงานจริง ต้อง field-test บนอุปกรณ์จริง; simulator/mock ใช้ได้เฉพาะ dev/demo state และต้องไม่ปะปนกับ verified result

### Implementation Boundaries

- Wearable source adapters อยู่ใน `lib/health/**` หรือ `lib/run-tracking/sources/**`; screen/component ห้ามคุยกับ HealthKit/Health Connect ตรง ๆ
- Watch/GPS import ต้องผ่าน hook → service → repository เหมือน flow อื่น และ server เป็นคนตัดสิน `verification_level`
- UI state เช่น permission sheet, sync sheet, selected workout อยู่ใน component/Zustand ได้ แต่ server activity, guild goal, match result ใช้ TanStack Query
- ถ้าเพิ่ม guild หรือ wearable feature ให้ดู `../docs/architecture/data-model.md`, `../docs/architecture/api-contracts.md`, `../skills/run-tracking/SKILL.md`, และ `../skills/verification-layers/SKILL.md` ก่อนแก้

## Boundaries

- Screen/component ห้าม import `@/lib/supabase` หรือเรียก `fetch()` / `supabase.from()` ตรงๆ
- Screen render + parse UI input; hook เรียก service/query; service/repository ทำ logic/data access
- Server state ใช้ TanStack Query hooks; client-only UI state ใช้ Zustand
- อย่า mirror server data ลง Zustand
- Service/lib ห้าม import React, React Native, หรือ Expo UI APIs
- ใช้ `@/` import ภายใน app และ named export สำหรับ component/hook/service ใหม่
- 1 ไฟล์ = 1 responsibility; ถ้าเกินประมาณ 200 บรรทัดให้พิจารณาแยก

## Verification

รันจาก `rally-app/`:

```bash
npm run lint
npm run typecheck
npm test -- --run
```

Native visual/smoke rule:
- เวลาเทส visual, smoke, acceptance หรือ auth flow ของ mobile app ห้ามใช้ Expo web/browser เป็นตัวแทน เว้นแต่ user ขอชัดเจนหรือ native simulator ติด blocker ที่ระบุเหตุผลแล้ว
- ให้เทสใน iOS Simulator หรือ Android Emulator ผ่าน Expo/native app runtime จริงเป็นค่าเริ่มต้น และรายงานว่าใช้ simulator/device ตัวไหน
- ถ้า flow ต้อง login/signup ให้สร้างบัญชีอีเมลทดสอบแบบ throwaway ในแอปจริงสำหรับรอบนั้น ห้ามใช้ personal email ของ user และห้ามบันทึกรหัสผ่านจริงลง repo/docs

ถ้าเปลี่ยน screen สำคัญ ให้รัน native simulator และเปิดดูเมื่อ feasible:

```bash
npm run dev
```

งานเอกสารหรือ path-only change ใช้ `rg` เช็ก link/path ให้พอ

## Git

รัน `git status`, `git diff`, commit, branch, push จาก repo root `/Users/mr.coresynapse/Downloads/rally`
