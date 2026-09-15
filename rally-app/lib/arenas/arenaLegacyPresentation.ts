export type LegacyArenaCapabilities = {
  canCreateTeam: false
  canJoinRefereePool: false
  canAdvanceQueue: false
  canSubmitResult: false
}

export function getLegacyArenaCapabilities(): LegacyArenaCapabilities {
  return {
    canCreateTeam: false,
    canJoinRefereePool: false,
    canAdvanceQueue: false,
    canSubmitResult: false,
  }
}
