import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { InviteFriendSheet } from '@/components/match/invite/InviteFriendSheet'
import { PartyDetailPanel } from '@/components/party/PartyDetailPanel'
import { PartyRequestsSheet } from '@/components/party/PartyRequestsSheet'
import { PartyState } from '@/components/party/PartyState'
import { createPartyStyles } from '@/components/party/partyStyles'
import { Screen } from '@/components/layout/Screen'
import { PressableScale } from '@/components/motion/PressableScale'
import { useAuth } from '@/hooks/useAuth'
import { useFriends } from '@/hooks/useFriends'
import { useI18n } from '@/hooks/useI18n'
import { useParty } from '@/hooks/useParty'
import { useSportTheme } from '@/hooks/useAppTheme'
import { getPartyErrorMessage } from '@/lib/party/partyError'
import { partyDictionary } from '@/lib/i18n/dictionaries/party'
import type { InvitableFriend } from '@/types/invite'

export default function PartyDetailScreen() {
  const theme = useSportTheme()
  const styles = createPartyStyles(theme)
  const { t, language } = useI18n(partyDictionary)
  const { user } = useAuth()
  const params = useLocalSearchParams<{ partyId?: string | string[] }>()
  const partyId = Array.isArray(params.partyId) ? params.partyId[0] : params.partyId
  const { partyQuery, requestJoinMutation, inviteMemberMutation, acceptInviteMutation, approveMemberMutation, removeMemberMutation, leaveMutation, dissolveMutation } = useParty(partyId, { enabled: !!user })
  const friendsQuery = useFriends(!!user)
  const [requestsVisible, setRequestsVisible] = useState(false)
  const [inviteVisible, setInviteVisible] = useState(false)
  const party = partyQuery.data
  const activeIds = useMemo(() => new Set([...(party?.activeRoster ?? []).map((profile) => profile.userId), ...(party?.pendingMembers ?? []).map((member) => member.profile.userId)]), [party?.activeRoster, party?.pendingMembers])
  const invitableFriends = useMemo<InvitableFriend[]>(() => (friendsQuery.data ?? []).filter((friend) => !activeIds.has(friend.friendId)).map((friend) => ({
    friendId: friend.friendId,
    displayName: friend.displayName,
    handle: friend.handle,
    avatarUrl: friend.avatarUrl,
    frameAssetRef: friend.frameAssetRef,
    rating: 0,
    recentlyPlayed: false,
    suggested: false,
    inviteStatus: 'none',
    lastInvitedAt: null,
  })), [activeIds, friendsQuery.data])
  const busy = requestJoinMutation.isPending || inviteMemberMutation.isPending || acceptInviteMutation.isPending || approveMemberMutation.isPending || removeMemberMutation.isPending || leaveMutation.isPending || dissolveMutation.isPending

  function showActionError(action: Parameters<typeof getPartyErrorMessage>[1], error: unknown, fallbackKey: keyof typeof partyDictionary) {
    Alert.alert(t(fallbackKey), getPartyErrorMessage(error, action, language))
  }

  function confirmRemove(profile: { userId: string; displayName: string | null; handle: string | null }) {
    Alert.alert(t('removeMemberTitle'), t('removeMemberBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('removeMember'), style: 'destructive', onPress: () => void removeMemberMutation.mutateAsync({ partyId: partyId!, targetUserId: profile.userId }).catch((error) => showActionError('remove', error, 'removeMemberTitle')) },
    ])
  }

  function confirmLeave() {
    const leavingAsHost = party?.host?.userId === user?.id
    Alert.alert(t(leavingAsHost ? 'hostLeaveTitle' : 'leaveTitle'), t(leavingAsHost ? 'hostLeaveBody' : 'leaveBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('leave'), style: 'destructive', onPress: () => void leaveMutation.mutateAsync(partyId!).then(() => router.replace('/party')).catch((error) => showActionError('leave', error, 'leaveError')) },
    ])
  }

  function confirmDissolve() {
    Alert.alert(t('dissolveTitle'), t('dissolveBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('dissolveParty'), style: 'destructive', onPress: () => void dissolveMutation.mutateAsync(partyId!).then(() => router.replace('/party')).catch((error) => showActionError('dissolve', error, 'dissolveError')) },
    ])
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen edges={['top', 'bottom']} topPad={12} bottomPad={48} backgroundColor={theme.bg} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <PressableScale style={styles.backButton} onPress={() => router.replace('/party')} accessibilityRole="button" accessibilityLabel={t('back')}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={theme.chalk} />
          </PressableScale>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{t('eyebrow')}</Text>
            <Text style={styles.title}>{party?.party.name ?? t('title')}</Text>
          </View>
        </View>
        {!user ? <PartyState kind="empty" text={t('signInToManage')} /> : partyQuery.isPending ? <PartyState kind="loading" text={t('loadingDetails')} /> : partyQuery.error ? <PartyState kind="error" text={t('loadPartyError')} onRetry={() => void partyQuery.refetch()} /> : party ? (
          <PartyDetailPanel
            party={party}
            actorUserId={user.id}
            busy={busy}
            onRequestJoin={() => void requestJoinMutation.mutateAsync(party.id).catch((error) => showActionError('join', error, 'requestJoinError'))}
            onAcceptInvite={() => void acceptInviteMutation.mutateAsync(party.id).catch((error) => showActionError('accept', error, 'acceptInviteError'))}
            onOpenMembershipSheet={() => setRequestsVisible(true)}
            onOpenInvitePicker={() => setInviteVisible(true)}
            onLeave={confirmLeave}
            onDissolve={confirmDissolve}
            onRemoveMember={confirmRemove}
            onMemberPress={(userId) => router.push(`/user/${userId}` as never)}
            onEmptySlot={() => setInviteVisible(true)}
          />
        ) : <PartyState kind="empty" text={t('partyNotFound')} />}
      </Screen>

      {party ? (
        <PartyRequestsSheet
          visible={requestsVisible}
          pendingMembers={party.pendingMembers ?? []}
          busy={busy}
          onClose={() => setRequestsVisible(false)}
          onApprove={(targetUserId) => void approveMemberMutation.mutateAsync({ partyId: party.id, targetUserId }).catch((error) => showActionError('approve', error, 'approveError'))}
          onOpenInvitePicker={() => { setRequestsVisible(false); setInviteVisible(true) }}
        />
      ) : null}
      <InviteFriendSheet
        visible={inviteVisible}
        matchId={undefined}
        staticItems={invitableFriends}
        onClose={() => setInviteVisible(false)}
        onInvite={(friend) => void inviteMemberMutation.mutateAsync({ partyId: partyId!, targetUserId: friend.friendId }).then(() => setInviteVisible(false)).catch((error) => showActionError('invite', error, 'inviteError'))}
        onOpenProfile={(userId) => router.push(`/user/${userId}` as never)}
      />
    </>
  )
}
