import { StyleSheet, Text, View } from 'react-native'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { ProfileFrame } from '@/components/profile/ProfileFrame'
import { ProfileTitle } from '@/components/profile/ProfileTitle'
import { BadgeSlot } from '@/components/profile/BadgeSlot'
import { isDefaultProfileFrame } from '@/components/profile/profileFrameRegistry'
import { ProfileAccent } from '@/components/profile/profileColors'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { DraftMap } from '@/lib/cosmetics/cosmeticLoadout'

const AVATAR_SIZE = 96

type CosmeticPreviewCardProps = {
  displayName: string
  initials: string
  avatarUrl: string | null | undefined
  draft: DraftMap
}

export function CosmeticPreviewCard({
  displayName, initials, avatarUrl, draft,
}: CosmeticPreviewCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  const frameRef = draft.frame?.asset_ref ?? null
  const avatar = <ProfileAvatar avatarUrl={avatarUrl} initials={initials} size={AVATAR_SIZE} />
  const hasFrame = !isDefaultProfileFrame(frameRef)

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <View style={{ flex: 1 }} />
        <BadgeSlot badgeAssetRef={draft.badge?.asset_ref ?? null} size={34} />
      </View>

      {hasFrame ? (
        <ProfileFrame frameAssetRef={frameRef} size={AVATAR_SIZE}>{avatar}</ProfileFrame>
      ) : (
        <View style={styles.plainAvatar}>{avatar}</View>
      )}

      <View style={styles.namePill}>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
      </View>

      <ProfileTitle title={draft.title?.asset_ref ?? null} rarity={draft.title?.rarity ?? 'common'} />
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
    },
    badgeRow: { flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center' },
    plainAvatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      overflow: 'hidden',
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    namePill: {
      marginTop: Spacing.xs,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      borderWidth: 1.5,
      borderColor: ProfileAccent.indigo,
      backgroundColor: ProfileAccent.indigoSoft,
      maxWidth: '90%',
    },
    name: { color: theme.ink, fontSize: 16, fontWeight: '900', letterSpacing: 0.2, textAlign: 'center' },
  })
}
