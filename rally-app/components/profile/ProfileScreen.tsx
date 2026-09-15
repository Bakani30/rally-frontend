import { useCallback, useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { DailyCheckinModal } from '@/components/profile/DailyCheckinModal'
import { ProfileFeaturedMatch } from '@/components/profile/ProfileFeaturedMatch'
import { ProfileLoadingView } from '@/components/profile/ProfileLoadingView'
import { ProfileRankList } from '@/components/profile/ProfileRankList'
import { ProfileView } from '@/components/profile/ProfileView'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useEquippedCosmetics } from '@/hooks/useEquippedCosmetics'
import { useI18n } from '@/hooks/useI18n'
import { useProfile } from '@/hooks/useProfile'
import { pinnedMatchesKey } from '@/hooks/useProfilePinnedMatches'
import { useUpdateAvatar } from '@/hooks/useUpdateAvatar'
import { useUserActivityRatings } from '@/hooks/useUserActivityRatings'
import { useUserStats } from '@/hooks/useUserStats'
import { profileTabDictionary } from '@/lib/i18n/dictionaries/profileTab'
import { ACTIVITY_LABEL, isVisibleActivity } from '@/lib/match/matchConfig'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { hasCheckedInToday } from '@/lib/profile/profileService'
import type { UserActivityRating } from '@/lib/leaderboard/leaderboardTypes'

export default function ProfileScreen() {
  const { user } = useAuth()
  const { data: profile, isPending } = useProfile(user?.id)
  const { data: stats } = useUserStats(user?.id)
  const { data: cosmetics } = useEquippedCosmetics(user?.id)
  const { data: activityRatings } = useUserActivityRatings(user?.id)
  const updateAvatarMutation = useUpdateAvatar(user?.id)
  const { track } = useAnalytics()
  const { t } = useI18n(profileTabDictionary)

  const [checkinOpen, setCheckinOpen] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)

  // Match-derived stats (wins/losses/ties, rating) are mutated by settlements
  // elsewhere; refetch them whenever this tab regains focus so the numbers are
  // always current — the tab stays mounted, so a one-time invalidation at
  // settle can be missed or race the server-side aggregate.
  const queryClient = useQueryClient()
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return
      queryClient.invalidateQueries({ queryKey: ['user-stats', user.id] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      queryClient.invalidateQueries({ queryKey: pinnedMatchesKey(user.id) })
    }, [queryClient, user?.id]),
  )

  useEffect(() => {
    track({ name: 'view_profile', properties: { is_self: true } })
  }, [track])

  async function changeAvatar() {
    try {
      await updateAvatarMutation.mutateAsync()
    } catch (error) {
      Alert.alert(t('errorTitle'), error instanceof Error ? error.message : t('avatarUpdateFailed'))
    }
  }

  if (isPending) return <ProfileLoadingView />

  const initials = (profile?.display_name ?? user?.email ?? '?')[0].toUpperCase()
  const displayName = profile?.display_name ?? user?.email ?? t('rallyPlayerFallback')
  const checkedInToday = hasCheckedInToday(profile?.last_checkin_date)
  const idLabel = Number.isInteger(profile?.jersey_number)
    ? t('playerNumber', { number: profile?.jersey_number ?? 0 })
    : t('playerNumberFallback')
  // Member card (นามบัตร) fields, derived from the user's real data.
  const topRating = getTopRating(activityRatings)
  const serial = makeSerial(user?.id, profile?.jersey_number)
  const cardUsername = profile?.handle ?? displayName
  const cardClassLabel = topRating
    ? ACTIVITY_LABEL[topRating.activity as keyof typeof ACTIVITY_LABEL] ?? '—'
    : '—'
  const cardRankingLabel = topRating?.tier ? capitalize(topRating.tier) : '—'
  const cardTitleLabel = cosmetics?.title?.name ?? cosmetics?.title?.asset_ref ?? '—'

  return (
    <>
      <ProfileView
        cardOpen={cardOpen}
        profile={{
          displayName,
          idLabel,
          initials,
          avatarUrl: profile?.avatar_url,
          frameAssetRef: cosmetics?.frame?.asset_ref ?? null,
          username: cardUsername,
          nameId: `ID.${serial}`,
          classLabel: cardClassLabel,
          rankingLabel: cardRankingLabel,
          guildLabel: '—',
          titleLabel: cardTitleLabel,
        }}
        stats={{
          matches: stats?.total_matches ?? 0,
          wins: stats?.total_wins ?? 0,
          losses: stats?.total_losses ?? 0,
          ties: stats?.total_ties ?? 0,
        }}
        ratings={activityRatings}
        checkinOpen={checkinOpen}
        checkedInToday={checkedInToday}
        onToggleCard={() => setCardOpen((open) => !open)}
        onBack={() => guardedRouter.replace('/(tabs)', { actionKey: 'profile:exit-home' })}
        onOpenSettings={() => guardedRouter.push('/settings', { actionKey: 'profile:settings' })}
        onOpenMatches={() => guardedRouter.push('/matches', { actionKey: 'profile:matches' })}
        onOpenWallet={() => guardedRouter.push('/wallet', { actionKey: 'profile:wallet' })}
        onOpenReferee={() => guardedRouter.push('/referee', { actionKey: 'profile:referee' })}
        onToggleCheckin={() => setCheckinOpen((open) => !open)}
        onOpenCosmetics={() => guardedRouter.push('/cosmetics?tab=frame', { actionKey: 'profile:cosmetics' })}
        onOpenRank={() => guardedRouter.push('/rank', { actionKey: 'profile:rank' })}
        onChangeAvatar={changeAvatar}
        isUpdatingAvatar={updateAvatarMutation.isPending}
        rankList={<ProfileRankList ratings={activityRatings} userId={user?.id} onOpenRank={() => guardedRouter.push('/rank', { actionKey: 'profile:rank' })} />}
        featuredMatch={user?.id ? <ProfileFeaturedMatch userId={user.id} isOwner /> : undefined}
      />
      <DailyCheckinModal open={checkinOpen} onRequestClose={() => setCheckinOpen(false)} />
    </>
  )
}

function getTopRating(ratings: UserActivityRating[] | undefined) {
  return [...(ratings ?? [])]
    .filter((rating) => rating.matches > 0 && isVisibleActivity(rating.activity))
    .sort((a, b) => b.rating - a.rating)[0]
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function makeSerial(userId: string | undefined, jersey: number | undefined) {
  const raw = (userId ?? '').replace(/[^a-zA-Z0-9]/g, '')
  if (raw.length >= 6) return raw.slice(0, 10).toUpperCase()
  return Number.isInteger(jersey) ? String(jersey).padStart(6, '0') : '------'
}
