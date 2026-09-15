---
tags: [agents, mobile, activity]
---

# AGENTS.md - Activities

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/activities/**`

## Read First

- Running match rules: `../../../skills/activities/running/SKILL.md`
- Team sports: `../../../skills/activities/team-sports/SKILL.md`
- Verification: `../../../skills/verification-layers/SKILL.md`
- Points economy: `../../../skills/points-economy/SKILL.md`

## Scope

Activities owns:
- activity submission
- activity history/detail
- activity memory
- shared select/mapping for activity sessions

Run GPS recording lives in `../run-tracking/`; match result lifecycle lives in `../match/`.

## Rules

- Submission service validates user intent and delegates trusted reward/verification to server
- Repository owns Supabase/edge calls
- History/detail services map DB shape into app shape; avoid UI text here unless it is a domain label shared across screens
- Shared select fragments must remain read-only and narrowly scoped
- Activity reward/check-in changes must respect daily cap and server-side authority

## Verification

Run tests for changed service/mapper. If activity changes affect match or wallet totals, also verify related match/wallet behavior.
