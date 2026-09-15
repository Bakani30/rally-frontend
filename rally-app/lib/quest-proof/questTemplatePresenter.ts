// Pure mapping: quest_templates row → presentation-ready view model with Thai copy.
// No network, no React. Tested in questTemplatePresenter.test.ts.
import { questAccentColor } from '@/lib/daily-quests/questPresentation'
import type { QuestActivity } from '@/lib/daily-quests/questTypes'
import type {
  QuestDrillSpec,
  QuestTemplateRow,
  QuestTemplateView,
  QuestVerifier,
} from './questProofTypes'

const STARTABLE: QuestVerifier[] = ['timed_sensor', 'capture_audit']

const EVIDENCE_TH: Record<QuestVerifier, string> = {
  sensor_sync: 'นับให้อัตโนมัติ',
  geofence: 'เช็คอิน',
  timed_sensor: 'จับเวลา',
  capture_audit: 'ถ่ายคลิป',
  cv_make_miss: 'ถ่ายคลิป',
  cv_pose_reps: 'ถ่ายคลิป',
  cv_juggle: 'ถ่ายคลิป',
  cv_target_landing: 'ถ่ายคลิป',
}

const ACTIVITY_TH: Record<QuestActivity, string> = {
  running: 'วิ่ง',
  basketball: 'บาส',
  badminton: 'แบด',
  special: '',
}

function targetObj(d: QuestDrillSpec | null): {
  duration_s?: number
  attempts?: number
  makes?: number
  consecutive?: number
  time_limit_s?: number
} {
  return d && typeof d.target === 'object' && d.target !== null ? d.target : {}
}

function targetNum(d: QuestDrillSpec | null): number | undefined {
  return d && typeof d.target === 'number' ? d.target : undefined
}

function toMinutes(seconds?: number): number | undefined {
  return seconds && seconds > 0 ? Math.round(seconds / 60) : undefined
}

function formatKm(meters?: number): string {
  if (!meters) return '0'
  const km = meters / 1000
  return Number.isInteger(km) ? String(km) : km.toFixed(1)
}

type Copy = { titleTH: string; requirementTH: string; ctaTH: string; timeLimitSeconds: number | null; targetTH: string }

function deriveCopy(row: QuestTemplateRow): Copy {
  const d = row.drill_spec
  const obj = targetObj(d)
  const activityTH = ACTIVITY_TH[row.activity] ?? ''

  switch (row.verifier) {
    case 'sensor_sync': {
      if (d?.metric === 'active_minutes') {
        const mins = targetNum(d) ?? 0
        return {
          titleTH: `ขยับ ${mins} นาที`,
          requirementTH: `ขยับร่างกายให้ครบ ${mins} นาที วันนี้`,
          ctaTH: 'เริ่มเควส',
          timeLimitSeconds: null,
          targetTH: '',
        }
      }
      const km = formatKm(targetNum(d))
      return {
        titleTH: `เดินวิ่ง ${km} กม.`,
        requirementTH: `สะสมระยะให้ครบ ${km} กม. วันนี้`,
        ctaTH: 'เริ่มเควส',
        timeLimitSeconds: null,
        targetTH: '',
      }
    }
    case 'geofence': {
      const isBadminton = d?.category === 'court_badminton' || row.activity === 'badminton'
      return isBadminton
        ? {
            titleTH: 'เช็คอินคอร์ตแบด',
            requirementTH: 'ไปให้ถึงคอร์ตแบด แล้วเช็คอินในรัศมี',
            ctaTH: 'ไปเช็คอินที่คอร์ต',
            timeLimitSeconds: null,
            targetTH: '',
          }
        : {
            titleTH: 'เช็คอินสนามบาส',
            requirementTH: 'ไปให้ถึงสนามบาส แล้วเช็คอินในรัศมี',
            ctaTH: 'ไปเช็คอินที่สนาม',
            timeLimitSeconds: null,
            targetTH: '',
          }
    }
    case 'timed_sensor': {
      const mins = toMinutes(obj.duration_s) ?? 0
      return {
        titleTH: `ซ้อม${activityTH} ${mins} นาที`,
        requirementTH: `ซ้อมต่อเนื่อง ${mins} นาที โดยมีการเคลื่อนไหว`,
        ctaTH: 'เริ่มจับเวลา',
        timeLimitSeconds: obj.duration_s ?? null,
        targetTH: `${mins} นาที`,
      }
    }
    case 'capture_audit': {
      const mins = toMinutes(obj.time_limit_s) ?? 0
      if (d?.drill === 'three_point') {
        return {
          titleTH: 'ชาเลนจ์ 3 แต้ม',
          requirementTH: `ถ่ายสดในแอป ทำ 3 แต้ม เข้า ${obj.makes ?? 3} ลูก ใน ${mins} นาที`,
          ctaTH: 'เริ่มถ่ายสด',
          timeLimitSeconds: obj.time_limit_s ?? null,
          targetTH: `เข้า ${obj.makes ?? 3} ลูก`,
        }
      }
      if (d?.drill === 'shuttle_juggle') {
        return {
          titleTH: 'เดาะลูกขนไก่',
          requirementTH: `ถ่ายสดในแอป เดาะลูกขนไก่ ${obj.consecutive ?? 7} ครั้งติด ใน ${mins} นาที`,
          ctaTH: 'เริ่มถ่ายสด',
          timeLimitSeconds: obj.time_limit_s ?? null,
          targetTH: `เดาะ ${obj.consecutive ?? 7} ครั้งติด`,
        }
      }
      // default capture drill: free_throw
      return {
        titleTH: `ยิงลูกโทษ ${obj.attempts ?? 5} ลูก`,
        requirementTH: `ถ่ายสดในแอป ยิงลูกโทษ ${obj.attempts ?? 5} ลูก ภายใน ${mins} นาที`,
        ctaTH: 'เริ่มถ่ายสด',
        timeLimitSeconds: obj.time_limit_s ?? null,
        targetTH: `ยิง ${obj.attempts ?? 5} ลูก`,
      }
    }
    default:
      return {
        titleTH: row.subtitle ?? row.title,
        requirementTH: row.subtitle ?? row.title,
        ctaTH: 'เริ่มเควส',
        timeLimitSeconds: null,
        targetTH: '',
      }
  }
}

export function presentTemplate(row: QuestTemplateRow): QuestTemplateView {
  const copy = deriveCopy(row)
  return {
    templateId: row.id,
    slug: row.slug,
    activity: row.activity,
    lane: row.lane,
    verifier: row.verifier,
    titleTH: copy.titleTH,
    requirementTH: copy.requirementTH,
    ctaTH: copy.ctaTH,
    evidenceTH: EVIDENCE_TH[row.verifier] ?? 'ถ่ายสด',
    targetTH: copy.targetTH,
    rewardPoints: row.reward_points,
    attemptsPerDay: row.attempts_per_day,
    accentColor: questAccentColor(row.activity),
    icon: row.icon ?? 'trophy',
    timeLimitSeconds: copy.timeLimitSeconds,
    startable: STARTABLE.includes(row.verifier),
    needsCapture: row.verifier === 'capture_audit',
    captureMedia:
      row.verifier === 'capture_audit' ? (row.drill_spec?.media === 'video' ? 'video' : 'image') : null,
  }
}

export function presentTemplates(rows: QuestTemplateRow[]): QuestTemplateView[] {
  return rows.map(presentTemplate)
}
