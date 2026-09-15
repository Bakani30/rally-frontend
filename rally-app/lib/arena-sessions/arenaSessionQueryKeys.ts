export const arenaSessionQueryKeys = {
  all: ['arena-session'] as const,
  membershipCandidates: (userId: string | undefined) =>
    ['arena-session', 'membership-candidates', userId] as const,
  detail: (arenaId: string | undefined) => ['arena-event', arenaId] as const,
}
