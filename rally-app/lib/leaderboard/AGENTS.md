---
tags: [agents, mobile, leaderboard]
---

# AGENTS.md - Leaderboard and Ranking

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/leaderboard/**` และอ่าน `../../../skills/leaderboard/SKILL.md`

## Scope

Leaderboard owns:
- leaderboard fetching/mapping
- activity ranking reward display
- tier/rank presentation rules
- local config for tabs/filters

Server owns authoritative rank, rating, reward distribution, and season reset.

## Rules

- `leaderboardRepository.ts` fetches data only
- `leaderboardMapper.ts` maps backend rows into UI-ready rows
- Ranking algorithm changes belong server-side unless explicitly local display only
- Tier thresholds in app must match backend/docs; if changed, update both or call out drift
- Never compute wallet/points deltas from leaderboard rows client-side

## Verification

Mapper/rules changes should have focused unit tests. UI-only config changes need lint and quick screen check.
