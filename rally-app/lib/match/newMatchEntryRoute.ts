import type { Activity } from './matchConfig'

export function getNewActivityEntryRoute(activity: Activity): '/arena-session/new' | null {
  return activity === 'basketball' ? '/arena-session/new' : null
}
