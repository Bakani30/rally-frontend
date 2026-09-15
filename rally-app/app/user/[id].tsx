import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { MatchListItem } from '@/components/match/MatchListItem'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { ProfileFeaturedMatch } from '@/components/profile/ProfileFeaturedMatch'
import { ProfileIdentityDeck } from '@/components/profile/ProfileIdentityDeck'
import { ProfileRankList } from '@/components/profile/ProfileRankList'
import { ProfileStatsCard } from '@/components/profile/ProfileStatsCard'
import { PublicProfileActions } from '@/components/profile/PublicProfileActions'
import { PublicProfileScoreCard } from '@/components/profile/PublicProfileScoreCard'
import { RefereeCredentialCard } from '@/components/referee/RefereeCredentialCard'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useProfileSocialActions } from '@/hooks/useProfileSocialActions'
import { usePublicCredits } from '@/hooks/usePublicCredits'
import { usePublicProfile } from '@/hooks/usePublicProfile'
import { useRefereeSportProfiles } from '@/hooks/useRefereeSportProfiles'
import { useUserActivityRatings } from '@/hooks/useUserActivityRatings'
import { useVisibleMatchesForUser } from '@/hooks/useVisibleMatchesForUser'
import { ACTIVITY_LABEL, isVisibleActivity } from '@/lib/match/matchConfig'
import { isRefereeForAnySport, refereeTierByLevel, summarizeRefereeSportProfiles } from '@/lib/match/refereeLevels'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import type { UserActivityRating } from '@/lib/leaderboard/leaderboardTypes'
import type { MyMatch } from '@/types/match'

const HISTORY_STATUSES = new Set<MyMatch['status']>(['settled'])

export default function PublicProfileScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const insets = useSafeAreaInsets()
  const { id, fromMatchId, lockedProfile, card } = useLocalSearchParams<{
    id: string
    fromMatchId?: string
    lockedProfile?: string
    card?: string
  }>()
  const { user } = useAuth()
  const isMatchLobbyPeek = lockedProfile === '1' && !!fromMatchId
  const { data: profile, isPending, error } = usePublicProfile({ userId: id })
  const { data: activityRatings } = useUserActivityRatings(id)
  const { data: credits } = usePublicCredits(id)
  const cosmetics = profile?.equippedCosmetics
  const stats = profile?.stats
  const { data: profileMatches, isPending: matchesPending } = useVisibleMatchesForUser(id)
  const refereeProfiles = useRefereeSportProfiles(id)
  const social = useProfileSocialActions(id)
  const { track } = useAnalytics()

  const isMe = !!user && user.id === id
  const [cardOpen, setCardOpen] = useState(card === '1')

  useEffect(() => {
    if (!id) return
    track({ name: 'view_profile', properties: { is_self: isMe } })
  }, [track, id, isMe])

  const historyMatches = (profileMatches ?? []).filter((match) => HISTORY_STATUSES.has(match.status)).slice(0, 8)

  if (isPending) {
    return <ActivityIndicator style={styles.loader} color={theme.chalk} />
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="account-off-outline" size={42} color={theme.muted} />
        <Text style={styles.errorText}>ไม่พบโปรไฟล์ผู้ใช้</Text>
        <PressableScale style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>ย้อนกลับ</Text>
        </PressableScale>
      </View>
    )
  }

  const initials = (profile.displayName ?? '?')[0].toUpperCase()
  const showCredits = credits !== null && credits !== undefined
  const creditsValue = showCredits ? (credits ?? 0) : null
  const classLabel = getPrimaryClassLabel(activityRatings)
  const refereeProfileList = [refereeProfiles.basketball.profile, refereeProfiles.badminton.profile]
  const isReferee = isRefereeForAnySport(refereeProfileList)
  const refereeSummary = summarizeRefereeSportProfiles(refereeProfileList)
  const rankingLabel = `${profile.leaderboardScore ?? 0} RP`
  const serialLabel = Number.isInteger(profile.jerseyNumber) ? `NO. ${profile.jerseyNumber}` : 'NO. --'
  const titleLabel = cosmetics?.title?.name ?? 'Rookie'

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.sm }]}
    >
      <View style={styles.headerRow}>
        <PressableScale style={styles.headerBtn} onPress={() => router.back()} accessibilityLabel="Back">
          <MaterialCommunityIcons name="chevron-left" size={24} color={theme.ink} />
        </PressableScale>
        <PressableScale style={styles.headerBtn} onPress={() => setCardOpen((o) => !o)} accessibilityLabel="Toggle member card">
          <MaterialCommunityIcons name={cardOpen ? 'account' : 'card-account-details-outline'} size={20} color={theme.ink} />
        </PressableScale>
      </View>

      <Reveal delay={0}>
        <View style={styles.block}>
          <ProfileIdentityDeck
            open={cardOpen}
            editable={false}
            displayName={profile.displayName}
            idLabel={serialLabel}
            initials={initials}
            avatarUrl={profile.avatarUrl}
            frameAssetRef={cosmetics?.frame?.assetRef ?? null}
            username={profile.handle ?? profile.displayName}
            nameId={`ID.${serialLabel.replace('NO. ', '')}`}
            classLabel={classLabel}
            rankingLabel={rankingLabel}
            guildLabel="—"
            titleLabel={titleLabel}
          />
        </View>
        {isMe && <Text style={styles.youTag}>YOU</Text>}
      </Reveal>

      {!isMe && !profile.isDeleted && !profile.isBlockedRelationship && (
        <Reveal delay={120}>
          <PublicProfileActions
            relation={social.relation}
            isPending={social.actionPending}
            canChallenge={!isMatchLobbyPeek && !!profile.handle}
            showKebab
            onPrimary={social.onPrimary}
            onChallenge={() =>
              guardedRouter.push(
                { pathname: '/match/new', params: { invite: profile.handle!, kind: 'challenge' } },
                { actionKey: `user:${id}:challenge` },
              )
            }
            onKebab={social.onSafetyMenu}
          />
        </Reveal>
      )}

      {profile.isDeleted && (
        <Reveal delay={140}>
          <View style={styles.deletedNotice}>
            <MaterialCommunityIcons name="account-off" size={16} color={theme.muted} />
            <Text style={styles.deletedNoticeText}>บัญชีนี้ถูกลบแล้ว</Text>
          </View>
        </Reveal>
      )}

      {!isMe && profile.isBlockedRelationship && (
        <Reveal delay={140}>
          <View style={styles.blockedNotice}>
            <MaterialCommunityIcons name="block-helper" size={16} color={theme.muted} />
            <Text style={styles.blockedNoticeText}>บล็อกกันอยู่</Text>
            {profile.viewerIsBlocker && (
              <PressableScale
                style={styles.unblockBtn}
                onPress={() =>
                  social.blockMutation.mutate(
                    { targetUserId: id, action: 'unblock' },
                    {
                      onSuccess: () => Alert.alert('เลิกบล็อกแล้ว'),
                      onError: (e) => Alert.alert('เลิกบล็อกไม่สำเร็จ', e.message.slice(0, 200)),
                    },
                  )
                }
              >
                <Text style={styles.unblockBtnText}>เลิกบล็อก</Text>
              </PressableScale>
            )}
          </View>
        </Reveal>
      )}

      <Reveal delay={160}>
        <PublicProfileScoreCard
          leaderboardScore={profile.leaderboardScore ?? 0}
          credits={creditsValue}
          streak={profile.currentStreak ?? 0}
        />
      </Reveal>

      <Reveal delay={210}>
        <View style={styles.block}>
          <ProfileStatsCard
            matches={stats?.totalMatches ?? 0}
            wins={stats?.totalWins ?? 0}
            losses={stats?.totalLosses ?? 0}
            ties={stats?.totalTies ?? 0}
          />
        </View>
      </Reveal>

      {isReferee && (
        <Reveal delay={230}>
          <RefereeCredentialCard
            topTier={refereeTierByLevel(refereeSummary.topLevel).key}
            matchesRefereed={refereeSummary.matchesRefereed}
            rating={refereeSummary.rating}
            onPress={() =>
              guardedRouter.push(`/referee/profile?userId=${id}`, { actionKey: `user:${id}:referee-profile` })
            }
          />
        </Reveal>
      )}

      <Reveal delay={250}>
        <View style={styles.rankWrap}>
          <ProfileRankList ratings={activityRatings} userId={id} editable={false} />
        </View>
      </Reveal>

      {!isMatchLobbyPeek && (
        <Reveal delay={270}>
          <ProfileFeaturedMatch userId={id} isOwner={isMe} />
        </Reveal>
      )}

      <Reveal delay={290}>
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>ประวัติแมตช์</Text>
            {!isMatchLobbyPeek && historyMatches.length > 0 && (
              <PressableScale
                onPress={() => guardedRouter.push(`/user/${id}/matches`, { actionKey: `user:${id}:matches` })}
                accessibilityLabel="ดูประวัติแมตช์ทั้งหมด"
              >
                <Text style={styles.viewAll}>ดูทั้งหมด</Text>
              </PressableScale>
            )}
          </View>

          {matchesPending ? (
            <ActivityIndicator color={theme.chalk} />
          ) : historyMatches.length > 0 ? (
            <View style={styles.matchList}>
              {historyMatches.map((match) => (
                <MatchListItem key={match.id} match={match} currentUserId={id} navigationEnabled={!isMatchLobbyPeek} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyHistory}>
              <MaterialCommunityIcons name="history" size={22} color={theme.mutedSoft} />
              <Text style={styles.emptyHistoryText}>ยังไม่มีประวัติแมตช์ที่จบแล้ว</Text>
            </View>
          )}
        </View>
      </Reveal>
    </ScrollView>
  )
}

function getPrimaryClassLabel(ratings: UserActivityRating[] | undefined) {
  const topRating = [...(ratings ?? [])]
    .filter((rating) => rating.matches > 0 && isVisibleActivity(rating.activity))
    .sort((a, b) => b.rating - a.rating)[0]

  if (!topRating || !isVisibleActivity(topRating.activity)) return 'RALLY'
  return ACTIVITY_LABEL[topRating.activity]
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { backgroundColor: theme.bg },
    loader: { flex: 1, backgroundColor: theme.bg },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
      backgroundColor: theme.bg,
      padding: Spacing.xl,
    },
    errorText: { color: theme.ink, fontSize: 15, fontWeight: '700' },
    backBtn: {
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: Radius.lg,
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    backBtnText: { color: theme.inkSoft, fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
    container: { alignItems: 'center', padding: Spacing.xl, paddingTop: 24, paddingBottom: 48, gap: Spacing.md },
    block: { width: '100%', maxWidth: 380, alignSelf: 'center' },
    headerRow: { width: '100%', maxWidth: 380, flexDirection: 'row', justifyContent: 'space-between' },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    youTag: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.6,
      color: theme.muted,
      marginTop: 6,
      textAlign: 'center',
    },
    deletedNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      alignSelf: 'center',
      marginTop: 8,
    },
    deletedNoticeText: { color: theme.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
    blockedNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      alignSelf: 'center',
      marginTop: 8,
    },
    blockedNoticeText: { color: theme.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, flex: 1 },
    unblockBtn: {
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
    },
    unblockBtnText: { color: theme.inkSoft, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
    rankWrap: { width: 360, maxWidth: '100%', alignSelf: 'stretch' },
    historySection: { width: 360, maxWidth: '100%', gap: Spacing.md, alignSelf: 'stretch' },
    historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
    historyTitle: { fontSize: 17, color: theme.ink, fontWeight: '900', fontStyle: 'italic' },
    viewAll: { color: theme.amber, fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
    matchList: { gap: Spacing.md },
    emptyHistory: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.line,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      alignItems: 'center',
      gap: Spacing.sm,
    },
    emptyHistoryText: { color: theme.muted, fontSize: 13, textAlign: 'center' },
  })
}
