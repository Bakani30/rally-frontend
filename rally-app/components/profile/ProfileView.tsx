import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { Screen } from '@/components/layout/Screen'
import { Reveal } from '@/components/motion/Reveal'
import { ProfileEntryGridView } from '@/components/profile/ProfileEntryGridView'
import { ProfileHeaderView } from '@/components/profile/ProfileHeaderView'
import { ProfileIdentityDeck } from '@/components/profile/ProfileIdentityDeck'
import { ProfileRankListView } from '@/components/profile/ProfileRankListView'
import { ProfileShortcutRowView } from '@/components/profile/ProfileShortcutRowView'
import { ProfileStatsCard } from '@/components/profile/ProfileStatsCard'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { UserActivityRating } from '@/lib/leaderboard/leaderboardTypes'

export type ProfileViewProps = {
  cardOpen: boolean
  profile: {
    displayName: string
    idLabel: string
    initials: string
    avatarUrl: string | null | undefined
    frameAssetRef: string | null
    username: string
    nameId: string
    classLabel: string
    rankingLabel: string
    guildLabel: string
    titleLabel: string
  }
  stats: { matches: number; wins: number; losses: number; ties: number }
  ratings: UserActivityRating[] | undefined
  positions?: Record<string, string>
  checkinOpen?: boolean
  checkedInToday: boolean
  onToggleCard: () => void
  onBack: () => void
  onOpenSettings: () => void
  onOpenMatches: () => void
  onOpenWallet: () => void
  onOpenReferee: () => void
  onToggleCheckin: () => void
  onOpenCosmetics: () => void
  onOpenRank: () => void
  onEditRole?: (activity: string) => void
  onChangeAvatar?: () => void
  isUpdatingAvatar?: boolean
  featuredMatch?: ReactNode
  rankList?: ReactNode
}

/** Auth- and query-free composition shared by ProfileScreen and Storybook. */
export function ProfileView({
  cardOpen,
  profile,
  stats,
  ratings,
  positions,
  checkinOpen = false,
  checkedInToday,
  onToggleCard,
  onBack,
  onOpenSettings,
  onOpenMatches,
  onOpenWallet,
  onOpenReferee,
  onToggleCheckin,
  onOpenCosmetics,
  onOpenRank,
  onEditRole,
  onChangeAvatar,
  isUpdatingAvatar,
  featuredMatch,
  rankList,
}: ProfileViewProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.root}>
      <Screen
        edges={['top']}
        topPad={12}
        bottomPad={48}
        contentContainerStyle={styles.container}
      >
        <Reveal delay={0} style={styles.block}>
          <ProfileHeaderView
            cardOpen={cardOpen}
            onToggleCard={onToggleCard}
            onBack={onBack}
            showBackButton
            onOpenSettings={onOpenSettings}
          />
        </Reveal>
        <Reveal delay={80} style={styles.block}>
          <ProfileIdentityDeck
            open={cardOpen}
            displayName={profile.displayName}
            idLabel={profile.idLabel}
            initials={profile.initials}
            avatarUrl={profile.avatarUrl}
            frameAssetRef={profile.frameAssetRef}
            onChangeAvatar={onChangeAvatar}
            isUpdatingAvatar={isUpdatingAvatar}
            username={profile.username}
            nameId={profile.nameId}
            classLabel={profile.classLabel}
            rankingLabel={profile.rankingLabel}
            guildLabel={profile.guildLabel}
            titleLabel={profile.titleLabel}
          />
        </Reveal>
        <Reveal delay={140} style={styles.block}>
          <ProfileShortcutRowView onOpenMatches={onOpenMatches} onOpenWallet={onOpenWallet} />
        </Reveal>
        <Reveal delay={180} style={styles.block}>
          <ProfileEntryGridView
            checkinOpen={checkinOpen}
            checkedInToday={checkedInToday}
            onOpenReferee={onOpenReferee}
            onToggleCheckin={onToggleCheckin}
            onOpenCosmetics={onOpenCosmetics}
          />
        </Reveal>
        <Reveal delay={220} style={styles.block}>
          <ProfileStatsCard {...stats} />
        </Reveal>
        <Reveal delay={260} style={styles.block}>
          {rankList ?? (
            <ProfileRankListView
              ratings={ratings}
              positions={positions}
              onOpenRank={onOpenRank}
              onEditRole={onEditRole}
            />
          )}
        </Reveal>
        {featuredMatch ? (
          <Reveal delay={300} style={styles.block}>
            {featuredMatch}
          </Reveal>
        ) : null}
      </Screen>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    container: { alignItems: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.md },
    block: { width: '100%', maxWidth: 380, alignSelf: 'center' },
  })
}
