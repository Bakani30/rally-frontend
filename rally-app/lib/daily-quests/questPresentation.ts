import { ActivityColor, RallyAccent } from '@/constants/theme'
import type { QuestActivity, QuestEvidenceMode } from './questTypes'

const QUEST_TYPE_LABEL: Record<QuestEvidenceMode, string> = {
  sensor_sync: 'SYNC',
  timed_sensor_session: 'TIMED',
  video_proof: 'VIDEO PROOF',
  manual_proof: 'MANUAL',
}

/** Solid accent for a quest, from the ActivityColor SSOT (special -> indigo). */
export function questAccentColor(activity: QuestActivity): string {
  return ActivityColor[activity] ?? RallyAccent.indigo
}

/** Short uppercase label describing how the quest is verified. */
export function questTypeLabel(evidenceMode: QuestEvidenceMode): string {
  return QUEST_TYPE_LABEL[evidenceMode]
}
