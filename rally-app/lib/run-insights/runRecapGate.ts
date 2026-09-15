import type {
  CompetitionCategory,
  PreferredUnits,
  PrimaryGoal,
  RunningLevel,
} from '@/lib/profile/analysisProfileTypes'

export type RunRecapProfileShape = {
  birthYear?: number | null
  competitionCategory?: CompetitionCategory | null
  runningLevel?: RunningLevel | null
  primaryGoal?: PrimaryGoal | null
  preferredUnits?: PreferredUnits | null
}

export type RunRecapGateFieldId =
  | 'runningLevel'
  | 'primaryGoal'
  | 'competitionCategory'
  | 'birthYear'

export type RunRecapGateField = {
  id: RunRecapGateFieldId
  label: string
  helper: string
}

export type RunRecapProfileGate = {
  status: 'ready' | 'locked'
  requiredCount: number
  completedCount: number
  missingFields: RunRecapGateField[]
}

const REQUIRED_RECAP_FIELDS: RunRecapGateField[] = [
  {
    id: 'runningLevel',
    label: 'Running level',
    helper: 'ช่วยให้ coach tip ไม่กว้างเกินไป',
  },
  {
    id: 'primaryGoal',
    label: 'Primary goal',
    helper: 'ใช้เลือกมุมวิเคราะห์หลังวิ่ง',
  },
  {
    id: 'competitionCategory',
    label: 'Competition category',
    helper: 'ใช้กับ context ภายนอกเมื่อแหล่งข้อมูลรองรับ',
  },
  {
    id: 'birthYear',
    label: 'Birth year',
    helper: 'ใช้คำนวณ age context แบบส่วนตัว',
  },
]

export function getRunRecapProfileGate(
  profile: RunRecapProfileShape | null | undefined,
): RunRecapProfileGate {
  const missingFields = REQUIRED_RECAP_FIELDS.filter((field) => !hasRequiredField(profile, field.id))

  return {
    // Missing profile fields should improve coach precision, not block the basic recap.
    status: 'ready',
    requiredCount: REQUIRED_RECAP_FIELDS.length,
    completedCount: REQUIRED_RECAP_FIELDS.length - missingFields.length,
    missingFields,
  }
}

function hasRequiredField(
  profile: RunRecapProfileShape | null | undefined,
  fieldId: RunRecapGateFieldId,
): boolean {
  if (!profile) return false

  if (fieldId === 'birthYear') {
    return typeof profile.birthYear === 'number' && Number.isFinite(profile.birthYear)
  }

  const value = profile[fieldId]
  return value != null && value !== 'prefer_not_to_say'
}
