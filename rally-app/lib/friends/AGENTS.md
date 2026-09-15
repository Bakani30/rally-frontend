---
tags: [agents, mobile, social]
---

# AGENTS.md - Friends

อ่านไฟล์นี้ก่อนแก้ `rally-app/lib/friends/**`

## Scope

Friends owns:
- friend list
- friend requests
- accept/decline/cancel actions
- friend data used by match invite flows

User lookup/search lives in `../users/`.

## Rules

- Social mutations go through service -> repository -> RPC/edge function
- Do not expose private profile fields through friend list mapping
- Friend request cooldown/blocking rules are server authority
- Match invite UI may consume friend data but must not embed friend mutation logic
- Keep request direction naming explicit: requester/recipient, incoming/outgoing

## Verification

Check both incoming and outgoing request states after mutation changes, plus match invite surfaces if friend shape changes.
