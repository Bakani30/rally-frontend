import { useCallback, useState } from 'react'
import {
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { FriendRequestRow } from '@/components/friends/FriendRequestRow'
import { FriendRow } from '@/components/friends/FriendRow'
import { FriendsActionTiles } from '@/components/friends/FriendsActionTiles'
import { FriendsHubHeader } from '@/components/friends/FriendsHubHeader'
import { FriendsRecommendationRail } from '@/components/friends/FriendsRecommendationRail'
import { FriendsSegmentedTabs, type FriendsTab } from '@/components/friends/FriendsSegmentedTabs'
import { PendingRequestRow } from '@/components/friends/PendingRequestRow'
import { RallyMascot } from '@/components/brand/RallyMascot'
import { Screen } from '@/components/layout/Screen'
import { PressableScale } from '@/components/motion/PressableScale'
import { Skeleton } from '@/components/ui/Skeleton'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useAnalysisProfile } from '@/hooks/useAnalysisProfile'
import { useFirstRunNudgeId } from '@/hooks/useFirstRunNudgeId'
import { useProfile } from '@/hooks/useProfile'
import { useFriendCandidates } from '@/hooks/useFriendCandidates'
import { useFriendDiscoveryLocation } from '@/hooks/useFriendDiscoveryLocation'
import {
  useAcceptFriendRequest,
  useAddFriend,
  useDeclineFriendRequest,
  useFriends,
  useIncomingFriendRequests,
  useOutgoingFriendRequests,
  useRemoveFriend,
} from '@/hooks/useFriends'
import type { Friend, FriendRequest } from '@/types/friends'
import type { FriendCandidate } from '@/lib/users/friendCandidateService'
import { friendlyFriendMessage } from '@/lib/friends/friendErrorMessage'
import { isFriendDiscoveryLocationAgeEligible } from '@/lib/users/friendDiscoveryLocation'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

type FriendsScreenProps = {
  showBackButton?: boolean
  bottomPad?: number
}

export function FriendsScreen({ showBackButton = true, bottomPad = 48 }: FriendsScreenProps = {}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { user } = useAuth()
  const enabled = !!user

  const friendsQuery = useFriends(enabled)
  const candidatesQuery = useFriendCandidates(user?.id)
  const profileQuery = useProfile(user?.id)
  const analysisProfileQuery = useAnalysisProfile(user?.id)
  const locationAgeEligible = isFriendDiscoveryLocationAgeEligible(
    analysisProfileQuery.data?.birthDate ?? null,
  )
  const {
    status: discoveryLocationStatus,
    enabled: discoveryLocationEnabled,
    request: requestDiscoveryLocation,
    disable: disableDiscoveryLocation,
    openSettings: openDiscoveryLocationSettings,
  } = useFriendDiscoveryLocation(user?.id, locationAgeEligible)
  const incomingRequestsQuery = useIncomingFriendRequests(enabled, user?.id)
  const outgoingRequestsQuery = useOutgoingFriendRequests(enabled)
  const acceptMutation = useAcceptFriendRequest()
  const addFriendMutation = useAddFriend()
  const declineMutation = useDeclineFriendRequest()
  const removeMutation = useRemoveFriend()

  const [activeTab, setActiveTab] = useState<FriendsTab>('friends')

  const friends = friendsQuery.data ?? []
  const incomingRequests = incomingRequestsQuery.data ?? []
  const outgoingRequests = outgoingRequestsQuery.data ?? []
  const requestCount = incomingRequests.length + outgoingRequests.length

  // First swipeable row of the first non-empty list gets a one-time discovery nudge.
  const nudgeId = useFirstRunNudgeId(enabled, [
    incomingRequests[0]?.requesterId,
    friends[0]?.friendId,
  ])

  const refreshing =
    friendsQuery.isRefetching ||
    incomingRequestsQuery.isRefetching ||
    outgoingRequestsQuery.isRefetching
  const onRefresh = useCallback(() => {
    void friendsQuery.refetch()
    void incomingRequestsQuery.refetch()
    void outgoingRequestsQuery.refetch()
  }, [friendsQuery, incomingRequestsQuery, outgoingRequestsQuery])

  const onOpenSearch = useCallback(() => {
    guardedRouter.push('/users/search', { actionKey: 'friends:search' })
  }, [])

  const onOpenProfile = useCallback(() => {
    guardedRouter.push('/profile', { actionKey: 'friends:self-profile' })
  }, [])

  const onRemove = useCallback(
    (friend: Friend) => {
      const label = friend.handle ? `@${friend.handle}` : (friend.displayName ?? 'friend')
      Alert.alert('ลบเพื่อน', `เอา ${label} ออกจากรายชื่อเพื่อน?`, [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ลบ', style: 'destructive', onPress: () => removeMutation.mutate(friend.friendId) },
      ])
    },
    [removeMutation],
  )

  const onChallenge = useCallback((friend: Friend) => {
    if (!friend.handle) {
      Alert.alert('ยังท้าไม่ได้', 'เพื่อนคนนี้ยังไม่ได้ตั้ง @handle')
      return
    }
    guardedRouter.push(
      {
        pathname: '/match/new',
        params: {
          invite: friend.handle,
          inviteName: friend.displayName ?? friend.handle,
          inviteUserId: friend.friendId,
          kind: 'challenge',
        },
      },
      { actionKey: `friends:challenge:${friend.friendId}` },
    )
  }, [])

  const onAccept = useCallback(
    (request: FriendRequest) => acceptMutation.mutate(request.requesterId),
    [acceptMutation],
  )

  const onDecline = useCallback(
    (request: FriendRequest) => {
      const label = request.handle ? `@${request.handle}` : (request.displayName ?? 'player')
      Alert.alert('ปฏิเสธคำขอ', `ปฏิเสธคำขอจาก ${label}?`, [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ปฏิเสธ',
          style: 'destructive',
          onPress: () => declineMutation.mutate(request.requesterId),
        },
      ])
    },
    [declineMutation],
  )

  const onOpenFriend = useCallback((friend: Friend) => {
    guardedRouter.push(`/user/${friend.friendId}`, { actionKey: `friends:user:${friend.friendId}` })
  }, [])

  const onOpenRequester = useCallback((request: FriendRequest) => {
    guardedRouter.push(`/user/${request.requesterId}`, {
      actionKey: `friends:user:${request.requesterId}`,
    })
  }, [])

  const onOpenCandidate = useCallback((candidate: FriendCandidate) => {
    guardedRouter.push(`/user/${candidate.id}`, { actionKey: `friends:candidate:${candidate.id}` })
  }, [])

  const onAddCandidate = useCallback(
    async (candidate: FriendCandidate): Promise<boolean> => {
      const target = candidate.handle ? `@${candidate.handle}` : candidate.id

      try {
        const result = await addFriendMutation.mutateAsync(target)
        void candidatesQuery.refetch()
        Alert.alert(
          result.status === 'accepted' ? 'เป็นเพื่อนกันแล้ว' : 'ส่งคำขอแล้ว',
          result.handle ? `@${result.handle}` : (result.displayName ?? candidate.displayName),
        )
        return true
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Could not send friend request'
        Alert.alert('ส่งคำขอไม่สำเร็จ', friendlyFriendMessage(message))
        return false
      }
    },
    [addFriendMutation, candidatesQuery],
  )

  const onEnableLocation = useCallback(() => {
    void requestDiscoveryLocation().then((enabledWithLocation) => {
      if (enabledWithLocation) void candidatesQuery.refetch()
    })
  }, [candidatesQuery, requestDiscoveryLocation])

  const onDisableLocation = useCallback(() => {
    void disableDiscoveryLocation().then((disabled) => {
      if (disabled) {
        void candidatesQuery.refetch()
        return
      }
      Alert.alert('ปิด Location ไม่สำเร็จ', 'ลองใหม่อีกครั้ง')
    })
  }, [candidatesQuery, disableDiscoveryLocation])

  const onOpenLocationSettings = useCallback(() => {
    void openDiscoveryLocationSettings()
  }, [openDiscoveryLocationSettings])

  const requestsBusy =
    enabled && (incomingRequestsQuery.isPending || outgoingRequestsQuery.isPending)
  const requestError = incomingRequestsQuery.error ?? outgoingRequestsQuery.error
  const profileName = profileQuery.data?.display_name ?? user?.email ?? '?', initials = profileName.trim().slice(0, 2).toUpperCase() || '?'

  return (
    <Screen
      edges={['top', 'bottom']}
      topPad={12}
      bottomPad={bottomPad}
      backgroundColor={theme.bg}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.orange} />
      }
    >
      <FriendsHubHeader
        showBackButton={showBackButton}
        avatarUrl={profileQuery.data?.avatar_url ?? null}
        initials={initials}
        onOpenProfile={onOpenProfile}
      />

      <PressableScale
        style={styles.searchAffordance}
        onPress={onOpenSearch}
        accessibilityRole="button"
        accessibilityLabel="ค้นหาชื่อหรือ @handle"
      >
        <MaterialCommunityIcons name="magnify" size={20} color={theme.muted} />
        <Text style={styles.searchPlaceholder}>Search by username or name</Text>
        <MaterialCommunityIcons name="tune-variant" size={20} color={theme.muted} />
      </PressableScale>

      <FriendsActionTiles onOpenSearch={onOpenSearch} />
      <FriendsRecommendationRail
        candidates={candidatesQuery.data ?? []}
        isAuthenticated={enabled}
        isLoading={enabled && candidatesQuery.isFetching}
        hasError={enabled && !!candidatesQuery.error}
        isRetrying={candidatesQuery.isFetching}
        onRetry={() => void candidatesQuery.refetch()}
        onOpenCandidate={onOpenCandidate}
        onAddCandidate={onAddCandidate}
        locationAgeEligible={locationAgeEligible}
        locationStatus={discoveryLocationStatus}
        locationEnabled={discoveryLocationEnabled}
        onEnableLocation={onEnableLocation}
        onDisableLocation={onDisableLocation}
        onOpenLocationSettings={onOpenLocationSettings}
      />
      <FriendsSegmentedTabs
        activeTab={activeTab}
        friendCount={friends.length}
        requestCount={requestCount}
        onChange={setActiveTab}
      />

      <View style={styles.sharedPanel}>
        {activeTab === 'friends' ? (
          <>
            <Text style={styles.panelTitle}>Friends ({friends.length})</Text>
            {!enabled ? (
              <Text style={styles.dim}>เข้าสู่ระบบก่อนเพื่อใช้งานเพื่อน</Text>
            ) : enabled && friendsQuery.isPending ? (
              <View style={styles.list}>
                <Skeleton height={64} borderRadius={Radius.xl} color={theme.surfaceStrong} />
                <Skeleton height={64} borderRadius={Radius.xl} color={theme.surfaceStrong} />
                <Skeleton height={64} borderRadius={Radius.xl} color={theme.surfaceStrong} />
              </View>
            ) : friendsQuery.error ? (
              <Text style={styles.errorText}>
                {friendsQuery.error instanceof Error
                  ? friendlyFriendMessage(friendsQuery.error.message)
                  : 'โหลดเพื่อนไม่สำเร็จ'}
              </Text>
            ) : friends.length === 0 ? (
              <View style={styles.emptyState}>
                <RallyMascot size={84} />
                <Text style={styles.emptyTitle}>ยังไม่มีเพื่อน</Text>
                <Text style={styles.emptyHint}>ค้นหาชื่อหรือ @handle เพื่อเพิ่มเพื่อน</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {friends.map((friend) => (
                  <FriendRow
                    key={friend.friendId}
                    friend={friend}
                    onOpen={onOpenFriend}
                    onChallenge={onChallenge}
                    onRemove={onRemove}
                    nudge={nudgeId === friend.friendId}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.panelTitle}>Requests ({requestCount})</Text>
            {!enabled ? (
              <Text style={styles.dim}>เข้าสู่ระบบก่อนเพื่อดูคำขอ</Text>
            ) : requestsBusy ? (
              <View style={styles.list}>
                <Skeleton height={64} borderRadius={Radius.xl} color={theme.surfaceStrong} />
                <Skeleton height={64} borderRadius={Radius.xl} color={theme.surfaceStrong} />
              </View>
            ) : requestError ? (
              <Text style={styles.errorText}>
                {requestError instanceof Error
                  ? friendlyFriendMessage(requestError.message)
                  : 'โหลดคำขอไม่สำเร็จ'}
              </Text>
            ) : requestCount === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-multiple-outline" size={38} color={theme.mutedSoft} />
                <Text style={styles.emptyTitle}>ยังไม่มีคำขอ</Text>
                <Text style={styles.emptyHint}>คำขอเป็นเพื่อนใหม่จะแสดงที่นี่</Text>
              </View>
            ) : (
              <View style={styles.requestLists}>
                {incomingRequests.length > 0 ? (
                  <View style={styles.requestGroup}>
                    <Text style={styles.groupTitle}>Incoming ({incomingRequests.length})</Text>
                    <View style={styles.list}>
                      {incomingRequests.map((request) => (
                        <FriendRequestRow
                          key={request.requesterId}
                          request={request}
                          pending={acceptMutation.isPending || declineMutation.isPending}
                          onOpen={onOpenRequester}
                          onAccept={onAccept}
                          onDecline={onDecline}
                          nudge={nudgeId === request.requesterId}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
                {outgoingRequests.length > 0 ? (
                  <View style={styles.requestGroup}>
                    <Text style={styles.groupTitle}>Outgoing ({outgoingRequests.length})</Text>
                    <View style={styles.list}>
                      {outgoingRequests.map((request) => (
                        <PendingRequestRow key={request.requesterId} request={request} />
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            )}
          </>
        )}
      </View>
    </Screen>
  )
}

export default FriendsScreen

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
    searchAffordance: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
    searchPlaceholder: { flex: 1, color: theme.mutedSoft, fontSize: 13, fontWeight: '600' },
    sharedPanel: { overflow: 'hidden', borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
    panelTitle: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm, color: theme.ink, fontSize: 16, fontWeight: '900' },
    list: { gap: 0 },
    requestLists: { gap: Spacing.md, paddingBottom: Spacing.sm },
    requestGroup: { gap: Spacing.xs },
    groupTitle: { paddingHorizontal: Spacing.md, color: theme.muted, fontSize: 12, fontWeight: '900' },
    dim: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg, color: theme.muted, fontSize: 13 },
    errorText: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg, color: theme.red, fontSize: 13 },
    emptyState: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
    emptyTitle: { color: theme.ink, fontSize: 15, fontWeight: '900' },
    emptyHint: { color: theme.muted, fontSize: 12, textAlign: 'center' },
  })
}
