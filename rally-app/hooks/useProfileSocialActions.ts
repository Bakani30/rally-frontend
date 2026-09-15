import { Alert } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import {
  useAcceptFriendRequest,
  useAddFriend,
  useFriends,
  useIncomingFriendRequests,
  useOutgoingFriendRequests,
} from '@/hooks/useFriends'
import { useSetUserBlock } from '@/hooks/useUserSafety'
import { friendlyFriendMessage } from '@/lib/friends/friendErrorMessage'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

export type ProfileRelation = 'none' | 'friend' | 'incoming' | 'outgoing'

export type ProfileSocialActions = {
  /** True when the viewer is signed in and looking at someone else. */
  enabled: boolean
  relation: ProfileRelation
  /** Add/accept-friend request in flight. */
  actionPending: boolean
  /** Add friend, or accept when they have a pending incoming request. */
  onPrimary: () => void
  /** Report / block action sheet. */
  onSafetyMenu: () => void
  blockMutation: ReturnType<typeof useSetUserBlock>
}

/**
 * Friend / report / block actions for another user's profile, shared by every
 * profile-viewing surface (full profile, referee profile, match-lobby peek) so
 * the behaviour and copy stay identical. Pure data + handlers — the surface
 * supplies the UI (e.g. PublicProfileActions).
 */
export function useProfileSocialActions(viewedUserId: string | undefined): ProfileSocialActions {
  const { user } = useAuth()
  const enabled = !!user && !!viewedUserId && user.id !== viewedUserId

  const friendsQuery = useFriends(enabled)
  const incomingRequestsQuery = useIncomingFriendRequests(enabled, user?.id)
  const outgoingRequestsQuery = useOutgoingFriendRequests(enabled)
  const addFriendMutation = useAddFriend()
  const acceptFriendMutation = useAcceptFriendRequest()
  const blockMutation = useSetUserBlock()

  const isFriend = (friendsQuery.data ?? []).some((friend) => friend.friendId === viewedUserId)
  const incomingRequest = (incomingRequestsQuery.data ?? []).find((r) => r.requesterId === viewedUserId)
  const outgoingRequest = (outgoingRequestsQuery.data ?? []).find((r) => r.requesterId === viewedUserId)

  const relation: ProfileRelation = isFriend
    ? 'friend'
    : incomingRequest
      ? 'incoming'
      : outgoingRequest
        ? 'outgoing'
        : 'none'

  async function onAddFriend() {
    if (!viewedUserId) return
    try {
      const result = await addFriendMutation.mutateAsync(viewedUserId)
      const label = result.handle ? `@${result.handle}` : (result.displayName ?? 'player')
      Alert.alert(result.status === 'accepted' ? 'เป็นเพื่อนกันแล้ว' : 'ส่งคำขอแล้ว', label)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not send friend request'
      Alert.alert('ส่งคำขอไม่สำเร็จ', friendlyFriendMessage(message))
    }
  }

  function onAcceptFriend() {
    if (!viewedUserId) return
    acceptFriendMutation.mutate(viewedUserId, {
      onError: (e) => Alert.alert('รับคำขอไม่สำเร็จ', friendlyFriendMessage(e.message)),
    })
  }

  function confirmBlock() {
    if (!viewedUserId) return
    Alert.alert(
      'ยืนยันบล็อก',
      'หลังบล็อกแล้ว ผู้ใช้นี้จะถูกตัดออกจาก friends และคำขอเพื่อนทั้งหมด คุณจะเลิกบล็อกได้ภายหลัง',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'บล็อก',
          style: 'destructive',
          onPress: () =>
            blockMutation.mutate(
              { targetUserId: viewedUserId, action: 'block' },
              {
                onSuccess: () => {
                  Alert.alert('บล็อกแล้ว', 'ผู้ใช้นี้ถูกบล็อกเรียบร้อย')
                  router.back()
                },
                onError: (e) => Alert.alert('บล็อกไม่สำเร็จ', e.message.slice(0, 200)),
              },
            ),
        },
      ],
    )
  }

  function onSafetyMenu() {
    if (!viewedUserId) return
    Alert.alert('การจัดการผู้ใช้นี้', undefined, [
      {
        text: 'รายงานผู้ใช้',
        onPress: () =>
          guardedRouter.push(
            { pathname: '/user/report', params: { id: viewedUserId } },
            { actionKey: `user:${viewedUserId}:report` },
          ),
      },
      { text: 'บล็อกผู้ใช้', style: 'destructive', onPress: confirmBlock },
      { text: 'ยกเลิก', style: 'cancel' },
    ])
  }

  return {
    enabled,
    relation,
    actionPending: addFriendMutation.isPending || acceptFriendMutation.isPending,
    onPrimary: incomingRequest ? onAcceptFriend : onAddFriend,
    onSafetyMenu,
    blockMutation,
  }
}
