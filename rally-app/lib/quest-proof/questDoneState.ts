// Pure: is a quest "done today", across all verifier types. No React/RN.
import type { QuestProofStatus, QuestTemplateView } from './questProofTypes'
export type QuestDoneInputs = {
  sessionStatusByTemplate: Record<string, QuestProofStatus>
  healthGoalMet: boolean
  checkedInActivities: Set<string>
}
const DONE_STATUS: QuestProofStatus[] = ['passed', 'reward_pending', 'claimed']
export function isQuestDone(view: QuestTemplateView, inp: QuestDoneInputs): boolean {
  if (view.verifier === 'timed_sensor' || view.verifier === 'capture_audit') {
    const s = inp.sessionStatusByTemplate[view.templateId]
    return !!s && DONE_STATUS.includes(s)
  }
  if (view.verifier === 'sensor_sync') return inp.healthGoalMet
  if (view.verifier === 'geofence') return inp.checkedInActivities.has(view.activity)
  return false
}
export function countDone(views: QuestTemplateView[], inp: QuestDoneInputs): number {
  return views.filter((v) => isQuestDone(v, inp)).length
}
