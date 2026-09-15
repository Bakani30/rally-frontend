import { StyleSheet, Text, View } from 'react-native'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { ProfileFrame } from '@/components/profile/ProfileFrame'
import { RallyText } from '@/components/ui/RallyText'
import { Fonts, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { RANK_FRAME_CODE_BY_TIER } from '@/lib/ranks/rankAssets'
import type { Tier } from '@/lib/leaderboard/tierRules'
import { tierAccent } from './rankColors'

type SportRankHeroProps = {
  tier: Tier
  tierLabel: string
  sportLabel: string
  rating: number
  /** Rank position on this sport's board, or null when outside/unavailable. */
  rankPosition: number | null
  /** Short board label, e.g. "บาส BOARD". */
  boardLabel: string
  initials: string
  avatarUrl: string | null | undefined
}

const AVATAR_SIZE = 118

// Hero for one unlocked sport: avatar inside its tier rank-frame ring (seated
// exactly on the avatar, same as the Profile identity card), big tier name,
// RP and #position on that sport's board.
export function SportRankHero({
  tier,
  tierLabel,
  sportLabel,
  rating,
  rankPosition,
  boardLabel,
  initials,
  avatarUrl,
}: SportRankHeroProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const accent = tierAccent(tier)

  return (
    <View style={styles.wrap}>
      <View style={styles.categoryChip}>
        <View style={[styles.categoryDot, { backgroundColor: accent }]} />
        <RallyText variant="head" lang="th" style={styles.categoryLabel}>{`หมวด ${sportLabel}`}</RallyText>
      </View>
      <ProfileFrame frameAssetRef={RANK_FRAME_CODE_BY_TIER[tier]} size={AVATAR_SIZE}>
        <ProfileAvatar avatarUrl={avatarUrl} initials={initials} size={AVATAR_SIZE} />
      </ProfileFrame>

      <RallyText variant="head" lang="en" style={[styles.tierName, { color: accent }]}>
        {tierLabel}
      </RallyText>

      <View style={styles.metaRow}>
        <View style={styles.metaCell}>
          <Text style={[styles.metaValue, { color: theme.ink }]}>{rating.toLocaleString()}</Text>
          <Text style={styles.metaUnit}> RP</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaCell}>
          <Text style={[styles.metaValue, { color: theme.amber }]}>
            {rankPosition != null ? `#${rankPosition}` : '—'}
          </Text>
          <RallyText lang="th" style={styles.metaUnit}>{` ${boardLabel}`}</RallyText>
        </View>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', paddingTop: 8 },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: Radius.pill,
      backgroundColor: theme.surface,
      paddingVertical: 5,
      paddingHorizontal: 10,
      marginBottom: 10,
    },
    categoryDot: { width: 8, height: 8, borderRadius: 4 },
    categoryLabel: { color: theme.ink, fontSize: 11 },
    tierName: {
      fontSize: 32,
      fontWeight: '900',
      fontStyle: 'italic',
      letterSpacing: 0.5,
      marginTop: 12,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
    metaCell: { flexDirection: 'row', alignItems: 'baseline' },
    metaValue: {
      fontSize: 25,
      fontWeight: '900',
      fontStyle: 'italic',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    metaUnit: { color: theme.muted, fontSize: 11, fontWeight: '800' },
    metaDivider: { width: 1, height: 20, backgroundColor: theme.line },
  })
}
