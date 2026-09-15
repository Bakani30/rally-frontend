import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { RefereeTierChip } from '@/components/referee/RefereeTierChip'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'
import type { RefereeTrustTier } from '@/types/match'

type RefereeCredentialCardProps = {
  topTier: RefereeTrustTier
  matchesRefereed: number
  rating: number | null
  actionLabel?: string
  expanded?: boolean
  onPress: () => void
}

// Compact "this player is a referee" credential shown on a public player
// profile. Taps through to the full referee profile.
export function RefereeCredentialCard({
  topTier,
  matchesRefereed,
  rating,
  actionLabel,
  expanded,
  onPress,
}: RefereeCredentialCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(refereeDictionary)
  const matches = t(matchesRefereed === 1 ? 'matchesRefereedOne' : 'matchesRefereedMany', {
    count: matchesRefereed,
  })
  const meta = rating == null
    ? matches
    : `${matches} · ${t('ratingSummary', { rating: rating.toFixed(1) })}`

  return (
    <PressableScale
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={actionLabel ?? t('openRefereeProfile')}
      accessibilityState={{ expanded }}
    >
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name="whistle-outline" size={20} color={theme.orange} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{t('refereeRole')}</Text>
        <RefereeTierChip tier={topTier} showLevel />
        <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
      </View>
      <View style={styles.action}>
        {actionLabel ? <Text style={styles.actionText}>{actionLabel}</Text> : null}
        <MaterialCommunityIcons
          name={expanded == null ? 'chevron-right' : expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.mutedSoft}
        />
      </View>
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      width: 360,
      maxWidth: '100%',
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: Spacing.md,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
      backgroundColor: theme.orangeSoft,
      borderWidth: 1,
      borderColor: `${theme.orange}55`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, minWidth: 0, gap: 4 },
    eyebrow: { color: theme.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
    meta: { color: theme.muted, fontSize: 12, fontWeight: '700' },
    action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    actionText: { color: theme.orange, fontSize: 11, fontWeight: '900' },
  })
}
