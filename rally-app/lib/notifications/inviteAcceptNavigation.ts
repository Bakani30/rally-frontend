import { getMyPendingInvites, respondToInviteById } from '@/lib/match/matchService'
import { guardedRouter, runGuardedNavigationAction } from '@/lib/navigation/guardedRouter'
import { supabase } from '@/lib/supabase'

type AcceptInviteAndOpenInput = {
  inviteId?: string | null
  matchId: string
  stake?: number | null
  userId?: string | null
}

export async function acceptInviteAndOpenMatch(input: AcceptInviteAndOpenInput) {
  await runGuardedNavigationAction({
    actionKey: `accept_invite:${input.inviteId ?? input.matchId}`,
    target: `/match/${input.matchId}`,
  }, async () => {
    const pendingInvite = input.stake == null
      ? await resolvePendingInvite(input.matchId, input.userId)
      : null
    const inviteId = input.inviteId ?? pendingInvite?.inviteId
    if (inviteId) {
      await respondToInviteById({
        inviteId,
        action: 'accept',
        stake: input.stake ?? pendingInvite?.match.stake,
      })
    }
    guardedRouter.replace(`/match/${input.matchId}`, {
      actionKey: `accepted-invite-match:${input.matchId}`,
    })
  }).catch((error) => {
    console.warn('Failed to accept invite before opening match', error)
    guardedRouter.replace('/notifications', { actionKey: 'accept-invite-failed:notifications' })
  })
}

async function resolvePendingInvite(matchId: string, userId?: string | null) {
  const resolvedUserId = userId ?? await getCurrentUserId()
  if (!resolvedUserId) return null
  const pendingInvites = await getMyPendingInvites(resolvedUserId)
  return pendingInvites.find((invite) => invite.matchId === matchId) ?? null
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user?.id ?? null
}
