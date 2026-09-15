export function getPendingInviteFallbackInterval(input: {
  liveFallback: boolean
  userId: string | undefined
}) {
  return input.liveFallback && !!input.userId ? 15_000 : false
}
