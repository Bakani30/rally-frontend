// Pure: map a quest view to how its CTA starts. No React/RN.
import type { QuestTemplateView } from './questProofTypes'

export type QuestStartTarget =
  | { kind: 'start_session'; needsCapture: boolean }
  | { kind: 'external'; route: '/map-quest' }
  | { kind: 'inline_daily_mission' }

export function resolveStartTarget(view: QuestTemplateView): QuestStartTarget {
  switch (view.verifier) {
    case 'capture_audit':
      return { kind: 'start_session', needsCapture: true }
    case 'timed_sensor':
      return { kind: 'start_session', needsCapture: false }
    case 'sensor_sync':
      return { kind: 'inline_daily_mission' }
    case 'geofence':
      return { kind: 'external', route: '/map-quest' }
    default:
      return { kind: 'inline_daily_mission' }
  }
}
