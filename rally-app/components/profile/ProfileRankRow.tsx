import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { TierBadge as RankTierBadge } from '@/components/ranks/TierBadge'
import { RallyText } from '@/components/ui/RallyText'
import { TierBadge } from '@/components/ui/TierBadge'
import { Fonts, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { profileTabDictionary } from '@/lib/i18n/dictionaries/profileTab'
import { winRatePercent } from '@/lib/leaderboard/leaderboardStats'
import { TIER_THRESHOLDS, type Tier } from '@/lib/leaderboard/tierRules'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

type ProfileRankRowProps = {
  label: string
  icon: IconName
  color: string
  iconColor: string
  rating: number
  tier: string | null
  matches: number
  wins: number
  losses: number
  // When showRole is true the third stat cell shows the preferred role/style
  // (tap to edit); otherwise it falls back to the activity tier.
  showRole: boolean
  roleCellLabel: string
  roleValue: string | null
  onEditRole?: () => void
  expanded: boolean
  onPress: () => void
}

// Leaderboard-style row for one activity. Tap to expand its separate stats.
export function ProfileRankRow({
  label,
  icon,
  color,
  iconColor,
  rating,
  tier,
  matches,
  wins,
  losses,
  showRole,
  roleCellLabel,
  roleValue,
  onEditRole,
  expanded,
  onPress,
}: ProfileRankRowProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const winRate = winRatePercent(wins, losses)
  const { t } = useI18n(profileTabDictionary)

  return (
    <PressableScale
      style={[styles.row, expanded ? styles.rowExpanded : null]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={t('rankRowAccessibilityLabel', { label })}
    >
      <View style={styles.head}>
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.mid}>
          <View style={styles.labelRow}>
            {isTier(tier) && <RankTierBadge tier={tier} size="sm" />}
            <RallyText variant="head" lang="en" style={styles.label} numberOfLines={1}>
              {label}
            </RallyText>
          </View>
          <TierBadge tier={tier} size={13} showLabel />
        </View>
        <View style={styles.ratingBox}>
          <Text style={styles.rating}>{rating}</Text>
          <Text style={styles.ratingMeta}>RP</Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.mutedSoft}
        />
      </View>

      {expanded ? (
        <Reveal style={styles.stats} translateY={6} duration={240}>
          <StatCell label={t('rankRowMatches')} value={String(matches)} color={theme.ink} />
          <View style={styles.statDivider} />
          <StatCell
            label={t('rankRowWinRate')}
            value={winRate == null ? '—' : `${winRate}%`}
            color={theme.ink}
          />
          <View style={styles.statDivider} />
          {showRole ? (
            <StatCell
              label={roleCellLabel}
              value={roleValue ?? t('rankRowSetRole')}
              color={roleValue ? theme.ink : theme.muted}
              onPress={onEditRole}
            />
          ) : (
            <StatCell
              label={t('rankRowTier')}
              value={tier ? capitalize(tier) : '—'}
              color={theme.ink}
            />
          )}
        </Reveal>
      ) : null}
    </PressableScale>
  )
}

function StatCell({
  label,
  value,
  color,
  onPress,
}: {
  label: string
  value: string
  color: string
  onPress?: () => void
}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const content = (
    <>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color }]} numberOfLines={1}>
          {value}
        </Text>
        {onPress ? (
          <MaterialCommunityIcons name="pencil" size={11} color={theme.mutedSoft} />
        ) : null}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  )
  if (onPress) {
    return (
      <PressableScale
        style={styles.statCell}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
      >
        {content}
      </PressableScale>
    )
  }
  return <View style={styles.statCell}>{content}</View>
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// `tier` on this row can be null (no rating yet); narrow to the strict Tier
// union before handing it to the rank-icon TierBadge, which requires one.
function isTier(value: string | null): value is Tier {
  return value != null && TIER_THRESHOLDS.some((t) => t.tier === value)
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      paddingVertical: 8,
      paddingHorizontal: 10,
      boxShadow: theme.shadowSoft,
    },
    rowExpanded: {
      borderColor: theme.lineStrong,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: 44,
    },
    iconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mid: { flex: 1, minWidth: 0, gap: 3 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: { color: theme.ink, fontSize: 14, fontWeight: '900', letterSpacing: 0.3 },
    ratingBox: {
      minWidth: 64,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.arcadeCabinet,
      alignItems: 'flex-end',
    },
    rating: {
      color: theme.chalk,
      fontSize: 16,
      fontWeight: '900',
      fontStyle: 'italic',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    ratingMeta: { color: theme.chalk, opacity: 0.6, fontSize: 9, fontWeight: '800', marginTop: 1 },
    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.sm,
      paddingTop: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.lineStrong,
    },
    statCell: { flex: 1, alignItems: 'center' },
    statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: theme.line },
    statValue: {
      fontSize: 16,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      marginTop: 3,
      color: theme.muted,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
    },
  })
}
