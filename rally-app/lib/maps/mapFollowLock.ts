export const FOLLOW_UNLOCK_AFTER_MS = 8_000

export type MapFollowLockState = {
  lockedUntilMs: number
}

export function resolveFollowLockAfterRegionChange(
  state: MapFollowLockState,
  event: {
    nowMs: number
    userInteraction: boolean
    isLive: boolean
    animated?: boolean
    programmaticMoveUntilMs?: number
  },
): MapFollowLockState {
  if (event.animated) return state
  if (event.programmaticMoveUntilMs && event.nowMs <= event.programmaticMoveUntilMs) {
    return state
  }
  if (!event.isLive || !event.userInteraction) return state
  return { lockedUntilMs: event.nowMs + FOLLOW_UNLOCK_AFTER_MS }
}

export function resolveFollowLockAfterRecenter(
  _state: MapFollowLockState,
): MapFollowLockState {
  return { lockedUntilMs: 0 }
}

export function shouldFollowLiveLocation(
  state: MapFollowLockState,
  nowMs: number,
): boolean {
  return nowMs >= state.lockedUntilMs
}
