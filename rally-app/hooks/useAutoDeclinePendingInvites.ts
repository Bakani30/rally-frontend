import { useEffect } from 'react'
import { useRespondInvite } from '@/hooks/useRespondInvite'
import { getInviteAutoDeclineDelayMs } from '@/lib/notifications/inviteAutoDecline'
import type { MyPendingInvite } from '@/types/match'

export function useAutoDeclinePendingInvites(
  userId: string | undefined,
  pendingInvites: MyPendingInvite[] | undefined,
) {
  const { mutate: respondToInvite } = useRespondInvite()

  useEffect(() => {
    if (!userId || !pendingInvites?.length) return undefined

    const timers = pendingInvites.map((invite) => {
      const delayMs = getInviteAutoDeclineDelayMs(invite.sentAt)
      return setTimeout(() => {
        respondToInvite({ inviteId: invite.inviteId, action: 'decline' })
      }, delayMs)
    })

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [pendingInvites, respondToInvite, userId])
}
