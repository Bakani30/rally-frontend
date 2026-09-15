import { describe, expect, it } from 'vitest'

import { presentTemplate } from './questTemplatePresenter'
import type { QuestTemplateRow } from './questProofTypes'

function row(over: Partial<QuestTemplateRow>): QuestTemplateRow {
  return {
    id: 'id-' + (over.slug ?? 'x'),
    slug: over.slug ?? 'slug',
    activity: over.activity ?? 'basketball',
    lane: over.lane ?? 'practice',
    title: over.title ?? 'Title',
    subtitle: over.subtitle ?? null,
    icon: over.icon ?? 'trophy',
    verifier: over.verifier ?? 'capture_audit',
    drill_spec: over.drill_spec ?? null,
    proof_contract: over.proof_contract ?? null,
    reward_points: over.reward_points ?? 30,
    attempts_per_day: over.attempts_per_day ?? 1,
    is_active: true,
  }
}

describe('presentTemplate — sensor_sync', () => {
  it('distance: km title + human cta, not startable, no time limit', () => {
    const v = presentTemplate(
      row({ slug: 'move-daily-distance', activity: 'running', lane: 'move', verifier: 'sensor_sync',
        drill_spec: { kind: 'sync_metric', metric: 'distance_m', target: 7000 }, reward_points: 50 }),
    )
    expect(v.titleTH).toBe('เดินวิ่ง 7 กม.')
    expect(v.ctaTH).toBe('เริ่มเควส')
    expect(v.evidenceTH).toBe('นับให้อัตโนมัติ')
    expect(v.startable).toBe(false)
    expect(v.needsCapture).toBe(false)
    expect(v.timeLimitSeconds).toBeNull()
    expect(v.accentColor.startsWith('#')).toBe(true)
  })

  it('active_minutes: minutes title + human cta', () => {
    const v = presentTemplate(
      row({ slug: 'move-active-minutes', activity: 'running', lane: 'move', verifier: 'sensor_sync',
        drill_spec: { kind: 'sync_metric', metric: 'active_minutes', target: 20 }, reward_points: 20 }),
    )
    expect(v.titleTH).toBe('ขยับ 20 นาที')
    expect(v.ctaTH).toBe('เริ่มเควส')
  })

  it('sensor_sync presented JSON contains no "ซิงค์"', () => {
    const v = presentTemplate(
      row({ slug: 'move-daily-distance', activity: 'running', lane: 'move', verifier: 'sensor_sync',
        drill_spec: { kind: 'sync_metric', metric: 'distance_m', target: 7000 }, reward_points: 50 }),
    )
    expect(JSON.stringify(v)).not.toContain('ซิงค์')
  })
})

describe('presentTemplate — geofence', () => {
  it('basketball court check-in', () => {
    const v = presentTemplate(
      row({ slug: 'explore-visit-court-basketball', activity: 'basketball', lane: 'explore', verifier: 'geofence',
        drill_spec: { kind: 'visit_spot', category: 'court_basketball' }, reward_points: 15 }),
    )
    expect(v.titleTH).toBe('เช็คอินสนามบาส')
    expect(v.ctaTH).toBe('ไปเช็คอินที่สนาม')
    expect(v.evidenceTH).toBe('เช็คอิน')
    expect(v.startable).toBe(false)
  })

  it('badminton court check-in', () => {
    const v = presentTemplate(
      row({ slug: 'explore-visit-court-badminton', activity: 'badminton', lane: 'explore', verifier: 'geofence',
        drill_spec: { kind: 'visit_spot', category: 'court_badminton' }, reward_points: 15 }),
    )
    expect(v.titleTH).toBe('เช็คอินคอร์ตแบด')
    expect(v.ctaTH).toBe('ไปเช็คอินที่คอร์ต')
  })
})

describe('presentTemplate — timed_sensor', () => {
  it('basketball court time: minutes title, startable, time limit set', () => {
    const v = presentTemplate(
      row({ slug: 'practice-timed-basketball', activity: 'basketball', verifier: 'timed_sensor',
        drill_spec: { kind: 'timed_activity', activity: 'basketball', target: { duration_s: 600 } }, reward_points: 20, attempts_per_day: 1 }),
    )
    expect(v.titleTH).toBe('ซ้อมบาส 10 นาที')
    expect(v.requirementTH).toContain('10 นาที')
    expect(v.ctaTH).toBe('เริ่มจับเวลา')
    expect(v.evidenceTH).toBe('จับเวลา')
    expect(v.startable).toBe(true)
    expect(v.needsCapture).toBe(false)
    expect(v.timeLimitSeconds).toBe(600)
    expect(v.captureMedia).toBeNull()
  })
})

describe('presentTemplate — capture_audit', () => {
  it('free throw: attempts + time-limit, capture + startable', () => {
    const v = presentTemplate(
      row({ slug: 'practice-capture-freethrow', activity: 'basketball', verifier: 'capture_audit',
        drill_spec: { kind: 'drill_capture', drill: 'free_throw', media: 'video', target: { attempts: 5, time_limit_s: 300 } }, reward_points: 30 }),
    )
    expect(v.titleTH).toBe('ยิงลูกโทษ 5 ลูก')
    expect(v.requirementTH).toContain('ภายใน 5 นาที')
    expect(v.ctaTH).toBe('เริ่มถ่ายสด')
    expect(v.evidenceTH).toBe('ถ่ายคลิป')
    expect(v.startable).toBe(true)
    expect(v.needsCapture).toBe(true)
    expect(v.timeLimitSeconds).toBe(300)
    expect(v.captureMedia).toBe('video')
  })

  it('three point: makes target', () => {
    const v = presentTemplate(
      row({ slug: 'practice-capture-3pointer', activity: 'basketball', verifier: 'capture_audit',
        drill_spec: { kind: 'drill_capture', drill: 'three_point', media: 'video', target: { makes: 3, time_limit_s: 300 } }, reward_points: 50 }),
    )
    expect(v.titleTH).toBe('ชาเลนจ์ 3 แต้ม')
    expect(v.requirementTH).toContain('เข้า 3 ลูก')
    expect(v.timeLimitSeconds).toBe(300)
  })

  it('shuttle juggle: consecutive target', () => {
    const v = presentTemplate(
      row({ slug: 'practice-capture-shuttle-juggle', activity: 'badminton', verifier: 'capture_audit',
        drill_spec: { kind: 'drill_capture', drill: 'shuttle_juggle', media: 'video', target: { consecutive: 7, time_limit_s: 360 } }, reward_points: 30 }),
    )
    expect(v.titleTH).toBe('เดาะลูกขนไก่')
    expect(v.requirementTH).toContain('7 ครั้งติด ใน 6 นาที')
    expect(v.timeLimitSeconds).toBe(360)
  })
})
