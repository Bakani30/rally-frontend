import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { deriveMatchTrustBadge } from '@/lib/match/matchTrustBadge'
import { Radius, Sport, Spacing } from '@/constants/theme'
import type { MatchWithRelations, RefereeSportProfile } from '@/types/match'

type MatchTrustBadgeProps = {
  match: MatchWithRelations
  refereeProfile?: RefereeSportProfile | null
}

export function MatchTrustBadge({ match, refereeProfile }: MatchTrustBadgeProps) {
  const badge = deriveMatchTrustBadge(match, refereeProfile)
  const colors = toneColors[badge.tone]

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.bg }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.iconBg }]}>
        <MaterialCommunityIcons name={badge.icon} size={20} color={colors.fg} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.fg }]}>{badge.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{badge.subtitle}</Text>
      </View>
      <View style={[styles.metric, { borderColor: colors.border }]}>
        <Text style={[styles.metricText, { color: colors.fg }]} numberOfLines={1}>
          {badge.metric}
        </Text>
      </View>
    </View>
  )
}

const toneColors = {
  green: {
    fg: Sport.green,
    bg: Sport.greenSoft,
    iconBg: 'rgba(50,213,131,0.16)',
    border: 'rgba(50,213,131,0.28)',
  },
  amber: {
    fg: Sport.amber,
    bg: Sport.amberSoft,
    iconBg: 'rgba(255,178,61,0.16)',
    border: 'rgba(255,178,61,0.30)',
  },
  blue: {
    fg: Sport.blue,
    bg: 'rgba(69,162,255,0.10)',
    iconBg: 'rgba(69,162,255,0.16)',
    border: 'rgba(69,162,255,0.28)',
  },
  neutral: {
    fg: Sport.inkSoft,
    bg: Sport.surface,
    iconBg: Sport.bg,
    border: Sport.line,
  },
} as const

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 3,
    color: Sport.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  metric: {
    minWidth: 46,
    minHeight: 34,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
})
